export type VehicleType = 'car' | 'motorcycle' | 'suv' | 'bicycle' | string;

export interface VehicleRate {
  minuteRate: number;
  hourRate: number;
  dayRate: number;
  gracePeriodMinutes: number; // e.g. 15 minutes free
  minimumChargeMinutes: number; // e.g. at least 30 min or 1 hour
  lostTicketFee?: number; // Multa por ticket extraviado
}

export interface VehicleCategoryConfig {
  id: string;
  code?: string;
  name: string;
  icon: string; // 'Car' | 'Bike' | 'Truck' | 'Bicycle' | 'Van' | 'Bus' | 'Zap' | 'Compass'
  rate?: VehicleRate;
  defaultHourlyRate?: number;
  defaultMinuteRate?: number;
  defaultDailyRate?: number;
  gracePeriodMinutes?: number;
  enabled?: boolean;
  isActive?: boolean;
  isPreset?: boolean;
  color?: string;
  isCustom?: boolean;
  description?: string;
  displayOrder?: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  color?: string; // e.g., 'amber', 'blue', 'orange', 'purple', 'emerald', 'rose', 'cyan', 'indigo', 'slate'
  isActive: boolean;
  isPreset?: boolean;
  createdAt?: string;
}

export interface ExpenseConcept {
  id: string;
  code?: string;
  name: string;
  category?: 'supplies' | 'services' | 'maintenance' | 'payroll' | 'other' | string;
  categoryId?: string;
  description?: string;
  isActive: boolean;
  isPreset?: boolean;
  createdAt?: string;
}

export interface RatesConfig {
  car: VehicleRate;
  motorcycle: VehicleRate;
  suv: VehicleRate;
  bicycle: VehicleRate;
  categories?: VehicleCategoryConfig[];
  roundingMethod: 'exact' | 'fraction_15' | 'fraction_30' | 'next_hour';
  taxPercentage: number; // e.g. 0% or 19%
  currencySymbol: string; // e.g. '$'
  lostTicketFee?: number; // Tarifa general por pérdida de ticket
  [key: string]: any;
}

export interface ParkingSpot {
  id: string;
  code: string; // e.g. 'A-01', 'M-04'
  type: VehicleType;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  currentTicketId?: string;
  floor?: number;
  zoneName?: string;
  notes?: string;
}

export type PaymentMethod = 
  | 'cash' 
  | 'card' 
  | 'wallet'
  | 'qr'
  | 'bre_b'
  | 'transfer' 
  | 'mixed' 
  | 'agreement'
  | 'nequi' 
  | 'daviplata' 
  | 'qr_bancolombia';

export interface WalletOption {
  id: string; // 'nequi', 'daviplata', 'dale', 'movii', etc.
  name: string; // 'Nequi', 'Daviplata', etc.
  phoneNumber: string;
  holderName: string;
  qrImageUrl?: string;
  enabled: boolean;
  icon?: string;
}

export interface QrOption {
  id: string; // 'bancolombia_qr', 'redeban_qr', 'davivienda_qr'
  name: string; // 'QR Bancolombia', 'QR Redeban / Aval', etc.
  bankOrEntity: string;
  accountNumber: string;
  holderName: string;
  qrImageUrl?: string;
  enabled: boolean;
}

export interface BreBKey {
  id: string;
  keyType: 'phone' | 'national_id' | 'email' | 'code';
  keyTypeName: string; // 'Número Celular', 'Cédula / NIT', 'Correo Electrónico', 'Llave Alfanumérica'
  keyValue: string; // e.g. '3108924511'
  registeredEntity: string; // e.g. 'Bancolombia', 'Davivienda', 'Nequi'
  holderName: string;
  enabled: boolean;
}

export interface CardTerminalOption {
  id: string;
  name: string; // 'Redeban', 'Bold', 'Credibanco', 'Treinta'
  serialNumber?: string;
  enabled: boolean;
}

export interface BankAccountOption {
  id: string;
  bankName: string; // e.g. 'Bancolombia', 'Davivienda', 'Banco de Bogotá'
  accountType: 'savings' | 'checking'; // 'Ahorros' | 'Corriente'
  accountNumber: string;
  holderName: string;
  holderId?: string; // NIT / CC
  qrImageUrl?: string; // QR digital de esta cuenta bancaria
  pseUrl?: string; // Enlace de pago PSE directo (e.g. portal de recaudos, Wompi, Bold o link bancario)
  pseQrUrl?: string; // Código QR exclusivo para pago PSE
  enablePse?: boolean; // Activar canal PSE para esta cuenta
  enabled: boolean;
}

export interface SplitPaymentItem {
  id: string;
  method: PaymentMethod;
  methodName: string;
  subMethodId?: string;
  amount: number;
  reference?: string;
  cashReceived?: number;
  changeGiven?: number;
  cardType?: 'debit' | 'credit';
}

export interface PaymentTransactionDetails {
  method?: PaymentMethod;
  methodLabel?: string;
  subMethodId?: string; // id específico de billetera, QR o llave Bre-B
  subMethodName?: string; // nombre para mostrar de billetera, QR o llave Bre-B
  referenceNumber?: string; // voucher, autorización datáfono, ref transferencia
  cardType?: 'debit' | 'credit';
  cardTerminal?: string; // Redeban, Bold, Credibanco, etc.
  cardBrand?: string;
  agreementName?: string; // Convenio comercial o entidad aliada
  walletAccountPhone?: string;
  digitalWalletApproval?: string;
  breBKeyDetails?: string;
  bankAccountDetails?: string;
  qrApprovalCode?: string;
  transferBank?: string;
  isPsePayment?: boolean;
  psePaymentUrl?: string;
  accountDetails?: {
    accountNumber: string;
    holderName: string;
    entityName: string;
  };
  splitPayments?: SplitPaymentItem[];
  customerDocument?: string;
  customerName?: string;
  notes?: string;
  cardAuthCode?: string;
  digitalWalletName?: string;
  qrBankName?: string;
  transferRef?: string;
  breBKey?: string;

