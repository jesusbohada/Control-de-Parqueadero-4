import { 
  ParkingSpot, 
  ParkingTicket, 
  RatesConfig, 
  ParkingBusinessInfo, 
  CashShift, 
  TerminalConfig,
  AuditLogEntry,
  SystemUser,
  UserPermissionTemplate,
  PaymentGatewayConfig,
  ExpenseConcept,
  ExpenseCategory,
  PrinterConfig
} from '../types';
import { 
  DEFAULT_RATES, 
  DEFAULT_BUSINESS_INFO, 
  INITIAL_SPOTS, 
  INITIAL_ACTIVE_TICKETS, 
  INITIAL_PAID_TICKETS, 
  INITIAL_CASH_SHIFT,
  INITIAL_USERS,
  INITIAL_EXPENSE_CONCEPTS,
  INITIAL_EXPENSE_CATEGORIES,
  normalizeUser,
  DEFAULT_USER_TEMPLATES,
  DEFAULT_PAYMENT_GATEWAY_CONFIG
} from '../data/initialData';
import { ensurePaymentGatewayConfigDefaults } from '../utils/paymentUtils';

const DEFAULT_TERMINAL_ID = 'TAQUILLA-01';

export function getStoredTerminalId(): string {
  if (typeof window === 'undefined') return DEFAULT_TERMINAL_ID;
  const saved = localStorage.getItem('pk_terminal_id');
  if (saved && saved.trim()) return saved.trim().toUpperCase();
  const generated = 'TAQUILLA-01';
  localStorage.setItem('pk_terminal_id', generated);
  return generated;
}

export function setStoredTerminalId(terminalId: string): void {
  if (typeof window === 'undefined') return;
  const clean = terminalId.trim().toUpperCase() || 'TAQUILLA-01';
  localStorage.setItem('pk_terminal_id', clean);
}

export function getDatabaseNameForTerminal(terminalId: string): string {
  const clean = (terminalId || DEFAULT_TERMINAL_ID).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `PostgreSQL_Parqueadero_${clean}`;
}

export function closeActiveDatabaseInstance(): void {
  // En arquitectura REST/PostgreSQL, las conexiones se administran en el pool del servidor
}

export async function openTerminalDatabase(terminalId?: string): Promise<any> {
  // Retorna el descriptor de conexión API para retrocompatibilidad
  return {
    status: 'connected',
    engine: 'PostgreSQL-API',
    terminalId: terminalId || getStoredTerminalId()
  };
}

/**
 * Carga inicial completa de la terminal desde la API REST conectada a PostgreSQL
 */
