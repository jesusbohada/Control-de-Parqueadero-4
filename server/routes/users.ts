/**
 * Rutas de la API (users). Se registran desde startServer() en server.ts.
 */
import express from 'express';
import { SystemUser } from '../../src/types.ts';
import {
  requirePermission,
  verifyPassword,
  hashPassword,
  isPasswordHash,
  preparePasswordForStorage,
  exposePasswordFor,
  issueSessionToken,
  revokeSession,
  getSyncKey,
  signSsoToken,
  verifySsoToken,
  isDefaultOrTrivialPassword,
  validateNewPassword,
} from '../auth.ts';
import pool, { isPostgresReady, memoryStoreRef } from '../../src/db.ts';
import { 
  normalizeUser
} from '../../src/data/initialData.ts';

export interface RegisterUserRoutesDeps {
  getStoredPin: (userId: string) => Promise<string | null>;
  limitLogin: express.RequestHandler[];
  limitPin: express.RequestHandler;
  rowToPublicUser: (r: any, viewer?: Express.Request['auth'] | null) => SystemUser;
  sanitizeUserForClient: (u: SystemUser, viewer?: Express.Request['auth'] | null) => SystemUser;
}

export function registerUserRoutes(app: express.Express, ctx: RegisterUserRoutesDeps) {
  const { getStoredPin, limitLogin, limitPin, rowToPublicUser, sanitizeUserForClient } = ctx;
  // ==============================================================================
  // 5. USUARIOS (users)
  // ==============================================================================
  app.get('/api/users', async (req, res) => {
    try {
      if (isPostgresReady()) {
        const usersRes = await pool.query('SELECT * FROM users ORDER BY name ASC');
        const users: SystemUser[] = usersRes.rows.map(r => rowToPublicUser(r, req.auth));
        return res.json({ success: true, users: users.map(normalizeUser) });
      }
      res.json({ success: true, users: Array.from(memoryStoreRef.users.values()).map(u => sanitizeUserForClient(normalizeUser(u), req.auth)) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/users', requirePermission('canManageUsers'), async (req, res) => {
    const { user } = req.body;
    if (!user?.id || !user?.username) return res.status(400).json({ error: 'Datos de usuario inválidos' });
    const incomingPassword = String(user.pin || user.password || '').trim();
    if (incomingPassword && !isPasswordHash(incomingPassword)) {
      const policyError = validateNewPassword(incomingPassword, user.username);
      if (policyError) return res.status(400).json({ success: false, error: policyError });
    }
    try {
      if (isPostgresReady()) {
        await pool.query(`
          INSERT INTO users (id, username, role, name, pin, is_active, permissions, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            role = EXCLUDED.role,
            name = EXCLUDED.name,
            pin = EXCLUDED.pin,
            is_active = EXCLUDED.is_active,
            permissions = EXCLUDED.permissions
        `, [
          user.id,
          user.username,
          user.role || 'cashier',
          user.name || user.username,
          preparePasswordForStorage(user.pin || user.password || '', await getStoredPin(user.id)),
          user.isActive !== false,
          JSON.stringify(user.permissions || {}),
          user.createdAt || new Date().toISOString()
        ]);
      } else {
        const existing = memoryStoreRef.users.get(user.id);
        memoryStoreRef.users.set(user.id, { ...user, password: preparePasswordForStorage(user.pin || user.password || '', existing?.password) });
      }
      res.json({ success: true, user: { ...normalizeUser(user), password: exposePasswordFor(await getStoredPin(user.id), req.auth) } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/users/bulk', requirePermission('canManageUsers'), async (req, res) => {
    const { users } = req.body;
    if (!Array.isArray(users)) return res.status(400).json({ error: 'Array de usuarios esperado' });
    try {
      if (isPostgresReady()) {
        for (const user of users) {
          await pool.query(`
            INSERT INTO users (id, username, role, name, pin, is_active, permissions, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
              username = EXCLUDED.username,
              role = EXCLUDED.role,
              name = EXCLUDED.name,
              pin = EXCLUDED.pin,
              is_active = EXCLUDED.is_active,
              permissions = EXCLUDED.permissions
          `, [
            user.id,
            user.username,
            user.role || 'cashier',
            user.name || user.username,
            preparePasswordForStorage(user.pin || user.password || '', await getStoredPin(user.id)),
            user.isActive !== false,
            JSON.stringify(user.permissions || {}),
            user.createdAt || new Date().toISOString()
          ]);
        }
      } else {
        users.forEach(u => {
          const existing = memoryStoreRef.users.get(u.id);
          memoryStoreRef.users.set(u.id, { ...u, password: preparePasswordForStorage(u.pin || u.password || '', existing?.password) });
        });
      }
      res.json({ success: true, count: users.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/users/:id', requirePermission('canManageUsers'), async (req, res) => {
    const { id } = req.params;
    try {
      if (isPostgresReady()) {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
      } else {
        memoryStoreRef.users.delete(id);
      }
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // AUTENTICACIÓN Y VALIDACIÓN DE SESIONES
  // -------------------------------------------------------------
  app.post('/api/auth/login', ...limitLogin, async (req, res) => {
    try {
      const { username, password } = req.body;
      const cleanUser = String(username || '').trim().toLowerCase();
      const cleanPass = String(password || '').trim();

      if (!cleanUser || !cleanPass) {
        return res.status(400).json({ success: false, error: 'Usuario y clave requeridos' });
      }

      let foundUser: SystemUser | null = null;
      if (isPostgresReady()) {
        const query = `
          SELECT * FROM users 
          WHERE LOWER(username) = $1 
             OR (LOWER($1) = 'cajero' AND LOWER(username) = 'caja') 
             OR (LOWER($1) = 'caja' AND LOWER(username) = 'cajero')
          ORDER BY (LOWER(username) = $1) DESC
          LIMIT 1
        `;
        const qRes = await pool.query(query, [cleanUser]);
        if (qRes.rows.length > 0) {
          const r = qRes.rows[0];
          foundUser = normalizeUser({
            id: r.id,
            username: r.username,
            role: r.role,
            name: r.name,
            password: r.pin || '',
            isActive: r.is_active !== undefined && r.is_active !== null ? Boolean(r.is_active) : true,
            permissions: r.permissions || {},
            createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)
          });
        }
      } else {
        const list = Array.from(memoryStoreRef.users.values());
        // La coincidencia exacta tiene prioridad sobre el alias cajero ↔ caja
        foundUser = list.find(u => u.username.toLowerCase() === cleanUser) || list.find(u => {
          const uName = u.username.toLowerCase();
          return (cleanUser === 'cajero' && uName === 'caja') || (cleanUser === 'caja' && uName === 'cajero');
        }) || null;
      }

      if (!foundUser) {
        return res.status(401).json({ success: false, error: 'El usuario ingresado no existe en el sistema' });
      }

      if (foundUser.isActive === false) {
        return res.status(403).json({ success: false, error: 'Este usuario se encuentra desactivado. Consulta con el Administrador.' });
      }

      const check = verifyPassword(foundUser.password, cleanPass);
      if (!check.ok) {
        return res.status(401).json({ success: false, error: 'Contraseña o PIN incorrecto' });
      }

      // Migración transparente de clave legada en texto plano → hash
      if (check.needsRehash) {
        const newHash = hashPassword(cleanPass);
        if (isPostgresReady()) {
          await pool.query('UPDATE users SET pin = $1 WHERE id = $2', [newHash, foundUser.id]);
        } else {
          const mem = memoryStoreRef.users.get(foundUser.id);
          if (mem) memoryStoreRef.users.set(foundUser.id, { ...mem, password: newHash });
        }
      }

      // Clave de fábrica o trivial → sesión restringida hasta que la cambie
      const mustChangePassword = isDefaultOrTrivialPassword(cleanPass, foundUser.username);
      const session = issueSessionToken(foundUser, { mustChangePassword });
      const principal = { kind: 'user' as const, uid: foundUser.id, username: foundUser.username, name: foundUser.name, role: foundUser.role };
      res.json({
        success: true,
        user: sanitizeUserForClient(foundUser, principal),
        token: session.token,
        expiresAt: session.expiresAt,
        mustChangePassword,
        loginTimestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('[Auth Login Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Sesión actual (valida el token del cliente)
  app.get('/api/auth/me', (req, res) => {
    const a = req.auth;
    if (!a || a.kind !== 'user') return res.status(401).json({ success: false, code: 'AUTH_REQUIRED' });
    res.json({ success: true, user: { id: a.uid, username: a.username, name: a.name, role: a.role }, expiresAt: a.exp ? new Date(a.exp).toISOString() : null });
  });

  // Cambio de contraseña del usuario en sesión (obligatorio si ingresó con una clave de fábrica)
  app.post('/api/auth/change-password', limitPin, async (req, res) => {
    const a = req.auth;
    if (!a || a.kind !== 'user') return res.status(401).json({ success: false, code: 'AUTH_REQUIRED' });
    const currentPassword = String(req.body?.currentPassword || '').trim();
    const newPassword = String(req.body?.newPassword || '').trim();
    try {
      const stored = await getStoredPin(a.uid);
      if (!verifyPassword(stored, currentPassword).ok) {
        return res.status(401).json({ success: false, error: 'La contraseña actual no es correcta.' });
      }
      const policyError = validateNewPassword(newPassword, a.username);
      if (policyError) return res.status(400).json({ success: false, error: policyError });
      if (verifyPassword(stored, newPassword).ok) {
        return res.status(400).json({ success: false, error: 'La nueva contraseña debe ser distinta de la actual.' });
      }
      const newHash = hashPassword(newPassword);
      if (isPostgresReady()) {
        await pool.query('UPDATE users SET pin = $1 WHERE id = $2', [newHash, a.uid]);
      } else {
        const mem = memoryStoreRef.users.get(a.uid);
        if (mem) memoryStoreRef.users.set(a.uid, { ...mem, password: newHash });
      }
      revokeSession(a);
      const session = issueSessionToken({ id: a.uid, username: a.username, name: a.name, role: a.role });
      console.log(`[Seguridad] Contraseña actualizada para @${a.username}`);
      res.json({ success: true, token: session.token, expiresAt: session.expiresAt });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    revokeSession(req.auth);
    res.json({ success: true });
  });

  // Clave compartida de sincronización para que el navegador de la terminal hable con el Central.
  // Solo para usuarios autenticados; null si no está configurada (modo compatible).
  app.get('/api/auth/sync-key', (req, res) => {
    if (!req.auth || req.auth.kind !== 'user') return res.status(401).json({ success: false, code: 'AUTH_REQUIRED' });
    res.json({ success: true, syncKey: getSyncKey() });
  });

  // SSO Central → Sucursal: el Central firma un token de un solo uso (2 min) para el usuario en sesión.
  app.post('/api/auth/sso-token', async (req, res) => {
    const a = req.auth;
    if (!a || a.kind !== 'user') return res.status(401).json({ success: false, code: 'AUTH_REQUIRED' });
    let permissions: Record<string, any> | undefined;
    try {
      if (isPostgresReady()) {
        const r = await pool.query('SELECT permissions FROM users WHERE id = $1 LIMIT 1', [a.uid]);
        permissions = r.rows[0]?.permissions || undefined;
      } else {
        permissions = (memoryStoreRef.users.get(a.uid)?.permissions as any) || undefined;
      }
    } catch { /* sin permisos detallados: la sucursal aplicará los del rol */ }
    const token = signSsoToken({ id: a.uid, username: a.username, name: a.name, role: a.role, permissions });
    if (!token) {
      return res.status(409).json({ success: false, error: 'SSO deshabilitado: configure SYNC_SHARED_KEY (la misma clave) en el Central y en la sucursal.' });
    }
    res.json({ success: true, token });
  });

  // SSO: la sucursal valida la firma del Central y emite su propia sesión local.
  app.post('/api/auth/sso-exchange', limitLogin[1], (req, res) => {
    const ssoUser = verifySsoToken(String(req.body?.token || ''));
    if (!ssoUser) {
      return res.status(401).json({ success: false, error: 'Token SSO inválido, vencido o ya utilizado.' });
    }
    const session = issueSessionToken(ssoUser);
    res.json({ success: true, user: ssoUser, token: session.token, expiresAt: session.expiresAt });
  });

  app.post('/api/auth/verify-pin', limitPin, async (req, res) => {
    try {
      const { pin, userId, requiredRole, requiredPermission } = req.body;
      const cleanPin = String(pin || '').trim();
      if (!cleanPin) {
        return res.status(400).json({ success: false, error: 'PIN requerido' });
      }

      let candidateUsers: SystemUser[] = [];
      if (isPostgresReady()) {
        const usersRes = await pool.query('SELECT * FROM users');
        candidateUsers = usersRes.rows.map(r => normalizeUser({
          id: r.id,
          username: r.username,
          role: r.role,
          name: r.name,
          password: r.pin || '',
          isActive: r.is_active !== undefined && r.is_active !== null ? Boolean(r.is_active) : true,
          permissions: r.permissions || {},
          createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)
        }));
      } else {
        candidateUsers = Array.from(memoryStoreRef.users.values()).map(normalizeUser);
      }

      const matchedUser = candidateUsers.find(u => {
        if (userId && u.id !== userId) return false;
        if (u.isActive === false) return false;
        return verifyPassword(u.password, cleanPin).ok;
      });

      if (!matchedUser) {
        return res.status(401).json({ success: false, error: 'PIN de autorización inválido' });
      }

      if (requiredRole && matchedUser.role !== 'master' && matchedUser.role !== requiredRole) {
        return res.status(403).json({ success: false, error: `Se requiere rol de ${requiredRole} o superior` });
      }

      if (requiredPermission && matchedUser.role !== 'master' && !(matchedUser.permissions as any)?.[requiredPermission]) {
        return res.status(403).json({ success: false, error: `El usuario no tiene el permiso "${requiredPermission}"` });
      }

      res.json({
        success: true,
        authorized: true,
        user: { id: matchedUser.id, username: matchedUser.username, name: matchedUser.name, role: matchedUser.role }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

}
