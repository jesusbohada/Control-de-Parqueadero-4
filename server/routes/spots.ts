/**
 * Rutas de la API (spots). Se registran desde startServer() en server.ts.
 */
import express from 'express';
import pool, { isPostgresReady, memoryStoreRef } from '../../src/db.ts';
import { requirePermission } from '../auth.ts';

// Permisos por ruta (master siempre pasa). Entrada y salida también guardan plazas en bloque
// (ocupar/liberar), por eso /bulk acepta los permisos de caja. El panel de plazas se abre con
// canManageSpots o canEditRates (ver Sidebar), y canManageDatabase cubre el editor de tablas.
const SPOT_ADMIN = ['canManageSpots', 'canEditRates', 'canManageDatabase'] as const;
export const SPOT_ROUTE_PERMISSIONS = {
  saveOne: [...SPOT_ADMIN],
  saveBulk: [...SPOT_ADMIN, 'canRegisterEntry', 'canRegisterExit', 'canForceRegisterExit', 'canChangeSpotStatus', 'canForceReleaseSpot'],
  remove: [...SPOT_ADMIN],
  statusBulk: [...SPOT_ADMIN, 'canChangeSpotStatus'],
  reconcile: [...SPOT_ADMIN, 'canForceReleaseSpot'],
} as const;
const guardSpot = (k: keyof typeof SPOT_ROUTE_PERMISSIONS) => requirePermission(...SPOT_ROUTE_PERMISSIONS[k]);

