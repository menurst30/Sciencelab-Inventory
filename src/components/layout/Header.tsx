import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useTheme } from '../../context/ThemeContext';
import {
  FlaskConical,
  ShieldCheck,
  UserCheck,
  Download,
  RotateCcw,
  FileSpreadsheet,
  ChevronDown,
  Cloud,
  CloudOff,
  RefreshCw,
  LogOut,
  Sun,
  Moon,
  History,
  Check,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  onShowAudit: () => void;
  showAudit: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onShowAudit, showAudit }) => {
  const {
    currentUser,
    setCurrentUser,
    availableUsers,
    isStaff,
    logout,
    purgeDummyData,
    exportDataJSON,
    exportInventoryCSV,
    isFirebaseConnected,
    isSyncing,
    firestoreError,
  } = useInventory();

  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const handleReset = async () => {
    setIsPurging(true);
    try {
      await purgeDummyData();
    } finally {
      setIsPurging(false);
      setShowResetConfirm(false);
    }
  };

  return (
    <header className="bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sticky top-0 z-40 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-xs">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">
                Science Lab Inventory
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80">
                Lazuardi
              </span>
              
              {/* Cloud Sync Status */}
              <div className="hidden lg:flex items-center ml-2">
                {isSyncing ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Sinkronisasi...</span>
                  </span>
                ) : isFirebaseConnected ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400" title="Terkoneksi ke Firebase Firestore">
                    <Cloud className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Cloud Aktif</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-rose-500 dark:text-rose-400" title={firestoreError || 'Firebase offline'}>
                    <CloudOff className="w-3.5 h-3.5" />
                    <span>Offline</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Quick Tools, Theme Toggle, Audit Log, User Profile */}
          <div className="flex items-center gap-2">
            {/* Quick Export Tools */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/80">
              <button
                onClick={exportInventoryCSV}
                title="Ekspor Inventaris ke CSV"
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-md transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>CSV</span>
              </button>
              <button
                onClick={exportDataJSON}
                title="Backup Lengkap Database JSON"
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-md transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Backup</span>
              </button>
              {isStaff && (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  title="Bersihkan Semua Data Dummy dari Firestore"
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-md transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Bersihkan Dummy</span>
                </button>
              )}
            </div>

            {/* Audit Log Button */}
            <button
              onClick={onShowAudit}
              title="Lihat Riwayat Aktivitas & Audit Trail"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                showAudit
                  ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                  : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Riwayat Aktivitas</span>
            </button>

            {/* Theme Toggle Button (Light/Dark with Sun/Moon) */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle tema gelap atau terang"
              title={theme === 'dark' ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600" />
              )}
            </button>

            {/* User Profile & Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
              >
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.name}
                    className="w-6 h-6 rounded-md object-cover border border-slate-300 dark:border-slate-600"
                  />
                ) : (
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold ${
                      isStaff
                        ? 'bg-blue-600 text-white dark:bg-blue-500'
                        : 'bg-slate-700 text-white dark:bg-slate-600'
                    }`}
                  >
                    {isStaff ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-medium text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                    <span className="truncate max-w-[120px]">{currentUser?.name?.split(' ')[0] || 'Pengguna'}</span>
                    <span
                      className={`text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded ${
                        isStaff
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isStaff ? 'Admin' : 'Guru'}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-2 w-76 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-30 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {/* Active Profile Info */}
                    <div className="px-3.5 py-2.5">
                      <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Akun Terverifikasi
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white">{currentUser?.name}</div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] mt-0.5 truncate">{currentUser?.email}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{currentUser?.department}</div>
                      
                      <div className="mt-2 p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                        {isStaff ? (
                          <span>Akses Administrator: Pengelolaan penuh data inventaris, perawatan, dan restock.</span>
                        ) : (
                          <span>Akses Guru: Hak pengisian transaksi peminjaman & pengembalian lab.</span>
                        )}
                      </div>
                    </div>

                    {/* Quick Account Switcher (Testing) */}
                    <div className="py-1.5 px-1.5">
                      <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1">
                        Ganti Akun Demo
                      </div>
                      {availableUsers.map((user) => (
                        <button
                          key={user.userId}
                          onClick={() => {
                            setCurrentUser(user);
                            setShowUserMenu(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                            currentUser?.email === user.email
                              ? 'bg-blue-50/70 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-medium'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="text-slate-900 dark:text-slate-100 font-medium">{user.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
                          </div>
                          {currentUser?.email === user.email && (
                            <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Logout Button */}
                    <div className="p-1.5">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar Akun Google</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Purge Dummy Data Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 mb-3">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">Bersihkan Data Dummy?</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Tindakan ini akan menghapus semua sisa data dummy/sampel di Firestore dan aplikasi, sehingga
              hanya menyisakan data asli inventaris laboratorium sains yang tersimpan di Firebase.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                disabled={isPurging}
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                disabled={isPurging}
                onClick={handleReset}
                className="px-3.5 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPurging && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isPurging ? 'Membersihkan...' : 'Ya, Bersihkan Data Dummy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
