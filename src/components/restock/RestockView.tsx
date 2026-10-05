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
  Info,
  X,
  Building,
  AlertCircle,
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

    // Check low stock items that have NO active restock record
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
        // Pending statuses first (To Buy, Ordered, Received)
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
    // If it was auto detected, ensure it exists in real state first
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

    // If record was auto detected, grab real restock ID from state
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
      setErrorMessage(res.error || 'Gagal memproses penerimaan barang.');
      return;
    }

    setReceiveModalRestock(null);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🛒 Pengadaan & Restock Laboratorium</span>
            {toBuyCount > 0 && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                {toBuyCount} Perlu Dibeli Segera
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitoring otomatis barang dengan stok ≤ minimum stock, rekomendasi jumlah pembelian, pemesanan, dan
            penerimaan barang.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={handleOpenAddPlan}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-orange-900/30 flex items-center gap-2 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Rencana Restock</span>
          </button>
        )}
      </div>

      {/* Metric Pipeline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => setSelectedStatusTab('To Buy')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatusTab === 'To Buy'
              ? 'bg-amber-950/40 border-amber-600 ring-1 ring-amber-500'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">1. To Buy (Perlu Dibeli)</span>
            <TrendingDown className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{toBuyCount} Item</div>
          <p className="text-[11px] text-slate-400 mt-1">
            Stok menipis atau di bawah batas minimum
          </p>
        </div>

        <div
          onClick={() => setSelectedStatusTab('Ordered')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatusTab === 'Ordered'
              ? 'bg-sky-950/40 border-sky-600 ring-1 ring-sky-500'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-sky-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">2. Ordered (Dipesan)</span>
            <Truck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{orderedCount} Pesanan</div>
          <p className="text-[11px] text-slate-400 mt-1">
            Pesanan telah dikirim ke supplier / menunggu kiriman
          </p>
        </div>

        <div
          onClick={() => setSelectedStatusTab('Received')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatusTab === 'Received'
              ? 'bg-emerald-950/40 border-emerald-600 ring-1 ring-emerald-500'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">3. Received (Diterima)</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{receivedCount} Selesai</div>
          <p className="text-[11px] text-slate-400 mt-1">
            Barang telah sampai fisik dan stok otomatis bertambah
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(['ALL', 'To Buy', 'Ordered', 'Received'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedStatusTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatusTab === tab
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab === 'ALL' ? 'Semua Pipeline' : tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama barang atau supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-orange-500"
          />
        </div>
      </div>

      {/* Restock Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Barang</th>
                <th className="px-3 py-3.5">Kategori</th>
                <th className="px-3 py-3.5">Current Stock</th>
                <th className="px-3 py-3.5">Minimum Stock</th>
                <th className="px-3 py-3.5">Recommended Qty</th>
                <th className="px-3 py-3.5">Status Restock</th>
                <th className="px-3 py-3.5">Supplier & Info</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/70">
              {filteredRestocks.map((record) => (
                <tr key={record.restockId} className="hover:bg-slate-850/50 transition-colors">
                  {/* Item */}
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-[11px] font-bold text-emerald-400 block">
                      {record.itemCode}
                    </span>
                    <span className="font-semibold text-white">{record.itemName}</span>
                    {record.isAutoDetected && (
                      <span className="inline-block mt-0.5 text-[9px] font-bold text-amber-400 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-800">
                        Deteksi Otomatis (Low Stock)
                      </span>
                    )}
                  </td>

                  {/* Category */}
                  <td className="px-3 py-3.5">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {record.category}
                    </span>
                  </td>

                  {/* Current Stock */}
                  <td className="px-3 py-3.5">
                    <span
                      className={`font-bold text-sm ${
                        record.currentStock <= record.minimumStock ? 'text-amber-400' : 'text-slate-200'
                      }`}
                    >
                      {record.currentStock} Unit
                    </span>
                  </td>

                  {/* Minimum Stock */}
                  <td className="px-3 py-3.5 text-slate-400 font-mono">
                    {record.minimumStock} Unit
                  </td>

                  {/* Recommended Quantity */}
                  <td className="px-3 py-3.5">
                    <span className="font-bold text-emerald-400 text-sm">
                      +{record.recommendedQuantity} Unit
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Target: {record.targetStock}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3.5">
                    {record.status === 'To Buy' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                        <TrendingDown className="w-3 h-3" /> To Buy (Perlu Dibeli)
                      </span>
                    )}
                    {record.status === 'Ordered' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950 text-sky-300 border border-sky-800">
                        <Truck className="w-3 h-3" /> Ordered (Dipesan)
                      </span>
                    )}
                    {record.status === 'Received' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Received ({record.receivedQuantity} Diterima)
                      </span>
                    )}
                  </td>

                  {/* Supplier & Dates */}
                  <td className="px-3 py-3.5 text-slate-400">
                    <div className="font-medium text-slate-300">{record.supplier || '-'}</div>
                    {record.orderedDate && (
                      <div className="text-[10px] text-sky-400">Order: {record.orderedDate}</div>
                    )}
                    {record.receivedDate && (
                      <div className="text-[10px] text-emerald-400">
                        Tiba: {record.receivedDate}
                      </div>
                    )}
                  </td>

                  {/* Action Buttons */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    {isStaff ? (
                      <div className="flex items-center justify-end gap-1.5">
                        {record.status === 'To Buy' && (
                          <button
                            onClick={() => handleOpenOrder(record)}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Buat Pesanan</span>
                          </button>
                        )}

                        {record.status === 'Ordered' && (
                          <button
                            onClick={() => handleOpenReceive(record)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Terima Barang</span>
                          </button>
                        )}

                        {record.status === 'Received' && (
                          <span className="text-[11px] text-emerald-500 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Akses Baca</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredRestocks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                    <p className="font-semibold text-slate-300">Semua kebutuhan restock terpenuhi.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Tidak ada barang di bawah stok minimum yang membutuhkan pembelian.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah Rencana Restock */}
      {isAddPlanModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-white">Tambah Rencana Restock Pengadaan</h3>
              <button
                onClick={() => setIsAddPlanModalOpen(false)}
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

            <form onSubmit={handleSubmitAddPlan} className="space-y-4">
              {/* Item Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Pilih Barang yang Akan Direstock <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={addPlanForm.itemId}
                  onChange={(e) => {
                    const sel = items.find((i) => i.itemId === e.target.value);
                    const target = sel?.targetStock || (sel ? sel.minimumStock * 2 : 10);
                    const cur = sel?.quantity || 0;
                    setAddPlanForm({
                      ...addPlanForm,
                      itemId: e.target.value,
                      recommendedQuantity: Math.max(1, target - cur),
                      targetStock: String(target),
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-orange-500"
                >
                  <option value="" disabled>
                    -- Pilih barang --
                  </option>
                  {items.map((item) => (
                    <option key={item.itemId} value={item.itemId}>
                      {item.itemCode} - {item.name} (Stok Saat Ini: {item.quantity} {item.unit}, Min:{' '}
                      {item.minimumStock})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recommended Quantity & Target Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Jumlah Rekomendasi Beli <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={addPlanForm.recommendedQuantity}
                    onChange={(e) =>
                      setAddPlanForm({
                        ...addPlanForm,
                        recommendedQuantity: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-orange-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Dihitung dari Target Stock − Current Stock
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Target Stock Ideal
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={addPlanForm.targetStock}
                    onChange={(e) => setAddPlanForm({ ...addPlanForm, targetStock: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-orange-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Batas stok aman maksimum laboratorium</p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Catatan Rencana Pengadaan
                </label>
                <textarea
                  rows={2}
                  value={addPlanForm.notes}
                  onChange={(e) => setAddPlanForm({ ...addPlanForm, notes: e.target.value })}
                  placeholder="Kebutuhan ujian akhir semester, praktikum akreditasi..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPlanModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-900/30 transition-all"
                >
                  Simpan Rencana Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Buat Pesanan (Order) */}
      {orderModalRestock && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-white">Buat Pesanan Pembelian (Order Restock)</h3>
              <button
                onClick={() => setOrderModalRestock(null)}
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

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1 mb-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Barang:</span>
                <span className="font-semibold text-white">
                  {orderModalRestock.itemCode} - {orderModalRestock.itemName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Jumlah Direkomendasikan:</span>
                <span className="font-bold text-orange-400 text-sm">
                  {orderModalRestock.recommendedQuantity} Unit
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Stok Saat Ini:</span>
                <span className="text-slate-300">{orderModalRestock.currentStock} Unit</span>
              </div>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              {/* Supplier */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nama Supplier / Distributor <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderForm.supplier}
                  onChange={(e) => setOrderForm({ ...orderForm, supplier: e.target.value })}
                  placeholder="Contoh: PT Sumber Kimia Tama"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              {/* Order Date */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tanggal Pemesanan (Order Date) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={orderForm.orderedDate}
                  onChange={(e) => setOrderForm({ ...orderForm, orderedDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nomor PO / Catatan Pemesanan
                </label>
                <input
                  type="text"
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  placeholder="Contoh: PO-LAB-2026/10/01 - Estimasi tiba Jumat"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setOrderModalRestock(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-900/30 transition-all"
                >
                  Konfirmasi Pemesanan (Status: Ordered)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Terima Barang (Receive) */}
      {receiveModalRestock && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-white">Proses Penerimaan Barang Fisik (Received)</h3>
              <button
                onClick={() => setReceiveModalRestock(null)}
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

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1 mb-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Barang:</span>
                <span className="font-semibold text-white">
                  {receiveModalRestock.itemCode} - {receiveModalRestock.itemName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Supplier:</span>
                <span className="font-semibold text-slate-300">{receiveModalRestock.supplier || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Jumlah Pesanan:</span>
                <span className="font-bold text-sky-400">{receiveModalRestock.recommendedQuantity} Unit</span>
              </div>
            </div>

            <form onSubmit={handleSubmitReceive} className="space-y-4">
              {/* Actual Received Quantity */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Jumlah Barang Fisik yang Benar-benar Diterima <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={receiveForm.receivedQuantity}
                  onChange={(e) =>
                    setReceiveForm({
                      ...receiveForm,
                      receivedQuantity: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 font-bold"
                />
                <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  Stok inventaris akan bertambah sebanyak <strong>+{receiveForm.receivedQuantity} unit</strong>{' '}
                  sesuai jumlah fisik yang diterima.
                </p>
              </div>

              {/* Received Date */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tanggal Penerimaan <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={receiveForm.receivedDate}
                  onChange={(e) => setReceiveForm({ ...receiveForm, receivedDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Catatan Penerimaan</label>
                <input
                  type="text"
                  value={receiveForm.notes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                  placeholder="Kondisi kemasan utuh, segel baik, telah diuji fungsi..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReceiveModalRestock(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/30 transition-all"
                >
                  Konfirmasi Penerimaan & Tambah Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
