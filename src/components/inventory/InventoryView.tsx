import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { InventoryItem, ItemCondition, ItemStatus } from '../../types/inventory';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  FileSpreadsheet,
  Archive,
  ArchiveRestore,
  Edit,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Wrench,
  HelpCircle,
  Package,
  Layers,
  MapPin,
  Clock,
  Sparkles,
  SlidersHorizontal,
  X,
  Building,
  Tag,
} from 'lucide-react';

interface InventoryViewProps {
  initialConditionFilter?: ItemCondition | string;
  initialStockFilter?: string;
  onOpenBorrowForItem?: (item: InventoryItem) => void;
  onOpenMaintenanceForItem?: (item: InventoryItem) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  initialConditionFilter,
  initialStockFilter,
  onOpenBorrowForItem,
  onOpenMaintenanceForItem,
}) => {
  const {
    items,
    isStaff,
    categories,
    locations,
    addCategory,
    addLocation,
    getItemStockInfo,
    addItem,
    updateItem,
    archiveItem,
    unarchiveItem,
    exportInventoryCSV,
  } = useInventory();

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCondition, setSelectedCondition] = useState<string>(
    initialConditionFilter || 'ALL'
  );
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>(
    initialStockFilter || 'ALL'
  );
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'name' | 'quantity' | 'purchaseDate' | 'condition' | 'unitPurchasePrice'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // New Category / Location modal quick inputs
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');

  // Form State for Add / Edit
  const [formData, setFormData] = useState<{
    itemCode: string;
    name: string;
    category: string;
    customCategoryText: string;
    quantity: number;
    unit: string;
    condition: ItemCondition;
    location: string;
    customLocationText: string;
    minimumStock: number;
    supplier: string;
    purchaseDate: string;
    unitPurchasePrice: string;
    targetStock: string;
    notes: string;
  }>({
    itemCode: '',
    name: '',
    category: categories[0] || 'Kimia',
    customCategoryText: '',
    quantity: 1,
    unit: 'Unit',
    condition: 'Good',
    location: locations[0] || 'Lab Science Lemari Kimia',
    customLocationText: '',
    minimumStock: 2,
    supplier: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    unitPurchasePrice: '',
    targetStock: '',
    notes: '',
  });

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Archived filter
        if (showArchived) {
          if (item.status !== 'Archived') return false;
        } else {
          if (item.status === 'Archived') return false;
        }

        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCode = item.itemCode.toLowerCase().includes(q);
          const matchName = item.name.toLowerCase().includes(q);
          const matchLoc = item.location.toLowerCase().includes(q);
          const matchSupp = item.supplier?.toLowerCase().includes(q);
          const matchNotes = item.notes?.toLowerCase().includes(q);
          if (!matchCode && !matchName && !matchLoc && !matchSupp && !matchNotes) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
          return false;
        }

        // Condition filter
        if (selectedCondition !== 'ALL' && item.condition !== selectedCondition) {
          return false;
        }

        // Location filter
        if (selectedLocation !== 'ALL' && item.location !== selectedLocation) {
          return false;
        }

        // Stock status filter
        if (stockStatusFilter !== 'ALL') {
          const stock = getItemStockInfo(item.itemId);
          if (stockStatusFilter === 'LOW' && !stock.isLowStock) return false;
          if (stockStatusFilter === 'OUT_OF_STOCK' && stock.availableQuantity > 0) return false;
          if (stockStatusFilter === 'NORMAL' && (stock.isLowStock || stock.availableQuantity === 0)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'unitPurchasePrice') {
          valA = a.unitPurchasePrice || 0;
          valB = b.unitPurchasePrice || 0;
        }

        if (valA === undefined) valA = '';
        if (valB === undefined) valB = '';

        if (typeof valA === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [
    items,
    showArchived,
    searchQuery,
    selectedCategory,
    selectedCondition,
    selectedLocation,
    stockStatusFilter,
    sortField,
    sortOrder,
    getItemStockInfo,
  ]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      itemCode: `LAB-${categories[0]?.substring(0, 3).toUpperCase() || 'SCI'}-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      category: categories[0] || 'Kimia',
      customCategoryText: '',
      quantity: 1,
      unit: 'Unit',
      condition: 'Good',
      location: locations[0] || "Tr. Menur's class",
      customLocationText: '',
      minimumStock: 2,
      supplier: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      unitPurchasePrice: '',
      targetStock: '',
      notes: '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    const isCategoryKnown = categories.includes(item.category);
    const isLocationKnown = locations.includes(item.location);

    setFormData({
      itemCode: item.itemCode,
      name: item.name,
      category: isCategoryKnown ? item.category : '__CUSTOM__',
      customCategoryText: isCategoryKnown ? '' : item.category,
      quantity: item.quantity,
      unit: item.unit,
      condition: item.condition,
      location: isLocationKnown ? item.location : '__CUSTOM__',
      customLocationText: isLocationKnown ? '' : item.location,
      minimumStock: item.minimumStock,
      supplier: item.supplier || '',
      purchaseDate: item.purchaseDate || '',
      unitPurchasePrice: item.unitPurchasePrice ? String(item.unitPurchasePrice) : '',
      targetStock: item.targetStock ? String(item.targetStock) : '',
      notes: item.notes || '',
    });
    setFormError(null);
  };

  // Save Add or Edit
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Resolve category
    let finalCategory = formData.category;
    if (formData.category === '__CUSTOM__') {
      if (!formData.customCategoryText.trim()) {
        setFormError('Silakan masukkan nama kategori kustom.');
        return;
      }
      finalCategory = formData.customCategoryText.trim();
      addCategory(finalCategory);
    }

    // Resolve location
    let finalLocation = formData.location;
    if (formData.location === '__CUSTOM__') {
      if (!formData.customLocationText.trim()) {
        setFormError('Silakan masukkan nama lokasi kustom.');
        return;
      }
      finalLocation = formData.customLocationText.trim();
      addLocation(finalLocation);
    }

    const priceNum = formData.unitPurchasePrice ? parseFloat(formData.unitPurchasePrice) : undefined;
    const targetNum = formData.targetStock ? parseInt(formData.targetStock, 10) : undefined;

    if (editingItem) {
      const res = updateItem(editingItem.itemId, {
        itemCode: formData.itemCode,
        name: formData.name,
        category: finalCategory,
        quantity: Number(formData.quantity),
        unit: formData.unit,
        condition: formData.condition,
        location: finalLocation,
        minimumStock: Number(formData.minimumStock),
        supplier: formData.supplier,
        purchaseDate: formData.purchaseDate,
        unitPurchasePrice: priceNum,
        targetStock: targetNum,
        notes: formData.notes,
      });

      if (!res.success) {
        setFormError(res.error || 'Gagal mengubah data barang.');
        return;
      }
      setEditingItem(null);
    } else {
      const res = addItem({
        itemCode: formData.itemCode,
        name: formData.name,
        category: finalCategory,
        quantity: Number(formData.quantity),
        unit: formData.unit,
        condition: formData.condition,
        location: finalLocation,
        minimumStock: Number(formData.minimumStock),
        supplier: formData.supplier,
        purchaseDate: formData.purchaseDate,
        unitPurchasePrice: priceNum,
        targetStock: targetNum,
        notes: formData.notes,
        status: 'Active',
      });

      if (!res.success) {
        setFormError(res.error || 'Gagal menambahkan barang.');
        return;
      }
      setIsAddModalOpen(false);
    }
  };

  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      addCategory(newCategoryName.trim());
      setSelectedCategory(newCategoryName.trim());
      setNewCategoryName('');
      setShowAddCategoryModal(false);
    }
  };

  const handleAddNewLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLocationName.trim()) {
      addLocation(newLocationName.trim());
      setSelectedLocation(newLocationName.trim());
      setNewLocationName('');
      setShowAddLocationModal(false);
    }
  };

  const getConditionBadge = (condition: ItemCondition) => {
    switch (condition) {
      case 'Good':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3" /> Good
          </span>
        );
      case 'Fair':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-400 border border-blue-800/60">
            <CheckCircle2 className="w-3 h-3" /> Fair
          </span>
        );
      case 'Damaged':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/60">
            <Flame className="w-3 h-3" /> Damaged
          </span>
        );
      case 'Under Maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/60">
            <Wrench className="w-3 h-3" /> Under Maintenance
          </span>
        );
      case 'Hilang':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/60">
            <HelpCircle className="w-3 h-3 text-purple-400" /> Hilang
          </span>
        );
      default:
        return <span>{condition}</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🔬 Inventaris Alat & Bahan Laboratorium</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {filteredItems.length} Item
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Data terperinci seluruh aset, ketersediaan fisik, lokasi penyimpanan, dan batas minimum stok.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportInventoryCSV}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>

          {isStaff ? (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Barang</span>
            </button>
          ) : (
            <div className="text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              Mode Guru: Hak Akses Baca & Peminjaman
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, ID kode barang, lokasi, supplier, atau catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Clear Filter */}
          {(selectedCategory !== 'ALL' ||
            selectedCondition !== 'ALL' ||
            selectedLocation !== 'ALL' ||
            stockStatusFilter !== 'ALL' ||
            showArchived) && (
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedCondition('ALL');
                setSelectedLocation('ALL');
                setStockStatusFilter('ALL');
                setShowArchived(false);
                setSearchQuery('');
              }}
              className="px-3 py-2 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/60 rounded-xl border border-rose-800/60 transition-colors whitespace-nowrap"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Dropdowns Filter */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Kategori</label>
              {isStaff && (
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(true)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                  title="Tambah Kategori Kustom"
                >
                  <Plus className="w-3 h-3" /> Tambah
                </button>
              )}
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Condition</label>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="ALL">Semua Kondisi</option>
              <option value="Good">Good (Bagus)</option>
              <option value="Fair">Fair (Cukup)</option>
              <option value="Damaged">Damaged (Rusak)</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Hilang">Hilang (Barang Hilang)</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Location</label>
              {isStaff && (
                <button
                  type="button"
                  onClick={() => setShowAddLocationModal(true)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                  title="Tambah Lokasi Kustom"
                >
                  <Plus className="w-3 h-3" /> Tambah
                </button>
              )}
            </div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="ALL">Semua Lokasi</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Status Stok</label>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="ALL">Semua Stok</option>
              <option value="LOW">Low Stock (≤ Minimum)</option>
              <option value="OUT_OF_STOCK">Habis / Tidak Tersedia</option>
              <option value="NORMAL">Normal / Aman</option>
            </select>
          </div>

          {/* Archive Status Toggle */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Arsip</label>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`w-full text-xs font-semibold py-1.5 px-3 rounded-lg border flex items-center justify-center gap-1.5 transition-colors ${
                showArchived
                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{showArchived ? 'Item Diarsipkan' : 'Item Aktif'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              <tr>
                <th className="px-4 py-3.5">
                  <button
                    onClick={() => {
                      if (sortField === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else {
                        setSortField('name');
                        setSortOrder('asc');
                      }
                    }}
                    className="flex items-center gap-1 text-slate-300 hover:text-white"
                  >
                    <span>ID & Nama Barang</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </button>
                </th>
                <th className="px-3 py-3.5">Kategori</th>
                <th className="px-3 py-3.5">
                  <button
                    onClick={() => {
                      if (sortField === 'quantity') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else {
                        setSortField('quantity');
                        setSortOrder('desc');
                      }
                    }}
                    className="flex items-center gap-1 text-slate-300 hover:text-white"
                  >
                    <span>Quantity</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </button>
                </th>
                <th className="px-3 py-3.5">Available</th>
                <th className="px-3 py-3.5">Condition</th>
                <th className="px-3 py-3.5">Location</th>
                <th className="px-3 py-3.5">Minimum Stock</th>
                <th className="px-3 py-3.5">Supplier</th>
                <th className="px-3 py-3.5">
                  <button
                    onClick={() => {
                      if (sortField === 'unitPurchasePrice') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else {
                        setSortField('unitPurchasePrice');
                        setSortOrder('desc');
                      }
                    }}
                    className="flex items-center gap-1 text-slate-300 hover:text-white"
                  >
                    <span>Harga Beli (Rp)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </button>
                </th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/70">
              {filteredItems.map((item) => {
                const stock = getItemStockInfo(item.itemId);
                return (
                  <tr
                    key={item.itemId}
                    className="hover:bg-slate-850/50 transition-colors group cursor-pointer"
                    onClick={() => setDetailItem(item)}
                  >
                    {/* ID & Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-mono text-[11px] font-bold text-emerald-400">
                          {item.itemCode}
                        </span>
                        <span className="font-semibold text-slate-100 text-sm">{item.name}</span>
                        {item.notes && (
                          <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {item.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {item.category}
                      </span>
                    </td>

                    {/* Total Quantity */}
                    <td className="px-3 py-3.5">
                      <div className="font-semibold text-white text-sm">
                        {item.quantity}{' '}
                        <span className="text-[11px] font-normal text-slate-400">{item.unit}</span>
                      </div>
                      {stock.isLowStock && (
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> Low Stock
                        </span>
                      )}
                    </td>

                    {/* Available Quantity */}
                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-block font-bold text-sm px-2 py-0.5 rounded ${
                          stock.availableQuantity > 0
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {stock.availableQuantity} {item.unit}
                      </span>
                      {stock.borrowedQuantity > 0 && (
                        <div className="text-[10px] text-indigo-400 mt-0.5">
                          {stock.borrowedQuantity} dipinjam
                        </div>
                      )}
                    </td>

                    {/* Condition */}
                    <td className="px-3 py-3.5">{getConditionBadge(item.condition)}</td>

                    {/* Location */}
                    <td className="px-3 py-3.5">
                      <span className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{item.location}</span>
                      </span>
                    </td>

                    {/* Minimum Stock */}
                    <td className="px-3 py-3.5 text-slate-400 font-mono">
                      {item.minimumStock} {item.unit}
                    </td>

                    {/* Supplier */}
                    <td className="px-3 py-3.5 text-slate-400">
                      {item.supplier ? (
                        <span className="truncate block max-w-[120px]" title={item.supplier}>
                          {item.supplier}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Purchase Price */}
                    <td className="px-3 py-3.5 font-mono text-slate-300">
                      {item.unitPurchasePrice !== undefined && item.unitPurchasePrice > 0 ? (
                        <span>Rp {item.unitPurchasePrice.toLocaleString('id-ID')}</span>
                      ) : (
                        <span className="text-slate-500 italic">Belum tercatat</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      className="px-4 py-3.5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDetailItem(item)}
                          title="Lihat Detail Barang"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isStaff && (
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Data Barang"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {isStaff && (
                          <button
                            onClick={() => {
                              if (item.status === 'Active') archiveItem(item.itemId);
                              else unarchiveItem(item.itemId);
                            }}
                            title={item.status === 'Active' ? 'Arsipkan Barang' : 'Aktifkan Kembali'}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                          >
                            {item.status === 'Active' ? (
                              <Archive className="w-4 h-4" />
                            ) : (
                              <ArchiveRestore className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-300">Tidak ada barang yang cocok dengan filter.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Coba sesuaikan kata kunci pencarian atau reset filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      {(isAddModalOpen || editingItem) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-white">
                {editingItem ? 'Edit Data Barang Inventaris' : 'Tambah Barang Inventaris Baru'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-semibold">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ID Barang / Code */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    ID / Kode Barang <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.itemCode}
                    onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                    placeholder="Contoh: LAB-KIM-001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Nama Barang */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nama Barang <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Mikroskop Binokuler Olympus CX23"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {/* Kategori */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Kategori <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Kategori Kustom Baru...</option>
                  </select>

                  {formData.category === '__CUSTOM__' && (
                    <input
                      type="text"
                      required
                      value={formData.customCategoryText}
                      onChange={(e) => setFormData({ ...formData, customCategoryText: e.target.value })}
                      placeholder="Ketik nama kategori baru..."
                      className="mt-2 w-full bg-slate-950 border border-emerald-700 rounded-xl px-3 py-1.5 text-xs text-emerald-300 focus:outline-hidden"
                    />
                  )}
                </div>

                {/* Satuan / Unit */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Satuan (Unit) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Unit / Pcs / Set / Botol / Kotak"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Quantity Total <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {/* Minimum Stock */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Minimum Stock <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.minimumStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minimumStock: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {/* Condition */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Condition <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value as ItemCondition })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="Good">Good (Bagus / Normal)</option>
                    <option value="Fair">Fair (Cukup / Layak Pakai)</option>
                    <option value="Damaged">Damaged (Rusak)</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Hilang">Hilang (Barang Hilang / Belum Ditemukan)</option>
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Location <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Lokasi Kustom Baru...</option>
                  </select>

                  {formData.location === '__CUSTOM__' && (
                    <input
                      type="text"
                      required
                      value={formData.customLocationText}
                      onChange={(e) => setFormData({ ...formData, customLocationText: e.target.value })}
                      placeholder="Ketik nama lokasi penyimpanan baru..."
                      className="mt-2 w-full bg-slate-950 border border-emerald-700 rounded-xl px-3 py-1.5 text-xs text-emerald-300 focus:outline-hidden"
                    />
                  )}
                </div>

                {/* Supplier */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Nama distributor / PT supplier"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {/* Purchase Date */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {/* Purchase Price (in IDR) */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Purchase Price / Harga Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.unitPurchasePrice}
                    onChange={(e) => setFormData({ ...formData, unitPurchasePrice: e.target.value })}
                    placeholder="Contoh: 150000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {/* Target Stock */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Target Stock Ideal (Opsional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.targetStock}
                    onChange={(e) => setFormData({ ...formData, targetStock: e.target.value })}
                    placeholder="Batas stok ideal saat restock"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Notes / Catatan</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Instruksi penyimpanan, aturan keselamatan, atau spesifikasi detail..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/30 transition-all"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Tambahkan ke Inventaris'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Modal: Tambah Kategori Baru */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-base text-white mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              <span>Tambah Kategori Kustom Baru</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Tambahkan kategori baru untuk mempermudah pengelompokan alat & bahan di laboratorium.
            </p>
            <form onSubmit={handleAddNewCategory} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nama kategori, misal: Robotika, Mikrobiologi..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
              />
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Modal: Tambah Lokasi Baru */}
      {showAddLocationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-base text-white mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Tambah Lokasi Penyimpanan Baru</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Tambahkan ruangan, kelas guru, atau kontainer baru sebagai lokasi resmi penyimpanan.
            </p>
            <form onSubmit={handleAddNewLocation} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="Nama lokasi, misal: Ruang Persiapan Lab 2, Meja Guru..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
              />
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddLocationModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
                >
                  Simpan Lokasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Detail Drawer / Modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {detailItem.itemCode}
                </span>
                <h3 className="font-bold text-lg text-white mt-0.5">{detailItem.name}</h3>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  {detailItem.category}
                </span>
              </div>

              <button
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Stock Breakdown Cards */}
            {(() => {
              const stock = getItemStockInfo(detailItem.itemId);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Total Fisik
                    </span>
                    <span className="text-sm font-bold text-white">
                      {detailItem.quantity} {detailItem.unit}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-emerald-400 uppercase font-semibold block">
                      Available
                    </span>
                    <span className="text-sm font-bold text-emerald-400">
                      {stock.availableQuantity} {detailItem.unit}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-indigo-400 uppercase font-semibold block">
                      Dipinjam
                    </span>
                    <span className="text-sm font-bold text-indigo-300">
                      {stock.borrowedQuantity} {detailItem.unit}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-rose-400 uppercase font-semibold block">
                      Rusak/Maint
                    </span>
                    <span className="text-sm font-bold text-rose-400">
                      {stock.damagedQuantity + stock.maintenanceQuantity} {detailItem.unit}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-purple-400 uppercase font-semibold block">
                      Hilang
                    </span>
                    <span className="text-sm font-bold text-purple-300">
                      {stock.lostQuantity} {detailItem.unit}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Detailed Spec Sheet */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-850/50 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[11px]">Condition</span>
                <div className="mt-1">{getConditionBadge(detailItem.condition)}</div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Location</span>
                <span className="font-semibold text-slate-200 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {detailItem.location}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Minimum Stock</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">
                  {detailItem.minimumStock} {detailItem.unit}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Target Stock</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">
                  {detailItem.targetStock ? `${detailItem.targetStock} ${detailItem.unit}` : 'Belum diatur'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Supplier</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">
                  {detailItem.supplier || 'Tidak tercatat'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Purchase Date</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">
                  {detailItem.purchaseDate || 'Tidak tercatat'}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-slate-400 block text-[11px]">Harga Pembelian Satuan</span>
                <span className="font-semibold text-emerald-400 mt-0.5 text-sm block">
                  {detailItem.unitPurchasePrice !== undefined && detailItem.unitPurchasePrice > 0
                    ? `Rp ${detailItem.unitPurchasePrice.toLocaleString('id-ID')} / ${detailItem.unit}`
                    : 'Belum ada data harga'}
                </span>
              </div>

              {detailItem.notes && (
                <div className="col-span-2 pt-2 border-t border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Catatan / Instruksi Lab</span>
                  <p className="text-slate-300 mt-1 leading-relaxed bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    {detailItem.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {isStaff && (
                  <button
                    onClick={() => {
                      const itm = detailItem;
                      setDetailItem(null);
                      handleOpenEdit(itm);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    Edit Data
                  </button>
                )}
              </div>

              <button
                onClick={() => setDetailItem(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