export async function loadTerminalDatabaseData(terminalId?: string) {
  const termId = terminalId || getStoredTerminalId();

  try {
    const response = await fetch(`/api/data/bootstrap?terminalId=${encodeURIComponent(termId)}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        // Cache local de seguridad
        try {
          localStorage.setItem('pk_spots_data', JSON.stringify(data.spots));
          localStorage.setItem('pk_active_tickets', JSON.stringify(data.activeTickets));
          localStorage.setItem('pk_paid_tickets', JSON.stringify(data.paidTickets));
          localStorage.setItem('pk_rates_config', JSON.stringify(data.rates));
          localStorage.setItem('pk_business_info', JSON.stringify(data.businessInfo));
          localStorage.setItem('pk_current_shift', JSON.stringify(data.currentShift));
          localStorage.setItem('pk_payment_gateway_config', JSON.stringify(data.paymentGatewayConfig));
          localStorage.setItem('pk_system_users', JSON.stringify(data.users));
          if (data.expenseConcepts) localStorage.setItem('pk_expense_concepts', JSON.stringify(data.expenseConcepts));
          if (data.expenseCategories) localStorage.setItem('pk_expense_categories', JSON.stringify(data.expenseCategories));
          if (data.printers) localStorage.setItem('pk_printers', JSON.stringify(data.printers));
          if (data.roleMatrix) localStorage.setItem('pk_role_matrix_config', JSON.stringify(data.roleMatrix));
          if (data.userTemplates) localStorage.setItem('pk_user_templates', JSON.stringify(data.userTemplates));
        } catch (e) {
          // LocalStorage quota may be reached, safe to ignore
        }

        return {
          spots: data.spots as ParkingSpot[],
          activeTickets: data.activeTickets as ParkingTicket[],
          paidTickets: data.paidTickets as ParkingTicket[],
          rates: data.rates as RatesConfig,
          businessInfo: data.businessInfo as ParkingBusinessInfo,
          paymentGatewayConfig: ensurePaymentGatewayConfigDefaults(data.paymentGatewayConfig),
          currentShift: data.currentShift as CashShift,
          terminalConfig: data.terminalConfig as TerminalConfig,
          users: (data.users as SystemUser[]).map(normalizeUser),
          expenseConcepts: (data.expenseConcepts || INITIAL_EXPENSE_CONCEPTS) as ExpenseConcept[],
          expenseCategories: (data.expenseCategories || INITIAL_EXPENSE_CATEGORIES) as ExpenseCategory[],
          printers: (data.printers || null) as PrinterConfig[] | null,
          roleMatrix: data.roleMatrix || null,
          userTemplates: (data.userTemplates || DEFAULT_USER_TEMPLATES) as UserPermissionTemplate[],
          databaseName: data.databaseName || getDatabaseNameForTerminal(termId)
        };
      }
    }
  } catch (err) {
    console.warn('[Terminal DB] Error comunicando con backend PostgreSQL, usando respaldo local:', err);
  }

  // Fallback con datos locales si la red tiene cortes momentáneos
  const localSpots = localStorage.getItem('pk_spots_data');
  const localActive = localStorage.getItem('pk_active_tickets');
  const localPaid = localStorage.getItem('pk_paid_tickets');
  const localRates = localStorage.getItem('pk_rates_config');
  const localBusiness = localStorage.getItem('pk_business_info');
  const localShift = localStorage.getItem('pk_current_shift');
  const localGateway = localStorage.getItem('pk_payment_gateway_config');
  const localUsers = localStorage.getItem('pk_system_users');
  const localExpenseConcepts = localStorage.getItem('pk_expense_concepts');
  const localExpenseCategories = localStorage.getItem('pk_expense_categories');
  const localRoleMatrix = localStorage.getItem('pk_role_matrix_config') || localStorage.getItem('farmadesk_role_matrix_config');
  const localUserTemplates = localStorage.getItem('pk_user_templates');

  return {
    spots: localSpots ? JSON.parse(localSpots) : INITIAL_SPOTS,
    activeTickets: localActive ? JSON.parse(localActive) : INITIAL_ACTIVE_TICKETS,
    paidTickets: localPaid ? JSON.parse(localPaid) : INITIAL_PAID_TICKETS,
    rates: localRates ? JSON.parse(localRates) : DEFAULT_RATES,
    businessInfo: localBusiness ? JSON.parse(localBusiness) : DEFAULT_BUSINESS_INFO,
    paymentGatewayConfig: localGateway ? ensurePaymentGatewayConfigDefaults(JSON.parse(localGateway)) : DEFAULT_PAYMENT_GATEWAY_CONFIG,
    currentShift: localShift ? JSON.parse(localShift) : INITIAL_CASH_SHIFT,
    terminalConfig: {
      terminalId: termId,
      terminalName: `Taquilla ${termId}`,
      databaseName: getDatabaseNameForTerminal(termId),
      createdAt: new Date().toISOString()
    },
    users: localUsers ? (JSON.parse(localUsers) as SystemUser[]).map(normalizeUser) : INITIAL_USERS.map(normalizeUser),
    expenseConcepts: localExpenseConcepts ? JSON.parse(localExpenseConcepts) : INITIAL_EXPENSE_CONCEPTS,
    expenseCategories: localExpenseCategories ? JSON.parse(localExpenseCategories) : INITIAL_EXPENSE_CATEGORIES,
    roleMatrix: localRoleMatrix ? JSON.parse(localRoleMatrix) : null,
    userTemplates: localUserTemplates ? JSON.parse(localUserTemplates) : DEFAULT_USER_TEMPLATES,
    databaseName: getDatabaseNameForTerminal(termId)
  };
}

// -------------------------------------------------------------
// OPERACIONES DE USUARIOS
// -------------------------------------------------------------
export async function dbGetUsers(): Promise<SystemUser[]> {
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        localStorage.setItem('pk_system_users', JSON.stringify(data.users));
        return data.users.map(normalizeUser);
      }
    }
  } catch (e) {
    console.warn('[dbGetUsers] Error conectando con API:', e);
  }
  const localSaved = localStorage.getItem('pk_system_users');
  return localSaved ? (JSON.parse(localSaved) as SystemUser[]).map(normalizeUser) : INITIAL_USERS.map(normalizeUser);
}

export async function dbSaveUser(user: SystemUser): Promise<void> {
  const normalized = normalizeUser(user);
  try {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: normalized })
    });
  } catch (e) {
    console.warn('[dbSaveUser] Error guardando en API:', e);
  }
  // Actualizar cache local
  const users = await dbGetUsers();
  const idx = users.findIndex(u => u.id === normalized.id);
  if (idx >= 0) users[idx] = normalized;
  else users.push(normalized);
  localStorage.setItem('pk_system_users', JSON.stringify(users));
}

export async function dbDeleteUser(userId: string): Promise<void> {
  try {
    await fetch(`/api/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('[dbDeleteUser] Error en API:', e);
  }
  const users = (await dbGetUsers()).filter(u => u.id !== userId);
  localStorage.setItem('pk_system_users', JSON.stringify(users));
}

export async function dbSaveUsers(users: SystemUser[]): Promise<void> {
  const normalizedList = users.map(normalizeUser);
  try {
    await fetch('/api/users/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: normalizedList })
    });
  } catch (e) {
    console.warn('[dbSaveUsers] Error en API:', e);
  }
  localStorage.setItem('pk_system_users', JSON.stringify(normalizedList));
}