  // Facturación Electrónica DIAN
  isElectronicInvoice?: boolean;
  electronicInvoiceNumber?: string; // e.g. 'FE-01042'
  cufe?: string; // Código Único de Factura Electrónica
  qrUrl?: string;
  xmlUuid?: string;
  trackId?: string;
  customerDocType?: 'CC' | 'NIT' | 'CE' | 'PASSPORT';
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  taxRegime?: string;

  // Validación Salida sin Ticket / Tarjeta de Propiedad
  lostTicketDetails?: {
    isLostTicket: boolean;
    propertyCardNumber: string;
    ownerFullName: string;
    ownerDocNumber: string;
    lostTicketFeeApplied: number;
  };
}

export interface PaymentMethodConfig {
  id: PaymentMethod;
  name: string;
  enabled: boolean;
  category: 'cash' | 'card' | 'digital_wallet' | 'mixed' | 'agreement';
  icon: string;
  description?: string;
  accountNumberOrPhone?: string;
  accountHolder?: string;
  requireReference?: boolean;
  instructions?: string;
}

export interface PaymentGatewayConfig {
  allowMixedPayment: boolean;
  allowQuickDenominations: boolean;
  suggestExactChange: boolean;
  defaultMethod: PaymentMethod;
  requireReferenceForElectronic: boolean;

  // Configured categorized methods
  wallets: WalletOption[];
  qrCodes: QrOption[];
  breBKeys: BreBKey[];
  terminals: CardTerminalOption[];
  bankAccounts: BankAccountOption[];

  // General accounts & legacy fallback
  activeMethods?: PaymentMethodConfig[];
  nequiPhone?: string;
  nequiHolder?: string;
  daviplataPhone?: string;
  daviplataHolder?: string;
  bancolombiaAccount?: string;
  bancolombiaQrInfo?: string;
  cardTerminalName?: string;
  generalPseUrl?: string; // Enlace PSE global o portal de pagos
  generalPseQrUrl?: string; // QR PSE global o código unificado
}

export type AgreementDiscountType = 
  | 'free_minutes'           // X minutos gratis (ej: 60 min, 120 min)
  | 'percentage_discount'    // X% de descuento sobre el valor del tiempo (ej: 50%)
  | 'fixed_discount'         // Descuento en pesos directo (ej: -$3.000 COP)
  | 'flat_rate';             // Tarifa fija única (ej: $4.000 COP)

export interface CommercialAgreement {
  id: string;
  code: string;                  // e.g. CONV-01
  name: string;                  // e.g. "Gimnasio Bodytech"
  businessName: string;          // e.g. "Bodytech S.A.S."
  nit?: string;                  // e.g. "900.123.456-7"
  phone?: string;
  contactPerson?: string;
  discountType: AgreementDiscountType;
  discountValue: number;         // minutos si 'free_minutes', % si 'percentage_discount', $ COP si 'fixed_discount' o 'flat_rate'
  applicableVehicleTypes?: ('all' | VehicleType)[];
  requiresSealOrVoucher?: boolean; // Requiere que el cajero digite número de factura, sello o código de aprobación
  sealPromptLabel?: string;      // e.g. "N° Factura de Compra" o "Código de Sello"
  billingEntity?: 'customer_pays_balance' | 'ally_billed_monthly'; // Si el cliente paga el saldo o se factura al aliado
  isActive: boolean;
  notes?: string;
  createdAt?: string;
}

export interface ParkingTicket {
  id: string;
  ticketNumber: string; // e.g. PK-2026-0012
  barcode?: string; // Código de barras único Code 128 / legible por lector óptico
  plate: string;
  vehicleType: VehicleType;
  spotCode: string;
  entryTime: string; // ISO string
  exitTime?: string; // ISO string if exited
  status: 'active' | 'paid' | 'cancelled';
  notes?: string;
  branchId?: string;
  branchName?: string;
  
  // Billing details (populated at exit)
  totalMinutes?: number;
  billableMinutes?: number;
  baseAmount?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  paymentMethod?: PaymentMethod;
  paymentDetails?: PaymentTransactionDetails;
  cashReceived?: number;
  changeGiven?: number;
  paidAt?: string;
  cashierName?: string;
  operationalDayNumber?: number;
  shiftNumber?: number;

  // Salida sin ticket físico / Presentación de Tarjeta de Propiedad
  noTicketExit?: boolean;
  propertyCardNumber?: string; // N° Licencia de tránsito / Tarjeta de propiedad
  propertyCardOwnerName?: string; // Nombre del propietario en tarjeta
  driverDocument?: string; // Documento de identidad del conductor
  lostTicketFeeApplied?: number; // Valor de multa o recargo aplicado

  // Placa extranjera / Internacional
  isForeignPlate?: boolean;
  originCountry?: string; // País de procedencia (ej. Venezuela, Ecuador, Panamá, USA, etc.)

  // Convenio Comercial / Sello Aliado
  commercialAgreementId?: string;
  commercialAgreementName?: string;
  commercialAgreementSealOrVoucher?: string;
  commercialAgreementDiscountType?: AgreementDiscountType;

  electronicInvoice?: {
    cufe: string;
    invoiceNumber: string;
    prefix: string;
    resolutionNumber: string;
    qrUrl?: string;
    xmlUuid?: string;
    trackId?: string;
    status?: 'VALIDADA_DIAN' | 'RECHAZADA_DIAN' | 'PENDIENTE_TRANSMISION';
    customer?: {
      name: string;
      documentNumber: string;
      docType?: string;
      email?: string;
    };
  };
}

export interface ParkingSubscriber {
  id: string;
  fullName: string;
  documentId: string;
  phone: string;
  email?: string;
  plate: string;
  vehicleType: VehicleType;
  monthlyRate: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  assignedSpotCode?: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'suspended';
  notes?: string;
  lastPaymentDate: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  voucherNumber?: string; // N° de voucher, comprobante de datáfono, aprobación billetera, ref bancaria o CUS PSE
  registeredBy?: string;
}

