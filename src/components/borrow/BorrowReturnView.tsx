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
  Info,
  X,
  FileCheck,
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
    borrowerName: currentUser.name,
    borrowerRole: currentUser.department,
    borrowerId: currentUser.userId,
    itemId: '',
    quantity: 1,
    borrowDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], // 3 days default
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

  // Available items eligible for borrowing (active and has available stock > 0)
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

  // Selected item stock for live feedback in modal
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
  const overdueCount = borrows.filter(
    (b) => b.status === 'Overdue' || (b.status === 'Borrowed' && b.expectedReturnDate < new Date().toISOString().split('T')[0])
  ).length;

  const handleOpenBorrowModal = () => {
    setBorrowForm({
      borrowerName: currentUser.name,
      borrowerRole: currentUser.department,
      borrowerId: currentUser.userId,
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
    <div className="space-y-5">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📤 Peminjaman & Pengembalian Alat Lab</span>
            {overdueCount > 0 && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {overdueCount} Terlambat Kembali
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pencatatan sirkulasi alat praktikum, batas pengembalian waktu, dan pemeriksaan kondisi saat serah terima.
          </p>
        </div>

        <button
          onClick={handleOpenBorrowModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Peminjaman Baru</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Sub-tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveSubTab('active')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sedang Dipinjam ({borrows.filter((b) => b.status !== 'Returned').length})
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'history'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Riwayat Selesai ({borrows.filter((b) => b.status === 'Returned').length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama peminjam, barang, atau keperluan praktikum..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Borrow Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Peminjam</th>
                <th className="px-3 py-3.5">Barang & ID</th>
                <th className="px-3 py-3.5">Jumlah</th>
                <th className="px-3 py-3.5">Tanggal Pinjam</th>
                <th className="px-3 py-3.5">Batas Kembali</th>
                <th className="px-3 py-3.5">Keperluan / Praktikum</th>
                <th className="px-3 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/70">
              {filteredBorrows.map((record) => {
                const isOverdue =
                  record.status === 'Overdue' ||
                  (record.status === 'Borrowed' &&
                    record.expectedReturnDate < new Date().toISOString().split('T')[0]);

                return (
                  <tr key={record.borrowId} className="hover:bg-slate-850/50 transition-colors">
                    {/* Borrower */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {record.borrowerName}
                      </div>
                      <span className="text-[11px] text-slate-400 block ml-5">{record.borrowerRole}</span>
                    </td>

                    {/* Item */}
                    <td className="px-3 py-3.5">
                      <div className="font-mono text-[11px] font-bold text-emerald-400">
                        {record.itemCode}
                      </div>
                      <span className="font-semibold text-slate-200">{record.itemName}</span>
                    </td>

                    {/* Quantity */}
                    <td className="px-3 py-3.5">
                      <span className="font-bold text-white text-sm">{record.quantity} Unit</span>
                    </td>

                    {/* Borrow Date */}
                    <td className="px-3 py-3.5 text-slate-300">{record.borrowDate}</td>

                    {/* Expected Return Date */}
                    <td className="px-3 py-3.5">
                      <span
                        className={`font-medium ${
                          isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'
                        }`}
                      >
                        {record.expectedReturnDate}
                      </span>
                      {record.actualReturnDate && (
                        <span className="text-[10px] text-emerald-400 block mt-0.5">
                          Kembali: {record.actualReturnDate}
                        </span>
                      )}
                    </td>

                    {/* Purpose */}
                    <td className="px-3 py-3.5 max-w-[200px]">
                      <p className="line-clamp-2 text-slate-300 text-[11px]">{record.purpose}</p>
                      {record.notes && (
                        <p className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1">
                          Catatan: {record.notes}
                        </p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3.5">
                      {record.status === 'Returned' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Dikembalikan ({record.returnCondition || 'Good'})
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800">
                          <AlertTriangle className="w-3 h-3" /> Terlambat
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950 text-sky-300 border border-sky-800">
                          <Clock className="w-3 h-3" /> Dipinjam
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {record.status !== 'Returned' && (
                        <button
                          onClick={() => handleOpenReturnModal(record)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 hover:border-emerald-500 transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Proses Kembali</span>
                        </button>
                      )}
                      {record.status === 'Returned' && (
                        <span className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-500" /> Selesai
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredBorrows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <Clock className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-300">
                      {activeSubTab === 'active'
                        ? 'Tidak ada barang yang sedang dipinjam saat ini.'
                        : 'Belum ada riwayat pengembalian.'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Klik "Catat Peminjaman Baru" untuk memulai transaksi.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Catat Peminjaman Baru */}
      {isBorrowModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-white">Catat Peminjaman Barang Laboratorium</h3>
              <button
                onClick={() => setIsBorrowModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-semibold">
                ⚠️ {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmitBorrow} className="space-y-4">
              {/* Borrower Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nama Peminjam <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={borrowForm.borrowerName}
                    onChange={(e) => setBorrowForm({ ...borrowForm, borrowerName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Peran / Kelas / Jabatan <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={borrowForm.borrowerRole}
                    onChange={(e) => setBorrowForm({ ...borrowForm, borrowerRole: e.target.value })}
                    placeholder="Contoh: Guru Fisika / Kelas XI IPA 2"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Item Selection & Stock Validation */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Pilih Barang Laboratorium <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={borrowForm.itemId}
                  onChange={(e) => setBorrowForm({ ...borrowForm, itemId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="" disabled>
                    -- Pilih barang yang tersedia --
                  </option>
                  {borrowableItems.map((item) => (
                    <option
                      key={item.itemId}
                      value={item.itemId}
                      disabled={item.availableQuantity <= 0}
                    >
                      {item.itemCode} - {item.name} ({item.availableQuantity > 0 ? `Tersedia: ${item.availableQuantity} ${item.unit}` : 'STOK KOSONG'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Availability Badge */}
              {selectedItemStock && selectedItemObj && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    selectedItemStock.availableQuantity >= borrowForm.quantity
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800 text-rose-300'
                  }`}
                >
                  <div>
                    <span className="font-semibold block">{selectedItemObj.name}</span>
                    <span className="text-[11px] opacity-80">
                      Lokasi: {selectedItemObj.location} • Kondisi: {selectedItemObj.condition}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold block">Tersedia Saat Ini</span>
                    <span className="text-sm font-bold">
                      {selectedItemStock.availableQuantity} {selectedItemObj.unit}
                    </span>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Jumlah yang Dipinjam <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedItemStock ? selectedItemStock.availableQuantity : undefined}
                  required
                  value={borrowForm.quantity}
                  onChange={(e) => setBorrowForm({ ...borrowForm, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
                {selectedItemStock && borrowForm.quantity > selectedItemStock.availableQuantity && (
                  <p className="text-[11px] text-rose-400 font-semibold mt-1">
                    ⚠️ Jumlah melebihi stok yang tersedia ({selectedItemStock.availableQuantity}{' '}
                    {selectedItemObj?.unit})!
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Tanggal Pinjam <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={borrowForm.borrowDate}
                    onChange={(e) => setBorrowForm({ ...borrowForm, borrowDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Tanggal Pengembalian Seharusnya <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    min={borrowForm.borrowDate}
                    required
                    value={borrowForm.expectedReturnDate}
                    onChange={(e) => setBorrowForm({ ...borrowForm, expectedReturnDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Purpose / Practical */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Keperluan / Judul Praktikum <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={borrowForm.purpose}
                  onChange={(e) => setBorrowForm({ ...borrowForm, purpose: e.target.value })}
                  placeholder="Contoh: Praktikum Titrasi Asam Basa Kelas XI MIPA 3"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={borrowForm.notes}
                  onChange={(e) => setBorrowForm({ ...borrowForm, notes: e.target.value })}
                  placeholder="Contoh: Meja praktikum nomor 4, diambil oleh ketua kelompok"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBorrowModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    !selectedItemStock || borrowForm.quantity > selectedItemStock.availableQuantity
                  }
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl shadow-lg shadow-emerald-900/30 transition-all"
                >
                  Simpan Peminjaman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Proses Pengembalian */}
      {returnModalBorrow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-white">Proses Pengembalian Barang</h3>
              <button
                onClick={() => setReturnModalBorrow(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-semibold">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Info Summary */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1 mb-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Barang:</span>
                <span className="font-semibold text-white">
                  {returnModalBorrow.itemCode} - {returnModalBorrow.itemName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Peminjam:</span>
                <span className="font-semibold text-slate-200">
                  {returnModalBorrow.borrowerName} ({returnModalBorrow.borrowerRole})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Jumlah Dipinjam:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {returnModalBorrow.quantity} Unit
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tgl Pinjam / Batas:</span>
                <span className="text-slate-300">
                  {returnModalBorrow.borrowDate} s/d {returnModalBorrow.expectedReturnDate}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitReturn} className="space-y-4">
              {/* Actual Return Date */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tanggal Pengembalian Aktual <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={returnForm.actualReturnDate}
                  onChange={(e) => setReturnForm({ ...returnForm, actualReturnDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Return Condition */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Kondisi Barang Saat Dikembalikan <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setReturnForm({ ...returnForm, returnCondition: 'Good' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      returnForm.returnCondition === 'Good'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-600 ring-1 ring-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Good</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnForm({ ...returnForm, returnCondition: 'Fair' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      returnForm.returnCondition === 'Fair'
                        ? 'bg-blue-950 text-blue-300 border-blue-600 ring-1 ring-blue-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Fair</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnForm({ ...returnForm, returnCondition: 'Damaged' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      returnForm.returnCondition === 'Damaged'
                        ? 'bg-rose-950 text-rose-300 border-rose-600 ring-1 ring-rose-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Damaged</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnForm({ ...returnForm, returnCondition: 'Hilang' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      returnForm.returnCondition === 'Hilang'
                        ? 'bg-purple-950 text-purple-300 border-purple-600 ring-1 ring-purple-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Hilang</span>
                  </button>
                </div>

                {returnForm.returnCondition === 'Damaged' && (
                  <div className="mt-2.5 p-3 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs leading-relaxed space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <Flame className="w-4 h-4 text-rose-400" />
                      Perhatian: Barang Rusak!
                    </p>
                    <p className="text-[11px] opacity-90">
                      Barang tidak akan ditambahkan kembali ke stok Available. Sistem akan otomatis memasukkannya
                      ke antrean <strong>⚠️ Maintenance</strong> untuk dicatat kerusakan dan perbaikannya.
                    </p>
                  </div>
                )}

                {returnForm.returnCondition === 'Hilang' && (
                  <div className="mt-2.5 p-3 rounded-xl bg-purple-950/40 border border-purple-800/80 text-purple-300 text-xs leading-relaxed space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <HelpCircle className="w-4 h-4 text-purple-400" />
                      Perhatian: Barang Hilang!
                    </p>
                    <p className="text-[11px] opacity-90">
                      Barang tidak akan ditambahkan kembali ke stok Available. Status fisik barang di inventaris
                      otomatis ditandai sebagai <strong>Hilang</strong> dan dicatat ke log audit.
                    </p>
                  </div>
                )}

                {(returnForm.returnCondition === 'Good' || returnForm.returnCondition === 'Fair') && (
                  <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Barang akan otomatis kembali ke stok <strong>Available</strong> untuk dipinjam berikutnya.
                  </p>
                )}
              </div>

              {/* If Damaged, detail input */}
              {returnForm.returnCondition === 'Damaged' && (
                <div>
                  <label className="text-xs font-semibold text-rose-300 block mb-1">
                    Rincian Kerusakan <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={returnForm.damageDescriptionIfAny}
                    onChange={(e) => setReturnForm({ ...returnForm, damageDescriptionIfAny: e.target.value })}
                    placeholder="Jelaskan bagian yang pecah, retak, macet, atau tidak berfungsi..."
                    className="w-full bg-slate-950 border border-rose-800/70 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Catatan Pengembalian</label>
                <input
                  type="text"
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  placeholder="Kelengkapan part, kebersihan alat saat diterima..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReturnModalBorrow(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/30 transition-all"
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
