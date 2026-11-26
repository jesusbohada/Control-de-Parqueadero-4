import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Secretos de prueba (evita leer/crear data/.session_secret real)
process.env.SESSION_SECRET = 'test-session-secret-0123456789-abcdefghijklmnop';
process.env.SYNC_SHARED_KEY = 'test-sync-key-1234567890';

const auth = await import('../server/auth.ts');
const {
  hashPassword, verifyPassword, isPasswordHash, preparePasswordForStorage, exposePasswordFor,
  issueSessionToken, verifySessionToken, revokeSession,
  signSsoToken, verifySsoToken,
  validateNewPassword, isDefaultOrTrivialPassword,
  AttemptLimiter, agentKeyFor, verifyAgentKey, authorizeWsRequest,
} = auth;

const wsReq = (url: string) => ({ url, socket: { remoteAddress: '127.0.0.1' } } as any);

describe('contraseñas', () => {
  test('hash y verificación', () => {
    const h = hashPassword('ClaveSegura9');
    assert.ok(isPasswordHash(h));
    assert.equal(verifyPassword(h, 'ClaveSegura9').ok, true);
    assert.equal(verifyPassword(h, 'otra').ok, false);
  });

  test('dos hashes de la misma clave son distintos (sal aleatoria)', () => {
    assert.notEqual(hashPassword('x'), hashPassword('x'));
  });

  test('clave legada en texto plano: valida y pide re-hash', () => {
    assert.deepEqual(verifyPassword('caja123', 'caja123'), { ok: true, needsRehash: true });
    assert.equal(verifyPassword('caja123', 'caja124').ok, false);
  });

  test('clave vacía o sin valor almacenado nunca valida', () => {
    assert.equal(verifyPassword('', '').ok, false);
    assert.equal(verifyPassword(null, 'x').ok, false);
  });

  test('preparePasswordForStorage', () => {
    const existing = hashPassword('vieja1');
    assert.equal(preparePasswordForStorage('', existing), existing, 'vacío conserva la actual');
    assert.equal(preparePasswordForStorage(existing, null), existing, 'un hash se guarda tal cual');
    const stored = preparePasswordForStorage('nueva123', existing);
    assert.ok(isPasswordHash(stored) && verifyPassword(stored, 'nueva123').ok, 'texto plano se hashea');
  });

  test('exposePasswordFor: solo el maestro recibe el hash, nunca texto plano', () => {
    const h = hashPassword('x');
    const master = { kind: 'user', uid: '1', username: 'a', name: 'A', role: 'master' } as const;
    const cashier = { ...master, role: 'cashier' };
    assert.equal(exposePasswordFor(h, master), h);
    assert.equal(exposePasswordFor(h, cashier), '');
    assert.equal(exposePasswordFor('plano', master), '');
  });

  test('política de claves nuevas', () => {
    assert.match(validateNewPassword('abc', 'juan') ?? '', /6 caracteres/);
    assert.ok(validateNewPassword('admin123', 'juan'));
    assert.ok(validateNewPassword('juanito', 'juanito'));
    assert.equal(validateNewPassword('Parq-2026!', 'juan'), null);
  });

  test('detección de claves de fábrica o triviales', () => {
    assert.equal(isDefaultOrTrivialPassword('admin123', 'admin'), true);
    assert.equal(isDefaultOrTrivialPassword('1234', 'caja1'), true);
    assert.equal(isDefaultOrTrivialPassword('caja1', 'caja1'), true);
    assert.equal(isDefaultOrTrivialPassword('8392', 'caja1'), false);
  });
});

