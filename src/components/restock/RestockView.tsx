import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { RestockRecord, RestockStatus } from '../../types/inventory';
import {
  ShoppingCart,
  TrendingDown,
  PackagePlus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  Plus,
  ArrowRight,
  X,
  AlertTriangle,
} from 'lucide-react';

export const RestockView: React.FC = () => {
  const {
    items,
    restocks,
    isStaff,
    createOrUpdateRestock,
    orderRestock,
    receiveRestock,
  } = useInventory();

  // Sub-tabs
  const [selectedStatusTab, setSelectedStatusTab] = useState<'ALL' | RestockStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [orderModalRestock, setOrderModalRestock] = useState<RestockRecord | null>(null);
  const [receiveModalRestock, setReceiveModalRestock] = useState<RestockRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form: Tambah Rencana Restock
  const [addPlanForm, setAddPlanForm] = useState({
    itemId: '',
    recommendedQuantity: 5,
    targetStock: '',
    notes: '',
  });

  // Form: Buat Pesanan (Order)
  const [orderForm, setOrderForm] = useState({
    supplier: '',
    orderedDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Form: Terima Barang (Receive)
  const [receiveForm, setReceiveForm] = useState({
    receivedQuantity: 1,
    receivedDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Identify all active items currently below or equal to minimum stock
  const lowStockItems = useMemo(() => {
    return items.filter((i) => i.status === 'Active' && i.quantity <= i.minimumStock);
  }, [items]);

  // Combined list: existing restock records + low-stock items that don't have a record yet
  const combinedRestockList = useMemo(() => {
    const list: Array<RestockRecord & { isAutoDetected?: boolean }> = [...restocks];

    lowStockItems.forEach((lowItem) => {
      const hasActiveRecord = restocks.some(
        (r) => r.itemId === lowItem.itemId && (r.status === 'To Buy' || r.status === 'Ordered')
      );

      if (!hasActiveRecord) {
        const target = lowItem.targetStock || lowItem.minimumStock * 2;
        const recQty = Math.max(1, target - lowItem.quantity);

        list.push({
          restockId: 'auto-rst-' + lowItem.itemId,
          itemId: lowItem.itemId,
          itemCode: lowItem.itemCode,
          itemName: lowItem.name,
          category: lowItem.category,
          currentStock: lowItem.quantity,
          minimumStock: lowItem.minimumStock,
          targetStock: target,
          recommendedQuantity: recQty,
          status: 'To Buy',
          supplier: lowItem.supplier,
          notes: 'Terdeteksi otomatis: Stok saat ini berada di bawah batas minimum.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isAutoDetected: true,
        });
      }
    });

    return list;
  }, [restocks, lowStockItems]);

  // Filtered List
  const filteredRestocks = useMemo(() => {
    return combinedRestockList
      .filter((r) => {
        if (selectedStatusTab !== 'ALL' && r.status !== selectedStatusTab) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = r.itemName.toLowerCase().includes(q) || r.itemCode.toLowerCase().includes(q);
          const matchSupp = r.supplier?.toLowerCase().includes(q);
          if (!matchName && !matchSupp) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const order: Record<RestockStatus, number> = { 'To Buy': 1, 'Ordered': 2, 'Received': 3 };
        return order[a.status] - order[b.status];
      });
  }, [combinedRestockList, selectedStatusTab, searchQuery]);

  const toBuyCount = useMemo(
    () => combinedRestockList.filter((r) => r.status === 'To Buy').length,
    [combinedRestockList]
  );
  const orderedCount = useMemo(
    () => combinedRestockList.filter((r) => r.status === 'Ordered').length,
    [combinedRestockList]
  );
  const receivedCount = useMemo(
    () => restocks.filter((r) => r.status === 'Received').length,
    [restocks]
  );

  const handleOpenAddPlan = () => {
    const firstLow = lowStockItems[0] || items[0];
    const target = firstLow ? firstLow.targetStock || firstLow.minimumStock * 2 : 10;
    const cur = firstLow ? firstLow.quantity : 0;
    setAddPlanForm({
      itemId: firstLow?.itemId || '',
      recommendedQuantity: Math.max(1, target - cur),
      targetStock: String(target),
      notes: '',
    });
    setErrorMessage(null);
    setIsAddPlanModalOpen(true);
  };

  const handleSubmitAddPlan = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const targetNum = addPlanForm.targetStock ? parseInt(addPlanForm.targetStock, 10) : undefined;
    const res = createOrUpdateRestock({
      itemId: addPlanForm.itemId,
      recommendedQuantity: Number(addPlanForm.recommendedQuantity),
      targetStock: targetNum,
      notes: addPlanForm.notes,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Gagal menyimpan rencana restock.');
      return;
    }

    setIsAddPlanModalOpen(false);
  };

  const handleOpenOrder = (record: RestockRecord & { isAutoDetected?: boolean }) => {
    if (record.isAutoDetected) {
      createOrUpdateRestock({
        itemId: record.itemId,
        recommendedQuantity: record.recommendedQuantity,
        targetStock: record.targetStock,
        notes: record.notes,
      });
    }

    setOrderModalRestock(record);
    setOrderForm({
      supplier: record.supplier || '',
      orderedDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setErrorMessage(null);
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderModalRestock) return;
    setErrorMessage(null);

    let targetRestockId = orderModalRestock.restockId;
    if (targetRestockId.startsWith('auto-rst-')) {
      const real = restocks.find((r) => r.itemId === orderModalRestock.itemId);
      if (real) targetRestockId = real.restockId;
    }

    const res = orderRestock({
      restockId: targetRestockId,
      supplier: orderForm.supplier,
      orderedDate: orderForm.orderedDate,
      notes: orderForm.notes,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Gagal memproses pesanan.');
      return;
    }

    setOrderModalRestock(null);
  };

  const handleOpenReceive = (record: RestockRecord) => {
    setReceiveModalRestock(record);
    setReceiveForm({
      receivedQuantity: record.recommendedQuantity || 1,
      receivedDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setErrorMessage(null);
  };

  const handleSubmitReceive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveModalRestock) return;
    setErrorMessage(null);

    const res = receiveRestock({
      restockId: receiveModalRestock.restockId,
      receivedQuantity: Number(receiveForm.receivedQuantity),
      receivedDate: receiveForm.receivedDate,
      notes: receiveForm.notes,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Gagal menerima barang.');
      return;
    }

    setReceiveModalRestock(null);
  };

  const renderStatus = (status: RestockStatus) => {
    switch (status) {
      case 'To Buy':
        return (
          <span className="text-amber-700 dark:text-amber-400 font-medium text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Rencana Beli
          </span>
        );
      case 'Ordered':
        return (
          <span className="text-blue-700 dark:text-blue-400 font-medium text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Dipesan
          </span>
        );
      case 'Received':
        return (
          <span className="text-emerald-700 dark:text-emerald-400 font-medium text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Diterima
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
            Restock & Pengadaan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manajemen pengadaan bahan habis pakai dan restock peralatan di bawah batas minimum.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={handleOpenAddPlan}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Rencana Restock Baru</span>
          </button>
        )}
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-semibold">Rencana Beli</span>
            <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {toBuyCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Item perlu dipesan</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-semibold">Dalam Pesanan</span>
            <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {orderedCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Menunggu pengiriman supplier</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-semibold">Selesai Diterima</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {receivedCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Stok fisik telah bertambah</div>
        </div>
      </div>

      {/* Filter and Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {(['ALL', 'To Buy', 'Ordered', 'Received'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedStatusTab(tab)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  selectedStatusTab === tab
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab === 'ALL'
                  ? 'Semua'
                  : tab === 'To Buy'
                  ? 'Rencana Beli'
                  : tab === 'Ordered'
                  ? 'Dipesan'
                  : 'Diterima'}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari item restock..."
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
                <th className="px-3 py-2.5 text-right">Stok Saat Ini</th>
                <th className="px-3 py-2.5 text-right">Batas Min</th>
                <th className="px-3 py-2.5 text-right">Rekomendasi Beli</th>
                <th className="px-3 py-2.5">Supplier</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3.5 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredRestocks.map((record) => (
                <tr
                  key={record.restockId}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors"
                >
                  <td className="px-3.5 py-2.5">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {record.itemName}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">{record.itemCode}</div>
                  </td>

                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-white font-medium">
                    {record.currentStock}
                  </td>

                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-500">
                    {record.minimumStock}
                  </td>

                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400 font-semibold">
                    +{record.recommendedQuantity}
                  </td>

                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                    {record.supplier || '-'}
                  </td>

                  <td className="px-3 py-2.5">
                    {renderStatus(record.status)}
                  </td>

                  <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                    {isStaff ? (
                      record.status === 'To Buy' ? (
                        <button
                          onClick={() => handleOpenOrder(record)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                        >
                          Pesan
                        </button>
                      ) : record.status === 'Ordered' ? (
                        <button
                          onClick={() => handleOpenReceive(record)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                        >
                          Terima Barang
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">
                          Diterima ({record.receivedQuantity || record.recommendedQuantity})
                        </span>
                      )
                    ) : (
                      <span className="text-[11px] text-slate-400">View only</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredRestocks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                    <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                      Tidak ada catatan restock yang sesuai filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Plan Modal */}
      {isAddPlanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Buat Rencana Restock
              </h3>
              <button
                onClick={() => setIsAddPlanModalOpen(false)}
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

            <form onSubmit={handleSubmitAddPlan} className="space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Pilih Alat / Bahan <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={addPlanForm.itemId}
                  onChange={(e) => {
                    const sel = items.find((i) => i.itemId === e.target.value);
                    const target = sel ? sel.targetStock || sel.minimumStock * 2 : 10;
                    const cur = sel ? sel.quantity : 0;
                    setAddPlanForm({
                      ...addPlanForm,
                      itemId: e.target.value,
                      recommendedQuantity: Math.max(1, target - cur),
                      targetStock: String(target),
                    });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="" disabled>-- Pilih item inventaris --</option>
                  {items.map((i) => (
                    <option key={i.itemId} value={i.itemId}>
                      {i.name} ({i.itemCode}) — Stok: {i.quantity} (Min: {i.minimumStock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Jumlah Beli <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={addPlanForm.recommendedQuantity}
                    onChange={(e) => setAddPlanForm({ ...addPlanForm, recommendedQuantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Target Stok Ideal
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={addPlanForm.targetStock}
                    onChange={(e) => setAddPlanForm({ ...addPlanForm, targetStock: e.target.value })}
                    placeholder="Batas ideal"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={addPlanForm.notes}
                  onChange={(e) => setAddPlanForm({ ...addPlanForm, notes: e.target.value })}
                  placeholder="Keterangan keperluan praktikum..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPlanModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg cursor-pointer shadow-xs"
                >
                  Simpan Rencana
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {orderModalRestock && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                  Buat Pesanan Restock
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {orderModalRestock.itemName} (+{orderModalRestock.recommendedQuantity} unit)
                </p>
              </div>
              <button
                onClick={() => setOrderModalRestock(null)}
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

            <form onSubmit={handleSubmitOrder} className="space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Supplier / Vendor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderForm.supplier}
                  onChange={(e) => setOrderForm({ ...orderForm, supplier: e.target.value })}
                  placeholder="Contoh: PT Sumber Sains Mandiri"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Tanggal Pemesanan
                </label>
                <input
                  type="date"
                  required
                  value={orderForm.orderedDate}
                  onChange={(e) => setOrderForm({ ...orderForm, orderedDate: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  placeholder="Nomor PO / info kontak sales..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setOrderModalRestock(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg cursor-pointer shadow-xs"
                >
                  Konfirmasi Pemesanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {receiveModalRestock && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                  Penerimaan Barang Fisik
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {receiveModalRestock.itemName} dari {receiveModalRestock.supplier || 'Supplier'}
                </p>
              </div>
              <button
                onClick={() => setReceiveModalRestock(null)}
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

            <form onSubmit={handleSubmitReceive} className="space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Jumlah Fisik Diterima <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={receiveForm.receivedQuantity}
                  onChange={(e) => setReceiveForm({ ...receiveForm, receivedQuantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Stok inventaris barang ini akan bertambah secara otomatis sejumlah ini.
                </span>
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Tanggal Diterima Fisik
                </label>
                <input
                  type="date"
                  required
                  value={receiveForm.receivedDate}
                  onChange={(e) => setReceiveForm({ ...receiveForm, receivedDate: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Catatan Penerimaan</label>
                <textarea
                  rows={2}
                  value={receiveForm.notes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                  placeholder="Kondisi kemasan / nomor resi..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReceiveModalRestock(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer shadow-xs"
                >
                  Simpan & Tambah ke Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
