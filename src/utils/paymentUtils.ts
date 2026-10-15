import { 
  PaymentMethod, 
  PaymentMethodConfig, 
  PaymentGatewayConfig, 
  ParkingTicket, 
  PaymentTransactionDetails, 
  SplitPaymentItem,
  WalletOption,
  QrOption,
  BreBKey,
  CardTerminalOption,
  BankAccountOption
} from '../types';

export const DEFAULT_WALLETS: WalletOption[] = [
  {
    id: 'nequi',
    name: 'Nequi',
    phoneNumber: '310 892 4511',
    holderName: 'Estacionamiento Central',
    enabled: true,
    icon: 'Smartphone',
  },
  {
    id: 'daviplata',
    name: 'Daviplata',
    phoneNumber: '310 892 4511',
    holderName: 'Estacionamiento Central',
    enabled: true,
    icon: 'Smartphone',
  },
  {
    id: 'dale',
    name: 'Dale! / Aval',
    phoneNumber: '310 892 4511',
    holderName: 'Estacionamiento Central',
    enabled: true,
    icon: 'Smartphone',
  },
];

export const DEFAULT_QR_CODES: QrOption[] = [
  {
    id: 'qr_bancolombia',
    name: 'QR Bancolombia',
    bankOrEntity: 'Bancolombia',
    accountNumber: 'Cta Ahorros: 458-923841-02',
    holderName: 'Estacionamiento Central SAS',
    enabled: true,
  },
  {
    id: 'qr_redeban',
    name: 'QR Redeban Multibanco',
    bankOrEntity: 'Redeban Interoperable',
    accountNumber: 'Código Comercio: 849201',
    holderName: 'Estacionamiento Central SAS',
    enabled: true,
  },
  {
    id: 'qr_aval',
    name: 'QR Grupo Aval (Bogotá, Occidente, AV Villas)',
    bankOrEntity: 'Grupo Aval',
    accountNumber: 'Cta Ahorros: 019-482019-33',
    holderName: 'Estacionamiento Central SAS',
    enabled: true,
  },
];

export const DEFAULT_BRE_B_KEYS: BreBKey[] = [
  {
    id: 'breb_phone',
    keyType: 'phone',
    keyTypeName: 'Número Celular',
    keyValue: '310 892 4511',
    registeredEntity: 'Bancolombia Bre-B',
    holderName: 'Estacionamiento Central SAS',
    enabled: true,
  },
  {
    id: 'breb_nit',
    keyType: 'national_id',
    keyTypeName: 'NIT / Cédula',
    keyValue: '901.458.723-1',
    registeredEntity: 'Davivienda Bre-B',
    holderName: 'Estacionamiento Central SAS',
    enabled: true,
  },
  {
    id: 'breb_email',
    keyType: 'email',
    keyTypeName: 'Correo Electrónico',
    keyValue: 'pagos@parqueaderocentral.com',
    registeredEntity: 'Nequi Bre-B',
    holderName: 'Estacionamiento Central SAS',
    enabled: true,
  },
];

export const DEFAULT_TERMINALS: CardTerminalOption[] = [
  {
    id: 'term_redeban',
    name: 'Datáfono Redeban (Inalámbrico)',
    serialNumber: 'RDB-94821',
    enabled: true,
  },
  {
    id: 'term_bold',
    name: 'Datáfono Bold SmartPOS',
    serialNumber: 'BLD-40192',
    enabled: true,
  },
  {
    id: 'term_credibanco',
    name: 'Datáfono Credibanco',
    serialNumber: 'CRD-11938',
    enabled: false,
  },
];

