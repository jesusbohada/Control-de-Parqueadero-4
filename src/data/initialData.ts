import { 
  RatesConfig, 
  ParkingSpot, 
  ParkingTicket, 
  ParkingBusinessInfo, 
  CashShift,
  OperationalDay,
  UserPermissions,
  UserUIVisibility,
  UserRole,
  SystemUser,
  UserPermissionTemplate,
  PaymentGatewayConfig,
  VehicleCategoryConfig,
  ExpenseConcept,
  ExpenseCategory,
  BranchLocation,
  CentralUpdatePackage,
  SoftwareReleaseBuild,
  BranchSyncAuditRecord,
  SystemNodeConfig,
  Warehouse,
  PosPoint,
  RemoteExecutionOrder,
  CommercialAgreement
} from '../types';
import { DEFAULT_PAYMENT_GATEWAY_CONFIG } from '../utils/paymentUtils';
export { DEFAULT_PAYMENT_GATEWAY_CONFIG };

export const INITIAL_VEHICLE_CATEGORIES: VehicleCategoryConfig[] = [
  {
    id: 'car',
    name: 'Carro / Automóvil',
    icon: 'Car',
    enabled: true,
    color: '#3b82f6',
    rate: {
      minuteRate: 70,
      hourRate: 4200,
      dayRate: 28000,
      gracePeriodMinutes: 15,
      minimumChargeMinutes: 30,
      lostTicketFee: 15000,
    }
  },
  {
    id: 'motorcycle',
    name: 'Motocicleta',
    icon: 'Bike',
    enabled: true,
    color: '#10b981',
    rate: {
      minuteRate: 35,
      hourRate: 2100,
      dayRate: 15000,
      gracePeriodMinutes: 15,
      minimumChargeMinutes: 30,
      lostTicketFee: 10000,
    }
  },
  {
    id: 'suv',
    name: 'Camioneta / SUV',
    icon: 'Truck',
    enabled: true,
    color: '#f59e0b',
    rate: {
      minuteRate: 90,
      hourRate: 5400,
      dayRate: 36000,
      gracePeriodMinutes: 15,
      minimumChargeMinutes: 30,
      lostTicketFee: 20000,
    }
  },
  {
    id: 'bicycle',
    name: 'BUS',
    icon: 'Bus',
    enabled: true,
    color: '#8b5cf6',
    rate: {
      minuteRate: 100,
      hourRate: 6000,
      dayRate: 40000,
      gracePeriodMinutes: 15,
      minimumChargeMinutes: 30,
      lostTicketFee: 25000,
    }
  },
];

export const INITIAL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-op', name: 'Operación e Insumos', code: 'OP', description: 'Papelería, rollos térmicos, tiquetes y suministros de oficina', color: 'amber', isActive: true, isPreset: true },
  { id: 'cat-serv', name: 'Servicios Públicos y Conectividad', code: 'SERV', description: 'Energía eléctrica, agua, internet y telefonía', color: 'blue', isActive: true, isPreset: true },
  { id: 'cat-mant', name: 'Mantenimiento e Infraestructura', code: 'MANT', description: 'Reparaciones locativas, pintura, barreras y señalización', color: 'orange', isActive: true, isPreset: true },
  { id: 'cat-pers', name: 'Personal y Nómina', code: 'PERS', description: 'Anticipos de turno, alimentación, transporte y bienestar de empleados', color: 'purple', isActive: true, isPreset: true },
  { id: 'cat-aseo', name: 'Aseo y Limpieza', code: 'ASEO', description: 'Productos de desinfección, bolsas e implementos de aseo', color: 'emerald', isActive: true, isPreset: true },
  { id: 'cat-gen', name: 'Gastos Generales / Varios', code: 'GEN', description: 'Otros egresos operativos de caja menor', color: 'slate', isActive: true, isPreset: true },
];

export const INITIAL_EXPENSE_CONCEPTS: ExpenseConcept[] = [
  { id: 'exp-1', code: 'EXP-01', name: 'Papelería y Rollos Térmicos', category: 'Operación e Insumos', categoryId: 'cat-op', isActive: true, isPreset: true },
  { id: 'exp-2', code: 'EXP-02', name: 'Artículos de Aseo y Limpieza', category: 'Aseo y Limpieza', categoryId: 'cat-aseo', isActive: true, isPreset: true },
  { id: 'exp-3', code: 'EXP-03', name: 'Mantenimiento y Reparaciones Locativas', category: 'Mantenimiento e Infraestructura', categoryId: 'cat-mant', isActive: true, isPreset: true },
  { id: 'exp-4', code: 'EXP-04', name: 'Servicios Públicos / Conectividad Internet', category: 'Servicios Públicos y Conectividad', categoryId: 'cat-serv', isActive: true, isPreset: true },
  { id: 'exp-5', code: 'EXP-05', name: 'Anticipo de Turno / Nómina Empleado', category: 'Personal y Nómina', categoryId: 'cat-pers', isActive: true, isPreset: true },
  { id: 'exp-6', code: 'EXP-06', name: 'Cafetería y Alimentación de Turno', category: 'Personal y Nómina', categoryId: 'cat-pers', isActive: true, isPreset: true },
  { id: 'exp-7', code: 'EXP-07', name: 'Compra de Insumos y Repuestos de Barrera', category: 'Mantenimiento e Infraestructura', categoryId: 'cat-mant', isActive: true, isPreset: true },
  { id: 'exp-8', code: 'EXP-08', name: 'Otros Gastos Menores Autorizados', category: 'Gastos Generales / Varios', categoryId: 'cat-gen', isActive: true, isPreset: true },
];

export const DEFAULT_RATES: RatesConfig = {
  car: {
    minuteRate: 70, // ~$4,200/hr
    hourRate: 4200,
    dayRate: 28000,
    gracePeriodMinutes: 15,
    minimumChargeMinutes: 30,
    lostTicketFee: 15000,
  },
  motorcycle: {
    minuteRate: 35, // ~$2,100/hr
    hourRate: 2100,
    dayRate: 15000,
    gracePeriodMinutes: 15,
    minimumChargeMinutes: 30,
    lostTicketFee: 10000,
  },
  suv: {
    minuteRate: 90, // ~$5,400/hr
    hourRate: 5400,
    dayRate: 36000,
    gracePeriodMinutes: 15,
    minimumChargeMinutes: 30,
    lostTicketFee: 20000,
  },
  bicycle: {
    minuteRate: 15,
    hourRate: 1000,
    dayRate: 7000,
    gracePeriodMinutes: 15,
    minimumChargeMinutes: 0,
    lostTicketFee: 5000,
  },
  categories: INITIAL_VEHICLE_CATEGORIES,
  lostTicketFee: 15000,
  roundingMethod: 'fraction_15', // 'fraction_15' | 'exact' | 'fraction_30' | 'next_hour'
  taxPercentage: 0, // In many local parking systems tax is included or 0
  currencySymbol: '$',
};

