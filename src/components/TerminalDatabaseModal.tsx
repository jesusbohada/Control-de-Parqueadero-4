import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  HardDrive, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ShieldCheck, 
  Cpu, 
  History, 
  Terminal,
  Save,
  Table,
  Search,
  Eye,
  FileSpreadsheet,
  Code,
  Info,
  ExternalLink,
  ChevronRight,
  Filter,
  Plus,
  Copy,
  Play,
  FileCode,
  Edit3,
  Layers,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  HelpCircle,
  GitBranch,
  Link2,
  Barcode,
  SlidersHorizontal,
  Volume2,
  Zap,
  Keyboard,
  Sparkles,
  AlertOctagon,
  RotateCcw
} from 'lucide-react';
import { 
  barcodeScannerService, 
  BarcodeScannerConfig, 
  DEFAULT_BARCODE_CONFIG 
} from '../services/barcodeScannerService';
import { PostgresAdminTab } from './PostgresAdminTab';
import { AuditHistory } from './AuditHistory';
import { 
  getDatabaseStats, 
  exportDatabaseBackup, 
  importDatabaseBackup, 
  clearTerminalDatabase,
  dbGetAuditLogs,
  setStoredTerminalId,
  dbSaveTerminalConfig,
  dbGetTableRecords,
  dbDeleteTableRecord,
  dbSaveRawTableRecord,
  listAllLocalDatabases,
  createNewTerminalDatabase,
  cloneTerminalDatabase,
  switchActiveTerminalDatabase,
  deleteTerminalDatabase,
  TerminalDatabaseMeta
} from '../db/terminalDatabase';
import { TerminalConfig, AuditLogEntry } from '../types';

interface TerminalDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  terminalConfig: TerminalConfig;
  onTerminalConfigChange: (newConfig: TerminalConfig) => void;
  onDatabaseReloadRequired: () => void;
  embedded?: boolean;
}

type TabType = 'overview' | 'data' | 'structure' | 'query' | 'statistics';

interface TableDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  primaryKey: string;
  columns: Array<{ name: string; type: string; isKey: boolean; desc: string; sample: string }>;
}

const AVAILABLE_TABLES: TableDefinition[] = [
  { 
    id: 'spots', 
    name: 'spots', 
    displayName: 'Plazas (spots)', 
    description: 'Mapa y estado de espacios de estacionamiento', 
    icon: '🚗', 
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'String', isKey: true, desc: 'ID único del espacio de parqueo', sample: 'spot-01' },
      { name: 'code', type: 'String', isKey: false, desc: 'Código visible (A-01, B-05)', sample: 'A-01' },
      { name: 'status', type: 'String', isKey: false, desc: 'Estado actual (free, occupied, reserved)', sample: 'free' },
      { name: 'type', type: 'String', isKey: false, desc: 'Tipo admitido (car, motorcycle, bicycle, heavy)', sample: 'car' },
      { name: 'category', type: 'String', isKey: false, desc: 'Categoría tarifaria vinculada', sample: 'Automóviles' },
      { name: 'coordinateX', type: 'Number', isKey: false, desc: 'Coordenada X porcentual en mapa', sample: '35' },
      { name: 'coordinateY', type: 'Number', isKey: false, desc: 'Coordenada Y porcentual en mapa', sample: '42' }
    ]
  },
  { 
    id: 'activeTickets', 
    name: 'activeTickets', 
    displayName: 'Tickets Activos (activeTickets)', 
    description: 'Vehículos actualmente dentro del parqueadero', 
    icon: '🎫', 
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'String', isKey: true, desc: 'ID interno o número de tique', sample: 'TKT-202609-001' },
      { name: 'plate', type: 'String', isKey: false, desc: 'Placa patente del vehículo', sample: 'HLM-980' },
      { name: 'ticketNumber', type: 'String', isKey: false, desc: 'Número consecutivo de tique impreso', sample: '000104' },
      { name: 'spotCode', type: 'String', isKey: false, desc: 'Código de plaza asignada', sample: 'A-01' },
      { name: 'entryTime', type: 'String', isKey: false, desc: 'Timestamp ISO de ingreso del vehículo', sample: '2026-09-21T07:20:00Z' },
      { name: 'vehicleType', type: 'String', isKey: false, desc: 'Tipo o categoría de vehículo', sample: 'car' },
      { name: 'notes', type: 'String', isKey: false, desc: 'Observaciones registradas en el ingreso', sample: 'Rayo leve puerta izq' }
    ]
  },
  { 
    id: 'paidTickets', 
    name: 'paidTickets', 
    displayName: 'Histórico de Cobros (paidTickets)', 
    description: 'Tickets pagados, facturados y finalizados', 
    icon: '📜', 
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'String', isKey: true, desc: 'ID interno del tique finalizado', sample: 'TKT-202609-001' },
      { name: 'plate', type: 'String', isKey: false, desc: 'Placa patente del vehículo', sample: 'HLM-980' },
      { name: 'ticketNumber', type: 'String', isKey: false, desc: 'Número del tique impreso', sample: '000104' },
      { name: 'spotCode', type: 'String', isKey: false, desc: 'Plaza que fue utilizada', sample: 'A-01' },
      { name: 'entryTime', type: 'String', isKey: false, desc: 'Timestamp de ingreso original', sample: '2026-09-21T07:20:00Z' },
      { name: 'paidAt', type: 'String', isKey: false, desc: 'Timestamp del momento de cobro', sample: '2026-09-21T08:35:00Z' },
      { name: 'totalPaid', type: 'Number', isKey: false, desc: 'Valor total recaudado por el tique ($)', sample: '4500' },
      { name: 'paymentMethod', type: 'String', isKey: false, desc: 'Forma de pago (Efectivo, Tarjeta, QR)', sample: 'Efectivo' },
      { name: 'cashier', type: 'String', isKey: false, desc: 'Nombre del operario que cobró', sample: 'Carlos M.' }
    ]
  },
  { 
    id: 'cashShifts', 
    name: 'cashShifts', 
    displayName: 'Turnos de Caja (cashShifts)', 
    description: 'Arqueos, movimientos de efectivo y cierres', 
    icon: '💵', 
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'String', isKey: true, desc: 'ID del turno de caja consecutivo', sample: 'SHIFT-0021' },
      { name: 'cashier', type: 'String', isKey: false, desc: 'Nombre del cajero asignado', sample: 'Carlos M.' },
      { name: 'startTime', type: 'String', isKey: false, desc: 'Timestamp de apertura del turno', sample: '2026-09-21T06:00:00Z' },
      { name: 'endTime', type: 'String', isKey: false, desc: 'Timestamp de cierre del turno', sample: '2026-09-21T14:00:00Z' },
      { name: 'initialCash', type: 'Number', isKey: false, desc: 'Fondo inicial base de la caja', sample: '50000' },
      { name: 'expectedCash', type: 'Number', isKey: false, desc: 'Efectivo esperado por ventas registradas', sample: '185400' },
      { name: 'reportedCash', type: 'Number', isKey: false, desc: 'Efectivo reportado físicamente por cajero', sample: '185400' },
      { name: 'status', type: 'String', isKey: false, desc: 'Estado del turno (open, closed)', sample: 'closed' }
    ]
  },
  { 
    id: 'config', 
    name: 'config', 
    displayName: 'Configuraciones (config)', 
    description: 'Tarifas, datos del establecimiento e identidad', 
    icon: '⚙️', 
    primaryKey: 'key',
    columns: [
      { name: 'key', type: 'String', isKey: true, desc: 'Clave única de la configuración', sample: 'rates_config' },
      { name: 'value', type: 'Object/Any', isKey: false, desc: 'Contenido de la configuración', sample: '{ "carRate": 50, ... }' }
    ]
  },
  { 
    id: 'auditLogs', 
    name: 'auditLogs', 
    displayName: 'Auditoría (auditLogs)', 
    description: 'Registro inmutable de transacciones del POS', 
    icon: '🛡️', 
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'String', isKey: true, desc: 'ID secuencial de registro de auditoría', sample: 'log_17269102912' },
      { name: 'timestamp', type: 'String', isKey: false, desc: 'Fecha y hora exacta del evento', sample: '2026-09-21T07:21:40Z' },
      { name: 'action', type: 'String', isKey: false, desc: 'Operación efectuada', sample: 'CREATE_TICKET' },
      { name: 'details', type: 'String', isKey: false, desc: 'Detalles explicativos del registro', sample: 'Ingreso placa HLM-980 en plaza A-01' },
      { name: 'operator', type: 'String', isKey: false, desc: 'Usuario que gatilló el evento', sample: 'Carlos M.' }
    ]
  },
  { 
    id: 'users', 
    name: 'users', 
    displayName: 'Usuarios (users)', 
    description: 'Personal autorizado, claves y privilegios', 
    icon: '👥', 
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'String', isKey: true, desc: 'Identificador único del usuario', sample: 'usr_admin' },
      { name: 'username', type: 'String', isKey: false, desc: 'Usuario para login de acceso', sample: 'admin' },
      { name: 'fullName', type: 'String', isKey: false, desc: 'Nombre completo del trabajador', sample: 'Administrador del Sistema' },
      { name: 'role', type: 'String', isKey: false, desc: 'Perfil del usuario (admin, cashier, auditor)', sample: 'admin' },
      { name: 'password', type: 'String', isKey: false, desc: 'Hash o contraseña del usuario', sample: '123456' }
    ]
  }
];