export const DEFAULT_BANK_ACCOUNTS: BankAccountOption[] = [
  {
    id: 'bank_bancolombia',
    bankName: 'Bancolombia',
    accountType: 'savings',
    accountNumber: '458-923841-02',
    holderName: 'Estacionamiento Central SAS',
    holderId: '901.458.723-1',
    pseUrl: 'https://zonapagos.com/t_estacionamientocentral/pagos.asp',
    pseQrUrl: '/pse_logo.png',
    enablePse: true,
    enabled: true,
  },
  {
    id: 'bank_davivienda',
    bankName: 'Davivienda',
    accountType: 'checking',
    accountNumber: '019-482019-33',
    holderName: 'Estacionamiento Central SAS',
    holderId: '901.458.723-1',
    pseUrl: 'https://pagos.davivienda.com/pse/estacionamientocentral',
    pseQrUrl: '/pse_logo.png',
    enablePse: true,
    enabled: true,
  },
  {
    id: 'bank_bogota',
    bankName: 'Banco de Bogotá',
    accountType: 'savings',
    accountNumber: '284-019284-11',
    holderName: 'Estacionamiento Central SAS',
    holderId: '901.458.723-1',
    pseUrl: 'https://pagos.bancodebogota.com/pse/estacionamientocentral',
    pseQrUrl: '/pse_logo.png',
    enablePse: true,
    enabled: true,
  }
];

export const DEFAULT_PAYMENT_GATEWAY_CONFIG: PaymentGatewayConfig = {
  allowMixedPayment: true,
  allowQuickDenominations: true,
  suggestExactChange: true,
  defaultMethod: 'cash',
  requireReferenceForElectronic: false,

  wallets: DEFAULT_WALLETS,
  qrCodes: DEFAULT_QR_CODES,
  breBKeys: DEFAULT_BRE_B_KEYS,
  terminals: DEFAULT_TERMINALS,
  bankAccounts: DEFAULT_BANK_ACCOUNTS,

  nequiPhone: '310 892 4511',
  nequiHolder: 'Estacionamiento Central',
  daviplataPhone: '310 892 4511',
  daviplataHolder: 'Estacionamiento Central',
  bancolombiaAccount: '458-923841-02 (Ahorros)',
  bancolombiaQrInfo: 'Bancolombia QR Central',
  cardTerminalName: 'Datáfono Redeban / Bold',
  generalPseUrl: 'https://registro.pse.com.co',
  generalPseQrUrl: '/pse_logo.png',
};

export interface PaymentMethodMeta {
  label: string;
  shortLabel: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  colorClass: string;
  isElectronic: boolean;
  category: 'cash' | 'card' | 'digital_wallet' | 'mixed' | 'agreement';
  defaultIconName: string;
}

