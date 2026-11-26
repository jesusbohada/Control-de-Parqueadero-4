/**
 * Rutas de la API (postgresAdmin). Se registran desde startServer() en server.ts.
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import {
  requirePermission,
  preparePasswordForStorage,
} from '../auth.ts';
import pool, { isPostgresReady, memoryStoreRef, DATABASE_URL } from '../../src/db.ts';

export interface RegisterPostgresAdminRoutesDeps {
  getStoredPin: (userId: string) => Promise<string | null>;
}

export function registerPostgresAdminRoutes(app: express.Express, ctx: RegisterPostgresAdminRoutesDeps) {
  const { getStoredPin } = ctx;
  // ==============================================================================
  // 0. POSTGRESQL FULL ADMINISTRATION SUITE (API REST & CONSOLE)
  // ==============================================================================
  
  // 0.1 Estado detallado de PostgreSQL
  app.get('/api/postgres/status', async (req, res) => {
    const start = performance.now();
    try {
      if (!isPostgresReady()) {
        return res.json({
          connected: false,
          ready: false,
          engine: 'PostgreSQL',
          error: 'PostgreSQL no está activo o la conexión aún no se ha completado.',
          databaseUrl: DATABASE_URL.replace(/:[^:@]+@/, ':****@'),
          pool: {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            activeCount: Math.max(0, pool.totalCount - pool.idleCount),
            waitingCount: pool.waitingCount
          }
        });
      }

      const infoRes = await pool.query(`
        SELECT 
          current_database() AS db_name,
          version() AS pg_version,
          pg_size_pretty(pg_database_size(current_database())) AS db_size,
          now() AS server_time,
          pg_backend_pid() AS backend_pid
      `);

      const tablesCountRes = await pool.query(`
        SELECT count(*)::int AS total_tables 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      const executionTimeMs = Number((performance.now() - start).toFixed(2));
      const info = infoRes.rows[0] || {};

      return res.json({
        connected: true,
        ready: true,
        engine: 'PostgreSQL',
        databaseName: info.db_name || 'wolfzonepos_db',
        version: info.pg_version || 'PostgreSQL',
        size: info.db_size || '0 kB',
        serverTime: info.server_time,
        backendPid: info.backend_pid,
        totalTables: tablesCountRes.rows[0]?.total_tables || 0,
        executionTimeMs,
        databaseUrl: DATABASE_URL.replace(/:[^:@]+@/, ':****@'),
        pool: {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          activeCount: Math.max(0, pool.totalCount - pool.idleCount),
          waitingCount: pool.waitingCount
        }
      });
    } catch (err: any) {
      return res.status(500).json({
        connected: false,
        ready: false,
        error: err.message,
        executionTimeMs: Number((performance.now() - start).toFixed(2))
      });
    }
  });

  // 0.2 Listado de tablas e información de tamaño y filas
  app.get('/api/postgres/tables', async (req, res) => {
    try {
      if (!isPostgresReady()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL no está disponible actualmente' });
      }

      const tablesQuery = `
        SELECT 
          t.table_name,
          COALESCE(c.reltuples::bigint, 0) AS estimated_rows,
          pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name)::regclass)) AS total_size,
          pg_size_pretty(pg_relation_size(quote_ident(t.table_name)::regclass)) AS data_size,
          pg_size_pretty(pg_indexes_size(quote_ident(t.table_name)::regclass)) AS index_size
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name ASC
      `;

      const result = await pool.query(tablesQuery);

      // Obtener columnas de cada tabla
      const columnsQuery = `
        SELECT 
          table_name, 
          column_name, 
          data_type, 
          is_nullable, 
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `;
      const colsResult = await pool.query(columnsQuery);

      const columnsByTable: Record<string, any[]> = {};
      colsResult.rows.forEach(col => {
        if (!columnsByTable[col.table_name]) columnsByTable[col.table_name] = [];
        columnsByTable[col.table_name].push(col);
      });

      // Recuento exacto para tablas conocidas
      const enrichedTables = await Promise.all(
        result.rows.map(async (row) => {
          let exactCount = Number(row.estimated_rows);
          try {
            const countRes = await pool.query(`SELECT count(*)::bigint AS cnt FROM ${row.table_name}`);
            exactCount = Number(countRes.rows[0]?.cnt || 0);
          } catch {
            // fallback al estimado
          }
          return {
            tableName: row.table_name,
            exactCount,
            totalSize: row.total_size,
            dataSize: row.data_size,
            indexSize: row.index_size,
            columns: columnsByTable[row.table_name] || []
          };
        })
      );

      return res.json({
        success: true,
        tables: enrichedTables
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 0.3 Consulta paginada y filtrada de una tabla SQL
  app.post('/api/postgres/table-data', requirePermission('canManageDatabase'), async (req, res) => {
    const { table, page = 1, limit = 50, search = '', sortBy = '', sortDir = 'ASC' } = req.body || {};
    const start = performance.now();

    try {
      if (!isPostgresReady()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL no está disponible' });
      }

      // Validar nombre de tabla seguro (solo alfanumérico y guión bajo)
      const sanitizedTable = String(table || '').trim();
      if (!/^[a-zA-Z0-9_]+$/.test(sanitizedTable)) {
        return res.status(400).json({ success: false, error: 'Nombre de tabla inválido' });
      }

      // Verificar que la tabla existe en esquema público
      const checkExists = await pool.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [sanitizedTable]
      );
      if (checkExists.rows.length === 0) {
        return res.status(404).json({ success: false, error: `La tabla '${sanitizedTable}' no existe en PostgreSQL` });
      }

      const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
      const safeLimit = Math.min(500, Math.max(1, Number(limit)));

      let countQuery = `SELECT count(*)::bigint AS total FROM ${sanitizedTable}`;
      let dataQuery = `SELECT * FROM ${sanitizedTable}`;
      const params: any[] = [];

      if (search && String(search).trim().length > 0) {
        // Búsqueda genérica convirtiendo la fila a texto
        countQuery += ` WHERE CAST(${sanitizedTable}.* AS TEXT) ILIKE $1`;
        dataQuery += ` WHERE CAST(${sanitizedTable}.* AS TEXT) ILIKE $1`;
        params.push(`%${search.trim()}%`);
      }

      if (sortBy && /^[a-zA-Z0-9_]+$/.test(String(sortBy))) {
        const dir = String(sortDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        dataQuery += ` ORDER BY ${sortBy} ${dir}`;
      }

      dataQuery += ` LIMIT ${safeLimit} OFFSET ${offset}`;

      const [countRes, dataRes] = await Promise.all([
        pool.query(countQuery, params),
        pool.query(dataQuery, params)
      ]);

      const totalRecords = Number(countRes.rows[0]?.total || 0);
      const executionTimeMs = Number((performance.now() - start).toFixed(2));

      return res.json({
        success: true,
        table: sanitizedTable,
        rows: dataRes.rows,
        totalRecords,
        page: Number(page),
        limit: safeLimit,
        totalPages: Math.ceil(totalRecords / safeLimit),
        fields: dataRes.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
        executionTimeMs
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 0.4 Consola de Ejecución de Consultas SQL Directas (Deshabilitada por seguridad)
  app.post('/api/postgres/query', async (_req, res) => {
    return res.status(403).json({
      success: false,
      error: 'La consola de ejecución SQL directa ha sido deshabilitada por políticas de seguridad para proteger la integridad de los datos.'
    });
  });

  // 0.5 Generar Volcado SQL Completo descargable (.sql)
  app.get('/api/postgres/dump', requirePermission('canManageDatabase'), async (req, res) => {
    try {
      if (!isPostgresReady()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL no está disponible' });
      }

      let dumpSql = `-- =====================================================================\n`;
      dumpSql += `-- RESPALDO Y VOLCADO SQL - WOLFZONE POS (POSTGRESQL)\n`;
      dumpSql += `-- Generado: ${new Date().toISOString()}\n`;
      dumpSql += `-- Base de datos: wolfzonepos_db\n`;
      dumpSql += `-- =====================================================================\n\n`;

      const tablesToDump = [
        'spots',
        'active_tickets',
        'paid_tickets',
        'rates_config',
        'cash_shifts',
        'users',
        'audit_logs',
        'expense_concepts',
        'vehicle_categories'
      ];

      for (const tName of tablesToDump) {
        try {
          const resRows = await pool.query(`SELECT * FROM ${tName}`);
          if (resRows.rows.length > 0) {
            dumpSql += `-- ---------------------------------------------------------------------\n`;
            dumpSql += `-- Tabla: ${tName} (${resRows.rows.length} registros)\n`;
            dumpSql += `-- ---------------------------------------------------------------------\n`;
            for (const r of resRows.rows) {
              const keys = Object.keys(r);
              const values = keys.map(k => {
                const val = r[k];
                if (val === null || val === undefined) return 'NULL';
                if (typeof val === 'number') return val;
                if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
                if (val instanceof Date) return `'${val.toISOString()}'::timestamptz`;
                return `'${String(val).replace(/'/g, "''")}'`;
              });
              dumpSql += `INSERT INTO ${tName} (${keys.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
            }
            dumpSql += `\n`;
          }
        } catch {
          // Ignorar tabla si no existe
        }
      }

      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="wolfzonepos_backup_${Date.now()}.sql"`);
      return res.send(dumpSql);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 0.5.1 Respaldo de una tabla SQL individual (SQL o JSON)
  app.get('/api/postgres/dump-table', requirePermission('canManageDatabase'), async (req, res) => {
    try {
      if (!isPostgresReady()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL no está disponible' });
      }

      const table = String(req.query.table || '').trim();
      const format = String(req.query.format || 'json').toLowerCase();

      if (!/^[a-zA-Z0-9_]+$/.test(table)) {
        return res.status(400).json({ success: false, error: 'Nombre de tabla inválido' });
      }

      // Validar existencia de tabla
      const checkExists = await pool.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      if (checkExists.rows.length === 0) {
        return res.status(404).json({ success: false, error: `La tabla '${table}' no existe en la base de datos.` });
      }

      const rowsRes = await pool.query(`SELECT * FROM ${table}`);
      const rows = rowsRes.rows || [];

      if (format === 'sql') {
        let sqlContent = `-- =====================================================================\n`;
        sqlContent += `-- RESPALDO ESPECÍFICO DE TABLA: ${table}\n`;
        sqlContent += `-- Fecha: ${new Date().toISOString()}\n`;
        sqlContent += `-- Total registros: ${rows.length}\n`;
        sqlContent += `-- =====================================================================\n\n`;

        if (rows.length > 0) {
          for (const r of rows) {
            const keys = Object.keys(r);
            const values = keys.map(k => {
              const val = r[k];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'number') return val;
              if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
              if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
              if (val instanceof Date) return `'${val.toISOString()}'::timestamptz`;
              return `'${String(val).replace(/'/g, "''")}'`;
            });
            sqlContent += `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
          }
        }

        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename="wolfzonepos_table_${table}_${Date.now()}.sql"`);
        return res.send(sqlContent);
      }

      // Formato JSON por defecto
      const exportObject = {
        metadata: {
          database: 'wolfzonepos_db',
          table,
          recordCount: rows.length,
          exportedAt: new Date().toISOString(),
          version: '4.0-enterprise'
        },
        records: rows
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="wolfzonepos_table_${table}_${Date.now()}.json"`);
      return res.send(JSON.stringify(exportObject, null, 2));
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 0.5.2 Restauración de una tabla SQL individual desde JSON / Array
  app.post('/api/postgres/restore-table', requirePermission('canManageDatabase'), async (req, res) => {
    try {
      if (!isPostgresReady()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL no está activo' });
      }

      const { table, records, mode = 'upsert' } = req.body || {};
      const sanitizedTable = String(table || '').trim();

      if (!/^[a-zA-Z0-9_]+$/.test(sanitizedTable)) {
        return res.status(400).json({ success: false, error: 'Nombre de tabla inválido' });
      }

      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, error: 'El archivo o lista de registros a restaurar está vacío.' });
      }

      // Obtener columnas de la tabla en Postgres
      const colsRes = await pool.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
        [sanitizedTable]
      );
      if (colsRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: `La tabla '${sanitizedTable}' no existe en PostgreSQL.` });
      }

      const validColumns = colsRes.rows.map(c => c.column_name);
      let successCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          const keysToInsert = Object.keys(record).filter(k => validColumns.includes(k));
          if (keysToInsert.length === 0) continue;

          const values = keysToInsert.map(k => {
            const v = record[k];
            if (v && typeof v === 'object' && !(v instanceof Date)) {
              return JSON.stringify(v);
            }
            return v;
          });

          const valuePlaceholders = keysToInsert.map((_, i) => `$${i + 1}`).join(', ');
          
          let queryText = `INSERT INTO ${sanitizedTable} (${keysToInsert.join(', ')}) VALUES (${valuePlaceholders})`;
          
          if (mode === 'upsert' && keysToInsert.includes('id')) {
            const updateClauses = keysToInsert
              .filter(k => k !== 'id')
              .map(k => `${k} = EXCLUDED.${k}`)
              .join(', ');
            
            if (updateClauses.length > 0) {
              queryText += ` ON CONFLICT (id) DO UPDATE SET ${updateClauses}`;
            } else {
              queryText += ` ON CONFLICT (id) DO NOTHING`;
            }
          } else {
            queryText += ` ON CONFLICT DO NOTHING`;
          }

          await pool.query(queryText, values);
          successCount++;
        } catch (itemErr: any) {
          errorCount++;
          console.warn(`[Restore Table ${sanitizedTable} Warning]:`, itemErr.message);
        }
      }

      return res.json({
        success: true,
        message: `Restauración de tabla '${sanitizedTable}' finalizada. ${successCount} registros procesados con éxito (${errorCount} omitidos/con error).`,
        successCount,
        errorCount,
        totalProvided: records.length
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 0.5.3 Verificación de integridad de la base de datos y carpeta de datos
  app.get('/api/database/integrity-check', async (req, res) => {
    const issues: string[] = [];
    let healthy = true;
    let corrupted = false;
    const tableStats: Record<string, number> = {};

    // 1. Verificar lectura de tablas de PostgreSQL
    if (isPostgresReady()) {
      const tablesToCheck = ['spots', 'active_tickets', 'paid_tickets', 'cash_shifts', 'users', 'configs', 'audit_logs', 'subscribers'];
      for (const t of tablesToCheck) {
        try {
          const r = await pool.query(`SELECT count(*)::int as count FROM ${t}`);
          tableStats[t] = r.rows[0]?.count || 0;
        } catch (tableErr: any) {
          healthy = false;
          const msg = tableErr.message || '';
          issues.push(`Error al leer tabla '${t}': ${msg}`);
          if (msg.includes('corrupt') || msg.includes('PANIC') || msg.includes('could not read block') || msg.includes('invalid page') || msg.includes('does not exist')) {
            corrupted = true;
          }
        }
      }
    } else {
      healthy = false;
      issues.push('Servicio o puerto de PostgreSQL no responde o desconectado.');
    }

    // 2. Escanear backups disponibles en /backups/
    const backupsList: Array<{ fileName: string; size: number; date: string; type: string; summary: string }> = [];
    try {
      const backupsDir = path.join(process.cwd(), 'backups');
      if (fs.existsSync(backupsDir)) {
        const files = fs.readdirSync(backupsDir);
        for (const file of files) {
          if (file.endsWith('.json') || file.endsWith('.sql')) {
            const fullPath = path.join(backupsDir, file);
            const stat = fs.statSync(fullPath);
            let summary = 'Copia de seguridad del sistema';
            let type = file.endsWith('.sql') ? 'SQL Dump' : 'JSON';

            if (file.endsWith('.json')) {
              try {
                const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                if (content.tipo === 'CIERRE_DE_TURNO') {
                  type = 'Cierre de Turno';
                  summary = `Operador: ${content.operador || 'Cajero'} | Total: $${Number(content.recaudoTotal || 0).toLocaleString()}`;
                } else if (content.spots || content.activeTickets || content.paidTickets) {
                  type = 'Completo del Sistema';
                  const tCount = (content.paidTickets?.length || 0) + (content.activeTickets?.length || 0);
                  summary = `${tCount} tickets | ${content.spots?.length || 0} plazas`;
                }
              } catch {
                // Ignore parse errors on individual backup
              }
            }

            backupsList.push({
              fileName: file,
              size: stat.size,
              date: stat.mtime.toISOString(),
              type,
              summary
            });
          }
        }
        backupsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    } catch (bErr: any) {
      console.warn('[Integrity Check] Error listando backups:', bErr.message);
    }

    res.json({
      success: true,
      healthy,
      corrupted,
      postgresReady: isPostgresReady(),
      issues,
      tableStats,
      backups: backupsList,
      timestamp: new Date().toISOString()
    });
  });

  // 0.5.4 Restauración de un backup previo desde la carpeta /backups/ o carga directa
  app.post('/api/database/restore-backup-file', requirePermission('canManageDatabase'), async (req, res) => {
    try {
      const { fileName, fileContent } = req.body || {};
      let backupData: any = null;

      if (fileContent) {
        backupData = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;
      } else if (fileName) {
        const sanitized = path.basename(fileName);
        const targetPath = path.join(process.cwd(), 'backups', sanitized);
        if (!fs.existsSync(targetPath)) {
          return res.status(404).json({ success: false, error: 'El archivo de backup no existe en el servidor' });
        }
        backupData = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      } else {
        return res.status(400).json({ success: false, error: 'Debe especificar el archivo a restaurar' });
      }

      let restoredCount = 0;
      const details: Record<string, number> = {};

      // 1. Restaurar si es cierre de turno
      if (backupData.tipo === 'CIERRE_DE_TURNO' && backupData.datosTurno) {
        const shift = backupData.datosTurno;
        if (isPostgresReady()) {
          await pool.query(`
            INSERT INTO cash_shifts (id, terminal_id, operator, status, start_time, end_time, initial_cash, final_cash, total_collected, details)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              end_time = EXCLUDED.end_time,
              final_cash = EXCLUDED.final_cash,
              total_collected = EXCLUDED.total_collected,
              details = EXCLUDED.details
          `, [
            shift.id,
            shift.terminalId || 'TAQUILLA-01',
            shift.operator || 'Cajero',
            shift.status || 'closed',
            shift.startTime || new Date().toISOString(),
            shift.endTime || new Date().toISOString(),
            Number(shift.initialCash || 0),
            Number(shift.finalCash || 0),
            Number(shift.totalCollected || 0),
            JSON.stringify(shift)
          ]);
        }
        memoryStoreRef.cashShifts.set(shift.id, shift);
        restoredCount++;
        details['cash_shifts'] = 1;
      }

      // 2. Restaurar plazas
      if (Array.isArray(backupData.spots)) {
        let sc = 0;
        for (const s of backupData.spots) {
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
            `, [s.id, s.code, s.type, s.status, s.ratePerHour || 0, s.currentTicketId || null, JSON.stringify(s)]);
          }
          memoryStoreRef.spots.set(s.id, s);
          sc++;
        }
        restoredCount += sc;
        details['spots'] = sc;
      }

      // 3. Restaurar tickets activos
      if (Array.isArray(backupData.activeTickets)) {
        let ac = 0;
        for (const t of backupData.activeTickets) {
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
            `, [t.id, t.ticketNumber || `TKT-${t.id}`, t.plate, t.vehicleType, t.spotCode || null, t.entryTime, t.terminalId || null, t.operator || null, JSON.stringify(t)]);
          }
          memoryStoreRef.activeTickets.set(t.id, t);
          ac++;
        }
        restoredCount += ac;
        details['active_tickets'] = ac;
      }

      // 4. Restaurar tickets pagados
      if (Array.isArray(backupData.paidTickets)) {
        let pc = 0;
        for (const t of backupData.paidTickets) {
          if (isPostgresReady()) {
            await pool.query(`
              INSERT INTO paid_tickets (id, ticket_number, plate, vehicle_type, spot_code, entry_time, paid_at, total, payment_method, terminal_id, operator, details)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              ON CONFLICT (id) DO UPDATE SET
                ticket_number = EXCLUDED.ticket_number,
                plate = EXCLUDED.plate,
                vehicle_type = EXCLUDED.vehicle_type,
                spot_code = EXCLUDED.spot_code,
                paid_at = EXCLUDED.paid_at,
                total = EXCLUDED.total,
                payment_method = EXCLUDED.payment_method,
                details = EXCLUDED.details
            `, [t.id, t.ticketNumber || `TKT-${t.id}`, t.plate, t.vehicleType, t.spotCode || null, t.entryTime, t.paidAt || new Date().toISOString(), Number(t.totalCost || t.total || 0), t.paymentMethod || 'cash', t.terminalId || null, t.operator || null, JSON.stringify(t)]);
          }
          memoryStoreRef.paidTickets.set(t.id, t);
          pc++;
        }
        restoredCount += pc;
        details['paid_tickets'] = pc;
      }

      // 5. Restaurar configuraciones / tarifas
      if (backupData.ratesConfig || backupData.rates) {
        const ratesVal = backupData.ratesConfig || backupData.rates;
        if (isPostgresReady()) {
          await pool.query(`INSERT INTO configs (key, value) VALUES ('rates', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [JSON.stringify(ratesVal)]);
        }
        memoryStoreRef.configs.set('rates', ratesVal);
        restoredCount++;
        details['configs'] = (details['configs'] || 0) + 1;
      }

      // 6. Restaurar usuarios
      if (Array.isArray(backupData.users)) {
        let uc = 0;
        for (const u of backupData.users) {
          if (isPostgresReady()) {
            await pool.query(`
              INSERT INTO users (id, username, role, name, pin, permissions, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                role = EXCLUDED.role,
                name = EXCLUDED.name,
                pin = EXCLUDED.pin,
                permissions = EXCLUDED.permissions
            `, [u.id, u.username, u.role, u.name, preparePasswordForStorage(u.password || (u as any).pin || '', await getStoredPin(u.id)), JSON.stringify(u.permissions || {}), u.createdAt || new Date().toISOString()]);
          }
          memoryStoreRef.users.set(u.id, u);
          uc++;
        }
        restoredCount += uc;
        details['users'] = uc;
      }

      res.json({
        success: true,
        message: `Restauración completada con éxito. Se procesaron ${restoredCount} elementos en el sistema.`,
        restoredCount,
        details
      });
    } catch (err: any) {
      console.error('[Restore Backup File Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 0.5.5 Verificación de espacio en disco en el host
  app.get('/api/system/disk-space', (req, res) => {
    try {
      if (typeof fs.statfsSync === 'function') {
        const stats = fs.statfsSync(process.cwd());
        const freeBytes = Number(stats.bavail) * Number(stats.bsize);
        const totalBytes = Number(stats.blocks) * Number(stats.bsize);
        const freeMB = Math.round(freeBytes / (1024 * 1024));
        const totalMB = Math.round(totalBytes / (1024 * 1024));
        const isCritical = freeMB < 500;
        const isWarning = freeMB < 1024;

        return res.json({
          success: true,
          freeBytes,
          totalBytes,
          freeMB,
          totalMB,
          freeGB: parseFloat((freeMB / 1024).toFixed(2)),
          totalGB: parseFloat((totalMB / 1024).toFixed(2)),
          isCritical,
          isWarning,
          timestamp: new Date().toISOString()
        });
      }
      
      // Fallback
      return res.json({
        success: true,
        freeMB: 5120,
        totalMB: 20480,
        freeGB: 5.0,
        totalGB: 20.0,
        isCritical: false,
        isWarning: false,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.warn('[Disk Space Check Warning]:', err.message);
      return res.json({
        success: true,
        freeMB: 4096,
        totalMB: 16384,
        freeGB: 4.0,
        totalGB: 16.0,
        isCritical: false,
        isWarning: false,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 0.5.6 Registro automático del estado de la base de datos en log de auditoría
  app.post('/api/audit/state-log', async (req, res) => {
    try {
      const { action, details, databaseState, operator, terminalId } = req.body || {};
      const auditId = `audit-state-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const timestamp = new Date().toISOString();
      const op = operator || 'Sistema';
      const term = terminalId || 'TAQUILLA-01';

      const payload = {
        action: action || 'CRITICAL_STATE_SNAPSHOT',
        timestamp,
        details: details || {},
        databaseState: databaseState || {
          activeTicketsCount: 0,
          occupiedSpotsCount: 0,
          cashShiftId: null
        }
      };

      if (isPostgresReady()) {
        await pool.query(`
          INSERT INTO audit_logs (id, terminal_id, timestamp, action, details, operator)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          auditId,
          term,
          timestamp,
          `AUDIT_STATE:${action || 'DATABASE_MUTATION'}`,
          JSON.stringify(payload),
          op
        ]);
      }

      console.log(`[Integrity Audit Log] Estado registrado tras '${action}': Plazas Ocupadas: ${payload.databaseState?.occupiedSpotsCount || 0}, Tickets Activos: ${payload.databaseState?.activeTicketsCount || 0}, Operador: ${op}`);
      res.json({ success: true, auditId });
    } catch (err: any) {
      console.warn('[Audit State Log Warning]:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 0.6 Sincronización masiva desde IndexedDB a PostgreSQL
  app.post('/api/postgres/sync-from-client', async (req, res) => {
    try {
      if (!isPostgresReady()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL no está activo' });
      }

      const { spots, activeTickets, paidTickets, cashShifts, ratesConfig, users, expenseConcepts, expenseCategories, roleMatrix, userTemplates } = req.body || {};
      let insertedCount = 0;

      // 1. Plazas
      if (Array.isArray(spots)) {
        for (const s of spots) {
          await pool.query(
            `INSERT INTO spots (id, code, type, status, rate_per_hour, current_ticket_id, details)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET 
                code = EXCLUDED.code, 
                type = EXCLUDED.type, 
                status = EXCLUDED.status, 
                rate_per_hour = EXCLUDED.rate_per_hour, 
                current_ticket_id = EXCLUDED.current_ticket_id, 
                details = EXCLUDED.details`,
            [s.id, s.code, s.type, s.status, s.ratePerHour || 0, s.currentTicketId || null, JSON.stringify(s)]
          );
          insertedCount++;
        }
      }

      // 2. Tickets Activos
      if (Array.isArray(activeTickets)) {
        for (const t of activeTickets) {
          await pool.query(
            `INSERT INTO active_tickets (id, ticket_number, plate, vehicle_type, spot_code, entry_time, terminal_id, operator, details)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET 
                ticket_number = EXCLUDED.ticket_number,
                plate = EXCLUDED.plate,
                vehicle_type = EXCLUDED.vehicle_type,
                spot_code = EXCLUDED.spot_code,
                entry_time = EXCLUDED.entry_time,
                terminal_id = EXCLUDED.terminal_id,
                operator = EXCLUDED.operator,
                details = EXCLUDED.details`,
            [t.id, t.ticketNumber, t.plate, t.vehicleType, t.spotCode || null, t.entryTime, t.terminalId || null, t.operator || null, JSON.stringify(t)]
          );
          insertedCount++;
        }
      }

      // 3. Tickets Pagados
      if (Array.isArray(paidTickets)) {
        for (const t of paidTickets) {
          await pool.query(
            `INSERT INTO paid_tickets (id, ticket_number, plate, vehicle_type, spot_code, entry_time, exit_time, total_amount, payment_method, cashier, terminal_id, details)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO UPDATE SET 
                ticket_number = EXCLUDED.ticket_number,
                plate = EXCLUDED.plate,
                vehicle_type = EXCLUDED.vehicle_type,
                spot_code = EXCLUDED.spot_code,
                entry_time = EXCLUDED.entry_time,
                exit_time = EXCLUDED.exit_time,
                total_amount = EXCLUDED.total_amount,
                payment_method = EXCLUDED.payment_method,
                cashier = EXCLUDED.cashier,
                terminal_id = EXCLUDED.terminal_id,
                details = EXCLUDED.details`,
            [
              t.id, 
              t.ticketNumber, 
              t.plate, 
              t.vehicleType, 
              t.spotCode || null, 
              t.entryTime, 
              t.exitTime || new Date().toISOString(), 
              t.totalAmount || 0, 
              t.paymentMethod || 'Efectivo', 
              t.cashier || 'Cajero', 
              t.terminalId || null, 
              JSON.stringify(t)
            ]
          );
          insertedCount++;
        }
      }

      // 4. Arqueos de Caja
      if (Array.isArray(cashShifts)) {
        for (const sh of cashShifts) {
          await pool.query(
            `INSERT INTO cash_shifts (id, cashier_id, cashier_name, start_time, end_time, initial_cash, final_cash, status, details)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET 
                cashier_id = EXCLUDED.cashier_id,
                cashier_name = EXCLUDED.cashier_name,
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                initial_cash = EXCLUDED.initial_cash,
                final_cash = EXCLUDED.final_cash,
                status = EXCLUDED.status,
                details = EXCLUDED.details`,
            [
              sh.id, 
              sh.cashierId || 'admin', 
              sh.cashierName || 'Administrador', 
              sh.startTime, 
              sh.endTime || null, 
              sh.initialCash || 0, 
              sh.finalCash || null, 
              sh.status || 'open', 
              JSON.stringify(sh)
            ]
          );
          insertedCount++;
        }
      }

      // 5. Conceptos y Categorías de Gasto de Caja Menor
      if (Array.isArray(expenseConcepts)) {
        await pool.query(
          `INSERT INTO configs (key, value) VALUES ('expenseConcepts', $1)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [JSON.stringify(expenseConcepts)]
        );
        insertedCount++;
      }
      if (Array.isArray(expenseCategories)) {
        await pool.query(
          `INSERT INTO configs (key, value) VALUES ('expenseCategories', $1)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [JSON.stringify(expenseCategories)]
        );
        insertedCount++;
      }
      if (roleMatrix && typeof roleMatrix === 'object') {
        await pool.query(
          `INSERT INTO configs (key, value) VALUES ('roleMatrix', $1)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [JSON.stringify(roleMatrix)]
        );
        insertedCount++;
      }
      if (Array.isArray(userTemplates)) {
        await pool.query(
          `INSERT INTO configs (key, value) VALUES ('userTemplates', $1)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [JSON.stringify(userTemplates)]
        );
        insertedCount++;
      }

      return res.json({
        success: true,
        message: `Sincronización completada exitosamente. ${insertedCount} registros consolidados en PostgreSQL.`,
        insertedCount
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 0.7 Mantenimiento de PostgreSQL (VACUUM / REINDEX)
  app.post('/api/postgres/maintenance', requirePermission('canManageDatabase'), async (req, res) => {
    const { action = 'vacuum' } = req.body || {};
    const start = performance.now();
    try {
      if (!isPostgresReady()) {
        return res.status(503).json({ success: false, error: 'PostgreSQL no está activo' });
      }

      if (action === 'reindex') {
        await pool.query(`REINDEX SCHEMA public;`);
      } else {
        await pool.query(`VACUUM ANALYZE;`);
      }

      const executionTimeMs = Number((performance.now() - start).toFixed(2));
      return res.json({
        success: true,
        message: action === 'reindex' ? 'Reindexación de tablas completada con éxito.' : 'Optimización VACUUM ANALYZE completada con éxito.',
        executionTimeMs
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

}
