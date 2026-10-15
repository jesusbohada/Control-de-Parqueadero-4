/**
 * ============================================================================
 * UTILIDADES DE EXPORTACIÓN A CSV / EXCEL PARA REPORTES Y CONTABILIDAD
 * ============================================================================
 * Permite exportar datos operacionales de cobros, tickets liquidados,
 * movimientos de caja menor y libros contables consolidados para facilitar
 * la contabilidad externa (Siigo, World Office, Helisa, Alegra, SAP, Excel).
 */

import { ParkingTicket, CashMovement, RatesConfig, ParkingBusinessInfo } from '../types';
import { getPaymentMethodMeta } from './paymentUtils';
import { computeAccountingSummary } from './accountingUtils';

/**
 * Descarga un archivo en el navegador del usuario con encoding UTF-8
 */
export function triggerFileDownload(content: string, fileName: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Limpia y escapa cadenas de texto para celdas CSV
 */
function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(';') || str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Traduce el tipo de vehículo al español
 */
function formatVehicleType(type: string): string {
  switch (type) {
    case 'car': return 'Automóvil';
    case 'motorcycle': return 'Motocicleta';
    case 'bicycle': return 'Bicicleta';
    case 'truck': return 'Camión / Pesado';
    case 'van': return 'Camioneta / Van';
    default: return type;
  }
}

/**
 * Traduce el tipo de movimiento de caja
 */
function formatMovementType(type: string): string {
  switch (type) {
    case 'expense': return 'Gasto Operacional';
    case 'income': return 'Ingreso Adicional / Base';
    case 'pickup': return 'Recogida / Traslado a Bóveda';
    case 'withdrawal': return 'Retiro de Efectivo';
    default: return type;
  }
}

/**
 * Formatea fechas a string legible en español
 */
function formatDate(isoDate?: string | null): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch {
    return isoDate;
  }
}

/**
 * ============================================================================
 * 1. EXPORTACIÓN DE TICKETS Y COBROS (PAGOS)
 * ============================================================================
 */