export interface ParkingBusinessInfo {
  name: string;
  nit: string;
  address: string;
  phone: string;
  representative?: string; // Representante Legal
  ticketFooter: string;
  autoPrintOnEntry: boolean;
  autoPrintOnExit?: boolean;
  autoPrintOnShiftClose?: boolean;
  autoPrintOnDayClose?: boolean;
  silentBackgroundPrint?: boolean;
  defaultPrinterName?: string;
  defaultPaperWidth?: '80mm' | '58mm';
  openCashDrawerOnCashPayment?: boolean;
  cutPaperOnPrint?: boolean;
  soundAlerts: boolean;
  logoUrl?: string; // Logo personalizado de la aplicación POS

  // Sucursal & Emisión para reportes y comprobantes
  branchName?: string;
  sucursal?: string;
  currentBranch?: string;
  emissionDate?: string;
  fechaEmision?: string;

  // Facturación Electrónica DIAN
  electronicInvoicingEnabled?: boolean;
  dianEmissionMode?: 'simulator' | 'provider_api' | 'direct_soap';
  // Proveedor Tecnológico (API REST)
  dianProvider?: 'factus' | 'dataico' | 'the_factory' | 'generic';
  dianProviderApiUrl?: string;
  dianProviderApiKey?: string;
  dianProviderClientId?: string;
  // Software Propio (SOAP Directo con Certificado Digital .p12)
  dianCertUploaded?: boolean;
  dianCertFileName?: string;
  dianCertPassword?: string;
  dianSoftwarePin?: string;
  dianTestSetId?: string;
  // Parámetros Fiscales
  dianResolutionNumber?: string;
  dianPrefix?: string;
  dianFromNumber?: number;
  dianToNumber?: number;
  dianCurrentNumber?: number;
  dianResolutionDate?: string;
  dianEnvironment?: 'hab' | 'prod';
  dianSoftwareId?: string;
  dianTechnicalKey?: string;
  enableCommercialAgreements?: boolean;
}

export interface CashMovement {
  id: string;
  timestamp: string;
  type: 'income' | 'expense' | 'withdrawal' | 'pickup';
  amount: number;
  description: string;
  operator: string;
  conceptId?: string;
  conceptName?: string;
  voucherNumber?: string;
  paymentMethod?: PaymentMethod | string;
  paymentReference?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: 'image' | 'pdf' | 'document';
  attachmentSize?: number;
}

export interface OperationalDay {
  id: string; // e.g. 'day-2026-001'
  dayNumber: number; // e.g. 1
  date: string; // e.g. '2026-09-17'
  formattedDate?: string; // e.g. '17/09/2026'
  openedAt: string;
  closedAt?: string;
  status: 'open' | 'closed';
  initialDayCash: number;
  finalDayCash?: number;
  totalCollected: number;
  shiftsCount: number;
  closedByOperator?: string;
  summaryNotes?: string;
  closingNotes?: string;
  // Recalculation & Audit fields
  recalculatedAt?: string;
  recalculatedBy?: string;
  recalculationDiff?: number;
  isAudited?: boolean;
  auditedBy?: string;
  auditedAt?: string;
  auditNotes?: string;
  // Snapshots for detailed view
  cashCollectedSnapshot?: number;
  cardCollectedSnapshot?: number;
  walletCollectedSnapshot?: number;
  qrCollectedSnapshot?: number;
  breBCollectedSnapshot?: number;
  agreementCollectedSnapshot?: number;
  transferCollectedSnapshot?: number;
  mixedCollectedSnapshot?: number;
  totalIncomesSnapshot?: number;
  totalExpensesSnapshot?: number;
  totalPickupsSnapshot?: number;
  expectedCashSnapshot?: number;
  countedCashSnapshot?: number;
  cashDifferenceSnapshot?: number;
  totalToConsignSnapshot?: number;
  consecutiveCode?: string;
  vehicleStatsSnapshot?: { category: string; count: number; total: number }[];
  shiftsSummarySnapshot?: { shiftNumber: number; operatorName: string; totalCollected: number; cash: number; electronic: number; status?: string }[];
  movementsSummarySnapshot?: { type: string; concept?: string; amount: number; description?: string }[];
  totalTicketsIssuedSnapshot?: number;
  totalTicketsPaidSnapshot?: number;
  activeVehiclesRemainingSnapshot?: number;
  ticketRangeSnapshot?: { startTicket?: string; endTicket?: string };
  totalDiscountsSnapshot?: number;
}

export interface CashShift {
  id: string;
  shiftNumber: number; // e.g. 1, 2, 3...
  operationalDayId: string;
  operationalDayNumber: number;
  operatorName: string;
  startTime: string;
  endTime?: string;
  initialCash: number;
  finalCountedCash?: number;
  cashDifference?: number;
  status: 'open' | 'closed';
  cashMovements: CashMovement[];
  consecutiveCode?: string;
  // Recalculation & Audit fields
  recalculatedAt?: string;
  recalculatedBy?: string;
  recalculationDiff?: number;
  isAudited?: boolean;
  auditedBy?: string;
  auditedAt?: string;
  auditNotes?: string;
  // Snapshots for detailed view
  totalCollectedSnapshot?: number;
  cashCollectedSnapshot?: number;
  cardCollectedSnapshot?: number;
  walletCollectedSnapshot?: number;
  qrCollectedSnapshot?: number;
  breBCollectedSnapshot?: number;
  agreementCollectedSnapshot?: number;
  transferCollectedSnapshot?: number;
  mixedCollectedSnapshot?: number;
  totalIncomesSnapshot?: number;
  totalExpensesSnapshot?: number;
  totalPickupsSnapshot?: number;
  expectedCashSnapshot?: number;
  countedCashSnapshot?: number;
  totalToConsignSnapshot?: number;
}

export interface TerminalConfig {
  terminalId: string; // e.g. "TAQUILLA-01", "TAQUILLA-02"
  terminalName: string; // e.g. "Taquilla Principal Entrada"
  databaseName: string; // e.g. "ParqueaderoPOS_DB_TAQUILLA-01"
  lastBackupDate?: string;
  createdAt: string;
}

export type UserRole = 'master' | 'supervisor' | 'cashier' | 'custom';

