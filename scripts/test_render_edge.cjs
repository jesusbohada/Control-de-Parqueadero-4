const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const tempHtml = path.join(process.cwd(), 'temp_test_ticket.html');
const tempPng = path.join(process.cwd(), 'temp_test_ticket.png');

fs.writeFileSync(tempHtml, `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 10px; font-family: monospace; width: 384px; background: #fff; color: #000; }
    h2 { text-align: center; margin: 0 0 5px 0; }
    p { margin: 3px 0; font-size: 14px; }
    hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
  </style>
</head>
<body>
  <h2>PARQUEADERO WOLFZONE</h2>
  <p class="center">NIT: 900.543.210-9</p>
  <p class="center">CARRERA 15 # 85-30, BOGOTA</p>
  <hr/>
  <p class="center bold">RECIBO DE ABONADO MENSUAL</p>
  <p><strong>Ticket:</strong> SUB-202610-001</p>
  <p><strong>Abonado:</strong> ROBERTO CARLOS MENDEZ</p>
  <p><strong>Cédula:</strong> 79.845.120</p>
  <p><strong>Placa:</strong> KLR-650 (MOTO)</p>
  <p><strong>Vigencia:</strong> 19/10/2026 al 19/11/2026</p>
  <p><strong>Medio de Pago:</strong> Bancolombia QR</p>
  <p><strong>Comprobante/Voucher:</strong> TRX-QR-8849102</p>
  <hr/>
  <p class="bold" style="font-size: 16px;">TOTAL PAGADO: $95.000</p>
  <p>Estado: CANCELADO</p>
  <hr/>
  <p class="center">¡Gracias por su suscripción!</p>
</body>
</html>
`, 'utf8');

const browserExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const renderArgs = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--force-device-scale-factor=1.0',
  '--window-size=384,600',
  `--screenshot=${tempPng}`,
  `file:///${tempHtml.replace(/\\/g, '/')}`
];

execFile(browserExe, renderArgs, { timeout: 10000 }, (err) => {
  if (err) {
    console.error('RENDER ERROR:', err);
  } else {
    console.log('RENDER SUCCESS, file exists:', fs.existsSync(tempPng), 'size:', fs.existsSync(tempPng) ? fs.statSync(tempPng).size : 0);
  }
});
