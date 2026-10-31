import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import {
  FlaskConical,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  School,
  LogIn,
  KeyRound,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    loginWithGoogle,
    loginWithQuickAccount,
    authLoading,
    authError,
    setAuthError,
  } = useInventory();

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans relative overflow-hidden">
      {/* Background Glows & Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-48 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="relative z-10 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg text-white tracking-tight">
                  Science Lab Inventory
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  LAZUARDI
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Sistem Manajemen Laboratorium Sains Sekolah Terpadu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <School className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-slate-300">Google Workspace SSO</span>
          </div>
        </div>
      </header>

      {/* Center Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 my-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero & Explanations */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autentikasi Domain Resmi @lazuardi.sch.id</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Portal Inventaris & Sirkulasi Laboratorium Sains
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Selamat datang di sistem inventaris laboratorium sains sekolah. Aplikasi ini membantu
              memantau jumlah dan ketersediaan peralatan, pencatatan peminjaman dan pengembalian,
              pemeliharaan alat rusak, serta kebutuhan pengadaan bahan praktikum secara terpadu.
            </p>

            {/* Access Rules Info Cards */}
            <div className="space-y-3 pt-2">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">Administrator Laboratorium</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded font-bold uppercase border border-emerald-800">
                      Full Access
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    <strong>menur@lazuardi.sch.id</strong> & <strong>susi@lazuardi.sch.id</strong> dapat mengelola
                    seluruh inventaris (CRUD), maintenance & servis, restock pengadaan, peminjaman, serta audit log.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-950 text-sky-400 border border-sky-800 flex items-center justify-center shrink-0 mt-0.5">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">Guru / Peminjam Lab</span>
                    <span className="text-[10px] bg-sky-950 text-sky-300 px-1.5 py-0.2 rounded font-bold uppercase border border-sky-800">
                      Borrow/Return + View Only
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Seluruh akun <strong>*@lazuardi.sch.id</strong> dapat mengisi fitur <strong>Borrow / Return</strong>
                    (peminjaman & pengembalian), serta melihat katalog inventaris secara <em>view-only</em>.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-950/70 text-rose-400 border border-rose-800/60 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-slate-300">Domain Luar Di Luar Sekolah</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Akun Google di luar domain <code>@lazuardi.sch.id</code> otomatis ditolak sistem demi keamanan data inventaris sekolah.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Login Box */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
              <div className="text-center space-y-2 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-950 border border-emerald-800/80 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <LogIn className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-white">Masuk ke Sistem</h2>
                <p className="text-xs text-slate-400">
                  Gunakan Akun Google sekolah Anda untuk melanjutkan.
                </p>
              </div>

              {/* Error Alert Box */}
              {authError && (
                <div className="mb-5 p-4 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-start gap-2.5">
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="block font-semibold text-rose-300 mb-0.5">Akses Ditolak</strong>
                      <span className="leading-relaxed">{authError}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setAuthError(null)}
                    className="w-full text-center text-[11px] text-rose-300 hover:text-white underline pt-1"
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
                  className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl text-sm transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isLoadingGoogle ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin text-slate-700" />
                      <span>Menghubungkan ke Google...</span>
                    </>
                  ) : (
                    <>
                      {/* Official Google G Logo SVG */}
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                      <span className="text-slate-900 font-bold">Masuk dengan Akun Google</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-slate-500">
                  Gunakan email resmi berakhiran <strong className="text-slate-400">@lazuardi.sch.id</strong>
                </p>
              </div>

              {/* Testing / Quick Access Section */}
              <div className="mt-8 pt-5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDemoTesting(!showDemoTesting)}
                  className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Uji Coba Hak Akses Cepat (Preview Testing)</span>
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    {showDemoTesting ? 'Tutup' : 'Buka'}
                  </span>
                </button>

                {showDemoTesting && (
                  <div className="mt-3 space-y-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 animate-in fade-in duration-200 text-left">
                    <p className="text-[11px] text-slate-400 mb-2">
                      Pilih salah satu profil untuk langsung menguji aturan hak akses di aplikasi:
                    </p>

                    {/* Admin 1: Menur */}
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('menur@lazuardi.sch.id')}
                      className="w-full p-2.5 rounded-lg bg-slate-900 hover:bg-emerald-950/70 border border-slate-800 hover:border-emerald-700/80 text-left flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-emerald-300">
                          Menurseto Mawaddah, S.Pd
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">menur@lazuardi.sch.id</div>
                      </div>
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                        Admin Lab (Full)
                      </span>
                    </button>

                    {/* Admin 2: Susi */}
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('susi@lazuardi.sch.id')}
                      className="w-full p-2.5 rounded-lg bg-slate-900 hover:bg-emerald-950/70 border border-slate-800 hover:border-emerald-700/80 text-left flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-emerald-300">
                          Susiyanti Wedya, S.Pd
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">susi@lazuardi.sch.id</div>
                      </div>
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                        Admin Lab (Full)
                      </span>
                    </button>

                    {/* Teacher: @lazuardi.sch.id */}
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('guru.science@lazuardi.sch.id')}
                      className="w-full p-2.5 rounded-lg bg-slate-900 hover:bg-sky-950/70 border border-slate-800 hover:border-sky-700/80 text-left flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-sky-300">
                          Guru Sains Lazuardi
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">guru.science@lazuardi.sch.id</div>
                      </div>
                      <span className="text-[9px] bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded font-bold uppercase">
                        Borrow/Return Saja
                      </span>
                    </button>

                    {/* Unauthorized Test Account: @gmail.com */}
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('tamu@gmail.com')}
                      className="w-full p-2 rounded-lg bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/60 text-left flex items-center justify-between transition-colors"
                      title="Uji coba login akun luar untuk membuktikan penolakan otomatis"
                    >
                      <div>
                        <div className="text-xs font-semibold text-rose-300">Uji Akun Non-Lazuardi</div>
                        <div className="text-[10px] text-rose-400/80 font-mono">tamu@gmail.com</div>
                      </div>
                      <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-bold uppercase">
                        Test Blokir
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          Science Lab Inventory System • Lazuardi School • Standar Operasional Laboratorium Sains Terpadu
        </p>
      </footer>
    </div>
  );
};
