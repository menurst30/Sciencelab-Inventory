import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import {
  FlaskConical,
  ShieldCheck,
  UserCheck,
  Download,
  RotateCcw,
  FileSpreadsheet,
  ChevronDown,
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
    resetToSampleData,
    exportDataJSON,
    exportInventoryCSV,
  } = useInventory();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    resetToSampleData();
    setShowResetConfirm(false);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">Science Lab Inventory</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  SMART LAB
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Manajemen Inventaris Alat & Bahan Laboratorium Sains Sekolah
              </p>
            </div>
          </div>

          {/* Right Controls: Role Switcher & Utilities */}
          <div className="flex items-center gap-3">
            {/* Quick Export Tools */}
            <div className="hidden md:flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
              <button
                onClick={exportInventoryCSV}
                title="Ekspor Inventaris ke CSV"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSV</span>
              </button>
              <button
                onClick={exportDataJSON}
                title="Backup Lengkap Database JSON"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Backup</span>
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                title="Reset ke Data Sampel Default"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 hover:text-amber-300 hover:bg-slate-700 rounded transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset</span>
              </button>
            </div>

            {/* Audit Log Quick Toggle */}
            <button
              onClick={onShowAudit}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                showAudit
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span>Riwayat Aktivitas</span>
            </button>

            {/* User Profile & Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-700 text-left transition-colors"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isStaff ? 'bg-emerald-600 text-white' : 'bg-sky-600 text-white'
                  }`}
                >
                  {isStaff ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1.5">
                    {currentUser.name}
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                        isStaff
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-sky-950 text-sky-300 border border-sky-800'
                      }`}
                    >
                      {isStaff ? 'Admin / Staf' : 'Guru'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">{currentUser.department}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-30">
                    <div className="px-3 py-2 border-b border-slate-700/60">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Ganti Pengguna & Role
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Pilih profil untuk menguji hak akses Staf Lab vs Guru Peminjam.
                      </p>
                    </div>

                    <div className="py-1">
                      {availableUsers.map((user) => (
                        <button
                          key={user.userId}
                          onClick={() => {
                            setCurrentUser(user);
                            setShowUserMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700/70 transition-colors ${
                            currentUser.userId === user.userId ? 'bg-slate-700/50 text-emerald-400' : 'text-slate-200'
                          }`}
                        >
                          <div>
                            <div className="font-semibold">{user.name}</div>
                            <div className="text-[11px] text-slate-400">{user.department}</div>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              user.role === 'admin'
                                ? 'bg-emerald-900/60 text-emerald-300'
                                : 'bg-sky-900/60 text-sky-300'
                            }`}
                          >
                            {user.role === 'admin' ? 'Staf Lab' : 'Guru'}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-slate-700/60 pt-2 px-3 pb-1">
                      <div className="text-[11px] text-slate-400">
                        {isStaff ? (
                          <span className="text-emerald-400">
                            ✓ Akses Penuh: Tambah, edit, maintenance, restock & peminjaman.
                          </span>
                        ) : (
                          <span className="text-sky-300">
                            ℹ Akses Guru: Melihat ketersediaan & mengajukan peminjaman.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <RotateCcw className="w-6 h-6" />
              <h3 className="font-bold text-lg text-white">Reset ke Data Sampel?</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Tindakan ini akan mengembalikan seluruh database inventaris, peminjaman, maintenance, dan restock ke
              data laboratorium sains awal sekolah. Perubahan kustom Anda akan ditimpa.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white transition-colors"
              >
                Ya, Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
