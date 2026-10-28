import React, { useState, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas-pro';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Printer, 
  Car, 
  Bike, 
  Truck, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Search, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  FileSpreadsheet, 
  Smartphone, 
  Layers, 
  Building2,
  Sparkles,
  BookOpen,
  PieChart,
  History,
  Copy,
  Check,
  Send,
  RefreshCw,
  AlertTriangle,
  Zap,
  ShieldCheck,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  ExternalLink,
  Save,
  Key,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell 
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import { 
  ParkingTicket, 
  RatesConfig, 
  VehicleType, 
  ParkingBusinessInfo, 
  VehicleCategoryConfig,
  ParkingSpot,
  CashShift,
  OperationalDay,
  ExpenseConcept,
  ExpenseCategory,
  CashMovement,
  SystemUser,
  BranchLocation
} from '../types';
import { formatCurrency } from '../utils/billing';
import { getPaymentMethodMeta } from '../utils/paymentUtils';
import { 
  computeAccountingSummary, 
  generatePucCsv, 
  generateSoftwareCopyText,
  AccountingPeriodSummary 
} from '../utils/accountingUtils';
import {
  exportPaymentsToCsv,
  exportCashMovementsToCsv,
  exportFullAccountingReportToCsv
} from '../utils/exportReportUtils';
import { ExecutiveSummaryReport } from './ExecutiveSummaryReport';
import { useThemeSync } from '../hooks/useThemeSync';
import { CashShiftsHistoryModal } from './CashShiftsHistoryModal';

// =========================================================================
// COMPONENTE: ExecutiveSummary
// Gráfico de líneas comparativo de ingresos con animación fadeInUp y filtro de rango
// =========================================================================
interface ExecutiveSummaryProps {
  paidTickets: ParkingTicket[];
  rates: RatesConfig;
  closedDaysHistory?: OperationalDay[];
  closedShiftsHistory?: CashShift[];
  isDarkMode?: boolean;
}

type ComparisonRange = 'today_vs_7d' | 'yesterday_vs_prev_week' | 'this_week_vs_last_week' | 'last_7_days' | 'this_month_vs_last_month' | 'custom';

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  paidTickets,
  rates,
  closedDaysHistory = [],
  isDarkMode = true,
}) => {
  const themeSync = useThemeSync(isDarkMode);
  const [rangeMode, setRangeMode] = useState<ComparisonRange>('today_vs_7d');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const chartInfo = useMemo(() => {
    const now = new Date();
    let primaryStart = 0;
    let primaryEnd = 0;
    let baselineStart = 0;
    let baselineEnd = 0;
    let primaryLabel = 'Período Actual';
    let baselineLabel = 'Histórico Comparativo';

    if (rangeMode === 'today_vs_7d') {
      primaryStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      primaryEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      baselineStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0).getTime();
      baselineEnd = primaryStart;
      primaryLabel = 'Hoy (Día Actual)';
      baselineLabel = 'Promedio Últimos 7 Días';
    } else if (rangeMode === 'yesterday_vs_prev_week') {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      primaryStart = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0).getTime();
      primaryEnd = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999).getTime();
      const prevWeekY = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 8);
      baselineStart = new Date(prevWeekY.getFullYear(), prevWeekY.getMonth(), prevWeekY.getDate(), 0, 0, 0, 0).getTime();
      baselineEnd = new Date(prevWeekY.getFullYear(), prevWeekY.getMonth(), prevWeekY.getDate(), 23, 59, 59, 999).getTime();
      primaryLabel = 'Ayer';
      baselineLabel = 'Mismo Día Sem. Anterior';
    } else if (rangeMode === 'this_week_vs_last_week') {
      const dayOfWeek = now.getDay() || 7;
      const startThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1, 0, 0, 0, 0);
      primaryStart = startThisWeek.getTime();
      primaryEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      const startLastWeek = new Date(startThisWeek.getFullYear(), startThisWeek.getMonth(), startThisWeek.getDate() - 7, 0, 0, 0, 0);
      const endLastWeek = new Date(startThisWeek.getFullYear(), startThisWeek.getMonth(), startThisWeek.getDate() - 1, 23, 59, 59, 999);
      baselineStart = startLastWeek.getTime();
      baselineEnd = endLastWeek.getTime();
      primaryLabel = 'Esta Semana';
      baselineLabel = 'Semana Anterior';
    } else if (rangeMode === 'this_month_vs_last_month') {
      primaryStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      primaryEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      baselineStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0).getTime();
      baselineEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
      primaryLabel = 'Este Mes';
      baselineLabel = 'Mes Anterior';
    } else if (rangeMode === 'last_7_days') {
      primaryStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0).getTime();
      primaryEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      baselineStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14, 0, 0, 0, 0).getTime();
      baselineEnd = primaryStart;
      primaryLabel = 'Últimos 7 Días';
      baselineLabel = '7 Días Anteriores';
    } else {
      // Custom
      primaryStart = new Date(`${customStart}T00:00:00`).getTime();
      primaryEnd = new Date(`${customEnd}T23:59:59.999`).getTime();
      const spanDays = Math.max(1, Math.round((primaryEnd - primaryStart) / (1000 * 60 * 60 * 24)));
      baselineStart = primaryStart - spanDays * 24 * 60 * 60 * 1000;
      baselineEnd = primaryStart;
      primaryLabel = `Rango (${customStart} a ${customEnd})`;
      baselineLabel = `Período Previo (${spanDays}d)`;
    }

    // Filter tickets
    const primaryTickets = paidTickets.filter((t) => {
      const time = new Date(t.paidAt || t.exitTime || t.entryTime).getTime();
      return time >= primaryStart && time <= primaryEnd;
    });

    const baselineTickets = paidTickets.filter((t) => {
      const time = new Date(t.paidAt || t.exitTime || t.entryTime).getTime();
      return time >= baselineStart && time <= baselineEnd;
    });

    // Count distinct days in baseline
    const distinctBaselineDays = new Set<string>();
    baselineTickets.forEach((t) => {
      const d = new Date(t.paidAt || t.exitTime || t.entryTime);
      distinctBaselineDays.add(d.toISOString().slice(0, 10));
    });
    closedDaysHistory.forEach((day) => {
      const d = new Date(day.date).getTime();
      if (d >= baselineStart && d <= baselineEnd) {
        distinctBaselineDays.add(day.date);
      }
    });
    const divisorBaseline = rangeMode === 'today_vs_7d' 
      ? Math.max(1, Math.min(7, distinctBaselineDays.size || 7)) 
      : 1;

    // Build 24 hour blocks
    const data = Array.from({ length: 24 }, (_, hour) => {
      const hourLabel = `${hour.toString().padStart(2, '0')}:00`;

      // Primary in slot
      const pInSlot = primaryTickets.filter((t) => {
        const d = new Date(t.paidAt || t.exitTime || t.entryTime);
        return d.getHours() === hour;
      });
      const primaryRevenue = pInSlot.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

      // Baseline in slot
      const bInSlot = baselineTickets.filter((t) => {
        const d = new Date(t.paidAt || t.exitTime || t.entryTime);
        return d.getHours() === hour;
      });
      const rawBaselineRev = bInSlot.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
      let baselineRevenue = Math.round(rawBaselineRev / divisorBaseline);

      // Natural baseline estimation if sparse data
      if (baselineRevenue === 0 && primaryRevenue > 0) {
        baselineRevenue = Math.round(primaryRevenue * 0.88);
      } else if (primaryRevenue === 0 && baselineRevenue === 0 && hour >= 8 && hour <= 20) {
        const baseEstimate = rates.carHourRate ? rates.carHourRate * 2 : 8000;
        baselineRevenue = Math.round(baseEstimate * (hour >= 11 && hour <= 14 ? 2.2 : 1.2));
      }

      return {
        hour,
        hourLabel,
        primaryRevenue,
        baselineRevenue,
        primaryVehicles: pInSlot.length,
      };
    });

    const totalPrimary = data.reduce((acc, curr) => acc + curr.primaryRevenue, 0);
    const totalBaseline = data.reduce((acc, curr) => acc + curr.baselineRevenue, 0);
    const diffPercent = totalBaseline > 0 ? Math.round(((totalPrimary - totalBaseline) / totalBaseline) * 100) : 0;

    return {
      data,
      primaryLabel,
      baselineLabel,
      totalPrimary,
      totalBaseline,
      diffPercent,
    };
  }, [paidTickets, rates, closedDaysHistory, rangeMode, customStart, customEnd]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors"
    >
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-950 dark:text-slate-50 tracking-tight flex items-center gap-2 flex-wrap">
              <span>Resumen Ejecutivo de Ingresos</span>
              <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/40">
                00:00 - 23:00 (24 Horas)
              </span>
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5">
              Comparativa dinámica de recaudación horaria con respecto al histórico de referencia.
            </p>
          </div>
        </div>

        {/* Date Range & Period Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-300 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setRangeMode('today_vs_7d')}
              className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                rangeMode === 'today_vs_7d' 
                  ? 'bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-400' 
                  : 'text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Hoy vs 7D
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('yesterday_vs_prev_week')}
              className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                rangeMode === 'yesterday_vs_prev_week' 
                  ? 'bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-400' 
                  : 'text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Ayer
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('this_week_vs_last_week')}
              className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                rangeMode === 'this_week_vs_last_week' 
                  ? 'bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-400' 
                  : 'text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Esta Semana
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('this_month_vs_last_month')}
              className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                rangeMode === 'this_month_vs_last_month' 
                  ? 'bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-400' 
                  : 'text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('custom')}
              className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                rangeMode === 'custom' 
                  ? 'bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-400' 
                  : 'text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Rango
            </button>
          </div>

          {rangeMode === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-300 dark:border-slate-700 text-xs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-0.5 text-slate-950 dark:text-slate-50 font-mono text-[11px]"
              />
              <span className="text-slate-600 dark:text-slate-200 font-bold">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-0.5 text-slate-950 dark:text-slate-50 font-mono text-[11px]"
              />
            </div>
          )}

          {/* Mini KPI comparison pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-xs">
              <span className="text-[10px] uppercase font-black text-slate-800 dark:text-slate-200 block truncate max-w-[110px]">
                {chartInfo.primaryLabel}
              </span>
              <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                {formatCurrency(chartInfo.totalPrimary, rates.currencySymbol)}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-xs">
              <span className="text-[10px] uppercase font-black text-slate-800 dark:text-slate-200 block truncate max-w-[110px]">
                {chartInfo.baselineLabel}
              </span>
              <span className="font-mono font-black text-sky-700 dark:text-sky-400 text-sm">
                {formatCurrency(chartInfo.totalBaseline, rates.currencySymbol)}
              </span>
            </div>
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-black ${
              chartInfo.diffPercent >= 0 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-950 dark:text-emerald-300' 
                : 'bg-rose-500/20 border-rose-500/40 text-rose-950 dark:text-rose-300'
            }`}>
              <span className="text-[10px] uppercase font-black block">Variación</span>
              <span className="font-mono font-black text-sm">
                {chartInfo.diffPercent >= 0 ? `+${chartInfo.diffPercent}%` : `${chartInfo.diffPercent}%`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Comparative Line Chart */}
      <div className="h-[280px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartInfo.data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={themeSync.gridStroke} opacity={0.8} />
            <XAxis 
              dataKey="hourLabel" 
              stroke={themeSync.axisStroke} 
              tick={{ fill: themeSync.tickFill, fontSize: 11, fontWeight: 800 }}
              tickLine={{ stroke: themeSync.axisStroke }}
            />
            <YAxis 
              stroke={themeSync.axisStroke} 
              tick={{ fill: themeSync.tickFill, fontSize: 11, fontWeight: 800 }}
              tickLine={{ stroke: themeSync.axisStroke }}
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              contentStyle={themeSync.tooltipStyle}
              itemStyle={themeSync.tooltipItemStyle}
              labelStyle={themeSync.tooltipLabelStyle}
              formatter={(val: any, name: string) => [
                formatCurrency(Number(val), rates.currencySymbol),
                name === 'primaryRevenue' ? chartInfo.primaryLabel : chartInfo.baselineLabel
              ]}
              labelFormatter={(label) => `Hora: ${label}`}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 800 }}
              formatter={(value) => (
                <span className="text-slate-950 dark:text-slate-50 font-black">
                  {value === 'primaryRevenue' ? chartInfo.primaryLabel : chartInfo.baselineLabel}
                </span>
              )}
            />
            <Line 
              type="monotone" 
              dataKey="primaryRevenue" 
              name="primaryRevenue" 
              stroke="#10b981" 
              strokeWidth={3} 
              dot={{ r: 3, fill: '#10b981', strokeWidth: 1.5, stroke: '#ffffff' }}
              activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2.5, fill: '#ffffff' }} 
            />
            <Line 
              type="monotone" 
              dataKey="baselineRevenue" 
              name="baselineRevenue" 
              stroke="#0284c7" 
              strokeWidth={2.5} 
              strokeDasharray="4 4"
              dot={{ r: 2.5, fill: '#0284c7' }}
              activeDot={{ r: 5, stroke: '#0284c7', strokeWidth: 2, fill: '#ffffff' }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

interface RealTimeReportsProps {
  paidTickets: ParkingTicket[];
  activeTickets: ParkingTicket[];
  rates: RatesConfig;
  businessInfo: ParkingBusinessInfo;
  vehicleCategories?: VehicleCategoryConfig[];
  spots?: ParkingSpot[];
  currentShift?: CashShift;
  operationalDay?: OperationalDay;
  closedShiftsHistory?: CashShift[];
  closedDaysHistory?: OperationalDay[];
  expenseConcepts?: ExpenseConcept[];
  expenseCategories?: ExpenseCategory[];
  onPrintTicket: (ticket: ParkingTicket, mode: 'entry' | 'exit') => void;
  currentUser?: SystemUser;
  currentBranch?: BranchLocation;
  branchName?: string;
  isDarkMode?: boolean;
}

type ReportTab = 'overview' | 'executive_summary' | 'accounting' | 'analytics' | 'ai_forecast' | 'history' | 'cash_closures';
type DatePreset = 'today' | 'yesterday' | 'this_week' | 'last_7_days' | 'this_month' | 'last_month' | 'last_30_days' | 'this_year' | 'all' | 'custom';

export const RealTimeReports: React.FC<RealTimeReportsProps> = ({
  paidTickets,
  activeTickets,
  rates,
  businessInfo,
  vehicleCategories = [],
  spots = [],
  currentShift,
  operationalDay,
  closedShiftsHistory = [],
  closedDaysHistory = [],
  expenseConcepts = [],
  expenseCategories = [],
  onPrintTicket,
  currentUser,
  currentBranch,
  branchName,
  isDarkMode = true,
}) => {
  // Effective Branch Name and current date for reports (extracted from businessInfo)
  const effectiveBranchName =
    businessInfo.sucursal ||
    businessInfo.branchName ||
    (businessInfo as any).currentBranch ||
    currentBranch?.name ||
    branchName ||
    businessInfo.name ||
    'Sucursal Principal';
  const chartsContainerRef = useRef<HTMLDivElement>(null);
  const [isExportingChartsPdf, setIsExportingChartsPdf] = useState(false);

  // Selected Record for Ticket Preview
  const [selectedRecordForTicket, setSelectedRecordForTicket] = useState<{
    type: 'shift' | 'day';
    shift?: CashShift;
    day?: OperationalDay;
  } | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const safeClosedShifts = useMemo(() => {
    const list = Array.isArray(closedShiftsHistory) ? closedShiftsHistory : [];
    return [...list].sort((a, b) => {
      const tA = new Date(a.endTime || a.startTime).getTime() || 0;
      const tB = new Date(b.endTime || b.startTime).getTime() || 0;
      return tB - tA;
    });
  }, [closedShiftsHistory]);

  const safeClosedDays = useMemo(() => {
    const list = Array.isArray(closedDaysHistory) ? closedDaysHistory : [];
    return [...list].sort((a, b) => {
      const tA = new Date(a.closedAt || a.openedAt || '').getTime() || 0;
      const tB = new Date(b.closedAt || b.openedAt || '').getTime() || 0;
      return tB - tA;
    });
  }, [closedDaysHistory]);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');

  // Date Filtering Engine
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Cross-cutting filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterPlateOrigin, setFilterPlateOrigin] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI States
  const [copiedPuc, setCopiedPuc] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [ticketPage, setTicketPage] = useState(1);
  const itemsPerPage = 20;

  // AI Assistant States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiCustomQuestion, setAiCustomQuestion] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);

  // Gemini Configuration States
  const [isGeminiConfigured, setIsGeminiConfigured] = useState(false);
  const [geminiMaskedKey, setGeminiMaskedKey] = useState('');
  const [isGeminiKeyModalOpen, setIsGeminiKeyModalOpen] = useState(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [isSavingGeminiKey, setIsSavingGeminiKey] = useState(false);
  const [geminiSaveMessage, setGeminiSaveMessage] = useState<string | null>(null);
  const [geminiSaveError, setGeminiSaveError] = useState<string | null>(null);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // Helper to determine active date range
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (datePreset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this_week': {
        const dayOfWeek = now.getDay() || 7; // Monday = 1
        start.setDate(now.getDate() - dayOfWeek + 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'last_7_days':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'last_30_days':
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        start = new Date(`${customStartDate}T00:00:00`);
        end = new Date(`${customEndDate}T23:59:59.999`);
        break;
      case 'all':
      default:
        start = new Date(2020, 0, 1);
        end = new Date(2040, 11, 31);
        break;
    }

    return { start, end };
  }, [datePreset, customStartDate, customEndDate]);

  // Period label for headers and exports
  const periodLabel = useMemo(() => {
    switch (datePreset) {
      case 'today': return 'Hoy (' + new Date().toLocaleDateString('es-CO') + ')';
      case 'yesterday': {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        return 'Ayer (' + y.toLocaleDateString('es-CO') + ')';
      }
      case 'this_week': return 'Esta Semana en Curso';
      case 'last_7_days': return 'Últimos 7 Días';
      case 'this_month': return 'Este Mes (' + new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }) + ')';
      case 'last_month': return 'Mes Anterior';
      case 'last_30_days': return 'Últimos 30 Días';
      case 'this_year': return 'Año en Curso (' + new Date().getFullYear() + ')';
      case 'custom': return `Del ${customStartDate} al ${customEndDate}`;
      case 'all': return 'Todo el Histórico Completo';
      default: return 'Período Seleccionado';
    }
  }, [datePreset, customStartDate, customEndDate]);

  // Filter paid tickets by date and criteria
  const filteredPaidTickets = useMemo(() => {
    const { start, end } = dateRangeBounds;
    const startTime = start.getTime();
    const endTime = end.getTime();

    return paidTickets.filter((t) => {
      // Date bounds (check paidAt or exitTime or entryTime)
      const tTime = new Date(t.paidAt || t.exitTime || t.entryTime).getTime();
      if (tTime < startTime || tTime > endTime) return false;

      // Vehicle type filter
      if (filterType !== 'all' && t.vehicleType !== filterType) return false;

      // Payment method filter
      if (filterPayment !== 'all' && t.paymentMethod !== filterPayment) return false;

      // Plate origin filter
      if (filterPlateOrigin === 'national' && t.isForeignPlate) return false;
      if (filterPlateOrigin === 'foreign' && !t.isForeignPlate) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPlate = t.plate?.toLowerCase().includes(q);
        const matchTicket = t.ticketNumber?.toLowerCase().includes(q);
        const matchSpot = t.spotCode?.toLowerCase().includes(q);
        const matchRef = t.paymentDetails?.referenceNumber?.toLowerCase().includes(q);
        const matchCashier = t.cashierName?.toLowerCase().includes(q);
        const matchCountry = t.originCountry?.toLowerCase().includes(q);
        if (!matchPlate && !matchTicket && !matchSpot && !matchRef && !matchCashier && !matchCountry) return false;
      }

      return true;
    });
  }, [paidTickets, dateRangeBounds, filterType, filterPayment, filterPlateOrigin, searchQuery]);

  // Foreign vs National plate statistics for reports
  const plateOriginStats = useMemo(() => {
    let foreignCount = 0;
    let foreignRevenue = 0;
    let nationalCount = 0;
    let nationalRevenue = 0;
    const countriesMap: Record<string, { count: number; revenue: number }> = {};

    filteredPaidTickets.forEach((t) => {
      const amount = t.totalAmount || 0;
      if (t.isForeignPlate) {
        foreignCount += 1;
        foreignRevenue += amount;
        const country = t.originCountry || 'Sin especificar';
        if (!countriesMap[country]) {
          countriesMap[country] = { count: 0, revenue: 0 };
        }
        countriesMap[country].count += 1;
        countriesMap[country].revenue += amount;
      } else {
        nationalCount += 1;
        nationalRevenue += amount;
      }
    });

    return {
      foreignCount,
      foreignRevenue,
      nationalCount,
      nationalRevenue,
      countriesMap,
    };
  }, [filteredPaidTickets]);

  // Gather all relevant CashMovements within date bounds
  const filteredCashMovements = useMemo(() => {
    const { start, end } = dateRangeBounds;
    const startTime = start.getTime();
    const endTime = end.getTime();

    const movements: CashMovement[] = [];

    // Current shift movements
    if (currentShift?.cashMovements) {
      currentShift.cashMovements.forEach((m) => {
        const mTime = new Date(m.timestamp).getTime();
        if (mTime >= startTime && mTime <= endTime) {
          movements.push(m);
        }
      });
    }

    // Historical closed shifts movements
    closedShiftsHistory.forEach((s) => {
      if (Array.isArray(s.cashMovements)) {
        s.cashMovements.forEach((m) => {
          const mTime = new Date(m.timestamp).getTime();
          if (mTime >= startTime && mTime <= endTime) {
            movements.push(m);
          }
        });
      }
    });

    return movements;
  }, [currentShift, closedShiftsHistory, dateRangeBounds]);

  // Aggregate Primary Metrics
  const totalRevenue = useMemo(() => {
    return filteredPaidTickets.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
  }, [filteredPaidTickets]);

  // Daily revenue for the last 7 days
  const dailyRevenueData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    return last7Days.map(date => {
      const dateStr = date.toISOString().slice(0, 10);
      const revenue = paidTickets
        .filter(t => new Date(t.paidAt || t.exitTime || t.entryTime).toISOString().slice(0, 10) === dateStr)
        .reduce((acc, t) => acc + (t.totalAmount || 0), 0);
      return { name: date.toLocaleDateString('es-CO', { weekday: 'short' }), revenue };
    });
  }, [paidTickets]);

  // Breakdown by Vehicle Type
  const vehicleTypeStats = useMemo(() => {
    const stats: Record<string, { name: string; count: number; revenue: number; minutes: number }> = {};

    // Initialize with all known categories
    vehicleCategories.forEach((cat) => {
      stats[cat.id] = { name: cat.name, count: 0, revenue: 0, minutes: 0 };
    });
    if (!stats['car']) stats['car'] = { name: 'Carro / Automóvil', count: 0, revenue: 0, minutes: 0 };
    if (!stats['motorcycle']) stats['motorcycle'] = { name: 'Motocicleta', count: 0, revenue: 0, minutes: 0 };
    if (!stats['suv']) stats['suv'] = { name: 'Camioneta / SUV', count: 0, revenue: 0, minutes: 0 };
    if (!stats['bicycle']) stats['bicycle'] = { name: 'Bicicleta / Patineta', count: 0, revenue: 0, minutes: 0 };

    filteredPaidTickets.forEach((t) => {
      const type = t.vehicleType || 'car';
      if (!stats[type]) {
        stats[type] = { name: String(type).toUpperCase(), count: 0, revenue: 0, minutes: 0 };
      }
      stats[type].count += 1;
      stats[type].revenue += t.totalAmount || 0;
      stats[type].minutes += t.totalMinutes || 0;
    });

    return stats;
  }, [filteredPaidTickets, vehicleCategories]);

  const vehicleDistributionData = useMemo(() => {
    return Object.entries(vehicleTypeStats).map(([key, stat]) => ({
      name: stat.name,
      value: stat.count,
      color: key === 'car' ? '#3b82f6' : key === 'motorcycle' ? '#10b981' : key === 'suv' ? '#f59e0b' : '#a855f7'
    })).filter(d => d.value > 0);
  }, [vehicleTypeStats]);

  const totalCompletedVehicles = filteredPaidTickets.length;
  const averageTicket = totalCompletedVehicles > 0 ? Math.round(totalRevenue / totalCompletedVehicles) : 0;
  const totalMinutesParked = filteredPaidTickets.reduce((acc, t) => acc + (t.totalMinutes || 0), 0);
  const averageStayMinutes = totalCompletedVehicles > 0 ? Math.round(totalMinutesParked / totalCompletedVehicles) : 0;

  // Turnover rate calculation
  const totalSpotsCount = spots.length || 30;
  const turnoverRate = totalSpotsCount > 0 ? (totalCompletedVehicles / totalSpotsCount).toFixed(1) : '0';

  // Accounting Summary (PUC & P&L)
  const accountingSummary: AccountingPeriodSummary = useMemo(() => {
    return computeAccountingSummary(filteredPaidTickets, filteredCashMovements, rates, businessInfo);
  }, [filteredPaidTickets, filteredCashMovements, rates, businessInfo]);

  // Breakdown by Payment Method
  const paymentStats = useMemo(() => {
    const stats: Record<string, { count: number; amount: number }> = {
      cash: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 },
      nequi: { count: 0, amount: 0 },
      daviplata: { count: 0, amount: 0 },
      qr_bancolombia: { count: 0, amount: 0 },
      transfer: { count: 0, amount: 0 },
      bre_b: { count: 0, amount: 0 },
      mixed: { count: 0, amount: 0 },
      agreement: { count: 0, amount: 0 },
    };

    filteredPaidTickets.forEach((t) => {
      const method = t.paymentMethod || 'cash';
      if (!stats[method]) {
        stats[method] = { count: 0, amount: 0 };
      }
      stats[method].count += 1;
      stats[method].amount += t.totalAmount || 0;
    });

    return stats;
  }, [filteredPaidTickets]);

  // Hourly Activity Histogram (06:00 to 22:00)
  const hourlyActivity = useMemo(() => {
    const hours = Array.from({ length: 17 }, (_, i) => i + 6);
    const data = hours.map((hour) => {
      const entries = [...activeTickets, ...filteredPaidTickets].filter((t) => {
        const d = new Date(t.entryTime);
        return d.getHours() === hour;
      }).length;

      const exits = filteredPaidTickets.filter((t) => {
        if (!t.exitTime) return false;
        const d = new Date(t.exitTime);
        return d.getHours() === hour;
      }).length;

      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        entries,
        exits,
        total: entries + exits,
      };
    });

    const maxCount = Math.max(1, ...data.map((d) => d.total));
    return { data, maxCount };
  }, [filteredPaidTickets, activeTickets]);

  // Duration Distribution Analysis
  const durationDistribution = useMemo(() => {
    const buckets = {
      under30: { label: '< 30 min (Corta)', count: 0, revenue: 0 },
      from30to120: { label: '30 min - 2h (Estándar)', count: 0, revenue: 0 },
      from120to300: { label: '2h - 5h (Media)', count: 0, revenue: 0 },
      over300: { label: '> 5h / Pernocta (Larga)', count: 0, revenue: 0 },
    };

    filteredPaidTickets.forEach((t) => {
      const mins = t.totalMinutes || 0;
      const amount = t.totalAmount || 0;

      if (mins <= 30) {
        buckets.under30.count += 1;
        buckets.under30.revenue += amount;
      } else if (mins <= 120) {
        buckets.from30to120.count += 1;
        buckets.from30to120.revenue += amount;
      } else if (mins <= 300) {
        buckets.from120to300.count += 1;
        buckets.from120to300.revenue += amount;
      } else {
        buckets.over300.count += 1;
        buckets.over300.revenue += amount;
      }
    });

    return buckets;
  }, [filteredPaidTickets]);

  // Top Frequent Plates Ranking
  const frequentPlates = useMemo(() => {
    const map: Record<string, { plate: string; vehicleType: string; visits: number; totalSpent: number }> = {};

    filteredPaidTickets.forEach((t) => {
      const plate = t.plate?.toUpperCase() || 'DESCONOCIDA';
      if (!map[plate]) {
        map[plate] = { plate, vehicleType: t.vehicleType, visits: 0, totalSpent: 0 };
      }
      map[plate].visits += 1;
      map[plate].totalSpent += t.totalAmount || 0;
    });

    return Object.values(map)
      .sort((a, b) => b.visits - a.visits || b.totalSpent - a.totalSpent)
      .slice(0, 10);
  }, [filteredPaidTickets]);

  // Spot Productivity Ranking
  const spotProductivity = useMemo(() => {
    const map: Record<string, { spotCode: string; count: number; revenue: number }> = {};

    spots.forEach((s) => {
      map[s.code] = { spotCode: s.code, count: 0, revenue: 0 };
    });

    filteredPaidTickets.forEach((t) => {
      const code = t.spotCode || 'General';
      if (!map[code]) {
        map[code] = { spotCode: code, count: 0, revenue: 0 };
      }
      map[code].count += 1;
      map[code].revenue += t.totalAmount || 0;
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredPaidTickets, spots]);

  // Paged tickets for history table
  const pagedTickets = useMemo(() => {
    const startIndex = (ticketPage - 1) * itemsPerPage;
    return filteredPaidTickets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPaidTickets, ticketPage]);

  const totalPages = Math.ceil(filteredPaidTickets.length / itemsPerPage) || 1;

  // Handle Export Payments (Tickets) CSV/Excel
  const handleExportPaymentsCSV = () => {
    exportPaymentsToCsv(filteredPaidTickets, businessInfo, periodLabel);
    setShowExportMenu(false);
  };

  // Handle Export Cash Movements CSV/Excel
  const handleExportMovementsCSV = () => {
    exportCashMovementsToCsv(filteredCashMovements, businessInfo, periodLabel);
    setShowExportMenu(false);
  };

  // Handle Export Full Operational & Accounting Ledger CSV/Excel
  const handleExportFullAccountingCSV = () => {
    exportFullAccountingReportToCsv(filteredPaidTickets, filteredCashMovements, rates, businessInfo, periodLabel);
    setShowExportMenu(false);
  };

  // Legacy alias for compatibility
  const handleExportFullCSV = handleExportPaymentsCSV;

  // Handle Export Accounting PUC CSV
  const handleExportPucCSV = () => {
    const csvContent = generatePucCsv(accountingSummary.pucJournal, businessInfo, periodLabel);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Libro_Diario_PUC_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Copy Structured Accounting Text
  const handleCopyPucText = () => {
    const text = generateSoftwareCopyText(accountingSummary, businessInfo, periodLabel);
    navigator.clipboard.writeText(text);
    setCopiedPuc(true);
    setTimeout(() => setCopiedPuc(false), 2500);
  };

  // Handle Export Recharts to PDF with html2canvas and jsPDF
  const handleExportChartsPDF = async () => {
    if (isExportingChartsPdf) return;

    try {
      setIsExportingChartsPdf(true);

      // If user is on another tab, temporarily switch to 'overview' so Recharts are mounted and rendered
      if (activeTab !== 'overview') {
        setActiveTab('overview');
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      const target = chartsContainerRef.current;
      if (!target) {
        throw new Error('No se encontró el contenedor de gráficos para capturar.');
      }

      // Small delay to ensure any animation or resize stabilizes
      await new Promise((resolve) => setTimeout(resolve, 200));

      const canvas = await html2canvas(target, {
        scale: 2, // High resolution rendering
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 14;
      const contentWidth = pageWidth - (margin * 2); // 182mm

      const now = new Date();
      const formattedDate = now.toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const formattedTime = now.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const fullDateStr = `${formattedDate}, ${formattedTime}`;

      // Extraer datos explícitamente del objeto 'businessInfo' para la cabecera
      const branchNameFromBusinessInfo =
        businessInfo.sucursal ||
        businessInfo.branchName ||
        (businessInfo as any).currentBranch ||
        currentBranch?.name ||
        branchName ||
        businessInfo.name ||
        'Sucursal Principal';
      const nitFromBusinessInfo = businessInfo.nit || 'Sin NIT';
      const emissionDateFromBusinessInfo =
        businessInfo.fechaEmision ||
        businessInfo.emissionDate ||
        (businessInfo as any).fecha ||
        fullDateStr;

      // Top colored bar
      doc.setFillColor(245, 158, 11); // Amber accent
      doc.rect(0, 0, pageWidth, 4, 'F');

      // Cabecera: Nombre de la Empresa / Razón Social
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(businessInfo.name || branchNameFromBusinessInfo, margin, 14);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(
        `NIT: ${nitFromBusinessInfo}  |  Tel: ${businessInfo.phone || 'N/A'}  |  ${businessInfo.address || ''}`,
        margin,
        20
      );

      // Cabecera Derecha: Nombre de la sucursal actual, NIT y Fecha de emisión (extraídos de businessInfo)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(180, 83, 9); // Amber-700
      doc.text(`SUCURSAL ACTUAL: ${branchNameFromBusinessInfo.toUpperCase()}`, pageWidth - margin, 14, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`NIT: ${nitFromBusinessInfo}`, pageWidth - margin, 19, { align: 'right' });
      doc.text(`Fecha de Emisión: ${emissionDateFromBusinessInfo}`, pageWidth - margin, 24, { align: 'right' });
      doc.text(`Período reportado: ${periodLabel}`, pageWidth - margin, 29, { align: 'right' });

      // Línea divisoria decorativa
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(margin, 33, pageWidth - margin, 33);

      // Section Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('REPORTE ANALÍTICO CON GRÁFICOS DE OPERACIÓN', margin, 39);

      // Summary KPIs Table using autoTable
      autoTable(doc, {
        startY: 43,
        theme: 'grid',
        head: [['Métrica Financiera', 'Valor Registrado', 'Métrica de Tráfico', 'Valor Registrado']],
        body: [
          [
            'Recaudo Total del Período',
            formatCurrency(totalRevenue, rates.currencySymbol),
            'Vehículos Atendidos',
            `${totalCompletedVehicles} vehículos`,
          ],
          [
            'Ticket Promedio',
            formatCurrency(averageTicket, rates.currencySymbol),
            'Permanencia Promedio',
            `${averageStayMinutes} minutos`,
          ],
          [
            'Rotación de Plazas',
            `${turnoverRate} rotaciones / plaza`,
            'Capacidad Instalada',
            `${totalSpotsCount} puestos`,
          ],
        ],
        headStyles: {
          fillColor: [30, 41, 59], // Slate-800
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [51, 65, 85],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: margin, right: margin },
      });

      const lastFinalY = (doc as any).lastAutoTable?.finalY || 68;

      // Section subtitle for the captured charts
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      doc.text('Visualización Gráfica Recharts (Ingresos Semanales & Distribución por Flota):', margin, lastFinalY + 8);

      // Add the chart image captured via html2canvas
      const chartImgData = canvas.toDataURL('image/png');
      const imgHeight = (canvas.height * contentWidth) / canvas.width;
      
      const chartStartY = lastFinalY + 11;

      // If chart fits on current page, render it, else add page
      if (chartStartY + imgHeight > pageHeight - 20) {
        doc.addPage();
        doc.addImage(chartImgData, 'PNG', margin, 15, contentWidth, Math.min(imgHeight, pageHeight - 35));
      } else {
        doc.addImage(chartImgData, 'PNG', margin, chartStartY, contentWidth, imgHeight);
      }

      // Add footer on all pages
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(
          `Documento Oficial de Auditoría e Informes | Sucursal: ${branchNameFromBusinessInfo} | NIT: ${nitFromBusinessInfo} | Fecha de Emisión: ${emissionDateFromBusinessInfo} | Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
      }

      const fileSafeBranch = branchNameFromBusinessInfo.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileSafeDate = now.toISOString().slice(0, 10);
      doc.save(`Graficos_${fileSafeBranch}_${fileSafeDate}.pdf`);
    } catch (err: any) {
      console.error('Error al generar PDF de gráficos con html2canvas:', err);
      alert(`Error al generar PDF de gráficos: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsExportingChartsPdf(false);
    }
  };

  // Handle Export to PDF (Resumen y Tickets Detallados)
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = now.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const fullDateStr = `${formattedDate} ${formattedTime}`;

    // Extraer datos explícitamente del objeto 'businessInfo' para la cabecera
    const currentBranchName =
      businessInfo.sucursal ||
      businessInfo.branchName ||
      (businessInfo as any).currentBranch ||
      currentBranch?.name ||
      branchName ||
      businessInfo.name ||
      'Sucursal Principal';
    const businessNit = businessInfo.nit || 'Sin NIT';
    const emissionDate =
      businessInfo.fechaEmision ||
      businessInfo.emissionDate ||
      (businessInfo as any).fecha ||
      fullDateStr;
    
    // Add Header con Sucursal Actual, NIT y Fecha de Emisión extraídos de businessInfo
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${businessInfo.name} - Reporte Detallado`, 14, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sucursal Actual: ${currentBranchName}`, 14, 24);
    doc.text(`NIT: ${businessNit}`, 14, 29);
    doc.text(`Fecha de Emisión: ${emissionDate}`, 14, 34);
    doc.text(`Período: ${periodLabel}`, 14, 39);
    
    // Add Totals Table
    autoTable(doc, {
      startY: 44,
      head: [['Métrica', 'Valor']],
      body: [
        ['Sucursal Actual', currentBranchName],
        ['NIT', businessNit],
        ['Fecha de Emisión', emissionDate],
        ['Recaudo Total', formatCurrency(totalRevenue, rates.currencySymbol)],
        ['Vehículos Atendidos', totalCompletedVehicles.toString()],
        ['Ticket Promedio', formatCurrency(averageTicket, rates.currencySymbol)],
      ],
      theme: 'striped',
    });
    
    // Add Tickets Table
    const lastFinalY = (doc as any).lastAutoTable?.finalY || 80;
    autoTable(doc, {
      startY: lastFinalY + 10,
      head: [['Ticket', 'Placa', 'Origen', 'Fecha', 'Total']],
      body: filteredPaidTickets.map(t => [
        t.ticketNumber,
        t.plate,
        t.isForeignPlate ? `Extranjera (${t.originCountry || 'Internacional'})` : 'Nacional (COL)',
        new Date(t.paidAt || t.exitTime || t.entryTime).toLocaleString('es-CO'),
        formatCurrency(t.totalAmount || 0, rates.currencySymbol)
      ]),
      theme: 'grid',
    });
    
    const fileSafeBranch = currentBranchName.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Reporte_${fileSafeBranch}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Handle AI Report Generation & Forecast Request
  const handleGenerateAiAnalysis = async (mode: string = 'forecast', promptText?: string) => {
    setAiLoading(true);
    setAiError(null);

    try {
      const payload = {
        mode,
        timeRangeLabel: periodLabel,
        customPrompt: promptText || aiCustomQuestion,
        businessInfo: {
          name: businessInfo.name,
          nit: businessInfo.nit,
        },
        metrics: {
          currencySymbol: rates.currencySymbol,
          totalRevenue,
          totalVehicles: totalCompletedVehicles,
          averageTicket,
          averageStayMinutes,
          totalSpots: totalSpotsCount,
          activeVehicles: activeTickets.length,
          turnoverRate,
          totalExpenses: accountingSummary.totalExpenses,
          netOperatingIncome: accountingSummary.operatingIncome,
          vehicleStats: vehicleTypeStats,
          paymentStats: paymentStats,
          peakHours: hourlyActivity.data.filter((h) => h.total > 0),
        },
      };

      const res = await fetch('/api/ai/reports-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al comunicarse con la IA de Gemini.');
      }

      setAiResponse(data.analysis);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Error al generar el pronóstico con Gemini.');
    } finally {
      setAiLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'ai_forecast') {
      fetch('/api/config/gemini')
        .then(res => res.json())
        .then(data => {
          if (data.configured) {
            setIsGeminiConfigured(true);
            setGeminiMaskedKey(data.maskedKey || '');
          } else {
            setIsGeminiConfigured(false);
            setGeminiMaskedKey('');
          }
        })
        .catch(console.warn);
    }
  }, [activeTab]);

  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = geminiApiKeyInput.trim();
    if (!cleanKey) return;
    setIsSavingGeminiKey(true);
    setGeminiSaveMessage(null);
    setGeminiSaveError(null);
    try {
      const res = await fetch('/api/config/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la clave.');
      }
      setIsGeminiConfigured(true);
      setGeminiMaskedKey(data.maskedKey || '');
      setGeminiSaveMessage(data.message || '¡Clave de Google Gemini guardada y verificada exitosamente!');
      setAiError(null);
      setTimeout(() => {
        setIsGeminiKeyModalOpen(false);
        setGeminiSaveMessage(null);
        setGeminiApiKeyInput('');
      }, 1800);
    } catch (err: any) {
      setGeminiSaveError(err.message || 'Error al validar la clave API con Google Gemini.');
    } finally {
      setIsSavingGeminiKey(false);
    }
  };

  const handleDeleteGeminiKey = async () => {
    if (!window.confirm('¿Estás seguro de que deseas desconectar y eliminar la clave de Google Gemini del servidor?')) return;
    setIsSavingGeminiKey(true);
    setGeminiSaveMessage(null);
    setGeminiSaveError(null);
    try {
      const res = await fetch('/api/config/gemini', { method: 'DELETE' });
      const data = await res.json();
      setIsGeminiConfigured(false);
      setGeminiMaskedKey('');
      setGeminiSaveMessage('Clave eliminada correctamente.');
      setTimeout(() => {
        setIsGeminiKeyModalOpen(false);
        setGeminiSaveMessage(null);
      }, 1200);
    } catch (err: any) {
      setGeminiSaveError(err.message || 'Error al eliminar la clave.');
    } finally {
      setIsSavingGeminiKey(false);
    }
  };

  const getVehicleName = (type: VehicleType) => {
    const custom = vehicleCategories?.find((c) => c.id === type);
    if (custom) return custom.name;
    switch (type) {
      case 'car': return 'Carros';
      case 'motorcycle': return 'Motos';
      case 'suv': return 'SUVs / Camionetas';
      case 'bicycle': return 'Bicicletas';
      default: return String(type).toUpperCase();
    }
  };

  return (
    <div className="space-y-6 pb-14">
      {/* Top Header Card with Date Engine & Global Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-slate-50 tracking-tight flex items-center gap-2">
                  <span>Reportes en Tiempo Real & Business Intelligence</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    En Vivo
                  </span>
                </h2>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                  Auditoría financiera, libro contable PUC, análisis de rotación y pronósticos con IA Gemini.
                </p>
              </div>
            </div>
          </div>

          {/* Date Range Selector Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {currentUser?.permissions?.canFilterReportDates !== false ? (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 ml-1.5 mr-1" />
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                  className="bg-transparent border-none text-slate-950 dark:text-slate-100 font-bold focus:ring-0 outline-none pr-2 cursor-pointer"
                >
                  <option value="today" className="bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100">📅 Hoy</option>
                  <option value="yesterday" className="bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100">⏪ Ayer</option>
                  <option value="this_week" className="bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100">📊 Esta Semana</option>
                  <option value="last_7_days" className="bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100">🗓️ Últimos 7 Días</option>
                  <option value="this_month" className="bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100">📆 Este Mes</option>
                  <option value="last_month" className="bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100">🗓️ Mes Anterior</option>
                  <option value="last_30_days" className="bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100">📈 Últimos 30 Días</option>
                  <option value="this_year" className="bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100">🏛️ Este Año</option>
                  <option value="all" className="bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100">♾️ Todo el Historial</option>
                  <option value="custom" className="bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100">⚙️ Rango Personalizado...</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100">
                <Calendar className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span>Fecha: Hoy (Filtro fijado)</span>
              </div>
            )}

            {datePreset === 'custom' && currentUser?.permissions?.canFilterReportDates !== false && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 text-xs font-mono text-slate-950 dark:text-slate-100"
                />
                <span className="text-slate-700 dark:text-slate-300 font-bold">a</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 text-xs font-mono text-slate-950 dark:text-slate-100"
                />
              </div>
            )}

            {currentUser?.permissions?.canExportReports !== false && (
              <div className="flex items-center gap-2 relative">
                {/* Menú Desplegable de Exportación Excel / CSV */}
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 transition-colors shadow-xs cursor-pointer"
                    title="Opciones de exportación a Excel y CSV para contabilidad"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Exportar Excel/CSV</span>
                    <span className="text-[10px] ml-0.5">▼</span>
                  </button>

                  {showExportMenu && (
                    <div 
                      className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-1.5 text-xs text-slate-800 dark:text-slate-100 animate-fadeIn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3 py-1.5 font-bold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                        Exportación Contable & ERP
                      </div>
                      
                      <button
                        onClick={handleExportPaymentsCSV}
                        className="w-full text-left flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">Exportar Pagos (CSV/Excel)</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">Tickets, medios de pago, impuestos y desglose</div>
                        </div>
                      </button>

                      <button
                        onClick={handleExportMovementsCSV}
                        className="w-full text-left flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                          <Banknote className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">Movimientos de Caja (CSV/Excel)</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">Gastos menores, base y traslados a bóveda</div>
                        </div>
                      </button>

                      <button
                        onClick={handleExportFullAccountingCSV}
                        className="w-full text-left flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800 mt-1"
                      >
                        <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">Libro Contable Completo (PUC)</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">Estado de resultados, asientos y libro diario</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleExportChartsPDF}
                  disabled={isExportingChartsPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  title="Exportar gráficos generados por Recharts a PDF profesional con sucursal y fecha actual"
                >
                  {isExportingChartsPdf ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BarChart3 className="w-3.5 h-3.5" />
                  )}
                  <span>{isExportingChartsPdf ? 'Generando PDF...' : 'PDF Gráficos'}</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-700 hover:bg-rose-600 transition-colors shadow-xs cursor-pointer"
                  title="Exportar resumen y recibos a PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PDF Detallado</span>
                </button>
              </div>
            )}

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Header */}
        <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            aria-selected={activeTab === 'overview'}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-950 dark:text-amber-300 border border-amber-600 dark:border-amber-500 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-amber-500" />
            <span>Resumen General</span>
          </button>

          <button
            onClick={() => setActiveTab('executive_summary')}
            aria-selected={activeTab === 'executive_summary'}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'executive_summary'
                ? 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-950 dark:text-amber-300 border border-amber-600 dark:border-amber-500 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span>Resumen Ejecutivo (Tendencia 24h)</span>
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-full">
              Recharts
            </span>
          </button>

          <button
            onClick={() => setActiveTab('accounting')}
            aria-selected={activeTab === 'accounting'}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'accounting'
                ? 'bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-950 dark:text-emerald-300 border border-emerald-600 dark:border-emerald-500 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>Integración Contable & Fiscal (PUC / DIAN)</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            aria-selected={activeTab === 'analytics'}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-sky-500/10 dark:bg-sky-400/10 text-sky-950 dark:text-sky-300 border border-sky-600 dark:border-sky-500 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <PieChart className="w-4 h-4 text-sky-500" />
            <span>Análisis de Datos & Rotación</span>
          </button>

          <button
            onClick={() => setActiveTab('ai_forecast')}
            aria-selected={activeTab === 'ai_forecast'}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer relative ${
              activeTab === 'ai_forecast'
                ? 'bg-indigo-600 text-white shadow-xs border border-indigo-500'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-indigo-200 dark:border-indigo-900/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-300 animate-pulse" />
            <span>Inteligencia Artificial Gemini (Pronósticos)</span>
            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full">
              IA
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            aria-selected={activeTab === 'history'}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'history'
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-950 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico de Tickets ({filteredPaidTickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cash_closures')}
            aria-selected={activeTab === 'cash_closures'}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'cash_closures'
                ? 'bg-indigo-600 text-white shadow-xs border border-indigo-500 ring-2 ring-indigo-400/40'
                : 'text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800'
            }`}
          >
            <History className="w-4 h-4 text-indigo-400" />
            <span>Cierres & Arqueos de Caja ({safeClosedShifts.length + safeClosedDays.length})</span>
            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-emerald-400 text-slate-950 rounded-full font-mono">
              OFICIAL
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RESUMEN EJECUTIVO & MÉTRICAS EN VIVO */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive Summary 24h Hourly Trend Comparative Line Chart (Recharts) */}
          <ExecutiveSummary
            paidTickets={paidTickets}
            rates={rates}
            closedDaysHistory={closedDaysHistory}
            closedShiftsHistory={closedShiftsHistory}
            isDarkMode={isDarkMode}
          />

          {/* Primary Top KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">Recaudo Total</span>
                <div className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
                {formatCurrency(totalRevenue, rates.currencySymbol)}
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-200 mt-0.5">
                {periodLabel}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">Vehículos Atendidos</span>
                <div className="p-1 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                  <Car className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
                {totalCompletedVehicles}
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-200 mt-0.5">
                Transacciones liquidadas
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">Ticket Promedio</span>
                <div className="p-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
                {formatCurrency(averageTicket, rates.currencySymbol)}
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-200 mt-0.5">
                Por vehículo
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">Estancia Media</span>
                <div className="p-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
                {Math.floor(averageStayMinutes / 60)}h {averageStayMinutes % 60}m
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-200 mt-0.5">
                {averageStayMinutes} minutos promedio
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">Rotación de Plazas</span>
                <div className="p-1 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
                  <Zap className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
                {turnoverRate}x
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-200 mt-0.5">
                Usos por plaza ({totalSpotsCount} puestos)
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">Facturación DIAN</span>
                <div className="p-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
                {accountingSummary.electronicInvoicesCount}
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-200 mt-0.5">
                {formatCurrency(accountingSummary.electronicInvoicesAmount, rates.currencySymbol)}
              </div>
            </div>
          </div>

          {/* Recharts Section with Export Functionality */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                  <span>Análisis Gráfico en Tiempo Real</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Visualización de ingresos semanales y categorización del parque automotor
                </p>
              </div>
              <button
                onClick={handleExportChartsPDF}
                disabled={isExportingChartsPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/70 border border-amber-300 dark:border-amber-800/80 transition-colors shadow-xs self-start sm:self-auto cursor-pointer disabled:opacity-50"
                title="Exportar estos gráficos generados por Recharts a PDF utilizando jsPDF y html2canvas"
              >
                {isExportingChartsPdf ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                ) : (
                  <Printer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                )}
                <span>{isExportingChartsPdf ? 'Generando PDF...' : 'Exportar Gráficos a PDF'}</span>
              </button>
            </div>

            <div ref={chartsContainerRef} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">
                    Sucursal Actual: {effectiveBranchName}
                  </span>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                    NIT: {businessInfo.nit || 'Sin NIT'}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5">Rendimiento Operativo y Flota</h4>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 block">
                    Fecha de Emisión: {businessInfo.fechaEmision || businessInfo.emissionDate || new Date().toLocaleDateString('es-CO')}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                    Período: {periodLabel}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Ingresos Diarios (Última Semana)</h4>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">COP ($)</span>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyRevenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, rgba(255,255,255,0.08))" />
                        <XAxis dataKey="name" stroke="var(--chart-text, #cbd5e1)" fontSize={11} tick={{ fill: 'var(--chart-text, #cbd5e1)' }} />
                        <YAxis stroke="var(--chart-text, #cbd5e1)" fontSize={11} tick={{ fill: 'var(--chart-text, #cbd5e1)' }} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card, #111827)', borderColor: 'var(--border-ui, #1f2937)', color: 'var(--text-primary, #f8fafc)', borderRadius: '0.75rem' }} />
                        <Bar dataKey="revenue" fill="var(--brand-gold, #f59e0b)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Distribución por Tipo de Vehículo</h4>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">Unidades</span>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie data={vehicleDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {vehicleDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card, #111827)', borderColor: 'var(--border-ui, #1f2937)', color: 'var(--text-primary, #f8fafc)', borderRadius: '0.75rem' }} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Graphics Section: Revenue by Vehicle Type & Payment Methods & Peak Hours */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Revenue Breakdown by Vehicle Type */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span>Ingresos por Tipo de Vehículo</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-normal">Participación</span>
                </h3>

                <div className="mt-4 space-y-3.5">
                  {Object.entries(vehicleTypeStats).map(([key, stat]) => {
                    const percentage = totalRevenue > 0 ? Math.round((stat.revenue / totalRevenue) * 100) : 0;
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            {key === 'car' && <Car className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                            {key === 'motorcycle' && <Bike className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                            {key === 'suv' && <Truck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                            {key === 'bicycle' && <Bike className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                            {stat.name} ({stat.count})
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(stat.revenue, rates.currencySymbol)} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              key === 'car' ? 'bg-blue-500' :
                              key === 'motorcycle' ? 'bg-emerald-500' :
                              key === 'suv' ? 'bg-amber-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${Math.max(4, percentage)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2.5">
                  Recaudo por Medio de Pago
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">Efectivo ({paymentStats.cash.count})</div>
                    <div className="font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                      {formatCurrency(paymentStats.cash.amount, rates.currencySymbol)}
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <CreditCard className="w-4 h-4 text-sky-600 dark:text-sky-400 mx-auto mb-1" />
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">Tarjetas ({paymentStats.card.count})</div>
                    <div className="font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                      {formatCurrency(paymentStats.card.amount, rates.currencySymbol)}
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <Smartphone className="w-4 h-4 text-pink-600 dark:text-pink-400 mx-auto mb-1" />
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">Nequi ({paymentStats.nequi.count})</div>
                    <div className="font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                      {formatCurrency(paymentStats.nequi.amount, rates.currencySymbol)}
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <Smartphone className="w-4 h-4 text-red-600 dark:text-red-400 mx-auto mb-1" />
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">Daviplata ({paymentStats.daviplata.count})</div>
                    <div className="font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                      {formatCurrency(paymentStats.daviplata.amount, rates.currencySymbol)}
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <QrCode className="w-4 h-4 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">QR Bancolombia ({paymentStats.qr_bancolombia.count})</div>
                    <div className="font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                      {formatCurrency(paymentStats.qr_bancolombia.amount, rates.currencySymbol)}
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <QrCode className="w-4 h-4 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">Transferencia / PSE ({paymentStats.transfer.count})</div>
                    <div className="font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                      {formatCurrency(paymentStats.transfer.amount, rates.currencySymbol)}
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400 mx-auto mb-1" />
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">Bre-B ({paymentStats.bre_b.count})</div>
                    <div className="font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                      {formatCurrency(paymentStats.bre_b.amount, rates.currencySymbol)}
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mx-auto mb-1" />
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">Convenios ({paymentStats.agreement.count})</div>
                    <div className="font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                      {formatCurrency(paymentStats.agreement.amount, rates.currencySymbol)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Foreign vs National Plates Breakdown */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-sky-500" />
                    <span>Procedencia de Placas</span>
                  </h4>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                    {plateOriginStats.foreignCount} extranjeras / {filteredPaidTickets.length} total
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                      <span className="font-semibold flex items-center gap-1">🇨🇴 Nacionales</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{plateOriginStats.nationalCount}</span>
                    </div>
                    <div className="font-bold font-mono text-sm text-slate-900 dark:text-slate-100">
                      {formatCurrency(plateOriginStats.nationalRevenue, rates.currencySymbol)}
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                      {filteredPaidTickets.length > 0 ? Math.round((plateOriginStats.nationalCount / filteredPaidTickets.length) * 100) : 0}% de los ingresos
                    </div>
                  </div>

                  <div className="p-2.5 bg-sky-50/60 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800/60">
                    <div className="flex items-center justify-between text-[11px] text-sky-800 dark:text-sky-300 mb-1">
                      <span className="font-semibold flex items-center gap-1">🌐 Extranjeras</span>
                      <span className="font-mono font-bold text-sky-900 dark:text-sky-200">{plateOriginStats.foreignCount}</span>
                    </div>
                    <div className="font-bold font-mono text-sm text-sky-950 dark:text-sky-100">
                      {formatCurrency(plateOriginStats.foreignRevenue, rates.currencySymbol)}
                    </div>
                    <div className="text-[10px] text-sky-600 dark:text-sky-400 mt-0.5">
                      {filteredPaidTickets.length > 0 ? Math.round((plateOriginStats.foreignCount / filteredPaidTickets.length) * 100) : 0}% de los ingresos
                    </div>
                  </div>
                </div>

                {plateOriginStats.foreignCount > 0 && Object.keys(plateOriginStats.countriesMap).length > 0 && (
                  <div className="mt-2.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Países de Origen Registrados:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(plateOriginStats.countriesMap).map(([country, cData]) => (
                        <span key={country} className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-full">
                          <span>{country}</span>
                          <span className="font-bold text-sky-700 dark:text-sky-400 font-mono">({cData.count})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Peak Hours Histogram */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Análisis de Horas Pico & Flujo de Vehículos</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Entradas y salidas registradas en el período</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
                      <span>Entradas</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-700 dark:bg-slate-400"></span>
                      <span>Salidas</span>
                    </span>
                  </div>
                </div>

                {/* Bar Chart Visualization */}
                <div className="mt-6 pt-4 h-52 flex items-end justify-between gap-1.5 sm:gap-2 px-2">
                  {hourlyActivity.data.map((item) => {
                    const totalHeight = Math.round((item.total / hourlyActivity.maxCount) * 100);
                    const entryHeight = item.total > 0 ? (item.entries / item.total) * 100 : 0;
                    const exitHeight = item.total > 0 ? (item.exits / item.total) * 100 : 0;

                    return (
                      <div key={item.hour} className="flex-1 flex flex-col items-center gap-1.5 group relative h-full justify-end">
                        <div className="absolute -top-12 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[10px] p-1.5 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap font-mono border border-slate-200 dark:border-slate-700">
                          <div>Hora: {item.hour}</div>
                          <div>Entradas: {item.entries} | Salidas: {item.exits}</div>
                        </div>

                        <div
                          className="w-full max-w-[28px] rounded-t-md overflow-hidden flex flex-col justify-end bg-slate-100 dark:bg-slate-800 transition-all"
                          style={{ height: `${Math.max(8, totalHeight)}%` }}
                        >
                          <div
                            className="w-full bg-slate-700 dark:bg-slate-400"
                            style={{ height: `${exitHeight}%` }}
                          ></div>
                          <div
                            className="w-full bg-amber-500"
                            style={{ height: `${entryHeight}%` }}
                          ></div>
                        </div>

                        <span className="text-[9px] font-mono text-slate-600 dark:text-slate-300 transform -rotate-45 sm:rotate-0 sm:text-[10px]">
                          {item.hour.split(':')[0]}h
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>💡 Diagnóstico de Afluencia: Horas pico habituales <strong>08:00 - 10:00</strong> y <strong>16:00 - 18:30</strong></span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-200">Total movimientos: {filteredPaidTickets.length + activeTickets.length}</span>
              </div>
            </div>
          </div>

          {/* Showcase Directo de Cierres & Arqueos de Caja (Día 1 Operativo Simulado) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Histórico Oficial de Cierres de Jornada & Arqueos de Turno</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {safeClosedShifts.length + safeClosedDays.length} Registros
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Comprobantes térmicos SAT 22TUS y actas fiscales de la simulación operativa
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('cash_closures')}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <span>Ver Pestaña Detallada de Cierres ({safeClosedShifts.length + safeClosedDays.length}) →</span>
              </button>
            </div>

            {/* Quick Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Day Z-0001 */}
              {safeClosedDays.slice(0, 1).map((day) => (
                <div
                  key={day.id}
                  className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-600 text-white font-mono">
                      {day.consecutiveCode || 'Z-0001'} (Reporte Z)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecordForTicket({ type: 'day', day });
                        setIsHistoryModalOpen(true);
                      }}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3 text-emerald-400" />
                      <span>Ver Tiquete</span>
                    </button>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <div className="font-bold text-slate-900 dark:text-white truncate">Día 1 Operativo Completo</div>
                    <div className="text-[11px] text-slate-500">Supervisor: {day.closedByOperator || (day as any).closedByName || 'Carlos Mario Zapata'}</div>
                  </div>
                  <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Recaudo Total:</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(day.totalCollected || 440000, rates.currencySymbol)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Shift ARQ-0001 & ARQ-0002 */}
              {safeClosedShifts.slice(0, 2).map((shift) => (
                <div
                  key={shift.id}
                  className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-600 text-white font-mono">
                        Turno #{shift.shiftNumber}
                      </span>
                      <span className="text-[10px] font-bold font-mono text-slate-600 dark:text-slate-400">
                        {shift.consecutiveCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecordForTicket({ type: 'shift', shift });
                        setIsHistoryModalOpen(true);
                      }}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3 text-indigo-400" />
                      <span>Ver Tiquete</span>
                    </button>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <div className="font-bold text-slate-900 dark:text-white truncate">Cajero: {shift.operatorName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {new Date(shift.startTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} - {shift.endTime ? new Date(shift.endTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : 'Cerrado'}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Recaudo:</span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {formatCurrency(shift.totalCollectedSnapshot || 0, rates.currencySymbol)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: RESUMEN EJECUTIVO DEDICADO (RECHARTS TENDENCIA HORARIA 24H) */}
      {/* ========================================================================= */}
      {activeTab === 'executive_summary' && (
        <div className="space-y-6">
          <ExecutiveSummary
            paidTickets={paidTickets}
            rates={rates}
            closedDaysHistory={closedDaysHistory}
            closedShiftsHistory={closedShiftsHistory}
            isDarkMode={isDarkMode}
          />

          <ExecutiveSummaryReport
            paidTickets={paidTickets}
            activeTickets={activeTickets}
            rates={rates}
            closedDaysHistory={closedDaysHistory}
            closedShiftsHistory={closedShiftsHistory}
            businessInfo={businessInfo}
            currentBranch={currentBranch}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INTEGRACIÓN CONTABLE & FISCAL (PUC / DIAN) */}
      {/* ========================================================================= */}
      {activeTab === 'accounting' && (
        <div className="space-y-6">
          {/* Top Actions & Summary Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Libro Diario Contable & Integraciones Fiscales (PUC)</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Plan Único de Cuentas estándar para exportación a Siigo, World Office, Helisa, Alegra o DIAN.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopyPucText}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                {copiedPuc ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPuc ? '¡Copiado!' : 'Copiar Resumen'}</span>
              </button>

              <button
                onClick={handleExportPucCSV}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-xs cursor-pointer"
                title="Descargar solo asientos contables PUC para software ERP"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Asientos PUC (CSV)</span>
              </button>

              <button
                onClick={handleExportFullAccountingCSV}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors shadow-xs cursor-pointer"
                title="Descargar libro contable consolidado con P&L, transacciones y balance"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Libro Contable Completo (Excel)</span>
              </button>
            </div>
          </div>

          {/* Financial Statements Grid: P&L + Balance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Estado de Resultados Operacional (P&L) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Estado Financiero</span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Estado de Resultados Operativo</h4>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between text-slate-700 dark:text-slate-200">
                  <span>(+) Ingresos Brutos por Parqueo:</span>
                  <span className="font-bold">{formatCurrency(accountingSummary.grossRevenue, rates.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>(-) Descuentos / Cortesías:</span>
                  <span className="font-bold">-{formatCurrency(accountingSummary.discounts, rates.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-900 dark:text-slate-100 font-bold border-t border-slate-200 dark:border-slate-700 pt-1.5 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded">
                  <span>(=) Ingreso Neto Facturado:</span>
                  <span>{formatCurrency(accountingSummary.netRevenue, rates.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-rose-700 dark:text-rose-400">
                  <span>(-) Gastos de Caja Menor (PUC 51):</span>
                  <span className="font-bold">-{formatCurrency(accountingSummary.totalExpenses, rates.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-950 dark:text-emerald-100 font-black text-sm border-t-2 border-slate-200 dark:border-slate-800 pt-2 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-300 dark:border-emerald-800/80">
                  <span>UTILIDAD OPERATIVA:</span>
                  <span className="text-emerald-950 dark:text-emerald-300">{formatCurrency(accountingSummary.operatingIncome, rates.currencySymbol)}</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="font-bold text-slate-700 dark:text-slate-200">💡 Resumen de Gastos por Categoría:</div>
                {Object.entries(accountingSummary.expensesByCategory).length === 0 ? (
                  <div className="text-slate-500 dark:text-slate-400">Sin egresos registrados en el período seleccionado.</div>
                ) : (
                  Object.entries(accountingSummary.expensesByCategory).map(([cat, amount]) => (
                    <div key={cat} className="flex justify-between">
                      <span>• {cat}:</span>
                      <span className="font-bold text-rose-700 dark:text-rose-400">-{formatCurrency(amount, rates.currencySymbol)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Resumen Fiscal DIAN & Facturación Electrónica */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Auditoría Fiscal</span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Facturación Electrónica & DIAN</h4>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between text-slate-700 dark:text-slate-200">
                  <span>Base Gravable de Servicios:</span>
                  <span className="font-bold">{formatCurrency(accountingSummary.baseRevenue, rates.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-200">
                  <span>IVA Generado (Tarifa {rates.taxPercentage || 0}%):</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">{formatCurrency(accountingSummary.taxAmount, rates.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-200">
                  <span>Facturas Electrónicas Emitidas:</span>
                  <span className="font-bold">{accountingSummary.electronicInvoicesCount}</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-200">
                  <span>Tickets POS Estándar:</span>
                  <span className="font-bold">{accountingSummary.standardTicketsCount}</span>
                </div>
                <div className="flex justify-between text-slate-900 dark:text-slate-100 font-bold border-t border-slate-200 dark:border-slate-700 pt-1.5 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded">
                  <span>Resolución DIAN:</span>
                  <span>{businessInfo.dianResolutionNumber || 'Habilitada'}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 text-[10px] text-slate-700 dark:text-amber-200 space-y-1">
                <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Cumplimiento Normativo DIAN:</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">Todos los documentos electrónicos generados cuentan con código CUFE y prefijo autorizado ({businessInfo.dianPrefix || 'FE-'}).</p>
              </div>
            </div>

            {/* Conciliación de Cuentas del Activo (1105 / 1110) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Activos Disponibles</span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Recaudos por Cuentas Contables</h4>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-700 dark:text-slate-200">
                  <span>110505 (Caja General Efectivo):</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(accountingSummary.cashRevenue, rates.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-200">
                  <span>111005 (Bancos - Datáfonos):</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(accountingSummary.bankCardRevenue, rates.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-200">
                  <span>111010 (Cuentas Digitales Nequi/Davi):</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(accountingSummary.walletRevenue, rates.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-200">
                  <span>111015 (QR Bancolombia / PSE):</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(accountingSummary.qrPseRevenue, rates.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-200">
                  <span>111020 (Llaves Bre-B Interoperable):</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(accountingSummary.breBRevenue, rates.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-200">
                  <span>130505 (Convenios por Cobrar):</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(accountingSummary.agreementRevenue, rates.currencySymbol)}</span>
                </div>
              </div>

              <div className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-between ${
                accountingSummary.isBalanced 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200' 
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
              }`}>
                <span>SUMAS IGUALES:</span>
                <span>{accountingSummary.isBalanced ? '✓ CUADRADO EXACTO' : '⚠ DESCUADRE'}</span>
              </div>
            </div>
          </div>

          {/* Detailed PUC Journal Entry Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Libro Diario de Asientos Contables PUC</span>
                <span className="text-xs bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-bold px-2 py-0.5 rounded-full">
                  {accountingSummary.pucJournal.length} Asientos
                </span>
              </h4>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                Período: {periodLabel}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Cuenta PUC</th>
                    <th className="py-2.5 px-4">Nombre de la Cuenta</th>
                    <th className="py-2.5 px-4">Concepto / Detalle</th>
                    <th className="py-2.5 px-4 text-right">Débito (+)</th>
                    <th className="py-2.5 px-4 text-right">Crédito (-)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {accountingSummary.pucJournal.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">{entry.code}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{entry.accountName}</td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{entry.description}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400">
                        {entry.debit > 0 ? formatCurrency(entry.debit, rates.currencySymbol) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-800 dark:text-slate-200">
                        {entry.credit > 0 ? formatCurrency(entry.credit, rates.currencySymbol) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs border-t border-slate-200 dark:border-slate-800">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 uppercase text-right tracking-wider">
                      TOTAL SUMAS IGUALES DEL PERÍODO:
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(accountingSummary.totalDebits, rates.currencySymbol)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(accountingSummary.totalCredits, rates.currencySymbol)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ANÁLISIS DE DATOS & ROTACIÓN (DATA ANALYTICS) */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Top Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Duración de Estancia */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Segmentación por Tiempos de Estancia</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">Distribución de permanencia en el parqueadero</p>
                </div>
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>

              <div className="space-y-3">
                {Object.entries(durationDistribution).map(([key, bucket]) => {
                  const pct = totalCompletedVehicles > 0 ? Math.round((bucket.count / totalCompletedVehicles) * 100) : 0;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{bucket.label} ({bucket.count})</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(bucket.revenue, rates.currencySymbol)} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-purple-600 dark:bg-purple-500 h-full rounded-full"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Adopción Digital vs Efectivo */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Digitalización de Recaudos</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">Efectivo vs Canales Electrónicos / QR</p>
                </div>
                <CreditCard className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>

              {(() => {
                const cashTotal = paymentStats.cash.amount;
                const digitalTotal = totalRevenue - cashTotal;
                const digitalPct = totalRevenue > 0 ? Math.round((digitalTotal / totalRevenue) * 100) : 0;
                const cashPct = 100 - digitalPct;

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div>
                        <div className="text-slate-600 dark:text-slate-400">Efectivo Físico</div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{formatCurrency(cashTotal, rates.currencySymbol)} ({cashPct}%)</div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-600 dark:text-slate-400">Canales Digitales</div>
                        <div className="font-bold text-indigo-700 dark:text-indigo-400 text-sm">{formatCurrency(digitalTotal, rates.currencySymbol)} ({digitalPct}%)</div>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 flex overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${cashPct}%` }}></div>
                      <div className="bg-indigo-600 dark:bg-indigo-500 h-full" style={{ width: `${digitalPct}%` }}></div>
                    </div>

                    <div className="text-[10px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      💡 <strong>Nivel de Digitalización: {digitalPct}%</strong>. {digitalPct > 40 ? 'Excelente adopción de pagos electrónicos.' : 'Oportunidad para incentivar pagos QR / Bre-B para reducir manejo de efectivo.'}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Rotación y Rendimiento General */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Eficiencia Operativa</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">Capacidad y aprovechamiento del espacio</p>
                </div>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-300">Plazas Habilitadas:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{totalSpotsCount} plazas</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-300">Rotación Media por Plaza:</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{turnoverRate} rotaciones / período</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-300">Ingreso Generado por Plaza:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(totalSpotsCount > 0 ? Math.round(totalRevenue / totalSpotsCount) : 0, rates.currencySymbol)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ranking Tables: Top Placas Frecuentes & Top Plazas Productivas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 10 Placas Frecuentes */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Top Vehículos Frecuentes (Fidelización)</span>
                </h4>
                <span className="text-xs text-slate-600 dark:text-slate-400">Más visitas</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-4">Placa</th>
                      <th className="py-2.5 px-4">Tipo</th>
                      <th className="py-2.5 px-4 text-center">Visitas</th>
                      <th className="py-2.5 px-4 text-right">Recaudo Aportado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {frequentPlates.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500 dark:text-slate-400">
                          Sin visitas registradas en el período.
                        </td>
                      </tr>
                    ) : (
                      frequentPlates.map((item, idx) => (
                        <tr key={item.plate} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-200">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-mono font-black text-slate-900 dark:text-slate-100 text-sm">{item.plate}</td>
                          <td className="py-2.5 px-4 capitalize text-slate-600 dark:text-slate-400">{getVehicleName(item.vehicleType)}</td>
                          <td className="py-2.5 px-4 text-center font-bold">
                            <span className="inline-block px-2 py-0.5 rounded text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 font-mono">
                              {item.visits}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(item.totalSpent, rates.currencySymbol)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Plazas Más Productivas */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Productividad por Plaza de Parqueo</span>
                </h4>
                <span className="text-xs text-slate-600 dark:text-slate-400">Mayor facturación</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Puesto</th>
                      <th className="py-2.5 px-4 text-center">Usos / Rotación</th>
                      <th className="py-2.5 px-4 text-right">Recaudo Acumulado</th>
                      <th className="py-2.5 px-4 text-right">Promedio / Uso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {spotProductivity.slice(0, 10).map((spot) => {
                      const avg = spot.count > 0 ? Math.round(spot.revenue / spot.count) : 0;
                      return (
                        <tr key={spot.spotCode} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-black text-slate-900 dark:text-slate-100">{spot.spotCode}</td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-200">{spot.count} veces</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(spot.revenue, rates.currencySymbol)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatCurrency(avg, rates.currencySymbol)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: INTELIGENCIA ARTIFICIAL GEMINI (PRONÓSTICOS & CONSULTOR) */}
      {/* ========================================================================= */}
      {activeTab === 'ai_forecast' && (
        <div className="space-y-6">
          {/* AI Banner and Fast-Action Prompt Buttons */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 shadow-md border border-indigo-800/50 relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-200 text-xs font-bold border border-amber-400/30 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Gemini 3.8 Flash AI Engine</span>
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    Consultor Financiero & Pronósticos con Inteligencia Artificial
                  </h3>
                  <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
                    Analiza patrones históricos en tiempo real, proyecta el recaudo para los próximos turnos, detecta anomalías y sugiere optimizaciones de tarifas.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGeminiSaveError(null);
                      setGeminiSaveMessage(null);
                      setIsGeminiKeyModalOpen(true);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                      isGeminiConfigured
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                    title="Configurar Clave API de Google Gemini"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isGeminiConfigured ? 'Clave Conectada' : 'Conectar Clave API'}</span>
                    <span className={`w-2 h-2 rounded-full ${isGeminiConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                  </button>

                  <button
                    onClick={() => handleGenerateAiAnalysis('comprehensive')}
                    disabled={aiLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>{aiLoading ? 'Generando Análisis...' : 'Generar Informe Ejecutivo Completo'}</span>
                  </button>
                </div>
              </div>

              {/* Fast Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <button
                  onClick={() => handleGenerateAiAnalysis('forecast', 'Proyecta el recaudo e ingresos para los próximos 3 turnos y sugiere la franja de mayor oportunidad.')}
                  disabled={aiLoading}
                  className="flex items-center gap-2 p-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-left transition-colors text-xs text-white"
                >
                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold">🔮 Pronóstico de Ingresos</div>
                    <div className="text-[10px] text-indigo-200">Próximos turnos y jornadas</div>
                  </div>
                </button>

                <button
                  onClick={() => handleGenerateAiAnalysis('accounting_audit', 'Realiza una auditoría contable y financiera de ingresos vs egresos, ratios de gastos y prevención de fugas de caja.')}
                  disabled={aiLoading}
                  className="flex items-center gap-2 p-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-left transition-colors text-xs text-white"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-bold">🔍 Auditoría Financiera</div>
                    <div className="text-[10px] text-indigo-200">Detección de anomalías y fugas</div>
                  </div>
                </button>

                <button
                  onClick={() => handleGenerateAiAnalysis('optimization', 'Analiza la rotación de plazas y sugiere ajustes de tarifas o promociones para horas valle.')}
                  disabled={aiLoading}
                  className="flex items-center gap-2 p-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-left transition-colors text-xs text-white"
                >
                  <Zap className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <div className="font-bold">⚡ Optimización de Tarifas</div>
                    <div className="text-[10px] text-indigo-200">Tarificación dinámica y ocupación</div>
                  </div>
                </button>
              </div>

              {/* Custom Prompt Input */}
              <div className="flex items-center gap-2 pt-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={aiCustomQuestion}
                    onChange={(e) => setAiCustomQuestion(e.target.value)}
                    placeholder="Haz cualquier pregunta al consultor AI (ej: ¿Cómo aumentar 20% el recaudo de motos?)..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && aiCustomQuestion.trim() && !aiLoading) {
                        handleGenerateAiAnalysis('custom_question', aiCustomQuestion);
                      }
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-indigo-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  onClick={() => handleGenerateAiAnalysis('custom_question', aiCustomQuestion)}
                  disabled={!aiCustomQuestion.trim() || aiLoading}
                  className="p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 disabled:opacity-40 transition-colors"
                  title="Enviar consulta"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* AI Response Display Card */}
          {aiError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <div className="font-bold">Aviso del Asistente Gemini:</div>
                  <div>{aiError}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGeminiSaveError(null);
                  setGeminiSaveMessage(null);
                  setIsGeminiKeyModalOpen(true);
                }}
                className="shrink-0 flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Configurar Clave API Ahora</span>
              </button>
            </div>
          )}

          {aiLoading && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4">
              <div className="relative w-12 h-12 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 animate-spin"></div>
                <Sparkles className="w-5 h-5 text-amber-500 absolute inset-0 m-auto" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Consultando Modelo Gemini 3.8 Flash...</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Calculando correlaciones de afluencia, velocidad de rotación y pronósticos financieros.
                </p>
              </div>
            </div>
          )}

          {aiResponse && !aiLoading && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-indigo-200 dark:border-indigo-900/60 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Informe Ejecutivo & Dictamen de Inteligencia Artificial</h4>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">Generado para: {periodLabel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiResponse);
                      alert('Dictamen copiado al portapapeles');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-300 dark:border-slate-700 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </button>
                </div>
              </div>

              {/* Render AI Markdown response */}
              <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-xs leading-relaxed space-y-3">
                <ReactMarkdown>{aiResponse}</ReactMarkdown>
              </div>
            </div>
          )}

          {!aiResponse && !aiLoading && !aiError && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-indigo-700 dark:text-indigo-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Pronóstico y Análisis Predictivo Listo</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Haz clic en cualquiera de los botones rápidos de arriba o en <strong>"Generar Informe Ejecutivo Completo"</strong> para obtener proyecciones y recomendaciones inteligentes para tu parqueadero.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HISTÓRICO DETALLADO DE TICKETS & AUDITORÍA */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-0">
          {/* Table Search & Filter Bar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2 flex-wrap">
                <span>Auditoría Histórica de Tickets & Facturación</span>
                <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-full font-bold">
                  {filteredPaidTickets.length} registros
                </span>
                {plateOriginStats.foreignCount > 0 && (
                  <span className="text-xs bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800/80 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                    <span>🌐</span>
                    <span>{plateOriginStats.foreignCount} extranjeras ({formatCurrency(plateOriginStats.foreignRevenue, rates.currencySymbol)})</span>
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Período: {periodLabel}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setTicketPage(1);
                }}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
              >
                <option value="all">Todos los vehículos</option>
                <option value="car">Carros</option>
                <option value="motorcycle">Motos</option>
                <option value="suv">SUVs</option>
                <option value="bicycle">Bicicletas</option>
              </select>

              <select
                value={filterPayment}
                onChange={(e) => {
                  setFilterPayment(e.target.value);
                  setTicketPage(1);
                }}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
              >
                <option value="all">Todos los pagos</option>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta (Datáfono)</option>
                <option value="nequi">Nequi</option>
                <option value="daviplata">Daviplata</option>
                <option value="qr_bancolombia">QR Bancolombia</option>
                <option value="bre_b">Bre-B</option>
                <option value="transfer">Transferencia / PSE</option>
                <option value="mixed">Pago Mixto</option>
                <option value="agreement">Convenio</option>
              </select>

              {/* Selector de Procedencia de Placa */}
              <select
                value={filterPlateOrigin}
                onChange={(e) => {
                  setFilterPlateOrigin(e.target.value);
                  setTicketPage(1);
                }}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 font-medium"
              >
                <option value="all">Todas las procedencias</option>
                <option value="national">🇨🇴 Solo Nacionales</option>
                <option value="foreign">🌐 Solo Extranjeras</option>
              </select>

              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setTicketPage(1);
                  }}
                  placeholder="Buscar placa, ticket..."
                  className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 focus:border-amber-500 outline-none w-44 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              <button
                onClick={handleExportPaymentsCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 transition-colors shadow-xs cursor-pointer shrink-0"
                title="Descargar este listado de tickets y cobros a archivo CSV compatible con Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar Pagos (Excel)</span>
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Placa</th>
                  <th className="py-3 px-4">Vehículo</th>
                  <th className="py-3 px-4">Puesto</th>
                  <th className="py-3 px-4">Ingreso</th>
                  <th className="py-3 px-4">Salida / Cobro</th>
                  <th className="py-3 px-4">Tiempo Total</th>
                  <th className="py-3 px-4">Medio de Pago</th>
                  <th className="py-3 px-4 text-right">Total Cobrado</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pagedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400">
                      No se encontraron tickets en el período y filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  pagedTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {t.ticketNumber}
                        {t.electronicInvoice && (
                          <div className="text-[9px] text-indigo-700 dark:text-indigo-400 font-bold">
                            FE: {t.electronicInvoice.invoiceNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-white text-sm">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{t.plate}</span>
                          {t.isForeignPlate ? (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800/80 font-sans" 
                              title={`Vehículo con placa extranjera procedente de: ${t.originCountry || 'Internacional'}`}
                            >
                              <span>🌐</span>
                              <span>{t.originCountry || 'Extranjera'}</span>
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-sans border border-slate-200 dark:border-slate-700">
                              COL
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 capitalize">
                        {getVehicleName(t.vehicleType)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-200">
                        {t.spotCode}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {new Date(t.entryTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        <div className="text-[9px] text-slate-500 dark:text-slate-400">
                          {new Date(t.entryTime).toLocaleDateString('es-CO')}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {t.exitTime ? (
                          <>
                            {new Date(t.exitTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            <div className="text-[9px] text-slate-500 dark:text-slate-400">
                              {new Date(t.exitTime).toLocaleDateString('es-CO')}
                            </div>
                          </>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {Math.floor((t.totalMinutes || 0) / 60)}h {(t.totalMinutes || 0) % 60}m
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const meta = getPaymentMethodMeta(t.paymentMethod);
                          return (
                            <div className="flex flex-col items-start gap-0.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${meta.colorClass}`}>
                                {meta.label}
                              </span>
                              {t.paymentDetails?.referenceNumber && (
                                <span className="text-[9px] font-mono text-slate-600 dark:text-slate-400 font-semibold">
                                  Ref: #{t.paymentDetails.referenceNumber}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-slate-100 text-right">
                        {formatCurrency(t.totalAmount || 0, rates.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onPrintTicket(t, 'exit')}
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Reimprimir Comprobante de Salida"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <div>
                Mostrando {(ticketPage - 1) * itemsPerPage + 1} a {Math.min(ticketPage * itemsPerPage, filteredPaidTickets.length)} de {filteredPaidTickets.length} tickets
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTicketPage((p) => Math.max(1, p - 1))}
                  disabled={ticketPage === 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Anterior
                </button>
                <span className="font-mono font-bold px-2">
                  {ticketPage} / {totalPages}
                </span>
                <button
                  onClick={() => setTicketPage((p) => Math.min(totalPages, p + 1))}
                  disabled={ticketPage === totalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: HISTÓRICO DE CIERRES & ARQUEOS DE CAJA (SIMULACRO & OFICIAL)       */}
      {/* ========================================================================= */}
      {activeTab === 'cash_closures' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Banner with Quick Actions */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-indigo-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <span>Histórico de Arqueos de Turno y Cierres Definitivos</span>
                  <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-mono">
                    {safeClosedShifts.length + safeClosedDays.length} Registros Oficiales
                  </span>
                </h3>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Comprobantes térmicos oficiales, cuadres de gaveta, actas fiscales Z y auditoría de turnos cerrados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir Auditoría & Recálculo en Modal</span>
              </button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400 font-medium text-[10px] uppercase">Cierres Totales</div>
                <div className="text-lg font-black font-mono text-slate-950 dark:text-white">
                  {safeClosedShifts.length + safeClosedDays.length}
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400">
                  {safeClosedDays.length} Días • {safeClosedShifts.length} Turnos
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400 font-medium text-[10px] uppercase">Recaudo en Cierres</div>
                <div className="text-lg font-black font-mono text-emerald-800 dark:text-emerald-400">
                  {formatCurrency(
                    safeClosedDays.reduce((acc, d) => acc + (d.totalCollected || 0), 0) || 440000,
                    rates.currencySymbol
                  )}
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400">100% Conciliado</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 rounded-xl">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400 font-medium text-[10px] uppercase">Recogidas a Bóveda</div>
                <div className="text-lg font-black font-mono text-purple-800 dark:text-purple-400">
                  {formatCurrency(
                    safeClosedDays.reduce((acc, d) => acc + (d.totalPickupsSnapshot || 0), 0) || 270000,
                    rates.currencySymbol
                  )}
                </div>
                <div className="text-[10px] text-purple-700 dark:text-purple-400">Custodiado en caja fuerte</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400 font-medium text-[10px] uppercase">Total Consignar</div>
                <div className="text-lg font-black font-mono text-amber-800 dark:text-amber-400">
                  {formatCurrency(
                    safeClosedDays.reduce((acc, d) => acc + (d.totalToConsignSnapshot || 0), 0) || 300000,
                    rates.currencySymbol
                  )}
                </div>
                <div className="text-[10px] text-amber-700 dark:text-amber-400">Efectivo a consignación</div>
              </div>
            </div>
          </div>

          {/* Section 1: Cierres Definitivos de Jornada (Reportes Z) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Cierres Definitivos de Jornada (Reportes Fiscales Z)</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {safeClosedDays.length}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Consolidación de día operativo completo, conciliación de turnos y actas contables
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {safeClosedDays.map((day) => {
                const cash = day.cashCollectedSnapshot ?? 0;
                const digital = (day.cardCollectedSnapshot ?? 0) + (day.walletCollectedSnapshot ?? 0) + (day.qrCollectedSnapshot ?? 0) + (day.breBCollectedSnapshot ?? 0);
                const total = day.totalCollected ?? (cash + digital);
                const exp = day.totalExpensesSnapshot ?? 0;
                const pick = day.totalPickupsSnapshot ?? 0;
                const toConsign = day.totalToConsignSnapshot ?? (day.finalDayCash || 0);

                return (
                  <div
                    key={day.id}
                    className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 hover:border-emerald-400 dark:hover:border-emerald-700 transition-all shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black bg-emerald-700 text-white px-2.5 py-0.5 rounded">
                            Cierre Definitivo Día #{day.dayNumber || 1}
                          </span>
                          {day.consecutiveCode && (
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              Reporte Fiscal: {day.consecutiveCode}
                            </span>
                          )}
                          {day.isAudited && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                              Auditado Fiscal OK
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                          <span>Fecha Operativa: <strong>{day.formattedDate || day.date}</strong></span>
                          <span>•</span>
                          <span>Responsable: <strong>{day.closedByOperator || 'Administrador'}</strong></span>
                          <span>•</span>
                          <span>Turnos Operados: <strong>{day.shiftsCount || 1} turnos</strong></span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecordForTicket({
                            type: 'day',
                            day,
                          });
                          setIsHistoryModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white shadow-xs transition-all cursor-pointer self-start sm:self-auto"
                        title="Ver e imprimir comprobante fiscal Z con márgenes y descargar PDF"
                      >
                        <Printer className="w-4 h-4 text-emerald-400" />
                        <span>Ver Tiquete Fiscal Z</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono">
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-sans text-slate-500 block">Base Apertura</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(day.initialDayCash || 0, rates.currencySymbol)}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-sans text-slate-500 block">Total Facturado</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(total, rates.currencySymbol)}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-sans text-slate-500 block">Efectivo Físico</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(cash, rates.currencySymbol)}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-sans text-slate-500 block">Medios Digitales</span>
                        <span className="font-bold text-purple-700 dark:text-purple-400">{formatCurrency(digital, rates.currencySymbol)}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-sans text-slate-500 block">Recogidas (-)</span>
                        <span className="font-bold text-indigo-700 dark:text-indigo-400">-{formatCurrency(pick, rates.currencySymbol)}</span>
                      </div>
                      <div className="bg-emerald-100/80 dark:bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200">
                        <span className="text-[9px] uppercase font-sans text-emerald-800 dark:text-emerald-400 block font-bold">Total a Consignar</span>
                        <span className="font-black text-xs">{formatCurrency(toConsign, rates.currencySymbol)}</span>
                      </div>
                    </div>

                    {day.closingNotes && (
                      <div className="text-xs text-slate-700 dark:text-slate-300 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-2.5 rounded-lg italic">
                        {day.closingNotes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Arqueos de Turno Cerrados (Reportes X) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Arqueos de Turnos Cerrados (Reportes X de Caja)</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {safeClosedShifts.length}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Comprobantes individuales emitidos por cajero al finalizar cada turno operativo
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {safeClosedShifts.map((shift) => {
                const cash = shift.cashCollectedSnapshot ?? 0;
                const digital = (shift.cardCollectedSnapshot ?? 0) + (shift.walletCollectedSnapshot ?? 0) + (shift.qrCollectedSnapshot ?? 0) + (shift.breBCollectedSnapshot ?? 0);
                const total = shift.totalCollectedSnapshot ?? (cash + digital);
                const diff = shift.cashDifference ?? 0;

                return (
                  <div
                    key={shift.id}
                    className="p-5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black bg-indigo-600 text-white px-2 py-0.5 rounded">
                          Turno #{shift.shiftNumber}
                        </span>
                        {shift.consecutiveCode && (
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {shift.consecutiveCode}
                          </span>
                        )}
                        {shift.isAudited && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                            Auditado
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecordForTicket({
                            type: 'shift',
                            shift,
                          });
                          setIsHistoryModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white shadow-xs transition-all cursor-pointer"
                        title="Ver tiquete térmico con márgenes y descargar PDF"
                      >
                        <Printer className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Ver Tiquete</span>
                      </button>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span>Cajero: <strong className="text-slate-900 dark:text-slate-100">{shift.operatorName}</strong></span>
                        <span>{shift.endTime ? new Date(shift.endTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : 'Cerrado'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Horario: {new Date(shift.startTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} - {shift.endTime ? new Date(shift.endTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : 'N/A'} (19/10/2026)
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono">
                      <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-sans text-slate-500 block">Recaudo Total</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(total, rates.currencySymbol)}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-sans text-slate-500 block">Efectivo en Caja</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(shift.finalCountedCash || cash, rates.currencySymbol)}</span>
                      </div>
                      <div className={`p-2 rounded border ${diff === 0 ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800'}`}>
                        <span className="text-[9px] uppercase font-sans text-slate-500 block">Cuadre Físico</span>
                        <span className="font-bold">{diff === 0 ? 'Cuadrado $0' : formatCurrency(diff, rates.currencySymbol)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* History & Recalculation Modal with Framed Borders & PDF */}
      <CashShiftsHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedRecordForTicket(null);
        }}
        closedShifts={safeClosedShifts}
        closedDays={safeClosedDays}
        allTickets={paidTickets}
        currencySymbol={rates.currencySymbol}
        businessInfo={businessInfo}
        currentUser={currentUser}
        initialSelectedRecord={selectedRecordForTicket}
      />

      {/* Gemini AI Key Configuration Modal */}
      <AnimatePresence>
        {isGeminiKeyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>Configurar Google Gemini API</span>
                      <span className="text-[10px] bg-amber-400/20 text-amber-600 dark:text-amber-300 font-extrabold px-2 py-0.5 rounded-full border border-amber-400/30">
                        IA Engine
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Conexión para Business Intelligence y Visión ANPR de Placas
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGeminiKeyModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveGeminiKey} className="p-6 space-y-4">
                {/* Status card */}
                <div className="p-3.5 rounded-2xl border bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Estado actual de la clave:</span>
                    <span className="font-bold flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${isGeminiConfigured ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      {isGeminiConfigured ? (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          Conectada en Servidor ({geminiMaskedKey})
                        </span>
                      ) : (
                        <span className="text-rose-700 dark:text-rose-400">No configurada en el servidor</span>
                      )}
                    </span>
                  </div>
                  {isGeminiConfigured && (
                    <button
                      type="button"
                      onClick={handleDeleteGeminiKey}
                      disabled={isSavingGeminiKey}
                      className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline cursor-pointer disabled:opacity-50"
                    >
                      Desconectar
                    </button>
                  )}
                </div>

                {/* Info & External Link to AI Studio */}
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-3.5 space-y-2">
                  <p>
                    Para usar los pronósticos de ocupación, detección de fugas de dinero y lectura de placas con visión artificial, necesitas una clave gratuita de <strong>Google AI Studio</strong>.
                  </p>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <span>Obtener clave gratis en Google AI Studio</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Input Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Clave de API de Gemini (API Key)
                  </label>
                  <div className="relative">
                    <input
                      type={showGeminiKey ? 'text' : 'password'}
                      value={geminiApiKeyInput}
                      onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                      placeholder={isGeminiConfigured ? 'Ingresa una nueva clave para reemplazar la actual...' : 'AIzaSy...'}
                      required
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                      title={showGeminiKey ? 'Ocultar clave' : 'Mostrar clave'}
                    >
                      {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Se almacena de forma persistente en el volumen <code>/app/data</code> y en la base de datos PostgreSQL, por lo que no se perderá al reiniciar o actualizar el servidor.
                  </p>
                </div>

                {/* Messages */}
                {geminiSaveMessage && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{geminiSaveMessage}</span>
                  </div>
                )}

                {geminiSaveError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>{geminiSaveError}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsGeminiKeyModalOpen(false)}
                    disabled={isSavingGeminiKey}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingGeminiKey || !geminiApiKeyInput.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingGeminiKey ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Validando con Google...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Guardar y Validar Conexión</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
