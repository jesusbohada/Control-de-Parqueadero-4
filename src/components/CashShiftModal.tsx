import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  QrCode, 
  PlusCircle, 
  MinusCircle, 
  ShieldCheck, 
  Printer, 
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowDownCircle,
  ArrowUpCircle,
  Smartphone,
  Layers,
  Building2,
  Banknote,
  Zap,
  Calendar,
  Clock,
  User,
  ChevronRight,
  FileCheck,
  X,
  Tag,
  Receipt,
  EyeOff,
  Settings,
  Upload,
  FileText,
  Image as ImageIcon,
  Eye,
  Trash2,
  Download,
  Paperclip,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  Coins, 
  Wallet,
  History,
  ArrowUpRight,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { CashShift, CashMovement, ParkingTicket, SystemUser, OperationalDay, ParkingBusinessInfo, ExpenseConcept, ExpenseCategory } from '../types';
import { formatCurrency } from '../utils/billing';
import { getTicketPaymentBreakdown } from '../utils/paymentUtils';
import { exportCashMovementsToCsv } from '../utils/exportReportUtils';
import { CashShiftsHistoryModal } from './CashShiftsHistoryModal';
import { printInstantThermal } from '../services/printerService';

interface CashShiftModalProps {
  currentShift: CashShift;
  operationalDay: OperationalDay;
  todayPaidTickets: ParkingTicket[];
  currencySymbol: string;
  businessInfo: ParkingBusinessInfo;
  expenseConcepts?: ExpenseConcept[];
  expenseCategories?: ExpenseCategory[];
  closedShiftsHistory?: CashShift[];
  closedDaysHistory?: OperationalDay[];
  initialSubTab?: 'arqueo' | 'cierre_dia' | 'movements' | 'history';
  onOpenExpenseConceptsModal?: () => void;
  onUpdateShiftInHistory?: (updatedShift: CashShift) => void;
  onUpdateDayInHistory?: (updatedDay: OperationalDay) => void;
  onAddMovement: (
    type: 'income' | 'expense' | 'withdrawal' | 'pickup',
    amount: number,
    description: string,
    conceptId?: string,
    conceptName?: string,
    voucherNumber?: string,
    attachmentUrl?: string,
    attachmentName?: string,
    attachmentType?: 'image' | 'pdf' | 'document',
    attachmentSize?: number
  ) => void;
  onCloseShiftAndArqueo: (countedCash: number, nextOperator: string, nextBase: number) => void;
  onCloseDefinitiveDay: (finalCash: number, notes?: string) => void;
  currentUser?: SystemUser;
}