export interface UserUIVisibility {
  // Encabezado y Barra Superior
  showTopRevenueMetrics: boolean;          // Mostrar recaudo total del día en la barra superior
  showOccupancyWidget: boolean;            // Mostrar widget de ocupación de plazas en el encabezado
  showDatabaseButton: boolean;             // Mostrar botón de BD Local en el encabezado
  showUsersManagementButton?: boolean;     // Mostrar botón de Control de Usuarios en el encabezado
  showOperationalDayBadge?: boolean;       // Mostrar insignia de Día Operativo y Turno en el encabezado
  showLiveClockWidget?: boolean;           // Mostrar reloj digital en vivo en el encabezado
  showCentralHubButton?: boolean;          // Mostrar botón de Servidor Central / Red de Sucursales
  showBranchSyncButton?: boolean;          // Mostrar botón de Sincronización con Servidor Central
  showAppUpdaterButton?: boolean;          // Mostrar botón del Actualizador de Sistema / OTA Software
  showBranchIdentifierBadge?: boolean;     // Mostrar insignia de la Sucursal Actual en la barra superior

  // Pestañas Principales del Menú
  showTabOperations: boolean;              // Mostrar pestaña de Operaciones (Entradas y Salidas)
  showTabMap: boolean;                     // Mostrar pestaña Mapa de Plazas
  showTabReports: boolean;                 // Mostrar pestaña Reportes en Tiempo Real
  showTabCash: boolean;                    // Mostrar pestaña Caja & Turnos
  showTabSettings: boolean;                // Mostrar pestaña Tarifas & Configuración

  // Pantalla de Operaciones
  showDailySummaryCards: boolean;          // Ver cinta / tarjetas de métricas diarias (entradas/salidas)
  showVehiclesInYardMetric?: boolean;      // Ver tarjeta / contador de vehículos en patio
  showTurnRevenueMetric?: boolean;         // Ver tarjeta / contador de recaudo del turno
  showPaidTicketsHistory: boolean;         // Ver cinta / tabla de tickets cobrados recientemente en pantalla
  showConfigurePaymentMethodsButton?: boolean; // Ver botón de configurar medios de pago en cobro y caja
  showOpenCashDrawerButton?: boolean;      // Mostrar botón de "Abrir Cajón" sin venta
  showAnprCameraWidget?: boolean;          // Mostrar widget de cámara ANPR en la vista

  // Pantalla de Mapa y Plazas
  showSpotsManagementButton?: boolean;     // Ver botón de acceso a 'Gestión de Plazas' en encabezado y mapa
  showVncRemoteDesktopButton?: boolean;    // Mostrar botón de escritorio remoto VNC

  // Pantalla de Caja y Turnos
  showCashDrawerBalance: boolean;          // Mostrar saldo esperado acumulado en los paneles de caja
  showLivePaymentBreakdown?: boolean;      // Ver desglose de medios de pago en vivo en caja
  showCashPickupOption?: boolean;          // Ver opción/botón de 'Recogida de Dinero' en caja
  showCashShiftsHistory?: boolean;         // Ver botón y acceso al 'Histórico de Cierres' en caja
  showWarehousesGrid?: boolean;            // Mostrar tabla de Bodegas en Caja o Configuración

  // Pantalla de Reportes
  showFinancialKpisInReports?: boolean;    // Ver tarjetas KPI financieras en reportes
  showTrafficChartsInReports?: boolean;    // Ver gráficos de tráfico y distribución en reportes
  showAuditLogsPanel?: boolean;            // Mostrar panel de registros de auditoría en Reportes
  showEmployeeKpiWidget?: boolean;          // Mostrar estadísticas de rendimiento de cajeros en Reportes

  // Pantalla de Configuración
  showInvoiceDianParams?: boolean;         // Mostrar parámetros de Facturación Electrónica DIAN
  showTechnicalNetworkParams?: boolean;    // Mostrar parámetros de red avanzados LAN/WAN
  showBranchesGrid?: boolean;              // Mostrar tabla de Sucursales en Sede Central
  showPosPointsGrid?: boolean;             // Mostrar tabla de Puntos de Venta / Taquillas en Configuración

  // Módulo de Abonados y Mensualidades
  showSubscribersModule?: boolean;         // Ver módulo de Abonados y Mensualidades en el menú lateral
  showSubscribersTopButton?: boolean;      // Ver acceso directo a Abonados en la barra superior

  // Módulo de Impresoras y Tickets
  showPrinterConfigModule?: boolean;       // Ver acceso a configuración de Impresoras Térmicas y Tickets

  // Modo de Red y Servidor
  showWorkModeBadge?: boolean;             // Ver selector/insignia de Modo de Red y Servidor en barra superior
}

export interface UserPermissions {
  // Operaciones de Vehículos y Cobro
  canRegisterEntry: boolean;               // Registrar ingreso de vehículos (crear tickets)
  canRegisterExit: boolean;                // Registrar salidas y liquidar cobros
  canCancelTicket: boolean;                // Anular tickets activos en patio
  canApplyDiscounts: boolean;              // Aplicar tarifas especiales o descuentos manuales
  canWaiveFee?: boolean;                   // Exonerar cobro / Ticket cortesía $0
  canReprintTickets?: boolean;             // Reimprimir tickets de ingreso y recibos de pago
  canManualSpotSelect?: boolean;           // Seleccionar o cambiar plaza manualmente (vs automático)
  canProcessLostTicket?: boolean;          // Salida sin ticket físico / Presentación Tarjeta de Propiedad
  canApplyLostTicketFee?: boolean;         // Aplicar o cobrar recargo por ticket perdido
  canChangePaymentMethod?: boolean;        // Elegir método de pago (efectivo/tarjeta/transferencia) o forzar solo efectivo
  canConfigurePaymentMethods?: boolean;    // Configurar cuentas bancarias, billeteras, QR y datáfonos
  canIssueElectronicInvoice?: boolean;     // Habilitar o emitir Facturación Electrónica DIAN
  canOpenCashDrawerWithoutSale?: boolean;  // Abrir cajón monedero sin realizar venta
  canEditActiveTicketPlate?: boolean;      // Modificar placa de un ticket activo
  canApplyManualRateOverride?: boolean;    // Modificar valor calculado de estadía manualmente
  canForceRegisterExit?: boolean;          // Registrar salida forzada de vehículo sin cobro
  canViewANPRCameraModule?: boolean;       // Ver e interactuar con cámara ANPR / Reconocimiento de Placas