export function exportPaymentsToCsv(
  tickets: ParkingTicket[],
  businessInfo: ParkingBusinessInfo,
  periodLabel = 'Período Seleccionado'
): void {
  const separator = ';';
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const fileName = `Reporte_Pagos_${businessInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.csv`;

  const headers = [
    'N° Ticket',
    'Placa',
    'Tipo de Vehículo',
    'Plaza / Bahía',
    'Fecha Entrada',
    'Fecha Salida / Pago',
    'Tiempo Total (Minutos)',
    'Tiempo Facturado (Minutos)',
    'Tarifa Base ($)',
    'Descuento ($)',
    'IVA / Impuesto ($)',
    'Total Cobrado ($)',
    'Medio de Pago',
    'Detalle / Submedio',
    'N° Comprobante / Referencia',
    'Efectivo Recibido ($)',
    'Cambio Entregado ($)',
    'Factura Electrónica',
    'N° Factura DIAN',
    'CUFE',
    'Cajero Responsable',
    'Día Operativo',
    'Turno N°',
    'Sucursal',
    'Notas / Observaciones'
  ];

  const rows = tickets.map((t) => {
    const methodMeta = getPaymentMethodMeta(t.paymentMethod || 'cash');
    const hasElecInvoice = Boolean(t.electronicInvoice || t.paymentDetails?.isElectronicInvoice);
    const invoiceNum = t.electronicInvoice?.invoiceNumber || t.paymentDetails?.electronicInvoiceNumber || '';
    const cufe = t.electronicInvoice?.cufe || t.paymentDetails?.cufe || '';
    const subMethod = t.paymentDetails?.subMethodName || t.paymentDetails?.agreementName || '';
    const ref = t.paymentDetails?.referenceNumber || '';

    return [
      escapeCsvCell(t.ticketNumber || t.id),
      escapeCsvCell(t.plate),
      escapeCsvCell(formatVehicleType(t.vehicleType)),
      escapeCsvCell(t.spotCode || 'N/A'),
      escapeCsvCell(formatDate(t.entryTime)),
      escapeCsvCell(formatDate(t.paidAt || t.exitTime)),
      escapeCsvCell(t.totalMinutes ?? ''),
      escapeCsvCell(t.billableMinutes ?? t.totalMinutes ?? ''),
      escapeCsvCell(t.baseAmount ?? t.totalAmount ?? 0),
      escapeCsvCell(t.discountAmount ?? 0),
      escapeCsvCell(t.taxAmount ?? 0),
      escapeCsvCell(t.totalAmount ?? 0),
      escapeCsvCell(methodMeta.label || t.paymentMethod || 'Efectivo'),
      escapeCsvCell(subMethod),
      escapeCsvCell(ref),
      escapeCsvCell(t.cashReceived ?? ''),
      escapeCsvCell(t.changeGiven ?? ''),
      escapeCsvCell(hasElecInvoice ? 'SÍ' : 'NO'),
      escapeCsvCell(invoiceNum),
      escapeCsvCell(cufe),
      escapeCsvCell(t.cashierName || 'Cajero'),
      escapeCsvCell(t.operationalDayNumber ?? 1),
      escapeCsvCell(t.shiftNumber ?? 1),
      escapeCsvCell(t.branchName || businessInfo.branchName || 'Sede Principal'),
      escapeCsvCell(t.notes || '')
    ].join(separator);
  });

  const totalCollected = tickets.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
  const totalBase = tickets.reduce((acc, t) => acc + (t.baseAmount || t.totalAmount || 0), 0);
  const totalDiscounts = tickets.reduce((acc, t) => acc + (t.discountAmount || 0), 0);
  const totalTaxes = tickets.reduce((acc, t) => acc + (t.taxAmount || 0), 0);

  const metadataLines = [
    `# REPORTE DETALLADO DE PAGOS Y RECAUDOS DE ESTACIONAMIENTO`,
    `# Empresa: ${escapeCsvCell(businessInfo.name)} | NIT: ${escapeCsvCell(businessInfo.nit)}`,
    `# Sucursal / Sede: ${escapeCsvCell(businessInfo.branchName || 'Sede Principal')}`,
    `# Período: ${escapeCsvCell(periodLabel)}`,
    `# Generado: ${now.toLocaleString('es-CO')}`,
    `# Total Tickets Cobrados: ${tickets.length}`,
    `# Recaudo Bruto Base: $${totalBase}`,
    `# Descuentos Totales: $${totalDiscounts}`,
    `# IVA / Impuestos: $${totalTaxes}`,
    `# Recaudo Neto Total: $${totalCollected}`,
    ``
  ];

  const csvContent = '\uFEFF' + metadataLines.join('\r\n') + headers.join(separator) + '\r\n' + rows.join('\r\n');
  triggerFileDownload(csvContent, fileName);
}

/**
 * ============================================================================
 * 2. EXPORTACIÓN DE MOVIMIENTOS DE CAJA (INGRESOS, GASTOS, RECOGIDAS, BASE)
 * ============================================================================
 */
