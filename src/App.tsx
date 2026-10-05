import React, { useState } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { MainNavigationTab } from './types/inventory';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { DashboardView } from './components/dashboard/DashboardView';
import { InventoryView } from './components/inventory/InventoryView';
import { BorrowReturnView } from './components/borrow/BorrowReturnView';
import { MaintenanceView } from './components/maintenance/MaintenanceView';
import { RestockView } from './components/restock/RestockView';
import { AuditTrailView } from './components/audit/AuditTrailView';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { ShieldCheck, UserCheck, Sparkles, BookOpen, AlertCircle, ArrowLeft } from 'lucide-react';

function AppContent() {
  const { currentUser, setCurrentUser, availableUsers, isStaff } = useInventory();
  const [activeTab, setActiveTab] = useState<MainNavigationTab>('dashboard');
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Navigation with filter states
  const [inventoryConditionFilter, setInventoryConditionFilter] = useState<string>('ALL');

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = 'toast-' + Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleNavigate = (tab: MainNavigationTab, params?: any) => {
    if (params?.filterCondition) {
      setInventoryConditionFilter(params.filterCondition);
    } else {
      setInventoryConditionFilter('ALL');
    }
    setActiveTab(tab);
    setShowAuditModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Role Banner if Teacher Mode */}
      {!isStaff && (
        <div className="bg-sky-950 border-b border-sky-800 text-sky-200 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <UserCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              Anda sedang masuk sebagai <strong>{currentUser.name}</strong> ({currentUser.department}) dengan mode{' '}
              <strong>Guru / Peminjam</strong>. Anda dapat melihat inventaris dan mengajukan peminjaman alat.
            </span>
            <button
              onClick={() => setCurrentUser(availableUsers[0])}
              className="ml-auto underline font-semibold text-white hover:text-sky-300 shrink-0"
            >
              Beralih ke Staf Lab (Admin)
            </button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        onShowAudit={() => setShowAuditModal(!showAuditModal)}
        showAudit={showAuditModal}
      />

      {/* Main Navigation (Dashboard, Inventory, Borrow / Return, Maintenance, Restock) */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setShowAuditModal(false);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showAuditModal ? (
          <div className="space-y-4">
            <button
              onClick={() => setShowAuditModal(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Halaman Sebelumnya</span>
            </button>
            <AuditTrailView onClose={() => setShowAuditModal(false)} />
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
            {activeTab === 'inventory' && (
              <InventoryView
                initialConditionFilter={inventoryConditionFilter}
                onOpenBorrowForItem={() => setActiveTab('borrow')}
                onOpenMaintenanceForItem={() => setActiveTab('maintenance')}
              />
            )}
            {activeTab === 'borrow' && <BorrowReturnView />}
            {activeTab === 'maintenance' && <MaintenanceView />}
            {activeTab === 'restock' && <RestockView />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/60 border-t border-slate-900 py-6 text-slate-500 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-semibold text-slate-400">Science Lab Inventory System</span> • Standard
            Operasional Laboratorium Sains Terpadu
          </div>
          <div className="text-[11px] text-slate-500">
            Akurasi Stok Real-Time • Validasi Transaksi Ketat • Audit Trail Terverifikasi
          </div>
        </div>
      </footer>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <InventoryProvider>
      <AppContent />
    </InventoryProvider>
  );
}
