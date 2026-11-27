/**
 * Patio POS — vista nueva (rediseño "Taquilla Clara", modo claro y oscuro).
 *
 * Cubre el flujo diario: entrada, salida y cobro en efectivo, tarjeta o transferencia.
 * Usa las MISMAS reglas que la vista clásica (validación de placa, duplicados, abonados,
 * asignación de plaza, cálculo de tarifa, lector de código de barras, atajos e impresión) y
 * llama a las mismas funciones de la app (onRegisterEntry / onRegisterExit). Los casos
 * especiales (placa extranjera, descuentos, convenios, salida sin ticket, factura DIAN y otros
 * medios de pago) se abren en la vista clásica con "Más opciones".
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Banknote, Check, CreditCard, Landmark, MoreHorizontal, Printer, ScanLine, Search, X,
} from 'lucide-react';
import type {
  CommercialAgreement, ParkingBusinessInfo, ParkingSpot, ParkingSubscriber, ParkingTicket, PaymentGatewayConfig,
  PaymentMethod, PaymentTransactionDetails, RatesConfig, SystemUser, VehicleCategoryConfig, VehicleType, AgreementDiscountType,
} from '../../types';
import { calculateParkingFee, formatCurrency, formatPlate } from '../../utils/billing';
import { validatePlateData } from '../../utils/plateValidation';
import { playSound } from '../../utils/audio';
import { renderVehicleIcon } from '../../utils/vehicleIcons';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import {
  BasicPaymentMethod, buildBasicPaymentDetails, cashState, initialBasicMethod, listBankAccounts, listTerminals, quickCashOptions,
} from './patioPayments';

export interface PatioPosProps {
  spots: ParkingSpot[];
  activeTickets: ParkingTicket[];
  rates: RatesConfig;
  businessInfo: ParkingBusinessInfo;
  soundEnabled: boolean;
  onRegisterEntry: (ticketData: {
    plate: string; vehicleType: VehicleType; spotCode: string; notes?: string; isForeignPlate?: boolean; originCountry?: string;
  }) => ParkingTicket | null;
  onRegisterExit: (ticketId: string, billingDetails: {
    paymentMethod: PaymentMethod; cashReceived?: number; changeGiven?: number; discountAmount?: number;
    paymentDetails?: PaymentTransactionDetails; commercialAgreementId?: string; commercialAgreementName?: string;
    commercialAgreementSealOrVoucher?: string; commercialAgreementDiscountType?: AgreementDiscountType;
  }) => ParkingTicket | null;
  onPrintTicket: (ticket: ParkingTicket, mode: 'entry' | 'exit') => void;
  selectedPlateForExit?: string | null;
  onClearSelectedPlate?: () => void;
  currentUser?: SystemUser;
  paymentGatewayConfig: PaymentGatewayConfig;
  onOpenTicketScanner?: () => void;
  vehicleCategories?: VehicleCategoryConfig[];
  commercialAgreements?: CommercialAgreement[];
  /** Abre la vista clásica (opcionalmente con ese vehículo listo para cobrar). */
  onOpenClassic: (plateForExit?: string) => void;
  /** Plaza tocada en el mapa de plazas: se preselecciona para la entrada. */
  preselectedEntrySpot?: { spotCode: string; vehicleType: VehicleType } | null;
  onClearPreselectedEntrySpot?: () => void;
  /** Efecto cristal (opcional, por usuario). */
  glass?: boolean;
}

type Toast = { id: number; tone: 'ok' | 'warn'; title: string; body?: string };

const card = 'wz-surface rounded-[22px] border border-slate-900/[0.06] bg-gradient-to-b from-white to-slate-50/60 shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:border-white/[0.07] dark:from-slate-900 dark:to-slate-900/80 dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)]';
const statCard = 'wz-surface rounded-2xl border border-slate-900/[0.06] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] dark:border-white/[0.07] dark:bg-slate-900';
const muted = 'text-slate-600 dark:text-slate-400';
const kbd = 'rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-900 shadow-[0_2px_0_#cbd5e1] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:shadow-[0_2px_0_#334155]';
const chipBase = 'min-h-[52px] rounded-2xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30';
const chipOn = 'border-2 border-blue-700 bg-gradient-to-b from-blue-50 to-blue-100 text-blue-900 shadow-[0_8px_16px_-10px_rgba(29,78,216,.7)] dark:border-blue-400 dark:from-blue-500/20 dark:to-blue-500/10 dark:text-blue-100';
const chipOff = 'wz-tile border border-slate-200 bg-white text-slate-700 hover:-translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';