  // Control de Plazas y Patio
  canViewMap: boolean;                     // Ver mapa interactivo de plazas
  canChangeSpotStatus: boolean;            // Modificar estados de plazas (bloquear/habilitar/mantenimiento)
  canForceReleaseSpot?: boolean;           // Forzar liberación de plaza ocupada
  canManageSpots?: boolean;                // Crear, editar, eliminar y gestionar plazas masivamente
  canReserveSpots?: boolean;               // Reservar plazas exclusivas para convenios/abonados
  canViewVncRemoteDesktop?: boolean;       // Acceder al escritorio remoto VNC de sucursales
  canExecuteRemoteOrders?: boolean;        // Emitir órdenes y comandos de ejecución remota

  // Gestión de Abonados y Mensualidades
  canViewSubscribers?: boolean;            // Ver y consultar lista de abonados / mensualidades
  canCreateSubscribers?: boolean;          // Registrar nuevos abonados y vehículos asociados
  canRenewSubscribers?: boolean;           // Cobrar y renovar mensualidades de abonados
  canCancelSubscribers?: boolean;          // Cancelar o pausar contratos de abonados

  // Caja y Movimientos
  canManageCashShift: boolean;             // Abrir y cerrar turnos de caja (realizar arqueos)
  canWithdrawCash: boolean;                // Registrar gastos o retiros de caja menor
  canDepositCash?: boolean;                // Registrar ingresos extras a la base de caja
  canPickupCash?: boolean;                 // Realizar recogidas parciales de dinero (liberar efectivo)
  canManageExpenseConcepts?: boolean;      // Crear y editar conceptos autorizados de gastos
  canCloseOperationalDay?: boolean;        // Realizar Cierre Definitivo de Día Operativo
  canAuditCashShifts?: boolean;            // Auditar, recalcular o reabrir turnos cerrados
  blindCashCount?: boolean;                // Arqueo ciego obligatorio (no ver saldo esperado antes del conteo físico)
  canViewLiveFinancialBreakdown?: boolean;  // Ver desglose financiero y medios de pago en vivo
  canViewOperationalDayInHistory?: boolean; // Ver Día Operativo en el historial de arqueos y comprobantes
  canViewConsecutiveInHistory?: boolean;    // Ver número Consecutivo de Arqueos y Cierres en historial y tiques
  canViewCashShiftsHistory?: boolean;      // Ver histórico de cierres y arqueos finalizados
  canEditClosedShifts?: boolean;           // Modificar movimientos de un turno de caja cerrado
  canConfigureExpenseCategories?: boolean;  // Administrar las categorías globales de egresos
  canManageWarehouses?: boolean;           // Crear, editar o eliminar Bodegas en el sistema
  canManagePosPoints?: boolean;            // Crear, editar o eliminar Puntos POS / Taquillas
  canViewShiftClosingDiscrepancies?: boolean; // Ver diferencias de caja o descuadres financieros en arqueos

  // Reportes y Auditoría
  canViewReports: boolean;                 // Ver reportes y estadísticas en tiempo real
  canExportReports: boolean;               // Exportar reportes en Excel/CSV/Impresión
  canViewAuditLogs?: boolean;              // Consultar registros de auditoría del sistema
  canFilterReportDates?: boolean;          // Filtrar reportes por rangos personalizados de fechas
  canDeleteAuditLogs?: boolean;            // Borrar registros de auditoría o purgar la base de datos de logs
  canViewEmployeePerformanceKpi?: boolean; // Ver reportes de rendimiento y productividad por cajero
  canViewGeneralProfitMargin?: boolean;    // Ver el margen de utilidad y egresos consolidados

  // Configuración, Sucursales y Servidor Central
  canEditRates: boolean;                   // Modificar tarifas y costos por tiempo
  canManageVehicleCategories?: boolean;    // Crear y editar tipos/categorías de vehículos
  canManageAgreements?: boolean;           // Crear y editar convenios comerciales y sellos de descuento
  canEditBusinessInfo?: boolean;           // Modificar datos de la empresa (NIT, nombre, pie de ticket)
  canConfigurePrinters?: boolean;          // Configurar impresora térmica, encabezado y formato de ticket
  canConfigureDianInvoicing?: boolean;     // Modificar parámetros de Facturación Electrónica DIAN
  canManageDatabase: boolean;              // Gestionar BD local, backups y restauración
  canManageUsers: boolean;                 // Administrar usuarios y permisos (Exclusivo Maestro)
  canAccessCentralHub?: boolean;           // Acceder al Módulo Servidor Central & Monitoreo Multi-Sucursal
  canPublishCentralUpdates?: boolean;      // Publicar y despachar cambios de precios/gastos a sucursales
  canSyncWithCentralServer?: boolean;      // Sincronizar y recibir actualizaciones del servidor central
  canPerformAppUpdates?: boolean;          // Descargar e instalar nuevas versiones/módulos de desarrollo de la app
  canSwitchBranchSimulation?: boolean;     // Conmutar entre sucursales en el entorno de pruebas
  canManageBranchLocations?: boolean;      // Crear, editar o eliminar sedes físicas/sucursales en la red
  canConfigureSystemTheme?: boolean;       // Configurar o personalizar el tema visual y de neón del sistema
  canConfigureTechnicalTerminalProps?: boolean; // Modificar puertos de red, parámetros LAN/WAN de FarmaDesk, puertos de sockets

  // Visibilidad de Interfaz & Perfil de Usuario
  uiVisibility?: UserUIVisibility;
}

// =========================================================================
// MODELOS DE BODEGAS, SUCURSALES, PUNTOS POS Y ÓRDENES REMOTAS
// =========================================================================

export type WarehouseType = 'general' | 'supplies' | 'yard' | 'pos_storage' | 'transit';

