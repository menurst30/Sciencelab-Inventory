import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  InventoryItem,
  BorrowRecord,
  MaintenanceRecord,
  RestockRecord,
  AuditLog,
  User,
  CalculatedItemStock,
} from '../types/inventory';
import {
  INITIAL_ITEMS,
  INITIAL_BORROWS,
  INITIAL_MAINTENANCE,
  INITIAL_RESTOCKS,
  INITIAL_AUDIT_LOGS,
  INITIAL_USERS,
  DEFAULT_CATEGORIES,
  DEFAULT_LOCATIONS,
  DUMMY_ITEM_IDS,
  DUMMY_BORROW_IDS,
  DUMMY_MAINTENANCE_IDS,
  DUMMY_RESTOCK_IDS,
  DUMMY_AUDIT_LOG_IDS,
} from '../data/initialData';
import {
  db,
  auth,
  handleFirestoreError,
  testFirestoreConnection,
} from '../lib/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { ALLOWED_DOMAIN, ADMIN_EMAILS } from '../types/inventory';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

interface InventoryContextType {
  // Current user & authentication
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  availableUsers: User[];
  isStaff: boolean;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loginWithQuickAccount: (email: string) => Promise<{ success: boolean; error?: string }>;

  // Raw data
  items: InventoryItem[];
  borrows: BorrowRecord[];
  maintenance: MaintenanceRecord[];
  restocks: RestockRecord[];
  auditLogs: AuditLog[];

  // Dynamic Categories & Locations
  categories: string[];
  locations: string[];
  addCategory: (categoryName: string) => void;
  addLocation: (locationName: string) => void;

  // Cloud & Firebase status
  isFirebaseConnected: boolean;
  isSyncing: boolean;
  firestoreError: string | null;

  // Stock calculation helpers
  getItemStockInfo: (itemId: string) => CalculatedItemStock;

  // Inventory actions
  addItem: (item: Omit<InventoryItem, 'itemId' | 'createdAt' | 'updatedAt'>) => { success: boolean; error?: string };
  updateItem: (itemId: string, updates: Partial<InventoryItem>) => { success: boolean; error?: string };
  archiveItem: (itemId: string) => { success: boolean; error?: string };
  unarchiveItem: (itemId: string) => { success: boolean; error?: string };

  // Borrow actions
  createBorrow: (params: {
    borrowerId: string;
    borrowerName: string;
    borrowerRole: string;
    itemId: string;
    quantity: number;
    borrowDate: string;
    expectedReturnDate: string;
    purpose: string;
    notes?: string;
  }) => { success: boolean; error?: string };

  processReturn: (params: {
    borrowId: string;
    actualReturnDate: string;
    returnCondition: 'Good' | 'Fair' | 'Damaged' | 'Hilang';
    notes?: string;
    damageDescriptionIfAny?: string;
  }) => { success: boolean; error?: string };

  // Maintenance actions
  createMaintenance: (params: {
    itemId: string;
    quantity: number;
    damageDescription: string;
    reportedDate: string;
    pic: string;
    repairCost?: number;
    notes?: string;
  }) => { success: boolean; error?: string };

  updateMaintenanceStatus: (params: {
    maintenanceId: string;
    repairStatus: MaintenanceRecord['repairStatus'];
    pic?: string;
    repairCost?: number;
    notes?: string;
    resolvedCondition?: 'Good' | 'Fair';
    retireUnitsIfNotRepairable?: boolean;
  }) => { success: boolean; error?: string };

  // Restock actions
  createOrUpdateRestock: (params: {
    itemId: string;
    recommendedQuantity: number;
    targetStock?: number;
    notes?: string;
  }) => { success: boolean; error?: string };

  orderRestock: (params: {
    restockId: string;
    supplier: string;
    orderedDate: string;
    notes?: string;
  }) => { success: boolean; error?: string };

  receiveRestock: (params: {
    restockId: string;
    receivedQuantity: number;
    receivedDate: string;
    notes?: string;
  }) => { success: boolean; error?: string };

  // Utility
  purgeDummyData: () => Promise<void>;
  resetToSampleData: () => Promise<void>;
  exportDataJSON: () => void;
  exportInventoryCSV: () => void;
}