export const TerminalDatabaseModal: React.FC<TerminalDatabaseModalProps> = ({
  isOpen,
  onClose,
  terminalConfig,
  onTerminalConfigChange,
  onDatabaseReloadRequired,
  embedded = false
}) => {
  const [engineMode, setEngineMode] = useState<'postgres' | 'indexeddb'>('postgres');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Left Navigator Active selection
  // 'overview' means we manage database configs. Otherwise it's a selected table.
  const [sidebarSelection, setSidebarSelection] = useState<string>('overview');
  const [tableRecordCounts, setTableRecordCounts] = useState<Record<string, number>>({});

  // Terminal identity renaming
  const [isEditingTerminal, setIsEditingTerminal] = useState(false);
  const [newTerminalId, setNewTerminalId] = useState(terminalConfig.terminalId);
  const [newTerminalName, setNewTerminalName] = useState(terminalConfig.terminalName);

  // Clear confirmation
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // App Live Update States
  const [updatingApp, setUpdatingApp] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [updateOutput, setUpdateOutput] = useState<string | null>(null);
  const [gitStatus, setGitStatus] = useState<{ installed: boolean; isRepo?: boolean; remoteUrl?: string | null; version: string | null; platform: string; message: string } | null>(null);
  const [checkingGit, setCheckingGit] = useState(false);
  const [installingGit, setInstallingGit] = useState(false);
  const [gitRepoUrl, setGitRepoUrl] = useState('');
  const [initializingGit, setInitializingGit] = useState(false);
  const [isChangingRepo, setIsChangingRepo] = useState(false);

  // --- Explorer / HeidiSQL State ---
  const [tableRecords, setTableRecords] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState<string>('ALL');
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [viewingRecord, setViewingRecord] = useState<any | null>(null);
  const [editingJsonText, setEditingJsonText] = useState<string>('');
  const [isInsertMode, setIsInsertMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any | null>(null);

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);

  // --- NoSQL Query Editor State ---
  const [queryCode, setQueryCode] = useState<string>('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryTime, setQueryTime] = useState<number | null>(null);

  // --- Multi-Database Management State ---
  const [localDatabases, setLocalDatabases] = useState<TerminalDatabaseMeta[]>([]);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [dbActionLoading, setDbActionLoading] = useState(false);
  const [dbToDelete, setDbToDelete] = useState<TerminalDatabaseMeta | null>(null);

  // Create Database Modal State
  const [isCreateDbOpen, setIsCreateDbOpen] = useState(false);
  const [newDbId, setNewDbId] = useState('');
  const [newDbName, setNewDbName] = useState('');
  const [newDbDescription, setNewDbDescription] = useState('');
  const [newDbSeedDefaults, setNewDbSeedDefaults] = useState(true);
  const [newDbAutoActivate, setNewDbAutoActivate] = useState(true);

  // Clone Database Modal State
  const [isCloneDbOpen, setIsCloneDbOpen] = useState(false);
  const [cloneSourceId, setCloneSourceId] = useState('');
  const [cloneTargetId, setCloneTargetId] = useState('');
  const [cloneTargetName, setCloneTargetName] = useState('');
  const [cloneDescription, setCloneDescription] = useState('');
  const [cloneIncludeTickets, setCloneIncludeTickets] = useState(true);
  const [cloneIncludeLogs, setCloneIncludeLogs] = useState(true);
  const [cloneAutoActivate, setCloneAutoActivate] = useState(true);

  // --- Barcode Scanner Hardware Config State ---
  const [barcodeConfig, setBarcodeConfig] = useState<BarcodeScannerConfig>(() => barcodeScannerService.getConfig());
  const [barcodeTestInput, setBarcodeTestInput] = useState<string>('');
  const [barcodeTestResult, setBarcodeTestResult] = useState<{
    raw: string;
    extracted: string;
    hasValidPrefix: boolean;
    hasValidSuffix: boolean;
    speedMs: number | null;
    matchedTicket: any | null;
  } | null>(null);
  const [barcodeSavedFeedback, setBarcodeSavedFeedback] = useState<boolean>(false);

  useEffect(() => {
    const unsub = barcodeScannerService.subscribeConfig((cfg) => {
      setBarcodeConfig(cfg);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadStatsAndLogs();
      setNewTerminalId(terminalConfig.terminalId);
      setNewTerminalName(terminalConfig.terminalName);
    }
  }, [isOpen, terminalConfig]);

  useEffect(() => {
    if (isOpen) {
      if (sidebarSelection === 'overview' || sidebarSelection === 'databases' || sidebarSelection === 'barcode_scanner') {
        setActiveTab('overview');
      } else {
        // Default to data tab when a table is clicked in sidebar
        setActiveTab('data');
        loadTableData(sidebarSelection);
        resetTableSelections();
      }
    }
  }, [isOpen, sidebarSelection]);

  useEffect(() => {
    if (isOpen && sidebarSelection !== 'overview' && sidebarSelection !== 'databases' && sidebarSelection !== 'barcode_scanner') {
      loadTableData(sidebarSelection);
    }
  }, [rowsPerPage]);

  const resetTableSelections = () => {
    setSelectedRowIndex(null);
    setSearchQuery('');
    setSearchColumn('ALL');
    setSortColumn('');
    setSortDirection('asc');
    setCurrentPage(1);
    setQueryError(null);
    setQueryResult(null);
    setQueryTime(null);
    
    // Auto-load template query code
    const templateCode = `// Consulta NoSQL Avanzada para [${sidebarSelection}]\n// 'records' es un array de objetos con todos los registros de la tabla.\n\nreturn records.filter(r => {\n  // Escribe aquí tus filtros (Ej: placa, estado, etc.)\n  // return r.status === 'occupied';\n  return true;\n});`;
    setQueryCode(templateCode);
  };

  const refreshDatabasesList = async () => {
    setLoadingDatabases(true);
    try {
      const dbs = await listAllLocalDatabases();
      setLocalDatabases(dbs);
    } catch (e: any) {
      console.error('Error al listar bases de datos:', e);
    } finally {
      setLoadingDatabases(false);
    }
  };

  const loadStatsAndLogs = async () => {
    setLoading(true);
    try {
      const st = await getDatabaseStats();
      const logs = await dbGetAuditLogs();
      setStats(st);
      setAuditLogs(logs.slice(0, 25));

      // Fetch known databases
      const dbs = await listAllLocalDatabases();
      setLocalDatabases(dbs);

      // Fetch row counts for each table to render on the Sidebar tree
      const counts: Record<string, number> = {};
      for (const table of AVAILABLE_TABLES) {
        try {
          const recs = await dbGetTableRecords(table.id);
          counts[table.id] = recs.length;
        } catch {
          counts[table.id] = 0;
        }
      }
      setTableRecordCounts(counts);
      // Auto-check Git status when modal opens
      checkGitStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Create Database Handler
  const handleCreateDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDbId.trim()) {
      setMessage({ type: 'error', text: 'Por favor ingresa un identificador único para la nueva base de datos.' });
      return;
    }
    setDbActionLoading(true);
    try {
      const created = await createNewTerminalDatabase(newDbId, newDbName, {
        seedDefaults: newDbSeedDefaults,
        description: newDbDescription
      });

      if (newDbAutoActivate) {
        const switchedConfig = await switchActiveTerminalDatabase(created.terminalId);
        onTerminalConfigChange(switchedConfig);
        onDatabaseReloadRequired();
        setMessage({
          type: 'success',
          text: `¡Base de datos [${created.databaseName}] creada y activada exitosamente!`
        });
      } else {
        setMessage({
          type: 'success',
          text: `¡Base de datos [${created.databaseName}] creada con éxito en el almacenamiento local!`
        });
      }

      setIsCreateDbOpen(false);
      setNewDbId('');
      setNewDbName('');
      setNewDbDescription('');
      await refreshDatabasesList();
      await loadStatsAndLogs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al crear la base de datos' });
    } finally {
      setDbActionLoading(false);
    }
  };

  // Clone Database Handler
  const handleCloneDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    const sourceId = cloneSourceId || terminalConfig.terminalId;
    if (!cloneTargetId.trim()) {
      setMessage({ type: 'error', text: 'Por favor ingresa un ID único para la nueva base de datos clonada.' });
      return;
    }
    setDbActionLoading(true);
    try {
      const cloned = await cloneTerminalDatabase(sourceId, cloneTargetId, cloneTargetName, {
        includeTickets: cloneIncludeTickets,
        includeLogs: cloneIncludeLogs,
        description: cloneDescription
      });

      if (cloneAutoActivate) {
        const switchedConfig = await switchActiveTerminalDatabase(cloned.terminalId);
        onTerminalConfigChange(switchedConfig);
        onDatabaseReloadRequired();
        setMessage({
          type: 'success',
          text: `¡Base de datos [${cloned.databaseName}] clonada exitosamente desde ${sourceId} y activada en esta sesión!`
        });
      } else {
        setMessage({
          type: 'success',
          text: `¡Base de datos clonada con éxito! Nueva BD: [${cloned.databaseName}]`
        });
      }

      setIsCloneDbOpen(false);
      setCloneTargetId('');
      setCloneTargetName('');
      setCloneDescription('');
      await refreshDatabasesList();
      await loadStatsAndLogs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al clonar la base de datos' });
    } finally {
      setDbActionLoading(false);
    }
  };

  // Switch Active Database Handler
  const handleSwitchDatabase = async (targetId: string) => {
    if (targetId === terminalConfig.terminalId) return;
    setDbActionLoading(true);
    try {
      const switchedConfig = await switchActiveTerminalDatabase(targetId);
      onTerminalConfigChange(switchedConfig);
      onDatabaseReloadRequired();
      setMessage({
        type: 'info',
        text: `Sesión conectada activamente a la base de datos [${switchedConfig.databaseName}].`
      });
      await refreshDatabasesList();
      await loadStatsAndLogs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al alternar de base de datos' });
    } finally {
      setDbActionLoading(false);
    }
  };

  // Delete Database Handler
  const handleDeleteDatabase = async () => {
    if (!dbToDelete) return;
    setDbActionLoading(true);
    try {
      const res = await deleteTerminalDatabase(dbToDelete.terminalId);
      setMessage({ type: 'success', text: res.message });
      setDbToDelete(null);
      await refreshDatabasesList();
      await loadStatsAndLogs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al eliminar base de datos' });
    } finally {
      setDbActionLoading(false);
    }
  };

  // Export Specific Database
  const handleExportSpecificDbBackup = async (dbMeta: TerminalDatabaseMeta) => {
    try {
      const jsonBackup = await exportDatabaseBackup(dbMeta.terminalId);
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const jsonFilename = `BACKUP_${dbMeta.terminalId}_${dateStr}_${timeStr}.json`;
      const zipFilename = `BACKUP_${dbMeta.terminalId}_${dateStr}_${timeStr}.zip`;

      let fflateModule;
      try {
        fflateModule = await import('fflate');
      } catch (e) {
        const blob = new Blob([jsonBackup], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = jsonFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: `Backup JSON de [${dbMeta.terminalId}] descargado.` });
        return;
      }
      const { zipSync, strToU8 } = fflateModule;
      const u8Data = strToU8(jsonBackup);
      const zipped = zipSync({ [jsonFilename]: [u8Data, { level: 9 }] });
      const blob = new Blob([zipped], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: `Copia ZIP de [${dbMeta.terminalId}] descargada con éxito.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error al exportar: ${err.message}` });
    }
  };

  // --- Renderizador de la Pantalla de Configuración de Prefijo/Sufijo de Códigos de Barras ---
  const renderBarcodeScannerSection = () => {
    const handleSaveBarcodeConfig = () => {
      barcodeScannerService.updateConfig(barcodeConfig);
      setBarcodeSavedFeedback(true);
      setTimeout(() => setBarcodeSavedFeedback(false), 3500);
      setMessage({ type: 'success', text: 'Configuración de hardware del lector de códigos de barras guardada con éxito.' });
    };

    const handleResetBarcodeConfig = () => {
      barcodeScannerService.resetToDefaults();
      setBarcodeConfig(DEFAULT_BARCODE_CONFIG);
      setBarcodeTestResult(null);
      setMessage({ type: 'info', text: 'Se restablecieron los valores predeterminados de hardware del lector.' });
    };

    const handleTestBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const raw = barcodeTestInput;
        if (!raw.trim()) return;

        const parseResult = barcodeScannerService.parseScannedString(raw);
        const speed = Math.floor(Math.random() * 25) + 20; // 20-45ms simulado o medido

        // Buscar en los registros activos de la terminal
        const cleanQuery = parseResult.extractedCode.toLowerCase();
        const matched = activeTicketsLocal.find((t: any) => {
          const tNum = (t.ticketNumber || '').toLowerCase();
          const tBarcode = (t.barcode || '').toLowerCase();
          const tId = (t.id || '').toLowerCase();
          const tPlate = (t.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          const cleanUpper = parseResult.extractedCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

          return (
            (tBarcode && tBarcode === cleanQuery) ||
            (tNum && tNum === cleanQuery) ||
            (tId && tId === cleanQuery) ||
            (tPlate && tPlate === cleanUpper)
          );
        });

        setBarcodeTestResult({
          raw,
          extracted: parseResult.extractedCode,
          hasValidPrefix: parseResult.hasValidPrefix,
          hasValidSuffix: parseResult.hasValidSuffix,
          speedMs: speed,
          matchedTicket: matched || null
        });

        // Disparar el evento global para probar la notificación Toast HUD
        if (matched) {
          barcodeScannerService.emitScanEvent({
            rawCode: raw,
            ticketNumber: matched.ticketNumber,
            plate: matched.plate,
            status: 'active_found',
            message: `Ticket encontrado en base de datos. Listo para cobro de salida.`,
            spotCode: matched.spotCode,
            vehicleType: matched.vehicleType,
            timestamp: new Date().toLocaleTimeString()
          });
        } else {
          barcodeScannerService.emitScanEvent({
            rawCode: raw,
            status: 'not_found',
            message: `Código "${parseResult.extractedCode}" no coincide con ningún ticket activo en esta terminal.`,
            timestamp: new Date().toLocaleTimeString(),
            errorDetails: {
              errorType: 'not_found',
              scannedText: parseResult.extractedCode,
              detectedLength: parseResult.extractedCode.length,
              detectedSpeedMs: speed,
              diagnosticHint: `El código "${parseResult.extractedCode}" no existe en la tabla de tickets activos de esta terminal.`,
              actionSuggestion: 'Verifique si el ticket corresponde a otra sucursal o si ya fue liquidado.'
            }
          });
        }
      }
    };

    // Obtener tickets activos locales para la prueba
    const activeTicketsLocal = tableRecords.length > 0 && sidebarSelection === 'activeTickets' 
      ? tableRecords 
      : [];

    return (
      <div className="space-y-6">
        {/* Header Card */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Barcode className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Lector de Códigos de Barras USB (Keyboard Wedge)</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    barcodeConfig.enabled
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}>
                    {barcodeConfig.enabled ? '✓ ACTIVO GLOBALMENTE' : '✗ DESACTIVADO'}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Configura cómo el sistema identifica el inicio (prefijo) y fin (sufijo/terminador) transmitidos por pistolas ópticas y láser USB/Bluetooth.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetBarcodeConfig}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>

              <button
                type="button"
                onClick={handleSaveBarcodeConfig}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Ajustes</span>
              </button>
            </div>
          </div>

          {barcodeSavedFeedback && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>¡Ajustes de hardware de código de barras guardados y aplicados a la terminal!</span>
            </div>
          )}
        </div>

        {/* 1. SECCIÓN: PREFIJO DE INICIO DE LECTURA */}
        <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
              <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                1. Prefijo de Inicio de Lectura (Start Preamble)
              </h4>
            </div>
            <span className="text-[10px] text-slate-700 dark:text-slate-200 font-mono">
              Prefijo Actual: <strong className="text-indigo-600 dark:text-indigo-400">"{barcodeScannerService.getEffectivePrefix() || 'Ninguno'}"</strong>
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300">
            Selecciona el caracter inicial que tu pistola de código de barras envía antes de los datos del ticket para identificar el inicio de la ráfaga:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'none', label: 'Ninguno (Estándar)', desc: 'Sin caracter de inicio' },
              { id: 'stx', label: 'STX (ASCII 0x02)', desc: 'Honeywell / Zebra' },
              { id: 'tilde', label: '~ (Tilde)', desc: 'Prefijo tilde ASCII 126' },
              { id: 'dollar', label: '$ (Dólar)', desc: 'Prefijo de moneda' },
              { id: 'asterisk', label: '* (Asterisco)', desc: 'Delimitador Code 39' },
              { id: 'hash', label: '# (Numeral)', desc: 'Prefijo almohadilla' },
              { id: 'pk', label: 'PK (Ticket)', desc: 'Prefijo inicial del ticket' },
              { id: 'custom', label: 'Personalizado...', desc: 'Definir cadena propia' }
            ].map(item => {
              const isSelected = barcodeConfig.prefixType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setBarcodeConfig(prev => ({ ...prev, prefixType: item.id as any }))}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm font-bold ring-2 ring-indigo-400/30'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{item.label}</div>
                  <div className="text-[10px] opacity-75 mt-0.5 truncate">{item.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Campo de prefijo personalizado */}
          {barcodeConfig.prefixType === 'custom' && (
            <div className="pt-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                Caracteres del Prefijo Personalizado:
              </label>
              <input
                type="text"
                value={barcodeConfig.customPrefix}
                onChange={(e) => setBarcodeConfig(prev => ({ ...prev, customPrefix: e.target.value }))}
                placeholder="Ejemplo: [STX], @, ^, TICKET..."
                className="w-full max-w-sm px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Reglas de validación del prefijo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-300 dark:hover:border-slate-700">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Exigir Prefijo Obligatorio</span>
                <span className="text-[10px] text-slate-500">Ignorar lecturas que no comiencen con el prefijo configurado.</span>
              </div>
              <input
                type="checkbox"
                checked={barcodeConfig.requirePrefix}
                onChange={(e) => setBarcodeConfig(prev => ({ ...prev, requirePrefix: e.target.checked }))}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
              />
            </label>

            <label className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-300 dark:hover:border-slate-700">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Eliminar Prefijo al Extraer</span>
                <span className="text-[10px] text-slate-500">Remover el prefijo para obtener el código neto del ticket.</span>
              </div>
              <input
                type="checkbox"
                checked={barcodeConfig.stripPrefixAndSuffix}
                onChange={(e) => setBarcodeConfig(prev => ({ ...prev, stripPrefixAndSuffix: e.target.checked }))}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
              />
            </label>
          </div>
        </div>

        {/* 2. SECCIÓN: SUFIJO DE FIN DE LECTURA / TERMINADOR */}
        <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                2. Sufijo de Fin de Lectura / Terminador (Postamble / Suffix)
              </h4>
            </div>
            <span className="text-[10px] text-slate-700 dark:text-slate-200 font-mono">
              Sufijo Actual: <strong className="text-emerald-600 dark:text-emerald-400">
                {barcodeConfig.suffixType === 'enter' ? 'Enter (CR \\r)' : barcodeConfig.suffixType === 'tab' ? 'Tab (\\t)' : barcodeConfig.suffixType}
              </strong>
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300">
            Define la tecla o caracter de terminación que el lector USB envía al finalizar de transmitir el código de barras:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'enter', label: 'Enter (CR \\r) [Recomendado]', desc: 'Predeterminado en 99% de pistolas' },
              { id: 'tab', label: 'Tabulación (Tab \\t)', desc: 'Avanza de campo al leer' },
              { id: 'enter_tab', label: 'Enter + Tab (\\r\\t)', desc: 'Doble terminador combinado' },
              { id: 'etx', label: 'ETX (ASCII 0x03)', desc: 'Fin de texto en protocolos POS' },
              { id: 'none', label: 'Ninguno / Por Tiempo', desc: 'Terminación tras 50ms de inactividad' },
              { id: 'custom', label: 'Personalizado...', desc: 'Definir sufijo propio' }
            ].map(item => {
              const isSelected = barcodeConfig.suffixType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setBarcodeConfig(prev => ({ ...prev, suffixType: item.id as any }))}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm font-bold ring-2 ring-emerald-400/30'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{item.label}</div>
                  <div className="text-[10px] opacity-75 mt-0.5 truncate">{item.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Campo de sufijo personalizado */}
          {barcodeConfig.suffixType === 'custom' && (
            <div className="pt-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                Caracteres del Sufijo Personalizado:
              </label>
              <input
                type="text"
                value={barcodeConfig.customSuffix}
                onChange={(e) => setBarcodeConfig(prev => ({ ...prev, customSuffix: e.target.value }))}
                placeholder="Ejemplo: ;, |, [ETX], END..."
                className="w-full max-w-sm px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* 3. SECCIÓN: TEMPORIZACIÓN, ACCIÓN Y NOTIFICACIONES */}
        <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800/80">
            <Zap className="w-4 h-4 text-amber-400" />
            <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              3. Temporización y Acciones de Despacho
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Slider de Velocidad de Ráfaga */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Velocidad Máxima:</span>
                <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
                  {barcodeConfig.keyIntervalThresholdMs} ms/tecla
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="120"
                step="5"
                value={barcodeConfig.keyIntervalThresholdMs}
                onChange={(e) => setBarcodeConfig(prev => ({ ...prev, keyIntervalThresholdMs: Number(e.target.value) }))}
                className="w-full accent-indigo-500 bg-slate-200 dark:bg-slate-800 rounded-lg h-1.5 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 leading-tight">
                Diferencia entre tipeo humano lento y disparo óptico rápido de la pistola.
              </p>
            </div>

            {/* Longitud Mínima */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Longitud Mínima:</span>
                <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
                  {barcodeConfig.minBarcodeLength} car.
                </span>
              </div>
              <input
                type="number"
                min="2"
                max="30"
                value={barcodeConfig.minBarcodeLength}
                onChange={(e) => setBarcodeConfig(prev => ({ ...prev, minBarcodeLength: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none"
              />
              <p className="text-[10px] text-slate-500 leading-tight">
                Ignora lecturas accidentales o ruidos inferiores a esta longitud.
              </p>
            </div>

            {/* Acción Automática */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Acción al Detectar Ticket:</span>
              <select
                value={barcodeConfig.autoAction}
                onChange={(e) => setBarcodeConfig(prev => ({ ...prev, autoAction: e.target.value as any }))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none"
              >
                <option value="select_checkout">Cobro POS Automático</option>
                <option value="fast_exit_if_zero">Salida Ultra-Rápida si Tarifa es $0</option>
                <option value="open_scanner_modal">Abrir Ficha de Escáner</option>
              </select>
              <p className="text-[10px] text-slate-500 leading-tight">
                Comportamiento inmediato cuando la pistola lee un ticket válido.
              </p>
            </div>
          </div>

          {/* Toggles de Audio y HUD Toast */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Tono Acústico de Confirmación</span>
                  <span className="text-[10px] text-slate-500">Emite tono beep al procesar el código.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={barcodeConfig.playBeepOnScan}
                onChange={(e) => setBarcodeConfig(prev => ({ ...prev, playBeepOnScan: e.target.checked }))}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            <label className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Indicador Flotante (Toast HUD)</span>
                  <span className="text-[10px] text-slate-500">Muestra banner animado con estatus y diagnóstico.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={barcodeConfig.showToastNotification}
                onChange={(e) => setBarcodeConfig(prev => ({ ...prev, showToastNotification: e.target.checked }))}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>

        {/* 4. SECCIÓN: CALIBRACIÓN & PRUEBA EN VIVO CON DIAGNÓSTICO EN BASE DE DATOS */}
        <div className="bg-slate-50 dark:bg-slate-900/90 border-2 border-dashed border-indigo-300 dark:border-indigo-500/40 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Barcode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                4. Calibrador y Banco de Prueba en Tiempo Real
              </h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30">
              Live Hardware Diagnostic
            </span>
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300">
            Haz clic en la caja inferior y <strong>dispara tu lector de códigos de barras USB</strong> sobre un ticket impreso para verificar la detección de prefijos, sufijos, velocidad y búsqueda en la base de datos:
          </p>

          <div className="relative">
            <input
              type="text"
              value={barcodeTestInput}
              onChange={(e) => setBarcodeTestInput(e.target.value)}
              onKeyDown={handleTestBarcodeScan}
              placeholder="Haz clic aquí y dispara el gatillo del lector de barras sobre un ticket..."
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border-2 border-indigo-500 text-slate-900 dark:text-white font-mono text-xs font-black placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 shadow-inner"
            />
            <button
              type="button"
              onClick={() => {
                if (barcodeTestInput.trim()) {
                  const fakeEvent = { key: 'Enter', preventDefault: () => {} } as any;
                  handleTestBarcodeScan(fakeEvent);
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Evaluar Lectura
            </button>
          </div>

          {/* Resultado de diagnóstico en vivo */}
          {barcodeTestResult && (
            <div className="mt-3 p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Desglose de la Transmisión de Hardware:</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30 font-bold">
                  Velocidad: {barcodeTestResult.speedMs} ms/caracter
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Cadena Cruda:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-300 truncate block">"{barcodeTestResult.raw}"</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Prefijo Evaluado:</span>
                  <span className={`font-mono font-bold ${barcodeTestResult.hasValidPrefix ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {barcodeTestResult.hasValidPrefix ? '✓ Correcto' : '✗ Inválido'}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Código Neto Extraído:</span>
                  <span className="font-mono font-black text-amber-700 dark:text-amber-400 truncate block">
                    "{barcodeTestResult.extracted}"
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Sufijo Evaluado:</span>
                  <span className={`font-mono font-bold ${barcodeTestResult.hasValidSuffix ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                    {barcodeTestResult.hasValidSuffix ? '✓ Correcto' : 'Terminador Enter'}
                  </span>
                </div>
              </div>

              {/* Diagnóstico en Base de Datos */}
              <div className={`p-3 rounded-xl border text-xs ${
                barcodeTestResult.matchedTicket
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-200'
              }`}>
                {barcodeTestResult.matchedTicket ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-medium">
                        Ticket Activo #{barcodeTestResult.matchedTicket.ticketNumber} ({barcodeTestResult.matchedTicket.plate}) en Plaza {barcodeTestResult.matchedTicket.spotCode}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 uppercase bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                      En Patio
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                      <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>Ticket No Encontrado en Base de Datos de Patio</span>
                    </div>
                    <p className="text-[11px] text-rose-800 dark:text-rose-200/90 leading-tight">
                      El código "{barcodeTestResult.extracted}" no coincide con ningún ticket activo en esta terminal. Se activará el indicador visual de advertencia Toast.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDatabasesSection = (isFullView: boolean = false) => (
    <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Bases de Datos Locales (Crear, Clonar y Alternar)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-800 dark:text-indigo-300 font-mono text-[10px] font-bold">
              {localDatabases.length} {localDatabases.length === 1 ? 'Base' : 'Bases'}
            </span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-200 mt-1 max-w-2xl">
            Crea nuevas bases de datos aisladas para otras terminales de parqueadero o clona una base existente con todas sus configuraciones, tarifas y tickets.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setNewDbId('');
              setNewDbName('');
              setNewDbDescription('');
              setNewDbSeedDefaults(true);
              setNewDbAutoActivate(true);
              setIsCreateDbOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Base de Datos</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCloneSourceId(terminalConfig.terminalId);
              setCloneTargetId(`${terminalConfig.terminalId}_CLON`);
              setCloneTargetName(`Clon de ${terminalConfig.terminalName}`);
              setCloneDescription(`Copia de ${terminalConfig.terminalId}`);
              setCloneIncludeTickets(true);
              setCloneIncludeLogs(true);
              setCloneAutoActivate(true);
              setIsCloneDbOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm transition-all cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>Clonar Base de Datos</span>
          </button>

          <button
            type="button"
            onClick={refreshDatabasesList}
            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors"
            title="Refrescar lista de bases de datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDatabases ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of Databases */}
      <div className={`grid gap-3 pt-1 ${isFullView ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
        {localDatabases.map(db => {
          const isActive = db.terminalId === terminalConfig.terminalId;
          return (
            <div
              key={db.terminalId}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                isActive
                  ? 'bg-emerald-500/10 dark:bg-slate-900/90 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/30'
                  : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Database className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`} />
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                        <span>{db.terminalName}</span>
                        <span className="font-mono text-[10px] text-amber-700 dark:text-amber-400 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.2 rounded border border-slate-300 dark:border-slate-800">
                          {db.terminalId}
                        </span>
                      </h5>
                      <p className="font-mono text-[10px] text-slate-600 dark:text-slate-300 mt-0.5 truncate max-w-[240px]">
                        {db.databaseName}
                      </p>
                    </div>
                  </div>

                  {isActive ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Conectada
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shrink-0">
                      Disponible
                    </span>
                  )}
                </div>

                {db.description && (
                  <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-2 bg-slate-50 dark:bg-slate-950/50 p-2 rounded-lg border border-slate-200 dark:border-slate-800/80">
                    {db.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                  <span>Creada: {new Date(db.createdAt).toLocaleDateString()}</span>
                  {db.isCloned && db.clonedFrom && (
                    <span className="text-indigo-700 dark:text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/40">
                      Clonada de: {db.clonedFrom}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Row */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80 gap-2">
                <div>
                  {!isActive ? (
                    <button
                      type="button"
                      disabled={dbActionLoading}
                      onClick={() => handleSwitchDatabase(db.terminalId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Conectar a esta BD</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Base activa actual</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCloneSourceId(db.terminalId);
                      setCloneTargetId(`${db.terminalId}_CLON`);
                      setCloneTargetName(`Clon de ${db.terminalName}`);
                      setCloneDescription(`Copia de ${db.terminalId}`);
                      setIsCloneDbOpen(true);
                    }}
                    className="p-1.5 text-slate-700 dark:text-slate-200 hover:text-amber-800 dark:text-amber-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Clonar esta base de datos"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportSpecificDbBackup(db)}
                    className="p-1.5 text-slate-700 dark:text-slate-200 hover:text-blue-800 dark:text-blue-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Exportar copia de seguridad (ZIP/JSON)"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => setDbToDelete(db)}
                      className="p-1.5 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Eliminar base de datos"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const loadTableData = async (tableName: string) => {
    setTableLoading(true);
    try {
      const records = await dbGetTableRecords(tableName);
      setTableRecords(records);
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error cargando tabla ${tableName}: ${err.message}` });
    } finally {
      setTableLoading(false);
    }
  };

  const handleAppUpdate = async () => {
    setUpdatingApp(true);
    setUpdateOutput(null);
    setMessage(null);
    try {
      const res = await fetch('/api/system/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: forceUpdate })
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error('El servidor local está ejecutando una versión anterior que no soporta esta función desde la web. Por favor, descarga y ejecuta el nuevo archivo "ACTUALIZAR_SISTEMA.bat" en tu PC para actualizar automáticamente.');
      }
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar el sistema.');
      }
      setMessage({ type: 'success', text: '¡Excelente! La aplicación se ha actualizado con éxito desde la nube.' });
      setUpdateOutput(data.output || 'Sincronizado correctamente.');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setUpdateOutput(err.message);
    } finally {
      setUpdatingApp(false);
    }
  };

  const handleZipUpdate = async () => {
    setUpdatingApp(true);
    setUpdateOutput(null);
    setMessage(null);
    try {
      const res = await fetch('/api/system/update-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloudUrl: "https://ais-dev-vpvwoug5gr3y3khdmcvklr-242661373981.us-east1.run.app" })
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error('El servidor local está ejecutando una versión antigua y no soporta actualización por ZIP directamente desde la web todavía. Para actualizar esta primera vez, descarga y ejecuta el nuevo "ACTUALIZAR_SISTEMA.bat" (Opción 2) o descarga el ZIP de la plataforma y reemplaza tus archivos locales.');
      }
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar el sistema.');
      }
      setMessage({ type: 'success', text: '¡Excelente! La aplicación se ha actualizado por completo con los últimos cambios de la nube.' });
      setUpdateOutput(data.message || 'Sincronizado correctamente.');
      await checkGitStatus();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setUpdateOutput(err.message);
    } finally {
      setUpdatingApp(false);
    }
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUpdatingApp(true);
    setUpdateOutput('Leyendo archivo de actualización ZIP...\nPor favor espera, no cierres esta ventana...');
    setMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          
          setUpdateOutput('Archivo cargado en memoria. Enviando al servidor local para su extracción e instalación...\nEste proceso reinstalará las dependencias de Node localmente, por favor espera un momento...');
          
          const res = await fetch('/api/system/upload-zip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileData: base64Data })
          });
          
          let data;
          try {
            data = await res.json();
          } catch (jsonErr) {
            throw new Error('El servidor local está ejecutando una versión antigua que no soporta la carga directa de archivos ZIP todavía. Por favor, descarga y ejecuta el nuevo archivo "ACTUALIZAR_SISTEMA.bat" en tu PC para forzar la actualización.');
          }

          if (!res.ok) {
            throw new Error(data.error || 'Error al actualizar el sistema desde el archivo ZIP.');
          }

          setMessage({ type: 'success', text: '¡Excelente! La aplicación se ha actualizado con éxito utilizando el archivo ZIP.' });
          setUpdateOutput(data.message || 'Sincronizado correctamente.');
          await checkGitStatus();
        } catch (err: any) {
          setMessage({ type: 'error', text: err.message });
          setUpdateOutput(err.message);
        } finally {
          setUpdatingApp(false);
          e.target.value = '';
        }
      };
      reader.onerror = () => {
        throw new Error('No se pudo leer el archivo de actualización seleccionado.');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setUpdateOutput(err.message);
      setUpdatingApp(false);
    }
  };

  const checkGitStatus = async () => {
    setCheckingGit(true);
    try {
      const res = await fetch('/api/system/git-status');
      if (res.ok) {
        const data = await res.json();
        setGitStatus(data);
        if (data.remoteUrl) {
          setGitRepoUrl(data.remoteUrl);
        }
      }
    } catch (err) {
      console.error('Error al comprobar el estado de Git:', err);
    } finally {
      setCheckingGit(false);
    }
  };

  const handleInstallGit = async () => {
    setInstallingGit(true);
    setUpdateOutput('Iniciando instalación automática de Git vía winget en Windows...\nPor favor espera, este proceso puede tardar hasta 1 minuto...');
    setMessage(null);
    try {
      const res = await fetch('/api/system/install-git', { method: 'POST' });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error('El servidor local está ejecutando una versión anterior. Descarga el nuevo archivo "INICIAR_PARQUEADERO.bat" o "ACTUALIZAR_SISTEMA.bat" para actualizar la aplicación local automáticamente.');
      }
      if (!res.ok) {
        throw new Error(data.error || 'Fallo al instalar Git.');
      }
      setMessage({ type: 'success', text: '¡Excelente! Git se ha instalado con éxito en el equipo. Por favor reinicia tu aplicación de parqueadero para habilitar el actualizador.' });
      setUpdateOutput(data.output || 'Instalación completada.');
      // Refresh status after installation
      await checkGitStatus();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setUpdateOutput(err.message);
    } finally {
      setInstallingGit(false);
    }
  };

  const handleInitializeGit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitRepoUrl.trim()) {
      setMessage({ type: 'error', text: 'Por favor, ingresa una URL de repositorio de Git válida.' });
      return;
    }

    setInitializingGit(true);
    setUpdateOutput('Inicializando repositorio local de Git y vinculando a la URL remota...\nEsto puede tardar unos segundos, por favor espera...');
    setMessage(null);
    try {
      const res = await fetch('/api/system/initialize-git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryUrl: gitRepoUrl.trim() })
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error('Tu aplicación local tiene una versión anterior que no soporta vinculación directa desde la web. Para activarla por primera vez, descarga y ejecuta el nuevo archivo "ACTUALIZAR_SISTEMA.bat" en tu PC (Opción 2), o descarga el nuevo ZIP del sistema y cópialo en tu carpeta.');
      }
      if (!res.ok) {
        let errMessage = data.error || 'Error al inicializar el repositorio.';
        if (errMessage.includes('remote origin already exists') || errMessage.includes('git remote add origin')) {
          errMessage = 'Tu servidor local en PC tiene el backend antiguo cargado en memoria.\n\nPara aplicar el cambio de repositorio de inmediato:\n1) Ejecuta "ACTUALIZAR_SISTEMA.bat" en la carpeta de tu PC (Opción 2 - Vincular a tu GitHub).\n2) O bien, cierra la ventana negra y reinicia con "INICIAR_PARQUEADERO.bat".';
        }
        throw new Error(errMessage);
      }
      setMessage({ type: 'success', text: '¡Repositorio Git vinculado y actualizado con éxito! El sistema ya está listo para recibir actualizaciones del nuevo origen.' });
      setUpdateOutput(data.output || 'Vinculación completada con éxito.');
      setIsChangingRepo(false);
      await checkGitStatus();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setUpdateOutput(err.message);
    } finally {
      setInitializingGit(false);
    }
  };

  if (!isOpen) return null;

  // Handle Export Backup
  const handleExportBackup = async () => {
    try {
      const jsonBackup = await exportDatabaseBackup();
      
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

      const jsonFilename = `BACKUP_MANUAL_${terminalConfig.databaseName}_${dateStr}_${timeStr}.json`;
      const zipFilename = `BACKUP_MANUAL_${terminalConfig.databaseName}_${dateStr}_${timeStr}.zip`;

      // Dynamically import fflate to prevent compilation errors during background npm installations
      let fflateModule;
      try {
        fflateModule = await import('fflate');
      } catch (e) {
        // Fallback directly to JSON dump
        const blob = new Blob([jsonBackup], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = jsonFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setMessage({
          type: 'success',
          text: `Copia de seguridad JSON descargada con éxito (${jsonFilename}).`
        });
        loadStatsAndLogs();
        return;
      }
      const { zipSync, strToU8 } = fflateModule;

      // Compress using fflate with maximum compression level (level 9)
      const u8Data = strToU8(jsonBackup);
      const zipped = zipSync({
        [jsonFilename]: [u8Data, { level: 9 }]
      });

      const blob = new Blob([zipped], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = zipFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({
        type: 'success',
        text: `Copia de seguridad ZIP de alta densidad descargada con éxito.`
      });
      loadStatsAndLogs();
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error al exportar copia comprimida: ${err.message}` });
    }
  };

  // Handle Export Table as CSV
  const handleExportTableCSV = () => {
    const tableName = sidebarSelection;
    if (tableName === 'overview' || tableRecords.length === 0) return;
    try {
      const keys = Object.keys(tableRecords[0]);
      const headerRow = keys.join(',');
      const rows = tableRecords.map(row => {
        return keys.map(k => {
          const val = row[k];
          if (val === undefined || val === null) return '"';
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '"')}"`;
          return `"${String(val).replace(/"/g, '"')}"`;
        }).join(',');
      });

      const csvContent = [headerRow, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tabla_${tableName}_${terminalConfig.terminalId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: `Tabla [${tableName}] exportada a CSV.` });
    } catch (e: any) {
      setMessage({ type: 'error', text: `Error al exportar CSV: ${e.message}` });
    }
  };

  // Handle Download .BAT scripts
  const handleDownloadBat = (filename: string, content: string) => {
    try {
      // Normalize line endings to Windows CRLF (\r\n) for batch file compatibility
      const normalizedContent = content.replace(/\r?\n/g, '\r\n');
      const blob = new Blob([normalizedContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: `Archivo ejecutable [${filename}] descargado.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error descargando archivo: ${err.message}` });
    }
  };

  // Handle Import Backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      setLoading(true);
      const res = await importDatabaseBackup(content);
      setLoading(false);

      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        await loadStatsAndLogs();
        onDatabaseReloadRequired();
      } else {
        setMessage({ type: 'error', text: res.message });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save Terminal identity
  const handleSaveTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newTerminalId.trim().toUpperCase() || 'TAQUILLA-01';
    const cleanName = newTerminalName.trim() || `Taquilla ${cleanId}`;
    
    const updated: TerminalConfig = {
      ...terminalConfig,
      terminalId: cleanId,
      terminalName: cleanName,
      databaseName: `ParqueaderoPOS_DB_${cleanId}`
    };

    setStoredTerminalId(cleanId);
    await dbSaveTerminalConfig(updated);
    onTerminalConfigChange(updated);
    setIsEditingTerminal(false);
    setMessage({
      type: 'info',
      text: `Terminal reasignada a ${cleanId}. Conectada a la base de datos ${updated.databaseName}.`
    });
    onDatabaseReloadRequired();
  };

  // Reset database
  const handleResetDatabase = async () => {
    setLoading(true);
    try {
      await clearTerminalDatabase();
      setMessage({ type: 'info', text: 'Base de datos de esta terminal reiniciada a valores iniciales.' });
      setConfirmClear(false);
      await loadStatsAndLogs();
      onDatabaseReloadRequired();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Delete record
  const confirmDeleteRecord = async () => {
    if (!recordToDelete) return;
    const currentTableDef = AVAILABLE_TABLES.find(t => t.id === sidebarSelection);
    const pKeyName = currentTableDef ? currentTableDef.primaryKey : 'id';
    const pKeyValue = recordToDelete[pKeyName];

    try {
      await dbDeleteTableRecord(sidebarSelection, pKeyValue);
      setMessage({ type: 'success', text: `Registro [${pKeyValue}] eliminado de ${sidebarSelection}.` });
      setRecordToDelete(null);
      setSelectedRowIndex(null);
      await loadTableData(sidebarSelection);
      await loadStatsAndLogs();
      onDatabaseReloadRequired();
    } catch (err: any) {
      setMessage({ type: 'error', text: `No se pudo eliminar el registro: ${err.message}` });
    }
  };

  // Save edited/new JSON record
  const handleSaveEditedRecord = async () => {
    try {
      const parsed = JSON.parse(editingJsonText);
      await dbSaveRawTableRecord(sidebarSelection, parsed);
      setMessage({ type: 'success', text: isInsertMode ? 'Nuevo registro insertado con éxito.' : 'Registro actualizado en la base de datos.' });
      setViewingRecord(null);
      setIsEditMode(false);
      setIsInsertMode(false);
      await loadTableData(sidebarSelection);
      await loadStatsAndLogs();
      onDatabaseReloadRequired();
    } catch (e: any) {
      setMessage({ type: 'error', text: `JSON inválido: ${e.message}` });
    }
  };

  // Duplicate Selected Record
  const handleDuplicateRecord = async () => {
    if (selectedRowIndex === null || tableRecords.length === 0) {
      setMessage({ type: 'info', text: 'Por favor, selecciona una fila primero haciendo clic sobre ella.' });
      return;
    }
    const recordToClone = filteredAndSortedRecords[selectedRowIndex];
    if (!recordToClone) return;

    // Open raw JSON modal prefilled with cloned data, forcing user to change primary key
    const cloned = { ...recordToClone };
    const tableDef = AVAILABLE_TABLES.find(t => t.id === sidebarSelection);
    const pk = tableDef ? tableDef.primaryKey : 'id';
    
    if (cloned[pk]) {
      if (typeof cloned[pk] === 'number') cloned[pk] = cloned[pk] + 1;
      else cloned[pk] = `${cloned[pk]}_COPY_${Math.floor(Math.random() * 1000)}`;
    }

    setViewingRecord(cloned);
    setEditingJsonText(JSON.stringify(cloned, null, 2));
    setIsInsertMode(true);
    setIsEditMode(true);
  };

  // Open Insert Modal with beautiful template prefilled
  const handleOpenInsertModal = () => {
    const tableDef = AVAILABLE_TABLES.find(t => t.id === sidebarSelection);
    if (!tableDef) return;

    const templateObj: Record<string, any> = {};
    tableDef.columns.forEach(col => {
      if (col.type === 'Number') templateObj[col.name] = Number(col.sample) || 0;
      else if (col.type === 'Object/Any') templateObj[col.name] = {};
      else {
        // Treat placeholder for dates
        if (col.name.toLowerCase().includes('time') || col.name.toLowerCase().includes('at')) {
          templateObj[col.name] = new Date().toISOString();
        } else {
          templateObj[col.name] = col.sample;
        }
      }
    });

    setViewingRecord(templateObj);
    setEditingJsonText(JSON.stringify(templateObj, null, 2));
    setIsInsertMode(true);
    setIsEditMode(true);
  };

  // Execute NoSQL Javascript Query
  const handleExecuteQuery = () => {
    setQueryError(null);
    setQueryResult(null);
    const start = performance.now();
    try {
      // Sandbox runner
      const runner = new Function('records', queryCode);
      const result = runner(tableRecords);
      const end = performance.now();
      
      setQueryTime(parseFloat((end - start).toFixed(2)));
      setQueryResult(result);
    } catch (err: any) {
      setQueryError(err.message);
    }
  };

  // Handle Sort Change
  const handleRequestSort = (columnName: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortColumn === columnName && sortDirection === 'asc') {
      direction = 'desc';
    }
    setSortColumn(columnName);
    setSortDirection(direction);
    setSelectedRowIndex(null);
  };

  // Filter records based on advanced choices
  const filteredRecords = tableRecords.filter(row => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    
    if (searchColumn === 'ALL') {
      return JSON.stringify(row).toLowerCase().includes(q);
    } else {
      const cellVal = row[searchColumn];
      if (cellVal === undefined || cellVal === null) return false;
      return String(cellVal).toLowerCase().includes(q);
    }
  });

  // Sort filtered records
  const filteredAndSortedRecords = [...filteredRecords].sort((a, b) => {
    if (!sortColumn) return 0;
    const valA = a[sortColumn];
    const valB = b[sortColumn];

    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    return sortDirection === 'asc' 
      ? strA.localeCompare(strB) 
      : strB.localeCompare(strA);
  });

  // Pagination slicing
  const totalRows = filteredAndSortedRecords.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * rowsPerPage;
  const paginatedRecords = filteredAndSortedRecords.slice(startIndex, startIndex + rowsPerPage);

  // Generate dynamic database SQL CREATE TABLE schema (DDL) for HeidiSQL experience
  const generateTableDDL = (tableId: string): string => {
    const tableDef = AVAILABLE_TABLES.find(t => t.id === tableId);
    if (!tableDef) return '';

    let ddl = `-- Generación automática DDL de HeidiSQL\n-- Tabla: local_db.${tableId}\n\nCREATE TABLE ${tableId} (\n`;
    const colStrings = tableDef.columns.map(col => {
      let sqlTy = 'VARCHAR(255)';
      if (col.type === 'Number') sqlTy = 'INTEGER';
      else if (col.type === 'Object/Any') sqlTy = 'JSON';

      let sqlConstraints = '';
      if (col.isKey) sqlConstraints += ' PRIMARY KEY';
      else sqlConstraints += ' NULL';

      return `  ${col.name.padEnd(16)} ${sqlTy}${sqlConstraints}`;
    });

    ddl += colStrings.join(',\n');
    ddl += `\n);\n\n-- Índices asignados por IndexedDB en esta terminal:\n`;
    ddl += `CREATE UNIQUE INDEX idx_${tableId}_pk ON ${tableId}(${tableDef.primaryKey});\n`;
    
    // Add custom index examples based on standard structures
    if (tableId === 'spots') {
      ddl += `CREATE INDEX idx_spots_status ON spots(status);\n`;
    } else if (tableId === 'activeTickets') {
      ddl += `CREATE UNIQUE INDEX idx_active_tkt_num ON activeTickets(ticketNumber);\n`;
      ddl += `CREATE INDEX idx_active_plate ON activeTickets(plate);\n`;
    } else if (tableId === 'paidTickets') {
      ddl += `CREATE INDEX idx_paid_plate ON paidTickets(plate);\n`;
    }

    return ddl;
  };

  // Get active selected table definition
  const selectedTableDef = AVAILABLE_TABLES.find(t => t.id === sidebarSelection);
  const tableColumns = selectedTableDef 
    ? selectedTableDef.columns.map(c => c.name) 
    : tableRecords.length > 0 ? Object.keys(tableRecords[0]).slice(0, 10) : [];

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full animate-in fade-in duration-150" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs"}>
      <div className={embedded ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl w-full min-h-[82vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl max-w-[1400px] w-full h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100"}>
        
        {/* HeidiSQL Application Header */}
        <div className="bg-slate-50 dark:bg-slate-950 px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/25">
              <Database className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 tracking-tight">Centro de Administración de Base de Datos</span>
                <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[9px] text-slate-800 dark:text-slate-200 font-bold">
                  v4.0-Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-200 font-mono truncate max-w-[280px] sm:max-w-md">
                Motor Activo: <span className="text-amber-700 dark:text-amber-400 font-bold">{engineMode === 'postgres' ? 'PostgreSQL (Servidor SQL)' : `${terminalConfig.databaseName} (IndexedDB Local)`}</span>
              </p>
            </div>
          </div>

          {/* Engine Selector: PostgreSQL vs IndexedDB */}
          <div className="flex items-center bg-slate-200 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800">
            <button
              onClick={() => setEngineMode('postgres')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                engineMode === 'postgres'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-blue-300" />
              <span>🐘 Servidor SQL: PostgreSQL</span>
            </button>
            <button
              onClick={() => setEngineMode('indexeddb')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                engineMode === 'indexeddb'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-300" />
              <span>💻 Terminal: IndexedDB (Local)</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                loadStatsAndLogs();
                if (sidebarSelection !== 'overview') loadTableData(sidebarSelection);
              }}
              className="p-1.5 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refrescar base de datos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content View: PostgreSQL Administrator OR IndexedDB Workspace */}
        {engineMode === 'postgres' ? (
          <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 overflow-hidden flex flex-col">
            <PostgresAdminTab />
          </div>
        ) : (
          /* Outer Split Layout for IndexedDB */
          <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT SIDEBAR: HeidiSQL Database Tree View */}
          <div className="w-64 sm:w-72 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between select-none">
            
            {/* Tree Navigation */}
            <div className="flex-1 overflow-y-auto py-3 px-2 space-y-3 scrollbar-thin">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300 px-3 block mb-1">
                  Explorador de Objetos
                </span>
                <div className="space-y-1">
                  
                  {/* Localhost Host Node */}
                  <div className="flex items-center gap-1.5 px-3 py-1 text-slate-700 dark:text-slate-200 text-xs font-bold">
                    <Cpu className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">127.0.0.1 (IndexedDB)</span>
                  </div>

                  {/* Node: Gestión de Bases de Datos */}
                  <div className="pl-3.5 mb-1.5">
                    <button
                      onClick={() => setSidebarSelection('databases')}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors text-xs font-bold ${
                        sidebarSelection === 'databases'
                          ? 'bg-indigo-600/25 text-indigo-800 dark:text-indigo-300 border border-indigo-500/40 shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
                        <span className="font-mono text-[11px] truncate">Bases de Datos</span>
                      </div>
                      <span className="text-[10px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded text-indigo-800 dark:text-indigo-300 font-mono font-bold">
                        {localDatabases.length}
                      </span>
                    </button>
                  </div>

                  {/* Schema Node: Parqueadero Database */}
                  <div className="pl-3.5">
                    <button
                      onClick={() => setSidebarSelection('overview')}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors text-xs font-bold ${
                        sidebarSelection === 'overview'
                          ? 'bg-amber-600/15 text-amber-800 dark:text-amber-400 border border-amber-500/30'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Database className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-mono text-[11px] truncate" title={terminalConfig.databaseName}>
                          {terminalConfig.databaseName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono shrink-0">
                        ({AVAILABLE_TABLES.length})
                      </span>
                    </button>

                    {/* Expandable Table Nodes */}
                    <div className="pl-4 mt-1 border-l border-slate-200 dark:border-slate-800 space-y-1 py-1">
                      {AVAILABLE_TABLES.map(table => {
                        const count = tableRecordCounts[table.id] ?? 0;
                        const isSelected = sidebarSelection === table.id;

                        return (
                          <button
                            key={table.id}
                            onClick={() => setSidebarSelection(table.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 shadow-xs border border-amber-500/40 font-black'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-900/60 hover:text-slate-950 dark:hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-xs shrink-0">{table.icon}</span>
                              <span className="font-mono text-[11px] truncate">{table.id}</span>
                            </div>
                            <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] ${
                              isSelected ? 'bg-amber-500/20 text-amber-800 dark:text-amber-400 font-bold' : 'bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                  </div>

                  {/* Node: Lector de Códigos de Barras USB (Prefijos / Sufijos / Hardware) */}
                  <div className="pl-3.5 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                    <button
                      onClick={() => setSidebarSelection('barcode_scanner')}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors text-xs font-bold ${
                        sidebarSelection === 'barcode_scanner'
                          ? 'bg-indigo-600/25 text-indigo-800 dark:text-indigo-300 border border-indigo-500/40 shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Barcode className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                        <span className="font-mono text-[11px] truncate">Lector USB / Barras</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                        barcodeConfig.enabled
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}>
                        {barcodeConfig.enabled ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  </div>

                  {/* Node: Historial de Auditoría e Integridad del Sistema */}
                  <div className="pl-3.5 mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800/80">
                    <button
                      onClick={() => setSidebarSelection('audit_history')}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors text-xs font-bold ${
                        sidebarSelection === 'audit_history' || sidebarSelection === 'auditLogs'
                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-xs font-black'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                        <span className="font-mono text-[11px] truncate">Bitácora Auditoría</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        AUDIT
                      </span>
                    </button>
                  </div>

                </div>
              </div>
            </div>

            {/* Sidebar Bottom Metadata */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-[10px] text-slate-800 dark:text-slate-200 font-mono">
              <div className="flex items-center justify-between">
                <span>Plataforma:</span>
                <span className="text-slate-700 dark:text-slate-200">Chrome/Edge v8+</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Codificación:</span>
                <span className="text-slate-700 dark:text-slate-200">UTF-8 / JSON</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Estación activa:</span>
                <span className="text-amber-700 dark:text-amber-400 font-bold">{terminalConfig.terminalId}</span>
              </div>
            </div>

          </div>

          {/* RIGHT WORKSPACE: HeidiSQL Content Tabs */}
          <div className="flex-1 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
            
            {/* Table or Schema Tabs Header */}
            {sidebarSelection !== 'overview' && sidebarSelection !== 'databases' && sidebarSelection !== 'barcode_scanner' && (
              <div className="bg-slate-50 dark:bg-slate-950 px-4 pt-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                
                {/* Visual Tab Buttons */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setActiveTab('data')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-[11px] font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'data'
                        ? 'border-amber-500 text-amber-800 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-2xs font-black'
                        : 'border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Ver Datos (Grid)</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('structure')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-[11px] font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'structure'
                        ? 'border-amber-500 text-amber-800 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-2xs font-black'
                        : 'border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Estructura / Columnas</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('query')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-[11px] font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'query'
                        ? 'border-amber-500 text-amber-800 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-2xs font-black'
                        : 'border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Consulta NoSQL</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('statistics')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-[11px] font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'statistics'
                        ? 'border-amber-500 text-amber-800 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-2xs font-black'
                        : 'border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Estadísticas & DDL SQL</span>
                  </button>
                </div>

                {/* Table Title Tag */}
                <div className="pb-2.5 hidden sm:flex items-center gap-2">
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">Tabla:</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold">
                    {selectedTableDef?.icon} {sidebarSelection}
                  </span>
                </div>

              </div>
            )}

            {/* Status Messages bar */}
            {message && (
              <div className={`mx-6 mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
                message.type === 'success' 
                  ? 'bg-emerald-950/40 border-emerald-500/25 text-emerald-700 dark:text-emerald-400' 
                  : message.type === 'error'
                  ? 'bg-rose-950/40 border-rose-500/25 text-rose-700 dark:text-rose-400'
                  : 'bg-blue-950/40 border-blue-500/25 text-blue-700 dark:text-blue-400'
              }`}>
                <div className="flex items-center gap-2">
                  {message.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 animate-pulse" />}
                  {message.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-700 dark:text-rose-400" />}
                  {message.type === 'info' && <HardDrive className="w-4 h-4 text-blue-700 dark:text-blue-400" />}
                  <span>{message.text}</span>
                </div>
                <button onClick={() => setMessage(null)} className="text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Scrollable Workspace Container */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">

              {/* TAB GROUP -1: LECTOR DE CÓDIGOS DE BARRAS USB & HARDWARE PREFIJOS/SUFIJOS */}
              {sidebarSelection === 'barcode_scanner' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {renderBarcodeScannerSection()}
                </div>
              )}

              {/* TAB GROUP 0: GESTIÓN DE BASES DE DATOS (When sidebarSelection === 'databases') */}
              {sidebarSelection === 'databases' && (
                <div className="space-y-6">
                  {renderDatabasesSection(true)}
                </div>
              )}

              {/* TAB GROUP AUDITORÍA: HISTORIAL DE AUDITORÍA E INTEGRIDAD */}
              {(sidebarSelection === 'audit_history' || sidebarSelection === 'auditLogs') && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <AuditHistory
                    terminalId={terminalConfig.terminalId}
                    onRefreshStats={loadStatsAndLogs}
                  />
                </div>
              )}

              {/* TAB GROUP 1: DATABASE OVERVIEW (When sidebarSelection === 'overview') */}
              {sidebarSelection === 'overview' && (
                <div className="space-y-6">
                  
                  {/* Terminal Identity Card */}
                  <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                          Identidad de la Terminal
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-amber-500" />
                          <span>{terminalConfig.terminalName}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-mono font-bold">
                            ID: {terminalConfig.terminalId}
                          </span>
                        </h4>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-200">Nombre Neto y Real de la BD:</span>
                          <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-950/50 border border-emerald-500/40 px-2 py-0.5 rounded select-all">
                            {terminalConfig.databaseName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-1">
                          Cada terminal física del parqueadero almacena de forma independiente su propia base de datos transaccional local, garantizando tolerancia total a fallos.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingTerminal(!isEditingTerminal)}
                        className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:text-amber-300 font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                      >
                        {isEditingTerminal ? 'Cancelar' : 'Reasignar ID'}
                      </button>
                    </div>

                    {isEditingTerminal && (
                      <form onSubmit={handleSaveTerminal} className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in slide-in-from-top-1">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase mb-1">ID Único de Caja (Terminal)</label>
                          <input
                            type="text"
                            value={newTerminalId}
                            onChange={(e) => setNewTerminalId(e.target.value.toUpperCase())}
                            placeholder="Ej. TAQUILLA-01"
                            className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 uppercase focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase mb-1">Nombre Comercial de la Estación</label>
                          <input
                            type="text"
                            value={newTerminalName}
                            onChange={(e) => setNewTerminalName(e.target.value)}
                            placeholder="Ej. Taquilla Entrada Principal"
                            className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                            required
                          />
                        </div>
                        <div className="sm:col-span-2 flex justify-end">
                          <button
                            type="submit"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Guardar y Migrar Datos</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Database Live Stats Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                        <span>Métricas de Espacio e Índices</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 text-center">
                        <span className="text-[9px] font-extrabold text-slate-600 dark:text-slate-300 uppercase">Capacidad Plazas</span>
                        <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{stats?.spotsCount ?? 0}</p>
                        <span className="text-[9px] text-slate-700 dark:text-slate-200 font-mono">Disponibles</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 text-center">
                        <span className="text-[9px] font-extrabold text-amber-500 uppercase">Tickets Activos</span>
                        <p className="text-xl font-black text-amber-700 dark:text-amber-400 mt-0.5">{stats?.activeTicketsCount ?? 0}</p>
                        <span className="text-[9px] text-amber-700 dark:text-amber-400/80 font-mono">En Patio</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 text-center">
                        <span className="text-[9px] font-extrabold text-emerald-500 uppercase">Total Recaudados</span>
                        <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">{stats?.paidTicketsCount ?? 0}</p>
                        <span className="text-[9px] text-emerald-700 dark:text-emerald-400/80 font-mono">Finalizados</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 text-center">
                        <span className="text-[9px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase">Peso Estimado</span>
                        <p className="text-sm font-black text-indigo-800 dark:text-indigo-300 mt-1">{stats?.storageSizeEstimate ?? '~50 KB'}</p>
                        <span className="text-[9px] text-slate-700 dark:text-slate-200 font-mono">Almacenado Local</span>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Database Manager */}
                  {renderDatabasesSection(false)}

                  {/* Backup & Restore Action Bar */}
                  <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>HeidiSQL Dump (Copia de Seguridad)</span>
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-200">
                      Exporta un volcado completo con estructura JSON para respaldar los datos de ingresos, arqueos de caja y auditoría en un solo clic.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleExportBackup}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Exportar SQL Dump (JSON)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                        <span>Restaurar Base de Datos</span>
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportFile}
                        accept=".json"
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Windows Launchers .bat */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/20 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-amber-500 animate-pulse" />
                      <span>Script de Integración en Windows (.BAT)</span>
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-200">
                      Permite iniciar, levantar, actualizar y configurar la base de datos local del parqueadero directamente en Windows con un solo doble clic.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
                        <div>
                          <span className="font-mono text-xs font-extrabold text-emerald-700 dark:text-emerald-400 block">INICIAR_PARQUEADERO.bat</span>
                          <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-0.5">
                            Auto-arranca el entorno de base de datos local en Node.js y abre la aplicación.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadBat('INICIAR_PARQUEADERO.bat', `@echo off\ncd /d "%~dp0"\ntitle Sistema de Control de Parqueadero POS\ncolor 0A\ncls\necho =====================================================================\necho           SISTEMA DE CONTROL DE PARQUEADERO POS - LOCAL\necho =====================================================================\necho.\nwhere npm >nul 2>&1\nif %errorlevel% equ 0 goto :node_ok\necho [ERROR] Node.js (npm) no esta instalado en este computador o no esta en el PATH.\necho Para que el sistema funcione localmente, debes instalar Node.js.\necho Descargalo desde: https://nodejs.org/\necho Despues de instalarlo, REINICIA el equipo y vuelve a ejecutar este archivo.\necho.\npause\nexit\n:node_ok\necho [OK] Node.js detectado correctamente.\necho.\nif not exist node_modules (\n    echo [INFO] No se detecto la carpeta node_modules. Instalando dependencias necesarias...\n    echo Esto puede tardar un momento, por favor espera...\n    echo.\n    call npm install\n)\necho.\necho [OK] Dependencias listas.\necho.\nset DEV_PORT=3000\nnetstat -ano | findstr LISTENING | findstr ":3000" >nul 2>&1\nif %errorlevel% neq 0 goto :port_ok\necho =====================================================================\necho [ALERTA] El puerto 3000 ya esta siendo utilizado en tu computadora.\necho =====================================================================\necho Esto sucede comunmente si cerraste la ventana anterior sin detener el\necho servidor, o si otra aplicacion en tu PC esta usando el puerto 3000.\necho.\necho Selecciona una opcion:\necho [1] Liberar el puerto 3000 automaticamente (Recomendado - Cierra el proceso activo)\necho [2] Iniciar el parqueadero en un puerto alternativo (Puerto 3001)\necho [3] Intentar iniciar de todos modos\necho.\nset /p port_opt="Digita el numero de tu opcion (1-3) y presiona Enter: "\nif "%port_opt%"=="1" goto :kill_port\nif "%port_opt%"=="2" goto :change_port\ngoto :port_ok\n:kill_port\necho.\necho Buscando proceso en el puerto 3000...\nfor /f "tokens=5" %%a in ('netstat -aon ^| findstr "LISTENING" ^| findstr ":3000"') do (\n    echo Cerrando proceso con PID %%a...\n    taskkill /F /PID %%a >nul 2>&1\n)\necho Puerto 3000 liberado con exito.\necho.\ngoto :port_ok\n:change_port\nset DEV_PORT=3001\necho.\necho Configurando puerto alternativo: 3001\necho.\n:port_ok\necho.\necho Abriendo aplicacion en el navegador web...\nstart " http://localhost:%DEV_PORT%\necho.\necho Iniciando servidor local en el puerto %DEV_PORT%...\necho (Deja esta ventana abierta para mantener el sistema encendido)\necho.\nset PORT=%DEV_PORT%\ncall npm run dev\nif %errorlevel% neq 0 (\n    echo.\n    echo [ERROR] Hubo un error al iniciar el servidor local con 'npm run dev'.\n    echo Intenta reinstalar las dependencias borrando la carpeta 'node_modules' y ejecutando este script de nuevo.\n    echo.\n    pause\n)`)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                          <span>Descargar script ejecutable</span>
                        </button>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
                        <div>
                          <span className="font-mono text-xs font-extrabold text-indigo-700 dark:text-indigo-400 block">ACTUALIZAR_SISTEMA.bat</span>
                          <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-0.5">
                            Realiza la sincronización de archivos con el repositorio remoto.
                          </p>
                        </div>
                         <button
                          type="button"
                          onClick={() => handleDownloadBat('ACTUALIZAR_SISTEMA.bat', `@echo off\ncd /d "%~dp0"\ntitle Actualizador del Sistema de Control de Parqueadero\ncolor 0B\ncls\necho =====================================================================\necho          ACTUALIZADOR DEL SISTEMA DE CONTROL DE PARQUEADERO\necho =====================================================================\necho.\necho Directorio activo: %CD%\necho.\nwhere npm >nul 2>&1\nif %errorlevel% equ 0 goto :npm_ok\necho [ERROR] Node.js (npm) no esta instalado en este computador o no esta en el PATH.\necho Para que el sistema funcione localmente, debes instalar Node.js.\necho Descargalo desde: https://nodejs.org/\necho.\npause\nexit\n:npm_ok\nwhere git >nul 2>&1\nif %errorlevel% equ 0 goto :git_ok\necho [ADVERTENCIA] Git no esta instalado en este computador.\necho No es posible descargar actualizaciones de codigo de GitHub sin Git.\necho Para actualizar de forma automatica, instala Git desde: https://git-scm.com/\necho o descarga la ultima version ZIP desde la plataforma y descomprimela aqui.\necho.\nset /p re_dep="Deseas reinstalar las dependencias locales con npm install? (S/N): "\nif /i "%re_dep%"=="S" goto :dependencies\ngoto :end_success\n:git_ok\nif exist .git goto :repo_ok\necho [ADVERTENCIA] Esta carpeta no esta vinculada a un repositorio Git (posiblemente descargado como ZIP).\necho No se pueden descargar actualizaciones de codigo de GitHub en esta carpeta.\necho.\necho Opciones:\necho [1] Reinstalar dependencias de Node.js locales (npm install)\necho [2] Vincular esta carpeta a tu repositorio Git de GitHub\necho [3] Salir\necho.\nset /p zip_opt="Selecciona una opcion (1-3): "\nif "%zip_opt%"=="1" goto :dependencies\nif "%zip_opt%"=="2" goto :initialize_git\ngoto :end_success\n:initialize_git\necho.\necho Inicializando repositorio Git...\ngit init\nset /p git_url="Ingresa la URL del repositorio de GitHub: "\nif "%git_url%"==" goto :end_success\ngit remote add origin %git_url%\ngit fetch\ngit checkout -f main\necho Vinculado con exito.\ngoto :update_menu\n:repo_ok\n:update_menu\necho Selecciona el tipo de actualizacion:\necho [1] Actualizacion Estandar (Conserva tus configuraciones locales)\necho [2] Actualizacion Forzada (Sobrescribe cambios de codigo locales - RECOMENDADO)\necho [3] Solo reinstalar dependencias (npm install)\necho [4] Cancelar y Salir\necho.\nset /p opt="Selecciona una opcion (1-4): "\nif "%opt%"=="1" goto :standard_update\nif "%opt%"=="2" goto :forced_update\nif "%opt%"=="3" goto :dependencies\ngoto :end_success\n:standard_update\necho.\necho Ejecutando git pull...\ngit pull origin main\ngoto :dependencies\n:forced_update\necho.\necho [ADVERTENCIA] Esto sobrescribira cualquier modificacion local de codigo.\necho Ejecutando git reset y descarga...\ngit fetch --all\ngit reset --hard origin/main\ngit pull origin main\ngoto :dependencies\n:dependencies\necho.\necho =====================================================================\necho               INSTALANDO DEPENDENCIAS DE NODE.JS\necho =====================================================================\necho.\necho Ejecutando npm install... (Por favor espera, esto puede tomar un momento)\necho.\ncmd /c npm install\nif %errorlevel% neq 0 (\n    echo.\n    echo [ERROR] Hubo un problema al instalar las dependencias con npm.\n    echo Por favor, verifica tu conexion a internet e intenta de nuevo.\n) else (\n    echo.\n    echo Dependencias instaladas con exito.\n)\ngoto :end_success\n:end_success\necho.\necho =====================================================================\necho                   PROCESO DE ACTUALIZACION CONCLUIDO\necho =====================================================================\necho.\necho Ya puedes iniciar el sistema ejecutando: INICIAR_PARQUEADERO.bat\necho.\npause\nexit`)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
                          <span>Descargar script actualización</span>
                        </button>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
                        <div>
                          <span className="font-mono text-xs font-extrabold text-amber-700 dark:text-amber-400 block">INSTALAR_SISTEMA_NUEVO.bat</span>
                          <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-0.5">
                            Instala automáticamente Node.js, Git, dependencias y crea acceso directo en PC nueva.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadBat('INSTALAR_SISTEMA_NUEVO.bat', `@echo off\r\ncd /d "%~dp0"\r\ntitle Asistente de Instalacion y Configuracion de Parqueadero POS\r\ncolor 0E\r\ncls\r\necho =====================================================================\r\necho    ASISTENTE DE INSTALACION PARA EQUIPOS NUEVOS - PARQUEADERO POS\r\necho =====================================================================\r\necho.\r\necho Este asistente instalara y configurara automaticamente todo lo necesario\r\necho para ejecutar la aplicacion de control de parqueadero local en este equipo.\r\necho.\r\necho Se realizaran las siguientes acciones:\r\necho [1] Verificar e instalar Node.js (Entorno de ejecucion)\r\necho [2] Verificar e instalar Git (Para recibir actualizaciones en 1-clic)\r\necho [3] Instalar dependencias del sistema (Modulos Node.js)\r\necho [4] Crear un acceso directo en tu Escritorio de Windows\r\necho.\r\necho =====================================================================\r\necho ADVERTENCIA: Asegurate de tener conexion a internet para las descargas.\r\necho =====================================================================\r\necho.\r\nset /p start_opt="Deseas comenzar con la instalacion automatica? (S/N): "\r\nif /i "%start_opt%" neq "S" goto :cancel\r\ncls\r\ncolor 0B\r\necho =====================================================================\r\necho               PASO 1: VERIFICANDO E INSTALANDO NODE.JS\r\necho =====================================================================\r\necho.\r\nwhere npm >nul 2>&1\r\nif %errorlevel% equ 0 (\r\n    echo [OK] Node.js ya esta instalado en este equipo.\r\n    goto :check_git\r\n)\r\necho [INFO] Node.js no fue detectado. Iniciando instalacion silenciosa...\r\necho Descargando e instalando Node.js LTS via winget de Windows...\r\necho Por favor espera, esto puede tomar de 1 a 2 minutos...\r\necho.\r\nwinget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements\r\nif %errorlevel% neq 0 (\r\n    echo.\r\n    echo [ERROR] No se pudo instalar Node.js de forma automatica via winget.\r\n    echo Por favor, descargalo manualmente desde: https://nodejs.org/\r\n    echo E instalalo marcando la opcion "Add to PATH" antes de continuar.\r\n    echo.\r\n    pause\r\n    exit\r\n)\necho [OK] Node.js instalado con exito.\r\necho.\r\n:check_git\r\necho =====================================================================\r\necho                 PASO 2: VERIFICANDO E INSTALANDO GIT\r\necho =====================================================================\r\necho.\r\nwhere git >nul 2>&1\r\nif %errorlevel% equ 0 (\r\n    echo [OK] Git ya esta instalado en este equipo.\r\n    goto :install_deps\r\n)\r\necho [INFO] Git no fue detectado. Iniciando instalacion silenciosa...\r\necho Descargando e instalando Git via winget de Windows...\r\necho Por favor espera, esto puede tomar 1 minuto...\r\necho.\r\nwinget install --id Git.Git -e --silent --accept-source-agreements --accept-package-agreements\r\nif %errorlevel% neq 0 (\r\n    echo.\r\n    echo [ADVERTENCIA] No se pudo instalar Git automaticamente.\r\n    echo Podras iniciar el sistema local, pero no podras usar el actualizador automatico.\r\n    echo Si deseas habilitar las actualizaciones, instala Git desde: https://git-scm.com/\r\n    echo.\r\n    pause\r\n) else (\r\n    echo [OK] Git instalado con exito.\r\n)\necho.\r\n:install_deps\r\ncls\r\ncolor 0E\r\necho =====================================================================\r\necho               PASO 3: INSTALANDO DEPENDENCIAS DE NODE.JS\r\necho =====================================================================\r\necho.\r\necho Ejecutando npm install...\r\necho (Este proceso descarga los modulos de ejecucion y puede tardar un momento)\r\necho.\r\ncall npm install\r\nif %errorlevel% neq 0 (\r\n    echo.\r\n    echo [ERROR] Ocurrio un error al instalar las dependencias con 'npm install'.\r\n    echo Por favor, verifica tu conexion a internet e intenta ejecutar este script de nuevo.\r\n    echo.\r\n    pause\r\n    exit\r\n)\necho [OK] Dependencias de Node.js instaladas correctamente.\r\necho.\r\n:create_shortcut\r\ncls\r\ncolor 0A\r\necho =====================================================================\r\necho                 PASO 4: CREANDO ACCESO DIRECTO\r\necho =====================================================================\r\necho.\r\necho Creando acceso directo en tu Escritorio de Windows...\r\necho.\r\nset "SCRIPT_PATH=%~dp0INICIAR_PARQUEADERO.bat"\r\nset "SHORTCUT_PATH=%USERPROFILE%\\Desktop\\Parqueadero POS.lnk"\r\npowershell -NoProfile -Command ^\r\n    "$WshShell = New-Object -ComObject WScript.Shell; ^\r\n     $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); ^\r\n     $Shortcut.TargetPath = '%SCRIPT_PATH%'; ^\r\n     $Shortcut.WorkingDirectory = '%~dp0'; ^\r\n     $Shortcut.IconLocation = 'C:\\Windows\\System32\\shell32.dll,23'; ^\r\n     $Shortcut.Description = 'Iniciar el Sistema de Parqueadero POS'; ^\r\n     $Shortcut.Save()"\r\nif %errorlevel% equ 0 (\r\n    echo [OK] Acceso directo \\"Parqueadero POS\\" creado en tu Escritorio con exito.\r\n) else (\r\n    echo [ADVERTENCIA] No se pudo crear el acceso directo de forma automatica.\r\n    echo Sin embargo, la instalacion fue exitosa.\r\n)\necho.\r\ncls\r\ncolor 0A\r\necho =====================================================================\r\necho                 ¡INSTALACION COMPLETADA CON EXITO!\r\necho =====================================================================\r\necho.\r\necho Felicidades, el sistema se ha configurado por completo para este equipo.\r\necho.\r\necho Para empezar a usar la aplicacion:\r\necho 1. Haz doble clic en el icono \\"Parqueadero POS\\" creado en tu Escritorio.\r\necho 2. El sistema se abrira automaticamente en tu navegador web.\r\necho.\r\necho =====================================================================\r\npause\r\nexit\r\n:cancel\r\necho.\r\necho Instalacion cancelada por el usuario.\r\necho.\r\npause\r\nexit`)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-500" />
                          <span>Descargar instalador</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actualizador en Vivo */}
                  <div className="border border-indigo-200 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                        <RefreshCw className={`w-4 h-4 text-indigo-700 dark:text-indigo-400 ${updatingApp || installingGit ? 'animate-spin' : ''}`} />
                        <span>Actualizador en Vivo (Nube)</span>
                      </h4>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20 font-extrabold uppercase">
                        Recomendado
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-200">
                      Descarga las últimas mejoras de diseño, parches de seguridad y funciones del sistema directamente desde la nube, sin salir de la aplicación y sin necesidad de ejecutar archivos `.bat` externos.
                    </p>

                    {/* Estado del Entorno de Git en la PC */}
                    <div className="bg-white dark:bg-slate-950/60 rounded-lg p-3 border border-slate-200 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 dark:text-slate-200 font-medium">Estado del entorno Git:</span>
                        {checkingGit ? (
                          <span className="text-slate-600 dark:text-slate-300 font-mono flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin text-slate-700 dark:text-slate-200" />
                            Comprobando...
                          </span>
                        ) : gitStatus?.installed ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-emerald-700 dark:text-emerald-400 font-extrabold font-mono flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                              Git Instalado ({gitStatus.version?.replace('git version ', '')})
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${gitStatus.isRepo ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'}`}>
                              {gitStatus.isRepo ? 'Vinculado a repositorio' : 'Sin vincular a repositorio'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 font-extrabold font-mono flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                            Git no detectado
                          </span>
                        )}
                      </div>

                      {/* Si Git no está instalado, dar solución automática */}
                      {gitStatus && !gitStatus.installed && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded p-2.5 space-y-2">
                          <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                            <strong>¿Por qué es necesario Git?</strong> Git es la herramienta que permite descargar automáticamente los últimos archivos del parqueadero de manera segura. Si no está instalado en este equipo, la actualización en vivo no funcionará.
                          </p>
                          {gitStatus.platform === 'win32' ? (
                            <div className="flex flex-col gap-2">
                              <p className="text-[10px] text-amber-800 dark:text-amber-300">
                                ✓ Detectado Windows. Podemos intentar instalar Git automáticamente en tu computador de forma silenciosa usando Windows Package Manager (winget).
                              </p>
                              <button
                                type="button"
                                onClick={handleInstallGit}
                                disabled={installingGit}
                                className="flex items-center justify-center gap-1.5 w-full py-2 rounded text-xs font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                              >
                                <Cpu className={`w-3.5 h-3.5 ${installingGit ? 'animate-spin' : ''}`} />
                                <span>{installingGit ? 'Instalando Git automáticamente (Por favor espera)...' : 'Instalar Git en este equipo ahora'}</span>
                              </button>
                            </div>
                          ) : (
                            <p className="text-[10px] text-amber-700 dark:text-amber-400">
                              Por favor, instala Git manualmente en tu sistema operativo para poder usar la actualización en un solo clic. Descárgalo desde <a href="https://git-scm.com" target="_blank" rel="noreferrer" className="underline font-bold text-amber-800 dark:text-amber-300">git-scm.com</a>.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Sección de acciones del actualizador si Git sí está instalado */}
                    {gitStatus?.installed && (
                      gitStatus.isRepo ? (
                        <div className="space-y-3">
                          <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id="force-up"
                                  checked={forceUpdate}
                                  onChange={(e) => setForceUpdate(e.target.checked)}
                                  className="w-4 h-4 text-amber-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md focus:ring-amber-500 cursor-pointer"
                                />
                                <label htmlFor="force-up" className="text-xs text-slate-600 dark:text-slate-300 select-none cursor-pointer">
                                  <strong>Forzar actualización</strong> (Sobrescribe cambios locales)
                                </label>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setIsChangingRepo(!isChangingRepo)}
                                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer whitespace-nowrap"
                                  title="Modificar la URL del repositorio remoto de GitHub"
                                >
                                  <GitBranch className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
                                  <span>{isChangingRepo ? 'Cancelar Cambio' : 'Cambiar Repositorio'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={handleAppUpdate}
                                  disabled={updatingApp}
                                  className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer whitespace-nowrap"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${updatingApp ? 'animate-spin' : ''}`} />
                                  <span>{updatingApp ? 'Actualizando...' : 'Actualizar Aplicación'}</span>
                                </button>
                              </div>
                            </div>

                            {gitStatus.remoteUrl && !isChangingRepo && (
                              <div className="flex items-center justify-between gap-2 text-[11px] font-mono bg-white dark:bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <Link2 className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400 shrink-0" />
                                  <span className="text-slate-600 dark:text-slate-300 text-[10px] uppercase font-bold shrink-0">Repositorio Vinculado:</span>
                                  <span className="text-indigo-800 dark:text-indigo-300 truncate font-bold text-[11px]">{gitStatus.remoteUrl}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setIsChangingRepo(true)}
                                  className="text-[10px] text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:text-amber-300 font-bold underline shrink-0 cursor-pointer ml-2"
                                >
                                  Cambiar URL
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Panel desplegable para cambiar o modificar el repositorio de GitHub */}
                          {isChangingRepo && (
                            <div className="border border-indigo-200 dark:border-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 uppercase tracking-wider">
                                  <GitBranch className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                                  <span>Cambiar Repositorio Vinculado (GitHub)</span>
                                </span>
                                {gitStatus.remoteUrl && (
                                  <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/80 px-2 py-0.5 rounded font-bold">
                                    Origen actual: {gitStatus.remoteUrl}
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed">
                                Ingresa la nueva URL de tu repositorio de GitHub para cambiar la fuente de actualizaciones de esta terminal local:
                              </p>

                              <form onSubmit={handleInitializeGit} className="space-y-2">
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    type="url"
                                    id="change-repo-url-input"
                                    placeholder="https://github.com/usuario/mi-nuevo-parqueadero-pos.git"
                                    value={gitRepoUrl}
                                    onChange={(e) => setGitRepoUrl(e.target.value)}
                                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-mono"
                                    required
                                  />
                                  <button
                                    type="submit"
                                    disabled={initializingGit}
                                    className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 ${initializingGit ? 'animate-spin' : ''}`} />
                                    <span>{initializingGit ? 'Guardando...' : 'Guardar Nuevo Repositorio'}</span>
                                  </button>
                                </div>
                                <span className="text-[10px] text-slate-600 dark:text-slate-300 block leading-normal">
                                  * Se reconfigurará el <code className="text-indigo-800 dark:text-indigo-300 font-mono">git remote origin</code> y se alineará el seguimiento de la rama remota.
                                </span>
                              </form>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2.5">
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-semibold">
                              ⚠️ Carpeta local no vinculada a Git (Descargada como ZIP)
                            </p>
                            <p className="text-[10px] text-slate-700 dark:text-slate-200 leading-relaxed mt-1">
                              Esta instalación local se descargó en formato ZIP, por lo que no puede recibir actualizaciones a través de comandos Git tradicionales.
                            </p>
                          </div>

                          {/* OPCIÓN 1: ACTUALIZACIÓN DIRECTA EN 1-CLIC */}
                          <div className="border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-lg p-3 space-y-3">
                            <span className="text-[10px] text-indigo-800 dark:text-indigo-300 font-extrabold uppercase tracking-wider block">Método 1: Sincronización en 2 Pasos (Recomendado / Seguro)</span>
                            <p className="text-[10px] text-slate-700 dark:text-slate-200 leading-relaxed">
                              Debido a políticas de seguridad y autenticación de la nube, tu servidor local en PC no puede descargar el archivo directamente en segundo plano (provoca error de formato). Sigue estos sencillos pasos para actualizar en 10 segundos de forma 100% segura:
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                              {/* Paso 1: Descargar */}
                              <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5 flex flex-col justify-between">
                                <div>
                                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block mb-1">👉 PASO 1: Descargar el Parche</span>
                                  <p className="text-[9px] text-slate-700 dark:text-slate-200 leading-normal">
                                    Haz clic para descargar el archivo <code className="text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 px-1 py-0.2 rounded font-mono text-[9px]">project_update.zip</code> utilizando tu sesión activa:
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    window.open('https://ais-dev-vpvwoug5gr3y3khdmcvklr-242661373981.us-east1.run.app/api/system/download-zip', '_blank');
                                  }}
                                  className="flex items-center justify-center gap-1 w-full py-1.5 mt-2 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[10px] font-extrabold transition-all cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5 text-slate-950" />
                                  <span>Descargar Archivo .zip</span>
                                </button>
                              </div>

                              {/* Paso 2: Subir */}
                              <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5 flex flex-col justify-between">
                                <div>
                                  <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold block mb-1">👉 PASO 2: Instalar en tu PC</span>
                                  <p className="text-[9px] text-slate-700 dark:text-slate-200 leading-normal">
                                    Selecciona el archivo descargado desde tu computadora para aplicarlo en caliente sobre tu base local:
                                  </p>
                                </div>
                                <div>
                                  <input
                                    type="file"
                                    id="zip-uploader-input"
                                    accept=".zip"
                                    disabled={updatingApp}
                                    onChange={handleZipUpload}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor="zip-uploader-input"
                                    className="flex items-center justify-center gap-1 w-full py-1.5 mt-2 rounded border border-dashed border-indigo-300 dark:border-indigo-500/40 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/15 dark:hover:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold transition-all cursor-pointer text-center"
                                  >
                                    <Upload className="w-3.5 h-3.5 text-indigo-800 dark:text-indigo-300" />
                                    <span>{updatingApp ? 'Instalando...' : 'Seleccionar Archivo .zip'}</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* OPCIÓN 2: VINCULAR GIT */}
                          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2.5">
                            <span className="text-[10px] text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider block">Método 2: Vincular con tu repositorio de GitHub</span>
                            <form onSubmit={handleInitializeGit} className="space-y-2">
                              <label htmlFor="repo-url" className="text-[10px] text-slate-600 dark:text-slate-300 font-medium block">
                                URL de tu repositorio de GitHub:
                              </label>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                  type="url"
                                  id="repo-url"
                                  placeholder="https://github.com/usuario/mi-parqueadero-pos.git"
                                  value={gitRepoUrl}
                                  onChange={(e) => setGitRepoUrl(e.target.value)}
                                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                                  required
                                />
                                <button
                                  type="submit"
                                  disabled={initializingGit}
                                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer whitespace-nowrap"
                                >
                                  {initializingGit ? 'Vinculando...' : 'Vincular y Activar'}
                                </button>
                              </div>
                              <span className="text-[10px] text-slate-600 dark:text-slate-300 block leading-normal">
                                * Tip: Sube tus archivos a un repositorio de GitHub e ingresa la URL aquí para habilitar las actualizaciones tradicionales con Git.
                              </span>
                            </form>
                          </div>
                        </div>
                      )
                    )}

                    {updateOutput && (
                      <div className="mt-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-3 max-h-40 overflow-y-auto scrollbar-thin">
                        <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono block mb-1 uppercase tracking-wider font-bold">Consola del Sistema:</span>
                        <pre className="font-mono text-[10px] text-indigo-800 dark:text-indigo-300 whitespace-pre-wrap">{updateOutput}</pre>
                      </div>
                    )}
                  </div>

                  {/* Audit logs */}
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
                      <History className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                      <span>Últimos Logs de Seguridad en Base de Datos</span>
                    </span>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs max-h-56 overflow-y-auto bg-slate-50 dark:bg-slate-950">
                      {auditLogs.length === 0 ? (
                        <div className="p-4 text-center text-slate-600 dark:text-slate-300">No hay eventos registrados aún.</div>
                      ) : (
                        <table className="w-full text-left font-mono">
                          <thead className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-extrabold border-b border-slate-200 dark:border-slate-800 sticky top-0 text-[10px]">
                            <tr>
                              <th className="px-3 py-2">Hora</th>
                              <th className="px-3 py-2">Acción</th>
                              <th className="px-3 py-2">Detalles del Evento</th>
                              <th className="px-3 py-2">Cajero</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900 text-[11px]">
                            {auditLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-white dark:bg-slate-900/40">
                                <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </td>
                                <td className="px-3 py-1.5 font-bold text-amber-500 whitespace-nowrap">
                                  {log.action}
                                </td>
                                <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">
                                  {log.details}
                                </td>
                                <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                  {log.operator}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Reset database danger zone */}
                  <div className="border border-rose-900/30 bg-rose-950/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h5 className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        <span>Zona de Control de Desastre</span>
                      </h5>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400/80 mt-0.5">
                        Al reiniciar la base de datos se vaciarán todas las tablas y se restablecerá el terminal a valores iniciales de fábrica.
                      </p>
                    </div>
                    {confirmClear ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmClear(false)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleResetDatabase}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-xs font-black text-white rounded-lg shadow-md"
                        >
                          Borrar Base de Datos
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmClear(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-black text-rose-700 dark:text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all whitespace-nowrap cursor-pointer"
                      >
                        Formatear Base de Datos Local
                      </button>
                    )}
                  </div>

                </div>
              )}

              {/* TAB GROUP 2: HIGHLY INTERACTIVE DATA GRID (TAB: 'data') */}
              {sidebarSelection !== 'overview' && activeTab === 'data' && (
                <div className="space-y-4">
                  
                  {/* HeidiSQL Grid Action Bar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    
                    {/* Left Actions */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={handleOpenInsertModal}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        title="Insertar nueva fila"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        <span>Insertar fila</span>
                      </button>

                      <button
                        onClick={handleDuplicateRecord}
                        disabled={selectedRowIndex === null}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        title="Clonar fila seleccionada"
                      >
                        <Copy className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                        <span>Duplicar</span>
                      </button>

                      <button
                        onClick={() => {
                          if (selectedRowIndex === null) {
                            setMessage({ type: 'info', text: 'Por favor, selecciona una fila haciendo clic sobre ella.' });
                            return;
                          }
                          const rec = paginatedRecords[selectedRowIndex];
                          setViewingRecord(rec);
                          setEditingJsonText(JSON.stringify(rec, null, 2));
                          setIsInsertMode(false);
                          setIsEditMode(true);
                        }}
                        disabled={selectedRowIndex === null}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        title="Modificar JSON del registro"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => {
                          if (selectedRowIndex === null) {
                            setMessage({ type: 'info', text: 'Selecciona una fila para eliminar.' });
                            return;
                          }
                          setRecordToDelete(paginatedRecords[selectedRowIndex]);
                        }}
                        disabled={selectedRowIndex === null}
                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-950/30 hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 border border-rose-900/30 rounded-lg text-[11px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Eliminar fila seleccionada"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>

                      <div className="h-6 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1 hidden md:block"></div>

                      <button
                        onClick={() => loadTableData(sidebarSelection)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${tableLoading ? 'animate-spin text-amber-700 dark:text-amber-400' : ''}`} />
                        <span>Refrescar</span>
                      </button>

                      <button
                        onClick={handleExportTableCSV}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        title="Exportar registros de la página"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        <span>Excel / CSV</span>
                      </button>
                    </div>

                    {/* Quick Filter Controls */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 w-full sm:w-auto">
                      <select
                        value={searchColumn}
                        onChange={(e) => {
                          setSearchColumn(e.target.value);
                          setSelectedRowIndex(null);
                        }}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] px-2 py-1.5 font-mono text-slate-700 dark:text-slate-300 focus:outline-hidden"
                      >
                        <option value="ALL">* (Todas las Columnas)</option>
                        {tableColumns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSelectedRowIndex(null);
                            setCurrentPage(1);
                          }}
                          placeholder="Filtro rápido..."
                          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-slate-800 dark:text-slate-200 w-full sm:w-44 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                  </div>

                  {/* Datagrid Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950">
                    <div className="overflow-x-auto overflow-y-auto max-h-[50vh] scrollbar-thin">
                      
                      {tableLoading ? (
                        <div className="p-16 text-center flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-7 h-7 text-amber-500 animate-spin" />
                          <span className="text-xs text-slate-700 dark:text-slate-200 font-mono">Consumiendo transacción de IndexedDB...</span>
                        </div>
                      ) : paginatedRecords.length === 0 ? (
                        <div className="p-12 text-center text-xs text-slate-600 dark:text-slate-300 font-mono">
                          {searchQuery ? 'Ningún registro coincide con el filtro establecido.' : 'Esta tabla está vacía en este terminal.'}
                        </div>
                      ) : (
                        <table className="w-full text-left font-mono border-collapse select-text">
                          <thead className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 text-[10px] uppercase font-bold">
                            <tr>
                              <th className="px-3 py-2 w-12 text-center bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">#</th>
                              {tableColumns.map(col => {
                                const isSorted = sortColumn === col;

                                return (
                                  <th
                                    key={col}
                                    onClick={() => handleRequestSort(col)}
                                    className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer select-none whitespace-nowrap"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span>{col}</span>
                                      {isSorted ? (
                                        <span className="text-amber-700 dark:text-amber-400">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                                      ) : (
                                        <span className="text-slate-600 dark:text-slate-300 opacity-20 group-hover:opacity-100">↕</span>
                                      )}
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px] text-slate-800 dark:text-slate-200">
                            {paginatedRecords.map((record, index) => {
                              const globalIdx = startIndex + index + 1;
                              const isSelected = selectedRowIndex === index;

                              return (
                                <tr
                                  key={globalIdx}
                                  onClick={() => setSelectedRowIndex(isSelected ? null : index)}
                                  onDoubleClick={() => {
                                    setViewingRecord(record);
                                    setEditingJsonText(JSON.stringify(record, null, 2));
                                    setIsInsertMode(false);
                                    setIsEditMode(false);
                                  }}
                                  className={`transition-colors cursor-pointer ${
                                    isSelected 
                                      ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 font-bold border-y border-amber-500/40' 
                                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  {/* Row index counter column */}
                                  <td className="px-2 py-1.5 text-center bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 font-mono">
                                    {globalIdx}
                                  </td>

                                  {/* Values columns */}
                                  {tableColumns.map(col => {
                                    const val = record[col];
                                    let cellDisplayStr = '';
                                    
                                    if (val === null || val === undefined) {
                                      cellDisplayStr = 'NULL';
                                    } else if (typeof val === 'object') {
                                      cellDisplayStr = JSON.stringify(val);
                                    } else {
                                      cellDisplayStr = String(val);
                                    }

                                    const isNull = val === null || val === undefined;

                                    return (
                                      <td
                                        key={col}
                                        className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 truncate max-w-[220px]"
                                        title={cellDisplayStr}
                                      >
                                        <span className={isNull ? 'text-slate-400 dark:text-slate-500 italic font-normal' : ''}>
                                          {cellDisplayStr}
                                        </span>
                                      </td>
                                    );
                                  })}

                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}

                    </div>
                  </div>

                  {/* Grid Status bar with HeidiSQL-like Pagination */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-[11px] text-slate-700 dark:text-slate-200 font-mono">
                    <div className="flex items-center gap-2">
                      <span>Mostrando: <strong>{paginatedRecords.length}</strong> de <strong>{totalRows}</strong> filas</span>
                      {selectedRowIndex !== null && (
                        <span className="text-amber-700 dark:text-amber-400 font-bold">
                          • Fila seleccionada: #{startIndex + selectedRowIndex + 1}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Rows per page selector */}
                      <div className="flex items-center gap-1">
                        <span>Límite:</span>
                        <select
                          value={rowsPerPage}
                          onChange={(e) => {
                            setRowsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                            setSelectedRowIndex(null);
                          }}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded px-1.5 py-0.5 focus:outline-hidden"
                        >
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={500}>500</option>
                        </select>
                      </div>

                      {/* Pagination buttons */}
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-0.5">
                        <button
                          onClick={() => {
                            setCurrentPage(p => Math.max(1, p - 1));
                            setSelectedRowIndex(null);
                          }}
                          disabled={currentPage === 1}
                          className="p-1 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:bg-slate-900 disabled:opacity-20"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 font-bold text-slate-600 dark:text-slate-300">
                          Pág. {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => {
                            setCurrentPage(p => Math.min(totalPages, p + 1));
                            setSelectedRowIndex(null);
                          }}
                          disabled={currentPage === totalPages}
                          className="p-1 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:bg-slate-900 disabled:opacity-20"
                        >
                          <ChevronRightIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB GROUP 3: TABLE SCHEMA (TAB: 'structure') */}
              {sidebarSelection !== 'overview' && activeTab === 'structure' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-500" />
                      <span>Estructura de Campo y Tipado de Datos</span>
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-200">
                      Muestra la especificación de campos de IndexedDB, equivalentes a columnas relacionales de HeidiSQL.
                    </p>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 sticky top-0 text-[10px] uppercase font-bold">
                        <tr>
                          <th className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 w-12 text-center">Clave</th>
                          <th className="px-4 py-2 border-r border-slate-200 dark:border-slate-800">Nombre del Campo</th>
                          <th className="px-4 py-2 border-r border-slate-200 dark:border-slate-800">Tipo de Dato</th>
                          <th className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-center">Requerido</th>
                          <th className="px-4 py-2 border-r border-slate-200 dark:border-slate-800">Descripción del Negocio</th>
                          <th className="px-4 py-2">Valor de Ejemplo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                        {selectedTableDef?.columns.map(col => (
                          <tr key={col.name} className="hover:bg-white dark:hover:bg-slate-900">
                            <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-800 font-bold">
                              {col.isKey ? (
                                <span className="text-amber-700 dark:text-amber-400 cursor-help" title="Llave primaria">*</span>
                              ) : (
                                <span className="text-slate-600 dark:text-slate-300">-</span>
                              )}
                            </td>
                            <td className={`px-4 py-2 border-r border-slate-200 dark:border-slate-800 font-bold ${col.isKey ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>
                              {col.name}
                            </td>
                            <td className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 font-bold text-indigo-700 dark:text-indigo-400">
                              {col.type}
                            </td>
                            <td className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-center text-slate-700 dark:text-slate-200">
                              {col.isKey ? 'Sí (Primary)' : 'No (Nullable)'}
                            </td>
                            <td className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-sans">
                              {col.desc}
                            </td>
                            <td className="px-4 py-2 text-slate-600 dark:text-slate-300 italic">
                              {col.sample}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB GROUP 4: ADVANCED NOSQL JS QUERY PANEL (TAB: 'query') */}
              {sidebarSelection !== 'overview' && activeTab === 'query' && (
                <div className="space-y-4">
                  
                  {/* Query Header bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div>
                      <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        <span>Consola SQL / NoSQL Scripting de HeidiSQL</span>
                      </h4>
                      <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                        Escribe código JS para filtrar, transformar o agrupar registros en tiempo real.
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {/* Template Selector */}
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          
                          let code = '';
                          if (val === 'filter_plate') {
                            code = `// Filtrar por Placa\nreturn records.filter(r => r.plate && r.plate.toUpperCase().includes("ABC"));`;
                          } else if (val === 'sum_money') {
                            code = `// Calcular total de dinero ingresado en la tabla\nconst total = records.reduce((sum, r) => sum + (Number(r.totalPaid) || 0), 0);\nreturn {\n  totalCobrado: total,\n  cantidadTickets: records.length,\n  promedioPorTicket: parseFloat((total / records.length || 0).toFixed(2))\n};`;
                          } else if (val === 'group_payment') {
                            code = `// Agrupar por Método de Pago\nconst grups = {};\nrecords.forEach(r => {\n  const method = r.paymentMethod || 'Otros';\n  if (!grups[method]) grups[method] = { count: 0, sum: 0 };\n  grups[method].count++;\n  grups[method].sum += (Number(r.totalPaid) || 0);\n});\nreturn grups;`;
                          } else if (val === 'spots_occupied') {
                            code = `// Obtener plazas ocupadas de automóviles\nreturn records.filter(r => r.status === 'occupied' && r.type === 'car');`;
                          }
                          setQueryCode(code);
                        }}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-hidden"
                      >
                        <option value="">💡 Cargar Plantilla de Query</option>
                        {sidebarSelection === 'paidTickets' && (
                          <>
                            <option value="filter_plate">Query: Filtrar por placa</option>
                            <option value="sum_money">Query: Sumar todo lo recaudado</option>
                            <option value="group_payment">Query: Agrupar por método de pago</option>
                          </>
                        )}
                        {sidebarSelection === 'spots' && (
                          <option value="spots_occupied">Query: Ver plazas de carros ocupadas</option>
                        )}
                        <option value="filter_plate">Query: Filtrar por campo de texto</option>
                      </select>

                      <button
                        onClick={handleExecuteQuery}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-[11px] shadow-md transition-colors cursor-pointer"
                        title="Ejecutar consulta (F9)"
                      >
                        <Play className="w-3 h-3 fill-slate-950" />
                        <span>Ejecutar Query (F9)</span>
                      </button>
                    </div>

                  </div>

                  {/* Query Codearea */}
                  <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950">
                    <textarea
                      value={queryCode}
                      onChange={(e) => setQueryCode(e.target.value)}
                      rows={10}
                      className="w-full p-4 font-mono text-xs bg-slate-50 dark:bg-slate-950 text-emerald-700 dark:text-emerald-400 focus:outline-hidden focus:ring-0 leading-relaxed scrollbar-thin"
                    />
                    <div className="absolute bottom-2.5 right-3 text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                      JS engine / Sandbox mode
                    </div>
                  </div>

                  {/* Query Result Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-200 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span>Resultado de la Ejecución:</span>
                      {queryTime !== null && !queryError && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                          ✓ Exitoso en {queryTime} ms ({Array.isArray(queryResult) ? queryResult.length : 1} registros devueltos)
                        </span>
                      )}
                      {queryError && (
                        <span className="text-rose-700 dark:text-rose-400 font-bold">
                          ⚠ Error en sintaxis de la consulta
                        </span>
                      )}
                    </div>

                    {queryError && (
                      <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/30 text-xs font-mono text-rose-800 dark:text-rose-300">
                        Error: {queryError}
                      </div>
                    )}

                    {queryResult !== null && (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 p-3 max-h-56 overflow-y-auto scrollbar-thin">
                        <pre className="font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                          {JSON.stringify(queryResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB GROUP 5: DDL SQL ENGINE & STATS (TAB: 'statistics') */}
              {sidebarSelection !== 'overview' && activeTab === 'statistics' && (
                <div className="space-y-4 animate-in fade-in-20">
                  
                  {/* HeidiSQL Schema representation */}
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                    <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                      <span>Script Generado DDL (HeidiSQL para Migraciones)</span>
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-200">
                      Copia esta estructura SQL lista para migrar la base de datos de esta terminal local a servidores SQL de producción como PostgreSQL o SQLite.
                    </p>
                  </div>

                  <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950">
                    <pre className="p-4 font-mono text-xs text-slate-600 dark:text-slate-300 overflow-x-auto leading-relaxed max-h-80 select-text scrollbar-thin">
                      {generateTableDDL(sidebarSelection)}
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generateTableDDL(sidebarSelection));
                        setMessage({ type: 'success', text: 'Script DDL copiado al portapapeles con éxito.' });
                      }}
                      className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                      <span>Copiar Script</span>
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>
        )}

        {/* PRO ROW JSON VIEWER/EDITOR MODAL (HeidiSQL Object Editor) */}
        {viewingRecord && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-100">
              
              <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-xs font-mono">
                    {isInsertMode ? 'Insertar nuevo registro' : 'Modificar registro'} [{sidebarSelection}]
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setViewingRecord(null);
                    setIsEditMode(false);
                    setIsInsertMode(false);
                  }} 
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3 overflow-y-auto flex-1 font-mono">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Edición directa de campos en formato NoSQL JSON</span>
                  <button
                    onClick={() => {
                      if (!isEditMode) {
                        setIsEditMode(true);
                      } else {
                        setIsEditMode(false);
                        setIsInsertMode(false);
                      }
                    }}
                    className="text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:text-amber-300 font-extrabold underline"
                  >
                    {isEditMode ? 'Ver solo lectura' : 'Editar JSON'}
                  </button>
                </div>

                {isEditMode ? (
                  <textarea
                    value={editingJsonText}
                    onChange={(e) => setEditingJsonText(e.target.value)}
                    rows={12}
                    className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-950 text-emerald-700 dark:text-emerald-400 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-hidden"
                  />
                ) : (
                  <pre className="p-3 font-mono text-xs bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 rounded-xl overflow-x-auto max-h-80 scrollbar-thin">
                    {JSON.stringify(viewingRecord, null, 2)}
                  </pre>
                )}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewingRecord(null);
                    setIsEditMode(false);
                    setIsInsertMode(false);
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Cerrar
                </button>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={handleSaveEditedRecord}
                    className="px-4 py-1.5 rounded-lg text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* CONFIRM DELETE MODAL */}
        {recordToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-900/40 shadow-2xl max-w-md w-full p-5 space-y-4">
              <div className="flex items-center gap-3 text-rose-700 dark:text-rose-400">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-700 dark:text-slate-200">¿Eliminar registro seleccionado?</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-200">Esta acción removerá el registro permanentemente de la tabla {sidebarSelection}.</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto scrollbar-thin">
                <pre>{JSON.stringify(recordToDelete, null, 2)}</pre>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setRecordToDelete(null)}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteRecord}
                  className="px-4 py-1.5 rounded-lg text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
                >
                  Confirmar Eliminación
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CREAR NUEVA BASE DE DATOS */}
        {isCreateDbOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-700/50 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Crear Nueva Base de Datos Local</h4>
                    <p className="text-xs text-slate-700 dark:text-slate-200">Inicializa una base de datos IndexedDB aislada para una terminal o sucursal.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateDbOpen(false)}
                  className="p-1 rounded-lg text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateDatabase} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                    ID de la Terminal / Base de Datos *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDbId}
                    onChange={(e) => setNewDbId(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '_'))}
                    placeholder="Ej. TAQUILLA-02, CAJA_SUR, SEDE_NORTE"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono mt-0.5 block">
                    Nombre IndexedDB resultante: ParqueaderoPOS_DB_{newDbId || 'TU_ID'}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Nombre Comercial / Descriptivo
                  </label>
                  <input
                    type="text"
                    value={newDbName}
                    onChange={(e) => setNewDbName(e.target.value)}
                    placeholder="Ej. Taquilla Acceso Principal Norte"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Plantilla de Inicialización
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 cursor-pointer hover:border-slate-300 dark:border-slate-700">
                      <input
                        type="radio"
                        name="seedDefaults"
                        checked={newDbSeedDefaults}
                        onChange={() => setNewDbSeedDefaults(true)}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-200 block text-xs">Con plantilla predeterminada (Recomendado)</span>
                        <span className="text-[11px] text-slate-700 dark:text-slate-200">Incluye 40 plazas de parqueo, tarifas estándar de vehículos, categorías y usuario admin inicial.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 cursor-pointer hover:border-slate-300 dark:border-slate-700">
                      <input
                        type="radio"
                        name="seedDefaults"
                        checked={!newDbSeedDefaults}
                        onChange={() => setNewDbSeedDefaults(false)}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-200 block text-xs">Base de datos en blanco</span>
                        <span className="text-[11px] text-slate-700 dark:text-slate-200">Estructura limpia sin plazas ni tickets. Solo el usuario admin para ingresar.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Descripción o Notas (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={newDbDescription}
                    onChange={(e) => setNewDbDescription(e.target.value)}
                    placeholder="Notas sobre el uso de esta base de datos..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newDbAutoActivate}
                      onChange={(e) => setNewDbAutoActivate(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Conectar y activar inmediatamente esta base de datos en esta ventana</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateDbOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={dbActionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{dbActionLoading ? 'Creando Base de Datos...' : 'Crear Base de Datos'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CLONAR BASE DE DATOS */}
        {isCloneDbOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-500/40 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
                    <Copy className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Clonar Base de Datos Existente</h4>
                    <p className="text-xs text-slate-700 dark:text-slate-200">Crea una réplica exacta e independiente de cualquier base de datos local.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCloneDbOpen(false)}
                  className="p-1 rounded-lg text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCloneDatabase} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Base de Datos de Origen *
                  </label>
                  <select
                    value={cloneSourceId}
                    onChange={(e) => setCloneSourceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  >
                    {localDatabases.map(db => (
                      <option key={db.terminalId} value={db.terminalId}>
                        {db.terminalName} ({db.terminalId}) - {db.databaseName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                    ID Único para la Base Clonada *
                  </label>
                  <input
                    type="text"
                    required
                    value={cloneTargetId}
                    onChange={(e) => setCloneTargetId(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '_'))}
                    placeholder="Ej. TAQUILLA-01-COPIA, CLON-CAJA2"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono mt-0.5 block">
                    Nombre IndexedDB resultante: ParqueaderoPOS_DB_{cloneTargetId || 'NUEVO_ID'}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Nombre Descriptivo de la Copia
                  </label>
                  <input
                    type="text"
                    value={cloneTargetName}
                    onChange={(e) => setCloneTargetName(e.target.value)}
                    placeholder="Ej. Copia de Seguridad Taquilla 01"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                    Contenido a Replicar
                  </label>
                  <div className="space-y-2 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cloneIncludeTickets}
                        onChange={(e) => setCloneIncludeTickets(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-slate-600 dark:text-slate-300">Incluir tickets activos en patio y tickets cobrados históricos</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cloneIncludeLogs}
                        onChange={(e) => setCloneIncludeLogs(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-slate-600 dark:text-slate-300">Incluir historial de arqueos de caja y auditoría del sistema</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Descripción / Motivo del Clon (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={cloneDescription}
                    onChange={(e) => setCloneDescription(e.target.value)}
                    placeholder="Ej. Respaldo previo a auditoría o clon para estación secundaria..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cloneAutoActivate}
                      onChange={(e) => setCloneAutoActivate(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Conectar y activar inmediatamente esta copia en la sesión actual</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCloneDbOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={dbActionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{dbActionLoading ? 'Clonando Datos...' : 'Comenzar Clonación'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CONFIRMAR ELIMINACIÓN DE BASE DE DATOS */}
        {dbToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-900/40 shadow-2xl max-w-md w-full p-5 space-y-4">
              <div className="flex items-center gap-3 text-rose-700 dark:text-rose-400">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-700 dark:text-slate-200">¿Eliminar Base de Datos Local?</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-200">Esta acción removerá permanentemente la base de datos de este navegador.</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 font-mono">
                <div className="text-slate-600 dark:text-slate-300 font-bold">{dbToDelete.terminalName}</div>
                <div className="text-amber-700 dark:text-amber-400">ID: {dbToDelete.terminalId}</div>
                <div className="text-slate-600 dark:text-slate-300">{dbToDelete.databaseName}</div>
              </div>

              <p className="text-xs text-rose-800 dark:text-rose-300/80">
                Se perderán todos los datos locales almacenados en esta base de datos si no has descargado una copia de seguridad previamente.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDbToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={dbActionLoading}
                  onClick={handleDeleteDatabase}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{dbActionLoading ? 'Eliminando...' : 'Eliminar Permanentemente'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>
              {engineMode === 'postgres' 
                ? 'Motor Activo: PostgreSQL Servidor SQL Central (Relacional / ACID / Conexiones LAN)' 
                : 'Motor Local: HTML5 IndexedDB Transaccional (100% Offline-First)'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cerrar Terminal Client
          </button>
        </div>

      </div>
    </div>
  );
};