describe('sesiones', () => {
  const user = { id: 'u1', username: 'ana', name: 'Ana', role: 'supervisor' };

  test('token válido devuelve el usuario', () => {
    const { token } = issueSessionToken(user);
    const p = verifySessionToken(token);
    assert.equal(p?.uid, 'u1');
    assert.equal(p?.role, 'supervisor');
    assert.equal(p?.mustChangePassword, false);
  });

  test('token alterado se rechaza', () => {
    const { token } = issueSessionToken(user);
    const [v, body, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url').toString()), rol: 'master' })).toString('base64url');
    assert.equal(verifySessionToken(`${v}.${forged}.${sig}`), null);
    assert.equal(verifySessionToken('basura'), null);
  });

  test('token revocado (logout) se rechaza', () => {
    const { token } = issueSessionToken(user);
    revokeSession(verifySessionToken(token));
    assert.equal(verifySessionToken(token), null);
  });

  test('marca de cambio obligatorio viaja en el token', () => {
    const { token } = issueSessionToken(user, { mustChangePassword: true });
    assert.equal(verifySessionToken(token)?.mustChangePassword, true);
  });
});

describe('SSO Central → Sucursal', () => {
  test('token firmado se acepta una sola vez', () => {
    const t = signSsoToken({ id: 'u1', username: 'ana', name: 'Ana', role: 'master' })!;
    assert.equal(verifySsoToken(t)?.username, 'ana');
    assert.equal(verifySsoToken(t), null, 'reutilización rechazada');
  });

  test('token sin firma válida se rechaza', () => {
    const payload = Buffer.from(JSON.stringify({ u: { id: 'x', username: 'hacker', role: 'master' }, iat: Date.now(), jti: 'j' })).toString('base64url');
    assert.equal(verifySsoToken(`wzsso1.${payload}.firmafalsa`), null);
  });
});

describe('AttemptLimiter', () => {
  let limiter: InstanceType<typeof AttemptLimiter>;
  beforeEach(() => { limiter = new AttemptLimiter(3, 60_000, 60_000); });

  test('bloquea al llegar al máximo de fallos', () => {
    limiter.fail('k'); limiter.fail('k');
    assert.equal(limiter.check('k').allowed, true);
    limiter.fail('k');
    const c = limiter.check('k');
    assert.equal(c.allowed, false);
    assert.ok(c.retryAfterSec > 0);
  });

  test('un éxito reinicia el contador', () => {
    limiter.fail('k'); limiter.fail('k');
    limiter.succeed('k');
    limiter.fail('k'); limiter.fail('k');
    assert.equal(limiter.check('k').allowed, true);
  });

  test('las claves son independientes', () => {
    limiter.fail('a'); limiter.fail('a'); limiter.fail('a');
    assert.equal(limiter.check('b').allowed, true);
  });
});

describe('WebSocket y agente FarmaDesk', () => {
  test('llave de agente por sede', () => {
    assert.equal(verifyAgentKey('suc-001', agentKeyFor('suc-001')), true);
    assert.equal(verifyAgentKey('suc-002', agentKeyFor('suc-001')), false);
    assert.equal(verifyAgentKey('suc-001', undefined), false);
  });

  test('admin sin credenciales se rechaza', () => {
    assert.equal(authorizeWsRequest(wsReq('/ws?type=admin&branchId=suc-001')).ok, false);
  });

  test('admin con sesión es de confianza', () => {
    const { token } = issueSessionToken({ id: 'u', username: 'u', role: 'master' });
    const r = authorizeWsRequest(wsReq(`/ws?type=admin&branchId=suc-001&auth=${encodeURIComponent(token)}`));
    assert.deepEqual([r.ok, r.trusted], [true, true]);
  });

  test('sesión con cambio de clave pendiente no puede abrir WebSocket', () => {
    const { token } = issueSessionToken({ id: 'u', username: 'u', role: 'master' }, { mustChangePassword: true });
    assert.equal(authorizeWsRequest(wsReq(`/ws?type=admin&auth=${encodeURIComponent(token)}`)).ok, false);
  });

  test('sede con clave de sync es de confianza; con clave errada se rechaza', () => {
    assert.equal(authorizeWsRequest(wsReq('/ws?type=branch&syncKey=test-sync-key-1234567890')).trusted, true);
    assert.equal(authorizeWsRequest(wsReq('/ws?type=branch&syncKey=mala')).ok, false);
  });

  test('agente: solo con su llave y nunca de confianza (no puede enviar comandos)', () => {
    const ok = authorizeWsRequest(wsReq(`/ws?type=farmadesk-agent&branchId=suc-001&agentKey=${agentKeyFor('suc-001')}`));
    assert.deepEqual([ok.ok, ok.trusted], [true, false]);
    assert.equal(authorizeWsRequest(wsReq('/ws?type=farmadesk-agent&branchId=suc-001')).ok, false);
  });
});
