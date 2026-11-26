/**
 * Rutas de la API (databaseMaintenance). Se registran desde startServer() en server.ts.
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import {
  requirePermission,
} from '../auth.ts';
import pool, { isPostgresReady, memoryStoreRef, DATABASE_URL } from '../../src/db.ts';

export function registerDatabaseMaintenanceRoutes(app: express.Express) {
  // ==============================================================================
  // 9. ESTADÍSTICAS Y MANTENIMIENTO DE BASE DE DATOS POSTGRESQL
  // ==============================================================================
  app.get('/api/database/stats', async (req, res) => {
    try {
      if (isPostgresReady()) {
        const [spotsC, activeC, paidC, shiftsC, usersC, auditC] = await Promise.all([
          pool.query('SELECT COUNT(*) FROM spots'),
          pool.query('SELECT COUNT(*) FROM active_tickets'),
          pool.query('SELECT COUNT(*) FROM paid_tickets'),
          pool.query('SELECT COUNT(*) FROM cash_shifts'),
          pool.query('SELECT COUNT(*) FROM users'),
          pool.query('SELECT COUNT(*) FROM audit_logs')
        ]);
        return res.json({
          success: true,
          engine: 'PostgreSQL',
          status: 'connected',
          databaseUrl: DATABASE_URL.replace(/:[^:@]+@/, ':****@'),
          counts: {
            spots: Number(spotsC.rows[0].count),
            activeTickets: Number(activeC.rows[0].count),
            paidTickets: Number(paidC.rows[0].count),
            cashShifts: Number(shiftsC.rows[0].count),
            users: Number(usersC.rows[0].count),
            auditLogs: Number(auditC.rows[0].count)
          }
        });
      }
      res.json({
        success: true,
        engine: 'Memory Fallback (PostgreSQL Offline)',
        status: 'fallback',
        counts: {
          spots: memoryStoreRef.spots.size,
          activeTickets: memoryStoreRef.activeTickets.size,
          paidTickets: memoryStoreRef.paidTickets.size,
          cashShifts: memoryStoreRef.cashShifts.size,
          users: memoryStoreRef.users.size,
          auditLogs: memoryStoreRef.auditLogs.length
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/database/backup', requirePermission('canManageDatabase'), async (req, res) => {
    try {
      if (isPostgresReady()) {
        const [spots, active, paid, shifts, configs, users, audit, subs] = await Promise.all([
          pool.query('SELECT * FROM spots'),
          pool.query('SELECT * FROM active_tickets'),
          pool.query('SELECT * FROM paid_tickets'),
          pool.query('SELECT * FROM cash_shifts'),
          pool.query('SELECT * FROM configs'),
          pool.query('SELECT * FROM users'),
          pool.query('SELECT * FROM audit_logs'),
          pool.query('SELECT * FROM subscribers').catch(() => ({ rows: [] }))
        ]);
        const backup = {
          version: 'wolfzonepos-postgresql-v1',
          exportedAt: new Date().toISOString(),
          databaseEngine: 'PostgreSQL',
          spots: spots.rows,
          activeTickets: active.rows,
          paidTickets: paid.rows,
          cashShifts: shifts.rows,
          configs: configs.rows,
          users: users.rows,
          auditLogs: audit.rows,
          subscribers: subs.rows
        };
        return res.json({ success: true, backup });
      }
      const backup = {
        version: 'wolfzonepos-memory-v1',
        exportedAt: new Date().toISOString(),
        databaseEngine: 'In-Memory',
        spots: Array.from(memoryStoreRef.spots.values()),
        activeTickets: Array.from(memoryStoreRef.activeTickets.values()),
        paidTickets: Array.from(memoryStoreRef.paidTickets.values()),
        cashShifts: Array.from(memoryStoreRef.cashShifts.values()),
        configs: Array.from(memoryStoreRef.configs.entries()).map(([key, value]) => ({ key, value })),
        users: Array.from(memoryStoreRef.users.values()),
        subscribers: Array.from((memoryStoreRef as any).subscribers?.values() || []),
        auditLogs: memoryStoreRef.auditLogs
      };
      res.json({ success: true, backup });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/database/clear', requirePermission('canManageDatabase'), async (req, res) => {
    try {
      if (isPostgresReady()) {
        await pool.query('TRUNCATE active_tickets, paid_tickets, cash_shifts, audit_logs CASCADE');
        // Reset spots to available
        await pool.query("UPDATE spots SET status = 'available', current_ticket_id = NULL");
      } else {
        memoryStoreRef.activeTickets.clear();
        memoryStoreRef.paidTickets.clear();
        memoryStoreRef.cashShifts.clear();
        memoryStoreRef.auditLogs = [];
        for (const [id, s] of memoryStoreRef.spots.entries()) {
          s.status = 'available';
          s.currentTicketId = undefined;
          memoryStoreRef.spots.set(id, { ...s });
        }
      }
      res.json({ success: true, message: 'Base de datos de operaciones reiniciada exitosamente' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // SISTEMA DE COPIAS DE SEGURIDAD PROGRAMADAS EN SEGUNDO PLANO
  // -------------------------------------------------------------
  async function runAutomatedDatabaseBackup() {
    try {
      const backupsDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      let backup: any = null;
      if (isPostgresReady()) {
        const [spots, active, paid, shifts, configs, users, audit, subs] = await Promise.all([
          pool.query('SELECT * FROM spots'),
          pool.query('SELECT * FROM active_tickets'),
          pool.query('SELECT * FROM paid_tickets'),
          pool.query('SELECT * FROM cash_shifts'),
          pool.query('SELECT * FROM configs'),
          pool.query('SELECT * FROM users'),
          pool.query('SELECT * FROM audit_logs'),
          pool.query('SELECT * FROM subscribers').catch(() => ({ rows: [] }))
        ]);
        backup = {
          version: 'wolfzonepos-postgresql-v1',
          exportedAt: new Date().toISOString(),
          databaseEngine: 'PostgreSQL',
          spots: spots.rows,
          activeTickets: active.rows,
          paidTickets: paid.rows,
          cashShifts: shifts.rows,
          configs: configs.rows,
          users: users.rows,
          auditLogs: audit.rows,
          subscribers: subs.rows
        };
      } else {
        backup = {
          version: 'wolfzonepos-memory-v1',
          exportedAt: new Date().toISOString(),
          databaseEngine: 'In-Memory',
          spots: Array.from(memoryStoreRef.spots.values()),
          activeTickets: Array.from(memoryStoreRef.activeTickets.values()),
          paidTickets: Array.from(memoryStoreRef.paidTickets.values()),
          cashShifts: Array.from(memoryStoreRef.cashShifts.values()),
          configs: Array.from(memoryStoreRef.configs.entries()).map(([key, value]) => ({ key, value })),
          users: Array.from(memoryStoreRef.users.values()),
          subscribers: Array.from((memoryStoreRef as any).subscribers?.values() || []),
          auditLogs: memoryStoreRef.auditLogs
        };
      }

      const safeDate = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupsDir, `backup_auto_${safeDate}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
      console.log(`[Auto-Backup] Respaldo programado de seguridad generado en: ${backupPath}`);

      // Rotación: purgar copias de más de 30 días
      const maxAgeMs = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const files = fs.readdirSync(backupsDir);
      let purged = 0;
      for (const f of files) {
        if (f.startsWith('backup_auto_') && f.endsWith('.json')) {
          const filePath = path.join(backupsDir, f);
          try {
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > maxAgeMs) {
              fs.unlinkSync(filePath);
              purged++;
            }
          } catch {}
        }
      }
      if (purged > 0) {
        console.log(`[Auto-Backup] Purgadas ${purged} copias de seguridad anteriores a 30 días.`);
      }
    } catch (bkErr: any) {
      console.warn('[Auto-Backup Warning]:', bkErr.message);
    }
  }

  // Respaldo completo e inmutable al momento de un Cierre Definitivo de Día o Arqueo
  async function runClosureDatabaseBackup(type: 'day' | 'shift', metadata?: any) {
    try {
      const backupsDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      let backup: any = null;
      if (isPostgresReady()) {
        const [spots, active, paid, shifts, configs, users, audit, subs] = await Promise.all([
          pool.query('SELECT * FROM spots').catch(() => ({ rows: [] })),
          pool.query('SELECT * FROM active_tickets').catch(() => ({ rows: [] })),
          pool.query('SELECT * FROM paid_tickets').catch(() => ({ rows: [] })),
          pool.query('SELECT * FROM cash_shifts').catch(() => ({ rows: [] })),
          pool.query('SELECT * FROM configs').catch(() => ({ rows: [] })),
          pool.query('SELECT * FROM users').catch(() => ({ rows: [] })),
          pool.query('SELECT * FROM audit_logs').catch(() => ({ rows: [] })),
          pool.query('SELECT * FROM subscribers').catch(() => ({ rows: [] }))
        ]);
        backup = {
          version: 'wolfzonepos-postgresql-v1',
          exportedAt: new Date().toISOString(),
          closureType: type === 'day' ? 'CIERRE_DEFINITIVO_DIA' : 'CIERRE_ARQUEO_TURNO',
          closureMetadata: metadata || null,
          databaseEngine: 'PostgreSQL',
          spots: spots.rows,
          activeTickets: active.rows,
          paidTickets: paid.rows,
          cashShifts: shifts.rows,
          configs: configs.rows,
          users: users.rows,
          auditLogs: audit.rows,
          subscribers: subs.rows
        };
      } else {
        backup = {
          version: 'wolfzonepos-memory-v1',
          exportedAt: new Date().toISOString(),
          closureType: type === 'day' ? 'CIERRE_DEFINITIVO_DIA' : 'CIERRE_ARQUEO_TURNO',
          closureMetadata: metadata || null,
          databaseEngine: 'In-Memory',
          spots: Array.from(memoryStoreRef.spots.values()),
          activeTickets: Array.from(memoryStoreRef.activeTickets.values()),
          paidTickets: Array.from(memoryStoreRef.paidTickets.values()),
          cashShifts: Array.from(memoryStoreRef.cashShifts.values()),
          configs: Array.from(memoryStoreRef.configs.entries()).map(([key, value]) => ({ key, value })),
          users: Array.from(memoryStoreRef.users.values()),
          subscribers: Array.from((memoryStoreRef as any).subscribers?.values() || []),
          auditLogs: memoryStoreRef.auditLogs
        };
      }

      const safeDate = new Date().toISOString().replace(/[:.]/g, '-');
      const identifier = type === 'day' 
        ? `DIA_${metadata?.dayNumber || metadata?.id || 'Z'}`
        : `TURNO_${metadata?.shiftNumber || metadata?.id || 'T'}`;
      
      const prefix = type === 'day' ? 'BACKUP_CIERRE_DEFINITIVO' : 'BACKUP_ARQUEO';
      const backupFileName = `${prefix}_${identifier}_${safeDate}.json`;
      const backupPath = path.join(backupsDir, backupFileName);
      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
      console.log(`[Backup Cierre] Copia de seguridad inmutable generada en: ${backupPath}`);
      return { backupFileName, backupPath };
    } catch (bkErr: any) {
      console.error('[Backup Cierre Error]:', bkErr.message);
      throw bkErr;
    }
  }

  // Programar primer respaldo automático a los 15s de arranque y luego cada 6 horas
  setTimeout(runAutomatedDatabaseBackup, 15000);
  setInterval(runAutomatedDatabaseBackup, 6 * 60 * 60 * 1000);

  app.post('/api/database/backup/now', async (req, res) => {
    try {
      await runAutomatedDatabaseBackup();
      res.json({ success: true, message: 'Copia de seguridad generada y archivada con éxito en la carpeta /backups/' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/database/backup/closure', async (req, res) => {
    try {
      const { type, metadata, clientBackupPayload } = req.body || {};
      const closureType = type === 'day' ? 'day' : 'shift';
      const result = await runClosureDatabaseBackup(closureType, metadata);

      // Si el cliente envió el payload exportado desde el navegador y no hay Postgres, guardarlo como respaldo alternativo
      if (clientBackupPayload && !isPostgresReady()) {
        try {
          const backupsDir = path.join(process.cwd(), 'backups');
          const safeDate = new Date().toISOString().replace(/[:.]/g, '-');
          const clientFile = path.join(backupsDir, `BACKUP_CLIENTE_${closureType.toUpperCase()}_${safeDate}.json`);
          fs.writeFileSync(clientFile, typeof clientBackupPayload === 'string' ? clientBackupPayload : JSON.stringify(clientBackupPayload, null, 2), 'utf8');
        } catch {}
      }

      res.json({
        success: true,
        message: `Copia de seguridad inmutable de cierre archivada con éxito (${result.backupFileName})`,
        ...result
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/database/backups', async (req, res) => {
    try {
      const backupsDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupsDir)) {
        return res.json({ success: true, backups: [] });
      }
      const files = fs.readdirSync(backupsDir);
      const backups = files
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const filePath = path.join(backupsDir, f);
          const stats = fs.statSync(filePath);
          const isClosure = f.includes('CIERRE') || f.includes('cierre') || f.includes('ARQUEO') || f.includes('arqueo');
          const closureType = f.includes('CIERRE_DEFINITIVO') ? 'Cierre Definitivo' : (f.includes('ARQUEO') ? 'Arqueo Turno' : (isClosure ? 'Cierre' : null));
          return {
            fileName: f,
            sizeBytes: stats.size,
            sizeFormatted: `${(stats.size / 1024).toFixed(1)} KB`,
            createdAt: stats.birthtime || stats.mtime,
            isAuto: f.startsWith('backup_auto_'),
            isClosure,
            closureType
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json({ success: true, backups });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/database/backups/download/:fileName', requirePermission('canManageDatabase'), (req, res) => {
    try {
      const sanitized = path.basename(req.params.fileName);
      const targetPath = path.join(process.cwd(), 'backups', sanitized);
      if (!fs.existsSync(targetPath)) {
        return res.status(404).send('Archivo de copia de seguridad no encontrado');
      }
      res.download(targetPath, sanitized);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

}
