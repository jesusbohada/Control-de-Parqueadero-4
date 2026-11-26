/**
 * Rutas de la API (printing). Se registran desde startServer() en server.ts.
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { formatReceiptText } from '../../src/utils/receiptFormatter.ts';
import { generateTicketHtml } from '../../src/utils/ticketHtmlRenderer.ts';

export interface RegisterPrintingRoutesDeps {
  currentDir: string;
}

export function registerPrintingRoutes(app: express.Express, ctx: RegisterPrintingRoutesDeps) {
  const { currentDir } = ctx;
  // PRINT QUEUE ENDPOINT (Manejo unificado de tickets térmicos)
  app.post('/api/print', (req, res) => {
    try {
      const { branchId, content, ticketNumber, plate, vehicleType, entryTime, securityHash, paperWidth } = req.body || {};
      const printDir = path.join(currentDir, 'public', 'print', 'queue');
      if (!fs.existsSync(printDir)) {
        fs.mkdirSync(printDir, { recursive: true });
      }

      const cleanPlate = (plate || 'TKT').toString().replace(/[^a-zA-Z0-9]/g, '');
      const filename = `ticket_${Date.now()}_${cleanPlate}.json`;
      const filepath = path.join(printDir, filename);

      const ticketPayload = content || {
        branchId: branchId || 'branch-01',
        ticketNumber: ticketNumber || `TKT-${Date.now()}`,
        plate: cleanPlate,
        vehicleType: vehicleType || 'car',
        entryTime: entryTime || new Date().toISOString(),
        securityHash: securityHash || '',
        paperWidth: paperWidth || '80mm',
        queuedAt: new Date().toISOString()
      };

      fs.writeFileSync(filepath, typeof ticketPayload === 'string' ? ticketPayload : JSON.stringify(ticketPayload, null, 2), 'utf8');
      console.log(`[Print Queue] Ticket encolado para impresión térmica: ${filename}`);
      return res.json({ success: true, status: 'queued', filename });
    } catch (err: any) {
      console.error('[Print Queue Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // DETECCIÓN DE IMPRESORAS INSTALADAS EN EL SISTEMA OPERATIVO
  app.get('/api/system/printers', (req, res) => {
    try {
      const script = `Get-CimInstance Win32_Printer | Select-Object -Property Name, PortName, DriverName, Default | ConvertTo-Json`;
      execFile('powershell.exe', ['-NoProfile', '-Command', script], { timeout: 6000 }, (err, stdout, stderr) => {
        if (err) {
          console.warn('[System Printers Error] PowerShell no disponible o con timeout:', err.message);
          return res.json({ 
            success: true, 
            printers: [
              { id: 'pos-80-def', name: 'POS-80 (Térmica)', printerName: 'POS-80', port: 'USB002', driverName: 'POS-80', isDefault: true, isThermal: true, paperSize: '80mm', enabled: true }
            ] 
          });
        }
        try {
          const parsed = JSON.parse(stdout || '[]');
          const list = Array.isArray(parsed) ? parsed : [parsed];
          const printers = list.filter((p: any) => p && p.Name).map((p: any, idx: number) => {
            const name = String(p.Name || '').trim();
            const port = String(p.PortName || '').trim();
            const driver = String(p.DriverName || '').trim();
            const isDefault = Boolean(p.Default);
            const isThermal = /pos|sat|epson|tm-|thermal|receipt|ticket|bixolon|zebra|xprinter|star|citizen|22tu/i.test(`${name} ${driver}`);
            return {
              id: `sys-prn-${idx}-${name.replace(/[^a-zA-Z0-9]/g, '_')}`,
              name: name,
              printerName: name,
              port: port,
              driverName: driver,
              isDefault: isDefault,
              isThermal: isThermal,
              paperSize: isThermal ? (name.includes('58') ? '58mm' : '80mm') : '80mm',
              enabled: true
            };
          });
          return res.json({ success: true, printers });
        } catch (parseErr: any) {
          console.error('[System Printers Parse Error]', parseErr);
          return res.status(500).json({ success: false, error: parseErr.message });
        }
      });
    } catch (err: any) {
      console.error('[System Printers Exception]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Resuelve dinámicamente la impresora térmica física conectada al sistema
  const resolveActiveThermalPrinter = async (requested?: string): Promise<string> => {
    const req = (requested || '').trim();
    return new Promise((resolve) => {
      const script = `Get-CimInstance Win32_Printer | Select-Object -Property Name, PortName, DriverName, Default | ConvertTo-Json`;
      execFile('powershell.exe', ['-NoProfile', '-Command', script], { timeout: 3500 }, (err, stdout) => {
        if (err || !stdout) {
          return resolve(req && req !== 'POS-80' ? req : 'SAT 22TUS');
        }
        try {
          const parsed = JSON.parse(stdout);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          const names = list.map((p: any) => String(p.Name || '').trim());

          // 1. Si se pidió una impresora específica instalada y NO es la genérica/inactiva 'POS-80'
          if (req && req !== 'POS-80' && names.includes(req)) {
            return resolve(req);
          }

          // 2. Si el sistema tiene 'SAT 22TUS' (impresora física USB conectada), priorizarla
          if (names.includes('SAT 22TUS')) {
            return resolve('SAT 22TUS');
          }

          // 3. Si se pidió una existente exacta
          if (req && names.includes(req)) {
            return resolve(req);
          }

          // 4. Buscar cualquier impresora con nombre térmico en el sistema
          const thermal = names.find((n: string) => /sat.*22tu|pos-?80|xprinter|thermal|ticket|receipt/i.test(n));
          if (thermal) {
            return resolve(thermal);
          }

          // 5. Fallback por defecto
          return resolve(req || 'SAT 22TUS');
        } catch {
          return resolve(req || 'SAT 22TUS');
        }
      });
    });
  };

  // IMPRESIÓN INSTANTÁNEA GRÁFICA DIRECTA AL SPOOLER DE WINDOWS (ALTA FIDELIDAD / TAL CUAL EN PANTALLA)
  app.post('/api/print/instant', async (req, res) => {
    try {
      const {
        printerName,
        type = 'test',
        ticket,
        shift,
        day,
        businessInfo = {},
        rates = {},
        rawText,
        imageBase64,
        paperWidth = '80mm',
        autoCut = true,
        openDrawer = false,
        forceRaw = false,
      } = req.body || {};

      const targetPrinter = await resolveActiveThermalPrinter(printerName);
      const targetThreshold = Number(req.body?.threshold) || 140;
      const psScript = path.join(currentDir, 'scripts', 'print_thermal_ticket.ps1');

      // 1. Si viene imagen Base64 explícita sin datos de ticket/reporte estructurado
      if (imageBase64 && typeof imageBase64 === 'string' && !ticket && !shift && !day) {
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        const tempPng = path.join(os.tmpdir(), `pos_img_${Date.now()}_${Math.floor(Math.random() * 10000)}.png`);
        fs.writeFileSync(tempPng, Buffer.from(cleanBase64, 'base64'));

        const psArgs = [
          '-ExecutionPolicy', 'Bypass',
          '-File', psScript,
          '-ImagePath', tempPng,
          '-PrinterName', targetPrinter,
          '-PaperWidth', paperWidth,
          '-Threshold', String(targetThreshold)
        ];
        if (autoCut) psArgs.push('-AutoCut');
        if (openDrawer) psArgs.push('-OpenDrawer');

        execFile('powershell.exe', psArgs, { timeout: 12000 }, (err, stdout, stderr) => {
          try { fs.unlinkSync(tempPng); } catch {}
          if (err) {
            console.error(`[Print Instant Error] Error imprimiendo imagen base64 en '${targetPrinter}':`, err.message);
            return res.status(500).json({ success: false, error: err.message, printer: targetPrinter });
          }
          console.log(`[Print Instant Success] Imagen gráfica impresa exitosamente en '${targetPrinter}' (${type})`);
          return res.json({ success: true, printer: targetPrinter, type, mode: 'canvas_direct' });
        });
        return;
      }

      // 2. Si no viene imagen base64, renderizamos el HTML del ticket tal cual como en pantalla
      const browserCandidates = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      ];
      const browserExe = browserCandidates.find(p => fs.existsSync(p));

      // Función auxiliar de fallback a texto plano en caso de fallo gráfico
      const fallbackPrintText = () => {
        const formattedText = rawText || formatReceiptText({
          type: type || 'test',
          ticket,
          shift,
          day,
          businessInfo: businessInfo || {},
          rates: rates || {},
          paperWidth,
          autoCut,
          openDrawer,
        });

        const tempFile = path.join(os.tmpdir(), `pos_ticket_${Date.now()}_${Math.floor(Math.random() * 10000)}.txt`);
        fs.writeFileSync(tempFile, formattedText, 'utf8');
        const rawPsScript = path.join(currentDir, 'scripts', 'print_raw_ticket.ps1');

        const psArgs = [
          '-ExecutionPolicy', 'Bypass',
          '-File', rawPsScript,
          '-TextPath', tempFile,
          '-PrinterName', targetPrinter
        ];
        if (autoCut) psArgs.push('-AutoCut');
        if (openDrawer) psArgs.push('-OpenDrawer');

        execFile('powershell.exe', psArgs, { timeout: 8000 }, (err) => {
          try { fs.unlinkSync(tempFile); } catch {}
          if (err) {
            return res.status(500).json({ success: false, error: err.message, printer: targetPrinter });
          }
          return res.json({ success: true, printer: targetPrinter, type, mode: 'raw_escpos_fallback' });
        });
      };

      if (forceRaw) {
        return fallbackPrintText();
      }

      if (browserExe) {
        try {
          const htmlContent = await generateTicketHtml({
            type,
            ticket,
            shift,
            day,
            businessInfo,
            rates,
            paperWidth
          });

          const tempHtml = path.join(os.tmpdir(), `ticket_render_${Date.now()}_${Math.floor(Math.random() * 10000)}.html`);
          const tempPng = path.join(os.tmpdir(), `ticket_render_${Date.now()}_${Math.floor(Math.random() * 10000)}.png`);
          fs.writeFileSync(tempHtml, htmlContent, 'utf8');

          // Renderizado 1:1 exacto para el cabezal térmico (576px para 80mm, 384px para 58mm)
          const renderWidth = paperWidth === '58mm' ? 256 : 384;
          const renderHeight = 3400; // Altura expandida para capturar el ticket completo con marcos, tablas y firmas
          const renderArgs = [
            '--headless=new',
            '--disable-gpu',
            '--no-sandbox',
            '--hide-scrollbars',
            '--force-device-scale-factor=1.5',
            `--window-size=${renderWidth},${renderHeight}`,
            `--screenshot=${tempPng}`,
            `file:///${tempHtml.replace(/\\/g, '/')}`
          ];

          execFile(browserExe, renderArgs, { timeout: 10000 }, (renderErr) => {
            try { fs.unlinkSync(tempHtml); } catch {}

            if (renderErr || !fs.existsSync(tempPng)) {
              console.warn('[Print Instant] Falló snapshot headless con Edge, usando fallback de texto:', renderErr?.message);
              return fallbackPrintText();
            }

            const psArgs = [
              '-ExecutionPolicy', 'Bypass',
              '-File', psScript,
              '-ImagePath', tempPng,
              '-PrinterName', targetPrinter,
              '-PaperWidth', paperWidth,
              '-Threshold', String(targetThreshold)
            ];
            if (autoCut) psArgs.push('-AutoCut');
            if (openDrawer) psArgs.push('-OpenDrawer');

            execFile('powershell.exe', psArgs, { timeout: 12000 }, (printErr, stdout, stderr) => {
              try { fs.unlinkSync(tempPng); } catch {}
              if (printErr) {
                console.error(`[Print Instant Error] Falló al enviar trabajo a '${targetPrinter}':`, printErr.message);
                return res.status(500).json({ success: false, error: printErr.message, printer: targetPrinter });
              }
              console.log(`[Print Instant Success] Ticket gráfico renderizado e impreso en '${targetPrinter}' (Tipo: ${type})`);
              return res.json({
                success: true,
                printer: targetPrinter,
                type,
                mode: 'headless_render_thermal',
                timestamp: new Date().toISOString()
              });
            });
          });
          return;
        } catch (genErr: any) {
          console.warn('[Print Instant] Error generando HTML del ticket, recurriendo a fallback:', genErr.message);
          return fallbackPrintText();
        }
      }

      return fallbackPrintText();
    } catch (err: any) {
      console.error('[Print Instant Exception]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GENERACIÓN DE PDF VECTORIAL Y DE ALTA DEFINICIÓN PARA ARQUEOS Y CIERRES HISTÓRICOS
  app.post('/api/reports/ticket-pdf', async (req, res) => {
    try {
      const {
        type = 'cash_shift',
        ticket,
        shift,
        day,
        businessInfo = {},
        rates = {},
        paperWidth = '80mm',
      } = req.body || {};

      const browserCandidates = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      ];
      const browserExe = browserCandidates.find(p => fs.existsSync(p));

      const htmlContent = await generateTicketHtml({
        type,
        ticket,
        shift,
        day,
        businessInfo,
        rates,
        paperWidth
      });

      const tempHtml = path.join(os.tmpdir(), `ticket_pdf_${Date.now()}_${Math.floor(Math.random() * 10000)}.html`);
      const tempPdf = path.join(os.tmpdir(), `ticket_pdf_${Date.now()}_${Math.floor(Math.random() * 10000)}.pdf`);
      fs.writeFileSync(tempHtml, htmlContent, 'utf8');

      if (browserExe) {
        const renderArgs = [
          '--headless=new',
          '--disable-gpu',
          '--no-sandbox',
          '--print-to-pdf-no-header',
          `--print-to-pdf=${tempPdf}`,
          `file:///${tempHtml.replace(/\\/g, '/')}`
        ];

        execFile(browserExe, renderArgs, { timeout: 12000 }, (renderErr) => {
          try { fs.unlinkSync(tempHtml); } catch {}

          if (renderErr || !fs.existsSync(tempPdf)) {
            console.error('[Ticket PDF Error] Falló generación con Edge headless:', renderErr?.message);
            return res.status(500).json({ success: false, error: renderErr?.message || 'Error generando PDF' });
          }

          const pdfBytes = fs.readFileSync(tempPdf);
          try { fs.unlinkSync(tempPdf); } catch {}

          let docName = 'Reporte_Oficial';
          if (type === 'cash_shift') {
            docName = `Arqueo_Turno_${shift?.shiftNumber || 1}_${shift?.consecutiveCode || 'X'}`;
          } else if (type === 'day_closure') {
            docName = `Cierre_Dia_${day?.dayNumber || 1}_${day?.consecutiveCode || 'Z'}`;
          } else if (type === 'exit_receipt') {
            docName = `Recibo_Salida_${ticket?.ticketNumber || ticket?.plate || 'TKT'}`;
          } else if (type === 'entry_ticket') {
            docName = `Ticket_Ingreso_${ticket?.ticketNumber || ticket?.plate || 'TKT'}`;
          }

          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${docName}.pdf"`);
          res.setHeader('Content-Length', pdfBytes.length);
          return res.send(pdfBytes);
        });
        return;
      }

      return res.status(500).json({ success: false, error: 'Navegador no disponible para renderizado PDF' });
    } catch (err: any) {
      console.error('[Ticket PDF Exception]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // APERTURA DIRECTA DE CAJÓN MONEDERO / GAVETA
  app.post('/api/print/open-drawer', async (req, res) => {
    try {
      const { printerName } = req.body || {};
      const targetPrinter = await resolveActiveThermalPrinter(printerName);
      const psScript = path.join(currentDir, 'scripts', 'open_cash_drawer.ps1');

      if (!fs.existsSync(psScript)) {
        return res.status(500).json({
          success: false,
          error: `Script no encontrado: ${psScript}`,
          printer: targetPrinter
        });
      }

      const psArgs = [
        '-ExecutionPolicy', 'Bypass',
        '-File', psScript,
        '-PrinterName', targetPrinter
      ];

      execFile('powershell.exe', psArgs, { timeout: 8000 }, (err, stdout, stderr) => {
        if (err) {
          console.error(`[Open Drawer Error] Falló al enviar pulso a '${targetPrinter}':`, err.message);
          return res.status(500).json({
            success: false,
            error: err.message,
            printer: targetPrinter
          });
        }
        console.log(`[Open Drawer Success] Pulso de apertura enviado exitosamente a '${targetPrinter}'`);
        return res.json({
          success: true,
          printer: targetPrinter,
          message: `Pulso de apertura enviado exitosamente a '${targetPrinter}'`,
          timestamp: new Date().toISOString()
        });
      });
    } catch (err: any) {
      console.error('[Open Drawer Exception]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

}
