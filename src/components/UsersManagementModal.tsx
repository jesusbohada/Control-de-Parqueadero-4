import React, { useState } from 'react';
import { 
  Users, 
  Crown, 
  ShieldCheck, 
  Briefcase, 
  UserCheck, 
  UserX, 
  Plus, 
  Edit, 
  Trash2, 
  Key, 
  Check, 
  X, 
  AlertTriangle,
  Sliders,
  Car,
  MapPin,
  DollarSign,
  BarChart3,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Copy,
  Bookmark,
  Sparkles,
  Save,
  Layers,
  ArrowRight,
  RotateCcw,
  Search,
  Server,
  Radio,
  FileText,
  Printer
} from 'lucide-react';
import { 
  SystemUser, 
  UserPermissions, 
  UserUIVisibility, 
  UserRole,
  UserPermissionTemplate 
} from '../types';
import { 
  DEFAULT_MASTER_PERMISSIONS, 
  DEFAULT_SUPERVISOR_PERMISSIONS, 
  DEFAULT_CASHIER_PERMISSIONS,
  DEFAULT_MASTER_UI_VISIBILITY,
  DEFAULT_SUPERVISOR_UI_VISIBILITY,
  DEFAULT_CASHIER_UI_VISIBILITY,
  normalizeUserPermissions,
  DEFAULT_USER_TEMPLATES
} from '../data/initialData';
import {
  dbGetUserTemplates,
  dbSaveUserTemplate,
  dbDeleteUserTemplate,
  dbSaveUserTemplates,
  dbGetRoleMatrix,
  dbSaveRoleMatrix,
  dbAddAuditLog
} from '../db/terminalDatabase';

interface UsersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: SystemUser[];
  currentUser: SystemUser;
  onSaveUser: (user: SystemUser) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  embedded?: boolean;
}

