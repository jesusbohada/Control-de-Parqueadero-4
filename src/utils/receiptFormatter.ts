import { ParkingTicket, CashShift, OperationalDay, ParkingBusinessInfo, RatesConfig } from '../types';

export interface FormatReceiptOptions {
  type: 'entry_ticket' | 'exit_receipt' | 'cash_shift' | 'day_closure' | 'test';
  ticket?: ParkingTicket | null;
  shift?: CashShift | null;
  day?: OperationalDay | null;
  businessInfo?: Partial<ParkingBusinessInfo>;
  rates?: Partial<RatesConfig>;
  paperWidth?: '80mm' | '58mm';
  autoCut?: boolean;
  openDrawer?: boolean;
}

/**
 * Genera texto plano optimizado para impresión térmica monocromática en bobinas de 80mm o 58mm.
 */
export function formatReceiptText(options: FormatReceiptOptions): string {
  const {
    type,
    ticket,
    shift,
    day,
    businessInfo = {},
    rates = {},
    paperWidth = '80mm',
    autoCut = true,
    openDrawer = false,
  } = options;

  const is58 = paperWidth === '58mm';
  const width = is58 ? 32 : 42;
  const sep = '='.repeat(width);
  const thinSep = '-'.repeat(width);

  const center = (str: string = ''): string => {
    const text = String(str).trim();
    if (text.length >= width) return text.substring(0, width);
    const leftPad = Math.floor((width - text.length) / 2);
    return ' '.repeat(leftPad) + text;
  };

  const row = (label: string = '', val: string = ''): string => {
    const l = String(label).trim();
    const v = String(val).trim();
    const space = width - l.length - v.length;
    if (space <= 0) {
      if (l && v) {
        return `${l}\n${' '.repeat(Math.max(0, width - v.length))}${v}`;
      }
      return `${l} ${v}`.substring(0, width);
    }
    return l + ' '.repeat(space) + v;
  };

  const lines: string[] = [];

  // Comandos ESC/POS iniciales
  // Si openDrawer es true, enviamos secuencia de pulso multi-pin (Pin 2, Pin 5, DLE DC4, BEL)
  if (openDrawer) {
    lines.push('\x1bp\x00\x19\xfa\x1bp\x01\x19\xfa\x10\x14\x01\x00\x05\x07');
  }

  // Encabezado del Negocio
  lines.push(center(businessInfo.name || 'SISTEMA DE PARQUEADERO'));
  if (businessInfo.nit) lines.push(center(`NIT: ${businessInfo.nit}`));
  if (businessInfo.address) lines.push(center(businessInfo.address));
  if (businessInfo.phone) lines.push(center(`TEL: ${businessInfo.phone}`));
  if (businessInfo.branchName || businessInfo.sucursal) {
    lines.push(center(`SEDE: ${businessInfo.branchName || businessInfo.sucursal}`));
  }
  lines.push(sep);

  if (type === 'entry_ticket' && ticket) {
    lines.push(center('TICKET DE INGRESO'));
    lines.push(center(`NRO: ${ticket.ticketNumber || ticket.barcode || 'N/A'}`));
    lines.push(sep);
    lines.push(center('PLACA VEHICULO:'));
    lines.push(center(`*** [ ${ticket.plate} ] ***`));
    lines.push(thinSep);
    lines.push(row('CATEGORIA:', (ticket.vehicleType || '').toUpperCase()));
    lines.push(row('PLAZA ASIGNADA:', ticket.spotCode || 'PATIO GENERAL'));
    lines.push(row('FECHA/HORA:', new Date(ticket.entryTime || Date.now()).toLocaleString('es-CO')));
    if (ticket.isForeignPlate && ticket.originCountry) {
      lines.push(row('PROCEDENCIA:', ticket.originCountry.toUpperCase()));
    }
    if (ticket.cashierName) {
      lines.push(row('REGISTRADO POR:', ticket.cashierName));
    }
    lines.push(thinSep);
    lines.push(center(`CODIGO BARRAS: ${ticket.ticketNumber || ticket.barcode || ''}`));
    lines.push(center(`AUDIT HASH: ${(ticket.id || '').substring(0, 10)}`));
    lines.push(thinSep);
    lines.push(center(businessInfo.ticketFooter || 'Conserve este ticket para retirar su vehiculo.'));
  } else if (type === 'exit_receipt' && ticket) {
    const isSub = !!(ticket as any).subscriberInfo || ticket.ticketNumber?.startsWith('SUB-');
    const sub = (ticket as any).subscriberInfo || {};

    if (isSub) {
      lines.push(center('COMPROBANTE DE MENSUALIDAD'));
      lines.push(center('SUSCRIPCION DE ABONADO'));
      lines.push(center(`NRO ABONO: ${ticket.ticketNumber || 'N/A'}`));
      lines.push(sep);
      lines.push(center(`PLACA: [ ${ticket.plate} ]`));
      if (sub.vehicleCategoryName || ticket.vehicleType) {
        lines.push(row('CATEGORIA:', (sub.vehicleCategoryName || ticket.vehicleType).toUpperCase()));
      }
      lines.push(row('TITULAR:', (sub.fullName || 'Abonado').toUpperCase()));
      if (sub.documentId) lines.push(row('DOCUMENTO:', sub.documentId));
      if (sub.phone) lines.push(row('TELEFONO:', sub.phone));
      lines.push(row('PLAZA ASIGNADA:', sub.assignedSpotCode || ticket.spotCode || 'PATIO GENERAL'));
      lines.push(thinSep);
      lines.push(center('PERIODO DE COBERTURA (30 DIAS):'));
      lines.push(center(`${sub.startDate || ticket.entryTime} AL ${sub.endDate || ticket.exitTime}`));
      lines.push(sep);
      lines.push(row('VALOR MENSUAL:', `$ ${(ticket.totalAmount || 0).toLocaleString('es-CO')}`));
      lines.push(row('TOTAL PAGADO:', `$ ${(ticket.totalAmount || 0).toLocaleString('es-CO')}`));
      lines.push(sep);
      lines.push(row('MEDIO DE PAGO:', (sub.paymentMethodDisplay || ticket.paymentMethod || 'Efectivo').toUpperCase()));
      if (sub.voucherNumber) {
        lines.push(row('DOC / VOUCHER:', `#${sub.voucherNumber}`));
      }
      if (sub.paymentReference) {
        lines.push(row('SOPORTE:', sub.paymentReference));
      }
      lines.push(thinSep);
      if (businessInfo.ticketFooter) {
        businessInfo.ticketFooter.split('\n').forEach((line: string) => {
          if (line.trim()) lines.push(center(line.trim()));
        });
        lines.push(thinSep);
      }
      lines.push(center('¡GRACIAS POR SU PREFERENCIA!'));
    } else {
      lines.push(center('COMPROBANTE DE SALIDA / FACTURA POS'));
      lines.push(center(`TICKET NRO: ${ticket.ticketNumber || 'N/A'}`));
      if (ticket.electronicInvoice?.invoiceNumber) {
        lines.push(center(`FACTURA ELECTRONICA: ${ticket.electronicInvoice.prefix}-${ticket.electronicInvoice.invoiceNumber}`));
        if (ticket.electronicInvoice.resolutionNumber) {
          lines.push(center(`RES. DIAN: ${ticket.electronicInvoice.resolutionNumber}`));
        }
      }
      lines.push(sep);
      lines.push(center(`PLACA: [ ${ticket.plate} ]`));
      lines.push(thinSep);
      lines.push(row('INGRESO:', new Date(ticket.entryTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })));
      lines.push(row('SALIDA:', new Date(ticket.exitTime || Date.now()).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })));
      lines.push(row('TIEMPO TOTAL:', `${ticket.totalMinutes || 0} min`));
      lines.push(thinSep);
      lines.push(row('SUBTOTAL:', `$ ${(ticket.baseAmount || 0).toLocaleString('es-CO')}`));
      if (ticket.taxAmount) lines.push(row('IVA / IMPUESTO:', `$ ${ticket.taxAmount.toLocaleString('es-CO')}`));
      if (ticket.discountAmount) lines.push(row('DESCUENTO:', `-$ ${ticket.discountAmount.toLocaleString('es-CO')}`));
      lines.push(sep);
      lines.push(row('TOTAL PAGADO:', `$ ${(ticket.totalAmount || 0).toLocaleString('es-CO')}`));
      lines.push(sep);
      lines.push(row('MEDIO DE PAGO:', (ticket.paymentMethod || 'Efectivo').toUpperCase()));
      if (ticket.cashReceived) lines.push(row('EFECTIVO RECIBIDO:', `$ ${ticket.cashReceived.toLocaleString('es-CO')}`));
      if (ticket.changeGiven) lines.push(row('CAMBIO DEVUELTO:', `$ ${ticket.changeGiven.toLocaleString('es-CO')}`));
      if (ticket.electronicInvoice?.cufe) {
        lines.push(thinSep);
        lines.push(center('CUFE DIAN:'));
        lines.push(center(ticket.electronicInvoice.cufe.substring(0, 32) + '...'));
      }
      lines.push(thinSep);
      lines.push(center('¡GRACIAS POR SU VISITA!'));
    }
  } else if (type === 'cash_shift' && shift) {
    lines.push(center('COMPROBANTE DE ARQUEO DE CAJA'));
    lines.push(center(`TURNO #${shift.shiftNumber || 1}`));
    if (shift.consecutiveCode) lines.push(center(`CONSECUTIVO: ${shift.consecutiveCode}`));
    lines.push(sep);
    lines.push(row('CAJERO/OPERADOR:', shift.operatorName || 'Cajero'));
    lines.push(row('APERTURA:', new Date(shift.startTime).toLocaleString('es-CO')));
    if (shift.endTime) lines.push(row('CIERRE:', new Date(shift.endTime).toLocaleString('es-CO')));
    lines.push(thinSep);
    lines.push(center('-- CONCILIACION DEL CAJON --'));
    lines.push(row('BASE INICIAL:', `$ ${(shift.initialCash || 0).toLocaleString('es-CO')}`));
    lines.push(row('VENTAS EFECTIVO:', `$ ${(shift.cashCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    if (shift.totalIncomesSnapshot) {
      lines.push(row('OTROS INGRESOS CAJA:', `$ ${shift.totalIncomesSnapshot.toLocaleString('es-CO')}`));
    }
    lines.push(row('GASTOS DE CAJA:', `-$ ${(shift.totalExpensesSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(row('RETIROS PARCIALES:', `-$ ${(shift.totalPickupsSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(thinSep);
    lines.push(row('EFECTIVO ESPERADO:', `$ ${(shift.expectedCashSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(row('EFECTIVO CONTADO:', `$ ${(shift.countedCashSnapshot ?? shift.finalCountedCash ?? 0).toLocaleString('es-CO')}`));
    const diff = (shift.cashDifference || 0);
    const diffLabel = diff > 0 ? 'SOBRANTE (+):' : diff < 0 ? 'FALTANTE (-):' : 'CUADRE EXACTO:';
    lines.push(row(diffLabel, `$ ${Math.abs(diff).toLocaleString('es-CO')}`));
    lines.push(sep);
    const electronic = (shift.cardCollectedSnapshot || 0) + (shift.walletCollectedSnapshot || 0) + (shift.qrCollectedSnapshot || 0) + (shift.breBCollectedSnapshot || 0) + (shift.transferCollectedSnapshot || 0);
    lines.push(row('VENTAS ELECTRONICAS:', `$ ${electronic.toLocaleString('es-CO')}`));
    lines.push(row('GRAN TOTAL VENTAS:', `$ ${(shift.totalCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    if (shift.totalToConsignSnapshot) {
      lines.push(row('TOTAL A CONSIGNAR:', `$ ${shift.totalToConsignSnapshot.toLocaleString('es-CO')}`));
    }
    lines.push(sep);
    lines.push('\n\n');
    lines.push(center('___________________________'));
    lines.push(center('FIRMA CAJERO RESPONSABLE'));
    lines.push('\n');
    lines.push(center('___________________________'));
    lines.push(center('FIRMA SUPERVISOR / AUDITOR'));
  } else if (type === 'day_closure' && day) {
    lines.push(center('CIERRE DEFINITIVO DE JORNADA'));
    lines.push(center(`JORNADA #${day.dayNumber || 1} (REPORTE Z)`));
    if (day.consecutiveCode) lines.push(center(`CONSECUTIVO: ${day.consecutiveCode}`));
    lines.push(center('AUDITORIA FISCAL & CONCILIACION'));
    lines.push(sep);
    lines.push(row('FECHA APERTURA:', new Date(day.openedAt).toLocaleString('es-CO')));
    if (day.closedAt) lines.push(row('FECHA CIERRE:', new Date(day.closedAt).toLocaleString('es-CO')));
    lines.push(row('TOTAL TURNOS:', `${day.shiftsCount || 1} Turnos`));
    if (day.closedByOperator) lines.push(row('ADMINISTRADOR:', day.closedByOperator));

    lines.push(thinSep);
    lines.push(center('-- MOVIMIENTO DE VEHICULOS --'));
    if (day.totalTicketsIssuedSnapshot !== undefined) {
      lines.push(row('TOTAL EMITIDOS:', String(day.totalTicketsIssuedSnapshot)));
    }
    if (day.totalTicketsPaidSnapshot !== undefined) {
      lines.push(row('TOTAL LIQUIDADOS:', String(day.totalTicketsPaidSnapshot)));
    }
    if (day.activeVehiclesRemainingSnapshot !== undefined) {
      lines.push(row('VEHICULOS EN PATIO:', String(day.activeVehiclesRemainingSnapshot)));
    }
    if (day.ticketRangeSnapshot) {
      lines.push(row('RANGO TICKETS:', `${day.ticketRangeSnapshot.startTicket || 'TKT-001'} al ${day.ticketRangeSnapshot.endTicket || 'TKT-001'}`));
    }
    if (day.vehicleStatsSnapshot && day.vehicleStatsSnapshot.length > 0) {
      lines.push(thinSep);
      day.vehicleStatsSnapshot.forEach(v => {
        lines.push(row(`${v.category} (${v.count}):`, `$ ${v.total.toLocaleString('es-CO')}`));
      });
    }

    if (day.shiftsSummarySnapshot && day.shiftsSummarySnapshot.length > 0) {
      lines.push(thinSep);
      lines.push(center('-- CONSOLIDADO POR TURNOS --'));
      day.shiftsSummarySnapshot.forEach(s => {
        lines.push(row(`TURNO #${s.shiftNumber} (${s.operatorName}):`, `$ ${s.totalCollected.toLocaleString('es-CO')}`));
      });
    }

    lines.push(thinSep);
    lines.push(center('-- MEDIOS DE PAGO --'));
    lines.push(row('EFECTIVO EN CAJA:', `$ ${(day.cashCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(row('TARJETAS (DATAFONO):', `$ ${(day.cardCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(row('BILLETERAS (NEQUI):', `$ ${(day.walletCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(row('QR INTEROPERABLE:', `$ ${(day.qrCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    if (day.transferCollectedSnapshot) {
      lines.push(row('TRANSFERENCIA / PSE:', `$ ${day.transferCollectedSnapshot.toLocaleString('es-CO')}`));
    }
    if (day.breBCollectedSnapshot) {
      lines.push(row('SISTEMA BRE-B:', `$ ${day.breBCollectedSnapshot.toLocaleString('es-CO')}`));
    }
    if (day.mixedCollectedSnapshot) {
      lines.push(row('PAGOS MIXTOS:', `$ ${day.mixedCollectedSnapshot.toLocaleString('es-CO')}`));
    }
    if (day.agreementCollectedSnapshot) {
      lines.push(row('CONVENIOS / ABONOS:', `$ ${day.agreementCollectedSnapshot.toLocaleString('es-CO')}`));
    }
    lines.push(sep);
    lines.push(row('GRAN TOTAL VENTAS DIA:', `$ ${(day.totalCollected || 0).toLocaleString('es-CO')}`));

    lines.push(thinSep);
    lines.push(center('-- CONCILIACION DE CAJA / BOVEDA --'));
    lines.push(row('(+) BASE INICIAL DIA:', `$ ${(day.initialDayCash || 0).toLocaleString('es-CO')}`));
    lines.push(row('(+) VENTAS EFECTIVO:', `$ ${(day.cashCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    if (day.totalIncomesSnapshot) {
      lines.push(row('(+) OTROS INGRESOS CAJA:', `$ ${day.totalIncomesSnapshot.toLocaleString('es-CO')}`));
    }
    lines.push(row('(-) GASTOS OPERATIVOS:', `-$ ${(day.totalExpensesSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(row('(-) RETIROS A BOVEDA:', `-$ ${(day.totalPickupsSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(thinSep);
    lines.push(row('(=) EFECTIVO ESPERADO:', `$ ${(day.expectedCashSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(row('EFECTIVO CONTADO:', `$ ${(day.countedCashSnapshot ?? day.finalDayCash ?? 0).toLocaleString('es-CO')}`));
    const diff = day.cashDifferenceSnapshot || 0;
    const diffLabel = diff > 0 ? 'SOBRANTE (+):' : diff < 0 ? 'FALTANTE (-):' : 'CUADRE EXACTO:';
    lines.push(row(diffLabel, `$ ${Math.abs(diff).toLocaleString('es-CO')}`));
    lines.push(sep);
    lines.push(row('LIQUIDACION A DEPOSITAR:', `$ ${(day.totalToConsignSnapshot ?? day.finalDayCash ?? 0).toLocaleString('es-CO')}`));
    lines.push(sep);

    if (day.closingNotes) {
      lines.push(`OBSERVACIONES:\n${day.closingNotes}\n`);
    }

    lines.push('\n\n');
    lines.push(center('___________________________'));
    lines.push(center('FIRMA ADMINISTRADOR GENERAL'));
    lines.push('\n');
    lines.push(center('___________________________'));
    lines.push(center('FIRMA REVISOR FISCAL / AUDITOR'));
  } else {
    lines.push(center('TEST DE IMPRESION DIRECTA'));
    lines.push(center(new Date().toLocaleString('es-CO')));
    lines.push(sep);
    lines.push(center('CONEXION EXITOSA CON IMPRESORA'));
    lines.push(center('WolfZone POS - Parqueadero'));
  }

  // Alimentación de papel
  lines.push('\n\n\n');

  // Comando de corte de papel (GS V 0)
  if (autoCut) {
    lines.push('\x1dV\x00');
  }

  // Pulso de gaveta post-corte si se solicitó
  if (openDrawer) {
    lines.push('\x1bp\x00\x19\xfa\x1bp\x01\x19\xfa\x10\x14\x01\x00\x05\x07');
  }

  return lines.join('\r\n');
}
