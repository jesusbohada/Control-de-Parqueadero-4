import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Calendar, 
  Filter, 
  RefreshCw, 
  Download, 
  FileSpreadsheet, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Car, 
  DollarSign, 
  Sliders, 
  Users, 
  Database, 
  Clock, 
  User, 
  Terminal, 
  Eye, 
  Copy, 
  Check, 
  Activity, 
  FileCode, 
  Layers, 
  Info,
  ArrowUpDown,
  Tag,
  AlertCircle
} from 'lucide-react';
import { dbGetAuditLogs } from '../db/terminalDatabase';
import { AuditLogEntry } from '../types';

interface AuditHistoryProps {
  isDarkMode?: boolean;
  terminalId?: string;
  onRefreshStats?: () => void;
}

export const AuditHistory: React.FC<AuditHistoryProps> = ({
  isDarkMode = true,
  terminalId,
  onRefreshStats
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL');
  const [operatorFilter, setOperatorFilter] = useState<string>('ALL');
  const [dateRangePreset, setDateRangePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);

  // Fetch Logs Function
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const records = await dbGetAuditLogs();
      if (Array.isArray(records)) {
        setLogs(records);
      }
    } catch (err) {
      console.warn('[AuditHistory] Error consultando logs de auditoría:', err);
    } finally {
      setLoading(false);
      if (onRefreshStats) onRefreshStats();
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [terminalId]);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Handle Date Range Presets
  const handlePresetChange = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom') => {
    setDateRangePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'week') {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      setStartDate(w.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const m = new Date();
      m.setDate(m.getDate() - 30);
      setStartDate(m.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
    setCurrentPage(1);
  };

  // Distinct Operators for Filter
  const operatorsList = useMemo(() => {
    const ops = new Set<string>();
    logs.forEach(l => {
      if (l.operator && l.operator.trim()) ops.add(l.operator.trim());
    });
    return Array.from(ops).sort();
  }, [logs]);

  // Distinct Event Types for Filter
  const eventTypesList = useMemo(() => {
    const types = new Set<string>();
    logs.forEach(l => {
      if (l.action) types.add(l.action);
    });
    return Array.from(types).sort();
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Date Range Filter
      if (startDate) {
        const logDate = log.timestamp.split('T')[0];
        if (logDate < startDate) return false;
      }
      if (endDate) {
        const logDate = log.timestamp.split('T')[0];
        if (logDate > endDate) return false;
      }

      // 2. Event Type Filter
      if (eventTypeFilter !== 'ALL') {
        if (!log.action.toLowerCase().includes(eventTypeFilter.toLowerCase())) {
          return false;
        }
      }

      // 3. Operator Filter
      if (operatorFilter !== 'ALL') {
        if ((log.operator || '').trim().toLowerCase() !== operatorFilter.toLowerCase()) {
          return false;
        }
      }

      // 4. Search Query (Across action, operator, details string or JSON)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const actionMatch = log.action.toLowerCase().includes(q);
        const opMatch = (log.operator || '').toLowerCase().includes(q);
        const termMatch = (log.terminalId || '').toLowerCase().includes(q);
        const detailsMatch = (log.details || '').toLowerCase().includes(q);
        if (!actionMatch && !opMatch && !termMatch && !detailsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [logs, startDate, endDate, eventTypeFilter, operatorFilter, searchQuery]);

  // Stats Counters
  const stats = useMemo(() => {
    let entries = 0;
    let exits = 0;
    let shiftClosings = 0;
    let dayClosings = 0;
    let integritySnapshots = 0;
    let systemChanges = 0;

    filteredLogs.forEach(l => {
      const act = l.action.toUpperCase();
      if (act.includes('ENTRY') || act.includes('INGRESO')) entries++;
      else if (act.includes('EXIT') || act.includes('SALIDA') || act.includes('COBRO')) exits++;
      else if (act.includes('SHIFT_CLOSE') || act.includes('ARQUEO')) shiftClosings++;
      else if (act.includes('DAY') || act.includes('DEFINITIVO')) dayClosings++;
      else if (act.includes('STATE') || act.includes('AUDIT_STATE')) integritySnapshots++;
      else systemChanges++;
    });

    return {
      total: filteredLogs.length,
      entries,
      exits,
      shiftClosings,
      dayClosings,
      integritySnapshots,
      systemChanges
    };
  }, [filteredLogs]);

  // Paginated records
  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredLogs.slice(start, start + rowsPerPage);
  }, [filteredLogs, currentPage, rowsPerPage]);

  // Helper to format ISO date
  const formatIsoDate = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  // Helper to format relative time
  const formatRelativeTime = (iso: string) => {
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `hace ${diffSec}s`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `hace ${diffMin}m`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `hace ${diffHour}h`;
      const diffDay = Math.floor(diffHour / 24);
      return `hace ${diffDay}d`;
    } catch {
      return '';
    }
  };

  // Helper for Event Type Badge & Colors
  const getActionBadge = (action: string) => {
    const act = (action || '').toUpperCase();

    if (act.includes('ENTRY') || act.includes('INGRESO')) {
      return {
        label: 'Ingreso Vehículo',
        icon: <Car className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />,
        className: 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30'
      };
    }
    if (act.includes('EXIT') || act.includes('SALIDA') || act.includes('COBRO')) {
      return {
        label: 'Salida / Cobro',
        icon: <DollarSign className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />,
        className: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
      };
    }
    if (act.includes('SHIFT_CLOSE') || act.includes('ARQUEO')) {
      return {
        label: 'Cierre Arqueo Turno',
        icon: <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />,
        className: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
      };
    }
    if (act.includes('DAY') || act.includes('DEFINITIVO')) {
      return {
        label: 'Cierre Definitivo Día',
        icon: <Calendar className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />,
        className: 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30'
      };
    }
    if (act.includes('RATE') || act.includes('TARIFA')) {
      return {
        label: 'Cambio Tarifas',
        icon: <Sliders className="w-3.5 h-3.5 text-pink-700 dark:text-pink-400" />,
        className: 'bg-pink-500/15 text-pink-800 dark:text-pink-300 border-pink-500/30'
      };
    }
    if (act.includes('USER') || act.includes('LOGIN') || act.includes('USUARIO')) {
      return {
        label: 'Seguridad / Usuario',
        icon: <Users className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />,
        className: 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/30'
      };
    }
    if (act.includes('STATE') || act.includes('AUDIT_STATE')) {
      return {
        label: 'Snapshot Integridad',
        icon: <ShieldCheck className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />,
        className: 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/30'
      };
    }
    if (act.includes('BACKUP') || act.includes('RESTORE')) {
      return {
        label: 'Backup / DB',
        icon: <Database className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />,
        className: 'bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/30'
      };
    }

    return {
      label: action,
      icon: <Activity className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />,
      className: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
    };
  };

  // Helper to parse details
  const parseDetails = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      return { isJson: true, data: parsed };
    } catch {
      return { isJson: false, data: raw };
    }
  };

  // Copy to Clipboard
  const handleCopyJson = (log: AuditLogEntry) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    try {
      const headers = ['ID', 'Fecha_Hora', 'Terminal', 'Tipo_Evento', 'Operador', 'Detalles'];
      const rows = filteredLogs.map(l => [
        `"${l.id}"`,
        `"${l.timestamp}"`,
        `"${l.terminalId || ''}"`,
        `"${l.action || ''}"`,
        `"${l.operator || ''}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria_parqueadero_${startDate || 'inicio'}_${endDate || 'fin'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[AuditHistory] Error exportando CSV:', err);
    }
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (filteredLogs.length === 0) return;
    try {
      const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria_parqueadero_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[AuditHistory] Error exportando JSON:', err);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 text-slate-900 dark:text-slate-100">
      {/* Header Principal de la Vista de Auditoría */}
      <div className="bg-slate-50/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400 shrink-0">
              <ShieldCheck className="w-6 h-6 text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">
                  Historial de Auditoría e Integridad
                </h3>
                <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded-full bg-slate-200 dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-slate-300 dark:border-slate-700">
                  {filteredLogs.length} Registros
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Bitácora inmutable de eventos críticos generada automáticamente por <code className="text-amber-700 dark:text-amber-300 font-mono font-bold">dbAddAuditLog</code> y sellos de estado.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-300 shadow-xs'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title="Actualización automática cada 8 segundos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
            <span>En Vivo {autoRefresh ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refrescar datos ahora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500 dark:text-amber-400' : ''}`} />
            <span>Refrescar</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Descargar tabla en archivo CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Excel / CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            disabled={filteredLogs.length === 0}
            className="px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-800 dark:text-cyan-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Descargar eventos en formato JSON"
          >
            <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* KPI Cards de Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-xs font-bold">
            <span>Total Eventos</span>
            <Layers className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-950 dark:text-white mt-2">
            {stats.total.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">En el rango actual</div>
        </div>

        <div className="bg-blue-500/10 dark:bg-blue-950/30 border border-blue-500/30 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-blue-800 dark:text-blue-300 text-xs font-bold">
            <span>Ingresos</span>
            <Car className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-950 dark:text-blue-200 mt-2">
            {stats.entries.toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-700 dark:text-blue-400/80 mt-0.5">Tickets emitidos</div>
        </div>

        <div className="bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs font-bold">
            <span>Salidas / Cobro</span>
            <DollarSign className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-950 dark:text-emerald-200 mt-2">
            {stats.exits.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400/80 mt-0.5">Pagos procesados</div>
        </div>

        <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 text-xs font-bold">
            <span>Arqueos Turno</span>
            <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-950 dark:text-amber-200 mt-2">
            {stats.shiftClosings.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-700 dark:text-amber-400/80 mt-0.5">Cierres de caja</div>
        </div>

        <div className="bg-purple-500/10 dark:bg-purple-950/30 border border-purple-500/30 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-purple-800 dark:text-purple-300 text-xs font-bold">
            <span>Cierre Días</span>
            <Calendar className="w-4 h-4 text-purple-700 dark:text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-950 dark:text-purple-200 mt-2">
            {stats.dayClosings.toLocaleString()}
          </div>
          <div className="text-[10px] text-purple-700 dark:text-purple-400/80 mt-0.5">Días definitivos</div>
        </div>

        <div className="bg-cyan-500/10 dark:bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-cyan-800 dark:text-cyan-300 text-xs font-bold">
            <span>Snapshots Estado</span>
            <ShieldCheck className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-950 dark:text-cyan-200 mt-2">
            {stats.integritySnapshots.toLocaleString()}
          </div>
          <div className="text-[10px] text-cyan-700 dark:text-cyan-400/80 mt-0.5">Sellos de integridad</div>
        </div>
      </div>

      {/* Barra de Filtros Multifunción */}
      <div className="bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
        {/* Presets de Fecha Rápida */}
        <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
          <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Rango:
          </span>
          {(['today', 'yesterday', 'week', 'month', 'all'] as const).map(p => {
            const labels = {
              today: 'Hoy',
              yesterday: 'Ayer',
              week: 'Últimos 7 Días',
              month: 'Últimos 30 Días',
              all: 'Todo el Histórico'
            };
            const isSel = dateRangePreset === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePresetChange(p)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSel
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {/* Controles de Filtro en Línea */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Búsqueda Global */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por placa, detalle, ID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Tipo de Evento */}
          <div>
            <select
              value={eventTypeFilter}
              onChange={(e) => {
                setEventTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-amber-500 font-medium cursor-pointer"
            >
              <option value="ALL">📁 Todos los Tipos de Eventos</option>
              <option value="ENTRY">🚗 Ingresos (ENTRY)</option>
              <option value="EXIT_PAYMENT">💳 Salidas y Cobro (EXIT_PAYMENT)</option>
              <option value="SHIFT_CLOSE">💵 Cierres de Turno (SHIFT_CLOSE)</option>
              <option value="DAY_DEFINITIVE_CLOSE">📅 Cierres de Día (DAY_DEFINITIVE_CLOSE)</option>
              <option value="RATE_CHANGE">⚙️ Tarifas y Plazas (RATE_CHANGE)</option>
              <option value="STATE">🛡️ Snapshots de Integridad (AUDIT_STATE)</option>
              <option value="USER">👥 Usuarios y Autenticación (USER_*)</option>
              <option value="BACKUP">💾 Respaldos de BD (DB_BACKUP)</option>
            </select>
          </div>

          {/* Operador */}
          <div>
            <select
              value={operatorFilter}
              onChange={(e) => {
                setOperatorFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-amber-500 font-medium cursor-pointer"
            >
              <option value="ALL">👤 Todos los Operadores</option>
              {operatorsList.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>

          {/* Rango de Fechas Manual */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDateRangePreset('custom');
                setCurrentPage(1);
              }}
              className="w-1/2 px-2.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-amber-500 font-mono"
            />
            <span className="text-slate-600 dark:text-slate-400 text-xs font-bold">a</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDateRangePreset('custom');
                setCurrentPage(1);
              }}
              className="w-1/2 px-2.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-amber-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800 dark:text-slate-200">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Fecha & Hora</th>
                <th className="py-3.5 px-4">Tipo de Evento</th>
                <th className="py-3.5 px-4">Operador / Terminal</th>
                <th className="py-3.5 px-4">Detalle / Instantánea</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-600 dark:text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-500 dark:text-amber-400 mx-auto mb-2" />
                    <p className="font-semibold text-sm">Cargando registros de auditoría...</p>
                  </td>
                </tr>
              ) : paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const parsed = parseDetails(log.details);
                  const isCopied = copiedId === log.id;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Fecha y Hora */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatIsoDate(log.timestamp)}
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                          {formatRelativeTime(log.timestamp)}
                        </div>
                      </td>

                      {/* Tipo de Evento Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${badge.className}`}>
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                        <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 mt-0.5 pl-0.5">
                          {log.action}
                        </div>
                      </td>

                      {/* Operador y Terminal */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                          <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>{log.operator || 'Cajero'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                          <Terminal className="w-3 h-3 text-slate-500" />
                          <span>{log.terminalId || 'TAQUILLA-01'}</span>
                        </div>
                      </td>

                      {/* Detalle o Snapshot */}
                      <td className="py-3.5 px-4 max-w-md">
                        {parsed.isJson && parsed.data.databaseState ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-cyan-800 dark:text-cyan-300 text-xs truncate">
                              {parsed.data.details?.ticketNumber ? `Ticket: ${parsed.data.details.ticketNumber} [${parsed.data.details.plate}]` : parsed.data.action}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-700 dark:text-slate-300 font-mono">
                              <span className="bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-800">
                                🚗 Tickets Activos: <strong>{parsed.data.databaseState.activeTicketsCount}</strong>
                              </span>
                              <span className="bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-800">
                                🅿️ Plazas Ocupadas: <strong>{parsed.data.databaseState.occupiedSpotsCount}</strong>
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {log.details || 'Sin detalles adicionales'}
                          </div>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyJson(log);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
                            title="Copiar JSON del registro"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="p-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 rounded-lg transition-all cursor-pointer"
                            title="Ver inspección completa"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-600 dark:text-slate-400">
                    <ShieldCheck className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-800 dark:text-slate-200">No se encontraron registros de auditoría</p>
                    <p className="text-xs text-slate-500 mt-1">Prueba cambiando el rango de fechas o los filtros de búsqueda.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación y Resumen */}
        <div className="bg-slate-50 dark:bg-slate-950 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Mostrando {paginatedLogs.length} de {filteredLogs.length} registros</span>
            <span>•</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-hidden font-medium cursor-pointer"
            >
              <option value={10}>10 filas</option>
              <option value={25}>25 filas</option>
              <option value={50}>50 filas</option>
              <option value={100}>100 filas</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-900 dark:text-slate-200 font-bold">
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Detalle Completo del Log Seleccionado */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Inspección de Registro de Auditoría</h4>
                  <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold block">Acción / Evento</span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-300 text-xs mt-1 block">{selectedLog.action}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold block">Operador</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs mt-1 block">{selectedLog.operator || 'Cajero'}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold block">Terminal</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 text-xs mt-1 block">{selectedLog.terminalId || 'TAQUILLA-01'}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold block">Marca de Tiempo</span>
                  <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 mt-1 block">{formatIsoDate(selectedLog.timestamp)}</span>
                </div>
              </div>

              {/* Detalle o Payload JSON */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 block">Carga Útil / Datos del Evento:</label>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-900 dark:text-slate-200 overflow-x-auto max-h-72">
                  <pre className="whitespace-pre-wrap select-all">
                    {parseDetails(selectedLog.details).isJson
                      ? JSON.stringify(parseDetails(selectedLog.details).data, null, 2)
                      : selectedLog.details}
                  </pre>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-950 px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleCopyJson(selectedLog)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Registro Completo</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AuditHistory;