export const DEFAULT_BUSINESS_INFO: ParkingBusinessInfo = {
  name: 'Estacionamiento Central & Terminal',
  branchName: 'Sucursal Principal',
  sucursal: 'Sucursal Principal',
  nit: '901.458.723-1',
  address: 'Av. Libertador # 45 - 20, Zona Centro',
  phone: '(+57) 310 892 4511',
  ticketFooter: 'Conserve este ticket. No nos hacemos responsables por objetos personales dejados en el vehículo no declarados al ingresar. Horario: 24 Horas.',
  autoPrintOnEntry: true,
  autoPrintOnExit: true,
  autoPrintOnShiftClose: true,
  autoPrintOnDayClose: true,
  silentBackgroundPrint: true,
  defaultPrinterName: 'SAT 22TUS',
  defaultPaperWidth: '80mm',
  openCashDrawerOnCashPayment: true,
  cutPaperOnPrint: true,
  soundAlerts: true,
  enableCommercialAgreements: false,
  logoUrl: '/assets/wolfzone_logo_farmanorte.jpg',
  emissionDate: '26 de septiembre de 2026',
  fechaEmision: '26 de septiembre de 2026',
  // Facturación Electrónica DIAN
  electronicInvoicingEnabled: true,
  dianEmissionMode: 'simulator',
  dianProvider: 'factus',
  dianProviderApiUrl: 'https://api.factus.com.co/v1',
  dianProviderApiKey: '',
  dianCertUploaded: false,
  dianCertFileName: '',
  dianSoftwarePin: '12345',
  dianResolutionNumber: '18764002918234',
  dianPrefix: 'FE-',
  dianFromNumber: 1,
  dianToNumber: 50000,
  dianCurrentNumber: 1042,
  dianResolutionDate: '2026-01-15',
  dianEnvironment: 'prod',
  dianSoftwareId: 'soft-wz-84920',
  dianTechnicalKey: 'fc81e2803b8744b7a1f6c49925208f23',
};

export const INITIAL_SPOTS: ParkingSpot[] = [
  // Cars (A01 - A18)
  { id: 'spot-a01', code: 'A-01', type: 'car', status: 'available' },
  { id: 'spot-a02', code: 'A-02', type: 'car', status: 'available' },
  { id: 'spot-a03', code: 'A-03', type: 'car', status: 'available' },
  { id: 'spot-a04', code: 'A-04', type: 'car', status: 'available' },
  { id: 'spot-a05', code: 'A-05', type: 'car', status: 'available' },
  { id: 'spot-a06', code: 'A-06', type: 'car', status: 'available' },
  { id: 'spot-a07', code: 'A-07', type: 'car', status: 'available' },
  { id: 'spot-a08', code: 'A-08', type: 'car', status: 'available' },
  { id: 'spot-a09', code: 'A-09', type: 'car', status: 'available' },
  { id: 'spot-a10', code: 'A-10', type: 'car', status: 'available' },
  { id: 'spot-a11', code: 'A-11', type: 'car', status: 'available' },
  { id: 'spot-a12', code: 'A-12', type: 'car', status: 'available' },
  { id: 'spot-a13', code: 'A-13', type: 'car', status: 'available' },
  { id: 'spot-a14', code: 'A-14', type: 'car', status: 'available' },
  { id: 'spot-a15', code: 'A-15', type: 'car', status: 'available' },
  { id: 'spot-a16', code: 'A-16', type: 'car', status: 'available' },
  { id: 'spot-a17', code: 'A-17', type: 'car', status: 'available' },
  { id: 'spot-a18', code: 'A-18', type: 'car', status: 'available' },

  // Motorcycles (M01 - M10)
  { id: 'spot-m01', code: 'M-01', type: 'motorcycle', status: 'available' },
  { id: 'spot-m02', code: 'M-02', type: 'motorcycle', status: 'available' },
  { id: 'spot-m03', code: 'M-03', type: 'motorcycle', status: 'available' },
  { id: 'spot-m04', code: 'M-04', type: 'motorcycle', status: 'available' },
  { id: 'spot-m05', code: 'M-05', type: 'motorcycle', status: 'available' },
  { id: 'spot-m06', code: 'M-06', type: 'motorcycle', status: 'available' },
  { id: 'spot-m07', code: 'M-07', type: 'motorcycle', status: 'available' },
  { id: 'spot-m08', code: 'M-08', type: 'motorcycle', status: 'available' },
  { id: 'spot-m09', code: 'M-09', type: 'motorcycle', status: 'available' },
  { id: 'spot-m10', code: 'M-10', type: 'motorcycle', status: 'available' },

  // SUVs / Camionetas (S01 - S04)
  { id: 'spot-s01', code: 'S-01', type: 'suv', status: 'available' },
  { id: 'spot-s02', code: 'S-02', type: 'suv', status: 'available' },
  { id: 'spot-s03', code: 'S-03', type: 'suv', status: 'available' },
  { id: 'spot-s04', code: 'S-04', type: 'suv', status: 'available' },

  // Bicycles (B01 - B04)
  { id: 'spot-b01', code: 'B-01', type: 'bicycle', status: 'available' },
  { id: 'spot-b02', code: 'B-02', type: 'bicycle', status: 'available' },
  { id: 'spot-b03', code: 'B-03', type: 'bicycle', status: 'available' },
  { id: 'spot-b04', code: 'B-04', type: 'bicycle', status: 'available' },
];

export const INITIAL_ACTIVE_TICKETS: ParkingTicket[] = [];

export const INITIAL_PAID_TICKETS: ParkingTicket[] = [];

export const INITIAL_OPERATIONAL_DAY: OperationalDay = {
  id: 'day-clean-01',
  dayNumber: 0,
  date: new Date().toISOString().split('T')[0],
  formattedDate: new Date().toLocaleDateString('es-CO'),
  openedAt: new Date().toISOString(),
  status: 'closed',
  initialDayCash: 0,
  totalCollected: 0,
  shiftsCount: 0,
};

export const INITIAL_CASH_SHIFT: CashShift = {
  id: 'shift-init',
  shiftNumber: 0,
  operationalDayId: 'day-clean-01',
  operationalDayNumber: 0,
  operatorName: '',
  startTime: new Date().toISOString(),
  initialCash: 0,
  finalCountedCash: 0,
  status: 'closed',
  cashMovements: [],
};

// --- Default UI Visibility Configurations ---
export const DEFAULT_MASTER_UI_VISIBILITY: UserUIVisibility = {
  // Encabezado
  showTopRevenueMetrics: true,
  showOccupancyWidget: true,
  showDatabaseButton: true,
  showUsersManagementButton: true,
  showOperationalDayBadge: true,
  showLiveClockWidget: true,
  showCentralHubButton: true,
  showBranchSyncButton: true,
  showAppUpdaterButton: true,
  showBranchIdentifierBadge: true,

  // Pestañas Principales
  showTabOperations: true,
  showTabMap: true,
  showTabReports: true,
  showTabCash: true,
  showTabSettings: true,

  // Operaciones
  showDailySummaryCards: true,
  showVehiclesInYardMetric: true,
  showTurnRevenueMetric: true,
  showPaidTicketsHistory: true,
  showConfigurePaymentMethodsButton: true,
  showOpenCashDrawerButton: true,
  showAnprCameraWidget: true,

  // Mapa
  showSpotsManagementButton: true,
  showVncRemoteDesktopButton: true,

  // Caja
  showCashDrawerBalance: true,
  showLivePaymentBreakdown: true,
  showCashPickupOption: true,
  showCashShiftsHistory: true,
  showWarehousesGrid: true,

  // Reportes
  showFinancialKpisInReports: true,
  showTrafficChartsInReports: true,
  showAuditLogsPanel: true,
  showEmployeeKpiWidget: true,

  // Configuración
  showInvoiceDianParams: true,
  showTechnicalNetworkParams: true,
  showBranchesGrid: true,
  showPosPointsGrid: true,
};