export interface Warehouse {
  id: string;
  code: string;                           // e.g. 'BOD-001', 'BOD-NORTE', 'BOD-MATRIZ'
  name: string;                           // e.g. 'Bodega Principal Central', 'Depósito Insumos Calle 72'
  type: WarehouseType;                    // General, Insumos & Repuestos, Patio Maniobras, Depósito POS, Tránsito
  branchId?: string;                      // ID de la sucursal a la que pertenece (o vacía si es Central/Matriz)
  branchName?: string;
  address: string;                        // Ubicación física / Dirección
  capacity: number;                       // Capacidad nominal (m³ o unidades)
  manager: string;                        // Responsable / Almacenista
  phone?: string;
  isActive: boolean;
  notes?: string;
  createdAt?: string;
  itemsCount?: number;                    // Cantidad de ítems/insumos en inventario
}

export type PosPointStatus = 'online' | 'busy' | 'offline' | 'locked' | 'maintenance';

export interface PosPoint {
  id: string;
  branchId: string;                       // ID de la sucursal a la que pertenece
  branchName?: string;
  code: string;                           // e.g. 'POS-01', 'CAJA-ENTRADA-1', 'TAQUILLA-NORTE'
  name: string;                           // e.g. 'Caja Principal Entrada Vehicular', 'Taquilla Peatonal 1'
  ipAddress: string;                      // e.g. '192.168.1.101'
  macAddress?: string;
  warehouseId: string;                    // Bodega asignada a este punto
  warehouseName?: string;
  status: PosPointStatus;
  cashierName?: string;
  currentAppVersion: string;
  printerSerial?: string;
  lastHeartbeat: string;
  assignedZone?: string;                  // Zona o Patio asignado (ej. 'Zona A - Autos')
  isMasterNode?: boolean;                 // Indica si actúa como nodo servidor de la sede
  notes?: string;
  dailyRevenue?: number;
  openShiftId?: string;
}

export type RemoteCommandType = 
  | 'restart_pos'
  | 'force_sync'
  | 'cash_lock_shift'
  | 'lock_terminal'
  | 'unlock_terminal'
  | 'remote_db_backup'
  | 'test_barrier'
  | 'ping_telemetry'
  | 'broadcast_message'
  | 'push_tariffs'
  | 'clear_cache'
  | 'maintenance_mode';

export interface RemoteExecutionOrder {
  id: string;
  commandNumber: string;                  // e.g. 'CMD-2026-089'
  branchId: string;
  branchName: string;
  posPointId?: string;                    // Target específico o vacía si aplica a toda la sucursal
  posPointName?: string;
  commandType: RemoteCommandType;
  title: string;
  description?: string;
  parameters?: Record<string, any>;       // e.g. { messageText: string, delaySeconds: number, reason: string }
  issuedAt: string;
  executedAt?: string;
  issuedBy: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  resultMessage?: string;
  executionTimeMs?: number;
  outputLogs?: string[];
}

export interface BranchLocation {
  id: string;
  code: string;                           // e.g. 'SUC-001', 'SUC-002', 'SUC-003'
  name: string;                           // e.g. 'Sede Principal - Calle 72', 'Sede Unicentro Norte'
  city: string;                           // e.g. 'Bogotá D.C.', 'Medellín', 'Cali', 'Barranquilla'
  address: string;                        // Dirección física de la sede
  phone?: string;
  managerName?: string;
  status: 'online' | 'offline' | 'syncing' | 'warning';
  ipAddress?: string;
  publicIp?: string;                      // IP pública real detectada de la sucursal (WAN)
  localIp?: string;                       // IP privada interna de la red de la sede (LAN)
  reportedPublicIp?: string;              // Última IP pública confirmada vía heartbeat
  lastIpReportedAt?: string;              // Fecha/hora del último reporte de IP
  port?: number;
  webSocketsUrl?: string;
  currentAppVersion: string;              // Versión instalada en la sucursal (ej. 'v2.4.0')
  lastSyncTimestamp: string;              // Último ping o sincronización exitosa
  totalSpots: number;
  occupiedSpots: number;
  todayRevenue: number;                   // Recaudo acumulado del día
  todayVehicles: number;                  // Vehículos atendidos hoy
  activeShiftNumber?: number;
  currentCashier?: string;
  pendingUpdatesCount?: number;           // Número de actualizaciones centrales pendientes por aplicar
  isCurrentBranch?: boolean;              // Indica si es la sucursal activa en esta terminal
  warehouseId?: string;                   // Bodega principal asignada a la sucursal
  warehouseName?: string;
  posPointsCount?: number;                // Número de puntos/cajas POS activas en la sucursal
  lastRemoteCommand?: string;             // Última orden remota ejecutada
  lastRemoteCommandTime?: string;
  notes?: string;
  systemUrl?: string;
  domain?: string;                        // Nombre de dominio / DDNS de la sede (ej. 'sucursal1.ddns.net')
  ddnsDomain?: string;                    // Alias para dominio DDNS
  farmadeskId?: string;
  farmadeskPassword?: string;
  farmadeskPort?: number;
  anydeskId?: string;
  rustdeskId?: string;
  vncPassword?: string;
  lat?: number;                           // Coordenada latitud para mapas y geolocalización
  lng?: number;                           // Coordenada longitud para mapas y geolocalización
  latencyMs?: number;                     // Latencia telemática en tiempo real (ms)
  pingMethod?: 'tcp' | 'http' | 'icmp' | 'none'; // Método de sondeo exitoso
  pingDetails?: string;                   // Detalles técnicos del último ping
  lastPingAt?: string;                    // Timestamp del último ping ejecutado desde Central
  systemLoad?: number;                    // Carga de CPU / Sistema (0-100%)
  memoryUsage?: number;                   // Uso de memoria RAM (0-100%)
  diskUsage?: number;                     // Uso de disco (%)
  activeConnections?: number;             // Conexiones activas en la sede
  installedGlobalVersion?: string;        // Versión de globales/parámetros instalada en la sede (ej. 'G-1.0.3')
  installedGlobalAt?: string;             // Fecha y hora en la que se aplicó la versión de globales en la sucursal
  installedSoftwareAt?: string;           // Fecha y hora en la que se instaló la versión del software en la sucursal
  installedSoftwareVersion?: string;      // Versión del sistema / binario instalada en la sede (ej. 'v2.6.0-enterprise')
  isGlobalOutdated?: boolean;             // Si la versión de globales está desactualizada respecto a la Central
  isAppOutdated?: boolean;                // Si la versión del sistema está desactualizada respecto a la Central
  financialShiftSummary?: {
    shiftNumber: number;
    totalCollected: number;
    cashCollected?: number;
    electronicCollected?: number;
    expensesTotal?: number;
    cashierName?: string;
    consecutiveArqueo?: string;
    cashInDrawer?: number;
    lastClosureDate?: string;
  };
}

