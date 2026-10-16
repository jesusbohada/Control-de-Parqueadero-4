import React, { useState, useMemo, Component, ReactNode } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  RefreshCw, 
  Printer, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  MoreVertical, 
  Download, 
  Edit3, 
  Eye, 
  DollarSign, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  CreditCard, 
  Smartphone, 
  QrCode, 
  Sparkles,
  Layers,
  Building2,
  FileSpreadsheet,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Info
} from 'lucide-react';
import { CashShift, OperationalDay, ParkingTicket, ParkingBusinessInfo, SystemUser } from '../types';
import { formatCurrency } from '../utils/billing';

interface CashShiftsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  closedShifts: CashShift[];
  closedDays: OperationalDay[];
  allTickets?: ParkingTicket[];
  currencySymbol: string;
  businessInfo: ParkingBusinessInfo;
  currentUser?: SystemUser | null;
  onUpdateShift?: (updatedShift: CashShift) => void;
  onUpdateDay?: (updatedDay: OperationalDay) => void;
}

type TabType = 'all' | 'shifts' | 'days' | 'audited' | 'discrepancies';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class LocalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 dark:bg-slate-950/90 p-4 overflow-y-auto">
          <div className="bg-white max-w-2xl w-full rounded-2xl p-6 shadow-2xl border border-rose-300 space-y-4 font-sans text-slate-800 dark:text-slate-200">
            <h2 className="text-lg font-bold text-rose-700 flex items-center gap-2">
              <span>🚨 Error en el Histórico de Cierres</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Ocurrió un error inesperado al renderizar el panel histórico. Por favor reporte este detalle técnico a soporte para corregir la inconsistencia de datos:
            </p>
            <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 font-mono text-[11px] text-rose-950 overflow-x-auto whitespace-pre-wrap max-h-60">
              {this.state.error?.message || String(this.state.error)}
              {"\n\nStack:\n"}
              {this.state.error?.stack}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Recargar Aplicación
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const CashShiftsHistoryModalContent: React.FC<CashShiftsHistoryModalProps> = ({
  isOpen,
  onClose,
  closedShifts,
  closedDays,
  allTickets = [],
  currencySymbol,
  businessInfo,
  currentUser,
  onUpdateShift,
  onUpdateDay,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  // Selected Item for Actions
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Modals inside History
  const [selectedRecordForTicket, setSelectedRecordForTicket] = useState<{
    type: 'shift' | 'day';
    shift?: CashShift;
    day?: OperationalDay;
  } | null>(null);

  const [recalculatingItem, setRecalculatingItem] = useState<{
    type: 'shift' | 'day';
    shift?: CashShift;
    day?: OperationalDay;
  } | null>(null);

  const [detailsRecord, setDetailsRecord] = useState<{
    type: 'shift' | 'day';
    shift?: CashShift;
    day?: OperationalDay;
  } | null>(null);

  const [editingNotesRecord, setEditingNotesRecord] = useState<{
    type: 'shift' | 'day';
    shift?: CashShift;
    day?: OperationalDay;
  } | null>(null);

  const [notesInput, setNotesInput] = useState('');
  const [recalcReasonInput, setRecalcReasonInput] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);
  const [voucherPaperWidth, setVoucherPaperWidth] = useState<'80mm' | '58mm'>(() => businessInfo?.defaultPaperWidth || '80mm');

  // Ticket-specific computed values for history reprint
  const ticketData = useMemo(() => {
    if (!selectedRecordForTicket) return null;
    const isShift = selectedRecordForTicket.type === 'shift';
    const s = selectedRecordForTicket.shift;
    const d = selectedRecordForTicket.day;

    const vCash = isShift ? s?.cashCollectedSnapshot ?? 0 : d?.cashCollectedSnapshot ?? 0;
    const vCard = isShift ? s?.cardCollectedSnapshot ?? 0 : d?.cardCollectedSnapshot ?? 0;
    const vWallet = isShift ? s?.walletCollectedSnapshot ?? 0 : d?.walletCollectedSnapshot ?? 0;
    const vQr = isShift ? s?.qrCollectedSnapshot ?? 0 : d?.qrCollectedSnapshot ?? 0;
    const vBreB = isShift ? s?.breBCollectedSnapshot ?? 0 : d?.breBCollectedSnapshot ?? 0;
    const vAgreement = isShift ? s?.agreementCollectedSnapshot ?? 0 : d?.agreementCollectedSnapshot ?? 0;

    const totalExpenses = isShift ? s?.totalExpensesSnapshot ?? 0 : d?.totalExpensesSnapshot ?? 0;
    const totalPickups = isShift ? s?.totalPickupsSnapshot ?? 0 : d?.totalPickupsSnapshot ?? 0;
    const vBase = isShift ? s?.initialCash ?? 0 : d?.initialDayCash ?? 0;

    const vExpectedCash = isShift ? s?.expectedCashSnapshot ?? 0 : d?.expectedCashSnapshot ?? 0;
    const vCountedCash = isShift 
      ? (s?.countedCashSnapshot ?? s?.finalCountedCash ?? vExpectedCash) 
      : (d?.countedCashSnapshot ?? d?.finalDayCash ?? vExpectedCash);
    const cashDifference = isShift 
      ? (s?.cashDifference ?? (vCountedCash - vExpectedCash)) 
      : (d?.cashDifferenceSnapshot ?? (vCountedCash - vExpectedCash));

    const totalVentasFacturadas = isShift ? s?.totalCollectedSnapshot ?? 0 : d?.totalCollected ?? 0;
    const totalEfectivoEntrado = vBase + vCash;
    const totalEgresosReales = totalExpenses;

    const dineroFaltante = (cashDifference < 0) ? Math.abs(cashDifference) : 0;
    const dineroSobrante = (cashDifference > 0) ? cashDifference : 0;

    const efectivoNetoEnGaveta = vCountedCash - vBase;
    const totalAConsignar = totalPickups + Math.max(0, efectivoNetoEnGaveta);

    const shiftMovements = isShift && s ? (Array.isArray(s.cashMovements) ? s.cashMovements : []) : [];
    const expensesList = shiftMovements.filter((m) => m && m.type === 'expense');
    const pickupsList = shiftMovements.filter((m) => m && (m.type === 'pickup' || m.type === 'withdrawal'));

    return {
      isShift,
      vCash,
      vCard,
      vWallet,
      vQr,
      vBreB,
      vAgreement,
      totalExpenses,
      totalPickups,
      vBase,
      vExpectedCash,
      vCountedCash,
      cashDifference,
      totalVentasFacturadas,
      totalEfectivoEntrado,
      totalEgresosReales,
      dineroFaltante,
      dineroSobrante,
      efectivoNetoEnGaveta,
      totalAConsignar,
      expensesList,
      pickupsList,
    };
  }, [selectedRecordForTicket]);

  if (!isOpen) return null;

  // Combine shifts and days into unified list for history table
  const historyList = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'shift' | 'day';
      title: string;
      subtitle: string;
      numberStr: string;
      consecutiveCode?: string;
      operationalDayDate: string;
      openedAt: string;
      closedAt?: string;
      operatorName: string;
      initialCash: number;
      totalCollected: number;
      cashCollected: number;
      cardCollected: number;
      digitalCollected: number;
      totalExpenses: number;
      totalPickups: number;
      expectedCash: number;
      countedCash: number;
      cashDiff: number;
      totalToConsign: number;
      isAudited?: boolean;
      auditedBy?: string;
      recalculatedAt?: string;
      recalculatedBy?: string;
      auditNotes?: string;
      closingNotes?: string;
      rawShift?: CashShift;
      rawDay?: OperationalDay;
    }> = [];

    const safeClosedShifts = Array.isArray(closedShifts) ? closedShifts : [];
    const safeClosedDays = Array.isArray(closedDays) ? closedDays : [];

    // Add closed shifts
    safeClosedShifts.forEach((s) => {
      if (!s || typeof s !== 'object') return;
      const cash = s.cashCollectedSnapshot ?? 0;
      const card = s.cardCollectedSnapshot ?? 0;
      const wallet = s.walletCollectedSnapshot ?? 0;
      const qr = s.qrCollectedSnapshot ?? 0;
      const breB = s.breBCollectedSnapshot ?? 0;
      const digital = card + wallet + qr + breB;

      const movements = Array.isArray(s.cashMovements) ? s.cashMovements : [];
      const exp = s.totalExpensesSnapshot ?? movements.filter(m => m && m.type === 'expense').reduce((a, b) => a + (b.amount || 0), 0);
      const pick = s.totalPickupsSnapshot ?? movements.filter(m => m && (m.type === 'pickup' || m.type === 'withdrawal')).reduce((a, b) => a + (b.amount || 0), 0);

      const initial = s.initialCash || 0;
      const expected = s.expectedCashSnapshot ?? (initial + cash - exp - pick);
      const counted = s.countedCashSnapshot ?? (s.finalCountedCash || expected);
      const diff = s.cashDifference ?? (counted - expected);

      const netCashInDrawer = counted - initial;
      const toConsign = s.totalToConsignSnapshot ?? (pick + Math.max(0, netCashInDrawer));

      const matchedDay = safeClosedDays.find((d) => d.id === s.operationalDayId);
      const rawDate = matchedDay?.date || s.startTime?.split('T')[0] || '';
      const dayDateLabel = rawDate ? new Date(rawDate + 'T12:00:00').toLocaleDateString('es-CO') : `Día #${s.operationalDayNumber || 1}`;

      list.push({
        id: s.id || `shift-${Math.random()}`,
        type: 'shift',
        title: `Arqueo de Turno #${s.shiftNumber || 1}`,
        subtitle: `Día Operativo #${s.operationalDayNumber || 1}`,
        numberStr: `TURNO-${s.shiftNumber || 1}`,
        consecutiveCode: s.consecutiveCode,
        operationalDayDate: dayDateLabel,
        openedAt: s.startTime || new Date().toISOString(),
        closedAt: s.endTime,
        operatorName: s.operatorName || 'Cajero',
        initialCash: initial,
        totalCollected: s.totalCollectedSnapshot ?? (cash + digital),
        cashCollected: cash,
        cardCollected: card,
        digitalCollected: digital,
        totalExpenses: exp,
        totalPickups: pick,
        expectedCash: expected,
        countedCash: counted,
        cashDiff: diff,
        totalToConsign: toConsign,
        isAudited: s.isAudited,
        auditedBy: s.auditedBy,
        recalculatedAt: s.recalculatedAt,
        recalculatedBy: s.recalculatedBy,
        auditNotes: s.auditNotes,
        closingNotes: s.auditNotes,
        rawShift: s,
      });
    });

    // Add closed days
    safeClosedDays.forEach((d) => {
      if (!d || typeof d !== 'object') return;
      const cash = d.cashCollectedSnapshot ?? 0;
      const card = d.cardCollectedSnapshot ?? 0;
      const wallet = d.walletCollectedSnapshot ?? 0;
      const qr = d.qrCollectedSnapshot ?? 0;
      const breB = d.breBCollectedSnapshot ?? 0;
      const digital = card + wallet + qr + breB;

      const exp = d.totalExpensesSnapshot ?? 0;
      const pick = d.totalPickupsSnapshot ?? 0;

      const initial = d.initialDayCash || 0;
      const expected = d.expectedCashSnapshot ?? (initial + cash - exp - pick);
      const counted = d.countedCashSnapshot ?? (d.finalDayCash || expected);
      const diff = d.cashDifferenceSnapshot ?? (counted - expected);

      const netCashInDrawer = counted - initial;
      const toConsign = d.totalToConsignSnapshot ?? (pick + Math.max(0, netCashInDrawer));

      const dayDateLabel = d.date ? new Date(d.date + 'T12:00:00').toLocaleDateString('es-CO') : `Día #${d.dayNumber || 1}`;

      list.push({
        id: d.id || `day-${Math.random()}`,
        type: 'day',
        title: `Cierre Definitivo Día #${d.dayNumber || 1}`,
        subtitle: `Fecha: ${d.formattedDate || d.date || 'Sin fecha'}`,
        numberStr: `CIERRE-DÍA-${d.dayNumber || 1}`,
        consecutiveCode: d.consecutiveCode,
        operationalDayDate: dayDateLabel,
        openedAt: d.openedAt || new Date().toISOString(),
        closedAt: d.closedAt,
        operatorName: d.closedByOperator || 'Administrador',
        initialCash: initial,
        totalCollected: d.totalCollected || 0,
        cashCollected: cash,
        cardCollected: card,
        digitalCollected: digital,
        totalExpenses: exp,
        totalPickups: pick,
        expectedCash: expected,
        countedCash: counted,
        cashDiff: diff,
        totalToConsign: toConsign,
        isAudited: d.isAudited,
        auditedBy: d.auditedBy,
        recalculatedAt: d.recalculatedAt,
        recalculatedBy: d.recalculatedBy,
        auditNotes: d.auditNotes,
        closingNotes: d.closingNotes || d.summaryNotes,
        rawDay: d,
      });
    });

    // Sort newest first safely
    return (list || []).sort((a, b) => {
      const timeA = a.closedAt ? new Date(a.closedAt).getTime() : a.openedAt ? new Date(a.openedAt).getTime() : 0;
      const timeB = b.closedAt ? new Date(b.closedAt).getTime() : b.openedAt ? new Date(b.openedAt).getTime() : 0;
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }, [closedShifts, closedDays]);

  // Filtered List
  const filteredList = useMemo(() => {
    const safeHistoryList = Array.isArray(historyList) ? historyList : [];
    return safeHistoryList.filter((item) => {
      if (!item) return false;
      // Tab Filter
      if (activeTab === 'shifts' && item.type !== 'shift') return false;
      if (activeTab === 'days' && item.type !== 'day') return false;
      if (activeTab === 'audited' && !item.isAudited) return false;
      if (activeTab === 'discrepancies' && item.cashDiff === 0) return false;

      // Date filter
      if (dateFilter !== 'all') {
        const itemDate = new Date(item.closedAt || item.openedAt || '');
        if (isNaN(itemDate.getTime())) return false;
        const now = new Date();
        if (dateFilter === 'today') {
          if (itemDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'week') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (itemDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'month') {
          if (itemDate.getMonth() !== now.getMonth() || itemDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(query);
        const matchOp = (item.operatorName || '').toLowerCase().includes(query);
        const matchNum = (item.numberStr || '').toLowerCase().includes(query);
        const matchNotes = (item.closingNotes || '').toLowerCase().includes(query);
        return matchTitle || matchOp || matchNum || matchNotes;
      }

      return true;
    });
  }, [historyList, activeTab, dateFilter, searchTerm]);

  // Top Metrics
  const metrics = useMemo(() => {
    const safeHistoryList = Array.isArray(historyList) ? historyList : [];
    const totalRecords = safeHistoryList.length;
    const totalRevenue = safeHistoryList.reduce((acc, curr) => acc + (curr?.totalCollected || 0), 0);
    const auditedCount = safeHistoryList.filter(h => h && h.isAudited).length;
    const recalculatedCount = safeHistoryList.filter(h => h && h.recalculatedAt).length;
    const totalToConsignSum = safeHistoryList.reduce((acc, curr) => acc + (curr?.totalToConsign || 0), 0);

    return { totalRecords, totalRevenue, auditedCount, recalculatedCount, totalToConsignSum };
  }, [historyList]);

  // Helper for Recalculation side-by-side comparison
  const recalculationData = useMemo(() => {
    if (!recalculatingItem) return null;

    const { type, shift, day } = recalculatingItem;
    
    let originalSnapshot = {
      cash: 0,
      card: 0,
      wallet: 0,
      qr: 0,
      total: 0,
      expenses: 0,
      pickups: 0,
      expectedCash: 0,
      countedCash: 0,
      diff: 0,
      toConsign: 0,
    };

    let recalculatedValues = {
      cash: 0,
      card: 0,
      wallet: 0,
      qr: 0,
      total: 0,
      expenses: 0,
      pickups: 0,
      expectedCash: 0,
      countedCash: 0,
      diff: 0,
      toConsign: 0,
    };

    if (type === 'shift' && shift) {
      const shiftMovements = Array.isArray(shift.cashMovements) ? shift.cashMovements : [];
      originalSnapshot = {
        cash: shift.cashCollectedSnapshot ?? 0,
        card: shift.cardCollectedSnapshot ?? 0,
        wallet: shift.walletCollectedSnapshot ?? 0,
        qr: shift.qrCollectedSnapshot ?? 0,
        total: shift.totalCollectedSnapshot ?? 0,
        expenses: shift.totalExpensesSnapshot ?? shiftMovements.filter(m => m && m.type === 'expense').reduce((a, b) => a + (b.amount || 0), 0),
        pickups: shift.totalPickupsSnapshot ?? shiftMovements.filter(m => m && (m.type === 'pickup' || m.type === 'withdrawal')).reduce((a, b) => a + (b.amount || 0), 0),
        expectedCash: shift.expectedCashSnapshot ?? 0,
        countedCash: shift.finalCountedCash || 0,
        diff: shift.cashDifference || 0,
        toConsign: shift.totalToConsignSnapshot || 0,
      };

      // Filter tickets for this shift timeframe or day
      const startTime = shift.startTime ? new Date(shift.startTime).getTime() : 0;
      const endTime = shift.endTime ? new Date(shift.endTime).getTime() : Date.now();

      const safeAllTickets = Array.isArray(allTickets) ? allTickets : [];
      const shiftTickets = safeAllTickets.filter(t => {
        if (!t || t.status !== 'paid' || !t.paidAt) return false;
        const paidTime = new Date(t.paidAt).getTime();
        return !isNaN(paidTime) && paidTime >= startTime && paidTime <= endTime;
      });

      let rCash = 0;
      let rCard = 0;
      let rWallet = 0;
      let rQr = 0;

      shiftTickets.forEach((t) => {
        const m = t.paymentMethod;
        const fee = t.totalAmount || 0;
        if (m === 'cash') rCash += fee;
        else if (m === 'card') rCard += fee;
        else if (m === 'wallet' || m === 'nequi' || m === 'daviplata') rWallet += fee;
        else if (m === 'qr' || m === 'qr_bancolombia' || m === 'transfer') rQr += fee;
        else rCash += fee;
      });

      const rTotalCollected = rCash + rCard + rWallet + rQr;
      const rExpenses = shiftMovements.filter(m => m && m.type === 'expense').reduce((a, b) => a + (b.amount || 0), 0);
      const rPickups = shiftMovements.filter(m => m && (m.type === 'pickup' || m.type === 'withdrawal')).reduce((a, b) => a + (b.amount || 0), 0);

      const rExpected = (shift.initialCash || 0) + rCash - rExpenses - rPickups;
      const rCounted = shift.finalCountedCash || rExpected;
      const rDiff = rCounted - rExpected;
      const rNetCash = rCounted - shift.initialCash;
      const rToConsign = rPickups + Math.max(0, rNetCash);

      recalculatedValues = {
        cash: rCash,
        card: rCard,
        wallet: rWallet,
        qr: rQr,
        total: rTotalCollected,
        expenses: rExpenses,
        pickups: rPickups,
        expectedCash: rExpected,
        countedCash: rCounted,
        diff: rDiff,
        toConsign: rToConsign,
      };
    } else if (type === 'day' && day) {
      originalSnapshot = {
        cash: day.cashCollectedSnapshot ?? 0,
        card: day.cardCollectedSnapshot ?? 0,
        wallet: day.walletCollectedSnapshot ?? 0,
        qr: day.qrCollectedSnapshot ?? 0,
        total: day.totalCollected ?? 0,
        expenses: day.totalExpensesSnapshot ?? 0,
        pickups: day.totalPickupsSnapshot ?? 0,
        expectedCash: day.expectedCashSnapshot ?? 0,
        countedCash: day.finalDayCash || 0,
        diff: day.cashDifferenceSnapshot || 0,
        toConsign: day.totalToConsignSnapshot || 0,
      };

      const dayDateStr = day.date || '';
      const safeAllTickets = Array.isArray(allTickets) ? allTickets : [];
      const dayTickets = safeAllTickets.filter(t => {
        if (!t || t.status !== 'paid' || !t.paidAt) return false;
        return dayDateStr ? t.paidAt.startsWith(dayDateStr) : false;
      });

      let rCash = 0;
      let rCard = 0;
      let rWallet = 0;
      let rQr = 0;

      dayTickets.forEach((t) => {
        const m = t.paymentMethod;
        const fee = t.totalAmount || 0;
        if (m === 'cash') rCash += fee;
        else if (m === 'card') rCard += fee;
        else if (m === 'wallet' || m === 'nequi' || m === 'daviplata') rWallet += fee;
        else if (m === 'qr' || m === 'qr_bancolombia' || m === 'transfer') rQr += fee;
        else rCash += fee;
      });

      const rTotalCollected = rCash + rCard + rWallet + rQr;
      const rExpenses = day.totalExpensesSnapshot ?? 0;
      const rPickups = day.totalPickupsSnapshot ?? 0;

      const rExpected = day.initialDayCash + rCash - rExpenses - rPickups;
      const rCounted = day.finalDayCash || rExpected;
      const rDiff = rCounted - rExpected;
      const rNetCash = rCounted - day.initialDayCash;
      const rToConsign = rPickups + Math.max(0, rNetCash);

      recalculatedValues = {
        cash: rCash,
        card: rCard,
        wallet: rWallet,
        qr: rQr,
        total: rTotalCollected,
        expenses: rExpenses,
        pickups: rPickups,
        expectedCash: rExpected,
        countedCash: rCounted,
        diff: rDiff,
        toConsign: rToConsign,
      };
    }

    const variance = recalculatedValues.total - originalSnapshot.total;

    return { originalSnapshot, recalculatedValues, variance };
  }, [recalculatingItem, allTickets]);

  // Execute Recalculation Confirm
  const handleConfirmRecalculation = () => {
    if (!recalculatingItem || !recalculationData) return;

    const nowIso = new Date().toISOString();
    const operatorName = currentUser?.name || 'Supervisor / Administrador';
    const reasonText = recalcReasonInput.trim() ? ` [Motivo: ${recalcReasonInput.trim()}]` : '';

    if (recalculatingItem.type === 'shift' && recalculatingItem.shift && onUpdateShift) {
      const s = recalculatingItem.shift;
      const rv = recalculationData.recalculatedValues;

      const updated: CashShift = {
        ...s,
        recalculatedAt: nowIso,
        recalculatedBy: operatorName,
        recalculationDiff: recalculationData.variance,
        cashCollectedSnapshot: rv.cash,
        cardCollectedSnapshot: rv.card,
        walletCollectedSnapshot: rv.wallet,
        qrCollectedSnapshot: rv.qr,
        totalCollectedSnapshot: rv.total,
        totalExpensesSnapshot: rv.expenses,
        totalPickupsSnapshot: rv.pickups,
        expectedCashSnapshot: rv.expectedCash,
        countedCashSnapshot: rv.countedCash,
        cashDifference: rv.diff,
        totalToConsignSnapshot: rv.toConsign,
        auditNotes: (s.auditNotes ? `${s.auditNotes} | ` : '') + `Recalculado el ${new Date().toLocaleDateString('es-CO')} por ${operatorName}${reasonText}`,
      };

      onUpdateShift(updated);
    } else if (recalculatingItem.type === 'day' && recalculatingItem.day && onUpdateDay) {
      const d = recalculatingItem.day;
      const rv = recalculationData.recalculatedValues;

      const updated: OperationalDay = {
        ...d,
        recalculatedAt: nowIso,
        recalculatedBy: operatorName,
        recalculationDiff: recalculationData.variance,
        totalCollected: rv.total,
        cashCollectedSnapshot: rv.cash,
        cardCollectedSnapshot: rv.card,
        walletCollectedSnapshot: rv.wallet,
        qrCollectedSnapshot: rv.qr,
        totalExpensesSnapshot: rv.expenses,
        totalPickupsSnapshot: rv.pickups,
        expectedCashSnapshot: rv.expectedCash,
        countedCashSnapshot: rv.countedCash,
        cashDifferenceSnapshot: rv.diff,
        totalToConsignSnapshot: rv.toConsign,
        closingNotes: (d.closingNotes ? `${d.closingNotes} | ` : '') + `Recalculado el ${new Date().toLocaleDateString('es-CO')} por ${operatorName}${reasonText}`,
      };

      onUpdateDay(updated);
    }

    setRecalculatingItem(null);
    setRecalcReasonInput('');
  };

  // Save Notes Edit
  const handleSaveNotes = () => {
    if (!editingNotesRecord) return;

    if (editingNotesRecord.type === 'shift' && editingNotesRecord.shift && onUpdateShift) {
      const s = editingNotesRecord.shift;
      onUpdateShift({
        ...s,
        auditNotes: notesInput,
      });
    } else if (editingNotesRecord.type === 'day' && editingNotesRecord.day && onUpdateDay) {
      const d = editingNotesRecord.day;
      onUpdateDay({
        ...d,
        closingNotes: notesInput,
      });
    }

    setEditingNotesRecord(null);
    setNotesInput('');
  };

  // Toggle Audited Status
  const handleToggleAuditStatus = (item: typeof historyList[0]) => {
    const newStatus = !item.isAudited;
    const nowIso = new Date().toISOString();
    const auditor = currentUser?.name || 'Supervisor Auditor';

    if (item.type === 'shift' && item.rawShift && onUpdateShift) {
      onUpdateShift({
        ...item.rawShift,
        isAudited: newStatus,
        auditedBy: newStatus ? auditor : undefined,
        auditedAt: newStatus ? nowIso : undefined,
      });
    } else if (item.type === 'day' && item.rawDay && onUpdateDay) {
      onUpdateDay({
        ...item.rawDay,
        isAudited: newStatus,
        auditedBy: newStatus ? auditor : undefined,
        auditedAt: newStatus ? nowIso : undefined,
      });
    }

    setActiveMenuId(null);
  };

  // Export CSV function
  const handleExportCSV = () => {
    const headers = [
      'Tipo Cierre',
      'Identificador',
      'Fecha Apertura',
      'Fecha Cierre',
      'Cajero Responsable',
      'Base Inicial',
      'Recaudo Efectivo',
      'Recaudo Tarjetas',
      'Recaudo Digital',
      'Total Recaudado',
      'Gastos Caja',
      'Recogidas Efectivo',
      'Efectivo Esperado',
      'Efectivo Físico Contado',
      'Diferencia',
      'Total a Consignar',
      'Auditado',
      'Recalculado',
      'Notas'
    ];

    const rows = filteredList.map(item => [
      item.type === 'shift' ? 'Arqueo Turno' : 'Cierre Definitivo Día',
      item.numberStr,
      new Date(item.openedAt).toLocaleString('es-CO'),
      item.closedAt ? new Date(item.closedAt).toLocaleString('es-CO') : 'En curso',
      `"${item.operatorName}"`,
      item.initialCash,
      item.cashCollected,
      item.cardCollected,
      item.digitalCollected,
      item.totalCollected,
      item.totalExpenses,
      item.totalPickups,
      item.expectedCash,
      item.countedCash,
      item.cashDiff,
      item.totalToConsign,
      item.isAudited ? 'SI' : 'NO',
      item.recalculatedAt ? 'SI' : 'NO',
      `"${(item.closingNotes || '').replace(/"/g, '"')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historico_cierres_caja_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyRecordSummary = (item: typeof historyList[0]) => {
    const text = `
=== COMPROBANTE DE CIERRE: ${item.title.toUpperCase()} ===
Documento: ${item.numberStr}
Responsable: ${item.operatorName}
Fecha: ${new Date(item.closedAt || item.openedAt).toLocaleString('es-CO')}
Base Inicial: ${formatCurrency(item.initialCash, currencySymbol)}
Recaudo Total: ${formatCurrency(item.totalCollected, currencySymbol)}
 - Recaudo Efectivo: ${formatCurrency(item.cashCollected, currencySymbol)}
 - Recaudo Digital / Tarjetas: ${formatCurrency(item.digitalCollected + item.cardCollected, currencySymbol)}
Gastos de Caja: -${formatCurrency(item.totalExpenses, currencySymbol)}
Recogidas de Efectivo: -${formatCurrency(item.totalPickups, currencySymbol)}
Efectivo Esperado: ${formatCurrency(item.expectedCash, currencySymbol)}
Efectivo Contado Declarado: ${formatCurrency(item.countedCash, currencySymbol)}
Diferencia (Sobrante/Faltante): ${item.cashDiff >= 0 ? '+' : ''}${formatCurrency(item.cashDiff, currencySymbol)}
TOTAL A CONSIGNAR: ${formatCurrency(item.totalToConsign, currencySymbol)}
Estado Auditoría: ${item.isAudited ? 'AUDITADO OK' : 'PENDIENTE'}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
    setActiveMenuId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex justify-between items-center shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Histórico de Arqueos y Cierres Definitivos
                <span className="bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs px-2.5 py-0.5 rounded-full font-mono">
                  {metrics.totalRecords} Registros
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Auditoría contable, reimpresión de comprobantes térmicos y recálculo de arqueos
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Metrics Cards */}
        <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-slate-600 dark:text-slate-400 font-medium text-[10px] uppercase tracking-wider">Recaudo Histórico</div>
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
                {formatCurrency(metrics.totalRevenue, currencySymbol)}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-slate-600 dark:text-slate-400 font-medium text-[10px] uppercase tracking-wider">Total a Consignar</div>
              <div className="font-bold text-sm text-indigo-950 dark:text-indigo-300 font-mono">
                {formatCurrency(metrics.totalToConsignSum, currencySymbol)}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="p-2 bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-slate-600 dark:text-slate-400 font-medium text-[10px] uppercase tracking-wider">Cierres Auditados</div>
              <div className="font-bold text-sm text-sky-900 dark:text-sky-300">
                {metrics.auditedCount} de {metrics.totalRecords}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-lg">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-slate-600 dark:text-slate-400 font-medium text-[10px] uppercase tracking-wider">Recalculados</div>
              <div className="font-bold text-sm text-amber-900 dark:text-amber-300">
                {metrics.recalculatedCount} Arqueos
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar: Filter Tabs, Search & Date Selector */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 shrink-0">
          
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'all' 
                  ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todos ({historyList.length})
            </button>

            <button
              onClick={() => setActiveTab('shifts')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'shifts' 
                  ? 'bg-indigo-600 text-white font-bold shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Arqueos de Turno
            </button>

            <button
              onClick={() => setActiveTab('days')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'days' 
                  ? 'bg-emerald-700 text-white font-bold shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Cierres Definitivos Día
            </button>

            <button
              onClick={() => setActiveTab('audited')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'audited' 
                  ? 'bg-sky-700 text-white font-bold shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Auditados OK
            </button>

            <button
              onClick={() => setActiveTab('discrepancies')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'discrepancies' 
                  ? 'bg-rose-600 text-white font-bold shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Con Descuadre
            </button>
          </div>

          {/* Search and Export */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cajero, #, nota..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all outline-hidden"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-hidden cursor-pointer"
            >
              <option value="all">Todas las Fechas</option>
              <option value="today">Solo Hoy</option>
              <option value="week">Última Semana</option>
              <option value="month">Este Mes</option>
            </select>

            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Exportar reporte CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* History List Content */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-100/60 dark:bg-slate-950/60 space-y-3">
          {filteredList.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
              <History className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-600 mb-3" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No se encontraron registros de cierres</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                {searchTerm || dateFilter !== 'all' || activeTab !== 'all'
                  ? 'Intenta ajustar los filtros de búsqueda o fecha seleccionados.'
                  : 'Cuando realices arqueos de turno o cierres definitivos de día, aparecerán listados en este panel.'}
              </p>
            </div>
          ) : (
            filteredList.map((item) => (
              <div 
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md transition-all p-4 relative"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.type === 'shift' 
                          ? 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' 
                          : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}>
                        {item.type === 'shift' ? 'Arqueo de Turno' : 'Cierre Definitivo Día'}
                      </span>

                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {item.numberStr}
                      </span>

                      {item.consecutiveCode && currentUser?.permissions?.canViewConsecutiveInHistory !== false && (
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 flex items-center gap-1 shadow-2xs">
                          Consecutivo No. <strong className="text-slate-950 dark:text-white font-black">{item.consecutiveCode}</strong>
                        </span>
                      )}

                      {currentUser?.permissions?.canViewOperationalDayInHistory !== false && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs ${
                          item.type === 'shift' 
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' 
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          <Calendar className={`w-3.5 h-3.5 ${item.type === 'shift' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                          Día Operativo: <strong className={`font-semibold ${item.type === 'shift' ? 'text-indigo-950 dark:text-indigo-200' : 'text-emerald-950 dark:text-emerald-200'}`}>{item.operationalDayDate}</strong>
                        </span>
                      )}

                      {item.isAudited ? (
                        <span className="bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-sky-700 dark:text-sky-400" />
                          Auditado
                        </span>
                      ) : (
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-full">
                          Pendiente Auditoría
                        </span>
                      )}

                      {item.recalculatedAt && (
                        <span className="bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 text-amber-700 dark:text-amber-400 animate-spin-once" />
                          Recalculado
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
                        <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>Cajero: <strong className="text-slate-900 dark:text-slate-100">{item.operatorName}</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>Cierre: {new Date(item.closedAt || item.openedAt).toLocaleString('es-CO')}</span>
                      </div>
                    </div>

                    {/* Financial Pills Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono">
                      <div className="bg-slate-50 dark:bg-slate-800/70 p-1.5 rounded border border-slate-200 dark:border-slate-700">
                        <div className="text-[9px] text-slate-600 dark:text-slate-400 uppercase font-sans">Base Inicial</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(item.initialCash, currencySymbol)}</div>
                      </div>

                      <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-1.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                        <div className="text-[9px] text-emerald-800 dark:text-emerald-400 uppercase font-sans">Recaudo Total</div>
                        <div className="font-bold text-emerald-950 dark:text-emerald-200">{formatCurrency(item.totalCollected, currencySymbol)}</div>
                      </div>

                      <div className="bg-rose-50/70 dark:bg-rose-950/40 p-1.5 rounded border border-rose-200 dark:border-rose-800/60">
                        <div className="text-[9px] text-rose-800 dark:text-rose-400 uppercase font-sans">Gastos (-)</div>
                        <div className="font-bold text-rose-900 dark:text-rose-200">-{formatCurrency(item.totalExpenses, currencySymbol)}</div>
                      </div>

                      <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-1.5 rounded border border-indigo-200 dark:border-indigo-800/60">
                        <div className="text-[9px] text-indigo-800 dark:text-indigo-400 uppercase font-sans">Recogidas (-)</div>
                        <div className="font-bold text-indigo-900 dark:text-indigo-200">-{formatCurrency(item.totalPickups, currencySymbol)}</div>
                      </div>

                      <div className={`p-1.5 rounded border ${
                        item.cashDiff === 0 
                          ? 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200' 
                          : item.cashDiff > 0 
                          ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-300' 
                          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-300'
                      }`}>
                        <div className="text-[9px] uppercase font-sans">Cuadre Físico</div>
                        <div className="font-bold">
                          {item.cashDiff === 0 
                            ? 'Cuadrado $0' 
                            : item.cashDiff > 0 
                            ? `Sobrante +${formatCurrency(item.cashDiff, currencySymbol)}` 
                            : `Faltante -${formatCurrency(Math.abs(item.cashDiff), currencySymbol)}`}
                        </div>
                      </div>

                      <div className="bg-emerald-100 dark:bg-emerald-900/40 p-1.5 rounded border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 font-black">
                        <div className="text-[9px] text-emerald-900 dark:text-emerald-300 uppercase font-sans">Total Consignar</div>
                        <div className="text-xs">{formatCurrency(item.totalToConsign, currencySymbol)}</div>
                      </div>
                    </div>

                    {/* Notes / Comments if any */}
                    {item.closingNotes && (
                      <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-2 rounded-lg flex items-start gap-1.5 mt-2">
                        <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span className="italic">{item.closingNotes}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Right Buttons & Menu Dropdown */}
                  <div className="flex items-center gap-2 border-t lg:border-t-0 border-slate-100 dark:border-slate-800 pt-2 lg:pt-0 shrink-0">
                    
                    {/* Fast Print Voucher Button */}
                    <button
                      onClick={() => setSelectedRecordForTicket({
                        type: item.type,
                        shift: item.rawShift,
                        day: item.rawDay
                      })}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Ver e Imprimir Comprobante Térmico"
                    >
                      <Printer className="w-4 h-4 text-indigo-400" />
                      <span>Ver Tiquete</span>
                    </button>

                    {/* Fast Recalculate Button */}
                    <button
                      onClick={() => setRecalculatingItem({
                        type: item.type,
                        shift: item.rawShift,
                        day: item.rawDay
                      })}
                      className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Recalcular arqueo contra tiquetes y movimientos"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Recalcular</span>
                    </button>

                    {/* Menu Options Button */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                        className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === item.id && (
                        <div className="absolute right-0 top-10 z-30 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 text-xs animate-fadeIn">
                          <button
                            onClick={() => {
                              setSelectedRecordForTicket({ type: item.type, shift: item.rawShift, day: item.rawDay });
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
                          >
                            <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Imprimir Comprobante Térmico</span>
                          </button>

                          <button
                            onClick={() => {
                              setRecalculatingItem({ type: item.type, shift: item.rawShift, day: item.rawDay });
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
                          >
                            <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span>Recalcular Cierre de Caja</span>
                          </button>

                          <button
                            onClick={() => {
                              setDetailsRecord({ type: item.type, shift: item.rawShift, day: item.rawDay });
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
                          >
                            <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                            <span>Ver Auditoría de Movimientos</span>
                          </button>

                          <button
                            onClick={() => {
                              setEditingNotesRecord({ type: item.type, shift: item.rawShift, day: item.rawDay });
                              setNotesInput(item.closingNotes || '');
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Editar Observaciones / Notas</span>
                          </button>

                          <button
                            onClick={() => handleToggleAuditStatus(item)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium border-t border-slate-100 dark:border-slate-800 cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span>{item.isAudited ? 'Desmarcar Auditado' : 'Marcar como Auditado OK'}</span>
                          </button>

                          <button
                            onClick={() => copyRecordSummary(item)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium border-t border-slate-100 dark:border-slate-800 cursor-pointer"
                          >
                            <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            <span>Copiar Resumen Texto</span>
                          </button>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Sistema Oficial wolfzonepos - Módulo de Auditoría de Cierres</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar Panel
          </button>
        </div>

      </div>

      {/* --- MODAL 1: RECALCULATION COMPARISON MODAL --- */}
      {recalculatingItem && recalculationData && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-xl">
                  <RefreshCw className="w-6 h-6 animate-spin-once" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    Recálculo Contable de Cierre de Caja
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Comparación lado a lado: Snapshot Original vs Valores Recalculados
                  </p>
                </div>
              </div>
              <button onClick={() => setRecalculatingItem(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Side by side comparison table */}
            <div className="space-y-3 font-mono text-xs">
              <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans text-[10px] uppercase">
                      <th className="p-2.5">CONCEPTO / MEDIO</th>
                      <th className="p-2.5 text-right">SNAPSHOT ORIGINAL</th>
                      <th className="p-2.5 text-right bg-indigo-900 text-indigo-100">RECALCULADO ACTUAL</th>
                      <th className="p-2.5 text-right">VARIACIÓN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    <tr>
                      <td className="p-2 font-semibold">Recaudo Efectivo</td>
                      <td className="p-2 text-right">{formatCurrency(recalculationData.originalSnapshot.cash, currencySymbol)}</td>
                      <td className="p-2 text-right bg-indigo-50/50 dark:bg-indigo-950/40 font-bold text-slate-900 dark:text-slate-100">{formatCurrency(recalculationData.recalculatedValues.cash, currencySymbol)}</td>
                      <td className="p-2 text-right font-bold text-slate-700 dark:text-slate-300">
                        {formatCurrency(recalculationData.recalculatedValues.cash - recalculationData.originalSnapshot.cash, currencySymbol)}
                      </td>
                    </tr>

                    <tr>
                      <td className="p-2 font-semibold">Recaudo Tarjetas DB/CR</td>
                      <td className="p-2 text-right">{formatCurrency(recalculationData.originalSnapshot.card, currencySymbol)}</td>
                      <td className="p-2 text-right bg-indigo-50/50 dark:bg-indigo-950/40 font-bold text-slate-900 dark:text-slate-100">{formatCurrency(recalculationData.recalculatedValues.card, currencySymbol)}</td>
                      <td className="p-2 text-right font-bold text-slate-700 dark:text-slate-300">
                        {formatCurrency(recalculationData.recalculatedValues.card - recalculationData.originalSnapshot.card, currencySymbol)}
                      </td>
                    </tr>

                    <tr>
                      <td className="p-2 font-semibold">Recaudo Billeteras / Digital</td>
                      <td className="p-2 text-right">{formatCurrency(recalculationData.originalSnapshot.wallet + recalculationData.originalSnapshot.qr, currencySymbol)}</td>
                      <td className="p-2 text-right bg-indigo-50/50 dark:bg-indigo-950/40 font-bold text-slate-900 dark:text-slate-100">{formatCurrency(recalculationData.recalculatedValues.wallet + recalculationData.recalculatedValues.qr, currencySymbol)}</td>
                      <td className="p-2 text-right font-bold text-slate-700 dark:text-slate-300">
                        {formatCurrency((recalculationData.recalculatedValues.wallet + recalculationData.recalculatedValues.qr) - (recalculationData.originalSnapshot.wallet + recalculationData.originalSnapshot.qr), currencySymbol)}
                      </td>
                    </tr>

                    <tr className="bg-slate-50 dark:bg-slate-950/80 font-bold text-slate-900 dark:text-slate-100">
                      <td className="p-2">TOTAL RECAUDADO</td>
                      <td className="p-2 text-right">{formatCurrency(recalculationData.originalSnapshot.total, currencySymbol)}</td>
                      <td className="p-2 text-right bg-indigo-100 dark:bg-indigo-900/50 text-indigo-950 dark:text-indigo-200">{formatCurrency(recalculationData.recalculatedValues.total, currencySymbol)}</td>
                      <td className={`p-2 text-right ${recalculationData.variance !== 0 ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 font-black' : 'text-slate-600 dark:text-slate-400'}`}>
                        {recalculationData.variance >= 0 ? '+' : ''}{formatCurrency(recalculationData.variance, currencySymbol)}
                      </td>
                    </tr>

                    <tr>
                      <td className="p-2 font-semibold text-rose-800 dark:text-rose-400">(-) Gastos de Caja</td>
                      <td className="p-2 text-right text-rose-800 dark:text-rose-400">-{formatCurrency(recalculationData.originalSnapshot.expenses, currencySymbol)}</td>
                      <td className="p-2 text-right bg-indigo-50/50 dark:bg-indigo-950/40 text-rose-800 dark:text-rose-400 font-bold">-{formatCurrency(recalculationData.recalculatedValues.expenses, currencySymbol)}</td>
                      <td className="p-2 text-right font-bold text-slate-700 dark:text-slate-300">$0</td>
                    </tr>

                    <tr>
                      <td className="p-2 font-semibold text-indigo-900 dark:text-indigo-300">(-) Recogidas de Efectivo</td>
                      <td className="p-2 text-right text-indigo-900 dark:text-indigo-300">-{formatCurrency(recalculationData.originalSnapshot.pickups, currencySymbol)}</td>
                      <td className="p-2 text-right bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 font-bold">-{formatCurrency(recalculationData.recalculatedValues.pickups, currencySymbol)}</td>
                      <td className="p-2 text-right font-bold text-slate-700 dark:text-slate-300">$0</td>
                    </tr>

                    <tr className="border-t-2 border-slate-200 dark:border-slate-800 bg-emerald-50 dark:bg-emerald-950/40 font-black">
                      <td className="p-2 uppercase text-emerald-950 dark:text-emerald-200">TOTAL A CONSIGNAR</td>
                      <td className="p-2 text-right">{formatCurrency(recalculationData.originalSnapshot.toConsign, currencySymbol)}</td>
                      <td className="p-2 text-right text-emerald-950 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/40">{formatCurrency(recalculationData.recalculatedValues.toConsign, currencySymbol)}</td>
                      <td className="p-2 text-right text-emerald-900 dark:text-emerald-300">
                        {formatCurrency(recalculationData.recalculatedValues.toConsign - recalculationData.originalSnapshot.toConsign, currencySymbol)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Justification input */}
              <div className="space-y-1 font-sans">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Motivo o Justificación del Recálculo (Opcional):
                </label>
                <input
                  type="text"
                  value={recalcReasonInput}
                  onChange={(e) => setRecalcReasonInput(e.target.value)}
                  placeholder="Ej: Ajuste por corrección de ticket cobrado con medio de pago modificado..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setRecalculatingItem(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRecalculation}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Aplicar Recálculo y Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: THERMAL TICKET PRINT PREVIEW --- */}
      {selectedRecordForTicket && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex justify-between items-center gap-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
                <h3 className="font-bold text-sm">Comprobante Oficial de Caja</h3>
              </div>
              <div className="flex items-center gap-2">
                {/* Selector de Papel Térmico 80mm vs 58mm */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setVoucherPaperWidth('80mm')}
                    className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      voucherPaperWidth === '80mm' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Rollo Estándar de 80mm"
                  >
                    80mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherPaperWidth('58mm')}
                    className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      voucherPaperWidth === '58mm' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Rollo Compacto de 58mm"
                  >
                    58mm
                  </button>
                </div>
                <button onClick={() => setSelectedRecordForTicket(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Ticket Area */}
            <div className="p-4 overflow-y-auto flex-1 bg-neutral-100 dark:bg-slate-950 flex justify-center">
              <div 
                id="printable-ticket" 
                data-paper-width={voucherPaperWidth}
                className={`w-full bg-white ${
                  voucherPaperWidth === '58mm' ? 'max-w-[245px] text-[10px] p-3 paper-58mm' : 'max-w-[340px] text-xs p-4 paper-80mm'
                } border border-dashed border-slate-300 font-mono text-slate-950 space-y-3 rounded shadow-xs force-light transition-all`}
              >
                
                {/* Header */}
                <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
                  <h2 className="font-black text-sm uppercase">{businessInfo?.name || 'Estacionamiento'}</h2>
                  <p className="text-[10px] text-slate-700">NIT: {businessInfo?.nit || ''}</p>
                  <p className="text-[10px] text-slate-700">{businessInfo?.address || ''}</p>

                  <div className="mt-2 inline-block bg-slate-900 text-white px-3 py-0.5 font-bold text-[10px] rounded uppercase">
                    {selectedRecordForTicket.type === 'shift' ? '**** ARQUEO DE TURNO ****' : '**** CIERRE DEFINITIVO DÍA ****'}
                  </div>
                </div>

                {/* Details */}
                <div className="py-1 border-b border-dashed border-slate-400 text-[10px] space-y-1">
                  {currentUser?.permissions?.canViewConsecutiveInHistory !== false && ((selectedRecordForTicket.type === 'shift' 
                    ? selectedRecordForTicket.shift?.consecutiveCode 
                    : selectedRecordForTicket.day?.consecutiveCode)) && (
                    <div className="flex justify-between">
                      <span>CONSECUTIVO NO:</span>
                      <span className="font-bold">
                        {selectedRecordForTicket.type === 'shift' 
                          ? selectedRecordForTicket.shift?.consecutiveCode 
                          : selectedRecordForTicket.day?.consecutiveCode}
                      </span>
                    </div>
                  )}
                  {currentUser?.permissions?.canViewOperationalDayInHistory !== false && (
                    <div className="flex justify-between">
                      <span>DÍA OPERATIVO:</span>
                      <span className="font-bold uppercase">
                        {selectedRecordForTicket.type === 'shift' 
                          ? `Día #${selectedRecordForTicket.shift?.operationalDayNumber}` 
                          : (selectedRecordForTicket.day?.date ? new Date(selectedRecordForTicket.day.date + 'T12:00:00').toLocaleDateString('es-CO') : `Día #${selectedRecordForTicket.day?.dayNumber}`)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>DOCUMENTO:</span>
                    <span className="font-bold">
                      {selectedRecordForTicket.type === 'shift' 
                        ? `#TURNO-${selectedRecordForTicket.shift?.shiftNumber}` 
                        : `#CIERRE-DÍA-${selectedRecordForTicket.day?.dayNumber}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>RESPONSABLE:</span>
                    <span className="font-bold uppercase">
                      {selectedRecordForTicket.type === 'shift'
                        ? selectedRecordForTicket.shift?.operatorName
                        : selectedRecordForTicket.day?.closedByOperator || 'Administrador'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>FECHA Y HORA:</span>
                    <span>
                      {new Date(
                        (selectedRecordForTicket.type === 'shift' 
                          ? selectedRecordForTicket.shift?.endTime 
                          : selectedRecordForTicket.day?.closedAt) || Date.now()
                      ).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                {/* Totals */}
                {ticketData && (
                  <>
                    {/* SECCIÓN 1: DISCRIMINACIÓN DE VENTAS / RECAUDO POR MEDIO DE PAGO */}
                    <div>
                      <div className="text-center font-bold uppercase text-[10px] tracking-wider py-1 bg-slate-100 border border-slate-300">
                        DISCRIMINACIÓN DE VENTAS / RECAUDO
                      </div>
                      <table className="w-full text-[10px] font-mono border-collapse my-1">
                        <thead>
                          <tr className="border-b border-slate-400 text-left uppercase text-[9px] font-bold">
                            <th className="py-1">MEDIO DE PAGO</th>
                            <th className="py-1 text-right">TOTAL RECAUDO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          <tr>
                            <td className="py-1 font-semibold">EFECTIVO</td>
                            <td className="py-1 text-right font-bold text-emerald-800">
                              {formatCurrency(ticketData.vCash, currencySymbol)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold">TARJETAS DÉB/CRÉD</td>
                            <td className="py-1 text-right">{formatCurrency(ticketData.vCard, currencySymbol)}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold">BILLETERAS DIGITALES</td>
                            <td className="py-1 text-right">{formatCurrency(ticketData.vWallet, currencySymbol)}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold">CÓDIGOS QR / PSE / TRANSF</td>
                            <td className="py-1 text-right">{formatCurrency(ticketData.vQr, currencySymbol)}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold">LLAVES BRE-B</td>
                            <td className="py-1 text-right">{formatCurrency(ticketData.vBreB, currencySymbol)}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold">CONVENIOS / CRÉDITOS</td>
                            <td className="py-1 text-right">{formatCurrency(ticketData.vAgreement, currencySymbol)}</td>
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-b-2 border-slate-200 dark:border-slate-800 font-bold text-[10px]">
                            <td className="py-1.5 uppercase">TOTAL VENTAS FACTURADAS</td>
                            <td className="py-1.5 text-right font-black text-slate-950">
                              {formatCurrency(ticketData.totalVentasFacturadas, currencySymbol)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* SECCIÓN 2: CONTROL Y ARQUEO FÍSICO DE GAVETA (FLUJO DE EFECTIVO) */}
                    <div>
                      <div className="text-center font-bold uppercase text-[10px] tracking-wider py-1 bg-amber-50 border border-amber-300 text-amber-950">
                        ARQUEO Y FLUJO DE EFECTIVO EN GAVETA
                      </div>
                      <table className="w-full text-[10px] font-mono border-collapse my-1">
                        <tbody className="divide-y divide-slate-200">
                          <tr>
                            <td className="py-1 font-semibold text-slate-700">(+) BASE / FONDO INICIAL DE CAJA</td>
                            <td className="py-1 text-right font-bold text-slate-800">
                              +{formatCurrency(ticketData.vBase, currencySymbol)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold text-emerald-800">(+) VENTAS EN EFECTIVO RECAUDADAS</td>
                            <td className="py-1 text-right font-bold text-emerald-800">
                              +{formatCurrency(ticketData.vCash, currencySymbol)}
                            </td>
                          </tr>
                          <tr className="bg-slate-50 font-bold border-t border-slate-300">
                            <td className="py-1 text-slate-900">(=) TOTAL EFECTIVO INGRESADO A GAVETA</td>
                            <td className="py-1 text-right font-black text-slate-900">
                              {formatCurrency(ticketData.totalEfectivoEntrado, currencySymbol)}
                            </td>
                          </tr>
                          {ticketData.totalExpenses > 0 && (
                            <tr>
                              <td className="py-1 font-semibold text-rose-800">(-) GASTOS DE CAJA MENOR (EGRESOS)</td>
                              <td className="py-1 text-right font-bold text-rose-700">
                                -{formatCurrency(ticketData.totalExpenses, currencySymbol)}
                              </td>
                            </tr>
                          )}
                          {ticketData.totalPickups > 0 && (
                            <tr>
                              <td className="py-1 font-semibold text-indigo-900">(-) RECOGIDAS DE EFECTIVO (A BÓVEDA)</td>
                              <td className="py-1 text-right font-bold text-indigo-700">
                                -{formatCurrency(ticketData.totalPickups, currencySymbol)}
                              </td>
                            </tr>
                          )}
                          <tr className="border-t-2 border-slate-200 dark:border-slate-800 font-bold bg-slate-100">
                            <td className="py-1.5 text-slate-950 uppercase">(=) EFECTIVO ESPERADO EN GAVETA</td>
                            <td className="py-1.5 text-right font-black text-slate-950">
                              {formatCurrency(ticketData.vExpectedCash, currencySymbol)}
                            </td>
                          </tr>
                          <tr className="font-bold bg-amber-100/50">
                            <td className="py-1 text-slate-950 uppercase">(FÍSICO) EFECTIVO CONTADO EN CAJA</td>
                            <td className="py-1 text-right font-black text-slate-950">
                              {formatCurrency(ticketData.vCountedCash, currencySymbol)}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* DIFERENCIA (SOBRANTE / FALTANTE) */}
                      <div className={`p-2 rounded border font-mono text-[10px] space-y-0.5 my-1.5 ${
                        ticketData.cashDifference === 0 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                          : ticketData.cashDifference > 0 
                          ? 'bg-sky-50 border-sky-300 text-sky-950' 
                          : 'bg-rose-50 border-rose-300 text-rose-950'
                      }`}>
                        <div className="flex justify-between font-bold">
                          <span>RESULTADO CUADRE GAVETA:</span>
                          <span className="font-black">
                            {ticketData.cashDifference === 0 
                              ? '¡CAJA CUADRADA EXACTA! ($0)' 
                              : ticketData.cashDifference > 0 
                              ? `DINERO SOBRANTE: +${formatCurrency(ticketData.dineroSobrante, currencySymbol)}` 
                              : `DINERO FALTANTE: -${formatCurrency(ticketData.dineroFaltante, currencySymbol)}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN 3: LIQUIDACIÓN Y CONSIGNACIÓN TOTAL DEL EFECTIVO */}
                    <div className="border-y-2 border-slate-200 dark:border-slate-800 py-2 space-y-1.5 my-2 bg-emerald-50/70 p-2 font-mono text-[10px] border">
                      <div className="text-center font-black uppercase text-[10px] tracking-wide text-emerald-950 pb-1 border-b border-emerald-300">
                        LIQUIDACIÓN DE EFECTIVO A CONSIGNAR
                      </div>
                      <div className="flex justify-between text-slate-800">
                        <span>Recogidas en Custodia / Bóveda:</span>
                        <span className="font-bold">{formatCurrency(ticketData.totalPickups, currencySymbol)}</span>
                      </div>
                      <div className="flex justify-between text-slate-800">
                        <span>(+) Efectivo Disponible en Gaveta (Contado - Base):</span>
                        <span className="font-bold">{formatCurrency(Math.max(0, ticketData.efectivoNetoEnGaveta), currencySymbol)}</span>
                      </div>
                      <div className="flex justify-between font-black text-xs text-emerald-950 border-t-2 border-emerald-800 pt-1.5 bg-emerald-200/80 p-1.5 rounded">
                        <span>TOTAL EFECTIVO A CONSIGNAR :</span>
                        <span className="text-sm font-black text-emerald-950">{formatCurrency(ticketData.totalAConsignar, currencySymbol)}</span>
                      </div>

                      {/* Nota aclaratoria sobre recogidas y base */}
                      <div className="text-[9px] text-slate-700 bg-white/90 p-1.5 rounded border border-emerald-200 mt-1 space-y-0.5 leading-tight">
                        <p className="font-bold text-emerald-900">💡 CONTROL Y CONSIGNACIÓN:</p>
                        <p>• <span className="font-semibold">Base de Caja</span> ({formatCurrency(ticketData.vBase, currencySymbol)}) queda en gaveta como fondo de apertura para el siguiente turno.</p>
                        <p>• Las <span className="font-bold">Recogidas de Efectivo</span> ({formatCurrency(ticketData.totalPickups, currencySymbol)}) son traslados de seguridad a bóveda/custodia; <span className="font-semibold">hacen parte de todo el efectivo generado</span> para consignar al final de la jornada.</p>
                      </div>
                    </div>

                    {/* DETALLE DE GASTOS Y RECOGIDAS ÍTEM POR ÍTEM */}
                    {ticketData.expensesList && ticketData.expensesList.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-dashed border-slate-300">
                        <div className="font-bold uppercase text-[10px] border-b border-slate-300 pb-0.5 flex justify-between">
                          <span>DETALLE DE GASTOS DE CAJA ({ticketData.expensesList.length})</span>
                          <span className="text-rose-700 font-bold">Total: -{formatCurrency(ticketData.totalExpenses, currencySymbol)}</span>
                        </div>
                        {ticketData.expensesList.map((m) => (
                          <div key={m.id} className="flex justify-between text-[9px]">
                            <span className="truncate pr-1">{m.description} ({m.conceptName || 'Gasto'})</span>
                            <span className="font-bold text-rose-700 shrink-0">-{formatCurrency(m.amount, currencySymbol)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {ticketData.pickupsList && ticketData.pickupsList.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-dashed border-slate-300">
                        <div className="font-bold uppercase text-[10px] border-b border-slate-300 pb-0.5 flex justify-between">
                          <span>DETALLE DE RECOGIDAS DE EFECTIVO ({ticketData.pickupsList.length})</span>
                          <span className="text-indigo-800 font-bold">Total: {formatCurrency(ticketData.totalPickups, currencySymbol)}</span>
                        </div>
                        {ticketData.pickupsList.map((m) => (
                          <div key={m.id} className="flex justify-between text-[9px]">
                            <span className="truncate pr-1">{m.description} ({new Date(m.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })})</span>
                            <span className="font-bold text-indigo-700 shrink-0">{formatCurrency(m.amount, currencySymbol)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Footer */}
                <div className="text-center pt-2 text-[9px] text-slate-700 border-t border-dashed border-slate-300">
                  <div className="font-bold uppercase tracking-wider text-slate-800 font-mono">wolfzonepos</div>
                  <div>Comprobante Reimpreso Oficial</div>
                </div>

              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Comprobante ({voucherPaperWidth})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: EDIT NOTES MODAL --- */}
      {editingNotesRecord && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                Editar Observaciones de Cierre
              </h3>
              <button onClick={() => setEditingNotesRecord(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Notas y Observaciones de Auditoría:
              </label>
              <textarea
                rows={4}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Escribe comentarios, justificaciones de faltantes o aclaraciones para administración..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setEditingNotesRecord(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs cursor-pointer"
              >
                Guardar Observación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: AUDIT MOVEMENTS DETAILS --- */}
      {detailsRecord && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" />
                Auditoría de Movimientos y Gastos de Caja
              </h3>
              <button onClick={() => setDetailsRecord(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3">
              {detailsRecord.type === 'shift' && Array.isArray(detailsRecord.shift?.cashMovements) ? (
                detailsRecord.shift.cashMovements.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs">No hay movimientos registrados en este turno.</div>
                ) : (
                  detailsRecord.shift.cashMovements.map((m) => (
                    <div key={m.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{m.description}</div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400">
                          {new Date(m.timestamp).toLocaleTimeString('es-CO')} • {m.conceptName || m.type.toUpperCase()} • Cajero: {m.operator}
                          {m.voucherNumber ? ` • Doc: ${m.voucherNumber}` : ''}
                        </div>
                      </div>
                      <span className={`font-mono font-bold text-sm ${
                        m.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : m.type === 'expense' ? 'text-rose-700 dark:text-rose-400' : 'text-indigo-700 dark:text-indigo-400'
                      }`}>
                        {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount, currencySymbol)}
                      </span>
                    </div>
                  ))
                )
              ) : (
                <div className="text-center py-8 text-slate-600 dark:text-slate-400 text-xs">
                  Cierre de día operativo consolidado. Movimientos integrados en los tiquetes del día.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setDetailsRecord(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Cerrar Auditoría
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification for Copy */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-70 bg-slate-900 dark:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-medium shadow-xl flex items-center gap-2 border border-slate-700 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Resumen de Cierre copiado al portapapeles</span>
        </div>
      )}

    </div>
  );
};

export const CashShiftsHistoryModal: React.FC<CashShiftsHistoryModalProps> = (props) => {
  if (!props.isOpen) return null;
  return (
    <LocalErrorBoundary>
      <CashShiftsHistoryModalContent {...props} />
    </LocalErrorBoundary>
  );
};
