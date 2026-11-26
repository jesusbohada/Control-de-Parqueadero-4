import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeAccountingSummary } from '../src/utils/accountingUtils.ts';
import type { ParkingTicket, CashMovement, RatesConfig, ParkingBusinessInfo } from '../src/types.ts';

const rates = (taxPercentage = 0) => ({ taxPercentage, roundingMethod: 'exact', currencySymbol: '$' } as unknown as RatesConfig);
const business = {} as ParkingBusinessInfo;

/** Ticket tal como lo arma el cobro: base (antes de IVA y descuento), IVA, descuento y total cobrado. */
function ticket(o: { base: number; tax?: number; discount?: number; method?: string; splits?: Array<{ method: string; amount: number }> }): ParkingTicket {
  const tax = o.tax ?? 0;
  const discount = o.discount ?? 0;
  return {
    id: `t-${Math.random()}`,
    baseAmount: o.base,
    taxAmount: tax,
    discountAmount: discount,
    totalAmount: Math.max(0, o.base + tax - discount),
    paymentMethod: o.method ?? 'cash',
    paymentDetails: o.splits ? { splitPayments: o.splits } : undefined,
  } as unknown as ParkingTicket;
}

const expense = (amount: number, conceptName = 'Papelería'): CashMovement =>
  ({ id: `m-${Math.random()}`, type: 'expense', amount, conceptName, description: conceptName } as unknown as CashMovement);

describe('computeAccountingSummary', () => {
  test('sin descuentos ni IVA: ingreso neto = recaudo y asiento cuadrado', () => {
    const s = computeAccountingSummary([ticket({ base: 8000 }), ticket({ base: 2000, method: 'card' })], [], rates(), business);
    assert.equal(s.netRevenue, 10000);
    assert.equal(s.cashRevenue, 8000);
    assert.equal(s.bankCardRevenue, 2000);
    assert.equal(s.isBalanced, true);
  });

  test('con descuento: el neto es lo efectivamente recaudado y el asiento cuadra', () => {
    const s = computeAccountingSummary([ticket({ base: 8000, discount: 2000 })], [], rates(), business);
    assert.equal(s.grossRevenue, 8000, 'bruto = antes del descuento');
    assert.equal(s.discounts, 2000);
    assert.equal(s.netRevenue, 6000, 'neto = recaudado');
    assert.equal(s.cashRevenue, 6000);
    assert.equal(s.totalDebits, s.totalCredits);
    assert.equal(s.isBalanced, true);
  });

  test('con IVA 19%: base + IVA = recaudado y el asiento cuadra', () => {
    const s = computeAccountingSummary([ticket({ base: 10000, tax: 1900 })], [], rates(19), business);
    assert.equal(s.netRevenue, 11900);
    assert.equal(s.baseRevenue + s.taxAmount, s.netRevenue);
    assert.equal(s.taxAmount, 1900);
    assert.equal(s.isBalanced, true);
  });

  test('con IVA y descuento el asiento cuadra', () => {
    const s = computeAccountingSummary([ticket({ base: 10000, tax: 1900, discount: 1900 })], [], rates(19), business);
    assert.equal(s.netRevenue, 10000);
    assert.equal(s.isBalanced, true);
  });

  test('pago mixto reparte el recaudo por medio de pago', () => {
    const s = computeAccountingSummary(
      [ticket({ base: 10000, method: 'mixed', splits: [{ method: 'cash', amount: 4000 }, { method: 'nequi', amount: 6000 }] })],
      [], rates(), business
    );
    assert.equal(s.cashRevenue, 4000);
    assert.equal(s.walletRevenue, 6000);
    assert.equal(s.isBalanced, true);
  });

  test('gastos: se restan de la utilidad y el asiento sigue cuadrado', () => {
    const s = computeAccountingSummary([ticket({ base: 10000 })], [expense(3000, 'Rollos de papel')], rates(), business);
    assert.equal(s.totalExpenses, 3000);
    assert.equal(s.operatingIncome, 7000);
    assert.ok(s.pucJournal.some(e => e.code === '519530'), 'papelería → 519530');
    assert.equal(s.isBalanced, true);
  });

  test('tickets antiguos sin baseAmount se contabilizan por su total', () => {
    const legacy = { id: 'old', totalAmount: 5000, paymentMethod: 'cash' } as unknown as ParkingTicket;
    const s = computeAccountingSummary([legacy], [], rates(), business);
    assert.equal(s.netRevenue, 5000);
    assert.equal(s.isBalanced, true);
  });
});