export const DEFAULT_SUPERVISOR_UI_VISIBILITY: UserUIVisibility = {
  // Encabezado
  showTopRevenueMetrics: true,
  showOccupancyWidget: true,
  showDatabaseButton: false,
  showUsersManagementButton: false,
  showOperationalDayBadge: true,
  showLiveClockWidget: true,
  showCentralHubButton: true,
  showBranchSyncButton: true,
  showAppUpdaterButton: true,
  showBranchIdentifierBadge: true,

  // Pestañas Principales
  showTabOperations: true,
  showTabMap: true,
  showTabReports: true,
  showTabCash: true,
  showTabSettings: false,

  // Operaciones
  showDailySummaryCards: true,
  showVehiclesInYardMetric: true,
  showTurnRevenueMetric: true,
  showPaidTicketsHistory: true,
  showConfigurePaymentMethodsButton: true,
  showOpenCashDrawerButton: true,
  showAnprCameraWidget: true,

  // Mapa
  showSpotsManagementButton: true,
  showVncRemoteDesktopButton: true,

  // Caja
  showCashDrawerBalance: true,
  showLivePaymentBreakdown: true,
  showCashPickupOption: true,
  showCashShiftsHistory: true,
  showWarehousesGrid: false,

  // Reportes
  showFinancialKpisInReports: true,
  showTrafficChartsInReports: true,
  showAuditLogsPanel: true,
  showEmployeeKpiWidget: true,

  // Configuración
  showInvoiceDianParams: false,
  showTechnicalNetworkParams: false,
  showBranchesGrid: false,
  showPosPointsGrid: false,
};

export const DEFAULT_CASHIER_UI_VISIBILITY: UserUIVisibility = {
  // Encabezado
  showTopRevenueMetrics: false, // Por seguridad no ve el recaudo acumulado general en vivo
  showOccupancyWidget: true,
  showDatabaseButton: false,
  showUsersManagementButton: false,
  showOperationalDayBadge: true,
  showLiveClockWidget: true,
  showCentralHubButton: false,
  showBranchSyncButton: true, // Para poder pulsar sincronizar si el supervisor lo requiere
  showAppUpdaterButton: false,
  showBranchIdentifierBadge: true,

  // Pestañas Principales
  showTabOperations: true,
  showTabMap: true,
  showTabReports: false,
  showTabCash: true,
  showTabSettings: false,

  // Operaciones
  showDailySummaryCards: false, // Ocultar cifras globales en turno de cajero básico
  showVehiclesInYardMetric: true,
  showTurnRevenueMetric: false,
  showPaidTicketsHistory: true,
  showConfigurePaymentMethodsButton: false,
  showOpenCashDrawerButton: false,
  showAnprCameraWidget: false,

  // Mapa
  showSpotsManagementButton: false,
  showVncRemoteDesktopButton: false,

  // Caja
  showCashDrawerBalance: false, // Arqueo ciego - no ve el saldo teórico en gaveta
  showLivePaymentBreakdown: false, // Ocultar medios de pago hasta el arqueo final
  showCashPickupOption: true, // Permitir ver opción de recogida
  showCashShiftsHistory: true, // Permitir ver histórico de cierres
  showWarehousesGrid: false,

  // Reportes
  showFinancialKpisInReports: false,
  showTrafficChartsInReports: false,
  showAuditLogsPanel: false,
  showEmployeeKpiWidget: false,

  // Configuración
  showInvoiceDianParams: false,
  showTechnicalNetworkParams: false,
  showBranchesGrid: false,
  showPosPointsGrid: false,
};

// --- Default Permissions Configuration ---
export const DEFAULT_MASTER_PERMISSIONS: UserPermissions = {
  // Operaciones y Cobro
  canRegisterEntry: true,
  canRegisterExit: true,
  canCancelTicket: true,
  canApplyDiscounts: true,
  canWaiveFee: true,
  canReprintTickets: true,
  canManualSpotSelect: true,
  canProcessLostTicket: true,
  canApplyLostTicketFee: true,
  canChangePaymentMethod: true,
  canConfigurePaymentMethods: true,
  canIssueElectronicInvoice: true,
  canOpenCashDrawerWithoutSale: true,
  canEditActiveTicketPlate: true,
  canApplyManualRateOverride: true,
  canForceRegisterExit: true,
  canViewANPRCameraModule: true,

  // Control de Plazas y Patio
  canViewMap: true,
  canChangeSpotStatus: true,
  canForceReleaseSpot: true,
  canManageSpots: true,
  canReserveSpots: true,
  canViewVncRemoteDesktop: true,
  canExecuteRemoteOrders: true,

  // Caja y Movimientos
  canManageCashShift: true,
  canWithdrawCash: true,
  canDepositCash: true,
  canPickupCash: true,
  canManageExpenseConcepts: true,
  canCloseOperationalDay: true,
  canAuditCashShifts: true,
  blindCashCount: false,
  canViewLiveFinancialBreakdown: true,
  canViewOperationalDayInHistory: true,
  canViewConsecutiveInHistory: true,
  canViewCashShiftsHistory: true,
  canEditClosedShifts: true,
  canConfigureExpenseCategories: true,
  canManageWarehouses: true,
  canManagePosPoints: true,
  canViewShiftClosingDiscrepancies: true,

  // Reportes y Auditoría
  canViewReports: true,
  canExportReports: true,
  canViewAuditLogs: true,
  canFilterReportDates: true,
  canDeleteAuditLogs: true,
  canViewEmployeePerformanceKpi: true,
  canViewGeneralProfitMargin: true,

  // Configuración, Sucursales y Servidor Central
  canEditRates: true,
  canManageVehicleCategories: true,
  canEditBusinessInfo: true,
  canConfigureDianInvoicing: true,
  canManageDatabase: true,
  canManageUsers: true,
  canAccessCentralHub: true,
  canPublishCentralUpdates: true,
  canSyncWithCentralServer: true,
  canPerformAppUpdates: true,
  canSwitchBranchSimulation: true,
  canManageBranchLocations: true,
  canConfigureSystemTheme: true,
  canConfigureTechnicalTerminalProps: true,
  uiVisibility: { ...DEFAULT_MASTER_UI_VISIBILITY },
};

export const DEFAULT_SUPERVISOR_PERMISSIONS: UserPermissions = {
  // Operaciones y Cobro
  canRegisterEntry: true,
  canRegisterExit: true,
  canCancelTicket: true,
  canApplyDiscounts: true,
  canWaiveFee: true,
  canReprintTickets: true,
  canManualSpotSelect: true,
  canProcessLostTicket: true,
  canApplyLostTicketFee: true,
  canChangePaymentMethod: true,
  canConfigurePaymentMethods: true,
  canIssueElectronicInvoice: true,
  canOpenCashDrawerWithoutSale: true,
  canEditActiveTicketPlate: true,
  canApplyManualRateOverride: false,
  canForceRegisterExit: true,
  canViewANPRCameraModule: true,

  // Control de Plazas y Patio
  canViewMap: true,
  canChangeSpotStatus: true,
  canForceReleaseSpot: true,
  canManageSpots: true,
  canReserveSpots: true,
  canViewVncRemoteDesktop: true,
  canExecuteRemoteOrders: true,

  // Caja y Movimientos
  canManageCashShift: true,
  canWithdrawCash: true,
  canDepositCash: true,
  canPickupCash: true,
  canManageExpenseConcepts: true,
  canCloseOperationalDay: true,
  canAuditCashShifts: true,
  blindCashCount: false,
  canViewLiveFinancialBreakdown: true,
  canViewOperationalDayInHistory: true,
  canViewConsecutiveInHistory: true,
  canViewCashShiftsHistory: true,
  canEditClosedShifts: false,
  canConfigureExpenseCategories: false,
  canManageWarehouses: false,
  canManagePosPoints: false,
  canViewShiftClosingDiscrepancies: true,

  // Reportes y Auditoría
  canViewReports: true,
  canExportReports: true,
  canViewAuditLogs: true,
  canFilterReportDates: true,
  canDeleteAuditLogs: false,
  canViewEmployeePerformanceKpi: true,
  canViewGeneralProfitMargin: true,

  // Configuración, Sucursales y Servidor Central
  canEditRates: false,
  canManageVehicleCategories: false,
  canEditBusinessInfo: false,
  canConfigureDianInvoicing: false,
  canManageDatabase: false,
  canManageUsers: false,
  canAccessCentralHub: true,
  canPublishCentralUpdates: false,
  canSyncWithCentralServer: true,
  canPerformAppUpdates: true,
  canSwitchBranchSimulation: true,
  canManageBranchLocations: false,
  canConfigureSystemTheme: true,
  canConfigureTechnicalTerminalProps: false,
  uiVisibility: { ...DEFAULT_SUPERVISOR_UI_VISIBILITY },
};

