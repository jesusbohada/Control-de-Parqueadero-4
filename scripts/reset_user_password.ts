/**
 * Restablece la contraseña de un usuario directamente en PostgreSQL (con hash scrypt).
 * Úselo cuando nadie puede ingresar al sistema (por ejemplo, el administrador olvidó su clave).
 *
 * Uso (desde la carpeta del proyecto, en el servidor):
 *   npx tsx scripts/reset_user_password.ts
 *
 * Pide el usuario y la nueva clave por consola. Requiere acceso a la BD (DATABASE_URL en .env).
 * Tras el cambio, ingrese con la nueva clave; el usuario puede cambiarla luego desde el sistema.
 */
import readline from 'readline';
import dotenv from 'dotenv';
import pg from 'pg';
import { hashPassword, validateNewPassword } from '../server/auth.ts';

dotenv.config({ quiet: true } as any);

function ask(rl: readline.Interface, q: string): Promise<string> {
  return new Promise(resolve => rl.question(q, a => resolve(a.trim())));
}

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('No se encontró DATABASE_URL en .env');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: url });
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const { rows } = await pool.query('SELECT id, username, name, role, is_active FROM users ORDER BY username');
    console.log('\nUsuarios registrados:');
    for (const u of rows) console.log(`  - ${u.username}  (${u.name}, rol: ${u.role}${u.is_active === false ? ', INACTIVO' : ''})`);

    const username = (await ask(rl, '\nUsuario a restablecer: ')).toLowerCase();
    const user = rows.find(u => String(u.username).toLowerCase() === username);
    if (!user) throw new Error(`El usuario "${username}" no existe.`);

    const pass1 = await ask(rl, 'Nueva contraseña (mín. 6 caracteres): ');
    const pass2 = await ask(rl, 'Repita la nueva contraseña: ');
    if (pass1 !== pass2) throw new Error('Las contraseñas no coinciden.');
    const policyError = validateNewPassword(pass1, user.username);
    if (policyError) throw new Error(policyError);

    await pool.query('UPDATE users SET pin = $1, is_active = TRUE WHERE id = $2', [hashPassword(pass1), user.id]);
    console.log(`\n✅ Contraseña de "${user.username}" restablecida. Ya puede ingresar con la nueva clave.`);
  } catch (e: any) {
    console.error(`\n❌ ${e.message}`);
    process.exitCode = 1;
  } finally {
    rl.close();
    await pool.end();
  }
})();
