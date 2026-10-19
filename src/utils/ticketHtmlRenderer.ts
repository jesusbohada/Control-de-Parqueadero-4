import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { ParkingTicket, CashShift, OperationalDay, ParkingBusinessInfo, RatesConfig, VehicleCategoryConfig } from '../types';

export interface GenerateTicketHtmlOptions {
  type: 'entry_ticket' | 'exit_receipt' | 'cash_shift' | 'day_closure' | 'test';
  ticket?: ParkingTicket | null;
  shift?: CashShift | null;
  day?: OperationalDay | null;
  businessInfo?: Partial<ParkingBusinessInfo>;
  rates?: Partial<RatesConfig>;
  vehicleCategories?: VehicleCategoryConfig[];
  paperWidth?: '80mm' | '58mm';
}

function getLogoBase64(businessInfo?: Partial<ParkingBusinessInfo>): string {
  try {
    if (businessInfo?.logoUrl && businessInfo.logoUrl.startsWith('data:image')) {
      return businessInfo.logoUrl;
    }
    const localLogo = path.join(process.cwd(), 'public', 'logo_compacto.png');
    if (fs.existsSync(localLogo)) {
      const data = fs.readFileSync(localLogo).toString('base64');
      return `data:image/png;base64,${data}`;
    }
  } catch {}
  return '';
}

function getJsBarcodeCode(): string {
  try {
    const jsbPath = path.join(process.cwd(), 'node_modules', 'jsbarcode', 'dist', 'JsBarcode.all.min.js');
    if (fs.existsSync(jsbPath)) {
      return fs.readFileSync(jsbPath, 'utf8');
    }
  } catch {}
  return '';
}

function formatMoney(amount: number = 0, symbol: string = '$'): string {
  return `${symbol} ${Math.round(amount).toLocaleString('es-CO')}`;
}

function getVehicleLabel(type: string = 'car', categories?: VehicleCategoryConfig[]): string {
  const custom = categories?.find(c => c.id === type);
  if (custom) return custom.name.toUpperCase();
  switch (type.toLowerCase()) {
    case 'car': return 'AUTOMÓVIL / CARRO';
    case 'motorcycle': return 'MOTOCICLETA';
    case 'suv': return 'CAMIONETA / SUV';
    case 'bicycle': return 'BICICLETA';
    case 'heavy': return 'VEHÍCULO PESADO';
    default: return type.toUpperCase();
  }
}

/**
 * Genera un documento HTML autónomo y auto-contenido con diseño idéntico al ticket en pantalla,
 * optimizado para impresión térmica monocromática profunda (máximo contraste, negro 100% puro).
 */