export interface CentralGlobalVersionData {
  activeVersion: string;
  publishedAt: string;
  publishedBy: string;
  title: string;
  description: string;
  targetScope: 'all' | 'specific';
  targetBranchIds: string[];
  rates?: any;
  users?: any[];
  userTemplates?: any[];
  roleMatrixConfig?: any;
  vehicleCategories?: any[];
  expenseConcepts?: any[];
  expenseCategories?: any[];
  parameters?: any;
  branches?: BranchLocation[];
  warehouses?: Warehouse[];
  posPoints?: PosPoint[];
  history?: Array<{
    version: string;
    archivedAt: string;
    title?: string;
    description?: string;
  }>;
}

export interface CentralUpdatePackage {
  id: string;
  packageNumber: string;                  // e.g. 'PKG-2026-003'
  title: string;
  description: string;
  author: string;
  createdAt: string;
  targetScope: 'all' | 'specific';
  targetBranchIds: string[];              // IDs de sucursales seleccionadas o vacío si es 'all'
  type?: string;
  updateTypes?: ('rates' | 'vehicle_categories' | 'expense_concepts' | 'expense_categories' | 'payment_methods' | 'business_policies' | 'software_features' | 'users' | 'global_parameters' | string)[];
  payload: {
    globalVersion?: string;
    rates?: RatesConfig;
    vehicleCategories?: VehicleCategoryConfig[];
    expenseConcepts?: ExpenseConcept[];
    expenseCategories?: ExpenseCategory[];
    users?: SystemUser[];
    userTemplates?: UserPermissionTemplate[];
    roleMatrixConfig?: any;
    parameters?: Record<string, any>;
    paymentGatewayConfig?: Partial<PaymentGatewayConfig>;
    businessInfoUpdates?: Partial<ParkingBusinessInfo>;
    newProducts?: { id: string; name: string; price: number; category: string; description?: string }[];
    featureFlags?: Record<string, boolean>;
    branches?: BranchLocation[];
    warehouses?: Warehouse[];
    posPoints?: PosPoint[];
  };
  status?: 'published' | 'draft' | 'archived';
  appliedByBranches?: {
    branchId: string;
    branchName: string;
    appliedAt: string;
    status?: 'success' | 'failed' | 'pending';
  }[];
}

export interface ServerDataConnectionConfig {
  // Servidor Base de Datos Local
  localDbHost: string;              // e.g. '192.168.14.252' o '127.0.0.1'
  localDbName: string;              // e.g. 'droposservidor2019db' o 'ParqueaderoPOS_DB'
  localDbUser: string;              // e.g. 'java' o 'pos_local'
  localDbPassword: string;          // e.g. 'd2218aa'
  localOperatingSystem: string;     // e.g. 'Ubuntu Linux 2020', 'Windows 10/11', 'Debian Linux'

  // Servidor Base de Datos Remota
  remoteDbHost: string;             // e.g. 'dromedicas.sytes.net' o IP de Servidor Central
  remoteDbName: string;             // e.g. 'central_parqueadero_db'
  remoteDbUser: string;             // e.g. 'admin_central'
  remoteDbPassword: string;         // e.g. Contraseña remota
  remoteWebSocketsUrl: string;      // e.g. 'ws://dromedicas.sytes.net:8088' o 'http://192.168.10.150:3000/api/sync'

  // Parámetros de Operación y Estado
  nodeRole?: 'branch' | 'central';  // Rol de este equipo: Sucursal o Servidor Central
  branchId?: string;                // ID canónico de la sucursal asignada a este equipo
  branchCode?: string;              // Código de la sucursal (ej. 'OFI-001')
  branchName?: string;              // Nombre de la sucursal (ej. 'DESARROLLO Y PRUEBAS')
  autoSyncEnabled?: boolean;
  autoSyncIntervalMinutes?: number;
  lastSyncTimestamp?: string;
  connectionStatus?: 'connected' | 'disconnected' | 'testing' | 'error';
  latencyMs?: number;
  lastErrorMessage?: string;
}

export interface SoftwareReleaseBuild {
  id: string;
  version: string;                        // e.g. 'v2.5.0-enterprise'
  buildNumber: number;
  releaseDate: string;
  channel: 'stable' | 'beta' | 'enterprise';
  title: string;
  description: string;
  changelog: string[];
  newModules: string[];                   // Lista de nuevos módulos y aplicaciones integradas
  visualThemeChanges?: string[];          // Mejoras visuales y de diseño de interfaces
  databaseMigrations?: string[];          // Estructura de base de datos modificada o migraciones DDL
  databaseMigrationRequired: boolean;
  downloadSize: string;                   // e.g. '18.4 MB'
  checksumSha256: string;
  isMandatory: boolean;
  status: 'available' | 'downloading' | 'verifying' | 'ready_to_install' | 'installed';
  isOfficialDispatched?: boolean;         // true si el Servidor Central autorizó y despachó la versión
  isExperimentalOnly?: boolean;           // true si es Beta/experimental que requiere autorización
  targetScope?: 'all' | 'specific';
  targetBranchIds?: string[];
  lastDispatchedDate?: string;
  commitHash?: string;                    // Hash corto de commit Git (ej. '9cd1a65')
  commitDate?: string;                    // Fecha y hora exacta del commit en el repositorio
  installedAt?: string;                   // Fecha y hora en la que se instaló en esta terminal
}

