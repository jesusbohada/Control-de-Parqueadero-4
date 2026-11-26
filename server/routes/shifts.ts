/**
 * Rutas de la API (shifts). Se registran desde startServer() en server.ts.
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import pool, { isPostgresReady, memoryStoreRef } from '../../src/db.ts';

export function registerShiftRoutes(app: express.Express) {
  // ==============================================================================
  // 4. TURNOS DE CAJA (cash_shifts)
  // ==============================================================================
  app.get('/api/shifts/current', async (req, res) => {
    try {
      if (isPostgresReady()) {
        const shiftRes = await pool.query("SELECT * FROM cash_shifts WHERE status = 'open' ORDER BY start_time DESC LIMIT 1");
        if (shiftRes.rows.length > 0) {
          const sr = shiftRes.rows[0];
          return res.json({
            success: true,
            shift: {
              id: sr.id,
              terminalId: sr.terminal_id,
              operator: sr.operator,
              status: sr.status,
              startTime: sr.start_time instanceof Date ? sr.start_time.toISOString() : String(sr.start_time),
              endTime: sr.end_time ? (sr.end_time instanceof Date ? sr.end_time.toISOString() : String(sr.end_time)) : undefined,
              initialCash: Number(sr.initial_cash),
              finalCash: Number(sr.final_cash),
              totalCollected: Number(sr.total_collected),
              ...(sr.details || {})
            }
          });
        }
      }
      const memShift = memoryStoreRef.configs.get('currentShift') || null;
      res.json({ success: true, shift: memShift });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/shifts/open', async (req, res) => {
    const { shift } = req.body;
    if (!shift?.id) return res.status(400).json({ error: 'Datos de turno inválidos' });
    try {
      if (isPostgresReady()) {
        await pool.query(`
          INSERT INTO cash_shifts (id, terminal_id, operator, status, start_time, initial_cash, final_cash, total_collected, details)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            operator = EXCLUDED.operator,
            initial_cash = EXCLUDED.initial_cash,
            details = EXCLUDED.details
        `, [
          shift.id,
          shift.terminalId || 'TAQUILLA-01',
          shift.operator || 'Cajero',
          'open',
          shift.startTime || new Date().toISOString(),
          Number(shift.initialCash || 0),
          Number(shift.finalCash || 0),
          Number(shift.totalCollected || 0),
          JSON.stringify(shift)
        ]);

        await pool.query(`
          INSERT INTO configs (key, value) VALUES ('currentShift', $1)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [JSON.stringify(shift)]);
      } else {
        memoryStoreRef.cashShifts.set(shift.id, shift);
        memoryStoreRef.configs.set('currentShift', shift);
      }
      res.json({ success: true, shift });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/shifts/close', async (req, res) => {
    const { shift } = req.body;
    if (!shift?.id) return res.status(400).json({ error: 'Datos de turno inválidos' });
    try {
      if (isPostgresReady()) {
        await pool.query(`
          UPDATE cash_shifts 
          SET status = 'closed', 
              end_time = $1, 
              final_cash = $2, 
              total_collected = $3, 
              details = $4
          WHERE id = $5
        `, [
          shift.endTime || new Date().toISOString(),
          Number(shift.finalCash || 0),
          Number(shift.totalCollected || 0),
          JSON.stringify(shift),
          shift.id
        ]);

        await pool.query(`
          INSERT INTO configs (key, value) VALUES ('currentShift', $1)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [JSON.stringify(shift)]);
      } else {
        memoryStoreRef.cashShifts.set(shift.id, { ...shift, status: 'closed' });
        memoryStoreRef.configs.set('currentShift', { ...shift, status: 'closed' });
      }

      // Generar y archivar backup automático de cierre en la carpeta /backups/
      try {
        const backupsDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupsDir)) {
          fs.mkdirSync(backupsDir, { recursive: true });
        }
        const safeDate = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `backup_cierre_${shift.id || 'turno'}_${safeDate}.json`;
        const backupFilePath = path.join(backupsDir, backupFileName);

        const backupData = {
          tipo: 'CIERRE_DE_TURNO',
          fecha: new Date().toISOString(),
          turnoId: shift.id,
          operador: shift.operator,
          terminalId: shift.terminalId,
          recaudoTotal: shift.totalCollected,
          efectivoFinal: shift.finalCash,
          datosTurno: shift
        };

        fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
        console.log(`[Backup Automático] Respaldo de cierre guardado en: ${backupFilePath}`);
      } catch (bkErr: any) {
        console.warn('[Backup Automático Warning]:', bkErr.message);
      }

      res.json({ success: true, shift });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/shifts/save', async (req, res) => {
    const { shift } = req.body;
    if (!shift?.id) return res.status(400).json({ error: 'Datos de turno requeridos' });
    try {
      if (isPostgresReady()) {
        await pool.query(`
          INSERT INTO cash_shifts (id, terminal_id, operator, status, start_time, end_time, initial_cash, final_cash, total_collected, details)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            operator = EXCLUDED.operator,
            status = EXCLUDED.status,
            end_time = EXCLUDED.end_time,
            final_cash = EXCLUDED.final_cash,
            total_collected = EXCLUDED.total_collected,
            details = EXCLUDED.details
        `, [
          shift.id,
          shift.terminalId || 'TAQUILLA-01',
          shift.operator || 'Cajero',
          shift.status || 'open',
          shift.startTime || new Date().toISOString(),
          shift.endTime || null,
          Number(shift.initialCash || 0),
          Number(shift.finalCash || 0),
          Number(shift.totalCollected || 0),
          JSON.stringify(shift)
        ]);

        await pool.query(`
          INSERT INTO configs (key, value) VALUES ('currentShift', $1)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [JSON.stringify(shift)]);
      } else {
        memoryStoreRef.cashShifts.set(shift.id, shift);
        memoryStoreRef.configs.set('currentShift', shift);
      }
      res.json({ success: true, shift });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

}
