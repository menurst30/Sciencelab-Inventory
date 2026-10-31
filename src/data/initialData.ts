import { InventoryItem, BorrowRecord, MaintenanceRecord, RestockRecord, AuditLog, User } from '../types/inventory';

export const DEFAULT_CATEGORIES: string[] = [
  'Biologi',
  'Fisika',
  'Kimia',
  'Umum',
  'Urban Gardening',
  'Household',
  'Others',
];

export const DEFAULT_LOCATIONS: string[] = [
  "Tr. Susi's class",
  "Tr. Menur's class",
  'Lab Science Lemari Kimia',
  'Lab Science Lemari Fisika',
  'Lab Science Lemari Biologi',
  'Kontainer Science 1',
  'Kontainer Science 2',
  'Kontainer Science 3',
  'Kontainer Household 1',
  'Kontainer Household 2',
  'Kontainer Household 3',
  'Kontainer Urban Gardening 1',
  'Kontainer Urban Gardening 2',
  'Kontainer Urban Gardening 3',
  'Others',
];

export const INITIAL_USERS: User[] = [
  {
    userId: 'usr-admin-menur',
    name: 'Menurseto Mawaddah, S.Pd',
    email: 'menur@lazuardi.sch.id',
    role: 'admin',
    department: 'Kepala Laboratorium Science & Science Teacher',
  },
  {
    userId: 'usr-admin-susi',
    name: 'Susiyanti Wedya, S.Pd',
    email: 'susi@lazuardi.sch.id',
    role: 'admin',
    department: 'Science Teacher & Admin Laboratorium',
  },
  {
    userId: 'usr-teacher-sample',
    name: 'Guru Sains Lazuardi',
    email: 'guru.science@lazuardi.sch.id',
    role: 'teacher',
    department: 'Guru Sains / Peminjam Lab',
  },
];

// Known dummy IDs that might have been previously seeded and need cleanup
export const DUMMY_ITEM_IDS: string[] = [
  'item-001',
  'item-002',
  'item-003',
  'item-004',
  'item-005',
  'item-006',
  'item-007',
  'item-008',
  'item-009',
  'item-010',
  'item-011',
  'item-012',
  'item-013',
  'item-014',
  'item-015',
  'item-016',
  'item-017',
];

export const DUMMY_BORROW_IDS: string[] = [
  'bor-001',
  'bor-002',
  'bor-003',
];

export const DUMMY_MAINTENANCE_IDS: string[] = [
  'maint-001',
];

export const DUMMY_RESTOCK_IDS: string[] = [
  'rst-001',
  'rst-002',
];

export const DUMMY_AUDIT_LOG_IDS: string[] = [
  'log-001',
  'log-002',
];

// All initial datasets are empty to guarantee zero dummy data
export const INITIAL_ITEMS: InventoryItem[] = [];
export const INITIAL_BORROWS: BorrowRecord[] = [];
export const INITIAL_MAINTENANCE: MaintenanceRecord[] = [];
export const INITIAL_RESTOCKS: RestockRecord[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