export const DEFAULT_CASHIER_PERMISSIONS: UserPermissions = {
  // Operaciones y Cobro
  canRegisterEntry: true,
  canRegisterExit: true,
  canCancelTicket: false,
  canApplyDiscounts: false,
  canWaiveFee: false,
  canReprintTickets: true,
  canManualSpotSelect: false,
  canProcessLostTicket: false,
  canApplyLostTicketFee: true,
  canChangePaymentMethod: true,
  canConfigurePaymentMethods: false,
  canIssueElectronicInvoice: false,
  canOpenCashDrawerWithoutSale: false,
  canEditActiveTicketPlate: false,
  canApplyManualRateOverride: false,
  canForceRegisterExit: false,
  canViewANPRCameraModule: false,

  // Control de Plazas y Patio
  canViewMap: true,
  canChangeSpotStatus: false,
  canForceReleaseSpot: false,
  canManageSpots: false,
  canReserveSpots: false,
  canViewVncRemoteDesktop: false,
  canExecuteRemoteOrders: false,

  // Caja y Movimientos
  canManageCashShift: true,
  canWithdrawCash: true, // Puede registrar gastos seleccionando de la lista de conceptos
  canDepositCash: false,
  canPickupCash: true, // Puede realizar recogidas parciales
  canManageExpenseConcepts: false, // NO puede crear/editar conceptos de gastos
  canCloseOperationalDay: false, // NO puede hacer cierre definitivo de día
  canAuditCashShifts: false, // NO puede auditar/recalcular cierres
  blindCashCount: true, // Arqueo ciego para mayor transparencia
  canViewLiveFinancialBreakdown: false, // Desglose financiero oculto durante el turno
  canViewOperationalDayInHistory: true,
  canViewConsecutiveInHistory: true,
  canViewCashShiftsHistory: true,
  canEditClosedShifts: false,
  canConfigureExpenseCategories: false,
  canManageWarehouses: false,
  canManagePosPoints: false,
  canViewShiftClosingDiscrepancies: false,

  // Reportes y Auditoría
  canViewReports: false,
  canExportReports: false,
  canViewAuditLogs: false,
  canFilterReportDates: false,
  canDeleteAuditLogs: false,
  canViewEmployeePerformanceKpi: false,
  canViewGeneralProfitMargin: false,

  // Configuración, Sucursales y Servidor Central
  canEditRates: false,
  canManageVehicleCategories: false,
  canEditBusinessInfo: false,
  canConfigureDianInvoicing: false,
  canManageDatabase: false,
  canManageUsers: false,
  canAccessCentralHub: false,
  canPublishCentralUpdates: false,
  canSyncWithCentralServer: true,
  canPerformAppUpdates: false,
  canSwitchBranchSimulation: false,
  canManageBranchLocations: false,
  canConfigureSystemTheme: false,
  canConfigureTechnicalTerminalProps: false,
  uiVisibility: { ...DEFAULT_CASHIER_UI_VISIBILITY },
};