export function registerSpotRoutes(app: express.Express) {
  // ==============================================================================
  // 7. PLAZAS / SPOTS
  // ==============================================================================
  app.post('/api/spots', guardSpot('saveOne'), async (req, res) => {
    const { spot } = req.body;
    if (!spot?.id) return res.status(400).json({ error: 'Plaza inválida' });
    try {
      if (isPostgresReady()) {
        await pool.query(`
          INSERT INTO spots (id, code, type, status, rate_per_hour, current_ticket_id, details)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            code = EXCLUDED.code,
            type = EXCLUDED.type,
            status = EXCLUDED.status,
            rate_per_hour = EXCLUDED.rate_per_hour,
            current_ticket_id = EXCLUDED.current_ticket_id,
            details = EXCLUDED.details
        `, [
          spot.id,
          spot.code,
          spot.type || 'car',
          spot.status || 'available',
          Number(spot.ratePerHour || 0),
          spot.currentTicketId || null,
          JSON.stringify(spot)
        ]);
      } else {
        memoryStoreRef.spots.set(spot.id, spot);
      }
      res.json({ success: true, spot });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/spots/bulk', guardSpot('saveBulk'), async (req, res) => {
    const { spots } = req.body;
    if (!Array.isArray(spots)) return res.status(400).json({ error: 'Array de spots esperado' });
    try {
      if (isPostgresReady()) {
        for (const spot of spots) {
          await pool.query(`
            INSERT INTO spots (id, code, type, status, rate_per_hour, current_ticket_id, details)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
              code = EXCLUDED.code,
              type = EXCLUDED.type,
              status = EXCLUDED.status,
              rate_per_hour = EXCLUDED.rate_per_hour,
              current_ticket_id = EXCLUDED.current_ticket_id,
              details = EXCLUDED.details
          `, [
            spot.id,
            spot.code,
            spot.type || 'car',
            spot.status || 'available',
            Number(spot.ratePerHour || 0),
            spot.currentTicketId || null,
            JSON.stringify(spot)
          ]);
        }
      } else {
        spots.forEach(s => memoryStoreRef.spots.set(s.id, s));
      }
      res.json({ success: true, count: spots.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/spots/:id', guardSpot('remove'), async (req, res) => {
    const { id } = req.params;
    try {
      if (isPostgresReady()) {
        const check = await pool.query('SELECT status, code FROM spots WHERE id = $1', [id]);
        if (check.rows.length > 0 && check.rows[0].status === 'occupied') {
          return res.status(400).json({ success: false, error: `No se puede eliminar la plaza ${check.rows[0].code} porque está ocupada.` });
        }
        await pool.query('DELETE FROM spots WHERE id = $1 AND status != $2', [id, 'occupied']);
      } else {
        const s = memoryStoreRef.spots.get(id);
        if (s && s.status === 'occupied') {
          return res.status(400).json({ success: false, error: `No se puede eliminar la plaza ${s.code} porque está ocupada.` });
        }
        memoryStoreRef.spots.delete(id);
      }
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/spots/delete-bulk', guardSpot('remove'), async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Array de IDs requerido' });
    }
    try {
      if (isPostgresReady()) {
        const result = await pool.query('DELETE FROM spots WHERE id = ANY($1::text[]) AND status != $2', [ids, 'occupied']);
        res.json({ success: true, deletedCount: result.rowCount });
      } else {
        let count = 0;
        for (const id of ids) {
          const s = memoryStoreRef.spots.get(id);
          if (s && s.status !== 'occupied') {
            memoryStoreRef.spots.delete(id);
            count++;
          }
        }
        res.json({ success: true, deletedCount: count });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.patch('/api/spots/status-bulk', guardSpot('statusBulk'), async (req, res) => {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || !status) {
      return res.status(400).json({ success: false, error: 'IDs y nuevo estado requeridos' });
    }
    try {
      if (isPostgresReady()) {
        const result = await pool.query('UPDATE spots SET status = $1 WHERE id = ANY($2::text[]) AND status != $3', [status, ids, 'occupied']);
        res.json({ success: true, updatedCount: result.rowCount });
      } else {
        let count = 0;
        for (const id of ids) {
          const s = memoryStoreRef.spots.get(id);
          if (s && s.status !== 'occupied') {
            s.status = status;
            memoryStoreRef.spots.set(id, { ...s });
            count++;
          }
        }
        res.json({ success: true, updatedCount: count });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/spots/reconcile', guardSpot('reconcile'), async (req, res) => {
    try {
      if (isPostgresReady()) {
        const ticketsRes = await pool.query('SELECT id, ticket_number, plate, spot_code, details FROM active_tickets');
        const activeTicketsList = ticketsRes.rows;

        // Liberar plazas huérfanas marcadas como ocupadas sin ticket
        const freedResult = await pool.query(`
          UPDATE spots 
          SET status = 'available', 
              current_ticket_id = NULL
          WHERE status = 'occupied' 
            AND code NOT IN (SELECT spot_code FROM active_tickets WHERE spot_code IS NOT NULL)
            AND (current_ticket_id IS NULL OR current_ticket_id NOT IN (SELECT id FROM active_tickets))
        `);

        // Asegurar que las plazas con tickets activos estén marcadas como ocupadas
        for (const t of activeTicketsList) {
          if (t.spot_code) {
            await pool.query(`
              UPDATE spots
              SET status = 'occupied',
                  current_ticket_id = $1
              WHERE code = $2
            `, [t.id, t.spot_code]);
          }
        }

        const allSpotsRes = await pool.query('SELECT * FROM spots ORDER BY code ASC');
        const formattedSpots = allSpotsRes.rows.map(r => {
          let det: any = {};
          try { det = typeof r.details === 'string' ? JSON.parse(r.details) : (r.details || {}); } catch (_) {}
          return {
            ...det,
            id: r.id,
            code: r.code,
            type: r.type,
            status: r.status,
            ratePerHour: Number(r.rate_per_hour || 0),
            currentTicketId: r.current_ticket_id || undefined
          };
        });

        res.json({
          success: true,
          freedCount: freedResult.rowCount || 0,
          activeTicketsCount: activeTicketsList.length,
          spots: formattedSpots
        });
      } else {
        const activeList = Array.from(memoryStoreRef.activeTickets.values());
        let freedCount = 0;

        for (const [id, s] of memoryStoreRef.spots.entries()) {
          const matchingTicket = activeList.find(t => t.spotCode === s.code || t.id === s.currentTicketId);
          if (matchingTicket) {
            s.status = 'occupied';
            s.currentTicketId = matchingTicket.id;
          } else if (s.status === 'occupied') {
            s.status = 'available';
            s.currentTicketId = undefined;
            freedCount++;
          }
        }
        res.json({
          success: true,
          freedCount,
          activeTicketsCount: activeList.length,
          spots: Array.from(memoryStoreRef.spots.values())
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

}
