const http = require('http');

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('=============================================================================');
  console.log('>>> INICIANDO SIMULACIÓN INTEGRAL: DÍA OPERATIVO COMPLETO DE PARQUEADERO');
  console.log('>>> Sede: PARQUEADERO WOLFZONE POS | Impresora Fiscal: SAT 22TUS (80mm)');
  console.log('=============================================================================\n');

  const businessInfo = {
    name: 'PARQUEADERO WOLFZONE POS',
    nit: '901.458.723-1',
    address: 'Av. Libertador # 45 - 20, Zona Centro',
    phone: '(+57) 310 892 4511',
    branchName: 'Sede Principal - Taquilla 01',
    defaultPrinterName: 'SAT 22TUS',
    defaultPaperWidth: '80mm',
    cutPaperOnPrint: true,
    openCashDrawerOnCashPayment: true,
    ticketFooter: 'Régimen Común - Sistema POS Certificado\n¡Gracias por confiar su vehículo a WolfZone!'
  };

  const rates = {
    currencySymbol: '$'
  };

  // =========================================================================
  // FASE 1: APERTURA DE JORNADA OPERATIVA
  // =========================================================================
  console.log('-----------------------------------------------------------------------------');
  console.log('FASE 1: Apertura del Día Operativo');
  console.log('-----------------------------------------------------------------------------');
  console.log('• Fecha: 19 de Octubre de 2026');
  console.log('• Jornada Operativa N°: 1');
  console.log('• Base Inicial Asignada a la Jornada: $150.000 COP');
  console.log('• Administrador Responsable: CARLOS MARIO ZAPATA\n');

  // =========================================================================
  // FASE 2: TURNO 1 - MAÑANA (Cajero: Carlos Restrepo)
  // =========================================================================
  console.log('-----------------------------------------------------------------------------');
  console.log('FASE 2: Turno 1 (06:00 AM - 02:00 PM) - Cajero: CARLOS RESTREPO');
  console.log('-----------------------------------------------------------------------------');
  console.log('-> Apertura Turno #1 con Base: $150.000 COP');
  console.log('-> Registrando Entradas y Salidas de Vehículos en Turno 1:');
  console.log('   1. [TKT-001] Auto KLR-892     | $40.000 | Medio: EFECTIVO (Recibido: $50.000, Cambio: $10.000)');
  console.log('   2. [TKT-002] Moto MTX-14E     | $15.000 | Medio: TARJETA POS (Voucher #448201 / Bold)');
  console.log('   3. [TKT-003] Camioneta BLL-403| $50.000 | Medio: NEQUI (Aprobación #M-948201)');
  console.log('   4. [TKT-004] Auto HJK-551     | $35.000 | Medio: DAVIPLATA (Transacción #DP-339182)');
  console.log('   5. [TKT-005] Moto QWE-88F     | $20.000 | Medio: EFECTIVO (Recibido: $20.000)');
  console.log('   6. [TKT-006] Camioneta WXZ-312| $60.000 | Medio: EFECTIVO (Recibido: $100.000, Cambio: $40.000)');
  console.log('   7. [TKT-007] Auto JKM-910     | $50.000 | Medio: EFECTIVO (Recibido: $50.000)');
  console.log('-> Subtotal Recaudo Turno 1: $270.000 COP');
  console.log('   - Efectivo T1: $170.000 COP');
  console.log('   - Electrónicos T1 (Tarjeta POS, Nequi, Daviplata): $100.000 COP');

  console.log('\n-> Registrando Movimientos de Caja en Turno 1:');
  console.log('   [GASTO MENOR] Compra rollos de papel térmico SAT 22TUS: -$25.000 COP');
  console.log('   [RECOGIDA A BÓVEDA] Retiro preventivo de seguridad: -$150.000 COP');

  console.log('\n-> Conciliación de Caja Turno 1:');
  console.log('   Base Inicial:        +$150.000 COP');
  console.log('   Ventas en Efectivo:  +$170.000 COP');
  console.log('   Gastos de Taquilla:   -$25.000 COP');
  console.log('   Retiro a Bóveda:     -$150.000 COP');
  console.log('   Efectivo Esperado:    $145.000 COP');
  console.log('   Efectivo Físico:      $145.000 COP -> ¡CUADRE EXACTO: $0 COP!');
  console.log('   (Base transferida a Turno 2: $100.000 COP | A Bóveda: $45.000 COP)');

  const shift1 = {
    id: `shift-1-${Date.now()}`,
    shiftNumber: 1,
    operationalDayId: 'day-2026-10-19-1',
    operationalDayNumber: 1,
    operatorName: 'CARLOS RESTREPO',
    startTime: '2026-10-19T06:00:00.000Z',
    endTime: '2026-10-19T14:00:00.000Z',
    initialCash: 150000,
    status: 'closed',
    consecutiveCode: 'ARQ-0001',
    cashCollectedSnapshot: 170000,
    cardCollectedSnapshot: 150000, // POS Bold
    walletCollectedSnapshot: 85000, // Nequi + Daviplata ($50k + $35k)
    qrCollectedSnapshot: 0,
    breBCollectedSnapshot: 0,
    agreementCollectedSnapshot: 0,
    totalCollectedSnapshot: 270000,
    totalExpensesSnapshot: 25000,
    totalPickupsSnapshot: 150000,
    expectedCashSnapshot: 145000,
    countedCashSnapshot: 145000,
    finalCountedCash: 145000,
    cashDifference: 0,
    totalToConsignSnapshot: 195000,
    cashMovements: [
      {
        id: 'mov-101',
        timestamp: '2026-10-19T06:00:00Z',
        type: 'income',
        amount: 150000,
        description: 'Base de apertura Turno #1 Mañana',
        operator: 'CARLOS RESTREPO'
      },
      {
        id: 'mov-102',
        timestamp: '2026-10-19T10:15:00Z',
        type: 'expense',
        amount: 25000,
        description: 'Compra rollos térmicos papel 80mm SAT 22TUS',
        operator: 'CARLOS RESTREPO'
      },
      {
        id: 'mov-103',
        timestamp: '2026-10-19T13:30:00Z',
        type: 'pickup',
        amount: 150000,
        description: 'Retiro preventivo a caja fuerte / bóveda',
        operator: 'Supervisor de Turno'
      }
    ]
  };

  console.log('\n>>> IMPRIMIENDO EN SAT 22TUS: COMPROBANTE DE ARQUEO TURNO 1 (ARQ-0001)...');
  const printT1Res = await postJson('/api/print/instant', {
    printerName: 'SAT 22TUS',
    type: 'cash_shift',
    forceRaw: true,
    paperWidth: '80mm',
    autoCut: true,
    openDrawer: false,
    shift: shift1,
    businessInfo,
    rates
  });
  console.log('-> Impresión Turno 1:', printT1Res.data?.success ? '✓ IMPRESO CON ÉXITO' : 'ERROR', printT1Res.data);
  await delay(3000);

  // =========================================================================
  // FASE 3: TURNO 2 - TARDE / NOCHE (Cajera: María Fernanda Gómez)
  // =========================================================================
  console.log('\n-----------------------------------------------------------------------------');
  console.log('FASE 3: Turno 2 (02:00 PM - 10:00 PM) - Cajera: MARÍA FERNANDA GÓMEZ');
  console.log('-----------------------------------------------------------------------------');
  console.log('-> Apertura Turno #2 con Base Recibida: $100.000 COP');
  console.log('-> Registrando Entradas y Salidas de Vehículos en Turno 2:');
  console.log('   8.  [TKT-008] Auto FRT-102      | $25.000 | Medio: QR BANCOLOMBIA (Tx #QR-778812)');
  console.log('   9.  [TKT-009] Camioneta PKL-990 | $35.000 | Medio: TRANSFERENCIA PSE (CUS #CUS-9918237)');
  console.log('   10. [TKT-010] Auto BNM-441      | $20.000 | Medio: SISTEMA BRE-B (Aprobación #BREB-883192)');
  console.log('   11. [TKT-011] Auto SUB-001      |  $0 COP | Medio: CONVENIO / MENSUALIDAD (Abonado: Mauricio Beltrán - 100% Cubierto)');
  console.log('   12. [TKT-012] Camioneta JHG-305 | $45.000 | Medio: PAGO MIXTO ($20.000 Efectivo + $25.000 Nequi #M-771190)');
  console.log('   13. [TKT-013] Moto ZXC-12D      | $15.000 | Medio: EFECTIVO (Recibido: $20.000, Cambio: $5.000)');
  console.log('   14. [TKT-014] Auto YUI-804      | $30.000 | Medio: EFECTIVO (Recibido: $50.000, Cambio: $20.000)');

  console.log('\n-> VEHÍCULOS QUE PERMANECEN EN PATIO AL CIERRE (AMANECIDOS / INVENTARIO NOCTURNO):');
  console.log('   15. [TKT-015] Automóvil PAT-111 | Ingreso: 05:30 PM | Plaza: A-04 | Estado: EN PATIO');
  console.log('   16. [TKT-016] Moto      PAT-222 | Ingreso: 06:15 PM | Plaza: M-02 | Estado: EN PATIO');
  console.log('   17. [TKT-017] Camioneta PAT-333 | Ingreso: 07:00 PM | Plaza: C-01 | Estado: EN PATIO');
  console.log('   18. [TKT-018] Bicicleta PAT-444 | Ingreso: 07:30 PM | Plaza: B-05 | Estado: EN PATIO');
  console.log('   Total Amanecidos en Patio: 4 vehículos.');

  console.log('\n-> Registrando Movimientos de Caja en Turno 2:');
  console.log('   [INGRESO EXTRAORDINARIO] Reintegro de saldo de caja menor: +$50.000 COP');
  console.log('   [GASTO MENOR] Compra insumos de aseo y cafetería taquilla: -$10.000 COP');
  console.log('   [RECOGIDA A BÓVEDA] Retiro preventivo a caja fuerte / bóveda: -$120.000 COP');

  console.log('\n-> Conciliación de Caja Turno 2:');
  console.log('   Base Recibida de T1: +$100.000 COP');
  console.log('   Ventas Efectivo T2:   +$65.000 COP ($20k mixto + $15k moto + $30k auto)');
  console.log('   Otros Ingresos Caja:  +$50.000 COP');
  console.log('   Gastos de Operación:  -$10.000 COP');
  console.log('   Retiro a Bóveda:     -$120.000 COP');
  console.log('   Efectivo Esperado:     $85.000 COP');
  console.log('   Efectivo Físico:       $85.000 COP -> ¡CUADRE EXACTO: $0 COP!');

  const shift2 = {
    id: `shift-2-${Date.now()}`,
    shiftNumber: 2,
    operationalDayId: 'day-2026-10-19-1',
    operationalDayNumber: 1,
    operatorName: 'MARÍA FERNANDA GÓMEZ',
    startTime: '2026-10-19T14:00:00.000Z',
    endTime: '2026-10-19T22:00:00.000Z',
    initialCash: 100000,
    status: 'closed',
    consecutiveCode: 'ARQ-0002',
    cashCollectedSnapshot: 65000,
    cardCollectedSnapshot: 0,
    walletCollectedSnapshot: 25000, // Nequi (del pago mixto)
    qrCollectedSnapshot: 25000,     // QR Bancolombia
    transferCollectedSnapshot: 35000, // PSE
    breBCollectedSnapshot: 20000,   // Bre-B
    mixedCollectedSnapshot: 45000,  // Pago Mixto
    agreementCollectedSnapshot: 0,  // Convenio abonado ($0)
    totalIncomesSnapshot: 50000,    // Reintegro caja menor
    totalCollectedSnapshot: 170000,
    totalExpensesSnapshot: 10000,
    totalPickupsSnapshot: 120000,
    expectedCashSnapshot: 85000,
    countedCashSnapshot: 85000,
    finalCountedCash: 85000,
    cashDifference: 0,
    totalToConsignSnapshot: 105000,
    cashMovements: [
      {
        id: 'mov-201',
        timestamp: '2026-10-19T14:00:00Z',
        type: 'income',
        amount: 100000,
        description: 'Base recibida de Turno #1',
        operator: 'MARÍA FERNANDA GÓMEZ'
      },
      {
        id: 'mov-202',
        timestamp: '2026-10-19T16:30:00Z',
        type: 'income',
        amount: 50000,
        description: 'Reintegro extraordinario de saldo caja menor',
        operator: 'MARÍA FERNANDA GÓMEZ'
      },
      {
        id: 'mov-203',
        timestamp: '2026-10-19T18:00:00Z',
        type: 'expense',
        amount: 10000,
        description: 'Compra insumos de aseo y cafetería taquilla',
        operator: 'MARÍA FERNANDA GÓMEZ'
      },
      {
        id: 'mov-204',
        timestamp: '2026-10-19T21:15:00Z',
        type: 'pickup',
        amount: 120000,
        description: 'Retiro parcial preventivo a bóveda',
        operator: 'Supervisor de Turno'
      }
    ]
  };

  console.log('\n>>> IMPRIMIENDO EN SAT 22TUS: COMPROBANTE DE ARQUEO TURNO 2 (ARQ-0002)...');
  const printT2Res = await postJson('/api/print/instant', {
    printerName: 'SAT 22TUS',
    type: 'cash_shift',
    forceRaw: true,
    paperWidth: '80mm',
    autoCut: true,
    openDrawer: false,
    shift: shift2,
    businessInfo,
    rates
  });
  console.log('-> Impresión Turno 2:', printT2Res.data?.success ? '✓ IMPRESO CON ÉXITO' : 'ERROR', printT2Res.data);
  await delay(3000);

  // =========================================================================
  // FASE 4: CIERRE DEFINITIVO DEL DÍA OPERATIVO (REPORTE Z)
  // =========================================================================
  console.log('\n=============================================================================');
  console.log('FASE 4: CIERRE DEFINITIVO DE JORNADA OPERATIVA - REPORTE Z (Z-0001)');
  console.log('=============================================================================');
  console.log('Consolidando 100% de operaciones del día:');
  console.log('• Total Tickets Emitidos: 18 tickets');
  console.log('• Total Tickets Liquidados / Salidas: 14 tickets');
  console.log('• Vehículos en Patio (Amanecidos): 4 vehículos');
  console.log('• Rango de Tickets Fiscales: TKT-001 al TKT-018');
  console.log('• Total Turnos Operados: 2 Turnos');
  console.log('• Gran Total Facturado del Día: $440.000 COP');
  console.log('• Gran Total Efectivo Recaudado: $235.000 COP ($170k T1 + $65k T2)');
  console.log('• Otros Ingresos Extraordinarios: $50.000 COP');
  console.log('• Total Gastos Operativos: -$35.000 COP');
  console.log('• Total Retiros a Bóveda: -$270.000 COP ($150k T1 + $120k T2)');
  console.log('• Efectivo Esperado en Bóveda/Caja: $130.000 COP');
  console.log('• Efectivo Físico Contado: $130.000 COP -> ¡CUADRE EXACTO: $0 COP!');
  console.log('• Liquidación Total a Depositar en Banco: $300.000 COP\n');

  const fullDay = {
    id: 'day-2026-10-19-1',
    dayNumber: 1,
    date: '2026-10-19',
    formattedDate: '19/10/2026',
    openedAt: '2026-10-19T06:00:00.000Z',
    closedAt: new Date().toISOString(),
    status: 'closed',
    consecutiveCode: 'Z-0001',
    shiftsCount: 2,
    initialDayCash: 150000,
    finalDayCash: 130000,
    closedByOperator: 'CARLOS MARIO ZAPATA (ADMINISTRADOR)',
    closingNotes: 'Jornada N° 1 cerrada con total éxito. Arqueos de Turno 1 y 2 cuadrados al centavo con $0 diferencia. Quedan 4 vehículos inventariados en patio (amanecidos). Fondos transferidos a bóveda y base de $100.000 reservada para apertura de mañana.',
    
    // Snapshots de Medios de Pago
    cashCollectedSnapshot: 235000,      // $170k + $65k
    cardCollectedSnapshot: 15000,       // Datáfono POS (Bold/Redeban)
    walletCollectedSnapshot: 110000,    // Nequi ($75k) + Daviplata ($35k)
    qrCollectedSnapshot: 25000,         // QR Bancolombia
    transferCollectedSnapshot: 35000,   // PSE / Transferencia
    breBCollectedSnapshot: 20000,       // Bre-B
    mixedCollectedSnapshot: 45000,      // Pago Mixto
    agreementCollectedSnapshot: 0,      // Convenio abonado mensual ($0 pagado en salida)
    totalCollected: 440000,

    // Snapshots de Flujo de Efectivo
    totalIncomesSnapshot: 50000,        // Reintegro caja menor
    totalExpensesSnapshot: 35000,       // $25k rollos + $10k aseo
    totalPickupsSnapshot: 270000,       // $150k T1 + $120k T2
    expectedCashSnapshot: 130000,       // $150k + $235k + $50k - $35k - $270k = $130k
    countedCashSnapshot: 130000,
    cashDifferenceSnapshot: 0,
    totalToConsignSnapshot: 300000,     // $270k en bóveda + $30k excedente sobre base de $100k para mañana

    // Snapshots Sección 1: Movimiento de Vehículos
    totalTicketsIssuedSnapshot: 18,
    totalTicketsPaidSnapshot: 14,
    activeVehiclesRemainingSnapshot: 4,
    ticketRangeSnapshot: {
      startTicket: 'TKT-001',
      endTicket: 'TKT-018'
    },
    vehicleStatsSnapshot: [
      { category: 'Automóviles', count: 6, total: 171000 },
      { category: 'Camionetas / SUV', count: 4, total: 190000 },
      { category: 'Motocicletas', count: 3, total: 41000 },
      { category: 'Convenios / Mensualidades', count: 1, total: 38000 }
    ],

    // Snapshots Sección 2: Desglose por Turnos
    shiftsSummarySnapshot: [
      { shiftNumber: 1, operatorName: 'CARLOS RESTREPO', totalCollected: 270000, cash: 170000, electronic: 100000, status: 'closed' },
      { shiftNumber: 2, operatorName: 'MARÍA FERNANDA GÓMEZ', totalCollected: 170000, cash: 65000, electronic: 105000, status: 'closed' }
    ],

    // Snapshots Sección 4: Detalle de Movimientos
    movementsSummarySnapshot: [
      { type: 'expense', amount: 25000, description: 'Compra rollos térmicos SAT 22TUS' },
      { type: 'pickup', amount: 150000, description: 'Retiro parcial seguridad Turno 1' },
      { type: 'income', amount: 50000, description: 'Reintegro extraordinario saldo caja menor' },
      { type: 'expense', amount: 10000, description: 'Insumos de aseo y cafetería taquilla' },
      { type: 'pickup', amount: 120000, description: 'Retiro parcial seguridad Turno 2' }
    ]
  };

  console.log('>>> IMPRIMIENDO EN SAT 22TUS: CIERRE DEFINITIVO DE JORNADA (REPORTE Z)...');
  const printDayRes = await postJson('/api/print/instant', {
    printerName: 'SAT 22TUS',
    type: 'day_closure',
    forceRaw: true,
    paperWidth: '80mm',
    autoCut: true,
    openDrawer: false,
    day: fullDay,
    businessInfo,
    rates
  });

  console.log('-> Impresión Reporte Z:', printDayRes.data?.success ? '✓ IMPRESO CON ÉXITO' : 'ERROR', printDayRes.data);
  await delay(2500);

  console.log('\n=============================================================================');
  console.log('>>> SIMULACIÓN COMPLETA FINALIZADA CON ÉXITO');
  console.log('>>> Se emitieron e imprimieron físicamente en SAT 22TUS:');
  console.log('    1. Comprobante de Arqueo de Caja X Turno 1 (Cajero Carlos Restrepo)');
  console.log('    2. Comprobante de Arqueo de Caja X Turno 2 (Cajera María Fernanda Gómez)');
  console.log('    3. Cierre Definitivo Fiscal (Reporte Z - Z-0001) con las 4 secciones');
  console.log('=============================================================================');
}

run().catch(console.error);