export const CashShiftModal: React.FC<CashShiftModalProps> = ({
  currentShift,
  operationalDay,
  todayPaidTickets,
  currencySymbol,
  businessInfo,
  expenseConcepts = [],
  expenseCategories = [],
  closedShiftsHistory = [],
  closedDaysHistory = [],
  onOpenExpenseConceptsModal,
  onUpdateShiftInHistory,
  onUpdateDayInHistory,
  onAddMovement,
  onCloseShiftAndArqueo,
  onCloseDefinitiveDay,
  currentUser,
  initialSubTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'arqueo' | 'cierre_dia' | 'movements' | 'history'>(initialSubTab || 'arqueo');

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedRecordForTicket, setSelectedRecordForTicket] = useState<{
    type: 'shift' | 'day';
    shift?: CashShift;
    day?: OperationalDay;
  } | null>(null);

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

  const [countedCashInput, setCountedCashInput] = useState<string>('');
  
  // Day counted cash input
  const [dayCountedCashInput, setDayCountedCashInput] = useState<string>('');

  // Arqueo Ciego: Denominations Calculator & Supervisor Override
  const [showDenominationCalculator, setShowDenominationCalculator] = useState(false);
  const [billCounts, setBillCounts] = useState<{ [denom: number]: number }>({
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
  });
  const [coinCounts, setCoinCounts] = useState<{ [denom: number]: number }>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
  });
  const [supervisorUnlocked, setSupervisorUnlocked] = useState(false);
  const [showSupervisorPinModal, setShowSupervisorPinModal] = useState(false);
  const [supervisorPinInput, setSupervisorPinInput] = useState('');
  const [supervisorPinError, setSupervisorPinError] = useState('');

  // Next shift params for shift change
  const [nextOperatorName, setNextOperatorName] = useState<string>('Cajero Turno Siguiente');
  const [nextBaseCash, setNextBaseCash] = useState<string>(currentShift.initialCash.toString());

  // Day closing params
  const [dayClosingNotes, setDayClosingNotes] = useState<string>('');

  // Print voucher states
  const [printedVoucherType, setPrintedVoucherType] = useState<'arqueo' | 'cierre' | null>(null);
  const [voucherPaperWidth, setVoucherPaperWidth] = useState<'80mm' | '58mm'>(() => businessInfo.defaultPaperWidth || '80mm');
  const [isVoucherPrinting, setIsVoucherPrinting] = useState(false);
  const [voucherPrintStatus, setVoucherPrintStatus] = useState<string | null>(null);

  const handlePrintVoucher = async () => {
    setIsVoucherPrinting(true);
    setVoucherPrintStatus('🖨️ Enviando comprobante a impresora térmica...');
    try {
      const isArqueo = printedVoucherType === 'arqueo';
      const targetPrinter = businessInfo.defaultPrinterName && businessInfo.defaultPrinterName !== 'POS-80'
        ? businessInfo.defaultPrinterName
        : undefined;

      const res = await printInstantThermal({
        type: isArqueo ? 'cash_shift' : 'day_closure',
        shift: currentShift,
        day: operationalDay,
        businessInfo,
        targetPrinterName: targetPrinter,
        paperWidth: voucherPaperWidth,
        autoCut: businessInfo.cutPaperOnPrint ?? true,
        openDrawer: false
      });

      if (res.success) {
        setVoucherPrintStatus(`✅ Impreso exitosamente en ${res.printerName}`);
        setTimeout(() => {
          setPrintedVoucherType(null);
          setVoucherPrintStatus(null);
        }, 1200);
        return;
      } else {
        setVoucherPrintStatus('⚠️ Abriendo diálogo estándar...');
        window.print();
      }
    } catch (err) {
      console.warn('Error imprimiendo comprobante térmico:', err);
      window.print();
    } finally {
      setIsVoucherPrinting(false);
    }
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadVoucherPdf = async () => {
    setIsDownloadingPdf(true);
    setVoucherPrintStatus('📄 Generando PDF oficial...');
    try {
      const isArqueo = printedVoucherType === 'arqueo';
      const response = await fetch('/api/reports/ticket-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: isArqueo ? 'cash_shift' : 'day_closure',
          shift: currentShift,
          day: operationalDay,
          businessInfo,
          paperWidth: voucherPaperWidth
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = isArqueo 
          ? `Arqueo_Turno_${currentShift.shiftNumber || 1}_${currentShift.consecutiveCode || 'X'}.pdf`
          : `Cierre_Dia_${operationalDay.dayNumber || 1}_${operationalDay.consecutiveCode || 'Z'}.pdf`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setVoucherPrintStatus('✅ PDF descargado exitosamente');
        setTimeout(() => setVoucherPrintStatus(null), 3000);
        return;
      }
    } catch (err: any) {
      console.error('Error descargando PDF:', err);
      setVoucherPrintStatus('Error al generar PDF');
      setTimeout(() => setVoucherPrintStatus(null), 3000);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // New movement form
  const [showAddMovementForm, setShowAddMovementForm] = useState(false);
  const [newMovementType, setNewMovementType] = useState<'income' | 'expense' | 'withdrawal' | 'pickup'>('expense');
  const [newMovementConceptId, setNewMovementConceptId] = useState<string>('');
  const [newMovementVoucherNumber, setNewMovementVoucherNumber] = useState<string>('');
  const [newMovementAmount, setNewMovementAmount] = useState<string>('');
  const [newMovementDescription, setNewMovementDescription] = useState<string>('');
  const [pickupResponsible, setPickupResponsible] = useState<string>('Supervisor / Administración');

  // Digital Voucher Attachment state
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [attachmentType, setAttachmentType] = useState<'image' | 'pdf' | 'document' | undefined>(undefined);
  const [attachmentSize, setAttachmentSize] = useState<number | undefined>(undefined);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Attachment Preview Modal
  const [viewingAttachment, setViewingAttachment] = useState<{
    url: string;
    name?: string;
    type?: string;
    amount?: number;
    description?: string;
    operator?: string;
    date?: string;
    voucherNumber?: string;
    conceptName?: string;
  } | null>(null);

  const [viewerZoom, setViewerZoom] = useState<number>(1);
  const [viewerRotation, setViewerRotation] = useState<number>(0);

  // Convert base64/data URLs safely to Blob URLs for reliable browser/iframe rendering
  const safeAttachmentBlobUrl = useMemo(() => {
    if (!viewingAttachment?.url) return '';
    if (viewingAttachment.url.startsWith('blob:') || viewingAttachment.url.startsWith('http')) {
      return viewingAttachment.url;
    }
    if (viewingAttachment.url.startsWith('data:')) {
      try {
        const parts = viewingAttachment.url.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : (viewingAttachment.type === 'pdf' ? 'application/pdf' : 'image/jpeg');
        const byteString = atob(parts[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ia], { type: mime });
        return URL.createObjectURL(blob);
      } catch (e) {
        console.warn('Error converting data URL to blob:', e);
        return viewingAttachment.url;
      }
    }
    return viewingAttachment.url;
  }, [viewingAttachment]);

  const isAttachmentPdf = useMemo(() => {
    if (!viewingAttachment) return false;
    if (viewingAttachment.type === 'pdf') return true;
    if (viewingAttachment.url?.startsWith('data:application/pdf') || viewingAttachment.url?.includes('application/pdf')) return true;
    if (viewingAttachment.name?.toLowerCase().endsWith('.pdf')) return true;
    return false;
  }, [viewingAttachment]);

  const handleOpenAttachmentViewer = (item: {
    url: string;
    name?: string;
    type?: string;
    amount?: number;
    description?: string;
    operator?: string;
    date?: string;
    voucherNumber?: string;
    conceptName?: string;
  }) => {
    setViewerZoom(1);
    setViewerRotation(0);
    setViewingAttachment(item);
  };

  // Permissions & Visibility
  const canViewFinancials = currentUser?.role === 'master' || 
    currentUser?.role === 'supervisor' || 
    (currentUser?.permissions?.canViewLiveFinancialBreakdown ?? false);

  const isBlindCount = ((currentUser?.permissions?.blindCashCount ?? false) && currentUser?.role === 'cashier') && !supervisorUnlocked;
  const canManageConcepts = currentUser?.role === 'master' || currentUser?.role === 'supervisor' || (currentUser?.permissions?.canManageExpenseConcepts ?? false);
  const canWithdraw = currentUser?.permissions?.canWithdrawCash ?? true;
  const canDeposit = currentUser?.role === 'master' || currentUser?.role === 'supervisor' || (currentUser?.permissions?.canDepositCash ?? false);
  const canPickupCash = currentUser?.role === 'master' || currentUser?.role === 'supervisor' || (currentUser?.permissions?.canPickupCash ?? true);
  const showCashPickupOption = currentUser?.role === 'master' || (currentUser?.permissions?.uiVisibility?.showCashPickupOption !== false);

  // Arqueo Ciego: Denominations breakdown sums
  const totalBillsAmount = useMemo(() => {
    return Object.entries(billCounts).reduce((acc, [denom, count]) => acc + (Number(denom) * (count || 0)), 0);
  }, [billCounts]);

  const totalCoinsAmount = useMemo(() => {
    return Object.entries(coinCounts).reduce((acc, [denom, count]) => acc + (Number(denom) * (count || 0)), 0);
  }, [coinCounts]);

  const totalDenominationsAmount = totalBillsAmount + totalCoinsAmount;

  const handleApplyDenominationsToCount = () => {
    setCountedCashInput(totalDenominationsAmount.toString());
  };

  const handleResetDenominations = () => {
    setBillCounts({ 100000: 0, 50000: 0, 20000: 0, 10000: 0, 5000: 0, 2000: 0 });
    setCoinCounts({ 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0 });
  };

  const handleUnlockSupervisor = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = supervisorPinInput.trim();
    if (!pin) {
      setSupervisorPinError('Ingrese el PIN del supervisor');
      return;
    }
    if (pin === '1234' || pin === 'admin' || pin === 'supervisor' || pin === '1974' || (currentUser?.password && pin === currentUser.password)) {
      setSupervisorUnlocked(true);
      setShowSupervisorPinModal(false);
      setSupervisorPinInput('');
      setSupervisorPinError('');
    } else {
      setSupervisorPinError('PIN de Supervisor incorrecto');
    }
  };

  // Filter tickets for this specific shift vs entire operative day
  const shiftPaidTickets = useMemo(() => {
    return todayPaidTickets.filter((t) => {
      if (t.shiftNumber !== undefined && currentShift.shiftNumber !== undefined) {
        return t.shiftNumber === currentShift.shiftNumber;
      }
      if (currentShift.startTime && t.paidAt) {
        return new Date(t.paidAt).getTime() >= new Date(currentShift.startTime).getTime();
      }
      return true;
    });
  }, [todayPaidTickets, currentShift]);

  // Breakdown function
  const computeBreakdown = (tickets: ParkingTicket[]) => {
    let cash = 0;
    let card = 0;
    let wallet = 0;
    let qr = 0;
    let breB = 0;
    let agreement = 0;
    let totalVehicles = tickets.length;

    tickets.forEach((t) => {
      const breakdown = getTicketPaymentBreakdown(t);
      cash += breakdown.cashInDrawer;

      const m = t.paymentMethod;
      if (m === 'card') {
        card += (t.totalAmount || 0);
      } else if (m === 'wallet' || m === 'nequi' || m === 'daviplata') {
        wallet += (t.totalAmount || 0);
      } else if (m === 'qr' || m === 'qr_bancolombia' || m === 'transfer') {
        qr += (t.totalAmount || 0);
      } else if (m === 'bre_b') {
        breB += (t.totalAmount || 0);
      } else if (m === 'agreement') {
        agreement += (t.totalAmount || 0);
      } else if (m === 'mixed' && t.paymentDetails?.splitPayments) {
        t.paymentDetails.splitPayments.forEach((sp) => {
          if (sp.method === 'card') card += sp.amount;
          else if (sp.method === 'wallet' || sp.method === 'nequi' || sp.method === 'daviplata') wallet += sp.amount;
          else if (sp.method === 'qr' || sp.method === 'qr_bancolombia' || sp.method === 'transfer') qr += sp.amount;
          else if (sp.method === 'bre_b') breB += sp.amount;
          else if (sp.method === 'agreement') agreement += sp.amount;
        });
      }
    });

    const totalElectronic = card + wallet + qr + breB;
    const totalCollected = cash + totalElectronic + agreement;

    return { cash, card, wallet, qr, breB, agreement, totalElectronic, totalCollected, totalVehicles };
  };

  const shiftTotals = useMemo(() => computeBreakdown(shiftPaidTickets), [shiftPaidTickets]);
  const dayTotals = useMemo(() => computeBreakdown(todayPaidTickets), [todayPaidTickets]);

  // Cash drawer movements (Current Shift)
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

  const expectedCashInDrawer =
    currentShift.initialCash + shiftTotals.cash + totalCashOtherIncomes - totalOutflows;

  const countedCashNumber = parseFloat(countedCashInput) || 0;
  const cashDifference = countedCashInput ? countedCashNumber - expectedCashInDrawer : null;

  // Day Operative Cash Movements & Theoretical Balance
  const dayBaseCash = operationalDay.initialDayCash || currentShift.initialCash;
  const dayExpectedCashInDrawer = dayBaseCash + dayTotals.cash + totalCashOtherIncomes - totalOutflows;
  const dayCountedCashNumber = parseFloat(dayCountedCashInput) || 0;
  const dayCashDifference = dayCountedCashInput ? dayCountedCashNumber - dayExpectedCashInDrawer : null;

  // Ticket statistics for printable voucher
  const ticketCounts = useMemo(() => {
    const tickets = printedVoucherType === 'arqueo' ? shiftPaidTickets : todayPaidTickets;
    let cashCount = 0;
    let cardCount = 0;
    let walletCount = 0;
    let qrCount = 0;
    let breBCount = 0;
    let agreementCount = 0;

    tickets.forEach((t) => {
      const m = t.paymentMethod;
      if (m === 'cash') cashCount++;
      else if (m === 'card') cardCount++;
      else if (m === 'wallet' || m === 'nequi' || m === 'daviplata') walletCount++;
      else if (m === 'qr' || m === 'qr_bancolombia' || m === 'transfer') qrCount++;
      else if (m === 'bre_b') breBCount++;
      else if (m === 'agreement') agreementCount++;
      else if (m === 'mixed') cashCount++;
    });

    const firstTicket = tickets.length > 0 ? (tickets[0].ticketNumber || `#${tickets[0].id.slice(0, 6)}`) : 'N/A';
    const lastTicket = tickets.length > 0 ? (tickets[tickets.length - 1].ticketNumber || `#${tickets[tickets.length - 1].id.slice(0, 6)}`) : 'N/A';

    return { cashCount, cardCount, walletCount, qrCount, breBCount, agreementCount, firstTicket, lastTicket, total: tickets.length };
  }, [printedVoucherType, shiftPaidTickets, todayPaidTickets]);

  // Active expense concepts
  const activeExpenseConcepts = useMemo(() => {
    return expenseConcepts.filter(c => c.isActive);
  }, [expenseConcepts]);

  // Process uploaded digital voucher file
  const processSelectedFile = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdf) {
      setAttachmentError('Formato no válido. Solo se admiten comprobantes en PDF o imágenes (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setAttachmentError('El archivo supera el tamaño máximo permitido de 15MB.');
      return;
    }

    setAttachmentError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentUrl(reader.result as string);
      setAttachmentName(file.name);
      setAttachmentType(isPdf ? 'pdf' : 'image');
      setAttachmentSize(file.size);
    };
    reader.onerror = () => {
      setAttachmentError('Error al procesar el archivo digital. Intente de nuevo.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachmentUrl('');
    setAttachmentName('');
    setAttachmentType(undefined);
    setAttachmentSize(undefined);
    setAttachmentError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Dedicated Openers for Expense, Pickup, and Income
  const handleOpenExpenseForm = () => {
    setNewMovementType('expense');
    setShowAddMovementForm(true);
    setNewMovementAmount('');
    setNewMovementDescription('');
    setNewMovementConceptId('');
    setNewMovementVoucherNumber('');
    setAttachmentError(null);
    handleRemoveAttachment();
  };

  const handleOpenPickupForm = () => {
    setNewMovementType('pickup');
    setShowAddMovementForm(true);
    setNewMovementAmount('');
    setNewMovementDescription('Liberación preventiva de efectivo por tope en gaveta');
    setNewMovementConceptId('');
    setNewMovementVoucherNumber('');
    setPickupResponsible('Supervisor / Administración');
    setAttachmentError(null);
    handleRemoveAttachment();
  };

  const handleOpenIncomeForm = () => {
    setNewMovementType('income');
    setShowAddMovementForm(true);
    setNewMovementAmount('');
    setNewMovementDescription('Ingreso extraordinario a caja');
    setNewMovementConceptId('');
    setNewMovementVoucherNumber('');
    setAttachmentError(null);
    handleRemoveAttachment();
  };

  // Submit cash movement
  const handleAddMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newMovementAmount);
    if (!amount || amount <= 0) {
      setAttachmentError('Debe ingresar un monto válido mayor a 0.');
      return;
    }

    // Strict Requirement for Expenses: ALL fields are mandatory
    if (newMovementType === 'expense') {
      if (!newMovementConceptId) {
        setAttachmentError('Debe seleccionar el Concepto de Gasto Autorizado.');
        return;
      }
      if (!newMovementVoucherNumber.trim()) {
        setAttachmentError('Debe ingresar el Número de Comprobante o Factura del gasto.');
        return;
      }
      if (!newMovementDescription.trim()) {
        setAttachmentError('Debe ingresar el detalle u observaciones justificativas del gasto.');
        return;
      }
      if (!attachmentUrl) {
        setAttachmentError('Es obligatorio adjuntar el comprobante o soporte digital (PDF o Imagen) para registrar el gasto.');
        return;
      }
    }

    let finalDesc = newMovementDescription.trim();
    let selectedConcept = activeExpenseConcepts.find(c => c.id === newMovementConceptId);

    if (newMovementType === 'expense' && selectedConcept) {
      if (!finalDesc) {
        finalDesc = selectedConcept.name;
      } else {
        finalDesc = `[${selectedConcept.name}] ${finalDesc}`;
      }
    } else if (newMovementType === 'pickup') {
      const basePickupDesc = finalDesc || 'Recogida parcial de efectivo (Liberación de gaveta por seguridad)';
      const resp = pickupResponsible.trim();
      finalDesc = resp ? `${basePickupDesc} [Entregado a: ${resp}]` : basePickupDesc;
    } else if (!finalDesc) {
      if (newMovementType === 'withdrawal') {
        finalDesc = 'Retiro de seguridad / traslado';
      } else if (newMovementType === 'income') {
        finalDesc = 'Ingreso extraordinario a caja';
      } else {
        finalDesc = 'Movimiento de caja';
      }
    }

    onAddMovement(
      newMovementType, 
      amount, 
      finalDesc, 
      selectedConcept?.id, 
      selectedConcept?.name, 
      newMovementVoucherNumber.trim() || undefined,
      attachmentUrl || undefined,
      attachmentName || undefined,
      attachmentType || undefined,
      attachmentSize || undefined
    );

    setNewMovementAmount('');
    setNewMovementDescription('');
    setNewMovementConceptId('');
    setNewMovementVoucherNumber('');
    handleRemoveAttachment();
    setShowAddMovementForm(false);
  };

  // Perform Shift Arqueo and Change
  const handleExecuteArqueo = () => {
    if (!countedCashInput) return;
    const baseVal = parseFloat(nextBaseCash) || currentShift.initialCash;
    onCloseShiftAndArqueo(countedCashNumber, nextOperatorName.trim() || 'Cajero Turno Siguiente', baseVal);
    setPrintedVoucherType('arqueo');
  };

  // Perform Definitive Day Close
  const handleExecuteDayClose = () => {
    const finalCash = dayCountedCashInput ? (parseFloat(dayCountedCashInput) || 0) : dayExpectedCashInDrawer;
    onCloseDefinitiveDay(finalCash, dayClosingNotes);
    setPrintedVoucherType('cierre');
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Operative Day & Shift Banner */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl py-2.5 px-4 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {currentUser?.permissions?.canViewOperationalDayInHistory !== false ? (
                  <>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      Día Operativo #{operationalDay.dayNumber || 1}
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      En Operación
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    Control de Caja y Turnos
                  </span>
                )}
                <span className="text-slate-600 dark:text-slate-300 text-xs hidden lg:inline">|</span>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Fecha: <strong className="text-amber-700 dark:text-amber-400 font-mono font-bold">
                    {(() => {
                      const dStr = operationalDay.formattedDate || operationalDay.date || '';
                      if (/^\d{4}-\d{2}-\d{2}$/.test(dStr.trim())) {
                        const [yyyy, mm, dd] = dStr.trim().split('-');
                        return `${dd}/${mm}/${yyyy}`;
                      }
                      return dStr;
                    })()}
                  </strong>
                </span>
                <span className="text-slate-600 dark:text-slate-300 text-xs hidden lg:inline">•</span>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Turno Activo: <strong className="text-slate-900 dark:text-white font-mono">Turno #{currentShift.shiftNumber}</strong>
                </span>
                <span className="text-slate-600 dark:text-slate-300 text-xs hidden lg:inline">•</span>
                <span className="text-xs text-slate-700 dark:text-slate-200">
                  Operador: <strong className="text-slate-700 dark:text-slate-200">{currentShift.operatorName}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Sub-navigation */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs shrink-0">
            <button
              onClick={() => setActiveSubTab('arqueo')}
              className={`px-3 py-1.5 rounded-md font-black transition-all cursor-pointer ${
                activeSubTab === 'arqueo' ? 'bg-amber-500 text-slate-950 dark:bg-amber-400 dark:text-slate-950 shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Arqueo de Turno
            </button>
            {currentUser?.permissions?.canCloseOperationalDay !== false && (
              <button
                onClick={() => setActiveSubTab('cierre_dia')}
                className={`px-3 py-1.5 rounded-md font-black transition-all cursor-pointer ${
                  activeSubTab === 'cierre_dia' ? 'bg-amber-500 text-slate-950 dark:bg-amber-400 dark:text-slate-950 shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Cierre Definitivo Día
              </button>
            )}
            <button
              onClick={() => setActiveSubTab('movements')}
              className={`px-3 py-1.5 rounded-md font-black transition-all cursor-pointer ${
                activeSubTab === 'movements' ? 'bg-amber-500 text-slate-950 dark:bg-amber-400 dark:text-slate-950 shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Gastos/Movimientos ({currentShift.cashMovements.length})
            </button>
            <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block"></div>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`px-3 py-1.5 rounded-md font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico de Cierres ({safeClosedShifts.length + safeClosedDays.length})</span>
            </button>
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="px-2 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md transition-colors cursor-pointer"
              title="Abrir en Ventana Emergente Completa"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: ARQUEO DE TURNO (CAMBIO DE TURNO)                 */}
      {/* ========================================================= */}
      {activeSubTab === 'arqueo' && (
        <div className="space-y-6">
          {/* Summary Breakdown Grid of Current Shift (Hidden for cashiers if canViewFinancials is false) */}
          {canViewFinancials ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="bg-white dark:bg-slate-900 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block tracking-wider">Base Apertura</span>
                <span className="text-sm font-black text-slate-950 dark:text-slate-100 font-mono">
                  {formatCurrency(currentShift.initialCash, currencySymbol)}
                </span>
              </div>

              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 py-2 px-3 rounded-xl border border-emerald-300 dark:border-emerald-600/40 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase block tracking-wider flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Efectivo Turno</span>
                </span>
                <span className="text-sm font-black text-emerald-800 dark:text-emerald-300 font-mono">
                  {formatCurrency(shiftTotals.cash, currencySymbol)}
                </span>
              </div>

              <div className="bg-purple-50/70 dark:bg-purple-950/40 py-2 px-3 rounded-xl border border-purple-300 dark:border-purple-600/40 shadow-2xs">
                <span className="text-[10px] font-bold text-purple-900 dark:text-purple-300 uppercase block tracking-wider flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Billeteras</span>
                </span>
                <span className="text-sm font-black text-purple-800 dark:text-purple-300 font-mono">
                  {formatCurrency(shiftTotals.wallet, currencySymbol)}
                </span>
              </div>

              <div className="bg-amber-50/70 dark:bg-amber-950/40 py-2 px-3 rounded-xl border border-amber-300 dark:border-amber-600/40 shadow-2xs">
                <span className="text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase block tracking-wider flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>QR Bancario</span>
                </span>
                <span className="text-sm font-black text-amber-800 dark:text-amber-300 font-mono">
                  {formatCurrency(shiftTotals.qr, currencySymbol)}
                </span>
              </div>

              <div className="bg-teal-50/70 dark:bg-teal-950/40 py-2 px-3 rounded-xl border border-teal-300 dark:border-teal-600/40 shadow-2xs">
                <span className="text-[10px] font-bold text-teal-900 dark:text-teal-300 uppercase block tracking-wider flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Llaves Bre-B</span>
                </span>
                <span className="text-sm font-black text-teal-800 dark:text-teal-300 font-mono">
                  {formatCurrency(shiftTotals.breB, currencySymbol)}
                </span>
              </div>

              <div className="bg-sky-50/70 dark:bg-sky-950/40 py-2 px-3 rounded-xl border border-sky-300 dark:border-sky-600/40 shadow-2xs">
                <span className="text-[10px] font-bold text-sky-900 dark:text-sky-300 uppercase block tracking-wider flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Datáfonos</span>
                </span>
                <span className="text-sm font-black text-sky-800 dark:text-sky-300 font-mono">
                  {formatCurrency(shiftTotals.card, currencySymbol)}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-700 dark:text-slate-300 shadow-xs">
              <div className="flex items-center gap-2.5">
                {isBlindCount ? (
                  <EyeOff className="w-5 h-5 text-amber-500 shrink-0" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
                <span className="text-xs">
                  {isBlindCount ? (
                    <><strong>Arqueo de Turno Protegido (Modo Ciego):</strong> Por política antifraude y control dual, declare su dinero físico contado. Los saldos teóricos esperados permanecen ocultos.</>
                  ) : (
                    <><strong>Auditoría con Supervisor Desbloqueada:</strong> Puede verificar el saldo teórico esperado y justificar discrepancias de caja antes del sellado definitivo.</>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isBlindCount ? (
                  <>
                    <span className="text-[11px] font-mono font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full">
                      🔒 Modo Ciego Activo
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSupervisorPinModal(true)}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Desbloquear con clave de supervisor"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Revelar con Supervisor</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSupervisorUnlocked(false)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <EyeOff className="w-3 h-3" />
                    <span>Volver a Ocultar</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Conteo Físico & Arqueo */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Conteo Físico para Arqueo de Turno #{currentShift.shiftNumber}</span>
                </h3>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  {shiftTotals.totalVehicles} vehículos liquidados
                </span>
              </div>

              {/* Expected balance vs counted */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                {!isBlindCount && (
                  <div className="flex justify-between items-center text-xs p-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Saldo Teórico Esperado en Gaveta (Efectivo):</span>
                    <span className="text-sm font-black font-mono text-slate-950 dark:text-white">
                      {formatCurrency(expectedCashInDrawer, currencySymbol)}
                    </span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Dinero Físico en Gaveta Contado ($):
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDenominationCalculator(!showDenominationCalculator)}
                      className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>{showDenominationCalculator ? 'Ocultar Desglose' : 'Desglosar Billetes y Monedas'}</span>
                      {totalDenominationsAmount > 0 && (
                        <span className="font-mono bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded text-[10px] text-emerald-800 dark:text-emerald-300">
                          {formatCurrency(totalDenominationsAmount, currencySymbol)}
                        </span>
                      )}
                    </button>
                  </div>

                  <input
                    type="number"
                    step="any"
                    placeholder="Digite el total contado..."
                    value={countedCashInput}
                    onChange={(e) => setCountedCashInput(e.target.value)}
                    className="w-full text-2xl font-black font-mono bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 outline-none text-slate-950 dark:text-white text-center shadow-xs"
                  />
                </div>

                {/* Desglose Táctil de Billetes y Monedas */}
                {showDenominationCalculator && (
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in duration-200 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                        <Banknote className="w-4 h-4 text-emerald-500" />
                        <span>Calculadora de Billetes y Monedas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleResetDenominations}
                          className="text-[11px] text-rose-600 dark:text-rose-400 hover:text-rose-700 font-bold hover:underline cursor-pointer"
                        >
                          Limpiar
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyDenominationsToCount}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
                        >
                          Copiar al Conteo
                        </button>
                      </div>
                    </div>

                    {/* Billetes */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">
                        Billetes (COP) - Subtotal: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{formatCurrency(totalBillsAmount, currencySymbol)}</strong>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[100000, 50000, 20000, 10000, 5000, 2000].map((denom) => (
                          <div key={denom} className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-bold font-mono text-slate-900 dark:text-slate-100">${denom.toLocaleString('es-CO')}</span>
                              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">x {billCounts[denom] || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                value={billCounts[denom] || ''}
                                onChange={(e) => setBillCounts({ ...billCounts, [denom]: Math.max(0, parseInt(e.target.value) || 0) })}
                                className="w-full text-xs font-mono font-bold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-1 text-center text-slate-900 dark:text-slate-100"
                                placeholder="0"
                              />
                              <button
                                type="button"
                                onClick={() => setBillCounts({ ...billCounts, [denom]: (billCounts[denom] || 0) + 1 })}
                                className="px-1.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded text-[10px] font-bold cursor-pointer"
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                onClick={() => setBillCounts({ ...billCounts, [denom]: (billCounts[denom] || 0) + 5 })}
                                className="px-1.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded text-[10px] font-bold cursor-pointer"
                              >
                                +5
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Monedas */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">
                        Monedas (COP) - Subtotal: <strong className="text-amber-700 dark:text-amber-400 font-mono">{formatCurrency(totalCoinsAmount, currencySymbol)}</strong>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[1000, 500, 200, 100, 50].map((denom) => (
                          <div key={denom} className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-bold font-mono text-slate-900 dark:text-slate-100">${denom.toLocaleString('es-CO')}</span>
                              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">x {coinCounts[denom] || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                value={coinCounts[denom] || ''}
                                onChange={(e) => setCoinCounts({ ...coinCounts, [denom]: Math.max(0, parseInt(e.target.value) || 0) })}
                                className="w-full text-xs font-mono font-bold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-1 text-center text-slate-900 dark:text-slate-100"
                                placeholder="0"
                              />
                              <button
                                type="button"
                                onClick={() => setCoinCounts({ ...coinCounts, [denom]: (coinCounts[denom] || 0) + 1 })}
                                className="px-1.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded text-[10px] font-bold cursor-pointer"
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                onClick={() => setCoinCounts({ ...coinCounts, [denom]: (coinCounts[denom] || 0) + 5 })}
                                className="px-1.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded text-[10px] font-bold cursor-pointer"
                              >
                                +5
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold text-xs">
                      <span className="text-slate-800 dark:text-slate-200">Gran Total Físico Calculado:</span>
                      <span className="text-sm font-mono text-emerald-700 dark:text-emerald-400 font-black">
                        {formatCurrency(totalDenominationsAmount, currencySymbol)}
                      </span>
                    </div>
                  </div>
                )}

                {!isBlindCount && countedCashInput && cashDifference !== null && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono font-bold ${
                    cashDifference === 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-600/50 text-emerald-900 dark:text-emerald-200'
                      : cashDifference > 0
                      ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-600/50 text-sky-900 dark:text-sky-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-600/50 text-rose-900 dark:text-rose-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {cashDifference === 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span>
                        {cashDifference === 0 
                          ? '¡Caja Cuadrada Exacta!' 
                          : cashDifference > 0 
                          ? 'Sobrante de Caja:' 
                          : 'Faltante de Caja:'}
                      </span>
                    </div>
                    <span className="text-base font-black">
                      {formatCurrency(Math.abs(cashDifference), currencySymbol)}
                    </span>
                  </div>
                )}
              </div>

              {/* Next operator parameters */}
              <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-700/50 space-y-3">
                <span className="text-xs font-bold text-amber-950 dark:text-amber-300 uppercase block">
                  Datos para Apertura del Siguiente Turno (Turno #{currentShift.shiftNumber + 1})
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                      Nombre del Próximo Cajero
                    </label>
                    <input
                      type="text"
                      value={nextOperatorName}
                      onChange={(e) => setNextOperatorName(e.target.value)}
                      placeholder="Nombre del cajero..."
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold outline-none text-slate-900 dark:text-slate-100 focus:border-amber-500 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                      Base de Caja para el Próximo Turno ($)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={nextBaseCash}
                      onChange={(e) => setNextBaseCash(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono font-bold outline-none text-slate-900 dark:text-slate-100 focus:border-amber-500 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                {canViewFinancials ? (
                  <button
                    type="button"
                    onClick={() => setPrintedVoucherType('arqueo')}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Ver Comprobante de Arqueo</span>
                  </button>
                ) : <div />}

                <button
                  type="button"
                  onClick={handleExecuteArqueo}
                  disabled={!countedCashInput}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    countedCashInput 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <Lock className="w-4 h-4 text-emerald-100" />
                  <span>Cerrar Turno e Imprimir Arqueo</span>
                </button>
              </div>
            </div>

            {/* Right: Operational Details & Breakdown Table */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-800">
                Detalle Financiero del Turno
              </h3>

              {canViewFinancials ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Base de Apertura:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(currentShift.initialCash, currencySymbol)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-emerald-800 dark:text-emerald-400 font-semibold">
                    <span>+ Recaudo Efectivo en Parqueadero:</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(shiftTotals.cash, currencySymbol)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-purple-800 dark:text-purple-400 font-semibold">
                    <span>+ Recaudo Billeteras (Nequi/Daviplata):</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(shiftTotals.wallet, currencySymbol)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-amber-800 dark:text-amber-400 font-semibold">
                    <span>+ Recaudo Códigos QR:</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(shiftTotals.qr, currencySymbol)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-teal-800 dark:text-teal-400 font-semibold">
                    <span>+ Recaudo Llaves Bre-B:</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(shiftTotals.breB, currencySymbol)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-sky-800 dark:text-sky-400 font-semibold">
                    <span>+ Recaudo Tarjetas / Datáfonos:</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(shiftTotals.card, currencySymbol)}
                    </span>
                  </div>

                  {totalExpenses > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-rose-700 dark:text-rose-400 font-semibold">
                      <span>- Gastos de Caja Menor:</span>
                      <span className="font-mono font-bold">
                        -{formatCurrency(totalExpenses, currencySymbol)}
                      </span>
                    </div>
                  )}

                  {totalPickups > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-indigo-700 dark:text-indigo-400 font-semibold">
                      <span>- Recogidas / Liberación de Gaveta:</span>
                      <span className="font-mono font-bold">
                        -{formatCurrency(totalPickups, currencySymbol)}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t-2 border-slate-200 dark:border-slate-700 flex justify-between text-sm font-black text-slate-950 dark:text-white">
                    <span>TOTAL OPERADO EN TURNO:</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(shiftTotals.totalCollected, currencySymbol)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center space-y-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <ShieldCheck className="w-10 h-10 text-slate-700 dark:text-slate-200 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Desglose en Vivo Restringido para Cajero
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    El usuario de caja solo podrá conocer y verificar los totales al realizar el arqueo final de turno.
                  </p>
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-600 dark:text-slate-300">
                * Al realizar el arqueo, se expedirá automáticamente el comprobante impreso para entrega física al supervisor y se iniciará el turno siguiente.
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ARQUEOS DE TURNO ANTERIORES CERRADOS (HISTÓRICO INTEGRADO)                */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Arqueos de Turno Anteriores Cerrados</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {safeClosedShifts.length} {safeClosedShifts.length === 1 ? 'Turno' : 'Turnos'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Historial de turnos operados con sus respectivos comprobantes y cuadres de caja
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubTab('history')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer self-start sm:self-auto"
              >
                <History className="w-3.5 h-3.5" />
                <span>Ver Todos en Panel Histórico →</span>
              </button>
            </div>

            {safeClosedShifts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                Aún no hay arqueos de turnos anteriores cerrados registrados.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {safeClosedShifts.map((shift) => {
                  const cash = shift.cashCollectedSnapshot ?? 0;
                  const digital = (shift.cardCollectedSnapshot ?? 0) + (shift.walletCollectedSnapshot ?? 0) + (shift.qrCollectedSnapshot ?? 0) + (shift.breBCollectedSnapshot ?? 0);
                  const total = shift.totalCollectedSnapshot ?? (cash + digital);
                  const diff = shift.cashDifference ?? 0;

                  return (
                    <div
                      key={shift.id}
                      className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black bg-indigo-600 text-white px-2 py-0.5 rounded">
                            Turno #{shift.shiftNumber}
                          </span>
                          {shift.consecutiveCode && (
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white shadow-xs transition-all cursor-pointer"
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
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(total, currencySymbol)}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                          <span className="text-[9px] uppercase font-sans text-slate-500 block">Efectivo en Caja</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(shift.finalCountedCash || cash, currencySymbol)}</span>
                        </div>
                        <div className={`p-2 rounded border ${diff === 0 ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800'}`}>
                          <span className="text-[9px] uppercase font-sans text-slate-500 block">Cuadre Físico</span>
                          <span className="font-bold">{diff === 0 ? 'Cuadrado $0' : formatCurrency(diff, currencySymbol)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: CIERRE DEFINITIVO DE CAJA DEL DÍA OPERATIVO       */}
      {/* ========================================================= */}
      {activeSubTab === 'cierre_dia' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span>Cierre Definitivo de Caja - Día Operativo #{operationalDay.dayNumber || 1} ({operationalDay.formattedDate || operationalDay.date})</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Consolidación de todos los turnos trabajados durante este día operativo. Al cerrar, avanzará al siguiente día.
                </p>
              </div>

              {canViewFinancials && (
                <button
                  type="button"
                  onClick={() => setPrintedVoucherType('cierre')}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Cierre Definitivo</span>
                </button>
              )}
            </div>

            {/* Day Consolidated Stats - Protected by canViewFinancials */}
            {canViewFinancials ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">Vehículos Totales Día</span>
                    <span className="text-xl font-black font-mono text-slate-950 dark:text-white">{dayTotals.totalVehicles}</span>
                  </div>

                  <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-600/40 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-emerald-900 dark:text-emerald-300 block">Efectivo Consolidado</span>
                    <span className="text-xl font-black font-mono text-emerald-800 dark:text-emerald-400">
                      {formatCurrency(dayTotals.cash, currencySymbol)}
                    </span>
                  </div>

                  <div className="p-4 bg-purple-50/80 dark:bg-purple-950/30 border border-purple-300 dark:border-purple-600/40 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-purple-900 dark:text-purple-300 block">Medios Digitales Día</span>
                    <span className="text-xl font-black font-mono text-purple-800 dark:text-purple-400">
                      {formatCurrency(dayTotals.totalElectronic, currencySymbol)}
                    </span>
                  </div>

                  <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-600/40 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-amber-900 dark:text-amber-300 block">Gran Total Recaudado</span>
                    <span className="text-xl font-black font-mono text-amber-800 dark:text-amber-400">
                      {formatCurrency(dayTotals.totalCollected, currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* Detailed channels breakdown */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2 text-xs">
                  <span className="font-bold text-slate-900 dark:text-slate-100 uppercase text-[11px] block mb-2">
                    Desglose por Todos los Medios de Pago (Día Completo)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-700 dark:text-slate-300">Efectivo Físico:</span>
                      <span className="font-mono font-bold text-emerald-800 dark:text-emerald-400">{formatCurrency(dayTotals.cash, currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-700 dark:text-slate-300">Billeteras Digitales (Nequi / Daviplata):</span>
                      <span className="font-mono font-bold text-purple-800 dark:text-purple-400">{formatCurrency(dayTotals.wallet, currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-700 dark:text-slate-300">Códigos QR Bancarios:</span>
                      <span className="font-mono font-bold text-amber-800 dark:text-amber-400">{formatCurrency(dayTotals.qr, currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-700 dark:text-slate-300">Llaves Bre-B (Interoperable):</span>
                      <span className="font-mono font-bold text-teal-800 dark:text-teal-400">{formatCurrency(dayTotals.breB, currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-700 dark:text-slate-300">Tarjetas / Datáfonos:</span>
                      <span className="font-mono font-bold text-sky-800 dark:text-sky-400">{formatCurrency(dayTotals.card, currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-700 dark:text-slate-300">Convenios / Cortesías:</span>
                      <span className="font-mono font-bold text-indigo-800 dark:text-indigo-400">{formatCurrency(dayTotals.agreement, currencySymbol)}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">Vehículos Atendidos Día</span>
                    <span className="text-xl font-black font-mono text-slate-950 dark:text-white">{dayTotals.totalVehicles}</span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">Turnos Trabajados</span>
                    <span className="text-xl font-black font-mono text-slate-950 dark:text-white">{operationalDay.shiftsCount || 1}</span>
                  </div>
                  <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-600/40 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-amber-900 dark:text-amber-300 block">Estado Día Operativo</span>
                    <span className="text-sm font-black font-mono text-amber-800 dark:text-amber-400 mt-1 block">EN OPERACIÓN</span>
                  </div>
                </div>

                <div className="p-6 text-center space-y-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <ShieldCheck className="w-10 h-10 text-slate-700 dark:text-slate-200 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Desglose Financiero y Recaudo del Día Restringido para Cajero
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                    Por política de seguridad y control de caja, los montos consolidados recaudados y el desglose de canales de pago del día completo están protegidos y solo son visibles para usuarios con perfil de Administrador o Supervisor.
                  </p>
                </div>
              </div>
            )}

            {/* Counted Cash for Day Closing & Arqueo */}
            <div className="p-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Dinero en Caja Contado al Momento del Cierre Definitivo
                  </h4>
                </div>
                {!isBlindCount && (
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    Saldo Teórico Esperado: <strong className="text-amber-800 dark:text-amber-400">{formatCurrency(dayExpectedCashInDrawer, currencySymbol)}</strong>
                  </span>
                )}
              </div>

              {!isBlindCount && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 block text-[10px]">Base Apertura:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(dayBaseCash, currencySymbol)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 block text-[10px]">+ Recaudo Efectivo:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(dayTotals.cash, currencySymbol)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 block text-[10px]">+ Ingresos Extras:</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">{formatCurrency(totalOtherIncomes, currencySymbol)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 block text-[10px]">- Gastos Caja:</span>
                    <span className="font-bold text-rose-700 dark:text-rose-400">-{formatCurrency(totalExpenses, currencySymbol)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 block text-[10px]">- Recogidas Efectivo:</span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-400">-{formatCurrency(totalPickups, currencySymbol)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Ingrese el Dinero Físico en Gaveta Contado ($):
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ingrese el monto físico contado en caja al cerrar el día..."
                  value={dayCountedCashInput}
                  onChange={(e) => setDayCountedCashInput(e.target.value)}
                  className="w-full text-2xl font-black font-mono bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2.5 outline-none text-slate-950 dark:text-white text-center shadow-xs"
                />
              </div>

              {!isBlindCount && dayCountedCashInput && dayCashDifference !== null && (
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono font-bold ${
                  dayCashDifference === 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-600/50 text-emerald-900 dark:text-emerald-200'
                    : dayCashDifference > 0
                    ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-600/50 text-sky-900 dark:text-sky-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-600/50 text-rose-900 dark:text-rose-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {dayCashDifference === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>
                      {dayCashDifference === 0 
                        ? '¡Caja Cuadrada Exacta en Cierre del Día!' 
                        : dayCashDifference > 0 
                        ? 'Sobrante de Caja en Cierre Definitivo:' 
                        : 'Faltante de Caja en Cierre Definitivo:'}
                    </span>
                  </div>
                  <span className="text-base font-black">
                    {formatCurrency(Math.abs(dayCashDifference), currencySymbol)}
                  </span>
                </div>
              )}
            </div>

            {/* Detailed Money Movements Log for Operative Day */}
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Movimientos de Dinero Realizados en el Día Operativo ({currentShift.cashMovements.length})</span>
                </h4>
                <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400">
                  Ingresos, Gastos y Recogidas de Efectivo
                </span>
              </div>

              {currentShift.cashMovements.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-600 dark:text-slate-400 italic">
                  No se han registrado movimientos extraordinarios o salidas de dinero durante el día.
                </div>
              ) : (
                <div className="divide-y divide-slate-200/80 dark:divide-slate-800 max-h-64 overflow-y-auto pr-1">
                  {currentShift.cashMovements.map((m) => (
                    <div key={m.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {m.type === 'income' ? (
                          <span className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shrink-0">
                            <ArrowDownCircle className="w-4 h-4" />
                          </span>
                        ) : m.type === 'expense' ? (
                          <span className="p-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 shrink-0">
                            <ArrowUpCircle className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="p-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 shrink-0">
                            <Wallet className="w-4 h-4" />
                          </span>
                        )}

                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{m.description}</span>
                            {m.type === 'pickup' && (
                              <span className="px-2 py-0.2 rounded text-[10px] font-black bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
                                RECOGIDA DE DINERO
                              </span>
                            )}
                            {m.conceptName && (
                              <span className="px-2 py-0.2 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                                {m.conceptName}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2 font-mono">
                            <span>Operador: <strong>{m.operator}</strong></span>
                            <span>•</span>
                            <span>{new Date(m.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                            {m.paymentMethod && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {m.paymentMethod === 'cash' ? 'Efectivo' : m.paymentMethod === 'card' ? 'Tarjeta' : m.paymentMethod === 'transfer' ? 'Transferencia' : String(m.paymentMethod).toUpperCase()}
                              </span>
                            )}
                            {m.voucherNumber && <span>• Doc: {m.voucherNumber}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {m.attachmentUrl && (
                          <button
                            type="button"
                            onClick={() => handleOpenAttachmentViewer({
                              url: m.attachmentUrl!,
                              name: m.attachmentName,
                              type: m.attachmentType,
                              amount: m.amount,
                              description: m.description,
                              operator: m.operator,
                              date: m.timestamp,
                              voucherNumber: m.voucherNumber,
                              conceptName: m.conceptName
                            })}
                            className="px-2 py-1 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                          >
                            <Eye className="w-3 h-3 text-amber-800 dark:text-amber-300" />
                            <span>Soporte</span>
                          </button>
                        )}

                        <span className={`font-mono font-black text-sm ${
                          m.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : m.type === 'expense' ? 'text-rose-700 dark:text-rose-400' : 'text-indigo-700 dark:text-indigo-400'
                        }`}>
                          {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount, currencySymbol)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes & Confirmation */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Observaciones o Novedades de Cierre del Día Operativo:
              </label>
              <textarea
                rows={2}
                value={dayClosingNotes}
                onChange={(e) => setDayClosingNotes(e.target.value)}
                placeholder="Ej: Operación sin novedades, todos los fondos entregados al tesorero..."
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-amber-500 shadow-xs"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                * Al confirmar, se cerrará el Día Operativo #{operationalDay.dayNumber || 1} e iniciará el siguiente día operativo.
              </div>

              <button
                type="button"
                onClick={handleExecuteDayClose}
                className="px-6 py-3 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-colors"
              >
                <Lock className="w-4 h-4" />
                <span>Ejecutar Cierre Definitivo de Caja</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CIERRES DEFINITIVOS DE DÍA ANTERIORES (HISTÓRICO INTEGRADO)               */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Cierres Definitivos de Jornada Registrados</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {safeClosedDays.length} {safeClosedDays.length === 1 ? 'Día Operativo' : 'Días Operativos'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cierres Z fiscales y actas de consolidación contable de jornadas completas
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubTab('history')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer self-start sm:self-auto"
              >
                <History className="w-3.5 h-3.5" />
                <span>Ver Todos en Panel Histórico →</span>
              </button>
            </div>

            {safeClosedDays.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                Aún no hay cierres definitivos de días anteriores registrados.
              </div>
            ) : (
              <div className="space-y-4">
                {safeClosedDays.map((day) => {
                  const cash = day.cashCollectedSnapshot ?? 0;
                  const digital = (day.cardCollectedSnapshot ?? 0) + (day.walletCollectedSnapshot ?? 0) + (day.qrCollectedSnapshot ?? 0) + (day.breBCollectedSnapshot ?? 0);
                  const total = day.totalCollected ?? (cash + digital);
                  const exp = day.totalExpensesSnapshot ?? 0;
                  const toConsign = day.totalToConsignSnapshot ?? (day.finalDayCash || 0);

                  return (
                    <div
                      key={day.id}
                      className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black bg-emerald-700 text-white px-2.5 py-0.5 rounded">
                              Cierre Día #{day.dayNumber || 1}
                            </span>
                            {day.consecutiveCode && (
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                Reporte Fiscal: {day.consecutiveCode}
                              </span>
                            )}
                            {day.isAudited && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                                Auditado Fiscal OK
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                            <span>Fecha: <strong>{day.formattedDate || day.date}</strong></span>
                            <span>•</span>
                            <span>Cerrado por: <strong>{day.closedByOperator || 'Administrador'}</strong></span>
                            <span>•</span>
                            <span>Turnos: <strong>{day.shiftsCount || 1} turnos</strong></span>
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white shadow-xs transition-all cursor-pointer self-start sm:self-auto"
                          title="Ver e imprimir comprobante fiscal Z con márgenes y descargar PDF"
                        >
                          <Printer className="w-4 h-4 text-emerald-400" />
                          <span>Ver Tiquete Fiscal Z</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono">
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                          <span className="text-[9px] uppercase font-sans text-slate-500 block">Total Facturado</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(total, currencySymbol)}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                          <span className="text-[9px] uppercase font-sans text-slate-500 block">Efectivo Total</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(cash, currencySymbol)}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                          <span className="text-[9px] uppercase font-sans text-slate-500 block">Medios Digitales</span>
                          <span className="font-bold text-indigo-700 dark:text-indigo-400">{formatCurrency(digital, currencySymbol)}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                          <span className="text-[9px] uppercase font-sans text-slate-500 block">Gastos del Día</span>
                          <span className="font-bold text-rose-700 dark:text-rose-400">-{formatCurrency(exp, currencySymbol)}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 text-emerald-950 dark:text-emerald-200">
                          <span className="text-[9px] uppercase font-sans text-emerald-800 dark:text-emerald-400 block font-bold">Total a Bóveda</span>
                          <span className="font-black">{formatCurrency(toConsign, currencySymbol)}</span>
                        </div>
                      </div>

                      {day.closingNotes && (
                        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200 italic">
                          "{day.closingNotes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: GASTOS MENORES Y MOVIMIENTOS                     */}
      {/* ========================================================= */}
      {activeSubTab === 'movements' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                Gastos y Movimientos de Caja (Turno #{currentShift.shiftNumber})
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Control independiente de gastos de caja menor y recogidas de efectivo por seguridad
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {canWithdraw && (
                <button
                  type="button"
                  onClick={handleOpenExpenseForm}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
                    showAddMovementForm && newMovementType === 'expense'
                      ? 'bg-amber-600 text-white ring-2 ring-amber-400 ring-offset-1'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700'
                  }`}
                  title="Registrar gasto de caja menor con soporte digital"
                >
                  <PlusCircle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span>Registrar Gasto de Caja</span>
                </button>
              )}

              {canPickupCash && showCashPickupOption && (
                <button
                  type="button"
                  onClick={handleOpenPickupForm}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
                    showAddMovementForm && newMovementType === 'pickup'
                      ? 'bg-indigo-700 text-white ring-2 ring-indigo-400 ring-offset-1'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500'
                  }`}
                  title="Registrar recogida parcial de dinero de la gaveta para custodia"
                >
                  <ArrowUpRight className="w-4 h-4 text-indigo-200" />
                  <span>Recogida de Dinero</span>
                </button>
              )}

              {canDeposit && (
                <button
                  type="button"
                  onClick={handleOpenIncomeForm}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    showAddMovementForm && newMovementType === 'income'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                  }`}
                  title="Registrar ingreso extraordinario a caja"
                >
                  <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Ingreso Extra</span>
                </button>
              )}

              {currentShift.cashMovements.length > 0 && (
                <button
                  type="button"
                  onClick={() => exportCashMovementsToCsv(currentShift.cashMovements, businessInfo, `Turno #${currentShift.shiftNumber}`)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-700 shadow-xs transition-colors"
                  title="Exportar movimientos de este turno a archivo CSV/Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Exportar Excel</span>
                </button>
              )}
            </div>
          </div>

          {/* Metric summary badges of current shift movements */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-rose-200 dark:border-rose-900/40 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">Gastos de Caja Menor</span>
                  <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                    {currentShift.cashMovements.filter(m => m.type === 'expense').length} comprobantes
                  </span>
                </div>
              </div>
              <span className="text-sm font-black font-mono text-rose-700 dark:text-rose-400">
                {formatCurrency(totalExpenses, currencySymbol)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/40 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">Recogidas de Efectivo</span>
                  <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                    {currentShift.cashMovements.filter(m => m.type === 'pickup' || m.type === 'withdrawal').length} retiros a custodia
                  </span>
                </div>
              </div>
              <span className="text-sm font-black font-mono text-indigo-700 dark:text-indigo-400">
                {formatCurrency(totalPickups, currencySymbol)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                  <ArrowUpCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">Total Egresos Gaveta</span>
                  <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">Descontados de gaveta</span>
                </div>
              </div>
              <span className="text-sm font-black font-mono text-slate-950 dark:text-white">
                {formatCurrency(totalOutflows, currencySymbol)}
              </span>
            </div>
          </div>

          {/* DEDICATED FORMS FOR EXPENSE VS PICKUP VS INCOME */}
          {showAddMovementForm && (
            <form 
              onSubmit={handleAddMovementSubmit} 
              className={`bg-white dark:bg-slate-900 rounded-2xl border-2 p-5 shadow-md space-y-4 animate-in fade-in ${
                newMovementType === 'pickup' 
                  ? 'border-indigo-500' 
                  : newMovementType === 'income'
                  ? 'border-emerald-500'
                  : 'border-amber-400'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {newMovementType === 'pickup' ? (
                    <>
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs uppercase text-indigo-950 dark:text-indigo-200">
                          Registrar Recogida Parcial de Efectivo (Liberación de Gaveta)
                        </h3>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Retiro físico de seguridad hacia bóveda / administración para no acumular exceso de efectivo en caja.
                        </p>
                      </div>
                    </>
                  ) : newMovementType === 'income' ? (
                    <>
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                        <ArrowDownCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs uppercase text-emerald-950 dark:text-emerald-200">
                          Registrar Ingreso Extraordinario a Caja
                        </h3>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Adición extraordinaria de efectivo en gaveta (no proveniente de parqueadero).
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs uppercase text-slate-900 dark:text-slate-100">
                          Registrar Salida / Gasto en Caja Menor
                        </h3>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Salida autorizada bajo conceptos presupuestados para compras o insumos operativos.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddMovementForm(false);
                    handleRemoveAttachment();
                  }}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              {/* Informative explanation banner for Cash Pickup vs Expense */}
              {newMovementType === 'pickup' && (
                <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-start gap-2.5 text-xs text-indigo-950 dark:text-indigo-200">
                  <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Cómo funciona la Recogida de Dinero en el Arqueo:</strong>
                    <span className="text-[11px] text-indigo-900 dark:text-indigo-300">
                      Este monto <strong>se descuenta del dinero físico esperado en la gaveta</strong> (evitando faltantes en el cuadre de turno) y <strong>se suma al total a consignar</strong> en el cierre definitivo del día operativo.
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Specific Fields for Gasto de Caja */}
                {newMovementType === 'expense' && (
                  <>
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                          Concepto de Gasto Autorizado <span className="text-amber-600">*</span>
                        </label>
                      </div>
                      <select
                        value={newMovementConceptId}
                        onChange={(e) => setNewMovementConceptId(e.target.value)}
                        required
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 shadow-xs"
                      >
                        <option value="">-- Seleccionar concepto de gasto --</option>
                        {activeExpenseConcepts.map((c) => {
                          const cat = expenseCategories.find(cat => cat.id === c.categoryId || cat.name === c.category);
                          const categoryLabel = cat ? cat.name : (c.category || 'General');
                          return (
                            <option key={c.id} value={c.id}>
                              {c.name} — [{categoryLabel}]
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Monto del Gasto ($ COP) <span className="text-amber-600">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Ej. 25000"
                        value={newMovementAmount}
                        onChange={(e) => setNewMovementAmount(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 shadow-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Nº Factura / Comprobante <span className="text-amber-600">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. FAC-0842 / REC-1205"
                        value={newMovementVoucherNumber}
                        onChange={(e) => setNewMovementVoucherNumber(e.target.value)}
                        required
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 font-mono text-slate-900 dark:text-slate-100 shadow-xs"
                      />
                    </div>

                    <div className="sm:col-span-2 md:col-span-4">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Detalle / Justificación del Gasto <span className="text-amber-600">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Compra de 2 rollos de papel térmico 80mm en Papelería Central"
                        value={newMovementDescription}
                        onChange={(e) => setNewMovementDescription(e.target.value)}
                        required
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 text-slate-900 dark:text-slate-100 shadow-xs"
                      />
                    </div>
                  </>
                )}

                {/* Specific Fields for Recogida de Dinero */}
                {newMovementType === 'pickup' && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Monto a Recoger de la Gaveta ($ COP) <span className="text-indigo-600 dark:text-indigo-400 font-bold">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Ej. 300000"
                        value={newMovementAmount}
                        onChange={(e) => setNewMovementAmount(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border-2 border-indigo-300 dark:border-indigo-600 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm font-mono font-black outline-none text-indigo-950 dark:text-indigo-200 shadow-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Entregado a / Supervisor o Custodio <span className="text-indigo-600 dark:text-indigo-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Supervisor Carlos M. / Administración"
                        value={pickupResponsible}
                        onChange={(e) => setPickupResponsible(e.target.value)}
                        required
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Nº Acta / Recibo de Recogida <span className="text-slate-600 dark:text-slate-400 font-normal">(Opcional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. ACTA-REC-01"
                        value={newMovementVoucherNumber}
                        onChange={(e) => setNewMovementVoucherNumber(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 font-mono text-slate-900 dark:text-slate-100 shadow-xs"
                      />
                    </div>

                    <div className="sm:col-span-2 md:col-span-4">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Motivo / Observaciones de la Recogida <span className="text-slate-600 dark:text-slate-400 font-normal">(Opcional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Liberación preventiva por superar tope de efectivo en gaveta"
                        value={newMovementDescription}
                        onChange={(e) => setNewMovementDescription(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 shadow-xs"
                      />
                    </div>
                  </>
                )}

                {/* Specific Fields for Ingreso Extra */}
                {newMovementType === 'income' && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Monto del Ingreso Extra ($ COP) <span className="text-emerald-600 dark:text-emerald-400 font-bold">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Ej. 50000"
                        value={newMovementAmount}
                        onChange={(e) => setNewMovementAmount(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border-2 border-emerald-300 dark:border-emerald-600 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm font-mono font-black outline-none text-emerald-950 dark:text-emerald-200 shadow-xs"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Nº Comprobante / Recibo <span className="text-slate-600 dark:text-slate-400 font-normal">(Opcional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. REC-EXT-01"
                        value={newMovementVoucherNumber}
                        onChange={(e) => setNewMovementVoucherNumber(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500 font-mono text-slate-900 dark:text-slate-100 shadow-xs"
                      />
                    </div>

                    <div className="sm:col-span-2 md:col-span-4">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Concepto / Justificación del Ingreso <span className="text-slate-600 dark:text-slate-400 font-normal">(Opcional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Ajuste de cambio / Ingreso extraordinario de sencillo"
                        value={newMovementDescription}
                        onChange={(e) => setNewMovementDescription(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500 text-slate-900 dark:text-slate-100 shadow-xs"
                      />
                    </div>
                  </>
                )}

                {/* File Upload Zone for Voucher / Soporte Digital */}
                <div className="sm:col-span-2 md:col-span-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Soporte / Comprobante Digital {newMovementType === 'expense' ? (
                        <span className="text-amber-600 dark:text-amber-400 font-extrabold">* Obligatorio para Gastos (PDF o Imagen)</span>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400 font-normal">(Opcional para Recogidas o Ingresos)</span>
                      )}
                    </label>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400">Formatos: PDF, JPG, PNG, WEBP (Máx. 15MB)</span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf,.pdf"
                    className="hidden"
                    id="digital-voucher-upload"
                  />

                  {!attachmentUrl ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        isDraggingFile
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 scale-[0.99]'
                          : attachmentError && newMovementType === 'expense'
                          ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/30 hover:border-rose-500'
                          : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          newMovementType === 'pickup' ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                        }`}>
                          <Upload className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {isDraggingFile ? 'Suelte el archivo aquí' : 'Haz clic para seleccionar o arrastra aquí el comprobante digital'}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
                          <span className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Imagen (JPG/PNG)</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Archivo PDF</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {attachmentType === 'pdf' ? (
                          <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60">
                            <FileText className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                            <img
                              src={attachmentUrl}
                              alt="Miniatura"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                            <span>{attachmentName}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                              {attachmentType === 'pdf' ? 'PDF' : 'IMAGEN'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                            {attachmentSize ? `${(attachmentSize / 1024).toFixed(1)} KB` : 'Archivo cargado'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenAttachmentViewer({
                            url: attachmentUrl,
                            name: attachmentName,
                            type: attachmentType,
                            description: newMovementDescription || (newMovementType === 'pickup' ? 'Acta de recogida de efectivo' : 'Comprobante digital'),
                            operator: currentShift.operatorName,
                            date: new Date().toISOString()
                          })}
                          className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs border border-slate-300 dark:border-slate-700"
                          title="Previsualizar archivo digital"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Soporte</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold cursor-pointer transition-colors"
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveAttachment}
                          className="p-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer transition-colors"
                          title="Eliminar archivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {attachmentError && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs animate-shake">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span className="font-semibold">{attachmentError}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md flex items-center gap-2 transition-all ${
                    newMovementType === 'pickup'
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : newMovementType === 'income'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {newMovementType === 'pickup' ? (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Guardar Recogida de Dinero</span>
                    </>
                  ) : newMovementType === 'income' ? (
                    <>
                      <ArrowDownCircle className="w-4 h-4" />
                      <span>Guardar Ingreso Extra</span>
                    </>
                  ) : (
                    <>
                      <Receipt className="w-4 h-4" />
                      <span>Guardar Gasto en Caja</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Movements History List with Distinguished Badges */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentShift.cashMovements.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-600 dark:text-slate-400">
                  No hay movimientos, gastos o recogidas registradas en este turno.
                </div>
              ) : (
                currentShift.cashMovements.map((m) => {
                  const isExpense = m.type === 'expense';
                  const isPickup = m.type === 'pickup' || m.type === 'withdrawal';
                  const isIncome = m.type === 'income';

                  return (
                    <div key={m.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors gap-3">
                      <div className="flex items-start sm:items-center gap-2.5">
                        {isIncome ? (
                          <ArrowDownCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                        ) : isPickup ? (
                          <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                            <ArrowUpRight className="w-4 h-4" />
                          </div>
                        ) : (
                          <ArrowUpCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
                        )}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Distinct Type Badge */}
                            {isPickup ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider">
                                RECOGIDA DE DINERO
                              </span>
                            ) : isExpense ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800 uppercase tracking-wider">
                                GASTO CAJA MENOR
                              </span>
                            ) : (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
                                INGRESO EXTRA
                              </span>
                            )}

                            <span className="font-bold text-slate-900 dark:text-slate-100">{m.description}</span>

                            {m.conceptName && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                                {m.conceptName}
                              </span>
                            )}

                            {m.voucherNumber && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                Doc: {m.voucherNumber}
                              </span>
                            )}

                            {/* Digital Voucher Badge & Viewer Button */}
                            {m.attachmentUrl && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenAttachmentViewer({
                                    url: m.attachmentUrl!,
                                    name: m.attachmentName || 'Comprobante digital',
                                    type: m.attachmentType,
                                    amount: m.amount,
                                    description: m.description,
                                    operator: m.operator,
                                    date: m.timestamp,
                                    voucherNumber: m.voucherNumber,
                                    conceptName: m.conceptName,
                                  });
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 rounded-lg text-[11px] font-bold cursor-pointer transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                                title="Haga clic para ver el comprobante digital adjunto"
                              >
                                <Paperclip className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                                <span>{m.attachmentType === 'pdf' ? 'Ver Soporte PDF' : 'Ver Soporte Imagen'}</span>
                                <Eye className="w-3.5 h-3.5 text-amber-900 dark:text-amber-300 ml-0.5" />
                              </button>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                            {new Date(m.timestamp).toLocaleTimeString('es-CO')} • Operador: {m.operator}
                          </div>
                        </div>
                      </div>
                      <div className={`font-mono font-bold text-sm sm:text-right shrink-0 ${
                        isIncome ? 'text-emerald-700 dark:text-emerald-400' : isPickup ? 'text-indigo-700 dark:text-indigo-400 font-black' : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {isIncome ? '+' : '-'}{formatCurrency(m.amount, currencySymbol)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 4: HISTÓRICO INTEGRADO DE CIERRES Y ARQUEOS          */}
      {/* ========================================================= */}
      {activeSubTab === 'history' && (
        <div className="space-y-6">
          {/* Header Bar with Action & Summary */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-900/50 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Histórico de Arqueos y Cierres Definitivos</span>
                  <span className="text-xs bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    {safeClosedShifts.length + safeClosedDays.length} Registros
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Consulta de comprobantes térmicos, actas de jornada, reimpresión y descarga PDF oficial
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir en Ventana Emergente</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Arqueos de Turno</span>
              <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">{safeClosedShifts.length}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Cierres de Día Registrados</span>
              <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">{safeClosedDays.length}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Recaudo Turnos Simulados</span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                {formatCurrency(safeClosedShifts.reduce((acc, s) => acc + (s.totalCollectedSnapshot || 0), 0), currencySymbol)}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total en Bóveda Día</span>
              <span className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                {formatCurrency(safeClosedDays.reduce((acc, d) => acc + (d.totalToConsignSnapshot || d.finalDayCash || 0), 0), currencySymbol)}
              </span>
            </div>
          </div>

          {/* Seccion 1: Cierres Definitivos de Jornada */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Cierres Definitivos de Jornada Operativa ({safeClosedDays.length})
                </h4>
              </div>
            </div>

            <div className="space-y-3">
              {safeClosedDays.map((day) => {
                const cash = day.cashCollectedSnapshot ?? 0;
                const digital = (day.cardCollectedSnapshot ?? 0) + (day.walletCollectedSnapshot ?? 0) + (day.qrCollectedSnapshot ?? 0) + (day.breBCollectedSnapshot ?? 0);
                const total = day.totalCollected ?? (cash + digital);
                const toConsign = day.totalToConsignSnapshot ?? (day.finalDayCash || 0);

                return (
                  <div
                    key={day.id}
                    className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black bg-emerald-700 text-white px-2.5 py-0.5 rounded">
                          Cierre Día #{day.dayNumber || 1}
                        </span>
                        {day.consecutiveCode && (
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {day.consecutiveCode}
                          </span>
                        )}
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          Fecha: <strong>{day.formattedDate || day.date}</strong> • Responsable: <strong>{day.closedByOperator}</strong>
                        </span>
                        {day.isAudited && (
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
                            type: 'day',
                            day,
                          });
                          setIsHistoryModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white shadow-xs transition-all cursor-pointer self-start sm:self-auto"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ver Tiquete Fiscal Z</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono">
                      <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-sans text-slate-500 block">Total Facturado</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(total, currencySymbol)}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-sans text-slate-500 block">Efectivo Total</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(cash, currencySymbol)}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-sans text-slate-500 block">Medios Digitales</span>
                        <span className="font-bold text-indigo-700 dark:text-indigo-400">{formatCurrency(digital, currencySymbol)}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 text-emerald-950 dark:text-emerald-200">
                        <span className="text-[9px] uppercase font-sans text-emerald-800 dark:text-emerald-400 block font-bold">Total a Bóveda</span>
                        <span className="font-black">{formatCurrency(toConsign, currencySymbol)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seccion 2: Arqueos de Turno */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Arqueos de Turno Realizados ({safeClosedShifts.length})
                </h4>
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
                    className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-2xs"
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
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white shadow-xs transition-all cursor-pointer"
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
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(total, currencySymbol)}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-sans text-slate-500 block">Efectivo en Caja</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(shift.finalCountedCash || cash, currencySymbol)}</span>
                      </div>
                      <div className={`p-2 rounded border ${diff === 0 ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800'}`}>
                        <span className="text-[9px] uppercase font-sans text-slate-500 block">Cuadre Físico</span>
                        <span className="font-bold">{diff === 0 ? 'Cuadrado $0' : formatCurrency(diff, currencySymbol)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* THERMAL PRINT MODAL FOR ARQUEO / CIERRE                   */}
      {/* ========================================================= */}
      {printedVoucherType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="print:hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm truncate">
                {printedVoucherType === 'arqueo' ? 'Comprobante de Arqueo de Turno' : 'Comprobante de Cierre Definitivo'}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
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
                <button
                  onClick={() => setPrintedVoucherType(null)}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="p-5 max-h-[70vh] overflow-y-auto flex justify-center bg-neutral-100 dark:bg-slate-950">
              {(() => {
                const isArqueoVoucher = printedVoucherType === 'arqueo';
                const vBase = isArqueoVoucher ? currentShift.initialCash : dayBaseCash;
                const vCash = isArqueoVoucher ? shiftTotals.cash : dayTotals.cash;
                const vCard = isArqueoVoucher ? shiftTotals.card : dayTotals.card;
                const vWallet = isArqueoVoucher ? shiftTotals.wallet : dayTotals.wallet;
                const vQr = isArqueoVoucher ? shiftTotals.qr : dayTotals.qr;
                const vBreB = isArqueoVoucher ? shiftTotals.breB : dayTotals.breB;
                const vAgreement = isArqueoVoucher ? shiftTotals.agreement : dayTotals.agreement;
                const vTotalCollected = isArqueoVoucher ? shiftTotals.totalCollected : dayTotals.totalCollected;

                const vExpectedCash = isArqueoVoucher ? expectedCashInDrawer : dayExpectedCashInDrawer;
                const vCountedCash = isArqueoVoucher ? countedCashNumber : dayCountedCashNumber;
                const vHasCountedInput = isArqueoVoucher ? Boolean(countedCashInput) : Boolean(dayCountedCashInput);
                const vCashDiff = isArqueoVoucher ? cashDifference : dayCashDifference;

                const totalEfectivoEntrado = vBase + vCash + totalCashOtherIncomes;
                const totalEgresosReales = totalExpenses;

                const dineroFaltante = (vHasCountedInput && vCashDiff !== null && vCashDiff < 0) ? Math.abs(vCashDiff) : 0;
                const dineroSobrante = (vHasCountedInput && vCashDiff !== null && vCashDiff > 0) ? vCashDiff : 0;

                const efectivoNetoEnGaveta = (vHasCountedInput ? vCountedCash : vExpectedCash) - vBase;
                const totalAConsignar = totalPickups + Math.max(0, efectivoNetoEnGaveta);

                const vExpensesList = currentShift.cashMovements.filter((m) => m.type === 'expense');
                const vPickupsList = currentShift.cashMovements.filter((m) => m.type === 'pickup' || m.type === 'withdrawal');

                return (
                  <div 
                    id="printable-ticket" 
                    data-paper-width={voucherPaperWidth}
                    className={`w-full bg-white ${
                      voucherPaperWidth === '58mm' ? 'max-w-[245px] text-[10px] p-3 paper-58mm' : 'max-w-[340px] text-xs p-4 paper-80mm'
                    } border border-dashed border-slate-300 font-mono text-slate-950 space-y-3 rounded shadow-xs force-light transition-all`}
                  >
                    {/* Header */}
                    <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
                      {businessInfo.logoUrl && (
                        <div className="w-12 h-12 mx-auto rounded-full overflow-hidden bg-white border border-slate-300 p-0.5 shadow-2xs flex items-center justify-center mb-1">
                          <img 
                            src={
                              businessInfo.logoUrl.includes('wolfzone_logo_farmanorte')
                                ? '/assets/wolfzone_ticket_logo.png'
                                : businessInfo.logoUrl
                            } 
                            alt="Logo" 
                            className="w-full h-full object-cover rounded-full" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <h2 className="font-black text-sm uppercase text-slate-950">{businessInfo.name}</h2>
                      <p className="text-[10px] text-slate-700">NIT: {businessInfo.nit}</p>
                      <p className="text-[10px] text-slate-700">{businessInfo.address}</p>

                      <div className="mt-2 inline-block bg-slate-900 text-white px-3 py-0.5 font-bold text-[10px] rounded uppercase tracking-wide">
                        {isArqueoVoucher 
                          ? '**** ARQUEO DE TURNO ****' 
                          : '**** CIERRE DE CAJA DEFINITIVO ****'}
                      </div>
                      {isArqueoVoucher && isBlindCount && (
                        <div className="mt-1 text-[9px] font-mono text-amber-900 bg-amber-100/90 border border-amber-300 py-0.5 px-2 rounded font-black tracking-wide inline-block">
                          🔒 CERTIFICACIÓN: ARQUEO CIEGO AUDITADO
                        </div>
                      )}
                    </div>

                    {/* Meta Header */}
                    <div className="py-1 border-b border-dashed border-slate-400 text-[10px] space-y-1">
                      <div className="flex justify-between">
                        <span>COMPROBANTE No.:</span>
                        <span className="font-bold">#{isArqueoVoucher ? `TURNO-${currentShift.shiftNumber}` : `CIERRE-${operationalDay.dayNumber || 1}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>MOMENTO DEL CIERRE:</span>
                        <span className="font-bold">{new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DÍA OPERATIVO:</span>
                        <span className="font-bold">#{operationalDay.dayNumber || 1} ({operationalDay.formattedDate || operationalDay.date})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>USUARIO / CAJERO:</span>
                        <span className="font-bold uppercase">{currentShift.operatorName}</span>
                      </div>
                    </div>

                    {/* SECCIÓN 1: DISCRIMINACIÓN DE MEDIOS DE PAGO Y VENTAS TOTALES */}
                    <div>
                      <div className="text-center font-bold uppercase text-[10px] tracking-wider py-1 bg-slate-100 border border-slate-300">
                        DISCRIMINACIÓN DE VENTAS / RECAUDO
                      </div>
                      <table className="w-full text-[10px] font-mono border-collapse my-1">
                        <thead>
                          <tr className="border-b border-slate-400 text-left uppercase text-[9px] font-bold">
                            <th className="py-1">MEDIO DE PAGO</th>
                            <th className="py-1 text-right">TOTAL</th>
                            <th className="py-1 text-right">CANT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          <tr>
                            <td className="py-1 font-semibold">EFECTIVO</td>
                            <td className="py-1 text-right font-bold text-emerald-800">
                              {formatCurrency(vCash, currencySymbol)}
                            </td>
                            <td className="py-1 text-right text-slate-600 dark:text-slate-300">{ticketCounts.cashCount}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold">TARJETAS DÉB/CRÉD</td>
                            <td className="py-1 text-right">{formatCurrency(vCard, currencySymbol)}</td>
                            <td className="py-1 text-right text-slate-600 dark:text-slate-300">{ticketCounts.cardCount}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold">BILLETERAS DIGITALES</td>
                            <td className="py-1 text-right">{formatCurrency(vWallet, currencySymbol)}</td>
                            <td className="py-1 text-right text-slate-600 dark:text-slate-300">{ticketCounts.walletCount}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold">CÓDIGOS QR / PSE / TRANSF</td>
                            <td className="py-1 text-right">{formatCurrency(vQr, currencySymbol)}</td>
                            <td className="py-1 text-right text-slate-600 dark:text-slate-300">{ticketCounts.qrCount}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold">LLAVES BRE-B</td>
                            <td className="py-1 text-right">{formatCurrency(vBreB, currencySymbol)}</td>
                            <td className="py-1 text-right text-slate-600 dark:text-slate-300">{ticketCounts.breBCount}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold">CONVENIOS / CRÉDITOS</td>
                            <td className="py-1 text-right">{formatCurrency(vAgreement, currencySymbol)}</td>
                            <td className="py-1 text-right text-slate-600 dark:text-slate-300">{ticketCounts.agreementCount}</td>
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-b-2 border-slate-200 dark:border-slate-800 font-bold text-[10px]">
                            <td className="py-1.5 uppercase">TOTAL VENTAS FACTURADAS</td>
                            <td className="py-1.5 text-right font-black text-slate-950">
                              {formatCurrency(vTotalCollected, currencySymbol)}
                            </td>
                            <td className="py-1.5 text-right font-black text-slate-950">
                              {ticketCounts.total}
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
                            <td className="py-1 font-semibold text-slate-700 dark:text-slate-200">(+) BASE / FONDO INICIAL DE CAJA</td>
                            <td className="py-1 text-right font-bold text-slate-800 dark:text-slate-200">
                              +{formatCurrency(vBase, currencySymbol)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold text-emerald-800">(+) VENTAS EN EFECTIVO RECAUDADAS</td>
                            <td className="py-1 text-right font-bold text-emerald-800">
                              +{formatCurrency(vCash, currencySymbol)}
                            </td>
                          </tr>
                          {totalCashOtherIncomes > 0 && (
                            <tr>
                              <td className="py-1 font-semibold text-emerald-700">(+) OTROS INGRESOS EN EFECTIVO (MENSUALIDADES)</td>
                              <td className="py-1 text-right font-bold text-emerald-700">
                                +{formatCurrency(totalCashOtherIncomes, currencySymbol)}
                              </td>
                            </tr>
                          )}
                          {totalElectronicOtherIncomes > 0 && (
                            <tr>
                              <td className="py-1 font-semibold text-indigo-700">(i) OTROS INGRESOS ELECTRÓNICOS (BANCOS/BILLETERAS)</td>
                              <td className="py-1 text-right font-bold text-indigo-700">
                                +{formatCurrency(totalElectronicOtherIncomes, currencySymbol)}
                              </td>
                            </tr>
                          )}
                          <tr className="bg-slate-50 font-bold border-t border-slate-300">
                            <td className="py-1 text-slate-900 dark:text-slate-100">(=) TOTAL EFECTIVO INGRESADO A GAVETA</td>
                            <td className="py-1 text-right font-black text-slate-900 dark:text-slate-100">
                              {formatCurrency(totalEfectivoEntrado, currencySymbol)}
                            </td>
                          </tr>
                          {totalExpenses > 0 && (
                            <tr>
                              <td className="py-1 font-semibold text-rose-800">(-) GASTOS DE CAJA MENOR (EGRESOS)</td>
                              <td className="py-1 text-right font-bold text-rose-700">
                                -{formatCurrency(totalExpenses, currencySymbol)}
                              </td>
                            </tr>
                          )}
                          {totalPickups > 0 && (
                            <tr>
                              <td className="py-1 font-semibold text-indigo-900">(-) RECOGIDAS DE EFECTIVO (A BÓVEDA)</td>
                              <td className="py-1 text-right font-bold text-indigo-700">
                                -{formatCurrency(totalPickups, currencySymbol)}
                              </td>
                            </tr>
                          )}
                          <tr className="border-t-2 border-slate-200 dark:border-slate-800 font-bold bg-slate-100">
                            <td className="py-1.5 text-slate-950 uppercase">(=) EFECTIVO ESPERADO EN GAVETA</td>
                            <td className="py-1.5 text-right font-black text-slate-950">
                              {formatCurrency(vExpectedCash, currencySymbol)}
                            </td>
                          </tr>
                          {vHasCountedInput && (
                            <tr className="font-bold bg-amber-100/50">
                              <td className="py-1 text-slate-950 uppercase">(FÍSICO) EFECTIVO CONTADO EN CAJA</td>
                              <td className="py-1 text-right font-black text-slate-950">
                                {formatCurrency(vCountedCash, currencySymbol)}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      {/* DIFERENCIA (SOBRANTE / FALTANTE) */}
                      {vHasCountedInput && vCashDiff !== null && (
                        <div className={`p-2 rounded border font-mono text-[10px] space-y-0.5 my-1.5 ${
                          vCashDiff === 0 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                            : vCashDiff > 0 
                            ? 'bg-sky-50 border-sky-300 text-sky-950' 
                            : 'bg-rose-50 border-rose-300 text-rose-950'
                        }`}>
                          <div className="flex justify-between font-bold">
                            <span>RESULTADO CUADRE GAVETA:</span>
                            <span className="font-black">
                              {vCashDiff === 0 
                                ? '¡CAJA CUADRADA EXACTA! ($0)' 
                                : vCashDiff > 0 
                                ? `DINERO SOBRANTE: +${formatCurrency(dineroSobrante, currencySymbol)}` 
                                : `DINERO FALTANTE: -${formatCurrency(dineroFaltante, currencySymbol)}`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECCIÓN 3: LIQUIDACIÓN Y CONSIGNACIÓN TOTAL DEL EFECTIVO */}
                    <div className="border-y-2 border-slate-200 dark:border-slate-800 py-2 space-y-1.5 my-2 bg-emerald-50/70 p-2 font-mono text-[10px] border">
                      <div className="text-center font-black uppercase text-[10px] tracking-wide text-emerald-950 pb-1 border-b border-emerald-300">
                        LIQUIDACIÓN DE EFECTIVO A CONSIGNAR
                      </div>
                      <div className="flex justify-between text-slate-800 dark:text-slate-200">
                        <span>Recogidas en Custodia / Bóveda:</span>
                        <span className="font-bold">{formatCurrency(totalPickups, currencySymbol)}</span>
                      </div>
                      <div className="flex justify-between text-slate-800 dark:text-slate-200">
                        <span>(+) Efectivo Disponible en Gaveta (Contado - Base):</span>
                        <span className="font-bold">{formatCurrency(Math.max(0, efectivoNetoEnGaveta), currencySymbol)}</span>
                      </div>
                      <div className="flex justify-between font-black text-xs text-emerald-950 border-t-2 border-emerald-800 pt-1.5 bg-emerald-200/80 p-1.5 rounded">
                        <span>TOTAL EFECTIVO A CONSIGNAR :</span>
                        <span className="text-sm font-black text-emerald-950">{formatCurrency(totalAConsignar, currencySymbol)}</span>
                      </div>

                      {/* Nota aclaratoria sobre recogidas y base */}
                      <div className="text-[9px] text-slate-700 dark:text-slate-200 bg-white/90 p-1.5 rounded border border-emerald-200 mt-1 space-y-0.5 leading-tight">
                        <p className="font-bold text-emerald-900">💡 CONTROL Y CONSIGNACIÓN:</p>
                        <p>• <span className="font-semibold">Base de Caja</span> ({formatCurrency(vBase, currencySymbol)}) queda en gaveta como fondo de apertura para el siguiente turno.</p>
                        <p>• Las <span className="font-bold">Recogidas de Efectivo</span> ({formatCurrency(totalPickups, currencySymbol)}) son traslados de seguridad a bóveda/custodia; <span className="font-semibold">hacen parte de todo el efectivo generado</span> para consignar al final de la jornada.</p>
                      </div>
                    </div>

                    {/* ESTADÍSTICAS DEL PROCESO DE VENTA */}
                    <div className="space-y-1 pt-1 border-t border-dashed border-slate-300">
                      <div className="text-center font-bold uppercase text-[10px] border-b border-slate-300 pb-0.5">
                        ESTADÍSTICAS DE ATENCIÓN DE VEHÍCULOS
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>TIQUETE INICIAL :</span>
                        <span className="font-bold">{ticketCounts.firstTicket}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>TIQUETE FINAL :</span>
                        <span className="font-bold">{ticketCounts.lastTicket}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>VEHÍCULOS ATENDIDOS :</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{ticketCounts.total}</span>
                      </div>
                    </div>

                    {/* DETALLE DE GASTOS Y RECOGIDAS ÍTEM POR ÍTEM */}
                    {vExpensesList.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-dashed border-slate-300">
                        <div className="font-bold uppercase text-[10px] border-b border-slate-300 pb-0.5 flex justify-between">
                          <span>DETALLE DE GASTOS DE CAJA ({vExpensesList.length})</span>
                          <span className="text-rose-700 font-bold">Total: -{formatCurrency(totalExpenses, currencySymbol)}</span>
                        </div>
                        {vExpensesList.map((m) => (
                          <div key={m.id} className="flex justify-between text-[9px]">
                            <span className="truncate pr-1">{m.description} ({m.conceptName || 'Gasto'})</span>
                            <span className="font-bold text-rose-700 shrink-0">-{formatCurrency(m.amount, currencySymbol)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {vPickupsList.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-dashed border-slate-300">
                        <div className="font-bold uppercase text-[10px] border-b border-slate-300 pb-0.5 flex justify-between">
                          <span>DETALLE DE RECOGIDAS DE EFECTIVO ({vPickupsList.length})</span>
                          <span className="text-indigo-800 font-bold">Total: {formatCurrency(totalPickups, currencySymbol)}</span>
                        </div>
                        {vPickupsList.map((m) => (
                          <div key={m.id} className="flex justify-between text-[9px]">
                            <span className="truncate pr-1">{m.description} ({new Date(m.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })})</span>
                            <span className="font-bold text-indigo-700 shrink-0">{formatCurrency(m.amount, currencySymbol)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Signatures */}
                    <div className="pt-6 pb-2 text-[10px] space-y-8 text-center text-slate-600 dark:text-slate-300">
                      <div className="border-t border-slate-400 pt-1">
                        Firma Cajero Saliente ({currentShift.operatorName})
                      </div>
                      <div className="border-t border-slate-400 pt-1">
                        Firma Supervisor / Administrador
                      </div>
                    </div>

                    {/* Footer with mandatory wolfzonepos branding */}
                    <div className="text-center pt-2 text-[9px] text-slate-600 dark:text-slate-300 border-t border-dashed border-slate-300 space-y-0.5">
                      <div className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 font-mono text-[10px]">
                        wolfzonepos
                      </div>
                      <div>Comprobante Oficial de Control de Caja</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Actions */}
            <div className="print:hidden p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 truncate max-w-[180px]">
                {voucherPrintStatus}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrintedVoucherType(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleDownloadVoucherPdf}
                  disabled={isDownloadingPdf}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Descargar PDF Oficial"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloadingPdf ? 'Generando...' : 'Descargar PDF'}</span>
                </button>
                <button
                  onClick={handlePrintVoucher}
                  disabled={isVoucherPrinting}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400 dark:text-slate-950" />
                  <span>{isVoucherPrinting ? 'Imprimiendo...' : `Imprimir (${voucherPaperWidth})`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DIGITAL VOUCHER (COMPROBANTE) PREVIEW MODAL               */}
      {/* ========================================================= */}
      {viewingAttachment && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewingAttachment(null);
            }
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 max-h-[92vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {isAttachmentPdf ? (
                  <div className="p-2 rounded-lg bg-rose-500/20 text-rose-800 dark:text-rose-300 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Comprobante Digital de Gasto</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-black bg-amber-400 text-slate-950">
                      {isAttachmentPdf ? 'Documento PDF' : 'Imagen / Recibo'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-sm sm:max-w-md">
                    {viewingAttachment.name || 'Comprobante digital'}
                  </p>
                </div>
              </div>

              {/* Header Actions & Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                {!isAttachmentPdf && (
                  <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mr-2 border border-slate-300 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setViewerZoom(z => Math.max(0.5, z - 0.25))}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded cursor-pointer transition-colors"
                      title="Alejar (-25%)"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-mono px-1 text-slate-800 dark:text-slate-200 font-bold min-w-[42px] text-center">
                      {Math.round(viewerZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewerZoom(z => Math.min(3, z + 0.25))}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded cursor-pointer transition-colors"
                      title="Acercar (+25%)"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewerRotation(r => (r + 90) % 360)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded cursor-pointer transition-colors ml-1"
                      title="Girar 90°"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    {(viewerZoom !== 1 || viewerRotation !== 0) && (
                      <button
                        type="button"
                        onClick={() => { setViewerZoom(1); setViewerRotation(0); }}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-400 rounded cursor-pointer transition-colors"
                        title="Restablecer vista"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                <a
                  href={safeAttachmentBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={() => setViewingAttachment(null)}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Cerrar visor"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Movement Metadata Bar */}
            <div className="px-5 py-2.5 bg-amber-50/80 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-700 dark:text-slate-300">
              <div className="flex flex-wrap items-center gap-3">
                {viewingAttachment.conceptName && (
                  <span className="font-bold text-amber-950 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-900/50 px-2 py-0.5 rounded text-[11px] border border-amber-300/60 dark:border-amber-800">
                    {viewingAttachment.conceptName}
                  </span>
                )}
                {viewingAttachment.voucherNumber && (
                  <span className="font-mono text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                    Doc: {viewingAttachment.voucherNumber}
                  </span>
                )}
                {viewingAttachment.operator && (
                  <span className="text-[11px] text-slate-600 dark:text-slate-300">
                    Operador: <strong className="text-slate-900 dark:text-slate-100">{viewingAttachment.operator}</strong>
                  </span>
                )}
                {viewingAttachment.date && (
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                    {new Date(viewingAttachment.date).toLocaleString('es-CO')}
                  </span>
                )}
              </div>
              {viewingAttachment.amount !== undefined && (
                <div className="font-mono font-black text-rose-700 dark:text-rose-400 text-base">
                  -{formatCurrency(viewingAttachment.amount, currencySymbol)}
                </div>
              )}
            </div>

            {/* Content Preview Stage */}
            <div className="p-4 overflow-auto flex-1 bg-slate-100 dark:bg-slate-950 flex items-center justify-center min-h-[360px] max-h-[65vh]">
              {isAttachmentPdf ? (
                <div className="w-full h-full flex flex-col items-center justify-center min-h-[480px]">
                  <object
                    data={safeAttachmentBlobUrl}
                    type="application/pdf"
                    className="w-full h-[58vh] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-inner"
                  >
                    <embed
                      src={safeAttachmentBlobUrl}
                      type="application/pdf"
                      className="w-full h-full rounded-xl"
                    />
                    {/* Fallback if browser PDF plugin is disabled or restricted */}
                    <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md shadow-sm">
                      <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-8 h-8" />
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">Comprobante PDF Cargado</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
                        El navegador no permite previsualización incrustada directa en este marco. Puede visualizar o descargar el archivo completo haciendo clic abajo:
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href={safeAttachmentBlobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir en Pestaña Nueva</span>
                        </a>
                      </div>
                    </div>
                  </object>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                  <div 
                    className="transition-transform duration-150 ease-out origin-center flex items-center justify-center max-w-full max-h-full"
                    style={{
                      transform: `scale(${viewerZoom}) rotate(${viewerRotation}deg)`
                    }}
                  >
                    <img
                      src={safeAttachmentBlobUrl || viewingAttachment.url}
                      alt={viewingAttachment.name || 'Comprobante digital'}
                      className="max-h-[58vh] max-w-full object-contain rounded-xl shadow-md border border-slate-200 dark:border-slate-700 bg-white"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-sm">
                <span className="font-bold text-slate-800 dark:text-slate-200">Detalle: </span>
                {viewingAttachment.description || 'Sin descripción adicional'}
              </div>
              <div className="flex items-center gap-2 justify-end shrink-0">
                <a
                  href={safeAttachmentBlobUrl}
                  download={viewingAttachment.name || `comprobante-${Date.now()}`}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span>Descargar Archivo</span>
                </a>
                <a
                  href={safeAttachmentBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-slate-950" />
                  <span>Pantalla Completa</span>
                </a>
                <button
                  type="button"
                  onClick={() => setViewingAttachment(null)}
                  className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Validación de PIN de Supervisor para Desbloqueo de Arqueo Ciego */}
      {showSupervisorPinModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Autorización de Supervisor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSupervisorPinModal(false);
                  setSupervisorPinInput('');
                  setSupervisorPinError('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUnlockSupervisor} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Ingrese el PIN o contraseña de Supervisor para revelar el saldo teórico esperado y auditar la caja antes del sellado definitivo.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  PIN / Contraseña de Supervisor
                </label>
                <input
                  type="password"
                  autoFocus
                  value={supervisorPinInput}
                  onChange={(e) => {
                    setSupervisorPinInput(e.target.value);
                    if (supervisorPinError) setSupervisorPinError('');
                  }}
                  placeholder="••••"
                  className="w-full text-center tracking-widest text-xl font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                />
                {supervisorPinError && (
                  <p className="text-xs text-rose-500 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{supervisorPinError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSupervisorPinModal(false);
                    setSupervisorPinInput('');
                    setSupervisorPinError('');
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Validar & Desbloquear</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History & Recalculation Modal */}
      <CashShiftsHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedRecordForTicket(null);
        }}
        closedShifts={safeClosedShifts}
        closedDays={safeClosedDays}
        allTickets={todayPaidTickets}
        currencySymbol={currencySymbol}
        businessInfo={businessInfo}
        currentUser={currentUser}
        onUpdateShift={onUpdateShiftInHistory}
        onUpdateDay={onUpdateDayInHistory}
        initialSelectedRecord={selectedRecordForTicket}
      />
    </div>
  );
};
