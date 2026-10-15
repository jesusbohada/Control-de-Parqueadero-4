import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  History, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  User, 
  Clock, 
  Globe, 
  CheckCircle2, 
  AlertTriangle, 
  PlusCircle, 
  Edit3, 
  RotateCcw, 
  FileSpreadsheet, 
  ArrowRight, 
  ExternalLink,
  Sliders,
  Calendar,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  RouteAuditRecord, 
  RouteAuditEventType, 
  getStoredRouteAuditHistory, 
  clearRouteAuditHistory, 
  logRouteAuditEvent 
} from '../types/routes';

interface RouteAuditHistoryProps {
  selectedPathFilter?: string;
  onClearFilter?: () => void;
  isDarkMode?: boolean;
}

export const RouteAuditHistory: React.FC<RouteAuditHistoryProps> = ({
  selectedPathFilter,
  onClearFilter,
  isDarkMode = true,
}) => {
  const [history, setHistory] = useState<RouteAuditRecord[]>(() => getStoredRouteAuditHistory());
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [selectedRecord, setSelectedRecord] = useState<RouteAuditRecord | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Reload history from localStorage
  const refreshHistory = () => {
    setHistory(getStoredRouteAuditHistory());
  };

  const handleClearHistory = () => {
    clearRouteAuditHistory();
    // Re-seed or empty
    logRouteAuditEvent({
      eventType: 'ROUTES_RESET',
      eventLabel: 'Historial Reiniciado',
      path: '*',
      routeName: 'Registro del Sistema',
      userName: 'Administrador General',
      userRole: 'admin',
      details: 'El registro cronológico de auditoría de rutas fue vaciado y reiniciado manualmente.',
      severity: 'warning',
    });
    setHistory(getStoredRouteAuditHistory());
    setShowClearConfirm(false);
  };

  const handleExportCsv = () => {
    if (history.length === 0) return;
    const headers = ['ID', 'Fecha y Hora', 'Tipo de Evento', 'Etiqueta', 'Ruta', 'Nombre de Área', 'Usuario', 'Rol', 'IP', 'Detalles'];
    const rows = history.map(r => [
      r.id,
      `"${new Date(r.timestamp).toLocaleString('es-CO')}"`,
      r.eventType,
      `"${r.eventLabel}"`,
      `"${r.path}"`,
      `"${r.routeName}"`,
      `"${r.userName}"`,
      `"${r.userRole}"`,
      r.ipAddress || '127.0.0.1',
      `"${r.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_rutas_protegidas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportJson = () => {
    if (history.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `auditoria_rutas_protegidas_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filtered dataset
  const filteredHistory = useMemo(() => {
    const now = Date.now();
    return history.filter(record => {
      // Path filter
      if (selectedPathFilter && record.path !== selectedPathFilter) {
        return false;
      }

      // Event Type Filter
      if (eventTypeFilter !== 'all' && record.eventType !== eventTypeFilter) {
        return false;
      }

      // Time Filter
      if (timeFilter !== 'all') {
        const recordTime = new Date(record.timestamp).getTime();
        const diffHours = (now - recordTime) / (1000 * 3600);
        if (timeFilter === 'today' && diffHours > 24) return false;
        if (timeFilter === '7days' && diffHours > 24 * 7) return false;
        if (timeFilter === '30days' && diffHours > 24 * 30) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          record.path.toLowerCase().includes(term) ||
          record.routeName.toLowerCase().includes(term) ||
          record.userName.toLowerCase().includes(term) ||
          record.userRole.toLowerCase().includes(term) ||
          record.details.toLowerCase().includes(term) ||
          record.eventLabel.toLowerCase().includes(term) ||
          (record.ipAddress && record.ipAddress.includes(term))
        );
      }

      return true;
    });
  }, [history, selectedPathFilter, eventTypeFilter, timeFilter, searchTerm]);

  // Metrics
  const totalEvents = history.length;
  const accessGrantedCount = history.filter(h => h.eventType === 'ACCESS_GRANTED').length;
  const modificationsCount = history.filter(h => ['ROUTE_CREATED', 'ROUTE_UPDATED', 'ROUTE_DELETED'].includes(h.eventType)).length;
  const alertsCount = history.filter(h => h.severity === 'warning' || h.severity === 'security' || h.eventType === 'ACCESS_DENIED').length;

  const getEventBadge = (record: RouteAuditRecord) => {
    switch (record.eventType) {
      case 'ACCESS_GRANTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Acceso Concedido
          </span>
        );
      case 'ACCESS_DENIED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <AlertTriangle className="w-3 h-3" /> Acceso Denegado
          </span>
        );
      case 'ROUTE_CREATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
            <PlusCircle className="w-3 h-3" /> Ruta Creada
          </span>
        );
      case 'ROUTE_UPDATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Edit3 className="w-3 h-3" /> Ruta Modificada
          </span>
        );
      case 'ROUTE_DELETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <Trash2 className="w-3 h-3" /> Ruta Eliminada
          </span>
        );
      case 'ROUTES_RESET':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            <RotateCcw className="w-3 h-3" /> Reajuste de Rutas
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
            <Info className="w-3 h-3" /> {record.eventLabel}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1 */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
            Total Eventos Registrados
          </span>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {totalEvents}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
            Trazabilidad en localStorage
          </span>
        </div>

        {/* Metric 2 */}
        <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Accesos Concedidos
          </span>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
            {accessGrantedCount}
          </div>
          <span className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80 mt-1 block">
            Ingresos autorizados
          </span>
        </div>

        {/* Metric 3 */}
        <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 block mb-1 flex items-center gap-1">
            <Edit3 className="w-3.5 h-3.5" /> Modificaciones
          </span>
          <div className="text-xl font-black text-amber-700 dark:text-amber-400 font-mono">
            {modificationsCount}
          </div>
          <span className="text-[10px] text-amber-800/80 dark:text-amber-300/80 mt-1 block">
            Creación / Edición de rutas
          </span>
        </div>

        {/* Metric 4 */}
        <div className={`p-3.5 rounded-xl border shadow-xs ${
          alertsCount > 0 
            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40' 
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <span className={`text-[11px] font-semibold block mb-1 flex items-center gap-1 ${
            alertsCount > 0 ? 'text-rose-800 dark:text-rose-300' : 'text-slate-600 dark:text-slate-400'
          }`}>
            <AlertTriangle className="w-3.5 h-3.5" /> Alertas / Bloqueos
          </span>
          <div className={`text-xl font-black font-mono ${
            alertsCount > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'
          }`}>
            {alertsCount}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
            {alertsCount > 0 ? 'Requiere atención' : 'Sin incidencias'}
          </span>
        </div>
      </div>

      {/* Control Bar: Filters, Search, Exports */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por usuario, ruta, rol, dirección IP o detalle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Event Type Filter */}
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none font-semibold cursor-pointer"
            >
              <option value="all">Todos los Eventos</option>
              <option value="ACCESS_GRANTED">Accesos Concedidos</option>
              <option value="ACCESS_DENIED">Accesos Denegados</option>
              <option value="ROUTE_CREATED">Rutas Creadas</option>
              <option value="ROUTE_UPDATED">Rutas Modificadas</option>
              <option value="ROUTE_DELETED">Rutas Eliminadas</option>
            </select>

            {/* Time Filter */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none font-semibold cursor-pointer"
            >
              <option value="all">Todo el Historial</option>
              <option value="today">Últimas 24 Horas</option>
              <option value="7days">Últimos 7 Días</option>
              <option value="30days">Últimos 30 Días</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tabla
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'timeline'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Línea de Tiempo
              </button>
            </div>
          </div>
        </div>

        {/* Action Row: Export CSV, JSON, Clear Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            {selectedPathFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 font-bold">
                Filtrado por: <span className="font-mono">{selectedPathFilter}</span>
                {onClearFilter && (
                  <button 
                    type="button" 
                    onClick={onClearFilter} 
                    className="ml-1 hover:text-rose-500 font-black cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </span>
            )}
            <span className="text-slate-500 dark:text-slate-400">
              Mostrando <strong>{filteredHistory.length}</strong> de {history.length} registros cronológicos
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredHistory.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Descargar reporte en formato CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              disabled={filteredHistory.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Descargar reporte en formato JSON"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Exportar JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Vaciar historial de auditoría"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar Historial</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal to Clear History */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-semibold">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>¿Estás seguro de que deseas vaciar todos los registros de auditoría de rutas? Esta acción es irreversible.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-500 shadow-sm"
              >
                Sí, Vaciar Todo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content: Table View vs Timeline View */}
      {filteredHistory.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <History className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            No se encontraron registros de auditoría
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            No hay eventos registrados que coincidan con los criterios de búsqueda o filtros seleccionados.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Tipo de Evento</th>
                  <th className="py-3 px-4">Ruta & Área Protegida</th>
                  <th className="py-3 px-4">Usuario Responsable</th>
                  <th className="py-3 px-4">IP / Estación</th>
                  <th className="py-3 px-4">Detalle de la Operación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredHistory.map((record) => {
                  const dateObj = new Date(record.timestamp);
                  return (
                    <tr 
                      key={record.id}
                      onClick={() => setSelectedRecord(record)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {dateObj.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Event Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getEventBadge(record)}
                      </td>

                      {/* Route Path & Name */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                          {record.path}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {record.routeName}
                        </div>
                      </td>

                      {/* User & Role */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{record.userName}</span>
                        </div>
                        <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">
                          Rol: {record.userRole}
                        </div>
                      </td>

                      {/* IP Address */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {record.ipAddress || '127.0.0.1'}
                      </td>

                      {/* Details */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-xs">
                        <p className="line-clamp-2" title={record.details}>
                          {record.details}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TIMELINE VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-6">
            {filteredHistory.map((record) => {
              const dateObj = new Date(record.timestamp);
              return (
                <div key={record.id} className="relative pl-6">
                  {/* Dot */}
                  <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 bg-white dark:bg-slate-900 ${
                    record.eventType === 'ACCESS_GRANTED'
                      ? 'border-emerald-500 ring-4 ring-emerald-500/20'
                      : record.eventType === 'ROUTE_UPDATED'
                      ? 'border-amber-500 ring-4 ring-amber-500/20'
                      : record.eventType === 'ROUTE_CREATED'
                      ? 'border-indigo-500 ring-4 ring-indigo-500/20'
                      : 'border-rose-500 ring-4 ring-rose-500/20'
                  }`} />

                  {/* Card Content */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getEventBadge(record)}
                        <span className="font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400">
                          {record.path}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          · {record.routeName}
                        </span>
                      </div>

                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {dateObj.toLocaleDateString('es-CO')} {dateObj.toLocaleTimeString('es-CO')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 dark:text-slate-200">
                      {record.details}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] font-mono text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800/60">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{record.userName} ({record.userRole})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>IP: {record.ipAddress || '127.0.0.1'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Record Details Modal / Dialog */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Detalle de Evento de Auditoría
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Tipo de Evento:</span>
                  <div>{getEventBadge(selectedRecord)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Ruta Protegida:</span>
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">{selectedRecord.path}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Nombre de Área:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedRecord.routeName}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Usuario:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedRecord.userName}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Rol:</span>
                    <span className="font-mono uppercase font-bold text-slate-700 dark:text-slate-300">{selectedRecord.userRole}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Detalle Completo:</span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                    {selectedRecord.details}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1">
                  <span>ID: {selectedRecord.id}</span>
                  <span>{new Date(selectedRecord.timestamp).toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
