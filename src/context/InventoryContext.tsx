import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  InventoryItem,
  BorrowRecord,
  MaintenanceRecord,
  RestockRecord,
  AuditLog,
  User,
  UserRole,
  ItemCondition,
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
} from '../data/initialData';

interface InventoryContextType {
  // Current user & role
  currentUser: User;
  setCurrentUser: (user: User) => void;
  availableUsers: User[];
  isStaff: boolean;

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
  resetToSampleData: () => void;
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
  // Current user state
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        const matched = INITIAL_USERS.find((u) => u.userId === parsed.userId || u.email === parsed.email);
        if (matched) return matched;
      }
    } catch {
      // fallback
    }
    return INITIAL_USERS[0];
  });

  // Items
  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_ITEMS;
  });

  // Custom Categories
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all required are present
        const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...parsed]));
        return merged;
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
        // Merge with defaults to ensure all required are present
        const merged = Array.from(new Set([...DEFAULT_LOCATIONS, ...parsed]));
        return merged;
      }
    } catch {
      // fallback
    }
    return DEFAULT_LOCATIONS;
  });

  // Borrows
  const [borrows, setBorrows] = useState<BorrowRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BORROWS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_BORROWS;
  });

  // Maintenance
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MAINTENANCE);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_MAINTENANCE;
  });

  // Restocks
  const [restocks, setRestocks] = useState<RestockRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RESTOCKS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_RESTOCKS;
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIT);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_AUDIT_LOGS;
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save items to storage', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save categories to storage', e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
    } catch (e) {
      console.error('Failed to save locations to storage', e);
    }
  }, [locations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BORROWS, JSON.stringify(borrows));
    } catch (e) {
      console.error('Failed to save borrows to storage', e);
    }
  }, [borrows]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(maintenance));
    } catch (e) {
      console.error('Failed to save maintenance to storage', e);
    }
  }, [maintenance]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RESTOCKS, JSON.stringify(restocks));
    } catch (e) {
      console.error('Failed to save restocks to storage', e);
    }
  }, [restocks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
    } catch (e) {
      console.error('Failed to save audit logs to storage', e);
    }
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } catch (e) {
      console.error('Failed to save current user to storage', e);
    }
  }, [currentUser]);

  // Check and update overdue status on mount & change
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setBorrows((prev) =>
      prev.map((b) => {
        if (b.status === 'Borrowed' && b.expectedReturnDate < today) {
          return { ...b, status: 'Overdue', updatedAt: new Date().toISOString() };
        }
        return b;
      })
    );
  }, []);

  const isStaff = currentUser.role === 'admin';

  // Helper to add custom category
  const addCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    setCategories((prev) => {
      if (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, trimmed];
    });
  };

  // Helper to add custom location
  const addLocation = (locationName: string) => {
    const trimmed = locationName.trim();
    if (!trimmed) return;
    setLocations((prev) => {
      if (prev.some((l) => l.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, trimmed];
    });
  };

  // Helper to append audit log
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
      actorName: currentUser.name,
      actorRole: isStaff ? 'Admin Lab' : 'Guru / Peminjam',
      entityType,
      action,
      itemId,
      itemCode,
      description,
      previousValue,
      newValue,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
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
  const addItem = (itemData: Omit<InventoryItem, 'itemId' | 'createdAt' | 'updatedAt'>) => {
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

    // Ensure category and location are registered in dynamic lists
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

    setItems((prev) => [newItem, ...prev]);

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
  const updateItem = (itemId: string, updates: Partial<InventoryItem>) => {
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

    setItems((prev) => prev.map((i) => (i.itemId === itemId ? updatedItem : i)));

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
  const archiveItem = (itemId: string) => {
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

    setItems((prev) =>
      prev.map((i) =>
        i.itemId === itemId ? { ...i, status: 'Archived', updatedAt: new Date().toISOString() } : i
      )
    );

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

  const unarchiveItem = (itemId: string) => {
    if (!isStaff) return { success: false, error: 'Hanya Admin yang dapat memulihkan barang.' };
    const existing = items.find((i) => i.itemId === itemId);
    if (!existing) return { success: false, error: 'Barang tidak ditemukan.' };

    setItems((prev) =>
      prev.map((i) =>
        i.itemId === itemId ? { ...i, status: 'Active', updatedAt: new Date().toISOString() } : i
      )
    );

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
  }) => {
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
      notes: notes?.trim(),
      createdAt: now,
      updatedAt: now,
    };

    setBorrows((prev) => [newBorrow, ...prev]);

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
  }) => {
    if (!isStaff) return { success: false, error: 'Hanya Staf Lab yang dapat memproses pengembalian barang.' };

    const borrow = borrows.find((b) => b.borrowId === borrowId);
    if (!borrow) return { success: false, error: 'Catatan peminjaman tidak ditemukan.' };
    if (borrow.status === 'Returned') return { success: false, error: 'Barang ini sudah dikembalikan sebelumnya.' };

    const item = items.find((i) => i.itemId === borrow.itemId);
    if (!item) return { success: false, error: 'Data barang tidak ditemukan.' };

    if (!actualReturnDate) return { success: false, error: 'Tanggal pengembalian aktual wajib diisi.' };

    const now = new Date().toISOString();

    // Update borrow record
    setBorrows((prev) =>
      prev.map((b) =>
        b.borrowId === borrowId
          ? {
              ...b,
              actualReturnDate,
              returnCondition,
              status: 'Returned',
              notes: notes ? (b.notes ? `${b.notes} | Pengembalian: ${notes}` : `Pengembalian: ${notes}`) : b.notes,
              updatedAt: now,
            }
          : b
      )
    );

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
      // Mark item condition as Hilang
      setItems((prev) =>
        prev.map((i) =>
          i.itemId === item.itemId
            ? {
                ...i,
                condition: 'Hilang',
                notes: i.notes
                  ? `${i.notes} | [Hilang saat dipinjam oleh ${borrow.borrowerName} (${actualReturnDate})]`
                  : `[Hilang saat dipinjam oleh ${borrow.borrowerName} (${actualReturnDate})]`,
                updatedAt: now,
              }
            : i
        )
      );

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
      // Good or Fair -> Stock returns to available automatically
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
  }) => {
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
      notes: notes?.trim(),
      createdAt: now,
      updatedAt: now,
    };

    setMaintenance((prev) => [newMaint, ...prev]);

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
  }) => {
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

    setMaintenance((prev) =>
      prev.map((m) =>
        m.maintenanceId === maintenanceId
          ? {
              ...m,
              repairStatus,
              pic: pic !== undefined ? pic.trim() : m.pic,
              repairCost: repairCost !== undefined ? repairCost : m.repairCost,
              notes: notes !== undefined ? notes.trim() : m.notes,
              resolvedDate: repairStatus === 'Repaired' || repairStatus === 'Not Repairable' ? now.split('T')[0] : m.resolvedDate,
              updatedAt: now,
            }
          : m
      )
    );

    if (repairStatus === 'Repaired') {
      if (item.condition === 'Damaged' || item.condition === 'Under Maintenance' || item.condition === 'Hilang') {
        setItems((prev) =>
          prev.map((i) =>
            i.itemId === item.itemId ? { ...i, condition: resolvedCondition, updatedAt: now } : i
          )
        );
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
  }) => {
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
      setRestocks((prev) =>
        prev.map((r) =>
          r.restockId === existing.restockId
            ? {
                ...r,
                recommendedQuantity,
                targetStock: effectiveTarget,
                notes: notes ?? r.notes,
                updatedAt: now,
              }
            : r
        )
      );

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
        notes: notes?.trim(),
        createdAt: now,
        updatedAt: now,
      };

      setRestocks((prev) => [newRestock, ...prev]);

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
  }) => {
    if (!isStaff) return { success: false, error: 'Hanya Staf Lab yang dapat memesan restock.' };

    const rec = restocks.find((r) => r.restockId === restockId);
    if (!rec) return { success: false, error: 'Data restock tidak ditemukan.' };
    if (!supplier.trim()) return { success: false, error: 'Nama supplier wajib diisi.' };
    if (!orderedDate) return { success: false, error: 'Tanggal pemesanan wajib diisi.' };

    const now = new Date().toISOString();
    setRestocks((prev) =>
      prev.map((r) =>
        r.restockId === restockId
          ? {
              ...r,
              status: 'Ordered',
              supplier: supplier.trim(),
              orderedDate,
              notes: notes?.trim() || r.notes,
              updatedAt: now,
            }
          : r
      )
    );

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
  }) => {
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

    setRestocks((prev) =>
      prev.map((r) =>
        r.restockId === restockId
          ? {
              ...r,
              status: 'Received',
              receivedQuantity,
              receivedDate,
              notes: notes?.trim() || r.notes,
              updatedAt: now,
            }
          : r
      )
    );

    setItems((prev) =>
      prev.map((i) =>
        i.itemId === item.itemId
          ? {
              ...i,
              quantity: newQuantity,
              condition: i.condition === 'Damaged' || i.condition === 'Hilang' ? 'Good' : i.condition,
              updatedAt: now,
            }
          : i
      )
    );

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

  // Reset to initial sample data
  const resetToSampleData = () => {
    setItems(INITIAL_ITEMS);
    setCategories(DEFAULT_CATEGORIES);
    setLocations(DEFAULT_LOCATIONS);
    setBorrows(INITIAL_BORROWS);
    setMaintenance(INITIAL_MAINTENANCE);
    setRestocks(INITIAL_RESTOCKS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setCurrentUser(INITIAL_USERS[0]);

    localStorage.removeItem(STORAGE_KEYS.ITEMS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.LOCATIONS);
    localStorage.removeItem(STORAGE_KEYS.BORROWS);
    localStorage.removeItem(STORAGE_KEYS.MAINTENANCE);
    localStorage.removeItem(STORAGE_KEYS.RESTOCKS);
    localStorage.removeItem(STORAGE_KEYS.AUDIT);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };

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
        items,
        categories,
        locations,
        addCategory,
        addLocation,
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
