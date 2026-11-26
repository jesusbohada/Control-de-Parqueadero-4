/**
 * Lógica de cobro de la vista nueva del Patio POS (efectivo, tarjeta y transferencia).
 *
 * Replica EXACTAMENTE cómo OperationsView (vista clásica) arma el detalle del pago para estos
 * tres medios, para que el ticket pagado, los reportes y el cierre de turno queden iguales.
 * Los demás casos (billeteras, QR, Bre-B, mixto, convenios, descuentos, sin ticket, DIAN) se
 * resuelven en la vista clásica.
 */
import type { BankAccountOption, CardTerminalOption, PaymentGatewayConfig, PaymentMethod, PaymentTransactionDetails } from '../../types';
import { DEFAULT_BANK_ACCOUNTS, DEFAULT_TERMINALS } from '../../utils/paymentUtils';

export type BasicPaymentMethod = 'cash' | 'card' | 'transfer';
export const BASIC_PAYMENT_METHODS: BasicPaymentMethod[] = ['cash', 'card', 'transfer'];

/** Medio inicial: el configurado si la vista nueva lo soporta; si no, efectivo. */
export function initialBasicMethod(config?: PaymentGatewayConfig | null): BasicPaymentMethod {
  const m = config?.defaultMethod as PaymentMethod | undefined;
  return m === 'card' || m === 'transfer' ? m : 'cash';
}

/** Datáfonos activos (mismas reglas y valores por defecto que la vista clásica). */
export function listTerminals(config?: PaymentGatewayConfig | null): CardTerminalOption[] {
  const raw = config?.terminals && config.terminals.length > 0 ? config.terminals : DEFAULT_TERMINALS;
  const filtered = raw.filter(t => t.enabled !== false);
  return filtered.length > 0 ? filtered : DEFAULT_TERMINALS;
}

/** El datáfono elegido o, como la vista clásica, el primero activo. */
export function resolveTerminal(config?: PaymentGatewayConfig | null, selectedId?: string): CardTerminalOption | undefined {
  const list = listTerminals(config);
  return list.find(t => t.id === selectedId) || list[0] || DEFAULT_TERMINALS[0];
}

/** La cuenta elegida o, como la vista clásica, la primera activa. */
export function resolveBankAccount(config?: PaymentGatewayConfig | null, selectedId?: string): BankAccountOption | undefined {
  const list = listBankAccounts(config);
  return list.find(b => b.id === selectedId) || list[0] || (DEFAULT_BANK_ACCOUNTS[0] as BankAccountOption);
}

/** Cuentas bancarias activas, completadas con los valores por defecto como en la vista clásica. */
export function listBankAccounts(config?: PaymentGatewayConfig | null): BankAccountOption[] {
  const raw = config?.bankAccounts && config.bankAccounts.length > 0 ? config.bankAccounts : DEFAULT_BANK_ACCOUNTS;
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
    } as BankAccountOption;
  });
  const filtered = mapped.filter(b => b.enabled !== false);
  return filtered.length > 0 ? filtered : (DEFAULT_BANK_ACCOUNTS as BankAccountOption[]);
}

export interface BasicPaymentInput {
  method: BasicPaymentMethod;
  config?: PaymentGatewayConfig | null;
  cardType?: 'debit' | 'credit';
  reference?: string;
  terminalId?: string;
  bankAccountId?: string;
}

/** Detalle del pago con la misma forma que produce la vista clásica para estos medios. */
export function buildBasicPaymentDetails({ method, config, cardType = 'debit', reference, terminalId, bankAccountId }: BasicPaymentInput): PaymentTransactionDetails {
  const ref = reference?.trim() || undefined;
  if (method === 'card') {
    const terminal = resolveTerminal(config, terminalId);
    return {
      method: 'card',
      methodLabel: 'Tarjeta / Datáfono',
      cardType,
      cardTerminal: terminal?.name || 'Datáfono Redeban',
      referenceNumber: ref,
    };
  }
  if (method === 'transfer') {
    const account = resolveBankAccount(config, bankAccountId);
    return {
      method: 'transfer',
      methodLabel: `Transferencia (${account?.bankName || 'Bancaria'})`,
      subMethodId: account?.id,
      subMethodName: account?.bankName,
      accountDetails: account ? {
        accountNumber: account.accountNumber,
        holderName: account.holderName,
        entityName: `${account.bankName} (${account.accountType === 'savings' ? 'Ahorros' : 'Corriente'})`,
      } : undefined,
      referenceNumber: ref,
      isPsePayment: false,
      psePaymentUrl: account?.pseUrl || config?.generalPseUrl,
    };
  }
  return { method: 'cash', methodLabel: 'Efectivo en Caja' };
}

export interface CashState {
  /** Vueltos a entregar (0 si no aplica). */
  change: number;
  /** Lo que falta por recibir (0 si está completo). */
  shortage: number;
  /** true si todavía no se puede cobrar. */
  blocked: boolean;
}

/** Validación de efectivo idéntica a la vista clásica: con total > 0 hay que digitar un monto que lo cubra. */
export function cashState(total: number, receivedInput: string, method: BasicPaymentMethod): CashState {
  if (method !== 'cash' || total <= 0) return { change: 0, shortage: 0, blocked: false };
  const typed = receivedInput.trim().length > 0;
  const received = parseFloat(receivedInput) || 0;
  return {
    change: Math.max(0, received - total),
    shortage: Math.max(0, total - received),
    blocked: !typed || received < total,
  };
}

/** Billetes sugeridos para cobro rápido: el exacto y los siguientes billetes que lo cubren. */
export function quickCashOptions(total: number): number[] {
  if (total <= 0) return [];
  const bills = [2000, 5000, 10000, 20000, 50000, 100000];
  const out = new Set<number>([Math.round(total)]);
  for (const b of bills) {
    const v = Math.ceil(total / b) * b;
    if (v > total) out.add(v);
    if (out.size >= 4) break;
  }
  return Array.from(out).sort((a, b) => a - b);
}