export function getPaymentMethodMeta(method?: PaymentMethod, details?: PaymentTransactionDetails): PaymentMethodMeta {
  switch (method) {
    case 'card':
      return {
        label: details?.cardTerminal ? `Tarjeta (${details.cardTerminal})` : 'Tarjeta Débito / Crédito',
        shortLabel: 'Tarjeta',
        badgeBg: 'bg-blue-50 dark:bg-blue-950/60',
        textColor: 'text-blue-700 dark:text-blue-300',
        borderColor: 'border-blue-200 dark:border-blue-800',
        colorClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
        isElectronic: true,
        category: 'card',
        defaultIconName: 'CreditCard',
      };
    case 'wallet':
    case 'nequi':
    case 'daviplata': {
      const sub = details?.subMethodName || (method === 'nequi' ? 'Nequi' : method === 'daviplata' ? 'Daviplata' : 'Billetera Digital');
      return {
        label: sub,
        shortLabel: sub,
        badgeBg: 'bg-purple-50 dark:bg-purple-950/60',
        textColor: 'text-purple-700 dark:text-purple-300',
        borderColor: 'border-purple-200 dark:border-purple-800',
        colorClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
        isElectronic: true,
        category: 'digital_wallet',
        defaultIconName: 'Smartphone',
      };
    }
    case 'qr':
    case 'qr_bancolombia': {
      const sub = details?.subMethodName || 'Código QR';
      return {
        label: sub,
        shortLabel: sub,
        badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
        textColor: 'text-amber-800 dark:text-amber-300',
        borderColor: 'border-amber-200 dark:border-amber-800',
        colorClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
        isElectronic: true,
        category: 'digital_wallet',
        defaultIconName: 'QrCode',
      };
    }
    case 'bre_b': {
      const sub = details?.subMethodName ? `Bre-B (${details.subMethodName})` : 'Llave Bre-B';
      return {
        label: sub,
        shortLabel: 'Bre-B',
        badgeBg: 'bg-teal-50 dark:bg-teal-950/60',
        textColor: 'text-teal-800 dark:text-teal-300',
        borderColor: 'border-teal-200 dark:border-teal-800',
        colorClass: 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
        isElectronic: true,
        category: 'digital_wallet',
        defaultIconName: 'Zap',
      };
    }
    case 'transfer':
      return {
        label: 'Transferencia Bancaria / PSE',
        shortLabel: 'Transferencia',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60',
        textColor: 'text-indigo-700 dark:text-indigo-300',
        borderColor: 'border-indigo-200 dark:border-indigo-800',
        colorClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
        isElectronic: true,
        category: 'digital_wallet',
        defaultIconName: 'ArrowRightLeft',
      };
    case 'mixed':
      return {
        label: 'Pago Mixto / Combinado',
        shortLabel: 'Pago Mixto',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
        textColor: 'text-emerald-800 dark:text-emerald-300',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        colorClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
        isElectronic: false,
        category: 'mixed',
        defaultIconName: 'Layers',
      };
    case 'agreement':
      return {
        label: details?.agreementName ? `Convenio: ${details.agreementName}` : 'Convenio / Cortesía',
        shortLabel: 'Convenio',
        badgeBg: 'bg-slate-100 dark:bg-slate-800',
        textColor: 'text-slate-800 dark:text-slate-200',
        borderColor: 'border-slate-300 dark:border-slate-700',
        colorClass: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700',
        isElectronic: false,
        category: 'agreement',
        defaultIconName: 'Building2',
      };
    case 'cash':
    default:
      return {
        label: 'Efectivo',
        shortLabel: 'Efectivo',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
        textColor: 'text-emerald-800 dark:text-emerald-300',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        colorClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
        isElectronic: false,
        category: 'cash',
        defaultIconName: 'Banknote',
      };
  }
}

/**
 * Returns summary string for printing on receipt tickets or displaying in tables
 */
export function formatPaymentDetailsSummary(ticket: ParkingTicket): string {
  const method = ticket.paymentMethod || 'cash';
  const meta = getPaymentMethodMeta(method);
  const details = ticket.paymentDetails;

  if (method === 'mixed' && details?.splitPayments && details.splitPayments.length > 0) {
    const parts = details.splitPayments
      .filter(p => p.amount > 0)
      .map(p => `$${p.amount.toLocaleString()} (${p.methodName}${p.reference ? ` Ref:${p.reference}` : ''})`);
    return `Pago Mixto: ${parts.join(' + ')}`;
  }

  if (method === 'card') {
    const typeLabel = details?.cardType === 'credit' ? 'Crédito' : details?.cardType === 'debit' ? 'Débito' : '';
    const terminal = details?.cardTerminal ? ` - ${details.cardTerminal}` : '';
    const ref = details?.referenceNumber ? ` (Voucher #${details.referenceNumber})` : '';
    return `Tarjeta ${typeLabel}${terminal}${ref}`.trim();
  }

  if (method === 'wallet' || method === 'qr' || method === 'bre_b' || method === 'nequi' || method === 'daviplata' || method === 'qr_bancolombia' || method === 'transfer') {
    const sub = details?.subMethodName || meta.label;
    const ref = details?.referenceNumber ? ` (Ref: ${details.referenceNumber})` : '';
    return `${sub}${ref}`;
  }

  if (method === 'agreement') {
    return details?.notes ? `Convenio: ${details.notes}` : 'Convenio / Cortesía';
  }

  return 'Efectivo';
}

/**
 * Breakdown of ticket payment into Cash in drawer vs Electronic funds.
 * Extremely important for accurate cash register audits when mixed payments are used!
 */
