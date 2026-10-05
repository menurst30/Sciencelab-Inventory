export type ItemCondition = 'Good' | 'Fair' | 'Damaged' | 'Under Maintenance' | 'Hilang';
export type ItemStatus = 'Active' | 'Archived';
export type BorrowStatus = 'Borrowed' | 'Returned' | 'Overdue';
export type MaintenanceStatus = 'Reported' | 'In Repair' | 'Repaired' | 'Not Repairable';
export type RestockStatus = 'To Buy' | 'Ordered' | 'Received';
export type UserRole = 'admin' | 'teacher';

export interface User {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
}

export interface InventoryItem {
  itemId: string;
  itemCode: string;
  name: string;
  category: string;
  quantity: number; // Total physical count owned
  unit: string;
  condition: ItemCondition;
  location: string;
  minimumStock: number;
  supplier: string;
  purchaseDate: string;
  unitPurchasePrice?: number; // In IDR (Rp)
  notes?: string;
  status: ItemStatus;
  targetStock?: number; // Optional maximum target stock for restock calculations
  createdAt: string;
  updatedAt: string;
}

export interface BorrowRecord {
  borrowId: string;
  borrowerId: string;
  borrowerName: string;
  borrowerRole: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  borrowDate: string;
  purpose: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  returnCondition?: 'Good' | 'Fair' | 'Damaged' | 'Hilang';
  status: BorrowStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRecord {
  maintenanceId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  damageDescription: string;
  repairStatus: MaintenanceStatus;
  reportedDate: string;
  pic: string; // Person In Charge
  repairCost: number; // in IDR (Rp)
  notes?: string;
  resolvedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RestockRecord {
  restockId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  targetStock: number;
  recommendedQuantity: number;
  status: RestockStatus;
  supplier?: string;
  orderedDate?: string;
  receivedDate?: string;
  receivedQuantity?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  logId: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  entityType: 'Inventory' | 'Borrow' | 'Maintenance' | 'Restock';
  action: string;
  itemId?: string;
  itemCode?: string;
  description: string;
  previousValue?: string;
  newValue?: string;
}

export type MainNavigationTab = 'dashboard' | 'inventory' | 'borrow' | 'maintenance' | 'restock';

export interface CalculatedItemStock {
  totalQuantity: number;
  borrowedQuantity: number;
  damagedQuantity: number;
  maintenanceQuantity: number;
  lostQuantity: number;
  availableQuantity: number;
  isLowStock: boolean;
}
