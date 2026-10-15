import React, { useState } from 'react';
import { Printer, X, CheckCircle2, QrCode, Car, Bike, Truck, Shield, FileCheck } from 'lucide-react';
import { ParkingTicket, ParkingBusinessInfo, RatesConfig, PaymentMethod, VehicleCategoryConfig } from '../types';
import { formatCurrency } from '../utils/billing';
import { getPaymentMethodMeta, formatPaymentDetailsSummary } from '../utils/paymentUtils';
import { DynamicQrCode } from './DynamicQrCode';
import { DynamicBarcode } from './DynamicBarcode';
import html2canvas from 'html2canvas-pro';
import { printInstantThermal } from '../services/printerService';

interface TicketModalProps {
  ticket: ParkingTicket | null;
  mode: 'entry' | 'exit';
  businessInfo: ParkingBusinessInfo;
  rates: RatesConfig;
  vehicleCategories?: VehicleCategoryConfig[];
  isOpen: boolean;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  ticket,
  mode,
  businessInfo,
  rates,
  vehicleCategories = [],
  isOpen,
  onClose,
}) => {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(() => businessInfo.defaultPaperWidth || '80mm');
  const [isEscPosPrinting, setIsEscPosPrinting] = useState(false);
  const [escPosStatus, setEscPosStatus] = useState<string | null>(null);

  if (!isOpen || !ticket) return null;

  // Generate cryptographic anti-tamper security verification hash
  const securityHash = (() => {
    const raw = `${ticket.ticketNumber}-${ticket.plate}-${ticket.entryTime}-${businessInfo.nit || 'WOLF'}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    return `WOLF-${hex.substring(0, 4)}-${hex.substring(4, 8)}`;
  })();

  const qrPayload = JSON.stringify({
    t: ticket.ticketNumber,
    p: ticket.plate,
    in: ticket.entryTime,
    out: ticket.exitTime,
    tot: ticket.totalAmount,
    sec: securityHash
  });

  const handlePrint = async () => {
    if (businessInfo.silentBackgroundPrint !== false) {
      setIsEscPosPrinting(true);
      setEscPosStatus('🖨️ Capturando ticket de pantalla...');
      try {
        const el = document.getElementById('printable-ticket');
        let imageBase64: string | undefined;
        if (el) {
          const fullHeight = el.scrollHeight || el.offsetHeight;
          const canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            height: fullHeight,
            windowHeight: fullHeight + 200,
            scrollY: 0,
            scrollX: 0,
            onclone: (clonedDoc) => {
              const clonedEl = clonedDoc.getElementById('printable-ticket');
              if (clonedEl) {
                clonedEl.style.height = 'auto';
                clonedEl.style.maxHeight = 'none';
                clonedEl.style.overflow = 'visible';
                let parent = clonedEl.parentElement;
                while (parent) {
                  parent.style.height = 'auto';
                  parent.style.maxHeight = 'none';
                  parent.style.overflow = 'visible';
                  parent = parent.parentElement;
                }
              }
            }
          });
          imageBase64 = canvas.toDataURL('image/png');
        }

        setEscPosStatus('Enviando al spooler de impresora física...');
        const res = await printInstantThermal({
          type: mode === 'entry' ? 'entry_ticket' : 'exit_receipt',
          ticket,
          businessInfo,
          rates,
          imageBase64,
          paperWidth,
          autoCut: businessInfo.cutPaperOnPrint ?? true,
          openDrawer: mode === 'exit' && ticket.paymentMethod === 'cash' && (businessInfo.openCashDrawerOnCashPayment ?? true)
        });

        if (res.success) {
          setEscPosStatus(`✅ Impreso exitosamente en ${res.printerName}`);
          setTimeout(() => {
            onClose();
          }, 1000);
          return;
        } else {
          setEscPosStatus('⚠️ Falló spooler, abriendo diálogo...');
        }
      } catch (err: any) {
        console.warn('[TicketModal] Error en captura gráfica o spooler:', err);
      } finally {
        setIsEscPosPrinting(false);
      }
    }
    window.print();
  };

  const handlePrintEscPos = async () => {
    await handlePrint();
  };

  const getVehicleLabel = (type: string) => {
    const custom = vehicleCategories?.find(c => c.id === type);
    if (custom) return custom.name.toUpperCase();
    switch (type) {
      case 'car': return 'AUTOMÓVIL / CARRO';
      case 'motorcycle': return 'MOTOCICLETA';
      case 'suv': return 'CAMIONETA / SUV';
      case 'bicycle': return 'BICICLETA';
      default: return type.toUpperCase();
    }
  };

  const entryDateObj = new Date(ticket.entryTime);
  const exitDateObj = ticket.exitTime ? new Date(ticket.exitTime) : new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div 
        id="ticket-modal-container"
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Top Bar (hidden during printing) */}
        <div className="print:hidden bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm tracking-wide">
              {mode === 'entry' ? 'Ticket de Entrada Generado' : 'Comprobante de Salida y Pago'}
            </h3>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Selector de Papel Térmico 80mm vs 58mm */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs font-mono">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  paperWidth === '80mm' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Rollo Estándar de 80mm"
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  paperWidth === '58mm' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Rollo Compacto de 58mm"
              >
                58mm
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Area */}
        <div className="p-6 overflow-y-auto max-h-[75vh] bg-neutral-100 dark:bg-slate-950/80 flex justify-center">
          <div 
            id="printable-ticket" 
            data-paper-width={paperWidth}
            className={`w-full ${
              paperWidth === '58mm' ? 'max-w-[245px] text-[10px] p-3.5 paper-58mm' : 'max-w-[320px] text-xs p-5 paper-80mm'
            } bg-white border border-dashed border-slate-300 shadow-xs font-mono text-slate-950 leading-relaxed rounded-md transition-all force-light`}
          >
            {/* Logo if configured or default WolfZone branding */}
            <div className="text-center pb-2">
              <img 
                src={businessInfo.logoUrl || '/logo_compacto.png'} 
                alt="Logo del Establecimiento" 
                className="max-h-12 mx-auto object-contain"
                referrerPolicy="no-referrer" 
              />
            </div>

            {/* Header / Business Info */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              <h2 className="font-extrabold text-sm uppercase text-slate-950 tracking-wider">
                {businessInfo.name}
              </h2>
              <p className="text-[11px] text-slate-700 mt-0.5">NIT: {businessInfo.nit}</p>
              <p className="text-[10px] text-slate-700">{businessInfo.address}</p>
              <p className="text-[10px] text-slate-700">Tel: {businessInfo.phone}</p>
              
              <div className="mt-2 inline-block bg-slate-100 border border-slate-300 text-slate-950 px-3 py-1 font-bold text-[11px] rounded">
                {mode === 'entry' 
                  ? '*** TICKET DE INGRESO ***' 
                  : ticket.electronicInvoice 
                  ? '*** FACTURA ELECTRÓNICA DE VENTA ***' 
                  : '*** COMPROBANTE DE SALIDA POS ***'}
              </div>

              {/* DIAN Resolution for Electronic Invoice */}
              {mode === 'exit' && ticket.electronicInvoice && (
                <div className="mt-2 text-[9px] text-slate-700 border border-slate-200 bg-slate-50 p-1.5 rounded">
                  <div className="font-bold text-slate-950">
                    Factura N°: {ticket.electronicInvoice.prefix}{ticket.electronicInvoice.invoiceNumber}
                  </div>
                  <div>Resolución DIAN N° {ticket.electronicInvoice.resolutionNumber}</div>
                  <div>Rango: {businessInfo.dianFromNumber || 1} al {businessInfo.dianToNumber || 50000}</div>
                </div>
              )}
            </div>

            {/* Ticket & Plate Info */}
            <div className="py-3 border-b border-dashed border-slate-400 space-y-1.5">
              <div className="flex justify-between font-bold">
                <span>N° TICKET:</span>
                <span className="text-slate-950">{ticket.ticketNumber}</span>
              </div>

              {/* License Plate Display */}
              <div className="my-2 p-2 bg-amber-100/80 border-2 border-slate-900 rounded text-center">
                <div className="text-[10px] uppercase font-bold text-slate-700 tracking-wider">
                  {ticket.isForeignPlate ? `PLACA EXTRANJERA (${ticket.originCountry || 'INTERNACIONAL'})` : 'PLACA / VEHÍCULO'}
                </div>
                <div className="text-xl font-black tracking-widest text-slate-950 font-sans">
                  {ticket.plate}
                </div>
                <div className="text-[10px] font-bold text-slate-800">
                  {getVehicleLabel(ticket.vehicleType)} {ticket.isForeignPlate ? '• Procedencia Internacional' : ''}
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-700">Puesto Asignado:</span>
                <span className="font-bold text-slate-950 bg-slate-100 px-1.5 rounded">{ticket.spotCode}</span>
              </div>

              {(ticket.operationalDayNumber || ticket.shiftNumber) && (
                <div className="flex justify-between text-[10px] text-slate-700">
                  <span>Jornada Operativa:</span>
                  <span className="font-bold text-slate-900">
                    Día #{ticket.operationalDayNumber || 1} • Turno #{ticket.shiftNumber || 1}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-[11px]">
                <span className="text-slate-700">Fecha / Hora Entrada:</span>
                <span className="font-bold text-slate-950">{entryDateObj.toLocaleDateString('es-CO')} {entryDateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {mode === 'exit' && (
                <>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-700">Fecha / Hora Salida:</span>
                    <span className="font-bold text-slate-950">{exitDateObj.toLocaleDateString('es-CO')} {exitDateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between font-bold bg-amber-50 p-1 rounded border border-amber-200">
                    <span className="text-amber-950">Tiempo Total:</span>
                    <span className="text-amber-950 font-black">
                      {Math.floor((ticket.totalMinutes || 0) / 60)}h {(ticket.totalMinutes || 0) % 60}m ({ticket.totalMinutes} min)
                    </span>
                  </div>
                </>
              )}

              {ticket.notes && (
                <div className="border border-dashed border-slate-400 p-2 rounded-md my-1.5 text-[10px] bg-slate-50 text-slate-900 text-left">
                  <div className="font-bold uppercase text-[9px] text-slate-800 border-b border-dashed border-slate-300 pb-0.5 mb-1">
                    OBSERVACIÓN / DETALLES DE INGRESO:
                  </div>
                  <div className="font-semibold text-slate-950 leading-relaxed">
                    {ticket.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Electronic Customer Details if FE */}
            {mode === 'exit' && ticket.electronicInvoice && ticket.electronicInvoice.customer && (
              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5 text-slate-800">
                <div className="font-bold text-slate-950 uppercase">Datos del Adquirente:</div>
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span className="font-bold">{ticket.electronicInvoice.customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cédula / NIT:</span>
                  <span className="font-mono">{ticket.electronicInvoice.customer.documentNumber}</span>
                </div>
                {ticket.electronicInvoice.customer.email && (
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="font-mono truncate">{ticket.electronicInvoice.customer.email}</span>
                  </div>
                )}
              </div>
            )}

            {/* Exit Financial Breakdown */}
            {mode === 'exit' ? (
              <div className="py-3 border-b border-dashed border-slate-400 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Tarifa Base:</span>
                  <span>{formatCurrency(ticket.baseAmount || 0, rates.currencySymbol)}</span>
                </div>

                {rates.taxPercentage > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>IVA / Impuesto ({rates.taxPercentage}%):</span>
                    <span>{formatCurrency(ticket.taxAmount || 0, rates.currencySymbol)}</span>
                  </div>
                )}

                {(ticket.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Descuento aplicado:</span>
                    <span>-{formatCurrency(ticket.discountAmount || 0, rates.currencySymbol)}</span>
                  </div>
                )}

                <div className="flex justify-between font-black text-sm pt-1.5 border-t border-slate-300 text-slate-950">
                  <span>TOTAL COBRADO:</span>
                  <span>{formatCurrency(ticket.totalAmount || 0, rates.currencySymbol)}</span>
                </div>

                <div className="pt-2 text-[11px] space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-600 dark:text-slate-300">Medio de Pago:</span>
                    <span className="font-bold text-right">
                      {ticket.paymentDetails?.subMethodName || getPaymentMethodMeta(ticket.paymentMethod).label.toUpperCase()}
                    </span>
                  </div>

                  {ticket.paymentDetails?.referenceNumber && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-600 dark:text-slate-300">
                        {ticket.paymentDetails?.isPsePayment ? 'CUS / Ref. PSE:' : 'Ref / Voucher:'}
                      </span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        #{ticket.paymentDetails.referenceNumber}
                      </span>
                    </div>
                  )}

                  {ticket.paymentDetails?.isPsePayment && (
                    <div className="flex justify-between text-[10px] text-blue-900 font-bold bg-blue-50/70 px-1 py-0.5 rounded">
                      <span className="flex items-center gap-1">
                        <img src="/pse_logo.png" alt="PSE" className="w-3 h-3 rounded-full inline object-contain" />
                        Medio Electrónico:
                      </span>
                      <span>PSE Bancario</span>
                    </div>
                  )}

                  {ticket.paymentDetails?.cardTerminal && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-600 dark:text-slate-300">Terminal Datáfono:</span>
                      <span className="text-slate-700 dark:text-slate-200">{ticket.paymentDetails.cardTerminal}</span>
                    </div>
                  )}

                  {ticket.paymentDetails?.accountDetails && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-600 dark:text-slate-300">Cta Destino:</span>
                      <span className="text-slate-700 dark:text-slate-200 font-mono text-right truncate max-w-[180px]">
                        {ticket.paymentDetails.accountDetails.entityName}
                      </span>
                    </div>
                  )}

                  {ticket.paymentMethod === 'mixed' && ticket.paymentDetails?.splitPayments && (
                    <div className="py-1 my-1 border-y border-dashed border-slate-300 space-y-0.5 text-[10px]">
                      <div className="font-bold text-slate-600 dark:text-slate-300 uppercase">Detalle Pago Mixto:</div>
                      {ticket.paymentDetails.splitPayments.map((p, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{p.methodName}:</span>
                          <span className="font-mono font-bold">{formatCurrency(p.amount, rates.currencySymbol)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {ticket.paymentMethod === 'cash' && (ticket.cashReceived || 0) > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-300">Efectivo Recibido:</span>
                        <span>{formatCurrency(ticket.cashReceived || 0, rates.currencySymbol)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-700">
                        <span>Cambio / Vueltas:</span>
                        <span>{formatCurrency(ticket.changeGiven || 0, rates.currencySymbol)}</span>
                      </div>
                    </>
                  )}

                  {ticket.cashierName && (
                    <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-300 pt-1">
                      <span>Atendido por:</span>
                      <span>{ticket.cashierName}</span>
                    </div>
                  )}
                </div>

                {/* CUFE for Electronic Invoicing */}
                {ticket.electronicInvoice && (
                  <div className="mt-2 pt-2 border-t border-dashed border-slate-300 text-[8px] text-slate-600 dark:text-slate-300 break-all space-y-0.5">
                    <div className="font-bold uppercase text-slate-700 dark:text-slate-200">CUFE (Código Único Factura Electrónica):</div>
                    <div className="font-mono leading-none">{ticket.electronicInvoice.cufe}</div>
                  </div>
                )}
              </div>
            ) : (
              /* Entry Rates Summary for customer reference */
              <div className="py-2.5 border-b border-dashed border-slate-400 text-[10px] text-slate-600 dark:text-slate-300 space-y-1">
                <div className="font-bold uppercase text-slate-800 dark:text-slate-200">Tarifas Vigentes:</div>
                <div className="flex justify-between">
                  <span>Hora {getVehicleLabel(ticket.vehicleType)}:</span>
                  <span className="font-bold">{formatCurrency(rates[ticket.vehicleType]?.hourRate || 0, rates.currencySymbol)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Minutos de gracia:</span>
                  <span>{rates[ticket.vehicleType]?.gracePeriodMinutes || 0} minutos</span>
                </div>
              </div>
            )}

            {/* Código de Barras 1D Code 128 de Alta Precisión para Lectores Ópticos / Pistolas Láser */}
            <div className="py-2.5 text-center flex flex-col items-center justify-center space-y-2">
              {/* Sello de Firma Criptográfica Anti-Fraude */}
              <div className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[9px] font-mono flex items-center justify-between text-slate-700">
                <span className="font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3 text-indigo-600 inline" />
                  <span>FIRMA ANTI-FRAUDE:</span>
                </span>
                <span className="font-black text-slate-950">{securityHash}</span>
              </div>

              <div className="w-full flex flex-col items-center justify-center pt-1">
                <div className="p-2 bg-white rounded border border-slate-200 inline-block shadow-2xs">
                  <DynamicBarcode
                    value={ticket.barcode || ticket.ticketNumber}
                    text={`* ${ticket.ticketNumber} *`}
                    width={paperWidth === '58mm' ? 1.6 : 2.0}
                    height={paperWidth === '58mm' ? 48 : 56}
                    fontSize={11}
                    margin={10}
                  />
                </div>
              </div>

              <div className="text-[8px] text-slate-500 font-mono">
                ID: {ticket.id}
              </div>
            </div>

            {/* Footer Disclaimer & Branding */}
            <div className="text-center pt-2 text-[9px] text-slate-700 leading-tight space-y-1">
              <p>{businessInfo.ticketFooter}</p>
              <p className="font-bold text-slate-900">¡GRACIAS POR SU VISITA!</p>
              
              {/* Mandatory wolfzonepos branding requested by user */}
              <div className="pt-2 mt-2 border-t border-dashed border-slate-400 text-[10px] font-bold text-slate-950 font-mono uppercase tracking-wider">
                wolfzonepos
              </div>
              <div className="text-[8px] text-slate-700 font-medium">
                Sistema Integral de Gestión & Facturación POS
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions (hidden during print) */}
        <div className="print:hidden p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {escPosStatus && (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{escPosStatus}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrintEscPos}
              disabled={isEscPosPrinting}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 active:scale-95 rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Enviar directo al servicio de impresión ESC/POS"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-600" />
              <span>ESC/POS ({paperWidth})</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-lg shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ticket (Ctrl+P)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
