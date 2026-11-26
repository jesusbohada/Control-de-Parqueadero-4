import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

process.env.SESSION_SECRET = 'test-session-secret-0123456789-abcdefghijklmnop';
process.env.SYNC_SHARED_KEY = 'test-sync-key-1234567890';

const { sanitizeCentralUsers, getCentralUrl, pullFromCentralNow, startCentralSync } = await import('../server/centralSync.ts');

describe('sanitizeCentralUsers', () => {
  test('descarta entradas inválidas y normaliza el usuario', () => {
    const r = sanitizeCentralUsers([
      { id: 'u1', username: ' Ana ', role: 'supervisor', password: 'scrypt$a$b' },
      { id: '', username: 'x' },
      { username: 'sin-id' },
      null,
      'texto',
    ]);
    assert.equal(r.length, 1);
    assert.equal(r[0].username, 'ana');
    assert.equal(r[0].isActive, true);
  });

  test('no es un arreglo → lista vacía', () => {
    assert.deepEqual(sanitizeCentralUsers({ users: [] }), []);
  });
});

describe('getCentralUrl', () => {
  test('normaliza la URL del Central', () => {
    process.env.CENTRAL_SERVER_URL = '192.168.1.10:3001/';
    assert.equal(getCentralUrl(), 'http://192.168.1.10:3001');
    process.env.CENTRAL_SERVER_URL = 'ftp://malo';
    assert.equal(getCentralUrl(), null);
    delete process.env.CENTRAL_SERVER_URL;
    assert.equal(getCentralUrl(), null);
  });
});

describe('pullFromCentralNow (Central simulado)', () => {
  let server: http.Server;
  let lastKey: string | undefined;
  let applied: any[] = [];

  before(async () => {
    server = http.createServer((req, res) => {
      lastKey = req.headers['x-sync-key'] as string | undefined;
      if (req.url !== '/api/sync/global-config' || lastKey !== 'test-sync-key-1234567890') {
        res.writeHead(401).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: { users: [
        { id: 'u1', username: 'ana', role: 'cashier', password: 'scrypt$x$y' },
        { id: 'u2', username: 'luis', role: 'supervisor', password: '' },
      ] } }));
    });
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
    process.env.CENTRAL_SERVER_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    startCentralSync(async users => { applied = users; return users.length; });
  });

  after(() => {
    server.close();
    delete process.env.CENTRAL_SERVER_URL;
  });

  test('envía la clave de sync y aplica los usuarios recibidos', async () => {
    const st = await pullFromCentralNow();
    assert.equal(lastKey, 'test-sync-key-1234567890');
    assert.equal(st.lastError, null);
    assert.equal(st.lastUsersApplied, 2);
    assert.deepEqual(applied.map(u => u.username), ['ana', 'luis']);
    assert.ok(st.lastSuccessAt);
  });

  test('clave incorrecta: registra el error y no aplica nada', async () => {
    applied = [];
    const original = process.env.SYNC_SHARED_KEY;
    process.env.SYNC_SHARED_KEY = 'otra-clave-distinta-123456';
    const st = await pullFromCentralNow();
    process.env.SYNC_SHARED_KEY = original;
    assert.match(st.lastError ?? '', /401/);
    assert.equal(applied.length, 0);
  });

  test('Central inaccesible: no lanza, deja el error en el estado', async () => {
    const prev = process.env.CENTRAL_SERVER_URL;
    process.env.CENTRAL_SERVER_URL = 'http://127.0.0.1:1';
    const st = await pullFromCentralNow();
    process.env.CENTRAL_SERVER_URL = prev;
    assert.ok(st.lastError);
  });

  test('sin CENTRAL_SERVER_URL el servicio queda deshabilitado', async () => {
    const prev = process.env.CENTRAL_SERVER_URL;
    delete process.env.CENTRAL_SERVER_URL;
    const st = await pullFromCentralNow();
    process.env.CENTRAL_SERVER_URL = prev;
    assert.equal(st.enabled, false);
    assert.match(st.reason ?? '', /CENTRAL_SERVER_URL/);
  });
});
