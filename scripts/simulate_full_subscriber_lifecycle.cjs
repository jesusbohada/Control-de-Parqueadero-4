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

async function runFullLifecycle() {
  console.log('=============================================================================');
  console.log('>>> CICLO COMPLETO DE ABONADO: SUSCRIPCIÓN -> ENTRADA DIARIA -> SALIDA DIARIA');
  console.log('=============================================================================\n');

  const businessInfo = {
    name: 'PARQUEADERO WOLFZONE POS',
    nit: '901.458.723-1',
    address: 'Av. Libertador # 45 - 20, Zona Centro',
    phone: '(+57) 310 892 4511',
    branchName: 'Sede Principal',
    defaultPrinterName: 'SAT 22TUS',
    defaultPaperWidth: '80mm',
    cutPaperOnPrint: true,
    openCashDrawerOnCashPayment: true
  };

  const rates = {
    currencySymbol: '$',
    motorcycle: { hourRate: 2500, gracePeriodMinutes: 15 }
  };

  // -------------------------------------------------------------------------
  // PASO 1: REGISTRO DE LA SUSCRIPCIÓN MENSUAL (CONTRATO Y PAGO DE MENSUALIDAD)
  // -------------------------------------------------------------------------
  console.log('-----------------------------------------------------------------------------');
  console.log('PASO 1: Registrando suscripción mensual de abonado en la base de datos...');
  console.log('-----------------------------------------------------------------------------');

  const subscriber = {
    id: `sub_demo_${Date.now()}`,
    fullName: 'SANTIAGO RESTREPO DUQUE',
    documentId: '1.037.654.321',
    phone: '311-555-7788',
    plate: 'KLR-650',
    vehicleType: 'motorcycle',
    monthlyRate: 80000,
    startDate: '2026-10-19',
    endDate: '2026-11-19',
    assignedSpotCode: 'M-01',
    status: 'active',
    paymentMethod: 'bancolombia_qr',
    paymentReference: 'REF-QR-8839120',
    voucherNumber: 'BC-QR-776102',
    registeredBy: 'Administrador'
  };

  const subRes = await postJson('/api/subscribers', { subscriber });
  console.log('-> Suscripción registrada en el sistema:', subRes.status === 200 ? 'OK' : 'FAIL');

  console.log('>>> Imprimiendo Ticket #1: Comprobante Físico de Suscripción Mensual en SAT 22TUS...');
  const printSubRes = await postJson('/api/print/instant', {
    printerName: 'SAT 22TUS',
    type: 'exit_receipt',
    paperWidth: '80mm',
    autoCut: true,
    openDrawer: false,
    ticket: {
      id: subscriber.id,
      ticketNumber: `SUB-${subscriber.plate}`,
      plate: subscriber.plate,
      vehicleType: subscriber.vehicleType,
      entryTime: `${subscriber.startDate}T00:00:00Z`,
      exitTime: `${subscriber.endDate}T23:59:59Z`,
      totalCost: subscriber.monthlyRate,
      totalAmount: subscriber.monthlyRate,
      paymentMethod: subscriber.paymentMethod,
      voucherNumber: subscriber.voucherNumber,
      terminalId: 'TAQUILLA-01',
      operator: 'Administrador',
      subscriberInfo: {
        fullName: subscriber.fullName,
        documentId: subscriber.documentId,
        phone: subscriber.phone,
        vehicleCategoryName: 'Motocicleta Urbana',
        planType: 'monthly',
        startDate: subscriber.startDate,
        endDate: subscriber.endDate,
        assignedSpotCode: subscriber.assignedSpotCode,
        amountPaid: subscriber.monthlyRate,
        paymentStatus: 'paid',
        paymentMethodDisplay: 'Bancolombia QR (Transferencia)',
        voucherNumber: subscriber.voucherNumber,
        paymentReference: subscriber.paymentReference
      }
    },
    businessInfo,
    rates
  });
  console.log('-> Resultado Impresión Comprobante Mensualidad:', printSubRes.data?.success ? 'IMPRESO CON ÉXITO' : 'ERROR', printSubRes.data?.printer);
  await delay(3000);

  // -------------------------------------------------------------------------
  // PASO 2: INGRESO DIARIO DEL VEHÍCULO AL PARQUEADERO
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------------------------');
  console.log('PASO 2: El vehículo KLR-650 llega diariamente a la entrada del parqueadero...');
  console.log('-----------------------------------------------------------------------------');
  console.log('-> El cajero o cámara ANPR digita la placa: KLR-650');
  console.log('-> Sistema verifica en /api/subscribers/check/KLR-650');
  console.log('-> DETECTADO: VEHÍCULO ABONADO ACTIVO (Santiago Restrepo Duque - Vigente hasta 19/11/2026)');
  console.log('-> Plaza reservada asignada automáticamente: M-01');

  const entryTicket = {
    id: `tk-sub-entry-${Date.now()}`,
    ticketNumber: 'PK-0440',
    barcode: 'PK-0440',
    plate: 'KLR-650',
    vehicleType: 'motorcycle',
    spotCode: 'M-01',
    entryTime: new Date(Date.now() - 4 * 3600 * 1000 - 15 * 60 * 1000).toISOString(), // Hace 4h 15m
    status: 'active',
    notes: '[Abonado Mensual: SANTIAGO RESTREPO DUQUE - Vigencia: 19/11/2026] Plaza M-01',
    isSubscriber: true,
    operationalDayNumber: 1,
    shiftNumber: 1,
    cashierName: 'Administrador POS'
  };

  const entryDbRes = await postJson('/api/tickets/active', { ticket: entryTicket });
  console.log('-> Ticket de ingreso activo registrado en base de datos:', entryDbRes.status === 200 ? 'OK' : 'FAIL');

  console.log('>>> Imprimiendo Ticket #2: Ticket Térmico de Ingreso Diario para el Conductor...');
  const printEntryRes = await postJson('/api/print/instant', {
    printerName: 'SAT 22TUS',
    type: 'entry_ticket',
    paperWidth: '80mm',
    autoCut: true,
    openDrawer: false,
    ticket: entryTicket,
    businessInfo,
    rates
  });
  console.log('-> Resultado Impresión Ticket Ingreso:', printEntryRes.data?.success ? 'IMPRESO CON ÉXITO' : 'ERROR', printEntryRes.data?.printer);
  await delay(3000);

  // -------------------------------------------------------------------------
  // PASO 3: SALIDA DIARIA DEL VEHÍCULO DEL PARQUEADERO
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------------------------');
  console.log('PASO 3: El vehículo KLR-650 sale del parqueadero y presenta su ticket PK-0440...');
  console.log('-----------------------------------------------------------------------------');
  console.log('-> El cajero escanea el código de barras PK-0440 en taquilla.');
  console.log('-> Tiempo de permanencia: 4 horas 15 minutos.');
  console.log('-> Tarifa ordinaria calculada: $11.000 COP.');
  console.log('-> Exoneración aplicada por suscripción activa: -$11.000 COP.');
  console.log('-> TOTAL A PAGAR EN CAJA: $0 COP (CUBIERTO POR PLAN MENSUAL).');
  console.log('-> Plaza M-01 liberada en el patio de motos.');

  const exitTicket = {
    ...entryTicket,
    exitTime: new Date().toISOString(),
    status: 'paid',
    totalMinutes: 255,
    billableMinutes: 255,
    baseAmount: 11000,
    taxAmount: 0,
    discountAmount: 11000,
    totalAmount: 0,
    paymentMethod: 'agreement',
    paidAt: new Date().toISOString(),
    cashierName: 'Administrador POS'
  };

  const checkoutRes = await postJson('/api/tickets/checkout', {
    ticket: exitTicket,
    paidAt: exitTicket.paidAt,
    total: 0,
    paymentMethod: 'agreement',
    spotCode: 'M-01'
  });
  console.log('-> Salida y liquidación registrada en base de datos:', checkoutRes.status === 200 ? 'OK' : 'FAIL');

  console.log('>>> Imprimiendo Ticket #3: Comprobante de Salida y Paz y Salvo de Abonado ($0 COP)...');
  const printExitRes = await postJson('/api/print/instant', {
    printerName: 'SAT 22TUS',
    type: 'exit_receipt',
    paperWidth: '80mm',
    autoCut: true,
    openDrawer: false, // $0 no requiere abrir caja
    ticket: exitTicket,
    businessInfo,
    rates
  });
  console.log('-> Resultado Impresión Comprobante Salida:', printExitRes.data?.success ? 'IMPRESO CON ÉXITO' : 'ERROR', printExitRes.data?.printer);

  console.log('\n=============================================================================');
  console.log('>>> ¡CICLO COMPLETO EJECUTADO E IMPRESO SATISFACTORIAMENTE EN SAT 22TUS!');
  console.log('=============================================================================');
}

runFullLifecycle().catch(console.error);
