import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Car, 
  Bike, 
  Truck, 
  Search, 
  ArrowDownRight, 
  ArrowUpRight, 
  Clock, 
  DollarSign, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Barcode,
  AlertCircle, 
  AlertTriangle,
  Printer, 
  Check, 
  Sparkles, 
  RefreshCw, 
  Hash, 
  Tag, 
  Smartphone, 
  Layers, 
  Building2, 
  Settings2, 
  CheckCircle2, 
  Wallet, 
  Coins, 
  Zap, 
  FileCheck, 
  ChevronDown,
  X,
  ShieldCheck,
  FileText,
  Bus,
  RotateCcw,
  Compass,
  ExternalLink,
  Copy,
  Globe,
  Maximize2,
  Camera
} from 'lucide-react';
import { 
  ParkingSpot, 
  ParkingTicket, 
  VehicleType, 
  RatesConfig, 
  ParkingBusinessInfo,
  PaymentMethod,
  SystemUser,
  PaymentGatewayConfig,
  PaymentTransactionDetails,
  WalletOption,
  QrOption,
  BreBKey,
  CardTerminalOption,
  BankAccountOption,
  VehicleCategoryConfig
} from '../types';
import { calculateParkingFee, formatCurrency, formatPlate } from '../utils/billing';
import { playSound } from '../utils/audio';
import { renderVehicleIcon } from '../utils/vehicleIcons';
import { 
  PlateCountryRule,
  NATIONAL_PLATE_RULE, 
  FOREIGN_COUNTRY_OPTIONS, 
  FOREIGN_COUNTRY_RULES,
  getActivePlateRule,
  validatePlateData
} from '../utils/plateValidation';
import { 
  getPaymentMethodMeta,
  DEFAULT_WALLETS,
  DEFAULT_QR_CODES,
  DEFAULT_BRE_B_KEYS,
  DEFAULT_TERMINALS,
  DEFAULT_BANK_ACCOUNTS
} from '../utils/paymentUtils';
import { PaymentQrModal } from './PaymentQrModal';
import { DynamicQrCode } from './DynamicQrCode';
import { DynamicBarcode } from './DynamicBarcode';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { generateDianCUFE } from '../utils/dianService';

interface OperationsViewProps {
  spots: ParkingSpot[];
  activeTickets: ParkingTicket[];
  rates: RatesConfig;
  businessInfo: ParkingBusinessInfo;
  soundEnabled: boolean;
  onRegisterEntry: (ticketData: {
    plate: string;
    vehicleType: VehicleType;
    spotCode: string;
    notes?: string;
    isForeignPlate?: boolean;
    originCountry?: string;
  }) => ParkingTicket | null;
  onRegisterExit: (
    ticketId: string,
    billingDetails: {
      paymentMethod: PaymentMethod;
      cashReceived?: number;
      changeGiven?: number;
      discountAmount?: number;
      paymentDetails?: PaymentTransactionDetails;
    }
  ) => ParkingTicket | null;
  onPrintTicket: (ticket: ParkingTicket, mode: 'entry' | 'exit') => void;
  selectedPlateForExit?: string | null;
  onClearSelectedPlate?: () => void;
  currentUser?: SystemUser;
  paymentGatewayConfig: PaymentGatewayConfig;
  onOpenTicketScanner?: () => void;
  onOpenAnprCamera?: () => void;
  vehicleCategories?: VehicleCategoryConfig[];
}

