# Control de Parqueadero (WolfZone POS / FarmaDesk)

Sistema POS de parqueadero multi-sede. Responder siempre en español.

## Stack
- Backend: `server.ts` (Express + `pg` + `ws`, ~5.7k líneas) + módulos en `server/`: `auth.ts` (seguridad), `centralSync.ts` (sync servidor↔servidor) y `routes/*.ts` (`registerXRoutes(app, deps)`: ai, audit, databaseMaintenance, farmadesk, printing, subscribers, system). Arranque: `npm run dev` (tsx). Puerto 3000 (LAN), 3001 (WAN sucursales), 9050 (FarmaDesk).
- Rutas nuevas: en el módulo de `server/routes/` correspondiente, no en `server.ts`. Pendiente de extraer: tickets, shifts, users/auth, config, dian, spots, postgres, bootstrap y sync.
- Frontend: React 19 + Vite 6 + Tailwind 4, en `src/`. Entrada `src/App.tsx` (~5.9k líneas).
- BD: PostgreSQL 16 (`database_schema.sql`); fallback en memoria (`memoryStoreRef`) si PG no está listo.
- Impresión térmica / cajón: `scripts/*.ps1` vía `execFile('powershell.exe')`.
- IA: Gemini (`@google/genai`) para pronósticos y ANPR.

## Comandos
- Verificación completa: `npm run verify` (typecheck + pruebas). Debe pasar antes de cada commit.
- Typecheck: `npm run typecheck` (0 errores; no introducir nuevos).
- Pruebas: `npm test` (`node:test` + tsx, en `tests/*.test.ts`). Cubren tarifas, contabilidad/PUC y seguridad.
- Build: `npm run build`. CI: `.github/workflows/ci.yml`.
- Restablecer clave de un usuario: `npx tsx scripts/reset_user_password.ts`.

## Mapa rápido (leer solo lo necesario)
- Rutas API: `grep -n "app\.\(get\|post\|put\|delete\|patch\)(" server.ts`
- Tipos/permisos RBAC: `src/types.ts` (`UserPermissions`).
- Sync central ↔ sucursales: `src/services/centralSyncService.ts`, `/api/sync/*`.
- Tickets/turnos: `/api/tickets/*`, `/api/shifts/*`, `src/components/OperationsView.tsx`, `CashShiftModal.tsx`.

## Reglas de trabajo
- Archivos gigantes: usar `grep -n` + lectura por rangos (`offset/limit`); nunca leer `server.ts` o `App.tsx` completos.
- No tocar `data/`, `backups/`, `global-config.json`, `.env` (datos reales de operación).
- Cambios pequeños e incrementales; un commit por cambio lógico, mensajes estilo `feat(scope): ...` / `fix(scope): ...`.
- Seguridad (`server/auth.ts`): todo /api exige sesión (Bearer) salvo `PUBLIC_ROUTES`; /api/sync/* acepta `X-Sync-Key` (`SYNC_SHARED_KEY`). Rutas sensibles usan `requirePermission(...)`/`requireMaster`. Claves de usuario: hash scrypt; nunca devolver ni guardar texto plano en el cliente.
- Frontend: `src/utils/authSession.ts` intercepta `fetch` (token/sync key). Descargas por navegación directa → `withAccessToken(url)`.
- WebSocket `/ws`: credencial en la URL (`auth`, `syncKey` o `agentKey` del agente FarmaDesk); eventos de control (mouse/teclado) solo desde conexiones de confianza. Login/PIN con límite de intentos (`AttemptLimiter`); claves de fábrica obligan a cambiarla (`mustChangePassword`).
- Sync servidor↔servidor (`server/centralSync.ts`): las sucursales con `CENTRAL_SERVER_URL` + `SYNC_SHARED_KEY` traen usuarios del Central. La clave de sync solo sirve para rutas de nodo; operaciones de administración de red (`POST global-config`, paquetes, versiones, despliegues, borrar sedes, `server-config`) exigen sesión de usuario con permiso. `global-config` nunca entrega ni guarda claves para navegadores.
- Nunca usar `exec` con strings interpolados; usar `execFile` con argumentos.

## Modo de trabajo con modelos
- Líder: el modelo más capaz de la sesión (Opus) — arquitectura, seguridad, revisión, decisiones.
- Búsquedas amplias en el código: subagente `Explore` (modelo económico).
- Tareas mecánicas bien especificadas (renombres, textos, estilos): subagente con `model: sonnet` o `haiku`.
- Esfuerzo bajo/medio por defecto; alto solo en seguridad, dinero (caja, cierres, DIAN) y migraciones de BD.
