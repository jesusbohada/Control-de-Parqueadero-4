import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateParkingFee,
  calculateAgreementDiscount,
  getVehicleRate,
} from '../src/utils/billing.ts';
import type { RatesConfig, CommercialAgreement } from '../src/types.ts';

const ENTRY = '2026-11-26T08:00:00.000Z';
const at = (minutes: number) => new Date(Date.parse(ENTRY) + minutes * 60_000).toISOString();

function makeRates(overrides: Partial<RatesConfig> = {}): RatesConfig {
  return {
    car: { hourRate: 4000, minuteRate: 70, dayRate: 25000, gracePeriodMinutes: 15, minimumChargeMinutes: 15, lostTicketFee: 15000 },
    motorcycle: { hourRate: 2100, minuteRate: 35, dayRate: 15000, gracePeriodMinutes: 10, minimumChargeMinutes: 10, lostTicketFee: 10000 },
    suv: { hourRate: 5400, minuteRate: 90, dayRate: 36000, gracePeriodMinutes: 15, minimumChargeMinutes: 15, lostTicketFee: 15000 },
    bicycle: { hourRate: 1000, minuteRate: 20, dayRate: 5000, gracePeriodMinutes: 15, minimumChargeMinutes: 15, lostTicketFee: 5000 },
    roundingMethod: 'exact',
    taxPercentage: 0,
    currencySymbol: '$',
    ...overrides,
  } as RatesConfig;
}

const fee = (minutes: number, rates = makeRates(), vehicle = 'car') =>
  calculateParkingFee(ENTRY, at(minutes), vehicle as any, rates);

describe('calculateParkingFee — tiempo de gracia', () => {
  test('dentro de la gracia no se cobra', () => {
    const r = fee(15);
    assert.equal(r.isWithinGracePeriod, true);
    assert.equal(r.totalAmount, 0);
  });

  test('salida anterior a la entrada se trata como 0 minutos (sin cobro)', () => {
    const r = calculateParkingFee(at(30), ENTRY, 'car' as any, makeRates());
    assert.equal(r.totalMinutes, 0);
    assert.equal(r.totalAmount, 0);
  });

  test('pasada la gracia se cobra desde el minuto 0', () => {
    const r = fee(16); // exacto: 16 × $70 = $1.120 → redondeo a $50 = $1.150
    assert.equal(r.isWithinGracePeriod, false);
    assert.equal(r.billableMinutes, 16);
    assert.equal(r.totalAmount, 1150);
  });

  test('cada tipo de vehículo usa su propia gracia', () => {
    assert.equal(fee(12, makeRates(), 'motorcycle').isWithinGracePeriod, false); // gracia moto = 10
    assert.equal(fee(12, makeRates(), 'car').isWithinGracePeriod, true);        // gracia carro = 15
  });
});

describe('calculateParkingFee — métodos de redondeo', () => {
  test('fracción de 15 min', () => {
    const r = fee(16, makeRates({ roundingMethod: 'fraction_15' }));
    assert.equal(r.billableMinutes, 30);
    assert.equal(r.totalAmount, 2000); // media hora de $4.000
  });

  test('fracción de 30 min', () => {
    const r = fee(31, makeRates({ roundingMethod: 'fraction_30' }));
    assert.equal(r.billableMinutes, 60);
    assert.equal(r.totalAmount, 4000);
  });

  test('hora siguiente', () => {
    const r = fee(61, makeRates({ roundingMethod: 'next_hour' }));
    assert.equal(r.billableMinutes, 120);
    assert.equal(r.totalAmount, 8000);
  });

  test('el total siempre es múltiplo de $50 (no existen monedas menores)', () => {
    for (const m of [16, 17, 23, 47, 59, 61, 95, 133]) {
      assert.equal(fee(m).totalAmount % 50, 0, `minutos=${m}`);
    }
  });
});

describe('calculateParkingFee — tarifa día', () => {
  test('el cobro de un día se topa en la tarifa día', () => {
    const r = fee(10 * 60, makeRates({ roundingMethod: 'next_hour' })); // 10 h × $4.000 = $40.000 > $25.000
    assert.equal(r.totalAmount, 25000);
  });

  test('más de 24 h: días completos + fracción', () => {
    const r = fee(25 * 60, makeRates({ roundingMethod: 'next_hour' })); // 1 día + 1 h
    assert.equal(r.totalAmount, 25000 + 4000);
  });
});

