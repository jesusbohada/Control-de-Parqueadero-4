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

  const boxBorder = `+${'-'.repeat(width - 2)}+`;
  const boxDoubleBorder = `+${'='.repeat(width - 2)}+`;

  const boxCenter = (str: string = ''): string => {
    const text = String(str).trim();
    const inner = width - 4;
    if (text.length >= inner) return `| ${text.substring(0, inner)} |`;
    const leftPad = Math.floor((inner - text.length) / 2);
    const rightPad = inner - text.length - leftPad;
    return `| ${' '.repeat(leftPad)}${text}${' '.repeat(rightPad)} |`;
  };

  const boxRow = (label: string = '', val: string = ''): string => {
    const l = String(label).trim();
    const v = String(val).trim();
    const inner = width - 4;
    const space = inner - l.length - v.length;
    if (space <= 0) {
      return `| ${(l.substring(0, inner - v.length - 1) + ' ' + v).padEnd(inner)} |`;
    }
    return `| ${l}${' '.repeat(space)}${v} |`;
  };

  const boxLine = (str: string = ''): string => {
    const text = String(str).trim();
    const inner = width - 4;
    if (text.length >= inner) return `| ${text.substring(0, inner)} |`;
    return `| ${text.padEnd(inner)} |`;
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
    lines.push(center('*** TICKET DE INGRESO ***'));
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
      lines.push(center('*** COMPROBANTE DE MENSUALIDAD ***'));
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
      }
      lines.push(center('¡GRACIAS POR SU PREFERENCIA!'));
    } else {
      lines.push(center(ticket.electronicInvoice ? '*** FACTURA ELECTRONICA DE VENTA ***' : 'COMPROBANTE DE SALIDA / FACTURA POS'));
      lines.push(center(`TICKET NRO: ${ticket.ticketNumber || 'N/A'}`));
      if (ticket.electronicInvoice?.invoiceNumber) {
        lines.push(center(`FACTURA ELECTRONICA: ${ticket.electronicInvoice.prefix}${ticket.electronicInvoice.invoiceNumber}`));
        if (ticket.electronicInvoice.resolutionNumber) {
          lines.push(center(`RES. DIAN: ${ticket.electronicInvoice.resolutionNumber}`));
        }
      }
      if (ticket.electronicInvoice?.customer) {
        lines.push(thinSep);
        lines.push(center('-- DATOS ADQUIRENTE / CLIENTE --'));
        if (ticket.electronicInvoice.customer.name) {
          lines.push(row('CLIENTE:', ticket.electronicInvoice.customer.name.substring(0, width - 10)));
        }
        lines.push(row(`${ticket.electronicInvoice.customer.docType || 'NIT/CC'}:`, ticket.electronicInvoice.customer.documentNumber || '222222222222'));
        if (ticket.electronicInvoice.customer.email) {
          lines.push(row('EMAIL:', ticket.electronicInvoice.customer.email.substring(0, width - 8)));
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
      if (ticket.commercialAgreementName) {
        lines.push(row('CONVENIO:', ticket.commercialAgreementName.substring(0, width - 12)));
        if (ticket.commercialAgreementSealOrVoucher) {
          lines.push(row('SELLO/FACTURA:', ticket.commercialAgreementSealOrVoucher.substring(0, width - 16)));
        }
      }
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
    lines.push(boxDoubleBorder);
    lines.push(boxCenter(businessInfo.name || 'SISTEMA DE PARQUEADERO'));
    lines.push(boxCenter(`NIT: ${businessInfo.nit || 'N/A'}`));
    if (businessInfo.address) lines.push(boxCenter(businessInfo.address));
    lines.push(boxBorder);
    lines.push(boxCenter('**** COMPROBANTE DE ARQUEO DE CAJA ****'));
    lines.push(boxCenter(`TURNO #${shift.shiftNumber || 1}`));
    if (shift.consecutiveCode) lines.push(boxCenter(`CONSECUTIVO: ${shift.consecutiveCode}`));
    lines.push(boxDoubleBorder);
    lines.push(boxRow('CAJERO/OPERADOR:', shift.operatorName || 'Cajero'));
    lines.push(boxRow('APERTURA:', new Date(shift.startTime).toLocaleString('es-CO')));
    if (shift.endTime) lines.push(boxRow('CIERRE:', new Date(shift.endTime).toLocaleString('es-CO')));
    lines.push(boxBorder);
    lines.push(boxCenter('-- DISCRIMINACION DE VENTAS --'));
    lines.push(boxRow('Efectivo Recaudado:', `$ ${(shift.cashCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(boxRow('Tarjetas POS:', `$ ${(shift.cardCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(boxRow('Billeteras (Nequi/Dav):', `$ ${(shift.walletCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(boxRow('QR Bancolombia:', `$ ${(shift.qrCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    if (shift.transferCollectedSnapshot) {
      lines.push(boxRow('Transferencia / PSE:', `$ ${shift.transferCollectedSnapshot.toLocaleString('es-CO')}`));
    }
    if (shift.breBCollectedSnapshot) {
      lines.push(boxRow('Sistema Bre-B:', `$ ${shift.breBCollectedSnapshot.toLocaleString('es-CO')}`));
    }
    if (shift.mixedCollectedSnapshot) {
      lines.push(boxRow('Pagos Mixtos:', `$ ${shift.mixedCollectedSnapshot.toLocaleString('es-CO')}`));
    }
    lines.push(boxBorder);
    lines.push(boxRow('GRAN TOTAL VENTAS:', `$ ${(shift.totalCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(boxDoubleBorder);
    lines.push(boxCenter('-- CONCILIACION DEL CAJON --'));
    lines.push(boxRow('(+) BASE INICIAL:', `$ ${(shift.initialCash || 0).toLocaleString('es-CO')}`));
    lines.push(boxRow('(+) VENTAS EFECTIVO:', `$ ${(shift.cashCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    if (shift.totalIncomesSnapshot) {
      lines.push(boxRow('(+) OTROS INGRESOS:', `$ ${shift.totalIncomesSnapshot.toLocaleString('es-CO')}`));
    }
    lines.push(boxRow('(-) GASTOS DE CAJA:', `-$ ${(shift.totalExpensesSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(boxRow('(-) RETIROS BOVEDA:', `-$ ${(shift.totalPickupsSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(boxBorder);
    lines.push(boxRow('(=) EFECTIVO ESPERADO:', `$ ${(shift.expectedCashSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(boxRow('EFECTIVO CONTADO:', `$ ${(shift.countedCashSnapshot ?? shift.finalCountedCash ?? 0).toLocaleString('es-CO')}`));
    const diff = (shift.cashDifference || 0);
    const diffLabel = diff > 0 ? 'SOBRANTE (+):' : diff < 0 ? 'FALTANTE (-):' : 'CUADRE EXACTO:';
    lines.push(boxDoubleBorder);
    lines.push(boxCenter(`>>> ${diffLabel} $ ${Math.abs(diff).toLocaleString('es-CO')} <<<`));
    if (shift.totalToConsignSnapshot) {
      lines.push(boxDoubleBorder);
      lines.push(boxRow('TOTAL A CONSIGNAR:', `$ ${shift.totalToConsignSnapshot.toLocaleString('es-CO')}`));
    }
    lines.push(boxDoubleBorder);
    lines.push('');
    lines.push(boxBorder);
    lines.push(boxCenter('___________________________'));
    lines.push(boxCenter('FIRMA CAJERO RESPONSABLE'));
    lines.push(boxBorder);
    lines.push(boxCenter('___________________________'));
    lines.push(boxCenter('FIRMA SUPERVISOR / AUDITOR'));
    lines.push(boxBorder);
  } else if (type === 'day_closure' && day) {
    lines.push(boxDoubleBorder);
    lines.push(boxCenter(businessInfo.name || 'SISTEMA DE PARQUEADERO'));
    lines.push(boxCenter(`NIT: ${businessInfo.nit || 'N/A'}`));
    if (businessInfo.address) lines.push(boxCenter(businessInfo.address));
    if (businessInfo.phone) lines.push(boxCenter(`TEL: ${businessInfo.phone}`));
    lines.push(boxBorder);
    lines.push(boxCenter('**** CIERRE DEFINITIVO (REPORTE Z) ****'));
    lines.push(boxCenter(`JORNADA #${day.dayNumber || 1}  •  CONSEC: ${day.consecutiveCode || 'Z-0001'}`));
    lines.push(boxCenter('AUDITORIA FISCAL & CONCILIACION'));
    lines.push(boxDoubleBorder);
    lines.push(boxRow('FECHA APERTURA:', new Date(day.openedAt).toLocaleString('es-CO')));
    if (day.closedAt) lines.push(boxRow('FECHA CIERRE:', new Date(day.closedAt).toLocaleString('es-CO')));
    lines.push(boxRow('TOTAL TURNOS:', `${day.shiftsCount || 1} Turnos`));
    if (day.closedByOperator) lines.push(boxRow('ADMINISTRADOR:', day.closedByOperator));

    lines.push(boxDoubleBorder);
    lines.push(boxCenter('1. MOVIMIENTO GENERAL DE VEHICULOS'));
    lines.push(boxBorder);
    if (day.totalTicketsIssuedSnapshot !== undefined) {
      lines.push(boxRow('Total Tickets Emitidos:', String(day.totalTicketsIssuedSnapshot)));
    }
    if (day.totalTicketsPaidSnapshot !== undefined) {
      lines.push(boxRow('Total Salidas Liquidadas:', String(day.totalTicketsPaidSnapshot)));
    }
    if (day.activeVehiclesRemainingSnapshot !== undefined) {
      lines.push(boxRow('Vehiculos en Patio:', String(day.activeVehiclesRemainingSnapshot)));
    }
    if (day.ticketRangeSnapshot) {
      lines.push(boxRow('Rango Tickets:', `${day.ticketRangeSnapshot.startTicket || 'TKT-001'} al ${day.ticketRangeSnapshot.endTicket || 'TKT-001'}`));
    }
    if (day.vehicleStatsSnapshot && day.vehicleStatsSnapshot.length > 0) {
      lines.push(boxBorder);
      day.vehicleStatsSnapshot.forEach(v => {
        lines.push(boxRow(`• ${v.category} (${v.count}):`, `$ ${v.total.toLocaleString('es-CO')}`));
      });
    }

    if (day.shiftsSummarySnapshot && day.shiftsSummarySnapshot.length > 0) {
      lines.push(boxDoubleBorder);
      lines.push(boxCenter('2. DESGLOSE CONSOLIDADO POR TURNOS'));
      lines.push(boxBorder);
      day.shiftsSummarySnapshot.forEach(s => {
        lines.push(boxRow(`Turno #${s.shiftNumber} (${s.operatorName.split(' ')[0]}):`, `$ ${s.totalCollected.toLocaleString('es-CO')}`));
      });
    }

    lines.push(boxDoubleBorder);
    lines.push(boxCenter('3. DISCRIMINACION POR MEDIOS DE PAGO'));
    lines.push(boxBorder);
    lines.push(boxRow('Efectivo en Caja:', `$ ${(day.cashCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(boxRow('Tarjetas POS (Datafono):', `$ ${(day.cardCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(boxRow('Billeteras (Nequi/Daviplata):', `$ ${(day.walletCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(boxRow('QR Bancolombia:', `$ ${(day.qrCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    if (day.transferCollectedSnapshot) {
      lines.push(boxRow('Transferencia / PSE:', `$ ${day.transferCollectedSnapshot.toLocaleString('es-CO')}`));
    }
    if (day.breBCollectedSnapshot) {
      lines.push(boxRow('Sistema Bre-B:', `$ ${day.breBCollectedSnapshot.toLocaleString('es-CO')}`));
    }
    if (day.mixedCollectedSnapshot) {
      lines.push(boxRow('Pagos Mixtos:', `$ ${day.mixedCollectedSnapshot.toLocaleString('es-CO')}`));
    }
    if (day.agreementCollectedSnapshot) {
      lines.push(boxRow('Convenios / Abonos:', `$ ${day.agreementCollectedSnapshot.toLocaleString('es-CO')}`));
    }
    lines.push(boxBorder);
    lines.push(boxRow('GRAN TOTAL VENTAS DIA:', `$ ${(day.totalCollected || 0).toLocaleString('es-CO')}`));

    lines.push(boxDoubleBorder);
    lines.push(boxCenter('4. CONCILIACION DE EFECTIVO (BOVEDA)'));
    lines.push(boxBorder);
    lines.push(boxRow('(+) BASE INICIAL DIA:', `$ ${(day.initialDayCash || 0).toLocaleString('es-CO')}`));
    lines.push(boxRow('(+) VENTAS EFECTIVO:', `$ ${(day.cashCollectedSnapshot || 0).toLocaleString('es-CO')}`));
    if (day.totalIncomesSnapshot) {
      lines.push(boxRow('(+) OTROS INGRESOS CAJA:', `$ ${day.totalIncomesSnapshot.toLocaleString('es-CO')}`));
    }
    lines.push(boxRow('(-) GASTOS OPERATIVOS:', `-$ ${(day.totalExpensesSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(boxRow('(-) RETIROS A BOVEDA:', `-$ ${(day.totalPickupsSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(boxBorder);
    lines.push(boxRow('(=) EFECTIVO ESPERADO:', `$ ${(day.expectedCashSnapshot || 0).toLocaleString('es-CO')}`));
    lines.push(boxRow('EFECTIVO CONTADO:', `$ ${(day.countedCashSnapshot ?? day.finalDayCash ?? 0).toLocaleString('es-CO')}`));
    const diff = day.cashDifferenceSnapshot || 0;
    const diffLabel = diff > 0 ? 'SOBRANTE (+):' : diff < 0 ? 'FALTANTE (-):' : 'CUADRE EXACTO:';
    lines.push(boxDoubleBorder);
    lines.push(boxCenter(`>>> ${diffLabel} $ ${Math.abs(diff).toLocaleString('es-CO')} <<<`));
    lines.push(boxDoubleBorder);
    lines.push(boxRow('LIQUIDACION A DEPOSITAR:', `$ ${(day.totalToConsignSnapshot ?? day.finalDayCash ?? 0).toLocaleString('es-CO')}`));
    lines.push(boxDoubleBorder);

    if (day.movementsSummarySnapshot && day.movementsSummarySnapshot.length > 0) {
      lines.push(boxCenter('DETALLE DE EGRESOS REGISTRADOS:'));
      day.movementsSummarySnapshot.slice(0, 5).forEach(m => {
        lines.push(boxRow(`• ${m.description || m.type}:`, `-$ ${m.amount.toLocaleString('es-CO')}`));
      });
      lines.push(boxBorder);
    }

    if (day.closingNotes) {
      lines.push(boxCenter('OBSERVACIONES DE AUDITORIA:'));
      lines.push(boxLine(day.closingNotes));
      lines.push(boxBorder);
    }

    lines.push('');
    lines.push(boxBorder);
    lines.push(boxCenter('___________________________'));
    lines.push(boxCenter('FIRMA ADMINISTRADOR GENERAL'));
    lines.push(boxCenter(day.closedByOperator || 'Administrador'));
    lines.push(boxBorder);
    lines.push(boxCenter('___________________________'));
    lines.push(boxCenter('FIRMA REVISOR FISCAL / AUDITOR'));
    lines.push(boxCenter('Control Contable & Verificacion'));
    lines.push(boxBorder);
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
