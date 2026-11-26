import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

// Secretos de prueba (evita leer/crear data/.session_secret real)
process.env.SESSION_SECRET = 'test-session-secret-0123456789-abcdefghijklmnop';
process.env.SYNC_SHARED_KEY = 'test-sync-key-1234567890';

const express = (await import('express')).default;
const { apiAuthMiddleware, configureAuthz, issueSessionToken } = await import('../server/auth.ts');
const { registerTicketRoutes } = await import('../server/routes/tickets.ts');
const { registerSpotRoutes } = await import('../server/routes/spots.ts');
const { normalizeUserPermissions } = await import('../src/data/initialData.ts');

// Usuarios ficticios. Las rutas se prueban con cuerpo vacío: si el permiso alcanza, la ruta
// responde 400 por validación antes de tocar la base; si no alcanza, 403.
const USERS: Record<string, { role: string; permissions: Record<string, any> }> = {
  cajero: { role: 'cashier', permissions: {} },                                // valores por defecto del rol
  cajeroSinEntrada: { role: 'cashier', permissions: { canRegisterEntry: false } },
  supervisorAntiguo: { role: 'supervisor', permissions: {} },                  // sin claves nuevas guardadas
  soloBD: { role: 'cashier', permissions: { canRegisterEntry: false, canRegisterExit: false, canManageDatabase: true } },
};

let base = '';
let server: http.Server;

before(async () => {
  configureAuthz(async (id: string) => {
    const u = USERS[id];
    return u ? { role: u.role as any, isActive: true, permissions: normalizeUserPermissions(u.permissions as any, u.role as any) as any } : null;
  });
  const app = express();
  app.use(express.json());
  app.use(apiAuthMiddleware);
  registerTicketRoutes(app);
  registerSpotRoutes(app);
  server = http.createServer(app);
  await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => { server.close(); });

const tokenFor = (id: string, role = USERS[id]?.role || 'cashier') =>
  issueSessionToken({ id, username: id, name: id, role } as any).token;

async function call(user: string | null, method: string, path: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user) headers.Authorization = `Bearer ${tokenFor(user)}`;
  return (await fetch(base + path, { method, headers, body: method === 'DELETE' ? undefined : '{}' })).status;
}

describe('permisos en rutas de tickets', () => {
  test('sin sesión → 401', async () => {
    assert.equal(await call(null, 'POST', '/api/tickets/entry'), 401);
  });
  test('cajero puede registrar entrada y salida', async () => {
    assert.equal(await call('cajero', 'POST', '/api/tickets/entry'), 400);
    assert.equal(await call('cajero', 'POST', '/api/tickets/checkout'), 400);
  });
  test('cajero sin canRegisterEntry no registra entradas', async () => {
    assert.equal(await call('cajeroSinEntrada', 'POST', '/api/tickets/entry'), 403);
  });
  test('cajero no puede sobrescribir tickets pagados ni activos', async () => {
    assert.equal(await call('cajero', 'POST', '/api/tickets/paid'), 403);
    assert.equal(await call('cajero', 'POST', '/api/tickets/active'), 403);
  });
  test('canManageDatabase cubre el editor de tablas', async () => {
    assert.equal(await call('soloBD', 'POST', '/api/tickets/paid'), 400);
    assert.equal(await call('soloBD', 'POST', '/api/tickets/entry'), 400);
  });
  test('usuario desconocido → 403', async () => {
    assert.equal(await call('fantasma', 'POST', '/api/tickets/entry'), 403);
  });
});

describe('permisos en rutas de plazas', () => {
  test('cajero puede guardar plazas en bloque (entrada/salida)', async () => {
    assert.equal(await call('cajero', 'POST', '/api/spots/bulk'), 400);
  });
  test('cajero no administra plazas', async () => {
    assert.equal(await call('cajero', 'POST', '/api/spots'), 403);
    assert.equal(await call('cajero', 'POST', '/api/spots/delete-bulk'), 403);
    assert.equal(await call('cajero', 'DELETE', '/api/spots/A-01'), 403);
    assert.equal(await call('cajero', 'POST', '/api/spots/reconcile'), 403);
  });
  test('supervisor con permisos antiguos recibe los valores por defecto de su rol', async () => {
    assert.equal(await call('supervisorAntiguo', 'POST', '/api/spots'), 400);
    assert.equal(await call('supervisorAntiguo', 'POST', '/api/spots/delete-bulk'), 400);
    assert.equal(await call('supervisorAntiguo', 'PATCH', '/api/spots/status-bulk'), 400);
  });
});