describe('calculateParkingFee — impuestos', () => {
  test('IVA 19% se suma sobre la base y se redondea a $50', () => {
    const r = fee(30, makeRates({ roundingMethod: 'fraction_30', taxPercentage: 19 }));
    assert.equal(r.baseAmount, 2000);
    assert.equal(r.taxAmount, 400); // 380 → 400
    assert.equal(r.totalAmount, 2400);
  });
});

describe('getVehicleRate', () => {
  test('usa la tarifa directa del tipo', () => {
    assert.equal(getVehicleRate('suv' as any, makeRates()).hourRate, 5400);
  });

  test('categoría personalizada desde rates.categories', () => {
    const rates = makeRates({
      categories: [{ id: 'custom_van', name: 'Van', rate: { hourRate: 6000, minuteRate: 100, dayRate: 40000, gracePeriodMinutes: 5 } } as any],
    });
    const r = getVehicleRate('custom_van' as any, rates);
    assert.equal(r.hourRate, 6000);
    assert.equal(r.gracePeriodMinutes, 5);
  });

  test('tipo desconocido con "moto" en el nombre usa la tarifa de moto', () => {
    assert.equal(getVehicleRate('moto_electrica' as any, makeRates()).hourRate, 2100);
  });

  test('tipo desconocido cae en la tarifa de carro', () => {
    assert.equal(getVehicleRate('desconocido' as any, makeRates()).hourRate, 4000);
  });

  test('sin configuración de tarifas devuelve valores seguros', () => {
    const r = getVehicleRate('car' as any, undefined as any);
    assert.ok(r.hourRate > 0 && r.dayRate > 0);
  });
});

describe('calculateAgreementDiscount (convenios)', () => {
  const rates = makeRates({ roundingMethod: 'next_hour' });
  const exit = at(120); // 2 h → $8.000
  const base = calculateParkingFee(ENTRY, exit, 'car' as any, rates);
  const agreement = (o: Partial<CommercialAgreement>): CommercialAgreement =>
    ({ id: 'a1', name: 'Convenio', isActive: true, discountType: 'percentage_discount', discountValue: 0, ...o } as any);

  test('base de referencia: 2 h = $8.000', () => {
    assert.equal(base.totalAmount, 8000);
  });

  test('porcentaje', () => {
    const r = calculateAgreementDiscount(base, agreement({ discountType: 'percentage_discount', discountValue: 50 }), ENTRY, exit, 'car' as any, rates);
    assert.equal(r.discountAmount, 4000);
    assert.equal(r.finalTotalAmount, 4000);
  });

  test('descuento fijo nunca supera el total', () => {
    const r = calculateAgreementDiscount(base, agreement({ discountType: 'fixed_discount', discountValue: 50000 }), ENTRY, exit, 'car' as any, rates);
    assert.equal(r.finalTotalAmount, 0);
  });

  test('tarifa plana', () => {
    const r = calculateAgreementDiscount(base, agreement({ discountType: 'flat_rate', discountValue: 3000 }), ENTRY, exit, 'car' as any, rates);
    assert.equal(r.finalTotalAmount, 3000);
  });

  test('minutos gratis que cubren todo el tiempo', () => {
    const r = calculateAgreementDiscount(base, agreement({ discountType: 'free_minutes', discountValue: 180 }), ENTRY, exit, 'car' as any, rates);
    assert.equal(r.finalTotalAmount, 0);
  });

  test('minutos gratis parciales cobran solo el tiempo restante', () => {
    const r = calculateAgreementDiscount(base, agreement({ discountType: 'free_minutes', discountValue: 60 }), ENTRY, exit, 'car' as any, rates);
    assert.equal(r.finalTotalAmount, 4000); // queda 1 h
  });

  test('convenio inactivo no descuenta', () => {
    const r = calculateAgreementDiscount(base, agreement({ isActive: false, discountValue: 50 }), ENTRY, exit, 'car' as any, rates);
    assert.equal(r.discountAmount, 0);
  });

  test('convenio no aplicable al tipo de vehículo no descuenta', () => {
    const r = calculateAgreementDiscount(base, agreement({ discountValue: 50, applicableVehicleTypes: ['motorcycle'] } as any), ENTRY, exit, 'car' as any, rates);
    assert.equal(r.discountAmount, 0);
  });
});