export const PatioPos: React.FC<PatioPosProps> = ({
  spots, activeTickets, rates, businessInfo, soundEnabled, onRegisterEntry, onRegisterExit, onPrintTicket,
  selectedPlateForExit, onClearSelectedPlate, currentUser, paymentGatewayConfig, onOpenTicketScanner,
  vehicleCategories = [], onOpenClassic, preselectedEntrySpot, onClearPreselectedEntrySpot, glass = false,
}) => {
  const reduceMotion = useReducedMotion();
  const canEnter = !currentUser || currentUser.permissions.canRegisterEntry !== false;
  const canExit = !currentUser || currentUser.permissions.canRegisterExit !== false;
  const canReprint = currentUser?.permissions?.canReprintTickets !== false;
  const money = (n: number) => formatCurrency(n, rates.currencySymbol);

  // ---------- Avisos ----------
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = (t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4200);
  };

  // ---------- Categorías (mismas reglas que la vista clásica) ----------
  const categories = useMemo(() => {
    const active = vehicleCategories.filter(vc => vc.isActive !== false && vc.enabled !== false);
    if (active.length > 0) {
      return active.map(vc => ({ id: vc.id as VehicleType, name: vc.name, icon: vc.icon || 'Car' }));
    }
    return [
      { id: 'car' as VehicleType, name: 'Carro / Auto', icon: 'Car' },
      { id: 'motorcycle' as VehicleType, name: 'Motocicleta', icon: 'Bike' },
      { id: 'suv' as VehicleType, name: 'Camioneta / SUV', icon: 'Truck' },
      { id: 'bicycle' as VehicleType, name: 'Bicicleta', icon: 'Bike' },
    ];
  }, [vehicleCategories]);

  // ---------- Entrada ----------
  const [entryPlate, setEntryPlate] = useState('');
  const [entryType, setEntryType] = useState<VehicleType>(() => categories[0]?.id || 'car');
  const [entrySpot, setEntrySpot] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [entryError, setEntryError] = useState<string | null>(null);
  const [submittingEntry, setSubmittingEntry] = useState(false);
  const [lastEntryTicket, setLastEntryTicket] = useState<ParkingTicket | null>(null);
  const plateRef = useRef<HTMLInputElement>(null);

  const entryCategory = categories.find(c => c.id === entryType) || categories[0];
  const validation = useMemo(
    () => validatePlateData(entryPlate, false, '', '', entryType, entryCategory?.name),
    [entryPlate, entryType, entryCategory],
  );
  const cleanPlate = validation.cleanPlate;
  const duplicate = useMemo(() => {
    if (!cleanPlate || cleanPlate.length < 3) return null;
    return activeTickets.find(t => formatPlate(t.plate) === cleanPlate || t.plate.toUpperCase().trim() === cleanPlate) || null;
  }, [cleanPlate, activeTickets]);

  const availableSpots = useMemo(() => {
    const dedicated = spots.filter(s => s.type === entryType && s.status === 'available');
    return dedicated.length > 0 ? dedicated : spots.filter(s => s.status === 'available');
  }, [spots, entryType]);

  useEffect(() => {
    if (availableSpots.length === 0) setEntrySpot('');
    else if (!availableSpots.some(s => s.code === entrySpot)) setEntrySpot(availableSpots[0].code);
  }, [availableSpots, entrySpot]);

  // Plaza elegida desde el mapa de plazas
  useEffect(() => {
    if (!preselectedEntrySpot) return;
    if (categories.some(cat => cat.id === preselectedEntrySpot.vehicleType)) setEntryType(preselectedEntrySpot.vehicleType);
    setEntrySpot(preselectedEntrySpot.spotCode);
    onClearPreselectedEntrySpot?.();
    setTimeout(() => plateRef.current?.focus(), 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedEntrySpot]);

  // Abonados (misma consulta que la vista clásica)
  const [entrySubscriber, setEntrySubscriber] = useState<ParkingSubscriber | null>(null);
  useEffect(() => {
    if (!cleanPlate || cleanPlate.length < 4) { setEntrySubscriber(null); return; }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/subscribers/check/${encodeURIComponent(cleanPlate)}`)
        .then(r => r.json())
        .then(data => {
          if (cancelled) return;
          const sub = data?.isSubscriber ? (data.subscriber as ParkingSubscriber) : null;
          setEntrySubscriber(sub);
          if (sub?.assignedSpotCode) setEntrySpot(prev => prev || sub.assignedSpotCode!);
        })
        .catch(() => { if (!cancelled) setEntrySubscriber(null); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [cleanPlate]);

  const submitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEnter || submittingEntry) return;
    setEntryError(null);
    const clean = formatPlate(entryPlate);
    const fail = (msg: string) => { setEntryError(msg); playSound('alert', soundEnabled); plateRef.current?.focus(); };
    if (!clean) return fail('Digite la placa del vehículo para registrar su entrada.');
    if (!validation.isValid) return fail(validation.errorMessage || `La placa '${clean}' no tiene un formato válido.`);
    const parked = activeTickets.find(t => formatPlate(t.plate) === clean || t.plate.toUpperCase().trim() === clean);
    if (parked) return fail(`${clean} ya está dentro del parqueadero (ticket #${parked.ticketNumber || 'N/A'}, plaza ${parked.spotCode}).`);
    const spot = entrySpot || availableSpots[0]?.code || '';
    if (!spot) return fail('No hay plazas disponibles para este tipo de vehículo.');

    const subNote = entrySubscriber
      ? `[Abonado Mensual: ${entrySubscriber.fullName} - Vigencia: ${new Date(entrySubscriber.endDate).toLocaleDateString('es-CO')}]`
      : '';
    const notes = [entryNotes.trim(), subNote].filter(Boolean).join(' ') || undefined;

    try {
      setSubmittingEntry(true);
      const ticket = onRegisterEntry({ plate: clean, vehicleType: entryType, spotCode: spot, notes, isForeignPlate: false });
      if (!ticket) return fail(`No se pudo registrar la entrada de '${clean}'.`);
      playSound('success', soundEnabled);
      setLastEntryTicket(ticket);
      setEntryPlate('');
      setEntryNotes('');
      toast({ tone: 'ok', title: 'Entrada registrada', body: `${clean} · Plaza ${spot} · Ticket #${ticket.ticketNumber}` });
      if (businessInfo.autoPrintOnEntry !== false && !businessInfo.silentBackgroundPrint) onPrintTicket(ticket, 'entry');
      plateRef.current?.focus();
    } catch (err: any) {
      fail(`Error registrando la entrada: ${err?.message || 'error del sistema'}`);
    } finally {
      setSubmittingEntry(false);
    }
  };

  // ---------- Salida ----------
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ParkingTicket | null>(null);
  const [method, setMethod] = useState<BasicPaymentMethod>(() => initialBasicMethod(paymentGatewayConfig));
  const [cashInput, setCashInput] = useState('');
  const [cardType, setCardType] = useState<'debit' | 'credit'>('debit');
  const [reference, setReference] = useState('');
  const terminals = useMemo(() => listTerminals(paymentGatewayConfig), [paymentGatewayConfig]);
  const accounts = useMemo(() => listBankAccounts(paymentGatewayConfig), [paymentGatewayConfig]);
  const [terminalId, setTerminalId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [exitError, setExitError] = useState<string | null>(null);
  const [submittingExit, setSubmittingExit] = useState(false);
  const [lastPaid, setLastPaid] = useState<ParkingTicket | null>(null);
  const [exitSubscriber, setExitSubscriber] = useState<ParkingSubscriber | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const cashRef = useRef<HTMLInputElement>(null);

  const [tick, setTick] = useState(0);
  useEffect(() => { const i = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(i); }, []);
  const calc = useMemo(() => {
    if (!selected) return null;
    return calculateParkingFee(selected.entryTime, new Date().toISOString(), selected.vehicleType, rates, vehicleCategories);
  }, [selected, rates, vehicleCategories, tick]);
  const total = Math.max(0, calc?.totalAmount || 0);
  const cash = cashState(total, cashInput, method);

  const results = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return [];
    return activeTickets.filter(t => t.plate.toUpperCase().includes(q) || t.ticketNumber.toUpperCase().includes(q) || t.spotCode.toUpperCase().includes(q)).slice(0, 6);
  }, [query, activeTickets]);

  const selectTicket = (t: ParkingTicket) => {
    setSelected(t);
    setQuery(t.plate);
    setCashInput('');
    setReference('');
    setMethod(initialBasicMethod(paymentGatewayConfig));
    setExitError(null);
    playSound('beep', soundEnabled);
    setTimeout(() => cashRef.current?.focus(), 120);
  };
  const clearExit = () => { setSelected(null); setQuery(''); setCashInput(''); setReference(''); setExitError(null); };

  // Vehículo elegido desde el mapa de plazas
  useEffect(() => {
    if (!selectedPlateForExit) return;
    const match = activeTickets.find(t => t.plate.toUpperCase() === selectedPlateForExit.toUpperCase());
    if (match) selectTicket(match);
    onClearSelectedPlate?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlateForExit, activeTickets]);

  useEffect(() => {
    if (!selected?.plate) { setExitSubscriber(null); return; }
    let cancelled = false;
    fetch(`/api/subscribers/check/${encodeURIComponent(formatPlate(selected.plate))}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setExitSubscriber(d?.isSubscriber ? d.subscriber : null); })
      .catch(() => { if (!cancelled) setExitSubscriber(null); });
    return () => { cancelled = true; };
  }, [selected?.plate]);

  // Lector de código de barras (mismo hook que la vista clásica)
  useBarcodeScanner({
    activeTickets,
    onTicketFound: (t) => { setEntryPlate(''); plateRef.current?.blur(); selectTicket(t); toast({ tone: 'ok', title: `Ticket #${t.ticketNumber} escaneado`, body: t.plate }); },
    onTicketAlreadyPaid: (t) => { setExitError(`El ticket #${t.ticketNumber} (${t.plate}) ya fue pagado.`); },
    onTicketNotFound: (code) => { setExitError(`Código "${code}" no encontrado en los tickets activos.`); },
    enabled: true,
  });

  const submitExit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canExit || submittingExit || !selected || !calc) return;
    if (cash.blocked) {
      setExitError(cashInput.trim() ? `Faltan ${money(cash.shortage)} para completar el pago.` : 'Digite el efectivo recibido o elija un billete.');
      playSound('alert', soundEnabled);
      cashRef.current?.focus();
      return;
    }
    setSubmittingExit(true);
    setExitError(null);
    try {
      const received = parseFloat(cashInput) || 0;
      const paymentDetails = buildBasicPaymentDetails({ method, config: paymentGatewayConfig, cardType, reference, terminalId, bankAccountId: accountId });
      const paid = onRegisterExit(selected.id, {
        paymentMethod: method,
        cashReceived: method === 'cash' ? received : undefined,
        changeGiven: method === 'cash' ? cash.change : undefined,
        paymentDetails,
      });
      if (!paid) { setExitError('No se pudo registrar la salida. Intente de nuevo.'); playSound('alert', soundEnabled); return; }
      setLastPaid(paid);
      playSound('cash', soundEnabled);
      toast({ tone: 'ok', title: `Cobrado ${money(total)}`, body: `${selected.plate} · Plaza ${selected.spotCode} liberada${method === 'cash' && cash.change > 0 ? ` · Vueltos ${money(cash.change)}` : ''}` });
      if (businessInfo.autoPrintOnExit && !businessInfo.silentBackgroundPrint) onPrintTicket(paid, 'exit');
      clearExit();
      setTimeout(() => searchRef.current?.focus(), 120);
    } finally {
      setSubmittingExit(false);
    }
  };

  // Atajos: F2 entrada, F3 salida, F4 escáner, F8 reimprimir (igual que la vista clásica)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); plateRef.current?.focus(); }
      else if (e.key === 'F3') { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === 'F4') { e.preventDefault(); onOpenTicketScanner?.(); }
      else if (e.key === 'F8' && canReprint) {
        const t = lastPaid || lastEntryTicket;
        if (t) { e.preventDefault(); onPrintTicket(t, lastPaid ? 'exit' : 'entry'); playSound('beep', soundEnabled); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lastPaid, lastEntryTicket, canReprint, onPrintTicket, onOpenTicketScanner, soundEnabled]);

  // ---------- Indicadores ----------
  const totalSpots = spots.length;
  const freeSpots = spots.filter(s => s.status === 'available').length;
  const ringC = 2 * Math.PI * 21;
  const entryRate = (rates as any)[entryType]?.hourRate as number | undefined;
  const rise = (i: number) => reduceMotion ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: 0.05 * i, ease: [0.2, 0.8, 0.2, 1] as any } };

  const plateShown = (selected?.plate || '').toUpperCase();

  return (
    <div className={`wz-patio-root relative flex min-h-full flex-col gap-4 ${glass ? 'wz-glass' : ''} bg-[radial-gradient(900px_500px_at_78%_-10%,#dbe6ff_0%,transparent_60%),radial-gradient(700px_420px_at_0%_110%,#e3f5ee_0%,transparent_60%)] p-4 font-sans text-slate-900 dark:bg-[radial-gradient(900px_500px_at_78%_-10%,rgba(37,99,235,.18)_0%,transparent_60%),radial-gradient(700px_420px_at_0%_110%,rgba(16,185,129,.12)_0%,transparent_60%)] dark:text-slate-100 md:p-6`}>

      {/* Avisos */}
      <div aria-live="polite" className="pointer-events-none fixed right-6 top-20 z-50 flex w-[min(380px,calc(100vw-3rem))] flex-col gap-2">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} role="status"
              initial={reduceMotion ? false : { opacity: 0, y: -14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}
              className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-[0_18px_40px_-12px_rgba(15,23,42,.45)] dark:bg-white dark:text-slate-900">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${t.tone === 'ok' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                {t.tone === 'ok' ? <Check className="h-4 w-4 text-white" strokeWidth={3} /> : <AlertTriangle className="h-4 w-4 text-white" />}
              </span>
              <div className="min-w-0"><div className="text-sm font-bold">{t.title}</div>{t.body && <div className="truncate text-[13px] text-slate-300 dark:text-slate-600">{t.body}</div>}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <motion.div {...rise(1)} className={`${statCard} flex items-center gap-3.5`}>
          <svg width="52" height="52" viewBox="0 0 52 52" role="img" aria-label={`${freeSpots} plazas libres de ${totalSpots}`}>
            <circle cx="26" cy="26" r="21" fill="none" strokeWidth="7" className="stroke-slate-200 dark:stroke-slate-700" />
            <circle cx="26" cy="26" r="21" fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-blue-700 transition-[stroke-dashoffset] duration-700 dark:stroke-blue-400"
              strokeDasharray={ringC} strokeDashoffset={totalSpots ? ringC * (1 - freeSpots / totalSpots) : ringC} transform="rotate(-90 26 26)" />
          </svg>
          <div className="min-w-0"><div className={`text-[13px] ${muted}`}>Plazas libres</div><div className="whitespace-nowrap font-display text-[26px] font-bold leading-tight">{freeSpots} <span className={`text-sm font-medium ${muted}`}>de {totalSpots}</span></div></div>
        </motion.div>
        <motion.div {...rise(2)} className={statCard}>
          <div className={`text-[13px] ${muted}`}>En patio</div>
          <div className="mt-1 font-display text-[26px] font-bold leading-tight">{activeTickets.length}</div>
        </motion.div>
        <motion.div {...rise(3)} className={statCard}>
          <div className={`text-[13px] ${muted}`}>Tarifa {entryCategory?.name?.toLowerCase()}</div>
          <div className="mt-1 font-display text-[26px] font-bold leading-tight">{entryRate ? money(entryRate) : '—'} <span className={`text-sm font-medium ${muted}`}>/ hora</span></div>
        </motion.div>
        <motion.div {...rise(4)} className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 px-4 py-3.5 text-white shadow-[0_14px_28px_-16px_rgba(15,23,42,.7)] dark:from-slate-800 dark:to-slate-900 dark:ring-1 dark:ring-white/10">
          <div><div className="text-[13px] text-slate-300">Último ticket</div><div className="mt-1 font-display text-lg font-bold">{(lastPaid || lastEntryTicket) ? `#${(lastPaid || lastEntryTicket)!.ticketNumber}` : '—'}</div></div>
          {canReprint && (lastPaid || lastEntryTicket) && (
            <button type="button" onClick={() => { const t = lastPaid || lastEntryTicket!; onPrintTicket(t, lastPaid ? 'exit' : 'entry'); }}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-semibold hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30">
              <Printer className="h-4 w-4" /> Reimprimir <span className="text-xs text-slate-300">F8</span>
            </button>
          )}
        </motion.div>
      </div>

      <div className="grid flex-1 gap-5 xl:grid-cols-2">

        {/* ENTRADA */}
        <motion.section {...rise(5)} aria-labelledby="patio-entrada" className={`${card} flex flex-col gap-4 p-6 shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(29,78,216,.35)]`}>
          <div className="flex items-center justify-between">
            <h2 id="patio-entrada" className="flex items-center gap-2.5 font-display text-[22px] font-bold">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_8px_16px_-8px_rgba(29,78,216,.8)]"><ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.5} /></span>
              Entrada
            </h2>
            <kbd className={kbd}>F2</kbd>
          </div>

          {!canEnter ? (
            <p className={`rounded-2xl bg-slate-100 p-4 text-sm dark:bg-slate-800 ${muted}`}>Su usuario no tiene permiso para registrar entradas.</p>
          ) : (
            <form onSubmit={submitEntry} className="flex flex-1 flex-col gap-4">
              <div role="radiogroup" aria-label="Tipo de vehículo" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {categories.map(c => (
                  <button key={c.id} type="button" role="radio" aria-checked={entryType === c.id} onClick={() => setEntryType(c.id)}
                    className={`${chipBase} flex items-center justify-center gap-2 ${entryType === c.id ? chipOn : chipOff}`}>
                    {renderVehicleIcon(c.icon, 'h-4 w-4', vehicleCategories)}<span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>

              <label htmlFor="patio-placa" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Placa</label>
              <div className="relative flex flex-col items-center gap-1 rounded-2xl border-[3px] border-slate-900 bg-gradient-to-b from-[#ffe066] via-[#f5c400] to-[#e2b300] px-4 pb-3 pt-4 shadow-[0_14px_26px_-14px_rgba(120,90,0,.8),inset_0_2px_0_rgba(255,255,255,.6),inset_0_-3px_0_rgba(0,0,0,.12)]">
                <span aria-hidden className="absolute left-3 top-2.5 h-2 w-2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff,#94a3b8)]" />
                <span aria-hidden className="absolute right-3 top-2.5 h-2 w-2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff,#94a3b8)]" />
                <span className="text-[11px] font-bold tracking-[0.22em] text-slate-900">COLOMBIA</span>
                <input id="patio-placa" ref={plateRef} value={entryPlate} autoComplete="off" spellCheck={false}
                  onChange={e => { setEntryPlate(e.target.value.toUpperCase()); setEntryError(null); }}
                  placeholder="ABC123" aria-invalid={!!entryError || (!!cleanPlate && !validation.isValid)}
                  className="wz-plate-input w-full bg-transparent text-center font-plate text-[64px] font-bold leading-none tracking-[0.08em] text-slate-900 outline-none placeholder:text-slate-900/25 [text-shadow:0_1px_0_rgba(255,255,255,.5),0_-1px_0_rgba(0,0,0,.25)]" />
                <span className="text-[10px] font-bold tracking-[0.18em] text-slate-900">{(businessInfo.name || 'WOLFZONE').toUpperCase()}</span>
              </div>

              <div className="min-h-[24px] text-sm" aria-live="polite">
                {entryError ? (
                  <span className="flex items-start gap-2 font-medium text-red-700 dark:text-red-400"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{entryError}</span>
                ) : duplicate ? (
                  <span className="flex items-start gap-2 font-medium text-amber-800 dark:text-amber-300"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Ya está en el patio: ticket #{duplicate.ticketNumber}, plaza {duplicate.spotCode}</span>
                ) : cleanPlate && validation.isValid ? (
                  <span className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300"><Check className="h-4 w-4" strokeWidth={3} />Formato válido{entrySubscriber ? ` · Abonado: ${entrySubscriber.fullName}` : ''}</span>
                ) : cleanPlate ? (
                  <span className={muted}>{validation.errorMessage || 'Siga digitando la placa…'}</span>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">Plaza
                  <select value={entrySpot} onChange={e => setEntrySpot(e.target.value)}
                    className="min-h-[48px] rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                    {availableSpots.length === 0 && <option value="">Sin plazas libres</option>}
                    {availableSpots.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">Observaciones (opcional)
                  <input value={entryNotes} onChange={e => setEntryNotes(e.target.value)} placeholder="Ej.: casco en manillar"
                    className="min-h-[48px] rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                </label>
              </div>

              <button type="button" onClick={() => onOpenClassic()} className="self-start text-sm font-medium text-blue-700 underline-offset-4 hover:underline dark:text-blue-300">
                Placa extranjera u otras opciones → vista clásica
              </button>

              <button type="submit" disabled={submittingEntry || availableSpots.length === 0}
                className="mt-auto min-h-[64px] rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 text-lg font-bold text-white shadow-[0_14px_28px_-12px_rgba(29,78,216,.75),inset_0_1px_0_rgba(255,255,255,.3)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40">
                {submittingEntry ? 'Registrando…' : 'Registrar entrada e imprimir · Enter'}
              </button>
            </form>
          )}
        </motion.section>

        {/* SALIDA */}
        <motion.section {...rise(6)} aria-labelledby="patio-salida" className={`${card} flex flex-col gap-4 p-6 shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(4,120,87,.35)]`}>
          <div className="flex items-center justify-between">
            <h2 id="patio-salida" className="flex items-center gap-2.5 font-display text-[22px] font-bold">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_8px_16px_-8px_rgba(4,120,87,.8)]"><ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.5} /></span>
              Salida y cobro
            </h2>
            <div className="flex items-center gap-2"><kbd className={kbd}>F3</kbd>{onOpenTicketScanner && <button type="button" onClick={onOpenTicketScanner} aria-label="Abrir escáner de tickets (F4)" className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><ScanLine className="h-5 w-5" /></button>}</div>
          </div>

          {!canExit ? (
            <p className={`rounded-2xl bg-slate-100 p-4 text-sm dark:bg-slate-800 ${muted}`}>Su usuario no tiene permiso para registrar salidas.</p>
          ) : (
            <form onSubmit={submitExit} className="flex flex-1 flex-col gap-4">
              <label htmlFor="patio-buscar" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ticket, placa o plaza</label>
              <div className="relative">
                <div className="flex min-h-[56px] items-center gap-2.5 rounded-2xl border-2 border-blue-700 bg-white px-4 shadow-[0_0_0_4px_rgba(29,78,216,.12)] dark:border-blue-400 dark:bg-slate-800">
                  <Search className={`h-5 w-5 ${muted}`} aria-hidden />
                  <input id="patio-buscar" ref={searchRef} value={query} autoComplete="off" spellCheck={false}
                    onChange={e => { setQuery(e.target.value.toUpperCase()); if (selected) setSelected(null); setExitError(null); }}
                    onKeyDown={e => { if (e.key === 'Enter' && !selected && results.length > 0) { e.preventDefault(); selectTicket(results[0]); } }}
                    placeholder="Escanee o digite…" className="min-w-0 flex-1 bg-transparent text-xl font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 dark:text-slate-100" />
                  {(query || selected) && <button type="button" onClick={clearExit} aria-label="Limpiar búsqueda" className={`flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 ${muted}`}><X className="h-4 w-4" /></button>}
                </div>
                {!selected && results.length > 0 && (
                  <ul role="listbox" aria-label="Vehículos encontrados" className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                    {results.map(t => (
                      <li key={t.id}>
                        <button type="button" onClick={() => selectTicket(t)} className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 text-left hover:bg-blue-50 dark:hover:bg-slate-700">
                          <span className="font-plate text-2xl font-bold tracking-wider">{t.plate}</span>
                          <span className={`text-sm ${muted}`}>Plaza {t.spotCode} · #{t.ticketNumber}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <AnimatePresence mode="wait">
                {selected && calc ? (
                  <motion.div key={selected.id} initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-lg bg-[#f5c400] px-3 py-1 font-plate text-2xl font-bold tracking-[0.08em] text-slate-900 shadow-[inset_0_-2px_0_rgba(0,0,0,.12)]">{plateShown}</span>
                      <span className={`text-sm ${muted}`}>Ticket #{selected.ticketNumber}{exitSubscriber ? ` · Abonado: ${exitSubscriber.fullName}` : ''}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[['Plaza', selected.spotCode], ['Ingreso', new Date(selected.entryTime).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })], ['Tiempo', calc.formattedDuration]].map(([k, v]) => (
                        <div key={k} className="rounded-2xl border border-slate-900/5 bg-slate-50 px-3.5 py-3 dark:border-white/5 dark:bg-slate-800/70"><div className={`text-xs ${muted}`}>{k}</div><div className="text-lg font-bold">{v}</div></div>
                      ))}
                    </div>
                    <div className="flex items-baseline justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                      <span className="font-semibold text-emerald-900 dark:text-emerald-200">Total a cobrar</span>
                      <motion.span key={total} initial={reduceMotion ? false : { scale: 0.96, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-[44px] font-bold leading-none text-emerald-950 dark:text-emerald-50">{money(total)}</motion.span>
                    </div>

                    <div role="radiogroup" aria-label="Medio de pago" className="grid grid-cols-3 gap-2.5">
                      {([['cash', 'Efectivo', Banknote], ['card', 'Tarjeta', CreditCard], ['transfer', 'Transferencia', Landmark]] as const).map(([id, label, Icon]) => (
                        <button key={id} type="button" role="radio" aria-checked={method === id} onClick={() => { setMethod(id); setExitError(null); }}
                          className={`${chipBase} flex items-center justify-center gap-2 ${method === id ? 'border-2 border-slate-900 bg-white text-slate-900 shadow-[0_8px_16px_-10px_rgba(15,23,42,.6)] dark:border-white dark:bg-slate-800 dark:text-white' : chipOff}`}>
                          <Icon className="h-4 w-4" />{label}
                        </button>
                      ))}
                    </div>

                    {method === 'cash' && total > 0 && (
                      <div className="flex flex-col gap-2.5">
                        <div className="flex flex-wrap gap-2">
                          {quickCashOptions(total).map((v, i) => (
                            <button key={v} type="button" onClick={() => setCashInput(String(v))}
                              className={`min-h-[44px] rounded-xl border px-3.5 text-sm font-semibold transition ${String(v) === cashInput ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-800 hover:-translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'}`}>
                              {i === 0 ? `Exacto ${money(v)}` : money(v)}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <label htmlFor="patio-efectivo" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recibido</label>
                          <input id="patio-efectivo" ref={cashRef} inputMode="numeric" value={cashInput} onChange={e => setCashInput(e.target.value.replace(/[^0-9]/g, ''))}
                            className="min-h-[48px] w-40 rounded-xl border border-slate-200 bg-white px-3 text-lg font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                          {cashInput && (cash.shortage > 0
                            ? <span className="font-semibold text-red-700 dark:text-red-400">Faltan {money(cash.shortage)}</span>
                            : <span className="font-semibold text-emerald-800 dark:text-emerald-300">Vueltos {money(cash.change)}</span>)}
                        </div>
                      </div>
                    )}
                    {method === 'card' && (
                      <div className="grid gap-2.5 sm:grid-cols-3">
                        <select aria-label="Tipo de tarjeta" value={cardType} onChange={e => setCardType(e.target.value as 'debit' | 'credit')} className="min-h-[48px] rounded-xl border border-slate-200 bg-white px-3 font-semibold dark:border-slate-700 dark:bg-slate-800">
                          <option value="debit">Débito</option><option value="credit">Crédito</option>
                        </select>
                        {terminals.length > 1 ? (
                          <select aria-label="Datáfono" value={terminalId || terminals[0].id} onChange={e => setTerminalId(e.target.value)} className="min-h-[48px] rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-800">
                            {terminals.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        ) : <span className={`flex items-center text-sm ${muted}`}>{terminals[0]?.name}</span>}
                        <input aria-label="Referencia o voucher (opcional)" placeholder="Voucher (opcional)" value={reference} onChange={e => setReference(e.target.value)} className="min-h-[48px] rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-800" />
                      </div>
                    )}
                    {method === 'transfer' && (
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {accounts.length > 1 ? (
                          <select aria-label="Cuenta de destino" value={accountId || accounts[0].id} onChange={e => setAccountId(e.target.value)} className="min-h-[48px] rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-800">
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} · {a.accountNumber}</option>)}
                          </select>
                        ) : <span className={`flex items-center text-sm ${muted}`}>{accounts[0]?.bankName} · {accounts[0]?.accountNumber}</span>}
                        <input aria-label="Referencia de la transferencia (opcional)" placeholder="Referencia (opcional)" value={reference} onChange={e => setReference(e.target.value)} className="min-h-[48px] rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-800" />
                      </div>
                    )}

                    {exitError && <p role="alert" className="flex items-start gap-2 text-sm font-medium text-red-700 dark:text-red-400"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{exitError}</p>}

                    <button type="button" onClick={() => onOpenClassic(selected.plate)} className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-blue-700 underline-offset-4 hover:underline dark:text-blue-300">
                      <MoreHorizontal className="h-4 w-4" /> Más opciones: descuento, convenio, sin ticket, factura DIAN, otros medios
                    </button>

                    <button type="submit" disabled={submittingExit}
                      className="mt-auto min-h-[64px] rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 text-lg font-bold text-white shadow-[0_14px_28px_-12px_rgba(4,120,87,.75),inset_0_1px_0_rgba(255,255,255,.3)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/40">
                      {submittingExit ? 'Cobrando…' : `Cobrar ${money(total)} y liberar plaza · Enter`}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="vacio" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} className={`flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-700 ${muted}`}>
                    <ScanLine className="h-8 w-8" />
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Esperando vehículo para cobrar</p>
                    <p className="text-sm">Escanee el ticket, digite la placa o elija un vehículo en el mapa de plazas.</p>
                    {exitError && <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">{exitError}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          )}
        </motion.section>
      </div>
    </div>
  );
};

export default PatioPos;
