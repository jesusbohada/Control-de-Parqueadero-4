import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  RefreshCw,
  Terminal,
  Table as TableIcon,
  Search,
  Download,
  Upload,
  Play,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Zap,
  Server,
  HardDrive,
  Copy,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileCode,
  ShieldCheck,
  RotateCcw,
  SlidersHorizontal,
  FileSpreadsheet,
  History,
  Trash2,
  FileText,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Filter
} from 'lucide-react';
import { exportDatabaseBackup } from '../db/terminalDatabase';
import { playSound } from '../utils/audio';

interface PostgresStatus {
  connected: boolean;
  ready: boolean;
  engine: string;
  databaseName?: string;
  version?: string;
  size?: string;
  serverTime?: string;
  backendPid?: number;
  totalTables?: number;
  executionTimeMs?: number;
  databaseUrl?: string;
  pool?: {
    totalCount: number;
    idleCount: number;
    activeCount: number;
    waitingCount: number;
  };
  error?: string;
}

interface PostgresTableSummary {
  tableName: string;
  exactCount: number;
  totalSize: string;
  dataSize: string;
  indexSize: string;
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>;
}

interface QueryHistoryItem {
  id: string;
  timestamp: string;
  query: string;
  success: boolean;
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

const PRESET_SQL_QUERIES = [
  {
    title: 'Plazas Disponibles',
    sql: "SELECT code, type, status, rate_per_hour FROM spots WHERE status = 'available' ORDER BY code ASC;"
  },
  {
    title: 'Tickets Activos Recientes',
    sql: 'SELECT ticket_number, plate, vehicle_type, spot_code, entry_time FROM active_tickets ORDER BY entry_time DESC LIMIT 20;'
  },
  {
    title: 'Total Cobrado por Método de Pago',
    sql: 'SELECT payment_method, COUNT(*) AS total_tickets, SUM(total_amount) AS total_recaudado FROM paid_tickets GROUP BY payment_method ORDER BY total_recaudado DESC;'
  },
  {
    title: 'Últimos 10 Turnos de Caja',
    sql: 'SELECT id, cashier_name, start_time, end_time, initial_cash, final_cash, status FROM cash_shifts ORDER BY start_time DESC LIMIT 10;'
  },
  {
    title: 'Últimos 50 Registros de Auditoría',
    sql: 'SELECT id, action, user_name, timestamp, details FROM audit_logs ORDER BY timestamp DESC LIMIT 50;'
  },
  {
    title: 'Estadísticas de Tablas en Postgres',
    sql: 'SELECT relname AS tabla, n_live_tup AS filas_estimadas, pg_size_pretty(pg_total_relation_size(relid)) AS tamano_total FROM pg_stat_user_tables ORDER BY n_live_tup DESC;'
  }
];

const LOCAL_STORAGE_HISTORY_KEY = 'wolfzone_postgres_query_history';

export const PostgresAdminTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'tables' | 'query' | 'structure' | 'table_backup' | 'sync'>('tables');
  const [status, setStatus] = useState<PostgresStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [tables, setTables] = useState<PostgresTableSummary[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('spots');
  
  // Table Data State
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableTotal, setTableTotal] = useState<number>(0);
  const [tablePage, setTablePage] = useState<number>(1);
  const [tableLimit, setTableLimit] = useState<number>(25);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableSortBy, setTableSortBy] = useState<string>('');
  const [tableSortDir, setTableSortDir] = useState<'ASC' | 'DESC'>('ASC');
  const [isLoadingTableData, setIsLoadingTableData] = useState<boolean>(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState<any | null>(null);

  // SQL Console State
  const [customSql, setCustomSql] = useState<string>('SELECT * FROM spots ORDER BY code ASC LIMIT 50;');
  const [isExecutingSql, setIsExecutingSql] = useState<boolean>(false);
  const [sqlResult, setSqlResult] = useState<{
    columns: string[];
    rows: any[];
    rowCount?: number;
    command?: string;
    executionTimeMs?: number;
    error?: string;
  } | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);

  // Query History State
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHistoryPanel, setShowHistoryPanel] = useState<boolean>(false);

  // Specific Table Backup & Restore State
  const [targetBackupTable, setTargetBackupTable] = useState<string>('active_tickets');
  const [backupFormat, setBackupFormat] = useState<'json' | 'sql'>('json');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreviewRecords, setRestorePreviewRecords] = useState<any[] | null>(null);
  const [restoreMode, setRestoreMode] = useState<'upsert' | 'skip_existing'>('upsert');
  const [isRestoringTable, setIsRestoringTable] = useState<boolean>(false);
  const [restoreFeedback, setRestoreFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global Actions Feedback
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const fetchStatusAndTables = async () => {
    setIsLoadingStatus(true);
    try {
      const [statusRes, tablesRes] = await Promise.all([
        fetch('/api/postgres/status'),
        fetch('/api/postgres/tables')
      ]);

      if (statusRes.ok) {
        const sData = await statusRes.json();
        setStatus(sData);
      }

      if (tablesRes.ok) {
        const tData = await tablesRes.json();
        if (tData.success && Array.isArray(tData.tables)) {
          setTables(tData.tables);
          if (tData.tables.length > 0 && !tData.tables.some((t: any) => t.tableName === selectedTable)) {
            setSelectedTable(tData.tables[0].tableName);
          }
        }
      }
    } catch (err: any) {
      setStatus({
        connected: false,
        ready: false,
        engine: 'PostgreSQL',
        error: err.message || 'Error de conexión con el backend'
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const fetchTableData = async () => {
    if (!selectedTable) return;
    setIsLoadingTableData(true);
    try {
      const res = await fetch('/api/postgres/table-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: selectedTable,
          page: tablePage,
          limit: tableLimit,
          search: tableSearch,
          sortBy: tableSortBy,
          sortDir: tableSortDir
        })
      });
      const data = await res.json();
      if (data.success) {
        setTableData(data.rows || []);
        setTableTotal(data.totalRecords || 0);
      } else {
        setTableData([]);
        setTableTotal(0);
      }
    } catch {
      setTableData([]);
    } finally {
      setIsLoadingTableData(false);
    }
  };

  useEffect(() => {
    fetchStatusAndTables();
  }, []);

  useEffect(() => {
    if (subTab === 'tables' && status?.connected) {
      fetchTableData();
    }
  }, [selectedTable, tablePage, tableLimit, tableSearch, tableSortBy, tableSortDir, subTab, status?.connected]);

  // Persist Query History
  const saveHistoryItem = (item: QueryHistoryItem) => {
    setQueryHistory(prev => {
      const updated = [item, ...prev.filter(h => h.query !== item.query)].slice(0, 40);
      try {
        localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  };

  const clearQueryHistory = () => {
    setQueryHistory([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
    } catch {
      // ignore
    }
  };

  const handleExecuteSql = async (sqlToRun?: string) => {
    const query = (sqlToRun || customSql).trim();
    if (!query) return;

    setIsExecutingSql(true);
    setSqlResult(null);
    const startTime = Date.now();

    try {
      const res = await fetch('/api/postgres/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      
      const historyItem: QueryHistoryItem = {
        id: `query-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        query,
        success: !!data.success,
        rowCount: data.rowCount ?? (data.rows ? data.rows.length : 0),
        executionTimeMs: data.executionTimeMs || (Date.now() - startTime),
        error: data.error
      };
      saveHistoryItem(historyItem);

      if (data.success) {
        setSqlResult({
          columns: data.fields || (data.rows.length > 0 ? Object.keys(data.rows[0]) : []),
          rows: data.rows || [],
          rowCount: data.rowCount,
          command: data.command,
          executionTimeMs: data.executionTimeMs
        });
        playSound('success');
      } else {
        setSqlResult({
          columns: [],
          rows: [],
          error: data.error || 'Error al ejecutar consulta SQL',
          executionTimeMs: data.executionTimeMs
        });
        playSound('alert');
      }
    } catch (err: any) {
      const historyItem: QueryHistoryItem = {
        id: `query-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        query,
        success: false,
        rowCount: 0,
        executionTimeMs: Date.now() - startTime,
        error: err.message || 'Error de red'
      };
      saveHistoryItem(historyItem);

      setSqlResult({
        columns: [],
        rows: [],
        error: err.message || 'Fallo de red al comunicar con PostgreSQL'
      });
      playSound('alert');
    } finally {
      setIsExecutingSql(false);
    }
  };

  // Export Results as JSON file
  const handleExportJson = () => {
    if (!sqlResult || !sqlResult.rows || sqlResult.rows.length === 0) return;
    const blob = new Blob([JSON.stringify(sqlResult.rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    playSound('success');
  };

  // Copy JSON Results to Clipboard
  const handleCopyJson = async () => {
    if (!sqlResult || !sqlResult.rows) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(sqlResult.rows, null, 2));
      setCopiedFeedback(true);
      playSound('beep');
      setTimeout(() => setCopiedFeedback(false), 2000);
    } catch {
      // ignore
    }
  };

  // Export Results as CSV file
  const handleExportCsv = () => {
    if (!sqlResult || !sqlResult.rows || sqlResult.rows.length === 0) return;
    const cols = sqlResult.columns;
    const csvLines = [
      cols.join(','),
      ...sqlResult.rows.map(r => cols.map(c => {
        const val = r[c];
        if (val === null || val === undefined) return '';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(','))
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    playSound('success');
  };

  // Specific Table Backup Download
  const handleDownloadTableBackup = () => {
    if (!targetBackupTable) return;
    window.location.href = `/api/postgres/dump-table?table=${targetBackupTable}&format=${backupFormat}`;
    playSound('success');
  };

  // Parse Specific Table Restore File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setRestoreFeedback(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          setRestorePreviewRecords(json);
        } else if (json.records && Array.isArray(json.records)) {
          setRestorePreviewRecords(json.records);
          if (json.metadata?.table) {
            setTargetBackupTable(json.metadata.table);
          }
        } else {
          setRestoreFeedback({ success: false, message: 'El archivo no contiene un arreglo válido de registros JSON.' });
          setRestorePreviewRecords(null);
        }
      } catch (err: any) {
        setRestoreFeedback({ success: false, message: `Error al procesar JSON: ${err.message}` });
        setRestorePreviewRecords(null);
      }
    };
    reader.readAsText(file);
  };

  // Execute Specific Table Restore
  const handleExecuteRestoreTable = async () => {
    if (!restorePreviewRecords || restorePreviewRecords.length === 0) {
      setRestoreFeedback({ success: false, message: 'No hay registros cargados para restaurar.' });
      return;
    }

    setIsRestoringTable(true);
    setRestoreFeedback(null);

    try {
      const res = await fetch('/api/postgres/restore-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: targetBackupTable,
          records: restorePreviewRecords,
          mode: restoreMode
        })
      });
      const data = await res.json();
      if (data.success) {
        setRestoreFeedback({ success: true, message: data.message });
        playSound('success');
        fetchStatusAndTables();
        if (subTab === 'tables') fetchTableData();
      } else {
        setRestoreFeedback({ success: false, message: data.error || 'Error al restaurar tabla.' });
        playSound('alert');
      }
    } catch (err: any) {
      setRestoreFeedback({ success: false, message: err.message || 'Error de comunicación' });
      playSound('alert');
    } finally {
      setIsRestoringTable(false);
    }
  };

  const handleMaintenance = async (action: 'vacuum' | 'reindex') => {
    setActionFeedback({ type: 'info', text: `Ejecutando ${action === 'vacuum' ? 'VACUUM ANALYZE' : 'REINDEX'} en PostgreSQL...` });
    try {
      const res = await fetch('/api/postgres/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        setActionFeedback({ type: 'success', text: data.message });
        playSound('success');
        fetchStatusAndTables();
      } else {
        setActionFeedback({ type: 'error', text: data.error || 'Fallo al ejecutar mantenimiento' });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err.message });
    }
  };

  const handleSyncIndexedDbToPostgres = async () => {
    setIsSyncing(true);
    setActionFeedback({ type: 'info', text: 'Extrayendo datos de IndexedDB y subiendo a PostgreSQL...' });
    try {
      const rawBackup = await exportDatabaseBackup();
      const backupJson = JSON.parse(rawBackup);

      const payload = {
        spots: backupJson.tables?.spots || [],
        activeTickets: backupJson.tables?.activeTickets || [],
        paidTickets: backupJson.tables?.paidTickets || [],
        cashShifts: backupJson.tables?.cashShifts || [],
        ratesConfig: backupJson.tables?.ratesConfig || [],
        users: backupJson.tables?.users || [],
        expenseConcepts: backupJson.tables?.expenseConcepts || []
      };

      const res = await fetch('/api/postgres/sync-from-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setActionFeedback({ type: 'success', text: `¡Éxito! ${data.insertedCount} registros sincronizados con PostgreSQL.` });
        playSound('success');
        fetchStatusAndTables();
        if (subTab === 'tables') fetchTableData();
      } else {
        setActionFeedback({ type: 'error', text: data.error || 'Error durante la sincronización' });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadFullSqlDump = () => {
    window.location.href = '/api/postgres/dump';
    playSound('success');
  };

  const currentTableObj = tables.find(t => t.tableName === selectedTable);
  const totalPages = Math.ceil(tableTotal / tableLimit) || 1;

  return (
    <div className="flex flex-col h-full space-y-3.5">
      {/* 1. Header de Estado del Servidor SQL */}
      <div className="bg-slate-900/90 border border-slate-700/70 rounded-xl p-3.5 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-lg border ${status?.connected ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/20 border-rose-500/40 text-rose-400'}`}>
              <Database className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm tracking-wide flex items-center gap-1.5">
                  Servidor SQL: PostgreSQL
                </h3>
                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${status?.connected ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' : 'bg-rose-950/80 text-rose-300 border-rose-500/30'}`}>
                  {status?.connected ? 'CONECTADO Y ACTIVO' : 'NO CONECTADO'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {status?.connected 
                  ? `Base: ${status.databaseName || 'wolfzonepos_db'} • Tamaño: ${status.size || 'N/A'} • Tablas: ${status.totalTables || 0} • Conexiones en Pool: ${status.pool?.totalCount || 0}`
                  : (status?.error || 'PostgreSQL no responde en puerto 5433 / 5432. El sistema opera con contingencia en IndexedDB.')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchStatusAndTables}
              disabled={isLoadingStatus}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition text-slate-200"
              title="Refrescar estado"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
              <span>Refrescar</span>
            </button>
            <button
              onClick={handleDownloadFullSqlDump}
              disabled={!status?.connected}
              className="px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition text-indigo-200 disabled:opacity-50"
              title="Descargar volcado SQL completo (.sql)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Dump Full .sql</span>
            </button>
            <button
              onClick={handleSyncIndexedDbToPostgres}
              disabled={!status?.connected || isSyncing}
              className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition text-emerald-200 disabled:opacity-50"
              title="Subir datos de IndexedDB a PostgreSQL"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Sincronizando...' : 'IndexedDB ➜ SQL'}</span>
            </button>
          </div>
        </div>

        {actionFeedback && (
          <div className={`mt-2.5 p-2 rounded-lg text-xs flex items-center justify-between border ${
            actionFeedback.type === 'success' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' :
            actionFeedback.type === 'error' ? 'bg-rose-950/60 border-rose-500/40 text-rose-200' :
            'bg-blue-950/60 border-blue-500/40 text-blue-200'
          }`}>
            <span>{actionFeedback.text}</span>
            <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSubTab('tables')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
              subTab === 'tables'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Tablas SQL ({tables.length})</span>
          </button>
          <button
            onClick={() => setSubTab('query')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
              subTab === 'query'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Consola SQL & Historial</span>
          </button>
          <button
            onClick={() => setSubTab('table_backup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
              subTab === 'table_backup'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Respaldo / Restauración por Tabla</span>
          </button>
          <button
            onClick={() => setSubTab('structure')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
              subTab === 'structure'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Estructura DDL</span>
          </button>
          <button
            onClick={() => setSubTab('sync')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
              subTab === 'sync'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Mantenimiento</span>
          </button>
        </div>
      </div>

      {/* 3. Contenido según Sub-Tab */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* SUBTAB 1: TABLAS SQL */}
        {subTab === 'tables' && (
          <div className="flex-1 flex flex-col md:flex-row gap-3 overflow-hidden">
            {/* Lista lateral de tablas */}
            <div className="w-full md:w-64 bg-slate-900/60 border border-slate-700/60 rounded-xl p-2.5 overflow-y-auto flex flex-col space-y-1 shrink-0">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                <span>Tablas en PostgreSQL</span>
                <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300">{tables.length}</span>
              </div>
              {tables.map(tbl => (
                <button
                  key={tbl.tableName}
                  onClick={() => {
                    setSelectedTable(tbl.tableName);
                    setTablePage(1);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition ${
                    selectedTable === tbl.tableName
                      ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <TableIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">{tbl.tableName}</span>
                  </div>
                  <span className="text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                    {tbl.exactCount}
                  </span>
                </button>
              ))}
            </div>

            {/* Visor de filas de la tabla seleccionada */}
            <div className="flex-1 bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 flex flex-col overflow-hidden">
              {/* Barra de herramientas de tabla */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-sm text-white font-mono flex items-center gap-1.5">
                    <TableIcon className="w-4 h-4 text-blue-400" />
                    {selectedTable}
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">
                    ({tableTotal} filas • {currentTableObj?.totalSize || '0 kB'})
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={tableSearch}
                      onChange={(e) => {
                        setTableSearch(e.target.value);
                        setTablePage(1);
                      }}
                      placeholder="Filtrar en tabla..."
                      className="pl-8 pr-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={fetchTableData}
                    disabled={isLoadingTableData}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300"
                    title="Actualizar datos de tabla"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTableData ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Grid / Tabla de Datos */}
              <div className="flex-1 overflow-auto mt-2 border border-slate-800 rounded-lg">
                {isLoadingTableData ? (
                  <div className="h-full flex items-center justify-center p-8 text-slate-400 text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-400" />
                    Cargando filas desde PostgreSQL...
                  </div>
                ) : tableData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-slate-400 text-xs">
                    <TableIcon className="w-8 h-8 text-slate-600 mb-2" />
                    <p>No hay registros que coincidan en la tabla <span className="font-mono text-slate-300">{selectedTable}</span>.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-200 border-collapse">
                    <thead className="bg-slate-950/80 sticky top-0 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-mono">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">#</th>
                        {Object.keys(tableData[0] || {}).map(col => (
                          <th key={col} className="py-2 px-3 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                        <th className="py-2 px-3 w-16 text-center">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {tableData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition">
                          <td className="py-1.5 px-3 text-slate-500 text-center">
                            {(tablePage - 1) * tableLimit + idx + 1}
                          </td>
                          {Object.keys(row).map((col, cIdx) => {
                            const val = row[col];
                            let displayVal = String(val);
                            if (val === null || val === undefined) displayVal = 'NULL';
                            else if (typeof val === 'object') displayVal = JSON.stringify(val);
                            
                            return (
                              <td key={cIdx} className="py-1.5 px-3 truncate max-w-[200px]" title={typeof val === 'object' ? JSON.stringify(val, null, 2) : displayVal}>
                                {val === null || val === undefined ? (
                                  <span className="text-slate-500 italic">null</span>
                                ) : typeof val === 'object' ? (
                                  <span className="text-amber-300 font-sans">{displayVal.length > 30 ? displayVal.slice(0, 30) + '...' : displayVal}</span>
                                ) : (
                                  displayVal
                                )}
                              </td>
                            );
                          })}
                          <td className="py-1.5 px-3 text-center">
                            <button
                              onClick={() => setSelectedRowDetail(row)}
                              className="p-1 hover:bg-blue-600/30 text-blue-400 rounded transition"
                              title="Ver detalle completo de fila"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Paginación */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <span>Mostrar:</span>
                  <select
                    value={tableLimit}
                    onChange={(e) => {
                      setTableLimit(Number(e.target.value));
                      setTablePage(1);
                    }}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200"
                  >
                    <option value={10}>10 filas</option>
                    <option value={25}>25 filas</option>
                    <option value={50}>50 filas</option>
                    <option value={100}>100 filas</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <span>Página {tablePage} de {totalPages}</span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setTablePage(p => Math.max(1, p - 1))}
                      disabled={tablePage <= 1}
                      className="p-1 bg-slate-800 border border-slate-700 rounded text-slate-300 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                      disabled={tablePage >= totalPages}
                      className="p-1 bg-slate-800 border border-slate-700 rounded text-slate-300 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: CONSOLA SQL INTERACTIVA CON HISTORIAL & EXPORT */}
        {subTab === 'query' && (
          <div className="flex-1 flex flex-col md:flex-row gap-3 overflow-hidden">
            {/* Main Console Workspace */}
            <div className="flex-1 flex flex-col space-y-2.5 overflow-hidden">
              {/* Presets & History Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Presets:
                  </span>
                  {PRESET_SQL_QUERIES.map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => {
                        setCustomSql(preset.sql);
                        handleExecuteSql(preset.sql);
                      }}
                      className="px-2 py-0.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded text-[11px] text-slate-300 transition hover:text-white"
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 border transition ${
                    showHistoryPanel
                      ? 'bg-blue-600/30 text-blue-200 border-blue-500/50'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Historial ({queryHistory.length})</span>
                </button>
              </div>

              {/* Editor de Consulta */}
              <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    Sentencia SQL Raw (PostgreSQL):
                  </label>
                  <button
                    onClick={() => handleExecuteSql()}
                    disabled={isExecutingSql || !status?.connected}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-md transition disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 ${isExecutingSql ? 'animate-spin' : ''}`} />
                    <span>{isExecutingSql ? 'Ejecutando...' : 'Ejecutar SQL'}</span>
                  </button>
                </div>
                <textarea
                  value={customSql}
                  onChange={(e) => setCustomSql(e.target.value)}
                  rows={3}
                  placeholder="Escribe tu consulta SQL aquí (ej: SELECT * FROM spots WHERE status = 'available';)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 selection:bg-emerald-800"
                />
              </div>

              {/* Resultados de la Consulta & Export Tools */}
              <div className="flex-1 bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 flex flex-col overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <TableIcon className="w-3.5 h-3.5 text-blue-400" />
                      Resultado de Ejecución
                    </h4>
                    {sqlResult && !sqlResult.error && (
                      <span className="text-[11px] font-mono text-slate-400">
                        (Filas: <strong className="text-emerald-400">{sqlResult.rowCount ?? sqlResult.rows.length}</strong> • Tiempo: <strong className="text-blue-400">{sqlResult.executionTimeMs} ms</strong>)
                      </span>
                    )}
                  </div>

                  {/* Botones de Exportación JSON / CSV */}
                  {sqlResult && sqlResult.rows && sqlResult.rows.length > 0 && (
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={handleCopyJson}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[11px] font-medium text-slate-300 flex items-center space-x-1 transition"
                        title="Copiar JSON al portapapeles"
                      >
                        {copiedFeedback ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedFeedback ? '¡Copiado!' : 'Copiar JSON'}</span>
                      </button>
                      <button
                        onClick={handleExportJson}
                        className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 rounded text-[11px] font-medium text-indigo-200 flex items-center space-x-1 transition"
                        title="Descargar archivo JSON"
                      >
                        <Download className="w-3 h-3" />
                        <span>Exportar JSON</span>
                      </button>
                      <button
                        onClick={handleExportCsv}
                        className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 rounded text-[11px] font-medium text-emerald-200 flex items-center space-x-1 transition"
                        title="Descargar archivo CSV"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        <span>Exportar CSV</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-auto mt-2 border border-slate-800 rounded-lg">
                  {!sqlResult ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-slate-500 text-xs">
                      <Terminal className="w-8 h-8 mb-2 opacity-50" />
                      <p>Escribe una consulta SQL y presiona "Ejecutar SQL".</p>
                    </div>
                  ) : sqlResult.error ? (
                    <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs font-mono">
                      <p className="font-bold flex items-center gap-1.5 text-rose-400 mb-1">
                        <AlertTriangle className="w-4 h-4" /> ERROR POSTGRESQL:
                      </p>
                      {sqlResult.error}
                    </div>
                  ) : sqlResult.rows.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-mono">
                      La sentencia SQL se ejecutó exitosamente. Filas afectadas: {sqlResult.rowCount ?? 0}.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs text-slate-200 border-collapse">
                      <thead className="bg-slate-950/90 sticky top-0 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-mono">
                        <tr>
                          {sqlResult.columns.map(col => (
                            <th key={col} className="py-2 px-3 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {sqlResult.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 transition">
                            {sqlResult.columns.map((col, cIdx) => {
                              const val = row[col];
                              let displayVal = String(val);
                              if (val === null || val === undefined) displayVal = 'NULL';
                              else if (typeof val === 'object') displayVal = JSON.stringify(val);

                              return (
                                <td key={cIdx} className="py-1.5 px-3 truncate max-w-[250px]" title={displayVal}>
                                  {val === null || val === undefined ? (
                                    <span className="text-slate-500 italic">null</span>
                                  ) : typeof val === 'object' ? (
                                    <span className="text-amber-300 font-sans">{displayVal}</span>
                                  ) : (
                                    displayVal
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Side-Panel: History Viewer */}
            {showHistoryPanel && (
              <div className="w-full md:w-72 bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 flex flex-col space-y-2 shrink-0 overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-1.5">
                    <History className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">Historial de Consultas</span>
                  </div>
                  {queryHistory.length > 0 && (
                    <button
                      onClick={clearQueryHistory}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition"
                      title="Limpiar historial"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {queryHistory.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-slate-500">
                      No hay consultas en el historial reciente.
                    </div>
                  ) : (
                    queryHistory.map(item => (
                      <div
                        key={item.id}
                        className={`p-2 rounded-lg border text-[11px] font-mono transition cursor-pointer ${
                          item.success
                            ? 'bg-slate-950/60 border-slate-800 hover:border-blue-500/50 hover:bg-slate-900'
                            : 'bg-rose-950/20 border-rose-900/40 hover:border-rose-500/50'
                        }`}
                        onClick={() => {
                          setCustomSql(item.query);
                          handleExecuteSql(item.query);
                        }}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-slate-500" /> {item.timestamp}
                          </span>
                          <span className={item.success ? 'text-emerald-400' : 'text-rose-400'}>
                            {item.success ? `${item.executionTimeMs}ms • ${item.rowCount} filas` : 'Error'}
                          </span>
                        </div>
                        <div className="text-slate-200 truncate font-semibold">
                          {item.query}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 3: RESPALDO Y RESTAURACIÓN POR TABLA ESPECÍFICA */}
        {subTab === 'table_backup' && (
          <div className="flex-1 bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 overflow-y-auto space-y-5">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-blue-400" />
                Respaldo y Restauración Selectiva por Tabla SQL
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Permite exportar o restaurar una sola tabla específica (ejemplo: tickets históricos, logs de auditoría o plazas) sin tener que realizar un volcado completo de toda la base de datos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Sección 1: Exportar Respaldo de Tabla */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                    <Download className="w-4 h-4 text-emerald-400" />
                    <h5 className="font-bold text-xs text-white">1. Exportar / Descargar Respaldo de Tabla</h5>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Selecciona la Tabla a Respaldar:</label>
                    <select
                      value={targetBackupTable}
                      onChange={(e) => setTargetBackupTable(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                    >
                      {tables.map(tbl => (
                        <option key={tbl.tableName} value={tbl.tableName}>
                          {tbl.tableName} ({tbl.exactCount} registros • {tbl.totalSize})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Formato de Exportación:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setBackupFormat('json')}
                        className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center space-x-2 transition ${
                          backupFormat === 'json'
                            ? 'bg-blue-600/30 border-blue-500 text-blue-200 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>Formato JSON (.json)</span>
                      </button>
                      <button
                        onClick={() => setBackupFormat('sql')}
                        className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center space-x-2 transition ${
                          backupFormat === 'sql'
                            ? 'bg-blue-600/30 border-blue-500 text-blue-200 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5 text-blue-400" />
                        <span>Script SQL (.sql)</span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDownloadTableBackup}
                  disabled={!status?.connected}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-2 shadow-md transition disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Respaldo de '{targetBackupTable}' ({backupFormat.toUpperCase()})</span>
                </button>
              </div>

              {/* Sección 2: Importar / Restaurar Tabla */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                    <Upload className="w-4 h-4 text-blue-400" />
                    <h5 className="font-bold text-xs text-white">2. Restaurar / Importar Registros a Tabla</h5>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tabla Destino en PostgreSQL:</label>
                    <select
                      value={targetBackupTable}
                      onChange={(e) => setTargetBackupTable(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                    >
                      {tables.map(tbl => (
                        <option key={tbl.tableName} value={tbl.tableName}>
                          {tbl.tableName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Estrategia de Conflicto:</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center space-x-2 bg-slate-900 p-2 rounded-lg border border-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="restore_mode"
                          checked={restoreMode === 'upsert'}
                          onChange={() => setRestoreMode('upsert')}
                          className="text-blue-500"
                        />
                        <span className="text-slate-300">Actualizar existentes (UPSERT)</span>
                      </label>
                      <label className="flex items-center space-x-2 bg-slate-900 p-2 rounded-lg border border-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="restore_mode"
                          checked={restoreMode === 'skip_existing'}
                          onChange={() => setRestoreMode('skip_existing')}
                          className="text-blue-500"
                        />
                        <span className="text-slate-300">Omitir duplicados</span>
                      </label>
                    </div>
                  </div>

                  {/* Selector de Archivo */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-3 border-2 border-dashed border-slate-700 hover:border-blue-500/70 rounded-xl bg-slate-900/60 text-center transition flex flex-col items-center justify-center space-y-1"
                    >
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-300">
                        {restoreFile ? restoreFile.name : 'Seleccionar archivo JSON de respaldo'}
                      </span>
                      {restorePreviewRecords && (
                        <span className="text-[10px] text-emerald-400 font-mono">
                          ✓ {restorePreviewRecords.length} registros listos para restaurar
                        </span>
                      )}
                    </button>
                  </div>

                  {restoreFeedback && (
                    <div className={`p-2.5 rounded-lg text-xs font-mono ${
                      restoreFeedback.success ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200' : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
                    }`}>
                      {restoreFeedback.message}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleExecuteRestoreTable}
                  disabled={!restorePreviewRecords || restorePreviewRecords.length === 0 || isRestoringTable || !status?.connected}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-2 shadow-md transition disabled:opacity-50"
                >
                  <Upload className={`w-4 h-4 ${isRestoringTable ? 'animate-spin' : ''}`} />
                  <span>{isRestoringTable ? 'Restaurando...' : `Restaurar ${restorePreviewRecords?.length || 0} Registros en '${targetBackupTable}'`}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: ESTRUCTURA & DDL */}
        {subTab === 'structure' && (
          <div className="flex-1 bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 overflow-y-auto space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Definición de Columnas de Tablas SQL (Information Schema)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tables.map(tbl => (
                <div key={tbl.tableName} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-xs text-blue-300 font-mono">{tbl.tableName}</span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                      {tbl.columns.length} columnas • {tbl.totalSize}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] font-mono text-slate-300">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800/80">
                          <th className="py-1">Columna</th>
                          <th className="py-1">Tipo</th>
                          <th className="py-1">Nullable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {tbl.columns.map(col => (
                          <tr key={col.column_name}>
                            <td className="py-1 font-semibold text-slate-200">{col.column_name}</td>
                            <td className="py-1 text-amber-400/90">{col.data_type}</td>
                            <td className="py-1 text-slate-400">{col.is_nullable}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 5: MANTENIMIENTO */}
        {subTab === 'sync' && (
          <div className="flex-1 bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 overflow-y-auto space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Mantenimiento y Optimización de Base de Datos PostgreSQL
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tarjeta 1: Optimización VACUUM */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <h5 className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Optimizar Tablas (VACUUM ANALYZE)
                  </h5>
                  <p className="text-xs text-slate-400 mt-1">
                    Limpia registros muertos, reorganiza el espacio en disco y actualiza las estadísticas del planificador de PostgreSQL para que las consultas sean más veloces.
                  </p>
                </div>
                <button
                  onClick={() => handleMaintenance('vacuum')}
                  className="px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-200 rounded-lg text-xs font-semibold transition"
                >
                  Ejecutar VACUUM ANALYZE
                </button>
              </div>

              {/* Tarjeta 2: Reindexar */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <h5 className="font-bold text-xs text-blue-300 flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4" /> Reconstruir Índices (REINDEX)
                  </h5>
                  <p className="text-xs text-slate-400 mt-1">
                    Reconstruye todos los índices de búsqueda de claves primarias, placas de vehículos y números de tickets para acelerar el escaneo con pistolas de códigos.
                  </p>
                </div>
                <button
                  onClick={() => handleMaintenance('reindex')}
                  className="px-3 py-2 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-blue-200 rounded-lg text-xs font-semibold transition"
                >
                  Ejecutar REINDEX SCHEMA
                </button>
              </div>

              {/* Tarjeta 3: Respaldos SQL */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <h5 className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                    <Download className="w-4 h-4" /> Volcado SQL Completo (.sql)
                  </h5>
                  <p className="text-xs text-slate-400 mt-1">
                    Genera un archivo de script SQL estándar con todas las sentencias INSERT listas para restaurar en cualquier servidor PostgreSQL con pgAdmin o psql.
                  </p>
                </div>
                <button
                  onClick={handleDownloadFullSqlDump}
                  className="px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar Archivo .sql Completo
                </button>
              </div>

              {/* Tarjeta 4: Sincronización Masiva */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <h5 className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                    <Upload className="w-4 h-4" /> Volcar IndexedDB a PostgreSQL
                  </h5>
                  <p className="text-xs text-slate-400 mt-1">
                    Toma todos los datos guardados en la memoria del navegador de este equipo y los migra a las tablas relacionales de PostgreSQL.
                  </p>
                </div>
                <button
                  onClick={handleSyncIndexedDbToPostgres}
                  disabled={isSyncing}
                  className="px-3 py-2 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" /> {isSyncing ? 'Sincronizando...' : 'Ejecutar Sincronización'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal / Popup de Detalle de Fila */}
      {selectedRowDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-sm text-white font-mono flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                Detalle del Registro ({selectedTable})
              </h4>
              <button
                onClick={() => setSelectedRowDetail(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-slate-300 bg-slate-950/80">
              <pre className="whitespace-pre-wrap">{JSON.stringify(selectedRowDetail, null, 2)}</pre>
            </div>
            <div className="p-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedRowDetail(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg"
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
