import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { MaintenanceRecord, MaintenanceStatus } from '../../types/inventory';
import {
  Wrench,
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
  Flame,
  Clock,
  Coins,
  User,
  ArrowRight,
  Filter,
  X,
  FileText,
  Trash2,
} from 'lucide-react';

export const MaintenanceView: React.FC = () => {
  const {
    items,
    maintenance,
    isStaff,
    createMaintenance,
    updateMaintenanceStatus,
  } = useInventory();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [updatingRecord, setUpdatingRecord] = useState<MaintenanceRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State for Add Maintenance
  const [addForm, setAddForm] = useState({
    itemId: '',
    quantity: 1,
    damageDescription: '',
    reportedDate: new Date().toISOString().split('T')[0],
    pic: '',
    repairCost: '0',
    notes: '',
  });

  // Form State for Status Update
  const [statusUpdateForm, setStatusUpdateForm] = useState<{
    repairStatus: MaintenanceStatus;
    pic: string;
    repairCost: string;
    notes: string;
    resolvedCondition: 'Good' | 'Fair';
    retireUnitsIfNotRepairable: boolean;
  }>({
    repairStatus: 'In Repair',
    pic: '',
    repairCost: '0',
    notes: '',
    resolvedCondition: 'Good',
    retireUnitsIfNotRepairable: false,
  });

  // Summary Metrics
  const reportedCount = useMemo(
    () => maintenance.filter((m) => m.repairStatus === 'Reported').length,
    [maintenance]
  );
  const inRepairCount = useMemo(
    () => maintenance.filter((m) => m.repairStatus === 'In Repair').length,
    [maintenance]
  );
  const repairedCount = useMemo(
    () => maintenance.filter((m) => m.repairStatus === 'Repaired').length,
    [maintenance]
  );
  const totalRepairCost = useMemo(
    () => maintenance.reduce((acc, curr) => acc + (curr.repairCost || 0), 0),
    [maintenance]
  );

  // Filtered list
  const filteredMaintenance = useMemo(() => {
    return maintenance
      .filter((m) => {
        if (selectedStatus !== 'ALL' && m.repairStatus !== selectedStatus) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchItem = m.itemName.toLowerCase().includes(q) || m.itemCode.toLowerCase().includes(q);
          const matchDesc = m.damageDescription.toLowerCase().includes(q);
          const matchPic = m.pic.toLowerCase().includes(q);
          if (!matchItem && !matchDesc && !matchPic) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [maintenance, selectedStatus, searchQuery]);

  const handleOpenAddModal = () => {
    setAddForm({
      itemId: items[0]?.itemId || '',
      quantity: 1,
      damageDescription: '',
      reportedDate: new Date().toISOString().split('T')[0],
      pic: '',
      repairCost: '0',
      notes: '',
    });
    setErrorMessage(null);
    setIsAddModalOpen(true);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const costNum = parseFloat(addForm.repairCost) || 0;
    const res = createMaintenance({
      itemId: addForm.itemId,
      quantity: Number(addForm.quantity),
      damageDescription: addForm.damageDescription,
      reportedDate: addForm.reportedDate,
      pic: addForm.pic,
      repairCost: costNum,
      notes: addForm.notes,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Gagal mencatat maintenance.');
      return;
    }

    setIsAddModalOpen(false);
  };

  const handleOpenUpdateModal = (record: MaintenanceRecord) => {
    setUpdatingRecord(record);
    setStatusUpdateForm({
      repairStatus: record.repairStatus,
      pic: record.pic,
      repairCost: String(record.repairCost || 0),
      notes: record.notes || '',
      resolvedCondition: 'Good',
      retireUnitsIfNotRepairable: false,
    });
    setErrorMessage(null);
  };

  const handleSubmitUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingRecord) return;
    setErrorMessage(null);

    const costNum = parseFloat(statusUpdateForm.repairCost) || 0;
    const res = updateMaintenanceStatus({
      maintenanceId: updatingRecord.maintenanceId,
      repairStatus: statusUpdateForm.repairStatus,
      pic: statusUpdateForm.pic,
      repairCost: costNum,
      notes: statusUpdateForm.notes,
      resolvedCondition: statusUpdateForm.resolvedCondition,
      retireUnitsIfNotRepairable: statusUpdateForm.retireUnitsIfNotRepairable,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Gagal mengubah status maintenance.');
      return;
    }

    setUpdatingRecord(null);
  };

  const getStatusBadge = (status: MaintenanceStatus) => {
    switch (status) {
      case 'Reported':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">
            <Clock className="w-3 h-3" /> Reported (Dilaporkan)
          </span>
        );
      case 'In Repair':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800">
            <Wrench className="w-3 h-3" /> In Repair (Dalam Pengerjaan)
          </span>
        );
      case 'Repaired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Repaired (Selesai Diperbaiki)
          </span>
        );
      case 'Not Repairable':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800">
            <Flame className="w-3 h-3" /> Not Repairable (Rusak Total)
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>⚠️ Maintenance & Perbaikan Peralatan Lab</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {filteredMaintenance.length} Kasus
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pantau barang rusak, riwayat servis, teknisi penanggung jawab (PIC), estimasi biaya, dan pemulihan stok.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-amber-900/30 flex items-center gap-2 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Kerusakan Baru</span>
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-amber-400 block font-semibold uppercase">Menunggu Tindakan</span>
          <span className="text-2xl font-bold text-white mt-1 block">{reportedCount} Item</span>
          <span className="text-[11px] text-slate-400">Status: Reported</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-blue-400 block font-semibold uppercase">Sedang Diperbaiki</span>
          <span className="text-2xl font-bold text-white mt-1 block">{inRepairCount} Item</span>
          <span className="text-[11px] text-slate-400">Status: In Repair</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-emerald-400 block font-semibold uppercase">Selesai Diperbaiki</span>
          <span className="text-2xl font-bold text-white mt-1 block">{repairedCount} Item</span>
          <span className="text-[11px] text-slate-400">Status: Repaired</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-cyan-400 block font-semibold uppercase">Total Biaya Servis</span>
          <span className="text-xl font-bold text-white mt-1 block">
            Rp {totalRepairCost.toLocaleString('id-ID')}
          </span>
          <span className="text-[11px] text-slate-400">Akumulasi pengeluaran</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(['ALL', 'Reported', 'In Repair', 'Repaired', 'Not Repairable'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatus === st
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st === 'ALL'
                ? 'Semua Status'
                : st === 'Reported'
                ? 'Reported'
                : st === 'In Repair'
                ? 'In Repair'
                : st === 'Repaired'
                ? 'Repaired'
                : 'Not Repairable'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari alat, kerusakan, atau PIC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      {/* Maintenance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Barang Rusak</th>
                <th className="px-3 py-3.5">Deskripsi Kerusakan</th>
                <th className="px-3 py-3.5">Status Repair</th>
                <th className="px-3 py-3.5">Tgl Dilaporkan</th>
                <th className="px-3 py-3.5">PIC / Teknisi</th>
                <th className="px-3 py-3.5">Biaya Repair</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/70">
              {filteredMaintenance.map((record) => (
                <tr key={record.maintenanceId} className="hover:bg-slate-850/50 transition-colors">
                  {/* Item info */}
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-[11px] font-bold text-emerald-400 block">
                      {record.itemCode}
                    </span>
                    <span className="font-semibold text-white">{record.itemName}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Jumlah: {record.quantity} Unit
                    </span>
                  </td>

                  {/* Damage desc */}
                  <td className="px-3 py-3.5 max-w-[240px]">
                    <p className="text-slate-200 font-medium text-xs leading-relaxed">
                      {record.damageDescription}
                    </p>
                    {record.notes && (
                      <p className="text-[11px] text-slate-400 mt-1 italic">
                        Catatan: {record.notes}
                      </p>
                    )}
                  </td>

                  {/* Status Repair */}
                  <td className="px-3 py-3.5">{getStatusBadge(record.repairStatus)}</td>

                  {/* Report Date */}
                  <td className="px-3 py-3.5 text-slate-300">{record.reportedDate}</td>

                  {/* PIC */}
                  <td className="px-3 py-3.5">
                    <span className="flex items-center gap-1.5 font-medium text-slate-200">
                      <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {record.pic}
                    </span>
                  </td>

                  {/* Repair Cost */}
                  <td className="px-3 py-3.5 font-mono text-slate-200">
                    {record.repairCost > 0 ? (
                      <span>Rp {record.repairCost.toLocaleString('id-ID')}</span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    {isStaff ? (
                      <button
                        onClick={() => handleOpenUpdateModal(record)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 hover:border-amber-500 transition-all flex items-center gap-1.5 ml-auto"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Update Status</span>
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Akses Baca Saja</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredMaintenance.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                    <p className="font-semibold text-slate-300">Tidak ada catatan maintenance aktif.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Semua peralatan laboratorium sains dalam kondisi aman dan siap pakai.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Catat Kerusakan Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-white">Catat Kerusakan Barang Laboratorium</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
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

            <form onSubmit={handleSubmitAdd} className="space-y-4">
              {/* Item Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Pilih Barang yang Mengalami Kerusakan <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={addForm.itemId}
                  onChange={(e) => setAddForm({ ...addForm, itemId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                >
                  <option value="" disabled>
                    -- Pilih barang --
                  </option>
                  {items.map((item) => (
                    <option key={item.itemId} value={item.itemId}>
                      {item.itemCode} - {item.name} (Total: {item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Jumlah Barang Rusak (Unit) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={addForm.quantity}
                  onChange={(e) => setAddForm({ ...addForm, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Damage Description */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Deskripsi Kerusakan <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={addForm.damageDescription}
                  onChange={(e) => setAddForm({ ...addForm, damageDescription: e.target.value })}
                  placeholder="Contoh: Lensa buram, saklar konslet, retak pada bagian tabung, baut hilang..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Reported Date & PIC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Tanggal Dilaporkan <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={addForm.reportedDate}
                    onChange={(e) => setAddForm({ ...addForm, reportedDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    PIC / Teknisi Penanggung Jawab <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.pic}
                    onChange={(e) => setAddForm({ ...addForm, pic: e.target.value })}
                    placeholder="Nama staf lab atau teknisi luar"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Repair Cost & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Estimasi Biaya Perbaikan (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.repairCost}
                    onChange={(e) => setAddForm({ ...addForm, repairCost: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Catatan Tambahan</label>
                  <input
                    type="text"
                    value={addForm.notes}
                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                    placeholder="Estimasi selesai, vendor perbaikan..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-900/30 transition-all"
                >
                  Simpan Laporan Maintenance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Status Perbaikan */}
      {updatingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-white">Update Status Perbaikan Lab</h3>
              <button
                onClick={() => setUpdatingRecord(null)}
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

            {/* Target Item Info */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1 mb-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Barang:</span>
                <span className="font-semibold text-white">
                  {updatingRecord.itemCode} - {updatingRecord.itemName} ({updatingRecord.quantity} Unit)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Kerusakan:</span>
                <span className="text-slate-300 italic">{updatingRecord.damageDescription}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tgl Lapor:</span>
                <span className="text-slate-300">{updatingRecord.reportedDate}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitUpdate} className="space-y-4">
              {/* Status Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Pilih Status Perbaikan Baru <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Reported', 'In Repair', 'Repaired', 'Not Repairable'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusUpdateForm({ ...statusUpdateForm, repairStatus: st })}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                        statusUpdateForm.repairStatus === st
                          ? 'bg-amber-950 text-amber-200 border-amber-600 ring-1 ring-amber-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold">{st}</div>
                      <div className="text-[10px] opacity-75 font-normal">
                        {st === 'Reported' && 'Baru dilaporkan, antre teknisi'}
                        {st === 'In Repair' && 'Sedang dikerjakan teknisi'}
                        {st === 'Repaired' && 'Selesai, kembali ke stok siap pakai'}
                        {st === 'Not Repairable' && 'Rusak permanen / tidak bisa diservis'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Repaired -> Resolved Condition */}
              {statusUpdateForm.repairStatus === 'Repaired' && (
                <div className="p-3.5 bg-emerald-950/40 border border-emerald-800 rounded-xl space-y-2 text-xs">
                  <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Perbaikan Selesai: Kembalikan ke Stok Normal
                  </span>
                  <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                    Barang akan otomatis dikembalikan ke status <strong>Available</strong>. Tentukan kondisi fisik
                    akhirnya:
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="resolvedCondition"
                        value="Good"
                        checked={statusUpdateForm.resolvedCondition === 'Good'}
                        onChange={() => setStatusUpdateForm({ ...statusUpdateForm, resolvedCondition: 'Good' })}
                      />
                      <span>Good (Bagus Normal)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="resolvedCondition"
                        value="Fair"
                        checked={statusUpdateForm.resolvedCondition === 'Fair'}
                        onChange={() => setStatusUpdateForm({ ...statusUpdateForm, resolvedCondition: 'Fair' })}
                      />
                      <span>Fair (Layak Pakai dengan Catatan)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Status Not Repairable -> Option to write-off */}
              {statusUpdateForm.repairStatus === 'Not Repairable' && (
                <div className="p-3.5 bg-rose-950/40 border border-rose-800 rounded-xl space-y-2 text-xs">
                  <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-rose-400" />
                    Barang Tidak Dapat Diperbaiki (Rusak Permanen)
                  </span>
                  <p className="text-[11px] text-rose-200/90 leading-relaxed">
                    Barang <strong>tidak akan</strong> kembali ke stok Available.
                  </p>
                  <label className="flex items-center gap-2 pt-1 text-xs text-rose-200 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={statusUpdateForm.retireUnitsIfNotRepairable}
                      onChange={(e) =>
                        setStatusUpdateForm({
                          ...statusUpdateForm,
                          retireUnitsIfNotRepairable: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <span>Hapus fisik dari total quantity inventaris (Write-Off Aset)</span>
                  </label>
                </div>
              )}

              {/* PIC & Repair Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    PIC / Teknisi Pelaksana <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={statusUpdateForm.pic}
                    onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, pic: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Biaya Perbaikan Aktual (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={statusUpdateForm.repairCost}
                    onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, repairCost: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Catatan Servis</label>
                <textarea
                  rows={2}
                  value={statusUpdateForm.notes}
                  onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, notes: e.target.value })}
                  placeholder="Keterangan suku cadang yang diganti, nomor kwitansi, atau garansi servis..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setUpdatingRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-900/30 transition-all"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