export interface BranchSyncAuditRecord {
  id: string;
  timestamp: string;
  branchId: string;
  branchName: string;
  direction?: 'inbound_from_central' | 'outbound_to_central' | 'inbound' | 'outbound';
  syncType: 'config_pull' | 'telemetry_push' | 'financial_close_push' | 'software_ota' | 'inbound_push' | 'bidirectional_sync' | string;
  summary: string;
  itemsAffectedCount?: number;
  itemsReceived?: number;
  itemsSent?: number;
  status: 'success' | 'warning' | 'error';
  operator?: string;
  performedBy?: string;
}

export interface SystemUser {
  id: string;
  username: string;          // Alias único de ingreso (ej. 'admin', 'supervisor', 'cajero1')
  name: string;              // Nombre completo
  password: string;          // Contraseña o PIN
  role: UserRole;
  isActive: boolean;
  permissions: UserPermissions;
  createdAt: string;
  lastLogin?: string;
}

export interface UserPermissionTemplate {
  id: string;
  name: string;
  description: string;
  role: UserRole;
  permissions: UserPermissions;
  uiVisibility: UserUIVisibility;
  isSystem?: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  terminalId: string;
  action: 'ENTRY' | 'EXIT_PAYMENT' | 'RATE_CHANGE' | 'SHIFT_OPEN' | 'SHIFT_CLOSE' | 'CASH_MOVEMENT' | 'DB_BACKUP' | 'DB_RESTORE' | 'USER_CREATE' | 'USER_UPDATE' | 'USER_DELETE' | 'LOGIN' | 'LOGOUT' | 'GATEWAY_CONFIG' | 'SHIFT_CLOSE_ARQUEO' | 'DAY_DEFINITIVE_CLOSE' | 'SYSTEM_CONFIG' | 'STATE_AUDIT' | string;
  details: string;
  operator: string;
}

// =========================================================================
// CONFIGURACIÓN DE MODO DE TRABAJO (SERVIDOR APLICACIÓN VS PUNTO DE VENTA)
// =========================================================================

export type SystemWorkMode = 'server' | 'pos'; // 'Servidor Aplicación' | 'Punto de Venta'
export type BillingSystemMode = 'pos_invoice' | 'open_accounts' | 'time_service';

export interface SystemNodeConfig {
  workMode: SystemWorkMode; // 'server' | 'pos'
  selectedBranchId: string; // ID de la sucursal activa
  establishmentName: string; // Nombre del Establecimiento (ej. DROMEDICAS DEL ORIENTE SAS o FARMANORTE 03)
  establishmentNit: string; // N.I.T. del Establecimiento (ej. 900265730-0)
  establishmentAddress?: string; // Dirección
  establishmentPhone?: string; // Teléfono
  legalRepresentative: string; // Representante Legal
  operationalDate: string; // Día Operativo (ej. '19/09/2026')
  printerSerialOrFiscalMachine: string; // Serial Impresora / Máquina Fiscal (ej. 'TC6Y313412')
  defaultWarehouseOrYard: string; // Bodega / Patio Predeterminado (ej. 'PATIO PRINCIPAL', 'DEPÓSITO CÚCUTA')
  billingMode: BillingSystemMode; // Factura P.O.S. | Mesas y Cuentas Abiertas | Serv. Por Tiempo

  // Servidores & Enlace Central
  centralServerHost: string; // Host / IP Central (ej. '192.168.10.150')
  centralServerPort: number; // Puerto App POS LAN (ej. 3000)
  farmadeskPort?: number; // Puerto Señalización FarmaDesk (predeterminado 9050)
  farmadeskLanPort?: number; // Puerto LAN FarmaDesk (predeterminado 9050)
  farmadeskWanPort?: number; // Puerto WAN FarmaDesk (predeterminado 9050)
  centralAuthToken: string; // Token de autenticación y enlace cifrado
  databaseName: string; // Base de datos del sistema
  autoSyncIntervalMinutes: number; // Intervalo de sincronización periódica

  // Zonas Base
  primaryZoneName: string;
  secondaryZoneName?: string;

  // Prefijos Predeterminados
  defaultPrefix: string;
  currentSequenceNumber: number;

  // Email & Notificaciones
  alertEmail: string;
  smtpServer?: string;
  smtpPort?: number;
  notifyOnShiftClose: boolean;
  notifyOnDefinitiveDayClose: boolean;

  // Integraciones
  enableBarrierControl: boolean;
  barrierComPort?: string;
  enableLprCamera: boolean;
  lprCameraIp?: string;
  enableRfidReader: boolean;

  // Avisos Recordatorios
  ticketFooterMessage: string;
  enableLowSpotAlert: boolean;
  lowSpotThreshold: number;
}

// =========================================================================
// MÓDULO ANPR / LPR (RECONOCIMIENTO DE PLACAS POR CÁMARAS IP CON IA)
// =========================================================================

export interface IPCameraConfig {
  id: string;
  name: string;
  type: 'entry' | 'exit' | 'surveillance';
  ipAddress: string;
  port: number;
  protocol: 'rtsp' | 'http' | 'mjpeg' | 'simulation';
  streamUrl?: string;
  username?: string;
  password?: string;
  isEnabled: boolean;
  autoRecognizeOnMotion: boolean; // Auto-activación al detectar aproximación de vehículo
  gateTriggerEnabled: boolean;    // Apertura automática de talanquera al verificar placa
  confidenceThreshold: number;   // Umbral mínimo de confianza % (ej. 80%)
  assignedSpotZone?: string;
}

export interface ANPRDetectionRecord {
  id: string;
  timestamp: string;
  cameraId: string;
  cameraName: string;
  cameraType: 'entry' | 'exit';
  plateNumber: string;
  confidenceScore: number;
  vehicleType: VehicleType;
  color?: string;
  brand?: string;
  snapshotImageBase64?: string;
  linkedTicketId?: string;
  notes?: string;
  barrierTriggered?: boolean;
  processedByAiModel?: string;
}

export interface PrinterConfig {
  id: string;
  name: string;
  printerName: string; // The system printer name
  port: string;        // e.g., 'USB', 'COM1', 'LPT1', 'Network'
  isDefault: boolean;
  paperSize: '80mm' | '58mm';
  enabled: boolean;
  footerText?: string;
  autoCut?: boolean;
  openDrawer?: boolean;
}

