import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  X, 
  Plus, 
  Search, 
  Calendar, 
  Car, 
  Phone, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Printer, 
  RefreshCw, 
  Edit3, 
  Trash2, 
  DollarSign, 
  Sparkles,
  ShieldCheck,
  CreditCard,
  Building,
  KeyRound,
  Smartphone,
  QrCode,
  Landmark,
  Banknote,
  Receipt,
  FileText,
  Hash
} from 'lucide-react';
import { 
  ParkingSubscriber, 
  VehicleType, 
  PaymentMethod, 
  ParkingBusinessInfo, 
  ParkingSpot,
  VehicleCategoryConfig,
  RatesConfig,
  PaymentGatewayConfig
} from '../types';
import { formatCurrency } from '../utils/billing';
import { printInstantThermal } from '../services/printerService';
import { DEFAULT_PAYMENT_GATEWAY_CONFIG } from '../utils/paymentUtils';

interface SubscribersModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessInfo: ParkingBusinessInfo;
  spots?: ParkingSpot[];
  vehicleCategories?: VehicleCategoryConfig[];
  rates?: RatesConfig;
  paymentGatewayConfig?: PaymentGatewayConfig;
  onSubscriberUpdated?: () => void;
}

export const SubscribersModal: React.FC<SubscribersModalProps> = ({
  isOpen,
  onClose,
  businessInfo,
  spots = [],
  vehicleCategories = [],
  rates,
  paymentGatewayConfig,
  onSubscriberUpdated
}) => {
  const [subscribers, setSubscribers] = useState<ParkingSubscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring_soon' | 'expired'>('all');

  // --- 1. Categorías de vehículos dinámicas (existentes, creadas y futuras) ---
  const availableCategories = useMemo<VehicleCategoryConfig[]>(() => {
    let list: VehicleCategoryConfig[] = [];
    if (vehicleCategories && vehicleCategories.length > 0) {
      list = vehicleCategories.filter(c => c.enabled !== false && c.isActive !== false);
    } else {
      try {
        const saved = localStorage.getItem('pk_vehicle_categories');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed.filter((c: any) => c.enabled !== false && c.isActive !== false);
          }
        }
      } catch {
        // fallback
      }
    }

    if (!list || list.length === 0) {
      list = [
        { id: 'car', name: 'Automóvil / Carro', icon: 'Car', defaultHourlyRate: 4000, defaultDailyRate: 25000 },
        { id: 'motorcycle', name: 'Motocicleta', icon: 'Bike', defaultHourlyRate: 2000, defaultDailyRate: 15000 },
        { id: 'suv', name: 'Camioneta / SUV', icon: 'Truck', defaultHourlyRate: 5000, defaultDailyRate: 30000 },
        { id: 'bicycle', name: 'Bicicleta', icon: 'Bike', defaultHourlyRate: 1000, defaultDailyRate: 6000 },
      ];
    }

    return list;
  }, [vehicleCategories]);

  const getCategoryName = (typeId: string) => {
    const found = availableCategories.find(c => c.id === typeId);
    if (found) return found.name;
    if (typeId === 'car') return 'Automóvil / Carro';
    if (typeId === 'motorcycle') return 'Motocicleta';
    if (typeId === 'suv') return 'Camioneta / SUV';
    if (typeId === 'bicycle') return 'Bicicleta';
    return typeId;
  };

  const getEstimatedMonthlyRate = (typeId: string): number => {
    const cat = availableCategories.find(c => c.id === typeId);
    if (cat) {
      if ((cat as any).defaultMonthlyRate) return Number((cat as any).defaultMonthlyRate);
      if (cat.rate?.dayRate) return cat.rate.dayRate * 20;
      if (cat.defaultDailyRate) return cat.defaultDailyRate * 20;
    }
    if (rates && (rates as any)[typeId]?.dayRate) {
      return (rates as any)[typeId].dayRate * 20;
    }
    if (typeId === 'motorcycle') return 60000;
    if (typeId === 'bicycle') return 30000;
    if (typeId === 'suv') return 150000;
    return 120000;
  };

  // --- 2. Medios de pago dinámicos desde la pasarela de pagos ---
  interface PaymentOptionItem {
    id: string;
    category: string;
    label: string;
    methodKey: PaymentMethod;
  }

  const availablePaymentMethods = useMemo<PaymentOptionItem[]>(() => {
    let cfg = paymentGatewayConfig;
    if (!cfg) {
      try {
        const saved = localStorage.getItem('pk_payment_gateway_config');
        if (saved) cfg = JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    const finalCfg = cfg || DEFAULT_PAYMENT_GATEWAY_CONFIG;
    const options: PaymentOptionItem[] = [];

    // Efectivo
    options.push({
      id: 'cash',
      methodKey: 'cash',
      label: 'Efectivo en Caja',
      category: 'Efectivo'
    });

    // Tarjetas y Datáfonos
    if (finalCfg.terminals && finalCfg.terminals.length > 0) {
      const activeTerms = finalCfg.terminals.filter(t => t.enabled !== false);
      if (activeTerms.length > 0) {
        activeTerms.forEach(t => {
          options.push({
            id: `card_${t.id}`,
            methodKey: 'card',
            label: `Tarjeta (${t.name}${t.serialNumber ? ` - ${t.serialNumber}` : ''})`,
            category: 'Tarjetas / Datáfonos'
          });
        });
      } else {
        options.push({
          id: 'card',
          methodKey: 'card',
          label: 'Tarjeta Débito / Crédito (Datáfono)',
          category: 'Tarjetas / Datáfonos'
        });
      }
    } else {
      options.push({
        id: 'card',
        methodKey: 'card',
        label: 'Tarjeta Débito / Crédito',
        category: 'Tarjetas / Datáfonos'
      });
    }

    // Billeteras Digitales
    if (finalCfg.wallets && finalCfg.wallets.length > 0) {
      finalCfg.wallets.filter(w => w.enabled !== false).forEach(w => {
        options.push({
          id: `wallet_${w.id}`,
          methodKey: (w.id === 'nequi' ? 'nequi' : w.id === 'daviplata' ? 'daviplata' : 'wallet') as PaymentMethod,
          label: `${w.name} ${w.phoneNumber ? `(${w.phoneNumber})` : ''} - ${w.holderName || ''}`.trim(),
          category: 'Billeteras Digitales'
        });
      });
    }

    // Códigos QR
    if (finalCfg.qrCodes && finalCfg.qrCodes.length > 0) {
      finalCfg.qrCodes.filter(q => q.enabled !== false).forEach(q => {
        options.push({
          id: `qr_${q.id}`,
          methodKey: 'qr',
          label: `${q.name} - ${q.bankOrEntity || ''} ${q.accountNumber ? `(${q.accountNumber})` : ''}`.trim(),
          category: 'Códigos QR'
        });
      });
    }

    // Transferencias Bancarias & PSE
    if (finalCfg.bankAccounts && finalCfg.bankAccounts.length > 0) {
      finalCfg.bankAccounts.filter(b => b.enabled !== false).forEach(b => {
        options.push({
          id: `bank_${b.id}`,
          methodKey: 'transfer',
          label: `Transferencia ${b.bankName} (${b.accountType === 'savings' ? 'Ahorros' : 'Cte'}: ${b.accountNumber})`,
          category: 'Transferencias Bancarias & PSE'
        });
        if (b.enablePse) {
          options.push({
            id: `pse_${b.id}`,
            methodKey: 'transfer',
            label: `Portal PSE / Web - ${b.bankName}`,
            category: 'Transferencias Bancarias & PSE'
          });
        }
      });
    }

    // Sistema Bre-B Interoperable
    if (finalCfg.breBKeys && finalCfg.breBKeys.length > 0) {
      finalCfg.breBKeys.filter(k => k.enabled !== false).forEach(k => {
        options.push({
          id: `breb_${k.id}`,
          methodKey: 'bre_b',
          label: `Bre-B: ${k.registeredEntity} (${k.keyTypeName}: ${k.keyValue})`,
          category: 'Sistema Bre-B'
        });
      });
    }

    return options;
  }, [paymentGatewayConfig]);

  const getPaymentMethodDisplay = (methodId: string) => {
    const found = availablePaymentMethods.find(p => p.id === methodId || p.methodKey === methodId);
    if (found) return found.label;
    if (methodId === 'cash') return 'Efectivo en Caja';
    if (methodId === 'card') return 'Tarjeta Débito/Crédito';
    if (methodId === 'nequi') return 'Nequi';
    if (methodId === 'daviplata') return 'Daviplata';
    if (methodId === 'transfer') return 'Transferencia / PSE';
    if (methodId === 'qr') return 'Código QR';
    if (methodId === 'bre_b') return 'Bre-B';
    return methodId;
  };

  // Form Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<ParkingSubscriber | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState<string>('car');
  const [monthlyRate, setMonthlyRate] = useState<number>(120000);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignedSpotCode, setAssignedSpotCode] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [voucherNumber, setVoucherNumber] = useState<string>('');
  const [printReceiptOnSave, setPrintReceiptOnSave] = useState(true);

  // Determina si el medio de pago actual genera o requiere documento / soporte bancario
  const isBankingPaymentMethod = useMemo(() => {
    if (paymentMethod === 'cash') return false;
    const opt = availablePaymentMethods.find(p => p.id === paymentMethod);
    if (!opt) return true; // Por defecto cualquier no-efectivo es bancario/electrónico
    const catLower = (opt.category || '').toLowerCase();
    return !catLower.includes('efectivo');
  }, [paymentMethod, availablePaymentMethods]);

  // Metadatos y textos contextuales según el medio bancario/electrónico seleccionado
  const voucherFieldMeta = useMemo(() => {
    const opt = availablePaymentMethods.find(p => p.id === paymentMethod);
    const cat = opt?.category || '';
    const idLower = paymentMethod.toLowerCase();

    if (cat.includes('Tarjetas') || cat.includes('Datáfonos') || idLower.includes('card') || idLower.includes('terminal')) {
      return {
        title: 'N° de Voucher / Aprobación Datáfono',
        badge: 'Datáfono / Tarjeta',
        placeholder: 'ej. 004829 ó Recibo: 10482 Lote: 03',
        helper: 'Ingresa el número de voucher, lote o código de aprobación emitido por el datáfono físico',
        icon: CreditCard
      };
    }
    if (cat.includes('Billeteras') || idLower.includes('nequi') || idLower.includes('daviplata') || idLower.includes('wallet')) {
      return {
        title: 'N° de Aprobación / Referencia Billetera Digital',
        badge: 'Billetera Digital',
        placeholder: 'ej. M-491823 ó Ref: 894021',
        helper: 'Código de comprobante o referencia devuelta por la app (Nequi, Daviplata, Dale!, Movii, etc.)',
        icon: Smartphone
      };
    }
    if (cat.includes('QR') || idLower.includes('qr')) {
      return {
        title: 'N° de Comprobante / Referencia Pago QR',
        badge: 'Código QR',
        placeholder: 'ej. QR-7482910 ó Ref: 98124',
        helper: 'Código de comprobante o referencia bancaria obtenido al pagar con el código QR',
        icon: QrCode
      };
    }
    if (cat.includes('Transferencias') || idLower.includes('bank') || idLower.includes('pse') || idLower.includes('transfer')) {
      return {
        title: 'N° Transacción Bancaria / CUS PSE',
        badge: 'Transferencia / PSE',
        placeholder: 'ej. CUS-94819024 ó Ref: 204918',
        helper: 'Número de aprobación bancaria, referencia de transferencia o código de seguimiento CUS PSE',
        icon: Landmark
      };
    }
    if (cat.includes('Bre-B') || idLower.includes('breb') || idLower.includes('bre_b')) {
      return {
        title: 'ID Transacción / Comprobante Bre-B',
        badge: 'Sistema Bre-B',
        placeholder: 'ej. BB-20261019-9482',
        helper: 'Identificador único de la transacción o comprobante emitido por el sistema interoperable Bre-B',
        icon: Banknote
      };
    }
    return {
      title: 'N° de Voucher / Referencia de Transacción Bancaria',
      badge: 'Documento Bancario',
      placeholder: 'ej. Aprobación / Voucher / Referencia',
      helper: 'Número de documento o soporte de la transacción bancaria',
      icon: Receipt
    };
  }, [paymentMethod, availablePaymentMethods]);

  // Load subscribers from API
  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subscribers');
      const data = await res.json();
      if (data.success && Array.isArray(data.subscribers)) {
        setSubscribers(data.subscribers);
      }
    } catch (err) {
      console.warn('Error cargando abonados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSubscribers();
    }
  }, [isOpen]);

  // Statistics
  const stats = useMemo(() => {
    const total = subscribers.length;
    const active = subscribers.filter(s => s.status === 'active').length;
    const expiringSoon = subscribers.filter(s => s.status === 'expiring_soon').length;
    const expired = subscribers.filter(s => s.status === 'expired').length;
    const projectedRevenue = subscribers
      .filter(s => s.status === 'active' || s.status === 'expiring_soon')
      .reduce((acc, curr) => acc + (curr.monthlyRate || 0), 0);

    return { total, active, expiringSoon, expired, projectedRevenue };
  }, [subscribers]);

  // Filtered subscribers list
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(sub => {
      // Filter by status
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesPlate = (sub.plate || '').toLowerCase().includes(q);
        const matchesName = (sub.fullName || '').toLowerCase().includes(q);
        const matchesDoc = (sub.documentId || '').toLowerCase().includes(q);
        const matchesPhone = (sub.phone || '').toLowerCase().includes(q);
        const matchesVoucher = (sub.voucherNumber || '').toLowerCase().includes(q);
        return matchesPlate || matchesName || matchesDoc || matchesPhone || matchesVoucher;
      }
      return true;
    });
  }, [subscribers, statusFilter, searchQuery]);

  const openNewForm = () => {
    const today = new Date();
    const inOneMonth = new Date();
    inOneMonth.setDate(today.getDate() + 30);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const startStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const endStr = `${inOneMonth.getFullYear()}-${pad(inOneMonth.getMonth() + 1)}-${pad(inOneMonth.getDate())}`;

    const defaultCat = availableCategories[0]?.id || 'car';
    const defaultPay = paymentGatewayConfig?.defaultMethod || availablePaymentMethods[0]?.id || 'cash';

    setEditingSubscriber(null);
    setFullName('');
    setDocumentId('');
    setPhone('');
    setEmail('');
    setPlate('');
    setVehicleType(defaultCat);
    setMonthlyRate(getEstimatedMonthlyRate(defaultCat));
    setStartDate(startStr);
    setEndDate(endStr);
    setAssignedSpotCode('');
    setNotes('');
    setPaymentMethod(defaultPay);
    setVoucherNumber('');
    setPrintReceiptOnSave(true);
    setIsFormOpen(true);
  };

  const handleVehicleTypeChange = (newType: string) => {
    setVehicleType(newType);
    const suggested = getEstimatedMonthlyRate(newType);
    setMonthlyRate(suggested);
  };

  const openEditForm = (sub: ParkingSubscriber) => {
    setEditingSubscriber(sub);
    setFullName(sub.fullName || '');
    setDocumentId(sub.documentId || '');
    setPhone(sub.phone || '');
    setEmail(sub.email || '');
    setPlate(sub.plate || '');
    setVehicleType(sub.vehicleType || availableCategories[0]?.id || 'car');
    setMonthlyRate(sub.monthlyRate || getEstimatedMonthlyRate(sub.vehicleType || 'car'));
    setStartDate(sub.startDate || '');
    setEndDate(sub.endDate || '');
    setAssignedSpotCode(sub.assignedSpotCode || '');
    setNotes(sub.notes || '');
    setPaymentMethod(sub.paymentMethod || 'cash');
    setVoucherNumber(sub.voucherNumber || (sub as any).details?.voucherNumber || '');
    setPrintReceiptOnSave(false);
    setIsFormOpen(true);
  };

  const handleSaveSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !plate.trim()) {
      alert('Por favor completa el nombre completo y la placa del vehículo.');
      return;
    }

    setIsSaving(true);
    const cleanPlate = plate.toUpperCase().trim();
    const selectedPayMeta = availablePaymentMethods.find(p => p.id === paymentMethod);
    const resolvedMethodKey = (selectedPayMeta?.methodKey || paymentMethod || 'cash') as PaymentMethod;
    const paymentRef = selectedPayMeta && selectedPayMeta.id !== resolvedMethodKey ? selectedPayMeta.label : undefined;

    const subscriberPayload: ParkingSubscriber = {
      id: editingSubscriber ? editingSubscriber.id : `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fullName: fullName.trim(),
      documentId: documentId.trim(),
      phone: phone.trim(),
      email: email.trim(),
      plate: cleanPlate,
      vehicleType,
      monthlyRate: Number(monthlyRate) || 0,
      startDate,
      endDate,
      assignedSpotCode: assignedSpotCode.trim() || undefined,
      status: 'active',
      notes: notes.trim(),
      lastPaymentDate: new Date().toISOString(),
      paymentMethod: resolvedMethodKey,
      paymentReference: paymentRef,
      voucherNumber: isBankingPaymentMethod ? (voucherNumber.trim() || undefined) : undefined
    };

    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriber: subscriberPayload })
      });
      const data = await res.json();
      if (data.success) {
        setSaveToast(`¡Abonado ${cleanPlate} guardado exitosamente!`);
        setTimeout(() => setSaveToast(null), 3000);
        setIsFormOpen(false);
        fetchSubscribers();
        if (onSubscriberUpdated) onSubscriberUpdated();

        // Si se seleccionó imprimir comprobante de pago de mensualidad
        if (printReceiptOnSave) {
          handlePrintReceipt(subscriberPayload);
        }
      } else {
        alert(`Error al guardar abonado: ${data.error || 'Respuesta inválida del servidor'}`);
      }
    } catch (err: any) {
      alert(`Error de red al guardar abonado: ${err?.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRenew30Days = async (sub: ParkingSubscriber) => {
    if (!confirm(`¿Deseas renovar por 30 días la suscripción del vehículo ${sub.plate} (${sub.fullName}) por valor de ${formatCurrency(sub.monthlyRate)}?`)) {
      return;
    }

    // Calcular nueva fecha: si ya estaba vencido parte de hoy, si no, extiende desde el endDate actual
    const currentEnd = new Date(sub.endDate + 'T23:59:59');
    const baseDate = currentEnd.getTime() > Date.now() ? currentEnd : new Date();
    const newEnd = new Date(baseDate);
    newEnd.setDate(newEnd.getDate() + 30);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const newEndStr = `${newEnd.getFullYear()}-${pad(newEnd.getMonth() + 1)}-${pad(newEnd.getDate())}`;

    const updatedSub: ParkingSubscriber = {
      ...sub,
      endDate: newEndStr,
      status: 'active',
      lastPaymentDate: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriber: updatedSub })
      });
      const data = await res.json();
      if (data.success) {
        setSaveToast(`¡Suscripción de ${sub.plate} renovada hasta ${newEndStr}!`);
        setTimeout(() => setSaveToast(null), 3500);
        fetchSubscribers();
        if (onSubscriberUpdated) onSubscriberUpdated();
        handlePrintReceipt(updatedSub);
      }
    } catch (err) {
      console.warn('Error renovando abonado:', err);
    }
  };

  const handleDeleteSubscriber = async (id: string, plateStr: string) => {
    if (!confirm(`¿Estás seguro de eliminar el registro del abonado ${plateStr}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/subscribers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSaveToast(`Abonado ${plateStr} eliminado.`);
        setTimeout(() => setSaveToast(null), 3000);
        fetchSubscribers();
        if (onSubscriberUpdated) onSubscriberUpdated();
      }
    } catch (err) {
      console.warn('Error al eliminar abonado:', err);
    }
  };

  // Impresión térmica de comprobante de mensualidad
  const handlePrintReceipt = async (sub: ParkingSubscriber) => {
    try {
      const payDisplay = getPaymentMethodDisplay(sub.paymentMethod);
      const isCash = sub.paymentMethod === 'cash' || String(sub.paymentMethod).toLowerCase().includes('efectivo');
      const voucherText = sub.voucherNumber ? `\nDoc. Bancario / Voucher: #${sub.voucherNumber}` : '';
      const refText = sub.paymentReference ? `\nSoporte: ${sub.paymentReference}` : '';

      const dummyTicket: any = {
        id: `tkt_sub_${sub.id}`,
        ticketNumber: `SUB-${sub.plate}`,
        plate: sub.plate,
        vehicleType: sub.vehicleType,
        spotCode: sub.assignedSpotCode || 'ABONADO',
        entryTime: sub.startDate,
        exitTime: sub.endDate,
        totalMinutes: 30 * 24 * 60,
        baseAmount: sub.monthlyRate,
        totalAmount: sub.monthlyRate,
        paymentMethod: sub.paymentMethod || 'cash',
        cashReceived: sub.monthlyRate,
        changeGiven: 0,
        status: 'paid',
        subscriberInfo: {
          fullName: sub.fullName,
          documentId: sub.documentId,
          phone: sub.phone,
          startDate: sub.startDate,
          endDate: sub.endDate,
          vehicleCategoryName: getCategoryName(sub.vehicleType),
          paymentMethodDisplay: payDisplay,
          voucherNumber: sub.voucherNumber,
          paymentReference: sub.paymentReference,
          assignedSpotCode: sub.assignedSpotCode
        }
      };

      const result = await printInstantThermal({
        type: 'exit_receipt',
        ticket: dummyTicket,
        businessInfo: {
          ...businessInfo,
          ticketFooter: `COMPROBANTE DE SUSCRIPCIÓN MENSUAL\nTitular: ${sub.fullName}\nDocumento: ${sub.documentId}\nVehículo: ${getCategoryName(sub.vehicleType)} - Placa: ${sub.plate}\nMedio de Pago: ${payDisplay}${voucherText}${refText}\nVigencia: ${sub.startDate} hasta ${sub.endDate}\n¡Gracias por preferirnos!`
        },
        paperWidth: businessInfo.defaultPaperWidth || '80mm',
        autoCut: businessInfo.cutPaperOnPrint ?? true,
        openDrawer: isCash && (businessInfo.openCashDrawerOnCashPayment ?? true)
      });

      if (result.success) {
        setSaveToast(`¡Comprobante de ${sub.plate} impreso en '${result.printerName}'!`);
        setTimeout(() => setSaveToast(null), 3500);
      }
    } catch (err) {
      console.warn('Error imprimiendo comprobante de abonado:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                  Mensualidades y Abonados
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                  Suscripciones Activas
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Control de vehículos con pago mensual recurrente y acceso autorizado sin cobro por hora
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openNewForm}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Abonado</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {saveToast && (
          <div className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{saveToast}</span>
            </div>
            <button type="button" onClick={() => setSaveToast(null)} className="cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="p-4 bg-slate-100/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Abonados</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Al Día (Activos)</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Por Vencer (≤3 d)</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.expiringSoon}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Vencidos</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.expired}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Recaudo Mensual</span>
            <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1 truncate">
              {formatCurrency(stats.projectedRevenue)}
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por placa, cédula o nombre..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              Todos ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white border-transparent shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              Al Día ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('expiring_soon')}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                statusFilter === 'expiring_soon'
                  ? 'bg-amber-500 text-slate-950 border-transparent shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              Por Vencer ({stats.expiringSoon})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('expired')}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                statusFilter === 'expired'
                  ? 'bg-rose-600 text-white border-transparent shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              Vencidos ({stats.expired})
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
              Cargando abonados...
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold">No se encontraron abonados registrados.</p>
              <button
                type="button"
                onClick={openNewForm}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Registrar primer abonado
              </button>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Placa / Vehículo</th>
                    <th className="py-3 px-3">Titular & Contacto</th>
                    <th className="py-3 px-3">Plaza</th>
                    <th className="py-3 px-3">Vigencia</th>
                    <th className="py-3 px-3">Tarifa Mes</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredSubscribers.map((sub) => {
                    const isExpiring = sub.status === 'expiring_soon';
                    const isExpired = sub.status === 'expired';

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm px-2.5 py-1 bg-amber-400 text-slate-950 rounded-md border border-slate-800 shadow-xs tracking-wider">
                              {sub.plate}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {getCategoryName(sub.vehicleType)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">{sub.fullName}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                            {sub.documentId && <span>CC: {sub.documentId}</span>}
                            {sub.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3 inline" /> {sub.phone}</span>}
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              {getPaymentMethodDisplay(sub.paymentMethod)}
                            </span>
                            {sub.voucherNumber && (
                              <span className="text-[10px] font-mono font-bold text-sky-700 dark:text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 flex items-center gap-1" title="Documento bancario / Voucher de la transacción">
                                <Receipt className="w-3 h-3 inline text-sky-500" /> #{sub.voucherNumber}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {sub.assignedSpotCode ? (
                            <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                              {sub.assignedSpotCode}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Flotante</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono text-slate-800 dark:text-slate-200">
                            Hasta: <strong>{sub.endDate}</strong>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Inició: {sub.startDate}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold font-mono text-slate-900 dark:text-white">
                          {formatCurrency(sub.monthlyRate)}
                        </td>
                        <td className="py-3 px-3">
                          {isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3 h-3" />
                              Vencido
                            </span>
                          ) : isExpiring ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              Por vencer
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Al día
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRenew30Days(sub)}
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
                              title="Renovar suscripción (+30 días)"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintReceipt(sub)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                              title="Reimprimir comprobante de mensualidad"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(sub)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                              title="Editar abonado"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubscriber(sub.id, sub.plate)}
                              className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                              title="Eliminar abonado"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs shrink-0">
          <span className="text-slate-500">
            Total en vista: <strong className="text-slate-900 dark:text-white">{filteredSubscribers.length}</strong> abonados
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-bold transition-all cursor-pointer shadow-xs"
          >
            Cerrar
          </button>
        </div>

      </div>

      {/* Form Modal for Create / Edit */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>{editingSubscriber ? 'Editar Abonado' : 'Registrar Nuevo Abonado'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscriber} className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Placa del Vehículo *
                  </label>
                  <input
                    type="text"
                    required
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Tipo de Vehículo
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => handleVehicleTypeChange(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    {vehicleType && !availableCategories.some(c => c.id === vehicleType) && (
                      <option value={vehicleType}>{vehicleType} (Personalizado)</option>
                    )}
                    {availableCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} {cat.code ? `(${cat.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Nombre Completo del Titular *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ej. Juan Pérez Gómez"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Cédula / Documento
                  </label>
                  <input
                    type="text"
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    placeholder="ej. 10203040"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Teléfono Celular
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="ej. 3101234567"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Fecha Inicio (Desde)
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Fecha Vencimiento (Hasta)
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Tarifa Mensual ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={monthlyRate}
                    onChange={(e) => setMonthlyRate(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Medio de Pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    {paymentMethod && !availablePaymentMethods.some(p => p.id === paymentMethod) && (
                      <option value={paymentMethod}>{getPaymentMethodDisplay(paymentMethod)}</option>
                    )}
                    {Array.from(new Set(availablePaymentMethods.map(p => p.category))).map(catGroup => (
                      <optgroup key={catGroup} label={`--- ${catGroup} ---`} className="bg-slate-100 dark:bg-slate-800 font-extrabold text-slate-800 dark:text-slate-200">
                        {availablePaymentMethods.filter(p => p.category === catGroup).map(opt => (
                          <option key={opt.id} value={opt.id} className="bg-white dark:bg-slate-900 font-medium text-slate-900 dark:text-slate-100">
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {/* Campo para Documento Bancario / Voucher / Referencia cuando se escoge un medio electrónico o bancario */}
              {isBankingPaymentMethod && (
                <div className="p-3 bg-sky-500/10 dark:bg-sky-950/30 border border-sky-500/30 rounded-xl space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-sky-900 dark:text-sky-300 text-xs sm:text-sm flex items-center gap-1.5">
                      <voucherFieldMeta.icon className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span>{voucherFieldMeta.title} *</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 uppercase tracking-wide">
                      {voucherFieldMeta.badge}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={voucherNumber}
                      onChange={(e) => setVoucherNumber(e.target.value)}
                      placeholder={voucherFieldMeta.placeholder}
                      className="w-full p-2 pl-8 bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700/60 rounded-lg text-slate-900 dark:text-white font-mono font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                    />
                    <Hash className="w-3.5 h-3.5 text-sky-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-sky-800/80 dark:text-sky-300/80 flex items-center gap-1">
                    <span className="font-semibold">Soporte Auditoría:</span> {voucherFieldMeta.helper}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Plaza Fija Asignada (Opcional)
                </label>
                <select
                  value={assignedSpotCode}
                  onChange={(e) => setAssignedSpotCode(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- Sin plaza fija (Plaza flotante en patio) --</option>
                  {spots.map(s => (
                    <option key={s.id} value={s.code}>
                      Plaza {s.code} ({s.type}) - {s.status === 'available' ? 'Disponible' : 'Ocupada'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Print Receipt Toggle */}
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printReceiptOnSave}
                  onChange={(e) => setPrintReceiptOnSave(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
                <div className="text-[11px] leading-tight">
                  <span className="font-bold text-slate-900 dark:text-white block">Imprimir comprobante térmico</span>
                  <span className="text-slate-400">Genera recibo físico con corte y apertura de gaveta</span>
                </div>
              </label>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : editingSubscriber ? 'Actualizar Abonado' : 'Guardar Abonado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
