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
  console.log('>>> INICIANDO SIMULACIÓN: CAMBIO DE TURNO (ARQUEO X) Y CIERRE DEL DÍA (Z)');
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
    openCashDrawerOnCashPayment: true
  };

  const rates = {
    currencySymbol: '$'
  };

  // =========================================================================
  // PARTE 1: ARQUEO DE CAJA Y CAMBIO DE TURNO (COMPROBANTE X)
  // =========================================================================
  console.log('-----------------------------------------------------------------------------');
  console.log('PARTE 1: Cierre de Turno #1 y Entrega a Turno #2 (Arqueo de Caja X)');
  console.log('-----------------------------------------------------------------------------');
  console.log('-> Cajero Saliente: JUAN CARLOS RINCÓN');
  console.log('-> Cajero Entrante: PAOLA ANDREA DUQUE');
  console.log('-> Base Inicial Entregada: $150.000 COP');
  console.log('-> Recaudo Efectivo: $340.000 COP');
  console.log('-> Recaudo Electrónico (Tarjetas, QR, Nequi): $215.000 COP');
  console.log('-> Gastos Menores Autorizados (Insumos): -$25.000 COP');
  console.log('-> Retiro Parcial a Bóveda: -$200.000 COP');
  console.log('-> Efectivo Esperado en Caja: $265.000 COP');
  console.log('-> Efectivo Físico Contado: $265.000 COP (CUADRE EXACTO: $0 COP)');
  console.log('-> Base Asignada al Siguiente Turno: $150.000 COP');

  const shiftToClose = {
    id: `shift-1-1-${Date.now()}`,
    shiftNumber: 1,
    operationalDayId: 'day-2026-10-19-1',
    operationalDayNumber: 1,
    operatorName: 'JUAN CARLOS RINCÓN',
    startTime: '2026-10-19T06:00:00.000Z',
    endTime: new Date().toISOString(),
    initialCash: 150000,
    status: 'closed',
    consecutiveCode: 'ARQ-000422',
    cashCollectedSnapshot: 340000,
    cardCollectedSnapshot: 120000,
    walletCollectedSnapshot: 55000,
    qrCollectedSnapshot: 40000,
    breBCollectedSnapshot: 0,
    agreementCollectedSnapshot: 0,
    totalCollectedSnapshot: 555000,
    totalExpensesSnapshot: 25000,
    totalPickupsSnapshot: 200000,
    expectedCashSnapshot: 265000,
    countedCashSnapshot: 265000,
    finalCountedCash: 265000,
    cashDifference: 0,
    totalToConsignSnapshot: 315000,
    cashMovements: [
      {
        id: 'mov-1',
        timestamp: '2026-10-19T06:00:00Z',
        type: 'income',
        amount: 150000,
        description: 'Base inicial de apertura Turno #1',
        operator: 'JUAN CARLOS RINCÓN'
      },
      {
        id: 'mov-2',
        timestamp: '2026-10-19T10:30:00Z',
        type: 'expense',
        amount: 25000,
        description: 'Compra rollos térmicos papel 80mm',
        operator: 'JUAN CARLOS RINCÓN'
      },
      {
        id: 'mov-3',
        timestamp: '2026-10-19T13:00:00Z',
        type: 'pickup',
        amount: 200000,
        description: 'Retiro parcial a bóveda de seguridad',
        operator: 'Supervisor de Turno'
      }
    ]
  };

  console.log('\n>>> Enviando a Impresión Térmica en SAT 22TUS: COMPROBANTE DE ARQUEO DE CAJA...');
  const printShiftRes = await postJson('/api/print/instant', {
    printerName: 'SAT 22TUS',
    type: 'cash_shift',
    paperWidth: '80mm',
    autoCut: true,
    openDrawer: false,
    shift: shiftToClose,
    businessInfo,
    rates
  });

  console.log('-> Respuesta Impresión Turno:', printShiftRes.data?.success ? 'IMPRESO CON ÉXITO' : 'ERROR', printShiftRes.data?.printer);
  console.log('-> Esperando corte y avance de papel (3.5 segundos)...');
  await delay(3500);

  // =========================================================================
  // PARTE 2: CIERRE DEFINITIVO DE JORNADA OPERATIVA (REPORTE Z)
  // =========================================================================
  console.log('\n-----------------------------------------------------------------------------');
  console.log('PARTE 2: Cierre Definitivo de Jornada Operativa (Cierre del Día / Reporte Z)');
  console.log('-----------------------------------------------------------------------------');
  console.log('-> Jornada N°: #1 (19 de Octubre de 2026)');
  console.log('-> Total Turnos Completados: 2 Turnos (Mañana y Tarde)');
  console.log('-> Total Efectivo Recaudado Día: $750.000 COP');
  console.log('-> Total Tarjetas y Pagos Digitales: $395.000 COP');
  console.log('-> Gran Total Ventas del Día: $1.145.000 COP');
  console.log('-> Total Gastos y Retiros de Caja: $225.000 COP');
  console.log('-> Liquidación a Depositar en Banco: $675.000 COP');
  console.log('-> Consecutivo Oficial Reporte Z: #Z-004311');
  console.log('-> Cerrado por: CARLOS MARIO ZAPATA (ADMINISTRADOR)');

  const closedDay = {
    id: 'day-2026-10-19-1',
    dayNumber: 1,
    date: '2026-10-19',
    openedAt: '2026-10-19T06:00:00.000Z',
    closedAt: new Date().toISOString(),
    status: 'closed',
    consecutiveCode: 'Z-004311',
    shiftsCount: 2,
    initialDayCash: 150000,
    finalDayCash: 675000,
    closedByOperator: 'CARLOS MARIO ZAPATA (ADMINISTRADOR)',
    closingNotes: 'Jornada finalizada sin novedades. Cuadre total de turnos conforme y fondos consignados a bóveda.',
    cashCollectedSnapshot: 750000,
    cardCollectedSnapshot: 240000,
    walletCollectedSnapshot: 95000,
    qrCollectedSnapshot: 60000,
    breBCollectedSnapshot: 0,
    agreementCollectedSnapshot: 0,
    totalCollected: 1145000,
    totalExpensesSnapshot: 25000,
    totalPickupsSnapshot: 200000,
    expectedCashSnapshot: 675000,
    countedCashSnapshot: 675000,
    cashDifferenceSnapshot: 0,
    totalToConsignSnapshot: 675000
  };

  console.log('\n>>> Enviando a Impresión Térmica en SAT 22TUS: CIERRE DEFINITIVO DE JORNADA (REPORTE Z)...');
  const printDayRes = await postJson('/api/print/instant', {
    printerName: 'SAT 22TUS',
    type: 'day_closure',
    paperWidth: '80mm',
    autoCut: true,
    openDrawer: false,
    day: closedDay,
    businessInfo,
    rates
  });

  console.log('-> Respuesta Impresión Reporte Z:', printDayRes.data?.success ? 'IMPRESO CON ÉXITO' : 'ERROR', printDayRes.data?.printer);
  console.log('-> Esperando corte de papel final...');
  await delay(2500);

  console.log('\n=============================================================================');
  console.log('>>> ¡AMBOS COMPROBANTES (TURNO Y DÍA Z) IMPRESOS EXITOSAMENTE EN SAT 22TUS!');
  console.log('=============================================================================');
}

run().catch(console.error);