export const normalizeUserPermissions = (perms?: Partial<UserPermissions>, role?: UserRole): UserPermissions => {
  const fallback = role === 'master' 
    ? DEFAULT_MASTER_PERMISSIONS 
    : role === 'supervisor' 
    ? DEFAULT_SUPERVISOR_PERMISSIONS 
    : DEFAULT_CASHIER_PERMISSIONS;

  if (!perms) return { ...fallback };

  const fallbackUi = fallback.uiVisibility || DEFAULT_CASHIER_UI_VISIBILITY;
  const userUi: Partial<UserUIVisibility> = perms.uiVisibility || {};

  return {
    canRegisterEntry: perms.canRegisterEntry ?? fallback.canRegisterEntry,
    canRegisterExit: perms.canRegisterExit ?? fallback.canRegisterExit,
    canCancelTicket: perms.canCancelTicket ?? fallback.canCancelTicket,
    canApplyDiscounts: perms.canApplyDiscounts ?? fallback.canApplyDiscounts,
    canWaiveFee: perms.canWaiveFee ?? fallback.canWaiveFee ?? (role === 'master' || role === 'supervisor'),
    canReprintTickets: perms.canReprintTickets ?? fallback.canReprintTickets ?? true,
    canManualSpotSelect: perms.canManualSpotSelect ?? fallback.canManualSpotSelect ?? (role === 'master' || role === 'supervisor'),
    canProcessLostTicket: perms.canProcessLostTicket ?? fallback.canProcessLostTicket ?? (role === 'master' || role === 'supervisor'),
    canApplyLostTicketFee: perms.canApplyLostTicketFee ?? fallback.canApplyLostTicketFee ?? true,
    canChangePaymentMethod: perms.canChangePaymentMethod ?? fallback.canChangePaymentMethod ?? true,
    canConfigurePaymentMethods: perms.canConfigurePaymentMethods ?? fallback.canConfigurePaymentMethods ?? (role === 'master' || role === 'supervisor'),
    canIssueElectronicInvoice: perms.canIssueElectronicInvoice ?? fallback.canIssueElectronicInvoice ?? (role === 'master' || role === 'supervisor'),
    canOpenCashDrawerWithoutSale: perms.canOpenCashDrawerWithoutSale ?? fallback.canOpenCashDrawerWithoutSale ?? (role === 'master' || role === 'supervisor'),
    canEditActiveTicketPlate: perms.canEditActiveTicketPlate ?? fallback.canEditActiveTicketPlate ?? (role === 'master' || role === 'supervisor'),
    canApplyManualRateOverride: perms.canApplyManualRateOverride ?? fallback.canApplyManualRateOverride ?? (role === 'master'),
    canForceRegisterExit: perms.canForceRegisterExit ?? fallback.canForceRegisterExit ?? (role === 'master' || role === 'supervisor'),
    canViewANPRCameraModule: perms.canViewANPRCameraModule ?? fallback.canViewANPRCameraModule ?? (role === 'master' || role === 'supervisor'),

    canViewMap: perms.canViewMap ?? fallback.canViewMap,
    canChangeSpotStatus: perms.canChangeSpotStatus ?? fallback.canChangeSpotStatus,
    canForceReleaseSpot: perms.canForceReleaseSpot ?? fallback.canForceReleaseSpot ?? (role === 'master' || role === 'supervisor'),
    canManageSpots: perms.canManageSpots ?? fallback.canManageSpots ?? (role === 'master' || role === 'supervisor'),
    canReserveSpots: perms.canReserveSpots ?? fallback.canReserveSpots ?? (role === 'master' || role === 'supervisor'),
    canViewVncRemoteDesktop: perms.canViewVncRemoteDesktop ?? fallback.canViewVncRemoteDesktop ?? (role === 'master' || role === 'supervisor'),
    canExecuteRemoteOrders: perms.canExecuteRemoteOrders ?? fallback.canExecuteRemoteOrders ?? (role === 'master' || role === 'supervisor'),

    canManageCashShift: perms.canManageCashShift ?? fallback.canManageCashShift,
    canWithdrawCash: perms.canWithdrawCash ?? fallback.canWithdrawCash,
    canDepositCash: perms.canDepositCash ?? fallback.canDepositCash ?? (role === 'master' || role === 'supervisor'),
    canPickupCash: perms.canPickupCash ?? fallback.canPickupCash ?? true,
    canManageExpenseConcepts: perms.canManageExpenseConcepts ?? fallback.canManageExpenseConcepts ?? (role === 'master' || role === 'supervisor'),
    canCloseOperationalDay: perms.canCloseOperationalDay ?? fallback.canCloseOperationalDay ?? (role === 'master' || role === 'supervisor'),
    canAuditCashShifts: perms.canAuditCashShifts ?? fallback.canAuditCashShifts ?? (role === 'master' || role === 'supervisor'),
    blindCashCount: perms.blindCashCount ?? fallback.blindCashCount ?? (role === 'cashier'),
    canViewLiveFinancialBreakdown: perms.canViewLiveFinancialBreakdown ?? fallback.canViewLiveFinancialBreakdown ?? (role !== 'cashier'),
    canViewOperationalDayInHistory: perms.canViewOperationalDayInHistory ?? fallback.canViewOperationalDayInHistory ?? true,
    canViewConsecutiveInHistory: perms.canViewConsecutiveInHistory ?? fallback.canViewConsecutiveInHistory ?? true,
    canViewCashShiftsHistory: perms.canViewCashShiftsHistory ?? fallback.canViewCashShiftsHistory ?? (role !== 'cashier'),
    canEditClosedShifts: perms.canEditClosedShifts ?? fallback.canEditClosedShifts ?? (role === 'master'),
    canConfigureExpenseCategories: perms.canConfigureExpenseCategories ?? fallback.canConfigureExpenseCategories ?? (role === 'master'),
    canManageWarehouses: perms.canManageWarehouses ?? fallback.canManageWarehouses ?? (role === 'master'),
    canManagePosPoints: perms.canManagePosPoints ?? fallback.canManagePosPoints ?? (role === 'master'),
    canViewShiftClosingDiscrepancies: perms.canViewShiftClosingDiscrepancies ?? fallback.canViewShiftClosingDiscrepancies ?? (role === 'master' || role === 'supervisor'),

    canViewReports: perms.canViewReports ?? fallback.canViewReports,
    canExportReports: perms.canExportReports ?? fallback.canExportReports,
    canViewAuditLogs: perms.canViewAuditLogs ?? fallback.canViewAuditLogs ?? (role === 'master' || role === 'supervisor'),
    canFilterReportDates: perms.canFilterReportDates ?? fallback.canFilterReportDates ?? (role === 'master' || role === 'supervisor'),
    canDeleteAuditLogs: perms.canDeleteAuditLogs ?? fallback.canDeleteAuditLogs ?? (role === 'master'),
    canViewEmployeePerformanceKpi: perms.canViewEmployeePerformanceKpi ?? fallback.canViewEmployeePerformanceKpi ?? (role === 'master' || role === 'supervisor'),
    canViewGeneralProfitMargin: perms.canViewGeneralProfitMargin ?? fallback.canViewGeneralProfitMargin ?? (role === 'master' || role === 'supervisor'),

    canEditRates: perms.canEditRates ?? fallback.canEditRates,
    canManageVehicleCategories: perms.canManageVehicleCategories ?? fallback.canManageVehicleCategories ?? (role === 'master'),
    canEditBusinessInfo: perms.canEditBusinessInfo ?? fallback.canEditBusinessInfo ?? (role === 'master'),
    canConfigureDianInvoicing: perms.canConfigureDianInvoicing ?? fallback.canConfigureDianInvoicing ?? (role === 'master'),
    canManageDatabase: perms.canManageDatabase ?? fallback.canManageDatabase,
    canManageUsers: perms.canManageUsers ?? fallback.canManageUsers,
    canAccessCentralHub: perms.canAccessCentralHub ?? fallback.canAccessCentralHub ?? (role === 'master' || role === 'supervisor'),
    canPublishCentralUpdates: perms.canPublishCentralUpdates ?? fallback.canPublishCentralUpdates ?? (role === 'master'),
    canSyncWithCentralServer: perms.canSyncWithCentralServer ?? fallback.canSyncWithCentralServer ?? true,
    canPerformAppUpdates: perms.canPerformAppUpdates ?? fallback.canPerformAppUpdates ?? (role === 'master' || role === 'supervisor'),
    canSwitchBranchSimulation: perms.canSwitchBranchSimulation ?? fallback.canSwitchBranchSimulation ?? (role === 'master' || role === 'supervisor'),
    canManageBranchLocations: perms.canManageBranchLocations ?? fallback.canManageBranchLocations ?? (role === 'master'),
    canConfigureSystemTheme: perms.canConfigureSystemTheme ?? fallback.canConfigureSystemTheme ?? (role === 'master' || role === 'supervisor'),
    canConfigureTechnicalTerminalProps: perms.canConfigureTechnicalTerminalProps ?? fallback.canConfigureTechnicalTerminalProps ?? (role === 'master'),

    uiVisibility: {
      showTopRevenueMetrics: userUi.showTopRevenueMetrics ?? fallbackUi.showTopRevenueMetrics,
      showOccupancyWidget: userUi.showOccupancyWidget ?? fallbackUi.showOccupancyWidget,
      showDatabaseButton: userUi.showDatabaseButton ?? fallbackUi.showDatabaseButton,
      showUsersManagementButton: userUi.showUsersManagementButton ?? fallbackUi.showUsersManagementButton ?? (role === 'master'),
      showOperationalDayBadge: userUi.showOperationalDayBadge ?? fallbackUi.showOperationalDayBadge ?? true,
      showLiveClockWidget: userUi.showLiveClockWidget ?? fallbackUi.showLiveClockWidget ?? true,
      showCentralHubButton: userUi.showCentralHubButton ?? fallbackUi.showCentralHubButton ?? (role === 'master' || role === 'supervisor'),
      showBranchSyncButton: userUi.showBranchSyncButton ?? fallbackUi.showBranchSyncButton ?? true,
      showAppUpdaterButton: userUi.showAppUpdaterButton ?? fallbackUi.showAppUpdaterButton ?? (role === 'master' || role === 'supervisor'),
      showBranchIdentifierBadge: userUi.showBranchIdentifierBadge ?? fallbackUi.showBranchIdentifierBadge ?? true,

      showTabOperations: userUi.showTabOperations ?? fallbackUi.showTabOperations,
      showTabMap: userUi.showTabMap ?? fallbackUi.showTabMap,
      showTabReports: userUi.showTabReports ?? fallbackUi.showTabReports,
      showTabCash: userUi.showTabCash ?? fallbackUi.showTabCash,
      showTabSettings: userUi.showTabSettings ?? fallbackUi.showTabSettings,

      showDailySummaryCards: userUi.showDailySummaryCards ?? fallbackUi.showDailySummaryCards,
      showVehiclesInYardMetric: userUi.showVehiclesInYardMetric ?? fallbackUi.showVehiclesInYardMetric ?? true,
      showTurnRevenueMetric: userUi.showTurnRevenueMetric ?? fallbackUi.showTurnRevenueMetric ?? (role !== 'cashier'),
      showPaidTicketsHistory: userUi.showPaidTicketsHistory ?? fallbackUi.showPaidTicketsHistory,
      showConfigurePaymentMethodsButton: userUi.showConfigurePaymentMethodsButton ?? fallbackUi.showConfigurePaymentMethodsButton,
      showOpenCashDrawerButton: userUi.showOpenCashDrawerButton ?? fallbackUi.showOpenCashDrawerButton ?? (role === 'master' || role === 'supervisor'),
      showAnprCameraWidget: userUi.showAnprCameraWidget ?? fallbackUi.showAnprCameraWidget ?? (role === 'master' || role === 'supervisor'),

      showSpotsManagementButton: userUi.showSpotsManagementButton ?? fallbackUi.showSpotsManagementButton,
      showVncRemoteDesktopButton: userUi.showVncRemoteDesktopButton ?? fallbackUi.showVncRemoteDesktopButton ?? (role === 'master' || role === 'supervisor'),

      showCashDrawerBalance: userUi.showCashDrawerBalance ?? fallbackUi.showCashDrawerBalance,
      showLivePaymentBreakdown: userUi.showLivePaymentBreakdown ?? fallbackUi.showLivePaymentBreakdown,
      showCashPickupOption: userUi.showCashPickupOption ?? fallbackUi.showCashPickupOption,
      showCashShiftsHistory: userUi.showCashShiftsHistory ?? fallbackUi.showCashShiftsHistory,
      showWarehousesGrid: userUi.showWarehousesGrid ?? fallbackUi.showWarehousesGrid ?? (role === 'master'),

      showFinancialKpisInReports: userUi.showFinancialKpisInReports ?? fallbackUi.showFinancialKpisInReports ?? (role !== 'cashier'),
      showTrafficChartsInReports: userUi.showTrafficChartsInReports ?? fallbackUi.showTrafficChartsInReports ?? true,
      showAuditLogsPanel: userUi.showAuditLogsPanel ?? fallbackUi.showAuditLogsPanel ?? (role === 'master' || role === 'supervisor'),
      showEmployeeKpiWidget: userUi.showEmployeeKpiWidget ?? fallbackUi.showEmployeeKpiWidget ?? (role === 'master' || role === 'supervisor'),

      showInvoiceDianParams: userUi.showInvoiceDianParams ?? fallbackUi.showInvoiceDianParams ?? (role === 'master'),
      showTechnicalNetworkParams: userUi.showTechnicalNetworkParams ?? fallbackUi.showTechnicalNetworkParams ?? (role === 'master'),
      showBranchesGrid: userUi.showBranchesGrid ?? fallbackUi.showBranchesGrid ?? (role === 'master'),
      showPosPointsGrid: userUi.showPosPointsGrid ?? fallbackUi.showPosPointsGrid ?? (role === 'master'),
    }
  };
};

