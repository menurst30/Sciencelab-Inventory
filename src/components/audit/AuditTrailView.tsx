import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { AuditLog } from '../../types/inventory';
import {
  History,
  Search,
  ArrowRight,
  Clock,
  User,
  X,
} from 'lucide-react';

interface AuditTrailViewProps {
  onClose?: () => void;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ onClose }) => {
  const { auditLogs } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (selectedEntity !== 'ALL' && log.entityType !== selectedEntity) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = log.description.toLowerCase().includes(q);
        const matchActor = log.actorName.toLowerCase().includes(q);
        const matchCode = log.itemCode?.toLowerCase().includes(q);
        const matchAction = log.action.toLowerCase().includes(q);
        if (!matchDesc && !matchActor && !matchCode && !matchAction) return false;
      }
      return true;
    });
  }, [auditLogs, selectedEntity, searchQuery]);

  const renderEntityBadge = (type: AuditLog['entityType']) => {
    switch (type) {
      case 'Inventory':
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Inventory
          </span>
        );
      case 'Borrow':
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Borrow / Return
          </span>
        );
      case 'Maintenance':
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Maintenance
          </span>
        );
      case 'Restock':
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            Restock
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-base text-slate-900 dark:text-white">
              Log Audit Trail & Riwayat Aktivitas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pencatatan riwayat setiap aksi inventaris, peminjaman, perbaikan, dan restock.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors self-end sm:self-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl shadow-2xs flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          {(['ALL', 'Inventory', 'Borrow', 'Maintenance', 'Restock'] as const).map((ent) => (
            <button
              key={ent}
              onClick={() => setSelectedEntity(ent)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedEntity === ent
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {ent === 'ALL' ? 'Semua' : ent}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari aktivitas, pelaku, atau barang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-7.5 pr-3 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </div>

      {/* Audit List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredLogs.map((log) => (
            <div key={log.logId} className="p-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors space-y-1.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {renderEntityBadge(log.entityType)}
                  <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                    {log.action}
                  </span>
                  {log.itemCode && (
                    <span className="font-mono text-slate-500 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                      {log.itemCode}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>{log.actorName}</span>
                    <span className="text-slate-400">({log.actorRole})</span>
                  </span>
                  <span className="flex items-center gap-1 font-mono tabular-nums text-slate-400">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {new Date(log.timestamp).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>

              <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-normal">{log.description}</p>

              {(log.previousValue || log.newValue) && (
                <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-850 flex flex-col sm:flex-row sm:items-center gap-2 text-[11px] text-slate-500 font-mono">
                  {log.previousValue && (
                    <div className="flex-1">
                      <span className="text-slate-400 block text-[9px] uppercase font-semibold">Sebelumnya:</span>
                      <span className="text-slate-700 dark:text-slate-300">{log.previousValue}</span>
                    </div>
                  )}
                  {log.previousValue && log.newValue && (
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0 hidden sm:block" />
                  )}
                  {log.newValue && (
                    <div className="flex-1">
                      <span className="text-slate-400 block text-[9px] uppercase font-semibold">Menjadi:</span>
                      <span className="text-blue-600 dark:text-blue-400">{log.newValue}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <History className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                Tidak ada log aktivitas yang cocok dengan pencarian.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