export const UsersManagementModal: React.FC<UsersManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onSaveUser,
  onDeleteUser,
  embedded = false
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'profiles' | 'permissions' | 'create_user' | 'edit_user'>('users');
  const [selectedProfileForMatrix, setSelectedProfileForMatrix] = useState<string>('supervisor');
  const [formSubTab, setFormSubTab] = useState<'actions' | 'visibility'>('actions');
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [clonedSourceUser, setClonedSourceUser] = useState<SystemUser | null>(null);

  // Role Matrix Management State
  const [selectedMatrixProfileId, setSelectedMatrixProfileId] = useState<string>('supervisor');
  const [roleMatrix, setRoleMatrix] = useState<Record<UserRole, { permissions: UserPermissions; uiVisibility: UserUIVisibility }>>(() => {
    const saved = dbGetRoleMatrix();
    if (saved) return saved;
    return {
      master: { permissions: { ...DEFAULT_MASTER_PERMISSIONS }, uiVisibility: { ...DEFAULT_MASTER_UI_VISIBILITY } },
      supervisor: { permissions: { ...DEFAULT_SUPERVISOR_PERMISSIONS }, uiVisibility: { ...DEFAULT_SUPERVISOR_UI_VISIBILITY } },
      cashier: { permissions: { ...DEFAULT_CASHIER_PERMISSIONS }, uiVisibility: { ...DEFAULT_CASHIER_UI_VISIBILITY } },
      custom: { permissions: { ...DEFAULT_CASHIER_PERMISSIONS }, uiVisibility: { ...DEFAULT_CASHIER_UI_VISIBILITY } },
    };
  });

  // Templates state
  const [templates, setTemplates] = useState<UserPermissionTemplate[]>(() => dbGetUserTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSavingTemplateModalOpen, setIsSavingTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');

  // Profile Management CRUD State (Crear, Editar, Eliminar y Restaurar)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<UserPermissionTemplate | null>(null);
  const [templateFormName, setTemplateFormName] = useState('');
  const [templateFormDesc, setTemplateFormDesc] = useState('');
  const [templateFormRole, setTemplateFormRole] = useState<UserRole>('cashier');
  const [templateFormBaseTemplateId, setTemplateFormBaseTemplateId] = useState<string>('');
  const [templateToDelete, setTemplateToDelete] = useState<UserPermissionTemplate | null>(null);
  const [isRestoreDefaultsModalOpen, setIsRestoreDefaultsModalOpen] = useState(false);
  
  // Form State
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('cashier');
  const [formIsActive, setFormIsActive] = useState(true);
  
  // Granular Actions State
  const [formPermissions, setFormPermissions] = useState<UserPermissions>(DEFAULT_CASHIER_PERMISSIONS);
  
  // Granular UI Visibility State
  const [formUiVisibility, setFormUiVisibility] = useState<UserUIVisibility>(DEFAULT_CASHIER_UI_VISIBILITY);
  
  // Advanced Individual Permission Overrides Toggle
  const [showAdvancedCustomization, setShowAdvancedCustomization] = useState(false);
  const [permissionSearchQuery, setPermissionSearchQuery] = useState('');
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  // Control de Seguridad: Solo usuarios con permiso canManageUsers o rol 'master' pueden acceder
  if (!currentUser?.permissions?.canManageUsers && currentUser?.role !== 'master') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 border border-rose-500/30 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Acceso Restringido</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tu usuario (<strong>{currentUser?.name || 'Operador'}</strong>) con rol <strong>{currentUser?.role || 'cajero'}</strong> no cuenta con permisos administrativos para gestionar usuarios o modificar matrices de seguridad.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs cursor-pointer transition-colors"
          >
            Regresar a Operaciones
          </button>
        </div>
      </div>
    );
  }

  React.useEffect(() => {
    console.log('🔍 [LOG DETALLADO - USERS MANAGEMENT MODAL] Componente activo:', {
      timestamp: new Date().toISOString(),
      activeTab,
      usersReceivedCount: users.length,
      usersList: users.map(u => ({ id: u.id, username: u.username, role: u.role, name: u.name, isActive: u.isActive })),
      templatesCount: templates.length,
      selectedMatrixProfileId
    });
  }, [users, activeTab, templates, selectedMatrixProfileId]);

  const refreshTemplates = () => {
    setTemplates(dbGetUserTemplates());
  };

  // Helper to get active profile configuration in Tab 3
  const getActiveProfileConfig = () => {
    if (selectedMatrixProfileId === 'master' || selectedMatrixProfileId === 'supervisor' || selectedMatrixProfileId === 'cashier') {
      const role = selectedMatrixProfileId as UserRole;
      return {
        id: role,
        name: role === 'master' ? 'Maestro / Admin' : role === 'supervisor' ? 'Supervisor' : 'Cajero Solo Caja',
        description: role === 'master' ? 'Control Total Ilimitado' : role === 'supervisor' ? 'Operaciones, Reportes & Arqueo' : 'Ingresos, Cobros & Arqueo Ciego',
        role,
        isSystem: true,
        permissions: roleMatrix[role].permissions,
        uiVisibility: roleMatrix[role].uiVisibility
      };
    }

    const tmpl = templates.find(t => t.id === selectedMatrixProfileId);
    if (tmpl) {
      return {
        id: tmpl.id,
        name: tmpl.name,
        description: tmpl.description,
        role: tmpl.role,
        isSystem: tmpl.isSystem || false,
        permissions: tmpl.permissions,
        uiVisibility: tmpl.uiVisibility || DEFAULT_CASHIER_UI_VISIBILITY
      };
    }

    return {
      id: 'supervisor',
      name: 'Supervisor',
      description: 'Operaciones, Reportes & Arqueo',
      role: 'supervisor' as UserRole,
      isSystem: true,
      permissions: roleMatrix.supervisor.permissions,
      uiVisibility: roleMatrix.supervisor.uiVisibility
    };
  };

  const updateActiveProfileConfig = (newPerms: UserPermissions, newVis: UserUIVisibility) => {
    if (selectedMatrixProfileId === 'master') return;

    if (selectedMatrixProfileId === 'supervisor' || selectedMatrixProfileId === 'cashier' || selectedMatrixProfileId === 'custom') {
      const role = selectedMatrixProfileId as UserRole;
      const updatedMatrix = {
        ...roleMatrix,
        [role]: { permissions: newPerms, uiVisibility: newVis }
      };
      setRoleMatrix(updatedMatrix);
      dbSaveRoleMatrix(updatedMatrix).catch(console.error);
    } else {
      const tmpl = templates.find(t => t.id === selectedMatrixProfileId);
      if (tmpl) {
        const updatedTmpl: UserPermissionTemplate = {
          ...tmpl,
          permissions: newPerms,
          uiVisibility: newVis
        };
        dbSaveUserTemplate(updatedTmpl).then(() => {
          setTemplates(dbGetUserTemplates());
        }).catch(console.error);
      }
    }
  };

  const handleMatrixPermissionToggle = (key: keyof Omit<UserPermissions, 'uiVisibility'>) => {
    const active = getActiveProfileConfig();
    if (active.role === 'master') return;
    const newPerms = {
      ...active.permissions,
      [key]: !active.permissions[key]
    };
    updateActiveProfileConfig(newPerms, active.uiVisibility);
  };

  const handleMatrixVisibilityToggle = (key: keyof UserUIVisibility) => {
    const active = getActiveProfileConfig();
    if (active.role === 'master') return;
    const newVis = {
      ...active.uiVisibility,
      [key]: !active.uiVisibility[key]
    };
    updateActiveProfileConfig(active.permissions, newVis);
  };

  const handleSetModulePermissionsForRole = (
    moduleKey: 'caja' | 'mapa' | 'subscribers' | 'turnos' | 'reportes' | 'config' | 'central',
    enable: boolean
  ) => {
    const active = getActiveProfileConfig();
    if (active.role === 'master') return;

    let perms = { ...active.permissions };
    let vis = { ...active.uiVisibility };

    if (moduleKey === 'caja') {
      vis.showTabOperations = enable;
      vis.showDailySummaryCards = enable;
      vis.showPaidTicketsHistory = enable;
      vis.showVehiclesInYardMetric = enable;
      vis.showTurnRevenueMetric = enable;
      vis.showAnprCameraWidget = enable;
      vis.showOpenCashDrawerButton = enable;
      perms.canRegisterEntry = enable;
      perms.canRegisterExit = enable;
      perms.canCancelTicket = enable;
      perms.canApplyDiscounts = enable;
      perms.canWaiveFee = enable;
      perms.canReprintTickets = enable;
      perms.canManualSpotSelect = enable;
      perms.canChangePaymentMethod = enable;
      perms.canProcessLostTicket = enable;
      perms.canApplyLostTicketFee = enable;
      perms.canIssueElectronicInvoice = enable;
      perms.canOpenCashDrawerWithoutSale = enable;
      perms.canEditActiveTicketPlate = enable;
      perms.canApplyManualRateOverride = enable;
      perms.canForceRegisterExit = enable;
      perms.canViewANPRCameraModule = enable;
    } else if (moduleKey === 'mapa') {
      vis.showTabMap = enable;
      vis.showOccupancyWidget = enable;
      vis.showSpotsManagementButton = enable;
      perms.canViewMap = enable;
      perms.canChangeSpotStatus = enable;
      perms.canForceReleaseSpot = enable;
      perms.canManageSpots = enable;
      perms.canReserveSpots = enable;
    } else if (moduleKey === 'subscribers') {
      vis.showSubscribersModule = enable;
      vis.showSubscribersTopButton = enable;
      perms.canViewSubscribers = enable;
      perms.canCreateSubscribers = enable;
      perms.canRenewSubscribers = enable;
      perms.canCancelSubscribers = enable;
    } else if (moduleKey === 'turnos') {
      vis.showTabCash = enable;
      vis.showCashDrawerBalance = enable;
      vis.showLivePaymentBreakdown = enable;
      vis.showCashPickupOption = enable;
      vis.showCashShiftsHistory = enable;
      vis.showWarehousesGrid = enable;
      vis.showOperationalDayBadge = enable;
      perms.canManageCashShift = enable;
      perms.canWithdrawCash = enable;
      perms.canDepositCash = enable;
      perms.canPickupCash = enable;
      perms.canViewLiveFinancialBreakdown = enable;
      perms.canCloseOperationalDay = enable;
      perms.canAuditCashShifts = enable;
      perms.canManageExpenseConcepts = enable;
      perms.canConfigureExpenseCategories = enable;
      perms.canManageWarehouses = enable;
      perms.canManagePosPoints = enable;
      perms.canViewShiftClosingDiscrepancies = enable;
      perms.canViewOperationalDayInHistory = enable;
      perms.canViewConsecutiveInHistory = enable;
      perms.canEditClosedShifts = enable;
    } else if (moduleKey === 'reportes') {
      vis.showTabReports = enable;
      vis.showFinancialKpisInReports = enable;
      vis.showTrafficChartsInReports = enable;
      vis.showAuditLogsPanel = enable;
      vis.showEmployeeKpiWidget = enable;
      perms.canViewReports = enable;
      perms.canExportReports = enable;
      perms.canViewAuditLogs = enable;
      perms.canFilterReportDates = enable;
      perms.canDeleteAuditLogs = enable;
      perms.canViewEmployeePerformanceKpi = enable;
      perms.canViewGeneralProfitMargin = enable;
    } else if (moduleKey === 'config') {
      vis.showTabSettings = enable;
      vis.showDatabaseButton = enable;
      vis.showPrinterConfigModule = enable;
      vis.showInvoiceDianParams = enable;
      vis.showUsersManagementButton = enable;
      perms.canEditRates = enable;
      perms.canManageVehicleCategories = enable;
      perms.canManageAgreements = enable;
      perms.canEditBusinessInfo = enable;
      perms.canConfigurePrinters = enable;
      perms.canConfigureDianInvoicing = enable;
      perms.canConfigurePaymentMethods = enable;
      perms.canManageDatabase = enable;
      perms.canManageUsers = enable;
      perms.canConfigureSystemTheme = enable;
    } else if (moduleKey === 'central') {
      vis.showCentralHubButton = enable;
      vis.showBranchSyncButton = enable;
      vis.showAppUpdaterButton = enable;
      vis.showWorkModeBadge = enable;
      vis.showBranchesGrid = enable;
      vis.showVncRemoteDesktopButton = enable;
      vis.showTechnicalNetworkParams = enable;
      vis.showBranchIdentifierBadge = enable;
      perms.canAccessCentralHub = enable;
      perms.canPublishCentralUpdates = enable;
      perms.canSyncWithCentralServer = enable;
      perms.canPerformAppUpdates = enable;
      perms.canManageBranchLocations = enable;
      perms.canViewVncRemoteDesktop = enable;
      perms.canExecuteRemoteOrders = enable;
      perms.canConfigureTechnicalTerminalProps = enable;
      perms.canSwitchBranchSimulation = enable;
    }

    updateActiveProfileConfig(perms, vis);
  };

  const handleResetRoleDefaults = () => {
    const active = getActiveProfileConfig();
    let defaultPerms: UserPermissions = DEFAULT_CASHIER_PERMISSIONS;
    let defaultVis: UserUIVisibility = DEFAULT_CASHIER_UI_VISIBILITY;

    if (active.role === 'master') {
      defaultPerms = DEFAULT_MASTER_PERMISSIONS;
      defaultVis = DEFAULT_MASTER_UI_VISIBILITY;
    } else if (active.role === 'supervisor') {
      defaultPerms = DEFAULT_SUPERVISOR_PERMISSIONS;
      defaultVis = DEFAULT_SUPERVISOR_UI_VISIBILITY;
    }

    updateActiveProfileConfig(defaultPerms, defaultVis);
    setSuccessMessage(`Perfil "${active.name}" restablecido a valores sugeridos por defecto.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSyncRoleToActiveUsers = async () => {
    const active = getActiveProfileConfig();
    const roleUsers = users.filter(u => u.role === active.role);
    if (roleUsers.length === 0) {
      setErrorMessage(`No existen usuarios asignados al rol o perfil "${active.name}".`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setIsSubmitting(true);
    try {
      for (const u of roleUsers) {
        await onSaveUser({
          ...u,
          permissions: {
            ...active.permissions,
            uiVisibility: { ...active.uiVisibility }
          }
        });
      }
      setSuccessMessage(`¡Permisos del perfil "${active.name}" aplicados a ${roleUsers.length} usuario(s)!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(`Error al sincronizar usuarios: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRoleMatrixToStorage = async () => {
    setIsSubmitting(true);
    try {
      await dbSaveRoleMatrix(roleMatrix);
      await dbSaveUserTemplates(templates);
      dbAddAuditLog('USER_UPDATE', 'Matriz de roles y políticas de seguridad guardada en PostgreSQL', currentUser?.name || 'Maestro').catch(console.error);
      setSuccessMessage('¡Matriz de Roles y Permisos guardada exitosamente en PostgreSQL!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(`Error guardando matriz de roles: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateForm = () => {
    setSelectedUser(null);
    setClonedSourceUser(null);
    setFormName('');
    setFormUsername('');
    setFormPassword('');
    setFormRole('cashier');
    setFormIsActive(true);
    setFormPermissions({ ...DEFAULT_CASHIER_PERMISSIONS });
    setFormUiVisibility({ ...DEFAULT_CASHIER_UI_VISIBILITY });
    setSelectedTemplateId('');
    setFormSubTab('actions');
    setShowAdvancedCustomization(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setActiveTab('create_user');
  };

  const handleCloneUser = (sourceUser: SystemUser) => {
    setSelectedUser(null); // It is a new user
    setClonedSourceUser(sourceUser);
    setFormName(`${sourceUser.name} (Copia)`);
    setFormUsername(`${sourceUser.username}_copia`);
    setFormPassword('1234'); // Default initial password for clone
    setFormRole(sourceUser.role);
    setFormIsActive(true);

    const normalized = normalizeUserPermissions(sourceUser.permissions, sourceUser.role);
    setFormPermissions({ ...normalized });
    setFormUiVisibility({ ...(normalized.uiVisibility || DEFAULT_CASHIER_UI_VISIBILITY) });
    setSelectedTemplateId('');
    setFormSubTab('actions');
    setShowAdvancedCustomization(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setActiveTab('create_user');
  };

  const handleApplyTemplate = (template: UserPermissionTemplate) => {
    setFormRole(template.role);
    const normalized = normalizeUserPermissions(template.permissions, template.role);
    setFormPermissions({ ...normalized });
    setFormUiVisibility({ ...(template.uiVisibility || normalized.uiVisibility || DEFAULT_CASHIER_UI_VISIBILITY) });
    setSelectedTemplateId(template.id);
    setSuccessMessage(`Plantilla "${template.name}" aplicada correctamente.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCreateFromTemplateTab = (template: UserPermissionTemplate) => {
    openCreateForm();
    handleApplyTemplate(template);
    setFormName(`Usuario (${template.name})`);
    setFormUsername(`operador_${Date.now().toString().slice(-4)}`);
    setFormPassword('1234');
  };

  const openEditForm = (user: SystemUser) => {
    setSelectedUser(user);
    setClonedSourceUser(null);
    setFormName(user.name);
    setFormUsername(user.username);
    setFormPassword(user.password);
    setFormRole(user.role);
    setFormIsActive(user.isActive);
    
    // Normalize existing permissions
    const normalized = normalizeUserPermissions(user.permissions, user.role);
    setFormPermissions({ ...normalized });
    setFormUiVisibility({ ...(normalized.uiVisibility || DEFAULT_CASHIER_UI_VISIBILITY) });
    setSelectedTemplateId('');
    setFormSubTab('actions');
    setShowAdvancedCustomization(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setActiveTab('edit_user');
  };

  const handleRolePresetChange = (role: UserRole) => {
    setFormRole(role);
    if (role === 'master') {
      setFormPermissions({ ...DEFAULT_MASTER_PERMISSIONS });
      setFormUiVisibility({ ...DEFAULT_MASTER_UI_VISIBILITY });
    } else if (role === 'supervisor') {
      setFormPermissions({ ...DEFAULT_SUPERVISOR_PERMISSIONS });
      setFormUiVisibility({ ...DEFAULT_SUPERVISOR_UI_VISIBILITY });
    } else if (role === 'cashier') {
      setFormPermissions({ ...DEFAULT_CASHIER_PERMISSIONS });
      setFormUiVisibility({ ...DEFAULT_CASHIER_UI_VISIBILITY });
    }
  };

  // Toggle specific action permission
  const handlePermissionToggle = (key: keyof Omit<UserPermissions, 'uiVisibility'>) => {
    if (formRole === 'master') return;
    setFormPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Toggle specific UI visibility flag
  const handleUiVisibilityToggle = (key: keyof UserUIVisibility) => {
    if (formRole === 'master') return;
    setFormUiVisibility(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Batch actions for permissions
  const handleSetAllPermissions = (value: boolean) => {
    if (formRole === 'master') return;
    setFormPermissions(prev => ({
      ...prev,
      canRegisterEntry: value,
      canRegisterExit: value,
      canCancelTicket: value,
      canApplyDiscounts: value,
      canWaiveFee: value,
      canReprintTickets: value,
      canManualSpotSelect: value,
      canProcessLostTicket: value,
      canApplyLostTicketFee: value,
      canChangePaymentMethod: value,
      canConfigurePaymentMethods: value,
      canIssueElectronicInvoice: value,
      canOpenCashDrawerWithoutSale: value,
      canEditActiveTicketPlate: value,
      canApplyManualRateOverride: value,
      canForceRegisterExit: value,
      canViewANPRCameraModule: value,
      canViewMap: value,
      canChangeSpotStatus: value,
      canForceReleaseSpot: value,
      canManageSpots: value,
      canReserveSpots: value,
      canViewVncRemoteDesktop: value,
      canExecuteRemoteOrders: value,
      canManageCashShift: value,
      canWithdrawCash: value,
      canDepositCash: value,
      canPickupCash: value,
      canManageExpenseConcepts: value,
      canCloseOperationalDay: value,
      canAuditCashShifts: value,
      blindCashCount: !value,
      canViewLiveFinancialBreakdown: value,
      canViewOperationalDayInHistory: value,
      canViewConsecutiveInHistory: value,
      canViewCashShiftsHistory: value,
      canEditClosedShifts: value,
      canConfigureExpenseCategories: value,
      canManageWarehouses: value,
      canManagePosPoints: value,
      canViewShiftClosingDiscrepancies: value,
      canViewReports: value,
      canExportReports: value,
      canViewAuditLogs: value,
      canFilterReportDates: value,
      canDeleteAuditLogs: value,
      canViewEmployeePerformanceKpi: value,
      canViewGeneralProfitMargin: value,
      canEditRates: value,
      canManageVehicleCategories: value,
      canEditBusinessInfo: value,
      canConfigureDianInvoicing: value,
      canManageDatabase: value,
      canManageUsers: value,
      canViewSubscribers: value,
      canCreateSubscribers: value,
      canRenewSubscribers: value,
      canCancelSubscribers: value,
      canConfigurePrinters: value,
      canAccessCentralHub: value,
      canPublishCentralUpdates: value,
      canSyncWithCentralServer: value,
      canPerformAppUpdates: value,
      canSwitchBranchSimulation: value,
      canManageBranchLocations: value,
      canConfigureSystemTheme: value,
      canConfigureTechnicalTerminalProps: value,
    }));
  };

  // Batch actions for visibility
  const handleSetAllVisibility = (value: boolean) => {
    if (formRole === 'master') return;
    setFormUiVisibility({
      showTopRevenueMetrics: value,
      showOccupancyWidget: value,
      showDatabaseButton: value,
      showUsersManagementButton: value,
      showOperationalDayBadge: value,
      showLiveClockWidget: value,
      showCentralHubButton: value,
      showBranchSyncButton: value,
      showAppUpdaterButton: value,
      showBranchIdentifierBadge: value,
      showWorkModeBadge: value,
      showSubscribersTopButton: value,
      showTabOperations: true,
      showTabMap: value,
      showTabReports: value,
      showTabCash: value,
      showTabSettings: value,
      showSubscribersModule: value,
      showPrinterConfigModule: value,
      showDailySummaryCards: value,
      showVehiclesInYardMetric: value,
      showTurnRevenueMetric: value,
      showPaidTicketsHistory: value,
      showConfigurePaymentMethodsButton: value,
      showOpenCashDrawerButton: value,
      showAnprCameraWidget: value,
      showSpotsManagementButton: value,
      showVncRemoteDesktopButton: value,
      showCashDrawerBalance: value,
      showLivePaymentBreakdown: value,
      showCashPickupOption: value,
      showCashShiftsHistory: value,
      showWarehousesGrid: value,
      showFinancialKpisInReports: value,
      showTrafficChartsInReports: value,
      showAuditLogsPanel: value,
      showEmployeeKpiWidget: value,
      showInvoiceDianParams: value,
      showTechnicalNetworkParams: value,
      showBranchesGrid: value,
      showPosPointsGrid: value,
    });
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = formName.trim();
    const cleanUsername = formUsername.trim().toLowerCase();
    const cleanPassword = formPassword.trim();

    if (!cleanName || !cleanUsername || !cleanPassword) {
      setErrorMessage('Todos los campos son obligatorios.');
      return;
    }

    // Check duplicate username
    const existing = users.find(
      u => u.username.toLowerCase() === cleanUsername && (!selectedUser || u.id !== selectedUser.id)
    );
    if (existing) {
      setErrorMessage(`El nombre de usuario "${cleanUsername}" ya está registrado.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const mergedPermissions: UserPermissions = formRole === 'master'
        ? { ...DEFAULT_MASTER_PERMISSIONS, uiVisibility: { ...DEFAULT_MASTER_UI_VISIBILITY } }
        : {
            ...formPermissions,
            uiVisibility: { ...formUiVisibility }
          };

      const userToSave: SystemUser = {
        id: selectedUser ? selectedUser.id : `usr-${Date.now()}`,
        name: cleanName,
        username: cleanUsername,
        password: cleanPassword,
        role: formRole,
        isActive: formRole === 'master' ? true : formIsActive,
        permissions: mergedPermissions,
        createdAt: selectedUser ? selectedUser.createdAt : new Date().toISOString(),
        lastLogin: selectedUser?.lastLogin
      };

      await onSaveUser(userToSave);
      setSuccessMessage(
        selectedUser 
          ? 'Usuario y permisos actualizados exitosamente' 
          : clonedSourceUser
          ? `Usuario clonado exitosamente desde "${clonedSourceUser.name}"`
          : 'Nuevo usuario creado exitosamente'
      );
      setTimeout(() => {
        setActiveTab('users');
        setSuccessMessage(null);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(`Error al guardar: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newTemplateName.trim();
    if (!cleanName) return;

    const newTmpl: UserPermissionTemplate = {
      id: `tmpl-custom-${Date.now()}`,
      name: cleanName,
      description: newTemplateDesc.trim() || 'Plantilla personalizada guardada por Administrador',
      role: formRole,
      permissions: { ...formPermissions },
      uiVisibility: { ...formUiVisibility },
      isSystem: false,
      createdAt: new Date().toISOString(),
    };

    console.log('🆕 [LOG DETALLADO - PERFIL CREADO] Guardando nuevo perfil:', {
      id: newTmpl.id,
      name: newTmpl.name,
      role: newTmpl.role,
      permissionsCount: Object.keys(newTmpl.permissions).length
    });

    dbSaveUserTemplate(newTmpl).catch(console.error);
    dbAddAuditLog('USER_UPDATE', `Perfil de permisos creado: ${newTmpl.name}`, currentUser?.name || 'Maestro').catch(console.error);
    refreshTemplates();
    setSelectedTemplateId(newTmpl.id);
    setSelectedMatrixProfileId(newTmpl.id);
    setIsSavingTemplateModalOpen(false);
    setNewTemplateName('');
    setNewTemplateDesc('');
    setSuccessMessage(`¡Perfil "${newTmpl.name}" creado exitosamente! Se ha seleccionado automáticamente en la pestaña "3. Permisos por Perfil".`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateFormName('');
    setTemplateFormDesc('');
    setTemplateFormRole('cashier');
    setTemplateFormBaseTemplateId(templates.length > 0 ? templates[0].id : '');
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tmpl: UserPermissionTemplate) => {
    setEditingTemplate(tmpl);
    setTemplateFormName(tmpl.name);
    setTemplateFormDesc(tmpl.description || '');
    setTemplateFormRole(tmpl.role || 'cashier');
    setTemplateFormBaseTemplateId(tmpl.id);
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = templateFormName.trim();
    if (!cleanName) return;

    try {
      if (editingTemplate) {
        // Modo Edición: Actualizar nombre, descripción y rol
        const updated: UserPermissionTemplate = {
          ...editingTemplate,
          name: cleanName,
          description: templateFormDesc.trim() || 'Perfil de usuario del sistema',
          role: templateFormRole,
        };
        await dbSaveUserTemplate(updated);
        setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
        await dbAddAuditLog('USER_UPDATE', `Perfil de usuario editado: ${updated.name}`, currentUser?.name || 'Maestro');
        setSuccessMessage(`¡Perfil "${updated.name}" actualizado exitosamente!`);
      } else {
        // Modo Creación: Crear perfil a partir de plantilla base seleccionada
        let basePerms = { ...DEFAULT_CASHIER_PERMISSIONS };
        let baseVis = { ...DEFAULT_CASHIER_UI_VISIBILITY };
        if (templateFormBaseTemplateId) {
          const base = templates.find(t => t.id === templateFormBaseTemplateId);
          if (base) {
            basePerms = { ...base.permissions };
            baseVis = { ...base.uiVisibility };
          }
        } else if (templateFormRole === 'supervisor') {
          basePerms = { ...DEFAULT_SUPERVISOR_PERMISSIONS };
          baseVis = { ...DEFAULT_SUPERVISOR_UI_VISIBILITY };
        } else if (templateFormRole === 'master') {
          basePerms = { ...DEFAULT_MASTER_PERMISSIONS };
          baseVis = { ...DEFAULT_MASTER_UI_VISIBILITY };
        }

        const newTmpl: UserPermissionTemplate = {
          id: `tmpl-custom-${Date.now()}`,
          name: cleanName,
          description: templateFormDesc.trim() || 'Plantilla personalizada creada por Administrador',
          role: templateFormRole,
          permissions: basePerms,
          uiVisibility: baseVis,
          isSystem: false,
          createdAt: new Date().toISOString(),
        };
        await dbSaveUserTemplate(newTmpl);
        setTemplates(prev => [...prev, newTmpl]);
        setSelectedMatrixProfileId(newTmpl.id);
        setSelectedTemplateId(newTmpl.id);
        await dbAddAuditLog('USER_UPDATE', `Nuevo perfil de usuario creado: ${newTmpl.name}`, currentUser?.name || 'Maestro');
        setSuccessMessage(`¡Perfil "${newTmpl.name}" creado con éxito! Puedes configurar sus permisos en la pestaña "3. Permisos por Perfil".`);
      }
      setIsTemplateModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(`Error guardando perfil: ${err.message || 'Error desconocido'}`);
    }
  };

  const handleConfirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    const deletedId = templateToDelete.id;
    const deletedName = templateToDelete.name;
    try {
      await dbDeleteUserTemplate(deletedId);
      setTemplates(prev => prev.filter(t => t.id !== deletedId));
      if (selectedMatrixProfileId === deletedId) {
        setSelectedMatrixProfileId('supervisor');
      }
      if (selectedTemplateId === deletedId) {
        setSelectedTemplateId('');
      }
      await dbAddAuditLog('USER_UPDATE', `Perfil de usuario eliminado: ${deletedName}`, currentUser?.name || 'Maestro');
      setSuccessMessage(`¡Perfil "${deletedName}" eliminado correctamente del catálogo!`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(`Error al eliminar el perfil: ${err.message || 'Error desconocido'}`);
    } finally {
      setTemplateToDelete(null);
    }
  };

  const handleConfirmRestoreDefaults = async () => {
    try {
      const customTemplates = templates.filter(t => !DEFAULT_USER_TEMPLATES.some(d => d.id === t.id));
      const restored = [...DEFAULT_USER_TEMPLATES, ...customTemplates];
      await dbSaveUserTemplates(restored);
      setTemplates(restored);
      await dbAddAuditLog('USER_UPDATE', 'Perfiles oficiales de fábrica restaurados', currentUser?.name || 'Maestro');
      setSuccessMessage('¡Perfiles oficiales de fábrica restaurados con éxito!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(`Error restaurando perfiles: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsRestoreDefaultsModalOpen(false);
    }
  };

  const handleDeleteCustomTemplate = (templateId: string) => {
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl) setTemplateToDelete(tmpl);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    if (userToDelete.role === 'master' && users.filter(u => u.role === 'master').length <= 1) {
      setErrorMessage('No puedes eliminar al único Usuario Maestro del sistema.');
      setUserToDelete(null);
      return;
    }
    try {
      await onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    } catch (err: any) {
      setErrorMessage(`Error al eliminar: ${err.message}`);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'master':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30">
            <Crown className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            Maestro (Total)
          </span>
        );
      case 'supervisor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            Supervisor
          </span>
        );
      case 'cashier':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
            <Briefcase className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            Solo Caja
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/30">
            <Sliders className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
            Personalizado
          </span>
        );
    }
  };

  const countActiveActions = (perms: UserPermissions) => {
    const keys: (keyof Omit<UserPermissions, 'uiVisibility'>)[] = [
      'canRegisterEntry', 'canRegisterExit', 'canCancelTicket', 'canApplyDiscounts',
      'canWaiveFee', 'canReprintTickets', 'canManualSpotSelect', 'canProcessLostTicket',
      'canApplyLostTicketFee', 'canChangePaymentMethod', 'canConfigurePaymentMethods',
      'canIssueElectronicInvoice', 'canOpenCashDrawerWithoutSale', 'canEditActiveTicketPlate',
      'canApplyManualRateOverride', 'canForceRegisterExit', 'canViewANPRCameraModule',
      'canViewMap', 'canChangeSpotStatus', 'canForceReleaseSpot', 'canManageSpots',
      'canReserveSpots', 'canViewVncRemoteDesktop', 'canExecuteRemoteOrders',
      'canManageCashShift', 'canWithdrawCash', 'canDepositCash', 'canPickupCash',
      'canManageExpenseConcepts', 'canCloseOperationalDay', 'canAuditCashShifts',
      'blindCashCount', 'canViewLiveFinancialBreakdown', 'canViewOperationalDayInHistory',
      'canViewConsecutiveInHistory', 'canViewCashShiftsHistory', 'canEditClosedShifts',
      'canConfigureExpenseCategories', 'canManageWarehouses', 'canManagePosPoints',
      'canViewShiftClosingDiscrepancies', 'canViewReports', 'canExportReports',
      'canViewAuditLogs', 'canFilterReportDates', 'canDeleteAuditLogs',
      'canViewEmployeePerformanceKpi', 'canViewGeneralProfitMargin', 'canEditRates',
      'canManageVehicleCategories', 'canEditBusinessInfo', 'canConfigureDianInvoicing',
      'canManageDatabase', 'canManageUsers', 'canAccessCentralHub',
      'canPublishCentralUpdates', 'canSyncWithCentralServer', 'canPerformAppUpdates',
      'canSwitchBranchSimulation', 'canManageBranchLocations', 'canConfigureSystemTheme',
      'canConfigureTechnicalTerminalProps'
    ];
    return keys.filter(k => perms[k]).length;
  };

  const countVisibleUI = (vis?: UserUIVisibility) => {
    if (!vis) return 0;
    return Object.values(vis).filter(Boolean).length;
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full animate-in fade-in duration-150" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"}>
      <div className={embedded ? "relative w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col" : "relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]"}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Gestión de Usuarios y Permisos
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40">
                  Panel Maestro
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Administración de cuentas, perfiles de cajero y permisos de acceso al sistema.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Top Tabs */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            {/* TAB 1: USUARIOS */}
            <button
              type="button"
              aria-selected={activeTab === 'users' || activeTab === 'create_user' || activeTab === 'edit_user'}
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'users' || activeTab === 'create_user' || activeTab === 'edit_user'
                  ? 'active-tab-indicator bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>1. Usuarios ({users.length})</span>
            </button>

            {/* TAB 2: PERFILES */}
            <button
              type="button"
              aria-selected={activeTab === 'profiles'}
              onClick={() => {
                refreshTemplates();
                setActiveTab('profiles');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'profiles'
                  ? 'active-tab-indicator bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>2. Perfiles de Usuario ({templates.length + 3})</span>
            </button>

            {/* TAB 3: PERMISOS POR PERFIL */}
            <button
              type="button"
              aria-selected={activeTab === 'permissions'}
              onClick={() => {
                refreshTemplates();
                setActiveTab('permissions');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'permissions'
                  ? 'active-tab-indicator bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>3. Permisos por Perfil ({templates.length + 3})</span>
            </button>

            {(activeTab === 'create_user' || activeTab === 'edit_user') && (
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 hidden sm:inline">
                / {activeTab === 'create_user' 
                    ? (clonedSourceUser ? `Clonar desde ${clonedSourceUser.name}` : 'Crear Nuevo Usuario') 
                    : `Configurar a ${selectedUser?.name}`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(activeTab === 'users' || activeTab === 'create_user' || activeTab === 'edit_user') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setClonedSourceUser(null);
                  setFormName('');
                  setFormUsername('');
                  setFormPassword('');
                  setFormRole('cashier');
                  setFormIsActive(true);
                  setFormPermissions({ ...DEFAULT_CASHIER_PERMISSIONS });
                  setFormUiVisibility({ ...DEFAULT_CASHIER_UI_VISIBILITY });
                  setActiveTab('create_user');
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Nuevo Usuario</span>
              </button>
            )}

            {activeTab === 'profiles' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRestoreDefaultsModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Restablecer perfiles originales de fábrica"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Restaurar Fábrica</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenCreateTemplate}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Nuevo Perfil</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-900/60">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: USERS LIST */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <strong className="text-amber-800 dark:text-amber-300 font-bold">Asignación Directa por Perfil:</strong> Al crear o editar un usuario, simplemente asígnale un <strong className="text-slate-900 dark:text-white font-bold">Perfil / Rol</strong> (ej. Cajero Solo Caja, Supervisor). El usuario heredará automáticamente todos los accesos a módulos configurados en la pestaña <strong className="text-amber-800 dark:text-amber-300 font-bold">3. Permisos por Perfil</strong>.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {users.length === 0 ? (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-3 border border-slate-200 dark:border-slate-700">
                      <Users className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No hay usuarios registrados</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mt-1">
                      Crea un nuevo usuario para otorgar acceso a la terminal POS o delegar tareas de supervisión y caja.
                    </p>
                  </div>
                ) : (
                  users.map((user) => {
                  const isSelf = user.id === currentUser.id;
                  const isMaster = user.role === 'master';
                  const activeActions = countActiveActions(user.permissions);
                  const visibleUI = countVisibleUI(user.permissions.uiVisibility);
                  const blindCount = user.permissions.blindCashCount;
                  const hideRev = user.permissions.uiVisibility?.showTopRevenueMetrics === false;

                  return (
                    <div
                      key={user.id}
                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between transition-all shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                              isMaster 
                                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30' 
                                : user.role === 'supervisor'
                                ? 'bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-500/30'
                                : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</h3>
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                                    Tú
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                Usuario: <strong className="text-slate-800 dark:text-slate-200">{user.username}</strong>
                              </div>
                            </div>
                          </div>

                          <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                            user.isActive 
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80' 
                              : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/80'
                          }`}>
                            {user.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                            {user.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>

                        {/* Granular Badges & Summary */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div>{getRoleBadge(user.role)}</div>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                                🛠️ {isMaster ? 'Todas' : `${activeActions}/62`} Acciones
                              </span>
                              <span className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                                👁️ {isMaster ? 'Todo' : `${visibleUI}/37`} Visibles
                              </span>
                            </div>
                          </div>

                          {/* Security flags highlights */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {blindCount && (
                              <span className="text-[10px] font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                                🔒 Arqueo Ciego Activo
                              </span>
                            )}
                            {hideRev && (
                              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
                                🚫 Recaudo Oculto
                              </span>
                            )}
                            {user.permissions.canWaiveFee && (
                              <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded">
                                🎟️ Exonerar Cortesía
                              </span>
                            )}
                            {user.permissions.canWithdrawCash && (
                              <span className="text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 px-2 py-0.5 rounded">
                                💸 Retiros Caja
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          <span>Clave:</span>
                          <strong className="text-slate-800 dark:text-slate-200 font-mono font-medium">
                            {revealedPasswords[user.id] ? user.password : '••••••••'}
                          </strong>
                          {currentUser.role === 'master' && (
                            <button
                              type="button"
                              onClick={() => setRevealedPasswords(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer rounded"
                              title={revealedPasswords[user.id] ? "Ocultar clave" : "Mostrar clave"}
                              aria-label={revealedPasswords[user.id] ? "Ocultar clave" : "Mostrar clave"}
                            >
                              {revealedPasswords[user.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* CLONE USER BUTTON */}
                          <button
                            type="button"
                            onClick={() => handleCloneUser(user)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                            title="Clonar usuario con el mismo perfil"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Clonar
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              openEditForm(user);
                              setActiveTab('edit_user');
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                            Editar
                          </button>

                          {!isMaster && (
                            <button
                              type="button"
                              onClick={() => setUserToDelete(user)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              </div>
            </div>
          )}

          {/* TAB 2: PROFILES / TEMPLATES MANAGEMENT */}
          {activeTab === 'profiles' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    Catálogo de Perfiles de Usuario del Sistema
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Un Perfil agrupa las reglas de acceso a los módulos. Crea o edita perfiles y luego asígnalos directamente a los empleados.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsRestoreDefaultsModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    title="Restablecer perfiles predeterminados de fábrica"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Restaurar Fábrica</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCreateTemplate}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Nuevo Perfil</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((tmpl) => {
                  const actionsCount = countActiveActions(tmpl.permissions);
                  const visCount = countVisibleUI(tmpl.uiVisibility);
                  const usersCountWithRole = users.filter(u => u.role === tmpl.role).length;

                  return (
                    <div
                      key={tmpl.id}
                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between transition-all shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{tmpl.name}</h4>
                              {tmpl.isSystem ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                                  Sistema
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-medium">
                                  Personalizado
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                              {tmpl.description}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                            👤 {usersCountWithRole} usuarios
                          </span>
                        </div>

                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div>{getRoleBadge(tmpl.role)}</div>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                                🛠️ {actionsCount}/62 Acciones
                              </span>
                              <span className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                                👁️ {visCount}/37 Visibles
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {tmpl.permissions.blindCashCount && (
                              <span className="text-[10px] font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                                🔒 Arqueo Ciego
                              </span>
                            )}
                            {tmpl.uiVisibility.showTopRevenueMetrics === false && (
                              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
                                🚫 Recaudo Oculto
                              </span>
                            )}
                            {tmpl.permissions.canWaiveFee && (
                              <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded">
                                🎟️ Exonerar Cortesía
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditTemplate(tmpl)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Editar nombre, descripción y rol del perfil"
                          >
                            <Edit className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTemplateToDelete(tmpl)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Eliminar este perfil del catálogo"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span>Eliminar</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            refreshTemplates();
                            setSelectedMatrixProfileId(tmpl.id);
                            setActiveTab('permissions');
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-slate-950 border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Permisos y Módulos</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PERMISSIONS MATRIX BY PROFILE */}
          {activeTab === 'permissions' && (() => {
            const activeProfile = getActiveProfileConfig();
            const isMaster = activeProfile.role === 'master';
            const roleConfig = {
              permissions: activeProfile.permissions,
              uiVisibility: activeProfile.uiVisibility
            };

            // System base roles
            const systemProfiles = [
              {
                id: 'master',
                name: 'Maestro / Admin',
                desc: 'Control Total Ilimitado',
                icon: Crown,
                role: 'master' as UserRole,
                isSystem: true,
                badgeBg: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40'
              },
              {
                id: 'supervisor',
                name: 'Supervisor Base',
                desc: 'Operación, Reportes & Arqueo',
                icon: ShieldCheck,
                role: 'supervisor' as UserRole,
                isSystem: true,
                badgeBg: 'bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/40'
              },
              {
                id: 'cashier',
                name: 'Cajero Solo Caja Base',
                desc: 'Ingresos, Cobros & Arqueo Ciego',
                icon: Briefcase,
                role: 'cashier' as UserRole,
                isSystem: true,
                badgeBg: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
              }
            ];

            return (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Header Policy Banner */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Políticas de Seguridad RBAC & Matriz de Accesos por Perfil
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Control de Acceso
                        </span>
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                        Selecciona un perfil (oficial o personalizado) para ajustar qué módulos principales (Caja, Turnos, Mapa, Reportes y Configuración) puede acceder y qué acciones tiene permitidas.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSaveRoleMatrixToStorage}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-colors cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Guardar Matriz de Seguridad</span>
                    </button>
                  </div>
                </div>

                {/* Profile Selector Tabs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                      <Bookmark className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                      Selecciona el Perfil a Configurar:
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      Total: {systemProfiles.length + templates.length} perfiles disponibles
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {/* System Roles */}
                    {systemProfiles.map((roleItem) => {
                      const isSelected = selectedMatrixProfileId === roleItem.id;
                      const roleUsersCount = users.filter(u => u.role === roleItem.role).length;
                      const Icon = roleItem.icon;

                      return (
                        <button
                          key={roleItem.id}
                          type="button"
                          onClick={() => setSelectedMatrixProfileId(roleItem.id)}
                          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer shadow-xs ${
                            isSelected
                              ? 'bg-amber-500/10 dark:bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50'
                              : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white truncate">
                              <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`} />
                              <span className="truncate">{roleItem.name}</span>
                            </div>
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-bold shrink-0 ${roleItem.badgeBg}`}>
                              {roleUsersCount} u.
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {roleItem.desc}
                          </p>
                          <span className="mt-1 block text-[9px] font-mono text-amber-800 dark:text-amber-300 font-bold">
                            Oficial Sistema
                          </span>
                        </button>
                      );
                    })}

                    {/* Custom and Template Profiles */}
                    {templates.map((tmpl) => {
                      const isSelected = selectedMatrixProfileId === tmpl.id;
                      const tmplUsersCount = users.filter(u => u.role === tmpl.role).length;

                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => setSelectedMatrixProfileId(tmpl.id)}
                          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer shadow-xs ${
                            isSelected
                              ? 'bg-amber-500/10 dark:bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50'
                              : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white truncate">
                              <Bookmark className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-700 dark:text-amber-400' : 'text-purple-700 dark:text-purple-400'}`} />
                              <span className="truncate">{tmpl.name}</span>
                            </div>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border font-bold shrink-0 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60">
                              {tmplUsersCount} u.
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {tmpl.description || 'Perfil de usuario personalizado'}
                          </p>
                          <span className="mt-1 block text-[9px] font-mono text-purple-700 dark:text-purple-300 font-bold">
                            {tmpl.isSystem ? 'Plantilla Base' : 'Personalizado ✨'}
                          </span>
                        </button>
                      );
                    })}
                    {/* Button to add new profile directly from matrix */}
                    <button
                      type="button"
                      onClick={handleOpenCreateTemplate}
                      className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 bg-slate-50/50 dark:bg-slate-900/30 text-left transition-all flex flex-col items-center justify-center text-center cursor-pointer min-h-[85px] group"
                    >
                      <Plus className="w-5 h-5 text-slate-400 group-hover:text-amber-500 mb-1 transition-colors" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-amber-500 transition-colors">
                        + Crear Nuevo Perfil
                      </span>
                    </button>
                  </div>
                </div>

                {/* Role Actions Control Toolbar */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                      Perfil Activo: {activeProfile.name}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] hidden sm:inline">
                      Configurando accesos y visibilidad para este perfil
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {templates.some(t => t.id === selectedMatrixProfileId) && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const tmpl = templates.find(t => t.id === selectedMatrixProfileId);
                            if (tmpl) handleOpenEditTemplate(tmpl);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Editar nombre, descripción y rol base de este perfil"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                          <span>Editar Datos</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const tmpl = templates.find(t => t.id === selectedMatrixProfileId);
                            if (tmpl) setTemplateToDelete(tmpl);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Eliminar este perfil"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Eliminar Perfil</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={handleResetRoleDefaults}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Restablecer este perfil a valores por defecto"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                      <span>Valores de Fábrica</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSyncRoleToActiveUsers}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-slate-950 border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Aplicar estos permisos a los usuarios con este perfil"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Sincronizar a Usuarios</span>
                    </button>
                  </div>
                </div>

                {/* Search / Filter for Permissions & Options */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={permissionSearchQuery}
                    onChange={(e) => setPermissionSearchQuery(e.target.value)}
                    placeholder="Buscar permiso, opción, botón o módulo (ej: descuento, cajón, abonados, arqueo ciego, impresora, tarifas)..."
                    className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                  {permissionSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPermissionSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                      title="Limpiar búsqueda"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Modules Matrix Cards */}
                {(() => {
                  const query = permissionSearchQuery.trim().toLowerCase();
                  const matches = (label: string, desc?: string) => {
                    if (!query) return true;
                    return label.toLowerCase().includes(query) || (desc ? desc.toLowerCase().includes(query) : false);
                  };

                  return (
                    <div className="space-y-6">
                      {/* ======================================================= */}
                      {/* MODULE 1: PATIO POS & OPERACIONES VEHICULARES            */}
                      {/* ======================================================= */}
                      {(() => {
                        const moduleEnabled = roleConfig.uiVisibility.showTabOperations;
                        const visItems = [
                          { key: 'showTabOperations', label: 'Ver Pestaña Operaciones', desc: 'Acceso al menú principal de vehículos' },
                          { key: 'showDailySummaryCards', label: 'Ver Resumen de Ventas Diarias', desc: 'Tarjetas de consolidación de dinero en la vista' },
                          { key: 'showVehiclesInYardMetric', label: 'Ver Contador en Patio', desc: 'Indicador numérico de carros parqueados actualmente', defaultVal: true },
                          { key: 'showTurnRevenueMetric', label: 'Ver Métrica Recaudo Turno', desc: 'Contador de dinero recaudado en el turno actual', defaultVal: false },
                          { key: 'showPaidTicketsHistory', label: 'Ver Historial de Tickets Cobrados', desc: 'Cinta inferior con lista de salidas recientes' },
                          { key: 'showAnprCameraWidget', label: 'Ver Widget de Cámara ANPR', desc: 'Mostrar visor de reconocimiento de placas en vivo', defaultVal: false },
                          { key: 'showOpenCashDrawerButton', label: 'Ver Botón Abrir Cajón', desc: 'Mostrar botón directo para abrir cajón monedero', defaultVal: false }
                        ];
                        const permItems = [
                          { key: 'canRegisterEntry', label: 'Registrar Ingreso', desc: 'Generar nuevos tickets y tiques de entrada' },
                          { key: 'canRegisterExit', label: 'Registrar Salidas y Cobrar', desc: 'Liquidar tiempo de estadía y cobrar tarifas' },
                          { key: 'canCancelTicket', label: 'Anular Tickets Activos', desc: 'Cancelar vehículos en patio por error o salida inmediata' },
                          { key: 'canApplyDiscounts', label: 'Aplicar Descuentos Manuales', desc: 'Modificar el valor calculado con rebajas manuales' },
                          { key: 'canWaiveFee', label: 'Exonerar Cortesías ($0)', desc: 'Generar salidas libres de pago con justificación', defaultVal: false },
                          { key: 'canReprintTickets', label: 'Reimprimir Tiques y Recibos', desc: 'Duplicar tique de ingreso y recibos térmicos (F8)', defaultVal: true },
                          { key: 'canManualSpotSelect', label: 'Selección Manual de Plazas', desc: 'Elegir puesto manualmente al registrar ingreso', defaultVal: true },
                          { key: 'canProcessLostTicket', label: 'Salida Sin Tique (Extravío)', desc: 'Procesar egreso con Tarjeta de Propiedad', defaultVal: false },
                          { key: 'canApplyLostTicketFee', label: 'Aplicar Multa Tique Perdido', desc: 'Cobrar el recargo legal/establecido por pérdida', defaultVal: true },
                          { key: 'canChangePaymentMethod', label: 'Cambiar Método de Pago', desc: 'Permitir elegir tarjeta, QR, BreB, transfer o efectivo', defaultVal: true },
                          { key: 'canOpenCashDrawerWithoutSale', label: 'Abrir Cajón en Vacío', desc: 'Abrir el cajón monedero sin registrar una venta', defaultVal: false },
                          { key: 'canEditActiveTicketPlate', label: 'Editar Placa de Tique Activo', desc: 'Corregir errores de digitación de placa en patio', defaultVal: false },
                          { key: 'canApplyManualRateOverride', label: 'Modificación Manual de Tarifa', desc: 'Sobrescribir el valor calculado del sistema de forma libre', defaultVal: false },
                          { key: 'canForceRegisterExit', label: 'Salida Forzada (Fuga/Cortesía)', desc: 'Efectuar salida forzada sin registro de pago ni dinero', defaultVal: false },
                          { key: 'canViewANPRCameraModule', label: 'Interactuar con Lector ANPR', desc: 'Operar con el detector de placas de inteligencia artificial', defaultVal: false }
                        ];

                        const matchingVis = visItems.filter(i => matches(i.label, i.desc));
                        const matchingPerms = permItems.filter(i => matches(i.label, i.desc));
                        if (query && matchingVis.length === 0 && matchingPerms.length === 0 && !'patio pos operaciones vehículos'.includes(query)) return null;

                        return (
                          <div className={`p-5 rounded-2xl border transition-all ${
                            moduleEnabled ? 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xs' : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 opacity-80'
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold shrink-0">
                                  <Car className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Módulo 1: Patio POS & Operaciones Vehiculares (Ingreso / Salida / Cobros)
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                                      moduleEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                    }`}>
                                      {moduleEnabled ? 'MÓDULO AUTORIZADO' : 'ACCESO DENEGADO'}
                                    </span>
                                  </h4>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                    Permite operar la pantalla principal de vehículos, registrar tiques, aplicar cobros y emitir comprobantes.
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isMaster}
                                  onClick={() => handleSetModulePermissionsForRole('caja', !moduleEnabled)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                    moduleEnabled
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {moduleEnabled ? 'Desactivar Módulo' : 'Activar Módulo'}
                                </button>
                              </div>
                            </div>

                            {moduleEnabled && (
                              <div className="mt-4 space-y-5">
                                {matchingVis.length > 0 && (
                                  <div className="space-y-2">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                                      <Eye className="w-3.5 h-3.5" />
                                      👁️ Control de Vista de Interfaz (¿Qué ve el usuario?)
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {matchingVis.map(item => (
                                        <VisibilityCheckbox
                                          key={item.key}
                                          label={item.label}
                                          desc={item.desc}
                                          checked={Boolean((roleConfig.uiVisibility as any)[item.key] ?? item.defaultVal ?? false)}
                                          disabled={isMaster}
                                          onChange={() => handleMatrixVisibilityToggle(item.key as keyof UserUIVisibility)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {matchingPerms.length > 0 && (
                                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                      <Sliders className="w-3.5 h-3.5" />
                                      ⚡ Acciones y Ejecución Operativa (¿Qué operaciones puede realizar?)
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {matchingPerms.map(item => (
                                        <PermissionCheckbox
                                          key={item.key}
                                          label={item.label}
                                          desc={item.desc}
                                          checked={Boolean((roleConfig.permissions as any)[item.key] ?? item.defaultVal ?? false)}
                                          disabled={isMaster}
                                          onChange={() => handleMatrixPermissionToggle(item.key as keyof UserPermissions)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ======================================================= */}
                      {/* MODULE 2: MAPA DE PATIO & CONTROL DE ESPACIOS            */}
                      {/* ======================================================= */}
                      {(() => {
                        const moduleEnabled = roleConfig.uiVisibility.showTabMap;
                        const visItems = [
                          { key: 'showTabMap', label: 'Ver Pestaña de Mapa', desc: 'Mostrar botón del mapa interactivo en la barra superior y menú lateral' },
                          { key: 'showOccupancyWidget', label: 'Ver Widget Plazas Libres/Ocupadas', desc: 'Mostrar contador de plazas en la barra superior' },
                          { key: 'showSpotsManagementButton', label: 'Ver Botón Gestión de Plazas', desc: 'Mostrar acceso al panel de edición masiva de puestos', defaultVal: true }
                        ];
                        const permItems = [
                          { key: 'canViewMap', label: 'Ver Mapa Interactivo', desc: 'Inspeccionar puestos visualmente y filtrar por estado' },
                          { key: 'canChangeSpotStatus', label: 'Cambiar Estado de Plazas', desc: 'Bloquear puestos o enviarlos a mantenimiento' },
                          { key: 'canForceReleaseSpot', label: 'Forzar Liberación de Plaza', desc: 'Liberar plaza ocupada omitiendo tique de salida', defaultVal: false },
                          { key: 'canManageSpots', label: 'Administrar Plazas (Creación Masiva)', desc: 'Añadir, remover y configurar plazas y nomenclaturas', defaultVal: false },
                          { key: 'canReserveSpots', label: 'Reservar Plazas', desc: 'Apartar puestos para convenios, mensualidades o VIP', defaultVal: false }
                        ];

                        const matchingVis = visItems.filter(i => matches(i.label, i.desc));
                        const matchingPerms = permItems.filter(i => matches(i.label, i.desc));
                        if (query && matchingVis.length === 0 && matchingPerms.length === 0 && !'mapa de patio plazas espacios'.includes(query)) return null;

                        return (
                          <div className={`p-5 rounded-2xl border transition-all ${
                            moduleEnabled ? 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xs' : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 opacity-80'
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold shrink-0">
                                  <MapPin className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Módulo 2: Mapa de Patio & Gestión de Plazas (Control de Espacios)
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                                      moduleEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                    }`}>
                                      {moduleEnabled ? 'MÓDULO AUTORIZADO' : 'ACCESO DENEGADO'}
                                    </span>
                                  </h4>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                    Supervisión visual de plazas, bloqueos por mantenimiento, reasignaciones y liberación forzada.
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isMaster}
                                  onClick={() => handleSetModulePermissionsForRole('mapa', !moduleEnabled)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                    moduleEnabled
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {moduleEnabled ? 'Desactivar Módulo' : 'Activar Módulo'}
                                </button>
                              </div>
                            </div>

                            {moduleEnabled && (
                              <div className="mt-4 space-y-5">
                                {matchingVis.length > 0 && (
                                  <div className="space-y-2">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                                      <Eye className="w-3.5 h-3.5" />
                                      👁️ Control de Vista de Interfaz (¿Qué ve el usuario?)
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {matchingVis.map(item => (
                                        <VisibilityCheckbox
                                          key={item.key}
                                          label={item.label}
                                          desc={item.desc}
                                          checked={Boolean((roleConfig.uiVisibility as any)[item.key] ?? item.defaultVal ?? false)}
                                          disabled={isMaster}
                                          onChange={() => handleMatrixVisibilityToggle(item.key as keyof UserUIVisibility)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {matchingPerms.length > 0 && (
                                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                      <Sliders className="w-3.5 h-3.5" />
                                      ⚡ Acciones y Ejecución Operativa (¿Qué operaciones puede realizar?)
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {matchingPerms.map(item => (
                                        <PermissionCheckbox
                                          key={item.key}
                                          label={item.label}
                                          desc={item.desc}
                                          checked={Boolean((roleConfig.permissions as any)[item.key] ?? item.defaultVal ?? false)}
                                          disabled={isMaster}
                                          onChange={() => handleMatrixPermissionToggle(item.key as keyof UserPermissions)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ======================================================= */}
                      {/* MODULE 3: ABONADOS & MENSUALIDADES                       */}
                      {/* ======================================================= */}
                      {(() => {
                        const moduleEnabled = roleConfig.uiVisibility.showSubscribersModule !== false;
                        const visItems = [
                          { key: 'showSubscribersModule', label: 'Ver Módulo en Menú Lateral', desc: 'Acceso a la pantalla de Abonados en el menú lateral', defaultVal: true },
                          { key: 'showSubscribersTopButton', label: 'Ver Botón en Barra Superior', desc: 'Acceso rápido con ícono de Abonados en la barra superior', defaultVal: true }
                        ];
                        const permItems = [
                          { key: 'canViewSubscribers', label: 'Ver y Consultar Abonados', desc: 'Consultar contratos, clientes recurrentes y estados', defaultVal: true },
                          { key: 'canCreateSubscribers', label: 'Registrar Nuevos Abonados', desc: 'Crear contratos de mensualidad, asociar clientes y placas', defaultVal: false },
                          { key: 'canRenewSubscribers', label: 'Renovar y Cobrar Mensualidades', desc: 'Liquidar cobros periódicos de mensualidad y emitir recibos', defaultVal: false },
                          { key: 'canCancelSubscribers', label: 'Cancelar / Pausar Contratos', desc: 'Finalizar o suspender afiliaciones de abonados', defaultVal: false }
                        ];

                        const matchingVis = visItems.filter(i => matches(i.label, i.desc));
                        const matchingPerms = permItems.filter(i => matches(i.label, i.desc));
                        if (query && matchingVis.length === 0 && matchingPerms.length === 0 && !'abonados mensualidades clientes recurrentes'.includes(query)) return null;

                        return (
                          <div className={`p-5 rounded-2xl border transition-all ${
                            moduleEnabled ? 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xs' : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 opacity-80'
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                                  <Users className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Módulo 3: Abonados & Mensualidades (Contratos Recurrentes)
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                                      moduleEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                    }`}>
                                      {moduleEnabled ? 'MÓDULO AUTORIZADO' : 'ACCESO DENEGADO'}
                                    </span>
                                  </h4>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                    Gestión de clientes fijos, suscripciones de estacionamiento, cobro de mensualidades y control vehicular.
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isMaster}
                                  onClick={() => handleSetModulePermissionsForRole('subscribers', !moduleEnabled)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                    moduleEnabled
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {moduleEnabled ? 'Desactivar Módulo' : 'Activar Módulo'}
                                </button>
                              </div>
                            </div>

                            {moduleEnabled && (
                              <div className="mt-4 space-y-5">
                                {matchingVis.length > 0 && (
                                  <div className="space-y-2">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                                      <Eye className="w-3.5 h-3.5" />
                                      👁️ Control de Vista de Interfaz (¿Qué ve el usuario?)
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {matchingVis.map(item => (
                                        <VisibilityCheckbox
                                          key={item.key}
                                          label={item.label}
                                          desc={item.desc}
                                          checked={Boolean((roleConfig.uiVisibility as any)[item.key] ?? item.defaultVal ?? false)}
                                          disabled={isMaster}
                                          onChange={() => handleMatrixVisibilityToggle(item.key as keyof UserUIVisibility)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {matchingPerms.length > 0 && (
                                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                      <Sliders className="w-3.5 h-3.5" />
                                      ⚡ Acciones y Ejecución Operativa (¿Qué operaciones puede realizar?)
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {matchingPerms.map(item => (
                                        <PermissionCheckbox
                                          key={item.key}
                                          label={item.label}
                                          desc={item.desc}
                                          checked={Boolean((roleConfig.permissions as any)[item.key] ?? item.defaultVal ?? false)}
                                          disabled={isMaster}
                                          onChange={() => handleMatrixPermissionToggle(item.key as keyof UserPermissions)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ======================================================= */}
                      {/* MODULE 4: TURNOS, ARQUEO & MOVIMIENTOS DE CAJA           */}
                      {/* ======================================================= */}
                      {(() => {
                        const moduleEnabled = roleConfig.uiVisibility.showTabCash;
                        const visItems = [
                          { key: 'showTabCash', label: 'Ver Pestaña de Caja', desc: 'Acceso al botón para ver el asistente de arqueo' },
                          { key: 'showTopRevenueMetrics', label: 'Ver Métrica de Recaudo Superior', desc: 'Mostrar recuadro de recaudo acumulado en barra superior', defaultVal: true },
                          { key: 'showCashDrawerBalance', label: 'Ver Saldo Teórico Gaveta', desc: 'Ver dinero esperado durante el turno (Apagar para Arqueo Ciego)' },
                          { key: 'showLivePaymentBreakdown', label: 'Ver Desglose de Pagos en Vivo', desc: 'Mostrar distribución de cobros (QR, Datáfono, Efectivo)', defaultVal: false },
                          { key: 'showCashPickupOption', label: 'Ver Botón Recogida Efectivo', desc: 'Visualizar opción de retiros parciales de dinero', defaultVal: true },
                          { key: 'showCashShiftsHistory', label: 'Ver Histórico de Cierres de Turno', desc: 'Ver botón y acceso al histórico de arqueos cerrados', defaultVal: false },
                          { key: 'showWarehousesGrid', label: 'Ver Tabla de Bodegas en Caja', desc: 'Mostrar almacenes y depósitos en el panel de caja', defaultVal: false },
                          { key: 'showOperationalDayBadge', label: 'Ver Insignia Día Operativo', desc: 'Mostrar fecha operativa y turno activo en barra superior', defaultVal: true }
                        ];
                        const permItems = [
                          { key: 'canManageCashShift', label: 'Abrir y Cerrar Turnos de Caja', desc: 'Operar caja, abrir jornada y arqueo final de cierre' },
                          { key: 'blindCashCount', label: '🔒 Arqueo Ciego Obligatorio', desc: 'Ocultar arqueo esperado antes del conteo físico del cajero', defaultVal: false },
                          { key: 'canWithdrawCash', label: 'Registrar Gastos / Egresos', desc: 'Efectuar retiros de caja menor hacia gastos operativos' },
                          { key: 'canDepositCash', label: 'Registrar Ingresos / Inyecciones', desc: 'Adicionar dinero a la base de caja durante el turno', defaultVal: false },
                          { key: 'canPickupCash', label: 'Realizar Recogidas Parciales', desc: 'Liberación de efectivo excesivo hacia administración/banco', defaultVal: false },
                          { key: 'canManageExpenseConcepts', label: 'Crear Conceptos de Gasto', desc: 'Gestionar catálogo de conceptos autorizados de egreso', defaultVal: false },
                          { key: 'canConfigureExpenseCategories', label: 'Gestionar Categorías de Gasto', desc: 'Crear/editar las categorías macro de egresos', defaultVal: false },
                          { key: 'canCloseOperationalDay', label: 'Cierre Definitivo Día Operativo', desc: 'Efectuar cierre fiscal y de negocio completo', defaultVal: false },
                          { key: 'canAuditCashShifts', label: 'Auditar y Reabrir Turnos', desc: 'Modificar, auditar o corregir cierres finalizados', defaultVal: false },
                          { key: 'canEditClosedShifts', label: 'Editar Movimientos de Turno Cerrado', desc: 'Alterar egresos o ingresos de turnos ya finalizados', defaultVal: false },
                          { key: 'canViewLiveFinancialBreakdown', label: 'Ver Desglose Financiero en Vivo', desc: 'Visualizar reportes analíticos del cuadre actual', defaultVal: false },
                          { key: 'canViewOperationalDayInHistory', label: 'Ver Día Operativo en Historial', desc: 'Ver auditoría del día seleccionado en comprobantes', defaultVal: false },
                          { key: 'canViewConsecutiveInHistory', label: 'Ver Consecutivo ARQ-XXXXXX', desc: 'Incluir código secuencial seguro en cada comprobante', defaultVal: false },
                          { key: 'canViewShiftClosingDiscrepancies', label: 'Ver Descuadres en Cierres', desc: 'Ver diferencias de faltantes o sobrantes de dinero', defaultVal: false },
                          { key: 'canManageWarehouses', label: 'Gestionar Bodegas / Almacenes', desc: 'Añadir, modificar y borrar almacenes físicos', defaultVal: false },
                          { key: 'canManagePosPoints', label: 'Gestionar Puntos POS / Taquillas', desc: 'Crear y administrar nodos y terminales de cobro', defaultVal: false }
                        ];

                        const matchingVis = visItems.filter(i => matches(i.label, i.desc));
                        const matchingPerms = permItems.filter(i => matches(i.label, i.desc));
                        if (query && matchingVis.length === 0 && matchingPerms.length === 0 && !'turnos arqueo caja finanzas gastos egresos'.includes(query)) return null;

                        return (
                          <div className={`p-5 rounded-2xl border transition-all ${
                            moduleEnabled ? 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xs' : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 opacity-80'
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                                  <DollarSign className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Módulo 4: Turnos, Arqueo & Movimientos de Caja (Finanzas)
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                                      moduleEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                    }`}>
                                      {moduleEnabled ? 'MÓDULO AUTORIZADO' : 'ACCESO DENEGADO'}
                                    </span>
                                  </h4>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                    Gestiona la apertura/cierre de caja, arqueos físicos, retiros de gastos, inyecciones de base y recogida de efectivo.
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isMaster}
                                  onClick={() => handleSetModulePermissionsForRole('turnos', !moduleEnabled)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                    moduleEnabled
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {moduleEnabled ? 'Desactivar Módulo' : 'Activar Módulo'}
                                </button>
                              </div>
                            </div>

                            {moduleEnabled && (
                              <div className="mt-4 space-y-5">
                                {matchingVis.length > 0 && (
                                  <div className="space-y-2">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                                      <Eye className="w-3.5 h-3.5" />
                                      👁️ Control de Vista de Interfaz (¿Qué ve el usuario?)
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {matchingVis.map(item => (
                                        <VisibilityCheckbox
                                          key={item.key}
                                          label={item.label}
                                          desc={item.desc}
                                          checked={Boolean((roleConfig.uiVisibility as any)[item.key] ?? item.defaultVal ?? false)}
                                          disabled={isMaster}
                                          onChange={() => handleMatrixVisibilityToggle(item.key as keyof UserUIVisibility)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {matchingPerms.length > 0 && (
                                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                      <Sliders className="w-3.5 h-3.5" />
                                      ⚡ Acciones y Ejecución Operativa (¿Qué operaciones puede realizar?)
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {matchingPerms.map(item => (
                                        <PermissionCheckbox
                                          key={item.key}
                                          label={item.label}
                                          desc={item.desc}
                                          checked={Boolean((roleConfig.permissions as any)[item.key] ?? item.defaultVal ?? false)}
                                          disabled={isMaster}
                                          onChange={() => handleMatrixPermissionToggle(item.key as keyof UserPermissions)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ======================================================= */}
                      {/* MODULE 5: REPORTES, CONSOLA & AUDITORÍA                  */}
                      {/* ======================================================= */}
                      {(() => {
                        const moduleEnabled = roleConfig.uiVisibility.showTabReports;
                        const visItems = [
                          { key: 'showTabReports', label: 'Ver Pestaña de Reportes', desc: 'Mostrar pestaña de análisis en el menú superior y lateral' },
                          { key: 'showFinancialKpisInReports', label: 'Ver KPIs Financieros', desc: 'Mostrar recuadro de utilidades, ingresos y egresos', defaultVal: false },
                          { key: 'showTrafficChartsInReports', label: 'Ver Gráficos de Tráfico', desc: 'Mostrar distribución horaria y gráficos de flujos', defaultVal: false },
                          { key: 'showAuditLogsPanel', label: 'Ver Panel de Registros de Auditoría', desc: 'Mostrar tabla detallada con bitácora interna', defaultVal: false },
                          { key: 'showEmployeeKpiWidget', label: 'Ver KPIs Rendimiento Cajeros', desc: 'Estadísticas de eficiencia y cobros por operador', defaultVal: false }
                        ];
                        const permItems = [
                          { key: 'canViewReports', label: 'Ver Reportes en Tiempo Real', desc: 'Visualizar reportes en tiempo real y gráficos' },
                          { key: 'canExportReports', label: 'Exportar a Excel / CSV / PDF', desc: 'Descargar consolidados e informes de auditoría' },
                          { key: 'canViewAuditLogs', label: 'Consultar Logs de Auditoría', desc: 'Ver bitácora de auditoría detallada de acciones', defaultVal: false },
                          { key: 'canFilterReportDates', label: 'Filtrar por Rango de Fechas', desc: 'Realizar búsquedas históricas con calendario libre', defaultVal: false },
                          { key: 'canDeleteAuditLogs', label: 'Borrar Auditoría / Purgar', desc: 'Eliminar bitácoras del sistema local (Acción Crítica)', defaultVal: false },
                          { key: 'canViewEmployeePerformanceKpi', label: 'Ver Eficiencia de Cajeros', desc: 'Analizar auditoría del desempeño individual del personal', defaultVal: false },
                          { key: 'canViewGeneralProfitMargin', label: 'Ver Margen de Utilidad General', desc: 'Visualizar costos y balance de utilidades totales netas', defaultVal: false }
                        ];

                        const matchingVis = visItems.filter(i => matches(i.label, i.desc));
                        const matchingPerms = permItems.filter(i => matches(i.label, i.desc));
                        if (query && matchingVis.length === 0 && matchingPerms.length === 0 && !'reportes auditoria consola estadisticas logs'.includes(query)) return null;

                        return (
                          <div className={`p-5 rounded-2xl border transition-all ${
                            moduleEnabled ? 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xs' : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 opacity-80'
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-700 dark:text-purple-400 font-bold shrink-0">
                                  <BarChart3 className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Módulo 5: Reportes, Consola & Auditoría
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                                      moduleEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                    }`}>
                                      {moduleEnabled ? 'MÓDULO AUTORIZADO' : 'ACCESO DENEGADO'}
                                    </span>
                                  </h4>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                    Consultas analíticas en tiempo real, exportación a Excel/PDF, auditoría de eventos y registros históricos.
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isMaster}
                                  onClick={() => handleSetModulePermissionsForRole('reportes', !moduleEnabled)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                    moduleEnabled
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {moduleEnabled ? 'Desactivar Módulo' : 'Activar Módulo'}
                                </button>
                              </div>
                            </div>

                            {moduleEnabled && (
                              <div className="mt-4 space-y-5">
                                {matchingVis.length > 0 && (
                                  <div className="space-y-2">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                                      <Eye className="w-3.5 h-3.5" />
                                      👁️ Control de Vista de Interfaz (¿Qué ve el usuario?)
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {matchingVis.map(item => (
                                        <VisibilityCheckbox
                                          key={item.key}
                                          label={item.label}
                                          desc={item.desc}
                                          checked={Boolean((roleConfig.uiVisibility as any)[item.key] ?? item.defaultVal ?? false)}
                                          disabled={isMaster}
                                          onChange={() => handleMatrixVisibilityToggle(item.key as keyof UserUIVisibility)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {matchingPerms.length > 0 && (
                                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                      <Sliders className="w-3.5 h-3.5" />
                                      ⚡ Acciones y Ejecución Operativa (¿Qué operaciones puede realizar?)
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {matchingPerms.map(item => (
                                        <PermissionCheckbox
                                          key={item.key}
                                          label={item.label}
                                          desc={item.desc}
                                          checked={Boolean((roleConfig.permissions as any)[item.key] ?? item.defaultVal ?? false)}
                                          disabled={isMaster}
                                          onChange={() => handleMatrixPermissionToggle(item.key as keyof UserPermissions)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ======================================================= */}
                      {/* MODULE 6: CONFIGURACIÓN DEL NEGOCIO, TARIFAS & FISCAL    */}
                      {/* ======================================================= */}
                      {(() => {
                        const moduleEnabled = roleConfig.uiVisibility.showTabSettings;
                        const visItems = [
                          { key: 'showTabSettings', label: 'Ver Pestaña de Configuración', desc: 'Mostrar acceso de tarifas y configuración en el menú lateral' },
                          { key: 'showInvoiceDianParams', label: 'Ver Parámetros DIAN', desc: 'Mostrar sección de Facturación Electrónica DIAN', defaultVal: false },
                          { key: 'showPrinterConfigModule', label: 'Ver Configuración Impresoras', desc: 'Mostrar acceso al configurador de impresoras y tiques térmicos', defaultVal: false },
                          { key: 'showUsersManagementButton', label: 'Ver Botón Control de Usuarios', desc: 'Mostrar botón de usuarios en barra superior y menú', defaultVal: false },
                          { key: 'showDatabaseButton', label: 'Ver Botón Base de Datos', desc: 'Mostrar botón de BD local en barra superior y menú', defaultVal: false }
                        ];
                        const permItems = [
                          { key: 'canEditRates', label: 'Editar Tarifas & Tiempos', desc: 'Editar los precios del parqueadero, fracciones y tolerancias' },
                          { key: 'canManageVehicleCategories', label: 'Gestionar Tipos de Vehículo', desc: 'Añadir categorías de vehículos y tarifas personalizadas', defaultVal: false },
                          { key: 'canManageAgreements', label: 'Gestionar Convenios Comerciales', desc: 'Crear sellos y acuerdos de descuento con aliados', defaultVal: false },
                          { key: 'canEditBusinessInfo', label: 'Editar Datos del Negocio', desc: 'Modificar NIT, razón social y pie de texto del ticket', defaultVal: false },
                          { key: 'canConfigurePrinters', label: 'Configurar Impresoras Térmicas', desc: 'Ajustar ancho de papel (80/58mm), logo y comandos de corte', defaultVal: false },
                          { key: 'canConfigureDianInvoicing', label: 'Configurar Factura Electrónica DIAN', desc: 'Modificar rangos y parámetros fiscales DIAN', defaultVal: false },
                          { key: 'canConfigurePaymentMethods', label: 'Configurar Medios de Pago & QR', desc: 'Cuentas bancarias, billeteras, BreB y datáfonos', defaultVal: false },
                          { key: 'canManageDatabase', label: 'Gestionar Base de Datos Local', desc: 'Exportar backups, restaurar copias de seguridad' },
                          { key: 'canManageUsers', label: 'Administrar Usuarios & Permisos', desc: 'Crear/editar cuentas de empleados (Reservado Maestro)' },
                          { key: 'canConfigureSystemTheme', label: 'Personalizar Tema & Neón', desc: 'Configurar la visual del sistema y efectos visuales neón', defaultVal: false }
                        ];

                        const matchingVis = visItems.filter(i => matches(i.label, i.desc));
                        const matchingPerms = permItems.filter(i => matches(i.label, i.desc));
                        if (query && matchingVis.length === 0 && matchingPerms.length === 0 && !'configuración tarifas fiscal dian impresoras usuarios base de datos negocio'.includes(query)) return null;

                        return (
                          <div className={`p-5 rounded-2xl border transition-all ${
                            moduleEnabled ? 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xs' : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 opacity-80'
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-700 dark:text-sky-400 font-bold shrink-0">
                                  <Settings className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Módulo 6: Configuración del Negocio, Tarifas & Fiscal
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                                      moduleEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                    }`}>
                                      {moduleEnabled ? 'MÓDULO AUTORIZADO' : 'ACCESO DENEGADO'}
                                    </span>
                                  </h4>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                    Edición de tarifas, medios de pago, datos de empresa, facturación DIAN, impresoras térmicas y usuarios.
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isMaster}
                                  onClick={() => handleSetModulePermissionsForRole('config', !moduleEnabled)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                    moduleEnabled
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {moduleEnabled ? 'Desactivar Módulo' : 'Activar Módulo'}
                                </button>
                              </div>
                            </div>

                            {moduleEnabled && (
                              <div className="mt-4 space-y-5">
                                {matchingVis.length > 0 && (
                                  <div className="space-y-2">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                                      <Eye className="w-3.5 h-3.5" />
                                      👁️ Control de Vista de Interfaz (¿Qué ve el usuario?)
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {matchingVis.map(item => (
                                        <VisibilityCheckbox
                                          key={item.key}
                                          label={item.label}
                                          desc={item.desc}
                                          checked={Boolean((roleConfig.uiVisibility as any)[item.key] ?? item.defaultVal ?? false)}
                                          disabled={isMaster}
                                          onChange={() => handleMatrixVisibilityToggle(item.key as keyof UserUIVisibility)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {matchingPerms.length > 0 && (
                                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                      <Sliders className="w-3.5 h-3.5" />
                                      ⚡ Acciones y Ejecución Operativa (¿Qué operaciones puede realizar?)
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {matchingPerms.map(item => (
                                        <PermissionCheckbox
                                          key={item.key}
                                          label={item.label}
                                          desc={item.desc}
                                          checked={Boolean((roleConfig.permissions as any)[item.key] ?? item.defaultVal ?? false)}
                                          disabled={isMaster}
                                          onChange={() => handleMatrixPermissionToggle(item.key as keyof UserPermissions)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ======================================================= */}
                      {/* MODULE 7: RED, SERVIDOR CENTRAL & SOPORTE REMOTO         */}
                      {/* ======================================================= */}
                      {(() => {
                        const moduleEnabled = roleConfig.permissions.canAccessCentralHub !== false || roleConfig.uiVisibility.showCentralHubButton !== false;
                        const visItems = [
                          { key: 'showCentralHubButton', label: 'Ver Botón Servidor Central Hub', desc: 'Mostrar acceso al Servidor Central y Sedes en el menú', defaultVal: false },
                          { key: 'showBranchSyncButton', label: 'Ver Botón Sincronización', desc: 'Mostrar botón de sincronización de datos con Central', defaultVal: false },
                          { key: 'showAppUpdaterButton', label: 'Ver Botón Actualizador OTA', desc: 'Mostrar botón de actualizaciones de software', defaultVal: false },
                          { key: 'showWorkModeBadge', label: 'Ver Insignia Modo Red Servidor/POS', desc: 'Mostrar indicador de modo de trabajo en barra superior', defaultVal: false },
                          { key: 'showBranchesGrid', label: 'Ver Tabla de Sucursales', desc: 'Mostrar lista de sedes y estados en la sede central', defaultVal: false },
                          { key: 'showVncRemoteDesktopButton', label: 'Ver Botón FarmaDesk Remoto', desc: 'Mostrar acceso directo a consola de escritorio remoto', defaultVal: false },
                          { key: 'showTechnicalNetworkParams', label: 'Ver Parámetros LAN/WAN', desc: 'Mostrar IPs, puertos de sockets y topología de red', defaultVal: false },
                          { key: 'showBranchIdentifierBadge', label: 'Ver Insignia Sede Actual', desc: 'Mostrar nombre de la sucursal actual en barra superior', defaultVal: true }
                        ];
                        const permItems = [
                          { key: 'canAccessCentralHub', label: 'Acceso a Consola Central Hub', desc: 'Ver red nacional de sucursales, telemetría y consolidación', defaultVal: false },
                          { key: 'canPublishCentralUpdates', label: 'Publicar Tarifas a Sucursales', desc: 'Crear y emitir paquetes de actualización hacia las sedes', defaultVal: false },
                          { key: 'canSyncWithCentralServer', label: 'Sincronizar con Sede Central', desc: 'Forzar sincronización bidireccional y recibir parámetros', defaultVal: false },
                          { key: 'canPerformAppUpdates', label: 'Actualizador de Software (OTA)', desc: 'Descargar e instalar versiones de software y módulos', defaultVal: false },
                          { key: 'canManageBranchLocations', label: 'Gestionar Sedes Físicas', desc: 'Añadir, editar o eliminar sucursales en la red', defaultVal: false },
                          { key: 'canViewVncRemoteDesktop', label: 'Acceso a FarmaDesk Remoto', desc: 'Visualizar control remoto VNC de otras terminales', defaultVal: false },
                          { key: 'canExecuteRemoteOrders', label: 'Emitir Órdenes Remotas', desc: 'Ejecutar comandos en terminales remotas (reinicios, cierres)', defaultVal: false },
                          { key: 'canConfigureTechnicalTerminalProps', label: 'Configurar Modo de Trabajo & Puertos', desc: 'Modificar modo Servidor/Punto POS y puertos', defaultVal: false },
                          { key: 'canSwitchBranchSimulation', label: 'Conmutar Sucursal en Pruebas', desc: 'Cambiar de sede activa en el entorno de pruebas', defaultVal: false }
                        ];

                        const matchingVis = visItems.filter(i => matches(i.label, i.desc));
                        const matchingPerms = permItems.filter(i => matches(i.label, i.desc));
                        if (query && matchingVis.length === 0 && matchingPerms.length === 0 && !'red servidor central farmadesk vnc sincronizacion ota actualizaciones sucursales'.includes(query)) return null;

                        return (
                          <div className={`p-5 rounded-2xl border transition-all ${
                            moduleEnabled ? 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xs' : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 opacity-80'
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold shrink-0">
                                  <Server className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Módulo 7: Red, Servidor Central, Sincronización & Soporte Remoto
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                                      moduleEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                    }`}>
                                      {moduleEnabled ? 'MÓDULO AUTORIZADO' : 'ACCESO DENEGADO'}
                                    </span>
                                  </h4>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                    Hub matriz, telemetría nacional, sincronización de sedes, consola FarmaDesk Pro y actualizaciones OTA.
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isMaster}
                                  onClick={() => handleSetModulePermissionsForRole('central', !moduleEnabled)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                    moduleEnabled
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {moduleEnabled ? 'Desactivar Módulo' : 'Activar Módulo'}
                                </button>
                              </div>
                            </div>

                            {moduleEnabled && (
                              <div className="mt-4 space-y-5">
                                {matchingVis.length > 0 && (
                                  <div className="space-y-2">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                                      <Eye className="w-3.5 h-3.5" />
                                      👁️ Control de Vista de Interfaz (¿Qué ve el usuario?)
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {matchingVis.map(item => (
                                        <VisibilityCheckbox
                                          key={item.key}
                                          label={item.label}
                                          desc={item.desc}
                                          checked={Boolean((roleConfig.uiVisibility as any)[item.key] ?? item.defaultVal ?? false)}
                                          disabled={isMaster}
                                          onChange={() => handleMatrixVisibilityToggle(item.key as keyof UserUIVisibility)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {matchingPerms.length > 0 && (
                                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                      <Sliders className="w-3.5 h-3.5" />
                                      ⚡ Acciones y Ejecución Operativa (¿Qué operaciones puede realizar?)
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {matchingPerms.map(item => (
                                        <PermissionCheckbox
                                          key={item.key}
                                          label={item.label}
                                          desc={item.desc}
                                          checked={Boolean((roleConfig.permissions as any)[item.key] ?? item.defaultVal ?? false)}
                                          disabled={isMaster}
                                          onChange={() => handleMatrixPermissionToggle(item.key as keyof UserPermissions)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* CREATE / EDIT USER FORM */}
          {(activeTab === 'create_user' || activeTab === 'edit_user') && (
            <form onSubmit={handleSaveSubmit} className="space-y-6">
              {/* Clone Source Banner */}
              {clonedSourceUser && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <Copy className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                    <div>
                      <strong>Clonando configuración de:</strong> {clonedSourceUser.name} (@{clonedSourceUser.username}). 
                      Se han duplicado todos sus permisos y pantallas visibles.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClonedSourceUser(null)}
                    className="text-[11px] text-amber-700 dark:text-amber-400 hover:text-amber-200 underline font-mono"
                  >
                    Desvincular
                  </button>
                </div>
              )}

              {/* Template Quick Selector & Saver Toolbar */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    Cargar desde Plantilla:
                  </span>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedTemplateId(id);
                      const found = templates.find(t => t.id === id);
                      if (found) handleApplyTemplate(found);
                    }}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="">-- Seleccionar Plantilla Predefinida --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.isSystem ? '(Sistema)' : '(Personalizada)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSavingTemplateModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-800 dark:text-amber-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    Guardar esta Configuración como Plantilla...
                  </button>
                </div>
              </div>

              {/* Section 1: Basic Access Details */}
              <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <Key className="w-3.5 h-3.5" />
                  1. Credenciales de Ingreso y Rol Base
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="ej. Laura Sánchez"
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Usuario de Ingreso (Login)
                    </label>
                    <input
                      type="text"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="ej. laura_caja"
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Contraseña / Clave
                    </label>
                    <input
                      type="text"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="ej. pass123"
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                    />
                  </div>
                </div>

                {/* Preset & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 items-center">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Perfil / Rol Asignado:</span>
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 font-mono">Herencia de Permisos (RBAC)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId('');
                          handleRolePresetChange('master');
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                          formRole === 'master' && !selectedTemplateId
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        👑 Maestro
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId('');
                          handleRolePresetChange('supervisor');
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                          formRole === 'supervisor' && !selectedTemplateId
                            ? 'bg-blue-500 text-white border-blue-400 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        🛡️ Supervisor
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId('');
                          handleRolePresetChange('cashier');
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                          formRole === 'cashier' && !selectedTemplateId
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        💼 Solo Caja
                      </button>

                      {templates.length > 0 && (
                        <select
                          value={selectedTemplateId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setSelectedTemplateId(id);
                            const found = templates.find(t => t.id === id);
                            if (found) handleApplyTemplate(found);
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer focus:outline-none ${
                            selectedTemplateId
                              ? 'border-purple-300 dark:border-purple-500/50 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <option value="">-- Perfiles Personalizados ({templates.length}) --</option>
                          {templates.map(t => (
                            <option key={t.id} value={t.id}>
                              📑 {t.name} {t.isSystem ? '(Sistema)' : '(Personalizado)'}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                      Estado de la cuenta:
                    </label>
                    <button
                      type="button"
                      disabled={formRole === 'master'}
                      onClick={() => setFormIsActive(!formIsActive)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        formIsActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      {formIsActive ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      {formIsActive ? 'Usuario Activo' : 'Usuario Bloqueado'}
                    </button>
                  </div>
                </div>

                {/* Streamlined Profile Summary & Advanced Customization Trigger */}
                <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Perfil Asignado:</span>
                        <span className="text-amber-800 dark:text-amber-300 font-bold">
                          {selectedTemplateId 
                            ? (templates.find(t => t.id === selectedTemplateId)?.name || 'Perfil Personalizado') 
                            : formRole === 'master' ? 'Maestro (Control Total)' : formRole === 'supervisor' ? 'Supervisor' : 'Solo Caja'}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        El usuario hereda todos los módulos y acciones definidos para este perfil. Para modificar qué puede hacer este perfil a nivel general, dirígete a la pestaña <button type="button" onClick={() => setActiveTab('permissions')} className="text-amber-800 dark:text-amber-300 font-bold underline hover:text-amber-600 dark:hover:text-amber-200 cursor-pointer">3. Permisos por Perfil</button>.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAdvancedCustomization(!showAdvancedCustomization)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    <span>{showAdvancedCustomization ? 'Ocultar Matriz Granular' : 'Personalizar Permisos Individuales (Avanzado)'}</span>
                  </button>
                </div>
              </div>

              {/* Section 2: Deep Customization (Subtabs: Actions vs UI Visibility) - Collapsible */}
              {showAdvancedCustomization && (
                <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-150 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormSubTab('actions')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                        formSubTab === 'actions'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>¿Qué puede HACER o NO HACER? (Acciones)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormSubTab('visibility')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                        formSubTab === 'visibility'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>¿Qué puede VERSE o NO VERSE? (Pantallas y Métricas)</span>
                    </button>
                  </div>

                  {formRole === 'master' ? (
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                      <Crown className="w-3.5 h-3.5" />
                      Total Ilimitado (Usuario Maestro)
                    </span>
                  ) : (
                    <div className="flex items-center gap-2 text-xs">
                      {formSubTab === 'actions' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSetAllPermissions(true)}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[11px] transition-colors cursor-pointer"
                          >
                            Habilitar Todo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetAllPermissions(false)}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[11px] transition-colors cursor-pointer"
                          >
                            Deshabilitar Todo
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSetAllVisibility(true)}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[11px] transition-colors cursor-pointer"
                          >
                            Mostrar Todo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetAllVisibility(false)}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[11px] transition-colors cursor-pointer"
                          >
                            Ocultar Sensibles
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* SUBTAB 1: WHAT CAN THEY DO? (ACTIONS) */}
                {formSubTab === 'actions' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-700 dark:text-slate-200">
                      Define con precisión qué facultades operativas tiene este usuario en la operación diaria del parqueadero:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Group 1: Vehículos y Operaciones */}
                      <div className="bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                          <Car className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                          Operaciones de Vehículos y Tickets
                        </h4>

                        <PermissionCheckbox
                          label="Registrar Ingreso de Vehículos"
                          desc="Crear tickets de entrada y asignar puesto al ingresar"
                          checked={formPermissions.canRegisterEntry}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canRegisterEntry')}
                        />

                        <PermissionCheckbox
                          label="Registrar Salidas y Liquidar Cobros"
                          desc="Cobrar vehículos calculando estadía y registrar pagos"
                          checked={formPermissions.canRegisterExit}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canRegisterExit')}
                        />

                        <PermissionCheckbox
                          label="Selección Manual de Plazas"
                          desc="Si está desactivado, el sistema asigna la plaza automáticamente en orden"
                          checked={formPermissions.canManualSpotSelect ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canManualSpotSelect')}
                        />

                        <PermissionCheckbox
                          label="Anular Tickets Activos"
                          desc="Cancelar tickets de ingreso por equivocación o vehículo que se retira de inmediato"
                          checked={formPermissions.canCancelTicket}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canCancelTicket')}
                        />

                        <PermissionCheckbox
                          label="Aplicar Descuentos Manuales"
                          desc="Rebajar o alterar el monto total a pagar antes de cobrar"
                          checked={formPermissions.canApplyDiscounts}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canApplyDiscounts')}
                        />

                        <PermissionCheckbox
                          label="Exonerar Tarifas / Ticket Cortesía $0"
                          desc="Autorizar cobro a $0 como cortesía institucional o convenio"
                          checked={formPermissions.canWaiveFee ?? false}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canWaiveFee')}
                        />

                        <PermissionCheckbox
                          label="Reimprimir Tickets y Comprobantes"
                          desc="Volver a imprimir copias de tickets de entrada o recibos ya pagados"
                          checked={formPermissions.canReprintTickets ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canReprintTickets')}
                        />

                        <PermissionCheckbox
                          label="Cambiar Medio de Pago (Tarjeta / Transfer)"
                          desc="Si se apaga, el usuario solo podrá cobrar en Efectivo"
                          checked={formPermissions.canChangePaymentMethod ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canChangePaymentMethod')}
                        />

                        <PermissionCheckbox
                          label="Configurar Medios de Pago Digitales"
                          desc="Gestionar cuentas bancarias, billeteras, QR, Bre-B y datáfonos (Ocultar a cajeros)"
                          checked={formPermissions.canConfigurePaymentMethods ?? false}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canConfigurePaymentMethods')}
                        />
                      </div>

                      {/* Group 2: Patio, Plazas y Caja */}
                      <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                            Control de Patio y Plazas
                          </h4>

                          <PermissionCheckbox
                            label="Ver Mapa Interactivo de Plazas"
                            desc="Visualizar ocupación gráfica de plazas en tiempo real"
                            checked={formPermissions.canViewMap}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canViewMap')}
                          />

                          <PermissionCheckbox
                            label="Cambiar Estado de Plazas"
                            desc="Poner plazas en mantenimiento o reservadas manualmente"
                            checked={formPermissions.canChangeSpotStatus}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canChangeSpotStatus')}
                          />

                          <PermissionCheckbox
                            label="Liberación Forzada de Plazas"
                            desc="Desocupar forzosamente un puesto si hay error de sensor o registro"
                            checked={formPermissions.canForceReleaseSpot ?? false}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canForceReleaseSpot')}
                          />

                          <PermissionCheckbox
                            label="Crear y Gestionar Plazas de Parqueo"
                            desc="Acceso al panel dedicado para agregar, editar, eliminar y renombrar plazas masivamente"
                            checked={formPermissions.canManageSpots ?? (formRole === 'master' || formRole === 'supervisor')}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canManageSpots')}
                          />
                        </div>

                        {/* Group: Abonados y Mensualidades */}
                        <div className="bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                            <Users className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                            Abonados y Mensualidades
                          </h4>

                          <PermissionCheckbox
                            label="Ver y Consultar Abonados"
                            desc="Consultar contratos, clientes recurrentes y estados"
                            checked={formPermissions.canViewSubscribers ?? true}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canViewSubscribers')}
                          />

                          <PermissionCheckbox
                            label="Registrar Nuevos Abonados"
                            desc="Crear contratos de mensualidad, asociar clientes y placas"
                            checked={formPermissions.canCreateSubscribers ?? false}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canCreateSubscribers')}
                          />

                          <PermissionCheckbox
                            label="Renovar y Cobrar Mensualidades"
                            desc="Liquidar cobros periódicos de mensualidad y emitir recibos"
                            checked={formPermissions.canRenewSubscribers ?? false}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canRenewSubscribers')}
                          />

                          <PermissionCheckbox
                            label="Cancelar / Pausar Contratos"
                            desc="Finalizar o suspender afiliaciones de abonados"
                            checked={formPermissions.canCancelSubscribers ?? false}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canCancelSubscribers')}
                          />
                        </div>

                        <div className="bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                            Gestión de Caja, Gastos y Arqueo
                          </h4>

                          <PermissionCheckbox
                            label="Abrir y Cerrar Turnos de Caja"
                            desc="Gestionar apertura y efectuar el arqueo de cierre de turno"
                            checked={formPermissions.canManageCashShift}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canManageCashShift')}
                          />

                          <PermissionCheckbox
                            label="Registrar Gastos de Caja Menor"
                            desc="Permitir registrar salidas de dinero seleccionando un concepto autorizado"
                            checked={formPermissions.canWithdrawCash}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canWithdrawCash')}
                          />

                          <PermissionCheckbox
                            label="Crear y Administrar Conceptos de Gastos"
                            desc="Panel para crear, editar o eliminar motivos de salida de dinero (Exclusivo administradores)"
                            checked={formPermissions.canManageExpenseConcepts ?? false}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canManageExpenseConcepts')}
                          />

                          <PermissionCheckbox
                            label="Ver Desglose Financiero y Medios en Vivo"
                            desc="Permite ver totales de tarjetas, billeteras y QR antes de cerrar el turno (Desactivar en cajeros)"
                            checked={formPermissions.canViewLiveFinancialBreakdown ?? false}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canViewLiveFinancialBreakdown')}
                          />

                          <PermissionCheckbox
                            label="Registrar Ingresos Extras a Caja"
                            desc="Añadir dinero adicional a la base durante el turno"
                            checked={formPermissions.canDepositCash ?? false}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canDepositCash')}
                          />

                          <PermissionCheckbox
                            label="Realizar Recogidas Parciales de Dinero (Liberar Efectivo)"
                            desc="Permite retirar efectivo acumulado en la gaveta por exceso o seguridad durante la jornada laboral"
                            checked={formPermissions.canPickupCash ?? true}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canPickupCash')}
                          />

                          <PermissionCheckbox
                            label="Mostrar Día Operativo en Cierres/Tiques"
                            desc="Habilitar visualización del Día Operativo en las tarjetas del historial y tiques térmicos"
                            checked={formPermissions.canViewOperationalDayInHistory ?? true}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canViewOperationalDayInHistory')}
                          />

                          <PermissionCheckbox
                            label="Generar Consecutivos en Cierres/Tiques"
                            desc="Habilitar numeración secuencial de arqueos (ARQ-XXXXXX) y cierres definitivos en historial y comprobantes"
                            checked={formPermissions.canViewConsecutiveInHistory ?? true}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canViewConsecutiveInHistory')}
                          />

                          <PermissionCheckbox
                            label="Ver Historial de Cierres y Arqueos"
                            desc="Permitir visualizar el botón de 'Histórico de Cierres' y acceder a los arqueos históricos de caja"
                            checked={formPermissions.canViewCashShiftsHistory ?? false}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('canViewCashShiftsHistory')}
                          />
                        </div>
                      </div>

                      {/* Group 3: Reportes, Auditoría y Sistema */}
                      <div className="bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                          <BarChart3 className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                          Reportes y Auditoría
                        </h4>

                        <PermissionCheckbox
                          label="Ver Reportes Financieros"
                          desc="Consultar gráficas de facturación y estadísticas del negocio"
                          checked={formPermissions.canViewReports}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canViewReports')}
                        />

                        <PermissionCheckbox
                          label="Exportar Reportes a Excel / CSV"
                          desc="Descargar archivos con los registros de ventas a su dispositivo"
                          checked={formPermissions.canExportReports}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canExportReports')}
                        />

                        <PermissionCheckbox
                          label="Ver Registro de Auditoría"
                          desc="Consultar bitácora de acciones y cambios realizados por operadores"
                          checked={formPermissions.canViewAuditLogs ?? false}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canViewAuditLogs')}
                        />
                      </div>

                      {/* Group 4: Configuración y Administración */}
                      <div className="bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                          <Settings className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                          Administración, Red Multi-Sede y Actualizaciones
                        </h4>

                        <PermissionCheckbox
                          label="Modificar Tarifas por Minuto/Hora"
                          desc="Editar los precios del parqueadero y tolerancias de cobro"
                          checked={formPermissions.canEditRates}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canEditRates')}
                        />

                        <PermissionCheckbox
                          label="Crear y Configurar Tipos de Vehículos"
                          desc="Añadir nuevas categorías de vehículos (Camión, Patineta, etc.) y personalizar tarifas"
                          checked={formPermissions.canManageVehicleCategories ?? false}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canManageVehicleCategories')}
                        />

                        <PermissionCheckbox
                          label="Editar Datos del Negocio y Encabezados"
                          desc="Cambiar NIT, Razón Social, Teléfono y leyenda del ticket"
                          checked={formPermissions.canEditBusinessInfo ?? false}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canEditBusinessInfo')}
                        />

                        <PermissionCheckbox
                          label="Gestionar Base de Datos Local"
                          desc="Exportar backups, restaurar copias y visor SQL/tablas"
                          checked={formPermissions.canManageDatabase}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canManageDatabase')}
                        />

                        <PermissionCheckbox
                          label="Administrar Otros Usuarios"
                          desc="Crear y editar cuentas de empleados (Reservado para Maestro)"
                          checked={formPermissions.canManageUsers}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canManageUsers')}
                        />

                        <PermissionCheckbox
                          label="Acceso a Consola de Servidor Central"
                          desc="Ver la red nacional de sucursales, telemetría y consolidación financiera global"
                          checked={formPermissions.canAccessCentralHub ?? (formRole === 'master' || formRole === 'supervisor')}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canAccessCentralHub')}
                        />

                        <PermissionCheckbox
                          label="Despachar y Publicar Precios a Sucursales"
                          desc="Crear y emitir paquetes de actualización de tarifas y conceptos hacia las sedes"
                          checked={formPermissions.canPublishCentralUpdates ?? (formRole === 'master')}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canPublishCentralUpdates')}
                        />

                        <PermissionCheckbox
                          label="Sincronizar Datos con Servidor Central"
                          desc="Forzar sincronización bidireccional y consultar paquetes pendientes"
                          checked={formPermissions.canSyncWithCentralServer ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canSyncWithCentralServer')}
                        />

                        <PermissionCheckbox
                          label="Actualizador de Software Integrado (OTA)"
                          desc="Descargar e instalar versiones de software, hot-patches y nuevos módulos"
                          checked={formPermissions.canPerformAppUpdates ?? (formRole === 'master' || formRole === 'supervisor')}
                          disabled={formRole === 'master'}
                          onChange={() => handlePermissionToggle('canPerformAppUpdates')}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 2: WHAT CAN BE SEEN OR NOT IN THEIR PROFILE? (UI VISIBILITY) */}
                {formSubTab === 'visibility' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-700 dark:text-slate-200">
                      Controla qué elementos visuales, pestañas y métricas se muestran u ocultan en la pantalla de este usuario:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Modulo 1: Pestañas Principales y Navegación */}
                      <div className="bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                          <Eye className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
                          1. Pestañas Principales y Menús
                        </h4>

                        <VisibilityCheckbox
                          label="Mostrar Pestaña 'Operaciones POS'"
                          desc="Módulo principal de entrada y cobro de vehículos"
                          checked={formUiVisibility.showTabOperations ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showTabOperations')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Pestaña 'Mapa de Plazas'"
                          desc="Permite ver el botón del mapa de estacionamiento en la barra de navegación"
                          checked={formUiVisibility.showTabMap ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showTabMap')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Pestaña 'Abonados y Mensualidades'"
                          desc="Permite ver el acceso al módulo de clientes abonados y mensualidades en el menú lateral"
                          checked={formUiVisibility.showSubscribersModule ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showSubscribersModule')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Pestaña 'Caja & Turnos'"
                          desc="Permite ver el botón para abrir el modal y vista de estado de caja"
                          checked={formUiVisibility.showTabCash ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showTabCash')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Pestaña 'Reportes Financieros'"
                          desc="Oculta por completo la pestaña de estadísticas y gráficos del menú"
                          checked={formUiVisibility.showTabReports ?? false}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showTabReports')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Pestaña 'Tarifas y Ajustes'"
                          desc="Oculta el acceso a configuración de precios en el menú superior"
                          checked={formUiVisibility.showTabSettings ?? false}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showTabSettings')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Acceso 'Configuración de Impresoras'"
                          desc="Permite visualizar el acceso para calibrar impresoras térmicas y formato de tickets"
                          checked={formUiVisibility.showPrinterConfigModule ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showPrinterConfigModule')}
                        />
                      </div>

                      {/* Modulo 2: Widgets del Header & Barra Superior */}
                      <div className="bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                          <EyeOff className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                          2. Widgets y Accesos de Barra Superior
                        </h4>

                        <VisibilityCheckbox
                          label="Mostrar Métrica de Dinero Recaudado"
                          desc="Si se oculta, el cajero NO verá el dinero acumulado total en la barra superior"
                          checked={formUiVisibility.showTopRevenueMetrics ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showTopRevenueMetrics')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Widget de Ocupación en Tiempo Real"
                          desc="Indicador gráfico de puestos libres y ocupados en el encabezado"
                          checked={formUiVisibility.showOccupancyWidget ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showOccupancyWidget')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Reloj Digital en Vivo"
                          desc="Muestra la hora y fecha del sistema en tiempo real en la barra superior"
                          checked={formUiVisibility.showLiveClockWidget ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showLiveClockWidget')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Insignia de Sucursal / Sede"
                          desc="Muestra el distintivo con el código y nombre de la sucursal activa en la barra superior"
                          checked={formUiVisibility.showBranchIdentifierBadge ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showBranchIdentifierBadge')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Insignia / Selector de Modo de Red"
                          desc="Muestra el indicador de modo de red (Terminal Local / Servidor Remoto)"
                          checked={formUiVisibility.showWorkModeBadge ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showWorkModeBadge')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Botón Rápido 'Abonados' en Encabezado"
                          desc="Acceso directo a la gestión de mensualidades desde la barra superior"
                          checked={formUiVisibility.showSubscribersTopButton ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showSubscribersTopButton')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Botón 'Abrir Cajón' sin Venta"
                          desc="Muestra el botón de apertura manual del cajón monedero en la barra de utilidades"
                          checked={formUiVisibility.showOpenCashDrawerButton ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showOpenCashDrawerButton')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Botón 'Servidor Central' en Encabezado"
                          desc="Permite visualizar el acceso a la consola de red multi-sede en la barra superior"
                          checked={formUiVisibility.showCentralHubButton ?? (formRole === 'master' || formRole === 'supervisor')}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showCentralHubButton')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Botón 'Sincronizar Sede' en Encabezado"
                          desc="Permite ver el botón de sincronización de la terminal con el servidor central"
                          checked={formUiVisibility.showBranchSyncButton ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showBranchSyncButton')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Botón 'Actualizador de Software' en Encabezado"
                          desc="Permite ver el acceso directo al actualizador del sistema y parches"
                          checked={formUiVisibility.showAppUpdaterButton ?? (formRole === 'master' || formRole === 'supervisor')}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showAppUpdaterButton')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Botón 'Soporte FarmaDesk (VNC)'"
                          desc="Acceso directo para solicitar y lanzar sesión de escritorio remoto de asistencia"
                          checked={formUiVisibility.showVncRemoteDesktopButton ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showVncRemoteDesktopButton')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Acceso Rápido a Base de Datos"
                          desc="Botón directo a la consola de base de datos en el encabezado"
                          checked={formUiVisibility.showDatabaseButton ?? false}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showDatabaseButton')}
                        />
                      </div>

                      {/* Modulo 3: Pantalla de Operaciones y Cobro */}
                      <div className="bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                          <Car className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          3. Pantalla de Patio POS y Operaciones
                        </h4>

                        <VisibilityCheckbox
                          label="Mostrar Tarjetas de Resumen de Recaudo Diario"
                          desc="Oculta o muestra los recuadros de total en efectivo, tarjetas y transferencias"
                          checked={formUiVisibility.showDailySummaryCards ?? false}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showDailySummaryCards')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Contador de Vehículos en Patio"
                          desc="Métrica visual de la cantidad total de vehículos actualmente estacionados"
                          checked={formUiVisibility.showVehiclesInYardMetric ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showVehiclesInYardMetric')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Contador de Recaudo del Turno"
                          desc="Métrica del monto total recaudado durante el turno operativo actual"
                          checked={formUiVisibility.showTurnRevenueMetric ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showTurnRevenueMetric')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Historial de Tickets Cobrados"
                          desc="Visualizar tabla inferior de vehículos que ya pagaron y salieron del parqueadero"
                          checked={formUiVisibility.showPaidTicketsHistory ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showPaidTicketsHistory')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Botón 'Configurar Medios' en Cobro"
                          desc="Permite acceder al asistente de configuración de cuentas y QR desde el panel de cobro"
                          checked={formUiVisibility.showConfigurePaymentMethodsButton ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showConfigurePaymentMethodsButton')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Widget de Cámara ANPR"
                          desc="Muestra la vista en vivo de la cámara de reconocimiento automático de placas"
                          checked={formUiVisibility.showAnprCameraWidget ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showAnprCameraWidget')}
                        />
                      </div>

                      {/* Modulo 4: Pantalla de Mapa y Gestión de Plazas */}
                      <div className="bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                          <MapPin className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                          4. Pantalla de Mapa y Plazas
                        </h4>

                        <VisibilityCheckbox
                          label="Mostrar Botón 'Gestión de Plazas' en Encabezado y Mapa"
                          desc="Muestra el acceso al panel dedicado de creación y administración masiva de plazas de parqueo"
                          checked={formUiVisibility.showSpotsManagementButton ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showSpotsManagementButton')}
                        />
                      </div>

                      {/* Modulo 5: Políticas de Caja & Turnos */}
                      <div className="col-span-1 md:col-span-2 bg-amber-500/5 p-4 rounded-xl border border-amber-500/20 space-y-3">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                          <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider font-mono">
                            5. Pantalla de Caja, Turnos y Políticas de Arqueo
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <VisibilityCheckbox
                            label="Mostrar Saldo Teórico en Caja Durante el Turno"
                            desc="Si se desactiva, el operador no podrá ver cuánto dinero debería haber acumulado en el cajón durante su jornada"
                            checked={formUiVisibility.showCashDrawerBalance ?? true}
                            disabled={formRole === 'master'}
                            onChange={() => handleUiVisibilityToggle('showCashDrawerBalance')}
                          />

                          <PermissionCheckbox
                            label="🔒 Exigir Arqueo Ciego al Cerrar Turno"
                            desc="Obliga al cajero a contar e ingresar los billetes sin conocer la cifra esperada. El sistema revelará si hubo sobrante o faltante únicamente tras confirmar el cierre."
                            checked={formPermissions.blindCashCount ?? false}
                            disabled={formRole === 'master'}
                            onChange={() => handlePermissionToggle('blindCashCount')}
                          />

                          <VisibilityCheckbox
                            label="Mostrar Opción 'Recogida de Dinero' en Caja"
                            desc="Muestra la opción para realizar salidas por concepto de recogida parcial de efectivo por seguridad"
                            checked={formUiVisibility.showCashPickupOption ?? true}
                            disabled={formRole === 'master'}
                            onChange={() => handleUiVisibilityToggle('showCashPickupOption')}
                          />

                          <VisibilityCheckbox
                            label="Mostrar Botón 'Histórico de Cierres' en Caja"
                            desc="Permite consultar cierres pasados, actas de arqueo y reimprimir tirillas históricas"
                            checked={formUiVisibility.showCashShiftsHistory ?? true}
                            disabled={formRole === 'master'}
                            onChange={() => handleUiVisibilityToggle('showCashShiftsHistory')}
                          />

                          <VisibilityCheckbox
                            label="Mostrar Desglose de Medios de Pago en Vivo"
                            desc="Si se apaga, no verá el desglose por medio de pago (Nequi, Tarjeta, Daviplata) hasta el arqueo final"
                            checked={formUiVisibility.showLivePaymentBreakdown ?? true}
                            disabled={formRole === 'master'}
                            onChange={() => handleUiVisibilityToggle('showLivePaymentBreakdown')}
                          />
                        </div>
                      </div>

                      {/* Modulo 6: Pantalla de Reportes y Auditoría */}
                      <div className="bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                          <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          6. Pantalla de Reportes y Auditoría
                        </h4>

                        <VisibilityCheckbox
                          label="Mostrar Tarjetas de KPIs Financieros"
                          desc="Muestra los totales consolidados de facturación, promedios y márgenes en la vista de reportes"
                          checked={formUiVisibility.showFinancialKpisInReports ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showFinancialKpisInReports')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Gráficos de Tráfico y Ocupación"
                          desc="Muestra las gráficas analíticas de afluencia por horas y distribución vehicular"
                          checked={formUiVisibility.showTrafficChartsInReports ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showTrafficChartsInReports')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Panel de Registros de Auditoría"
                          desc="Visualizar la bitácora de eventos del sistema dentro del módulo de reportes"
                          checked={formUiVisibility.showAuditLogsPanel ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showAuditLogsPanel')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Estadísticas de Rendimiento de Cajeros"
                          desc="Muestra el widget de velocidad de atención y volumen recaudado por operador"
                          checked={formUiVisibility.showEmployeeKpiWidget ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showEmployeeKpiWidget')}
                        />
                      </div>

                      {/* Modulo 7: Configuración del Negocio, Red y Fiscal */}
                      <div className="bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                          <Settings className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          7. Configuración del Negocio, Red y Fiscal
                        </h4>

                        <VisibilityCheckbox
                          label="Mostrar Parámetros de Facturación Electrónica DIAN"
                          desc="Visualizar claves técnicas, resolución, prefijos y tokens de emisión DIAN"
                          checked={formUiVisibility.showInvoiceDianParams ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showInvoiceDianParams')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Parámetros Técnicos de Red LAN/WAN"
                          desc="Visualizar configuración de puertos, sockets de comunicación y URL de servidor"
                          checked={formUiVisibility.showTechnicalNetworkParams ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showTechnicalNetworkParams')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Tabla de Sucursales de la Red"
                          desc="Permite visualizar la lista de sedes registradas en el sistema"
                          checked={formUiVisibility.showBranchesGrid ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showBranchesGrid')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Tabla de Puntos de Venta / Taquillas"
                          desc="Permite ver la lista de terminales y puntos de cobro físicos configurados"
                          checked={formUiVisibility.showPosPointsGrid ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showPosPointsGrid')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Tabla de Bodegas y Almacén"
                          desc="Permite ver las bodegas e inventario auxiliar en el sistema"
                          checked={formUiVisibility.showWarehousesGrid ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showWarehousesGrid')}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <div>
                  {selectedUser && (
                    <button
                      type="button"
                      onClick={() => handleCloneUser(selectedUser)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      Duplicar como Nuevo Usuario
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {activeTab === 'create_user' ? 'Crear Usuario' : 'Guardar Cambios de Permisos y Vista'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal for Saving Current Form as New Template */}
        {isSavingTemplateModalOpen && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <form 
              onSubmit={handleConfirmSaveTemplate}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <Save className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Guardar como Plantilla de Perfil</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Podrás reutilizar esta configuración para futuros empleados.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Nombre de la Plantilla *
                  </label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="ej. Cajero Turno Nocturno"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Descripción Breve (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={newTemplateDesc}
                    onChange={(e) => setNewTemplateDesc(e.target.value)}
                    placeholder="ej. Con arqueo ciego estricto, sin acceso a anulación de tickets"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSavingTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10 transition-colors cursor-pointer"
                >
                  Guardar Plantilla
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete User Confirmation Dialog */}
        {userToDelete && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 p-6 rounded-2xl max-w-sm w-full shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">¿Eliminar este usuario?</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Se eliminará permanentemente la cuenta de <strong className="text-slate-900 dark:text-white">{userToDelete.name}</strong> (@{userToDelete.username}).
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/20 transition-colors cursor-pointer"
                >
                  Confirmar Eliminación
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Creating or Editing a User Profile */}
        {isTemplateModalOpen && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <form 
              onSubmit={handleSaveTemplateForm}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  {editingTemplate ? <Edit className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingTemplate ? 'Editar Perfil de Usuario' : 'Crear Nuevo Perfil de Usuario'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {editingTemplate 
                      ? 'Modifica los datos generales y el rol base de este perfil.' 
                      : 'Define un nuevo perfil de acceso para asignar fácilmente a tus empleados.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre del Perfil *
                  </label>
                  <input
                    type="text"
                    value={templateFormName}
                    onChange={(e) => setTemplateFormName(e.target.value)}
                    placeholder="ej. Cajero Turno Nocturno, Supervisor de Patio, etc."
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Rol Base / Nivel de Acceso *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTemplateFormRole('cashier')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        templateFormRole === 'cashier'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/40'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <Briefcase className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Solo Caja</div>
                        <div className="text-[10px] text-slate-500">Cobro y entradas</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTemplateFormRole('supervisor')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        templateFormRole === 'supervisor'
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/40'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Supervisor</div>
                        <div className="text-[10px] text-slate-500">Arqueos y reportes</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTemplateFormRole('custom')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        templateFormRole === 'custom'
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/40'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <Sliders className="w-4 h-4 text-purple-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Personalizado</div>
                        <div className="text-[10px] text-slate-500">Reglas a medida</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTemplateFormRole('master')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        templateFormRole === 'master'
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/40'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Maestro / Admin</div>
                        <div className="text-[10px] text-slate-500">Control total</div>
                      </div>
                    </button>
                  </div>
                </div>

                {!editingTemplate && templates.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Copiar permisos iniciales de:
                    </label>
                    <select
                      value={templateFormBaseTemplateId}
                      onChange={(e) => setTemplateFormBaseTemplateId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="">-- Usar permisos por defecto del rol seleccionado --</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>
                          📑 {t.name} ({t.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Descripción Breve (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={templateFormDesc}
                    onChange={(e) => setTemplateFormDesc(e.target.value)}
                    placeholder="ej. Arqueo ciego obligatorio, sin acceso a anulación de tickets ni reportes"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {editingTemplate ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsTemplateModalOpen(false);
                      refreshTemplates();
                      setSelectedMatrixProfileId(editingTemplate.id);
                      setActiveTab('permissions');
                    }}
                    className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Configurar Permisos Detallados</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingTemplate ? 'Guardar Cambios' : 'Crear Perfil'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Modal for Confirming Profile Deletion */}
        {templateToDelete && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">¿Eliminar este perfil?</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Estás a punto de retirar este perfil del catálogo de la aplicación.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{templateToDelete.name}</span>
                  {getRoleBadge(templateToDelete.role)}
                </div>
                {templateToDelete.description && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{templateToDelete.description}</p>
                )}
              </div>

              {(() => {
                const affectedUsers = users.filter(u => u.role === templateToDelete.role);
                if (affectedUsers.length > 0) {
                  return (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <strong>Atención:</strong> Hay <strong>{affectedUsers.length} usuario(s)</strong> con este rol asignado ({affectedUsers.map(u => u.name).join(', ')}). Al eliminar el perfil, dichos usuarios <strong>mantendrán sus permisos actuales</strong> en la terminal, pero el perfil se retirará del catálogo para futuras asignaciones.
                      </div>
                    </div>
                  );
                }
                return (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    ¿Confirmas que deseas eliminar el perfil <strong>"{templateToDelete.name}"</strong>?
                  </p>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTemplateToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteTemplate}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sí, Eliminar Perfil</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Restoring Factory Default Profiles */}
        {isRestoreDefaultsModalOpen && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">¿Restaurar Perfiles de Fábrica?</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Recupera las 5 plantillas oficiales originales del sistema.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                <p className="font-semibold text-slate-900 dark:text-white">Se restaurarán los siguientes perfiles:</p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                  <li>Cajero Estándar (Arqueo Ciego)</li>
                  <li>Cajero Avanzado / Confianza</li>
                  <li>Operador de Patio / Valet (Solo Entrada)</li>
                  <li>Auditor / Revisor Fiscal (Solo Lectura)</li>
                  <li>Supervisor Operativo Integral</li>
                </ul>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium pt-1">
                  ✓ Los perfiles personalizados que hayas creado manualmente se conservarán intactos.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRestoreDefaultsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestoreDefaults}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Perfiles</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface PermissionCheckboxProps {
  label: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}

const PermissionCheckbox: React.FC<PermissionCheckboxProps> = ({
  label,
  desc,
  checked,
  disabled,
  onChange,
}) => {
  return (
    <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors cursor-pointer ${
      checked 
        ? 'bg-amber-500/10 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40' 
        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80'
    } ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800/70'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-amber-500 focus:ring-amber-400 focus:ring-offset-white dark:focus:ring-offset-slate-900 shrink-0 cursor-pointer"
      />
      <div className="flex-1 select-none">
        <div className={`text-xs font-semibold ${checked ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
          {label}
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
          {desc}
        </div>
      </div>
      {checked ? (
        <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 shrink-0 self-center font-bold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 rounded border border-emerald-200 dark:border-emerald-800">
          PERMITIDO
        </span>
      ) : (
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0 self-center font-medium px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700">
          BLOQUEADO
        </span>
      )}
    </label>
  );
};

interface VisibilityCheckboxProps {
  label: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}

const VisibilityCheckbox: React.FC<VisibilityCheckboxProps> = ({
  label,
  desc,
  checked,
  disabled,
  onChange,
}) => {
  return (
    <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors cursor-pointer ${
      checked 
        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800/60' 
        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80'
    } ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800/70'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-sky-500 focus:ring-sky-400 focus:ring-offset-white dark:focus:ring-offset-slate-900 shrink-0 cursor-pointer"
      />
      <div className="flex-1 select-none">
        <div className={`text-xs font-semibold ${checked ? 'text-sky-900 dark:text-sky-200 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
          {label}
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
          {desc}
        </div>
      </div>
      {checked ? (
        <span className="text-[10px] font-mono text-sky-700 dark:text-sky-300 shrink-0 self-center font-bold px-1.5 py-0.5 bg-sky-100 dark:bg-sky-950/60 rounded border border-sky-200 dark:border-sky-800 flex items-center gap-1">
          <Eye className="w-3 h-3" /> VISIBLE
        </span>
      ) : (
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0 self-center font-medium px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1">
          <EyeOff className="w-3 h-3" /> OCULTO
        </span>
      )}
    </label>
  );
};
