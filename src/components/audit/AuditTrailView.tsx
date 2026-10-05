import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { AuditLog } from '../../types/inventory';
import {
  History,
  Search,
  Filter,
  ArrowRight,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Download,
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

  const getEntityBadge = (type: AuditLog['entityType']) => {
    switch (type) {
      case 'Inventory':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-950 text-teal-300 border border-teal-800">
            Inventory
          </span>
        );
      case 'Borrow':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-950 text-indigo-300 border border-indigo-800">
            Borrow / Return
          </span>
        );
      case 'Maintenance':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-800">
            Maintenance
          </span>
        );
      case 'Restock':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-950 text-orange-300 border border-orange-800">
            Restock
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-800 text-emerald-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-white">Log Audit Trail & Histori Transaksi</h2>
            <p className="text-xs text-slate-400">
              Rekam jejak setiap perubahan stok, peminjaman, pengembalian, perbaikan, dan restock.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors self-end sm:self-center"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(['ALL', 'Inventory', 'Borrow', 'Maintenance', 'Restock'] as const).map((ent) => (
            <button
              key={ent}
              onClick={() => setSelectedEntity(ent)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedEntity === ent
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {ent === 'ALL' ? 'Semua Entitas' : ent}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari aktivitas, pelaku, atau barang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Audit List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-800">
          {filteredLogs.map((log) => (
            <div key={log.logId} className="p-4 hover:bg-slate-850/50 transition-colors space-y-1.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getEntityBadge(log.entityType)}
                  <span className="font-mono text-[11px] text-slate-400 font-bold">
                    {log.action}
                  </span>
                  {log.itemCode && (
                    <span className="font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded text-[10px] border border-emerald-800">
                      {log.itemCode}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1 text-slate-300">
                    <User className="w-3 h-3 text-slate-500" />
                    <strong>{log.actorName}</strong> ({log.actorRole})
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(log.timestamp).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>

              <p className="text-slate-200 font-medium leading-relaxed">{log.description}</p>

              {(log.previousValue || log.newValue) && (
                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center gap-2 text-[11px] text-slate-400">
                  {log.previousValue && (
                    <div className="flex-1">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">
                        Nilai Sebelumnya:
                      </span>
                      <span className="text-rose-300 font-mono">{log.previousValue}</span>
                    </div>
                  )}
                  {log.previousValue && log.newValue && (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0 hidden sm:block" />
                  )}
                  {log.newValue && (
                    <div className="flex-1">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">
                        Nilai Baru:
                      </span>
                      <span className="text-emerald-300 font-mono">{log.newValue}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-slate-300">Tidak ada log aktivitas yang cocok.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
