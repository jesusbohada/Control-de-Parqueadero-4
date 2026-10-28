import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ParkingSpot, 
  ParkingTicket, 
  RatesConfig, 
  ParkingBusinessInfo, 
  CashShift, 
  VehicleType, 
  PaymentMethod,
  TerminalConfig,
  SystemUser,
  PaymentGatewayConfig,
  PaymentTransactionDetails,
  OperationalDay,
  VehicleCategoryConfig,
  ExpenseConcept,
  ExpenseCategory,
  CashMovement,
  BranchLocation,
  CentralUpdatePackage,
  SoftwareReleaseBuild,
  BranchSyncAuditRecord,
  SystemNodeConfig,
  Warehouse,
  PosPoint,
  RemoteExecutionOrder,
  PrinterConfig,
  CommercialAgreement,
  AgreementDiscountType
} from './types';
import { printInstantThermal, openCashDrawer } from './services/printerService';
import { PrinterSettingsModal } from './components/PrinterSettingsModal';
import { 
  DEFAULT_RATES, 
  DEFAULT_BUSINESS_INFO, 
  INITIAL_SPOTS, 
  INITIAL_ACTIVE_TICKETS, 
  INITIAL_PAID_TICKETS, 
  INITIAL_CASH_SHIFT,
  INITIAL_OPERATIONAL_DAY,
  INITIAL_USERS,
  DEFAULT_PAYMENT_GATEWAY_CONFIG,
  INITIAL_VEHICLE_CATEGORIES,
  INITIAL_EXPENSE_CONCEPTS,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_CLOSED_SHIFTS,
  INITIAL_CLOSED_DAYS,
  INITIAL_BRANCHES,
  INITIAL_CENTRAL_PACKAGES,
  INITIAL_SOFTWARE_BUILDS,
  INITIAL_SYNC_AUDIT_LOGS,
  INITIAL_SYSTEM_NODE_CONFIG,
  INITIAL_WAREHOUSES,
  INITIAL_POS_POINTS,
  INITIAL_REMOTE_ORDERS,
  INITIAL_COMMERCIAL_AGREEMENTS
} from './data/initialData';
import { 
  ensureUniqueBranchFarmadeskCredentials, 
  generateFarmadeskId, 
  generateFarmadeskPassword 
} from './utils/farmadeskCredentials';
import {
  reportBranchHeartbeatAndIp,
  detectCurrentPublicIp,
  fetchBranchesTelemetry,
  deleteBranchFromServer
} from './services/centralSyncService';
import { 
  loadTerminalDatabaseData,
  getStoredTerminalId,
  getDatabaseNameForTerminal,
  exportDatabaseBackup,
  dbSaveSpots,
  dbDeleteSpot,
  dbDeleteMultipleSpots,
  dbUpdateMultipleSpotStatus,
  dbReconcileSpots,
  dbSaveActiveTicket,
  dbRemoveActiveTicket,
  dbSavePaidTicket,
  dbSaveRates,
  dbSaveBusinessInfo,
  dbSaveCashShift,
  dbAddAuditLog,
  dbGetUsers,
  dbSaveUser,
  dbSaveUsers,
  dbDeleteUser,
  dbSavePaymentGatewayConfig,
  dbSaveExpenseConcepts,
  dbSaveExpenseCategories,
  dbSavePrinters,
  dbSaveUserTemplates,
  dbGetUserTemplates,
  dbSaveRoleMatrix,
  dbGetRoleMatrix
} from './db/terminalDatabase';
import { Building2, XCircle, Monitor, Radio, Cpu, HardDrive, RefreshCw, Terminal, Keyboard, MousePointer, ShieldAlert, Wifi, Sliders, Send, Settings, User, ExternalLink, Car, Database, ShieldCheck, Printer, Layers } from 'lucide-react';
import { WorkspaceCategory, ActiveWorkspaceView } from './types/routes';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { OperationsView } from './components/OperationsView';
import { ParkingMap } from './components/ParkingMap';
import { RealTimeReports } from './components/RealTimeReports';
import { CashShiftModal } from './components/CashShiftModal';
import { RatesSettingsModal } from './components/RatesSettingsModal';
import { TicketModal } from './components/TicketModal';
import { TerminalDatabaseModal } from './components/TerminalDatabaseModal';
import { ProtectedRoutesManager } from './components/ProtectedRoutesManager';
import { AccessGate } from './components/AccessGate';
import { LoginView } from './components/LoginView';
import { UsersManagementModal } from './components/UsersManagementModal';
import { VehicleCategoriesModal } from './components/VehicleCategoriesModal';
import { ExpenseConceptsModal } from './components/ExpenseConceptsModal';
import { CommercialAgreementsModal } from './components/CommercialAgreementsModal';
import { CashShiftsHistoryModal } from './components/CashShiftsHistoryModal';
import { SpotsManagementModal } from './components/SpotsManagementModal';
import { SubscribersModal } from './components/SubscribersModal';
import { CentralHubModal } from './components/CentralHubModal';
import { BranchSyncModal } from './components/BranchSyncModal';
import { SoftwareUpdaterModal } from './components/SoftwareUpdaterModal';
import { SystemWorkModeConfigModal } from './components/SystemWorkModeConfigModal';
import { BranchesManagementModal } from './components/BranchesManagementModal';
import { AnprCameraModule } from './components/AnprCameraModule';
import { VncRemoteDesktop } from './components/VncRemoteDesktop';
import { RemoteControlWorkspace } from './components/RemoteControlWorkspace';
import { FarmaDeskDocsModal } from './components/FarmaDeskDocsModal';
import { CentralDashboard } from './components/CentralDashboard';
import { TicketScannerModal } from './components/TicketScannerModal';
import { BarcodeScanToast } from './components/BarcodeScanToast';
import { WorkspaceTabBar, WorkspaceTabItem } from './components/WorkspaceTabBar';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { ThemeId, EnvThemeId } from './types/theme';
import { ThemeManager, ContrastLevel, ThemeMode } from './utils/themeManager';
import { calculateParkingFee, formatPlate, formatCurrency } from './utils/billing';
import { playSound } from './utils/audio';
import { ensurePaymentGatewayConfigDefaults } from './utils/paymentUtils';
import {
  publishCentralPackage,
  recordPackageApplied,
  pullCentralData,
  pushBranchTelemetry,
  fetchCentralPackages,
  getServerDataConfig,
  getInstalledGlobalVersion,
  getInstalledGlobalDate,
  setInstalledGlobalVersion,
  setInstalledGlobalVersionAndDate,
  fetchCentralGlobalVersion,
  pushBranchOperationsToCentral,
  fetchBranchesOperations
} from './services/centralSyncService';
import { FarmaDeskSocketClient } from './services/websocketService';
import { webNotificationService } from './services/webNotificationService';
import { SystemRecoveryModal, IntegrityCheckResult } from './components/SystemRecoveryModal';
import { AuditHistory } from './components/AuditHistory';
import { 
  DEFAULT_PROTECTED_ROUTES, 
  ProtectedRouteConfig, 
  saveAuthorizedRoute, 
  clearAuthorizedRoutesSession,
  getStoredAuthorizedRoutes,
  getStoredDynamicRoutes,
  saveDynamicRoutes
} from './types/routes';