const STORAGE_KEYS = {
  ITEMS: 'science_lab_inventory_items_v2',
  BORROWS: 'science_lab_inventory_borrows_v2',
  MAINTENANCE: 'science_lab_inventory_maintenance_v2',
  RESTOCKS: 'science_lab_inventory_restocks_v2',
  AUDIT: 'science_lab_inventory_audit_v2',
  USER: 'science_lab_inventory_current_user_v2',
  CATEGORIES: 'science_lab_inventory_categories_v2',
  LOCATIONS: 'science_lab_inventory_locations_v2',
};

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Cloud & connection state
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Current user & authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      if (saved) {
        const parsed: User = JSON.parse(saved);
        if (parsed && parsed.email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      if (saved) {
        const parsed: User = JSON.parse(saved);
        return Boolean(parsed && parsed.email?.toLowerCase().endsWith(ALLOWED_DOMAIN));
      }
    } catch {
      // fallback
    }
    return false;
  });

  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Items: start empty or load genuine non-dummy items from cache
  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (saved) {
        const parsed: InventoryItem[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => !DUMMY_ITEM_IDS.includes(item.itemId));
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Custom Categories
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.from(new Set([...DEFAULT_CATEGORIES, ...parsed]));
      }
    } catch {
      // fallback
    }
    return DEFAULT_CATEGORIES;
  });

  // Custom Locations
  const [locations, setLocations] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.from(new Set([...DEFAULT_LOCATIONS, ...parsed]));
      }
    } catch {
      // fallback
    }
    return DEFAULT_LOCATIONS;
  });

  // Borrows: start empty or load genuine non-dummy borrows from cache
  const [borrows, setBorrows] = useState<BorrowRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BORROWS);
      if (saved) {
        const parsed: BorrowRecord[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((b) => !DUMMY_BORROW_IDS.includes(b.borrowId));
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Maintenance: start empty or load genuine non-dummy records from cache
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MAINTENANCE);
      if (saved) {
        const parsed: MaintenanceRecord[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((m) => !DUMMY_MAINTENANCE_IDS.includes(m.maintenanceId));
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Restocks: start empty or load genuine non-dummy restocks from cache
  const [restocks, setRestocks] = useState<RestockRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RESTOCKS);
      if (saved) {
        const parsed: RestockRecord[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((r) => !DUMMY_RESTOCK_IDS.includes(r.restockId));
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Audit Logs: start empty or load genuine non-dummy logs from cache
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIT);
      if (saved) {
        const parsed: AuditLog[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((l) => !DUMMY_AUDIT_LOG_IDS.includes(l.logId));
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Local storage caching for offline resilience
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    } catch { /* ignore */ }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch { /* ignore */ }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
    } catch { /* ignore */ }
  }, [locations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BORROWS, JSON.stringify(borrows));
    } catch { /* ignore */ }
  }, [borrows]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(maintenance));
    } catch { /* ignore */ }
  }, [maintenance]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RESTOCKS, JSON.stringify(restocks));
    } catch { /* ignore */ }
  }, [restocks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
    } catch { /* ignore */ }
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } catch { /* ignore */ }
  }, [currentUser]);

  // Clean up any residual dummy/mock documents from Firestore and ensure initial settings
  const cleanupFirestoreDummyData = useCallback(async () => {
    try {
      // 1. Delete known dummy records from Firestore if they were previously seeded
      const deletePromises: Promise<any>[] = [];

      for (const id of DUMMY_ITEM_IDS) {
        deletePromises.push(deleteDoc(doc(db, 'inventoryItems', id)).catch(() => {}));
      }
      for (const id of DUMMY_BORROW_IDS) {
        deletePromises.push(deleteDoc(doc(db, 'borrowRecords', id)).catch(() => {}));
      }
      for (const id of DUMMY_MAINTENANCE_IDS) {
        deletePromises.push(deleteDoc(doc(db, 'maintenanceRecords', id)).catch(() => {}));
      }
      for (const id of DUMMY_RESTOCK_IDS) {
        deletePromises.push(deleteDoc(doc(db, 'restockRecords', id)).catch(() => {}));
      }
      for (const id of DUMMY_AUDIT_LOG_IDS) {
        deletePromises.push(deleteDoc(doc(db, 'auditLogs', id)).catch(() => {}));
      }

      await Promise.allSettled(deletePromises);

      // 2. Ensure settings/global exists with standard default categories and locations
      const settingsRef = doc(db, 'settings', 'global');
      const settingsSnap = await getDoc(settingsRef).catch(() => null);
      if (settingsSnap && !settingsSnap.exists()) {
        await setDoc(settingsRef, {
          categories: DEFAULT_CATEGORIES,
          locations: DEFAULT_LOCATIONS,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Firestore dummy cleanup check failed:', err);
    }
  }, []);

  // Test connection and setup real-time Firestore listeners
  useEffect(() => {
    let unsubscribeItems: (() => void) | undefined;
    let unsubscribeBorrows: (() => void) | undefined;
    let unsubscribeMaintenance: (() => void) | undefined;
    let unsubscribeRestocks: (() => void) | undefined;
    let unsubscribeAudit: (() => void) | undefined;
    let unsubscribeSettings: (() => void) | undefined;

    const initFirebaseListeners = async () => {
      setIsSyncing(true);
      const testResult = await testFirestoreConnection();
      if (!testResult.connected) {
        setIsFirebaseConnected(false);
        setFirestoreError(testResult.error || 'Cannot connect to Firebase');
        setIsSyncing(false);
        return;
      }
      setIsFirebaseConnected(true);
      setFirestoreError(null);

      // Clean up any residual dummy records from Firestore
      await cleanupFirestoreDummyData();

      try {
        // 1. Items listener: load only real items from Firestore
        unsubscribeItems = onSnapshot(
          collection(db, 'inventoryItems'),
          (snapshot) => {
            const remoteItems = snapshot.docs
              .map((docSnap) => docSnap.data() as InventoryItem)
              .filter((item) => !DUMMY_ITEM_IDS.includes(item.itemId));
            setItems(remoteItems);
            setIsSyncing(false);
          },
          (err) => {
            const errInfo = handleFirestoreError(err, 'list', 'inventoryItems');
            setFirestoreError(errInfo.error);
            setIsSyncing(false);
          }
        );

        // 2. Borrows listener: load only real borrows from Firestore
        unsubscribeBorrows = onSnapshot(
          collection(db, 'borrowRecords'),
          (snapshot) => {
            const remoteBorrows = snapshot.docs
              .map((docSnap) => docSnap.data() as BorrowRecord)
              .filter((b) => !DUMMY_BORROW_IDS.includes(b.borrowId));
            const today = new Date().toISOString().split('T')[0];
            const updated = remoteBorrows.map((b) => {
              if (b.status === 'Borrowed' && b.expectedReturnDate < today) {
                return { ...b, status: 'Overdue' as const };
              }
              return b;
            });
            setBorrows(updated);
          },
          (err) => handleFirestoreError(err, 'list', 'borrowRecords')
        );

        // 3. Maintenance listener: load only real maintenance from Firestore
        unsubscribeMaintenance = onSnapshot(
          collection(db, 'maintenanceRecords'),
          (snapshot) => {
            const remoteMaint = snapshot.docs
              .map((docSnap) => docSnap.data() as MaintenanceRecord)
              .filter((m) => !DUMMY_MAINTENANCE_IDS.includes(m.maintenanceId));
            setMaintenance(remoteMaint);
          },
          (err) => handleFirestoreError(err, 'list', 'maintenanceRecords')
        );

        // 4. Restocks listener: load only real restocks from Firestore
        unsubscribeRestocks = onSnapshot(
          collection(db, 'restockRecords'),
          (snapshot) => {
            const remoteRestocks = snapshot.docs
              .map((docSnap) => docSnap.data() as RestockRecord)
              .filter((r) => !DUMMY_RESTOCK_IDS.includes(r.restockId));
            setRestocks(remoteRestocks);
          },
          (err) => handleFirestoreError(err, 'list', 'restockRecords')
        );

        // 5. Audit logs listener: load only real audit logs from Firestore
        unsubscribeAudit = onSnapshot(
          collection(db, 'auditLogs'),
          (snapshot) => {
            const remoteLogs = snapshot.docs
              .map((docSnap) => docSnap.data() as AuditLog)
              .filter((l) => !DUMMY_AUDIT_LOG_IDS.includes(l.logId));
            remoteLogs.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
            setAuditLogs(remoteLogs);
          },
          (err) => handleFirestoreError(err, 'list', 'auditLogs')
        );

        // 6. Settings listener (Categories & Locations)
        unsubscribeSettings = onSnapshot(
          doc(db, 'settings', 'global'),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (Array.isArray(data?.categories)) {
                setCategories(Array.from(new Set([...DEFAULT_CATEGORIES, ...data.categories])));
              }
              if (Array.isArray(data?.locations)) {
                setLocations(Array.from(new Set([...DEFAULT_LOCATIONS, ...data.locations])));
              }
            }
          },
          (err) => handleFirestoreError(err, 'read', 'settings')
        );
      } catch (e: any) {
        console.error('Error attaching Firebase listeners:', e);
        setIsSyncing(false);
      }
    };

    initFirebaseListeners();

    return () => {
      if (unsubscribeItems) unsubscribeItems();
      if (unsubscribeBorrows) unsubscribeBorrows();
      if (unsubscribeMaintenance) unsubscribeMaintenance();
      if (unsubscribeRestocks) unsubscribeRestocks();
      if (unsubscribeAudit) unsubscribeAudit();
      if (unsubscribeSettings) unsubscribeSettings();
    };
  }, [cleanupFirestoreDummyData]);

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const email = fbUser.email?.toLowerCase().trim() || '';
        if (email.endsWith(ALLOWED_DOMAIN)) {
          const isAdmin = ADMIN_EMAILS.includes(email);
          const dept =
            email === 'menur@lazuardi.sch.id'
              ? 'Kepala Laboratorium Science & Science Teacher'
              : email === 'susi@lazuardi.sch.id'
              ? 'Science Teacher & Admin Laboratorium'
              : 'Guru / Staff Lazuardi';

          const defaultName =
            email === 'menur@lazuardi.sch.id'
              ? 'Menurseto Mawaddah, S.Pd'
              : email === 'susi@lazuardi.sch.id'
              ? 'Susiyanti Wedya, S.Pd'
              : fbUser.displayName || email.split('@')[0];

          const appUser: User = {
            userId: fbUser.uid,
            name: fbUser.displayName || defaultName,
            email: email,
            role: isAdmin ? 'admin' : 'teacher',
            department: dept,
            photoURL: fbUser.photoURL || undefined,
          };

          setCurrentUser(appUser);
          setIsAuthenticated(true);
          setAuthError(null);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(appUser));
        } else {
          // Reject user if not @lazuardi.sch.id
          await firebaseSignOut(auth);
          setCurrentUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem(STORAGE_KEYS.USER);
          setAuthError(
            `Akses Ditolak: Akun (${email}) bukan domain @lazuardi.sch.id. Hanya civitas sekolah yang berhak masuk.`
          );
        }
      } else {
        // Fallback: check saved session in localStorage
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.USER);
          if (saved) {
            const parsed: User = JSON.parse(saved);
            if (parsed && parsed.email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
              setCurrentUser(parsed);
              setIsAuthenticated(true);
            } else {
              setCurrentUser(null);
              setIsAuthenticated(false);
            }
          } else {
            setCurrentUser(null);
            setIsAuthenticated(false);
          }
        } catch {
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        hd: 'lazuardi.sch.id',
        prompt: 'select_account',
      });
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      const email = fbUser.email?.toLowerCase().trim() || '';

      if (!email.endsWith(ALLOWED_DOMAIN)) {
        await firebaseSignOut(auth);
        const errMsg = `Akses Ditolak: Akun (${email}) bukan domain resmi @lazuardi.sch.id. Hanya civitas sekolah yang berwenang mengakses inventaris lab.`;
        setAuthError(errMsg);
        setCurrentUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem(STORAGE_KEYS.USER);
        return { success: false, error: errMsg };
      }

      const isAdmin = ADMIN_EMAILS.includes(email);
      const dept =
        email === 'menur@lazuardi.sch.id'
          ? 'Kepala Laboratorium Science & Science Teacher'
          : email === 'susi@lazuardi.sch.id'
          ? 'Science Teacher & Admin Laboratorium'
          : 'Guru / Staff Lazuardi';

      const defaultName =
        email === 'menur@lazuardi.sch.id'
          ? 'Menurseto Mawaddah, S.Pd'
          : email === 'susi@lazuardi.sch.id'
          ? 'Susiyanti Wedya, S.Pd'
          : fbUser.displayName || email.split('@')[0];

      const appUser: User = {
        userId: fbUser.uid,
        name: fbUser.displayName || defaultName,
        email: email,
        role: isAdmin ? 'admin' : 'teacher',
        department: dept,
        photoURL: fbUser.photoURL || undefined,
      };

      setCurrentUser(appUser);
      setIsAuthenticated(true);
      setAuthError(null);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(appUser));
      return { success: true };
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      let msg = 'Gagal melakukan login dengan Google.';
      if (err?.code === 'auth/popup-closed-by-user') {
        msg = 'Proses login dibatalkan karena jendela pop-up ditutup.';
      } else if (err?.code === 'auth/popup-blocked') {
        msg = 'Pop-up Google terblokir oleh browser. Harap izinkan pop-up pada tab browser ini.';
      } else if (err?.message) {
        msg = err.message;
      }
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setAuthLoading(false);
    }
  };

  const loginWithQuickAccount = async (targetEmail: string): Promise<{ success: boolean; error?: string }> => {
    setAuthLoading(true);
    setAuthError(null);
    const email = targetEmail.toLowerCase().trim();

    if (!email.endsWith(ALLOWED_DOMAIN)) {
      const errMsg = `Akses Ditolak: Akun (${email}) tidak memiliki domain @lazuardi.sch.id. Hanya akun sekolah yang diizinkan masuk.`;
      setAuthError(errMsg);
      setCurrentUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem(STORAGE_KEYS.USER);
      setAuthLoading(false);
      return { success: false, error: errMsg };
    }

    const isAdmin = ADMIN_EMAILS.includes(email);
    const matched = INITIAL_USERS.find((u) => u.email.toLowerCase() === email);
    const appUser: User = matched || {
      userId: `usr-${email.split('@')[0]}`,
      name:
        email === 'menur@lazuardi.sch.id'
          ? 'Menurseto Mawaddah, S.Pd'
          : email === 'susi@lazuardi.sch.id'
          ? 'Susiyanti Wedya, S.Pd'
          : `Guru (${email.split('@')[0]})`,
      email: email,
      role: isAdmin ? 'admin' : 'teacher',
      department: isAdmin ? 'Admin Laboratorium Science' : 'Guru / Peminjam Lab Lazuardi',
    };

    setCurrentUser(appUser);
    setIsAuthenticated(true);
    setAuthError(null);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(appUser));
    setAuthLoading(false);
    return { success: true };
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };

  const isStaff = currentUser?.role === 'admin';

  // Helper to append audit log to state and Firestore
  const logAudit = (
    entityType: AuditLog['entityType'],
    action: string,
    description: string,
    itemId?: string,
    itemCode?: string,
    previousValue?: string,
    newValue?: string
  ) => {
    const newLog: AuditLog = {
      logId: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      actorName: currentUser?.name || 'Sistem',
      actorRole: isStaff ? 'Admin Lab' : 'Guru / Peminjam',
      entityType,
      action,
      itemId,
      itemCode,
      description,
      previousValue,
      newValue,
    };

    // Optimistic local update
    setAuditLogs((prev) => [newLog, ...prev]);

    setDoc(doc(db, 'auditLogs', newLog.logId), newLog).catch((err) => {
      handleFirestoreError(err, 'create', 'auditLogs', newLog.logId);
    });
  };

  // Helper to add custom category
  const addCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return;

    const newCategories = [...categories, trimmed];
    setCategories(newCategories);

    setDoc(
      doc(db, 'settings', 'global'),
      { categories: newCategories, updatedAt: new Date().toISOString() },
      { merge: true }
    ).catch((err) => {
      handleFirestoreError(err, 'update', 'settings', 'global');
    });
  };

  // Helper to add custom location
  const addLocation = (locationName: string) => {
    const trimmed = locationName.trim();
    if (!trimmed) return;
    if (locations.some((l) => l.toLowerCase() === trimmed.toLowerCase())) return;

    const newLocations = [...locations, trimmed];
    setLocations(newLocations);

    setDoc(
      doc(db, 'settings', 'global'),
      { locations: newLocations, updatedAt: new Date().toISOString() },
      { merge: true }
    ).catch((err) => {
      handleFirestoreError(err, 'update', 'settings', 'global');
    });
  };

  // Stock calculation for a single item
  const getItemStockInfo = (itemId: string): CalculatedItemStock => {
    const item = items.find((i) => i.itemId === itemId);
    if (!item) {
      return {
        totalQuantity: 0,
        borrowedQuantity: 0,
        damagedQuantity: 0,
        maintenanceQuantity: 0,
        lostQuantity: 0,
        availableQuantity: 0,
        isLowStock: false,
      };
    }

    // Active borrows
    const activeBorrows = borrows.filter(
      (b) => b.itemId === itemId && (b.status === 'Borrowed' || b.status === 'Overdue')
    );
    const borrowedQuantity = activeBorrows.reduce((acc, curr) => acc + curr.quantity, 0);

    // Active maintenance (Reported or In Repair)
    const activeMaint = maintenance.filter(
      (m) => m.itemId === itemId && (m.repairStatus === 'Reported' || m.repairStatus === 'In Repair')
    );
    const maintenanceQuantity = activeMaint.reduce((acc, curr) => acc + curr.quantity, 0);

    // Damaged quantity: if item condition is explicitly Damaged, or reported damaged
    let damagedQuantity = 0;
    if (item.condition === 'Damaged') {
      damagedQuantity = Math.max(0, item.quantity - borrowedQuantity - maintenanceQuantity);
    } else {
      const notRepairable = maintenance.filter(
        (m) => m.itemId === itemId && m.repairStatus === 'Not Repairable'
      );
      damagedQuantity = notRepairable.reduce((acc, curr) => acc + curr.quantity, 0);
    }

    // Lost quantity (Hilang)
    let lostQuantity = 0;
    if (item.condition === 'Hilang') {
      lostQuantity = Math.max(0, item.quantity - borrowedQuantity - maintenanceQuantity);
    }

    // Available excludes borrowed, maintenance, damaged, AND lost!
    const unavailable =
      borrowedQuantity +
      maintenanceQuantity +
      (item.condition === 'Damaged' ? damagedQuantity : 0) +
      (item.condition === 'Hilang' ? lostQuantity : 0);

    const availableQuantity = Math.max(0, item.quantity - unavailable);
    const isLowStock = item.quantity <= item.minimumStock;

    return {
      totalQuantity: item.quantity,
      borrowedQuantity,
      damagedQuantity,
      maintenanceQuantity,
      lostQuantity,
      availableQuantity,
      isLowStock,
    };
  };

  // 1. Add Item
  const addItem = (itemData: Omit<InventoryItem, 'itemId' | 'createdAt' | 'updatedAt'>): { success: boolean; error?: string } => {
    if (!isStaff) return { success: false, error: 'Hanya Admin/Staf Lab yang dapat menambah barang.' };
    if (!itemData.name.trim()) return { success: false, error: 'Nama barang wajib diisi.' };
    if (!itemData.itemCode.trim()) return { success: false, error: 'ID/Kode barang wajib diisi.' };

    const exists = items.some(
      (i) => i.itemCode.toLowerCase() === itemData.itemCode.trim().toLowerCase()
    );
    if (exists) {
      return { success: false, error: `Kode barang "${itemData.itemCode}" sudah terdaftar.` };
    }

    if (itemData.quantity < 0) return { success: false, error: 'Quantity tidak boleh negatif.' };
    if (itemData.minimumStock < 0) return { success: false, error: 'Minimum stock tidak boleh negatif.' };
    if (itemData.unitPurchasePrice !== undefined && itemData.unitPurchasePrice < 0) {
      return { success: false, error: 'Harga pembelian tidak boleh negatif.' };
    }

    if (itemData.category) addCategory(itemData.category);
    if (itemData.location) addLocation(itemData.location);

    const now = new Date().toISOString();
    const newItem: InventoryItem = {
      ...itemData,
      itemId: 'item-' + Date.now(),
      itemCode: itemData.itemCode.trim().toUpperCase(),
      name: itemData.name.trim(),
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic local update
    setItems((prev) => [newItem, ...prev]);

    // Persist to Firestore
    setDoc(doc(db, 'inventoryItems', newItem.itemId), newItem).catch((err) => {
      handleFirestoreError(err, 'create', 'inventoryItems', newItem.itemId);
    });

    logAudit(
      'Inventory',
      'ADD_ITEM',
      `Menambahkan item baru: ${newItem.name} (${newItem.itemCode}) sejumlah ${newItem.quantity} ${newItem.unit}`,
      newItem.itemId,
      newItem.itemCode,
      '-',
      `Stok: ${newItem.quantity}, Kondisi: ${newItem.condition}, Lokasi: ${newItem.location}`
    );

    return { success: true };
  };

  // 2. Update Item
  const updateItem = (itemId: string, updates: Partial<InventoryItem>): { success: boolean; error?: string } => {
    if (!isStaff) return { success: false, error: 'Hanya Admin/Staf Lab yang dapat mengubah data barang.' };

    const existing = items.find((i) => i.itemId === itemId);
    if (!existing) return { success: false, error: 'Barang tidak ditemukan.' };

    if (updates.name !== undefined && !updates.name.trim()) {
      return { success: false, error: 'Nama barang tidak boleh kosong.' };
    }
    if (updates.itemCode !== undefined) {
      const codeTrim = updates.itemCode.trim().toUpperCase();
      const codeExists = items.some(
        (i) => i.itemId !== itemId && i.itemCode.toUpperCase() === codeTrim
      );
      if (codeExists) {
        return { success: false, error: `Kode barang "${codeTrim}" sudah digunakan item lain.` };
      }
    }
    if (updates.quantity !== undefined && updates.quantity < 0) {
      return { success: false, error: 'Quantity tidak boleh negatif.' };
    }
    if (updates.minimumStock !== undefined && updates.minimumStock < 0) {
      return { success: false, error: 'Minimum stock tidak boleh negatif.' };
    }

    if (updates.category) addCategory(updates.category);
    if (updates.location) addLocation(updates.location);

    const now = new Date().toISOString();
    const updatedItem: InventoryItem = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    // Optimistic local update
    setItems((prev) => prev.map((i) => (i.itemId === itemId ? updatedItem : i)));

    // Persist to Firestore
    updateDoc(doc(db, 'inventoryItems', itemId), updates).catch((err) => {
      handleFirestoreError(err, 'update', 'inventoryItems', itemId);
    });

    const changes = Object.keys(updates)
      .map((k) => `${k}: ${(existing as any)[k]} -> ${(updates as any)[k]}`)
      .join(', ');

    logAudit(
      'Inventory',
      'UPDATE_ITEM',
      `Memperbarui barang: ${updatedItem.name} (${updatedItem.itemCode})`,
      itemId,
      updatedItem.itemCode,
      JSON.stringify(existing),
      changes
    );

    return { success: true };
  };

  // 3. Archive / Unarchive Item
  const archiveItem = (itemId: string): { success: boolean; error?: string } => {
    if (!isStaff) return { success: false, error: 'Hanya Admin yang dapat mengarsipkan barang.' };
    const existing = items.find((i) => i.itemId === itemId);
    if (!existing) return { success: false, error: 'Barang tidak ditemukan.' };

    const stockInfo = getItemStockInfo(itemId);
    if (stockInfo.borrowedQuantity > 0) {
      return {
        success: false,
        error: `Tidak dapat mengarsipkan: Ada ${stockInfo.borrowedQuantity} unit yang sedang dipinjam.`,
      };
    }

    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((i) =>
        i.itemId === itemId ? { ...i, status: 'Archived', updatedAt: now } : i
      )
    );

    updateDoc(doc(db, 'inventoryItems', itemId), { status: 'Archived', updatedAt: now }).catch((err) => {
      handleFirestoreError(err, 'update', 'inventoryItems', itemId);
    });

    logAudit(
      'Inventory',
      'ARCHIVE_ITEM',
      `Mengarsipkan barang ${existing.name} (${existing.itemCode})`,
      itemId,
      existing.itemCode,
      'Active',
      'Archived'
    );

    return { success: true };
  };

  const unarchiveItem = (itemId: string): { success: boolean; error?: string } => {
    if (!isStaff) return { success: false, error: 'Hanya Admin yang dapat memulihkan barang.' };
    const existing = items.find((i) => i.itemId === itemId);
    if (!existing) return { success: false, error: 'Barang tidak ditemukan.' };

    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((i) =>
        i.itemId === itemId ? { ...i, status: 'Active', updatedAt: now } : i
      )
    );

    updateDoc(doc(db, 'inventoryItems', itemId), { status: 'Active', updatedAt: now }).catch((err) => {
      handleFirestoreError(err, 'update', 'inventoryItems', itemId);
    });

    logAudit(
      'Inventory',
      'UNARCHIVE_ITEM',
      `Mengaktifkan kembali barang ${existing.name} (${existing.itemCode})`,
      itemId,
      existing.itemCode,
      'Archived',
      'Active'
    );

    return { success: true };
  };

  // 4. Create Borrow
  const createBorrow = ({
    borrowerId,
    borrowerName,
    borrowerRole,
    itemId,
    quantity,
    borrowDate,
    expectedReturnDate,
    purpose,
    notes,
  }: {
    borrowerId: string;
    borrowerName: string;
    borrowerRole: string;
    itemId: string;
    quantity: number;
    borrowDate: string;
    expectedReturnDate: string;
    purpose: string;
    notes?: string;
  }): { success: boolean; error?: string } => {
    const item = items.find((i) => i.itemId === itemId);
    if (!item) return { success: false, error: 'Barang tidak ditemukan.' };
    if (item.status === 'Archived') return { success: false, error: 'Barang berstatus diarsipkan dan tidak dapat dipinjam.' };

    if (quantity <= 0) return { success: false, error: 'Jumlah pinjam harus lebih dari 0.' };
    if (!borrowDate) return { success: false, error: 'Tanggal pinjam wajib diisi.' };
    if (!expectedReturnDate) return { success: false, error: 'Tanggal kembali wajib diisi.' };
    if (expectedReturnDate < borrowDate) {
      return { success: false, error: 'Tanggal pengembalian tidak boleh sebelum tanggal pinjam.' };
    }
    if (!purpose.trim()) return { success: false, error: 'Keperluan praktikum/tujuan peminjaman wajib diisi.' };

    // Strict stock check: Borrowed <= Available
    const stock = getItemStockInfo(itemId);
    if (quantity > stock.availableQuantity) {
      return {
        success: false,
        error: `Stok tersedia tidak mencukupi! Tersedia: ${stock.availableQuantity} ${item.unit}, diminta: ${quantity} ${item.unit}.`,
      };
    }

    const now = new Date().toISOString();
    const newBorrow: BorrowRecord = {
      borrowId: 'bor-' + Date.now(),
      borrowerId,
      borrowerName,
      borrowerRole,
      itemId,
      itemCode: item.itemCode,
      itemName: item.name,
      quantity,
      borrowDate,
      purpose: purpose.trim(),
      expectedReturnDate,
      status: 'Borrowed',
      notes: notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    setBorrows((prev) => [newBorrow, ...prev]);

    setDoc(doc(db, 'borrowRecords', newBorrow.borrowId), newBorrow).catch((err) => {
      handleFirestoreError(err, 'create', 'borrowRecords', newBorrow.borrowId);
    });

    logAudit(
      'Borrow',
      'BORROW_ITEM',
      `Peminjaman ${quantity} ${item.unit} ${item.name} (${item.itemCode}) oleh ${borrowerName} untuk "${purpose}"`,
      item.itemId,
      item.itemCode,
      `Tersedia sebelumnya: ${stock.availableQuantity}`,
      `Tersedia sekarang: ${stock.availableQuantity - quantity}`
    );

    return { success: true };
  };

  // 5. Process Return
  const processReturn = ({
    borrowId,
    actualReturnDate,
    returnCondition,
    notes,
    damageDescriptionIfAny,
  }: {
    borrowId: string;
    actualReturnDate: string;
    returnCondition: 'Good' | 'Fair' | 'Damaged' | 'Hilang';
    notes?: string;
    damageDescriptionIfAny?: string;
  }): { success: boolean; error?: string } => {
    if (!isStaff) return { success: false, error: 'Hanya Staf Lab yang dapat memproses pengembalian barang.' };

    const borrow = borrows.find((b) => b.borrowId === borrowId);
    if (!borrow) return { success: false, error: 'Catatan peminjaman tidak ditemukan.' };
    if (borrow.status === 'Returned') return { success: false, error: 'Barang ini sudah dikembalikan sebelumnya.' };

    const item = items.find((i) => i.itemId === borrow.itemId);
    if (!item) return { success: false, error: 'Data barang tidak ditemukan.' };

    if (!actualReturnDate) return { success: false, error: 'Tanggal pengembalian aktual wajib diisi.' };

    const now = new Date().toISOString();
    const updatedNotes = notes ? (borrow.notes ? `${borrow.notes} | Pengembalian: ${notes}` : `Pengembalian: ${notes}`) : (borrow.notes || '');

    const borrowUpdates = {
      actualReturnDate,
      returnCondition,
      status: 'Returned' as const,
      notes: updatedNotes,
      updatedAt: now,
    };

    // Update local state
    setBorrows((prev) =>
      prev.map((b) => (b.borrowId === borrowId ? { ...b, ...borrowUpdates } : b))
    );

    updateDoc(doc(db, 'borrowRecords', borrowId), borrowUpdates).catch((err) => {
      handleFirestoreError(err, 'update', 'borrowRecords', borrowId);
    });

    if (returnCondition === 'Damaged') {
      const desc =
        damageDescriptionIfAny?.trim() ||
        `Kerusakan dilaporkan saat pengembalian oleh ${borrow.borrowerName}: ${notes || 'Kondisi barang rusak/cacat.'}`;

      const newMaint: MaintenanceRecord = {
        maintenanceId: 'maint-' + Date.now(),
        itemId: item.itemId,
        itemCode: item.itemCode,
        itemName: item.name,
        quantity: borrow.quantity,
        damageDescription: desc,
        repairStatus: 'Reported',
        reportedDate: actualReturnDate,
        pic: currentUser.name,
        repairCost: 0,
        notes: `Berasal dari pengembalian peminjaman (${borrow.borrowId})`,
        createdAt: now,
        updatedAt: now,
      };

      setMaintenance((prev) => [newMaint, ...prev]);

      setDoc(doc(db, 'maintenanceRecords', newMaint.maintenanceId), newMaint).catch((err) => {
        handleFirestoreError(err, 'create', 'maintenanceRecords', newMaint.maintenanceId);
      });

      logAudit(
        'Borrow',
        'RETURN_DAMAGED',
        `Pengembalian barang dalam kondisi RUSAK: ${borrow.quantity} ${item.unit} ${item.name}. Langsung dimasukkan ke antrean Maintenance.`,
        item.itemId,
        item.itemCode,
        `Status Peminjaman: ${borrow.status}`,
        `Status Pengembalian: Returned (Damaged). Maintenance ID: ${newMaint.maintenanceId}`
      );
    } else if (returnCondition === 'Hilang') {
      const itemNotes = item.notes
        ? `${item.notes} | [Hilang saat dipinjam oleh ${borrow.borrowerName} (${actualReturnDate})]`
        : `[Hilang saat dipinjam oleh ${borrow.borrowerName} (${actualReturnDate})]`;

      setItems((prev) =>
        prev.map((i) =>
          i.itemId === item.itemId
            ? { ...i, condition: 'Hilang', notes: itemNotes, updatedAt: now }
            : i
        )
      );

      updateDoc(doc(db, 'inventoryItems', item.itemId), {
        condition: 'Hilang',
        notes: itemNotes,
        updatedAt: now,
      }).catch((err) => {
        handleFirestoreError(err, 'update', 'inventoryItems', item.itemId);
      });

      logAudit(
        'Borrow',
        'RETURN_HILANG',
        `Pengembalian barang dilaporkan HILANG: ${borrow.quantity} ${item.unit} ${item.name} oleh ${borrow.borrowerName}. Barang ditandai kondisi Hilang.`,
        item.itemId,
        item.itemCode,
        `Kondisi: ${item.condition}`,
        `Kondisi Baru: Hilang`
      );
    } else {
      logAudit(
        'Borrow',
        'RETURN_GOOD',
        `Pengembalian barang: ${borrow.quantity} ${item.unit} ${item.name} dikembalikan dalam kondisi ${returnCondition}. Tersedia kembali.`,
        item.itemId,
        item.itemCode,
        `Status Peminjaman: ${borrow.status}`,
        `Status: Returned (${returnCondition})`
      );
    }

    return { success: true };
  };

  // 6. Create Maintenance
  const createMaintenance = ({
    itemId,
    quantity,
    damageDescription,
    reportedDate,
    pic,
    repairCost = 0,
    notes,
  }: {
    itemId: string;
    quantity: number;
    damageDescription: string;
    reportedDate: string;
    pic: string;
    repairCost?: number;
    notes?: string;
  }): { success: boolean; error?: string } => {
    if (!isStaff) return { success: false, error: 'Hanya Staf Lab yang dapat mencatat maintenance.' };

    const item = items.find((i) => i.itemId === itemId);
    if (!item) return { success: false, error: 'Barang tidak ditemukan.' };

    if (quantity <= 0) return { success: false, error: 'Jumlah barang rusak harus lebih dari 0.' };
    if (!damageDescription.trim()) return { success: false, error: 'Deskripsi kerusakan wajib diisi.' };
    if (!reportedDate) return { success: false, error: 'Tanggal laporan wajib diisi.' };
    if (!pic.trim()) return { success: false, error: 'Nama PIC/Teknisi wajib diisi.' };
    if (repairCost < 0) return { success: false, error: 'Biaya perbaikan tidak boleh negatif.' };

    const stock = getItemStockInfo(itemId);
    if (quantity > item.quantity) {
      return {
        success: false,
        error: `Jumlah rusak (${quantity}) tidak boleh melebihi total unit barang (${item.quantity}).`,
      };
    }

    const now = new Date().toISOString();
    const newMaint: MaintenanceRecord = {
      maintenanceId: 'maint-' + Date.now(),
      itemId: item.itemId,
      itemCode: item.itemCode,
      itemName: item.name,
      quantity,
      damageDescription: damageDescription.trim(),
      repairStatus: 'Reported',
      reportedDate,
      pic: pic.trim(),
      repairCost,
      notes: notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    setMaintenance((prev) => [newMaint, ...prev]);

    setDoc(doc(db, 'maintenanceRecords', newMaint.maintenanceId), newMaint).catch((err) => {
      handleFirestoreError(err, 'create', 'maintenanceRecords', newMaint.maintenanceId);
    });

    logAudit(
      'Maintenance',
      'CREATE_MAINTENANCE',
      `Mencatat kerusakan ${quantity} ${item.unit} ${item.name} (${item.itemCode}): "${damageDescription}"`,
      item.itemId,
      item.itemCode,
      `Tersedia sebelumnya: ${stock.availableQuantity}`,
      `Status Maintenance: Reported (Qty: ${quantity})`
    );

    return { success: true };
  };

  // 7. Update Maintenance Status
  const updateMaintenanceStatus = ({
    maintenanceId,
    repairStatus,
    pic,
    repairCost,
    notes,
    resolvedCondition = 'Good',
    retireUnitsIfNotRepairable = false,
  }: {
    maintenanceId: string;
    repairStatus: MaintenanceRecord['repairStatus'];
    pic?: string;
    repairCost?: number;
    notes?: string;
    resolvedCondition?: 'Good' | 'Fair';
    retireUnitsIfNotRepairable?: boolean;
  }): { success: boolean; error?: string } => {
    if (!isStaff) return { success: false, error: 'Hanya Staf Lab yang dapat mengubah status maintenance.' };

    const rec = maintenance.find((m) => m.maintenanceId === maintenanceId);
    if (!rec) return { success: false, error: 'Data maintenance tidak ditemukan.' };

    const item = items.find((i) => i.itemId === rec.itemId);
    if (!item) return { success: false, error: 'Barang terkait tidak ditemukan.' };

    if (repairCost !== undefined && repairCost < 0) {
      return { success: false, error: 'Biaya perbaikan tidak boleh negatif.' };
    }

    const now = new Date().toISOString();
    const prevStatus = rec.repairStatus;

    const updatedMaintData = {
      repairStatus,
      pic: pic !== undefined ? pic.trim() : rec.pic,
      repairCost: repairCost !== undefined ? repairCost : rec.repairCost,
      notes: notes !== undefined ? notes.trim() : rec.notes,
      resolvedDate:
        repairStatus === 'Repaired' || repairStatus === 'Not Repairable'
          ? now.split('T')[0]
          : rec.resolvedDate,
      updatedAt: now,
    };

    setMaintenance((prev) =>
      prev.map((m) => (m.maintenanceId === maintenanceId ? { ...m, ...updatedMaintData } : m))
    );

    updateDoc(doc(db, 'maintenanceRecords', maintenanceId), updatedMaintData).catch((err) => {
      handleFirestoreError(err, 'update', 'maintenanceRecords', maintenanceId);
    });

    if (repairStatus === 'Repaired') {
      if (item.condition === 'Damaged' || item.condition === 'Under Maintenance' || item.condition === 'Hilang') {
        setItems((prev) =>
          prev.map((i) =>
            i.itemId === item.itemId ? { ...i, condition: resolvedCondition, updatedAt: now } : i
          )
        );

        updateDoc(doc(db, 'inventoryItems', item.itemId), {
          condition: resolvedCondition,
          updatedAt: now,
        }).catch((err) => {
          handleFirestoreError(err, 'update', 'inventoryItems', item.itemId);
        });
      }

      logAudit(
        'Maintenance',
        'MAINTENANCE_REPAIRED',
        `Perbaikan selesai untuk ${rec.quantity} ${item.unit} ${item.name}. Barang kembali ke stok normal dengan kondisi ${resolvedCondition}.`,
        item.itemId,
        item.itemCode,
        `Status: ${prevStatus}`,
        `Status: Repaired (Kondisi: ${resolvedCondition}, Biaya: Rp ${(repairCost ?? rec.repairCost).toLocaleString('id-ID')})`
      );
    } else if (repairStatus === 'Not Repairable') {
      if (retireUnitsIfNotRepairable) {
        const newTotal = Math.max(0, item.quantity - rec.quantity);
        setItems((prev) =>
          prev.map((i) =>
            i.itemId === item.itemId ? { ...i, quantity: newTotal, updatedAt: now } : i
          )
        );

        updateDoc(doc(db, 'inventoryItems', item.itemId), {
          quantity: newTotal,
          updatedAt: now,
        }).catch((err) => {
          handleFirestoreError(err, 'update', 'inventoryItems', item.itemId);
        });

        logAudit(
          'Maintenance',
          'RETIRE_DAMAGED_ITEM',
          `Penghapusan aset (Write-off): ${rec.quantity} unit ${item.name} dihapus dari total inventaris karena rusak permanen.`,
          item.itemId,
          item.itemCode,
          `Total Stok: ${item.quantity}`,
          `Total Stok Baru: ${newTotal}`
        );
      } else {
        logAudit(
          'Maintenance',
          'NOT_REPAIRABLE',
          `Status perbaikan ${item.name} dinyatakan tidak dapat diperbaiki (Not Repairable). Tidak dimasukkan kembali ke available stock.`,
          item.itemId,
          item.itemCode,
          `Status: ${prevStatus}`,
          'Status: Not Repairable'
        );
      }
    } else {
      logAudit(
        'Maintenance',
        'UPDATE_MAINTENANCE_STATUS',
        `Update maintenance ${item.name}: ${prevStatus} -> ${repairStatus}`,
        item.itemId,
        item.itemCode,
        prevStatus,
        repairStatus
      );
    }

    return { success: true };
  };

  // 8. Create or Update Restock Record
  const createOrUpdateRestock = ({
    itemId,
    recommendedQuantity,
    targetStock,
    notes,
  }: {
    itemId: string;
    recommendedQuantity: number;
    targetStock?: number;
    notes?: string;
  }): { success: boolean; error?: string } => {
    if (!isStaff) return { success: false, error: 'Hanya Staf Lab yang dapat membuat permintaan restock.' };

    const item = items.find((i) => i.itemId === itemId);
    if (!item) return { success: false, error: 'Barang tidak ditemukan.' };

    if (recommendedQuantity <= 0) {
      return { success: false, error: 'Jumlah restock harus lebih dari 0.' };
    }

    const effectiveTarget = targetStock ?? item.targetStock ?? (item.minimumStock * 2);
    const now = new Date().toISOString();

    const existing = restocks.find(
      (r) => r.itemId === itemId && (r.status === 'To Buy' || r.status === 'Ordered')
    );

    if (existing) {
      const restockUpdate = {
        recommendedQuantity,
        targetStock: effectiveTarget,
        notes: notes ?? existing.notes ?? '',
        updatedAt: now,
      };

      setRestocks((prev) =>
        prev.map((r) => (r.restockId === existing.restockId ? { ...r, ...restockUpdate } : r))
      );

      updateDoc(doc(db, 'restockRecords', existing.restockId), restockUpdate).catch((err) => {
        handleFirestoreError(err, 'update', 'restockRecords', existing.restockId);
      });

      logAudit(
        'Restock',
        'UPDATE_RESTOCK',
        `Memperbarui rencana restock ${item.name} (${item.itemCode}): Qty rekomendasi ${recommendedQuantity}`,
        item.itemId,
        item.itemCode,
        `Rec Qty: ${existing.recommendedQuantity}`,
        `Rec Qty: ${recommendedQuantity}`
      );
    } else {
      const newRestock: RestockRecord = {
        restockId: 'rst-' + Date.now(),
        itemId: item.itemId,
        itemCode: item.itemCode,
        itemName: item.name,
        category: item.category,
        currentStock: item.quantity,
        minimumStock: item.minimumStock,
        targetStock: effectiveTarget,
        recommendedQuantity,
        status: 'To Buy',
        supplier: item.supplier,
        notes: notes?.trim() || '',
        createdAt: now,
        updatedAt: now,
      };

      setRestocks((prev) => [newRestock, ...prev]);

      setDoc(doc(db, 'restockRecords', newRestock.restockId), newRestock).catch((err) => {
        handleFirestoreError(err, 'create', 'restockRecords', newRestock.restockId);
      });

      logAudit(
        'Restock',
        'CREATE_RESTOCK',
        `Membuat permintaan restock untuk ${item.name} (${recommendedQuantity} ${item.unit})`,
        item.itemId,
        item.itemCode,
        '-',
        `Status: To Buy, Rekomendasi: ${recommendedQuantity}`
      );
    }

    return { success: true };
  };

  // 9. Order Restock (To Buy -> Ordered)
  const orderRestock = ({
    restockId,
    supplier,
    orderedDate,
    notes,
  }: {
    restockId: string;
    supplier: string;
    orderedDate: string;
    notes?: string;
  }): { success: boolean; error?: string } => {
    if (!isStaff) return { success: false, error: 'Hanya Staf Lab yang dapat memesan restock.' };

    const rec = restocks.find((r) => r.restockId === restockId);
    if (!rec) return { success: false, error: 'Data restock tidak ditemukan.' };
    if (!supplier.trim()) return { success: false, error: 'Nama supplier wajib diisi.' };
    if (!orderedDate) return { success: false, error: 'Tanggal pemesanan wajib diisi.' };

    const now = new Date().toISOString();
    const orderUpdate = {
      status: 'Ordered' as const,
      supplier: supplier.trim(),
      orderedDate,
      notes: notes?.trim() || rec.notes || '',
      updatedAt: now,
    };

    setRestocks((prev) =>
      prev.map((r) => (r.restockId === restockId ? { ...r, ...orderUpdate } : r))
    );

    updateDoc(doc(db, 'restockRecords', restockId), orderUpdate).catch((err) => {
      handleFirestoreError(err, 'update', 'restockRecords', restockId);
    });

    logAudit(
      'Restock',
      'ORDER_RESTOCK',
      `Pesanan restock dibuat untuk ${rec.itemName}: ${rec.recommendedQuantity} unit ke supplier "${supplier}"`,
      rec.itemId,
      rec.itemCode,
      'Status: To Buy',
      `Status: Ordered (Supplier: ${supplier}, Tgl: ${orderedDate})`
    );

    return { success: true };
  };

  // 10. Receive Restock (Ordered -> Received)
  const receiveRestock = ({
    restockId,
    receivedQuantity,
    receivedDate,
    notes,
  }: {
    restockId: string;
    receivedQuantity: number;
    receivedDate: string;
    notes?: string;
  }): { success: boolean; error?: string } => {
    if (!isStaff) return { success: false, error: 'Hanya Staf Lab yang dapat memproses penerimaan barang.' };

    const rec = restocks.find((r) => r.restockId === restockId);
    if (!rec) return { success: false, error: 'Data restock tidak ditemukan.' };
    if (receivedQuantity <= 0) {
      return { success: false, error: 'Jumlah barang diterima harus lebih dari 0.' };
    }
    if (!receivedDate) return { success: false, error: 'Tanggal penerimaan wajib diisi.' };

    const item = items.find((i) => i.itemId === rec.itemId);
    if (!item) return { success: false, error: 'Barang tidak ditemukan di inventaris.' };

    const now = new Date().toISOString();
    const prevQuantity = item.quantity;
    const newQuantity = prevQuantity + receivedQuantity;
    const resolvedCondition = item.condition === 'Damaged' || item.condition === 'Hilang' ? 'Good' : item.condition;

    const receiveUpdate = {
      status: 'Received' as const,
      receivedQuantity,
      receivedDate,
      notes: notes?.trim() || rec.notes || '',
      updatedAt: now,
    };

    setRestocks((prev) =>
      prev.map((r) => (r.restockId === restockId ? { ...r, ...receiveUpdate } : r))
    );

    setItems((prev) =>
      prev.map((i) =>
        i.itemId === item.itemId
          ? {
              ...i,
              quantity: newQuantity,
              condition: resolvedCondition,
              updatedAt: now,
            }
          : i
      )
    );

    updateDoc(doc(db, 'restockRecords', restockId), receiveUpdate).catch((err) => {
      handleFirestoreError(err, 'update', 'restockRecords', restockId);
    });

    updateDoc(doc(db, 'inventoryItems', item.itemId), {
      quantity: newQuantity,
      condition: resolvedCondition,
      updatedAt: now,
    }).catch((err) => {
      handleFirestoreError(err, 'update', 'inventoryItems', item.itemId);
    });

    logAudit(
      'Restock',
      'RECEIVE_RESTOCK',
      `Penerimaan barang restock: ${receivedQuantity} ${item.unit} ${item.name} telah diterima fisik dan ditambahkan ke stok.`,
      item.itemId,
      item.itemCode,
      `Stok Lama: ${prevQuantity}`,
      `Stok Baru: ${newQuantity} (+${receivedQuantity})`
    );

    return { success: true };
  };

  // Purge all dummy data from memory, localStorage, and Firestore (retaining only genuine user data)
  const purgeDummyData = async (): Promise<void> => {
    // 1. Immediately filter out dummy items from state
    setItems((prev) => prev.filter((i) => !DUMMY_ITEM_IDS.includes(i.itemId)));
    setBorrows((prev) => prev.filter((b) => !DUMMY_BORROW_IDS.includes(b.borrowId)));
    setMaintenance((prev) => prev.filter((m) => !DUMMY_MAINTENANCE_IDS.includes(m.maintenanceId)));
    setRestocks((prev) => prev.filter((r) => !DUMMY_RESTOCK_IDS.includes(r.restockId)));
    setAuditLogs((prev) => prev.filter((l) => !DUMMY_AUDIT_LOG_IDS.includes(l.logId)));

    // 2. Clear localStorage dummy caches
    try {
      localStorage.removeItem(STORAGE_KEYS.ITEMS);
      localStorage.removeItem(STORAGE_KEYS.BORROWS);
      localStorage.removeItem(STORAGE_KEYS.MAINTENANCE);
      localStorage.removeItem(STORAGE_KEYS.RESTOCKS);
      localStorage.removeItem(STORAGE_KEYS.AUDIT);
    } catch {
      // ignore
    }

    // 3. Purge dummy documents directly from Firestore
    await cleanupFirestoreDummyData();
    console.log('Semua data dummy telah dibersihkan. Hanya data Firestore tersimpan.');
  };

  const resetToSampleData = purgeDummyData;

  // Export JSON
  const exportDataJSON = () => {
    const backup = {
      exportDate: new Date().toISOString(),
      items,
      categories,
      locations,
      borrows,
      maintenance,
      restocks,
      auditLogs,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `science_lab_inventory_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV of Inventory
  const exportInventoryCSV = () => {
    const headers = [
      'ID Barang',
      'Kode Barang',
      'Nama Barang',
      'Kategori',
      'Total Quantity',
      'Available',
      'Borrowed',
      'Damaged',
      'Hilang',
      'Maintenance',
      'Satuan',
      'Condition',
      'Location',
      'Minimum Stock',
      'Supplier',
      'Purchase Date',
      'Harga Beli Satuan (Rp)',
      'Status',
    ];

    const rows = items.map((item) => {
      const stock = getItemStockInfo(item.itemId);
      return [
        `"${item.itemId}"`,
        `"${item.itemCode}"`,
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.category}"`,
        item.quantity,
        stock.availableQuantity,
        stock.borrowedQuantity,
        stock.damagedQuantity,
        stock.lostQuantity,
        stock.maintenanceQuantity,
        `"${item.unit}"`,
        `"${item.condition}"`,
        `"${item.location}"`,
        item.minimumStock,
        `"${item.supplier || ''}"`,
        `"${item.purchaseDate || ''}"`,
        item.unitPurchasePrice || 0,
        `"${item.status}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventaris_lab_sains_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <InventoryContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        availableUsers: INITIAL_USERS,
        isStaff,
        isAuthenticated,
        authLoading,
        authError,
        setAuthError,
        loginWithGoogle,
        logout,
        loginWithQuickAccount,
        items,
        categories,
        locations,
        addCategory,
        addLocation,
        isFirebaseConnected,
        isSyncing,
        firestoreError,
        borrows,
        maintenance,
        restocks,
        auditLogs,
        getItemStockInfo,
        addItem,
        updateItem,
        archiveItem,
        unarchiveItem,
        createBorrow,
        processReturn,
        createMaintenance,
        updateMaintenanceStatus,
        createOrUpdateRestock,
        orderRestock,
        receiveRestock,
        purgeDummyData,
        resetToSampleData,
        exportDataJSON,
        exportInventoryCSV,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