export const OperationsView: React.FC<OperationsViewProps> = ({
  spots,
  activeTickets,
  rates,
  businessInfo,
  soundEnabled,
  onRegisterEntry,
  onRegisterExit,
  onPrintTicket,
  selectedPlateForExit,
  onClearSelectedPlate,
  currentUser,
  paymentGatewayConfig,
  onOpenTicketScanner,
  onOpenAnprCamera,
  vehicleCategories = [],
}) => {
  // --- Entry Form State ---
  const [entryPlate, setEntryPlate] = useState('');
  const [entryVehicleType, setEntryVehicleType] = useState<VehicleType>('car');
  const [entrySpotCode, setEntrySpotCode] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entryWarning, setEntryWarning] = useState<string | null>(null);
  const [entrySuccessMessage, setEntrySuccessMessage] = useState<string | null>(null);
  const [lastGeneratedTicket, setLastGeneratedTicket] = useState<ParkingTicket | null>(null);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState<boolean>(false);
  const plateInputRef = useRef<HTMLInputElement>(null);

  // --- Opción de Placa Extranjera / Internacional y Reglas por País ---
  const [isForeignPlate, setIsForeignPlate] = useState<boolean>(false);
  const [foreignCountry, setForeignCountry] = useState<string>('');
  const [customForeignCountry, setCustomForeignCountry] = useState<string>('');

  const selectedForeignCountryName = useMemo(() => {
    if (!isForeignPlate) return undefined;
    if (foreignCountry === 'Otro país') {
      return customForeignCountry.trim() || 'Internacional';
    }
    return foreignCountry.trim() ? foreignCountry : undefined;
  }, [isForeignPlate, foreignCountry, customForeignCountry]);

  // Validación y reglas de placa y país
  const plateValidation = useMemo(() => {
    return validatePlateData(entryPlate, isForeignPlate, foreignCountry, customForeignCountry, entryVehicleType);
  }, [entryPlate, isForeignPlate, foreignCountry, customForeignCountry, entryVehicleType]);

  const cleanPlate = plateValidation.cleanPlate;
  const activeCountryRule = plateValidation.activeRule;
  const isCountrySelectionMissing = plateValidation.isCountryMissing;
  const isCustomCountryNameMissing = plateValidation.isCustomCountryMissing;
  const isPlateFormatValid = plateValidation.isValid;
  const isPlateLengthValid = isPlateFormatValid;
  const isPlateTouchedOrTyped = entryPlate.trim().length > 0;
  const isPlateInvalid = (isPlateTouchedOrTyped && !isPlateFormatValid) || (entryError !== null && !isPlateFormatValid);

  // Validación adicional en tiempo real: verificar si la placa ingresada manualmente ya existe en tickets activos
  const duplicateActiveTicket = useMemo(() => {
    if (!cleanPlate || cleanPlate.length < 3) return null;
    return (
      activeTickets.find(
        t => formatPlate(t.plate) === cleanPlate || t.plate.toUpperCase().trim() === cleanPlate
      ) || null
    );
  }, [cleanPlate, activeTickets]);

  // --- Exit / Billing State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<ParkingTicket | null>(null);
  const [barcodeScanFeedback, setBarcodeScanFeedback] = useState<string | null>(null);
  const [exitPaymentMethod, setExitPaymentMethod] = useState<PaymentMethod>(() => paymentGatewayConfig?.defaultMethod || 'cash');
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [exitError, setExitError] = useState<string | null>(null);

  // Validación Salida sin Ticket / Tarjeta de Propiedad
  const [isNoTicketPresented, setIsNoTicketPresented] = useState<boolean>(false);
  const [propertyCardNumber, setPropertyCardNumber] = useState<string>('');
  const [ownerFullName, setOwnerFullName] = useState<string>('');
  const [ownerDocNumber, setOwnerDocNumber] = useState<string>('');
  const [applyLostTicketFee, setApplyLostTicketFee] = useState<boolean>(true);

  // Grouped Sub-method selections
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [selectedQrId, setSelectedQrId] = useState<string>('');
  const [selectedBreBId, setSelectedBreBId] = useState<string>('');
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');

  // Rich payment details state
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [cardType, setCardType] = useState<'debit' | 'credit'>('debit');
  const [agreementName, setAgreementName] = useState<string>('');
  const [agreementNotes, setAgreementNotes] = useState<string>('');

  // Mixed payment state
  const [splitCashAmount, setSplitCashAmount] = useState<string>('');
  const [splitSecondCategory, setSplitSecondCategory] = useState<'wallet' | 'qr' | 'bre_b' | 'card' | 'transfer'>('wallet');
  const [splitSecondSubId, setSplitSecondSubId] = useState<string>('');
  const [splitSecondAmount, setSplitSecondAmount] = useState<string>('');
  const [splitSecondReference, setSplitSecondReference] = useState<string>('');
  const [splitCardType, setSplitCardType] = useState<'debit' | 'credit'>('debit');

  // Facturación Electrónica DIAN state
  const [isElectronicInvoiceRequested, setIsElectronicInvoiceRequested] = useState<boolean>(false);
  const [customerDocType, setCustomerDocType] = useState<'CC' | 'NIT' | 'CE' | 'PASSPORT'>('CC');
  const [customerDocNumber, setCustomerDocNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');

  // QR Modal State & PSE state
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrModalMethod, setQrModalMethod] = useState<PaymentMethod>('wallet');
  const [qrModalSubTitle, setQrModalSubTitle] = useState<string>('');
  const [qrModalAccountDetails, setQrModalAccountDetails] = useState<{
    accountNumber?: string;
    holderName?: string;
    entityName?: string;
  }>({});
  const [qrModalPseUrl, setQrModalPseUrl] = useState<string | undefined>(undefined);
  const [qrModalPseQrUrl, setQrModalPseQrUrl] = useState<string | undefined>(undefined);
  const [qrModalInitialTab, setQrModalInitialTab] = useState<'standard' | 'pse'>('standard');
  const [isPseTransferSelected, setIsPseTransferSelected] = useState<boolean>(false);

  // Active wallets, QRs, Bre-B keys, terminals, and bank accounts with robust fallbacks
  const activeWallets = useMemo<WalletOption[]>(() => {
    const raw = (paymentGatewayConfig?.wallets && paymentGatewayConfig.wallets.length > 0)
      ? paymentGatewayConfig.wallets
      : DEFAULT_WALLETS;
    const filtered = raw.filter(w => w.enabled !== false);
    return filtered.length > 0 ? filtered : DEFAULT_WALLETS;
  }, [paymentGatewayConfig?.wallets]);

  const activeQrs = useMemo<QrOption[]>(() => {
    const raw = (paymentGatewayConfig?.qrCodes && paymentGatewayConfig.qrCodes.length > 0)
      ? paymentGatewayConfig.qrCodes
      : DEFAULT_QR_CODES;
    const filtered = raw.filter(q => q.enabled !== false);
    return filtered.length > 0 ? filtered : DEFAULT_QR_CODES;
  }, [paymentGatewayConfig?.qrCodes]);

  const activeBreBKeys = useMemo<BreBKey[]>(() => {
    const raw = (paymentGatewayConfig?.breBKeys && paymentGatewayConfig.breBKeys.length > 0)
      ? paymentGatewayConfig.breBKeys
      : DEFAULT_BRE_B_KEYS;
    const filtered = raw.filter(k => k.enabled !== false);
    return filtered.length > 0 ? filtered : DEFAULT_BRE_B_KEYS;
  }, [paymentGatewayConfig?.breBKeys]);

  const activeTerminals = useMemo<CardTerminalOption[]>(() => {
    const raw = (paymentGatewayConfig?.terminals && paymentGatewayConfig.terminals.length > 0)
      ? paymentGatewayConfig.terminals
      : DEFAULT_TERMINALS;
    const filtered = raw.filter(t => t.enabled !== false);
    return filtered.length > 0 ? filtered : DEFAULT_TERMINALS;
  }, [paymentGatewayConfig?.terminals]);

  const activeBankAccounts = useMemo<BankAccountOption[]>(() => {
    const raw = (paymentGatewayConfig?.bankAccounts && paymentGatewayConfig.bankAccounts.length > 0)
      ? paymentGatewayConfig.bankAccounts
      : DEFAULT_BANK_ACCOUNTS;

    const mapped = raw.map((b, idx) => {
      const defaultMatch = DEFAULT_BANK_ACCOUNTS.find(d => d.bankName.toLowerCase() === b.bankName?.toLowerCase()) || DEFAULT_BANK_ACCOUNTS[idx % DEFAULT_BANK_ACCOUNTS.length];
      return {
        ...b,
        enabled: b.enabled !== false,
        enablePse: b.enablePse !== false,
        bankName: b.bankName || defaultMatch?.bankName || 'Bancolombia',
        accountType: b.accountType || defaultMatch?.accountType || 'savings',
        accountNumber: b.accountNumber || defaultMatch?.accountNumber || '458-923841-02',
        holderName: b.holderName || defaultMatch?.holderName || 'Estacionamiento Central SAS',
        holderId: b.holderId || defaultMatch?.holderId || '901.458.723-1',
        pseUrl: b.pseUrl || defaultMatch?.pseUrl || 'https://zonapagos.com/t_estacionamientocentral/pagos.asp',
        pseQrUrl: b.pseQrUrl || defaultMatch?.pseQrUrl || '/pse_logo.png',
      };
    });

    const filtered = mapped.filter(b => b.enabled);
    return filtered.length > 0 ? filtered : DEFAULT_BANK_ACCOUNTS;
  }, [paymentGatewayConfig?.bankAccounts]);

  // Set default sub-selection if not set or if current selected item is invalid
  useEffect(() => {
    if (!selectedWalletId || !activeWallets.some(w => w.id === selectedWalletId)) {
      if (activeWallets.length > 0) {
        setSelectedWalletId(activeWallets[0].id);
      }
    }
  }, [activeWallets, selectedWalletId]);

  useEffect(() => {
    if (!selectedQrId || !activeQrs.some(q => q.id === selectedQrId)) {
      if (activeQrs.length > 0) {
        setSelectedQrId(activeQrs[0].id);
      }
    }
  }, [activeQrs, selectedQrId]);

  useEffect(() => {
    if (!selectedBreBId || !activeBreBKeys.some(k => k.id === selectedBreBId)) {
      if (activeBreBKeys.length > 0) {
        setSelectedBreBId(activeBreBKeys[0].id);
      }
    }
  }, [activeBreBKeys, selectedBreBId]);

  useEffect(() => {
    if (!selectedTerminalId || !activeTerminals.some(t => t.id === selectedTerminalId)) {
      if (activeTerminals.length > 0) {
        setSelectedTerminalId(activeTerminals[0].id);
      }
    }
  }, [activeTerminals, selectedTerminalId]);

  useEffect(() => {
    if (!selectedBankAccountId || !activeBankAccounts.some(b => b.id === selectedBankAccountId)) {
      if (activeBankAccounts.length > 0) {
        setSelectedBankAccountId(activeBankAccounts[0].id);
      }
    }
  }, [activeBankAccounts, selectedBankAccountId]);

  // Transfer Channel (PSE vs Direct) and copy states
  const [transferChannel, setTransferChannel] = useState<'pse' | 'direct'>('pse');
  const [copiedPseLink, setCopiedPseLink] = useState(false);
  const [copiedBankAcc, setCopiedBankAcc] = useState(false);

  // Sync transferChannel with isPseTransferSelected
  useEffect(() => {
    if (transferChannel === 'pse') {
      setIsPseTransferSelected(true);
    } else {
      setIsPseTransferSelected(false);
    }
  }, [transferChannel]);

  const handleCopyText = (text: string, type: 'pse' | 'account') => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
    } catch {
      // Fallback
    }
    if (type === 'pse') {
      setCopiedPseLink(true);
      setTimeout(() => setCopiedPseLink(false), 2000);
    } else {
      setCopiedBankAcc(true);
      setTimeout(() => setCopiedBankAcc(false), 2000);
    }
  };

  // --- Table Filters & Live Clock ---
  const [tableFilterType, setTableFilterType] = useState<string>('all');
  const [tableSearch, setTableSearch] = useState<string>('');

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync plate requested from external
  useEffect(() => {
    if (selectedPlateForExit) {
      const match = activeTickets.find(t => t.plate.toUpperCase() === selectedPlateForExit.toUpperCase());
      if (match) {
        selectVehicleForExit(match);
      }
      onClearSelectedPlate?.();
    }
  }, [selectedPlateForExit, activeTickets, onClearSelectedPlate]);

  // Available spots filtered by chosen vehicle type
  const availableSpotsForType = useMemo(() => {
    const dedicated = spots.filter(s => s.type === entryVehicleType && s.status === 'available');
    if (dedicated.length > 0) return dedicated;
    // Fallback if no dedicated spots exist for this vehicle category specifically
    return spots.filter(s => s.status === 'available');
  }, [spots, entryVehicleType]);

  useEffect(() => {
    if (availableSpotsForType.length > 0) {
      if (!availableSpotsForType.some(s => s.code === entrySpotCode)) {
        setEntrySpotCode(availableSpotsForType[0].code);
      }
    } else {
      setEntrySpotCode('');
    }
  }, [entryVehicleType, availableSpotsForType, entrySpotCode]);

  // Hotkey F4 para abrir el Escáner QR de Tickets
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        onOpenTicketScanner?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenTicketScanner]);

  // Handle Entry Submission
  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError(null);
    setEntryWarning(null);
    setEntrySuccessMessage(null);

    const clean = formatPlate(entryPlate);
    if (!clean) {
      setEntryError('Por favor digite la placa o identificador del vehículo para registrar su entrada.');
      playSound('alert', soundEnabled);
      plateInputRef.current?.focus();
      return;
    }

    if (isForeignPlate) {
      if (isCountrySelectionMissing) {
        setEntryError('Debe seleccionar el país de procedencia en la lista para registrar una placa extranjera.');
        playSound('alert', soundEnabled);
        return;
      }
      if (isCustomCountryNameMissing) {
        setEntryError('Debe especificar el nombre del país en el campo correspondiente.');
        playSound('alert', soundEnabled);
        return;
      }
      if (!isPlateFormatValid) {
        setEntryError(`El formato de la placa '${clean}' no coincide con el estándar oficial de ${activeCountryRule?.name || 'este país'}. Estructura requerida: ${activeCountryRule?.description || ''} (ej. ${activeCountryRule?.example || ''}).`);
        playSound('alert', soundEnabled);
        plateInputRef.current?.focus();
        return;
      }
    } else {
      if (!isPlateFormatValid) {
        setEntryError(plateValidation.errorMessage || `La placa ingresada '${clean}' no tiene un formato válido.`);
        playSound('alert', soundEnabled);
        plateInputRef.current?.focus();
        return;
      }
    }

    // Validación adicional: verificar si la placa ya cuenta con un ticket activo en este u otro patio
    const alreadyParked = activeTickets.find(
      t => formatPlate(t.plate) === clean || t.plate.toUpperCase().trim() === clean
    );

    if (alreadyParked) {
      const warningMessage = `⚠️ ¡Atención! El vehículo con placa ${clean} ya se encuentra dentro del parqueadero con ticket activo #${alreadyParked.ticketNumber || 'N/A'} en el puesto ${alreadyParked.spotCode}.`;
      setEntryWarning(warningMessage);
      setEntryError(warningMessage);
      playSound('alert', soundEnabled);
      return;
    }

    // Auto-asignación de puesto si no se ha seleccionado uno manualmente
    let targetSpot = entrySpotCode;
    if (!targetSpot && availableSpotsForType.length > 0) {
      targetSpot = availableSpotsForType[0].code;
      setEntrySpotCode(targetSpot);
    }

    if (!targetSpot) {
      setEntryError('No hay plazas de estacionamiento disponibles para este tipo de vehículo.');
      playSound('alert', soundEnabled);
      return;
    }

    const originCountryValue = isForeignPlate ? selectedForeignCountryName : undefined;
    const countrySuffix = isForeignPlate 
      ? ` [Placa Extranjera${originCountryValue ? `: ${originCountryValue}` : ''}]` 
      : '';
    const fullNotes = entryNotes.trim() 
      ? `${entryNotes.trim()}${countrySuffix}` 
      : (countrySuffix ? countrySuffix.trim() : undefined);

    try {
      setIsSubmittingEntry(true);
      const newTicket = onRegisterEntry({
        plate: clean,
        vehicleType: entryVehicleType,
        spotCode: targetSpot,
        notes: fullNotes,
        isForeignPlate,
        originCountry: originCountryValue,
      });

      if (newTicket) {
        playSound('success', soundEnabled);
        setLastGeneratedTicket(newTicket);
        setEntrySuccessMessage(`¡Vehículo ${clean} ingresado exitosamente en plaza ${targetSpot}! Ticket: #${newTicket.ticketNumber}`);
        setEntryPlate('');
        setEntryNotes('');
        setIsForeignPlate(false);
        setForeignCountry('');
        setCustomForeignCountry('');
        setEntryWarning(null);
        plateInputRef.current?.focus();

        if (businessInfo.autoPrintOnEntry !== false && !businessInfo.silentBackgroundPrint) {
          onPrintTicket(newTicket, 'entry');
        }

        setTimeout(() => setEntrySuccessMessage(null), 8000);
      } else {
        setEntryError(`No se pudo registrar el ingreso de la placa '${clean}'. Verifique si la placa ya cuenta con un ticket activo.`);
        playSound('alert', soundEnabled);
      }
    } catch (err: any) {
      console.error('[OperationsView] Error en registro de ingreso:', err);
      setEntryError(`Error inesperado registrando el ingreso: ${err?.message || 'Error del sistema'}`);
      playSound('alert', soundEnabled);
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  // Cancel / Reset Exit workflow
  const handleCancelExitProcess = () => {
    setSelectedTicket(null);
    setSearchQuery('');
    setCashReceivedInput('');
    setDiscountInput('0');
    setPaymentReference('');
    setAgreementName('');
    setAgreementNotes('');
    setSplitCashAmount('');
    setSplitSecondAmount('');
    setSplitSecondReference('');
    setIsElectronicInvoiceRequested(false);
    setCustomerDocNumber('');
    setCustomerName('');
    setCustomerEmail('');
    setIsNoTicketPresented(false);
    setPropertyCardNumber('');
    setOwnerFullName('');
    setOwnerDocNumber('');
    setApplyLostTicketFee(true);
    setExitError(null);
    onClearSelectedPlate?.();
    playSound('beep', soundEnabled);
  };

  // Configured vehicle categories combining standard & custom
  const configuredCategories = useMemo(() => {
    if (vehicleCategories && vehicleCategories.length > 0) {
      const active = vehicleCategories.filter(vc => vc.isActive !== false && vc.enabled !== false);
      if (active.length > 0) {
        return active.map(vc => {
          const r = vc.rate || rates[vc.id] || {
            hourRate: vc.defaultHourlyRate || 4000,
            minuteRate: vc.defaultMinuteRate || 70,
            dayRate: vc.defaultDailyRate || 25000,
            gracePeriodMinutes: vc.gracePeriodMinutes || 15,
            minimumChargeMinutes: 15,
            lostTicketFee: 15000,
          };
          return {
            id: vc.id as VehicleType,
            name: vc.name,
            icon: vc.icon || 'Car',
            rate: r,
          };
        });
      }
    }

    return [
      { id: 'car', name: 'Carro / Auto', icon: 'Car', rate: rates.car },
      { id: 'motorcycle', name: 'Motocicleta', icon: 'Bike', rate: rates.motorcycle },
      { id: 'suv', name: 'Camioneta / SUV', icon: 'Truck', rate: rates.suv },
      { id: 'bicycle', name: 'Bicicleta', icon: 'Bike', rate: rates.bicycle },
    ];
  }, [rates, vehicleCategories]);

  // Ensure current selected entry vehicle type exists in active categories
  useEffect(() => {
    if (configuredCategories.length > 0) {
      const exists = configuredCategories.some(c => c.id === entryVehicleType);
      if (!exists) {
        setEntryVehicleType(configuredCategories[0].id);
      }
    }
  }, [configuredCategories, entryVehicleType]);

  // Live calculation for selected ticket
  const liveCalculation = useMemo(() => {
    if (!selectedTicket) return null;
    const nowIso = new Date().toISOString();
    return calculateParkingFee(selectedTicket.entryTime, nowIso, selectedTicket.vehicleType, rates);
  }, [selectedTicket, rates, tick]);

  const lostTicketFeeAmount = (selectedTicket && rates[selectedTicket.vehicleType]?.lostTicketFee) || 15000;
  const lostTicketAddition = (selectedTicket && isNoTicketPresented && applyLostTicketFee) ? lostTicketFeeAmount : 0;
  const discountVal = Math.max(0, parseFloat(discountInput) || 0);
  const finalTotalAmount = Math.max(0, (liveCalculation?.totalAmount || 0) + lostTicketAddition - discountVal);
  const cashReceivedVal = parseFloat(cashReceivedInput) || 0;
  const changeGiven = exitPaymentMethod === 'cash' ? Math.max(0, cashReceivedVal - finalTotalAmount) : 0;

  // Estados y validaciones de pago en tiempo real (monto exacto, insuficiente, exceso con vueltos)
  const hasCashTyped = cashReceivedInput.trim().length > 0;
  const isCashExact = exitPaymentMethod === 'cash' && finalTotalAmount > 0 && hasCashTyped && Math.abs(cashReceivedVal - finalTotalAmount) < 0.01;
  const isCashUnder = exitPaymentMethod === 'cash' && finalTotalAmount > 0 && hasCashTyped && cashReceivedVal < finalTotalAmount;
  const isCashOver = exitPaymentMethod === 'cash' && finalTotalAmount > 0 && hasCashTyped && cashReceivedVal > finalTotalAmount;
  const cashShortage = Math.max(0, finalTotalAmount - cashReceivedVal);

  const splitCashVal = parseFloat(splitCashAmount) || 0;
  const splitSecondVal = parseFloat(splitSecondAmount) || 0;
  const totalSplit = splitCashVal + splitSecondVal;
  const splitDiff = finalTotalAmount - totalSplit;
  const isSplitExact = exitPaymentMethod === 'mixed' && Math.abs(splitDiff) < 0.01;
  const isSplitUnder = exitPaymentMethod === 'mixed' && splitDiff > 0.01;
  const isSplitOver = exitPaymentMethod === 'mixed' && splitDiff < -0.01;

  // Validación de bloqueo para proceder
  const isPaymentBlocked = useMemo(() => {
    if (finalTotalAmount <= 0) return false;
    if (exitPaymentMethod === 'cash') {
      return !hasCashTyped || cashReceivedVal < finalTotalAmount;
    }
    if (exitPaymentMethod === 'mixed') {
      return !isSplitExact;
    }
    return false;
  }, [finalTotalAmount, exitPaymentMethod, hasCashTyped, cashReceivedVal, isSplitExact]);

  // Función para pasar rápidamente el efectivo actual a pago mixto
  const handleSwitchToSplitWithCurrentCash = () => {
    const cashVal = parseFloat(cashReceivedInput) || 0;
    const remainder = Math.max(0, finalTotalAmount - cashVal);
    setExitPaymentMethod('mixed');
    setSplitCashAmount(cashVal > 0 ? cashVal.toString() : '');
    setSplitSecondAmount(remainder.toString());
    playSound('beep', soundEnabled);
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toUpperCase();
    return activeTickets.filter(
      t => t.plate.toUpperCase().includes(q) || t.ticketNumber.toUpperCase().includes(q) || t.spotCode.toUpperCase().includes(q)
    );
  }, [searchQuery, activeTickets]);

  const selectVehicleForExit = (ticket: ParkingTicket) => {
    setSelectedTicket(ticket);
    setSearchQuery(ticket.plate);
    setCashReceivedInput('');
    setDiscountInput('0');
    setPaymentReference('');
    setAgreementName('');
    setAgreementNotes('');
    setSplitCashAmount('');
    setSplitSecondAmount('');
    setSplitSecondReference('');
    setIsElectronicInvoiceRequested(false);
    setCustomerDocNumber('');
    setCustomerName('');
    setCustomerEmail('');
    setIsNoTicketPresented(false);
    setPropertyCardNumber('');
    setOwnerFullName('');
    setOwnerDocNumber('');
    setApplyLostTicketFee(true);
    setExitPaymentMethod(paymentGatewayConfig?.defaultMethod || 'cash');
    setExitError(null);
    playSound('beep', soundEnabled);
  };

  // --- Lector de Código de Barras Físico (Pistola USB / Bluetooth / Wedge Láser) ---
  const { isGunScanning, lastScannedCode, processScannedBarcode } = useBarcodeScanner({
    activeTickets,
    onTicketFound: (ticket) => {
      // 1. Limpiar inmediatamente cualquier tipeo residual en el formulario de entrada
      setEntryPlate('');
      setEntryNotes('');
      setEntryError(null);
      setEntryWarning(null);
      plateInputRef.current?.blur();

      // 2. Cargar el vehículo en el módulo de salida y liquidación
      selectVehicleForExit(ticket);
      setBarcodeScanFeedback(`¡Ticket #${ticket.ticketNumber} (${ticket.plate}) escaneado con lector de barras!`);
      setTimeout(() => setBarcodeScanFeedback(null), 4500);

      // 3. Enfocar el campo de cobro en efectivo
      setTimeout(() => {
        const cashInput = document.getElementById('cashReceivedInput') as HTMLInputElement | null;
        if (cashInput) {
          cashInput.focus();
        }
      }, 120);
    },
    onTicketAlreadyPaid: (ticket) => {
      setEntryPlate('');
      plateInputRef.current?.blur();
      setExitError(`El ticket #${ticket.ticketNumber} (${ticket.plate}) ya fue liquidado y pagado previamente.`);
      setBarcodeScanFeedback(null);
    },
    onTicketNotFound: (rawCode) => {
      setEntryPlate('');
      setExitError(`Código de barras "${rawCode}" no encontrado en los tickets activos.`);
      setBarcodeScanFeedback(null);
    },
    enabled: true
  });

  // Open QR modal with appropriate details including PSE options
  const handleOpenQrModal = (
    method: PaymentMethod,
    subName: string,
    account?: string,
    holder?: string,
    entity?: string,
    pseUrl?: string,
    pseQrUrl?: string,
    initialTab: 'standard' | 'pse' = 'standard'
  ) => {
    setQrModalMethod(method);
    setQrModalSubTitle(subName);
    setQrModalAccountDetails({
      accountNumber: account,
      holderName: holder,
      entityName: entity,
    });
    setQrModalPseUrl(pseUrl);
    setQrModalPseQrUrl(pseQrUrl);
    setQrModalInitialTab(initialTab);
    setIsQrModalOpen(true);
    playSound('beep', soundEnabled);
  };

  // Handle Exit Submission
  const handleExitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExitError(null);

    if (!selectedTicket || !liveCalculation) {
      setExitError('Seleccione un vehículo para liquidar');
      return;
    }

    // Regla de Seguridad Obligatoria: Si no presenta ticket físico, debe presentar Tarjeta de Propiedad
    if (isNoTicketPresented) {
      if (!propertyCardNumber.trim() || !ownerFullName.trim() || !ownerDocNumber.trim()) {
        setExitError('Para autorizar la salida sin ticket impreso, es OBLIGATORIO registrar el N° de Tarjeta de Propiedad, Nombre del Titular y Documento de Identidad.');
        playSound('alert', soundEnabled);
        return;
      }
    }

    if (exitPaymentMethod === 'cash' && finalTotalAmount > 0) {
      if (!hasCashTyped) {
        setExitError('Por favor digite el monto entregado por el cliente en efectivo o presione "Exacto".');
        playSound('alert', soundEnabled);
        return;
      }
      if (cashReceivedVal < finalTotalAmount) {
        setExitError(`El efectivo entregado (${formatCurrency(cashReceivedVal, rates.currencySymbol)}) es menor que el total a pagar (${formatCurrency(finalTotalAmount, rates.currencySymbol)}). Faltan ${formatCurrency(cashShortage, rates.currencySymbol)}.`);
        playSound('alert', soundEnabled);
        return;
      }
    }

    if (exitPaymentMethod === 'mixed') {
      if (Math.abs(splitDiff) > 0.01) {
        if (splitDiff > 0) {
          setExitError(`Falta por distribuir ${formatCurrency(splitDiff, rates.currencySymbol)} en pago mixto para completar ${formatCurrency(finalTotalAmount, rates.currencySymbol)}.`);
        } else {
          setExitError(`La suma de los pagos (${formatCurrency(totalSplit, rates.currencySymbol)}) supera el total a pagar por ${formatCurrency(Math.abs(splitDiff), rates.currencySymbol)}.`);
        }
        playSound('alert', soundEnabled);
        return;
      }
    }

    const currentWallet = activeWallets.find(w => w.id === selectedWalletId) || activeWallets[0] || DEFAULT_WALLETS[0];
    const currentQr = activeQrs.find(q => q.id === selectedQrId) || activeQrs[0] || DEFAULT_QR_CODES[0];
    const currentBreB = activeBreBKeys.find(b => b.id === selectedBreBId) || activeBreBKeys[0] || DEFAULT_BRE_B_KEYS[0];
    const currentTerminal = activeTerminals.find(t => t.id === selectedTerminalId) || activeTerminals[0] || DEFAULT_TERMINALS[0];
    const currentBankAccount = activeBankAccounts.find(b => b.id === selectedBankAccountId) || activeBankAccounts[0] || DEFAULT_BANK_ACCOUNTS[0];

    let paymentDetails: PaymentTransactionDetails = {
      method: exitPaymentMethod,
      methodLabel: getPaymentMethodMeta(exitPaymentMethod).label,
    };

    if (isNoTicketPresented) {
      paymentDetails.lostTicketDetails = {
        isLostTicket: true,
        propertyCardNumber: propertyCardNumber.trim(),
        ownerFullName: ownerFullName.trim(),
        ownerDocNumber: ownerDocNumber.trim(),
        lostTicketFeeApplied: applyLostTicketFee ? lostTicketFeeAmount : 0,
      };
    }

    if (exitPaymentMethod === 'cash') {
      paymentDetails = {
        method: 'cash',
        methodLabel: 'Efectivo en Caja',
      };
    } else if (exitPaymentMethod === 'card') {
      paymentDetails = {
        method: 'card',
        methodLabel: 'Tarjeta / Datáfono',
        cardType,
        cardTerminal: currentTerminal?.name || 'Datáfono Redeban',
        referenceNumber: paymentReference.trim() || undefined,
      };
    } else if (exitPaymentMethod === 'wallet') {
      paymentDetails = {
        method: 'wallet',
        methodLabel: `Billetera (${currentWallet?.name || 'Digital'})`,
        subMethodId: currentWallet?.id,
        subMethodName: currentWallet?.name,
        walletAccountPhone: currentWallet?.phoneNumber,
        referenceNumber: paymentReference.trim() || undefined,
      };
    } else if (exitPaymentMethod === 'qr') {
      paymentDetails = {
        method: 'qr',
        methodLabel: `QR (${currentQr?.name || 'Bancario'})`,
        subMethodId: currentQr?.id,
        subMethodName: currentQr?.name,
        referenceNumber: paymentReference.trim() || undefined,
      };
    } else if (exitPaymentMethod === 'bre_b') {
      paymentDetails = {
        method: 'bre_b',
        methodLabel: `Llave Bre-B (${currentBreB?.registeredEntity || 'Interoperable'})`,
        subMethodId: currentBreB?.id,
        subMethodName: currentBreB?.keyType ? `${currentBreB.keyType}: ${currentBreB.keyValue}` : 'Llave Bre-B',
        breBKeyDetails: currentBreB ? `${currentBreB.keyType}: ${currentBreB.keyValue} (${currentBreB.registeredEntity})` : undefined,
        referenceNumber: paymentReference.trim() || undefined,
      };
    } else if (exitPaymentMethod === 'transfer') {
      paymentDetails = {
        method: 'transfer',
        methodLabel: isPseTransferSelected 
          ? `Transferencia PSE (${currentBankAccount?.bankName || 'PSE'})` 
          : `Transferencia (${currentBankAccount?.bankName || 'Bancaria'})`,
        subMethodId: currentBankAccount?.id,
        subMethodName: currentBankAccount?.bankName,
        accountDetails: currentBankAccount ? {
          accountNumber: currentBankAccount.accountNumber,
          holderName: currentBankAccount.holderName,
          entityName: `${currentBankAccount.bankName} (${currentBankAccount.accountType === 'savings' ? 'Ahorros' : 'Corriente'})`
        } : undefined,
        referenceNumber: paymentReference.trim() || undefined,
        isPsePayment: isPseTransferSelected,
        psePaymentUrl: currentBankAccount?.pseUrl || paymentGatewayConfig?.generalPseUrl,
      };
    } else if (exitPaymentMethod === 'agreement') {
      paymentDetails = {
        method: 'agreement',
        methodLabel: 'Convenio / Cortesía Comercial',
        agreementName: agreementName.trim() || 'Convenio General',
        notes: agreementNotes.trim() || undefined,
      };
    } else if (exitPaymentMethod === 'mixed') {
      const splitCashVal = parseFloat(splitCashAmount) || 0;
      const splitSecondVal = parseFloat(splitSecondAmount) || 0;
      
      let secondName = 'Medio Digital';
      if (splitSecondCategory === 'wallet') {
        const w = activeWallets.find(x => x.id === splitSecondSubId) || activeWallets[0];
        secondName = `Billetera ${w ? w.name : ''}`;
      } else if (splitSecondCategory === 'qr') {
        const q = activeQrs.find(x => x.id === splitSecondSubId) || activeQrs[0];
        secondName = `QR ${q ? q.name : ''}`;
      } else if (splitSecondCategory === 'bre_b') {
        const b = activeBreBKeys.find(x => x.id === splitSecondSubId) || activeBreBKeys[0];
        secondName = `Bre-B ${b ? b.registeredEntity : ''}`;
      } else if (splitSecondCategory === 'card') {
        const t = activeTerminals.find(x => x.id === splitSecondSubId) || activeTerminals[0];
        const terminalName = t ? t.name : 'Datáfono';
        const cardLabel = splitCardType === 'debit' ? 'Débito' : 'Crédito';
        secondName = `${terminalName} (${cardLabel})`;
      } else if (splitSecondCategory === 'transfer') {
        const b = activeBankAccounts.find(x => x.id === splitSecondSubId) || activeBankAccounts[0];
        secondName = `Transferencia ${b ? b.bankName : ''}`;
      }

      paymentDetails = {
        method: 'mixed',
        methodLabel: 'Pago Mixto Combinado',
        splitPayments: [
          {
            id: 'split-1',
            method: 'cash',
            methodName: 'Efectivo',
            amount: splitCashVal,
          },
          {
            id: 'split-2',
            method: splitSecondCategory as any,
            methodName: secondName,
            amount: splitSecondVal,
            subMethodId: splitSecondSubId || undefined,
            cardType: splitSecondCategory === 'card' ? splitCardType : undefined,
            reference: splitSecondReference.trim() || undefined,
          }
        ]
      };
    }

    // Facturación Electrónica DIAN
    if (isElectronicInvoiceRequested) {
      const consecutive = (businessInfo.dianCurrentNumber || 1040) + 1;
      const prefix = businessInfo.dianPrefix || 'FE';
      const now = new Date();
      const issueDate = now.toISOString().split('T')[0];
      const issueTime = now.toTimeString().split(' ')[0];
      const customerDoc = customerDocNumber.trim() || '222222222222';

      const cufe = await generateDianCUFE({
        invoiceNumber: `${prefix}${consecutive}`,
        issueDate,
        issueTime,
        subtotal: liveCalculation.baseAmount,
        taxAmount: liveCalculation.taxAmount,
        totalAmount: finalTotalAmount,
        nitEmitter: businessInfo.nit,
        docCustomer: customerDoc,
        technicalKey: businessInfo.dianTechnicalKey,
        environment: businessInfo.dianEnvironment,
      });

      paymentDetails.isElectronicInvoice = true;
      paymentDetails.electronicInvoiceNumber = `${prefix}${consecutive}`;
      paymentDetails.cufe = cufe;
      paymentDetails.customerDocType = customerDocType;
      paymentDetails.customerDocument = customerDoc;
      paymentDetails.customerName = customerName.trim() || 'Consumidor Final';
      paymentDetails.customerEmail = customerEmail.trim() || undefined;
    }

    const paidTicket = onRegisterExit(selectedTicket.id, {
      paymentMethod: exitPaymentMethod,
      cashReceived: exitPaymentMethod === 'cash' ? cashReceivedVal : undefined,
      changeGiven: exitPaymentMethod === 'cash' ? changeGiven : undefined,
      discountAmount: discountVal > 0 ? discountVal : undefined,
      paymentDetails,
    });

    if (paidTicket) {
      playSound('cash', soundEnabled);
      if (businessInfo.autoPrintOnExit && !businessInfo.silentBackgroundPrint) {
        onPrintTicket(paidTicket, 'exit');
      }
      setSelectedTicket(null);
      setSearchQuery('');
      setCashReceivedInput('');
      setDiscountInput('0');
      setPaymentReference('');
      setAgreementName('');
      setAgreementNotes('');
      setSplitCashAmount('');
      setSplitSecondAmount('');
      setSplitSecondReference('');
      setIsElectronicInvoiceRequested(false);
      setCustomerDocNumber('');
      setCustomerName('');
      setCustomerEmail('');
    }
  };

  const getVehicleIcon = (type: string, className = 'w-4 h-4') => {
    return renderVehicleIcon(type, className, vehicleCategories);
  };

  const getVehicleName = (type: string) => {
    const custom = vehicleCategories?.find(c => c.id === type);
    if (custom) return custom.name;
    switch (type) {
      case 'car': return 'Automóvil';
      case 'motorcycle': return 'Motocicleta';
      case 'suv': return 'Camioneta / SUV';
      case 'bicycle': return 'Bicicleta';
      case 'truck': return 'Camión / Pesado';
      case 'van': return 'Furgón / Van';
      default: return type.toUpperCase();
    }
  };

  // Filtered active tickets in table
  const filteredActiveTickets = useMemo(() => {
    return activeTickets.filter((t) => {
      const matchesType = tableFilterType === 'all' || t.vehicleType === tableFilterType;
      const matchesSearch =
        !tableSearch.trim() ||
        t.plate.toUpperCase().includes(tableSearch.trim().toUpperCase()) ||
        t.ticketNumber.toUpperCase().includes(tableSearch.trim().toUpperCase()) ||
        t.spotCode.toUpperCase().includes(tableSearch.trim().toUpperCase());
      return matchesType && matchesSearch;
    });
  }, [activeTickets, tableFilterType, tableSearch]);

  const currentWallet = activeWallets.find(w => w.id === selectedWalletId) || activeWallets[0] || DEFAULT_WALLETS[0];
  const currentQr = activeQrs.find(q => q.id === selectedQrId) || activeQrs[0] || DEFAULT_QR_CODES[0];
  const currentBreB = activeBreBKeys.find(b => b.id === selectedBreBId) || activeBreBKeys[0] || DEFAULT_BRE_B_KEYS[0];
  const currentTerminal = activeTerminals.find(t => t.id === selectedTerminalId) || activeTerminals[0] || DEFAULT_TERMINALS[0];
  const currentBankAccount = activeBankAccounts.find(b => b.id === selectedBankAccountId) || activeBankAccounts[0] || DEFAULT_BANK_ACCOUNTS[0];

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* TOP SECTION: TWO CLEAN, SPACIOUS WORK CARDS               */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* CARD 1: INGRESO RÁPIDO DE VEHÍCULO                        */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 bg-[var(--bg-surface-2)] rounded-2xl border border-[var(--border-subtle)] shadow-xl overflow-hidden flex flex-col text-[var(--text-primary)] backdrop-blur-sm">
          {/* Card Header */}
          <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface-3)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
                <ArrowDownRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Registro de Entrada</h3>
                <p className="text-[11px] text-slate-700 dark:text-slate-200">Expedición de ticket de ingreso</p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full">
              {spots.filter(s => s.status === 'available').length} Libres
            </span>
          </div>

          <div className="p-4 sm:p-5">
            {entrySuccessMessage && (
              <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span className="font-medium">{entrySuccessMessage}</span>
                </div>
                {lastGeneratedTicket && (
                  <button
                    type="button"
                    onClick={() => onPrintTicket(lastGeneratedTicket, 'entry')}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-sm shrink-0"
                    title="Ver en pantalla o reimprimir ticket de ingreso"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Ver / Imprimir Ticket</span>
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleEntrySubmit} className="space-y-4">
              {/* Vehicle Type Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <span>Tipo de Vehículo:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold normal-case">
                      {configuredCategories.find(c => c.id === entryVehicleType)?.name || entryVehicleType}
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {spots.filter(s => s.type === entryVehicleType && s.status === 'available').length} libres
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {configuredCategories.map((cat) => {
                    const isSelected = entryVehicleType === cat.id;
                    const availableForThis = spots.filter(s => s.type === cat.id && s.status === 'available').length;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        aria-selected={isSelected}
                        title={`${cat.name} (${availableForThis} disponibles)`}
                        aria-label={`${cat.name} (${availableForThis} disponibles)`}
                        onClick={() => {
                          setEntryVehicleType(cat.id);
                          playSound('beep', soundEnabled);
                        }}
                        className={`h-16 sm:h-18 rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 dark:bg-indigo-600 text-white border-indigo-700 shadow-xl shadow-indigo-600/35 ring-4 ring-indigo-500/30 scale-[1.04] z-10'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs'
                        }`}
                      >
                        {getVehicleIcon(
                          cat.icon || cat.id,
                          isSelected
                            ? 'w-9 h-9 sm:w-10 sm:h-10 text-white transition-transform scale-110 drop-shadow-md stroke-[2.4]'
                            : 'w-8 h-8 sm:w-9 sm:h-9 text-slate-500 dark:text-slate-400 transition-transform hover:scale-105 stroke-[1.8]'
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* License Plate Input */}
              <div>
                {/* Toggle: ¿Es placa extranjera? */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl mb-3 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isForeignPlate ? 'bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                    }`}>
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        ¿Es placa extranjera?
                      </span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 block">
                        {isForeignPlate
                          ? 'Selecciona el país de origen de la matrícula'
                          : 'Formato estándar nacional (6 caracteres)'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={isForeignPlate}
                    onClick={() => {
                      const next = !isForeignPlate;
                      setIsForeignPlate(next);
                      if (!next) {
                        setForeignCountry('');
                        setCustomForeignCountry('');
                      }
                      if (entryError) setEntryError(null);
                      if (entryWarning) setEntryWarning(null);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                      isForeignPlate ? 'bg-sky-500' : 'bg-slate-700'
                    }`}
                    title={isForeignPlate ? 'Desactivar placa extranjera' : 'Activar placa extranjera'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isForeignPlate ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Selector de País (SÓLO APARECE SI EL TOGGLE '¿Es placa extranjera?' ESTÁ ACTIVO) */}
                {isForeignPlate && (
                  <div className="mb-3 p-3 bg-sky-950/30 border border-sky-500/30 rounded-xl space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <label htmlFor="foreign-country-select" className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
                        <span>País de Procedencia</span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-normal">(Obligatorio)</span>
                      </label>
                      {foreignCountry && activeCountryRule && (
                        <span className="text-[10px] font-mono font-bold text-sky-800 dark:text-sky-300 bg-sky-900/60 px-2 py-0.5 rounded border border-sky-700/50">
                          {activeCountryRule.flag} {activeCountryRule.name}
                        </span>
                      )}
                    </div>

                    <select
                      id="foreign-country-select"
                      value={foreignCountry}
                      onChange={(e) => {
                        setForeignCountry(e.target.value);
                        if (entryError) setEntryError(null);
                        if (entryWarning) setEntryWarning(null);
                      }}
                      className={`w-full rounded-xl px-3 py-2 text-xs font-semibold outline-none transition-all cursor-pointer ${
                        !foreignCountry
                          ? 'bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-500 text-rose-800 dark:text-rose-200 ring-2 ring-rose-500/20 shadow-sm focus:border-rose-400 focus:ring-rose-500'
                          : 'bg-white dark:bg-slate-900 border-2 border-sky-500/70 text-sky-900 dark:text-sky-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 shadow-sm'
                      }`}
                    >
                      {FOREIGN_COUNTRY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium">
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {/* Validación visual obligatoria si no se ha elegido un país de la lista */}
                    {!foreignCountry && (
                      <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2 animate-in fade-in duration-200">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-700 dark:text-rose-400 mt-0.5" />
                        <div>
                          <strong className="text-rose-200 block font-bold">⚠️ Selección de país requerida</strong>
                          <span className="text-[11px] text-rose-800 dark:text-rose-300/90 leading-tight block mt-0.5">
                            Debe elegir el país de procedencia de la lista para validar el formato oficial de la placa y habilitar el registro.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Formato guía oficial según el país seleccionado */}
                    {foreignCountry && activeCountryRule && (
                      <div className="p-2.5 bg-white dark:bg-slate-900/90 border border-sky-500/40 rounded-xl text-xs space-y-1.5 shadow-inner">
                        <div className="flex items-center justify-between text-[11px] text-sky-200">
                          <span className="font-bold flex items-center gap-1.5">
                            <span className="text-base">{activeCountryRule.flag}</span>
                            <span>Estructura oficial para {activeCountryRule.name}:</span>
                          </span>
                          <span className="font-mono font-bold text-sky-800 dark:text-sky-300 bg-sky-950/90 px-2 py-0.5 rounded border border-sky-700/60 text-[10px]">
                            Ejemplo: {activeCountryRule.example}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          {activeCountryRule.description}
                        </p>
                        <div className="flex items-center gap-2 pt-0.5 text-[10px] text-slate-700 dark:text-slate-200 font-mono">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            Longitud requerida: {activeCountryRule.minLength === activeCountryRule.maxLength ? `${activeCountryRule.minLength} caracteres` : `${activeCountryRule.minLength} a ${activeCountryRule.maxLength} caracteres`}
                          </span>
                        </div>
                      </div>
                    )}

                    {foreignCountry === 'Otro país' && (
                      <div className="pt-1 space-y-1">
                        <input
                          type="text"
                          value={customForeignCountry}
                          onChange={(e) => setCustomForeignCountry(e.target.value)}
                          placeholder="Especifique el país de procedencia (Obligatorio)..."
                          maxLength={30}
                          className={`w-full bg-white dark:bg-slate-900 border-2 rounded-xl px-3 py-2 text-xs outline-none transition-all ${
                            !customForeignCountry.trim()
                              ? 'border-rose-500 text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/20 ring-2 ring-rose-500/20 placeholder:text-rose-400 dark:placeholder:text-rose-700/60'
                              : 'border-sky-500/50 text-slate-900 dark:text-sky-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-400'
                          }`}
                        />
                        {!customForeignCountry.trim() && (
                          <p className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Por favor ingrese el nombre del país extranjero.</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Encabezado del campo de placa */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      {isForeignPlate
                        ? `Placa ${activeCountryRule && foreignCountry ? activeCountryRule.name : 'Extranjera'}`
                        : 'Placa del Vehículo'}
                    </label>
                    {onOpenAnprCamera && (
                      <button
                        type="button"
                        onClick={onOpenAnprCamera}
                        className="flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800/80 px-2 py-0.5 rounded-lg transition-all cursor-pointer shadow-2xs"
                        title="Reconocer matrícula con cámara ANPR / LPR con IA"
                      >
                        <Camera className="w-3.5 h-3.5 text-sky-500" />
                        <span>Cámara ANPR</span>
                      </button>
                    )}
                  </div>

                  <span className={`text-[10px] font-mono font-bold transition-colors ${
                    isCountrySelectionMissing
                      ? 'text-amber-700 dark:text-amber-400'
                      : isPlateInvalid
                      ? 'text-rose-700 dark:text-rose-400'
                      : isPlateFormatValid
                      ? (isForeignPlate ? 'text-sky-700 dark:text-sky-400' : 'text-emerald-700 dark:text-emerald-400')
                      : 'text-slate-700 dark:text-slate-200'
                  }`}>
                    {isCountrySelectionMissing ? (
                      '⚠️ Seleccione país primero'
                    ) : isForeignPlate ? (
                      isPlateInvalid ? (
                        `Formato no legal (${cleanPlate.length} carac.)`
                      ) : isPlateFormatValid ? (
                        `✓ Formato legal oficial (${activeCountryRule?.flag || 'EXT'})`
                      ) : (
                        `Formato oficial: ${activeCountryRule?.example || 'Alfanumérico'}`
                      )
                    ) : entryVehicleType === 'bicycle' || entryVehicleType === 'scooter' ? (
                      isPlateFormatValid ? '✓ Identificador verificado' : 'Identificador interno (1-10 carac.)'
                    ) : (
                      isPlateInvalid ? (
                        `Formato no legal (${cleanPlate.length} carac.)`
                      ) : isPlateFormatValid ? (
                        '✓ Formato legal colombiano (RUNT)'
                      ) : (
                        'Carros (ABC123) / Motos (ABC12D)'
                      )
                    )}
                  </span>
                </div>

                <div className="relative">
                  <input
                    ref={plateInputRef}
                    id="entryPlateInput"
                    type="text"
                    value={entryPlate}
                    disabled={isCountrySelectionMissing}
                    onChange={(e) => {
                      const maxL = activeCountryRule ? activeCountryRule.maxLength : (isForeignPlate ? 10 : 6);
                      const val = formatPlate(e.target.value).slice(0, maxL);
                      setEntryPlate(val);
                      if (entryError) setEntryError(null);
                      if (entryWarning) setEntryWarning(null);
                    }}
                    placeholder={
                      isCountrySelectionMissing
                        ? "SELECCIONE PAÍS..."
                        : "DIGITE LA PLACA"
                    }
                    maxLength={activeCountryRule ? activeCountryRule.maxLength : (isForeignPlate ? 10 : 6)}
                    autoComplete="off"
                    autoFocus
                    className={`w-full border-2 rounded-xl px-4 py-3 text-2xl font-black font-mono tracking-widest uppercase outline-none transition-all text-center shadow-inner placeholder:font-normal placeholder:tracking-normal placeholder:text-lg placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                      isCountrySelectionMissing
                        ? 'border-slate-800 bg-slate-900/50 text-slate-300 cursor-not-allowed placeholder:text-slate-400 dark:placeholder:text-slate-500'
                        : isPlateInvalid
                        ? 'border-rose-500 bg-rose-950/20 text-rose-100 placeholder:text-rose-700/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-rose-950/30'
                        : duplicateActiveTicket
                        ? 'border-amber-500 bg-amber-950/20 text-amber-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20'
                        : isPlateFormatValid
                        ? (isForeignPlate
                            ? 'border-sky-500 bg-sky-950/20 text-sky-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20'
                            : 'border-emerald-500 bg-emerald-950/20 text-emerald-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20')
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                    <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded font-mono transition-colors ${
                      isCountrySelectionMissing
                        ? 'bg-slate-900 text-slate-300 border-slate-800'
                        : isPlateInvalid
                        ? 'bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-600/50'
                        : isPlateFormatValid
                        ? (isForeignPlate ? 'bg-sky-950 text-sky-800 dark:text-sky-300 border-sky-600/50' : 'bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-600/50')
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-700'
                    }`}>
                      {isCountrySelectionMissing
                        ? 'PAÍS'
                        : isPlateInvalid
                        ? `${cleanPlate.length}/${activeCountryRule?.maxLength || 6}`
                        : isPlateFormatValid
                        ? (activeCountryRule?.flag || '✓')
                        : (isForeignPlate ? 'EXT' : 'COL')}
                    </span>
                  </div>
                </div>

                {/* Mensaje visual si la longitud o formato es inválido */}
                {isPlateInvalid && !isCountrySelectionMissing && activeCountryRule && (
                  <div className="mt-2 p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-rose-200 block">
                        Formato de placa no válido para {activeCountryRule.name} {activeCountryRule.flag}
                      </span>
                      <p className="mt-0.5 text-[11px] text-rose-800 dark:text-rose-300/90 leading-relaxed">
                        La placa ingresada (<strong>{cleanPlate}</strong>) no cumple con la estructura requerida.
                        <br />
                        <strong>Estructura:</strong> {activeCountryRule.description}.
                        <br />
                        <span className="text-amber-800 dark:text-amber-300 font-mono font-bold">Ejemplo válido: {activeCountryRule.example}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Mensaje visual si el formato es válido y sin duplicados */}
                {isPlateFormatValid && !duplicateActiveTicket && activeCountryRule && (
                  <div className={`mt-2 p-2 rounded-xl text-xs flex items-center gap-2 ${
                    isForeignPlate 
                      ? 'bg-sky-500/10 border border-sky-500/30 text-sky-800 dark:text-sky-300' 
                      : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  }`}>
                    <Check className={`w-4 h-4 shrink-0 ${isForeignPlate ? 'text-sky-700 dark:text-sky-400' : 'text-emerald-700 dark:text-emerald-400'}`} />
                    <span>
                      {isForeignPlate
                        ? `✓ Placa verificada con formato oficial de ${activeCountryRule.name} ${activeCountryRule.flag} (${cleanPlate}). Listo para registrar.`
                        : `✓ Formato estándar nacional verificado (${cleanPlate}). Listo para registrar.`}
                    </span>
                  </div>
                )}

                {/* Alerta de Advertencia en tiempo real si la placa ya existe en tickets activos */}
                {duplicateActiveTicket && (
                  <div className="mt-2 p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-900 dark:text-amber-300 block">
                        Vehículo ya registrado en patio
                      </span>
                      <p className="mt-0.5 text-[11px] text-amber-900 dark:text-amber-200/90 leading-relaxed">
                        El vehículo con placa <strong className="font-mono text-amber-950 dark:text-white underline">{formatPlate(entryPlate)}</strong> ya se encuentra actualmente en el parqueadero en el puesto <strong className="font-mono text-amber-950 dark:text-white">{duplicateActiveTicket.spotCode}</strong> con ticket activo <strong className="font-mono text-amber-950 dark:text-white">#{duplicateActiveTicket.ticketNumber}</strong> (Ingresó a las {new Date(duplicateActiveTicket.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Spot assignment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Puesto Asignado
                  </label>
                  <select
                    value={entrySpotCode}
                    onChange={(e) => setEntrySpotCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                  >
                    {availableSpotsForType.length === 0 ? (
                      <option value="">¡Sin puestos libres!</option>
                    ) : (
                      availableSpotsForType.map((s) => (
                        <option key={s.id} value={s.code}>
                          Puesto {s.code}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Tarifa Vigente
                  </label>
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-200 font-normal">Hora:</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                      {formatCurrency(rates[entryVehicleType]?.hourRate || 0, rates.currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  placeholder="Ej: Casco negro en manillar, rayón en puerta..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              {/* Advertencia */}
              {entryWarning && (
                <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-800 dark:text-amber-300 block">Atención:</span>
                    <span>{entryWarning}</span>
                  </div>
                </div>
              )}

              {entryError && !entryWarning && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-700 dark:text-rose-400" />
                  <span>{entryError}</span>
                </div>
              )}

              {/* Submit button */}
              <div className="pt-2">
                {currentUser && !currentUser.permissions.canRegisterEntry ? (
                  <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
                    <span>Tu usuario no tiene permiso para registrar entradas.</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    id="btn-register-entry"
                    disabled={isSubmittingEntry}
                    className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer ${
                      isSubmittingEntry
                        ? 'bg-slate-700 text-slate-300 cursor-wait opacity-60'
                        : isForeignPlate
                        ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 hover:shadow-lg hover:shadow-sky-500/20'
                        : duplicateActiveTicket
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-lg hover:shadow-indigo-600/30'
                    }`}
                    title={
                      duplicateActiveTicket
                        ? 'El vehículo ya se encuentra registrado con un ticket activo'
                        : isForeignPlate && isCountrySelectionMissing
                        ? 'Debe seleccionar un país de la lista antes de permitir el ingreso'
                        : isForeignPlate && isCustomCountryNameMissing
                        ? 'Debe especificar el país de procedencia antes de permitir el ingreso'
                        : 'Ingresar vehículo y generar ticket'
                    }
                  >
                    <Printer className={`w-4 h-4 ${isForeignPlate ? 'text-slate-950' : 'text-white'}`} />
                    <span>{isSubmittingEntry ? 'Registrando ingreso...' : 'Ingresar y Generar Ticket (Enter)'}</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 2: LIQUIDACIÓN, MEDIOS DE PAGO Y FACTURACIÓN         */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 bg-[var(--bg-surface-2)] rounded-2xl border border-[var(--border-subtle)] shadow-xl overflow-hidden flex flex-col text-[var(--text-primary)] backdrop-blur-sm">
          {/* Card Header */}
          <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface-3)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Cobro y Salida POS</h3>
                <p className="text-[11px] text-slate-700 dark:text-slate-200">Cálculo de tiempo transcurrido y facturación</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedTicket && (
                <button
                  type="button"
                  onClick={handleCancelExitProcess}
                  className="text-xs text-rose-800 dark:text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  title="Cancelar proceso de salida actual y limpiar selección"
                >
                  <X className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
                  <span>Cancelar Salida</span>
                </button>
              )}

              {onOpenTicketScanner && (
                <button
                  type="button"
                  onClick={onOpenTicketScanner}
                  className="text-xs font-bold text-white flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 shadow-xs transition-all cursor-pointer"
                  title="Escanear Código QR de Ticket con Cámara (F4)"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Escanear QR</span>
                  <span className="text-[10px] font-mono bg-indigo-700/80 px-1 py-0.2 rounded text-indigo-200">F4</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {/* Search Input for Exit */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span>Buscar Vehículo por Placa, Ticket o Código de Barras</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border transition-all ${
                    isGunScanning
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`} title="Lector de código de barras físico listo en cualquier momento">
                    <Barcode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{isGunScanning ? 'Leyendo Barras...' : 'Lector Listo'}</span>
                  </span>

                  {onOpenTicketScanner && (
                    <button
                      type="button"
                      onClick={onOpenTicketScanner}
                      className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Cámara QR</span>
                    </button>
                  )}
                  {selectedTicket && (
                    <button
                      type="button"
                      onClick={handleCancelExitProcess}
                      className="text-[11px] text-slate-700 dark:text-slate-200 hover:text-rose-800 dark:text-rose-300 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Limpiar</span>
                    </button>
                  )}
                </div>
              </div>

              {barcodeScanFeedback && (
                <div className="mb-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{barcodeScanFeedback}</span>
                </div>
              )}

              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      e.preventDefault();
                      processScannedBarcode(searchQuery);
                    }
                  }}
                  placeholder="Digite placa o escanee código del ticket..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none uppercase transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
                <Search className="w-4 h-4 text-slate-700 dark:text-slate-200 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Autocomplete dropdown if typing search query and no ticket selected */}
              {searchResults.length > 0 && (!selectedTicket || selectedTicket.plate !== searchQuery) && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl max-h-52 overflow-y-auto divide-y divide-slate-800">
                  {searchResults.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectVehicleForExit(t)}
                      className="w-full p-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{t.plate}</span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium uppercase">({getVehicleName(t.vehicleType)})</span>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold border border-slate-300 dark:border-slate-700">
                          {t.spotCode}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                        Entrada: {new Date(t.entryTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* If a vehicle is selected, show complete exit workflow */}
            {selectedTicket && liveCalculation ? (
              <form onSubmit={handleExitSubmit} noValidate className="space-y-4 pt-1">
                {/* Vehicle Banner Summary */}
                <div className="p-3.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg text-amber-700 dark:text-amber-400">
                      {getVehicleIcon(selectedTicket.vehicleType, 'w-6 h-6')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black font-mono tracking-wider text-slate-900 dark:text-white">
                          {selectedTicket.plate}
                        </span>
                        <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-bold uppercase">
                          {selectedTicket.ticketNumber}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 mt-0.5">
                        <span>Puesto: <strong className="text-slate-900 dark:text-white font-mono">{selectedTicket.spotCode}</strong></span>
                        <span>•</span>
                        <span>Ingreso: <strong className="text-slate-900 dark:text-white font-mono">{new Date(selectedTicket.entryTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                      </div>
                      {selectedTicket.notes && (
                        <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5 mt-1 font-medium">
                          <strong>Observaciones:</strong> {selectedTicket.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-200">Tiempo Transcurrido</div>
                      <div className="text-sm font-black text-amber-700 dark:text-amber-400 font-mono">
                        {liveCalculation.formattedDuration}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCancelExitProcess}
                      className="p-2 rounded-lg bg-white/10 hover:bg-rose-600/80 text-white transition-colors cursor-pointer"
                      title="Cancelar y resetear"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ======================================================= */}
                {/* SALIDA SIN TICKET / TARJETA DE PROPIEDAD                */}
                {/* ======================================================= */}
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 rounded-xl space-y-2.5 text-xs">
                  <label className="flex items-center justify-between cursor-pointer select-none">
                    <span className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      <span>Salida sin ticket físico</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={isNoTicketPresented}
                      onChange={(e) => setIsNoTicketPresented(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                    />
                  </label>

                  {isNoTicketPresented && (
                    <div className="pt-2 border-t border-amber-200/80 dark:border-amber-500/20 space-y-3 animate-in fade-in">
                      <div className="p-2.5 bg-amber-100/80 dark:bg-amber-950/40 rounded-lg border border-amber-300 dark:border-amber-500/30 text-[11px] text-amber-950 dark:text-amber-200 leading-relaxed">
                        <strong className="block font-bold text-amber-900 dark:text-amber-300 mb-0.5">⚠️ Validación de titularidad:</strong>
                        Se requiere validar tarjeta de propiedad e identificación del conductor antes de autorizar la salida.
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-amber-950 dark:text-amber-300 uppercase mb-1">
                            N° Tarjeta de Propiedad *
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: 100293847"
                            value={propertyCardNumber}
                            onChange={(e) => setPropertyCardNumber(e.target.value.toUpperCase())}
                            className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 focus:border-amber-500 dark:focus:border-amber-400 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900 dark:text-slate-100 outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-amber-950 dark:text-amber-300 uppercase mb-1">
                            Nombre del Titular / Conductor *
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: Carlos Ramírez"
                            value={ownerFullName}
                            onChange={(e) => setOwnerFullName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 focus:border-amber-500 dark:focus:border-amber-400 rounded-lg px-2.5 py-1.5 font-medium text-slate-900 dark:text-slate-100 outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-amber-950 dark:text-amber-300 uppercase mb-1">
                            Cédula / Documento Conductor *
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: 10293848"
                            value={ownerDocNumber}
                            onChange={(e) => setOwnerDocNumber(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 focus:border-amber-500 dark:focus:border-amber-400 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900 dark:text-slate-100 outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-white dark:bg-slate-900/80 p-2 rounded-lg border border-amber-200 dark:border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                          Cobrar recargo por pérdida ({formatCurrency(lostTicketFeeAmount, rates.currencySymbol)})
                        </span>
                        <input
                          type="checkbox"
                          checked={applyLostTicketFee}
                          onChange={(e) => setApplyLostTicketFee(e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded border-slate-300 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Rates & Discount summary */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Subtotal por tiempo ({liveCalculation.billableMinutes} min facturables):</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(liveCalculation.totalAmount, rates.currencySymbol)}
                    </span>
                  </div>

                  {isNoTicketPresented && applyLostTicketFee && (
                    <div className="flex justify-between text-amber-800 font-semibold">
                      <span>Recargo Ticket Extraviado / Sin Ticket:</span>
                      <span className="font-mono font-bold">
                        +{formatCurrency(lostTicketFeeAmount, rates.currencySymbol)}
                      </span>
                    </div>
                  )}

                  {/* Discount / Exoneration */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">Descuento:</span>
                      {currentUser?.permissions.canWaiveFee && (
                        <button
                          type="button"
                          onClick={() => setDiscountInput((liveCalculation.totalAmount + (isNoTicketPresented && applyLostTicketFee ? lostTicketFeeAmount : 0)).toString())}
                          className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer"
                        >
                          Cortesía $0
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      placeholder="0"
                      className="w-24 text-right bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="pt-2 border-t-2 border-slate-300 flex justify-between items-baseline">
                    <span className="font-black text-sm text-slate-900 dark:text-slate-100 uppercase">Total a Cobrar:</span>
                    <span className="text-2xl font-black text-emerald-700 font-mono">
                      {formatCurrency(finalTotalAmount, rates.currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* ======================================================= */}
                {/* GROUPED PAYMENT BUTTONS (Clean, uncluttered, intuitive) */}
                {/* ======================================================= */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
                      <span>Seleccione Medio de Pago:</span>
                    </label>
                  </div>

                  {/* 7 Clean Main Category Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {/* 1. Efectivo */}
                    <button
                      type="button"
                      aria-selected={exitPaymentMethod === 'cash'}
                      onClick={() => {
                        setExitPaymentMethod('cash');
                        playSound('beep', soundEnabled);
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        exitPaymentMethod === 'cash'
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm ring-2 ring-emerald-600/30'
                          : 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      <Banknote className={`w-5 h-5 ${exitPaymentMethod === 'cash' ? 'text-white' : 'text-emerald-500'}`} />
                      <span>Efectivo</span>
                    </button>

                    {/* 2. Tarjeta */}
                    <button
                      type="button"
                      aria-selected={exitPaymentMethod === 'card'}
                      onClick={() => {
                        setExitPaymentMethod('card');
                        playSound('beep', soundEnabled);
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        exitPaymentMethod === 'card'
                          ? 'bg-sky-700 text-white border-sky-800 shadow-sm ring-2 ring-sky-600/30'
                          : 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      <CreditCard className={`w-5 h-5 ${exitPaymentMethod === 'card' ? 'text-white' : 'text-sky-500'}`} />
                      <span>Tarjeta</span>
                    </button>

                    {/* 3. Billeteras (Grouped Button) */}
                    <button
                      type="button"
                      aria-selected={exitPaymentMethod === 'wallet'}
                      onClick={() => {
                        setExitPaymentMethod('wallet');
                        playSound('beep', soundEnabled);
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        exitPaymentMethod === 'wallet'
                          ? 'bg-purple-800 text-white border-purple-900 shadow-sm ring-2 ring-purple-600/30'
                          : 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      <Smartphone className={`w-5 h-5 ${exitPaymentMethod === 'wallet' ? 'text-white' : 'text-purple-500'}`} />
                      <span>Billeteras</span>
                    </button>

                    {/* 4. Códigos QR (Grouped Button) */}
                    <button
                      type="button"
                      aria-selected={exitPaymentMethod === 'qr'}
                      onClick={() => {
                        setExitPaymentMethod('qr');
                        playSound('beep', soundEnabled);
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        exitPaymentMethod === 'qr'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-500/30'
                          : 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      <QrCode className={`w-5 h-5 ${exitPaymentMethod === 'qr' ? 'text-white' : 'text-amber-500'}`} />
                      <span>QR Bancario</span>
                    </button>

                    {/* 5. Llave Bre-B (Grouped Button) */}
                    <button
                      type="button"
                      aria-selected={exitPaymentMethod === 'bre_b'}
                      onClick={() => {
                        setExitPaymentMethod('bre_b');
                        playSound('beep', soundEnabled);
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        exitPaymentMethod === 'bre_b'
                          ? 'bg-teal-700 text-white border-teal-800 shadow-sm ring-2 ring-teal-600/30'
                          : 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      <Zap className={`w-5 h-5 ${exitPaymentMethod === 'bre_b' ? 'text-amber-800 dark:text-amber-300' : 'text-teal-500'}`} />
                      <span>Llave Bre-B</span>
                    </button>

                    {/* 6. Transferencia Bancaria */}
                    <button
                      type="button"
                      aria-selected={exitPaymentMethod === 'transfer'}
                      onClick={() => {
                        setExitPaymentMethod('transfer');
                        playSound('beep', soundEnabled);
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        exitPaymentMethod === 'transfer'
                          ? 'bg-indigo-800 text-white border-indigo-900 shadow-sm ring-2 ring-indigo-600/30'
                          : 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      <Building2 className={`w-5 h-5 ${exitPaymentMethod === 'transfer' ? 'text-white' : 'text-indigo-500'}`} />
                      <span>Transferencia</span>
                    </button>

                    {/* 7. Pago Mixto */}
                    <button
                      type="button"
                      aria-selected={exitPaymentMethod === 'mixed'}
                      onClick={() => {
                        setExitPaymentMethod('mixed');
                        playSound('beep', soundEnabled);
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        exitPaymentMethod === 'mixed'
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-500/30'
                          : 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      <Layers className={`w-5 h-5 ${exitPaymentMethod === 'mixed' ? 'text-teal-700 dark:text-teal-400' : 'text-indigo-500'}`} />
                      <span>Pago Mixto</span>
                    </button>
                  </div>

                  {/* Sub-panel 1: Efectivo */}
                  {exitPaymentMethod === 'cash' && finalTotalAmount > 0 && (
                    <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-xl space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                        <div>
                          <label htmlFor="cashReceivedInput" className="text-xs font-bold text-emerald-950 dark:text-emerald-300 block">
                            Monto Entregado por el Cliente:
                          </label>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Digite libremente cualquier valor o elija una sugerencia
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-mono font-bold text-sm pointer-events-none">
                            {rates.currencySymbol || '$'}
                          </span>
                          <input
                            id="cashReceivedInput"
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={cashReceivedInput}
                            onChange={(e) => {
                              setCashReceivedInput(e.target.value);
                              if (exitError) setExitError(null);
                            }}
                            className={`w-40 pl-7 pr-3 py-1.5 text-right bg-white dark:bg-slate-900 border text-slate-900 dark:text-slate-100 rounded-lg text-base font-black font-mono outline-none transition-all ${
                              isCashUnder
                                ? 'border-rose-400 dark:border-rose-600 focus:ring-2 focus:ring-rose-400/30'
                                : isCashExact || isCashOver
                                ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'
                                : 'border-slate-300 dark:border-slate-700 focus:border-emerald-600'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Botones de montos rápidos y sugerencias */}
                      <div className="flex items-center justify-between gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Sugerencias:
                        </span>
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={() => setCashReceivedInput(finalTotalAmount.toString())}
                            className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold cursor-pointer transition-colors ${
                              isCashExact
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            Exacto ({formatCurrency(finalTotalAmount, rates.currencySymbol)})
                          </button>

                          {/* Billetes y redondeos colombianos sugeridos */}
                          {(() => {
                            const suggestions = new Set<number>();
                            if (finalTotalAmount % 1000 !== 0) {
                              suggestions.add(Math.ceil(finalTotalAmount / 1000) * 1000);
                            }
                            [2000, 5000, 10000, 20000, 50000, 100000].forEach(val => {
                              if (val > finalTotalAmount) suggestions.add(val);
                            });
                            return Array.from(suggestions).sort((a, b) => a - b).slice(0, 4).map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setCashReceivedInput(val.toString())}
                                className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold cursor-pointer transition-colors ${
                                  cashReceivedVal === val
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-emerald-100/90 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                                }`}
                              >
                                ${val.toLocaleString('es-CO')}
                              </button>
                            ));
                          })()}

                          {hasCashTyped && (
                            <button
                              type="button"
                              onClick={() => setCashReceivedInput('')}
                              className="text-xs bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md font-mono cursor-pointer"
                              title="Limpiar valor digitado"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Estado visual en tiempo real del monto */}
                      {isCashUnder && (
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg text-xs space-y-1.5 animate-in fade-in">
                          <div className="flex items-center justify-between text-rose-800 dark:text-rose-300 font-bold">
                            <span className="flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>Monto Menor al Total: Faltan {formatCurrency(cashShortage, rates.currencySymbol)}</span>
                            </span>
                            <span className="font-mono text-rose-900 dark:text-rose-200 font-black">
                              -{formatCurrency(cashShortage, rates.currencySymbol)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-rose-200 dark:border-rose-900/60 text-[11px]">
                            <span className="text-rose-700 dark:text-rose-400">
                              No es posible proceder hasta completar el pago.
                            </span>
                            <button
                              type="button"
                              onClick={handleSwitchToSplitWithCurrentCash}
                              className="font-bold text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <span>¿Dividir resto en Pago Mixto?</span>
                              <span>→</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {isCashExact && (
                        <div className="p-2.5 bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs flex items-center justify-between text-emerald-900 dark:text-emerald-200 font-bold animate-in fade-in">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Monto Correcto: Pago exacto al 100%.</span>
                          </span>
                          <span className="bg-emerald-600 text-white text-[10px] uppercase px-2 py-0.5 rounded font-black tracking-wider">
                            Listo para proceder
                          </span>
                        </div>
                      )}

                      {isCashOver && (
                        <div className="p-2.5 bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs flex items-center justify-between text-emerald-900 dark:text-emerald-200 font-bold animate-in fade-in">
                          <span className="flex items-center gap-1.5">
                            <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Monto Mayor: Pago recibido con éxito.</span>
                          </span>
                          <span className="bg-emerald-600 text-white text-[10px] uppercase px-2 py-0.5 rounded font-black tracking-wider">
                            Genera vueltos
                          </span>
                        </div>
                      )}

                      {/* Caja Destacada de Cambio / Vueltas */}
                      <div className={`flex justify-between items-center p-3 rounded-lg border text-xs transition-colors ${
                        isCashOver
                          ? 'bg-emerald-100/80 dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-700'
                          : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800'
                      }`}>
                        <div>
                          <span className="font-extrabold text-slate-800 dark:text-slate-100 block">
                            Cambio / Vueltas a Entregar:
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {isCashOver
                              ? 'Entregue este excedente al cliente antes de registrar la salida'
                              : isCashExact
                              ? 'Total cubierto exacto (no requiere cambio)'
                              : isCashUnder
                              ? `Faltan ${formatCurrency(cashShortage, rates.currencySymbol)} para cubrir el valor`
                              : 'Esperando monto entregado por el cliente...'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`text-xl font-black font-mono ${
                            isCashOver
                              ? 'text-emerald-700 dark:text-emerald-300 text-2xl'
                              : isCashExact
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isCashUnder
                              ? 'text-rose-600 dark:text-rose-400 text-base'
                              : 'text-slate-400 dark:text-slate-600'
                          }`}>
                            {formatCurrency(changeGiven, rates.currencySymbol)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub-panel 2: Tarjeta / Datáfono */}
                  {exitPaymentMethod === 'card' && (
                    <div className="p-3.5 bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/80 rounded-xl space-y-3 animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                            Datáfono / Terminal
                          </label>
                          <select
                            value={selectedTerminalId}
                            onChange={(e) => setSelectedTerminalId(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                          >
                            {activeTerminals.map((t) => (
                              <option key={t.id} value={t.id}>{t.name} {t.serialNumber ? `(${t.serialNumber})` : ''}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                            Tipo de Tarjeta
                          </label>
                          <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden text-xs">
                            <button
                              type="button"
                              onClick={() => setCardType('debit')}
                              className={`flex-1 py-1.5 text-center font-bold cursor-pointer ${
                                cardType === 'debit' ? 'bg-sky-800 text-white' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              Débito
                            </button>
                            <button
                              type="button"
                              onClick={() => setCardType('credit')}
                              className={`flex-1 py-1.5 text-center font-bold cursor-pointer ${
                                cardType === 'credit' ? 'bg-sky-800 text-white' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              Crédito
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                          N° Aprobación / Voucher / Recibo del Datáfono
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: 004928"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sub-panel 3: Billeteras (Shows list of available wallets upon click) */}
                  {exitPaymentMethod === 'wallet' && (
                    <div className="p-3.5 bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 rounded-xl space-y-3 animate-in fade-in">
                      <div>
                        <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-300 uppercase mb-1.5">
                          Seleccione la Billetera Digital del Cliente:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {activeWallets.map((w) => {
                            const isSelected = (selectedWalletId || activeWallets[0]?.id) === w.id;
                            return (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => setSelectedWalletId(w.id)}
                                className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-purple-900 text-white border-purple-950 shadow-xs'
                                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-purple-100/50 dark:hover:bg-purple-950/50'
                                }`}
                              >
                                <Smartphone className={`w-4 h-4 ${isSelected ? 'text-amber-800 dark:text-amber-300' : 'text-purple-600 dark:text-purple-400'}`} />
                                <div className="truncate">
                                  <div className="font-bold text-xs">{w.name}</div>
                                  <div className="text-[10px] opacity-80 font-mono truncate">{w.phoneNumber}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Display account details & QR Button */}
                      {currentWallet && (
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-purple-800 dark:text-purple-300">
                              Número Registrado ({currentWallet.name}):
                            </span>
                            <div className="text-sm font-black font-mono text-slate-900 dark:text-slate-100">{currentWallet.phoneNumber}</div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-300">Titular: {currentWallet.holderName}</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenQrModal('wallet', currentWallet.name, currentWallet.phoneNumber, currentWallet.holderName, currentWallet.name)}
                            className="px-3 py-1.5 bg-purple-900 hover:bg-purple-800 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <QrCode className="w-3.5 h-3.5 text-amber-800 dark:text-amber-300" />
                            <span>Ver QR</span>
                          </button>
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                          N° Comprobante / Referencia de Transferencia
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: M103948 o Ref. Transacción"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sub-panel 4: Códigos QR (Shows list of available QRs) */}
                  {exitPaymentMethod === 'qr' && (
                    <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-3 animate-in fade-in">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase mb-1.5">
                          Seleccione el Código QR a Cobrar:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {activeQrs.map((q) => {
                            const isSelected = (selectedQrId || activeQrs[0]?.id) === q.id;
                            return (
                              <button
                                key={q.id}
                                type="button"
                                onClick={() => setSelectedQrId(q.id)}
                                className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-amber-100/50 dark:hover:bg-amber-950/50'
                                }`}
                              >
                                <QrCode className={`w-4 h-4 ${isSelected ? 'text-slate-900 dark:text-white' : 'text-amber-600 dark:text-amber-400'}`} />
                                <div className="truncate">
                                  <div className="font-bold text-xs">{q.name}</div>
                                  <div className="text-[10px] opacity-80 truncate">{q.accountNumber}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {currentQr && (
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300">
                              Cuenta Asociada ({currentQr.name}):
                            </span>
                            <div className="text-sm font-black font-mono text-slate-900 dark:text-slate-100">{currentQr.accountNumber}</div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-300">Titular: {currentQr.holderName}</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenQrModal('qr', currentQr.name, currentQr.accountNumber, currentQr.holderName, currentQr.name)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <QrCode className="w-3.5 h-3.5 text-white" />
                            <span>Ver Código QR</span>
                          </button>
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                          N° Comprobante / Referencia
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Aprobación QR #829103"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sub-panel 5: Llaves Bre-B (Shows list of available Bre-B keys) */}
                  {exitPaymentMethod === 'bre_b' && (
                    <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-xl space-y-3 animate-in fade-in">
                      <div>
                        <label className="block text-[11px] font-bold text-teal-950 uppercase mb-1.5">
                          Seleccione la Llave Bre-B Disponible:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                           {activeBreBKeys.map((b) => {
                            const isSelected = (selectedBreBId || activeBreBKeys[0]?.id) === b.id;
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => setSelectedBreBId(b.id)}
                                className={`p-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-teal-800 text-white border-teal-900 shadow-xs'
                                    : 'bg-white text-slate-800 dark:text-slate-200 border-slate-200 hover:bg-teal-100/50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Zap className={`w-4 h-4 ${isSelected ? 'text-amber-800 dark:text-amber-300' : 'text-teal-600'}`} />
                                  <div>
                                    <div className="font-bold text-xs">{b.keyType}: {b.keyValue}</div>
                                    <div className="text-[10px] opacity-80">{b.registeredEntity}</div>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                  isSelected ? 'bg-white/20' : 'bg-slate-100 text-slate-600 dark:text-slate-300'
                                }`}>
                                  Bre-B
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {currentBreB && (
                        <div className="p-3 bg-white rounded-lg border border-teal-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-teal-800">
                              Llave Activa ({currentBreB.registeredEntity}):
                            </span>
                            <div className="text-sm font-black font-mono text-slate-900 dark:text-slate-100">{currentBreB.keyValue}</div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-300">Tipo: {currentBreB.keyType}</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenQrModal('bre_b', `Bre-B ${currentBreB.registeredEntity}`, currentBreB.keyValue, currentBreB.registeredEntity, 'Red Bre-B')}
                            className="px-3 py-1.5 bg-teal-800 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-800 dark:text-amber-300" />
                            <span>Ver QR Bre-B</span>
                          </button>
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                          N° Comprobante / Voucher Bre-B
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: BRB-84920"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sub-panel 6: Transferencia Bancaria Directa & PSE */}
                  {exitPaymentMethod === 'transfer' && (
                    <div className="p-3.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border border-indigo-500/30 shadow-lg space-y-3.5 animate-in fade-in">
                      {/* Bank selection header */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
                            <span>1. Seleccione la Entidad Bancaria:</span>
                          </label>
                          <span className="text-[10px] text-slate-700 dark:text-slate-200 font-medium">
                            {activeBankAccounts.length} cuenta{activeBankAccounts.length > 1 ? 's' : ''} disponible{activeBankAccounts.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeBankAccounts.map((b) => {
                            const isSelected = (selectedBankAccountId || activeBankAccounts[0]?.id) === b.id;
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => setSelectedBankAccountId(b.id)}
                                className={`p-2.5 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-2 ring-indigo-400/40'
                                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Building2 className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-indigo-700 dark:text-indigo-400'}`} />
                                  <div>
                                    <div className="font-bold text-xs">{b.bankName}</div>
                                    <div className="text-[10px] opacity-80 font-mono">
                                      {b.accountType === 'savings' ? 'Ahorros' : 'Cte'}: {b.accountNumber}
                                    </div>
                                  </div>
                                </div>
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  isSelected ? 'bg-white/25 text-white' : 'bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                  {b.accountType === 'savings' ? 'AHO' : 'CTE'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Channel Switch: PSE vs Direct Bank Transfer */}
                      {currentBankAccount && (
                        <div>
                          <label className="block text-[11px] font-bold text-indigo-200 uppercase tracking-wider mb-1.5">
                            2. Método de Transferencia:
                          </label>
                          <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                setTransferChannel('pse');
                                setIsPseTransferSelected(true);
                              }}
                              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                                transferChannel === 'pse'
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm ring-1 ring-blue-400/50'
                                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-900'
                              }`}
                            >
                              <img src="/pse_logo.png" alt="PSE" className="w-4 h-4 rounded-full object-contain bg-white p-0.5" />
                              <span>⚡ Pago Digital PSE</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTransferChannel('direct');
                                setIsPseTransferSelected(false);
                              }}
                              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                                transferChannel === 'direct'
                                  ? 'bg-indigo-700 text-white shadow-sm ring-1 ring-indigo-400/50'
                                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-900'
                              }`}
                            >
                              <Building2 className="w-3.5 h-3.5 text-indigo-800 dark:text-indigo-300" />
                              <span>🏛️ Datos de Cuenta Directa</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Display Mode 1: PSE Channel (QR + Visible Link) */}
                      {currentBankAccount && transferChannel === 'pse' && (
                        <div className="bg-gradient-to-b from-blue-950/70 to-slate-900 border border-blue-500/40 rounded-2xl p-3.5 space-y-3 shadow-inner">
                          {/* Top row */}
                          <div className="flex items-center justify-between border-b border-blue-900/60 pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-white p-1 flex items-center justify-center shadow-md">
                                <img src="/pse_logo.png" alt="PSE" className="w-full h-full object-contain" />
                              </div>
                              <div>
                                <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>Canal Oficial de Pago PSE</span>
                                  <span className="text-[9px] bg-blue-500 text-white font-mono font-bold px-1.5 py-0.5 rounded-full">EN LÍNEA</span>
                                </h5>
                                <p className="text-[10px] text-blue-200">
                                  {currentBankAccount.bankName} • Débito seguro desde cualquier banco
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenQrModal(
                                'transfer',
                                `PSE ${currentBankAccount.bankName}`,
                                currentBankAccount.accountNumber,
                                currentBankAccount.holderName,
                                currentBankAccount.bankName,
                                currentBankAccount.pseUrl || paymentGatewayConfig?.generalPseUrl,
                                currentBankAccount.pseQrUrl || paymentGatewayConfig?.generalPseQrUrl,
                                'pse'
                              )}
                              className="px-2.5 py-1 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 border border-blue-400/40 transition-colors cursor-pointer"
                              title="Proyectar QR en pantalla grande para el cliente"
                            >
                              <Maximize2 className="w-3 h-3" />
                              <span>Proyectar</span>
                            </button>
                          </div>

                          {/* Body: Responsive QR and Payment Link */}
                          <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-slate-50 dark:bg-slate-950/80 border border-blue-900/40 p-3 rounded-xl">
                            {/* QR Column */}
                            <div className="shrink-0 flex flex-col items-center gap-1.5">
                              <div className="p-2 bg-white rounded-xl shadow-md border-2 border-blue-400">
                                <DynamicQrCode
                                  value={currentBankAccount.pseUrl || paymentGatewayConfig?.generalPseUrl || 'https://registro.pse.com.co'}
                                  customImageUrl={currentBankAccount.pseQrUrl || paymentGatewayConfig?.generalPseQrUrl}
                                  size={130}
                                  centerLogo="/pse_logo.png"
                                  alt="QR PSE Colombia"
                                />
                              </div>
                              <span className="text-[9px] font-medium text-blue-800 dark:text-blue-300 text-center">
                                Escanee con cámara o app
                              </span>
                            </div>

                            {/* Link & Instructions Column */}
                            <div className="flex-1 w-full space-y-2.5 text-left">
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-1">
                                  <Globe className="w-3 h-3 text-blue-700 dark:text-blue-400" />
                                  <span>Enlace de Pago PSE Oficial:</span>
                                </label>
                                <div className="bg-white dark:bg-slate-900 border border-blue-800 rounded-lg p-2 font-mono text-[11px] text-blue-100 break-all select-all flex items-center justify-between gap-2">
                                  <span className="truncate">
                                    {currentBankAccount.pseUrl || paymentGatewayConfig?.generalPseUrl || 'https://registro.pse.com.co'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(
                                    currentBankAccount.pseUrl || paymentGatewayConfig?.generalPseUrl || 'https://registro.pse.com.co',
                                    'pse'
                                  )}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    copiedPseLink
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                                  }`}
                                >
                                  {copiedPseLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                  <span>{copiedPseLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
                                </button>

                                <a
                                  href={currentBankAccount.pseUrl || paymentGatewayConfig?.generalPseUrl || 'https://registro.pse.com.co'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 border border-blue-300 dark:border-blue-400/40 text-blue-800 dark:text-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                                  <span>Abrir Portal PSE</span>
                                </a>
                              </div>

                              <div className="text-[10px] text-slate-200 bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800 space-y-0.5">
                                <p className="text-slate-600 dark:text-slate-300 font-semibold">Instrucciones para el cliente:</p>
                                <p>1. Escanea el QR o abre el enlace en su móvil.</p>
                                <p>2. Selecciona su banco, autoriza el débito y obtiene el comprobante.</p>
                                <p>3. Entregue o dicte el número CUS / Ref. para registrar el cobro.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Display Mode 2: Direct Bank Transfer (Account Info + QR) */}
                      {currentBankAccount && transferChannel === 'direct' && (
                        <div className="bg-slate-50 dark:bg-slate-950 border border-indigo-900/70 rounded-2xl p-3.5 space-y-3 shadow-inner">
                          {/* Top row */}
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                {currentBankAccount.bankName} ({currentBankAccount.accountType === 'savings' ? 'Cuenta de Ahorros' : 'Cuenta Corriente'})
                              </h5>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenQrModal(
                                'transfer',
                                `Transferencia ${currentBankAccount.bankName}`,
                                currentBankAccount.accountNumber,
                                currentBankAccount.holderName,
                                currentBankAccount.bankName,
                                currentBankAccount.pseUrl || paymentGatewayConfig?.generalPseUrl,
                                currentBankAccount.pseQrUrl || paymentGatewayConfig?.generalPseQrUrl,
                                'standard'
                              )}
                              className="px-2.5 py-1 bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-800 dark:text-indigo-300 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                              title="Proyectar QR en pantalla grande"
                            >
                              <Maximize2 className="w-3 h-3" />
                              <span>Proyectar</span>
                            </button>
                          </div>

                          {/* Body: Responsive QR and Account Info */}
                          <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
                            {/* QR Column */}
                            <div className="shrink-0 flex flex-col items-center gap-1.5">
                              <div className="p-2 bg-white rounded-xl shadow-md border-2 border-indigo-400">
                                <DynamicQrCode
                                  value={currentBankAccount.accountNumber}
                                  customImageUrl={currentBankAccount.qrImageUrl}
                                  size={130}
                                  alt="QR Bancario"
                                />
                              </div>
                              <span className="text-[9px] font-medium text-slate-700 dark:text-slate-200 text-center">
                                QR para transferencia
                              </span>
                            </div>

                            {/* Account details column */}
                            <div className="flex-1 w-full space-y-2 text-left">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-indigo-800 dark:text-indigo-300 block mb-0.5">
                                  Número de Cuenta ({currentBankAccount.accountType === 'savings' ? 'Ahorros' : 'Corriente'}):
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black font-mono text-slate-900 dark:text-white tracking-wider">
                                    {currentBankAccount.accountNumber}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(currentBankAccount.accountNumber, 'account')}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                      copiedBankAcc ? 'bg-emerald-600 text-white' : 'bg-indigo-50 dark:bg-slate-800 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-slate-700 border border-indigo-200 dark:border-indigo-800'
                                    }`}
                                  >
                                    {copiedBankAcc ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedBankAcc ? '¡Copiado!' : 'Copiar'}</span>
                                  </button>
                                </div>
                              </div>

                              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5 border-t border-slate-200 dark:border-slate-800 pt-2">
                                <div>
                                  Titular: <span className="font-semibold text-slate-900 dark:text-white">{currentBankAccount.holderName}</span>
                                </div>
                                {currentBankAccount.holderId && (
                                  <div className="text-[11px] text-slate-700 dark:text-slate-200 font-mono">
                                    NIT / C.C.: {currentBankAccount.holderId}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Approval / Transaction Reference Input */}
                      <div>
                        <label className="block text-[11px] font-bold text-indigo-200 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>
                            {transferChannel === 'pse'
                              ? '3. N° Transacción / CUS de Aprobación PSE:'
                              : '3. N° Comprobante / Aprobación de Transferencia:'}
                          </span>
                          <span className="text-[10px] text-slate-700 dark:text-slate-200 font-normal lowercase">
                            (código entregado por el cliente)
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder={
                            transferChannel === 'pse'
                              ? "Ej: CUS-84920194 ó Ref. Transacción PSE"
                              : "Ej: TRX-928103 ó Cód. Aprobación Bancaria"
                          }
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-indigo-400/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sub-panel 7: Pago Mixto (Adapted to new groupings) */}
                  {exitPaymentMethod === 'mixed' && (
                    <div className="p-3.5 bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 rounded-xl space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                        <span>
                          Distribuya el total de <strong className="font-mono text-slate-900 dark:text-slate-100">{formatCurrency(finalTotalAmount, rates.currencySymbol)}</strong>:
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const half = Math.round(finalTotalAmount / 2);
                              setSplitCashAmount(half.toString());
                              setSplitSecondAmount((finalTotalAmount - half).toString());
                            }}
                            className="text-[10px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800"
                          >
                            50% / 50%
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSplitCashAmount(finalTotalAmount.toString());
                              setSplitSecondAmount('0');
                            }}
                            className="text-[10px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer"
                          >
                            100% Efectivo
                          </button>
                        </div>
                      </div>

                      {/* Part 1: Cash */}
                      <div className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
                        <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                          <span>Parte 1: Efectivo</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-xs">{rates.currencySymbol || '$'}</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={splitCashAmount}
                            onChange={(e) => setSplitCashAmount(e.target.value)}
                            className="w-32 text-right bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs font-bold font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Part 2: Electronic Channel Selector */}
                      <div className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                          <span className="font-bold text-slate-700 dark:text-slate-200">Parte 2: Medio Digital</span>
                          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                            <select
                              value={splitSecondCategory}
                              onChange={(e) => setSplitSecondCategory(e.target.value as any)}
                              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                            >
                              <option value="wallet">Billetera Digital</option>
                              <option value="qr">Código QR</option>
                              <option value="bre_b">Llave Bre-B</option>
                              <option value="card">Datáfono / Tarjeta</option>
                              <option value="transfer">Transferencia Bancaria</option>
                            </select>

                            {/* Sub-selector depending on chosen category */}
                            {splitSecondCategory === 'wallet' && (
                              <select
                                value={splitSecondSubId || activeWallets[0]?.id}
                                onChange={(e) => setSplitSecondSubId(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                              >
                                {activeWallets.map(w => (
                                  <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                              </select>
                            )}

                            {splitSecondCategory === 'qr' && (
                              <select
                                value={splitSecondSubId || activeQrs[0]?.id}
                                onChange={(e) => setSplitSecondSubId(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                              >
                                {activeQrs.map(q => (
                                  <option key={q.id} value={q.id}>{q.name}</option>
                                ))}
                              </select>
                            )}

                            {splitSecondCategory === 'bre_b' && (
                              <select
                                value={splitSecondSubId || activeBreBKeys[0]?.id}
                                onChange={(e) => setSplitSecondSubId(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                              >
                                {activeBreBKeys.map(b => (
                                  <option key={b.id} value={b.id}>{b.registeredEntity} ({b.keyType})</option>
                                ))}
                              </select>
                            )}

                            {splitSecondCategory === 'card' && (
                              <select
                                value={splitSecondSubId || activeTerminals[0]?.id}
                                onChange={(e) => setSplitSecondSubId(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                              >
                                {activeTerminals.map(t => (
                                  <option key={t.id} value={t.id}>{t.name} {t.serialNumber ? `(${t.serialNumber})` : ''}</option>
                                ))}
                              </select>
                            )}

                            {splitSecondCategory === 'transfer' && (
                              <select
                                value={splitSecondSubId || activeBankAccounts[0]?.id}
                                onChange={(e) => setSplitSecondSubId(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                              >
                                {activeBankAccounts.map(b => (
                                  <option key={b.id} value={b.id}>{b.bankName} ({b.accountNumber})</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>

                        {/* Extra toggle for card type inside split payment */}
                        {splitSecondCategory === 'card' && (
                          <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Tipo de Tarjeta (Mixto):</span>
                            <div className="flex rounded border border-slate-300 dark:border-slate-700 overflow-hidden text-[10px]">
                              <button
                                type="button"
                                onClick={() => setSplitCardType('debit')}
                                className={`px-3 py-1 font-bold cursor-pointer ${
                                  splitCardType === 'debit' ? 'bg-sky-800 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                Débito
                              </button>
                              <button
                                type="button"
                                onClick={() => setSplitCardType('credit')}
                                className={`px-3 py-1 font-bold cursor-pointer ${
                                  splitCardType === 'credit' ? 'bg-sky-800 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                Crédito
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const cashVal = parseFloat(splitCashAmount) || 0;
                              const remainder = Math.max(0, finalTotalAmount - cashVal);
                              setSplitSecondAmount(remainder.toString());
                            }}
                            className="text-[11px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded font-bold transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800"
                          >
                            Calcular Restante
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-mono text-xs">{rates.currencySymbol || '$'}</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0"
                              value={splitSecondAmount}
                              onChange={(e) => setSplitSecondAmount(e.target.value)}
                              className="w-32 text-right bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs font-bold font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <input
                          type="text"
                          placeholder="N° Comprobante / Voucher parte 2..."
                          value={splitSecondReference}
                          onChange={(e) => setSplitSecondReference(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                        />
                      </div>

                      {/* Distribution check */}
                      {(() => {
                        const cashVal = parseFloat(splitCashAmount) || 0;
                        const secondVal = parseFloat(splitSecondAmount) || 0;
                        const currentTotalSplit = cashVal + secondVal;
                        const currentDiff = finalTotalAmount - currentTotalSplit;

                        if (Math.abs(currentDiff) < 0.01) {
                          return (
                            <div className="p-2.5 bg-emerald-100/80 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs flex items-center justify-between text-emerald-900 dark:text-emerald-200 font-bold animate-in fade-in">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>Distribución completa: 100% cubierto ({formatCurrency(currentTotalSplit, rates.currencySymbol)}).</span>
                              </span>
                              <span className="bg-emerald-600 text-white text-[10px] uppercase px-2 py-0.5 rounded font-black tracking-wider">
                                Listo para proceder
                              </span>
                            </div>
                          );
                        }

                        if (currentDiff > 0.01) {
                          return (
                            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg text-xs space-y-1.5 animate-in fade-in">
                              <div className="flex items-center justify-between text-amber-900 dark:text-amber-200 font-bold">
                                <span className="flex items-center gap-1.5">
                                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span>Falta por distribuir: {formatCurrency(currentDiff, rates.currencySymbol)}</span>
                                </span>
                                <span className="font-mono text-amber-950 dark:text-amber-100 font-black">
                                  -{formatCurrency(currentDiff, rates.currencySymbol)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-amber-200 dark:border-amber-800 text-[11px]">
                                <span className="text-amber-800 dark:text-amber-300">
                                  Asignado {formatCurrency(currentTotalSplit, rates.currencySymbol)} de {formatCurrency(finalTotalAmount, rates.currencySymbol)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSplitSecondAmount((secondVal + currentDiff).toString())}
                                  className="font-bold text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer"
                                >
                                  + Asignar restante al medio digital
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg text-xs space-y-1.5 animate-in fade-in">
                            <div className="flex items-center justify-between text-rose-900 dark:text-rose-200 font-bold">
                              <span className="flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>Exceso de distribución: Supera el total por {formatCurrency(Math.abs(currentDiff), rates.currencySymbol)}</span>
                              </span>
                              <span className="font-mono text-rose-950 dark:text-rose-100 font-black">
                                +{formatCurrency(Math.abs(currentDiff), rates.currencySymbol)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-rose-200 dark:border-rose-800 text-[11px]">
                              <span className="text-rose-800 dark:text-rose-300">
                                Total asignado: {formatCurrency(currentTotalSplit, rates.currencySymbol)} (Máximo: {formatCurrency(finalTotalAmount, rates.currencySymbol)})
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const cashPart = Math.min(cashVal, finalTotalAmount);
                                  setSplitCashAmount(cashPart.toString());
                                  setSplitSecondAmount(Math.max(0, finalTotalAmount - cashPart).toString());
                                }}
                                className="font-bold text-rose-700 dark:text-rose-300 hover:underline cursor-pointer"
                              >
                                Ajustar al total exacto
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* ======================================================= */}
                {/* FACTURACIÓN ELECTRÓNICA DIAN (Optional Toggle)          */}
                {/* ======================================================= */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isElectronicInvoiceRequested}
                      onChange={(e) => setIsElectronicInvoiceRequested(e.target.checked)}
                      className="w-4 h-4 text-slate-900 dark:text-slate-100 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-indigo-600" />
                      <span>Emitir Factura Electrónica (DIAN)</span>
                    </span>
                  </label>

                  {isElectronicInvoiceRequested && (
                    <div className="mt-3 p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2.5 text-xs animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-indigo-950 uppercase mb-1">
                            Tipo Doc.
                          </label>
                          <select
                            value={customerDocType}
                            onChange={(e) => setCustomerDocType(e.target.value as any)}
                            className="w-full bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 font-bold outline-none"
                          >
                            <option value="CC">Cédula de Ciudadanía (CC)</option>
                            <option value="NIT">NIT / Empresa</option>
                            <option value="CE">Cédula de Extranjería (CE)</option>
                            <option value="PASSPORT">Pasaporte</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-indigo-950 uppercase mb-1">
                            Número de Cédula / NIT
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: 102938475"
                            value={customerDocNumber}
                            onChange={(e) => setCustomerDocNumber(e.target.value)}
                            className="w-full bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 font-mono font-bold outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-indigo-950 uppercase mb-1">
                            Nombre / Razón Social
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: Juan Pérez o Empresa SAS"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 font-medium outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-indigo-950 uppercase mb-1">
                            Correo Electrónico (Para envío DIAN)
                          </label>
                          <input
                            type="email"
                            placeholder="cliente@email.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            className="w-full bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 font-medium outline-none"
                          />
                        </div>
                      </div>

                      <div className="text-[10px] text-indigo-800 font-medium">
                        * Se generará el Código Único de Factura Electrónica (CUFE) y el consecutivo DIAN de acuerdo a la resolución vigente.
                      </div>
                    </div>
                  )}
                </div>

                {exitError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{exitError}</span>
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-2">
                  {currentUser && !currentUser.permissions.canRegisterExit ? (
                    <div className="w-full p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Tu usuario no tiene permiso para liquidar salidas.</span>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      id="btn-complete-exit"
                      disabled={isPaymentBlocked}
                      className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isPaymentBlocked
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-700 shadow-none'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-98'
                      }`}
                    >
                      {isPaymentBlocked ? (
                        exitPaymentMethod === 'cash' ? (
                          !hasCashTyped ? (
                            <>
                              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                              <span>Ingrese el efectivo entregado por el cliente</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                              <span>Efectivo insuficiente (Faltan {formatCurrency(cashShortage, rates.currencySymbol)})</span>
                            </>
                          )
                        ) : exitPaymentMethod === 'mixed' ? (
                          isSplitUnder ? (
                            <>
                              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                              <span>Falta distribuir {formatCurrency(splitDiff, rates.currencySymbol)} en Pago Mixto</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                              <span>Exceso en Pago Mixto (+{formatCurrency(Math.abs(splitDiff), rates.currencySymbol)})</span>
                            </>
                          )
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>Complete los datos de pago para proceder</span>
                          </>
                        )
                      ) : (
                        <>
                          <Check className="w-5 h-5 text-white font-black" />
                          <span>Cobrar Salida y Generar Factura ({formatCurrency(finalTotalAmount, rates.currencySymbol)})</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            ) : (
              /* Empty state when no vehicle is chosen */
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200">
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800/80 flex items-center justify-center text-slate-700 dark:text-slate-200 mb-3 border border-slate-300 dark:border-slate-700">
                  <Clock className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Esperando vehículo para liquidar</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mt-1">
                  Ingrese la placa o seleccione un vehículo de la tabla inferior o el mapa de plazas para calcular el tiempo y facturar.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BOTTOM: VEHÍCULOS ACTUALMENTE EN EL PARQUEADERO           */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden backdrop-blur-sm">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <span>Vehículos en Parqueadero</span>
              <span className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs px-2 py-0.5 rounded-full font-semibold">
                {activeTickets.length} activos
              </span>
            </h3>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setTableFilterType('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  tableFilterType === 'all'
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos ({activeTickets.length})
              </button>
              {configuredCategories.map((cat) => {
                const count = activeTickets.filter(t => t.vehicleType === cat.id).length;
                const isSelected = tableFilterType === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setTableFilterType(cat.id)}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title={`${cat.name}: ${count} en parqueadero`}
                  >
                    {getVehicleIcon(cat.icon || cat.id, 'w-3.5 h-3.5')}
                    <span>{cat.name}</span>
                    {count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isSelected
                          ? 'bg-indigo-700 text-indigo-100'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Filtrar por placa..."
                className="text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 focus:border-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none w-36 sm:w-44"
              />
              <Search className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-950/90 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Placa / Vehículo</th>
                <th className="py-3 px-4">Puesto</th>
                <th className="py-3 px-4">Hora Entrada</th>
                <th className="py-3 px-4">Tiempo Transcurrido</th>
                <th className="py-3 px-4">Tarifa Estimada</th>
                <th className="py-3 px-4 text-right">Acción de Cobro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {filteredActiveTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-600 dark:text-slate-300">
                    No se encontraron vehículos estacionados con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredActiveTickets.map((ticket) => {
                  const nowIso = new Date().toISOString();
                  const calc = calculateParkingFee(ticket.entryTime, nowIso, ticket.vehicleType, rates);
                  const isSelected = selectedTicket?.id === ticket.id;

                  return (
                    <tr
                      key={ticket.id}
                      className={`hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors ${
                        isSelected ? 'bg-amber-50/80 dark:bg-slate-800/90 font-medium' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {ticket.ticketNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                            {getVehicleIcon(ticket.vehicleType, 'w-3.5 h-3.5')}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm tracking-wide">
                                {ticket.plate}
                              </span>
                              {ticket.isForeignPlate && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-500/30 px-1.5 py-0.2 rounded font-sans uppercase" title={`Placa extranjera proveniente de: ${ticket.originCountry || 'Internacional'}`}>
                                  🌐 {ticket.originCountry || 'Ext'}
                                </span>
                              )}
                            </div>
                            <span className="block text-[10px] text-slate-700 dark:text-slate-200 capitalize">
                              {getVehicleName(ticket.vehicleType)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded font-mono font-semibold">
                          {ticket.spotCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {new Date(ticket.entryTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-200 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>{calc.formattedDuration}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {calc.isWithinGracePeriod ? (
                          <span className="text-slate-700 dark:text-slate-200 font-normal">Gracia ($0)</span>
                        ) : (
                          formatCurrency(calc.totalAmount, rates.currencySymbol)
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {currentUser?.permissions.canReprintTickets !== false && (
                          <button
                            type="button"
                            onClick={() => onPrintTicket(ticket, 'entry')}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            title="Reimprimir Ticket de Ingreso"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                        {currentUser?.permissions.canRegisterExit !== false ? (
                          <button
                            type="button"
                            onClick={() => selectVehicleForExit(ticket)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-lg transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 text-xs"
                          >
                            Cobrar Salida
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 italic px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
                            Solo consulta
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment QR & Details Modal */}
      <PaymentQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        method={qrModalMethod}
        config={paymentGatewayConfig}
        totalAmount={finalTotalAmount}
        currencySymbol={rates.currencySymbol}
        ticketNumber={selectedTicket?.ticketNumber}
        plate={selectedTicket?.plate}
        subMethodName={qrModalSubTitle}
        accountDetails={qrModalAccountDetails}
        pseUrl={qrModalPseUrl || currentBankAccount?.pseUrl || paymentGatewayConfig?.generalPseUrl}
        pseQrUrl={qrModalPseQrUrl || currentBankAccount?.pseQrUrl || paymentGatewayConfig?.generalPseQrUrl}
        initialTab={qrModalInitialTab}
      />
    </div>
  );
};
