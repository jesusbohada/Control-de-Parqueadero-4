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
  RotateCcw
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
  dbDeleteUserTemplate
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
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('farmadesk_role_matrix_config');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (_e) {}
      }
    }
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
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

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
      if (typeof window !== 'undefined') {
        localStorage.setItem('farmadesk_role_matrix_config', JSON.stringify(updatedMatrix));
      }
    } else {
      const tmpl = templates.find(t => t.id === selectedMatrixProfileId);
      if (tmpl) {
        const updatedTmpl: UserPermissionTemplate = {
          ...tmpl,
          permissions: newPerms,
          uiVisibility: newVis
        };
        dbSaveUserTemplate(updatedTmpl);
        setTemplates(dbGetUserTemplates());
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
    moduleKey: 'caja' | 'turnos' | 'mapa' | 'reportes' | 'config',
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
      perms.canRegisterEntry = enable;
      perms.canRegisterExit = enable;
      perms.canCancelTicket = enable;
      perms.canApplyDiscounts = enable;
      perms.canWaiveFee = enable;
      perms.canReprintTickets = enable;
      perms.canChangePaymentMethod = enable;
      perms.canProcessLostTicket = enable;
      perms.canIssueElectronicInvoice = enable;
    } else if (moduleKey === 'turnos') {
      vis.showTabCash = enable;
      vis.showCashDrawerBalance = enable;
      vis.showLivePaymentBreakdown = enable;
      vis.showCashPickupOption = enable;
      vis.showCashShiftsHistory = enable;
      perms.canManageCashShift = enable;
      perms.canWithdrawCash = enable;
      perms.canDepositCash = enable;
      perms.canPickupCash = enable;
      perms.canViewLiveFinancialBreakdown = enable;
      perms.canCloseOperationalDay = enable;
      perms.canAuditCashShifts = enable;
    } else if (moduleKey === 'mapa') {
      vis.showTabMap = enable;
      vis.showSpotsManagementButton = enable;
      perms.canViewMap = enable;
      perms.canChangeSpotStatus = enable;
      perms.canForceReleaseSpot = enable;
      perms.canManageSpots = enable;
      perms.canManualSpotSelect = enable;
    } else if (moduleKey === 'reportes') {
      vis.showTabReports = enable;
      vis.showFinancialKpisInReports = enable;
      vis.showTrafficChartsInReports = enable;
      perms.canViewReports = enable;
      perms.canExportReports = enable;
      perms.canViewAuditLogs = enable;
      perms.canFilterReportDates = enable;
    } else if (moduleKey === 'config') {
      vis.showTabSettings = enable;
      vis.showDatabaseButton = enable;
      vis.showCentralHubButton = enable;
      perms.canEditRates = enable;
      perms.canManageVehicleCategories = enable;
      perms.canConfigurePaymentMethods = enable;
      perms.canEditBusinessInfo = enable;
      perms.canManageDatabase = enable;
      perms.canManageUsers = enable;
      perms.canAccessCentralHub = enable;
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

  const handleSaveRoleMatrixToStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('farmadesk_role_matrix_config', JSON.stringify(roleMatrix));
      localStorage.setItem('pk_user_templates', JSON.stringify(templates));
    }
    setSuccessMessage('¡Matriz de Roles y Permisos guardada exitosamente en las políticas de seguridad!');
    setTimeout(() => setSuccessMessage(null), 3500);
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
      showTabOperations: true,
      showTabMap: value,
      showTabReports: value,
      showTabCash: value,
      showTabSettings: value,
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

    dbSaveUserTemplate(newTmpl);
    refreshTemplates();
    setSelectedTemplateId(newTmpl.id);
    setSelectedMatrixProfileId(newTmpl.id);
    setIsSavingTemplateModalOpen(false);
    setNewTemplateName('');
    setNewTemplateDesc('');
    setSuccessMessage(`¡Perfil "${newTmpl.name}" creado exitosamente! Se ha seleccionado automáticamente en la pestaña "3. Permisos por Perfil".`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDeleteCustomTemplate = (templateId: string) => {
    dbDeleteUserTemplate(templateId);
    refreshTemplates();
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
              <button
                type="button"
                onClick={() => setIsSavingTemplateModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Nuevo Perfil</span>
              </button>
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
                <button
                  type="button"
                  onClick={() => setIsSavingTemplateModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Nuevo Perfil</span>
                </button>
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

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                        {!tmpl.isSystem ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomTemplate(tmpl.id)}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Eliminar Perfil
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            Perfil Oficial de Fábrica
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            refreshTemplates();
                            setSelectedMatrixProfileId(tmpl.id);
                            setActiveTab('permissions');
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-slate-950 border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Configurar Permisos de este Perfil</span>
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

                  <div className="flex items-center gap-2">
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

                {/* Modules Matrix Cards */}
                <div className="space-y-6">
                  {/* MODULE 1: CAJA Y OPERACIONES POS */}
                  {(() => {
                    const moduleEnabled = roleConfig.uiVisibility.showTabOperations;

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
                                Módulo 1: Caja y Operaciones POS (Ingreso / Salida / Cobros)
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
                            {/* Vista Section */}
                            <div className="space-y-2">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" />
                                👁️ Control de Vista de Interfaz (¿Qué ve el usuario?)
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                <VisibilityCheckbox
                                  label="Ver Pestaña Operaciones"
                                  desc="Acceso al menú principal de vehículos"
                                  checked={roleConfig.uiVisibility.showTabOperations}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showTabOperations')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Resumen de Ventas Diarias"
                                  desc="Tarjetas de consolidación de dinero en la vista"
                                  checked={roleConfig.uiVisibility.showDailySummaryCards}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showDailySummaryCards')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Contador en Patio"
                                  desc="Indicador numérico de carros parqueados actualmente"
                                  checked={roleConfig.uiVisibility.showVehiclesInYardMetric ?? true}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showVehiclesInYardMetric')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Métrica Recaudo Turno"
                                  desc="Contador de dinero recaudado en el turno actual"
                                  checked={roleConfig.uiVisibility.showTurnRevenueMetric ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showTurnRevenueMetric')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Historial de Tickets Cobrados"
                                  desc="Cinta inferior con lista de salidas recientes"
                                  checked={roleConfig.uiVisibility.showPaidTicketsHistory}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showPaidTicketsHistory')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Widget de Cámara ANPR"
                                  desc="Mostrar visor de reconocimiento de placas en vivo"
                                  checked={roleConfig.uiVisibility.showAnprCameraWidget ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showAnprCameraWidget')}
                                />
                              </div>
                            </div>

                            {/* Ejecución Section */}
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                <Sliders className="w-3.5 h-3.5" />
                                ⚡ Acciones y Ejecución Operativa (¿Qué operaciones puede realizar?)
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                <PermissionCheckbox
                                  label="Registrar Ingreso"
                                  desc="Generar nuevos tiques y tickets de entrada"
                                  checked={roleConfig.permissions.canRegisterEntry}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canRegisterEntry')}
                                />
                                <PermissionCheckbox
                                  label="Registrar Salidas y Cobrar"
                                  desc="Liquidar tiempo de estadía y cobrar tarifas"
                                  checked={roleConfig.permissions.canRegisterExit}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canRegisterExit')}
                                />
                                <PermissionCheckbox
                                  label="Anular Tickets Activos"
                                  desc="Cancelar vehículos en patio por error/salida inmediata"
                                  checked={roleConfig.permissions.canCancelTicket}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canCancelTicket')}
                                />
                                <PermissionCheckbox
                                  label="Aplicar Descuentos"
                                  desc="Modificar el valor calculado con rebajas manuales"
                                  checked={roleConfig.permissions.canApplyDiscounts}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canApplyDiscounts')}
                                />
                                <PermissionCheckbox
                                  label="Exonerar Cortesías ($0)"
                                  desc="Generar salidas libres de pago con registro de justificación"
                                  checked={roleConfig.permissions.canWaiveFee ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canWaiveFee')}
                                />
                                <PermissionCheckbox
                                  label="Reimprimir Tiques y Recibos"
                                  desc="Duplicar tique de ingreso y recibos térmicos"
                                  checked={roleConfig.permissions.canReprintTickets ?? true}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canReprintTickets')}
                                />
                                <PermissionCheckbox
                                  label="Selección Manual de Plazas"
                                  desc="Elegir puesto manualmente al registrar ingreso"
                                  checked={roleConfig.permissions.canManualSpotSelect ?? true}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canManualSpotSelect')}
                                />
                                <PermissionCheckbox
                                  label="Salida Sin Tique (Extravío)"
                                  desc="Procesar egreso con Tarjeta de Propiedad"
                                  checked={roleConfig.permissions.canProcessLostTicket ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canProcessLostTicket')}
                                />
                                <PermissionCheckbox
                                  label="Aplicar Multa Tique Perdido"
                                  desc="Cobrar el recargo legal/establecido por pérdida"
                                  checked={roleConfig.permissions.canApplyLostTicketFee ?? true}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canApplyLostTicketFee')}
                                />
                                <PermissionCheckbox
                                  label="Cambiar Método de Pago"
                                  desc="Permitir elegir tarjeta, QR, BreB, transfer o efectivo"
                                  checked={roleConfig.permissions.canChangePaymentMethod ?? true}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canChangePaymentMethod')}
                                />
                                <PermissionCheckbox
                                  label="Abrir Cajón en Vacío"
                                  desc="Abrir el cajón monedero sin registrar una venta"
                                  checked={roleConfig.permissions.canOpenCashDrawerWithoutSale ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canOpenCashDrawerWithoutSale')}
                                />
                                <PermissionCheckbox
                                  label="Editar Placa de Tique Activo"
                                  desc="Corregir errores de digitación de placa en patio"
                                  checked={roleConfig.permissions.canEditActiveTicketPlate ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canEditActiveTicketPlate')}
                                />
                                <PermissionCheckbox
                                  label="Modificación Manual de Tarifa"
                                  desc="Sobrescribir el valor calculado del sistema de forma libre"
                                  checked={roleConfig.permissions.canApplyManualRateOverride ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canApplyManualRateOverride')}
                                />
                                <PermissionCheckbox
                                  label="Salida Forzada (Fuga/Cortesía)"
                                  desc="Efectuar salida forzada sin registro de pago ni dinero"
                                  checked={roleConfig.permissions.canForceRegisterExit ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canForceRegisterExit')}
                                />
                                <PermissionCheckbox
                                  label="Interactuar con Lector ANPR"
                                  desc="Operar con el detector de placas de inteligencia artificial"
                                  checked={roleConfig.permissions.canViewANPRCameraModule ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canViewANPRCameraModule')}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* MODULE 2: TURNOS Y ARQUEO DE CAJA */}
                  {(() => {
                    const moduleEnabled = roleConfig.uiVisibility.showTabCash;

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
                                Módulo 2: Turnos, Arqueo & Movimientos de Caja
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
                            {/* Vista Section */}
                            <div className="space-y-2">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" />
                                👁️ Control de Vista de Interfaz (¿Qué ve el usuario?)
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                <VisibilityCheckbox
                                  label="Ver Pestaña de Caja"
                                  desc="Acceso al botón para ver el asistente de arqueo"
                                  checked={roleConfig.uiVisibility.showTabCash}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showTabCash')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Saldo Teórico Gaveta"
                                  desc="Ver dinero esperado durante el turno (Apagar para Arqueo Ciego)"
                                  checked={roleConfig.uiVisibility.showCashDrawerBalance}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showCashDrawerBalance')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Desglose de Pagos en Vivo"
                                  desc="Mostrar distribución de cobros (QR, Datáfono, Efectivo)"
                                  checked={roleConfig.uiVisibility.showLivePaymentBreakdown ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showLivePaymentBreakdown')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Botón Recogida Efectivo"
                                  desc="Visualizar opción de retiros parciales de dinero"
                                  checked={roleConfig.uiVisibility.showCashPickupOption ?? true}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showCashPickupOption')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Histórico de Cierres de Turno"
                                  desc="Ver botón para ver arqueos y cierres anteriores"
                                  checked={roleConfig.uiVisibility.showCashShiftsHistory ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showCashShiftsHistory')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Tabla de Bodegas en Caja"
                                  desc="Mostrar información de almacenes"
                                  checked={roleConfig.uiVisibility.showWarehousesGrid ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showWarehousesGrid')}
                                />
                              </div>
                            </div>

                            {/* Ejecución Section */}
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                <Sliders className="w-3.5 h-3.5" />
                                ⚡ Acciones y Ejecución Operativa (¿Qué operaciones puede realizar?)
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                <PermissionCheckbox
                                  label="Abrir y Cerrar Turnos de Caja"
                                  desc="Operar caja, abrir jornada y arqueo final de cierre"
                                  checked={roleConfig.permissions.canManageCashShift}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canManageCashShift')}
                                />
                                <PermissionCheckbox
                                  label="Registrar Gastos / Egresos"
                                  desc="Efectuar retiros de caja menor hacia gastos"
                                  checked={roleConfig.permissions.canWithdrawCash}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canWithdrawCash')}
                                />
                                <PermissionCheckbox
                                  label="Registrar Ingresos / Inyecciones"
                                  desc="Adicionar dinero a la base de caja durante el turno"
                                  checked={roleConfig.permissions.canDepositCash ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canDepositCash')}
                                />
                                <PermissionCheckbox
                                  label="Realizar Recogidas Parciales"
                                  desc="Liberación de efectivo excesivo hacia administración/banco"
                                  checked={roleConfig.permissions.canPickupCash ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canPickupCash')}
                                />
                                <PermissionCheckbox
                                  label="Crear Conceptos de Gasto"
                                  desc="Gestionar catálogo de conceptos autorizados"
                                  checked={roleConfig.permissions.canManageExpenseConcepts ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canManageExpenseConcepts')}
                                />
                                <PermissionCheckbox
                                  label="Gestionar Categorías de Gasto"
                                  desc="Crear/editar las categorías macro de egresos"
                                  checked={roleConfig.permissions.canConfigureExpenseCategories ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canConfigureExpenseCategories')}
                                />
                                <PermissionCheckbox
                                  label="Cierre Definitivo Día Operativo"
                                  desc="Efectuar cierre fiscal y de negocio completo"
                                  checked={roleConfig.permissions.canCloseOperationalDay ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canCloseOperationalDay')}
                                />
                                <PermissionCheckbox
                                  label="Auditar y Reabrir Turnos"
                                  desc="Modificar o corregir cierres guardados"
                                  checked={roleConfig.permissions.canAuditCashShifts ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canAuditCashShifts')}
                                />
                                <PermissionCheckbox
                                  label="🔒 Arqueo Ciego Obligatorio"
                                  desc="Ocultar arqueo esperado antes del conteo físico"
                                  checked={roleConfig.permissions.blindCashCount ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('blindCashCount')}
                                />
                                <PermissionCheckbox
                                  label="Ver Desglose de Caja"
                                  desc="Visualizar reportes analíticos del cuadre actual"
                                  checked={roleConfig.permissions.canViewLiveFinancialBreakdown ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canViewLiveFinancialBreakdown')}
                                />
                                <PermissionCheckbox
                                  label="Ver Día Operativo en Historial"
                                  desc="Ver auditoría del día seleccionado"
                                  checked={roleConfig.permissions.canViewOperationalDayInHistory ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canViewOperationalDayInHistory')}
                                />
                                <PermissionCheckbox
                                  label="Ver Consecutivo ARQ-XXXXXX"
                                  desc="Incluir código secuencial seguro en cada comprobante"
                                  checked={roleConfig.permissions.canViewConsecutiveInHistory ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canViewConsecutiveInHistory')}
                                />
                                <PermissionCheckbox
                                  label="Editar Movimientos de Turno Cerrado"
                                  desc="Alterar egresos o ingresos de turnos ya finalizados"
                                  checked={roleConfig.permissions.canEditClosedShifts ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canEditClosedShifts')}
                                />
                                <PermissionCheckbox
                                  label="Gestionar Bodegas / Almacenes"
                                  desc="Añadir, modificar y borrar almacenes físicos"
                                  checked={roleConfig.permissions.canManageWarehouses ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canManageWarehouses')}
                                />
                                <PermissionCheckbox
                                  label="Gestionar Puntos POS / Taquillas"
                                  desc="Crear y administrar nodos y terminales de cobro"
                                  checked={roleConfig.permissions.canManagePosPoints ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canManagePosPoints')}
                                />
                                <PermissionCheckbox
                                  label="Ver Descuadres en Cierres"
                                  desc="Ver diferencias negativas o descuadres de dinero"
                                  checked={roleConfig.permissions.canViewShiftClosingDiscrepancies ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canViewShiftClosingDiscrepancies')}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* MODULE 3: MAPA DE PARQUEADERO Y ESPACIOS */}
                  {(() => {
                    const moduleEnabled = roleConfig.uiVisibility.showTabMap;

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
                                Módulo 3: Mapa de Parqueadero & Control de Espacios
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
                            {/* Vista Section */}
                            <div className="space-y-2">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" />
                                👁️ Control de Vista de Interfaz (¿Qué ve el usuario?)
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                <VisibilityCheckbox
                                  label="Ver Pestaña de Mapa"
                                  desc="Mostrar botón del mapa interactivo en la barra superior"
                                  checked={roleConfig.uiVisibility.showTabMap}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showTabMap')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Botón Gestión de Plazas"
                                  desc="Mostrar acceso al panel de edición masiva de puestos"
                                  checked={roleConfig.uiVisibility.showSpotsManagementButton ?? true}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showSpotsManagementButton')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Botón VNC Escritorio Remoto"
                                  desc="Mostrar acceso directo a pantallas de otras sucursales"
                                  checked={roleConfig.uiVisibility.showVncRemoteDesktopButton ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showVncRemoteDesktopButton')}
                                />
                              </div>
                            </div>

                            {/* Ejecución Section */}
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                <Sliders className="w-3.5 h-3.5" />
                                ⚡ Acciones y Ejecución Operativa (¿Qué operaciones puede realizar?)
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                <PermissionCheckbox
                                  label="Ver Mapa Interactiva"
                                  desc="Inspeccionar puestos visualmente"
                                  checked={roleConfig.permissions.canViewMap}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canViewMap')}
                                />
                                <PermissionCheckbox
                                  label="Cambiar Estado de Plazas"
                                  desc="Bloquear puestos o enviarlos a mantenimiento"
                                  checked={roleConfig.permissions.canChangeSpotStatus}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canChangeSpotStatus')}
                                />
                                <PermissionCheckbox
                                  label="Forzar Liberación de Plaza"
                                  desc="Liberar plaza ocupada omitiendo tique de salida"
                                  checked={roleConfig.permissions.canForceReleaseSpot ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canForceReleaseSpot')}
                                />
                                <PermissionCheckbox
                                  label="Administrar Plazas (Creación)"
                                  desc="Añadir, remover y configurar plazas y categorías"
                                  checked={roleConfig.permissions.canManageSpots ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canManageSpots')}
                                />
                                <PermissionCheckbox
                                  label="Reservar Plazas"
                                  desc="Apartar puestos para convenios, mensualidades o VIP"
                                  checked={roleConfig.permissions.canReserveSpots ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canReserveSpots')}
                                />
                                <PermissionCheckbox
                                  label="Acceso a VNC Sucursales"
                                  desc="Visualizar control remoto VNC de otras terminales"
                                  checked={roleConfig.permissions.canViewVncRemoteDesktop ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canViewVncRemoteDesktop')}
                                />
                                <PermissionCheckbox
                                  label="Emitir Órdenes Remotas"
                                  desc="Ejecutar comandos en terminales remotas (Reinicios, Bloqueos)"
                                  checked={roleConfig.permissions.canExecuteRemoteOrders ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canExecuteRemoteOrders')}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* MODULE 4: REPORTES Y AUDITORÍA */}
                  {(() => {
                    const moduleEnabled = roleConfig.uiVisibility.showTabReports;

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
                                Módulo 4: Reportes, Consola & Auditoría
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
                            {/* Vista Section */}
                            <div className="space-y-2">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" />
                                👁️ Control de Vista de Interfaz (¿Qué ve el usuario?)
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                <VisibilityCheckbox
                                  label="Ver Pestaña de Reportes"
                                  desc="Mostrar pestaña de análisis en el menú superior"
                                  checked={roleConfig.uiVisibility.showTabReports}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showTabReports')}
                                />
                                <VisibilityCheckbox
                                  label="Ver KPIs Financieros"
                                  desc="Mostrar recuadro de utilidades, márgenes y egresos"
                                  checked={roleConfig.uiVisibility.showFinancialKpisInReports ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showFinancialKpisInReports')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Gráficos de Tráfico"
                                  desc="Mostrar distribución horaria y gráficos de flujos"
                                  checked={roleConfig.uiVisibility.showTrafficChartsInReports ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showTrafficChartsInReports')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Panel de Registros de Auditoría"
                                  desc="Mostrar tabla detallada con bitácora interna"
                                  checked={roleConfig.uiVisibility.showAuditLogsPanel ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showAuditLogsPanel')}
                                />
                                <VisibilityCheckbox
                                  label="Ver KPIs de Rendimiento de Cajeros"
                                  desc="Estadísticas de eficiencia y cobros por operador"
                                  checked={roleConfig.uiVisibility.showEmployeeKpiWidget ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showEmployeeKpiWidget')}
                                />
                              </div>
                            </div>

                            {/* Ejecución Section */}
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                <Sliders className="w-3.5 h-3.5" />
                                ⚡ Acciones y Ejecución Operativa (¿Qué operaciones puede realizar?)
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                <PermissionCheckbox
                                  label="Ver Reportes en Vivo"
                                  desc="Visualizar reportes en tiempo real"
                                  checked={roleConfig.permissions.canViewReports}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canViewReports')}
                                />
                                <PermissionCheckbox
                                  label="Exportar a Excel / CSV / PDF"
                                  desc="Descargar consolidados e informes de auditoría"
                                  checked={roleConfig.permissions.canExportReports}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canExportReports')}
                                />
                                <PermissionCheckbox
                                  label="Consultar Logs de Auditoría"
                                  desc="Ver bitácora de auditoría detallada de acciones"
                                  checked={roleConfig.permissions.canViewAuditLogs ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canViewAuditLogs')}
                                />
                                <PermissionCheckbox
                                  label="Filtrar por Rango de Fechas"
                                  desc="Realizar búsquedas históricas con calendario libre"
                                  checked={roleConfig.permissions.canFilterReportDates ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canFilterReportDates')}
                                />
                                <PermissionCheckbox
                                  label="Borrar Auditoría / Purgar"
                                  desc="Eliminar bitácoras del sistema local (Acción Crítica)"
                                  checked={roleConfig.permissions.canDeleteAuditLogs ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canDeleteAuditLogs')}
                                />
                                <PermissionCheckbox
                                  label="Ver Eficiencia de Cajeros"
                                  desc="Analizar auditoría del desempeño individual del personal"
                                  checked={roleConfig.permissions.canViewEmployeePerformanceKpi ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canViewEmployeePerformanceKpi')}
                                />
                                <PermissionCheckbox
                                  label="Ver Margen de Utilidad General"
                                  desc="Visualizar costos y balance de utilidades totales netas"
                                  checked={roleConfig.permissions.canViewGeneralProfitMargin ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canViewGeneralProfitMargin')}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* MODULE 5: CONFIGURACIÓN Y PARÁMETROS DEL SISTEMA */}
                  {(() => {
                    const moduleEnabled = roleConfig.uiVisibility.showTabSettings;

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
                                Módulo 5: Configuración & Administración del Sistema
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                                  moduleEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                }`}>
                                  {moduleEnabled ? 'MÓDULO AUTORIZADO' : 'ACCESO DENEGADO'}
                                </span>
                              </h4>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                Edición de tarifas, medios de pago, datos de empresa, base de datos local y administración de usuarios.
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
                            {/* Vista Section */}
                            <div className="space-y-2">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" />
                                👁️ Control de Vista de Interfaz (¿Qué ve el usuario?)
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                <VisibilityCheckbox
                                  label="Ver Pestaña de Configuración"
                                  desc="Mostrar acceso de configuración general en el menú"
                                  checked={roleConfig.uiVisibility.showTabSettings}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showTabSettings')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Parámetros DIAN"
                                  desc="Mostrar sección de Facturación Electrónica DIAN"
                                  checked={roleConfig.uiVisibility.showInvoiceDianParams ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showInvoiceDianParams')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Parámetros de Red / Sockets"
                                  desc="Mostrar IPs, puertos de sockets y LAN/WAN de FarmaDesk Pro"
                                  checked={roleConfig.uiVisibility.showTechnicalNetworkParams ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showTechnicalNetworkParams')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Tabla de Sucursales"
                                  desc="Mostrar sucursales y estados en la sede central"
                                  checked={roleConfig.uiVisibility.showBranchesGrid ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showBranchesGrid')}
                                />
                                <VisibilityCheckbox
                                  label="Ver Tabla Puntos de Venta"
                                  desc="Mostrar puntos POS configurados en el sistema"
                                  checked={roleConfig.uiVisibility.showPosPointsGrid ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixVisibilityToggle('showPosPointsGrid')}
                                />
                              </div>
                            </div>

                            {/* Ejecución Section */}
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                <Sliders className="w-3.5 h-3.5" />
                                ⚡ Acciones y Ejecución Operativa (¿Qué operaciones puede realizar?)
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                <PermissionCheckbox
                                  label="Editar Tarifas & Tiempos"
                                  desc="Editar los precios del parqueadero y tolerancias"
                                  checked={roleConfig.permissions.canEditRates}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canEditRates')}
                                />
                                <PermissionCheckbox
                                  label="Gestionar Tipos de Vehículo"
                                  desc="Añadir categorías de vehículos y tarifas personalizadas"
                                  checked={roleConfig.permissions.canManageVehicleCategories ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canManageVehicleCategories')}
                                />
                                <PermissionCheckbox
                                  label="Editar Datos del Negocio"
                                  desc="Modificar NIT, razón social y texto del tique"
                                  checked={roleConfig.permissions.canEditBusinessInfo ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canEditBusinessInfo')}
                                />
                                <PermissionCheckbox
                                  label="Configurar Factura Electrónica DIAN"
                                  desc="Modificar parámetros fiscales de facturación DIAN"
                                  checked={roleConfig.permissions.canConfigureDianInvoicing ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canConfigureDianInvoicing')}
                                />
                                <PermissionCheckbox
                                  label="Configurar Medios de Pago & QR"
                                  desc="Cuentas bancarias, billeteras, BreB y datáfonos"
                                  checked={roleConfig.permissions.canConfigurePaymentMethods ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canConfigurePaymentMethods')}
                                />
                                <PermissionCheckbox
                                  label="Gestionar Base de Datos Local"
                                  desc="Exportar backups, restaurar copias de seguridad"
                                  checked={roleConfig.permissions.canManageDatabase}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canManageDatabase')}
                                />
                                <PermissionCheckbox
                                  label="Administrar Usuarios & Permisos"
                                  desc="Crear/editar cuentas de empleados (Reservado Maestro)"
                                  checked={roleConfig.permissions.canManageUsers}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canManageUsers')}
                                />
                                <PermissionCheckbox
                                  label="Acceso a Servidor Central"
                                  desc="Visualizar red de sucursales, telemetría y consolidación"
                                  checked={roleConfig.permissions.canAccessCentralHub ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canAccessCentralHub')}
                                />
                                <PermissionCheckbox
                                  label="Publicar Tarifas a Sucursales"
                                  desc="Emitir cambios de precios y egresos a sedes"
                                  checked={roleConfig.permissions.canPublishCentralUpdates ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canPublishCentralUpdates')}
                                />
                                <PermissionCheckbox
                                  label="Sincronizar con Sede Central"
                                  desc="Forzar sincronización bidireccional de la terminal"
                                  checked={roleConfig.permissions.canSyncWithCentralServer ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canSyncWithCentralServer')}
                                />
                                <PermissionCheckbox
                                  label="Actualizador de Software (OTA)"
                                  desc="Descargar e instalar versiones, hotpatches y módulos"
                                  checked={roleConfig.permissions.canPerformAppUpdates ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canPerformAppUpdates')}
                                />
                                <PermissionCheckbox
                                  label="Conmutar Sucursal en Pruebas"
                                  desc="Cambiar de sede activa en el entorno de simulación"
                                  checked={roleConfig.permissions.canSwitchBranchSimulation ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canSwitchBranchSimulation')}
                                />
                                <PermissionCheckbox
                                  label="Gestionar Sedes Físicas"
                                  desc="Añadir, editar o eliminar sucursales en la red"
                                  checked={roleConfig.permissions.canManageBranchLocations ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canManageBranchLocations')}
                                />
                                <PermissionCheckbox
                                  label="Personalizar Tema & Neón"
                                  desc="Configurar la visual del sistema y efectos visuales neón"
                                  checked={roleConfig.permissions.canConfigureSystemTheme ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canConfigureSystemTheme')}
                                />
                                <PermissionCheckbox
                                  label="Parámetros FarmaDesk LAN/WAN"
                                  desc="Configurar IPs, puertos de sockets y parámetros técnicos"
                                  checked={roleConfig.permissions.canConfigureTechnicalTerminalProps ?? false}
                                  disabled={isMaster}
                                  onChange={() => handleMatrixPermissionToggle('canConfigureTechnicalTerminalProps')}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
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
                      {/* Group 1: Pestañas Principales */}
                      <div className="bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                          <Eye className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
                          Visibilidad de Pestañas Superiores
                        </h4>

                        <VisibilityCheckbox
                          label="Mostrar Pestaña 'Operaciones'"
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
                          label="Mostrar Botón de Turno y Caja"
                          desc="Permite ver el botón para abrir el modal de estado de caja"
                          checked={formUiVisibility.showTabCash ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showTabCash')}
                        />
                      </div>

                      {/* Group 2: Widgets del Header & Métricas de Dinero */}
                      <div className="bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                          <EyeOff className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                          Métricas y Seguridad en Pantalla
                        </h4>

                        <VisibilityCheckbox
                          label="Mostrar Métrica de Dinero Recaudado en Encabezado"
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
                          label="Mostrar Acceso Rápido a Base de Datos"
                          desc="Botón directo a la consola de base de datos en el encabezado"
                          checked={formUiVisibility.showDatabaseButton ?? false}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showDatabaseButton')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Historial de Tickets Cobrados"
                          desc="Visualizar tabla inferior de vehículos que ya pagaron y salieron"
                          checked={formUiVisibility.showPaidTicketsHistory ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showPaidTicketsHistory')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Tarjetas de Resumen de Recaudo Diario"
                          desc="Oculta los recuadros de total en efectivo, tarjetas y transferencias"
                          checked={formUiVisibility.showDailySummaryCards ?? false}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showDailySummaryCards')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Desglose de Medios de Pago en Vivo"
                          desc="Si se apaga, no verá el desglose por medio de pago (Nequi, Tarjeta, Daviplata) hasta el arqueo final"
                          checked={formUiVisibility.showLivePaymentBreakdown ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showLivePaymentBreakdown')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Botón 'Configurar Medios' en Cobro"
                          desc="Permite acceder al asistente de configuración de cuentas y QR desde el panel de cobro"
                          checked={formUiVisibility.showConfigurePaymentMethodsButton ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showConfigurePaymentMethodsButton')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Botón 'Gestión de Plazas' en Encabezado y Mapa"
                          desc="Muestra el acceso al panel dedicado de creación y administración masiva de plazas de parqueo"
                          checked={formUiVisibility.showSpotsManagementButton ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showSpotsManagementButton')}
                        />

                        <VisibilityCheckbox
                          label="Mostrar Opción 'Recogida de Dinero' en Caja y Turnos"
                          desc="Muestra la opción para realizar salidas por concepto de recogida parcial de efectivo por seguridad"
                          checked={formUiVisibility.showCashPickupOption ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showCashPickupOption')}
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
                          label="Mostrar Insignia de Sucursal / Sede en Encabezado"
                          desc="Muestra el distintivo con el código y nombre de la sucursal activa en la parte superior"
                          checked={formUiVisibility.showBranchIdentifierBadge ?? true}
                          disabled={formRole === 'master'}
                          onChange={() => handleUiVisibilityToggle('showBranchIdentifierBadge')}
                        />
                      </div>

                      {/* Group 3: Políticas de Caja / Arqueo Ciego */}
                      <div className="col-span-1 md:col-span-2 bg-amber-500/5 p-4 rounded-xl border border-amber-500/20 space-y-3">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                          <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider font-mono">
                            Políticas de Control de Caja para este Perfil
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
                        </div>
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