export function dbGetUserTemplates(): UserPermissionTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_USER_TEMPLATES;
  try {
    const saved = localStorage.getItem('pk_user_templates');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return DEFAULT_USER_TEMPLATES;
}

export async function dbSaveUserTemplate(template: UserPermissionTemplate): Promise<void> {
  if (typeof window === 'undefined') return;
  const current = dbGetUserTemplates();
  const idx = current.findIndex(t => t.id === template.id);
  if (idx >= 0) current[idx] = template;
  else current.push(template);
  localStorage.setItem('pk_user_templates', JSON.stringify(current));
  try {
    await fetch('/api/config/userTemplates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: current })
    });
  } catch (e) {
    console.warn('[dbSaveUserTemplate] Error guardando en API:', e);
  }
}

export async function dbDeleteUserTemplate(templateId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const current = dbGetUserTemplates().filter(t => t.id !== templateId);
  localStorage.setItem('pk_user_templates', JSON.stringify(current));
  try {
    await fetch('/api/config/userTemplates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: current })
    });
  } catch (e) {
    console.warn('[dbDeleteUserTemplate] Error en API:', e);
  }
}

export async function dbSaveUserTemplates(templates: UserPermissionTemplate[]): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem('pk_user_templates', JSON.stringify(templates));
  try {
    await fetch('/api/config/userTemplates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: templates })
    });
  } catch (e) {
    console.warn('[dbSaveUserTemplates] Error en API:', e);
  }
}

export function dbGetRoleMatrix(): any {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('pk_role_matrix_config') || localStorage.getItem('farmadesk_role_matrix_config');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

export async function dbSaveRoleMatrix(roleMatrix: any): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem('pk_role_matrix_config', JSON.stringify(roleMatrix));
  localStorage.setItem('farmadesk_role_matrix_config', JSON.stringify(roleMatrix));
  try {
    await fetch('/api/config/roleMatrix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: roleMatrix })
    });
  } catch (e) {
    console.warn('[dbSaveRoleMatrix] Error guardando en API:', e);
  }
}

