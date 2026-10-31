import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useTheme } from '../../context/ThemeContext';
import {
  FlaskConical,
  ShieldCheck,
  UserCheck,
  Lock,
  Sun,
  Moon,
  School,
  LogIn,
  KeyRound,
  RefreshCw,
  XCircle,
  CheckCircle2,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    loginWithGoogle,
    loginWithQuickAccount,
    authLoading,
    authError,
    setAuthError,
  } = useInventory();

  const { theme, toggleTheme } = useTheme();
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [showDemoTesting, setShowDemoTesting] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
    setAuthError(null);
    try {
      const result = await loginWithGoogle();
      if (!result.success && result.error) {
        setAuthError(result.error);
      }
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleQuickLogin = async (email: string) => {
    setAuthError(null);
    await loginWithQuickAccount(email);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white transition-colors">
      {/* Top Bar with Brand & Theme Toggle */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-3.5 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                Science Lab Inventory
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                Lazuardi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
              <School className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Google Workspace SSO</span>
            </div>
            <button
              onClick={toggleTheme}
              aria-label="Toggle tema gelap atau terang"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Login Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 my-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: System Information & Role Explanations */}
          <div className="lg:col-span-7 space-y-5 text-left">
            <div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 tracking-wide uppercase">
                Sistem Terpadu
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
                Portal Manajemen Laboratorium Sains
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-2">
                Kelola stok peralatan praktikum, monitoring kondisi alat, pencatatan peminjaman, serta alur perawatan dan pengadaan secara akurat.
              </p>
            </div>

            {/* Access Matrix Cards */}
            <div className="space-y-2.5 pt-1">
              {/* Administrator */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-start gap-3 shadow-xs">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200/60 dark:border-blue-800/60">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">Administrator Laboratorium</span>
                    <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Full Access
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                    <strong>menur@lazuardi.sch.id</strong> & <strong>susi@lazuardi.sch.id</strong> memiliki akses penuh ke inventaris, maintenance, restock, peminjaman, dan audit log.
                  </p>
                </div>
              </div>

              {/* Teacher */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-start gap-3 shadow-xs">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">Guru & Peminjam Sains</span>
                    <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      Borrow / Return
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                    Seluruh akun berdomain <strong>@lazuardi.sch.id</strong> dapat mencatat peminjaman dan pengembalian barang, serta melihat katalog alat secara view-only.
                  </p>
                </div>
              </div>

              {/* Outside domain */}
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Domain Terbatas: </span>
                  Akun di luar domain sekolah <code>@lazuardi.sch.id</code> otomatis ditolak sistem demi keamanan data inventaris.
                </div>
              </div>
            </div>
          </div>

          {/* Right: Login Box */}
          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm">
              <div className="text-center space-y-1.5 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-100 dark:border-blue-900/60 mb-3">
                  <LogIn className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Masuk ke Sistem</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gunakan Akun Google sekolah Anda untuk melanjutkan.
                </p>
              </div>

              {/* Error Alert Box */}
              {authError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-900/80 dark:text-rose-200 text-xs space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 leading-normal">
                      <strong className="block font-semibold">Akses Ditolak</strong>
                      <span>{authError}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setAuthError(null)}
                    className="w-full text-right text-[11px] text-rose-600 dark:text-rose-400 hover:underline pt-0.5 cursor-pointer"
                  >
                    Tutup Peringatan
                  </button>
                </div>
              )}

              {/* Google Sign-In Button */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoadingGoogle || authLoading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-white font-medium rounded-xl text-xs border border-slate-300 dark:border-slate-700 shadow-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingGoogle ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                      <span>Menghubungkan ke Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Masuk dengan Google Workspace</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                  Gunakan email resmi <strong className="font-semibold text-slate-700 dark:text-slate-300">@lazuardi.sch.id</strong>
                </p>
              </div>

              {/* Demo Account Switcher (Testing) */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDemoTesting(!showDemoTesting)}
                  className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Uji Hak Akses (Preview)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {showDemoTesting ? 'Tutup' : 'Lihat'}
                  </span>
                </button>

                {showDemoTesting && (
                  <div className="mt-2.5 space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-750 text-left animate-in fade-in duration-150">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                      Pilih profil untuk menguji otorisasi fitur:
                    </p>

                    <button
                      type="button"
                      onClick={() => handleQuickLogin('menur@lazuardi.sch.id')}
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 text-left flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div>
                        <div className="text-xs font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          Menurseto Mawaddah, S.Pd
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">menur@lazuardi.sch.id</div>
                      </div>
                      <span className="text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-1.5 py-0.2 rounded font-semibold uppercase">
                        Admin Lab
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickLogin('susi@lazuardi.sch.id')}
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 text-left flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div>
                        <div className="text-xs font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          Susiyanti Wedya, S.Pd
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">susi@lazuardi.sch.id</div>
                      </div>
                      <span className="text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-1.5 py-0.2 rounded font-semibold uppercase">
                        Admin Lab
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickLogin('guru.science@lazuardi.sch.id')}
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 text-left flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div>
                        <div className="text-xs font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          Guru Sains Lazuardi
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">guru.science@lazuardi.sch.id</div>
                      </div>
                      <span className="text-[9px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded font-semibold uppercase">
                        Borrow Only
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickLogin('tamu@gmail.com')}
                      className="w-full p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-left flex items-center justify-between transition-colors cursor-pointer"
                      title="Uji coba akun non-sekolah untuk validasi proteksi"
                    >
                      <div>
                        <div className="text-xs font-medium text-rose-700 dark:text-rose-300">Akun Luar (gmail.com)</div>
                        <div className="text-[10px] text-rose-400 font-mono">tamu@gmail.com</div>
                      </div>
                      <span className="text-[9px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-1.5 py-0.2 rounded font-semibold uppercase">
                        Uji Blokir
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>Science Lab Inventory • Lazuardi School • Standar Operasional Laboratorium Terpadu</p>
      </footer>
    </div>
  );
};
