import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBasicPaymentDetails, cashState, quickCashOptions, initialBasicMethod, resolveTerminal, resolveBankAccount,
} from '../src/components/patio/patioPayments.ts';
import { DEFAULT_TERMINALS, DEFAULT_BANK_ACCOUNTS } from '../src/utils/paymentUtils.ts';

describe('vista nueva del Patio: cobro', () => {
  test('efectivo: misma forma que la vista clásica', () => {
    assert.deepEqual(buildBasicPaymentDetails({ method: 'cash' }), { method: 'cash', methodLabel: 'Efectivo en Caja' });
  });

  test('tarjeta: datáfono elegido o el primero activo', () => {
    const cfg: any = { terminals: [{ id: 't1', name: 'Uno', enabled: false }, { id: 't2', name: 'Dos' }, { id: 't3', name: 'Tres' }] };
    const d = buildBasicPaymentDetails({ method: 'card', config: cfg, cardType: 'credit', reference: ' 123 ' });
    assert.equal(d.cardTerminal, 'Dos');
    assert.equal(d.cardType, 'credit');
    assert.equal(d.referenceNumber, '123');
    assert.equal(buildBasicPaymentDetails({ method: 'card', config: cfg, terminalId: 't3' }).cardTerminal, 'Tres');
    assert.equal(resolveTerminal(null)?.id, DEFAULT_TERMINALS[0].id);
  });

  test('transferencia: cuenta completada con valores por defecto, sin PSE', () => {
    const d = buildBasicPaymentDetails({ method: 'transfer', config: { bankAccounts: [{ id: 'b1', bankName: 'Mi Banco', accountType: 'checking' }] } as any });
    assert.equal(d.methodLabel, 'Transferencia (Mi Banco)');
    assert.equal(d.accountDetails?.entityName, 'Mi Banco (Corriente)');
    assert.ok(d.accountDetails?.accountNumber);
    assert.equal(d.isPsePayment, false);
    assert.equal(resolveBankAccount(null)?.bankName, DEFAULT_BANK_ACCOUNTS[0].bankName);
  });

  test('efectivo: bloquea sin monto o con monto insuficiente; calcula vueltos', () => {
    assert.equal(cashState(9450, '', 'cash').blocked, true);
    assert.deepEqual(cashState(9450, '5000', 'cash'), { change: 0, shortage: 4450, blocked: true });
    assert.deepEqual(cashState(9450, '10000', 'cash'), { change: 550, shortage: 0, blocked: false });
    assert.equal(cashState(0, '', 'cash').blocked, false, 'dentro de la gracia no exige efectivo');
    assert.equal(cashState(9450, '', 'card').blocked, false);
  });

  test('billetes sugeridos: exacto y siguientes que cubren el total', () => {
    assert.deepEqual(quickCashOptions(9450), [9450, 10000, 20000, 50000]);
    assert.deepEqual(quickCashOptions(0), []);
  });

  test('medio inicial: solo los soportados; otro → efectivo', () => {
    assert.equal(initialBasicMethod({ defaultMethod: 'card' } as any), 'card');
    assert.equal(initialBasicMethod({ defaultMethod: 'wallet' } as any), 'cash');
    assert.equal(initialBasicMethod(null), 'cash');
  });
});
