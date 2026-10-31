import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { BorrowRecord, InventoryItem } from '../../types/inventory';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Calendar,
  User,
  ArrowRight,
  RotateCcw,
  Flame,
  HelpCircle,
  X,
  ArrowLeftRight,
} from 'lucide-react';

export const BorrowReturnView: React.FC = () => {
  const {
    items,
    borrows,
    currentUser,
    isStaff,
    availableUsers,
    getItemStockInfo,
    createBorrow,
    processReturn,
  } = useInventory();

  // Tabs: 'active' (Borrowed + Overdue) vs 'history' (Returned)
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'history'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Borrowed' | 'Overdue' | 'Returned'>('ALL');

  // Modals
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [returnModalBorrow, setReturnModalBorrow] = useState<BorrowRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Borrow Form State
  const [borrowForm, setBorrowForm] = useState({
    borrowerName: currentUser?.name || 'Peminjam',
    borrowerRole: currentUser?.department || 'Guru / Peminjam',
    borrowerId: currentUser?.userId || 'usr-borrower',
    itemId: '',
    quantity: 1,
    borrowDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    purpose: '',
    notes: '',
  });

  // Return Form State
  const [returnForm, setReturnForm] = useState<{
    actualReturnDate: string;
    returnCondition: 'Good' | 'Fair' | 'Damaged' | 'Hilang';
    notes: string;
    damageDescriptionIfAny: string;
  }>({
    actualReturnDate: new Date().toISOString().split('T')[0],
    returnCondition: 'Good',
    notes: '',
    damageDescriptionIfAny: '',
  });

  // Available items eligible for borrowing
  const borrowableItems = useMemo(() => {
    return items
      .filter((i) => i.status === 'Active')
      .map((item) => {
        const stock = getItemStockInfo(item.itemId);
        return {
          ...item,
          availableQuantity: stock.availableQuantity,
        };
      });
  }, [items, getItemStockInfo]);

  // Selected item stock
  const selectedItemStock = useMemo(() => {
    if (!borrowForm.itemId) return null;
    return getItemStockInfo(borrowForm.itemId);
  }, [borrowForm.itemId, getItemStockInfo]);

  const selectedItemObj = useMemo(() => {
    if (!borrowForm.itemId) return null;
    return items.find((i) => i.itemId === borrowForm.itemId);
  }, [borrowForm.itemId, items]);

  // Filtered Borrow Records
  const filteredBorrows = useMemo(() => {
    return borrows
      .filter((b) => {
        if (activeSubTab === 'active') {
          if (b.status === 'Returned') return false;
        } else {
          if (b.status !== 'Returned') return false;
        }

        if (statusFilter !== 'ALL' && b.status !== statusFilter) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchBorrower = b.borrowerName.toLowerCase().includes(q);
          const matchItem = b.itemName.toLowerCase().includes(q) || b.itemCode.toLowerCase().includes(q);
          const matchPurpose = b.purpose.toLowerCase().includes(q);
          if (!matchBorrower && !matchItem && !matchPurpose) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [borrows, activeSubTab, statusFilter, searchQuery]);

  // Overdue count
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = borrows.filter(
    (b) => b.status === 'Overdue' || (b.status === 'Borrowed' && b.expectedReturnDate < todayStr)
  ).length;

  const handleOpenBorrowModal = () => {
    setBorrowForm({
      borrowerName: currentUser?.name || 'Peminjam',
      borrowerRole: currentUser?.department || 'Guru / Peminjam',
      borrowerId: currentUser?.userId || 'usr-borrower',
      itemId: borrowableItems.find((i) => i.availableQuantity > 0)?.itemId || '',
      quantity: 1,
      borrowDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      purpose: '',
      notes: '',
    });
    setErrorMessage(null);
    setIsBorrowModalOpen(true);
  };

  const handleSubmitBorrow = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const res = createBorrow({
      borrowerId: borrowForm.borrowerId,
      borrowerName: borrowForm.borrowerName,
      borrowerRole: borrowForm.borrowerRole,
      itemId: borrowForm.itemId,
      quantity: Number(borrowForm.quantity),
      borrowDate: borrowForm.borrowDate,
      expectedReturnDate: borrowForm.expectedReturnDate,
      purpose: borrowForm.purpose,
      notes: borrowForm.notes,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Gagal menyimpan transaksi peminjaman.');
      return;
    }

    setIsBorrowModalOpen(false);
  };

  const handleOpenReturnModal = (borrow: BorrowRecord) => {
    setReturnModalBorrow(borrow);
    setReturnForm({
      actualReturnDate: new Date().toISOString().split('T')[0],
      returnCondition: 'Good',
      notes: '',
      damageDescriptionIfAny: '',
    });
    setErrorMessage(null);
  };

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalBorrow) return;
    setErrorMessage(null);

    const res = processReturn({
      borrowId: returnModalBorrow.borrowId,
      actualReturnDate: returnForm.actualReturnDate,
      returnCondition: returnForm.returnCondition,
      notes: returnForm.notes,
      damageDescriptionIfAny: returnForm.damageDescriptionIfAny,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Gagal memproses pengembalian.');
      return;
    }

    setReturnModalBorrow(null);
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Peminjaman & Pengembalian
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pencatatan sirkulasi alat praktikum untuk guru dan siswa Lazuardi.
          </p>
        </div>

        <button
          onClick={handleOpenBorrowModal}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Catat Pinjam Baru</span>
        </button>
      </div>

      {/* Overdue Warning Alert */}
      {overdueCount > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 flex items-center justify-between text-xs text-rose-800 dark:text-rose-200 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>
              Terdapat <strong>{overdueCount} item</strong> yang melewati batas tanggal pengembalian dan berstatus Overdue.
            </span>
          </div>
          <button
            onClick={() => {
              setActiveSubTab('active');
              setStatusFilter('Overdue');
            }}
            className="text-[11px] font-medium text-rose-700 dark:text-rose-300 hover:underline cursor-pointer"
          >
            Lihat Item Terlambat
          </button>
        </div>
      )}

      {/* Segmented Subtabs & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Subtabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => {
                setActiveSubTab('active');
                setStatusFilter('ALL');
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                activeSubTab === 'active'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Sedang Dipinjam</span>
              <span className="ml-1 text-[10px] font-mono tabular-nums text-slate-500">
                ({borrows.filter((b) => b.status !== 'Returned').length})
              </span>
            </button>

            <button
              onClick={() => {
                setActiveSubTab('history');
                setStatusFilter('ALL');
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                activeSubTab === 'history'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Riwayat Selesai</span>
              <span className="ml-1 text-[10px] font-mono tabular-nums text-slate-500">
                ({borrows.filter((b) => b.status === 'Returned').length})
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari peminjam, item, keperluan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-7.5 pr-3 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Borrow Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5">Peminjam</th>
                <th className="px-3 py-2.5">Item & Kode</th>
                <th className="px-3 py-2.5 text-right">Jumlah</th>
                <th className="px-3 py-2.5">Tgl Pinjam</th>
                <th className="px-3 py-2.5">Batas Kembali</th>
                <th className="px-3 py-2.5">Keperluan</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3.5 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredBorrows.map((record) => {
                const isOverdue =
                  record.status === 'Overdue' ||
                  (record.status === 'Borrowed' && record.expectedReturnDate < todayStr);

                return (
                  <tr
                    key={record.borrowId}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors"
                  >
                    {/* Borrower */}
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium text-slate-900 dark:text-white text-xs">
                        {record.borrowerName}
                      </div>
                      <div className="text-[10px] text-slate-400">{record.borrowerRole}</div>
                    </td>

                    {/* Item */}
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {record.itemName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {record.itemCode}
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-white font-medium">
                      {record.quantity}
                    </td>

                    {/* Borrow Date */}
                    <td className="px-3 py-2.5 font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                      {record.borrowDate}
                    </td>

                    {/* Return Date */}
                    <td className="px-3 py-2.5 font-mono tabular-nums">
                      {record.status === 'Returned' ? (
                        <div className="text-slate-500">
                          Kembali: {record.actualReturnDate}
                        </div>
                      ) : (
                        <div className={isOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-600 dark:text-slate-300'}>
                          {record.expectedReturnDate}
                        </div>
                      )}
                    </td>

                    {/* Purpose */}
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                      <span className="truncate block max-w-[140px]" title={record.purpose}>
                        {record.purpose}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5">
                      {record.status === 'Returned' ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Dikembalikan</span>
                        </span>
                      ) : isOverdue ? (
                        <span className="text-rose-700 dark:text-rose-400 font-medium text-xs flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Terlambat</span>
                        </span>
                      ) : (
                        <span className="text-blue-700 dark:text-blue-400 font-medium text-xs flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Aktif Dipinjam</span>
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      {record.status !== 'Returned' ? (
                        <button
                          onClick={() => handleOpenReturnModal(record)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                        >
                          Kembalikan
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">Selesai</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredBorrows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                    <ArrowLeftRight className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                      Tidak ada catatan peminjaman pada tab ini.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Borrow Modal */}
      {isBorrowModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Catat Peminjaman Peralatan Lab
              </h3>
              <button
                onClick={() => setIsBorrowModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-900/60 dark:text-rose-200 text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmitBorrow} className="space-y-3.5 text-xs">
              {/* Item Selection */}
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Pilih Alat / Bahan <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={borrowForm.itemId}
                  onChange={(e) => setBorrowForm({ ...borrowForm, itemId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="" disabled>-- Pilih item inventaris --</option>
                  {borrowableItems.map((item) => (
                    <option
                      key={item.itemId}
                      value={item.itemId}
                      disabled={item.availableQuantity <= 0}
                    >
                      {item.name} ({item.itemCode}) — Tersedia: {item.availableQuantity} {item.unit}
                    </option>
                  ))}
                </select>
                {selectedItemStock && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                    <span>Stok siap pinjam saat ini:</span>
                    <span className="font-semibold font-mono text-blue-600 dark:text-blue-400">
                      {selectedItemStock.availableQuantity} {selectedItemObj?.unit}
                    </span>
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Jumlah Pinjam <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedItemStock ? selectedItemStock.availableQuantity : 999}
                  required
                  value={borrowForm.quantity}
                  onChange={(e) => setBorrowForm({ ...borrowForm, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Borrower Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Nama Peminjam <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={borrowForm.borrowerName}
                    onChange={(e) => setBorrowForm({ ...borrowForm, borrowerName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Peran / Kelas / Dept
                  </label>
                  <input
                    type="text"
                    value={borrowForm.borrowerRole}
                    onChange={(e) => setBorrowForm({ ...borrowForm, borrowerRole: e.target.value })}
                    placeholder="Guru Biologi / Kelas 8"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Tanggal Pinjam <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={borrowForm.borrowDate}
                    onChange={(e) => setBorrowForm({ ...borrowForm, borrowDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Batas Kembali <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={borrowForm.expectedReturnDate}
                    onChange={(e) => setBorrowForm({ ...borrowForm, expectedReturnDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Keperluan Praktikum / Alasan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={borrowForm.purpose}
                  onChange={(e) => setBorrowForm({ ...borrowForm, purpose: e.target.value })}
                  placeholder="Contoh: Praktikum Osmosis Kelas 9"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBorrowModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg cursor-pointer shadow-xs"
                >
                  Simpan Peminjaman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnModalBorrow && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                  Proses Pengembalian Barang
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {returnModalBorrow.itemName} (×{returnModalBorrow.quantity}) dipinjam oleh {returnModalBorrow.borrowerName}
                </p>
              </div>
              <button
                onClick={() => setReturnModalBorrow(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-900/60 dark:text-rose-200 text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmitReturn} className="space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Tanggal Pengembalian Fisik
                </label>
                <input
                  type="date"
                  required
                  value={returnForm.actualReturnDate}
                  onChange={(e) => setReturnForm({ ...returnForm, actualReturnDate: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Kondisi Saat Dikembalikan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={returnForm.returnCondition}
                  onChange={(e) => setReturnForm({ ...returnForm, returnCondition: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="Good">Good (Bagus / Lengkap)</option>
                  <option value="Fair">Fair (Cukup / Layak Pakai)</option>
                  <option value="Damaged">Damaged (Rusak / Butuh Servis)</option>
                  <option value="Hilang">Hilang (Barang Hilang Saat Praktikum)</option>
                </select>
              </div>

              {returnForm.returnCondition === 'Damaged' && (
                <div>
                  <label className="font-medium text-rose-600 dark:text-rose-400 block mb-1">
                    Deskripsi Kerusakan <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={returnForm.damageDescriptionIfAny}
                    onChange={(e) => setReturnForm({ ...returnForm, damageDescriptionIfAny: e.target.value })}
                    placeholder="Jelaskan kerusakan agar masuk antrian pemeliharaan..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-rose-300 dark:border-rose-900 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Catatan Pengembalian
                </label>
                <textarea
                  rows={2}
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  placeholder="Keterangan tambahan..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReturnModalBorrow(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg cursor-pointer shadow-xs"
                >
                  Konfirmasi Pengembalian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