export function exportCashMovementsToCsv(
  movements: CashMovement[],
  businessInfo: ParkingBusinessInfo,
  periodLabel = 'Período Seleccionado'
): void {
  const separator = ';';
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const fileName = `Reporte_Movimientos_Caja_${businessInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.csv`;

  const headers = [
    'ID / N° Comprobante',
    'Fecha y Hora',
    'Tipo de Movimiento',
    'Concepto Contable / Categoría',
    'Descripción / Motivo del Egreso o Ingreso',
    'Monto ($)',
    'Operador / Cajero Responsable',
    'Comprobante Físico / Voucher',
    'Tiene Soporte Adjunto',
    'Sucursal'
  ];

  const rows = movements.map((m) => {
    return [
      escapeCsvCell(m.id),
      escapeCsvCell(formatDate(m.timestamp)),
      escapeCsvCell(formatMovementType(m.type)),
      escapeCsvCell(m.conceptName || 'Gasto General'),
      escapeCsvCell(m.description || ''),
      escapeCsvCell(m.amount || 0),
      escapeCsvCell(m.operator || 'Cajero'),
      escapeCsvCell(m.voucherNumber || 'N/A'),
      escapeCsvCell(m.attachmentUrl ? 'SÍ' : 'NO'),
      escapeCsvCell(businessInfo.branchName || 'Sede Principal')
    ].join(separator);
  });

  const totalExpenses = movements.filter(m => m.type === 'expense').reduce((acc, m) => acc + m.amount, 0);
  const totalIncomes = movements.filter(m => m.type === 'income').reduce((acc, m) => acc + m.amount, 0);
  const totalPickups = movements.filter(m => m.type === 'pickup' || m.type === 'withdrawal').reduce((acc, m) => acc + m.amount, 0);

  const metadataLines = [
    `# REPORTE DETALLADO DE MOVIMIENTOS DE CAJA MENOR Y BÓVEDA`,
    `# Empresa: ${escapeCsvCell(businessInfo.name)} | NIT: ${escapeCsvCell(businessInfo.nit)}`,
    `# Sucursal: ${escapeCsvCell(businessInfo.branchName || 'Sede Principal')}`,
    `# Período: ${escapeCsvCell(periodLabel)}`,
    `# Generado: ${now.toLocaleString('es-CO')}`,
    `# Total Registros: ${movements.length}`,
    `# Total Gastos Operacionales: $${totalExpenses}`,
    `# Total Ingresos Extras / Base: $${totalIncomes}`,
    `# Total Recogidas a Bóveda: $${totalPickups}`,
    ``
  ];

  const csvContent = '\uFEFF' + metadataLines.join('\r\n') + headers.join(separator) + '\r\n' + rows.join('\r\n');
  triggerFileDownload(csvContent, fileName);
}

/**
 * ============================================================================
 * 3. EXPORTACIÓN CONSOLIDADA DE LIBRO CONTABLE Y PUC PARA CONTADORES / ERP
 * ============================================================================
 */
