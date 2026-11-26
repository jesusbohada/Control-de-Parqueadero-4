import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const { databaseNameOf, discoveryCandidates } = await import('../src/db.ts');

describe('conexión a PostgreSQL: nunca cambiar de base de datos', () => {
  test('nombre de la base desde la URL', () => {
    assert.equal(databaseNameOf('postgresql://u:p@localhost:5433/mi_sede'), 'mi_sede');
    assert.equal(databaseNameOf('postgresql://u:p@localhost:5433/'), 'wolfzonepos_db');
    assert.equal(databaseNameOf('no-es-url'), 'wolfzonepos_db');
  });

  test('las alternativas usan SIEMPRE la base configurada', () => {
    const c = discoveryCandidates('postgresql://postgres:mala@localhost:5433/wolfzonepos_e2e_sede', true);
    assert.ok(c.length > 0);
    for (const { testUrl } of c) assert.equal(databaseNameOf(testUrl), 'wolfzonepos_e2e_sede');
    assert.ok(!c.some(x => databaseNameOf(x.testUrl) === 'wolfzonepos_db'));
  });

  test('prueba primero el puerto configurado', () => {
    const c = discoveryCandidates('postgresql://postgres:x@localhost:6543/base_x', true);
    assert.equal(c[0].port, 6543);
    assert.deepEqual(Array.from(new Set(c.map(x => x.port))), [6543, 5433, 5432]);
  });

  test('base configurada en otro equipo: no se prueba nada más', () => {
    assert.equal(discoveryCandidates('postgresql://postgres:x@192.168.10.150:5432/wolfzonepos_db', true).length, 0);
  });

  test('instalación sin configurar: autodescubrimiento local de wolfzonepos_db', () => {
    const c = discoveryCandidates('postgresql://postgres:password@localhost:5433/wolfzonepos_db', false);
    assert.ok(c.length > 0);
    assert.ok(c.every(x => databaseNameOf(x.testUrl) === 'wolfzonepos_db'));
  });
});
