# Control de Parqueadero (WolfZone POS / FarmaDesk)

Sistema POS de parqueadero multi-sede. Responder siempre en español.

## Stack
- Backend: `server.ts` (Express + `pg` + `ws`, ~7.7k líneas, un solo archivo). Arranque: `npm run dev` (tsx). Puerto 3000 (LAN), 3001 (WAN sucursales), 9050 (FarmaDesk).
- Frontend: React 19 + Vite 6 + Tailwind 4, en `src/`. Entrada `src/App.tsx` (~5.9k líneas).
- BD: PostgreSQL 16 (`database_schema.sql`); fallback en memoria (`memoryStoreRef`) si PG no está listo.
- Impresión térmica / cajón: `scripts/*.ps1` vía `execFile('powershell.exe')`.
- IA: Gemini (`@google/genai`) para pronósticos y ANPR.

## Comandos
- Typecheck: `npx tsc --noEmit` (hoy hay ~34 errores preexistentes; no agregar nuevos).
- Build: `npm run build`. No hay suite de pruebas automatizadas todavía.

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
- Nunca usar `exec` con strings interpolados; usar `execFile` con argumentos.

## Modo de trabajo con modelos
- Líder: el modelo más capaz de la sesión (Opus) — arquitectura, seguridad, revisión, decisiones.
- Búsquedas amplias en el código: subagente `Explore` (modelo económico).
- Tareas mecánicas bien especificadas (renombres, textos, estilos): subagente con `model: sonnet` o `haiku`.
- Esfuerzo bajo/medio por defecto; alto solo en seguridad, dinero (caja, cierres, DIAN) y migraciones de BD.
