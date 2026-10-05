import React, { useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { MainNavigationTab, InventoryItem } from '../../types/inventory';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Flame,
  HelpCircle,
  ArrowRight,
  TrendingDown,
  Coins,
  PackageSearch,
  Wrench,
  Clock,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: MainNavigationTab, filterParams?: any) => void;
  onSelectItemDetail?: (item: InventoryItem) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onSelectItemDetail }) => {
  const { items, borrows, maintenance, restocks, getItemStockInfo } = useInventory();

  // Active items only
  const activeItems = useMemo(() => items.filter((i) => i.status === 'Active'), [items]);

  // 1. Total Jenis Barang
  const totalJenisBarang = activeItems.length;

  // 2. Total Quantity
  const totalQuantity = useMemo(
    () => activeItems.reduce((acc, curr) => acc + curr.quantity, 0),
    [activeItems]
  );

  // 3. Available Quantity (Total sum of available stock across active items)
  const totalAvailable = useMemo(() => {
    return activeItems.reduce((acc, item) => {
      const stock = getItemStockInfo(item.itemId);
      return acc + stock.availableQuantity;
    }, 0);
  }, [activeItems, getItemStockInfo]);

  // 4. Low Stock items count (item.quantity <= item.minimumStock)
  const lowStockItems = useMemo(
    () => activeItems.filter((item) => item.quantity <= item.minimumStock),
    [activeItems]
  );
  const lowStockCount = lowStockItems.length;

  // 5. Damaged count
  const damagedCount = useMemo(() => {
    return activeItems.reduce((acc, item) => {
      const stock = getItemStockInfo(item.itemId);
      return acc + stock.damagedQuantity;
    }, 0);
  }, [activeItems, getItemStockInfo]);

  // 5b. Lost count (Hilang)
  const lostCount = useMemo(() => {
    return activeItems.reduce((acc, item) => {
      const stock = getItemStockInfo(item.itemId);
      return acc + stock.lostQuantity;
    }, 0);
  }, [activeItems, getItemStockInfo]);

  // 6. Borrowed count
  const totalBorrowed = useMemo(() => {
    const activeBorrows = borrows.filter(
      (b) => b.status === 'Borrowed' || b.status === 'Overdue'
    );
    return activeBorrows.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [borrows]);

  // 7. Estimated Inventory Value
  const { totalEstimatedValue, itemsWithPriceCount, totalItemsCount } = useMemo(() => {
    let sum = 0;
    let pricedCount = 0;
    activeItems.forEach((item) => {
      if (item.unitPurchasePrice !== undefined && item.unitPurchasePrice > 0) {
        sum += item.quantity * item.unitPurchasePrice;
        pricedCount++;
      }
    });
    return {
      totalEstimatedValue: sum,
      itemsWithPriceCount: pricedCount,
      totalItemsCount: activeItems.length,
    };
  }, [activeItems]);

  // Categories distribution from actual inventory data
  const categoryStats = useMemo(() => {
    const map: Record<string, { count: number; totalQty: number }> = {};
    activeItems.forEach((item) => {
      const cat = item.category || 'Lainnya';
      if (!map[cat]) {
        map[cat] = { count: 0, totalQty: 0 };
      }
      map[cat].count += 1;
      map[cat].totalQty += item.quantity;
    });

    const categories = Object.keys(map).map((cat) => ({
      name: cat,
      itemCount: map[cat].count,
      totalQty: map[cat].totalQty,
      percentage: totalQuantity > 0 ? Math.round((map[cat].totalQty / totalQuantity) * 100) : 0,
    }));

    return categories.sort((a, b) => b.totalQty - a.totalQty);
  }, [activeItems, totalQuantity]);

  // Needs Attention items computed dynamically from actual state
  const needsAttentionList = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'low_stock' | 'damaged' | 'overdue' | 'maintenance' | 'restock_tobuy' | 'restock_ordered';
      title: string;
      subtitle: string;
      severity: 'high' | 'medium' | 'info';
      actionLabel: string;
      targetTab: MainNavigationTab;
      extraData?: any;
    }> = [];

    const today = new Date().toISOString().split('T')[0];

    // 1. Overdue borrowings (Urgent!)
    borrows
      .filter(
        (b) => b.status === 'Overdue' || (b.status === 'Borrowed' && b.expectedReturnDate < today)
      )
      .forEach((b) => {
        list.push({
          id: `overdue-${b.borrowId}`,
          type: 'overdue',
          title: `Keterlambatan: ${b.itemName} (${b.quantity} unit)`,
          subtitle: `Peminjam: ${b.borrowerName} • Batas Kembali: ${b.expectedReturnDate}`,
          severity: 'high',
          actionLabel: 'Proses Kembali',
          targetTab: 'borrow',
        });
      });

    // 2. Damaged items needing attention
    activeItems
      .filter((i) => i.condition === 'Damaged')
      .forEach((i) => {
        list.push({
          id: `damaged-${i.itemId}`,
          type: 'damaged',
          title: `Kondisi Rusak: ${i.name}`,
          subtitle: `Kode: ${i.itemCode} • Lokasi: ${i.location} • Total: ${i.quantity} ${i.unit}`,
          severity: 'high',
          actionLabel: 'Catat Perbaikan',
          targetTab: 'maintenance',
          extraData: { itemId: i.itemId },
        });
      });

    // 2b. Lost items (Hilang) needing attention
    activeItems
      .filter((i) => i.condition === 'Hilang')
      .forEach((i) => {
        list.push({
          id: `lost-${i.itemId}`,
          type: 'damaged',
          title: `Barang Hilang: ${i.name}`,
          subtitle: `Kode: ${i.itemCode} • Lokasi Terakhir: ${i.location} • Qty: ${i.quantity} ${i.unit}`,
          severity: 'high',
          actionLabel: 'Cek Inventaris',
          targetTab: 'inventory',
          extraData: { filterCondition: 'Hilang' },
        });
      });

    // 3. Maintenance currently reported or in repair
    maintenance
      .filter((m) => m.repairStatus === 'Reported' || m.repairStatus === 'In Repair')
      .forEach((m) => {
        list.push({
          id: `maint-${m.maintenanceId}`,
          type: 'maintenance',
          title: `Sedang Maintenance: ${m.itemName} (${m.quantity} unit)`,
          subtitle: `Status: ${m.repairStatus === 'Reported' ? 'Menunggu Perbaikan' : 'Dalam Pengerjaan'} • PIC: ${m.pic}`,
          severity: m.repairStatus === 'Reported' ? 'high' : 'medium',
          actionLabel: 'Update Status',
          targetTab: 'maintenance',
        });
      });

    // 4. Low stock items
    lowStockItems.forEach((item) => {
      list.push({
        id: `lowstock-${item.itemId}`,
        type: 'low_stock',
        title: `Stok Menipis: ${item.name}`,
        subtitle: `Sisa: ${item.quantity} ${item.unit} (Min: ${item.minimumStock} ${item.unit}) • Lokasi: ${item.location}`,
        severity: item.quantity === 0 ? 'high' : 'medium',
        actionLabel: 'Restock Sekarang',
        targetTab: 'restock',
        extraData: { itemId: item.itemId },
      });
    });

    // 5. Restocks with status 'To Buy'
    restocks
      .filter((r) => r.status === 'To Buy')
      .forEach((r) => {
        list.push({
          id: `rst-tobuy-${r.restockId}`,
          type: 'restock_tobuy',
          title: `Rencana Beli: ${r.itemName}`,
          subtitle: `Rekomendasi Beli: ${r.recommendedQuantity} unit • Stok Saat Ini: ${r.currentStock}`,
          severity: 'medium',
          actionLabel: 'Buat Pesanan',
          targetTab: 'restock',
        });
      });

    // 6. Restocks with status 'Ordered' (waiting to be received)
    restocks
      .filter((r) => r.status === 'Ordered')
      .forEach((r) => {
        list.push({
          id: `rst-ordered-${r.restockId}`,
          type: 'restock_ordered',
          title: `Menunggu Pengiriman: ${r.itemName}`,
          subtitle: `Supplier: ${r.supplier || '-'} • Dipesan: ${r.orderedDate || '-'}`,
          severity: 'info',
          actionLabel: 'Terima Barang',
          targetTab: 'restock',
        });
      });

    return list;
  }, [borrows, activeItems, maintenance, lowStockItems, restocks]);

  const categoryColors = [
    'from-emerald-500 to-teal-600',
    'from-sky-500 to-blue-600',
    'from-violet-500 to-purple-600',
    'from-amber-500 to-orange-600',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-indigo-600',
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
                Pusat Kontrol Laboratorium
              </span>
              <span className="text-xs text-slate-400">
                Update Real-time: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Ringkasan Operasional Laboratorium Sains
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Pantau ketersediaan peralatan, praktikum aktif, barang rusak, perbaikan berkala, dan kebutuhan restock
              secara akurat dan terintegrasi.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('inventory')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-all hover:translate-y-[-1px]"
            >
              <PackageSearch className="w-4 h-4" />
              <span>Buka Inventory</span>
            </button>
            <button
              onClick={() => onNavigate('borrow')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold border border-slate-700 flex items-center gap-2 transition-colors"
            >
              <span>Catat Pinjam</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 7 Summary Cards (Clickable to respective modules) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Jenis Barang */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Jenis Barang
            </span>
            <div className="p-2 rounded-xl bg-slate-800 text-cyan-400 group-hover:scale-110 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{totalJenisBarang}</div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
            <span>Item terdaftar aktif</span>
            <span className="text-cyan-400 group-hover:translate-x-1 transition-transform flex items-center">
              Lihat <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* 2. Total Quantity */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Quantity
            </span>
            <div className="p-2 rounded-xl bg-slate-800 text-teal-400 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {totalQuantity.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
            <span>Unit fisik seluruh item</span>
            <span className="text-teal-400 group-hover:translate-x-1 transition-transform flex items-center">
              Lihat <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* 3. Available */}
        <div
          onClick={() => onNavigate('inventory', { filterCondition: 'Good' })}
          className="bg-slate-900 border border-emerald-900/40 hover:border-emerald-700/60 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Available (Siap Pakai)
            </span>
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 group-hover:scale-110 transition-transform border border-emerald-800/60">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-400 tracking-tight">
            {totalAvailable.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
            <span>Bebas dipinjam/digunakan</span>
            <span className="text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center">
              Filter <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* 4. Low Stock */}
        <div
          onClick={() => onNavigate('restock')}
          className={`border rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all group ${
            lowStockCount > 0
              ? 'bg-amber-950/20 border-amber-800/60 hover:border-amber-600'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Low Stock
            </span>
            <div className="p-2 rounded-xl bg-amber-950 text-amber-400 group-hover:scale-110 transition-transform border border-amber-800/60">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-400 tracking-tight">{lowStockCount}</div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
            <span>≤ Minimum Stock</span>
            <span className="text-amber-400 font-medium group-hover:translate-x-1 transition-transform flex items-center">
              Restock <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* 5. Damaged & Hilang */}
        <div
          onClick={() => onNavigate('inventory', { filterCondition: lostCount > 0 && damagedCount === 0 ? 'Hilang' : 'Damaged' })}
          className={`border rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all group ${
            damagedCount > 0 || lostCount > 0
              ? 'bg-rose-950/20 border-rose-800/60 hover:border-rose-600'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Damaged / Hilang
            </span>
            <div className="p-2 rounded-xl bg-rose-950 text-rose-400 group-hover:scale-110 transition-transform border border-rose-800/60">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-rose-400 tracking-tight">{damagedCount}</div>
            {lostCount > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                {lostCount} Hilang
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
            <span>{lostCount > 0 ? `${damagedCount} rusak • ${lostCount} hilang` : 'Kondisi rusak / cacat'}</span>
            <span className="text-rose-400 font-medium group-hover:translate-x-1 transition-transform flex items-center">
              Lihat <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* 6. Borrowed */}
        <div
          onClick={() => onNavigate('borrow')}
          className="bg-slate-900 border border-indigo-900/40 hover:border-indigo-700/60 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Borrowed
            </span>
            <div className="p-2 rounded-xl bg-indigo-950 text-indigo-400 group-hover:scale-110 transition-transform border border-indigo-800/60">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-indigo-300 tracking-tight">{totalBorrowed}</div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
            <span>Unit aktif dipinjam</span>
            <span className="text-indigo-400 group-hover:translate-x-1 transition-transform flex items-center">
              Lihat <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* 7. Nilai Estimasi Inventaris (Spans 2 columns on larger screens) */}
        <div className="sm:col-span-2 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-700/70 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Nilai Estimasi Inventaris
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {itemsWithPriceCount}/{totalItemsCount} Item Terdata
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800 text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>

          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight">
            Rp {totalEstimatedValue.toLocaleString('id-ID')}
          </div>

          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {itemsWithPriceCount === totalItemsCount ? (
              <span>Dihitung berdasarkan harga beli seluruh item terdaftar.</span>
            ) : itemsWithPriceCount > 0 ? (
              <span>
                Dihitung dari {itemsWithPriceCount} item dengan harga pembelian valid (
                {totalItemsCount - itemsWithPriceCount} item belum memiliki data harga).
              </span>
            ) : (
              <span className="text-amber-400">Data harga pembelian belum tersedia.</span>
            )}
          </p>
        </div>
      </div>

      {/* Main Grid: Needs Attention & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs Attention Section (2 Columns) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/60">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-white">⚠️ Needs Attention</h2>
                <p className="text-xs text-slate-400">
                  Item yang membutuhkan tindak lanjut operasional segera
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {needsAttentionList.length} Item Perlu Perhatian
            </span>
          </div>

          {needsAttentionList.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-900/50">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">Semua Operasional Terkendali!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Tidak ada barang dengan stok menipis, barang rusak belum tertangani, atau keterlambatan peminjaman saat
                ini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800 max-h-[380px] overflow-y-auto pr-1">
              {needsAttentionList.map((item) => (
                <div
                  key={item.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-850/60 px-3 rounded-xl transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          item.severity === 'high'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : item.severity === 'medium'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-sky-950 text-sky-300 border border-sky-800'
                        }`}
                      >
                        {item.severity === 'high' ? 'Penting' : item.severity === 'medium' ? 'Perhatian' : 'Info'}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-100">{item.title}</h4>
                    </div>
                    <p className="text-xs text-slate-400">{item.subtitle}</p>
                  </div>

                  <button
                    onClick={() => onNavigate(item.targetTab, item.extraData)}
                    className="shrink-0 self-start sm:self-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white border border-slate-700 hover:border-emerald-500 transition-all flex items-center gap-1.5"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory Category Breakdown (1 Column) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-base text-white">Inventaris Berdasarkan Kategori</h2>
              <p className="text-xs text-slate-400">Sebaran kuantitas alat & bahan lab sains</p>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            {categoryStats.map((cat, idx) => (
              <div key={cat.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${
                        categoryColors[idx % categoryColors.length]
                      }`}
                    />
                    <span className="font-medium text-slate-200">{cat.name}</span>
                    <span className="text-slate-500">({cat.itemCount} jenis)</span>
                  </div>
                  <span className="font-semibold text-slate-300">
                    {cat.totalQty} unit ({cat.percentage}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${
                      categoryColors[idx % categoryColors.length]
                    }`}
                    style={{ width: `${Math.max(4, cat.percentage)}%` }}
                  />
                </div>
              </div>
            ))}

            {categoryStats.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400">Belum ada data kategori barang.</div>
            )}
          </div>

          <div className="pt-4 mt-auto border-t border-slate-800">
            <button
              onClick={() => onNavigate('inventory')}
              className="w-full py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Kelola Seluruh Item di Inventory</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