export const normalizeUser = (user: SystemUser): SystemUser => {
  if (!user) return user;
  return {
    ...user,
    permissions: normalizeUserPermissions(user.permissions, user.role),
  };
};

export const INITIAL_USERS: SystemUser[] = [
  {
    id: 'user-master-01',
    username: 'admin',
    name: 'Administrador Maestro',
    password: 'admin123',
    role: 'master',
    isActive: true,
    permissions: { ...DEFAULT_MASTER_PERMISSIONS },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-supervisor-01',
    username: 'supervisor',
    name: 'Supervisor de Patio',
    password: 'super123',
    role: 'supervisor',
    isActive: true,
    permissions: { ...DEFAULT_SUPERVISOR_PERMISSIONS },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-cashier-01',
    username: 'cajero',
    name: 'Carlos Mendoza (Cajero)',
    password: 'caja123',
    role: 'cashier',
    isActive: true,
    permissions: { ...DEFAULT_CASHIER_PERMISSIONS },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-cashier-02',
    username: 'caja',
    name: 'Operador de Turno',
    password: 'caja',
    role: 'cashier',
    isActive: true,
    permissions: { ...DEFAULT_CASHIER_PERMISSIONS },
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_USER_TEMPLATES: UserPermissionTemplate[] = [
  {
    id: 'tmpl-cashier-blind',
    name: 'Cajero Estándar (Arqueo Ciego)',
    description: 'Cobro y entradas normales. Oculta recaudos globales y saldo en gaveta. Arqueo ciego obligatorio.',
    role: 'cashier',
    isSystem: true,
    createdAt: new Date().toISOString(),
    permissions: {
      ...DEFAULT_CASHIER_PERMISSIONS,
      blindCashCount: true,
      canApplyDiscounts: false,
      canWaiveFee: false,
      canWithdrawCash: false,
      canDepositCash: false,
      canManualSpotSelect: false,
    },
    uiVisibility: {
      ...DEFAULT_CASHIER_UI_VISIBILITY,
      showTopRevenueMetrics: false,
      showCashDrawerBalance: false,
      showOccupancyWidget: true,
      showDailySummaryCards: false,
      showTabReports: false,
      showTabSettings: false,
    }
  },
  {
    id: 'tmpl-cashier-senior',
    name: 'Cajero Avanzado / Confianza',
    description: 'Cobro y entradas con permisos de descuento, cortesías $0, retiros de caja menor y vista de recaudo.',
    role: 'cashier',
    isSystem: true,
    createdAt: new Date().toISOString(),
    permissions: {
      ...DEFAULT_CASHIER_PERMISSIONS,
      blindCashCount: false,
      canApplyDiscounts: true,
      canWaiveFee: true,
      canWithdrawCash: true,
      canDepositCash: true,
      canManualSpotSelect: true,
      canChangePaymentMethod: true,
      canReprintTickets: true,
    },
    uiVisibility: {
      ...DEFAULT_CASHIER_UI_VISIBILITY,
      showTopRevenueMetrics: true,
      showCashDrawerBalance: true,
      showOccupancyWidget: true,
      showDailySummaryCards: true,
      showPaidTicketsHistory: true,
    }
  },
  {
    id: 'tmpl-valet-entry',
    name: 'Operador de Patio / Valet (Solo Entrada)',
    description: 'Solo registro de ingresos y visualización de puestos libres en el mapa. Sin cobros ni caja.',
    role: 'custom',
    isSystem: true,
    createdAt: new Date().toISOString(),
    permissions: {
      ...DEFAULT_CASHIER_PERMISSIONS,
      canRegisterEntry: true,
      canRegisterExit: false,
      canCancelTicket: false,
      canApplyDiscounts: false,
      canWaiveFee: false,
      canManageCashShift: false,
      canWithdrawCash: false,
      canDepositCash: false,
      canViewMap: true,
      canChangeSpotStatus: true,
      canManualSpotSelect: true,
      canViewReports: false,
    },
    uiVisibility: {
      ...DEFAULT_CASHIER_UI_VISIBILITY,
      showTabOperations: true,
      showTabMap: true,
      showTabCash: false,
      showTabReports: false,
      showTabSettings: false,
      showTopRevenueMetrics: false,
      showCashDrawerBalance: false,
      showOccupancyWidget: true,
      showPaidTicketsHistory: false,
      showDailySummaryCards: false,
    }
  },
  {
    id: 'tmpl-supervisor-shift',
    name: 'Supervisor Operativo de Turno',
    description: 'Control total de operaciones, patio, cancelaciones, caja menor y reportes. Sin editar tarifas ni BD.',
    role: 'supervisor',
    isSystem: true,
    createdAt: new Date().toISOString(),
    permissions: {
      ...DEFAULT_SUPERVISOR_PERMISSIONS,
    },
    uiVisibility: {
      ...DEFAULT_SUPERVISOR_UI_VISIBILITY,
    }
  },
  {
    id: 'tmpl-auditor-readonly',
    name: 'Auditor Contable (Solo Lectura)',
    description: 'Consulta de reportes financieros, exportación a Excel, bitácora de auditoría y ventas pagadas.',
    role: 'custom',
    isSystem: true,
    createdAt: new Date().toISOString(),
    permissions: {
      canRegisterEntry: false,
      canRegisterExit: false,
      canCancelTicket: false,
      canApplyDiscounts: false,
      canWaiveFee: false,
      canReprintTickets: true,
      canManualSpotSelect: false,
      canChangePaymentMethod: false,
      canViewMap: true,
      canChangeSpotStatus: false,
      canForceReleaseSpot: false,
      canManageCashShift: false,
      canWithdrawCash: false,
      canDepositCash: false,
      blindCashCount: false,
      canViewReports: true,
      canExportReports: true,
      canViewAuditLogs: true,
      canEditRates: false,
      canEditBusinessInfo: false,
      canManageDatabase: false,
      canManageUsers: false,
    },
    uiVisibility: {
      showTabOperations: false,
      showTabMap: true,
      showTabReports: true,
      showTabCash: false,
      showTabSettings: false,
      showTopRevenueMetrics: true,
      showCashDrawerBalance: false,
      showOccupancyWidget: true,
      showDatabaseButton: false,
      showPaidTicketsHistory: true,
      showDailySummaryCards: true,
    }
  }
];

export const INITIAL_ROLE_MATRIX: Record<UserRole, { permissions: UserPermissions; uiVisibility: UserUIVisibility }> = {
  master: { permissions: { ...DEFAULT_MASTER_PERMISSIONS }, uiVisibility: { ...DEFAULT_MASTER_UI_VISIBILITY } },
  supervisor: { permissions: { ...DEFAULT_SUPERVISOR_PERMISSIONS }, uiVisibility: { ...DEFAULT_SUPERVISOR_UI_VISIBILITY } },
  cashier: { permissions: { ...DEFAULT_CASHIER_PERMISSIONS }, uiVisibility: { ...DEFAULT_CASHIER_UI_VISIBILITY } },
  custom: { permissions: { ...DEFAULT_CASHIER_PERMISSIONS }, uiVisibility: { ...DEFAULT_CASHIER_UI_VISIBILITY } },
};

export const INITIAL_CLOSED_SHIFTS: CashShift[] = [];

export const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: 'bod-001',
    code: 'PAT-01',
    name: 'PATIO PRINCIPAL (NIVEL 1)',
    type: 'general',
    branchId: 'suc-001',
    branchName: 'Sede Principal',
    address: 'Sede Principal - Nivel 1',
    capacity: 100,
    manager: 'Administrador',
    phone: '',
    isActive: true,
    itemsCount: 0,
    notes: 'Patio principal de estacionamiento en nivel 1.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'bod-002',
    code: 'ZON-VIP',
    name: 'ZONA VIP SUBTERRÁNEA (NIVEL -1)',
    type: 'general',
    branchId: 'suc-001',
    branchName: 'Sede Principal',
    address: 'Sede Principal - Sótano',
    capacity: 40,
    manager: 'Administrador',
    phone: '',
    isActive: true,
    itemsCount: 0,
    notes: 'Zona subterránea de alta seguridad.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'bod-003',
    code: 'PAT-EXT',
    name: 'PATIO BAHÍA EXTERIOR',
    type: 'general',
    branchId: 'suc-001',
    branchName: 'Sede Principal',
    address: 'Bahía Exterior',
    capacity: 30,
    manager: 'Administrador',
    phone: '',
    isActive: true,
    itemsCount: 0,
    notes: 'Bahía exterior para vehículos de paso rápido.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'bod-004',
    code: 'DEP-CUC',
    name: 'DEPÓSITO CÚCUTA',
    type: 'general',
    branchId: 'suc-001',
    branchName: 'Sede Principal',
    address: 'Calle 10 # 5-20',
    capacity: 25,
    manager: 'Administrador',
    phone: '',
    isActive: true,
    itemsCount: 0,
    notes: 'Depósito e insumos Cúcuta.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'bod-005',
    code: 'FAR-03',
    name: 'BOD. FARMANORTE 03',
    type: 'general',
    branchId: 'suc-001',
    branchName: 'Sede Principal',
    address: 'Sede Farmanorte 03',
    capacity: 50,
    manager: 'Administrador',
    phone: '',
    isActive: true,
    itemsCount: 0,
    notes: 'Bodega de insumos y consumibles Farmanorte 03.',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_POS_POINTS: PosPoint[] = [
  {
    id: 'pos-001',
    branchId: 'suc-001',
    branchName: 'Sede Principal',
    code: 'POS-01',
    name: 'Caja 01 - Taquilla Principal',
    ipAddress: '127.0.0.1',
    macAddress: '00:00:00:00:00:01',
    warehouseId: 'bod-001',
    warehouseName: 'Bodega Principal',
    status: 'online',
    cashierName: 'Administrador',
    currentAppVersion: 'v2.5.0-enterprise',
    printerSerial: 'SAT-22TUS',
    lastHeartbeat: new Date().toISOString(),
    assignedZone: 'Patio Principal',
    isMasterNode: true,
    dailyRevenue: 0,
    notes: 'Taquilla principal de operaciones'
  }
];

export const INITIAL_CLOSED_DAYS: OperationalDay[] = [];

export const INITIAL_BRANCHES: BranchLocation[] = [
  {
    id: 'suc-001',
    code: 'SUC-001',
    name: 'Sede Principal',
    city: 'Principal',
    address: 'Sede Principal',
    phone: '',
    managerName: 'Administrador',
    status: 'online',
    ipAddress: '127.0.0.1',
    currentAppVersion: 'v2.5.0-enterprise',
    lastSyncTimestamp: new Date().toISOString(),
    totalSpots: 36,
    occupiedSpots: 0,
    todayRevenue: 0,
    todayVehicles: 0,
    activeShiftNumber: 0,
    currentCashier: '',
    pendingUpdatesCount: 0,
    isCurrentBranch: true,
    posPointsCount: 1,
    notes: 'Sede Principal de operaciones.',
    systemUrl: 'http://127.0.0.1:3000',
    lat: 4.6560,
    lng: -74.0596
  }
];

export const INITIAL_REMOTE_ORDERS: RemoteExecutionOrder[] = [];

export const INITIAL_CENTRAL_PACKAGES: CentralUpdatePackage[] = [];

export const INITIAL_SOFTWARE_BUILDS: SoftwareReleaseBuild[] = [
  {
    id: 'bld-v250',
    version: 'v2.5.0-enterprise',
    buildNumber: 2026091701,
    releaseDate: '2026-09-17',
    channel: 'enterprise',
    title: 'Versión 2.5.0 - Servidor Central, Sincronización OTA y Auditoría Financiera (Actual)',
    description: 'Actualización mayor que incorpora la consola de gestión multi-sucursal, distribución remota de tarifas, sincronización bidireccional y motor de actualización en caliente.',
    changelog: [
      'Nuevo Módulo de Servidor Central con vista global y métricas consolidadas de todas las sucursales.',
      'Sistema de Despacho Centralizado de Tarifas, Conceptos de Gastos y Matriz Modular de Sincronización.',
      'Control de sincronización instantánea y modo fuera de línea con cola de reintento automático.',
      'Nuevo Actualizador de Software Integrado (OTA) para recibir módulos de desarrollo y parches.',
      'Separación de botón de Recogida de Dinero vs Gastos Operativos.',
      'Matriz de Permisos y Visibilidad Ultra-Granular por usuario y perfil.',
      'Soporte completo para Facturación Electrónica DIAN y Pasarelas de Pago Bancarias.'
    ],
    newModules: [
      'Módulo Servidor Central & Matriz Multi-Sede',
      'Módulo de Despacho y Publicación de Precios Centralizados',
      'Módulo Matriz de Sincronización Auto-Adaptable',
      'Módulo Actualizador Automático de Versiones (OTA Engine)',
      'Módulo de Auditoría y Telemetría de Sucursales'
    ],
    databaseMigrationRequired: false,
    downloadSize: '18.4 MB',
    checksumSha256: 'a4b8c9d1e2f30456789abcdef0123456789abcdef0123456789abcdef0123456',
    isMandatory: true,
    status: 'installed'
  },
  {
    id: 'bld-v242',
    version: 'v2.4.2-enterprise',
    buildNumber: 2026090101,
    releaseDate: '2026-09-01',
    channel: 'enterprise',
    title: 'Versión 2.4.2 - Pasarelas Bancarias, Bre-B QR Dinámico y Facturación Electrónica DIAN',
    description: 'Versión previa estable con integración de pagos con datáfono, códigos QR estáticos y dinámicos Bre-B, y generación de CUFE para facturas electrónicas.',
    changelog: [
      'Integración con pagos digitales y pasarelas de recaudo bancario.',
      'Soporte para cobro con QR interoperable Bre-B y validación automática de comprobantes.',
      'Módulo de Facturación Electrónica y emisión de tiquetes tipo POS fiscal.',
      'Optimización de carga para catálogos con más de 100 productos de tienda.',
      'Control de apertura de cajón monedero vía pulso ESC/POS.'
    ],
    newModules: [
      'Módulo de Pasarelas de Pago & Bre-B QR',
      'Módulo de Facturación Electrónica DIAN',
      'Módulo de Drivers de Hardware Térmico ESC/POS'
    ],
    databaseMigrationRequired: false,
    downloadSize: '16.8 MB',
    checksumSha256: '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
    isMandatory: false,
    status: 'available'
  },
  {
    id: 'bld-v240',
    version: 'v2.4.0-stable',
    buildNumber: 2026081501,
    releaseDate: '2026-08-15',
    channel: 'enterprise',
    title: 'Versión 2.4.0 - Matriz de Permisos, Recogida de Dinero y Multi-Caja',
    description: 'Versión base con arquitectura de permisos por perfil, diferenciación contable entre salidas de dinero por gasto vs retiro a gerencia.',
    changelog: [
      'Separación contable estricta entre Retiro de Efectivo (Recogida) y Gastos Operativos.',
      'Sistema de turnos de caja con arqueo ciego y doble confirmación.',
      'Soporte multi-tarifa (tarifas diferenciadas para convenios y mensualidades).',
      'Módulo de auditoría de modificaciones de tiquetes y anulación segura.'
    ],
    newModules: [
      'Módulo de Control Contable & Recogidas',
      'Módulo de Gestión de Abonados y Mensualidades',
      'Motor de Tarifas Avanzadas & Descuentos'
    ],
    databaseMigrationRequired: false,
    downloadSize: '15.2 MB',
    checksumSha256: '5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    isMandatory: false,
    status: 'available'
  },
  {
    id: 'bld-v235',
    version: 'v2.3.5-lts',
    buildNumber: 2026072001,
    releaseDate: '2026-07-20',
    channel: 'enterprise',
    title: 'Versión 2.3.5-LTS - Núcleo Operativo de Estacionamiento & IndexedDB Offline',
    description: 'Versión fundacional de alta estabilidad con persistencia transaccional 100% offline, control de bahías visuales e impresión térmica.',
    changelog: [
      'Persistencia transaccional offline-first con IndexedDB.',
      'Mapa visual e interactivo de plazas y bahías por tipo de vehículo.',
      'Cálculo automático de liquidación por minutos, fracciones y días.',
      'Impresión térmica de tiquete de ingreso con código de barras y QR.'
    ],
    newModules: [
      'Motor Central de Liquidación de Estacionamiento',
      'Base de Datos Transaccional IndexedDB Offline',
      'Servidor de Impresión Térmica ESC/POS'
    ],
    databaseMigrationRequired: false,
    downloadSize: '13.9 MB',
    checksumSha256: '3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
    isMandatory: false,
    status: 'available'
  },
  {
    id: 'bld-v260-rc',
    version: 'v2.6.0-rc1',
    buildNumber: 2026092001,
    releaseDate: '2026-09-20',
    channel: 'beta',
    title: 'Versión 2.6.0-RC1 (Próximo Release: Reconocimiento Automático de Placas ANPR / LPR con IA)',
    description: 'Versión previa experimental con módulo de cámaras LPR para lectura automática de placas por video, sensor inteligente de ocupación de bahías y analítica predictiva de horas pico.',
    changelog: [
      'Módulo de Inteligencia Artificial para lectura automática de placas en cámara de barrera.',
      'Detección automática de tipo de vehículo mediante visión por computador.',
      'Predicción de saturación de patio y tarifas dinámicas programables.',
      'Panel de telemetría de hardware (impresoras térmicas, barreras automáticas, lectores RFID).'
    ],
    newModules: [
      'Módulo ANPR / LPR Visión Artificial',
      'Módulo Analítica Predictiva & Machine Learning',
      'Módulo Conectores IoT de Barreras Físicas'
    ],
    databaseMigrationRequired: true,
    downloadSize: '24.2 MB',
    checksumSha256: '9f8e7d6c5b4a3210fedcba9876543210fedcba9876543210fedcba9876543210',
    isMandatory: false,
    status: 'available'
  }
];

export const INITIAL_SYNC_AUDIT_LOGS: BranchSyncAuditRecord[] = [];

export const INITIAL_SYSTEM_NODE_CONFIG: SystemNodeConfig = {
  workMode: 'pos', // Por defecto en Punto de Venta (o Servidor según configuración)
  selectedBranchId: 'suc-001',
  establishmentName: 'PARKING CONTROL ENTERPRISE S.A.S. - SEDE PRINCIPAL',
  establishmentNit: '900265730-0',
  legalRepresentative: 'Ing. Carlos Mendoza',
  operationalDate: '19/09/2026',
  printerSerialOrFiscalMachine: 'TC6Y313412',
  defaultWarehouseOrYard: 'PATIO PRINCIPAL',
  billingMode: 'time_service',

  // Servidores & Enlace Central
  centralServerHost: '192.168.10.150',
  centralServerPort: 3000,
  farmadeskPort: 9050,
  farmadeskLanPort: 9050,
  farmadeskWanPort: 9050,
  centralAuthToken: 'PK-CENTRAL-AUTH-TOKEN-2026-X99',
  databaseName: 'ParqueaderoPOS_DB_Principal',
  autoSyncIntervalMinutes: 5,

  // Zonas Base
  primaryZoneName: 'Patio Principal (Nivel 1)',
  secondaryZoneName: 'Zona VIP Subterránea',

  // Prefijos
  defaultPrefix: 'FE-PK',
  currentSequenceNumber: 1045,

  // Email
  alertEmail: 'gerencia@parkingcontrol.com',
  smtpServer: 'smtp.parkingcontrol.com',
  smtpPort: 587,
  notifyOnShiftClose: true,
  notifyOnDefinitiveDayClose: true,

  // Integraciones
  enableBarrierControl: true,
  barrierComPort: 'COM3',
  enableLprCamera: true,
  lprCameraIp: '192.168.10.201',
  enableRfidReader: true,

  // Avisos Recordatorios
  ticketFooterMessage: 'Gracias por su visita. Conserve su ticket en lugar seguro. No deje objetos de valor.',
  enableLowSpotAlert: true,
  lowSpotThreshold: 5,
};

export const INITIAL_COMMERCIAL_AGREEMENTS: CommercialAgreement[] = [];



