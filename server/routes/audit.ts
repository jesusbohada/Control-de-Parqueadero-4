/**
 * Rutas de la API (audit). Se registran desde startServer() en server.ts.
 */
import express from 'express';
import pool, { isPostgresReady, memoryStoreRef } from '../../src/db.ts';

export function registerAuditRoutes(app: express.Express) {
  // ==============================================================================
  // 8. AUDITORÍA (audit_logs)
  // ==============================================================================
  app.get('/api/audit', async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 500, 1000);
      const action = req.query.action as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const search = req.query.search as string;

      if (isPostgresReady()) {
        let query = 'SELECT * FROM audit_logs WHERE 1=1';
        const params: any[] = [];
        let paramIdx = 1;

        if (action && action !== 'ALL') {
          query += ` AND (action = $${paramIdx} OR action LIKE $${paramIdx + 1})`;
          params.push(action, `%${action}%`);
          paramIdx += 2;
        }

        if (startDate) {
          query += ` AND timestamp >= $${paramIdx}`;
          params.push(startDate);
          paramIdx++;
        }

        if (endDate) {
          query += ` AND timestamp <= $${paramIdx}`;
          params.push(endDate);
          paramIdx++;
        }

        if (search) {
          query += ` AND (operator ILIKE $${paramIdx} OR action ILIKE $${paramIdx} OR details::text ILIKE $${paramIdx})`;
          params.push(`%${search}%`);
          paramIdx++;
        }

        query += ` ORDER BY timestamp DESC LIMIT $${paramIdx}`;
        params.push(limit);

        const result = await pool.query(query, params);
        const logs = result.rows.map(r => ({
          id: r.id,
          terminalId: r.terminal_id,
          timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : String(r.timestamp),
          action: r.action,
          details: typeof r.details === 'string' ? r.details : JSON.stringify(r.details),
          operator: r.operator
        }));
        return res.json({ success: true, logs });
      }

      let memLogs = [...memoryStoreRef.auditLogs];
      if (action && action !== 'ALL') {
        memLogs = memLogs.filter(l => l.action.includes(action));
      }
      if (startDate) {
        memLogs = memLogs.filter(l => l.timestamp >= startDate);
      }
      if (endDate) {
        memLogs = memLogs.filter(l => l.timestamp <= endDate);
      }
      if (search) {
        const s = search.toLowerCase();
        memLogs = memLogs.filter(l => (l.operator || '').toLowerCase().includes(s) || l.action.toLowerCase().includes(s) || (l.details || '').toLowerCase().includes(s));
      }

      memLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      res.json({ success: true, logs: memLogs.slice(0, limit) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/audit', async (req, res) => {
    const { log } = req.body;
    if (!log) return res.status(400).json({ error: 'Log inválido' });
    try {
      const logEntry = {
        id: log.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        terminalId: log.terminalId || 'TAQUILLA-01',
        timestamp: log.timestamp || new Date().toISOString(),
        action: log.action || 'SISTEMA',
        details: log.details || '',
        operator: log.operator || 'Cajero'
      };

      if (isPostgresReady()) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`
            INSERT INTO audit_logs (id, terminal_id, timestamp, action, details, operator)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            logEntry.id,
            logEntry.terminalId,
            logEntry.timestamp,
            logEntry.action,
            typeof logEntry.details === 'object' ? JSON.stringify(logEntry.details) : JSON.stringify({ message: logEntry.details }),
            logEntry.operator
          ]);
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      } else {
        memoryStoreRef.auditLogs.unshift(logEntry);
        if (memoryStoreRef.auditLogs.length > 500) memoryStoreRef.auditLogs.pop();
      }
      res.json({ success: true, log: logEntry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

}
