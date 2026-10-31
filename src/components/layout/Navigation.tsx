import React from 'react';
import { MainNavigationTab } from '../../types/inventory';
import { useInventory } from '../../context/InventoryContext';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Wrench,
  ShoppingBag,
} from 'lucide-react';

interface NavigationProps {
  activeTab: MainNavigationTab;
  onTabChange: (tab: MainNavigationTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const { items, borrows, maintenance, restocks } = useInventory();

  // Badge calculations
  const overdueCount = borrows.filter(
    (b) => b.status === 'Overdue' || (b.status === 'Borrowed' && b.expectedReturnDate < new Date().toISOString().split('T')[0])
  ).length;

  const activeMaintenanceCount = maintenance.filter(
    (m) => m.repairStatus === 'Reported' || m.repairStatus === 'In Repair'
  ).length;

  const lowStockCount = items.filter((i) => i.status === 'Active' && i.quantity <= i.minimumStock).length;
  const toBuyRestockCount = restocks.filter((r) => r.status === 'To Buy').length;
  const restockBadge = Math.max(lowStockCount, toBuyRestockCount);

  const tabs: {
    id: MainNavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeCount?: number;
    badgeStyle?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Package,
    },
    {
      id: 'borrow',
      label: 'Borrow / Return',
      icon: ArrowLeftRight,
      badgeCount: overdueCount > 0 ? overdueCount : undefined,
      badgeStyle: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400',
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      icon: Wrench,
      badgeCount: activeMaintenanceCount > 0 ? activeMaintenanceCount : undefined,
      badgeStyle: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-400',
    },
    {
      id: 'restock',
      label: 'Restock',
      icon: ShoppingBag,
      badgeCount: restockBadge > 0 ? restockBadge : undefined,
      badgeStyle: 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300',
    },
  ];

  return (
    <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-15 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2 no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold ring-1 ring-blue-200 dark:ring-blue-800/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-md font-mono tabular-nums ${tab.badgeStyle}`}
                  >
                    {tab.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