export default function App() {
  // --- Rutina de Verificación de Integridad de Base de Datos y Recuperación de Sistema ---
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [integrityCheckData, setIntegrityCheckData] = useState<IntegrityCheckResult | null>(null);

  // --- Monitoreo de Espacio en Disco del Host (< 500MB crítico) ---
  const [diskSpaceInfo, setDiskSpaceInfo] = useState<{
    freeMB: number;
    totalMB: number;
    freeGB: number;
    totalGB: number;
    isCritical: boolean;
    isWarning: boolean;
  } | null>(null);
  const [isDiskSpaceDismissed, setIsDiskSpaceDismissed] = useState<boolean>(false);

  // --- Flexible Multi-Protected Administrative Routes Configuration (Dynamic & Persisted) ---
  const [protectedRoutes, setProtectedRoutes] = useState<ProtectedRouteConfig[]>(() => {
    return getStoredDynamicRoutes();
  });

  const [databaseSubTab, setDatabaseSubTab] = useState<'terminal_db' | 'protected_routes' | 'audit_history'>('terminal_db');

  const handleUpdateProtectedRoutes = (newRoutes: ProtectedRouteConfig[]) => {
    setProtectedRoutes(newRoutes);
    saveDynamicRoutes(newRoutes);
  };

  const [isPathAuthorized, setIsPathAuthorized] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const currentPath = window.location.pathname.toLowerCase();
    const sessionAuth = sessionStorage.getItem('wolfzone_authorized_path') || localStorage.getItem('wolfzone_authorized_path');
    
    // Check if the current URL matches any configured protected route
    const currentRoutes = getStoredDynamicRoutes();
    const matchesConfiguredRoute = currentRoutes.some(route => {
      const clean = route.path.toLowerCase().replace(/^\/+/, '');
      return currentPath.includes(clean);
    });

    const isRoot = currentPath === '/' || currentPath === '';
    if (matchesConfiguredRoute || sessionAuth === 'true' || isRoot) {
      return true;
    }
    return false;
  });

  const [currentPathname, setCurrentPathname] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.pathname : '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      setCurrentPathname(window.location.pathname);
      const isRoot = path === '/' || path === '';
      const matchesConfigured = isRoot || protectedRoutes.some(route => {
        const clean = route.path.toLowerCase().replace(/^\/+/, '');
        return path.includes(clean);
      });
      if (matchesConfigured) {
        setIsPathAuthorized(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [protectedRoutes]);

  const handleGrantAccess = (targetRoute?: ProtectedRouteConfig) => {
    const route = targetRoute || protectedRoutes[0];
    saveAuthorizedRoute(route.path);
    setIsPathAuthorized(true);
    setCurrentPathname(route.path);
    if (route.defaultView) {
      setActiveView(route.defaultView);
    }
    if (route.defaultCategory) {
      setActiveCategory(route.defaultCategory);
    }
  };

  // --- Users & Authentication State ---
  const [users, setUsers] = useState<SystemUser[]>(() => {
    try {
      const saved = localStorage.getItem('pk_system_users');
      if (!saved) return INITIAL_USERS;
      const parsed: SystemUser[] = JSON.parse(saved);
      const updated = parsed.map(u => {
        if (u.username === 'admin' && (u.password === 'admin' || !u.password)) {
          return { ...u, password: 'admin123' };
        }
        if (u.username === 'supervisor' && (u.password === 'super' || !u.password)) {
          return { ...u, password: 'super123' };
        }
        if (u.username === 'caja' && (u.password === 'caja' || !u.password)) {
          return { ...u, password: 'caja123' };
        }
        return u;
      });
      if (!updated.some(u => u.username === 'cajero')) {
        const cajeroUser = INITIAL_USERS.find(u => u.username === 'cajero');
        if (cajeroUser) updated.push(cajeroUser);
      }
      return updated;
    } catch {
      return INITIAL_USERS;
    }
  });

  // Persistent sync and detailed logging for `users` state changes
  useEffect(() => {
    console.log('🔍 [LOG DETALLADO - UPDATE ESTADO USERS] Estado `users` ha sido actualizado en App.tsx:', {
      timestamp: new Date().toISOString(),
      totalUsersInState: users.length,
      usersList: users.map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
      localStoragePrevious: localStorage.getItem('pk_system_users') ? 'Existe valor' : 'Vacío',
    });

    try {
      localStorage.setItem('pk_system_users', JSON.stringify(users));
      console.log('✅ [LOG DETALLADO - PERSISTENCIA LOCALSTORAGE] Estado `users` guardado correctamente en localStorage (`pk_system_users`). Count:', users.length);
    } catch (err) {
      console.error('❌ [LOG DETALLADO - PERSISTENCIA LOCALSTORAGE ERROR] Error guardando usuarios en localStorage:', err);
    }
  }, [users]);

  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => {
    if (typeof window === 'undefined') return null;
    const savedUser = sessionStorage.getItem('pk_current_user') || localStorage.getItem('pk_current_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Ensure immediate parity between both storages
        localStorage.setItem('pk_current_user', savedUser);
        sessionStorage.setItem('pk_current_user', savedUser);
        localStorage.setItem('wolfzone_authorized_path', 'true');
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Ensure any active currentUser is automatically propagated to localStorage for other tabs
  useEffect(() => {
    if (currentUser) {
      try {
        const serialized = JSON.stringify(currentUser);
        localStorage.setItem('pk_current_user', serialized);
        sessionStorage.setItem('pk_current_user', serialized);
        localStorage.setItem('wolfzone_authorized_path', 'true');
        sessionStorage.setItem('wolfzone_authorized_path', 'true');
      } catch (err) {
        console.error('Error syncing currentUser across storages:', err);
      }
    }
  }, [currentUser]);

  // Cross-tab synchronization via StorageEvent and BroadcastChannel
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pk_current_user') {
        if (e.newValue) {
          try {
            setCurrentUser(JSON.parse(e.newValue));
          } catch {
            // ignore
          }
        } else {
          setCurrentUser(null);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Instant cross-tab auth handshake via BroadcastChannel
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('wolfzone_tab_auth');
      channel.onmessage = (event) => {
        if (event.data?.type === 'REQUEST_AUTH') {
          if (currentUser) {
            channel?.postMessage({ type: 'SYNC_AUTH', user: currentUser });
          }
        } else if (event.data?.type === 'SYNC_AUTH') {
          if (event.data?.user && !currentUser) {
            setCurrentUser(event.data.user);
          }
        }
      };

      if (!currentUser) {
        channel.postMessage({ type: 'REQUEST_AUTH' });
      }
    } catch {
      // BroadcastChannel optional fallback
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      try {
        channel?.close();
      } catch {
        // ignore
      }
    };
  }, [currentUser]);

  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

  const handleLockTerminal = () => {
    clearAuthorizedRoutesSession();
    sessionStorage.removeItem('pk_current_user');
    localStorage.removeItem('pk_current_user');
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
      setCurrentPathname('/');
    }
  };

  // --- Pure High-Contrast Theme System (Reactivo & Persistente) ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => ThemeManager.getTheme() === 'dark');

  // --- Manual Contrast Level State (Low / Medium / High) ---
  const [contrastLevel, setContrastLevel] = useState<ContrastLevel>(() => ThemeManager.getContrastLevel());

  const [isAccessibilityReportOpen, setIsAccessibilityReportOpen] = useState(false);

  const handleSelectContrastLevel = (level: ContrastLevel) => {
    setContrastLevel(level);
    ThemeManager.applyContrastLevel(level);
    playSound('beep', soundEnabled);
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wolfpos_sidebar_collapsed');
      if (saved !== null) return saved === 'true';
    }
    return false;
  });

  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      ThemeManager.applyTheme(next ? 'dark' : 'light', 'global_project');
      playSound('beep', soundEnabled);
      return next;
    });
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('wolfpos_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  // 1. Inicialización y sincronización multi-ventana
  useEffect(() => {
    ThemeManager.initTheme();

    // Suscripción reactiva interna al cambio de modo claro/oscuro
    const unsubscribeTheme = ThemeManager.subscribeTheme((mode) => {
      setIsDarkMode(mode === 'dark');
    });

    // Escucha de eventos de almacenamiento entre ventanas/pestañas
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ThemeManager.themeKey && (e.newValue === 'light' || e.newValue === 'dark')) {
        ThemeManager.applyTheme(e.newValue, 'active_window');
        setIsDarkMode(e.newValue === 'dark');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      unsubscribeTheme();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // --- One-Time Clean Slate Routine for Production Baseline Zero ---
  if (typeof window !== 'undefined') {
    const cleanSlateKey = 'pk_clean_slate_production_v3';
    if (!localStorage.getItem(cleanSlateKey)) {
      try {
        localStorage.removeItem('pk_active_tickets');
        localStorage.removeItem('pk_paid_tickets');
        localStorage.removeItem('pk_closed_shifts_history');
        localStorage.removeItem('pk_closed_days_history');
        localStorage.removeItem('pk_subscribers');
        localStorage.removeItem('pk_commercial_agreements');
        localStorage.removeItem('pk_remote_orders');
        localStorage.removeItem('pk_central_packages');
        localStorage.removeItem('pk_known_databases');
        localStorage.removeItem('pk_sync_audit_logs');
        localStorage.removeItem('wolfzone_postgres_query_history');
        localStorage.setItem('pk_branches', JSON.stringify(INITIAL_BRANCHES));
        localStorage.setItem('pk_current_branch_id', 'suc-001');
        localStorage.setItem('pk_warehouses', JSON.stringify(INITIAL_WAREHOUSES));
        localStorage.setItem('pk_pos_points', JSON.stringify(INITIAL_POS_POINTS));
        localStorage.setItem('pk_spots_data', JSON.stringify(INITIAL_SPOTS));
        localStorage.setItem('pk_current_shift', JSON.stringify(INITIAL_CASH_SHIFT));
        localStorage.setItem('pk_operational_day', JSON.stringify(INITIAL_OPERATIONAL_DAY));
        localStorage.setItem(cleanSlateKey, 'true');
      } catch (e) {
        console.warn('Error during clean slate initialization:', e);
      }
    }
  }

  // --- Terminal Database Identification & Configuration ---
  const [terminalConfig, setTerminalConfig] = useState<TerminalConfig>(() => ({
    terminalId: getStoredTerminalId(),
    terminalName: `Taquilla ${getStoredTerminalId()}`,
    databaseName: getDatabaseNameForTerminal(getStoredTerminalId()),
    createdAt: new Date().toISOString()
  }));

  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);

  // --- Persistent State Initialization ---
  const [spots, setSpots] = useState<ParkingSpot[]>(() => {
    const saved = localStorage.getItem('pk_spots_data');
    return saved ? JSON.parse(saved) : INITIAL_SPOTS;
  });

  const [activeTickets, setActiveTickets] = useState<ParkingTicket[]>(() => {
    const saved = localStorage.getItem('pk_active_tickets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(t => t && !t.id?.startsWith('tkt-sim-') && !t.id?.startsWith('tk-1') && !t.id?.startsWith('tk-2') && !t.id?.startsWith('tk-3') && !t.id?.startsWith('tk-4') && !t.id?.startsWith('tk-5') && !t.id?.startsWith('tk-6'));
        }
      } catch (e) {
        console.error('Error loading pk_active_tickets:', e);
      }
    }
    return INITIAL_ACTIVE_TICKETS;
  });

  const [paidTickets, setPaidTickets] = useState<ParkingTicket[]>(() => {
    const saved = localStorage.getItem('pk_paid_tickets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(t => t && !t.id?.startsWith('tkt-sim-') && !t.id?.startsWith('pk-0'));
        }
      } catch (e) {
        console.error('Error loading pk_paid_tickets:', e);
      }
    }
    return INITIAL_PAID_TICKETS;
  });

  const [rates, setRates] = useState<RatesConfig>(() => {
    const saved = localStorage.getItem('pk_rates_config');
    return saved ? JSON.parse(saved) : DEFAULT_RATES;
  });

  const [businessInfo, setBusinessInfo] = useState<ParkingBusinessInfo>(() => {
    const saved = localStorage.getItem('pk_business_info');
    return saved ? JSON.parse(saved) : DEFAULT_BUSINESS_INFO;
  });

  const [currentShift, setCurrentShift] = useState<CashShift>(() => {
    const saved = localStorage.getItem('pk_current_shift');
    return saved ? JSON.parse(saved) : INITIAL_CASH_SHIFT;
  });

  const [operationalDay, setOperationalDay] = useState<OperationalDay>(() => {
    const saved = localStorage.getItem('pk_operational_day');
    return saved ? JSON.parse(saved) : INITIAL_OPERATIONAL_DAY;
  });

  const [backupLockState, setBackupLockState] = useState<{
    isLocked: boolean;
    message: string;
    type: 'shift' | 'day' | null;
  } | null>(null);

  const triggerBlockingBackup = async (type: 'shift' | 'day'): Promise<boolean> => {
    setBackupLockState({
      isLocked: true,
      message: `Generando y comprimiendo Copia de Seguridad obligatoria en formato ZIP de alta densidad (${type === 'shift' ? 'Arqueo de Turno' : 'Cierre Definitivo de Día'}). Por favor espera, no cierres la aplicación...`,
      type
    });

    try {
      // Pause to let the UI update and show the blocking backdrop
      await new Promise(resolve => setTimeout(resolve, 1200));

      const jsonBackup = await exportDatabaseBackup();
      
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const terminalId = getStoredTerminalId();
      const dbName = getDatabaseNameForTerminal(terminalId);

      const jsonFilename = `BACKUP_${type === 'shift' ? 'ARQUEO_TURNO' : 'CIERRE_DEFINITIVO'}_${dbName}_${dateStr}_${timeStr}.json`;
      const zipFilename = `BACKUP_${type === 'shift' ? 'ARQUEO_TURNO' : 'CIERRE_DEFINITIVO'}_${dbName}_${dateStr}_${timeStr}.zip`;

      // Dynamically import fflate to prevent compilation errors during background npm installations
      let fflateModule;
      try {
        fflateModule = await import('fflate');
      } catch (e) {
        throw new Error('La librería de compresión se está terminando de descargar e instalar en segundo plano. Por favor, espere 5 segundos y vuelva a intentarlo.');
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

      // Archivar copia de seguridad inmutable directamente en el servidor local de la sucursal (/backups/)
      try {
        await fetch('/api/database/backup/closure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            metadata: {
              dateStr,
              timeStr,
              terminalId,
              dbName
            },
            clientBackupPayload: jsonBackup
          })
        });
      } catch (srvErr) {
        console.warn('[Auto-Backup Server Notice] No se pudo comunicar con /api/database/backup/closure:', srvErr);
      }

      setBackupLockState({
        isLocked: true,
        message: type === 'day'
          ? '¡Copia de seguridad obligatoria de Cierre Definitivo archivada en el servidor y descargada en ZIP con éxito!'
          : '¡Copia de seguridad de Arqueo archivada en el servidor y descargada en ZIP con éxito!',
        type
      });

      await new Promise(resolve => setTimeout(resolve, 1500));
      setBackupLockState(null);
      return true;
    } catch (err: any) {
      console.error('[Backup Error]', err);
      setBackupLockState({
        isLocked: true,
        message: `❌ Error al generar la copia de seguridad comprimida: ${err.message || 'Error desconocido'}. El proceso está bloqueado por seguridad.`,
        type
      });

      return false;
    }
  };

  useEffect(() => {
    localStorage.setItem('pk_operational_day', JSON.stringify(operationalDay));
  }, [operationalDay]);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('pk_sound_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [paymentGatewayConfig, setPaymentGatewayConfig] = useState<PaymentGatewayConfig>(() => {
    try {
      const saved = localStorage.getItem('pk_payment_gateway_config');
      return ensurePaymentGatewayConfigDefaults(saved ? JSON.parse(saved) : null);
    } catch {
      return DEFAULT_PAYMENT_GATEWAY_CONFIG;
    }
  });

  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategoryConfig[]>(() => {
    try {
      const saved = localStorage.getItem('pk_vehicle_categories');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list) && list.length > 0) {
          // Si la ranura 'bicycle' fue alterada por el texto viejo "Bicicleta / Patineta",
          // restaurar inmediatamente 'BUS' con ícono 'Bus' para garantizar la operatividad de buses
          const restored = list.map(c => {
            if (c.id === 'bicycle' && (c.name.toLowerCase().includes('bici') || c.name.toLowerCase().includes('patineta'))) {
              return {
                ...c,
                name: 'BUS',
                icon: 'Bus',
                description: 'Buses, Busetas y Transporte Colectivo'
              };
            }
            return c;
          });
          return restored;
        }
      }
      return INITIAL_VEHICLE_CATEGORIES;
    } catch {
      return INITIAL_VEHICLE_CATEGORIES;
    }
  });

  useEffect(() => {
    localStorage.setItem('pk_vehicle_categories', JSON.stringify(vehicleCategories));
  }, [vehicleCategories]);

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(() => {
    const saved = localStorage.getItem('pk_expense_categories');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSE_CATEGORIES;
  });

  useEffect(() => {
    localStorage.setItem('pk_expense_categories', JSON.stringify(expenseCategories));
  }, [expenseCategories]);

  const [expenseConcepts, setExpenseConcepts] = useState<ExpenseConcept[]>(() => {
    const saved = localStorage.getItem('pk_expense_concepts');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSE_CONCEPTS;
  });

  useEffect(() => {
    localStorage.setItem('pk_expense_concepts', JSON.stringify(expenseConcepts));
  }, [expenseConcepts]);

  const [commercialAgreements, setCommercialAgreements] = useState<CommercialAgreement[]>(() => {
    try {
      const saved = localStorage.getItem('pk_commercial_agreements');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading pk_commercial_agreements:', e);
    }
    return INITIAL_COMMERCIAL_AGREEMENTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('pk_commercial_agreements', JSON.stringify(commercialAgreements));
    } catch (e) {
      console.error('Error saving pk_commercial_agreements:', e);
    }
  }, [commercialAgreements]);

  const [closedShiftsHistory, setClosedShiftsHistory] = useState<CashShift[]>(() => {
    try {
      const saved = localStorage.getItem('pk_closed_shifts_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(s => s && s.id && !s.id.startsWith('shift-sim-') && !s.id.startsWith('shift-hist-') && !s.id.startsWith('shift-0'));
        }
      }
    } catch (e) {
      console.error('Error loading pk_closed_shifts_history:', e);
    }
    return INITIAL_CLOSED_SHIFTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('pk_closed_shifts_history', JSON.stringify(closedShiftsHistory || []));
    } catch (e) {
      console.error('Error saving pk_closed_shifts_history:', e);
    }
  }, [closedShiftsHistory]);

  const [closedDaysHistory, setClosedDaysHistory] = useState<OperationalDay[]>(() => {
    try {
      const saved = localStorage.getItem('pk_closed_days_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(d => d && d.id && !d.id.startsWith('day-sim-') && !d.id.startsWith('day-hist-') && !d.id.startsWith('day-2026') && d.id !== 'day-clean-01');
        }
      }
    } catch (e) {
      console.error('Error loading pk_closed_days_history:', e);
    }
    return INITIAL_CLOSED_DAYS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('pk_closed_days_history', JSON.stringify(closedDaysHistory || []));
    } catch (e) {
      console.error('Error saving pk_closed_days_history:', e);
    }
  }, [closedDaysHistory]);

  const handleUpdateShiftInHistory = (updatedShift: CashShift) => {
    setClosedShiftsHistory(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map(s => s && s.id === updatedShift.id ? updatedShift : s);
    });
  };

  const handleUpdateDayInHistory = (updatedDay: OperationalDay) => {
    setClosedDaysHistory(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map(d => d && d.id === updatedDay.id ? updatedDay : d);
    });
  };

  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [isSubscribersModalOpen, setIsSubscribersModalOpen] = useState(false);
  const [printers, setPrinters] = useState<PrinterConfig[]>(() => {
    try {
      const saved = localStorage.getItem('pk_printers');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error cargando impresoras desde localStorage:', e);
    }
    return [
      { id: '1', name: 'Impresora Principal (Térmica POS)', printerName: 'POS-80', port: 'USB', isDefault: true, paperSize: '80mm', enabled: true, autoCut: true, openDrawer: true }
    ];
  });
  
  const handleSavePrinter = (printer: PrinterConfig) => {
    setPrinters(prev => {
      const exists = prev.some(p => p.id === printer.id);
      let updated: PrinterConfig[];
      if (printer.isDefault) {
        // Si la que se guarda es predeterminada, desactivar isDefault en las demás
        const sanitized = prev.map(p => ({ ...p, isDefault: false }));
        updated = exists ? sanitized.map(p => p.id === printer.id ? printer : p) : [...sanitized, printer];
      } else {
        updated = exists ? prev.map(p => p.id === printer.id ? printer : p) : [...prev, printer];
      }
      try {
        localStorage.setItem('pk_printers', JSON.stringify(updated));
      } catch (e) {
        console.warn('Error guardando impresoras:', e);
      }
      dbSavePrinters(updated).catch(console.error);
      return updated;
    });
  };

  const handleDeletePrinter = (printerId: string) => {
    setPrinters(prev => {
      const updated = prev.filter(p => p.id !== printerId);
      try {
        localStorage.setItem('pk_printers', JSON.stringify(updated));
      } catch (e) {
        console.warn('Error eliminando impresora:', e);
      }
      dbSavePrinters(updated).catch(console.error);
      return updated;
    });
  };

  // --- Multi-Branch, Central Hub & OTA Updater States ---
  const [branches, setBranches] = useState<BranchLocation[]>(() => {
    try {
      let deletedSet = new Set<string>();
      try {
        const savedDeleted = localStorage.getItem('pk_deleted_branch_ids');
        if (savedDeleted) deletedSet = new Set(JSON.parse(savedDeleted));
      } catch (e) {}

      const saved = localStorage.getItem('pk_branches');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list) && list.length > 0) {
          const validList = list.filter(b => b && typeof b === 'object' && b.id && b.id !== 'branch-01' && !deletedSet.has(b.id));
          if (validList.length > 0) {
            const hasMain = validList.some(b => b.id === 'suc-001');
            const merged = hasMain ? validList : [...INITIAL_BRANCHES, ...validList];
            return ensureUniqueBranchFarmadeskCredentials(merged);
          }
        }
      }
      return ensureUniqueBranchFarmadeskCredentials(INITIAL_BRANCHES);
    } catch {
      return ensureUniqueBranchFarmadeskCredentials(INITIAL_BRANCHES);
    }
  });

  useEffect(() => {
    localStorage.setItem('pk_branches', JSON.stringify(branches));
  }, [branches]);

  const [currentBranchId, setCurrentBranchId] = useState<string>(() => {
    const saved = localStorage.getItem('pk_current_branch_id');
    return (!saved || saved === 'branch-01') ? 'suc-001' : saved;
  });

  useEffect(() => {
    localStorage.setItem('pk_current_branch_id', currentBranchId);
  }, [currentBranchId]);

  const currentBranch = branches.find(b => b.id === currentBranchId) || branches[0];

  const [centralPackages, setCentralPackages] = useState<CentralUpdatePackage[]>(() => {
    try {
      const saved = localStorage.getItem('pk_central_packages');
      return saved ? JSON.parse(saved) : INITIAL_CENTRAL_PACKAGES;
    } catch {
      return INITIAL_CENTRAL_PACKAGES;
    }
  });

  useEffect(() => {
    localStorage.setItem('pk_central_packages', JSON.stringify(centralPackages));
  }, [centralPackages]);

  // Load packages from Central Server on startup and branch switch
  useEffect(() => {
    fetchCentralPackages(currentBranchId)
      .then(remotePackages => {
        if (remotePackages && remotePackages.length > 0) {
          setCentralPackages(prev => {
            const map = new Map<string, CentralUpdatePackage>();
            const prevIds = new Set(prev.map(p => p.id));
            // Add existing local packages
            prev.forEach(p => map.set(p.id, p));
            // Add or update with remote packages
            remotePackages.forEach(p => {
              map.set(p.id, p);
              // Notificar al personal si es un paquete nuevo recibido y no aplicado
              if (!prevIds.has(p.id) && !p.appliedByBranches?.some(b => b.branchId === currentBranchId)) {
                webNotificationService.notifyPendingCentralPackage(
                  p,
                  currentBranch?.name,
                  () => setIsBranchSyncModalOpen(true)
                );
              }
            });
            return Array.from(map.values());
          });
        }
      })
      .catch(err => console.warn('[App] Error consultando paquetes remotos:', err));
  }, [currentBranchId]);

  const [softwareBuilds, setSoftwareBuilds] = useState<SoftwareReleaseBuild[]>(() => {
    try {
      const saved = localStorage.getItem('pk_software_builds');
      return saved ? JSON.parse(saved) : INITIAL_SOFTWARE_BUILDS;
    } catch {
      return INITIAL_SOFTWARE_BUILDS;
    }
  });

  useEffect(() => {
    localStorage.setItem('pk_software_builds', JSON.stringify(softwareBuilds));
  }, [softwareBuilds]);

  const [syncAuditLogs, setSyncAuditLogs] = useState<BranchSyncAuditRecord[]>(() => {
    try {
      const saved = localStorage.getItem('pk_sync_audit_logs');
      return saved ? JSON.parse(saved) : INITIAL_SYNC_AUDIT_LOGS;
    } catch {
      return INITIAL_SYNC_AUDIT_LOGS;
    }
  });

  useEffect(() => {
    localStorage.setItem('pk_sync_audit_logs', JSON.stringify(syncAuditLogs));
  }, [syncAuditLogs]);

  // --- Warehouses, POS Points & Remote Orders States ---
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => {
    try {
      const saved = localStorage.getItem('pk_warehouses');
      return saved ? JSON.parse(saved) : INITIAL_WAREHOUSES;
    } catch {
      return INITIAL_WAREHOUSES;
    }
  });

  useEffect(() => {
    localStorage.setItem('pk_warehouses', JSON.stringify(warehouses));
  }, [warehouses]);

  const [posPoints, setPosPoints] = useState<PosPoint[]>(() => {
    try {
      const saved = localStorage.getItem('pk_pos_points');
      return saved ? JSON.parse(saved) : INITIAL_POS_POINTS;
    } catch {
      return INITIAL_POS_POINTS;
    }
  });

  useEffect(() => {
    localStorage.setItem('pk_pos_points', JSON.stringify(posPoints));
  }, [posPoints]);

  const [remoteOrders, setRemoteOrders] = useState<RemoteExecutionOrder[]>(() => {
    try {
      const saved = localStorage.getItem('pk_remote_orders');
      return saved ? JSON.parse(saved) : INITIAL_REMOTE_ORDERS;
    } catch {
      return INITIAL_REMOTE_ORDERS;
    }
  });

  useEffect(() => {
    localStorage.setItem('pk_remote_orders', JSON.stringify(remoteOrders));
  }, [remoteOrders]);

  const [isBranchesModalOpen, setIsBranchesModalOpen] = useState(false);

  // Handlers para Sucursales, Bodegas y POS
  const handleSaveBranch = (branchToSave: BranchLocation) => {
    // Si la sucursal estaba marcada como eliminada previamente, desmarcarla
    try {
      const savedDeleted = localStorage.getItem('pk_deleted_branch_ids');
      if (savedDeleted) {
        const deletedIds: string[] = JSON.parse(savedDeleted);
        const filtered = deletedIds.filter(id => id !== branchToSave.id);
        localStorage.setItem('pk_deleted_branch_ids', JSON.stringify(filtered));
      }
    } catch (e) {}

    let updated: BranchLocation[] = [];
    setBranches(prev => {
      const exists = prev.some(b => b.id === branchToSave.id);
      if (exists) {
        updated = prev.map(b => b.id === branchToSave.id ? branchToSave : b);
      } else {
        updated = [branchToSave, ...prev];
      }
      localStorage.setItem('pk_branches', JSON.stringify(updated));
      return updated;
    });
    pushBranchTelemetry(branchToSave).catch(console.warn);
    saveGlobalConfigToServer({ branches: updated }).catch(console.warn);
  };

  const handleDeleteBranch = (branchId: string) => {
    if (branches.length <= 1) {
      alert('No se puede eliminar la única sucursal existente.');
      return;
    }
    if (branchId === 'suc-001' || branchId === 'branch-01') {
      alert('No se puede eliminar la Sede Principal.');
      return;
    }

    // 1. Marcar inmediatamente en el registro local de sucursales eliminadas para evitar resurrecciones
    try {
      const savedDeleted = localStorage.getItem('pk_deleted_branch_ids');
      const deletedIds: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];
      if (!deletedIds.includes(branchId)) {
        deletedIds.push(branchId);
        localStorage.setItem('pk_deleted_branch_ids', JSON.stringify(deletedIds));
      }
    } catch (e) {}

    // 2. Eliminar del estado React y de LocalStorage
    let updated: BranchLocation[] = [];
    setBranches(prev => {
      updated = prev.filter(b => b.id !== branchId);
      localStorage.setItem('pk_branches', JSON.stringify(updated));
      return updated;
    });

    // 3. Eliminar de raíz en el servidor backend (telemetría y memoria)
    deleteBranchFromServer(branchId).catch(console.warn);

    // 4. Guardar inmediatamente la lista reducida en global-config.json
    saveGlobalConfigToServer({ branches: updated }).catch(console.warn);
  };

  const handleSaveWarehouse = (whToSave: Warehouse) => {
    setWarehouses(prev => {
      const exists = prev.some(w => w.id === whToSave.id);
      if (exists) {
        return prev.map(w => w.id === whToSave.id ? whToSave : w);
      }
      return [whToSave, ...prev];
    });
  };

  const handleDeleteWarehouse = (whId: string) => {
    setWarehouses(prev => prev.filter(w => w.id !== whId));
  };

  const handleSavePosPoint = (posToSave: PosPoint) => {
    setPosPoints(prev => {
      const exists = prev.some(p => p.id === posToSave.id);
      if (exists) {
        return prev.map(p => p.id === posToSave.id ? posToSave : p);
      }
      return [posToSave, ...prev];
    });
  };

  const handleDeletePosPoint = (posId: string) => {
    setPosPoints(prev => prev.filter(p => p.id !== posId));
  };

  const handleExecuteRemoteOrder = (orderData: Omit<RemoteExecutionOrder, 'id' | 'commandNumber' | 'issuedAt' | 'status'>) => {
    const nextCmdNum = `REM-${new Date().getFullYear()}-${String(remoteOrders.length + 1).padStart(4, '0')}`;
    const newOrder: RemoteExecutionOrder = {
      ...orderData,
      id: `cmd-${Date.now()}`,
      commandNumber: nextCmdNum,
      issuedAt: new Date().toISOString(),
      status: 'completed',
      executionTimeMs: Math.floor(Math.random() * 80) + 20,
      resultMessage: `Comando ejecutado remotamente con éxito sobre ${orderData.branchName || 'Sucursal'}. Estado: OK.`
    };
    setRemoteOrders(prev => [newOrder, ...prev]);
  };

  const [isCentralHubModalOpen, setIsCentralHubModalOpen] = useState(false);
  const [centralHubInitialTab, setCentralHubInitialTab] = useState<'branches' | 'telemetry_dashboard' | 'global_version' | 'ota_releases' | 'sync_domains' | 'analytics' | 'network_logs' | 'server_config'>('branches');
  const [isBranchSyncModalOpen, setIsBranchSyncModalOpen] = useState(false);
  const [isSoftwareUpdaterModalOpen, setIsSoftwareUpdaterModalOpen] = useState(false);

  // --- Strict Node Role & Work Mode Configuration (Server vs POS) ---
  const [systemNodeConfig, setSystemNodeConfig] = useState<SystemNodeConfig>(() => {
    try {
      const saved = localStorage.getItem('pk_system_node_config');
      return saved ? JSON.parse(saved) : INITIAL_SYSTEM_NODE_CONFIG;
    } catch {
      return INITIAL_SYSTEM_NODE_CONFIG;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pk_system_node_config', JSON.stringify(systemNodeConfig));
    } catch (e) {
      console.error('Error saving pk_system_node_config:', e);
    }
  }, [systemNodeConfig]);

  const [isSystemWorkModeModalOpen, setIsSystemWorkModeModalOpen] = useState(false);

  // --- Estado de Sesión de Control y Acceso Remoto POS en Vivo ---
  const [activeRemoteSession, setActiveRemoteSession] = useState<{
    branchId: string;
    branchName: string;
    city: string;
    ipAddress: string;
    connectedAt: string;
    pingMs: number;
    mode: 'system' | 'desktop';
  } | null>(null);

  const handleConnectRemoteBranch = (branch: BranchLocation, mode: 'system' | 'desktop') => {
    setCurrentBranchId(branch.id);
    setActiveRemoteSession({
      branchId: branch.id,
      branchName: branch.name,
      city: branch.city,
      ipAddress: branch.ipAddress || '192.168.1.100',
      connectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      pingMs: Math.floor(Math.random() * 12) + 12,
      mode
    });
    if (mode === 'system') {
      setActiveCategory('operations');
      setActiveView('operations');
    } else {
      setActiveCategory('central');
      setActiveView('vnc_remote');
    }
    setIsBranchesModalOpen(false);
    playSound('success', soundEnabled);
  };

  const handleExitRemoteSession = () => {
    setActiveRemoteSession(null);
    playSound('beep', soundEnabled);
  };

  // --- Scoped Data Selectors for Remote Control or Active Branch POS ---
  const effectiveBusinessInfo = useMemo<ParkingBusinessInfo>(() => {
    const curBranch = branches.find(b => b.id === currentBranchId) || branches[0];
    const bName = curBranch?.name || businessInfo.name || 'Sucursal Principal';
    const nowStr = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    if (activeRemoteSession) {
      const targetB = branches.find(b => b.id === activeRemoteSession.branchId);
      return {
        ...businessInfo,
        name: activeRemoteSession.branchName,
        branchName: activeRemoteSession.branchName,
        sucursal: activeRemoteSession.branchName,
        address: targetB?.address || `${activeRemoteSession.city} — Sede Remota`,
        nit: `${targetB?.code || 'SUC'} - CONEXIÓN REMOTA EN VIVO`,
        phone: targetB?.phone || businessInfo.phone,
        emissionDate: nowStr,
        fechaEmision: nowStr,
      };
    }
    return {
      ...businessInfo,
      branchName: bName,
      sucursal: bName,
      emissionDate: nowStr,
      fechaEmision: nowStr,
    };
  }, [activeRemoteSession, businessInfo, branches, currentBranchId]);

  const effectiveActiveTickets = useMemo<ParkingTicket[]>(() => {
    const activeBranchId = activeRemoteSession?.branchId || currentBranchId;
    if (activeBranchId) {
      const filtered = activeTickets.filter(t => !t.branchId || t.branchId === activeBranchId);
      return filtered;
    }
    return activeTickets;
  }, [activeTickets, activeRemoteSession, currentBranchId]);

  const effectivePaidTickets = useMemo<ParkingTicket[]>(() => {
    const activeBranchId = activeRemoteSession?.branchId || currentBranchId;
    if (activeBranchId) {
      return paidTickets.filter(t => !t.branchId || t.branchId === activeBranchId);
    }
    return paidTickets;
  }, [paidTickets, activeRemoteSession, currentBranchId]);

  const effectiveSpots = useMemo<ParkingSpot[]>(() => {
    // Si tenemos spots reales configurados (de PostgreSQL o memoria), usarlos con sincronización en tiempo real
    if (spots && spots.length > 0) {
      return spots.map(s => {
        const activeTicket = effectiveActiveTickets.find(t => t.spotCode === s.code);
        if (activeTicket) {
          return { ...s, status: 'occupied' as const, currentTicketId: activeTicket.id };
        }
        if (s.status === 'occupied') {
          return { ...s, status: 'available' as const, currentTicketId: undefined };
        }
        return s;
      });
    }

    const activeBranchId = activeRemoteSession?.branchId || currentBranchId;
    if (activeBranchId) {
      const targetB = branches.find(b => b.id === activeBranchId);
      if (targetB && targetB.totalSpots > 0) {
        const branchSpots: ParkingSpot[] = [];
        const total = targetB.totalSpots;
        for (let i = 1; i <= total; i++) {
          const isCar = i <= Math.ceil(total * 0.6);
          const type = isCar ? 'car' : 'motorcycle';
          const prefix = isCar ? 'A' : 'M';
          const code = `${prefix}-${String(i).padStart(2, '0')}`;
          const currentTicket = effectiveActiveTickets.find(t => t.spotCode === code);
          branchSpots.push({
            id: `spot-branch-${targetB.id}-${i}`,
            code,
            type,
            status: currentTicket ? 'occupied' : 'available',
            currentTicketId: currentTicket?.id
          });
        }
        return branchSpots;
      }
    }
    return spots;
  }, [spots, activeRemoteSession, currentBranchId, branches, effectiveActiveTickets]);

  const handleSaveSystemNodeConfig = (updatedConfig: SystemNodeConfig) => {
    setSystemNodeConfig(updatedConfig);
    
    // Notify network services layer of updated FarmaDesk ports
    const lanPort = updatedConfig.farmadeskPort || updatedConfig.farmadeskLanPort || 9050;
    const wanPort = updatedConfig.farmadeskWanPort || 9050;
    console.log(`[Config Red] Puertos FarmaDesk actualizados: LAN/Relay=${lanPort}, WAN=${wanPort}, ServerHost=${updatedConfig.centralServerHost}:${updatedConfig.centralServerPort}`);

    // When in POS mode and a branch is chosen, sync the active branch ID
    if (updatedConfig.workMode === 'pos' && updatedConfig.selectedBranchId) {
      setCurrentBranchId(updatedConfig.selectedBranchId);
    }
    // Sync establishment name with businessInfo
    if (updatedConfig.establishmentName) {
      setBusinessInfo(prev => ({
        ...prev,
        name: updatedConfig.establishmentName,
        nit: updatedConfig.establishmentNit || prev.nit,
        representative: updatedConfig.legalRepresentative || prev.representative,
        address: updatedConfig.establishmentAddress || prev.address,
        phone: updatedConfig.establishmentPhone || prev.phone,
      }));
    }
  };

  // --- Global Parameter Synchronization (Server -> Client / POS) ---
  const [isSyncingGlobal, setIsSyncingGlobal] = useState(false);
  const [hasInitialServerLoadDone, setHasInitialServerLoadDone] = useState(false);

  const getSyncUrl = (endpoint: string) => {
    if (systemNodeConfig?.workMode === 'pos' && systemNodeConfig?.centralServerHost) {
      const host = systemNodeConfig.centralServerHost.trim();
      // Ignore dummy or local placeholder IPs that cannot be reached directly from client browser
      const isDummyHost = !host || host === 'localhost' || host === '127.0.0.1' || host === '192.168.10.150' || host === 'central.parqueaderopos.com';
      if (!isDummyHost) {
        const port = systemNodeConfig.centralServerPort || 3000;
        const baseUrl = host.startsWith('http') ? host : `http://${host}:${port}`;
        return `${baseUrl}${endpoint}`;
      }
    }
    return endpoint;
  };

  const fetchWithSyncFallback = async (endpoint: string, options?: RequestInit): Promise<Response> => {
    const targetUrl = getSyncUrl(endpoint);
    if (targetUrl !== endpoint) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2800);
        const res = await fetch(targetUrl, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) return res;
      } catch (err) {
        console.warn(`[Sync] Servidor remoto no respondió en ${targetUrl}, aplicando endpoint local de respaldo.`);
      }
    }
    return fetch(endpoint, options);
  };

  const saveGlobalConfigToServer = async (customPackage?: any) => {
    // STRICT GUARD: If this machine has a remote Central Server configured or is running as a branch,
    // it MUST NEVER push its local configuration to the Central Server!
    const serverConfig = getServerDataConfig();
    const isRemoteBranch = serverConfig?.nodeRole === 'branch' || Boolean(serverConfig?.remoteDbHost && serverConfig.remoteDbHost !== 'localhost' && serverConfig.remoteDbHost !== '127.0.0.1');
    if (isRemoteBranch || systemNodeConfig?.workMode === 'pos' || (currentBranchId && currentBranchId !== 'suc-001' && currentBranchId !== 'branch-01')) {
      console.log('[Sync Security] Terminal de sucursal detectada: Protegiendo servidor central, se bloquea el guardado de global-config.');
      return;
    }

    try {
      const savedUserTemplates = (() => {
        try {
          const t = localStorage.getItem('pk_user_templates');
          return t ? JSON.parse(t) : dbGetUserTemplates();
        } catch { return dbGetUserTemplates(); }
      })();
      const savedRoleMatrix = (() => {
        try {
          const m = localStorage.getItem('pk_role_matrix_config') || localStorage.getItem('farmadesk_role_matrix_config');
          return m ? JSON.parse(m) : dbGetRoleMatrix();
        } catch { return dbGetRoleMatrix(); }
      })();

      const baseConfig = {
        branches,
        warehouses,
        rates,
        vehicleCategories,
        expenseCategories,
        expenseConcepts,
        users,
        userTemplates: savedUserTemplates,
        roleMatrixConfig: savedRoleMatrix,
        businessInfo,
        lastUpdated: new Date().toISOString()
      };
      const configToSave = customPackage ? { ...baseConfig, ...customPackage, lastUpdated: new Date().toISOString() } : baseConfig;

      await fetch('/api/sync/global-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-wolf-node-role': 'central',
          'x-wolf-branch-id': 'suc-001'
        },
        body: JSON.stringify({ config: configToSave, nodeRole: 'central', branchId: 'suc-001' })
      });
      console.log('[Sync] Configuración global sincronizada en el servidor central.');
    } catch (e) {
      console.error('[Sync] Error al guardar config en el servidor:', e);
    }
  };

  const loadGlobalConfigFromServer = async (isManual = false) => {
    // If we are the Central Server, we only pull the config from disk ONCE on app startup.
    // Subsequent background pulls are completely skipped to prevent overwriting active UI edits before they are written to disk.
    if (systemNodeConfig?.workMode === 'server' && !isManual && hasInitialServerLoadDone) {
      return;
    }

    if (isManual) {
      setIsSyncingGlobal(true);
    }
    try {
      const res = await fetchWithSyncFallback('/api/sync/global-config');
      const result = await res.json();
      if (result.success && result.data) {
        const {
          branches: sBranches,
          warehouses: sWarehouses,
          rates: sRates,
          vehicleCategories: sVehicleCategories,
          expenseCategories: sExpenseCategories,
          expenseConcepts: sExpenseConcepts,
          users: sUsers,
          userTemplates: sUserTemplates,
          roleMatrixConfig: sRoleMatrixConfig,
          businessInfo: sBusinessInfo
        } = result.data;

        if (sBranches && Array.isArray(sBranches) && sBranches.length > 0) {
          let deletedSet = new Set<string>();
          try {
            const savedDeleted = localStorage.getItem('pk_deleted_branch_ids');
            if (savedDeleted) deletedSet = new Set(JSON.parse(savedDeleted));
          } catch (e) {}

          const validBranches = sBranches.filter((b: any) => b && typeof b === 'object' && b.id && b.id !== 'branch-01' && !deletedSet.has(b.id));
          if (validBranches.length > 0) {
            const withMain = validBranches.some(b => b.id === 'suc-001') ? validBranches : [...INITIAL_BRANCHES, ...validBranches];
            const finalBranches = ensureUniqueBranchFarmadeskCredentials(withMain);
            if (JSON.stringify(finalBranches) !== JSON.stringify(branches)) {
              setBranches(finalBranches);
              localStorage.setItem('pk_branches', JSON.stringify(finalBranches));
            }
          }
        }
        if (sWarehouses && Array.isArray(sWarehouses) && sWarehouses.length > 0) {
          const validW = sWarehouses.filter((w: any) => w && typeof w === 'object' && w.id && w.id !== 'bod-01');
          if (validW.length > 0 && JSON.stringify(validW) !== JSON.stringify(warehouses)) {
            setWarehouses(validW);
            localStorage.setItem('pk_warehouses', JSON.stringify(validW));
          }
        }
        if (sRates && JSON.stringify(sRates) !== JSON.stringify(rates)) {
          setRates(sRates);
          localStorage.setItem('pk_rates_config', JSON.stringify(sRates));
          dbSaveRates(sRates).catch(console.error);

          // Synchronize vehicle category rates immediately
          setVehicleCategories(prev => {
            const updated = prev.map(cat => {
              let r = (sRates as any)[cat.id];
              if (!r && cat.id.includes('car')) r = sRates.car;
              if (!r && (cat.id.includes('moto') || cat.id.includes('bike'))) r = sRates.motorcycle;
              if (!r) return cat;
              return {
                ...cat,
                defaultHourlyRate: r.hourRate ?? cat.defaultHourlyRate,
                defaultMinuteRate: r.minuteRate ?? cat.defaultMinuteRate,
                defaultDailyRate: r.dayRate ?? cat.defaultDailyRate,
                gracePeriodMinutes: r.gracePeriodMinutes ?? cat.gracePeriodMinutes,
                rate: { ...cat.rate, ...r }
              };
            });
            localStorage.setItem('pk_vehicle_categories', JSON.stringify(updated));
            return updated;
          });
        }
        if (sVehicleCategories && JSON.stringify(sVehicleCategories) !== JSON.stringify(vehicleCategories)) {
          setVehicleCategories(sVehicleCategories);
          localStorage.setItem('pk_vehicle_categories', JSON.stringify(sVehicleCategories));
        }
        if (sExpenseCategories && JSON.stringify(sExpenseCategories) !== JSON.stringify(expenseCategories)) {
          setExpenseCategories(sExpenseCategories);
          localStorage.setItem('pk_expense_categories', JSON.stringify(sExpenseCategories));
        }
        if (sExpenseConcepts && JSON.stringify(sExpenseConcepts) !== JSON.stringify(expenseConcepts)) {
          setExpenseConcepts(sExpenseConcepts);
          localStorage.setItem('pk_expense_concepts', JSON.stringify(sExpenseConcepts));
        }
        if (sUsers && sUsers.length > 0 && JSON.stringify(sUsers) !== JSON.stringify(users)) {
          setUsers(sUsers);
          localStorage.setItem('pk_system_users', JSON.stringify(sUsers));
          dbSaveUsers(sUsers).catch(console.error);
        }
        if (sUserTemplates && Array.isArray(sUserTemplates) && sUserTemplates.length > 0) {
          localStorage.setItem('pk_user_templates', JSON.stringify(sUserTemplates));
          dbSaveUserTemplates(sUserTemplates).catch(console.error);
        }
        if (sRoleMatrixConfig && typeof sRoleMatrixConfig === 'object') {
          localStorage.setItem('pk_role_matrix_config', JSON.stringify(sRoleMatrixConfig));
          dbSaveRoleMatrix(sRoleMatrixConfig).catch(console.error);
        }
        if (sBusinessInfo && JSON.stringify(sBusinessInfo) !== JSON.stringify(businessInfo)) {
          setBusinessInfo(sBusinessInfo);
          localStorage.setItem('pk_business_info', JSON.stringify(sBusinessInfo));
          dbSaveBusinessInfo(sBusinessInfo).catch(console.error);
        }
        console.log('[Sync] Parámetros globales cargados/actualizados desde el servidor.');
      }
      setHasInitialServerLoadDone(true);
    } catch (e) {
      console.error('[Sync] Error al cargar config desde el servidor:', e);
    } finally {
      if (isManual) {
        setTimeout(() => {
          setIsSyncingGlobal(false);
        }, 800);
      }
    }
  };

  const handleManualSyncParams = async () => {
    await loadGlobalConfigFromServer(true);
  };

  // 1. Initial Load on startup
  useEffect(() => {
    loadGlobalConfigFromServer();
  }, [
    systemNodeConfig?.workMode, 
    systemNodeConfig?.centralServerHost, 
    systemNodeConfig?.centralServerPort
  ]);

  // 1.2 Rutina de Verificación de Integridad de Base de Datos y Carpeta Data
  useEffect(() => {
    const verifyDatabaseIntegrity = async () => {
      try {
        const res = await fetch('/api/database/integrity-check');
        if (res.ok) {
          const data: IntegrityCheckResult = await res.json();
          setIntegrityCheckData(data);
          const hasSessionBypass = sessionStorage.getItem('wolfpos_integrity_bypass') === 'true';
          if ((data.corrupted || (!data.healthy && data.issues?.length > 0)) && !hasSessionBypass) {
            console.warn('[Integrity Guard] Inconsistencia detectada en archivos de base de datos:', data.issues);
            setIsRecoveryModalOpen(true);
          }
        }
      } catch (err) {
        console.warn('[Integrity Guard] Error al comprobar integridad de PostgreSQL:', err);
      }
    };

    verifyDatabaseIntegrity();
  }, []);

  const handleRecoveryRestoreSuccess = async () => {
    setIsRecoveryModalOpen(false);
    sessionStorage.removeItem('wolfpos_integrity_bypass');
    playSound('success', soundEnabled);
    try {
      await loadGlobalConfigFromServer(true);
      const bootData = await loadTerminalDatabaseData(terminalConfig.terminalId);
      if (bootData) {
        if (bootData.spots) setSpots(bootData.spots);
        if (bootData.activeTickets) setActiveTickets(bootData.activeTickets);
        if (bootData.paidTickets) setPaidTickets(bootData.paidTickets);
        if (bootData.rates) setRates(bootData.rates);
        if (bootData.businessInfo) setBusinessInfo(bootData.businessInfo);
        if (bootData.currentShift) setCurrentShift(bootData.currentShift);
      }
    } catch (e) {
      console.error('[Recovery] Error refrescando datos tras restaurar:', e);
    }
  };

  const handleContinueOffline = () => {
    sessionStorage.setItem('wolfpos_integrity_bypass', 'true');
    setIsRecoveryModalOpen(false);
    playSound('beep', soundEnabled);
  };

  // 1.3 Verificación de Espacio en Disco del Host al Iniciar (< 500MB crítico)
  useEffect(() => {
    const checkHostDiskSpace = async () => {
      try {
        const res = await fetch('/api/system/disk-space');
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.freeMB === 'number') {
            setDiskSpaceInfo(data);
            if (data.isCritical) {
              console.error(`[ALERTA CRÍTICA DISCO] Espacio en disco host crítico: ${data.freeMB} MB (< 500MB).`);
            }
          }
        }
      } catch (err) {
        console.warn('[Disk Space Guard] Error consultando espacio en disco:', err);
      }
    };

    checkHostDiskSpace();
  }, []);

  // --- Función de Auditoría Automática de Estado de Base de Datos para Cambios Críticos ---
  const logCriticalDatabaseState = (action: string, details?: any) => {
    try {
      const occupiedSpotsCount = spots.filter(s => s.status === 'occupied').length;
      const op = currentUser?.name || currentShift.operatorName || 'Cajero';
      const payload = {
        action,
        operator: op,
        terminalId: terminalConfig.terminalId,
        details: details || {},
        databaseState: {
          activeTicketsCount: activeTickets.length,
          paidTicketsCount: paidTickets.length,
          occupiedSpotsCount,
          totalSpotsCount: spots.length,
          currentShiftId: currentShift.id,
          shiftNumber: currentShift.shiftNumber,
          initialCash: currentShift.initialCash,
          timestamp: new Date().toISOString()
        }
      };

      // 1. Envío al backend
      fetch('/api/audit/state-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => console.warn('[Audit Log API Error]:', err));

      // 2. Registro en IndexedDB local
      dbAddAuditLog(
        action,
        `[AUDITORÍA DE ESTADO]: ${action} ${JSON.stringify(details || {})}`,
        op
      ).catch(console.error);
    } catch (e) {
      console.warn('[Audit Log Guard Error]:', e);
    }
  };

  // 1.5. Conexión WebSocket y Heartbeat REST en segundo plano para Sucursal (Enlace de Red e IP Pública en Vivo)
  useEffect(() => {
    if (systemNodeConfig?.workMode !== 'pos') return;

    let localPublicIp = currentBranch?.publicIp || currentBranch?.ipAddress || '190.158.12.44';

    // Intenta auto-detectar la IP pública real de la sucursal de forma automática
    const detectIpAndReport = async () => {
      try {
        const detected = await detectCurrentPublicIp(systemNodeConfig?.centralServerHost);
        if (detected && detected !== '127.0.0.1') {
          localPublicIp = detected;
          console.log(`[FarmaDesk Autodetección] IP pública de la sede detectada: ${localPublicIp}`);
        }
        
        // Reportar directamente a Central vía REST
        await reportBranchHeartbeatAndIp(currentBranchId, {
          localIp: currentBranch?.localIp || '192.168.1.100',
          port: currentBranch?.port || 3000,
          farmadeskId: currentBranch?.farmadeskId,
          farmadeskPassword: currentBranch?.farmadeskPassword
        }, systemNodeConfig?.centralServerHost);
      } catch (err) {
        console.warn('[FarmaDesk IP Check Error]', err);
      }
    };

    detectIpAndReport();

    console.log(`[FarmaDesk Sede] Iniciando túnel de red WebSocket para Sede ${currentBranchId}...`);
    const branchSocket = new FarmaDeskSocketClient('branch', currentBranchId, systemNodeConfig?.centralServerHost);
    branchSocket.connect();

    // Enviar telemetría de red, IP pública y hardware periódica (cada 15 segundos)
    const intervalId = setInterval(() => {
      // Re-detectar IP y reportar
      detectIpAndReport();

      branchSocket.reportNetworkTelemetry({
        ipAddress: localPublicIp,
        publicIp: localPublicIp,
        localIp: currentBranch?.localIp || '192.168.1.100',
        systemUrl: `${window.location.protocol}//${window.location.host}/?branchId=${currentBranchId}`,
        farmadeskId: currentBranch?.farmadeskId || '770 130 282',
        farmadeskPassword: currentBranch?.farmadeskPassword || 'farma_secure_pass',
        anydeskId: currentBranch?.farmadeskId || '770 130 282',
        rustdeskId: currentBranch?.rustdeskId || '904812354',
        vncPassword: currentBranch?.farmadeskPassword || 'farma_secure_pass',
        cpuLoad: Math.floor(Math.random() * 20) + 15,
        ramLoad: parseFloat((Math.random() * 1.5 + 3.5).toFixed(2)),
        activeCashier: currentBranch?.currentCashier || currentUser?.name || 'Cajero de Turno',
        status: 'online'
      });
    }, 15000);

    const unsubscribe = branchSocket.registerOnMessage((event, data) => {
      console.log(`[FarmaDesk Sede WS] Recibido de Central: '${event}'`, data);
      
      if (event === 'branch:control:action_received') {
        const { actionType, params } = data;
        console.log(`[FarmaDesk Sede WS] Ejecutando acción remota: ${actionType}`);

        // Responder con estado de pantalla actualizado para simular AnyDesk bidireccional en tiempo real
        branchSocket.sendBranchScreenUpdate({
          cpuLoad: Math.floor(Math.random() * 15) + 30,
          ramLoad: parseFloat((Math.random() * 0.5 + 4.1).toFixed(2)),
          entryPlate: params?.plate || '',
          vncViewMode: params?.viewMode || 'tickets',
          printJobs: [
            { id: String(Date.now()).slice(-5), time: new Date().toLocaleTimeString(), desc: `Acción Remota: ${actionType}`, status: 'Impreso OK' }
          ]
        });
      }
      else if (event === 'chat:message_received') {
        console.log(`[Chat Central] Soporte Técnico: ${data.text}`);
        playSound('beep');
      }
      else if (event === 'central:package_published') {
        const pkg = data?.package || data;
        if (pkg && pkg.id) {
          webNotificationService.notifyPendingCentralPackage(
            pkg,
            currentBranch?.name,
            () => setIsBranchSyncModalOpen(true)
          );
        }
      }
    });

    return () => {
      clearInterval(intervalId);
      unsubscribe();
      branchSocket.disconnect();
    };
  }, [systemNodeConfig?.workMode, systemNodeConfig?.centralServerHost, currentBranchId, currentBranch, currentUser]);

  // 1.8. Servidor Central & POS: Monitoreo periódico de telemetría y consolidado de sucursales en vivo
  useEffect(() => {
    let isMounted = true;

    const pullBranchesTelemetryFromDisk = async () => {
      try {
        const telemetryList = await fetchBranchesTelemetry();
        if (isMounted && Array.isArray(telemetryList) && telemetryList.length > 0) {
          let deletedSet = new Set<string>();
          try {
            const savedDeleted = localStorage.getItem('pk_deleted_branch_ids');
            if (savedDeleted) deletedSet = new Set(JSON.parse(savedDeleted));
          } catch (e) {}

          setBranches(prev => {
            // Filtrar cualquier sede que haya sido eliminada por el usuario
            const activePrev = prev.filter(b => !deletedSet.has(b.id));
            let hasChanges = activePrev.length !== prev.length;

            const updated = activePrev.map(branch => {
              const telemetry = telemetryList.find(t => t.id === branch.id);
              if (telemetry) {
                const newPublicIp = telemetry.publicIp || telemetry.reportedPublicIp || telemetry.ipAddress || branch.ipAddress;
                const newStatus = telemetry.status || branch.status;
                const isCurrent = branch.id === currentBranchId;

                // Para sucursales remotas, tomar directamente los valores del servidor
                // Para la sucursal actual local, conservar ventas activas locales si son mayores
                const newRevenue = isCurrent 
                  ? Math.max(branch.todayRevenue || 0, telemetry.todayRevenue || 0)
                  : (telemetry.todayRevenue ?? branch.todayRevenue);

                const newOccupied = isCurrent
                  ? branch.occupiedSpots
                  : (telemetry.occupiedSpots ?? branch.occupiedSpots);

                const newTotalSpots = telemetry.totalSpots ?? branch.totalSpots;
                const newVehicles = isCurrent
                  ? Math.max(branch.todayVehicles || 0, telemetry.todayVehicles || 0)
                  : (telemetry.todayVehicles ?? branch.todayVehicles);

                const newGlobalVer = telemetry.installedGlobalVersion || branch.installedGlobalVersion;
                const newIsGlobalOutdated = telemetry.isGlobalOutdated !== undefined ? telemetry.isGlobalOutdated : branch.isGlobalOutdated;
                const newShiftSummary = telemetry.financialShiftSummary || branch.financialShiftSummary;

                const hasDiff = 
                  branch.todayRevenue !== newRevenue ||
                  branch.occupiedSpots !== newOccupied ||
                  branch.totalSpots !== newTotalSpots ||
                  branch.todayVehicles !== newVehicles ||
                  branch.status !== newStatus ||
                  branch.installedGlobalVersion !== newGlobalVer ||
                  branch.isGlobalOutdated !== newIsGlobalOutdated ||
                  branch.ipAddress !== newPublicIp ||
                  branch.publicIp !== newPublicIp;

                if (hasDiff) {
                  hasChanges = true;
                  if (branch.status === 'online' && newStatus === 'offline') {
                    webNotificationService.notifyBranchCriticalState(
                      branch,
                      `La sucursal ${branch.name} ha perdido comunicación con la Central y pasó a estado Fuera de Línea`,
                      undefined,
                      () => setIsBranchesModalOpen(true)
                    );
                  }

                  return {
                    ...branch,
                    ...telemetry,
                    isCurrentBranch: isCurrent,
                    publicIp: newPublicIp,
                    reportedPublicIp: newPublicIp,
                    ipAddress: newPublicIp,
                    localIp: telemetry.localIp || branch.localIp,
                    status: newStatus,
                    todayRevenue: newRevenue,
                    occupiedSpots: newOccupied,
                    totalSpots: newTotalSpots,
                    todayVehicles: newVehicles,
                    installedGlobalVersion: newGlobalVer,
                    isGlobalOutdated: newIsGlobalOutdated,
                    financialShiftSummary: newShiftSummary,
                    lastSyncTimestamp: (telemetry as any).lastReportedAt || telemetry.lastSyncTimestamp || branch.lastSyncTimestamp,
                    lastIpReportedAt: telemetry.lastIpReportedAt || branch.lastIpReportedAt,
                    farmadeskId: telemetry.farmadeskId || branch.farmadeskId,
                    farmadeskPassword: telemetry.farmadeskPassword || branch.farmadeskPassword
                  };
                }
              }
              return branch;
            });

            return hasChanges ? updated : prev;
          });
        }
      } catch (err) {
        // quiet fallback
      }
    };

    pullBranchesTelemetryFromDisk();
    const pollInterval = setInterval(pullBranchesTelemetryFromDisk, 4000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [currentBranchId]);

  // 2. Debounced automatic push for server role (Central)
  useEffect(() => {
    if (systemNodeConfig?.workMode === 'server') {
      const delayDebounceFn = setTimeout(() => {
        saveGlobalConfigToServer();
      }, 2500); // 2.5s debounce to cluster close updates
      return () => clearTimeout(delayDebounceFn);
    }
  }, [
    systemNodeConfig?.workMode,
    branches,
    warehouses,
    rates,
    vehicleCategories,
    expenseCategories,
    expenseConcepts,
    users,
    businessInfo
  ]);

  const handleAddNewBranchFromConfig = (newBranchData: Partial<BranchLocation>) => {
    const newBranch: BranchLocation = {
      id: `branch-${Date.now()}`,
      code: newBranchData.code || `SUC-00${branches.length + 1}`,
      name: newBranchData.name || 'Nueva Sucursal',
      city: newBranchData.city || 'Bogotá D.C.',
      address: newBranchData.address || '',
      ipAddress: newBranchData.ipAddress || '192.168.1.105',
      status: 'online',
      todayRevenue: 0,
      occupiedSpots: 0,
      totalSpots: newBranchData.totalSpots || 30,
      activeShiftNumber: 1,
      currentCashier: currentUser?.name || 'Administrador',
      lastSyncTimestamp: new Date().toISOString(),
      pendingUpdatesCount: 0,
      ...newBranchData
    } as BranchLocation;

    try {
      const savedDeleted = localStorage.getItem('pk_deleted_branch_ids');
      if (savedDeleted) {
        const deletedIds: string[] = JSON.parse(savedDeleted);
        const filtered = deletedIds.filter(id => id !== newBranch.id);
        localStorage.setItem('pk_deleted_branch_ids', JSON.stringify(filtered));
      }
    } catch (e) {}

    let updatedList: BranchLocation[] = [];
    setBranches(prev => {
      updatedList = ensureUniqueBranchFarmadeskCredentials([newBranch, ...prev.filter(b => b.id !== newBranch.id)]);
      localStorage.setItem('pk_branches', JSON.stringify(updatedList));
      return updatedList;
    });
    setSystemNodeConfig(prev => ({
      ...prev,
      selectedBranchId: newBranch.id,
      establishmentName: newBranch.name
    }));
    setCurrentBranchId(newBranch.id);
    pushBranchTelemetry(newBranch).catch(console.warn);
    saveGlobalConfigToServer({ branches: updatedList }).catch(console.warn);
  };

  // Compute pending updates for current branch
  const pendingUpdatesForBranchCount = centralPackages.filter(pkg => {
    const isTarget = pkg.targetScope === 'all' || pkg.targetBranchIds.includes(currentBranch.id);
    const isApplied = pkg.appliedByBranches.some(app => app.branchId === currentBranch.id);
    return isTarget && !isApplied;
  }).length;

  const hasSoftwareUpdateAvailable = softwareBuilds.some(b => b.status === 'available');

  // Multi-Branch Handlers
  const handleSaveNewBranch = async (newBranchData: Partial<BranchLocation>) => {
    const branchCode = newBranchData.code || `SUC-00${branches.length + 1}`;
    const branchName = newBranchData.name || 'Nueva Sucursal';
    const uniqueFarmadeskId = newBranchData.farmadeskId && (newBranchData.farmadeskId !== '891 042 150')
      ? newBranchData.farmadeskId
      : generateFarmadeskId(`${branchCode}-${Date.now()}`);
    const uniqueFarmadeskPass = newBranchData.farmadeskPassword && !(newBranchData.farmadeskPassword || '').includes('farma')
      ? newBranchData.farmadeskPassword
      : generateFarmadeskPassword(branchCode || branchName);

    const newBranch: BranchLocation = {
      id: `branch-${Date.now()}`,
      code: branchCode,
      name: branchName,
      city: newBranchData.city || 'Bogotá D.C.',
      address: newBranchData.address || '',
      ipAddress: newBranchData.ipAddress || '192.168.10.155',
      port: newBranchData.port || 3000,
      farmadeskId: uniqueFarmadeskId,
      farmadeskPassword: uniqueFarmadeskPass,
      anydeskId: uniqueFarmadeskId,
      vncPassword: uniqueFarmadeskPass,
      status: 'online',
      todayRevenue: 0,
      occupiedSpots: 0,
      totalSpots: newBranchData.totalSpots || 30,
      activeShiftNumber: 1,
      currentCashier: 'Sin asignar',
      lastSyncTimestamp: new Date().toISOString(),
      pendingUpdatesCount: 0,
      ...newBranchData
    } as BranchLocation;

    try {
      const savedDeleted = localStorage.getItem('pk_deleted_branch_ids');
      if (savedDeleted) {
        const deletedIds: string[] = JSON.parse(savedDeleted);
        const filtered = deletedIds.filter(id => id !== newBranch.id);
        localStorage.setItem('pk_deleted_branch_ids', JSON.stringify(filtered));
      }
    } catch (e) {}

    let updatedList: BranchLocation[] = [];
    setBranches(prev => {
      updatedList = ensureUniqueBranchFarmadeskCredentials([newBranch, ...prev.filter(b => b.id !== newBranch.id)]);
      localStorage.setItem('pk_branches', JSON.stringify(updatedList));
      return updatedList;
    });
    
    // Add sync log
    const auditRecord: BranchSyncAuditRecord = {
      id: `log-${Date.now()}`,
      branchId: newBranch.id,
      branchName: newBranch.name,
      syncType: 'inbound_push',
      summary: `Sucursal registrada en red central por ${currentUser?.name || 'Administrador'}`,
      status: 'success',
      timestamp: new Date().toISOString(),
      itemsReceived: 0,
      itemsSent: 1,
      performedBy: currentUser?.name || 'Maestro'
    };
    setSyncAuditLogs(prev => [auditRecord, ...prev]);
    pushBranchTelemetry(newBranch).catch(console.warn);
    saveGlobalConfigToServer({ branches: updatedList }).catch(console.warn);
  };

  const handlePublishCentralPackage = async (packageData: Partial<CentralUpdatePackage>) => {
    // STRICT GUARD: Only the Central Server (suc-001) can issue packages
    const serverConfig = getServerDataConfig();
    const isRemoteBranch = serverConfig?.nodeRole === 'branch' || Boolean(serverConfig?.remoteDbHost && serverConfig.remoteDbHost !== 'localhost' && serverConfig.remoteDbHost !== '127.0.0.1');
    if (isRemoteBranch || systemNodeConfig?.workMode === 'pos' || (currentBranchId && currentBranchId !== 'suc-001' && currentBranchId !== 'branch-01')) {
      console.warn('[Sync Security] ⛔ Operación bloqueada: Solo el Servidor Central puede publicar paquetes a la red.');
      return;
    }

    const newPackage: CentralUpdatePackage = {
      id: `pkg-${Date.now()}`,
      packageNumber: `PKG-${(centralPackages.length + 101).toString()}`,
      title: packageData.title || 'Actualización de Parámetros',
      description: packageData.description || 'Nuevas directrices enviadas desde servidor central',
      type: packageData.type || 'rates',
      targetScope: packageData.targetScope || 'all',
      targetBranchIds: packageData.targetBranchIds || [],
      createdAt: new Date().toISOString(),
      author: currentUser?.name || 'Administrador Central',
      appliedByBranches: [
        {
          branchId: 'suc-001',
          branchName: 'Sede Principal (Servidor Central)',
          appliedAt: new Date().toISOString()
        }
      ],
      payload: packageData.payload || {}
    };

    setCentralPackages(prev => {
      const updated = [newPackage, ...prev];
      localStorage.setItem('pk_central_packages', JSON.stringify(updated));
      return updated;
    });

    if (newPackage.payload.rates) {
      setRates(newPackage.payload.rates);
      localStorage.setItem('pk_rates_config', JSON.stringify(newPackage.payload.rates));
      dbSaveRates(newPackage.payload.rates).catch(console.error);
    }
    if (newPackage.payload.vehicleCategories) {
      setVehicleCategories(newPackage.payload.vehicleCategories);
      localStorage.setItem('pk_vehicle_categories', JSON.stringify(newPackage.payload.vehicleCategories));
    }
    if (newPackage.payload.expenseConcepts) {
      setExpenseConcepts(newPackage.payload.expenseConcepts);
      localStorage.setItem('pk_expense_concepts', JSON.stringify(newPackage.payload.expenseConcepts));
    }

    // Persist to central server backend
    try {
      await publishCentralPackage(newPackage);
      await saveGlobalConfigToServer({
        branches,
        warehouses,
        rates: newPackage.payload.rates || rates,
        vehicleCategories: newPackage.payload.vehicleCategories || vehicleCategories,
        expenseCategories,
        expenseConcepts: newPackage.payload.expenseConcepts || expenseConcepts,
        users,
        businessInfo,
        lastUpdated: new Date().toISOString()
      });
    } catch (err) {
      console.warn('[Sync] Advertencia al persistir en servidor central:', err);
    }

    // If target includes current branch or all, and it's rates or concepts, update immediately if desired or notify
    const auditRecord: BranchSyncAuditRecord = {
      id: `log-${Date.now()}`,
      branchId: 'central-hub',
      branchName: 'Matriz / Servidor Central',
      syncType: 'inbound_push',
      summary: `Paquete ${newPackage.packageNumber} ("${newPackage.title}") publicado en Servidor Central y emitido a sucursales`,
      status: 'success',
      timestamp: new Date().toISOString(),
      itemsReceived: 0,
      itemsSent: newPackage.targetScope === 'all' ? branches.length : newPackage.targetBranchIds.length,
      performedBy: currentUser?.name || 'Maestro'
    };
    setSyncAuditLogs(prev => [auditRecord, ...prev]);
  };

  const applyPackagePayloadDirectly = async (pkg: CentralUpdatePackage, allPackagesList?: CentralUpdatePackage[]): Promise<{ applied: boolean; details: string[] }> => {
    if (!pkg || !pkg.payload) return { applied: false, details: [] };
    const details: string[] = [];

    // 1. Rates
    if (pkg.payload.rates) {
      const mergedRates: RatesConfig = {
        ...rates,
        ...pkg.payload.rates,
        car: {
          ...rates.car,
          ...(pkg.payload.rates.car || {})
        },
        motorcycle: {
          ...rates.motorcycle,
          ...(pkg.payload.rates.motorcycle || {})
        },
        suv: {
          ...rates.suv,
          ...(pkg.payload.rates.suv || {})
        }
      };

      setRates(mergedRates);
      localStorage.setItem('pk_rates_config', JSON.stringify(mergedRates));
      await dbSaveRates(mergedRates).catch(console.error);

      // Propagate into vehicleCategories
      setVehicleCategories(prev => {
        const updated = prev.map(cat => {
          let r = (mergedRates as any)[cat.id];
          if (!r && cat.id.includes('car')) r = mergedRates.car;
          if (!r && (cat.id.includes('moto') || cat.id.includes('bike'))) r = mergedRates.motorcycle;
          if (!r) return cat;

          return {
            ...cat,
            defaultHourlyRate: r.hourRate ?? cat.defaultHourlyRate,
            defaultMinuteRate: r.minuteRate ?? cat.defaultMinuteRate,
            defaultDailyRate: r.dayRate ?? cat.defaultDailyRate,
            gracePeriodMinutes: r.gracePeriodMinutes ?? cat.gracePeriodMinutes,
            rate: {
              ...cat.rate,
              ...r
            }
          };
        });
        localStorage.setItem('pk_vehicle_categories', JSON.stringify(updated));
        return updated;
      });

      const carMin = mergedRates.minuteRate || mergedRates.car?.minuteRate || 70;
      const motoMin = mergedRates.motorcycle?.minuteRate || 35;
      details.push(`Tarifas actualizadas (Carros: $${carMin}/min, Motos: $${motoMin}/min)`);
    }

    // 2. Vehicle categories
    if (pkg.payload.vehicleCategories && Array.isArray(pkg.payload.vehicleCategories)) {
      setVehicleCategories(prev => {
        const map = new Map<string, VehicleCategoryConfig>();
        prev.forEach(c => map.set(c.id, c));
        pkg.payload.vehicleCategories.forEach((c: VehicleCategoryConfig) => {
          const existing = map.get(c.id);
          // Proteger la configuración personalizada: si existing es BUS y c viene con 'Bicicleta', respetar BUS
          if (existing && existing.name.toUpperCase() === 'BUS' && c.name.toLowerCase().includes('bici')) {
            map.set(c.id, existing);
          } else {
            map.set(c.id, existing ? { ...existing, ...c } : c);
          }
        });
        const combined = Array.from(map.values());
        localStorage.setItem('pk_vehicle_categories', JSON.stringify(combined));
        return combined;
      });
      details.push(`${pkg.payload.vehicleCategories.length} categorías vehiculares sincronizadas`);
    }

    // 3. Expense concepts
    if (pkg.payload.expenseConcepts && Array.isArray(pkg.payload.expenseConcepts)) {
      setExpenseConcepts(prev => {
        const map = new Map<string, ExpenseConcept>();
        prev.forEach(c => map.set(c.id, c));
        pkg.payload.expenseConcepts.forEach((c: ExpenseConcept) => {
          map.set(c.id, c);
        });
        const combined = Array.from(map.values());
        localStorage.setItem('pk_expense_concepts', JSON.stringify(combined));
        dbSaveExpenseConcepts(combined).catch(console.error);
        return combined;
      });
      details.push(`${pkg.payload.expenseConcepts.length} conceptos de egresos integrados`);
    }

    // 4. Expense categories
    if (pkg.payload.expenseCategories && Array.isArray(pkg.payload.expenseCategories)) {
      setExpenseCategories(prev => {
        const map = new Map<string, ExpenseCategory>();
        prev.forEach(c => map.set(c.id, c));
        pkg.payload.expenseCategories.forEach((c: ExpenseCategory) => {
          map.set(c.id, c);
        });
        const combined = Array.from(map.values());
        localStorage.setItem('pk_expense_categories', JSON.stringify(combined));
        dbSaveExpenseCategories(combined).catch(console.error);
        return combined;
      });
    }

    // 5. Users, Cashiers, User Templates and Role Matrix
    if (pkg.payload.users && Array.isArray(pkg.payload.users) && pkg.payload.users.length > 0) {
      setUsers(prev => {
        const map = new Map<string, SystemUser>();
        prev.forEach(u => map.set(u.id, u));
        pkg.payload.users!.forEach((u: SystemUser) => {
          map.set(u.id, u);
        });
        const combined = Array.from(map.values());
        localStorage.setItem('pk_system_users', JSON.stringify(combined));
        dbSaveUsers(combined).catch(console.error);
        return combined;
      });
      details.push(`${pkg.payload.users.length} usuarios/cajeros sincronizados desde Central`);
    }

    if (pkg.payload.userTemplates && Array.isArray(pkg.payload.userTemplates) && pkg.payload.userTemplates.length > 0) {
      localStorage.setItem('pk_user_templates', JSON.stringify(pkg.payload.userTemplates));
      dbSaveUserTemplates(pkg.payload.userTemplates).catch(console.error);
      details.push(`${pkg.payload.userTemplates.length} perfiles/plantillas sincronizadas`);
    }

    if (pkg.payload.roleMatrixConfig && typeof pkg.payload.roleMatrixConfig === 'object') {
      localStorage.setItem('pk_role_matrix_config', JSON.stringify(pkg.payload.roleMatrixConfig));
      dbSaveRoleMatrix(pkg.payload.roleMatrixConfig).catch(console.error);
      details.push('Matriz de permisos de roles sincronizada');
    }

    // 6. Business Information and Commercial Parameters
    if (pkg.payload.businessInfoUpdates) {
      setBusinessInfo(prev => {
        const merged = { ...prev, ...pkg.payload.businessInfoUpdates };
        localStorage.setItem('pk_business_info', JSON.stringify(merged));
        dbSaveBusinessInfo(merged).catch(console.error);
        return merged;
      });
      details.push('Parámetros comerciales y fiscales actualizados');
    }

    // 7. System & App Parameters
    if (pkg.payload.parameters) {
      try {
        localStorage.setItem('pk_central_parameters', JSON.stringify(pkg.payload.parameters));
        details.push('Parámetros operativos de la aplicación actualizados');
      } catch (e) {
        console.warn('[Sync] Error guardando parámetros:', e);
      }
    }

    // 7b. Branches / Sedes
    if (pkg.payload.branches && Array.isArray(pkg.payload.branches) && pkg.payload.branches.length > 0) {
      setBranches(ensureUniqueBranchFarmadeskCredentials(pkg.payload.branches));
      details.push(`${pkg.payload.branches.length} sucursales sincronizadas`);
    }

    // 7c. Warehouses / Bodegas
    if (pkg.payload.warehouses && Array.isArray(pkg.payload.warehouses) && pkg.payload.warehouses.length > 0) {
      setWarehouses(pkg.payload.warehouses);
      details.push(`${pkg.payload.warehouses.length} bodegas/almacenes sincronizados`);
    }

    // 7d. POS Points / Cajas
    if (pkg.payload.posPoints && Array.isArray(pkg.payload.posPoints) && pkg.payload.posPoints.length > 0) {
      setPosPoints(pkg.payload.posPoints);
      details.push(`${pkg.payload.posPoints.length} terminales POS sincronizadas`);
    }

    // 8. Global Version Registration
    if (pkg.payload.globalVersion) {
      const nowApplied = new Date().toISOString();
      setInstalledGlobalVersionAndDate(pkg.payload.globalVersion, nowApplied);
      setBranches(prev => prev.map(b => b.id === currentBranch.id ? {
        ...b,
        installedGlobalVersion: pkg.payload.globalVersion,
        installedGlobalAt: nowApplied,
        isGlobalOutdated: false
      } : b));
      details.push(`Versión de Globales elevada a ${pkg.payload.globalVersion}`);
    }

    // 9. Mark package as applied in local state and localStorage
    setCentralPackages(prev => {
      const list = allPackagesList || prev;
      const updated = list.map(p => {
        if (p.id === pkg.id) {
          const existingApps = p.appliedByBranches || [];
          const filtered = existingApps.filter(a => a.branchId !== currentBranch.id && a.branchId !== currentBranch.code);
          filtered.push({
            branchId: currentBranch.id,
            branchName: currentBranch.name,
            appliedAt: new Date().toISOString()
          });
          return { ...p, appliedByBranches: filtered };
        }
        return p;
      });
      localStorage.setItem('pk_central_packages', JSON.stringify(updated));
      return updated;
    });

    // Notify backend
    try {
      await recordPackageApplied(pkg.id, currentBranch.id, currentBranch.name);
    } catch (e) {
      console.warn('[Sync] Error notificando paquete aplicado:', e);
    }

    // Audit log
    const auditRecord: BranchSyncAuditRecord = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      branchId: currentBranch.id,
      branchName: currentBranch.name,
      syncType: 'inbound_push',
      summary: `Paquete ${pkg.packageNumber} ("${pkg.title}") aplicado en terminal local con éxito`,
      status: 'success',
      timestamp: new Date().toISOString(),
      itemsReceived: 1,
      itemsSent: 0,
      performedBy: currentUser?.name || 'Cajero'
    };
    setSyncAuditLogs(prev => [auditRecord, ...prev]);

    return { applied: true, details };
  };

  const handleApplyPackageToBranch = async (packageId: string) => {
    // Look up in state or re-fetch from central packages
    let pkg = centralPackages.find(p => p.id === packageId);
    if (!pkg) {
      const refreshed = await fetchCentralPackages(currentBranch.id);
      pkg = refreshed.find(p => p.id === packageId);
    }
    if (!pkg) return;

    await applyPackagePayloadDirectly(pkg);
  };

  const handlePerformFullBranchSync = async (): Promise<string> => {
    const appliedSummaryDetails: string[] = [];
    let packagesAppliedCount = 0;

    // 1. Pull data directly from Central Server
    let currentRemotePackages: CentralUpdatePackage[] = centralPackages;
    try {
      const centralData = await pullCentralData(currentBranch.id);
      if (centralData.success && centralData.packages && centralData.packages.length > 0) {
        currentRemotePackages = centralData.packages;
        setCentralPackages(centralData.packages);
        localStorage.setItem('pk_central_packages', JSON.stringify(centralData.packages));
      }

      // If centralData returned direct globalConfig, apply it immediately
      if (centralData.globalConfig?.rates) {
        const gRates = centralData.globalConfig.rates;
        setRates(gRates);
        localStorage.setItem('pk_rates_config', JSON.stringify(gRates));
        await dbSaveRates(gRates).catch(console.error);

        setVehicleCategories(prev => {
          const updated = prev.map(cat => {
            let r = (gRates as any)[cat.id];
            if (!r && cat.id.includes('car')) r = gRates.car;
            if (!r && (cat.id.includes('moto') || cat.id.includes('bike'))) r = gRates.motorcycle;
            if (!r) return cat;
            return {
              ...cat,
              defaultHourlyRate: r.hourRate ?? cat.defaultHourlyRate,
              defaultMinuteRate: r.minuteRate ?? cat.defaultMinuteRate,
              defaultDailyRate: r.dayRate ?? cat.defaultDailyRate,
              gracePeriodMinutes: r.gracePeriodMinutes ?? cat.gracePeriodMinutes,
              rate: { ...cat.rate, ...r }
            };
          });
          localStorage.setItem('pk_vehicle_categories', JSON.stringify(updated));
          return updated;
        });
        appliedSummaryDetails.push('Directiva de tarifas centrales actualizada');
      }
      if (centralData.globalConfig?.vehicleCategories) {
        const incomingCats = centralData.globalConfig.vehicleCategories;
        setVehicleCategories(prev => {
          const healed = incomingCats.map(c => {
            const existing = prev.find(p => p.id === c.id);
            // Proteger si el usuario tiene BUS y desde la central viene el antiguo 'Bicicleta'
            if (existing && existing.name.toUpperCase() === 'BUS' && c.name.toLowerCase().includes('bici')) {
              return existing;
            }
            return c;
          });
          localStorage.setItem('pk_vehicle_categories', JSON.stringify(healed));
          return healed;
        });
      }
      if (centralData.globalConfig?.expenseConcepts) {
        setExpenseConcepts(centralData.globalConfig.expenseConcepts);
        localStorage.setItem('pk_expense_concepts', JSON.stringify(centralData.globalConfig.expenseConcepts));
        dbSaveExpenseConcepts(centralData.globalConfig.expenseConcepts).catch(console.error);
      }
      if (centralData.globalConfig?.expenseCategories) {
        setExpenseCategories(centralData.globalConfig.expenseCategories);
        localStorage.setItem('pk_expense_categories', JSON.stringify(centralData.globalConfig.expenseCategories));
        dbSaveExpenseCategories(centralData.globalConfig.expenseCategories).catch(console.error);
      }

      // Operational entities from Central (branches, warehouses, posPoints)
      const centralBranches = centralData.globalVersionData?.branches || centralData.globalConfig?.branches;
      if (centralBranches && Array.isArray(centralBranches) && centralBranches.length > 0) {
        setBranches(ensureUniqueBranchFarmadeskCredentials(centralBranches));
        appliedSummaryDetails.push(`${centralBranches.length} sucursales sincronizadas desde Central`);
      }

      const centralWarehouses = centralData.globalVersionData?.warehouses || centralData.globalConfig?.warehouses;
      if (centralWarehouses && Array.isArray(centralWarehouses) && centralWarehouses.length > 0) {
        setWarehouses(centralWarehouses);
        appliedSummaryDetails.push(`${centralWarehouses.length} bodegas/almacenes sincronizados`);
      }

      const centralPosPoints = centralData.globalVersionData?.posPoints;
      if (centralPosPoints && Array.isArray(centralPosPoints) && centralPosPoints.length > 0) {
        setPosPoints(centralPosPoints);
        appliedSummaryDetails.push(`${centralPosPoints.length} terminales POS sincronizadas`);
      }

      // Users, User Templates & Role Matrix
      const centralUsers = centralData.globalVersionData?.users || centralData.globalConfig?.users;
      if (centralUsers && Array.isArray(centralUsers) && centralUsers.length > 0) {
        setUsers(centralUsers);
        localStorage.setItem('pk_system_users', JSON.stringify(centralUsers));
        dbSaveUsers(centralUsers).catch(console.error);
        appliedSummaryDetails.push(`${centralUsers.length} usuarios/cajeros sincronizados`);
      }

      const centralUserTemplates = (centralData.globalVersionData as any)?.userTemplates || (centralData.globalConfig as any)?.userTemplates;
      if (centralUserTemplates && Array.isArray(centralUserTemplates) && centralUserTemplates.length > 0) {
        localStorage.setItem('pk_user_templates', JSON.stringify(centralUserTemplates));
        dbSaveUserTemplates(centralUserTemplates).catch(console.error);
        appliedSummaryDetails.push(`${centralUserTemplates.length} perfiles sincronizados`);
      }

      const centralRoleMatrix = (centralData.globalVersionData as any)?.roleMatrixConfig || (centralData.globalConfig as any)?.roleMatrixConfig;
      if (centralRoleMatrix && typeof centralRoleMatrix === 'object') {
        localStorage.setItem('pk_role_matrix_config', JSON.stringify(centralRoleMatrix));
        dbSaveRoleMatrix(centralRoleMatrix).catch(console.error);
        appliedSummaryDetails.push('Matriz de permisos de roles sincronizada');
      }

      // If centralData returned direct activeGlobalVersion, update local version and date
      if (centralData.activeGlobalVersion) {
        const nowApplied = new Date().toISOString();
        setInstalledGlobalVersionAndDate(centralData.activeGlobalVersion, nowApplied);
        setBranches(prev => prev.map(b => b.id === currentBranch.id ? {
          ...b,
          installedGlobalVersion: centralData.activeGlobalVersion,
          installedGlobalAt: nowApplied,
          isGlobalOutdated: false
        } : b));
        appliedSummaryDetails.push(`Versión de Globales sincronizada a ${centralData.activeGlobalVersion}`);
      }
    } catch (err) {
      console.warn('[Sync] Error en pullCentralData:', err);
    }

    // Also pull global-config endpoint
    try {
      await loadGlobalConfigFromServer(false);
    } catch (e) {
      console.warn('[Sync] Error cargando global config:', e);
    }

    // 2. Find pending packages for this branch (by id or code)
    const pendingPkgs = currentRemotePackages.filter(pkg => {
      const isTarget = pkg.targetScope === 'all' || (
        Array.isArray(pkg.targetBranchIds) && (
          pkg.targetBranchIds.includes(currentBranch.id) ||
          pkg.targetBranchIds.includes(currentBranch.code)
        )
      );
      const isApplied = Array.isArray(pkg.appliedByBranches) && pkg.appliedByBranches.some(app => 
        app.branchId === currentBranch.id || app.branchId === currentBranch.code
      );
      return isTarget && !isApplied;
    });

    for (const pkg of pendingPkgs) {
      const res = await applyPackagePayloadDirectly(pkg, currentRemotePackages);
      if (res.applied) {
        packagesAppliedCount++;
        appliedSummaryDetails.push(...res.details);
      }
    }

    // 3. Telemetry and complete operational dataset push to Central
    const todayRevenue = paidTickets.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
    const occupiedCount = spots.filter(s => s.status === 'occupied').length;

    try {
      await handlePushBranchOperations();
    } catch (pushErr) {
      console.warn('[Sync] Error transmitiendo operaciones a Central:', pushErr);
    }

    // 4. Audit Log
    const auditRecord: BranchSyncAuditRecord = {
      id: `log-${Date.now()}`,
      branchId: currentBranch.id,
      branchName: currentBranch.name,
      syncType: 'bidirectional_sync',
      summary: packagesAppliedCount > 0 
        ? `Sincronización total exitosa: ${packagesAppliedCount} paquetes aplicados (${appliedSummaryDetails.slice(0, 2).join(', ')}) y operaciones transmitidas.`
        : `Sincronización de telemetría y operaciones completada. Terminal al día con Servidor Central.`,
      status: 'success',
      timestamp: new Date().toISOString(),
      itemsReceived: packagesAppliedCount,
      itemsSent: 1,
      performedBy: currentUser?.name || 'Operador'
    };
    setSyncAuditLogs(prev => [auditRecord, ...prev]);

    if (packagesAppliedCount > 0) {
      return `✅ ¡Sincronización completada con éxito! Se aplicaron ${packagesAppliedCount} paquetes de Globales pendientes desde la Central: ${appliedSummaryDetails.join('. ')}. La terminal local y finanzas están sincronizadas.`;
    } else {
      return `✅ ¡Sincronización completada! La sucursal "${currentBranch.name}" se encuentra al día con la Central. Información financiera, turnos y patio transmitidos correctamente.`;
    }
  };

  const handlePushBranchOperations = async (): Promise<string> => {
    const todayRevenue = paidTickets.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
    const occupiedCount = spots.filter(s => s.status === 'occupied').length;
    const currentGlobalVer = getInstalledGlobalVersion();
    const installedSoftwareVer = softwareBuilds.find(b => b.status === 'installed')?.version || 'v2.6.0-enterprise';
    const currentShiftExpenses = currentShift?.cashMovements?.filter(m => m.type === 'expense') || [];

    const pushPayload = {
      branchId: currentBranch.id,
      branchName: currentBranch.name,
      installedGlobalVersion: currentGlobalVer,
      installedGlobalAt: getInstalledGlobalDate() || undefined,
      installedSoftwareVersion: installedSoftwareVer,
      installedSoftwareAt: localStorage.getItem('pk_installed_date') || undefined,
      operationalDay: operationalDay,
      currentShift: currentShift,
      closedShiftsCount: closedShiftsHistory.length,
      recentClosedShifts: closedShiftsHistory.slice(0, 5),
      todayRevenue,
      paidTicketsCount: paidTickets.length,
      recentPaidTickets: paidTickets.slice(-20),
      occupiedSpots: occupiedCount,
      totalSpots: spots.length,
      activeExpensesCount: currentShiftExpenses.length,
      totalExpensesAmount: currentShiftExpenses.reduce((acc, e) => acc + (e.amount || 0), 0)
    };

    const res = await pushBranchOperationsToCentral(pushPayload);

    // Update branch telemetry state
    const branchTelemetry: BranchLocation = {
      ...currentBranch,
      todayRevenue,
      occupiedSpots: occupiedCount,
      totalSpots: spots.length,
      activeShiftNumber: currentShift?.shiftNumber || 1,
      currentCashier: currentUser?.name || currentShift?.operatorName || 'Cajero',
      lastSyncTimestamp: new Date().toISOString(),
      installedGlobalVersion: currentGlobalVer,
      installedSoftwareVersion: installedSoftwareVer,
      isGlobalOutdated: res.isGlobalOutdated ?? currentBranch.isGlobalOutdated,
      isAppOutdated: res.isAppOutdated ?? currentBranch.isAppOutdated,
      financialShiftSummary: {
        totalCollected: todayRevenue,
        cashInDrawer: (currentShift?.initialCash || 0) + (currentShift?.cashMovements?.filter(m => m.type === 'income' && (!m.paymentMethod || m.paymentMethod === 'cash')).reduce((acc, m) => acc + m.amount, 0) || 0) - (currentShift?.cashMovements?.filter(m => m.type === 'expense').reduce((acc, m) => acc + m.amount, 0) || 0),
        shiftNumber: currentShift?.shiftNumber || 1,
        consecutiveArqueo: `ARQ-${closedShiftsHistory.length + 421}`,
        lastClosureDate: closedShiftsHistory[0]?.endTime || currentShift?.startTime || new Date().toISOString()
      },
      status: 'online' as const
    };

    setBranches(prev => prev.map(b => b.id === currentBranch.id ? branchTelemetry : b));
    await pushBranchTelemetry(branchTelemetry).catch(console.warn);

    return res.message || 'Operaciones, arqueos y estado de patio transmitidos a la Central con éxito.';
  };

  const handleInstallSoftwareBuild = async (buildId: string) => {
    setSoftwareBuilds(prev => prev.map(b => {
      if (b.id === buildId) {
        return { ...b, status: 'installed' as const };
      }
      if (b.status === 'installed') {
        return { ...b, status: 'available' as const };
      }
      return b;
    }));

    const build = softwareBuilds.find(b => b.id === buildId);
    if (build) {
      setBranches(prev => prev.map(b => b.id === currentBranch.id ? {
        ...b,
        installedSoftwareVersion: build.version,
        isAppOutdated: false
      } : b));

      const auditRecord: BranchSyncAuditRecord = {
        id: `log-${Date.now()}`,
        branchId: currentBranch.id,
        branchName: currentBranch.name,
        syncType: 'inbound_push',
        summary: `Actualización de Software instalada en sucursal: ${build.version} (${build.title})`,
        status: 'success',
        timestamp: new Date().toISOString(),
        itemsReceived: build.newModules.length,
        itemsSent: 0,
        performedBy: currentUser?.name || 'Administrador'
      };
      setSyncAuditLogs(prev => [auditRecord, ...prev]);

      // Report new build to Central
      handlePushBranchOperations().catch(console.warn);
    }
  };

  // --- Initial Load from Terminal Database ---
  const reloadFromTerminalDb = async () => {
    try {
      const data = await loadTerminalDatabaseData(terminalConfig.terminalId);
      const rawSpots = data.spots || [];
      const rawTickets = data.activeTickets || [];

      // Auto-reconcile spots with active tickets on boot to eliminate phantom orphan occupancies
      const reconciledSpots = rawSpots.map(s => {
        const matchingTicket = rawTickets.find(t => t.spotCode === s.code || t.id === s.currentTicketId);
        if (matchingTicket) {
          return { ...s, status: 'occupied' as const, currentTicketId: matchingTicket.id };
        }
        if (s.status === 'occupied') {
          return { ...s, status: 'available' as const, currentTicketId: undefined };
        }
        return s;
      });

      setSpots(reconciledSpots);
      localStorage.setItem('pk_spots_data', JSON.stringify(reconciledSpots));
      setActiveTickets(rawTickets);
      setPaidTickets(data.paidTickets);
      setRates(data.rates);
      setBusinessInfo(data.businessInfo);
      setCurrentShift(data.currentShift);
      setTerminalConfig(data.terminalConfig);
      if (data.paymentGatewayConfig) {
        const sanitizedGatewayConfig = ensurePaymentGatewayConfigDefaults(data.paymentGatewayConfig);
        setPaymentGatewayConfig(sanitizedGatewayConfig);
        localStorage.setItem('pk_payment_gateway_config', JSON.stringify(sanitizedGatewayConfig));
      }
      if (data.users && data.users.length > 0) {
        setUsers(data.users);
        localStorage.setItem('pk_system_users', JSON.stringify(data.users));
      }
      if (data.expenseConcepts && Array.isArray(data.expenseConcepts) && data.expenseConcepts.length > 0) {
        setExpenseConcepts(data.expenseConcepts);
        localStorage.setItem('pk_expense_concepts', JSON.stringify(data.expenseConcepts));
      }
      if (data.expenseCategories && Array.isArray(data.expenseCategories) && data.expenseCategories.length > 0) {
        setExpenseCategories(data.expenseCategories);
        localStorage.setItem('pk_expense_categories', JSON.stringify(data.expenseCategories));
      }
      if (data.printers && Array.isArray(data.printers) && data.printers.length > 0) {
        setPrinters(data.printers);
        localStorage.setItem('pk_printers', JSON.stringify(data.printers));
      }
      if (data.roleMatrix) {
        localStorage.setItem('pk_role_matrix_config', JSON.stringify(data.roleMatrix));
      }
      if (data.userTemplates && Array.isArray(data.userTemplates) && data.userTemplates.length > 0) {
        localStorage.setItem('pk_user_templates', JSON.stringify(data.userTemplates));
      }

      // Purge any stale simulation or mock records so production operates 100% clean
      if (rawTickets.length === 0) {
        setActiveTickets([]);
        localStorage.setItem('pk_active_tickets', JSON.stringify([]));
      }
      if (!data.paidTickets || data.paidTickets.length === 0) {
        setPaidTickets([]);
        localStorage.setItem('pk_paid_tickets', JSON.stringify([]));
      }
      setClosedShiftsHistory(prev => {
        const filtered = Array.isArray(prev) ? prev.filter(s => s && s.id && !s.id.startsWith('shift-hist-') && !s.id.startsWith('shift-sim-') && !s.id.startsWith('shift-0')) : [];
        localStorage.setItem('pk_closed_shifts_history', JSON.stringify(filtered));
        return filtered;
      });
      setClosedDaysHistory(prev => {
        const filtered = Array.isArray(prev) ? prev.filter(d => d && d.id && !d.id.startsWith('day-hist-') && !d.id.startsWith('day-sim-') && !d.id.startsWith('day-2026') && d.id !== 'day-clean-01') : [];
        localStorage.setItem('pk_closed_days_history', JSON.stringify(filtered));
        return filtered;
      });
      setBranches(prev => {
        let deletedSet = new Set<string>();
        try {
          const savedDeleted = localStorage.getItem('pk_deleted_branch_ids');
          if (savedDeleted) deletedSet = new Set(JSON.parse(savedDeleted));
        } catch (e) {}

        const list = Array.isArray(prev) && prev.length > 0 ? prev : (() => {
          try {
            const saved = localStorage.getItem('pk_branches');
            return saved ? JSON.parse(saved) : INITIAL_BRANCHES;
          } catch {
            return INITIAL_BRANCHES;
          }
        })();
        const valid = list.filter((b: any) => b && typeof b === 'object' && b.id && b.id !== 'branch-01' && !deletedSet.has(b.id));
        const finalB = valid.length > 0 ? (valid.some((b: any) => b.id === 'suc-001') ? valid : [...INITIAL_BRANCHES, ...valid]) : INITIAL_BRANCHES;
        localStorage.setItem('pk_branches', JSON.stringify(finalB));
        return finalB;
      });
      setWarehouses(prev => {
        const list = Array.isArray(prev) && prev.length > 0 ? prev : (() => {
          try {
            const saved = localStorage.getItem('pk_warehouses');
            return saved ? JSON.parse(saved) : INITIAL_WAREHOUSES;
          } catch {
            return INITIAL_WAREHOUSES;
          }
        })();
        const validW = list.filter((w: any) => w && typeof w === 'object' && w.id && w.id !== 'bod-01');
        const finalW = validW.length > 0 ? validW : INITIAL_WAREHOUSES;
        localStorage.setItem('pk_warehouses', JSON.stringify(finalW));
        return finalW;
      });
    } catch (e) {
      console.warn('Carga inicial desde IndexedDB completada con fallback local:', e);
    }
  };

  useEffect(() => {
    reloadFromTerminalDb();
  }, [terminalConfig.terminalId]);

  // Navigation Domain Category and Independent View Tab with URL Query Parameter Support
  const getViewFromUrl = (): { view: ActiveWorkspaceView; category: WorkspaceCategory } => {
    if (typeof window === 'undefined') return { view: 'operations', category: 'operations' };
    const params = new URLSearchParams(window.location.search);
    const requested = (params.get('view') || params.get('module') || params.get('tab') || '').toLowerCase();
    
    const viewCategoryMap: Record<string, { view: ActiveWorkspaceView; category: WorkspaceCategory }> = {
      operations: { view: 'operations', category: 'operations' },
      map: { view: 'map', category: 'operations' },
      spots: { view: 'spots', category: 'operations' },
      anpr_camera: { view: 'anpr_camera', category: 'operations' },
      anpr: { view: 'anpr_camera', category: 'operations' },
      camera: { view: 'anpr_camera', category: 'operations' },
      cash: { view: 'cash', category: 'finance' },
      caja: { view: 'cash', category: 'finance' },
      shift: { view: 'cash', category: 'finance' },
      cash_history: { view: 'cash_history', category: 'finance' },
      history: { view: 'cash_history', category: 'finance' },
      historico: { view: 'cash_history', category: 'finance' },
      cierres: { view: 'cash_history', category: 'finance' },
      arqueos: { view: 'cash_history', category: 'finance' },
      expense_concepts: { view: 'expense_concepts', category: 'finance' },
      expenses: { view: 'expense_concepts', category: 'finance' },
      reports: { view: 'reports', category: 'reports' },
      informes: { view: 'reports', category: 'reports' },
      bi: { view: 'reports', category: 'reports' },
      branches: { view: 'branches', category: 'central' },
      sucursales: { view: 'branches', category: 'central' },
      central_hub: { view: 'central_hub', category: 'central' },
      central: { view: 'central_hub', category: 'central' },
      central_dashboard: { view: 'central_dashboard', category: 'central' },
      telemetria: { view: 'central_dashboard', category: 'central' },
      mapa_sedes: { view: 'central_dashboard', category: 'central' },
      branch_sync: { view: 'branch_sync', category: 'central' },
      sync: { view: 'branch_sync', category: 'central' },
      vnc_remote: { view: 'vnc_remote', category: 'central' },
      remote: { view: 'vnc_remote', category: 'central' },
      software_updater: { view: 'software_updater', category: 'updates' },
      updates: { view: 'software_updater', category: 'updates' },
      updater: { view: 'software_updater', category: 'updates' },
      work_mode: { view: 'work_mode', category: 'central' },
      nodo: { view: 'work_mode', category: 'central' },
      rates: { view: 'rates', category: 'config' },
      tarifas: { view: 'rates', category: 'config' },
      agreements: { view: 'agreements', category: 'config' },
      convenios: { view: 'agreements', category: 'config' },
      vehicle_categories: { view: 'vehicle_categories', category: 'config' },
      vehicles: { view: 'vehicle_categories', category: 'config' },
      users: { view: 'users', category: 'config' },
      usuarios: { view: 'users', category: 'config' },
      database: { view: 'database', category: 'config' },
      db: { view: 'database', category: 'config' },
      agent_skills: { view: 'agent_skills', category: 'config' },
      skills: { view: 'agent_skills', category: 'config' },
      printer_config: { view: 'printer_config', category: 'config' },
      printer: { view: 'printer_config', category: 'config' },
      impresoras: { view: 'printer_config', category: 'config' },
      subscribers: { view: 'subscribers', category: 'operations' },
      abonados: { view: 'subscribers', category: 'operations' },
      mensualidades: { view: 'subscribers', category: 'operations' },
    };

    if (requested && viewCategoryMap[requested]) {
      return viewCategoryMap[requested];
    }
    return { view: 'operations', category: 'operations' };
  };

  const initialUrlRouting = getViewFromUrl();
  const [activeCategory, setActiveCategory] = useState<WorkspaceCategory>(initialUrlRouting.category);
  const [activeView, setActiveView] = useState<ActiveWorkspaceView>(initialUrlRouting.view);

  // --- Workspace Tabs Architecture (Multi-Pestaña Interna Independiente) ---
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTabItem[]>([
    {
      id: 'tab-pos-main',
      title: 'Patio POS',
      view: 'operations',
      category: 'operations',
      statusBadge: 'Listo',
      statusVariant: 'success',
      isPinned: true,
      createdAt: Date.now(),
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-pos-main');
  const [isPrintingThermal, setIsPrintingThermal] = useState<boolean>(false);
  const [lastPrintedInfo, setLastPrintedInfo] = useState<{
    ticketNumber?: string;
    plate?: string;
    timestamp: Date;
    success: boolean;
    printerName?: string;
  } | null>(null);
  const [lastPaidTicketGlobal, setLastPaidTicketGlobal] = useState<ParkingTicket | null>(null);
  const [lastEntryTicketGlobal, setLastEntryTicketGlobal] = useState<ParkingTicket | null>(null);

  const getTitleForWorkspaceView = (view: ActiveWorkspaceView): string => {
    switch (view) {
      case 'operations': return 'Patio POS';
      case 'map': return 'Mapa de Plazas';
      case 'spots': return 'Gestión de Plazas';
      case 'anpr_camera': return 'Cámaras ANPR LPR';
      case 'cash': return 'Arqueo de Turno';
      case 'cash_history': return 'Historial de Cierres';
      case 'expense_concepts': return 'Conceptos de Gastos';
      case 'reports': return 'Reportes y Cierre Z';
      case 'branches': return 'Sedes y Sucursales';
      case 'central_hub': return 'Servidor Central Hub';
      case 'central_dashboard': return 'Dashboard Central';
      case 'branch_sync': return 'Sincronización Cloud';
      case 'vnc_remote': return 'Escritorio Remoto';
      case 'software_updater': return 'Actualizador Software';
      case 'work_mode': return 'Modo de Trabajo';
      case 'rates': return 'Configuración Tarifas';
      case 'vehicle_categories': return 'Categorías Vehículos';
      case 'users': return 'Usuarios y Permisos';
      case 'printer_config': return 'Impresoras POS';
      case 'database': return 'Base de Datos';
      case 'subscribers': return 'Abonados / Mensualidades';
      case 'agreements': return 'Convenios Comerciales';
      default: return 'Espacio de Trabajo';
    }
  };

  const getCategoryForWorkspaceView = (view: ActiveWorkspaceView): WorkspaceCategory => {
    switch (view) {
      case 'operations':
      case 'map':
      case 'spots':
      case 'anpr_camera':
      case 'subscribers':
        return 'operations';
      case 'cash':
      case 'cash_history':
      case 'expense_concepts':
      case 'agreements':
        return 'finance';
      case 'reports':
        return 'reports';
      case 'branches':
      case 'central_hub':
      case 'central_dashboard':
      case 'branch_sync':
      case 'vnc_remote':
      case 'work_mode':
        return 'central';
      case 'software_updater':
        return 'updates';
      case 'rates':
      case 'vehicle_categories':
      case 'users':
      case 'printer_config':
      case 'database':
      default:
        return 'config';
    }
  };

  const handleSelectTab = (tabId: string) => {
    const target = workspaceTabs.find(t => t.id === tabId);
    if (!target) return;
    setActiveTabId(tabId);
    setActiveView(target.view);
    setActiveCategory(target.category);
    // Auto-focus priority input on tab switch
    setTimeout(() => {
      if (target.view === 'operations') {
        const searchInput = document.getElementById('searchQuery') || document.querySelector('input[placeholder*="Pistolear"]') || document.getElementById('entryPlateInput');
        (searchInput as HTMLInputElement)?.focus();
      }
    }, 100);
  };

  const handleCloseTab = (tabId: string) => {
    setWorkspaceTabs(prev => {
      const tabIndex = prev.findIndex(t => t.id === tabId);
      if (tabIndex === -1) return prev;
      if (prev[tabIndex].isPinned) return prev;

      const filtered = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        const nextTab = filtered[Math.max(0, tabIndex - 1)] || filtered[0];
        if (nextTab) {
          setActiveTabId(nextTab.id);
          setActiveView(nextTab.view);
          setActiveCategory(nextTab.category);
        }
      }
      return filtered;
    });
  };

  const handleOpenNewTab = (view: ActiveWorkspaceView, category?: WorkspaceCategory, customTitle?: string) => {
    const resolvedCat = category || getCategoryForWorkspaceView(view);
    const resolvedTitle = customTitle || getTitleForWorkspaceView(view);
    const newTabId = `tab-${view}-${Date.now()}`;
    const newTab: WorkspaceTabItem = {
      id: newTabId,
      title: resolvedTitle,
      view,
      category: resolvedCat,
      statusBadge: 'Activo',
      statusVariant: 'info',
      createdAt: Date.now(),
    };

    setWorkspaceTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);
    setActiveView(view);
    setActiveCategory(resolvedCat);

    setTimeout(() => {
      if (view === 'operations') {
        const searchInput = document.getElementById('searchQuery') || document.querySelector('input[placeholder*="Pistolear"]') || document.getElementById('entryPlateInput');
        (searchInput as HTMLInputElement)?.focus();
      }
    }, 100);
  };

  const handleReprintLastReceipt = () => {
    if (lastPaidTicketGlobal) {
      triggerInstantPrint({
        type: 'exit_receipt',
        ticket: lastPaidTicketGlobal,
        openDrawer: false
      });
      setPrintToast({
        type: 'info',
        message: `🖨️ Reimprimiendo factura de salida: ${lastPaidTicketGlobal.plate} (#${lastPaidTicketGlobal.ticketNumber})`
      });
      setTimeout(() => setPrintToast(null), 3000);
    } else if (lastEntryTicketGlobal) {
      triggerInstantPrint({
        type: 'entry_ticket',
        ticket: lastEntryTicketGlobal
      });
      setPrintToast({
        type: 'info',
        message: `🖨️ Reimprimiendo ticket de ingreso: ${lastEntryTicketGlobal.plate} (#${lastEntryTicketGlobal.ticketNumber})`
      });
      setTimeout(() => setPrintToast(null), 3000);
    } else {
      setPrintToast({
        type: 'info',
        message: 'No hay tickets recientes para reimprimir en esta sesión.'
      });
      setTimeout(() => setPrintToast(null), 2500);
    }
  };

  // Detailed logging when user management modal / view is opened
  useEffect(() => {
    if (activeView === 'users' || isUsersModalOpen) {
      console.log('📂 [LOG DETALLADO - APERTURA MODAL USUARIOS] Se ha abierto la Gestión de Usuarios/Perfiles/Permisos:', {
        timestamp: new Date().toISOString(),
        activeView,
        isUsersModalOpen,
        currentUser: currentUser ? { id: currentUser.id, username: currentUser.username, role: currentUser.role } : null,
        usersInStateCount: users.length,
        usersInState: users.map(u => ({
          id: u.id,
          name: u.name,
          username: u.username,
          role: u.role,
          isActive: u.isActive
        })),
        rawLocalStorageSystemUsers: localStorage.getItem('pk_system_users'),
        rawLocalStorageUserTemplates: localStorage.getItem('pk_user_templates'),
        rawLocalStorageRoleMatrix: localStorage.getItem('farmadesk_role_matrix_config')
      });
    }
  }, [activeView, isUsersModalOpen, users, currentUser]);

  // Helper exhaustivo para verificar si la vista está permitida para el usuario actual
  const isViewAllowedForUser = (view: ActiveWorkspaceView, user: SystemUser | null): { allowed: boolean; name: string } => {
    if (!user) return { allowed: true, name: '' };
    if (user.role === 'master') return { allowed: true, name: '' };

    const perms = user.permissions;
    const vis = perms.uiVisibility;

    switch (view) {
      case 'operations':
        if ((!perms.canRegisterEntry && !perms.canRegisterExit) || vis?.showTabOperations === false) {
          return { allowed: false, name: 'Taquilla Patio POS' };
        }
        break;
      case 'map':
        if (!perms.canViewMap || vis?.showTabMap === false) {
          return { allowed: false, name: 'Mapa de Plazas' };
        }
        break;
      case 'spots':
        if ((!perms.canManageSpots && !perms.canEditRates) || vis?.showSpotsManagementButton === false) {
          return { allowed: false, name: 'Gestión de Plazas' };
        }
        break;
      case 'subscribers':
        if ((perms.canViewSubscribers === false && user.role !== 'master' && user.role !== 'supervisor') || vis?.showSubscribersModule === false) {
          return { allowed: false, name: 'Abonados y Mensualidades' };
        }
        break;
      case 'anpr_camera':
        if (!perms.canViewANPRCameraModule && user.role !== 'master' && user.role !== 'supervisor') {
          return { allowed: false, name: 'Cámara ANPR' };
        }
        break;
      case 'cash':
        if (!perms.canManageCashShift || vis?.showTabCash === false) {
          return { allowed: false, name: 'Turno & Caja' };
        }
        break;
      case 'cash_history':
        if (perms.canViewCashShiftsHistory === false || vis?.showCashShiftsHistory === false) {
          return { allowed: false, name: 'Histórico de Cierres de Turno' };
        }
        break;
      case 'expense_concepts':
        if (!perms.canManageExpenseConcepts || vis?.showTabCash === false) {
          return { allowed: false, name: 'Conceptos de Gastos' };
        }
        break;
      case 'reports':
        if (!perms.canViewReports || vis?.showTabReports === false) {
          return { allowed: false, name: 'Reportes y Analíticas' };
        }
        break;
      case 'rates':
      case 'rates_ai':
        if (!perms.canEditRates || vis?.showTabSettings === false) {
          return { allowed: false, name: 'Tarifas del Sistema' };
        }
        break;
      case 'agreements':
        if ((perms.canManageAgreements === false && !perms.canEditRates) || vis?.showTabSettings === false) {
          return { allowed: false, name: 'Convenios Comerciales' };
        }
        break;
      case 'vehicle_categories':
        if ((perms.canManageVehicleCategories === false && !perms.canEditRates) || vis?.showTabSettings === false) {
          return { allowed: false, name: 'Tipos y Categorías de Vehículos' };
        }
        break;
      case 'printer_config':
        if ((perms.canConfigurePrinters === false && !perms.canEditBusinessInfo && user.role !== 'master') || vis?.showPrinterConfigModule === false) {
          return { allowed: false, name: 'Configuración de Impresoras Térmicas' };
        }
        break;
      case 'users':
        if (!perms.canManageUsers || vis?.showUsersManagementButton === false) {
          return { allowed: false, name: 'Gestión de Usuarios y Perfiles' };
        }
        break;
      case 'database':
        if (!perms.canManageDatabase || vis?.showDatabaseButton === false) {
          return { allowed: false, name: 'Base de Datos y Respaldo' };
        }
        break;
      case 'central_hub':
      case 'central_dashboard':
        if (perms.canAccessCentralHub === false || vis?.showCentralHubButton === false) {
          return { allowed: false, name: 'Matriz Central y Sedes' };
        }
        break;
      case 'branches':
        if ((perms.canManageBranchLocations === false && user.role !== 'master') || vis?.showBranchesGrid === false) {
          return { allowed: false, name: 'Sedes y Sucursales' };
        }
        break;
      case 'vnc_remote':
        if (perms.canViewVncRemoteDesktop === false || vis?.showVncRemoteDesktopButton === false) {
          return { allowed: false, name: 'FarmaDesk Acceso Remoto' };
        }
        break;
      case 'work_mode':
        if ((perms.canConfigureTechnicalTerminalProps === false && user.role !== 'master') || vis?.showWorkModeBadge === false) {
          return { allowed: false, name: 'Modo de Red y Terminal' };
        }
        break;
      case 'branch_sync':
        if (perms.canSyncWithCentralServer === false || vis?.showBranchSyncButton === false) {
          return { allowed: false, name: 'Sincronización con Servidor Central' };
        }
        break;
      case 'software_updater':
        if (perms.canPerformAppUpdates === false || vis?.showAppUpdaterButton === false) {
          return { allowed: false, name: 'Actualizador de Software' };
        }
        break;
    }

    return { allowed: true, name: '' };
  };

  // Guard current activeView against user permissions on login/role change
  useEffect(() => {
    if (!currentUser) return;
    const access = isViewAllowedForUser(activeView, currentUser);
    if (!access.allowed) {
      const candidateViews: ActiveWorkspaceView[] = ['operations', 'map', 'cash', 'reports'];
      const fallback = candidateViews.find(v => isViewAllowedForUser(v, currentUser).allowed) || 'operations';
      console.warn(`[RouteGuard] Vista actual "${activeView}" no permitida para ${currentUser.username}. Redirigiendo a "${fallback}".`);
      setActiveView(fallback);
      setActiveCategory(fallback === 'cash' ? 'finance' : fallback === 'reports' ? 'reports' : 'operations');
    }
  }, [currentUser, activeView]);

  // Sync URL query params whenever activeView changes
  const handleSwitchView = (newView: ActiveWorkspaceView, newCategory?: WorkspaceCategory) => {
    // Verificación Rigurosa de Permisos de Seguridad
    if (currentUser && currentUser.role !== 'master') {
      const accessCheck = isViewAllowedForUser(newView, currentUser);
      if (!accessCheck.allowed) {
        alert(`⛔ Acceso Restringido: Tu perfil (${currentUser.role}) no tiene permisos para acceder a "${accessCheck.name}".`);
        return;
      }
    }

    setActiveView(newView);
    if (newCategory) {
      setActiveCategory(newCategory);
    } else {
      const mapped = getViewFromUrl();
      const catMap: Record<ActiveWorkspaceView, WorkspaceCategory> = {
        operations: 'operations',
        map: 'operations',
        spots: 'operations',
        anpr_camera: 'operations',
        cash: 'finance',
        cash_history: 'finance',
        expense_concepts: 'finance',
        reports: 'reports',
        branches: 'central',
        central_hub: 'central',
        central_dashboard: 'central',
        branch_sync: 'central',
        vnc_remote: 'central',
        software_updater: 'updates',
        work_mode: 'central',
        rates: 'config',
        rates_ai: 'config',
        agreements: 'config',
        vehicle_categories: 'config',
        users: 'config',
        database: 'config',
        agent_skills: 'config',
        printer_config: 'config',
        subscribers: 'operations',
      };
      setActiveCategory(catMap[newView] || 'operations');
    }

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (newView === 'operations') {
        url.searchParams.delete('view');
        url.searchParams.delete('module');
      } else {
        url.searchParams.set('view', newView);
      }
      window.history.replaceState(null, '', url.toString());
    }

    // Sync Workspace Tabs (Multi-Pestaña)
    const targetCategory = newCategory || getCategoryForWorkspaceView(newView);
    setWorkspaceTabs(prev => {
      const existing = prev.find(t => t.view === newView);
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }
      const activeTab = prev.find(t => t.id === activeTabId);
      if (activeTab && !activeTab.isPinned && !activeTab.hasUnsavedChanges) {
        return prev.map(t => t.id === activeTabId ? {
          ...t,
          view: newView,
          category: targetCategory,
          title: getTitleForWorkspaceView(newView),
        } : t);
      }
      const newTab: WorkspaceTabItem = {
        id: `tab-${newView}-${Date.now()}`,
        title: getTitleForWorkspaceView(newView),
        view: newView,
        category: targetCategory,
        statusBadge: 'Activo',
        statusVariant: 'info',
        createdAt: Date.now(),
      };
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
  };

  // Listen for browser back/forward buttons
  useEffect(() => {
    const handlePopStateRouting = () => {
      const routed = getViewFromUrl();
      setActiveView(routed.view);
      setActiveCategory(routed.category);
    };
    window.addEventListener('popstate', handlePopStateRouting);
    return () => window.removeEventListener('popstate', handlePopStateRouting);
  }, []);

  // Ensure active tab is allowed for user
  const ensureAllowedTab = (user: SystemUser, currentTab: string) => {
    if (currentTab === 'operations' && !user.permissions.canRegisterEntry && !user.permissions.canRegisterExit) {
      if (user.permissions.canViewMap) return 'map';
      if (user.permissions.canManageCashShift) return 'cash';
      if (user.permissions.canViewReports) return 'reports';
      if (user.permissions.canEditRates) return 'settings';
    }
    if (currentTab === 'map' && !user.permissions.canViewMap) return 'operations';
    if (currentTab === 'reports' && !user.permissions.canViewReports) return 'operations';
    if (currentTab === 'cash' && !user.permissions.canManageCashShift) return 'operations';
    if (currentTab === 'settings' && !user.permissions.canEditRates) return 'operations';
    return currentTab as 'operations' | 'map' | 'reports' | 'cash' | 'settings';
  };

  // User Login & Session Handlers
  const handleLoginSuccess = (user: SystemUser) => {
    setCurrentUser(user);
    sessionStorage.setItem('pk_current_user', JSON.stringify(user));
    localStorage.setItem('pk_current_user', JSON.stringify(user));
    setCurrentShift(prev => ({
      ...prev,
      operatorName: user.name
    }));
    setActiveView('operations');
    playSound('success', soundEnabled);
    dbAddAuditLog('LOGIN', `Inicio de sesión exitoso: ${user.name} (@${user.username}) - Rol: ${user.role}`, user.name).catch(console.error);
  };

  const handleLogout = () => {
    if (currentUser) {
      dbAddAuditLog('LOGOUT', `Cierre de sesión: ${currentUser.name} (@${currentUser.username})`, currentUser.name).catch(console.error);
    }
    setCurrentUser(null);
    sessionStorage.removeItem('pk_current_user');
    localStorage.removeItem('pk_current_user');
    playSound('beep', soundEnabled);
  };

  const handleSaveUser = async (userToSave: SystemUser) => {
    console.log('💾 [LOG DETALLADO - GUARDANDO USUARIO] handleSaveUser invocado en App.tsx:', {
      timestamp: new Date().toISOString(),
      userToSave: {
        id: userToSave.id,
        name: userToSave.name,
        username: userToSave.username,
        role: userToSave.role,
        isActive: userToSave.isActive,
      },
      currentUsersCount: users.length,
    });

    await dbSaveUser(userToSave);
    let nextUsersList: SystemUser[] = [];
    setUsers(prev => {
      const idx = prev.findIndex(u => u.id === userToSave.id);
      if (idx >= 0) {
        nextUsersList = [...prev];
        nextUsersList[idx] = userToSave;
        console.log(`✏️ [LOG DETALLADO - EDITAR USUARIO] ID: ${userToSave.id}, Username: ${userToSave.username}. Total actual: ${nextUsersList.length}`);
      } else {
        nextUsersList = [userToSave, ...prev];
        console.log(`➕ [LOG DETALLADO - NUEVO USUARIO] ID: ${userToSave.id}, Username: ${userToSave.username}. Total actual: ${nextUsersList.length}`);
      }
      return nextUsersList;
    });

    if (currentUser && currentUser.id === userToSave.id) {
      setCurrentUser(userToSave);
      sessionStorage.setItem('pk_current_user', JSON.stringify(userToSave));
      localStorage.setItem('pk_current_user', JSON.stringify(userToSave));
    }
    dbAddAuditLog('USER_UPDATE', `Usuario modificado o creado: ${userToSave.username}`, currentUser?.name || 'Maestro').catch(console.error);

    // Persistir inmediatamente en la configuración global del Servidor Central
    saveGlobalConfigToServer({ users: nextUsersList }).catch(console.warn);
  };

  const handleDeleteUser = async (userId: string) => {
    const toDelete = users.find(u => u.id === userId);
    console.log('🗑️ [LOG DETALLADO - ELIMINAR USUARIO] handleDeleteUser invocado:', {
      userId,
      deletedUsername: toDelete?.username,
      usersCountBeforeDelete: users.length
    });
    await dbDeleteUser(userId);
    let remainingUsersList: SystemUser[] = [];
    setUsers(prev => {
      remainingUsersList = prev.filter(u => u.id !== userId);
      console.log(`🗑️ [LOG DETALLADO - USUARIO ELIMINADO] Quedan ${remainingUsersList.length} usuario(s) en estado.`);
      return remainingUsersList;
    });
    if (toDelete) {
      dbAddAuditLog('USER_DELETE', `Usuario eliminado: ${toDelete.username}`, currentUser?.name || 'Maestro').catch(console.error);
    }

    // Persistir inmediatamente en la configuración global del Servidor Central
    saveGlobalConfigToServer({ users: remainingUsersList }).catch(console.warn);
  };

  // Modal ticket print
  const [ticketModalState, setTicketModalState] = useState<{
    isOpen: boolean;
    ticket: ParkingTicket | null;
    mode: 'entry' | 'exit';
  }>({
    isOpen: false,
    ticket: null,
    mode: 'entry',
  });

  // Modal de Escáner QR de Tickets
  const [isTicketScannerModalOpen, setIsTicketScannerModalOpen] = useState(false);

  // Cross-view selection (e.g. from Map to Operations)
  const [selectedPlateForExit, setSelectedPlateForExit] = useState<string | null>(null);

  // Floating print toast notification
  const [printToast, setPrintToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const triggerInstantPrint = async (options: {
    type: 'entry_ticket' | 'exit_receipt' | 'cash_shift' | 'day_closure' | 'test';
    ticket?: ParkingTicket | null;
    shift?: CashShift | null;
    day?: OperationalDay | null;
    autoCut?: boolean;
    openDrawer?: boolean;
  }) => {
    const activePrinter = printers.find(p => p.isDefault) || printers[0];
    const targetPrinter = businessInfo.defaultPrinterName || activePrinter?.printerName || activePrinter?.name || 'POS-80';

    setIsPrintingThermal(true);
    try {
      const result = await printInstantThermal({
        type: options.type,
        ticket: options.ticket,
        shift: options.shift,
        day: options.day,
        businessInfo,
        rates,
        targetPrinterName: targetPrinter,
        paperWidth: activePrinter?.paperSize || businessInfo.defaultPaperWidth || '80mm',
        autoCut: options.autoCut ?? businessInfo.cutPaperOnPrint ?? true,
        openDrawer: options.openDrawer ?? (
          (options.type === 'exit_receipt' || !!options.ticket)
            ? ((options.ticket?.paymentMethod === 'cash' || options.ticket?.paymentMethod === 'mixed' || !options.ticket?.paymentMethod) && (businessInfo.openCashDrawerOnCashPayment ?? true))
            : false
        ),
      });

      setLastPrintedInfo({
        ticketNumber: options.ticket?.ticketNumber,
        plate: options.ticket?.plate,
        timestamp: new Date(),
        success: result.success,
        printerName: result.printerName || targetPrinter
      });

      if (result.success) {
        setPrintToast({
          type: 'success',
          message: `🖨️ ${options.type === 'entry_ticket' ? 'Ticket de ingreso' : options.type === 'exit_receipt' ? 'Factura POS' : options.type === 'cash_shift' ? 'Comprobante de arqueo' : 'Cierre de jornada'} impreso automáticamente en '${result.printerName}'`
        });
        setTimeout(() => setPrintToast(null), 3500);
      } else {
        console.warn('[Auto-Print Warning] Spooler directo no completó, abriendo modal como respaldo:', result.error);
        if (options.ticket) {
          handleOpenPrintModal(options.ticket, options.type === 'entry_ticket' ? 'entry' : 'exit');
        }
      }
    } catch (err) {
      console.warn('[Auto-Print Exception] Error enviando trabajo al spooler:', err);
      if (options.ticket) {
        handleOpenPrintModal(options.ticket, options.type === 'entry_ticket' ? 'entry' : 'exit');
      }
    } finally {
      setIsPrintingThermal(false);
    }
  };

  const handleOpenCashDrawerDirect = async () => {
    const activePrinter = printers.find(p => p.isDefault) || printers[0];
    const targetPrinter = businessInfo.defaultPrinterName || activePrinter?.printerName || activePrinter?.name || 'POS-80';
    try {
      const res = await openCashDrawer(targetPrinter);
      if (res.success) {
        setPrintToast({
          type: 'success',
          message: `🪙 Cajón monedero abierto en '${res.printerName || targetPrinter}'`
        });
        setTimeout(() => setPrintToast(null), 3000);
      } else {
        alert(`No se pudo abrir el cajón monedero en '${targetPrinter}': ${res.error || 'Verifique la conexión de la impresora'}`);
      }
    } catch (err: any) {
      alert(`Error al abrir gaveta: ${err?.message}`);
    }
  };

  // Sync to fallback localStorage cache
  useEffect(() => {
    localStorage.setItem('pk_spots_data', JSON.stringify(spots));
  }, [spots]);

  useEffect(() => {
    localStorage.setItem('pk_active_tickets', JSON.stringify(activeTickets));
  }, [activeTickets]);

  useEffect(() => {
    localStorage.setItem('pk_paid_tickets', JSON.stringify(paidTickets));
  }, [paidTickets]);

  useEffect(() => {
    localStorage.setItem('pk_rates_config', JSON.stringify(rates));
  }, [rates]);

  useEffect(() => {
    localStorage.setItem('pk_business_info', JSON.stringify(businessInfo));
  }, [businessInfo]);

  useEffect(() => {
    localStorage.setItem('pk_current_shift', JSON.stringify(currentShift));
  }, [currentShift]);

  useEffect(() => {
    localStorage.setItem('pk_sound_enabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  // --- Handlers: Register Entry with DB Persistence ---
  const handleRegisterEntry = (ticketData: {
    plate: string;
    vehicleType: VehicleType;
    spotCode: string;
    notes?: string;
    isForeignPlate?: boolean;
    originCountry?: string;
  }): ParkingTicket | null => {
    const cleanPlate = formatPlate(ticketData.plate);
    const targetBranchId = activeRemoteSession?.branchId || currentBranchId;
    const targetBranch = branches.find(b => b.id === targetBranchId) || currentBranch;

    const existingActiveTicket = activeTickets.find(
      t => (formatPlate(t.plate) === cleanPlate || t.plate.toUpperCase().trim() === cleanPlate) &&
           (!t.branchId || t.branchId === targetBranchId)
    );

    if (existingActiveTicket) {
      console.warn(`[Validación de Ingreso] La placa ${cleanPlate} ya tiene un ticket activo: #${existingActiveTicket.ticketNumber}`);
      setPrintToast({
        type: 'error',
        message: `⚠️ La placa ${cleanPlate} ya tiene ticket activo #${existingActiveTicket.ticketNumber} en puesto ${existingActiveTicket.spotCode}`
      });
      setTimeout(() => setPrintToast(null), 4500);
      return null;
    }

    const nextTicketNumber = `PK-${(activeTickets.length + paidTickets.length + 430).toString().padStart(4, '0')}`;

    const newTicket: ParkingTicket = {
      id: `tk-${Date.now()}`,
      ticketNumber: nextTicketNumber,
      barcode: nextTicketNumber,
      plate: ticketData.plate,
      vehicleType: ticketData.vehicleType,
      spotCode: ticketData.spotCode,
      entryTime: new Date().toISOString(),
      status: 'active',
      notes: ticketData.notes,
      isForeignPlate: ticketData.isForeignPlate,
      originCountry: ticketData.originCountry,
      operationalDayNumber: operationalDay.dayNumber,
      shiftNumber: currentShift.shiftNumber,
      branchId: targetBranchId,
      branchName: targetBranch?.name || activeRemoteSession?.branchName || 'Sucursal Local'
    };

    // Update active tickets in state and local DB
    setActiveTickets(prev => [newTicket, ...prev]);
    dbSaveActiveTicket(newTicket).catch(console.error);

    // Update spot status in state and local DB
    const updatedSpots = spots.map(s => {
      if (s.code === ticketData.spotCode) {
        return { ...s, status: 'occupied' as const, currentTicketId: newTicket.id };
      }
      return s;
    });
    setSpots(updatedSpots);
    dbSaveSpots(updatedSpots).catch(console.error);

    // Record audit log in terminal database
    dbAddAuditLog(
      'ENTRY', 
      `Ingreso vehículo: ${newTicket.vehicleType.toUpperCase()} [${newTicket.plate}] en plaza ${newTicket.spotCode} - Ticket ${newTicket.ticketNumber}`,
      currentShift.operatorName
    ).catch(console.error);

    // Registro automático de estado para auditoría de integridad
    logCriticalDatabaseState('INGRESO_VEHICULO', {
      ticketNumber: newTicket.ticketNumber,
      plate: newTicket.plate,
      vehicleType: newTicket.vehicleType,
      spotCode: newTicket.spotCode
    });

    // Impresión automática instantánea al registrar entrada
    if (businessInfo.autoPrintOnEntry !== false) {
      if (businessInfo.silentBackgroundPrint !== false) {
        triggerInstantPrint({ type: 'entry_ticket', ticket: newTicket });
      } else {
        handleOpenPrintModal(newTicket, 'entry');
      }
    }

    // Auto-push live telemetry & yard occupancy to Central Server
    handlePushBranchOperations().catch(err => console.warn('[Sync] Auto-push tras ingreso de vehículo:', err));

    setLastEntryTicketGlobal(newTicket);
    return newTicket;
  };

  // --- Handlers: Register Exit & Billing with DB Persistence ---
  const handleRegisterExit = (
    ticketId: string,
    billingDetails: {
      paymentMethod: PaymentMethod;
      cashReceived?: number;
      changeGiven?: number;
      discountAmount?: number;
      paymentDetails?: PaymentTransactionDetails;
      commercialAgreementId?: string;
      commercialAgreementName?: string;
      commercialAgreementSealOrVoucher?: string;
      commercialAgreementDiscountType?: AgreementDiscountType;
    }
  ): ParkingTicket | null => {
    const targetTicket = activeTickets.find(t => t.id === ticketId);
    if (!targetTicket) return null;

    const exitIso = new Date().toISOString();
    const feeCalculation = calculateParkingFee(
      targetTicket.entryTime,
      exitIso,
      targetTicket.vehicleType,
      rates
    );

    const discount = billingDetails.discountAmount || 0;
    const finalAmount = Math.max(0, feeCalculation.totalAmount - discount);

    const paidTicket: ParkingTicket = {
      ...targetTicket,
      exitTime: exitIso,
      status: 'paid',
      totalMinutes: feeCalculation.totalMinutes,
      billableMinutes: feeCalculation.billableMinutes,
      baseAmount: feeCalculation.baseAmount,
      taxAmount: feeCalculation.taxAmount,
      discountAmount: discount,
      totalAmount: finalAmount,
      commercialAgreementId: billingDetails.commercialAgreementId,
      commercialAgreementName: billingDetails.commercialAgreementName,
      commercialAgreementSealOrVoucher: billingDetails.commercialAgreementSealOrVoucher,
      commercialAgreementDiscountType: billingDetails.commercialAgreementDiscountType,
      paymentMethod: billingDetails.paymentMethod,
      paymentDetails: billingDetails.paymentDetails,
      cashReceived: billingDetails.cashReceived,
      changeGiven: billingDetails.changeGiven,
      paidAt: exitIso,
      cashierName: currentShift.operatorName,
      operationalDayNumber: operationalDay.dayNumber,
      shiftNumber: currentShift.shiftNumber,
      electronicInvoice: billingDetails.paymentDetails?.isElectronicInvoice ? {
        cufe: billingDetails.paymentDetails.cufe || '',
        invoiceNumber: billingDetails.paymentDetails.electronicInvoiceNumber || '',
        prefix: businessInfo.dianPrefix ? (businessInfo.dianPrefix.endsWith('-') ? businessInfo.dianPrefix : `${businessInfo.dianPrefix}-`) : 'FE-',
        resolutionNumber: businessInfo.dianResolutionNumber || '',
        qrUrl: billingDetails.paymentDetails.qrUrl || (billingDetails.paymentDetails.cufe ? `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${billingDetails.paymentDetails.cufe}` : undefined),
        xmlUuid: billingDetails.paymentDetails.xmlUuid,
        trackId: billingDetails.paymentDetails.trackId,
        status: 'VALIDADA_DIAN',
        customer: {
          name: billingDetails.paymentDetails.customerName || 'Consumidor Final',
          documentNumber: billingDetails.paymentDetails.customerDocument || '222222222222',
          docType: billingDetails.paymentDetails.customerDocType || 'CC',
          email: billingDetails.paymentDetails.customerEmail,
        }
      } : undefined,
    };

    // Auto-increment DIAN electronic invoice consecutive
    if (billingDetails.paymentDetails?.isElectronicInvoice) {
      setBusinessInfo(prev => {
        const nextNum = (prev.dianCurrentNumber || 1040) + 1;
        const updated = { ...prev, dianCurrentNumber: nextNum };
        try {
          localStorage.setItem('pk_business_info', JSON.stringify(updated));
        } catch (e) {
          console.error('Error saving business info:', e);
        }
        dbSaveBusinessInfo(updated).catch(console.error);
        return updated;
      });
    }

    // Remove from active tickets in state and local DB
    setActiveTickets(prev => prev.filter(t => t.id !== ticketId));
    dbRemoveActiveTicket(ticketId).catch(console.error);

    // Add to paid tickets in state and local DB
    setPaidTickets(prev => [paidTicket, ...prev]);
    dbSavePaidTicket(paidTicket).catch(console.error);

    // Free up spot in state and local DB
    const updatedSpots = spots.map(s => {
      if (s.code === targetTicket.spotCode) {
        return { ...s, status: 'available' as const, currentTicketId: undefined };
      }
      return s;
    });
    setSpots(updatedSpots);
    dbSaveSpots(updatedSpots).catch(console.error);

    // Record audit log in terminal database
    dbAddAuditLog(
      'EXIT_PAYMENT',
      `Salida y cobro: Ticket ${paidTicket.ticketNumber} [${paidTicket.plate}] - $${paidTicket.totalAmount} (${paidTicket.paymentMethod})`,
      currentShift.operatorName
    ).catch(console.error);

    // Registro automático de estado para auditoría de integridad
    logCriticalDatabaseState('SALIDA_COBRO_VEHICULO', {
      ticketNumber: paidTicket.ticketNumber,
      plate: paidTicket.plate,
      totalAmount: paidTicket.totalAmount,
      paymentMethod: paidTicket.paymentMethod
    });

    // Impresión automática instantánea al registrar salida y pago
    if (businessInfo.autoPrintOnExit !== false) {
      if (businessInfo.silentBackgroundPrint !== false) {
        triggerInstantPrint({ 
          type: 'exit_receipt', 
          ticket: paidTicket, 
          openDrawer: paidTicket.paymentMethod === 'cash' 
        });
      } else {
        handleOpenPrintModal(paidTicket, 'exit');
      }
    }

    // Auto-push live telemetry & operations to Central Server
    handlePushBranchOperations().catch(err => console.warn('[Sync] Auto-push tras cobro de ticket:', err));

    setLastPaidTicketGlobal(paidTicket);
    return paidTicket;
  };

  // --- Global Keyboard Wedge Barcode Scanner Listener ---
  useBarcodeScanner({
    activeTickets: effectiveActiveTickets,
    paidTickets,
    rates,
    onTicketFound: (ticket, autoAction) => {
      setSelectedPlateForExit(ticket.plate);
      setActiveCategory('operations');
      setActiveView('operations');
      if (isTicketScannerModalOpen) {
        setIsTicketScannerModalOpen(false);
      }
    },
    onFastExitDirect: async (ticket) => {
      try {
        const exitFee = calculateParkingFee(
          ticket.entryTime,
          new Date().toISOString(),
          ticket.vehicleType,
          rates
        );
        const paidResult = await handleRegisterExit(ticket.id, {
          paymentMethod: 'cash',
          cashReceived: exitFee.totalAmount,
          changeGiven: 0
        });
        if (paidResult) {
          handleOpenPrintModal(paidResult, 'exit');
        }
      } catch (err) {
        console.error('[Global Scanner] Error en salida directa:', err);
      }
    },
    enabled: true
  });

  // --- Handlers: Print Ticket Modal ---
  const handleOpenPrintModal = (ticket: ParkingTicket, mode: 'entry' | 'exit') => {
    setTicketModalState({
      isOpen: true,
      ticket,
      mode,
    });
  };

  // --- Handlers: Map Interaction ---
  const handleSelectSpotForEntry = (spotCode: string, vehicleType: VehicleType) => {
    setActiveCategory('operations');
    setActiveView('operations');
  };

  const handleSelectSpotForExit = (plate: string) => {
    setSelectedPlateForExit(plate);
    setActiveCategory('operations');
    setActiveView('operations');
  };

  const handleToggleSpotStatus = (spotId: string, newStatus: 'available' | 'reserved' | 'maintenance') => {
    const updated = spots.map(s => {
      if (s.id === spotId) {
        return { 
          ...s, 
          status: newStatus, 
          currentTicketId: newStatus === 'available' ? undefined : s.currentTicketId 
        };
      }
      return s;
    });
    setSpots(updated);
    dbSaveSpots(updated).catch(console.error);
    localStorage.setItem('pk_spots_data', JSON.stringify(updated));
  };

  // --- Handlers: Parking Spots Dedicated Panel ---
  const handleSaveSpot = (spotToSave: ParkingSpot) => {
    setSpots(prev => {
      const idx = prev.findIndex(s => s.id === spotToSave.id);
      let updated: ParkingSpot[] = [];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = spotToSave;
      } else {
        updated = [...prev, spotToSave];
      }
      dbSaveSpots(updated).catch(console.error);
      localStorage.setItem('pk_spots_data', JSON.stringify(updated));
      return updated;
    });
    dbAddAuditLog('SYSTEM_CONFIG', `Plaza de parqueo guardada: ${spotToSave.code}`, currentUser?.username || 'Administrador').catch(console.error);
    playSound('success', soundEnabled);
  };

  const handleSaveMultipleSpots = (newSpotsBatch: ParkingSpot[]) => {
    setSpots(prev => {
      const updated = [...prev, ...newSpotsBatch];
      dbSaveSpots(updated).catch(console.error);
      localStorage.setItem('pk_spots_data', JSON.stringify(updated));
      return updated;
    });
    dbAddAuditLog('SYSTEM_CONFIG', `Se generaron ${newSpotsBatch.length} plazas de parqueo por lote`, currentUser?.username || 'Administrador').catch(console.error);
    playSound('success', soundEnabled);
  };

  const handleDeleteSpot = (spotId: string) => {
    const toDelete = spots.find(s => s.id === spotId);
    if (toDelete) {
      const hasRealVehicle = effectiveActiveTickets.some(t => t.spotCode === toDelete.code || t.id === toDelete.currentTicketId);
      if (hasRealVehicle) {
        alert(`No se puede eliminar la plaza ${toDelete.code} porque tiene un vehículo activo en patio.`);
        return;
      }
    }
    setSpots(prev => {
      const updated = prev.filter(s => s.id !== spotId);
      dbDeleteSpot(spotId).catch(console.error);
      localStorage.setItem('pk_spots_data', JSON.stringify(updated));
      return updated;
    });
    if (toDelete) {
      dbAddAuditLog('SYSTEM_CONFIG', `Plaza de parqueo eliminada: ${toDelete.code}`, currentUser?.username || 'Administrador').catch(console.error);
    }
    playSound('beep', soundEnabled);
  };

  const handleDeleteMultipleSpots = (spotIds: string[]) => {
    const realOccupiedSpotCodes = new Set(effectiveActiveTickets.map(t => t.spotCode));
    setSpots(prev => {
      const updated = prev.filter(s => !spotIds.includes(s.id) || realOccupiedSpotCodes.has(s.code));
      dbDeleteMultipleSpots(spotIds).catch(console.error);
      localStorage.setItem('pk_spots_data', JSON.stringify(updated));
      return updated;
    });
    dbAddAuditLog('SYSTEM_CONFIG', `Eliminación masiva de ${spotIds.length} plazas de parqueo`, currentUser?.username || 'Administrador').catch(console.error);
    playSound('beep', soundEnabled);
  };

  const handleUpdateMultipleSpotStatus = (spotIds: string[], status: 'available' | 'reserved' | 'maintenance') => {
    const realOccupiedSpotCodes = new Set(effectiveActiveTickets.map(t => t.spotCode));
    setSpots(prev => {
      const updated = prev.map(s => {
        if (spotIds.includes(s.id)) {
          if (realOccupiedSpotCodes.has(s.code) && status !== 'available') {
            return s;
          }
          return { ...s, status, currentTicketId: status === 'available' ? undefined : s.currentTicketId };
        }
        return s;
      });
      dbUpdateMultipleSpotStatus(spotIds, status).catch(console.error);
      localStorage.setItem('pk_spots_data', JSON.stringify(updated));
      return updated;
    });
    dbAddAuditLog('SYSTEM_CONFIG', `Cambio de estado masivo a ${status} para ${spotIds.length} plazas`, currentUser?.username || 'Administrador').catch(console.error);
    playSound('beep', soundEnabled);
  };

  const handleReconcileSpotsWithActiveTickets = async (): Promise<{ success: boolean; freedCount?: number; activeCount?: number }> => {
    try {
      const serverRes = await dbReconcileSpots();
      if (serverRes.success && Array.isArray(serverRes.spots)) {
        setSpots(serverRes.spots);
        localStorage.setItem('pk_spots_data', JSON.stringify(serverRes.spots));
        playSound('success', soundEnabled);
        return { success: true, freedCount: serverRes.freedCount || 0, activeCount: effectiveActiveTickets.length };
      }
    } catch (e) {
      console.warn('[handleReconcileSpotsWithActiveTickets] Fallback local tras excepción:', e);
    }

    let freed = 0;
    const reconciled = spots.map(s => {
      const activeTicket = effectiveActiveTickets.find(t => t.spotCode === s.code || t.id === s.currentTicketId);
      if (activeTicket) {
        return { ...s, status: 'occupied' as const, currentTicketId: activeTicket.id };
      }
      if (s.status === 'occupied') {
        freed++;
        return { ...s, status: 'available' as const, currentTicketId: undefined };
      }
      return s;
    });

    setSpots(reconciled);
    localStorage.setItem('pk_spots_data', JSON.stringify(reconciled));
    dbSaveSpots(reconciled).catch(console.error);
    playSound('success', soundEnabled);
    return { success: true, freedCount: freed, activeCount: effectiveActiveTickets.length };
  };

  const handleGoToExitTicket = (ticket: ParkingTicket) => {
    setSelectedPlateForExit(ticket.plate);
    setActiveCategory('operations');
    setActiveView('operations');
  };

  // --- Handlers: Cash Shift Movements with DB Persistence ---
  const handleAddCashMovement = (
    type: 'income' | 'expense' | 'withdrawal' | 'pickup',
    amount: number,
    description: string,
    conceptId?: string,
    conceptName?: string,
    voucherNumber?: string,
    attachmentUrl?: string,
    attachmentName?: string,
    attachmentType?: 'image' | 'pdf' | 'document',
    attachmentSize?: number,
    paymentMethod?: PaymentMethod | string,
    paymentReference?: string
  ) => {
    const newMovement: CashMovement = {
      id: `mov-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      amount,
      description,
      operator: currentUser?.name || currentShift.operatorName || 'Cajero',
      conceptId,
      conceptName,
      voucherNumber,
      paymentMethod,
      paymentReference,
      attachmentUrl,
      attachmentName,
      attachmentType,
      attachmentSize,
    };

    const updatedShift: CashShift = {
      ...currentShift,
      cashMovements: [newMovement, ...currentShift.cashMovements],
    };

    setCurrentShift(updatedShift);
    dbSaveCashShift(updatedShift).catch(console.error);
    dbAddAuditLog(
      'CASH_MOVEMENT',
      `Caja (${type}): $${amount} - ${description}${attachmentName ? ` [Comprobante adjunto: ${attachmentName}]` : ''}`,
      currentShift.operatorName
    ).catch(console.error);
    playSound('cash', soundEnabled);
  };

  // --- Handlers: Shift Change / Arqueo ---
  const handleCloseShiftAndArqueo = async (countedCash: number, nextOperator: string, nextBase: number) => {
    // Filter tickets for this specific shift
    const shiftPaidTickets = paidTickets.filter((t) => {
      if (t.shiftNumber !== undefined && currentShift.shiftNumber !== undefined) {
        return t.shiftNumber === currentShift.shiftNumber;
      }
      if (currentShift.startTime && t.paidAt) {
        return new Date(t.paidAt).getTime() >= new Date(currentShift.startTime).getTime();
      }
      return true;
    });

    // Compute shift payment method breakdown
    let cash = 0;
    let card = 0;
    let wallet = 0;
    let qr = 0;
    let breB = 0;
    let agreement = 0;

    shiftPaidTickets.forEach((t) => {
      const total = t.totalAmount || 0;
      const method = t.paymentMethod || 'cash';
      if (method === 'cash') {
        cash += total;
      } else if (method === 'agreement') {
        agreement += total;
      } else if (method === 'mixed') {
        const splits = t.paymentDetails?.splitPayments || [];
        splits.forEach(s => {
          if (s.method === 'cash') cash += s.amount;
          else if (s.method === 'agreement') agreement += s.amount;
          else if (s.method === 'card') card += s.amount;
          else if (s.method === 'wallet' || s.method === 'nequi' || s.method === 'daviplata') wallet += s.amount;
          else if (s.method === 'qr' || s.method === 'qr_bancolombia' || s.method === 'transfer') qr += s.amount;
          else if (s.method === 'bre_b') breB += s.amount;
        });
      } else {
        if (method === 'card') card += total;
        else if (method === 'wallet' || method === 'nequi' || method === 'daviplata') wallet += total;
        else if (method === 'qr' || method === 'qr_bancolombia' || method === 'transfer') qr += total;
        else if (method === 'bre_b') breB += total;
        else if (method === 'agreement') agreement += total;
      }
    });

    const totalCashOtherIncomes = currentShift.cashMovements
      .filter((m) => m.type === 'income' && !m.description.includes('Apertura') && (!m.paymentMethod || m.paymentMethod === 'cash'))
      .reduce((acc, m) => acc + m.amount, 0);

    const totalElectronicOtherIncomes = currentShift.cashMovements
      .filter((m) => m.type === 'income' && !m.description.includes('Apertura') && m.paymentMethod && m.paymentMethod !== 'cash')
      .reduce((acc, m) => acc + m.amount, 0);

    const totalOtherIncomes = totalCashOtherIncomes + totalElectronicOtherIncomes;

    const totalExpenses = currentShift.cashMovements
      .filter((m) => m.type === 'expense')
      .reduce((acc, m) => acc + m.amount, 0);

    const totalPickups = currentShift.cashMovements
      .filter((m) => m.type === 'pickup' || m.type === 'withdrawal')
      .reduce((acc, m) => acc + m.amount, 0);

    const totalOutflows = totalExpenses + totalPickups;
    const expectedCashInDrawer = currentShift.initialCash + cash + totalCashOtherIncomes - totalOutflows;
    const totalCollected = cash + card + wallet + qr + breB + agreement + totalOtherIncomes;

    // Generate consecutive sequential code for shift arqueo
    const nextShiftConsecutive = closedShiftsHistory.length + 421;
    const consecutiveCode = `ARQ-${nextShiftConsecutive.toString().padStart(6, '0')}`;

    // Push current shift to history as closed with all snapshots
    const closedShiftRecord: CashShift = {
      ...currentShift,
      endTime: new Date().toISOString(),
      finalCountedCash: countedCash,
      status: 'closed',
      consecutiveCode,
      cashCollectedSnapshot: cash,
      cardCollectedSnapshot: card,
      walletCollectedSnapshot: wallet,
      qrCollectedSnapshot: qr,
      breBCollectedSnapshot: breB,
      agreementCollectedSnapshot: agreement,
      totalCollectedSnapshot: totalCollected,
      totalExpensesSnapshot: totalExpenses,
      totalPickupsSnapshot: totalPickups,
      expectedCashSnapshot: expectedCashInDrawer,
      countedCashSnapshot: countedCash,
      cashDifference: countedCash - expectedCashInDrawer,
      totalToConsignSnapshot: totalPickups + Math.max(0, countedCash - currentShift.initialCash),
    };
    setClosedShiftsHistory(prev => [closedShiftRecord, ...prev]);

    const nextShiftNumber = (currentShift.shiftNumber || 1) + 1;
    const nextShift: CashShift = {
      id: `shift-${operationalDay.dayNumber}-${nextShiftNumber}-${Date.now()}`,
      shiftNumber: nextShiftNumber,
      operationalDayId: operationalDay.id,
      operationalDayNumber: operationalDay.dayNumber,
      operatorName: nextOperator,
      startTime: new Date().toISOString(),
      initialCash: nextBase,
      status: 'open',
      cashMovements: [
        {
          id: `mov-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'income',
          amount: nextBase,
          description: `Apertura de turno #${nextShiftNumber} - Base inicial entregada por ${currentShift.operatorName}`,
          operator: nextOperator,
        }
      ],
    };

    setCurrentShift(nextShift);
    dbSaveCashShift(nextShift).catch(console.error);

    setOperationalDay(prev => ({
      ...prev,
      shiftsCount: (prev.shiftsCount || 1) + 1,
    }));

    dbAddAuditLog(
      'SHIFT_CLOSE_ARQUEO',
      `Arqueo de turno #${currentShift.shiftNumber} cerrado (Físico: $${countedCash}). Abre Turno #${nextShiftNumber} con ${nextOperator} y base $${nextBase}`,
      currentShift.operatorName
    ).catch(console.error);

    logCriticalDatabaseState('CIERRE_ARQUEO_TURNO', {
      shiftNumber: currentShift.shiftNumber,
      countedCash,
      totalCollected,
      consecutiveCode
    });

    playSound('success', soundEnabled);

    // Impresión automática instantánea del arqueo de turno
    if (businessInfo.autoPrintOnShiftClose !== false) {
      triggerInstantPrint({ type: 'cash_shift', shift: closedShiftRecord });
    }

    await triggerBlockingBackup('shift');
    handlePushBranchOperations().catch(err => console.warn('[Sync] Auto-push de operaciones tras cierre de turno:', err));
  };

  // --- Handlers: Definitive Day Close ---
  const handleCloseDefinitiveDay = async (finalCash: number, notes?: string) => {
    // Compute day breakdown from all paid tickets of this day
    let dayCash = 0;
    let dayCard = 0;
    let dayWallet = 0;
    let dayQr = 0;
    let dayBreB = 0;
    let dayAgreement = 0;

    paidTickets.forEach((t) => {
      const total = t.totalAmount || 0;
      const method = t.paymentMethod || 'cash';
      if (method === 'cash') {
        dayCash += total;
      } else if (method === 'agreement') {
        dayAgreement += total;
      } else if (method === 'mixed') {
        const splits = t.paymentDetails?.splitPayments || [];
        splits.forEach(s => {
          if (s.method === 'cash') dayCash += s.amount;
          else if (s.method === 'agreement') dayAgreement += s.amount;
          else if (s.method === 'card') dayCard += s.amount;
          else if (s.method === 'wallet' || s.method === 'nequi' || s.method === 'daviplata') dayWallet += s.amount;
          else if (s.method === 'qr' || s.method === 'qr_bancolombia' || s.method === 'transfer') dayQr += s.amount;
          else if (s.method === 'bre_b') dayBreB += s.amount;
        });
      } else {
        if (method === 'card') dayCard += total;
        else if (method === 'wallet' || method === 'nequi' || method === 'daviplata') dayWallet += total;
        else if (method === 'qr' || method === 'qr_bancolombia' || method === 'transfer') dayQr += total;
        else if (method === 'bre_b') dayBreB += total;
        else if (method === 'agreement') dayAgreement += total;
      }
    });

    const dayShifts = [currentShift, ...closedShiftsHistory.filter(s => s.operationalDayId === operationalDay.id)];

    let dayTotalCashOtherIncomes = 0;
    let dayTotalElectronicOtherIncomes = 0;
    let dayTotalExpenses = 0;
    let dayTotalPickups = 0;

    dayShifts.forEach(s => {
      const movements = s.cashMovements || [];
      movements.forEach(m => {
        if (m.type === 'income' && !m.description.includes('Apertura')) {
          if (m.paymentMethod && m.paymentMethod !== 'cash') {
            dayTotalElectronicOtherIncomes += m.amount;
          } else {
            dayTotalCashOtherIncomes += m.amount;
          }
        } else if (m.type === 'expense') {
          dayTotalExpenses += m.amount;
        } else if (m.type === 'pickup' || m.type === 'withdrawal') {
          dayTotalPickups += m.amount;
        }
      });
    });

    const dayTotalOtherIncomes = dayTotalCashOtherIncomes + dayTotalElectronicOtherIncomes;
    const dayBaseCash = operationalDay.initialDayCash || currentShift.initialCash;
    const dayExpectedCashInDrawer = dayBaseCash + dayCash + dayTotalCashOtherIncomes - (dayTotalExpenses + dayTotalPickups);
    const dayTotalCollected = dayCash + dayCard + dayWallet + dayQr + dayBreB + dayAgreement + dayTotalOtherIncomes;

    // Generate consecutive sequential code for day closure starting at 4310
    const nextDayConsecutive = closedDaysHistory.length + 4310;
    const consecutiveCode = `${nextDayConsecutive.toString().padStart(6, '0')}`;

    // Cálculo detallado de vehículos atendidos por categoría
    const vehicleStatsMap: Record<string, { count: number; total: number }> = {};
    let dayTotalDiscounts = 0;
    paidTickets.forEach(t => {
      const catKey = t.vehicleType || 'car';
      if (!vehicleStatsMap[catKey]) vehicleStatsMap[catKey] = { count: 0, total: 0 };
      vehicleStatsMap[catKey].count++;
      vehicleStatsMap[catKey].total += (t.totalAmount || 0);
      dayTotalDiscounts += (t.discountAmount || 0);
    });

    const vehicleStatsSnapshot = Object.entries(vehicleStatsMap).map(([cat, val]) => {
      const matchedCat = vehicleCategories.find(vc => vc.id === cat);
      return {
        category: matchedCat?.name || cat.toUpperCase(),
        count: val.count,
        total: val.total
      };
    });

    // Resumen consolidado turno por turno
    const shiftsSummarySnapshot = dayShifts.map(s => {
      const sCash = s.cashCollectedSnapshot || 0;
      const sElec = (s.totalCollectedSnapshot || 0) - sCash;
      return {
        shiftNumber: s.shiftNumber || 1,
        operatorName: s.operatorName || 'Cajero',
        totalCollected: s.totalCollectedSnapshot || 0,
        cash: sCash,
        electronic: Math.max(0, sElec),
        status: s.status || 'closed'
      };
    });

    // Resumen de egresos (gastos y retiros a bóveda)
    const movementsSummarySnapshot: { type: string; concept?: string; amount: number; description?: string }[] = [];
    dayShifts.forEach(s => {
      (s.cashMovements || []).forEach(m => {
        if (m.type === 'expense' || m.type === 'pickup' || m.type === 'withdrawal') {
          movementsSummarySnapshot.push({
            type: m.type,
            amount: m.amount,
            description: m.description
          });
        }
      });
    });

    const totalTicketsPaidSnapshot = paidTickets.length;
    const activeVehiclesRemainingSnapshot = activeTickets.length;
    const totalTicketsIssuedSnapshot = totalTicketsPaidSnapshot + activeVehiclesRemainingSnapshot;
    const ticketRangeSnapshot = {
      startTicket: paidTickets[paidTickets.length - 1]?.ticketNumber || 'TKT-001',
      endTicket: (activeTickets[0] || paidTickets[0])?.ticketNumber || 'TKT-001'
    };

    // Push current operational day to history as closed
    const closedDayRecord: OperationalDay = {
      ...operationalDay,
      closedAt: new Date().toISOString(),
      status: 'closed',
      consecutiveCode,
      finalDayCash: finalCash,
      closedByOperator: currentUser?.name || 'Administrador',
      closingNotes: notes,
      cashCollectedSnapshot: dayCash,
      cardCollectedSnapshot: dayCard,
      walletCollectedSnapshot: dayWallet,
      qrCollectedSnapshot: dayQr,
      breBCollectedSnapshot: dayBreB,
      agreementCollectedSnapshot: dayAgreement,
      totalCollected: dayTotalCollected,
      totalIncomesSnapshot: dayTotalOtherIncomes,
      totalExpensesSnapshot: dayTotalExpenses,
      totalPickupsSnapshot: dayTotalPickups,
      expectedCashSnapshot: dayExpectedCashInDrawer,
      countedCashSnapshot: finalCash,
      cashDifferenceSnapshot: finalCash - dayExpectedCashInDrawer,
      totalToConsignSnapshot: dayTotalPickups + Math.max(0, finalCash - dayBaseCash),
      vehicleStatsSnapshot,
      shiftsSummarySnapshot,
      movementsSummarySnapshot,
      totalTicketsIssuedSnapshot,
      totalTicketsPaidSnapshot,
      activeVehiclesRemainingSnapshot,
      ticketRangeSnapshot,
      totalDiscountsSnapshot: dayTotalDiscounts,
    };
    setClosedDaysHistory(prev => [closedDayRecord, ...prev]);

    const nextDayNumber = (operationalDay.dayNumber || 1) + 1;
    
    // Calculate next day date cleanly
    let nextDateStr = '';
    try {
      const baseDate = operationalDay.date ? new Date(operationalDay.date + 'T12:00:00') : new Date();
      baseDate.setDate(baseDate.getDate() + 1);
      nextDateStr = baseDate.toISOString().split('T')[0];
    } catch {
      nextDateStr = new Date().toISOString().split('T')[0];
    }

    const newDay: OperationalDay = {
      id: `day-${nextDateStr}-${nextDayNumber}`,
      dayNumber: nextDayNumber,
      date: nextDateStr,
      openedAt: new Date().toISOString(),
      status: 'open',
      initialDayCash: currentShift.initialCash,
      totalCollected: 0,
      shiftsCount: 1,
      closingNotes: notes,
    };

    setOperationalDay(newDay);

    const newShift: CashShift = {
      id: `shift-${nextDayNumber}-1-${Date.now()}`,
      shiftNumber: 1,
      operationalDayId: newDay.id,
      operationalDayNumber: nextDayNumber,
      operatorName: currentUser?.name || 'Cajero Principal',
      startTime: new Date().toISOString(),
      initialCash: currentShift.initialCash,
      status: 'open',
      cashMovements: [
        {
          id: `mov-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'income',
          amount: currentShift.initialCash,
          description: `Apertura Día Operativo #${nextDayNumber} - Turno #1`,
          operator: currentUser?.name || 'Cajero Principal',
        }
      ],
    };

    setCurrentShift(newShift);
    dbSaveCashShift(newShift).catch(console.error);

    dbAddAuditLog(
      'DAY_DEFINITIVE_CLOSE',
      `Cierre definitivo Día Operativo #${operationalDay.dayNumber} (${operationalDay.date || 'Actual'}). Iniciado Día Operativo #${nextDayNumber} (${nextDateStr}).`,
      currentUser?.name || 'Administrador'
    ).catch(console.error);

    logCriticalDatabaseState('CIERRE_DEFINITIVO_DIA', {
      dayNumber: operationalDay.dayNumber,
      finalCash,
      consecutiveCode
    });

    playSound('success', soundEnabled);

    // Impresión automática instantánea del cierre definitivo de jornada
    if (businessInfo.autoPrintOnDayClose !== false) {
      triggerInstantPrint({ type: 'day_closure', day: closedDayRecord });
    }

    await triggerBlockingBackup('day');
    handlePushBranchOperations().catch(err => console.warn('[Sync] Auto-push de operaciones tras cierre definitivo:', err));
  };

  // --- Handlers: Vehicle Categories & Expense Concepts ---
  const handleSaveVehicleCategory = (catToSave: VehicleCategoryConfig) => {
    const hr = catToSave.defaultHourlyRate ?? catToSave.rate?.hourRate ?? 4000;
    const mr = catToSave.defaultMinuteRate ?? catToSave.rate?.minuteRate ?? Math.round(hr / 60);
    const dr = catToSave.defaultDailyRate ?? catToSave.rate?.dayRate ?? 25000;
    const gp = catToSave.gracePeriodMinutes ?? catToSave.rate?.gracePeriodMinutes ?? 15;
    const minCharge = catToSave.rate?.minimumChargeMinutes ?? gp;
    const lostFee = catToSave.rate?.lostTicketFee ?? 15000;

    const completeCategory: VehicleCategoryConfig = {
      ...catToSave,
      defaultHourlyRate: hr,
      defaultMinuteRate: mr,
      defaultDailyRate: dr,
      gracePeriodMinutes: gp,
      rate: {
        hourRate: hr,
        minuteRate: mr,
        dayRate: dr,
        gracePeriodMinutes: gp,
        minimumChargeMinutes: minCharge,
        lostTicketFee: lostFee,
      }
    };

    let nextCategories: VehicleCategoryConfig[] = [];
    setVehicleCategories(prev => {
      const idx = prev.findIndex(c => c.id === catToSave.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = completeCategory;
        nextCategories = copy;
        return copy;
      }
      nextCategories = [...prev, completeCategory];
      return nextCategories;
    });

    // Synchronize rates state & DB
    setRates(prevRates => {
      const updatedRates: RatesConfig = {
        ...prevRates,
        [catToSave.id]: {
          hourRate: hr,
          minuteRate: mr,
          dayRate: dr,
          gracePeriodMinutes: gp,
          minimumChargeMinutes: minCharge,
          lostTicketFee: lostFee,
        },
        categories: nextCategories.length > 0 ? nextCategories : vehicleCategories,
      };
      dbSaveRates(updatedRates).catch(console.error);
      return updatedRates;
    });

    dbAddAuditLog('RATE_CHANGE', `Categoría de vehículo guardada: ${catToSave.name}`, currentUser?.name || 'Administrador').catch(console.error);
    playSound('success', soundEnabled);
  };

  const handleDeleteVehicleCategory = (catId: string) => {
    const toDelete = vehicleCategories.find(c => c.id === catId);
    const nextCategories = vehicleCategories.filter(c => c.id !== catId);
    setVehicleCategories(nextCategories);
    
    setRates(prevRates => {
      const copy = { ...prevRates };
      delete copy[catId];
      copy.categories = nextCategories;
      dbSaveRates(copy).catch(console.error);
      return copy;
    });

    if (toDelete) {
      dbAddAuditLog('RATE_CHANGE', `Categoría de vehículo eliminada: ${toDelete.name}`, currentUser?.name || 'Administrador').catch(console.error);
    }
    playSound('beep', soundEnabled);
  };

  const handleSaveExpenseConcept = (conceptToSave: ExpenseConcept) => {
    setExpenseConcepts(prev => {
      const idx = prev.findIndex(c => c.id === conceptToSave.id);
      let updated: ExpenseConcept[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = conceptToSave;
      } else {
        updated = [...prev, conceptToSave];
      }
      dbSaveExpenseConcepts(updated).catch(console.error);
      return updated;
    });
    dbAddAuditLog('CASH_MOVEMENT', `Concepto de gasto guardado: ${conceptToSave.name}`, currentUser?.name || 'Administrador').catch(console.error);
    playSound('success', soundEnabled);
  };

  const handleDeleteExpenseConcept = (conceptId: string) => {
    const toDelete = expenseConcepts.find(c => c.id === conceptId);
    setExpenseConcepts(prev => {
      const updated = prev.filter(c => c.id !== conceptId);
      dbSaveExpenseConcepts(updated).catch(console.error);
      return updated;
    });
    if (toDelete) {
      dbAddAuditLog('CASH_MOVEMENT', `Concepto de gasto eliminado: ${toDelete.name}`, currentUser?.name || 'Administrador').catch(console.error);
    }
    playSound('beep', soundEnabled);
  };

  const handleSaveExpenseCategory = (categoryToSave: ExpenseCategory) => {
    setExpenseCategories(prev => {
      const idx = prev.findIndex(c => c.id === categoryToSave.id);
      let updated: ExpenseCategory[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = categoryToSave;
      } else {
        updated = [...prev, categoryToSave];
      }
      dbSaveExpenseCategories(updated).catch(console.error);
      return updated;
    });
    dbAddAuditLog('CASH_MOVEMENT', `Categoría de gasto guardada: ${categoryToSave.name}`, currentUser?.name || 'Administrador').catch(console.error);
    playSound('success', soundEnabled);
  };

  const handleDeleteExpenseCategory = (categoryId: string) => {
    const toDelete = expenseCategories.find(c => c.id === categoryId);
    setExpenseCategories(prev => {
      const updated = prev.filter(c => c.id !== categoryId);
      dbSaveExpenseCategories(updated).catch(console.error);
      return updated;
    });
    if (toDelete) {
      dbAddAuditLog('CASH_MOVEMENT', `Categoría de gasto eliminada: ${toDelete.name}`, currentUser?.name || 'Administrador').catch(console.error);
    }
    playSound('beep', soundEnabled);
  };

  const handleSaveCommercialAgreement = (agreementToSave: CommercialAgreement) => {
    setCommercialAgreements(prev => {
      const idx = prev.findIndex(c => c.id === agreementToSave.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = agreementToSave;
        return copy;
      }
      return [...prev, agreementToSave];
    });
    dbAddAuditLog('RATE_CHANGE', `Convenio comercial guardado: ${agreementToSave.name} (${agreementToSave.code})`, currentUser?.name || 'Administrador').catch(console.error);
    playSound('success', soundEnabled);
  };

  const handleDeleteCommercialAgreement = (agreementId: string) => {
    const toDelete = commercialAgreements.find(c => c.id === agreementId);
    setCommercialAgreements(prev => prev.filter(c => c.id !== agreementId));
    if (toDelete) {
      dbAddAuditLog('RATE_CHANGE', `Convenio comercial eliminado: ${toDelete.name} (${toDelete.code})`, currentUser?.name || 'Administrador').catch(console.error);
    }
    playSound('beep', soundEnabled);
  };

  const handleSaveRates = (newRates: RatesConfig) => {
    setRates(newRates);
    localStorage.setItem('pk_rates_config', JSON.stringify(newRates));

    const updatedCategories = vehicleCategories.map(cat => {
      const r = newRates[cat.id];
      if (!r) return cat;
      return {
        ...cat,
        defaultHourlyRate: r.hourRate,
        defaultMinuteRate: r.minuteRate,
        defaultDailyRate: r.dayRate,
        gracePeriodMinutes: r.gracePeriodMinutes,
        rate: { ...r }
      };
    });
    setVehicleCategories(updatedCategories);
    localStorage.setItem('pk_vehicle_categories', JSON.stringify(updatedCategories));

    dbSaveRates(newRates).catch(console.error);
    dbAddAuditLog('RATE_CHANGE', 'Tarifas del parqueadero actualizadas', currentShift?.operatorName || 'Administrador').catch(console.error);

    // Save to server immediately so all sucursales receive it
    saveGlobalConfigToServer({
      branches,
      warehouses,
      rates: newRates,
      vehicleCategories: updatedCategories,
      expenseCategories,
      expenseConcepts,
      users,
      businessInfo,
      lastUpdated: new Date().toISOString()
    });
  };

  const handleSaveBusinessInfo = (newInfo: ParkingBusinessInfo) => {
    setBusinessInfo(newInfo);
    dbSaveBusinessInfo(newInfo).catch(console.error);
    dbAddAuditLog('SYSTEM_CONFIG', `Información de negocio y DIAN actualizada: ${newInfo.name || ''} (NIT: ${newInfo.nit || ''})`, currentUser?.name || 'Administrador').catch(console.error);
  };

  const handleSavePaymentGatewayConfig = (newConfig: PaymentGatewayConfig) => {
    setPaymentGatewayConfig(newConfig);
    localStorage.setItem('pk_payment_gateway_config', JSON.stringify(newConfig));
    dbSavePaymentGatewayConfig(newConfig).catch(console.error);
    dbAddAuditLog('GATEWAY_CONFIG', 'Medios y pasarela de pago actualizados', currentShift?.operatorName || currentUser?.name || 'Administrador').catch(console.error);
  };

  // Control de Acceso: Inicio de Sesión de Usuario Requerido (Maestro, Supervisor, Cajero)
  if (!currentUser) {
    return (
      <LoginView
        users={users}
        businessName={businessInfo.name}
        currentBranch={currentBranch}
        onLogin={handleLoginSuccess}
        onLoginSuccess={handleLoginSuccess}
        onQuickLogin={handleLoginSuccess}
      />
    );
  }

  return (
    <div 
      data-theme={isDarkMode ? 'dark' : 'light'}
      className="min-h-screen flex bg-[var(--bg-app)] text-[var(--text-main)] font-sans transition-colors duration-200 overflow-x-hidden selection:bg-amber-500 selection:text-slate-950"
    >
      {/* Barra lateral izquierda colapsable (Sidebar) */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        businessInfo={effectiveBusinessInfo}
        currentBranch={currentBranch}
        systemNodeConfig={systemNodeConfig}
        activeRemoteSession={activeRemoteSession}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        activeView={activeView}
        setActiveView={handleSwitchView}
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTicketsCount={effectiveActiveTickets.length}
        pendingCentralUpdatesCount={pendingUpdatesForBranchCount}
        softwareUpdateAvailable={hasSoftwareUpdateAvailable}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleDarkMode}
        contrastLevel={contrastLevel}
        onSelectContrastLevel={handleSelectContrastLevel}
      />

      {/* Columna Principal de Trabajo (TopNavbar + Espacio Centrado Amplio) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Banner de Advertencia Crítica de Espacio en Disco (< 500MB) */}
        {diskSpaceInfo && diskSpaceInfo.isCritical && !isDiskSpaceDismissed && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-4 py-2.5 text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-xl z-50 animate-pulse border-b border-red-400/50 shrink-0">
            <div className="flex items-center gap-3">
              <HardDrive className="w-4 h-4 text-white shrink-0 animate-bounce" />
              <span>
                ⚠️ <strong>ADVERTENCIA CRÍTICA DE ESPACIO EN DISCO:</strong> El computador host tiene solo {diskSpaceInfo.freeMB} MB libres (&lt; 500 MB). Libera espacio en disco urgentemente para evitar bloqueos o corrupción en PostgreSQL.
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Barra de progreso de advertencia */}
              <div className="hidden md:flex items-center gap-2 bg-black/30 px-2.5 py-1 rounded-lg border border-white/20">
                <span className="text-[10px] font-mono">Usado:</span>
                <div className="w-20 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.round(((Math.max(0, (diskSpaceInfo.totalMB || 20480) - diskSpaceInfo.freeMB)) / (diskSpaceInfo.totalMB || 20480)) * 100))}%` }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
                <span className="text-[10px] font-mono font-black">
                  {Math.min(100, Math.round(((Math.max(0, (diskSpaceInfo.totalMB || 20480) - diskSpaceInfo.freeMB)) / (diskSpaceInfo.totalMB || 20480)) * 100))}%
                </span>
              </div>

              <button
                type="button"
                onClick={async () => {
                  const res = await fetch('/api/system/disk-space');
                  if (res.ok) setDiskSpaceInfo(await res.json());
                }}
                className="px-2.5 py-1 bg-black/40 hover:bg-black/60 rounded-lg text-[11px] font-semibold border border-white/30 transition-all cursor-pointer"
              >
                Reverificar Disco
              </button>
              <button
                type="button"
                onClick={() => setIsDiskSpaceDismissed(true)}
                className="px-2 py-1 bg-black/30 hover:bg-black/50 rounded-lg text-[11px] transition-all cursor-pointer"
                title="Ocultar advertencia temporalmente"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Banner de Control Remoto POS en Vivo */}
        {activeRemoteSession && (
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-b border-emerald-500/50 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-white shadow-xl shrink-0 z-40 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold uppercase text-[10px] bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                    CONTROL REMOTO EN VIVO
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{activeRemoteSession.branchName} ({activeRemoteSession.city})</span>
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">IP: {activeRemoteSession.ipAddress} · Ping: {activeRemoteSession.pingMs}ms</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1 sm:mt-0">
              <button
                onClick={() => handleSwitchView('branches', 'central')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-700 font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Cambiar Sede</span>
              </button>
              <button
                onClick={handleExitRemoteSession}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Salir de Acceso Remoto</span>
              </button>
            </div>
          </div>
        )}

        {/* Encabezado Superior (TopNavbar) */}
        <TopNavbar
          businessInfo={effectiveBusinessInfo}
          activeCategory={activeCategory}
          activeView={activeView}
          setActiveView={handleSwitchView}
          spots={effectiveSpots}
          activeTickets={effectiveActiveTickets}
          todayPaidTickets={paidTickets}
          currentShift={currentShift}
          operationalDay={operationalDay}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          terminalConfig={terminalConfig}
          onLockTerminal={handleLockTerminal}
          currentUser={currentUser}
          onLogout={handleLogout}
          currentBranch={currentBranch}
          systemNodeConfig={systemNodeConfig}
          onManualSync={handleManualSyncParams}
          isSyncingGlobal={isSyncingGlobal}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleDarkMode}
          contrastLevel={contrastLevel}
          onOpenSyncModal={() => handleSwitchView('branch_sync', 'central')}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          diskSpaceInfo={diskSpaceInfo}
          pendingCentralUpdatesCount={pendingUpdatesForBranchCount}
          softwareUpdateAvailable={hasSoftwareUpdateAvailable}
          onOpenPrinterModal={() => setIsPrinterModalOpen(true)}
          onOpenCashDrawer={handleOpenCashDrawerDirect}
          onOpenSubscribersModal={() => setIsSubscribersModalOpen(true)}
        />

        {/* Sistema de Pestañas Internas Independientes (Workspace Tabs) */}
        <WorkspaceTabBar
          tabs={workspaceTabs}
          activeTabId={activeTabId}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onNewTab={handleOpenNewTab}
          isPrinting={isPrintingThermal}
          lastPrintedInfo={lastPrintedInfo}
          onReprintLast={handleReprintLastReceipt}
          hasLastTicketToReprint={Boolean(lastPaidTicketGlobal || lastEntryTicketGlobal)}
        />

        {/* Espacio de Trabajo Principal Centrado y Amplio */}
        <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 md:p-6 lg:p-8 overflow-x-hidden">
        {/* Top Floating Helper Banner when outside of Operations POS */}
        <AnimatePresence>
          {activeView !== 'operations' && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden mb-4"
            >
              <div className="bg-white/85 dark:bg-slate-900/85 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs backdrop-blur-md">
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold">Módulo activo:</span>
                  <span className="font-bold text-slate-950 dark:text-white capitalize px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    {activeView.replace('_', ' ')}
                  </span>
                  <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">·</span>
                  <span className="text-slate-600 dark:text-slate-400 text-xs hidden sm:inline">
                    La pantalla principal de Patio POS sigue disponible en cualquier momento
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenNewTab(activeView)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                    title="Duplicar o abrir este módulo en una pestaña interna independiente"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    <span>Abrir en Pestaña Interna</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchView('operations')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-sm shadow-indigo-600/25"
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>Volver a Patio POS</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full"
          >
            {/* OPERACIONES PATIO */}
        {activeView === 'operations' && (
          <OperationsView
            spots={effectiveSpots}
            activeTickets={effectiveActiveTickets}
            rates={rates}
            businessInfo={effectiveBusinessInfo}
            soundEnabled={soundEnabled}
            onRegisterEntry={handleRegisterEntry}
            onRegisterExit={handleRegisterExit}
            onPrintTicket={handleOpenPrintModal}
            selectedPlateForExit={selectedPlateForExit}
            onClearSelectedPlate={() => setSelectedPlateForExit(null)}
            currentUser={currentUser}
            paymentGatewayConfig={paymentGatewayConfig}
            onOpenTicketScanner={() => setIsTicketScannerModalOpen(true)}
            onOpenAnprCamera={() => setActiveView('anpr_camera')}
            vehicleCategories={vehicleCategories}
            commercialAgreements={commercialAgreements}
          />
        )}

        {activeView === 'map' && (
          <ParkingMap
            spots={effectiveSpots}
            activeTickets={effectiveActiveTickets}
            rates={rates}
            vehicleCategories={vehicleCategories}
            currentUser={currentUser}
            onSelectSpotForEntry={handleSelectSpotForEntry}
            onSelectSpotForExit={handleSelectSpotForExit}
            onToggleSpotStatus={handleToggleSpotStatus}
            onOpenSpotsManagement={() => setActiveView('spots')}
          />
        )}

        {activeView === 'spots' && (
          <SpotsManagementModal
            embedded={true}
            isOpen={true}
            onClose={() => setActiveView('operations')}
            spots={effectiveSpots}
            activeTickets={effectiveActiveTickets}
            vehicleCategories={vehicleCategories}
            onSaveSpot={handleSaveSpot}
            onSaveMultipleSpots={handleSaveMultipleSpots}
            onDeleteSpot={handleDeleteSpot}
            onDeleteMultipleSpots={handleDeleteMultipleSpots}
            onUpdateSpotStatus={handleToggleSpotStatus}
            onUpdateMultipleSpotStatus={handleUpdateMultipleSpotStatus}
            onReconcileSpots={handleReconcileSpotsWithActiveTickets}
            onGoToExitTicket={handleGoToExitTicket}
          />
        )}

        {/* CÁMARAS IP & LECTOR DE PLACAS ANPR (IA) */}
        {activeView === 'anpr_camera' && (
          <AnprCameraModule
            tickets={activeTickets}
            onRegisterEntry={(plate, vehicleType, notes) => {
              const freeSpot = spots.find(s => s.status === 'available' && (s.type === vehicleType || s.type === 'car')) || spots.find(s => s.status === 'available');
              handleRegisterEntry({
                plate,
                vehicleType,
                spotCode: freeSpot ? freeSpot.code : 'A-01',
                notes: notes || 'Lectura de Cámara IP ANPR (Gemini AI Vision)'
              });
            }}
            onSelectTicketForExit={(ticket) => {
              handleSelectSpotForExit(ticket.spotCode);
              setActiveView('operations');
            }}
            currencySymbol={rates.currencySymbol}
            onClose={() => setActiveView('operations')}
          />
        )}

        {/* FINANZAS & CAJA */}
        {activeView === 'cash' && (
          <CashShiftModal
            currentShift={currentShift}
            operationalDay={operationalDay}
            todayPaidTickets={paidTickets}
            currencySymbol={rates.currencySymbol}
            businessInfo={businessInfo}
            closedShiftsHistory={closedShiftsHistory}
            closedDaysHistory={closedDaysHistory}
            onUpdateShiftInHistory={handleUpdateShiftInHistory}
            onUpdateDayInHistory={handleUpdateDayInHistory}
            onAddMovement={handleAddCashMovement}
            onCloseShiftAndArqueo={handleCloseShiftAndArqueo}
            onCloseDefinitiveDay={handleCloseDefinitiveDay}
            currentUser={currentUser}
            expenseConcepts={expenseConcepts}
            expenseCategories={expenseCategories}
          />
        )}

        {activeView === 'cash_history' && (
          <CashShiftModal
            initialSubTab="history"
            currentShift={currentShift}
            operationalDay={operationalDay}
            todayPaidTickets={paidTickets}
            currencySymbol={rates.currencySymbol}
            businessInfo={businessInfo}
            closedShiftsHistory={closedShiftsHistory}
            closedDaysHistory={closedDaysHistory}
            onUpdateShiftInHistory={handleUpdateShiftInHistory}
            onUpdateDayInHistory={handleUpdateDayInHistory}
            onAddMovement={handleAddCashMovement}
            onCloseShiftAndArqueo={handleCloseShiftAndArqueo}
            onCloseDefinitiveDay={handleCloseDefinitiveDay}
            currentUser={currentUser}
            expenseConcepts={expenseConcepts}
            expenseCategories={expenseCategories}
          />
        )}

        {activeView === 'expense_concepts' && (
          <ExpenseConceptsModal
            embedded={true}
            isOpen={true}
            onClose={() => setActiveView('operations')}
            concepts={expenseConcepts}
            categories={expenseCategories}
            onSaveConcept={handleSaveExpenseConcept}
            onDeleteConcept={handleDeleteExpenseConcept}
            onSaveCategory={handleSaveExpenseCategory}
            onDeleteCategory={handleDeleteExpenseCategory}
            currentUser={currentUser}
          />
        )}

        {/* INFORMES & BI */}
        {activeView === 'reports' && (
          <RealTimeReports
            paidTickets={effectivePaidTickets}
            activeTickets={effectiveActiveTickets}
            rates={rates}
            businessInfo={{
              ...effectiveBusinessInfo,
              branchName: currentBranch?.name || effectiveBusinessInfo.branchName || businessInfo.name,
              sucursal: currentBranch?.name || effectiveBusinessInfo.sucursal || businessInfo.name,
              nit: effectiveBusinessInfo.nit || businessInfo.nit,
              emissionDate: new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }),
              fechaEmision: new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }),
            }}
            vehicleCategories={vehicleCategories}
            spots={effectiveSpots}
            currentShift={currentShift}
            operationalDay={operationalDay}
            closedShiftsHistory={closedShiftsHistory}
            closedDaysHistory={closedDaysHistory}
            expenseConcepts={expenseConcepts}
            expenseCategories={expenseCategories}
            onPrintTicket={handleOpenPrintModal}
            currentUser={currentUser}
            currentBranch={currentBranch}
            isDarkMode={isDarkMode}
          />
        )}

        {/* SERVIDOR CENTRAL & RED */}
        {activeView === 'branches' && (
          <BranchesManagementModal
            embedded={true}
            isOpen={true}
            onClose={() => setActiveView('operations')}
            branches={branches}
            warehouses={warehouses}
            posPoints={posPoints}
            remoteOrders={remoteOrders}
            onSaveBranch={handleSaveBranch}
            onDeleteBranch={handleDeleteBranch}
            onSaveWarehouse={handleSaveWarehouse}
            onDeleteWarehouse={handleDeleteWarehouse}
            onSavePosPoint={handleSavePosPoint}
            onDeletePosPoint={handleDeletePosPoint}
            onExecuteRemoteOrder={handleExecuteRemoteOrder}
            onConnectRemoteBranch={handleConnectRemoteBranch}
            currentUser={currentUser}
            onOpenSync={() => handleSwitchView('branch_sync', 'central')}
            onOpenWorkMode={() => handleSwitchView('work_mode', 'central')}
            onOpenUpdater={() => handleSwitchView('software_updater', 'updates')}
            onOpenCentralHub={(tab) => {
              if (tab) setCentralHubInitialTab(tab as any);
              handleSwitchView('central_hub', 'central');
            }}
            onRefreshBranches={async () => {
              const refreshed = await fetchBranchesTelemetry();
              if (refreshed && refreshed.length > 0) {
                let deletedSet = new Set<string>();
                try {
                  const savedDeleted = localStorage.getItem('pk_deleted_branch_ids');
                  if (savedDeleted) deletedSet = new Set(JSON.parse(savedDeleted));
                } catch (e) {}
                setBranches(prev => {
                  const prevIds = new Set(prev.map(p => p.id));
                  return refreshed.filter(r => prevIds.has(r.id) && !deletedSet.has(r.id));
                });
              }
            }}
            pendingCentralUpdatesCount={pendingUpdatesForBranchCount}
            softwareUpdateAvailable={hasSoftwareUpdateAvailable}
          />
        )}

        {activeView === 'central_hub' && (
          <CentralHubModal
            embedded={true}
            isOpen={true}
            initialTab={centralHubInitialTab}
            onClose={() => setActiveView('branches')}
            currentUser={currentUser}
            branches={branches}
            warehouses={warehouses}
            posPoints={posPoints}
            centralPackages={centralPackages}
            syncLogs={syncAuditLogs}
            currentRates={rates}
            expenseConcepts={expenseConcepts}
            expenseCategories={expenseCategories}
            vehicleCategories={vehicleCategories}
            users={users}
            businessInfo={businessInfo}
            onSaveRates={handleSaveRates}
            onSaveBusinessInfo={handleSaveBusinessInfo}
            onPublishPackage={handlePublishCentralPackage}
            onOpenWorkModeConfig={() => handleSwitchView('work_mode', 'central')}
            onSaveNewBranch={handleSaveNewBranch}
            onSwitchBranch={(branchId: string) => setCurrentBranchId(branchId)}
            onForceSyncBranch={async (branchId: string) => {
              await saveGlobalConfigToServer();
              try {
                const refreshedPkgs = await fetchCentralPackages(currentBranchId);
                if (refreshedPkgs && refreshedPkgs.length > 0) {
                  setCentralPackages(refreshedPkgs);
                }
              } catch (e) {}
              const b = branches.find(item => item.id === branchId);
              if (b) {
                const auditRecord: BranchSyncAuditRecord = {
                  id: `log-${Date.now()}`,
                  branchId: b.id,
                  branchName: b.name,
                  syncType: 'telemetry_push',
                  summary: `Sincronización forzada desde el Servidor Central a ${b.name}`,
                  status: 'success',
                  timestamp: new Date().toISOString(),
                  itemsReceived: 0,
                  itemsSent: 1,
                  performedBy: currentUser.name
                };
                setSyncAuditLogs(prev => [auditRecord, ...prev]);
              }
            }}
            onForceSyncAllBranches={async () => {
              await saveGlobalConfigToServer();
              const auditRecord: BranchSyncAuditRecord = {
                id: `log-${Date.now()}`,
                branchId: 'all-branches',
                branchName: 'Todas las Sedes',
                syncType: 'telemetry_push',
                summary: `Barrido de sincronización masivo ejecutado para las ${branches.length} sedes`,
                status: 'success',
                timestamp: new Date().toISOString(),
                itemsReceived: 0,
                itemsSent: branches.length,
                performedBy: currentUser.name
              };
              setSyncAuditLogs(prev => [auditRecord, ...prev]);
            }}
          />
        )}

        {/* DASHBOARD DE TELEMETRÍA Y MAPA DE SEDES */}
        {activeView === 'central_dashboard' && (
          <div className="space-y-4">
            <CentralDashboard
              branches={branches}
              onSelectBranch={(branch) => {
                console.log('[CentralDashboard] Sucursal seleccionada:', branch.code, branch.name);
              }}
              onRefresh={async () => {
                const refreshed = await fetchBranchesTelemetry();
                if (refreshed && refreshed.length > 0) {
                  let deletedSet = new Set<string>();
                  try {
                    const savedDeleted = localStorage.getItem('pk_deleted_branch_ids');
                    if (savedDeleted) deletedSet = new Set(JSON.parse(savedDeleted));
                  } catch (e) {}
                  setBranches(prev => {
                    const prevIds = new Set(prev.map(p => p.id));
                    return refreshed.filter(r => prevIds.has(r.id) && !deletedSet.has(r.id));
                  });
                }
              }}
              isDarkMode={isDarkMode}
              embedded={true}
              onClose={() => setActiveView('branches')}
            />
          </div>
        )}

        {activeView === 'branch_sync' && (
          <BranchSyncModal
            embedded={true}
            isOpen={true}
            onClose={() => setActiveView('operations')}
            currentBranch={currentBranch}
            centralPackages={centralPackages}
            syncLogs={syncAuditLogs}
            currentUser={currentUser}
            currentShift={currentShift}
            onApplyPackage={handleApplyPackageToBranch}
            onPerformFullSync={handlePerformFullBranchSync}
            onPushBranchOperations={handlePushBranchOperations}
            onServerConfigSaved={(savedCfg) => {
              if (savedCfg.remoteDbHost) {
                const parts = savedCfg.remoteDbHost.split(':');
                const host = parts[0];
                const port = parts[1] ? Number(parts[1]) : 3000;
                setSystemNodeConfig(prev => ({
                  ...prev,
                  centralServerHost: host,
                  centralServerPort: port
                }));
              }
            }}
            onRefreshPackages={async () => {
              try {
                const centralData = await pullCentralData(currentBranch.id);
                if (centralData.packages && centralData.packages.length > 0) {
                  setCentralPackages(centralData.packages);
                  localStorage.setItem('pk_central_packages', JSON.stringify(centralData.packages));
                }
              } catch (e) {
                console.warn('[Sync] Error refrescando paquetes:', e);
              }
            }}
          />
        )}

        {activeView === 'vnc_remote' && (
          <RemoteControlWorkspace
            branches={branches}
            activeRemoteSession={activeRemoteSession}
            onConnectRemoteBranch={handleConnectRemoteBranch}
            onExitRemoteSession={handleExitRemoteSession}
            onExecuteRemoteOrder={handleExecuteRemoteOrder}
            remoteOrders={remoteOrders}
            currentUser={currentUser}
            onOpenDocsModal={() => setIsDocsModalOpen(true)}
          />
        )}

        {/* ACTUALIZACIONES & OTA */}
        {activeView === 'software_updater' && (
          <SoftwareUpdaterModal
            embedded={true}
            isOpen={true}
            onClose={() => setActiveView('operations')}
            currentUser={currentUser}
            builds={softwareBuilds}
            currentBranch={currentBranch}
            onInstallBuild={handleInstallSoftwareBuild}
          />
        )}

        <PrinterSettingsModal
          isOpen={isPrinterModalOpen || activeView === 'printer_config'}
          onClose={() => {
            setIsPrinterModalOpen(false);
            if (activeView === 'printer_config') {
              setActiveView('operations');
            }
          }}
          printers={printers}
          onSave={handleSavePrinter}
          onDelete={handleDeletePrinter}
          businessInfo={businessInfo}
          onUpdateBusinessInfo={handleSaveBusinessInfo}
        />

        {/* Modal de Gestión de Abonados y Mensualidades */}
        <SubscribersModal
          isOpen={isSubscribersModalOpen || activeView === 'subscribers'}
          onClose={() => {
            setIsSubscribersModalOpen(false);
            if (activeView === 'subscribers') {
              handleSwitchView('operations', 'operations');
            }
          }}
          businessInfo={effectiveBusinessInfo}
          spots={spots}
          vehicleCategories={vehicleCategories}
          rates={rates}
          paymentGatewayConfig={paymentGatewayConfig}
          currentUser={currentUser}
          onAddMovement={handleAddCashMovement}
        />

        {activeView === 'work_mode' && (
          <SystemWorkModeConfigModal
            embedded={true}
            isOpen={true}
            onClose={() => handleSwitchView('operations')}
            config={systemNodeConfig}
            branches={branches}
            warehouses={warehouses}
            onSaveConfig={handleSaveSystemNodeConfig}
            onAddNewBranch={handleAddNewBranchFromConfig}
            onSaveWarehouse={handleSaveWarehouse}
            onDeleteWarehouse={handleDeleteWarehouse}
            currentUser={currentUser}
          />
        )}

        {/* CONFIGURACIÓN & PARÁMETROS */}
        {(activeView === 'rates' || activeView === 'rates_ai') && (
          <RatesSettingsModal
            initialTab={activeView === 'rates_ai' ? 'ai_gemini' : 'rates'}
            rates={rates}
            businessInfo={businessInfo}
            onSaveRates={handleSaveRates}
            onSaveBusinessInfo={handleSaveBusinessInfo}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            paymentGatewayConfig={paymentGatewayConfig}
            onSavePaymentGatewayConfig={handleSavePaymentGatewayConfig}
            currentUser={currentUser || undefined}
            vehicleCategories={vehicleCategories}
            printers={printers}
            onSavePrinter={handleSavePrinter}
            onDeletePrinter={handleDeletePrinter}
            onOpenVehicleCategories={() => setActiveView('vehicle_categories')}
            onClose={() => setActiveView('operations')}
          />
        )}

        {activeView === 'vehicle_categories' && (
          <VehicleCategoriesModal
            embedded={true}
            isOpen={true}
            onClose={() => setActiveView('rates')}
            categories={vehicleCategories}
            onSaveCategory={handleSaveVehicleCategory}
            onDeleteCategory={handleDeleteVehicleCategory}
            currentUser={currentUser!}
          />
        )}

        {activeView === 'agreements' && (
          <CommercialAgreementsModal
            embedded={true}
            isOpen={true}
            onClose={() => setActiveView('operations')}
            agreements={commercialAgreements}
            onSaveAgreement={handleSaveCommercialAgreement}
            onDeleteAgreement={handleDeleteCommercialAgreement}
          />
        )}

        {activeView === 'users' && (
          <UsersManagementModal
            embedded={true}
            isOpen={true}
            onClose={() => {
              saveGlobalConfigToServer().catch(console.warn);
              setActiveView('operations');
            }}
            users={users}
            currentUser={currentUser!}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
          />
        )}

        {activeView === 'database' && (
          <div className="space-y-4">
            {/* Database & Protected Routes Sub-Tab Navigation Header */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setDatabaseSubTab('terminal_db')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    databaseSubTab === 'terminal_db'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Database className="w-4 h-4" />
                  <span>Base de Datos Local (Terminal POS)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDatabaseSubTab('audit_history')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    databaseSubTab === 'audit_history'
                      ? 'bg-cyan-500 text-slate-950 shadow-xs font-black'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Historial de Auditoría e Integridad</span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-slate-950/20 text-current">
                    Logs
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDatabaseSubTab('protected_routes')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    databaseSubTab === 'protected_routes'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Configuración de Rutas Protegidas ({protectedRoutes.length})</span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-slate-950/20 text-current">
                    Dinámico
                  </span>
                </button>
              </div>

              <span className="hidden md:inline text-[11px] font-mono text-slate-700 dark:text-slate-200 font-bold pr-2">
                Persistencia Dual PostgreSQL / IndexedDB
              </span>
            </div>

            {databaseSubTab === 'terminal_db' ? (
              <TerminalDatabaseModal
                embedded={true}
                isOpen={true}
                onClose={() => setActiveView('operations')}
                terminalConfig={terminalConfig}
                onTerminalConfigChange={setTerminalConfig}
                onDatabaseReloadRequired={reloadFromTerminalDb}
              />
            ) : databaseSubTab === 'audit_history' ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-xs">
                <AuditHistory
                  terminalId={terminalConfig.terminalId}
                  isDarkMode={isDarkMode}
                />
              </div>
            ) : (
              <ProtectedRoutesManager
                routes={protectedRoutes}
                onUpdateRoutes={handleUpdateProtectedRoutes}
                onNavigateToRoute={handleGrantAccess}
                isDarkMode={isDarkMode}
              />
            )}
          </div>
        )}



          </motion.div>
        </AnimatePresence>

        {/* Blocking Backup Screen Overlay */}
        {backupLockState?.isLocked && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md select-none">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-300">
              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute w-24 h-24 bg-indigo-500/10 rounded-full animate-ping" />
                <div className="relative bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 p-4 rounded-full border border-indigo-500/30">
                  <HardDrive className={`w-12 h-12 ${backupLockState.message.includes('éxito') ? '' : 'animate-pulse'}`} />
                </div>
              </div>

              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-3">
                {backupLockState.message.includes('éxito') ? 'Copia de Seguridad Exitosa' : 'Copia de Seguridad en Curso'}
              </h2>
              
              <p className="text-sm text-indigo-200 leading-relaxed font-bold mb-6 animate-pulse">
                {backupLockState.message}
              </p>

              <div className="flex flex-col gap-2.5">
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full bg-indigo-500 rounded-full transition-all duration-1000 ${backupLockState.message.includes('éxito') ? 'w-full animate-none' : 'w-3/4'}`} />
                </div>
                <span className="text-[11px] font-mono tracking-wider uppercase text-slate-400 font-bold">
                  {backupLockState.message.includes('éxito') ? 'Operación Segura' : 'Bloqueo del Sistema Activo'}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Printable Thermal Receipt Modal */}
      <TicketModal
        isOpen={ticketModalState.isOpen}
        ticket={ticketModalState.ticket}
        mode={ticketModalState.mode}
        businessInfo={businessInfo}
        rates={rates}
        vehicleCategories={vehicleCategories}
        onClose={() => setTicketModalState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Módulo de Escritorio Remoto VNC Interactivo */}
      {activeRemoteSession && activeRemoteSession.mode === 'desktop' && (
        <VncRemoteDesktop
          branchId={activeRemoteSession.branchId}
          branchName={activeRemoteSession.branchName}
          city={activeRemoteSession.city}
          ipAddress={activeRemoteSession.ipAddress}
          onClose={handleExitRemoteSession}
          branch={branches.find(b => b.id === activeRemoteSession.branchId) || currentBranch}
          activeTickets={effectiveActiveTickets}
          spots={effectiveSpots}
          rates={rates}
          vehicleCategories={vehicleCategories}
          businessInfo={effectiveBusinessInfo}
          currentUser={currentUser}
          paymentGatewayConfig={paymentGatewayConfig}
          onRegisterEntry={handleRegisterEntry}
          onRegisterExit={handleRegisterExit}
          onPrintTicket={handleOpenPrintModal}
        />
      )}


      {/* Modal de Escáner QR de Tickets por Cámara para Salida Rápida */}
      <TicketScannerModal
        isOpen={isTicketScannerModalOpen}
        onClose={() => setIsTicketScannerModalOpen(false)}
        activeTickets={effectiveActiveTickets}
        paidTickets={paidTickets}
        rates={rates}
        vehicleCategories={vehicleCategories}
        onSelectTicketForExit={(ticket) => {
          setSelectedPlateForExit(ticket.plate);
          setActiveCategory('operations');
          setActiveView('operations');
          setIsTicketScannerModalOpen(false);
        }}
        onFastExit={async (ticket) => {
          const exitFee = calculateParkingFee(
            ticket.entryTime,
            new Date().toISOString(),
            ticket.vehicleType,
            rates
          );
          const paidResult = await handleRegisterExit(ticket.id, {
            paymentMethod: 'cash',
            cashReceived: exitFee.totalAmount,
            changeGiven: 0
          });
        }}
        isDarkMode={isDarkMode}
      />

      {/* Modal de Documentación y Guía Interactiva FarmaDesk Pro */}
      {isDocsModalOpen && (
        <FarmaDeskDocsModal
          isOpen={true}
          onClose={() => setIsDocsModalOpen(false)}
          branchId={currentBranch.id}
          serverUrl={typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'http://localhost:3000'}
        />
      )}

      {/* Modal Independiente de Sincronización, Diagnóstico y Alertas Proactivas de Red */}
      {isBranchSyncModalOpen && (
        <BranchSyncModal
          embedded={false}
          isOpen={true}
          onClose={() => setIsBranchSyncModalOpen(false)}
          currentBranch={currentBranch}
          centralPackages={centralPackages}
          syncLogs={syncAuditLogs}
          currentUser={currentUser}
          currentShift={currentShift}
          onApplyPackage={handleApplyPackageToBranch}
          onPerformFullSync={handlePerformFullBranchSync}
          onPushBranchOperations={handlePushBranchOperations}
          onServerConfigSaved={(savedCfg) => {
            if (savedCfg.remoteDbHost) {
              const parts = savedCfg.remoteDbHost.split(':');
              const host = parts[0];
              const port = parts[1] ? Number(parts[1]) : 3000;
              setSystemNodeConfig(prev => ({
                ...prev,
                centralServerHost: host,
                centralServerPort: port
              }));
            }
          }}
          onRefreshPackages={async () => {
            try {
              const centralData = await pullCentralData(currentBranch.id);
              if (centralData.packages && centralData.packages.length > 0) {
                setCentralPackages(centralData.packages);
                localStorage.setItem('pk_central_packages', JSON.stringify(centralData.packages));
              }
            } catch (e) {
              console.warn('[Sync] Error refrescando paquetes:', e);
            }
          }}
        />
      )}

      {/* Indicador Flotante / HUD Toast para Lecturas de Códigos de Barras USB */}
      <BarcodeScanToast />

      {/* Notificación Flotante de Impresión Automática Instantánea */}
      {printToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-950 text-white dark:bg-white dark:text-slate-950 rounded-2xl shadow-2xl border border-amber-500/50 flex items-center gap-3 text-xs font-bold animate-in slide-in-from-bottom duration-200">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Printer className="w-4 h-4 animate-pulse" />
          </div>
          <span>{printToast.message}</span>
        </div>
      )}

      {/* Modal de Recuperación de Sistema y Restauración de Base de Datos */}
      <SystemRecoveryModal
        isOpen={isRecoveryModalOpen}
        integrityData={integrityCheckData}
        onClose={() => setIsRecoveryModalOpen(false)}
        onRestoreSuccess={handleRecoveryRestoreSuccess}
        onContinueOffline={handleContinueOffline}
      />
    </div>
  );
}

