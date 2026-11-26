# Despliegue de la actualización de seguridad (noviembre 2026)

Esta guía lleva a producción los cambios integrados en `main` (PR #1 a #7): sesiones firmadas, claves en hash, permisos por rol en el servidor, sincronización segura Central ↔ sedes y la división interna del servidor.

**Orden obligatorio:** primero el **Servidor Central**, después **cada sede**.
Haz cada equipo fuera del horario de operación o con la taquilla sin vehículos en cobro.

---

## 0. Antes de empezar (una sola vez)

1. Ten a mano la **clave de sincronización** (`SYNC_SHARED_KEY`). Ya está generada en el `.env` del equipo de desarrollo. Para verla, en PowerShell, dentro de la carpeta del proyecto:

   ```powershell
   Select-String -Path .env -Pattern '^SYNC_SHARED_KEY='
   ```

   Esa misma línea, **idéntica**, va en el Central y en todas las sedes. Trátala como una contraseña: no la envíes por chat ni la pegues en documentos compartidos.

2. Anota la **IP del Servidor Central** en la red (por ejemplo `192.168.10.150`) y su puerto (por defecto `3000`).

---

## 1. Servidor Central

1. **Respaldo:** copia la carpeta `data\`, el archivo `global-config.json` y el `.env` a un lugar seguro.
2. **Actualizar el código:** ejecuta `ACTUALIZAR_SISTEMA.bat` (o, en PowerShell, `git pull origin main`).
3. **Editar `.env`:** agrega al final la línea `SYNC_SHARED_KEY=...` (la del paso 0). **No** pongas `CENTRAL_SERVER_URL` en el Central.
4. **Reiniciar:** `REINICIAR_PARQUEADERO.bat`.
5. **Primer ingreso:** inicia sesión como administrador. Si el usuario tiene una clave de fábrica o muy común, el sistema obliga a cambiarla (mínimo 6 caracteres). Haz lo mismo con cada usuario o pídeles que lo hagan en su primer ingreso.
6. **Publicar usuarios a las sedes:** entra a *Usuarios y Cajeros*, abre cualquier usuario (por ejemplo el propio administrador) y pulsa *Guardar*. Al guardar un usuario en el Central se reescribe `global-config.json` **sin claves**; las sedes recibirán los usuarios con la clave en hash.

## 2. Cada sede

1. **Respaldo:** igual que en el Central (`data\`, `.env`).
2. **Actualizar el código:** `ACTUALIZAR_SISTEMA.bat` o `git pull origin main`.
3. **Editar `.env`:** agrega
   ```
   SYNC_SHARED_KEY=<la misma del Central>
   CENTRAL_SERVER_URL=http://<IP-del-Central>:3000
   ```
   Opcional: `CENTRAL_SYNC_INTERVAL_MIN=5` (cada cuántos minutos trae usuarios del Central; por defecto 5).
4. **Reiniciar:** `REINICIAR_PARQUEADERO.bat`.
5. **Verificar:** a los pocos segundos, los usuarios del Central deben poder iniciar sesión en la sede con **la misma clave que usan en el Central**.

> **Importante:** al activar `CENTRAL_SERVER_URL`, la sede adopta los usuarios del Central (se actualizan por identificador). Si una sede tiene usuarios propios que no existen en el Central, créalos primero en el Central.

## 3. Agentes FarmaDesk (escritorio remoto)

Los agentes instalados antes de esta actualización **no se conectarán**: ahora cada agente necesita una llave por sede. En cada equipo con agente, vuelve a descargar e instalar el agente desde el panel FarmaDesk de su sede.

## 4. Comprobación final (en cada equipo)

- [ ] Login de administrador y de un cajero.
- [ ] Cajero: registrar entrada, cobrar salida, cerrar turno, imprimir.
- [ ] Un cajero **no** ve ni puede usar Usuarios, Base de Datos ni Gestión de Plazas.
- [ ] En el Central: el panel de sedes muestra la sede conectada.
- [ ] Impresora térmica y cajón monedero responden.

---

## Si algo sale mal

- **Nadie puede entrar / olvidaron la clave:** en la carpeta del proyecto, `npx tsx scripts/reset_user_password.ts` y sigue las preguntas.
- **La sede no recibe usuarios:** revisa que `SYNC_SHARED_KEY` sea idéntica en ambos equipos y que `CENTRAL_SERVER_URL` responda desde la sede (`http://<IP>:3000/api/health` en el navegador).
- **Volver atrás:** restaura el `.env` y `data\` del respaldo y vuelve al commit anterior con `git checkout <commit>`; reinicia.

## Riesgo conocido (pendiente)

Si la base de datos configurada en `DATABASE_URL` no responde, el servidor intenta conectarse por su cuenta a `wolfzonepos_db` en el puerto 5433/5432 probando contraseñas comunes, y reescribe el `.env`. En un equipo con varias bases esto puede conectar a la equivocada. Se corregirá en un cambio aparte; mientras tanto, verifica en el arranque la línea `[PostgreSQL] Conexión establecida exitosamente a: ...`.
