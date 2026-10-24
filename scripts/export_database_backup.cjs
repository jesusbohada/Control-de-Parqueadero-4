const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function createBackup() {
  const backupsDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // Detect port 5432 or 5433 or from DATABASE_URL
  const connString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/wolfzonepos_db';
  let pool = new Pool({ connectionString: connString });

  try {
    // Test connection
    await pool.query('SELECT 1');
  } catch (err) {
    // Try fallback port 5433
    pool = new Pool({ connectionString: 'postgresql://postgres:password@localhost:5433/wolfzonepos_db' });
  }

  try {
    const [spots, act, paid, shifts, cfg, usr, aud, subs] = await Promise.all([
      pool.query('SELECT * FROM spots').catch(() => ({ rows: [] })),
      pool.query('SELECT * FROM active_tickets').catch(() => ({ rows: [] })),
      pool.query('SELECT * FROM paid_tickets').catch(() => ({ rows: [] })),
      pool.query('SELECT * FROM cash_shifts').catch(() => ({ rows: [] })),
      pool.query('SELECT * FROM configs').catch(() => ({ rows: [] })),
      pool.query('SELECT * FROM users').catch(() => ({ rows: [] })),
      pool.query('SELECT * FROM audit_logs').catch(() => ({ rows: [] })),
      pool.query('SELECT * FROM subscribers').catch(() => ({ rows: [] }))
    ]);

    const backup = {
      version: 'wolfzonepos-postgresql-v1',
      exportedAt: new Date().toISOString(),
      databaseEngine: 'PostgreSQL',
      spots: spots.rows,
      activeTickets: act.rows,
      paidTickets: paid.rows,
      cashShifts: shifts.rows,
      configs: cfg.rows,
      users: usr.rows,
      auditLogs: aud.rows,
      subscribers: subs.rows
    };

    const safeDate = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_manual_${safeDate}.json`;
    const dest = path.join(backupsDir, filename);

    fs.writeFileSync(dest, JSON.stringify(backup, null, 2), 'utf8');
    const stats = fs.statSync(dest);
    const sizeKb = (stats.size / 1024).toFixed(1);

    console.log(`[OK] Respaldo generado con éxito: ${filename} (${sizeKb} KB)`);
    return dest;
  } catch (err) {
    console.error(`[ERROR] No se pudo crear el respaldo: ${err.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createBackup();
