const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/wolfzonepos_db'
});

async function resetDb() {
  console.log('--- Cleaning PostgreSQL Database ---');
  await pool.query('TRUNCATE TABLE active_tickets CASCADE;');
  console.log('✓ active_tickets truncated (0 records)');

  await pool.query('TRUNCATE TABLE paid_tickets CASCADE;');
  console.log('✓ paid_tickets truncated (0 records)');

  await pool.query('TRUNCATE TABLE cash_shifts CASCADE;');
  console.log('✓ cash_shifts truncated (0 records)');

  await pool.query('TRUNCATE TABLE subscribers CASCADE;');
  console.log('✓ subscribers truncated (0 records)');

  await pool.query("UPDATE spots SET status = 'available', current_ticket_id = NULL;");
  console.log('✓ spots reset to available (0 occupied)');

  await pool.query('TRUNCATE TABLE audit_logs CASCADE;');
  await pool.query(`
    INSERT INTO audit_logs (id, timestamp, terminal_id, action, details, operator)
    VALUES ($1, NOW(), $2, $3, $4, $5)
  `, [
    'log-init-001',
    'TAQUILLA-01',
    'SYSTEM_BOOT',
    JSON.stringify({ message: 'Sistema inicializado en limpio desde la línea de partida operativa' }),
    'Administrador Maestro'
  ]);
  console.log('✓ audit_logs reset with single initial clean-boot log');

  const cleanShift = {
    id: 'shift-init',
    shiftNumber: 0,
    operationalDayId: 'day-clean-01',
    operationalDayNumber: 0,
    operatorName: '',
    startTime: new Date().toISOString(),
    initialCash: 0,
    finalCountedCash: 0,
    status: 'closed',
    cashMovements: []
  };
  await pool.query(
    `INSERT INTO configs (key, value) VALUES ('currentShift', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify(cleanShift)]
  );
  console.log('✓ currentShift reset to closed in configs');

  console.log('\n--- Final Row Counts in PostgreSQL ---');
  const tables = ['spots', 'active_tickets', 'paid_tickets', 'cash_shifts', 'users', 'configs', 'audit_logs', 'subscribers'];
  for (const t of tables) {
    const res = await pool.query('SELECT count(*)::int as cnt FROM ' + t);
    console.log(`  ${t.padEnd(16)}: ${res.rows[0].cnt}`);
  }

  pool.end();
}

resetDb().catch(err => {
  console.error('Reset error:', err);
  pool.end();
  process.exit(1);
});