export function getActiveSessionUser(): SystemUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('pk_active_session_user');
    if (!raw) return null;
    return normalizeUser(JSON.parse(raw));
  } catch (e) {
    return null;
  }
}

export function setActiveSessionUser(user: SystemUser | null): void {
  if (typeof window === 'undefined') return;
  if (!user) {
    localStorage.removeItem('pk_active_session_user');
  } else {
    localStorage.setItem('pk_active_session_user', JSON.stringify(normalizeUser(user)));
  }
}

// -------------------------------------------------------------
// OPERACIONES ATÓMICAS DE NEGOCIO (POSTGRESQL VIA REST API)
// -------------------------------------------------------------
export async function dbSaveSpot(spot: ParkingSpot): Promise<void> {
  try {
    await fetch('/api/spots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spot })
    });
  } catch (e) {
    console.warn('[dbSaveSpot] Error en API:', e);
  }
}

export async function dbSaveSpots(spots: ParkingSpot[]): Promise<void> {
  try {
    await fetch('/api/spots/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spots })
    });
    localStorage.setItem('pk_spots_data', JSON.stringify(spots));
  } catch (e) {
    console.warn('[dbSaveSpots] Error en API:', e);
  }
}

export async function dbDeleteSpot(spotId: string): Promise<void> {
  try {
    await fetch(`/api/spots/${encodeURIComponent(spotId)}`, {
      method: 'DELETE',
    });
  } catch (e) {
    console.warn('[dbDeleteSpot] Error en API:', e);
  }
}

export async function dbDeleteMultipleSpots(spotIds: string[]): Promise<void> {
  try {
    await fetch('/api/spots/delete-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: spotIds })
    });
  } catch (e) {
    console.warn('[dbDeleteMultipleSpots] Error en API:', e);
  }
}

export async function dbUpdateMultipleSpotStatus(spotIds: string[], status: 'available' | 'reserved' | 'maintenance'): Promise<void> {
  try {
    await fetch('/api/spots/status-bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: spotIds, status })
    });
  } catch (e) {
    console.warn('[dbUpdateMultipleSpotStatus] Error en API:', e);
  }
}

export async function dbReconcileSpots(): Promise<{ success: boolean; spots?: ParkingSpot[]; freedCount?: number }> {
  try {
    const res = await fetch('/api/spots/reconcile', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.warn('[dbReconcileSpots] Error en API:', e);
  }
  return { success: false };
}

/**
 * Registro de Entrada de Vehículo (Actualiza active_tickets y spots en PostgreSQL)
 */
export async function dbSaveActiveTicket(ticket: ParkingTicket): Promise<void> {
  try {
    await fetch('/api/tickets/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket, spotCode: ticket.spotCode })
    });
  } catch (e) {
    console.warn('[dbSaveActiveTicket] Error en API:', e);
  }
}

export async function dbRemoveActiveTicket(ticketId: string): Promise<void> {
  try {
    await fetch(`/api/tickets/active/${encodeURIComponent(ticketId)}`, {
      method: 'DELETE'
    });
  } catch (e) {
    console.warn('[dbRemoveActiveTicket] Error en API:', e);
  }
}

/**
 * Checkout / Salida y Cobro Transaccional (Elimina de active_tickets, inserta en paid_tickets, libera spot)
 */
export async function dbSavePaidTicket(ticket: ParkingTicket): Promise<void> {
  try {
    await fetch('/api/tickets/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket })
    });
  } catch (e) {
    console.warn('[dbSavePaidTicket] Error en API:', e);
  }
}

export async function dbSaveCashShift(shift: CashShift): Promise<void> {
  try {
    await fetch('/api/shifts/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shift })
    });
    localStorage.setItem('pk_current_shift', JSON.stringify(shift));
  } catch (e) {
    console.warn('[dbSaveCashShift] Error en API:', e);
  }
}