export async function generateTicketHtml(options: GenerateTicketHtmlOptions): Promise<string> {
  const {
    type,
    ticket,
    shift,
    day,
    businessInfo = {},
    rates = {},
    vehicleCategories = [],
    paperWidth = '80mm'
  } = options;

  const is58 = paperWidth === '58mm';
  const widthPx = is58 ? 256 : 384;
  const logoDataUrl = getLogoBase64(businessInfo);
  const jsBarcodeCode = getJsBarcodeCode();

  // Generación de Hash de Seguridad Criptográfica
  const rawHash = `${ticket?.ticketNumber || 'TKT'}-${ticket?.plate || 'PLATE'}-${ticket?.entryTime || Date.now()}-${businessInfo.nit || 'WOLF'}`;
  let hashVal = 0;
  for (let i = 0; i < rawHash.length; i++) {
    hashVal = ((hashVal << 5) - hashVal) + rawHash.charCodeAt(i);
    hashVal |= 0;
  }
  const hex = Math.abs(hashVal).toString(16).toUpperCase().padStart(8, '0');
  const securityHash = `WOLF-${hex.substring(0, 4)}-${hex.substring(4, 8)}`;

  // Generación de Código QR Escaneable de Alta Definición
  const qrPayload = JSON.stringify({
    t: ticket?.ticketNumber || 'TEST',
    p: ticket?.plate || 'TEST',
    in: ticket?.entryTime || new Date().toISOString(),
    out: ticket?.exitTime,
    tot: ticket?.totalAmount,
    sec: securityHash
  });

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: is58 ? 160 : 200,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    });
  } catch (err) {
    console.warn('[TicketRenderer] Error generando QR data URL:', err);
  }

  // Estilos de Alta Definición Térmica: Negro Puro (#000000), trazo nítido y estilizado sin engrosamiento excesivo
  const baseStyles = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: ${widthPx}px;
      padding: ${is58 ? '6px 5px 18px' : '10px 8px 22px'};
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-size: ${is58 ? '10px' : '11.5px'};
      line-height: 1.35;
      color: #000000;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .text-center { text-align: center; }
    .bold { font-weight: 700; }
    .bolder { font-weight: 800; }
    .font-black { font-weight: 800; }
    .uppercase { text-transform: uppercase; }
    .font-mono { font-family: 'Consolas', 'Courier New', monospace; font-weight: 700; }
    
    .header-logo { max-height: ${is58 ? '38px' : '46px'}; max-width: 150px; margin: 0 auto 3px; display: block; object-fit: contain; }
    .header-name { font-size: ${is58 ? '12px' : '14px'}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; color: #000000; }
    .header-sub { font-size: ${is58 ? '9px' : '10.5px'}; font-weight: 500; color: #000000; }
    
    /* Inverted Solid Black Badge */
    .badge-black {
      display: inline-block;
      margin: 5px 0 3px;
      padding: 3px 8px;
      font-size: ${is58 ? '9.5px' : '11px'};
      font-weight: 700;
      background: #000000;
      color: #ffffff;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .badge-outline {
      display: inline-block;
      margin: 5px 0 3px;
      padding: 2.5px 7px;
      font-size: ${is58 ? '9.5px' : '10.5px'};
      font-weight: 700;
      border: 1.5px solid #000000;
      border-radius: 3px;
      background: #ffffff;
      color: #000000;
      text-transform: uppercase;
    }
    
    .divider { border-top: 1.2px dashed #000000; margin: 7px 0; }
    .thick-divider { border-top: 2px solid #000000; margin: 7px 0; }
    .thin-divider { border-top: 1px dashed #000000; margin: 5px 0; }
    
    /* Caja de Placa de Alto Impacto Nítida */
    .plate-box {
      border: 2px solid #000000;
      border-radius: 5px;
      padding: 5px 4px;
      margin: 6px 0;
      text-align: center;
      background: #ffffff;
    }
    .plate-label { font-size: ${is58 ? '8.5px' : '10px'}; font-weight: 700; color: #000000; text-transform: uppercase; letter-spacing: 0.5px; }
    .plate-text {
      font-family: 'Arial Black', Arial, Impact, sans-serif;
      font-size: ${is58 ? '22px' : '28px'};
      font-weight: 800;
      letter-spacing: 2px;
      margin: 1px 0;
      color: #000000;
      line-height: 1.15;
    }
    .plate-type { font-size: ${is58 ? '9.5px' : '11px'}; font-weight: 700; color: #000000; }
    
    .row { display: flex; justify-content: space-between; align-items: center; margin: 2.5px 0; font-weight: 500; color: #000000; }
    .rates-box {
      background: #ffffff;
      border: 1.5px dashed #000000;
      border-radius: 4px;
      padding: 5px 7px;
      margin: 6px 0;
    }
    
    /* Caja de Observaciones de Ingreso */
    .notes-box {
      border: 1.5px dashed #000000;
      border-radius: 4px;
      padding: 5px 7px;
      margin: 6px 0;
      background: #ffffff;
      text-align: left;
    }
    .notes-title {
      font-size: ${is58 ? '8.5px' : '9.5px'};
      font-weight: 700;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
      border-bottom: 1px dashed #000000;
      padding-bottom: 2px;
    }
    .notes-content {
      font-size: ${is58 ? '9.5px' : '10.5px'};
      font-weight: 600;
      color: #000000;
      line-height: 1.3;
      word-break: break-word;
    }
    
    .security-seal {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1.5px solid #000000;
      border-radius: 3px;
      padding: 2.5px 5px;
      font-family: 'Consolas', monospace;
      font-size: ${is58 ? '8.5px' : '10px'};
      font-weight: 600;
      margin: 6px 0;
      background: #ffffff;
      color: #000000;
    }
    
    .barcode-container {
      text-align: center;
      margin: 8px auto 4px;
      padding: 6px 0;
      width: 100%;
      background: #ffffff;
    }
    .barcode-container svg {
      display: inline-block;
      margin: 0 auto;
      max-width: 100%;
      height: auto;
      background: #ffffff;
    }
    
    .footer { font-size: ${is58 ? '9px' : '10px'}; font-weight: 600; color: #000000; text-align: center; margin-top: 7px; line-height: 1.3; white-space: pre-line; }
    .wolf-brand {
      border-top: 1.5px dashed #000000;
      margin-top: 7px;
      padding-top: 5px;
      font-family: 'Consolas', monospace;
      font-weight: 800;
      font-size: ${is58 ? '10px' : '11.5px'};
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #000000;
    }
    
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 5px 0;
      font-size: ${is58 ? '9px' : '10.5px'};
      font-family: 'Consolas', monospace;
      color: #000000;
    }
    table.data-table th, table.data-table td {
      padding: 2.5px 2px;
      text-align: left;
      font-weight: 500;
    }
    table.data-table th {
      font-weight: 700;
    }
    table.data-table th.text-right, table.data-table td.text-right {
      text-align: right;
    }
    table.data-table thead tr {
      border-bottom: 1.5px solid #000000;
    }
    table.data-table tfoot tr {
      border-top: 2px solid #000000;
      border-bottom: 2px solid #000000;
      font-weight: 800;
    }

    /* Recuadros y Marcos Elegantes para Impresión Térmica */
    .ticket-frame {
      border: 1.8px solid #000000;
      border-radius: 6px;
      padding: ${is58 ? '6px 5px' : '9px 8px'};
      margin: 0 auto;
      background: #ffffff;
    }
    .header-card {
      border: 1.5px solid #000000;
      border-radius: 5px;
      padding: 6px 4px;
      margin-bottom: 6px;
      background: #ffffff;
      text-align: center;
    }
    .info-card {
      border: 1.5px solid #000000;
      border-radius: 4px;
      padding: 5px 6px;
      margin: 6px 0;
      background: #fafafa;
    }
    .section-card {
      border: 1.5px solid #000000;
      border-radius: 4px;
      padding: 6px 6px;
      margin: 7px 0;
      background: #ffffff;
    }
    .section-banner {
      background: #000000;
      color: #ffffff;
      font-weight: 800;
      font-size: ${is58 ? '9.5px' : '10.5px'};
      text-transform: uppercase;
      text-align: center;
      padding: 3.5px 5px;
      border-radius: 3px;
      margin-bottom: 6px;
      letter-spacing: 0.3px;
    }
    .cuadre-card {
      border: 2px solid #000000;
      border-radius: 4px;
      padding: 5px 6px;
      margin: 6px 0;
      background: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 800;
      font-size: ${is58 ? '10px' : '12px'};
    }
    .cuadre-card.exact {
      border: 2.2px solid #000000;
      background: #f5f5f5;
    }
    .deposit-card {
      border: 2px solid #000000;
      border-radius: 4px;
      padding: 6px 6px;
      margin: 7px 0;
      background: #000000;
      color: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 800;
      font-size: ${is58 ? '10.5px' : '12.5px'};
    }
    .deposit-card span {
      color: #ffffff !important;
    }
    .signature-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 12px;
    }
    .signature-box {
      border: 1.2px dashed #000000;
      border-radius: 4px;
      padding: 16px 6px 6px;
      text-align: center;
      background: #ffffff;
    }
    .signature-line {
      border-top: 1.5px solid #000000;
      width: 78%;
      margin: 0 auto 3px;
    }
    .signature-title {
      font-size: ${is58 ? '8.5px' : '9.5px'};
      font-weight: 700;
      text-transform: uppercase;
      color: #000000;
    }
    .signature-sub {
      font-size: ${is58 ? '7.5px' : '8.5px'};
      color: #333333;
    }
    table.data-table-bordered {
      width: 100%;
      border-collapse: collapse;
      margin: 5px 0;
      font-size: ${is58 ? '8.5px' : '10px'};
      font-family: 'Consolas', monospace;
      color: #000000;
      border: 1.2px solid #000000;
    }
    table.data-table-bordered th {
      background: #000000;
      color: #ffffff;
      padding: 3px 4px;
      font-weight: 700;
      border: 1px solid #000000;
    }
    table.data-table-bordered td {
      padding: 2.5px 3px;
      border: 1px solid #000000;
    }
    table.data-table-bordered tfoot td {
      background: #f5f5f5;
      font-weight: 800;
      border-top: 1.8px solid #000000;
      border-bottom: 1.8px solid #000000;
    }
  `;

  let bodyContent = '';

  if (type === 'entry_ticket' && ticket) {
    const entryDate = new Date(ticket.entryTime || Date.now());
    const formattedDate = entryDate.toLocaleDateString('es-CO');
    const formattedTime = entryDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    const vehicleRate = rates[ticket.vehicleType] || { hourRate: 4000, gracePeriodMinutes: 15 };

    const isSubEntry = !!(ticket as any).isSubscriber || (ticket.notes && /abonado/i.test(ticket.notes));

    bodyContent = `
      <div class="ticket-frame">
        <div class="header-card">
          ${logoDataUrl ? `<img src="${logoDataUrl}" class="header-logo" alt="Logo" />` : ''}
          <div class="header-name">${businessInfo.name || 'SISTEMA DE PARQUEADERO'}</div>
          <div class="header-sub">NIT: ${businessInfo.nit || 'N/A'}</div>
          <div class="header-sub">${businessInfo.address || ''}</div>
          <div class="header-sub">TEL: ${businessInfo.phone || ''}</div>
          ${businessInfo.branchName ? `<div class="header-sub">SEDE: ${businessInfo.branchName}</div>` : ''}
          <div><span class="badge-black">${isSubEntry ? '*** INGRESO VEHÍCULO ABONADO ***' : '*** TICKET DE INGRESO ***'}</span></div>
        </div>

        <div class="info-card">
          <div class="row" style="font-size:${is58 ? '11px' : '13px'};">
            <span class="bold">N° TICKET:</span>
            <span class="font-black">${ticket.ticketNumber || ticket.barcode || 'N/A'}</span>
          </div>
          <div class="row">
            <span>Puesto Asignado:</span>
            <span class="bold" style="border:1.5px solid #000;padding:1px 6px;border-radius:3px;">${ticket.spotCode || 'PATIO GENERAL'}</span>
          </div>
          <div class="row">
            <span>Jornada Operativa:</span>
            <span class="bold">Día #${ticket.operationalDayNumber || 1} • Turno #${ticket.shiftNumber || 1}</span>
          </div>
          <div class="row">
            <span>Fecha / Hora Entrada:</span>
            <span class="bold">${formattedDate} ${formattedTime}</span>
          </div>
          ${ticket.cashierName ? `
          <div class="row">
            <span>Operador:</span>
            <span class="bold">${ticket.cashierName}</span>
          </div>` : ''}
        </div>

        <div class="plate-box">
          <div class="plate-label">${ticket.isForeignPlate ? `PLACA EXTRANJERA (${ticket.originCountry || 'INTERNACIONAL'})` : (isSubEntry ? 'PLACA / ABONADO MENSUAL' : 'PLACA / VEHÍCULO')}</div>
          <div class="plate-text">${ticket.plate}</div>
          <div class="plate-type">${getVehicleLabel(ticket.vehicleType, vehicleCategories)} ${isSubEntry ? '• PLAN MENSUAL' : (ticket.isForeignPlate ? '• INTERNACIONAL' : '')}</div>
        </div>

        ${ticket.notes ? `
        <div class="notes-box">
          <div class="notes-title">OBSERVACIÓN / DETALLES DE INGRESO:</div>
          <div class="notes-content">${ticket.notes}</div>
        </div>` : ''}

        ${isSubEntry ? `
        <div style="border:1.5px solid #000;background:#fafafa;padding:4px 6px;border-radius:4px;margin:4px 0;">
          <div class="row"><span class="bold">CONDICIÓN:</span><span class="font-black">ABONO MENSUAL ACTIVO</span></div>
          <div class="row"><span>TARIFA TIEMPO:</span><span class="bold">$0 COP (PLAN CUBIERTO)</span></div>
          <div class="row"><span>ACCESO:</span><span class="bold">AUTORIZADO / CONTROL ACTIVO</span></div>
        </div>
        ` : `
        <div class="rates-box">
          <div class="bold uppercase" style="font-size:${is58 ? '10px' : '11px'};margin-bottom:3px;border-bottom:1.5px solid #000;padding-bottom:2px;">Tarifas Vigentes:</div>
          <div class="row">
            <span>Hora ${getVehicleLabel(ticket.vehicleType, vehicleCategories)}:</span>
            <span class="font-black">${formatMoney(vehicleRate.hourRate, rates.currencySymbol)}</span>
          </div>
          <div class="row">
            <span>Minutos de gracia:</span>
            <span class="bold">${vehicleRate.gracePeriodMinutes || 0} minutos</span>
          </div>
        </div>
        `}

        <div class="security-seal">
          <span class="bold">FIRMA ANTI-FRAUDE:</span>
          <span class="font-black">${securityHash}</span>
        </div>

        <div class="barcode-container">
          <svg id="barcode-target"></svg>
        </div>
        <div class="text-center font-mono" style="font-size:9px;margin-top:2px;">
          ID: ${ticket.id}
        </div>

        <div class="footer">
          <div>${businessInfo.ticketFooter || 'Conserve este ticket para retirar su vehículo.'}</div>
          <div class="bold" style="margin-top:4px;">¡GRACIAS POR SU VISITA!</div>
          <div class="wolf-brand">wolfzonepos</div>
          <div style="font-size:9px;">Sistema Integral de Gestión & Facturación POS</div>
        </div>
      </div>
    `;
  } else if (type === 'exit_receipt' && ticket) {
    const isSub = !!(ticket as any).subscriberInfo || ticket.ticketNumber?.startsWith('SUB-');
    const subInfo = (ticket as any).subscriberInfo || {};

    if (isSub) {
      bodyContent = `
      <div class="ticket-frame">
        <div class="header-card">
          ${logoDataUrl ? `<img src="${logoDataUrl}" class="header-logo" alt="Logo" />` : ''}
          <div class="header-name">${businessInfo.name || 'SISTEMA DE PARQUEADERO'}</div>
          <div class="header-sub">NIT: ${businessInfo.nit || 'N/A'}</div>
          <div class="header-sub">${businessInfo.address || ''}</div>
          <div class="header-sub">TEL: ${businessInfo.phone || ''}</div>
          <div>
            <span class="badge-black">
              *** COMPROBANTE DE SUSCRIPCIÓN MENSUAL ***
            </span>
          </div>
        </div>

        <div class="info-card">
          <div class="row" style="font-size:${is58 ? '11px' : '13px'};">
            <span class="bold">N° ABONO:</span>
            <span class="font-black">${ticket.ticketNumber || 'N/A'}</span>
          </div>
          <div class="row"><span class="bold">TITULAR:</span><span class="font-black">${subInfo.fullName || 'Titular Registrado'}</span></div>
          ${subInfo.documentId ? `<div class="row"><span>DOCUMENTO:</span><span class="bold">CC: ${subInfo.documentId}</span></div>` : ''}
          ${subInfo.phone ? `<div class="row"><span>TELÉFONO:</span><span class="bold">${subInfo.phone}</span></div>` : ''}
          <div class="row"><span>PLAZA ASIGNADA:</span><span class="font-black">${subInfo.assignedSpotCode || ticket.spotCode || 'FLOTANTE EN PATIO'}</span></div>
        </div>

        <div class="plate-box">
          <div class="plate-label">PLACA / VEHÍCULO</div>
          <div class="plate-text">${ticket.plate}</div>
          <div class="plate-type">${subInfo.vehicleCategoryName || getVehicleLabel(ticket.vehicleType, vehicleCategories)}</div>
        </div>

        <div style="border:1.5px dashed #000;padding:5px 6px;border-radius:4px;margin:5px 0;text-align:center;">
          <div style="font-size:${is58 ? '9px' : '10px'};font-weight:700;text-transform:uppercase;">PERÍODO DE COBERTURA (30 DÍAS)</div>
          <div style="font-size:${is58 ? '11px' : '12px'};font-weight:800;margin-top:2px;">
            ${subInfo.startDate || ticket.entryTime} AL ${subInfo.endDate || ticket.exitTime}
          </div>
        </div>

        <div class="thick-divider"></div>

        <div class="row font-black" style="font-size:${is58 ? '13px' : '16px'};padding:2px 0;">
          <span>VALOR MENSUALIDAD:</span>
          <span>${formatMoney(ticket.totalAmount || 0, rates.currencySymbol)}</span>
        </div>

        <div class="thick-divider"></div>

        <div class="row">
          <span>Medio de Pago:</span>
          <span class="font-black uppercase">${subInfo.paymentMethodDisplay || ticket.paymentMethod || 'Efectivo'}</span>
        </div>
        ${subInfo.voucherNumber ? `
        <div class="row font-black" style="background:#000;color:#fff;padding:2px 5px;border-radius:3px;margin:3px 0;">
          <span>DOC. BANCARIO / VOUCHER:</span>
          <span>#${subInfo.voucherNumber}</span>
        </div>` : ''}
        ${subInfo.paymentReference ? `
        <div class="row" style="font-size:${is58 ? '9px' : '10.5px'};">
          <span>Soporte / Pasarela:</span>
          <span class="bold">${subInfo.paymentReference}</span>
        </div>` : ''}

        <div class="security-seal">
          <span class="bold">FIRMA ANTI-FRAUDE:</span>
          <span class="font-black">${securityHash}</span>
        </div>

        <div class="barcode-container">
          <svg id="barcode-target"></svg>
        </div>

        <div class="footer">
          <div style="white-space:pre-line;font-weight:600;line-height:1.4;">${businessInfo.ticketFooter || 'Gracias por preferir nuestros servicios.'}</div>
          <div class="bold" style="margin-top:4px;">¡GRACIAS POR SU PREFERENCIA!</div>
          <div class="wolf-brand">wolfzonepos</div>
          <div style="font-size:9px;">Sistema Integral de Gestión & Facturación POS</div>
        </div>
      </div>
    `;
    } else {
      const entryDate = new Date(ticket.entryTime);
      const exitDate = new Date(ticket.exitTime || Date.now());
      const hours = Math.floor((ticket.totalMinutes || 0) / 60);
      const mins = (ticket.totalMinutes || 0) % 60;
      const isFE = !!ticket.electronicInvoice;
      const isSubExitReceipt = (ticket.notes && /abonado/i.test(ticket.notes)) || (ticket as any).isSubscriber || (ticket.totalAmount === 0 && (ticket.discountAmount || 0) > 0);

      bodyContent = `
      <div class="ticket-frame">
        <div class="header-card">
          ${logoDataUrl ? `<img src="${logoDataUrl}" class="header-logo" alt="Logo" />` : ''}
          <div class="header-name">${businessInfo.name || 'SISTEMA DE PARQUEADERO'}</div>
          <div class="header-sub">NIT: ${businessInfo.nit || 'N/A'}</div>
          <div class="header-sub">${businessInfo.address || ''}</div>
          <div class="header-sub">TEL: ${businessInfo.phone || ''}</div>
          <div>
            <span class="badge-black">
              ${isFE ? '*** FACTURA ELECTRÓNICA DE VENTA ***' : (isSubExitReceipt ? '*** SALIDA AUTORIZADA - ABONADO MENSUAL ***' : '*** COMPROBANTE DE SALIDA POS ***')}
            </span>
          </div>
          ${isFE ? `
          <div style="font-size:9.5px;border:1.5px solid #000;padding:3px;border-radius:3px;margin-top:4px;font-weight:bold;">
            <div>Factura N°: ${ticket.electronicInvoice?.prefix}${ticket.electronicInvoice?.invoiceNumber}</div>
            <div>Resolución DIAN: ${ticket.electronicInvoice?.resolutionNumber}</div>
          </div>` : ''}
        </div>

        <div class="info-card">
          <div class="row" style="font-size:${is58 ? '11px' : '13px'};">
            <span class="bold">N° TICKET:</span>
            <span class="font-black">${ticket.ticketNumber || 'N/A'}</span>
          </div>
          <div class="row">
            <span>Fecha / Hora Entrada:</span>
            <span class="bold">${entryDate.toLocaleDateString('es-CO')} ${entryDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="row">
            <span>Fecha / Hora Salida:</span>
            <span class="bold">${exitDate.toLocaleDateString('es-CO')} ${exitDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="row bold" style="border:1.5px solid #000;padding:3.5px 6px;border-radius:4px;margin:4px 0;background:#fafafa;">
            <span>Tiempo Total:</span>
            <span class="font-black">${hours}h ${mins}m (${ticket.totalMinutes || 0} min)</span>
          </div>
          ${ticket.cashierName ? `
          <div class="row">
            <span>Atendido por:</span>
            <span class="bold">${ticket.cashierName}</span>
          </div>` : ''}
        </div>

        <div class="plate-box">
          <div class="plate-label">PLACA / VEHÍCULO</div>
          <div class="plate-text">${ticket.plate}</div>
          <div class="plate-type">${getVehicleLabel(ticket.vehicleType, vehicleCategories)}</div>
        </div>

        ${ticket.notes ? `
        <div class="notes-box">
          <div class="notes-title">OBSERVACIONES REGISTRADAS:</div>
          <div class="notes-content">${ticket.notes}</div>
        </div>` : ''}

        <div class="section-card">
          <div class="row">
            <span>Tarifa Base:</span>
            <span class="bold">${formatMoney(ticket.baseAmount || 0, rates.currencySymbol)}</span>
          </div>
          ${ticket.taxAmount ? `
          <div class="row">
            <span>IVA / Impuesto:</span>
            <span class="bold">${formatMoney(ticket.taxAmount, rates.currencySymbol)}</span>
          </div>` : ''}
          ${ticket.discountAmount ? `
          <div class="row">
            <span>Descuento aplicado:</span>
            <span class="bold">-${formatMoney(ticket.discountAmount, rates.currencySymbol)}</span>
          </div>` : ''}
          <div class="thick-divider"></div>
          <div class="row font-black" style="font-size:${is58 ? '14px' : '17px'};padding:2px 0;">
            <span>TOTAL COBRADO:</span>
            <span>${isSubExitReceipt ? '$ 0 COP (ABONO CUBIERTO)' : formatMoney(ticket.totalAmount || 0, rates.currencySymbol)}</span>
          </div>
        </div>

        <div class="info-card">
          <div class="row">
            <span>Medio de Pago:</span>
            <span class="font-black uppercase">${isSubExitReceipt ? 'PLAN MENSUAL DE ABONADO' : (ticket.paymentMethod || 'Efectivo')}</span>
          </div>
          ${ticket.cashReceived ? `
          <div class="row">
            <span>Efectivo Recibido:</span>
            <span class="bold">${formatMoney(ticket.cashReceived, rates.currencySymbol)}</span>
          </div>
          <div class="row font-black">
            <span>Cambio / Vueltas:</span>
            <span>${formatMoney(ticket.changeGiven || 0, rates.currencySymbol)}</span>
          </div>` : ''}
        </div>

        ${isFE && ticket.electronicInvoice?.cufe ? `
        <div style="font-size:8.5px;border-top:1.5px dashed #000;padding-top:4px;margin-top:4px;word-break:break-all;font-weight:bold;">
          <span>CUFE:</span> ${ticket.electronicInvoice.cufe}
        </div>` : ''}

        <div class="security-seal">
          <span class="bold">FIRMA ANTI-FRAUDE:</span>
          <span class="font-black">${securityHash}</span>
        </div>

        <div class="barcode-container">
          <svg id="barcode-target"></svg>
        </div>

        <div class="footer">
          <div style="white-space:pre-line;font-weight:600;line-height:1.4;">${businessInfo.ticketFooter || 'Gracias por preferir nuestros servicios.'}</div>
          <div class="bold" style="margin-top:4px;">¡GRACIAS POR SU VISITA!</div>
          <div class="wolf-brand">wolfzonepos</div>
          <div style="font-size:9px;">Sistema Integral de Gestión & Facturación POS</div>
        </div>
      </div>
    `;
    }
  } else if (type === 'cash_shift' && shift) {
    const diff = shift.cashDifference || 0;
    const diffLabel = diff > 0 ? 'SOBRANTE (+):' : diff < 0 ? 'FALTANTE (-):' : 'CUADRE EXACTO:';

    bodyContent = `
      <div class="ticket-frame">
        <div class="header-card">
          ${logoDataUrl ? `<img src="${logoDataUrl}" class="header-logo" alt="Logo" />` : ''}
          <div class="header-name">${businessInfo.name || 'SISTEMA DE PARQUEADERO'}</div>
          <div class="header-sub">NIT: ${businessInfo.nit || 'N/A'}</div>
          <div class="header-sub">${businessInfo.address || ''}</div>
          <div style="margin-top:3px;"><span class="badge-black">**** ARQUEO DE TURNO (X) ****</span></div>
        </div>

        <div class="info-card">
          <div class="row" style="font-size:${is58 ? '11px' : '13px'};">
            <span class="bold">TURNO N°:</span>
            <span class="font-black">#${shift.shiftNumber || 1}</span>
          </div>
          <div class="row">
            <span>Cajero / Operador:</span>
            <span class="font-black uppercase">${shift.operatorName || 'Cajero'}</span>
          </div>
          <div class="row">
            <span>Apertura:</span>
            <span class="bold">${new Date(shift.startTime).toLocaleString('es-CO')}</span>
          </div>
          ${shift.endTime ? `
          <div class="row">
            <span>Cierre:</span>
            <span class="bold">${new Date(shift.endTime).toLocaleString('es-CO')}</span>
          </div>` : ''}
          ${shift.consecutiveCode ? `
          <div class="row">
            <span>Consecutivo:</span>
            <span class="font-black">${shift.consecutiveCode}</span>
          </div>` : ''}
        </div>

        <div class="section-card">
          <div class="section-banner">DISCRIMINACIÓN DE VENTAS / RECAUDO</div>
          <table class="data-table-bordered">
            <thead>
              <tr>
                <th>MEDIO DE PAGO</th>
                <th class="text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Efectivo Recaudado</td>
                <td class="text-right bold">${formatMoney(shift.cashCollectedSnapshot || 0, rates.currencySymbol)}</td>
              </tr>
              <tr>
                <td>Tarjetas Débito / Crédito (POS)</td>
                <td class="text-right bold">${formatMoney(shift.cardCollectedSnapshot || 0, rates.currencySymbol)}</td>
              </tr>
              <tr>
                <td>Billeteras (Nequi / Daviplata)</td>
                <td class="text-right bold">${formatMoney(shift.walletCollectedSnapshot || 0, rates.currencySymbol)}</td>
              </tr>
              <tr>
                <td>Códigos QR / Bancos</td>
                <td class="text-right bold">${formatMoney(shift.qrCollectedSnapshot || 0, rates.currencySymbol)}</td>
              </tr>
              ${shift.transferCollectedSnapshot ? `
              <tr>
                <td>Transferencia / PSE</td>
                <td class="text-right bold">${formatMoney(shift.transferCollectedSnapshot, rates.currencySymbol)}</td>
              </tr>` : ''}
              ${shift.breBCollectedSnapshot ? `
              <tr>
                <td>Sistema Bre-B</td>
                <td class="text-right bold">${formatMoney(shift.breBCollectedSnapshot, rates.currencySymbol)}</td>
              </tr>` : ''}
              ${shift.mixedCollectedSnapshot ? `
              <tr>
                <td>Pagos Mixtos</td>
                <td class="text-right bold">${formatMoney(shift.mixedCollectedSnapshot, rates.currencySymbol)}</td>
              </tr>` : ''}
            </tbody>
            <tfoot>
              <tr>
                <td>TOTAL VENTAS</td>
                <td class="text-right font-black">${formatMoney(shift.totalCollectedSnapshot || 0, rates.currencySymbol)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="section-card">
          <div class="section-banner">FLUJO DE EFECTIVO EN GAVETA</div>
          <div class="row">
            <span>(+) Base Inicial:</span>
            <span class="bold">${formatMoney(shift.initialCash || 0, rates.currencySymbol)}</span>
          </div>
          <div class="row">
            <span>(+) Ventas Efectivo:</span>
            <span class="bold">${formatMoney(shift.cashCollectedSnapshot || 0, rates.currencySymbol)}</span>
          </div>
          ${shift.totalIncomesSnapshot ? `
          <div class="row">
            <span>(+) Otros Ingresos Caja:</span>
            <span class="bold">${formatMoney(shift.totalIncomesSnapshot, rates.currencySymbol)}</span>
          </div>` : ''}
          <div class="row">
            <span>(-) Gastos de Caja:</span>
            <span class="bold">-${formatMoney(shift.totalExpensesSnapshot || 0, rates.currencySymbol)}</span>
          </div>
          <div class="row">
            <span>(-) Retiros Parciales a Bóveda:</span>
            <span class="bold">-${formatMoney(shift.totalPickupsSnapshot || 0, rates.currencySymbol)}</span>
          </div>
          <div class="thin-divider"></div>
          <div class="row font-black">
            <span>(=) Efectivo Esperado:</span>
            <span>${formatMoney(shift.expectedCashSnapshot || 0, rates.currencySymbol)}</span>
          </div>
          <div class="row font-black">
            <span>Efectivo Físico Contado:</span>
            <span>${formatMoney(shift.countedCashSnapshot ?? shift.finalCountedCash ?? 0, rates.currencySymbol)}</span>
          </div>

          <div class="cuadre-card exact">
            <span>${diffLabel}</span>
            <span>${formatMoney(Math.abs(diff), rates.currencySymbol)}</span>
          </div>

          ${shift.totalToConsignSnapshot ? `
          <div class="deposit-card">
            <span>TOTAL A CONSIGNAR:</span>
            <span>${formatMoney(shift.totalToConsignSnapshot, rates.currencySymbol)}</span>
          </div>` : ''}
        </div>

        <div class="signature-grid">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-title">FIRMA CAJERO RESPONSABLE</div>
            <div class="signature-sub">${shift.operatorName || 'Cajero'} • C.C. ________________</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-title">FIRMA SUPERVISOR / AUDITOR</div>
            <div class="signature-sub">Revisión y Conformidad • C.C. ________________</div>
          </div>
        </div>

        <div class="wolf-brand text-center" style="margin-top:10px;">wolfzonepos</div>
      </div>
    `;
  } else if (type === 'day_closure' && day) {
    const electronicDay = (day.cardCollectedSnapshot || 0) + (day.walletCollectedSnapshot || 0) + (day.qrCollectedSnapshot || 0) + (day.breBCollectedSnapshot || 0);
    const diff = day.cashDifferenceSnapshot || 0;
    const diffLabel = diff > 0 ? 'SOBRANTE (+):' : diff < 0 ? 'FALTANTE (-):' : 'CUADRE EXACTO:';
    const totalVehiclesCount = day.vehicleStatsSnapshot ? day.vehicleStatsSnapshot.reduce((a, b) => a + b.count, 0) : 0;

    bodyContent = `
      <div class="ticket-frame">
        <div class="header-card">
          ${logoDataUrl ? `<img src="${logoDataUrl}" class="header-logo" alt="Logo" />` : ''}
          <div class="header-name">${businessInfo.name || 'SISTEMA DE PARQUEADERO'}</div>
          <div class="header-sub">NIT: ${businessInfo.nit || 'N/A'}</div>
          <div class="header-sub">${businessInfo.address || ''}</div>
          <div class="header-sub">TEL: ${businessInfo.phone || ''}</div>
          ${businessInfo.branchName ? `<div class="header-sub">SEDE: ${businessInfo.branchName}</div>` : ''}
          <div style="margin-top:3px;"><span class="badge-black">**** CIERRE DEFINITIVO (REPORTE Z) ****</span></div>
          <div style="font-size:9px;font-weight:700;margin-top:2px;">AUDITORÍA FISCAL Y CONCILIACIÓN GENERAL</div>
        </div>

        <div class="info-card">
          <div class="row" style="font-size:${is58 ? '11px' : '13px'};">
            <span class="bold">JORNADA N°:</span>
            <span class="font-black">#${day.dayNumber || 1}</span>
          </div>
          <div class="row">
            <span>Consecutivo Oficial:</span>
            <span class="font-black">${day.consecutiveCode || 'Z-0001'}</span>
          </div>
          <div class="row">
            <span>Fecha Apertura:</span>
            <span class="bold">${new Date(day.openedAt).toLocaleString('es-CO')}</span>
          </div>
          <div class="row">
            <span>Fecha / Hora Cierre:</span>
            <span class="bold">${new Date(day.closedAt || Date.now()).toLocaleString('es-CO')}</span>
          </div>
          <div class="row">
            <span>Total Turnos Operados:</span>
            <span class="font-black">${day.shiftsCount || 1} Turnos</span>
          </div>
          <div class="row">
            <span>Administrador Responsable:</span>
            <span class="font-black uppercase">${day.closedByOperator || 'Administrador General'}</span>
          </div>
        </div>

        <!-- SECCIÓN 1: MOVIMIENTO GENERAL DE VEHÍCULOS -->
        <div class="section-card">
          <div class="section-banner">1. MOVIMIENTO GENERAL DE VEHÍCULOS</div>
          <div class="row">
            <span>Total Tickets Emitidos:</span>
            <span class="font-black">${day.totalTicketsIssuedSnapshot ?? 'N/A'}</span>
          </div>
          <div class="row">
            <span>Vehículos Liquidados / Salidas:</span>
            <span class="bold">${day.totalTicketsPaidSnapshot ?? totalVehiclesCount}</span>
          </div>
          <div class="row">
            <span>Vehículos en Patio (Amanecidos):</span>
            <span class="font-black" style="border:1.5px solid #000;padding:1px 6px;border-radius:3px;background:#f0f0f0;">${day.activeVehiclesRemainingSnapshot ?? 0}</span>
          </div>
          ${day.ticketRangeSnapshot ? `
          <div class="row" style="font-size:${is58 ? '8.5px' : '9.5px'};margin-top:2px;">
            <span>Rango Tickets Fiscales:</span>
            <span class="bold">${day.ticketRangeSnapshot.startTicket || 'TKT-001'} al ${day.ticketRangeSnapshot.endTicket || 'TKT-001'}</span>
          </div>` : ''}

          ${day.vehicleStatsSnapshot && day.vehicleStatsSnapshot.length > 0 ? `
          <div style="margin-top:5px;">
            <table class="data-table-bordered">
              <thead>
                <tr>
                  <th>TIPO VEHÍCULO</th>
                  <th class="text-right">CANT</th>
                  <th class="text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${day.vehicleStatsSnapshot.map(v => `
                  <tr>
                    <td>${v.category}</td>
                    <td class="text-right bold">${v.count}</td>
                    <td class="text-right bold">${formatMoney(v.total, rates.currencySymbol)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td>TOTAL VEHÍCULOS</td>
                  <td class="text-right font-black">${totalVehiclesCount}</td>
                  <td class="text-right font-black">${formatMoney(day.totalCollected || 0, rates.currencySymbol)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          ` : ''}
        </div>

        <!-- SECCIÓN 2: DESGLOSE CONSOLIDADO POR TURNOS -->
        ${day.shiftsSummarySnapshot && day.shiftsSummarySnapshot.length > 0 ? `
        <div class="section-card">
          <div class="section-banner">2. DESGLOSE POR TURNOS DE CAJA</div>
          <table class="data-table-bordered">
            <thead>
              <tr>
                <th>TURNO / CAJERO</th>
                <th class="text-right">EFECTIVO</th>
                <th class="text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${day.shiftsSummarySnapshot.map(s => `
                <tr>
                  <td>T#${s.shiftNumber}: ${s.operatorName.split(' ')[0]}</td>
                  <td class="text-right bold">${formatMoney(s.cash, rates.currencySymbol)}</td>
                  <td class="text-right bold">${formatMoney(s.totalCollected, rates.currencySymbol)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- SECCIÓN 3: DISCRIMINACIÓN EXHAUSTIVA POR MEDIO DE PAGO -->
        <div class="section-card">
          <div class="section-banner">3. DISCRIMINACIÓN POR MEDIOS DE PAGO</div>
          <table class="data-table-bordered">
            <thead>
              <tr>
                <th>MEDIO DE PAGO</th>
                <th class="text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Efectivo en Caja</td>
                <td class="text-right bold">${formatMoney(day.cashCollectedSnapshot || 0, rates.currencySymbol)}</td>
              </tr>
              <tr>
                <td>Tarjetas Débito / Crédito (POS)</td>
                <td class="text-right bold">${formatMoney(day.cardCollectedSnapshot || 0, rates.currencySymbol)}</td>
              </tr>
              <tr>
                <td>Billeteras (Nequi / Daviplata)</td>
                <td class="text-right bold">${formatMoney(day.walletCollectedSnapshot || 0, rates.currencySymbol)}</td>
              </tr>
              <tr>
                <td>Códigos QR (Bancolombia QR)</td>
                <td class="text-right bold">${formatMoney(day.qrCollectedSnapshot || 0, rates.currencySymbol)}</td>
              </tr>
              ${day.transferCollectedSnapshot ? `
              <tr>
                <td>Transferencia / PSE</td>
                <td class="text-right bold">${formatMoney(day.transferCollectedSnapshot, rates.currencySymbol)}</td>
              </tr>` : ''}
              ${day.breBCollectedSnapshot ? `
              <tr>
                <td>Sistema Bre-B</td>
                <td class="text-right bold">${formatMoney(day.breBCollectedSnapshot, rates.currencySymbol)}</td>
              </tr>` : ''}
              ${day.mixedCollectedSnapshot ? `
              <tr>
                <td>Pagos Mixtos</td>
                <td class="text-right bold">${formatMoney(day.mixedCollectedSnapshot, rates.currencySymbol)}</td>
              </tr>` : ''}
              ${day.agreementCollectedSnapshot ? `
              <tr>
                <td>Convenios / Mensualidades</td>
                <td class="text-right bold">${formatMoney(day.agreementCollectedSnapshot, rates.currencySymbol)}</td>
              </tr>` : ''}
            </tbody>
            <tfoot>
              <tr>
                <td>GRAN TOTAL VENTAS DÍA</td>
                <td class="text-right font-black" style="font-size:${is58 ? '11px' : '13px'};">${formatMoney(day.totalCollected || 0, rates.currencySymbol)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- SECCIÓN 4: AUDITORÍA Y FLUJO DE EFECTIVO EN BÓVEDA / CAJA -->
        <div class="section-card">
          <div class="section-banner">4. CONCILIACIÓN DE EFECTIVO (BÓVEDA)</div>
          <div class="row">
            <span>(+) Base Inicial del Día:</span>
            <span class="bold">${formatMoney(day.initialDayCash || 0, rates.currencySymbol)}</span>
          </div>
          <div class="row">
            <span>(+) Ventas Efectivo Turnos:</span>
            <span class="bold">${formatMoney(day.cashCollectedSnapshot || 0, rates.currencySymbol)}</span>
          </div>
          ${day.totalIncomesSnapshot ? `
          <div class="row">
            <span>(+) Otros Ingresos de Caja:</span>
            <span class="bold">${formatMoney(day.totalIncomesSnapshot, rates.currencySymbol)}</span>
          </div>` : ''}
          <div class="row">
            <span>(-) Gastos de Operación:</span>
            <span class="bold">-${formatMoney(day.totalExpensesSnapshot || 0, rates.currencySymbol)}</span>
          </div>
          <div class="row">
            <span>(-) Retiros Parciales a Bóveda:</span>
            <span class="bold">-${formatMoney(day.totalPickupsSnapshot || 0, rates.currencySymbol)}</span>
          </div>
          <div class="thin-divider"></div>
          <div class="row font-black">
            <span>(=) Efectivo Total Esperado:</span>
            <span>${formatMoney(day.expectedCashSnapshot || 0, rates.currencySymbol)}</span>
          </div>
          <div class="row font-black">
            <span>Efectivo Físico Contado:</span>
            <span>${formatMoney(day.countedCashSnapshot ?? day.finalDayCash ?? 0, rates.currencySymbol)}</span>
          </div>

          <div class="cuadre-card exact">
            <span>${diffLabel}</span>
            <span>${formatMoney(Math.abs(diff), rates.currencySymbol)}</span>
          </div>

          <div class="deposit-card">
            <span>LIQUIDACIÓN A DEPOSITAR:</span>
            <span>${formatMoney(day.totalToConsignSnapshot ?? day.finalDayCash ?? 0, rates.currencySymbol)}</span>
          </div>

          ${day.movementsSummarySnapshot && day.movementsSummarySnapshot.length > 0 ? `
          <div class="thin-divider"></div>
          <div class="bold uppercase" style="font-size:9.5px;margin-bottom:2px;">Detalle de Egresos Registrados:</div>
          ${day.movementsSummarySnapshot.slice(0, 5).map(m => `
            <div class="row" style="font-size:${is58 ? '8.5px' : '9.5px'};">
              <span>• ${m.description || m.type}:</span>
              <span class="bold">-${formatMoney(m.amount, rates.currencySymbol)}</span>
            </div>
          `).join('')}
          ` : ''}

          ${day.closingNotes ? `
          <div class="notes-box" style="margin-top:6px;">
            <div class="notes-title">OBSERVACIONES DE CIERRE DE JORNADA:</div>
            <div class="notes-content">${day.closingNotes}</div>
          </div>` : ''}
        </div>

        <div class="signature-grid">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-title">FIRMA ADMINISTRADOR GENERAL</div>
            <div class="signature-sub">${day.closedByOperator || 'Administrador'} • C.C. ________________</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-title">FIRMA REVISOR FISCAL / AUDITOR</div>
            <div class="signature-sub">Control Contable & Verificación • T.P. ________________</div>
          </div>
        </div>

        <div class="wolf-brand text-center" style="margin-top:12px;">wolfzonepos</div>
        <div class="text-center font-mono" style="font-size:8.5px;margin-top:2px;">
          ID Cierre: ${day.id} • ${new Date().toISOString()}
        </div>
      </div>
    `;
  } else {
    // TEST PRINT
    bodyContent = `
      <div class="text-center">
        ${logoDataUrl ? `<img src="${logoDataUrl}" class="header-logo" alt="Logo" />` : ''}
        <div class="header-name">${businessInfo.name || 'WOLFZONE PARKING'}</div>
        <div class="header-sub">NIT: ${businessInfo.nit || '901.847.291-5'}</div>
        <div><span class="badge-black">*** PRUEBA DE IMPRESIÓN GRÁFICA ***</span></div>
      </div>

      <div class="divider"></div>

      <div class="plate-box">
        <div class="plate-label">PLACA / VEHÍCULO DE PRUEBA</div>
        <div class="plate-text">ABC-123</div>
        <div class="plate-type">AUTOMÓVIL / CARRO</div>
      </div>

      <div class="row">
        <span>Fecha / Hora:</span>
        <span class="bold">${new Date().toLocaleString('es-CO')}</span>
      </div>
      <div class="row">
        <span>Estado Impresora:</span>
        <span class="font-black">CONECTADA (OK)</span>
      </div>

      <div class="security-seal">
        <span class="bold">FIRMA ANTI-FRAUDE:</span>
        <span class="font-black">${securityHash}</span>
      </div>

      <div class="barcode-container">
        <svg id="barcode-target"></svg>
      </div>

      <div class="footer">
        <div>Impresión térmica de alta definición completada exitosamente.</div>
        <div class="bold" style="margin-top:4px;">¡SISTEMA LISTO PARA OPERAR!</div>
        <div class="wolf-brand">wolfzonepos</div>
      </div>
    `;
  }

  const barcodeValue = ticket?.barcode || ticket?.ticketNumber || 'TKT-TEST-001';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket Impresión Térmica</title>
  <style>${baseStyles}</style>
</head>
<body>
  ${bodyContent}
  ${jsBarcodeCode ? `
  <script>
    ${jsBarcodeCode}
    try {
      var target = document.getElementById('barcode-target');
      if (target) {
        JsBarcode(target, "${barcodeValue}", {
          format: "CODE128",
          width: ${is58 ? 1.6 : 2.0},
          height: ${is58 ? 52 : 62},
          displayValue: true,
          text: "* ${barcodeValue} *",
          font: "monospace",
          fontOptions: "bold",
          fontSize: ${is58 ? 11 : 12.5},
          lineColor: "#000000",
          margin: 12,
          background: "#ffffff"
        });
      }
    } catch (e) {
      console.error(e);
    }
  </script>
  ` : ''}
</body>
</html>
`;
}
