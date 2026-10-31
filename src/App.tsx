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
import { LoginView } from './components/auth/LoginView';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { UserCheck, ArrowLeft, FlaskConical, RefreshCw } from 'lucide-react';

function AppContent() {
  const { currentUser, isAuthenticated, authLoading, isStaff } = useInventory();
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

  // 1. Loading State while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-900/30 mb-4 animate-pulse">
          <FlaskConical className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight mb-1">Science Lab Inventory</h2>
        <p className="text-xs text-slate-400 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          <span>Memeriksa status akun Google (@lazuardi.sch.id)...</span>
        </p>
      </div>
    );
  }

  // 2. Unauthenticated: Display dedicated Login Screen
  if (!isAuthenticated || !currentUser) {
    return <LoginView />;
  }

  // 3. Authenticated: Render Main Application
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Role Notice Banner for Teachers */}
      {!isStaff && (
        <div className="bg-sky-950/90 border-b border-sky-800 text-sky-200 px-4 py-2 text-xs">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <UserCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              Masuk sebagai <strong>{currentUser.name}</strong> ({currentUser.email}) • Mode Guru:{' '}
              <strong className="text-white">Akses Peminjaman & Pengembalian Aktif</strong>, modul lain adalah{' '}
              <em className="text-sky-300">View-Only</em>.
            </span>
            <span className="ml-auto text-[10px] font-bold bg-sky-900/80 text-sky-300 px-2 py-0.5 rounded-full border border-sky-700 shrink-0">
              @lazuardi.sch.id
            </span>
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
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
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
            <span className="font-semibold text-slate-400">Science Lab Inventory System</span> • Lazuardi School
            • Standar Operasional Laboratorium Sains Terpadu
          </div>
          <div className="text-[11px] text-slate-500">
            Akurasi Stok Real-Time • Akses Multi-Role Terverifikasi • Sinkronisasi Cloud
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
