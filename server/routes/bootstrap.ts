/**
 * Rutas de la API (bootstrap). Se registran desde startServer() en server.ts.
 */
import express from 'express';
import { SystemUser } from '../../src/types.ts';
import {
  preparePasswordForStorage,
} from '../auth.ts';
import pool, { isPostgresReady, memoryStoreRef, DATABASE_URL } from '../../src/db.ts';
import { 
  INITIAL_SPOTS, 
  INITIAL_USERS, 
  DEFAULT_RATES, 
  DEFAULT_BUSINESS_INFO, 
  DEFAULT_PAYMENT_GATEWAY_CONFIG, 
  INITIAL_CASH_SHIFT,
  INITIAL_EXPENSE_CONCEPTS,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_ROLE_MATRIX,
  DEFAULT_USER_TEMPLATES,
  normalizeUser
} from '../../src/data/initialData.ts';

export interface RegisterBootstrapRoutesDeps {
  rowToPublicUser: (r: any, viewer?: Express.Request['auth'] | null) => SystemUser;
  sanitizeUserForClient: (u: SystemUser, viewer?: Express.Request['auth'] | null) => SystemUser;
}

export function registerBootstrapRoutes(app: express.Express, ctx: RegisterBootstrapRoutesDeps) {
  const { rowToPublicUser, sanitizeUserForClient } = ctx;
  // ==============================================================================
  // 1. BOOTSTRAP ENDPOINT - Carga inicial de datos desde PostgreSQL
  // ==============================================================================
  app.get('/api/data/bootstrap', async (req, res) => {
    const terminalId = (req.query.terminalId as string) || 'TAQUILLA-01';
    try {
      if (isPostgresReady()) {
        // 1. Plazas (spots)
        let spotsRes = await pool.query('SELECT * FROM spots ORDER BY code ASC');
        let spots = spotsRes.rows.map(r => {
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
        if (spots.length === 0) {
          for (const s of INITIAL_SPOTS) {
            await pool.query(
              'INSERT INTO spots (id, code, type, status, rate_per_hour, current_ticket_id, details) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
              [s.id, s.code, s.type, s.status, (s as any).ratePerHour || 0, s.currentTicketId || null, JSON.stringify(s)]
            );
          }
          spots = INITIAL_SPOTS;
        }

        // 2. Tickets Activos
        let activeRes = await pool.query('SELECT * FROM active_tickets ORDER BY entry_time DESC');
        let activeTickets = activeRes.rows.map(r => ({
          id: r.id,
          ticketNumber: r.ticket_number,
          plate: r.plate,
          vehicleType: r.vehicle_type,
          spotCode: r.spot_code,
          entryTime: r.entry_time instanceof Date ? r.entry_time.toISOString() : String(r.entry_time),
          terminalId: r.terminal_id,
          operator: r.operator,
          ...(r.details || {})
        }));

        // 3. Tickets Pagados (Historial reciente)
        let paidRes = await pool.query('SELECT * FROM paid_tickets ORDER BY paid_at DESC LIMIT 200');
        let paidTickets = paidRes.rows.map(r => ({
          id: r.id,
          ticketNumber: r.ticket_number,
          plate: r.plate,
          vehicleType: r.vehicle_type,
          spotCode: r.spot_code,
          entryTime: r.entry_time instanceof Date ? r.entry_time.toISOString() : String(r.entry_time),
          paidAt: r.paid_at instanceof Date ? r.paid_at.toISOString() : String(r.paid_at),
          totalCost: Number(r.total),
          cost: Number(r.total),
          paymentMethod: r.payment_method,
          terminalId: r.terminal_id,
          operator: r.operator,
          ...(r.details || {})
        }));

        // 4. Configuraciones
        const configsRes = await pool.query('SELECT key, value FROM configs');
        const configMap = new Map<string, any>(configsRes.rows.map(r => [r.key, r.value]));

        let rates = configMap.get('rates') || DEFAULT_RATES;
        let businessInfo = configMap.get('businessInfo') || DEFAULT_BUSINESS_INFO;
        let paymentGatewayConfig = configMap.get('paymentGatewayConfig') || DEFAULT_PAYMENT_GATEWAY_CONFIG;
        let currentShift = configMap.get('currentShift') || null;

        let expenseConcepts = configMap.get('expenseConcepts');
        if (!expenseConcepts) {
          await pool.query(
            `INSERT INTO configs (key, value) VALUES ('expenseConcepts', $1) ON CONFLICT (key) DO NOTHING`,
            [JSON.stringify(INITIAL_EXPENSE_CONCEPTS)]
          );
          expenseConcepts = INITIAL_EXPENSE_CONCEPTS;
        }

        let expenseCategories = configMap.get('expenseCategories');
        if (!expenseCategories) {
          await pool.query(
            `INSERT INTO configs (key, value) VALUES ('expenseCategories', $1) ON CONFLICT (key) DO NOTHING`,
            [JSON.stringify(INITIAL_EXPENSE_CATEGORIES)]
          );
          expenseCategories = INITIAL_EXPENSE_CATEGORIES;
        }

        let printers = configMap.get('printers');
        if (!printers) {
          const defaultPrinters = [
            { id: 'prn-sat-01', name: 'SAT 22TUS (Impresora Térmica Principal)', printerName: 'SAT 22TUS', port: 'USB004', isDefault: true, paperSize: '80mm', enabled: true, autoCut: true, openDrawer: true }
          ];
          await pool.query(
            `INSERT INTO configs (key, value) VALUES ('printers', $1) ON CONFLICT (key) DO NOTHING`,
            [JSON.stringify(defaultPrinters)]
          );
          printers = defaultPrinters;
        }

        let roleMatrix = configMap.get('roleMatrix');
        if (!roleMatrix) {
          await pool.query(
            `INSERT INTO configs (key, value) VALUES ('roleMatrix', $1) ON CONFLICT (key) DO NOTHING`,
            [JSON.stringify(INITIAL_ROLE_MATRIX)]
          );
          roleMatrix = INITIAL_ROLE_MATRIX;
        }

        let userTemplates = configMap.get('userTemplates');
        if (!userTemplates) {
          await pool.query(
            `INSERT INTO configs (key, value) VALUES ('userTemplates', $1) ON CONFLICT (key) DO NOTHING`,
            [JSON.stringify(DEFAULT_USER_TEMPLATES)]
          );
          userTemplates = DEFAULT_USER_TEMPLATES;
        }

        if (!currentShift) {
          const shiftRes = await pool.query("SELECT * FROM cash_shifts WHERE status = 'open' ORDER BY start_time DESC LIMIT 1");
          if (shiftRes.rows.length > 0) {
            const sr = shiftRes.rows[0];
            currentShift = {
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
            };
          } else {
            currentShift = INITIAL_CASH_SHIFT;
          }
        }

        let terminalConfig = configMap.get('terminalConfig') || {
          terminalId,
          terminalName: `Taquilla ${terminalId}`,
          databaseName: `PostgreSQL (${DATABASE_URL.split('@')[1] || 'localhost:5432'})`,
          createdAt: new Date().toISOString()
        };

        // 5. Usuarios
        let usersRes = await pool.query('SELECT * FROM users ORDER BY name ASC');
        let users: SystemUser[] = usersRes.rows.map(r => rowToPublicUser(r, req.auth));
        if (users.length === 0) {
          for (const u of INITIAL_USERS) {
            await pool.query(
              'INSERT INTO users (id, username, role, name, pin, permissions, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
              [u.id, u.username, u.role, u.name, preparePasswordForStorage(u.password || (u as any).pin || ''), JSON.stringify(u.permissions || {}), u.createdAt || new Date().toISOString()]
            );
          }
          users = INITIAL_USERS.map(u => sanitizeUserForClient(u, req.auth));
        }

        return res.json({
          success: true,
          spots,
          activeTickets,
          paidTickets,
          rates,
          businessInfo,
          paymentGatewayConfig,
          currentShift,
          terminalConfig,
          users: users.map(normalizeUser),
          expenseConcepts,
          expenseCategories,
          printers,
          roleMatrix,
          userTemplates,
          isPostgres: true,
          databaseName: `PostgreSQL (${DATABASE_URL.split('@')[1] || 'localhost:5432'})`
        });
      }

      // Modo de contingencia en memoria
      if (memoryStoreRef.spots.size === 0) {
        INITIAL_SPOTS.forEach(s => memoryStoreRef.spots.set(s.id, s));
      }
      if (memoryStoreRef.users.size === 0) {
        INITIAL_USERS.forEach(u => memoryStoreRef.users.set(u.id, u));
      }
      if (!memoryStoreRef.configs.has('rates')) memoryStoreRef.configs.set('rates', DEFAULT_RATES);
      if (!memoryStoreRef.configs.has('businessInfo')) memoryStoreRef.configs.set('businessInfo', DEFAULT_BUSINESS_INFO);
      if (!memoryStoreRef.configs.has('paymentGatewayConfig')) memoryStoreRef.configs.set('paymentGatewayConfig', DEFAULT_PAYMENT_GATEWAY_CONFIG);
      if (!memoryStoreRef.configs.has('currentShift')) memoryStoreRef.configs.set('currentShift', INITIAL_CASH_SHIFT);
      if (!memoryStoreRef.configs.has('expenseConcepts')) memoryStoreRef.configs.set('expenseConcepts', INITIAL_EXPENSE_CONCEPTS);
      if (!memoryStoreRef.configs.has('expenseCategories')) memoryStoreRef.configs.set('expenseCategories', INITIAL_EXPENSE_CATEGORIES);
      if (!memoryStoreRef.configs.has('roleMatrix')) memoryStoreRef.configs.set('roleMatrix', INITIAL_ROLE_MATRIX);
      if (!memoryStoreRef.configs.has('userTemplates')) memoryStoreRef.configs.set('userTemplates', DEFAULT_USER_TEMPLATES);

      return res.json({
        success: true,
        spots: Array.from(memoryStoreRef.spots.values()),
        activeTickets: Array.from(memoryStoreRef.activeTickets.values()),
        paidTickets: Array.from(memoryStoreRef.paidTickets.values()),
        rates: memoryStoreRef.configs.get('rates'),
        businessInfo: memoryStoreRef.configs.get('businessInfo'),
        paymentGatewayConfig: memoryStoreRef.configs.get('paymentGatewayConfig'),
        currentShift: memoryStoreRef.configs.get('currentShift'),
        expenseConcepts: memoryStoreRef.configs.get('expenseConcepts'),
        expenseCategories: memoryStoreRef.configs.get('expenseCategories'),
        roleMatrix: memoryStoreRef.configs.get('roleMatrix'),
        userTemplates: memoryStoreRef.configs.get('userTemplates'),
        terminalConfig: {
          terminalId,
          terminalName: `Taquilla ${terminalId}`,
          databaseName: 'PostgreSQL (Modo Contingencia / Memoria)',
          createdAt: new Date().toISOString()
        },
        users: Array.from(memoryStoreRef.users.values()).map(normalizeUser),
        isPostgres: false,
        databaseName: 'PostgreSQL (Modo Contingencia / Memoria)'
      });
    } catch (err: any) {
      console.error('[API Bootstrap Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

}
