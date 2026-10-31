import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { MaintenanceRecord, MaintenanceStatus } from '../../types/inventory';
import {
  Wrench,
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Coins,
  X,
  XCircle,
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
    itemId: items[0]?.itemId || '',
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

  const renderStatus = (status: MaintenanceStatus) => {
    switch (status) {
      case 'Reported':
        return (
          <span className="text-rose-700 dark:text-rose-400 font-medium text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Menunggu
          </span>
        );
      case 'In Repair':
        return (
          <span className="text-amber-700 dark:text-amber-400 font-medium text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Dalam Servis
          </span>
        );
      case 'Repaired':
        return (
          <span className="text-emerald-700 dark:text-emerald-400 font-medium text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Selesai
          </span>
        );
      case 'Not Repairable':
        return (
          <span className="text-slate-500 dark:text-slate-400 font-medium text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Afkir
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Pemeliharaan & Perbaikan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pelaporan alat rusak, status perbaikan teknisi/guru, dan riwayat biaya servis.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat Kerusakan</span>
          </button>
        )}
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-semibold">Laporan Masuk</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {reportedCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Menunggu ditindaklanjuti</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-semibold">Sedang Diservis</span>
            <Wrench className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {inRepairCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Dalam pengerjaan PIC</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-semibold">Selesai Diperbaiki</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {repairedCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Kembali ke stok siap pakai</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-semibold">Total Biaya Servis</span>
            <Coins className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums truncate">
            Rp {totalRepairCost.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Pengeluaran lab sains</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto no-scrollbar">
            {(['ALL', 'Reported', 'In Repair', 'Repaired', 'Not Repairable'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  selectedStatus === status
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {status === 'ALL'
                  ? 'Semua'
                  : status === 'Reported'
                  ? 'Menunggu'
                  : status === 'In Repair'
                  ? 'Dalam Servis'
                  : status === 'Repaired'
                  ? 'Selesai'
                  : 'Afkir'}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari item, deskripsi, PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-7.5 pr-3 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5">Item & Kode</th>
                <th className="px-3 py-2.5 text-right">Jumlah</th>
                <th className="px-3 py-2.5">Deskripsi Kerusakan</th>
                <th className="px-3 py-2.5">PIC / Teknisi</th>
                <th className="px-3 py-2.5">Tgl Lapor</th>
                <th className="px-3 py-2.5 text-right">Biaya (Rp)</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3.5 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredMaintenance.map((record) => (
                <tr
                  key={record.maintenanceId}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors"
                >
                  <td className="px-3.5 py-2.5">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {record.itemName}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">{record.itemCode}</div>
                  </td>

                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-white font-medium">
                    {record.quantity}
                  </td>

                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-[200px]">
                    <span className="truncate block" title={record.damageDescription}>
                      {record.damageDescription}
                    </span>
                  </td>

                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                    {record.pic || '-'}
                  </td>

                  <td className="px-3 py-2.5 font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                    {record.reportedDate}
                  </td>

                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {record.repairCost ? record.repairCost.toLocaleString('id-ID') : '-'}
                  </td>

                  <td className="px-3 py-2.5">
                    {renderStatus(record.repairStatus)}
                  </td>

                  <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                    {isStaff ? (
                      <button
                        onClick={() => handleOpenUpdateModal(record)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-blue-950 dark:text-slate-200 dark:hover:text-blue-300 transition-colors cursor-pointer"
                      >
                        Update
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">View only</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredMaintenance.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                    <Wrench className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                      Tidak ada catatan pemeliharaan yang sesuai filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Maintenance Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Catat Laporan Kerusakan Alat
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
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

            <form onSubmit={handleSubmitAdd} className="space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Pilih Alat Inventaris <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={addForm.itemId}
                  onChange={(e) => setAddForm({ ...addForm, itemId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                >
                  {items.map((i) => (
                    <option key={i.itemId} value={i.itemId}>
                      {i.name} ({i.itemCode}) — Total: {i.quantity} {i.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Jumlah Rusak <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={addForm.quantity}
                    onChange={(e) => setAddForm({ ...addForm, quantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Tanggal Lapor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={addForm.reportedDate}
                    onChange={(e) => setAddForm({ ...addForm, reportedDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Deskripsi Kerusakan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={addForm.damageDescription}
                  onChange={(e) => setAddForm({ ...addForm, damageDescription: e.target.value })}
                  placeholder="Contoh: Tabung reaksi retak pada dasar, kabel catu daya putus..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    PIC / Teknisi Penanggung Jawab
                  </label>
                  <input
                    type="text"
                    value={addForm.pic}
                    onChange={(e) => setAddForm({ ...addForm, pic: e.target.value })}
                    placeholder="Contoh: Tr. Menur / Teknisi Lab"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Estimasi Biaya Servis (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.repairCost}
                    onChange={(e) => setAddForm({ ...addForm, repairCost: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg cursor-pointer shadow-xs"
                >
                  Simpan Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Maintenance Status Modal */}
      {updatingRecord && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                  Update Status Perbaikan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {updatingRecord.itemName} ({updatingRecord.quantity} unit)
                </p>
              </div>
              <button
                onClick={() => setUpdatingRecord(null)}
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

            <form onSubmit={handleSubmitUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Status Perbaikan Baru <span className="text-rose-500">*</span>
                </label>
                <select
                  value={statusUpdateForm.repairStatus}
                  onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, repairStatus: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="In Repair">In Repair (Sedang Dikerjakan)</option>
                  <option value="Repaired">Repaired (Selesai Diperbaiki)</option>
                  <option value="Not Repairable">Not Repairable (Rusak Total / Afkir)</option>
                </select>
              </div>

              {statusUpdateForm.repairStatus === 'Repaired' && (
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Kondisi Alat Pasca Perbaikan
                  </label>
                  <select
                    value={statusUpdateForm.resolvedCondition}
                    onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, resolvedCondition: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="Good">Good (Kondisi Bagus Normal)</option>
                    <option value="Fair">Fair (Kondisi Cukup / Layak Pakai)</option>
                  </select>
                </div>
              )}

              {statusUpdateForm.repairStatus === 'Not Repairable' && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="retireCheckbox"
                      checked={statusUpdateForm.retireUnitsIfNotRepairable}
                      onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, retireUnitsIfNotRepairable: e.target.checked })}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <label htmlFor="retireCheckbox" className="text-xs text-rose-800 dark:text-rose-200">
                      <strong>Kurangi dari Total Stok Fisik</strong>: Tandai alat sebagai barang yang dibuang/afkir karena tidak dapat diperbaiki.
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    PIC / Teknisi
                  </label>
                  <input
                    type="text"
                    value={statusUpdateForm.pic}
                    onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, pic: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Biaya Servis Aktual (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={statusUpdateForm.repairCost}
                    onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, repairCost: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Catatan Tindak Lanjut
                </label>
                <textarea
                  rows={2}
                  value={statusUpdateForm.notes}
                  onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUpdatingRecord(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg cursor-pointer shadow-xs"
                >
                  Simpan Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
