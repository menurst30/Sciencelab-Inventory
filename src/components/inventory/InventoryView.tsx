import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { InventoryItem, ItemCondition, ItemStatus } from '../../types/inventory';
import {
  Search,
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
  MapPin,
  X,
  Tag,
  ArrowLeftRight,
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
        if (showArchived) {
          if (item.status !== 'Archived') return false;
        } else {
          if (item.status === 'Archived') return false;
        }

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

        if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
          return false;
        }

        if (selectedCondition !== 'ALL' && item.condition !== selectedCondition) {
          return false;
        }

        if (selectedLocation !== 'ALL' && item.location !== selectedLocation) {
          return false;
        }

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

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    let finalCategory = formData.category;
    if (formData.category === '__CUSTOM__') {
      if (!formData.customCategoryText.trim()) {
        setFormError('Silakan masukkan nama kategori baru.');
        return;
      }
      finalCategory = formData.customCategoryText.trim();
      addCategory(finalCategory);
    }

    let finalLocation = formData.location;
    if (formData.location === '__CUSTOM__') {
      if (!formData.customLocationText.trim()) {
        setFormError('Silakan masukkan nama lokasi baru.');
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

  const renderCondition = (condition: ItemCondition) => {
    switch (condition) {
      case 'Good':
        return (
          <span className="text-emerald-700 dark:text-emerald-400 font-medium text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Good
          </span>
        );
      case 'Fair':
        return (
          <span className="text-blue-700 dark:text-blue-400 font-medium text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Fair
          </span>
        );
      case 'Damaged':
        return (
          <span className="text-rose-700 dark:text-rose-400 font-medium text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Damaged
          </span>
        );
      case 'Under Maintenance':
        return (
          <span className="text-amber-700 dark:text-amber-400 font-medium text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Maintenance
          </span>
        );
      case 'Hilang':
        return (
          <span className="text-purple-700 dark:text-purple-400 font-medium text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Hilang
          </span>
        );
      default:
        return <span>{condition}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Inventaris Laboratorium
            </h1>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              {filteredItems.length} item
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar peralatan, bahan kimia, perlengkapan fisika, biologi, household, dan urban gardening.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportInventoryCSV}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Ekspor CSV</span>
          </button>

          {isStaff && (
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Barang</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kode, nama barang, lokasi, supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8.5 pr-8 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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
              className="px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/60 transition-colors whitespace-nowrap cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1 text-xs">
          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Kategori</span>
              {isStaff && (
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(true)}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  + Baru
                </button>
              )}
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block mb-0.5">Kondisi</span>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
            >
              <option value="ALL">Semua Kondisi</option>
              <option value="Good">Good (Bagus)</option>
              <option value="Fair">Fair (Cukup)</option>
              <option value="Damaged">Damaged (Rusak)</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Hilang">Hilang</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Lokasi</span>
              {isStaff && (
                <button
                  type="button"
                  onClick={() => setShowAddLocationModal(true)}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  + Baru
                </button>
              )}
            </div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
            >
              <option value="ALL">Semua Lokasi</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Stock Status */}
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block mb-0.5">Status Stok</span>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
            >
              <option value="ALL">Semua Stok</option>
              <option value="LOW">Low Stock (≤ Min)</option>
              <option value="OUT_OF_STOCK">Habis (0 Available)</option>
              <option value="NORMAL">Normal</option>
            </select>
          </div>

          {/* Archive Status Toggle */}
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block mb-0.5">Status Arsip</span>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`w-full text-xs font-medium py-1 px-2.5 rounded-lg border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                showArchived
                  ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{showArchived ? 'Diarsipkan' : 'Aktif'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5">
                  <button
                    onClick={() => {
                      if (sortField === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else {
                        setSortField('name');
                        setSortOrder('asc');
                      }
                    }}
                    className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>Item & Kode</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="px-3 py-2.5">Kategori</th>
                <th className="px-3 py-2.5 text-right">
                  <button
                    onClick={() => {
                      if (sortField === 'quantity') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else {
                        setSortField('quantity');
                        setSortOrder('desc');
                      }
                    }}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                  >
                    <span>Total</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="px-3 py-2.5 text-right">Tersedia</th>
                <th className="px-3 py-2.5">Kondisi</th>
                <th className="px-3 py-2.5">Lokasi</th>
                <th className="px-3 py-2.5 text-right">Min</th>
                <th className="px-3 py-2.5">Supplier</th>
                <th className="px-3 py-2.5 text-right">
                  <button
                    onClick={() => {
                      if (sortField === 'unitPurchasePrice') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else {
                        setSortField('unitPurchasePrice');
                        setSortOrder('desc');
                      }
                    }}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                  >
                    <span>Harga (Rp)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="px-3.5 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredItems.map((item) => {
                const stock = getItemStockInfo(item.itemId);
                return (
                  <tr
                    key={item.itemId}
                    onClick={() => setDetailItem(item)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors cursor-pointer group"
                  >
                    {/* Item Name & Code */}
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium text-slate-900 dark:text-white text-xs">
                        {item.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        {item.itemCode}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      <span>{item.category}</span>
                    </td>

                    {/* Total Quantity */}
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                      <span>{item.quantity}</span>{' '}
                      <span className="text-[10px] text-slate-400">{item.unit}</span>
                      {stock.isLowStock && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-sans">
                          Low Stock
                        </div>
                      )}
                    </td>

                    {/* Available Quantity */}
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      <span className={stock.availableQuantity > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                        {stock.availableQuantity}
                      </span>{' '}
                      <span className="text-[10px] text-slate-400">{item.unit}</span>
                      {stock.borrowedQuantity > 0 && (
                        <div className="text-[10px] text-blue-600 dark:text-blue-400">
                          {stock.borrowedQuantity} dipinjam
                        </div>
                      )}
                    </td>

                    {/* Condition */}
                    <td className="px-3 py-2.5">
                      {renderCondition(item.condition)}
                    </td>

                    {/* Location */}
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                      <span className="truncate block max-w-[130px]" title={item.location}>
                        {item.location}
                      </span>
                    </td>

                    {/* Minimum Stock */}
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {item.minimumStock}
                    </td>

                    {/* Supplier */}
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
                      <span className="truncate block max-w-[110px]" title={item.supplier || '-'}>
                        {item.supplier || '-'}
                      </span>
                    </td>

                    {/* Unit Purchase Price */}
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {item.unitPurchasePrice !== undefined && item.unitPurchasePrice > 0 ? (
                        <span>{item.unitPurchasePrice.toLocaleString('id-ID')}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td
                      className="px-3.5 py-2.5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailItem(item)}
                          title="Lihat Detail"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {isStaff && (
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Data"
                            className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isStaff && (
                          <button
                            onClick={() => {
                              if (item.status === 'Active') archiveItem(item.itemId);
                              else unarchiveItem(item.itemId);
                            }}
                            title={item.status === 'Active' ? 'Arsipkan' : 'Aktifkan'}
                            className="p-1 rounded text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            {item.status === 'Active' ? (
                              <Archive className="w-3.5 h-3.5" />
                            ) : (
                              <ArchiveRestore className="w-3.5 h-3.5" />
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
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                    <Package className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                      Tidak ada barang yang cocok dengan filter.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Coba ganti kata kunci atau reset filter pencarian.
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
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                {editingItem ? 'Edit Data Barang' : 'Tambah Barang Baru'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-900/60 dark:text-rose-200 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {/* Kode Barang */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    ID / Kode Barang <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.itemCode}
                    onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                    placeholder="Contoh: LAB-KIM-001"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Nama Barang */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Nama Barang <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Mikroskop Binokuler"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Kategori */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Kategori <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__CUSTOM__">+ Kategori Kustom Baru...</option>
                  </select>
                  {formData.category === '__CUSTOM__' && (
                    <input
                      type="text"
                      required
                      value={formData.customCategoryText}
                      onChange={(e) => setFormData({ ...formData, customCategoryText: e.target.value })}
                      placeholder="Nama kategori baru..."
                      className="mt-1.5 w-full bg-slate-50 dark:bg-slate-950 border border-blue-400 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                    />
                  )}
                </div>

                {/* Satuan */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Satuan (Unit) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Unit / Pcs / Botol / Set"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Total Quantity */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Quantity Total <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Minimum Stock */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Batas Minimum Stok <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.minimumStock}
                    onChange={(e) => setFormData({ ...formData, minimumStock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Condition */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Kondisi Alat <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value as ItemCondition })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="Good">Good (Bagus / Normal)</option>
                    <option value="Fair">Fair (Cukup / Layak)</option>
                    <option value="Damaged">Damaged (Rusak)</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Hilang">Hilang (Barang Hilang)</option>
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Lokasi Penyimpanan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  >
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                    <option value="__CUSTOM__">+ Lokasi Kustom Baru...</option>
                  </select>
                  {formData.location === '__CUSTOM__' && (
                    <input
                      type="text"
                      required
                      value={formData.customLocationText}
                      onChange={(e) => setFormData({ ...formData, customLocationText: e.target.value })}
                      placeholder="Nama lokasi baru..."
                      className="mt-1.5 w-full bg-slate-50 dark:bg-slate-950 border border-blue-400 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                    />
                  )}
                </div>

                {/* Supplier */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Nama distributor / toko"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Purchase Date */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Tanggal Pembelian</label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Unit Purchase Price */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Harga Pembelian Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.unitPurchasePrice}
                    onChange={(e) => setFormData({ ...formData, unitPurchasePrice: e.target.value })}
                    placeholder="Contoh: 150000"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Target Stock */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Target Stok Ideal (Opsional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.targetStock}
                    onChange={(e) => setFormData({ ...formData, targetStock: e.target.value })}
                    placeholder="Kebutuhan ideal untuk praktikum"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1 text-xs">Catatan & Keterangan</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Instruksi khusus, batas kadaluarsa, atau catatan keamanan..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Tambahkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Modal: Tambah Kategori Baru */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Tambah Kategori Kustom</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3.5">
              Kategori baru akan ditambahkan ke daftar kategori lab sekolah.
            </p>
            <form onSubmit={handleAddNewCategory} className="space-y-3.5">
              <input
                type="text"
                required
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Contoh: Robotika, Mikrobiologi..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg cursor-pointer shadow-xs"
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
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Tambah Lokasi Penyimpanan</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3.5">
              Tambahkan kelas guru atau kontainer penyimpanan baru.
            </p>
            <form onSubmit={handleAddNewLocation} className="space-y-3.5">
              <input
                type="text"
                required
                autoFocus
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="Contoh: Kontainer Science 4..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddLocationModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg cursor-pointer shadow-xs"
                >
                  Simpan Lokasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="font-mono text-[11px] font-medium text-blue-600 dark:text-blue-400">
                  {detailItem.itemCode}
                </span>
                <h3 className="font-semibold text-base text-slate-900 dark:text-white mt-0.5">
                  {detailItem.name}
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Kategori: {detailItem.category}
                </div>
              </div>

              <button
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Stock Breakdown Cards */}
            {(() => {
              const stock = getItemStockInfo(detailItem.itemId);
              return (
                <div className="grid grid-cols-5 gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Total</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                      {detailItem.quantity}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-medium block">Tersedia</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                      {stock.availableQuantity}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-medium block">Dipinjam</span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                      {stock.borrowedQuantity}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-medium block">Rusak</span>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                      {stock.damagedQuantity + stock.maintenanceQuantity}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-medium block">Hilang</span>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
                      {stock.lostQuantity}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Spec Sheet */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Kondisi</span>
                <div className="mt-0.5">{renderCondition(detailItem.condition)}</div>
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Lokasi</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                  {detailItem.location}
                </span>
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Batas Minimum</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {detailItem.minimumStock} {detailItem.unit}
                </span>
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Target Ideal</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {detailItem.targetStock ? `${detailItem.targetStock} ${detailItem.unit}` : '-'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Supplier</span>
                <span className="text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                  {detailItem.supplier || '-'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Tgl Pembelian</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {detailItem.purchaseDate || '-'}
                </span>
              </div>

              <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Harga Beli Satuan</span>
                <span className="font-mono font-medium text-blue-600 dark:text-blue-400 mt-0.5 block">
                  {detailItem.unitPurchasePrice !== undefined && detailItem.unitPurchasePrice > 0
                    ? `Rp ${detailItem.unitPurchasePrice.toLocaleString('id-ID')} / ${detailItem.unit}`
                    : 'Belum tercatat'}
                </span>
              </div>

              {detailItem.notes && (
                <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Catatan</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5 text-xs leading-normal">
                    {detailItem.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                {isStaff && (
                  <button
                    onClick={() => {
                      const itm = detailItem;
                      setDetailItem(null);
                      handleOpenEdit(itm);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    Edit Data
                  </button>
                )}
                <button
                  onClick={() => {
                    const itm = detailItem;
                    setDetailItem(null);
                    if (onOpenBorrowForItem) onOpenBorrowForItem(itm);
                  }}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>Pinjamkan Alat</span>
                </button>
              </div>

              <button
                onClick={() => setDetailItem(null)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 rounded-lg text-xs font-medium transition-colors cursor-pointer"
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
