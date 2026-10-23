import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import os from 'os';

const outputPath = path.join(process.cwd(), 'Manual_Tecnico_Formato_Cierres_y_Arqueos.pdf');
const tempHtmlPath = path.join(os.tmpdir(), `guide_closures_${Date.now()}.html`);

const htmlDocument = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Manual Técnico: Formato de Cierres Definitivos y Arqueos de Caja</title>
  <style>
    @page {
      size: letter portrait;
      margin: 14mm 15mm 15mm 15mm;
      @bottom-right {
        content: counter(page);
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
      color: #1e293b;
      background: #ffffff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Portada */
    .cover-page {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 92vh;
      border-left: 6px solid #4f46e5;
      padding-left: 28px;
    }
    .badge-doc {
      display: inline-block;
      background: #4f46e5;
      color: #ffffff;
      font-weight: 800;
      font-size: 8.5pt;
      padding: 4px 10px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
    }
    .cover-title {
      font-size: 26pt;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.15;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    .cover-subtitle {
      font-size: 13pt;
      color: #475569;
      font-weight: 500;
      margin-bottom: 24px;
      line-height: 1.4;
      max-width: 600px;
    }
    .cover-meta {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #cbd5e1;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      font-size: 9pt;
      color: #64748b;
    }
    .cover-meta strong {
      color: #0f172a;
    }

    /* Secciones de Contenido */
    .page-break {
      page-break-before: always;
    }
    h2 {
      font-size: 15pt;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 18px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    h2 .sec-num {
      background: #4f46e5;
      color: white;
      font-size: 10pt;
      padding: 2px 7px;
      border-radius: 4px;
    }
    h3 {
      font-size: 11.5pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 12px;
      margin-bottom: 6px;
    }
    p {
      margin-bottom: 8px;
      text-align: justify;
      color: #334155;
    }
    ul, ol {
      margin-left: 20px;
      margin-bottom: 10px;
      color: #334155;
    }
    li {
      margin-bottom: 4px;
    }
    .callout {
      background: #f8fafc;
      border-left: 4px solid #4f46e5;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      margin: 12px 0;
      font-size: 9.5pt;
    }
    .callout-title {
      font-weight: 800;
      color: #4f46e5;
      margin-bottom: 3px;
    }

    /* Bloques de Código */
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 10px 12px;
      border-radius: 6px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 8pt;
      line-height: 1.35;
      overflow-x: auto;
      margin: 10px 0;
      white-space: pre-wrap;
      word-break: break-all;
    }
    code {
      font-family: 'Consolas', 'Courier New', monospace;
      background: #f1f5f9;
      color: #0f172a;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 8.5pt;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }

    /* ========================================================================= */
    /* ESTILOS DE COMPROBANTES TÉRMICOS (VOUCHER PREVIEWS INLINE)                */
    /* ========================================================================= */
    .voucher-preview-container {
      display: flex;
      justify-content: center;
      margin: 12px 0;
    }
    .ticket-frame {
      width: 100%;
      max-width: 320px;
      padding: 8px 7px !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'Consolas', 'Courier New', monospace !important;
      font-size: 9pt !important;
      line-height: 1.3 !important;
      border: 1.8px solid #000000 !important;
      border-radius: 6px !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header-card {
      border: 1.5px solid #000000 !important;
      border-radius: 5px !important;
      padding: 5px 4px !important;
      margin-bottom: 5px !important;
      background: #ffffff !important;
      text-align: center !important;
    }
    .header-name {
      font-size: 11pt !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.3px !important;
      margin-bottom: 1px !important;
    }
    .header-sub {
      font-size: 8pt !important;
      font-weight: 500 !important;
    }
    .badge-black {
      display: inline-block !important;
      margin: 3px 0 1px !important;
      padding: 2.5px 7px !important;
      font-size: 8.5pt !important;
      font-weight: 800 !important;
      background: #000000 !important;
      color: #ffffff !important;
      border-radius: 3px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }
    .info-card {
      border: 1.5px solid #000000 !important;
      border-radius: 4px !important;
      padding: 4px 5px !important;
      margin: 5px 0 !important;
      background: #fafafa !important;
      color: #000000 !important;
      font-size: 8pt !important;
    }
    .section-card {
      border: 1.5px solid #000000 !important;
      border-radius: 4px !important;
      padding: 5px 5px !important;
      margin: 5px 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
    }
    .section-banner {
      background: #000000 !important;
      color: #ffffff !important;
      font-weight: 800 !important;
      font-size: 8.5pt !important;
      text-transform: uppercase !important;
      text-align: center !important;
      padding: 3px 4px !important;
      border-radius: 3px !important;
      margin-bottom: 5px !important;
      letter-spacing: 0.3px !important;
    }
    .row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin: 2px 0 !important;
    }
    table.data-table-bordered {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 4px 0 !important;
      font-size: 7.8pt !important;
      font-family: 'Consolas', monospace !important;
      color: #000000 !important;
      border: 1.2px solid #000000 !important;
    }
    table.data-table-bordered th {
      background: #000000 !important;
      color: #ffffff !important;
      padding: 2.5px 3px !important;
      font-weight: 700 !important;
      border: 1px solid #000000 !important;
    }
    table.data-table-bordered td {
      padding: 2px 3px !important;
      border: 1px solid #000000 !important;
      background: #ffffff !important;
      color: #000000 !important;
    }
    table.data-table-bordered tfoot td {
      background: #f5f5f5 !important;
      font-weight: 800 !important;
      border-top: 1.5px solid #000000 !important;
      border-bottom: 1.5px solid #000000 !important;
    }
    .cuadre-card {
      border: 1.8px solid #000000 !important;
      border-radius: 4px !important;
      padding: 4px 5px !important;
      margin: 5px 0 !important;
      background: #f5f5f5 !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      font-weight: 800 !important;
      font-size: 9pt !important;
    }
    .deposit-card {
      border: 1.8px solid #000000 !important;
      border-radius: 4px !important;
      padding: 5px 5px !important;
      margin: 5px 0 !important;
      background: #000000 !important;
      color: #ffffff !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      font-weight: 800 !important;
      font-size: 9.5pt !important;
    }
    .deposit-card span {
      color: #ffffff !important;
    }
    .signature-grid {
      display: flex !important;
      flex-direction: column !important;
      gap: 8px !important;
      margin-top: 10px !important;
    }
    .signature-box {
      border: 1.2px dashed #000000 !important;
      border-radius: 4px !important;
      padding: 12px 4px 4px !important;
      text-align: center !important;
      background: #ffffff !important;
    }
    .signature-line {
      border-top: 1.4px solid #000000 !important;
      width: 78% !important;
      margin: 0 auto 2px !important;
    }
    .signature-title {
      font-size: 7.5pt !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
    }
    .signature-sub {
      font-size: 6.8pt !important;
      color: #333333 !important;
    }
  </style>
</head>
<body>

  <!-- PORTADA -->
  <div class="cover-page">
    <div class="badge-doc">Documento de Ingeniería & Formato POS</div>
    <div class="cover-title">Manual Técnico:<br>Formato de Cierres Definitivos y Arqueos de Caja</div>
    <div class="cover-subtitle">
      Guía integral de arquitectura visual, código CSS y plantillas HTML para la emisión de comprobantes térmicos de 80mm/58mm con recuadros elegantes, tablas de auditoría y generación de PDF.
    </div>

    <div class="callout" style="max-width: 580px;">
      <div class="callout-title">Propósito del Manual</div>
      Permitir que cualquier sistema web o de escritorio (React, Vue, Angular, PHP o HTML/JS nativo) replique exactamente el diseño de comprobantes térmicos oficiales: Reportes X (Arqueo de Turno) y Reportes Z (Cierre Definitivo de Jornada), con bordes nítidos de alto contraste y soporte para impresoras SAT 22TUS, Epson y Bixolon.
    </div>

    <div class="cover-meta">
      <div><strong>Sistema:</strong> WolfZone Parking POS / Control Operativo</div>
      <div><strong>Versión Estándar:</strong> 4.2.0 (Norma Fiscal & Auditoría)</div>
      <div><strong>Ancho Compatible:</strong> 80mm (Estándar) y 58mm (Mini-POS)</div>
      <div><strong>Fecha de Publicación:</strong> 20 de Octubre de 2026</div>
    </div>
  </div>

  <!-- SECCIÓN 1: FUNDAMENTOS Y REGLAS DE DISEÑO -->
  <h2><span class="sec-num">1</span> Fundamentos y Filosofía de Diseño</h2>
  <p>
    La emisión de comprobantes térmicos y actas de auditoría de caja requiere consideraciones particulares que los reportes de oficina convencionales no contemplan. El papel térmico reacciona químicamente al calor del cabezal de impresión, por lo cual los degradados, colores claros y transparencias suelen salir ilegibles o lavados.
  </p>
  <p>
    Para solucionar esta limitación técnica, el formato implementado se fundamenta en <strong>cuatro pilares de ingeniería visual</strong>:
  </p>

  <ol>
    <li><strong>Contraste Monocromático Puro (#000000):</strong> Todo elemento visual utiliza negro puro al 100% o blanco puro (#ffffff). No se utilizan sombras difusas ni tonos grises medios en textos críticos, garantizando que el cabezal térmico queme el papel con máxima nitidez.</li>
    <li><strong>Estructura por Bloques Modulares y Enmarcados:</strong> En lugar de líneas de texto continuas sin separación, la información se divide en "tarjetas" (<code>header-card</code>, <code>info-card</code>, <code>section-card</code>) con bordes sólidos de <code>1.5px</code> a <code>1.8px</code> y esquinas redondeadas de <code>4px</code> a <code>6px</code>. Esto facilita la inspección visual inmediata durante una auditoría.</li>
    <li><strong>Banners Invertidos de Sección (Negative Contrast):</strong> Cada bloque analítico inicia con un banner negro sólido (<code>section-banner</code>) con texto blanco en mayúsculas negrita, delimitando con precisión el contenido contable.</li>
    <li><strong>Aislamiento Total en Impresión (Zero-Margin Media Print):</strong> Gracias a la regla CSS <code>@page { margin: 0; }</code> y <code>body * { visibility: hidden; }</code>, el navegador envía única y exclusivamente el comprobante a la bobina térmica sin cabeceras del navegador (URLs, fecha o número de página) ni restos del software de fondo.</li>
  </ol>

  <!-- SECCIÓN 2: HOJA DE ESTILOS UNIVERSAL -->
  <div class="page-break"></div>
  <h2><span class="sec-num">2</span> Hoja de Estilos Universal (thermal-voucher.css)</h2>
  <p>
    Esta hoja de estilos puede copiarse directamente en cualquier proyecto. Contiene todas las clases de marcos, tablas encuadradas y las directivas de medios de impresión:
  </p>

  <pre><code>/* ========================================================================= */
/* ESTILOS DE COMPROBANTES TÉRMICOS Y REPORTES OFICIALES (MARCOS Y TARJETAS) */
/* ========================================================================= */

.ticket-frame {
  width: 100%;
  max-width: 360px; /* Ancho estándar para bobina térmica de 80mm */
  margin: 0 auto !important;
  padding: 9px 8px !important;
  background: #ffffff !important;
  color: #000000 !important;
  font-family: 'Consolas', 'Courier New', monospace !important;
  font-size: 11px !important;
  line-height: 1.35 !important;
  border: 1.8px solid #000000 !important;
  border-radius: 6px !important;
  box-sizing: border-box !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

.header-card {
  border: 1.5px solid #000000 !important;
  border-radius: 5px !important;
  padding: 6px 4px !important;
  margin-bottom: 6px !important;
  background: #ffffff !important;
  text-align: center !important;
}
.header-name {
  font-size: 13.5px !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.3px !important;
  margin-bottom: 2px !important;
}
.header-sub {
  font-size: 10px !important;
  font-weight: 500 !important;
}
.badge-black {
  display: inline-block !important;
  margin: 4px 0 2px !important;
  padding: 3px 8px !important;
  font-size: 10.5px !important;
  font-weight: 800 !important;
  background: #000000 !important;
  color: #ffffff !important;
  border-radius: 3px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
}

.info-card {
  border: 1.5px solid #000000 !important;
  border-radius: 4px !important;
  padding: 5px 6px !important;
  margin: 6px 0 !important;
  background: #fafafa !important;
  color: #000000 !important;
  font-size: 10.5px !important;
}

.section-card {
  border: 1.5px solid #000000 !important;
  border-radius: 4px !important;
  padding: 6px 6px !important;
  margin: 7px 0 !important;
  background: #ffffff !important;
  color: #000000 !important;
}
.section-banner {
  background: #000000 !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  font-size: 10.5px !important;
  text-transform: uppercase !important;
  text-align: center !important;
  padding: 3.5px 5px !important;
  border-radius: 3px !important;
  margin-bottom: 6px !important;
  letter-spacing: 0.3px !important;
}

.row {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin: 2.5px 0 !important;
}

table.data-table-bordered {
  width: 100% !important;
  border-collapse: collapse !important;
  margin: 5px 0 !important;
  font-size: 10px !important;
  font-family: 'Consolas', monospace !important;
  color: #000000 !important;
  border: 1.2px solid #000000 !important;
}
table.data-table-bordered th {
  background: #000000 !important;
  color: #ffffff !important;
  padding: 3px 4px !important;
  font-weight: 700 !important;
  border: 1px solid #000000 !important;
}
table.data-table-bordered td {
  padding: 2.5px 3px !important;
  border: 1px solid #000000 !important;
  background: #ffffff !important;
  color: #000000 !important;
}
table.data-table-bordered tfoot td {
  background: #f5f5f5 !important;
  font-weight: 800 !important;
  border-top: 1.8px solid #000000 !important;
  border-bottom: 1.8px solid #000000 !important;
}

.cuadre-card {
  border: 2px solid #000000 !important;
  border-radius: 4px !important;
  padding: 5px 6px !important;
  margin: 6px 0 !important;
  background: #f5f5f5 !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  font-weight: 800 !important;
  font-size: 11.5px !important;
}

.deposit-card {
  border: 2px solid #000000 !important;
  border-radius: 4px !important;
  padding: 6px 6px !important;
  margin: 7px 0 !important;
  background: #000000 !important;
  color: #ffffff !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  font-weight: 800 !important;
  font-size: 12px !important;
}
.deposit-card span { color: #ffffff !important; }

.signature-grid {
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  margin-top: 12px !important;
}
.signature-box {
  border: 1.2px dashed #000000 !important;
  border-radius: 4px !important;
  padding: 16px 6px 6px !important;
  text-align: center !important;
  background: #ffffff !important;
}
.signature-line {
  border-top: 1.5px solid #000000 !important;
  width: 78% !important;
  margin: 0 auto 3px !important;
}
.signature-title {
  font-size: 9.5px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
}
.signature-sub {
  font-size: 8.5px !important;
  color: #333333 !important;
}

/* AISLAMIENTO TÉRMICO DIRECTO */
@media print {
  @page { margin: 0 !important; size: 80mm auto !important; }
  body { background-color: #ffffff !important; color: #000000 !important; margin: 0 !important; padding: 0 !important; }
  body * { visibility: hidden !important; }
  #printable-ticket, #printable-ticket * { visibility: visible !important; }
  #printable-ticket {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 80mm !important;
    max-width: 80mm !important;
    margin: 0 !important;
    padding: 2mm !important;
    border: none !important;
    box-shadow: none !important;
  }
}</code></pre>

  <!-- SECCIÓN 3: ARQUEO DE TURNO (REPORTE X) -->
  <div class="page-break"></div>
  <h2><span class="sec-num">3</span> Plantilla Oficial: Arqueo de Turno (Reporte X)</h2>
  <p>
    El Reporte X corresponde al cierre de un turno individual de cajero. Permite conciliar el dinero físico contado en la gaveta contra el sistema, desglosar ventas por medio de pago y registrar la firma del cajero y del supervisor.
  </p>

  <div class="voucher-preview-container">
    <div class="ticket-frame">
      <div class="header-card">
        <div class="header-name">PARQUEADERO CENTRAL S.A.S.</div>
        <div class="header-sub">NIT: 900.123.456-7 • Medellín, Antioquia</div>
        <div class="header-sub">Tel: (604) 444-5566 • Sede: Principal</div>
        <div><span class="badge-black">**** ARQUEO DE TURNO (X) ****</span></div>
      </div>

      <div class="info-card">
        <div class="row">
          <span style="font-weight:bold;">TURNO N°:</span>
          <span style="font-weight:900; font-size:10pt;">#1</span>
        </div>
        <div class="row">
          <span>Consecutivo Oficial:</span>
          <span style="font-weight:bold;">ARQ-0001</span>
        </div>
        <div class="row">
          <span>Cajero Responsable:</span>
          <span style="font-weight:bold; text-transform:uppercase;">Carlos Restrepo</span>
        </div>
        <div class="row">
          <span>Apertura:</span>
          <span>19/10/2026, 06:00 a. m.</span>
        </div>
        <div class="row">
          <span>Cierre:</span>
          <span>19/10/2026, 02:00 p. m.</span>
        </div>
      </div>

      <div class="section-card">
        <div class="section-banner">DISCRIMINACIÓN DE VENTAS / RECAUDO</div>
        <table class="data-table-bordered">
          <thead>
            <tr>
              <th style="text-align:left;">MEDIO DE PAGO</th>
              <th style="text-align:right;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Efectivo Recaudado</td><td style="text-align:right; font-weight:bold;">$ 160.000</td></tr>
            <tr><td>Tarjetas Débito / Crédito (POS)</td><td style="text-align:right; font-weight:bold;">$ 40.000</td></tr>
            <tr><td>Billeteras (Nequi / Daviplata)</td><td style="text-align:right; font-weight:bold;">$ 35.000</td></tr>
            <tr><td>Códigos QR / Bancolombia</td><td style="text-align:right; font-weight:bold;">$ 28.000</td></tr>
          </tbody>
          <tfoot>
            <tr>
              <td>TOTAL VENTAS</td>
              <td style="text-align:right; font-weight:900;">$ 263.000</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="section-card">
        <div class="section-banner">FLUJO DE EFECTIVO EN GAVETA</div>
        <div class="row"><span>(+) Base Inicial de Caja:</span><span style="font-weight:bold;">$ 100.000</span></div>
        <div class="row"><span>(+) Ventas Efectivo Turno:</span><span style="font-weight:bold;">+$ 160.000</span></div>
        <div class="row"><span>(-) Gastos Autorizados:</span><span style="font-weight:bold;">-$ 30.000</span></div>
        <div class="row"><span>(-) Recogidas a Bóveda:</span><span style="font-weight:bold;">-$ 120.000</span></div>
        <div style="border-top:1px dashed #000; margin:3px 0;"></div>
        <div class="row" style="font-weight:bold;"><span>(=) Efectivo Esperado:</span><span>$ 110.000</span></div>
        <div class="row" style="font-weight:900;"><span>Efectivo Físico Contado:</span><span>$ 110.000</span></div>

        <div class="cuadre-card">
          <span>CUADRE EXACTO:</span>
          <span>$ 0</span>
        </div>

        <div class="deposit-card">
          <span>TOTAL A CONSIGNAR:</span>
          <span>$ 130.000</span>
        </div>
      </div>

      <div class="signature-grid">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-title">FIRMA CAJERO RESPONSABLE</div>
          <div class="signature-sub">Carlos Restrepo • C.C. ________________</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-title">FIRMA SUPERVISOR / AUDITOR</div>
          <div class="signature-sub">Revisión y Conformidad • C.C. ________________</div>
        </div>
      </div>
    </div>
  </div>

  <!-- SECCIÓN 4: CIERRE DEFINITIVO (REPORTE Z) -->
  <div class="page-break"></div>
  <h2><span class="sec-num">4</span> Plantilla Oficial: Cierre Definitivo de Jornada (Reporte Z)</h2>
  <p>
    El Reporte Z consolida toda la operación del día. Cuenta con 4 secciones analíticas obligatorias que auditan el movimiento físico de vehículos, el rendimiento de cada cajero, la distribución de medios de pago y el balance final de la caja general y bóveda.
  </p>

  <div class="voucher-preview-container">
    <div class="ticket-frame">
      <div class="header-card">
        <div class="header-name">PARQUEADERO CENTRAL S.A.S.</div>
        <div class="header-sub">NIT: 900.123.456-7 • Tel: (604) 444-5566</div>
        <div class="header-sub">Cra 43A # 12-34 • Medellín, Antioquia</div>
        <div><span class="badge-black">**** CIERRE DEFINITIVO (REPORTE Z) ****</span></div>
        <div style="font-size:7.5pt; font-weight:700; margin-top:2px;">AUDITORÍA FISCAL Y CONCILIACIÓN GENERAL</div>
      </div>

      <div class="info-card">
        <div class="row"><span style="font-weight:bold;">JORNADA N°:</span><span style="font-weight:900;">#1</span></div>
        <div class="row"><span>Consecutivo Oficial:</span><span style="font-weight:bold;">Z-0001</span></div>
        <div class="row"><span>Fecha Apertura:</span><span>19/10/2026, 06:00 a. m.</span></div>
        <div class="row"><span>Fecha Cierre:</span><span>19/10/2026, 10:00 p. m.</span></div>
        <div class="row"><span>Turnos Operados:</span><span style="font-weight:bold;">2 Turnos</span></div>
        <div class="row"><span>Administrador:</span><span style="font-weight:bold; text-transform:uppercase;">Carlos Mario Zapata</span></div>
      </div>

      <div class="section-card">
        <div class="section-banner">1. MOVIMIENTO GENERAL DE VEHÍCULOS</div>
        <div class="row"><span>Tickets Emitidos:</span><span style="font-weight:bold;">47</span></div>
        <div class="row"><span>Vehículos Liquidados / Salidas:</span><span style="font-weight:bold;">45</span></div>
        <div class="row"><span>Vehículos en Patio (Amanecidos):</span><span style="border:1.5px solid #000; padding:1px 5px; border-radius:3px; font-weight:900;">2</span></div>
        <div class="row" style="font-size:7.5pt;"><span>Rango Tickets:</span><span style="font-weight:bold;">TKT-001 al TKT-047</span></div>

        <table class="data-table-bordered">
          <thead>
            <tr><th style="text-align:left;">TIPO VEHÍCULO</th><th style="text-align:right;">CANT</th><th style="text-align:right;">TOTAL</th></tr>
          </thead>
          <tbody>
            <tr><td>Automóviles</td><td style="text-align:right; font-weight:bold;">25</td><td style="text-align:right; font-weight:bold;">$ 280.000</td></tr>
            <tr><td>Motocicletas</td><td style="text-align:right; font-weight:bold;">20</td><td style="text-align:right; font-weight:bold;">$ 160.000</td></tr>
          </tbody>
          <tfoot>
            <tr><td>TOTAL VEHÍCULOS</td><td style="text-align:right; font-weight:900;">45</td><td style="text-align:right; font-weight:900;">$ 440.000</td></tr>
          </tfoot>
        </table>
      </div>

      <div class="section-card">
        <div class="section-banner">2. DESGLOSE POR TURNOS DE CAJA</div>
        <table class="data-table-bordered">
          <thead>
            <tr><th style="text-align:left;">TURNO / CAJERO</th><th style="text-align:right;">EFECTIVO</th><th style="text-align:right;">TOTAL</th></tr>
          </thead>
          <tbody>
            <tr><td>T#1: Carlos R.</td><td style="text-align:right; font-weight:bold;">$ 160.000</td><td style="text-align:right; font-weight:bold;">$ 263.000</td></tr>
            <tr><td>T#2: María F.</td><td style="text-align:right; font-weight:bold;">$ 110.000</td><td style="text-align:right; font-weight:bold;">$ 177.000</td></tr>
          </tbody>
        </table>
      </div>

      <div class="section-card">
        <div class="section-banner">3. DISCRIMINACIÓN POR MEDIOS DE PAGO</div>
        <table class="data-table-bordered">
          <thead>
            <tr><th style="text-align:left;">MEDIO DE PAGO</th><th style="text-align:right;">TOTAL</th></tr>
          </thead>
          <tbody>
            <tr><td>Efectivo en Caja</td><td style="text-align:right; font-weight:bold;">$ 270.000</td></tr>
            <tr><td>Tarjetas Débito / Crédito (POS)</td><td style="text-align:right; font-weight:bold;">$ 70.000</td></tr>
            <tr><td>Billeteras (Nequi / Daviplata)</td><td style="text-align:right; font-weight:bold;">$ 55.000</td></tr>
            <tr><td>Códigos QR (Bancolombia)</td><td style="text-align:right; font-weight:bold;">$ 45.000</td></tr>
          </tbody>
          <tfoot>
            <tr><td>GRAN TOTAL VENTAS</td><td style="text-align:right; font-weight:900;">$ 440.000</td></tr>
          </tfoot>
        </table>
      </div>

      <div class="section-card">
        <div class="section-banner">4. CONCILIACIÓN DE EFECTIVO (BÓVEDA)</div>
        <div class="row"><span>(+) Base Inicial del Día:</span><span style="font-weight:bold;">$ 100.000</span></div>
        <div class="row"><span>(+) Ventas Efectivo Turnos:</span><span style="font-weight:bold;">+$ 270.000</span></div>
        <div class="row"><span>(-) Gastos de Operación:</span><span style="font-weight:bold;">-$ 40.000</span></div>
        <div class="row"><span>(-) Recogidas a Bóveda:</span><span style="font-weight:bold;">-$ 270.000</span></div>
        <div style="border-top:1px dashed #000; margin:3px 0;"></div>
        <div class="row" style="font-weight:bold;"><span>(=) Efectivo Total Esperado:</span><span>$ 60.000</span></div>
        <div class="row" style="font-weight:900;"><span>Efectivo Físico Contado:</span><span>$ 60.000</span></div>

        <div class="cuadre-card"><span>CUADRE EXACTO:</span><span>$ 0</span></div>
        <div class="deposit-card"><span>LIQUIDACIÓN A DEPOSITAR:</span><span>$ 300.000</span></div>
      </div>

      <div class="signature-grid">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-title">FIRMA ADMINISTRADOR GENERAL</div>
          <div class="signature-sub">Carlos Mario Zapata • C.C. ________________</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-title">FIRMA REVISOR FISCAL / AUDITOR</div>
          <div class="signature-sub">Revisión y Conformidad • T.P. ________________</div>
        </div>
      </div>
    </div>
  </div>

  <!-- SECCIÓN 5: INTEGRACIÓN JAVASCRIPT / TYPESCRIPT -->
  <div class="page-break"></div>
  <h2><span class="sec-num">5</span> Implementación JavaScript / TypeScript</h2>
  <p>
    Para integrar esta emisión en tu aplicación, puedes utilizar dos alternativas complementarias:
  </p>

  <h3>A. Impresión Directa Nativa (Térmica 80mm)</h3>
  <pre><code>// Dispara el diálogo del navegador o la orden directa a la impresora térmica
function printVoucher() {
  window.print();
}</code></pre>

  <h3>B. Generación de PDF Vectorial en Frontend (jsPDF + html2canvas)</h3>
  <pre><code>import html2canvas from 'html2canvas-pro'; // o 'html2canvas'
import jsPDF from 'jspdf';

async function downloadTicketPdf(filename = 'Comprobante_Fiscal.pdf') {
  const el = document.getElementById('printable-ticket');
  if (!el) return;

  // 1. Renderiza el elemento HTML respetando los bordes y recuadros
  const canvas = await html2canvas(el, {
    scale: 2, // Doble resolución para nitidez tipográfica
    useCORS: true,
    backgroundColor: '#ffffff'
  });

  const imgData = canvas.toDataURL('image/png');
  const paperWidthMm = 80; // Ancho térmico 80mm
  const paperHeightMm = (canvas.height * paperWidthMm) / canvas.width;

  // 2. Crea el PDF a la medida exacta del contenido
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [paperWidthMm, paperHeightMm]
  });

  pdf.addImage(imgData, 'PNG', 0, 0, paperWidthMm, paperHeightMm);
  pdf.save(filename);
}</code></pre>

  <h3>C. Generación de PDF en Backend con Node.js y Edge/Chrome Headless</h3>
  <pre><code>import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export function renderThermalPdf(htmlContent, outputPdfPath) {
  const tempHtml = path.join(os.tmpdir(), \`voucher_\${Date.now()}.html\`);
  fs.writeFileSync(tempHtml, htmlContent, 'utf8');

  const edgeExe = 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe';
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--print-to-pdf-no-header',
    \`--print-to-pdf=\${outputPdfPath}\`,
    \`file:///\${tempHtml.replace(/\\\\/g, '/')}\`
  ];

  execFile(edgeExe, args, { timeout: 15000 }, (err) => {
    try { fs.unlinkSync(tempHtml); } catch {}
    if (err) throw err;
    console.log('PDF generado exitosamente en:', outputPdfPath);
  });
}</code></pre>

  <h2><span class="sec-num">6</span> Conclusiones y Mejores Prácticas</h2>
  <ul>
    <li><strong>Alineación Numérica:</strong> En todas las tablas de recaudo y flujo de efectivo, siempre alinea los montos hacia la derecha (<code>text-align: right</code>) con una fuente monoespaciada para facilitar la suma vertical a simple vista.</li>
    <li><strong>Protección de Ancho Máximo:</strong> En navegadores de escritorio, nunca omitas el <code>max-width: 360px</code> en pantalla; de lo contrario, el comprobante se estirará a pantalla completa perdiendo la proporción térmica.</li>
    <li><strong>Soporte 58mm:</strong> Si operas con impresoras mini de 58mm (muy comunes en cajas satélite), cambia el <code>max-width: 250px</code>, reduce el tamaño de fuente a <code>9.5px</code> y usa un padding de <code>4px</code>.</li>
  </ul>

  <div style="text-align: center; margin-top: 30px; font-size: 8.5pt; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px;">
    Documento Técnico Oficial • Sistema WolfZone POS • Diseñado para Alta Definición Térmica & PDF
  </div>

</body>
</html>
`;

fs.writeFileSync(tempHtmlPath, htmlDocument, 'utf8');

const browserCandidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];
const browserExe = browserCandidates.find(p => fs.existsSync(p));

if (!browserExe) {
  console.error('No se encontró un navegador Edge o Chrome para generar el PDF.');
  process.exit(1);
}

console.log(`Renderizando PDF usando: ${browserExe}...`);

const renderArgs = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--print-to-pdf-no-header',
  `--print-to-pdf=${outputPath}`,
  `file:///${tempHtmlPath.replace(/\\/g, '/')}`
];

execFile(browserExe, renderArgs, { timeout: 20000 }, (error) => {
  try { fs.unlinkSync(tempHtmlPath); } catch {}

  if (error) {
    console.error('Error generando PDF:', error);
    process.exit(1);
  }

  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    console.log(`✓ PDF generado exitosamente: ${outputPath} (${Math.round(stats.size / 1024)} KB)`);
  } else {
    console.error('El archivo PDF no fue creado.');
    process.exit(1);
  }
});
