const http = require('http');

const subscribersSimulation = [
  {
    label: 'SIMULACIÓN 1: AUTOMÓVIL - PAGO BANCOLOMBIA QR (VOUCHER ELECTRÓNICO)',
    printerName: 'SAT 22TUS',
    type: 'exit_receipt',
    paperWidth: '80mm',
    autoCut: true,
    openDrawer: false,
    ticket: {
      id: 'sub-sim-bmw-01',
      ticketNumber: 'SUB-202610-001',
      plate: 'BMW-320',
      vehicleType: 'car',
      entryTime: '2026-10-19T08:00:00Z',
      paidAt: new Date().toISOString(),
      totalCost: 140000,
      totalAmount: 140000,
      paymentMethod: 'bancolombia_qr',
      voucherNumber: 'TRX-QR-9921448',
      terminalId: 'TAQUILLA-01',
      operator: 'Administrador POS',
      subscriberInfo: {
        fullName: 'ANDRÉS FELIPE JARAMILLO',
        documentId: '1.020.456.789',
        phone: '312-456-7890',
        vehicleCategoryName: 'Automóvil Estándar',
        planType: 'monthly',
        startDate: '19/10/2026',
        endDate: '19/11/2026',
        assignedSpotCode: 'A-05',
        amountPaid: 140000,
        paymentStatus: 'paid',
        paymentMethodDisplay: 'Bancolombia QR (Transferencia)',
        voucherNumber: 'TRX-QR-9921448',
        paymentReference: 'REF-BC-2026-88371'
      }
    },
    businessInfo: {
      name: 'PARQUEADERO WOLFZONE POS',
      nit: '901.458.723-1',
      address: 'Av. Libertador # 45 - 20, Zona Centro',
      phone: '(+57) 310 892 4511',
      branchName: 'Sede Principal',
      defaultPrinterName: 'SAT 22TUS',
      defaultPaperWidth: '80mm',
      cutPaperOnPrint: true,
      openCashDrawerOnCashPayment: true
    }
  },
  {
    label: 'SIMULACIÓN 2: MOTOCICLETA - PAGO NEQUI (VOUCHER NÚMERO CUS / SOPORTE)',
    printerName: 'SAT 22TUS',
    type: 'exit_receipt',
    paperWidth: '80mm',
    autoCut: true,
    openDrawer: false,
    ticket: {
      id: 'sub-sim-ybr-02',
      ticketNumber: 'SUB-202610-002',
      plate: 'YBR-125',
      vehicleType: 'motorcycle',
      entryTime: '2026-10-19T09:15:00Z',
      paidAt: new Date().toISOString(),
      totalCost: 75000,
      totalAmount: 75000,
      paymentMethod: 'nequi',
      voucherNumber: 'NEQ-CUS-83920194',
      terminalId: 'TAQUILLA-01',
      operator: 'Administrador POS',
      subscriberInfo: {
        fullName: 'VALENTINA MORENO GÓMEZ',
        documentId: '1.098.765.432',
        phone: '300-887-6543',
        vehicleCategoryName: 'Motocicleta Urbana',
        planType: 'monthly',
        startDate: '19/10/2026',
        endDate: '19/11/2026',
        assignedSpotCode: 'M-12',
        amountPaid: 75000,
        paymentStatus: 'paid',
        paymentMethodDisplay: 'Nequi Móvil',
        voucherNumber: 'NEQ-CUS-83920194',
        paymentReference: 'APROB: 554901'
      }
    },
    businessInfo: {
      name: 'PARQUEADERO WOLFZONE POS',
      nit: '901.458.723-1',
      address: 'Av. Libertador # 45 - 20, Zona Centro',
      phone: '(+57) 310 892 4511',
      branchName: 'Sede Principal',
      defaultPrinterName: 'SAT 22TUS',
      defaultPaperWidth: '80mm',
      cutPaperOnPrint: true,
      openCashDrawerOnCashPayment: true
    }
  },
  {
    label: 'SIMULACIÓN 3: CAMIONETA CARGA - PAGO EN EFECTIVO (CON APERTURA DE CAJÓN MONEDERO)',
    printerName: 'SAT 22TUS',
    type: 'exit_receipt',
    paperWidth: '80mm',
    autoCut: true,
    openDrawer: true, // Apertura automática de cajón para efectivo
    ticket: {
      id: 'sub-sim-vnn-03',
      ticketNumber: 'SUB-202610-003',
      plate: 'VNN-456',
      vehicleType: 'van',
      entryTime: '2026-10-19T10:00:00Z',
      paidAt: new Date().toISOString(),
      totalCost: 180000,
      totalAmount: 180000,
      paymentMethod: 'cash',
      terminalId: 'TAQUILLA-01',
      operator: 'Administrador POS',
      subscriberInfo: {
        fullName: 'DISTRIBUCIONES & LOGÍSTICA DEL NORTE S.A.S.',
        documentId: '900.876.543-2',
        phone: '315-776-5544',
        vehicleCategoryName: 'Camioneta / Furgón',
        planType: 'monthly',
        startDate: '19/10/2026',
        endDate: '19/11/2026',
        assignedSpotCode: 'C-01',
        amountPaid: 180000,
        paymentStatus: 'paid',
        paymentMethodDisplay: 'Efectivo en Caja (Efectivo Recibido: $200.000 / Cambio: $20.000)',
        voucherNumber: 'REC-CAJA-00452',
        paymentReference: 'CAJA-01-TURNO-1'
      }
    },
    businessInfo: {
      name: 'PARQUEADERO WOLFZONE POS',
      nit: '901.458.723-1',
      address: 'Av. Libertador # 45 - 20, Zona Centro',
      phone: '(+57) 310 892 4511',
      branchName: 'Sede Principal',
      defaultPrinterName: 'SAT 22TUS',
      defaultPaperWidth: '80mm',
      cutPaperOnPrint: true,
      openCashDrawerOnCashPayment: true
    }
  }
];

function sendPrint(item) {
  return new Promise((resolve, reject) => {
    console.log(`\n=============================================================`);
    console.log(`>>> INICIANDO: ${item.label}`);
    console.log(`=============================================================`);

    const payload = JSON.stringify(item);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/print/instant',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[HTTP ${res.statusCode}] Respuesta del Servidor:`, data);
        resolve({ statusCode: res.statusCode, response: data });
      });
    });

    req.on('error', (err) => {
      console.error(`[ERROR DE CONEXIÓN]:`, err.message);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

async function run() {
  for (const sim of subscribersSimulation) {
    try {
      await sendPrint(sim);
      // Pequeña pausa de 2.5s entre impresiones para permitir el corte y avance de papel
      console.log('Esperando corte de papel y finalización de trabajo...');
      await new Promise(r => setTimeout(r, 2500));
    } catch (e) {
      console.error('Fallo en la simulación:', e);
    }
  }
  console.log('\n=============================================================');
  console.log('>>> TODAS LAS SIMULACIONES DE TICKETS FUERON ENVIADAS');
  console.log('=============================================================');
}

run();
