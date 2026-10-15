import { ParkingTicket, CashMovement, RatesConfig, ParkingBusinessInfo } from '../types';

export interface PucEntry {
  code: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
  thirdPartyName?: string;
  thirdPartyNit?: string;
}

export interface AccountingPeriodSummary {
  grossRevenue: number;
  discounts: number;
  netRevenue: number;
  taxAmount: number;
  baseRevenue: number;
  
  // Breakdown by payment asset account (PUC 11)
  cashRevenue: number; // 110505 Caja General
  bankCardRevenue: number; // 111005 Bancos - Datáfono / Tarjetas
  walletRevenue: number; // 111010 Nequi / Daviplata
  qrPseRevenue: number; // 111015 QR / PSE / Transferencias
  breBRevenue: number; // 111020 Bre-B
  agreementRevenue: number; // 130505 Cuentas por Cobrar / Clientes
  
  // Expenses & Cash Outflows (PUC 51)
  totalExpenses: number;
  totalPickups: number;
  expensesByCategory: Record<string, number>;
  
  // Financial balance
  operatingIncome: number; // Utilidad Operativa (Net Revenue - Expenses)
  
  // PUC Journal entries
  pucJournal: PucEntry[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  
  // Electronic invoicing summary
  electronicInvoicesCount: number;
  electronicInvoicesAmount: number;
  standardTicketsCount: number;
  standardTicketsAmount: number;
}

export function computeAccountingSummary(
  tickets: ParkingTicket[],
  cashMovements: CashMovement[],
  rates: RatesConfig,
  businessInfo: ParkingBusinessInfo
): AccountingPeriodSummary {
  let grossRevenue = 0;
  let discounts = 0;
  let cashRevenue = 0;
  let bankCardRevenue = 0;
  let walletRevenue = 0;
  let qrPseRevenue = 0;
  let breBRevenue = 0;
  let agreementRevenue = 0;
  
  let electronicInvoicesCount = 0;
  let electronicInvoicesAmount = 0;
  let standardTicketsCount = 0;
  let standardTicketsAmount = 0;

  tickets.forEach((t) => {
    const total = t.totalAmount || 0;
    const base = t.baseAmount || total;
    const discount = t.discountAmount || 0;
    
    grossRevenue += (base + discount);
    discounts += discount;

    if (t.electronicInvoice || t.paymentDetails?.isElectronicInvoice) {
      electronicInvoicesCount += 1;
      electronicInvoicesAmount += total;
    } else {
      standardTicketsCount += 1;
      standardTicketsAmount += total;
    }

    const method = t.paymentMethod || 'cash';
    if (method === 'cash') {
      cashRevenue += total;
    } else if (method === 'card') {
      bankCardRevenue += total;
    } else if (method === 'nequi' || method === 'daviplata' || method === 'wallet') {
      walletRevenue += total;
    } else if (method === 'qr_bancolombia' || method === 'transfer' || method === 'qr') {
      qrPseRevenue += total;
    } else if (method === 'bre_b') {
      breBRevenue += total;
    } else if (method === 'agreement') {
      agreementRevenue += total;
    } else if (method === 'mixed') {
      const splits = t.paymentDetails?.splitPayments || [];
      if (splits.length > 0) {
        splits.forEach((s) => {
          if (s.method === 'cash') cashRevenue += s.amount;
          else if (s.method === 'card') bankCardRevenue += s.amount;
          else if (s.method === 'wallet' || s.method === 'nequi' || s.method === 'daviplata') walletRevenue += s.amount;
          else if (s.method === 'qr' || s.method === 'qr_bancolombia' || s.method === 'transfer') qrPseRevenue += s.amount;
          else if (s.method === 'bre_b') breBRevenue += s.amount;
          else if (s.method === 'agreement') agreementRevenue += s.amount;
          else cashRevenue += s.amount;
        });
      } else {
        cashRevenue += total;
      }
    } else {
      cashRevenue += total;
    }
  });

  const netRevenue = grossRevenue - discounts;
  
  // Tax calculation
  const taxRate = (rates.taxPercentage || 0) / 100;
  let taxAmount = 0;
  let baseRevenue = netRevenue;
  if (taxRate > 0) {
    baseRevenue = Math.round(netRevenue / (1 + taxRate));
    taxAmount = netRevenue - baseRevenue;
  }

  // Process Cash Movements (Expenses & Pickups)
  let totalExpenses = 0;
  let totalPickups = 0;
  const expensesByCategory: Record<string, number> = {};

  cashMovements.forEach((m) => {
    if (m.type === 'expense') {
      totalExpenses += m.amount;
      const cat = m.conceptName || 'Gastos Generales';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + m.amount;
    } else if (m.type === 'pickup' || m.type === 'withdrawal') {
      totalPickups += m.amount;
    }
  });

  const operatingIncome = netRevenue - totalExpenses;

  // Build Standard PUC (Plan Único de Cuentas) Journal Entries
  const pucJournal: PucEntry[] = [];

  // 1. Débitos por recaudos en activos
  if (cashRevenue > 0) {
    pucJournal.push({
      code: '110505',
      accountName: 'Caja General - Recaudo Efectivo',
      debit: cashRevenue,
      credit: 0,
      description: 'Ingresos recaudados en efectivo por parqueadero',
    });
  }

  if (bankCardRevenue > 0) {
    pucJournal.push({
      code: '111005',
      accountName: 'Bancos Nacionales - Datáfono / Tarjetas DB/CR',
      debit: bankCardRevenue,
      credit: 0,
      description: 'Ingresos liquidados mediante terminales y datáfonos',
    });
  }

  if (walletRevenue > 0) {
    pucJournal.push({
      code: '111010',
      accountName: 'Bancos / Cuentas Digitales (Nequi / Daviplata)',
      debit: walletRevenue,
      credit: 0,
      description: 'Recaudos recibidos por billeteras digitales móviles',
    });
  }

  if (qrPseRevenue > 0) {
    pucJournal.push({
      code: '111015',
      accountName: 'Bancos - Transferencias / Códigos QR / PSE',
      debit: qrPseRevenue,
      credit: 0,
      description: 'Recaudos por transferencias bancarias y códigos QR',
    });
  }

  if (breBRevenue > 0) {
    pucJournal.push({
      code: '111020',
      accountName: 'Bancos - Sistema Interoperable Llaves Bre-B',
      debit: breBRevenue,
      credit: 0,
      description: 'Recaudos procesados mediante red de llaves Bre-B',
    });
  }

  if (agreementRevenue > 0) {
    pucJournal.push({
      code: '130505',
      accountName: 'Cuentas por Cobrar - Clientes / Convenios Comerciales',
      debit: agreementRevenue,
      credit: 0,
      description: 'Servicios prestados a crédito o convenios empresariales',
    });
  }

  // 2. Créditos por Ingresos Operacionales y Pasivos de Impuesto
  if (baseRevenue > 0) {
    pucJournal.push({
      code: '413505',
      accountName: 'Ingresos Operacionales - Servicios de Estacionamiento',
      debit: 0,
      credit: baseRevenue,
      description: 'Ventas de servicios de parqueadero del período',
    });
  }

  if (taxAmount > 0) {
    pucJournal.push({
      code: '240801',
      accountName: 'Impuesto sobre las Ventas por Pagar (IVA Generado)',
      debit: 0,
      credit: taxAmount,
      description: 'IVA discriminado según tarifas vigentes',
    });
  }

  // 3. Débitos por Gastos de Caja Menor (PUC 51)
  cashMovements
    .filter((m) => m.type === 'expense')
    .forEach((m) => {
      let pucCode = '519595';
      let pucName = 'Gastos Operacionales - Diversos / Otros';
      
      const descLower = (m.conceptName || m.description || '').toLowerCase();
      if (descLower.includes('papel') || descLower.includes('rollo') || descLower.includes('tinta')) {
        pucCode = '519530';
        pucName = 'Gastos - Útiles, Papelería y Rollos Térmicos';
      } else if (descLower.includes('aseo') || descLower.includes('limpieza') || descLower.includes('desinfeccion')) {
        pucCode = '519525';
        pucName = 'Gastos - Elementos de Aseo y Cafetería';
      } else if (descLower.includes('mant') || descLower.includes('repar') || descLower.includes('obra')) {
        pucCode = '514510';
        pucName = 'Gastos - Mantenimiento y Reparaciones Locativas';
      } else if (descLower.includes('servici') || descLower.includes('luz') || descLower.includes('agua') || descLower.includes('internet')) {
        pucCode = '513525';
        pucName = 'Gastos - Servicios Públicos y Conectividad';
      } else if (descLower.includes('nomina') || descLower.includes('anticipo') || descLower.includes('emplead') || descLower.includes('alimento')) {
        pucCode = '510595';
        pucName = 'Gastos - Personal y Beneficios a Empleados';
      }

      pucJournal.push({
        code: pucCode,
        accountName: pucName,
        debit: m.amount,
        credit: 0,
        description: `Egreso de caja: ${m.description} (${m.conceptName || 'Gasto'})`,
      });

      // Contrapartida crédito en caja general
      pucJournal.push({
        code: '110505',
        accountName: 'Caja General - Salida por Gastos Menores',
        debit: 0,
        credit: m.amount,
        description: `Pago en efectivo comprobante #${m.voucherNumber || m.id.slice(-6)}`,
      });
    });

  const totalDebits = pucJournal.reduce((acc, e) => acc + e.debit, 0);
  const totalCredits = pucJournal.reduce((acc, e) => acc + e.credit, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 1;

  return {
    grossRevenue,
    discounts,
    netRevenue,
    taxAmount,
    baseRevenue,
    cashRevenue,
    bankCardRevenue,
    walletRevenue,
    qrPseRevenue,
    breBRevenue,
    agreementRevenue,
    totalExpenses,
    totalPickups,
    expensesByCategory,
    operatingIncome,
    pucJournal,
    totalDebits,
    totalCredits,
    isBalanced,
    electronicInvoicesCount,
    electronicInvoicesAmount,
    standardTicketsCount,
    standardTicketsAmount,
  };
}

export function generatePucCsv(
  pucJournal: PucEntry[],
  businessInfo: ParkingBusinessInfo,
  periodLabel: string
): string {
  const headers = [
    'Cuenta PUC',
    'Nombre de Cuenta',
    'Concepto / Detalle',
    'Debito',
    'Credito',
    'Tercero NIT',
    'Tercero Razon Social',
  ];

  const rows = pucJournal.map((entry) => [
    entry.code,
    `"${entry.accountName.replace(/"/g, '""')}"`,
    `"${entry.description.replace(/"/g, '""')}"`,
    entry.debit,
    entry.credit,
    entry.thirdPartyNit || businessInfo.nit || '222222222222',
    `"${(entry.thirdPartyName || businessInfo.name || 'Consumidor Final').replace(/"/g, '""')}"`,
  ]);

  return (
    '\uFEFF' +
    [
      `# COMPROBANTE CONTABLE PUC - ${businessInfo.name} - NIT: ${businessInfo.nit}`,
      `# PERIODO: ${periodLabel}`,
      `# GENERADO EL: ${new Date().toLocaleString('es-CO')}`,
      headers.join(';'),
      ...rows.map((r) => r.join(';')),
    ].join('\r\n')
  );
}

export function generateSoftwareCopyText(
  summary: AccountingPeriodSummary,
  businessInfo: ParkingBusinessInfo,
  periodLabel: string
): string {
  return `=== COMPROBANTE CONTABLE DE PARQUEADERO ===
Empresa: ${businessInfo.name} | NIT: ${businessInfo.nit}
Período: ${periodLabel}
Fecha Emisión: ${new Date().toLocaleString('es-CO')}

--- RESUMEN DE INGRESOS Y RECAUDO ---
• Ingresos Brutos Facturados: $${summary.grossRevenue.toLocaleString('es-CO')}
• Descuentos Aplicados: -$${summary.discounts.toLocaleString('es-CO')}
• Ingreso Neto Operacional: $${summary.netRevenue.toLocaleString('es-CO')}
• Base Gravable: $${summary.baseRevenue.toLocaleString('es-CO')}
• IVA Generado (19% / Tarifa): $${summary.taxAmount.toLocaleString('es-CO')}

--- DISCRIMINACIÓN POR ACTIVOS (MEDIOS DE COBRO) ---
[110505] Caja General (Efectivo): $${summary.cashRevenue.toLocaleString('es-CO')}
[111005] Bancos / Datáfono Tarjetas: $${summary.bankCardRevenue.toLocaleString('es-CO')}
[111010] Billeteras Digitales (Nequi/Daviplata): $${summary.walletRevenue.toLocaleString('es-CO')}
[111015] Bancos / QR Bancolombia / PSE: $${summary.qrPseRevenue.toLocaleString('es-CO')}
[111020] Llaves Interoperables Bre-B: $${summary.breBRevenue.toLocaleString('es-CO')}
[130505] Cuentas por Cobrar / Convenios: $${summary.agreementRevenue.toLocaleString('es-CO')}

--- GASTOS Y RESULTADOS ---
• Gastos Operacionales de Caja: -$${summary.totalExpenses.toLocaleString('es-CO')}
• Recogidas a Bóveda (Traslados): $${summary.totalPickups.toLocaleString('es-CO')}
• UTILIDAD OPERATIVA NETA: $${summary.operatingIncome.toLocaleString('es-CO')}

--- ASIENTOS PUC BALANCEADOS ---
Total Débitos: $${summary.totalDebits.toLocaleString('es-CO')}
Total Créditos: $${summary.totalCredits.toLocaleString('es-CO')}
Estado de Cuadre: ${summary.isBalanced ? 'CONCILIADO EXACTO (SUMAS IGUALES)' : 'DESBALANCEADO'}`;
}