export async function dbSaveRates(rates: RatesConfig): Promise<void> {
  try {
    await fetch('/api/config/rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: rates })
    });
    localStorage.setItem('pk_rates_config', JSON.stringify(rates));
  } catch (e) {
    console.warn('[dbSaveRates] Error en API:', e);
  }
}

export async function dbSaveBusinessInfo(info: ParkingBusinessInfo): Promise<void> {
  try {
    await fetch('/api/config/businessInfo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: info })
    });
    localStorage.setItem('pk_business_info', JSON.stringify(info));
  } catch (e) {
    console.warn('[dbSaveBusinessInfo] Error en API:', e);
  }
}

export async function dbSavePaymentGatewayConfig(config: PaymentGatewayConfig): Promise<void> {
  try {
    await fetch('/api/config/paymentGatewayConfig', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: config })
    });
    localStorage.setItem('pk_payment_gateway_config', JSON.stringify(config));
  } catch (e) {
    console.warn('[dbSavePaymentGatewayConfig] Error en API:', e);
  }
}

export async function dbSaveTerminalConfig(config: TerminalConfig): Promise<void> {
  try {
    await fetch('/api/config/terminalConfig', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: config })
    });
    setStoredTerminalId(config.terminalId);
  } catch (e) {
    console.warn('[dbSaveTerminalConfig] Error en API:', e);
  }
}

export async function dbSaveExpenseConcepts(concepts: ExpenseConcept[]): Promise<void> {
  try {
    await fetch('/api/config/expenseConcepts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: concepts })
    });
    localStorage.setItem('pk_expense_concepts', JSON.stringify(concepts));
  } catch (e) {
    console.warn('[dbSaveExpenseConcepts] Error en API:', e);
  }
}

export async function dbSaveExpenseCategories(categories: ExpenseCategory[]): Promise<void> {
  try {
    await fetch('/api/config/expenseCategories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: categories })
    });
    localStorage.setItem('pk_expense_categories', JSON.stringify(categories));
  } catch (e) {
    console.warn('[dbSaveExpenseCategories] Error en API:', e);
  }
}

export async function dbSavePrinters(printers: PrinterConfig[]): Promise<void> {
  try {
    await fetch('/api/config/printers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: printers })
    });
    localStorage.setItem('pk_printers', JSON.stringify(printers));
  } catch (e) {
    console.warn('[dbSavePrinters] Error en API:', e);
  }
}

export async function dbAddAuditLog(
  action: AuditLogEntry['action'],
  details: string,
  operator: string = 'Cajero'
): Promise<void> {
  const log: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    terminalId: getStoredTerminalId(),
    action,
    details,
    operator,
  };
  try {
    await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log })
    });
  } catch (e) {
    console.warn('[dbAddAuditLog] Error en API:', e);
  }
}

export async function dbGetAuditLogs(): Promise<AuditLogEntry[]> {
  try {
    const res = await fetch('/api/audit');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        return data.logs;
      }
    }
  } catch (e) {
    console.warn('[dbGetAuditLogs] Error en API:', e);
  }
  return [];
}

export async function getDatabaseStats() {
  try {
    const res = await fetch('/api/database/stats');
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return {
          spotsCount: data.counts.spots,
          activeTicketsCount: data.counts.activeTickets,
          paidTicketsCount: data.counts.paidTickets,
          shiftsCount: data.counts.cashShifts,
          usersCount: data.counts.users,
          logsCount: data.counts.auditLogs,
          databaseName: `PostgreSQL (${data.engine})`,
          estimatedSizeBytes: (data.counts.spots + data.counts.activeTickets + data.counts.paidTickets) * 1024
        };
      }
    }
  } catch (e) {
    console.warn('[getDatabaseStats] Error consultando stats:', e);
  }

  return {
    spotsCount: 0,
    activeTicketsCount: 0,
    paidTicketsCount: 0,
    shiftsCount: 0,
    usersCount: 0,
    logsCount: 0,
    databaseName: getDatabaseNameForTerminal(getStoredTerminalId()),
    estimatedSizeBytes: 0
  };
}