export function exportFullAccountingReportToCsv(
  tickets: ParkingTicket[],
  movements: CashMovement[],
  rates: RatesConfig,
  businessInfo: ParkingBusinessInfo,
  periodLabel = 'Período Seleccionado'
): void {
  const separator = ';';
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const fileName = `Libro_Contable_Completo_${businessInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.csv`;

  const summary = computeAccountingSummary(tickets, movements, rates, businessInfo);

  // Sección 1: Encabezado General
  const lines: string[] = [
    `# =======================================================================`,
    `# INFORME CONTABLE Y FINANCIERO INTEGRAL - WOLFZONE POS`,
    `# Empresa: ${escapeCsvCell(businessInfo.name)} | NIT: ${escapeCsvCell(businessInfo.nit)}`,
    `# Sede / Sucursal: ${escapeCsvCell(businessInfo.branchName || 'Sede Principal')}`,
    `# Período Contable: ${escapeCsvCell(periodLabel)}`,
    `# Fecha de Emisión: ${now.toLocaleString('es-CO')}`,
    `# =======================================================================`,
    ``,
    `# --- RESUMEN OPERACIONAL Y TRIBUTARIO ---`,
    `Concepto;Monto ($);Detalles`,
    `Ingresos Brutos Facturados;${summary.grossRevenue};Base más descuentos`,
    `Descuentos Comerciales Otorgados;-${summary.discounts};Menor valor cobrado`,
    `Ingresos Netos Operacionales;${summary.netRevenue};Ventas reales efectivas`,
    `Base Gravable;${summary.baseRevenue};Base antes de impuesto`,
    `IVA Generado;${summary.taxAmount};Impuesto discriminado (${rates.taxPercentage || 0}%)`,
    `Gastos Operacionales de Caja;-${summary.totalExpenses};Egresos de caja menor`,
    `Recogidas / Traslados a Bóveda;${summary.totalPickups};Flujo trasladado`,
    `UTILIDAD OPERATIVA NETA;${summary.operatingIncome};Resultado del ejercicio`,
    ``,
    `# --- DISCRIMINACIÓN POR CUENTAS DE ACTIVO (MEDIOS DE COBRO) ---`,
    `Cuenta PUC;Medio / Canal;Monto Total ($)`,
    `110505;Caja General (Efectivo);${summary.cashRevenue}`,
    `111005;Bancos Nacionales (Datáfono Tarjetas Débito / Crédito);${summary.bankCardRevenue}`,
    `111010;Billeteras Digitales (Nequi / Daviplata);${summary.walletRevenue}`,
    `111015;Bancos / Códigos QR / PSE / Transferencias;${summary.qrPseRevenue}`,
    `111020;Sistema Interoperable Llaves Bre-B;${summary.breBRevenue}`,
    `130505;Cuentas por Cobrar (Convenios Comerciales / Crédito);${summary.agreementRevenue}`,
    ``,
    `# --- LIBRO DIARIO DE ASIENTOS CONTABLES (PUC COLOMBIA) ---`,
    `Cuenta PUC;Nombre de Cuenta;Concepto / Glosa;Débito ($);Crédito ($);NIT Tercero;Razón Social Tercero`
  ];

  summary.pucJournal.forEach((entry) => {
    lines.push([
      escapeCsvCell(entry.code),
      escapeCsvCell(entry.accountName),
      escapeCsvCell(entry.description),
      escapeCsvCell(entry.debit),
      escapeCsvCell(entry.credit),
      escapeCsvCell(entry.thirdPartyNit || businessInfo.nit || '222222222222'),
      escapeCsvCell(entry.thirdPartyName || businessInfo.name || 'Consumidor Final')
    ].join(separator));
  });

  lines.push([
    'SUMAS IGUALES',
    summary.isBalanced ? 'CONCILIADO EXACTO' : 'DESCUADRADO',
    'Totales Débito vs Crédito',
    summary.totalDebits,
    summary.totalCredits,
    '',
    ''
  ].join(separator));

  lines.push('');
  lines.push('# --- DETALLE DE PAGOS INDIVIDUALES EN EL PERÍODO ---');
  lines.push([
    'N° Ticket',
    'Placa',
    'Tipo',
    'Entrada',
    'Salida / Pago',
    'Minutos',
    'Total ($)',
    'Medio de Pago',
    'Cajero',
    'Factura DIAN'
  ].join(separator));

  tickets.forEach((t) => {
    const methodMeta = getPaymentMethodMeta(t.paymentMethod || 'cash');
    const invoiceNum = t.electronicInvoice?.invoiceNumber || t.paymentDetails?.electronicInvoiceNumber || 'Ticket POS';
    lines.push([
      escapeCsvCell(t.ticketNumber || t.id),
      escapeCsvCell(t.plate),
      escapeCsvCell(formatVehicleType(t.vehicleType)),
      escapeCsvCell(formatDate(t.entryTime)),
      escapeCsvCell(formatDate(t.paidAt || t.exitTime)),
      escapeCsvCell(t.totalMinutes ?? ''),
      escapeCsvCell(t.totalAmount ?? 0),
      escapeCsvCell(methodMeta.label || t.paymentMethod || 'Efectivo'),
      escapeCsvCell(t.cashierName || 'Cajero'),
      escapeCsvCell(invoiceNum)
    ].join(separator));
  });

  lines.push('');
  lines.push('# --- DETALLE DE MOVIMIENTOS DE CAJA MENOR EN EL PERÍODO ---');
  lines.push([
    'ID',
    'Fecha',
    'Tipo',
    'Concepto',
    'Descripción',
    'Monto ($)',
    'Operador',
    'Comprobante'
  ].join(separator));

  movements.forEach((m) => {
    lines.push([
      escapeCsvCell(m.id),
      escapeCsvCell(formatDate(m.timestamp)),
      escapeCsvCell(formatMovementType(m.type)),
      escapeCsvCell(m.conceptName || 'Gasto'),
      escapeCsvCell(m.description),
      escapeCsvCell(m.amount),
      escapeCsvCell(m.operator || 'Cajero'),
      escapeCsvCell(m.voucherNumber || 'N/A')
    ].join(separator));
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  triggerFileDownload(csvContent, fileName);
}
