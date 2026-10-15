import { RatesConfig, VehicleType } from '../types';

export interface CalculationResult {
  totalMinutes: number;
  billableMinutes: number;
  hours: number;
  minutesRemainder: number;
  formattedDuration: string;
  isWithinGracePeriod: boolean;
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  appliedRateDescription: string;
}

export function calculateParkingFee(
  entryTimeStr: string,
  exitTimeStr: string,
  vehicleType: VehicleType,
  rates: RatesConfig
): CalculationResult {
  const entryDate = new Date(entryTimeStr);
  const exitDate = new Date(exitTimeStr);
  
  const diffMs = Math.max(0, exitDate.getTime() - entryDate.getTime());
  const rawMinutes = Math.ceil(diffMs / (1000 * 60)); // rounded up to nearest minute
  
  // Lookup vehicle rate: direct property in rates, or from rates.categories, or fallback to car
  const customCatRate = rates.categories?.find((c: any) => c.id === vehicleType)?.rate;
  const vehicleRate = rates[vehicleType] || customCatRate || rates.car || {
    hourRate: 4000,
    minuteRate: 70,
    dayRate: 25000,
    gracePeriodMinutes: 15,
    minimumChargeMinutes: 15,
    lostTicketFee: 15000,
  };
  const gracePeriod = vehicleRate.gracePeriodMinutes || 0;
  
  const hours = Math.floor(rawMinutes / 60);
  const minutesRemainder = rawMinutes % 60;
  
  let formattedDuration = '';
  if (hours > 0) {
    formattedDuration = `${hours}h ${minutesRemainder}m`;
  } else {
    formattedDuration = `${rawMinutes} min`;
  }

  // Grace period check
  if (rawMinutes <= gracePeriod) {
    return {
      totalMinutes: rawMinutes,
      billableMinutes: 0,
      hours,
      minutesRemainder,
      formattedDuration,
      isWithinGracePeriod: true,
      baseAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
      appliedRateDescription: `Tiempo de gracia (${gracePeriod} min sin costo)`
    };
  }

  let billableMinutes = rawMinutes;

  // Enforce minimum charge minutes if configured
  if (vehicleRate.minimumChargeMinutes && billableMinutes < vehicleRate.minimumChargeMinutes) {
    billableMinutes = vehicleRate.minimumChargeMinutes;
  }

  // Rounding method adjustments
  switch (rates.roundingMethod) {
    case 'fraction_15': {
      billableMinutes = Math.ceil(billableMinutes / 15) * 15;
      break;
    }
    case 'fraction_30': {
      billableMinutes = Math.ceil(billableMinutes / 30) * 30;
      break;
    }
    case 'next_hour': {
      billableMinutes = Math.ceil(billableMinutes / 60) * 60;
      break;
    }
    case 'exact':
    default:
      // keep billableMinutes as is
      break;
  }

  let baseAmount = 0;
  let appliedRateDescription = '';

  // Check if day rate applies (e.g., if total time exceeds ~8-12 hours or cost exceeds dayRate)
  const fullDays = Math.floor(billableMinutes / (24 * 60));
  const remainingMinutes = billableMinutes % (24 * 60);

  // If vehicleRate has hourRate or minuteRate
  let dayCost = fullDays * vehicleRate.dayRate;
  
  // Calculate remaining cost
  let remainingCost = 0;
  if (rates.roundingMethod === 'exact' && vehicleRate.minuteRate > 0) {
    remainingCost = remainingMinutes * vehicleRate.minuteRate;
    appliedRateDescription = `$${vehicleRate.minuteRate.toLocaleString()}/minuto (cobro exacto por minuto)`;
  } else if (vehicleRate.hourRate > 0) {
    const remHours = remainingMinutes / 60;
    // Charge hourly + minute proportional or full fraction
    remainingCost = Math.ceil(remHours * vehicleRate.hourRate);
    appliedRateDescription = `$${vehicleRate.hourRate.toLocaleString()}/hora (${rates.roundingMethod === 'exact' ? 'cobro proporcional' : 'fracción'})`;
  } else if (vehicleRate.minuteRate > 0) {
    remainingCost = remainingMinutes * vehicleRate.minuteRate;
    appliedRateDescription = `$${vehicleRate.minuteRate.toLocaleString()}/minuto`;
  }

  // Cap remaining cost at day rate if it exceeds it
  if (vehicleRate.dayRate > 0 && remainingCost > vehicleRate.dayRate) {
    remainingCost = vehicleRate.dayRate;
    appliedRateDescription = `Tarifa día completo ($${vehicleRate.dayRate.toLocaleString()})`;
  }

  baseAmount = dayCost + remainingCost;

  // Redondeo comercial a denominación práctica en Colombia (múltiplos de $50 para evitar monedas inexistentes)
  const roundToCashUnit = (val: number, unit = 50) => Math.ceil(val / unit) * unit;
  const finalBaseAmount = roundToCashUnit(baseAmount);

  // Tax calculation if applicable
  const taxRate = (rates.taxPercentage || 0) / 100;
  const taxAmount = roundToCashUnit(Math.round(finalBaseAmount * taxRate));
  const totalAmount = finalBaseAmount + taxAmount;

  return {
    totalMinutes: rawMinutes,
    billableMinutes,
    hours,
    minutesRemainder,
    formattedDuration,
    isWithinGracePeriod: false,
    baseAmount,
    taxAmount,
    totalAmount,
    appliedRateDescription
  };
}

export function formatCurrency(amount: number, currency = '$'): string {
  return `${currency} ${Math.round(amount).toLocaleString('es-CO')}`;
}

export function formatPlate(plate: string): string {
  return plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}
