import { RatesConfig, VehicleType, CommercialAgreement, VehicleCategoryConfig, VehicleRate } from '../types';

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

/**
 * Obtiene la tarifa garantizada y completa para cualquier tipo de vehículo,
 * resolviendo de manera segura si es categoría nativa, personalizada o de catálogo.
 */
export function getVehicleRate(
  vehicleType: VehicleType,
  rates: RatesConfig,
  categories?: VehicleCategoryConfig[]
): VehicleRate {
  if (!rates) {
    return {
      hourRate: 4000,
      minuteRate: 70,
      dayRate: 25000,
      gracePeriodMinutes: 15,
      minimumChargeMinutes: 15,
      lostTicketFee: 15000,
    };
  }

  // 1. Coincidencia directa en el objeto raíz de tarifas (ej. rates['car'], rates['custom_van'])
  const direct = rates[vehicleType];
  if (direct && typeof direct.hourRate === 'number') {
    const hr = Number(direct.hourRate) || 0;
    const mr = Number(direct.minuteRate) || (hr > 0 ? Math.round(hr / 60) : 0);
    const dr = Number(direct.dayRate) || (hr > 0 ? hr * 7 : 0);
    const gp = direct.gracePeriodMinutes !== undefined ? Number(direct.gracePeriodMinutes) : 15;
    const minC = direct.minimumChargeMinutes !== undefined ? Number(direct.minimumChargeMinutes) : gp;
    const lost = Number(direct.lostTicketFee) || Number(rates.lostTicketFee) || 15000;
    return {
      hourRate: hr,
      minuteRate: mr,
      dayRate: dr,
      gracePeriodMinutes: gp,
      minimumChargeMinutes: minC,
      lostTicketFee: lost,
    };
  }

  // 2. Búsqueda en el listado de categorías (rates.categories o categories prop)
  const catList = rates.categories || categories || [];
  const foundCat = catList.find((c: any) => c.id === vehicleType);
  if (foundCat) {
    const r = foundCat.rate;
    const hr = Number(r?.hourRate ?? foundCat.defaultHourlyRate ?? 4000);
    const mr = Number(r?.minuteRate ?? foundCat.defaultMinuteRate ?? (hr > 0 ? Math.round(hr / 60) : 70));
    const dr = Number(r?.dayRate ?? foundCat.defaultDailyRate ?? (hr > 0 ? hr * 7 : 25000));
    const gp = Number(r?.gracePeriodMinutes ?? foundCat.gracePeriodMinutes ?? 15);
    const minC = Number(r?.minimumChargeMinutes ?? gp);
    const lost = Number(r?.lostTicketFee ?? rates.lostTicketFee ?? 15000);
    return {
      hourRate: hr,
      minuteRate: mr,
      dayRate: dr,
      gracePeriodMinutes: gp,
      minimumChargeMinutes: minC,
      lostTicketFee: lost,
    };
  }

  // 3. Fallbacks inteligentes por palabras clave en el identificador
  const lower = (vehicleType || '').toLowerCase();
  if ((lower.includes('moto') || lower.includes('bike')) && rates.motorcycle) {
    return {
      hourRate: rates.motorcycle.hourRate || 2100,
      minuteRate: rates.motorcycle.minuteRate || 35,
      dayRate: rates.motorcycle.dayRate || 15000,
      gracePeriodMinutes: rates.motorcycle.gracePeriodMinutes ?? 15,
      minimumChargeMinutes: rates.motorcycle.minimumChargeMinutes ?? 15,
      lostTicketFee: rates.motorcycle.lostTicketFee || rates.lostTicketFee || 10000,
    };
  }
  if ((lower.includes('suv') || lower.includes('camion') || lower.includes('truck')) && rates.suv) {
    return {
      hourRate: rates.suv.hourRate || 5400,
      minuteRate: rates.suv.minuteRate || 90,
      dayRate: rates.suv.dayRate || 36000,
      gracePeriodMinutes: rates.suv.gracePeriodMinutes ?? 15,
      minimumChargeMinutes: rates.suv.minimumChargeMinutes ?? 15,
      lostTicketFee: rates.suv.lostTicketFee || rates.lostTicketFee || 15000,
    };
  }
  if (rates.car) {
    return {
      hourRate: rates.car.hourRate || 4000,
      minuteRate: rates.car.minuteRate || 70,
      dayRate: rates.car.dayRate || 25000,
      gracePeriodMinutes: rates.car.gracePeriodMinutes ?? 15,
      minimumChargeMinutes: rates.car.minimumChargeMinutes ?? 15,
      lostTicketFee: rates.car.lostTicketFee || rates.lostTicketFee || 15000,
    };
  }

  return {
    hourRate: 4000,
    minuteRate: 70,
    dayRate: 25000,
    gracePeriodMinutes: 15,
    minimumChargeMinutes: 15,
    lostTicketFee: rates.lostTicketFee || 15000,
  };
}

