const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'data', 'initialData.ts');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Clean INITIAL_ACTIVE_TICKETS, INITIAL_PAID_TICKETS, INITIAL_OPERATIONAL_DAY, INITIAL_CASH_SHIFT
const part1Target = code.substring(
  code.indexOf('// Helper to get time ago'),
  code.indexOf('// --- Default UI Visibility Configurations ---')
);

const part1Replacement = `export const INITIAL_ACTIVE_TICKETS: ParkingTicket[] = [];

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
  finalCash: 0,
  totalCollected: 0,
  status: 'closed',
  cashMovements: [],
};

`;

code = code.replace(part1Target, part1Replacement);

// 2. Clean INITIAL_CLOSED_SHIFTS and INITIAL_CLOSED_DAYS
const shiftsStart = code.indexOf('export const INITIAL_CLOSED_SHIFTS: CashShift[] = [');
const warehousesStart = code.indexOf('export const INITIAL_WAREHOUSES: Warehouse[] = [');
const shiftsTarget = code.substring(shiftsStart, warehousesStart);
const shiftsReplacement = `export const INITIAL_CLOSED_SHIFTS: CashShift[] = [];

`;
code = code.replace(shiftsTarget, shiftsReplacement);

// 3. Clean INITIAL_WAREHOUSES, INITIAL_POS_POINTS, INITIAL_CLOSED_DAYS, INITIAL_BRANCHES, INITIAL_REMOTE_ORDERS, INITIAL_CENTRAL_PACKAGES
const middleStart = code.indexOf('export const INITIAL_WAREHOUSES: Warehouse[] = [');
const buildsStart = code.indexOf('export const INITIAL_SOFTWARE_BUILDS: SoftwareReleaseBuild[] = [');
const middleTarget = code.substring(middleStart, buildsStart);

const middleReplacement = `export const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: 'bod-001',
    code: 'BOD-001',
    name: 'Bodega Principal',
    type: 'general',
    branchId: 'suc-001',
    branchName: 'Sede Principal',
    address: 'Sede Principal',
    capacity: 1000,
    manager: 'Administrador',
    phone: '',
    isActive: true,
    itemsCount: 0,
    notes: 'Bodega principal de insumos y consumibles.',
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

`;

code = code.replace(middleTarget, middleReplacement);

// 4. Clean INITIAL_SYNC_AUDIT_LOGS
const logsStart = code.indexOf('export const INITIAL_SYNC_AUDIT_LOGS: BranchSyncAuditRecord[] = [');
const nodeConfigStart = code.indexOf('export const INITIAL_SYSTEM_NODE_CONFIG: SystemNodeConfig = {');
const logsTarget = code.substring(logsStart, nodeConfigStart);
const logsReplacement = `export const INITIAL_SYNC_AUDIT_LOGS: BranchSyncAuditRecord[] = [];

`;
code = code.replace(logsTarget, logsReplacement);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated src/data/initialData.ts to clean baseline!');
