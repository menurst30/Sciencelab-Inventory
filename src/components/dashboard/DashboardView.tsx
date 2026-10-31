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
  ShoppingBag,
  ArrowLeftRight,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: MainNavigationTab, filterParams?: any) => void;
  onSelectItemDetail?: (item: InventoryItem) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onSelectItemDetail }) => {
  const { items, borrows, maintenance, restocks, getItemStockInfo } = useInventory();

  // Active items
  const activeItems = useMemo(() => items.filter((i) => i.status === 'Active'), [items]);

  // Total Jenis Barang
  const totalJenisBarang = activeItems.length;

  // Total Quantity
  const totalQuantity = useMemo(
    () => activeItems.reduce((acc, curr) => acc + curr.quantity, 0),
    [activeItems]
  );

  // Available Quantity
  const totalAvailable = useMemo(() => {
    return activeItems.reduce((acc, item) => {
      const stock = getItemStockInfo(item.itemId);
      return acc + stock.availableQuantity;
    }, 0);
  }, [activeItems, getItemStockInfo]);

  // Low Stock items
  const lowStockItems = useMemo(
    () => activeItems.filter((item) => item.quantity <= item.minimumStock),
    [activeItems]
  );
  const lowStockCount = lowStockItems.length;

  // Damaged count
  const damagedCount = useMemo(() => {
    return activeItems.reduce((acc, item) => {
      const stock = getItemStockInfo(item.itemId);
      return acc + stock.damagedQuantity;
    }, 0);
  }, [activeItems, getItemStockInfo]);

  // Lost count (Hilang)
  const lostCount = useMemo(() => {
    return activeItems.reduce((acc, item) => {
      const stock = getItemStockInfo(item.itemId);
      return acc + stock.lostQuantity;
    }, 0);
  }, [activeItems, getItemStockInfo]);

  // Borrowed count
  const totalBorrowed = useMemo(() => {
    const activeBorrows = borrows.filter(
      (b) => b.status === 'Borrowed' || b.status === 'Overdue'
    );
    return activeBorrows.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [borrows]);

  // Maintenance active count
  const activeMaintenanceCount = useMemo(() => {
    return maintenance.filter(
      (m) => m.repairStatus === 'Reported' || m.repairStatus === 'In Repair'
    ).reduce((acc, curr) => acc + curr.quantity, 0);
  }, [maintenance]);

  // Estimated Value
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

  // Categories distribution
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

  // Upcoming Return Deadlines (within 7 days or overdue)
  const upcomingDeadlines = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return borrows
      .filter((b) => b.status === 'Borrowed' || b.status === 'Overdue')
      .sort((a, b) => a.expectedReturnDate.localeCompare(b.expectedReturnDate))
      .slice(0, 5);
  }, [borrows]);

  // Needs Attention items computed dynamically
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

    // 1. Overdue borrowings
    borrows
      .filter((b) => b.status === 'Overdue' || (b.status === 'Borrowed' && b.expectedReturnDate < today))
      .forEach((b) => {
        list.push({
          id: `overdue-${b.borrowId}`,
          type: 'overdue',
          title: `Terlambat: ${b.itemName} (${b.quantity} unit)`,
          subtitle: `Peminjam: ${b.borrowerName} · Tenggat: ${b.expectedReturnDate}`,
          severity: 'high',
          actionLabel: 'Proses Kembali',
          targetTab: 'borrow',
        });
      });

    // 2. Damaged items
    activeItems
      .filter((i) => i.condition === 'Damaged')
      .forEach((i) => {
        list.push({
          id: `damaged-${i.itemId}`,
          type: 'damaged',
          title: `Alat Rusak: ${i.name}`,
          subtitle: `Kode: ${i.itemCode} · Lokasi: ${i.location} · Jumlah: ${i.quantity} ${i.unit}`,
          severity: 'high',
          actionLabel: 'Perbaikan',
          targetTab: 'maintenance',
          extraData: { itemId: i.itemId },
        });
      });

    // 2b. Lost items
    activeItems
      .filter((i) => i.condition === 'Hilang')
      .forEach((i) => {
        list.push({
          id: `lost-${i.itemId}`,
          type: 'damaged',
          title: `Barang Hilang: ${i.name}`,
          subtitle: `Kode: ${i.itemCode} · Lokasi Terakhir: ${i.location} · Qty: ${i.quantity} ${i.unit}`,
          severity: 'high',
          actionLabel: 'Inventaris',
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
          title: `Perawatan: ${m.itemName} (${m.quantity} unit)`,
          subtitle: `${m.repairStatus === 'Reported' ? 'Menunggu Perbaikan' : 'Sedang Diperbaiki'} · PIC: ${m.pic}`,
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
        title: `Stok Rendah: ${item.name}`,
        subtitle: `Tersisa: ${item.quantity} ${item.unit} (Min: ${item.minimumStock} ${item.unit}) · Lokasi: ${item.location}`,
        severity: item.quantity === 0 ? 'high' : 'medium',
        actionLabel: 'Restock',
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
          title: `Pengadaan: ${r.itemName}`,
          subtitle: `Rekomendasi: ${r.recommendedQuantity} unit · Stok Sekarang: ${r.currentStock}`,
          severity: 'medium',
          actionLabel: 'Buat Pesanan',
          targetTab: 'restock',
        });
      });

    // 6. Restocks with status 'Ordered'
    restocks
      .filter((r) => r.status === 'Ordered')
      .forEach((r) => {
        list.push({
          id: `rst-ordered-${r.restockId}`,
          type: 'restock_ordered',
          title: `Dalam Pengiriman: ${r.itemName}`,
          subtitle: `Supplier: ${r.supplier || '-'} · Dipesan: ${r.orderedDate || '-'}`,
          severity: 'info',
          actionLabel: 'Terima Barang',
          targetTab: 'restock',
        });
      });

    return list;
  }, [borrows, activeItems, maintenance, lowStockItems, restocks]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Dashboard Laboratorium
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ringkasan ketersediaan alat, sirkulasi praktikum, dan status pemeliharaan lab sains.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('borrow')}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Peminjaman</span>
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <PackageSearch className="w-3.5 h-3.5" />
            <span>Katalog Inventaris</span>
          </button>
        </div>
      </div>

      {/* 6 Key Performance Indicators (Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Total Jenis Barang */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-4 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Item</span>
            <Boxes className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {totalJenisBarang}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {totalQuantity.toLocaleString('id-ID')} unit fisik
          </div>
        </div>

        {/* 2. Available Items */}
        <div
          onClick={() => onNavigate('inventory', { filterCondition: 'Good' })}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-4 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Tersedia</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {totalAvailable.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Siap digunakan
          </div>
        </div>

        {/* 3. Borrowed Items */}
        <div
          onClick={() => onNavigate('borrow')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-4 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Dipinjam</span>
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
            {totalBorrowed}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Unit sedang di luar
          </div>
        </div>

        {/* 4. Maintenance Items */}
        <div
          onClick={() => onNavigate('maintenance')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-4 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Perawatan</span>
            <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
            {activeMaintenanceCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Dalam proses perbaikan
          </div>
        </div>

        {/* 5. Low Stock Alerts */}
        <div
          onClick={() => onNavigate('restock')}
          className={`border rounded-xl p-4 transition-all cursor-pointer shadow-2xs group ${
            lowStockCount > 0
              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Stok Rendah</span>
            <TrendingDown className={`w-4 h-4 ${lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono tabular-nums ${lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
            {lowStockCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Di bawah batas minimum
          </div>
        </div>

        {/* 6. Damaged / Hilang */}
        <div
          onClick={() => onNavigate('inventory', { filterCondition: lostCount > 0 && damagedCount === 0 ? 'Hilang' : 'Damaged' })}
          className={`border rounded-xl p-4 transition-all cursor-pointer shadow-2xs group ${
            damagedCount > 0 || lostCount > 0
              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Rusak / Hilang</span>
            <Flame className={`w-4 h-4 ${damagedCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold font-mono tabular-nums ${damagedCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {damagedCount}
            </span>
            {lostCount > 0 && (
              <span className="text-[11px] font-medium text-purple-700 dark:text-purple-400 font-mono">
                +{lostCount} hilang
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {lostCount > 0 ? `${damagedCount} rusak · ${lostCount} hilang` : 'Memerlukan tindakan'}
          </div>
        </div>
      </div>

      {/* Main Grid: Upcoming Return Deadlines & Priority Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Upcoming Return Deadlines & Activity Stream */}
        <div className="lg:col-span-7 space-y-6">
          {/* Upcoming Return Deadlines */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Tenggat Pengembalian Terdekat
                </h3>
              </div>
              <button
                onClick={() => onNavigate('borrow')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
              >
                <span>Kelola Semua</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {upcomingDeadlines.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  Tidak ada peminjaman aktif yang menunggu pengembalian saat ini.
                </div>
              ) : (
                upcomingDeadlines.map((record) => {
                  const isOverdue = record.status === 'Overdue' || record.expectedReturnDate < todayStr;
                  return (
                    <div
                      key={record.borrowId}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs text-slate-900 dark:text-white truncate">
                            {record.itemName}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            ×{record.quantity}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{record.borrowerName}</span>
                          <span aria-hidden="true">·</span>
                          <span>{record.purpose}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className={`text-[11px] font-mono tabular-nums ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}>
                            {record.expectedReturnDate}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {isOverdue ? 'Terlambat' : 'Batas Kembali'}
                          </div>
                        </div>

                        <button
                          onClick={() => onNavigate('borrow')}
                          className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-blue-950 dark:text-slate-200 dark:hover:text-blue-300 transition-colors cursor-pointer"
                        >
                          Proses
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Attention Items List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Item Perlu Perhatian ({needsAttentionList.length})
                </h3>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-96 overflow-y-auto">
              {needsAttentionList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  Semua inventaris dalam kondisi normal. Tidak ada tindakan mendesak.
                </div>
              ) : (
                needsAttentionList.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {item.subtitle}
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate(item.targetTab, item.extraData)}
                      className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-blue-950 dark:text-slate-200 dark:hover:text-blue-300 transition-colors cursor-pointer shrink-0"
                    >
                      {item.actionLabel}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right (5 cols): Category Distribution & Total Inventory Valuation */}
        <div className="lg:col-span-5 space-y-6">
          {/* Category Distribution */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-3 flex items-center justify-between">
              <span>Distribusi Kategori</span>
              <span className="text-[11px] font-normal text-slate-400 font-mono">
                {categoryStats.length} Kategori
              </span>
            </h3>

            <div className="space-y-3">
              {categoryStats.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {cat.name}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums text-[11px]">
                      {cat.totalQty.toLocaleString('id-ID')} unit ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(cat.percentage, 3)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Valuation Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider">Estimasi Nilai Inventaris</span>
              <Coins className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              Rp {totalEstimatedValue.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Berdasarkan {itemsWithPriceCount} dari {totalItemsCount} item yang memiliki data harga pembelian satuan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
