/**
 * Rutas de la API (tickets). Se registran desde startServer() en server.ts.
 */
import express from 'express';
import pool, { isPostgresReady, memoryStoreRef } from '../../src/db.ts';

export function registerTicketRoutes(app: express.Express) {
  // ==============================================================================
  // 2. TICKETS - Registro de entrada con actualización de plaza a OCUPADO
  // ==============================================================================
  app.post('/api/tickets/entry', async (req, res) => {
    const { ticket, spotCode } = req.body;
    if (!ticket || !ticket.id) {
      return res.status(400).json({ success: false, error: 'Datos de ticket requeridos' });
    }
    try {
      if (isPostgresReady()) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`
            INSERT INTO active_tickets (id, ticket_number, plate, vehicle_type, spot_code, entry_time, terminal_id, operator, details)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
              ticket_number = EXCLUDED.ticket_number,
              plate = EXCLUDED.plate,
              vehicle_type = EXCLUDED.vehicle_type,
              spot_code = EXCLUDED.spot_code,
              entry_time = EXCLUDED.entry_time,
              terminal_id = EXCLUDED.terminal_id,
              operator = EXCLUDED.operator,
              details = EXCLUDED.details
          `, [
            ticket.id,
            ticket.ticketNumber || `TKT-${ticket.id}`,
            ticket.plate || '',
            ticket.vehicleType || 'car',
            spotCode || ticket.spotCode || null,
            ticket.entryTime || new Date().toISOString(),
            ticket.terminalId || 'TAQUILLA-01',
            ticket.operator || 'Cajero',
            JSON.stringify(ticket)
          ]);

          const code = spotCode || ticket.spotCode;
          if (code) {
            await client.query(
              'UPDATE spots SET status = $1, current_ticket_id = $2 WHERE code = $3',
              ['occupied', ticket.id, code]
            );
          }

          // Registro de auditoría dentro de la misma transacción
          const auditId = `audit-ent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await client.query(`
            INSERT INTO audit_logs (id, terminal_id, timestamp, action, details, operator)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            auditId,
            ticket.terminalId || 'TAQUILLA-01',
            ticket.entryTime || new Date().toISOString(),
            'INGRESO_VEHICULO',
            JSON.stringify({
              ticketNumber: ticket.ticketNumber || `TKT-${ticket.id}`,
              plate: ticket.plate || '',
              vehicleType: ticket.vehicleType || 'car',
              spotCode: code || null
            }),
            ticket.operator || 'Cajero'
          ]);

          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      } else {
        memoryStoreRef.activeTickets.set(ticket.id, ticket);
        const code = spotCode || ticket.spotCode;
        if (code) {
          for (const [id, s] of memoryStoreRef.spots.entries()) {
            if (s.code === code) {
              s.status = 'occupied';
              s.currentTicketId = ticket.id;
              memoryStoreRef.spots.set(id, { ...s });
              break;
            }
          }
        }
      }
      res.json({ success: true, ticket });
    } catch (err: any) {
      console.error('[API Tickets Entry Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==============================================================================
  // 3. TICKETS - Checkout transaccional (BEGIN / COMMIT / ROLLBACK)
  // ==============================================================================
  app.post('/api/tickets/checkout', async (req, res) => {
    const { ticket } = req.body;
    if (!ticket || !ticket.id) {
      return res.status(400).json({ success: false, error: 'Datos de ticket requeridos' });
    }
    try {
      const paidAt = ticket.paidAt || new Date().toISOString();
      const total = Number(ticket.totalAmount ?? ticket.totalCost ?? ticket.cost ?? 0);
      const paymentMethod = ticket.paymentMethod || 'cash';
      const spotCode = ticket.spotCode || null;

      if (isPostgresReady()) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          
          // 1. Eliminar de tickets activos
          await client.query('DELETE FROM active_tickets WHERE id = $1 OR ticket_number = $2', [ticket.id, ticket.ticketNumber]);

          // 2. Insertar en tickets pagados
          await client.query(`
            INSERT INTO paid_tickets (id, ticket_number, plate, vehicle_type, spot_code, entry_time, paid_at, total, payment_method, terminal_id, operator, details)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO UPDATE SET
              paid_at = EXCLUDED.paid_at,
              total = EXCLUDED.total,
              payment_method = EXCLUDED.payment_method,
              details = EXCLUDED.details
          `, [
            ticket.id,
            ticket.ticketNumber || `TKT-${ticket.id}`,
            ticket.plate || '',
            ticket.vehicleType || 'car',
            spotCode,
            ticket.entryTime || new Date().toISOString(),
            paidAt,
            total,
            paymentMethod,
            ticket.terminalId || 'TAQUILLA-01',
            ticket.operator || 'Cajero',
            JSON.stringify({ ...ticket, paidAt, totalCost: total, paymentMethod })
          ]);

          // 3. Liberar la plaza a DISPONIBLE
          if (spotCode) {
            await client.query('UPDATE spots SET status = $1, current_ticket_id = NULL WHERE code = $2 OR current_ticket_id = $3', ['available', spotCode, ticket.id]);
          } else {
            await client.query('UPDATE spots SET status = $1, current_ticket_id = NULL WHERE current_ticket_id = $2', ['available', ticket.id]);
          }

          // 4. Registro de auditoría transaccional dentro del mismo COMMIT
          const auditId = `audit-chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await client.query(`
            INSERT INTO audit_logs (id, terminal_id, timestamp, action, details, operator)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            auditId,
            ticket.terminalId || 'TAQUILLA-01',
            paidAt,
            'PAGO_TICKET',
            JSON.stringify({ 
              ticketNumber: ticket.ticketNumber || `TKT-${ticket.id}`,
              plate: ticket.plate || '',
              total,
              paymentMethod,
              spotCode
            }),
            ticket.operator || 'Cajero'
          ]);

          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      } else {
        memoryStoreRef.activeTickets.delete(ticket.id);
        memoryStoreRef.paidTickets.set(ticket.id, { ...ticket, paidAt, totalCost: total, paymentMethod });
        if (spotCode) {
          for (const [id, s] of memoryStoreRef.spots.entries()) {
            if (s.code === spotCode || s.currentTicketId === ticket.id) {
              s.status = 'available';
              s.currentTicketId = undefined;
              memoryStoreRef.spots.set(id, { ...s });
            }
          }
        }
      }

      res.json({ success: true, ticket: { ...ticket, paidAt, totalCost: total, paymentMethod } });
    } catch (err: any) {
      console.error('[API Tickets Checkout Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Guardar / Actualizar Ticket Activo (individual)
  app.post('/api/tickets/active', async (req, res) => {
    const { ticket } = req.body;
    if (!ticket?.id) return res.status(400).json({ error: 'Ticket inválido' });
    try {
      if (isPostgresReady()) {
        await pool.query(`
          INSERT INTO active_tickets (id, ticket_number, plate, vehicle_type, spot_code, entry_time, terminal_id, operator, details)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            ticket_number = EXCLUDED.ticket_number,
            plate = EXCLUDED.plate,
            vehicle_type = EXCLUDED.vehicle_type,
            spot_code = EXCLUDED.spot_code,
            entry_time = EXCLUDED.entry_time,
            terminal_id = EXCLUDED.terminal_id,
            operator = EXCLUDED.operator,
            details = EXCLUDED.details
        `, [
          ticket.id,
          ticket.ticketNumber || `TKT-${ticket.id}`,
          ticket.plate || '',
          ticket.vehicleType || 'car',
          ticket.spotCode || null,
          ticket.entryTime || new Date().toISOString(),
          ticket.terminalId || 'TAQUILLA-01',
          ticket.operator || 'Cajero',
          JSON.stringify(ticket)
        ]);
      } else {
        memoryStoreRef.activeTickets.set(ticket.id, ticket);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Eliminar Ticket Activo (anulación)
  app.delete('/api/tickets/active/:id', async (req, res) => {
    const { id } = req.params;
    try {
      if (isPostgresReady()) {
        await pool.query('DELETE FROM active_tickets WHERE id = $1', [id]);
        await pool.query('UPDATE spots SET status = $1, current_ticket_id = NULL WHERE current_ticket_id = $2', ['available', id]);
      } else {
        memoryStoreRef.activeTickets.delete(id);
        for (const [sid, s] of memoryStoreRef.spots.entries()) {
          if (s.currentTicketId === id) {
            s.status = 'available';
            s.currentTicketId = undefined;
            memoryStoreRef.spots.set(sid, { ...s });
          }
        }
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Guardar Ticket Pagado
  app.post('/api/tickets/paid', async (req, res) => {
    const { ticket } = req.body;
    if (!ticket?.id) return res.status(400).json({ error: 'Ticket inválido' });
    try {
      if (isPostgresReady()) {
        await pool.query(`
          INSERT INTO paid_tickets (id, ticket_number, plate, vehicle_type, spot_code, entry_time, paid_at, total, payment_method, terminal_id, operator, details)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            paid_at = EXCLUDED.paid_at,
            total = EXCLUDED.total,
            payment_method = EXCLUDED.payment_method,
            details = EXCLUDED.details
        `, [
          ticket.id,
          ticket.ticketNumber || `TKT-${ticket.id}`,
          ticket.plate || '',
          ticket.vehicleType || 'car',
          ticket.spotCode || null,
          ticket.entryTime || new Date().toISOString(),
          ticket.paidAt || new Date().toISOString(),
          Number(ticket.totalAmount ?? ticket.totalCost ?? ticket.cost ?? 0),
          ticket.paymentMethod || 'cash',
          ticket.terminalId || 'TAQUILLA-01',
          ticket.operator || 'Cajero',
          JSON.stringify(ticket)
        ]);
      } else {
        memoryStoreRef.paidTickets.set(ticket.id, ticket);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

}