export function getTicketPaymentBreakdown(ticket: ParkingTicket): {
  cashInDrawer: number;
  electronicAmount: number;
  agreementAmount: number;
} {
  const total = ticket.totalAmount || 0;
  const method = ticket.paymentMethod || 'cash';

  if (method === 'cash') {
    return { cashInDrawer: total, electronicAmount: 0, agreementAmount: 0 };
  }

  if (method === 'agreement') {
    return { cashInDrawer: 0, electronicAmount: 0, agreementAmount: total };
  }

  if (method === 'mixed') {
    const splits = ticket.paymentDetails?.splitPayments || [];
    if (splits.length > 0) {
      let cash = 0;
      let electronic = 0;
      let agreement = 0;
      splits.forEach(s => {
        if (s.method === 'cash') cash += s.amount;
        else if (s.method === 'agreement') agreement += s.amount;
        else electronic += s.amount;
      });
      return { cashInDrawer: cash, electronicAmount: electronic, agreementAmount: agreement };
    }
  }

  // Pure electronic
  return { cashInDrawer: 0, electronicAmount: total, agreementAmount: 0 };
}

/**
 * Ensures all payment options, especially bank accounts and PSE parameters,
 * have robust fallback defaults even if stored in an older localStorage schema.
 */
export function ensurePaymentGatewayConfigDefaults(config?: Partial<PaymentGatewayConfig> | null): PaymentGatewayConfig {
  if (!config) return DEFAULT_PAYMENT_GATEWAY_CONFIG;

  // 1. Process Bank Accounts with full Colombian banking fallbacks and PSE support
  let bankAccounts: BankAccountOption[] = [];
  if (config.bankAccounts && Array.isArray(config.bankAccounts) && config.bankAccounts.length > 0) {
    bankAccounts = config.bankAccounts.map((b, idx) => {
      const defaultMatch = DEFAULT_BANK_ACCOUNTS.find(d => d.bankName.toLowerCase() === b.bankName?.toLowerCase()) || DEFAULT_BANK_ACCOUNTS[idx % DEFAULT_BANK_ACCOUNTS.length];
      return {
        ...b,
        enabled: b.enabled !== false, // If undefined or missing, default to true
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
  }

  // Guarantee that at least some bank accounts are enabled and available
  if (bankAccounts.length === 0 || !bankAccounts.some(b => b.enabled)) {
    if (bankAccounts.length > 0) {
      bankAccounts = bankAccounts.map(b => ({ ...b, enabled: true }));
    } else {
      bankAccounts = DEFAULT_BANK_ACCOUNTS;
    }
  }

  // 2. Wallets fallback
  let wallets = (config.wallets && Array.isArray(config.wallets) && config.wallets.length > 0)
    ? config.wallets.map(w => ({ ...w, enabled: w.enabled !== false }))
    : DEFAULT_WALLETS;
  if (!wallets.some(w => w.enabled)) wallets = DEFAULT_WALLETS;

  // 3. QRs fallback
  let qrCodes = (config.qrCodes && Array.isArray(config.qrCodes) && config.qrCodes.length > 0)
    ? config.qrCodes.map(q => ({ ...q, enabled: q.enabled !== false }))
    : DEFAULT_QR_CODES;
  if (!qrCodes.some(q => q.enabled)) qrCodes = DEFAULT_QR_CODES;

  // 4. Bre-B fallback
  let breBKeys = (config.breBKeys && Array.isArray(config.breBKeys) && config.breBKeys.length > 0)
    ? config.breBKeys.map(k => ({ ...k, enabled: k.enabled !== false }))
    : DEFAULT_BRE_B_KEYS;
  if (!breBKeys.some(k => k.enabled)) breBKeys = DEFAULT_BRE_B_KEYS;

  // 5. Terminals fallback
  let terminals = (config.terminals && Array.isArray(config.terminals) && config.terminals.length > 0)
    ? config.terminals.map(t => ({ ...t, enabled: t.enabled !== false }))
    : DEFAULT_TERMINALS;
  if (!terminals.some(t => t.enabled)) terminals = DEFAULT_TERMINALS;

  return {
    ...DEFAULT_PAYMENT_GATEWAY_CONFIG,
    ...config,
    wallets,
    qrCodes,
    breBKeys,
    terminals,
    bankAccounts,
    generalPseUrl: config.generalPseUrl || 'https://registro.pse.com.co',
    generalPseQrUrl: config.generalPseQrUrl || '/pse_logo.png',
  };
}

