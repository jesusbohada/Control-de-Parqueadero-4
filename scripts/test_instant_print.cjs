const http = require('http');

const targetPrinter = process.argv[2] || 'SAT 22TUS';

const payload = JSON.stringify({
  printerName: targetPrinter,
  type: 'exit_receipt',
  paperWidth: '80mm',
  autoCut: true,
  openDrawer: true,
  ticket: {
    id: 'sub-real-001',
    ticketNumber: 'SUB-202610-001',
    plate: 'KLR-650',
    vehicleType: 'motorcycle',
    entryTime: new Date(Date.now() - 3600000 * 24).toISOString(),
    paidAt: new Date().toISOString(),
    totalCost: 95000,
    paymentMethod: 'bancolombia_qr',
    voucherNumber: 'TRX-QR-8849102',
    terminalId: 'TAQUILLA-01',
    operator: 'Administrador',
    subscriberInfo: {
      fullName: 'ROBERTO CARLOS MENDEZ',
      documentId: '79.845.120',
      phone: '315-8899001',
      planType: 'monthly',
      startDate: '2026-10-19',
      endDate: '2026-11-19',
      amountPaid: 95000,
      paymentStatus: 'paid',
      paymentMethod: 'bancolombia_qr',
      voucherNumber: 'TRX-QR-8849102'
    }
  },
  businessInfo: {
    name: 'PARQUEADERO WOLFZONE POS',
    nit: '900.543.210-9',
    address: 'Carrera 15 # 85-30, Bogotá',
    phone: '310-222-3344',
    defaultPrinterName: targetPrinter,
    cutPaperOnPrint: true,
    openCashDrawerOnCashPayment: true
  }
});

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
  let responseData = '';
  res.on('data', chunk => responseData += chunk);
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log('RESPONSE:', responseData);
  });
});

req.on('error', (e) => {
  console.error(`ERROR: ${e.message}`);
});

req.write(payload);
req.end();
