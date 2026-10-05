import React from 'react';
import { MainNavigationTab } from '../../types/inventory';
import { useInventory } from '../../context/InventoryContext';

interface NavigationProps {
  activeTab: MainNavigationTab;
  onTabChange: (tab: MainNavigationTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const { items, borrows, maintenance, restocks } = useInventory();

  // Badge calculations for quick awareness
  const overdueCount = borrows.filter(
    (b) => b.status === 'Overdue' || (b.status === 'Borrowed' && b.expectedReturnDate < new Date().toISOString().split('T')[0])
  ).length;

  const activeMaintenanceCount = maintenance.filter(
    (m) => m.repairStatus === 'Reported' || m.repairStatus === 'In Repair'
  ).length;

  // Low stock items or To Buy
  const lowStockCount = items.filter((i) => i.status === 'Active' && i.quantity <= i.minimumStock).length;
  const toBuyRestockCount = restocks.filter((r) => r.status === 'To Buy').length;
  const restockBadge = Math.max(lowStockCount, toBuyRestockCount);

  const tabs: {
    id: MainNavigationTab;
    label: string;
    icon: string;
    badgeCount?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '🏠',
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: '🔬',
    },
    {
      id: 'borrow',
      label: 'Borrow / Return',
      icon: '📤',
      badgeCount: overdueCount > 0 ? overdueCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      icon: '⚠️',
      badgeCount: activeMaintenanceCount > 0 ? activeMaintenanceCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'restock',
      label: 'Restock',
      icon: '🛒',
      badgeCount: restockBadge > 0 ? restockBadge : undefined,
      badgeColor: 'bg-orange-500 text-white',
    },
  ];

  return (
    <nav className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-16 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 sm:space-x-3 overflow-x-auto py-2.5 no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="text-base select-none">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span
                    className={`ml-1 text-[11px] px-1.5 py-0.5 rounded-full font-bold shadow-xs ${tab.badgeColor}`}
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