export function calculateParkingFee(
  entryTimeStr: string,
  exitTimeStr: string,
  vehicleType: VehicleType,
  rates: RatesConfig,
  categories?: VehicleCategoryConfig[]
): CalculationResult {
  const entryDate = new Date(entryTimeStr);
  const exitDate = new Date(exitTimeStr);
  
  const diffMs = Math.max(0, exitDate.getTime() - entryDate.getTime());
  const rawMinutes = Math.ceil(diffMs / (1000 * 60)); // rounded up to nearest minute
  
  const vehicleRate = getVehicleRate(vehicleType, rates, categories);
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
    baseAmount: finalBaseAmount,
    taxAmount,
    totalAmount,
    appliedRateDescription
  };
}

/**
 * Simulación rápida de cobro a partir de una cantidad de minutos
 */
export function calculateParkingFeeForMinutes(
  minutes: number,
  vehicleType: VehicleType,
  rates: RatesConfig,
  categories?: VehicleCategoryConfig[]
): CalculationResult {
  const now = new Date();
  const entryDate = new Date(now.getTime() - Math.max(0, minutes) * 60 * 1000);
  return calculateParkingFee(entryDate.toISOString(), now.toISOString(), vehicleType, rates, categories);
}

export function formatCurrency(amount: number, currency = '$'): string {
  return `${currency} ${Math.round(amount).toLocaleString('es-CO')}`;
}

export function formatPlate(plate: string): string {
  return plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export interface AgreementDiscountResult {
  discountAmount: number;
  finalTotalAmount: number;
  discountDescription: string;
}

export function calculateAgreementDiscount(
  baseCalculation: CalculationResult,
  agreement: CommercialAgreement,
  entryTimeStr: string,
  exitTimeStr: string,
  vehicleType: VehicleType,
  rates: RatesConfig
): AgreementDiscountResult {
  const originalTotal = baseCalculation.totalAmount || 0;
  if (!agreement || !agreement.isActive || originalTotal <= 0) {
    return {
      discountAmount: 0,
      finalTotalAmount: originalTotal,
      discountDescription: 'Sin descuento de convenio'
    };
  }

  // Check vehicle type compatibility
  if (agreement.applicableVehicleTypes && agreement.applicableVehicleTypes.length > 0) {
    const isApplicable = agreement.applicableVehicleTypes.includes('all') || agreement.applicableVehicleTypes.includes(vehicleType);
    if (!isApplicable) {
      return {
        discountAmount: 0,
        finalTotalAmount: originalTotal,
        discountDescription: `No aplica para tipo de vehículo ${vehicleType}`
      };
    }
  }

  let discount = 0;
  let description = '';

  switch (agreement.discountType) {
    case 'free_minutes': {
      const freeMins = Math.max(0, agreement.discountValue || 0);
      const totalMins = baseCalculation.totalMinutes;
      if (totalMins <= freeMins) {
        discount = originalTotal;
        description = `${agreement.name}: ${freeMins} min gratis (100% cubierto)`;
      } else {
        const entryDate = new Date(entryTimeStr);
        const adjustedEntry = new Date(entryDate.getTime() + freeMins * 60 * 1000);
        const adjustedCalc = calculateParkingFee(adjustedEntry.toISOString(), exitTimeStr, vehicleType, rates);
        discount = Math.max(0, originalTotal - adjustedCalc.totalAmount);
        description = `${agreement.name}: ${freeMins} min gratis (-$${discount.toLocaleString('es-CO')})`;
      }
      break;
    }
    case 'percentage_discount': {
      const pct = Math.min(100, Math.max(0, agreement.discountValue || 0));
      discount = Math.round((originalTotal * pct) / 100);
      discount = Math.floor(discount / 50) * 50;
      description = `${agreement.name}: ${pct}% de descuento (-$${discount.toLocaleString('es-CO')})`;
      break;
    }
    case 'fixed_discount': {
      const fixed = Math.max(0, agreement.discountValue || 0);
      discount = Math.min(originalTotal, fixed);
      description = `${agreement.name}: Descuento fijo (-$${discount.toLocaleString('es-CO')})`;
      break;
    }
    case 'flat_rate': {
      const flat = Math.max(0, agreement.discountValue || 0);
      if (originalTotal > flat) {
        discount = originalTotal - flat;
        description = `${agreement.name}: Tarifa plana de $${flat.toLocaleString('es-CO')}`;
      } else {
        discount = 0;
        description = `${agreement.name}: Tarifa habitual es menor que la plana`;
      }
      break;
    }
    default:
      discount = 0;
      description = agreement.name;
  }

  discount = Math.min(originalTotal, Math.max(0, discount));
  const finalTotal = Math.max(0, originalTotal - discount);

  return {
    discountAmount: discount,
    finalTotalAmount: finalTotal,
    discountDescription: description
  };
}