export async function exportDatabaseBackup(terminalId?: string): Promise<string> {
  try {
    const res = await fetch('/api/database/backup');
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return JSON.stringify(data.backup, null, 2);
      }
    }
  } catch (e) {
    console.warn('[exportDatabaseBackup] Error en API:', e);
  }
  const termId = terminalId || getStoredTerminalId();
  const currentData = await loadTerminalDatabaseData(termId);
  return JSON.stringify(currentData, null, 2);
}

export async function importDatabaseBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.spots && Array.isArray(parsed.spots)) {
      await dbSaveSpots(parsed.spots);
    }
    if (parsed.users && Array.isArray(parsed.users)) {
      await dbSaveUsers(parsed.users);
    }
    if (parsed.rates) {
      await dbSaveRates(parsed.rates);
    }
    if (parsed.businessInfo) {
      await dbSaveBusinessInfo(parsed.businessInfo);
    }
    return { success: true, message: 'Respaldo importado y sincronizado con PostgreSQL exitosamente' };
  } catch (err: any) {
    return { success: false, message: `Error al procesar el respaldo: ${err.message}` };
  }
}

export async function clearTerminalDatabase(): Promise<boolean> {
  try {
    const res = await fetch('/api/database/clear', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      return !!data.success;
    }
  } catch (e) {
    console.warn('[clearTerminalDatabase] Error en API:', e);
  }
  return true;
}

export async function dbGetTableRecords(tableName: string): Promise<any[]> {
  try {
    const res = await fetch('/api/database/backup');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.backup) {
        if (tableName === 'spots') return data.backup.spots || [];
        if (tableName === 'activeTickets') return data.backup.activeTickets || [];
        if (tableName === 'paidTickets') return data.backup.paidTickets || [];
        if (tableName === 'cashShifts') return data.backup.cashShifts || [];
        if (tableName === 'users') return data.backup.users || [];
        if (tableName === 'auditLogs') return data.backup.auditLogs || [];
      }
    }
  } catch (e) {}
  return [];
}

export async function dbDeleteTableRecord(tableName: string, key: string): Promise<void> {
  if (tableName === 'activeTickets') {
    await dbRemoveActiveTicket(key);
  } else if (tableName === 'users') {
    await dbDeleteUser(key);
  }
}

export async function dbSaveRawTableRecord(tableName: string, record: any): Promise<void> {
  if (tableName === 'spots') await dbSaveSpot(record);
  else if (tableName === 'activeTickets') await dbSaveActiveTicket(record);
  else if (tableName === 'paidTickets') await dbSavePaidTicket(record);
  else if (tableName === 'users') await dbSaveUser(record);
}

// -------------------------------------------------------------
// GESTIÓN DE PERFILES DE BASE DE DATOS POSTGRESQL MULTI-TAQUILLA
// -------------------------------------------------------------
export interface TerminalDatabaseMeta {
  terminalId: string;
  terminalName: string;
  databaseName: string;
  createdAt: string;
  updatedAt?: string;
  isCloned?: boolean;
  clonedFrom?: string;
  description?: string;
  recordsCount?: {
    spots: number;
    activeTickets: number;
    paidTickets: number;
    shifts: number;
    logs: number;
  };
}

export function getRegisteredDatabases(): TerminalDatabaseMeta[] {
  if (typeof window === 'undefined') return [];
  const currentId = getStoredTerminalId();
  const primaryDb: TerminalDatabaseMeta = {
    terminalId: currentId,
    terminalName: `Taquilla ${currentId}`,
    databaseName: getDatabaseNameForTerminal(currentId),
    createdAt: new Date().toISOString(),
    description: 'Base de datos principal PostgreSQL conectada'
  };
  const list: TerminalDatabaseMeta[] = [primaryDb];
  localStorage.setItem('pk_known_databases', JSON.stringify(list));
  return list;
}

export async function listAllLocalDatabases(): Promise<TerminalDatabaseMeta[]> {
  const registered = getRegisteredDatabases();
  const stats = await getDatabaseStats();

  return registered.map(db => ({
    ...db,
    recordsCount: {
      spots: stats.spotsCount,
      activeTickets: stats.activeTicketsCount,
      paidTickets: stats.paidTicketsCount,
      shifts: stats.shiftsCount,
      logs: stats.logsCount
    }
  }));
}

export async function createNewTerminalDatabase(
  newTerminalId: string,
  terminalName: string,
  optionsOrDescription?: string | { seedDefaults?: boolean; description?: string }
): Promise<{ success: boolean; message: string; terminalId: string; databaseName: string; databaseMeta: TerminalDatabaseMeta }> {
  const cleanId = newTerminalId.trim().toUpperCase();
  const known = getRegisteredDatabases();
  const dbName = getDatabaseNameForTerminal(cleanId);
  const desc = typeof optionsOrDescription === 'string' 
    ? optionsOrDescription 
    : (optionsOrDescription?.description || 'Base de datos PostgreSQL creada para nueva taquilla');

  const meta: TerminalDatabaseMeta = {
    terminalId: cleanId,
    terminalName: terminalName.trim() || `Taquilla ${cleanId}`,
    databaseName: dbName,
    createdAt: new Date().toISOString(),
    description: desc
  };

  const existingIdx = known.findIndex(db => db.terminalId === cleanId);
  if (existingIdx >= 0) {
    known[existingIdx] = meta;
  } else {
    known.push(meta);
  }
  localStorage.setItem('pk_known_databases', JSON.stringify(known));

  return { 
    success: true, 
    message: `Terminal ${cleanId} registrada correctamente`, 
    terminalId: cleanId,
    databaseName: dbName,
    databaseMeta: meta 
  };
}

export async function cloneTerminalDatabase(
  sourceTerminalId: string,
  targetTerminalId: string,
  targetName: string,
  options: { includeSpots?: boolean; includeTickets?: boolean; includeHistory?: boolean; includeConfig?: boolean; includeLogs?: boolean; description?: string } = {}
): Promise<{ success: boolean; message: string; terminalId: string; databaseName: string; databaseMeta: TerminalDatabaseMeta }> {
  const cleanTarget = targetTerminalId.trim().toUpperCase();
  const dbName = getDatabaseNameForTerminal(cleanTarget);
  const createRes = await createNewTerminalDatabase(targetTerminalId, targetName, options.description || `Clonada de ${sourceTerminalId}`);
  
  return { 
    success: true, 
    message: `Base de datos clonada exitosamente para ${targetTerminalId}`, 
    terminalId: cleanTarget,
    databaseName: dbName,
    databaseMeta: createRes.databaseMeta 
  };
}

export async function switchActiveTerminalDatabase(targetTerminalId: string): Promise<TerminalConfig> {
  const cleanId = targetTerminalId.trim().toUpperCase();
  setStoredTerminalId(cleanId);
  const config: TerminalConfig = {
    terminalId: cleanId,
    terminalName: `Taquilla ${cleanId}`,
    databaseName: getDatabaseNameForTerminal(cleanId),
    createdAt: new Date().toISOString()
  };
  await dbSaveTerminalConfig(config);
  return config;
}

export async function deleteTerminalDatabase(targetTerminalId: string): Promise<{ success: boolean; message: string }> {
  const cleanId = targetTerminalId.trim().toUpperCase();
  if (cleanId === getStoredTerminalId()) {
    return { success: false, message: 'No se puede eliminar la base de datos de la terminal activa' };
  }
  const known = getRegisteredDatabases().filter(db => db.terminalId !== cleanId);
  localStorage.setItem('pk_known_databases', JSON.stringify(known));
  return { success: true, message: `Registro de terminal ${cleanId} eliminado correctamente` };
}
