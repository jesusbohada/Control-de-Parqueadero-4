# Bitácora del proyecto — WolfZone POS (Control de Parqueadero)

Documento vivo: qué es el sistema, qué se ha hecho, en qué estado está cada equipo, qué falta y qué riesgos siguen abiertos.
**Regla:** se lee al empezar una sesión de trabajo y se actualiza al cerrar cada cambio (PR integrado, despliegue, decisión).
Nunca escribir aquí claves, tokens ni contenido de `.env`.

_Última actualización: 2026-11-27 (tarde)_

---

## 1. Qué es

POS de parqueadero multi-sede: entradas/salidas, cobro y tarifas, turnos y cierres de caja, abonados, contabilidad PUC, facturación DIAN, impresión térmica, ANPR/pronósticos con IA (Gemini) y agente remoto FarmaDesk.

- **Topología:** un **Servidor Central** y varias **sedes** (sucursales). Las sedes con `CENTRAL_SERVER_URL` + `SYNC_SHARED_KEY` traen los usuarios del Central.
- **Stack:** Express + PostgreSQL 16 (`server.ts` + `server/`), React 19 + Vite 6 + Tailwind 4 (`src/`). Puertos 3000 (LAN), 3001 (WAN sucursales), 9050 (FarmaDesk).
- Detalle técnico y reglas de trabajo: [`CLAUDE.md`](../CLAUDE.md).

## 2. Documentos relacionados

| Documento | Para qué |
|---|---|
| [`CLAUDE.md`](../CLAUDE.md) | Stack, comandos, reglas de seguridad y de trabajo |
| [`docs/ROADMAP.md`](ROADMAP.md) | Lo que viene: fases, prioridades y criterio de terminado |
| [`docs/DESPLIEGUE_SEGURIDAD_2026-11.md`](DESPLIEGUE_SEGURIDAD_2026-11.md) | Pasos para llevar la actualización de seguridad al Central y a las sedes |
| [`MANUAL_INSTALACION_SERVIDOR_Y_SUCURSALES.md`](../MANUAL_INSTALACION_SERVIDOR_Y_SUCURSALES.md) | Instalación (oct-2026; no incluye los cambios de noviembre) |
| [`MANUAL_SERVIDOR_LINUX_KUBUNTU.md`](../MANUAL_SERVIDOR_LINUX_KUBUNTU.md) | Servidor en Linux (oct-2026) |
| [`UI_UX_AUDIT.md`](../UI_UX_AUDIT.md) | Auditoría de interfaz (oct-2026) |

## 3. Historial de cambios integrados en `main`

| PR | Fecha | Cambio |
|---|---|---|
| #1 | 2026-11-26 | **Seguridad fases 1 y 1b + estabilidad:** toda la API exige sesión, claves en hash scrypt, permisos (RBAC) en el servidor, WebSocket autenticado, límite de intentos de login, cambio obligatorio de clave de fábrica, pruebas de tarifas/contabilidad/seguridad con CI, 0 errores de TypeScript, corrección de doble conteo de descuentos en PUC |
| #2 | 2026-11-26 | Sincronización servidor↔servidor; la clave de sync solo sirve para rutas de nodo |
| #3 | 2026-11-26 | `server.ts` dividido en módulos `server/routes/*` |
| #4 | 2026-11-26 | Permisos exigidos en rutas de tickets y plazas |
| #5 | 2026-11-26 | Hub WebSocket movido a `server/ws.ts` |
| #6 | 2026-11-26 | Limpieza de imports sin uso |
| #7 | 2026-11-26 | Usuarios de fábrica creados al arrancar con base vacía |
| #8 | 2026-11-26 | Guía de despliegue de la actualización de seguridad |
| #9 | 2026-11-26 | La app nunca cambia a otra base de datos si falla `DATABASE_URL` |
| #10 | 2026-11-26 | **Patio POS nuevo** (claro/oscuro) con selector Clásica/Nueva por usuario; además, el usuario exacto gana sobre el alias de login cajero/caja |
| #11 | 2026-11-27 | **Mapa de plazas nuevo** (claro/oscuro) con el mismo selector |
| #12 | 2026-11-27 | **Efecto Cristal** opcional (por usuario, apagado por defecto) en las vistas nuevas |
| #15 | 2026-11-27 | **Rediseño completo del Patio sin perder funciones:** se retiró el Patio nuevo recortado (ocultaba medios de pago, descuentos, convenios, ticket perdido, DIAN, placa extranjera, ANPR y la tabla) y se rediseñó la pantalla completa cambiando solo estilos (verificado con `scripts/check-style-only.ts`). El Mapa nuevo quedó con todo lo del clásico. Cristal también en el Patio |
| #16 | 2026-11-27 | **Rediseño de Turno y caja** (arqueo, cierre del día, gastos/recogidas/ingresos, histórico integrado, modales de impresión, comprobante y PIN) solo en estilos (checker OK); el comprobante térmico impreso no se tocó. Corregido: el horario de cada arqueo cerrado mostraba la fecha fija "19/10/2026" en vez de la real |
| #17 | 2026-11-27 | Rediseño del **panel histórico de arqueos y cierres** (`CashShiftsHistoryModal`, también en Reportes) y sus modales (recálculo, notas, auditoría, marco de impresión), solo estilos; comprobante imprimible intacto |
| #18 | 2026-11-27 | Rediseño de **Abonados** (`SubscribersModal`): métricas, filtros, tabla con estados activo/por vencer/vencido y formulario de alta/edición, solo estilos |
| #19 | 2026-11-27 | Rediseño de **Reportes** (`RealTimeReports`, `ExecutiveSummaryReport`): resumen, contable PUC/DIAN, análisis, IA, histórico de tickets y cierres, solo estilos. Corregido: con cierres sin total se mostraban **$440.000 inventados** (dato de demostración), y una fecha fija "19/10/2026" en los arqueos |
| #20 | 2026-11-27 | Rediseño de **Usuarios y permisos** (`UsersManagementModal`): lista de usuarios, perfiles, matriz de permisos por perfil, formulario de alta/edición, modales y casillas de permisos/visibilidad, solo estilos |
| #21 | 2026-11-27 | Rediseño de **Configuración**: Tarifas (`RatesSettingsModal`), Medios de pago (`PaymentMethodsSettings`, QR con fondo blanco), Categorías de vehículo, Convenios comerciales y Conceptos de gasto, solo estilos |

Patio: una sola pantalla (completa, con el diseño nuevo), con Cristal opcional. Mapa: selector Clásica/Nueva (clásica por defecto).

## 4. Estado de despliegue

| Equipo | Estado |
|---|---|
| Equipo de desarrollo | Rol **sede**. Tiene `SYNC_SHARED_KEY` en `.env`; `CENTRAL_SERVER_URL` sin configurar a propósito (si se pone mientras el Central tenga código viejo, reemplazaría los usuarios locales) |
| Servidor Central | **Sin desplegar** (código anterior a noviembre) |
| Sedes | **Sin desplegar** |
| Agentes FarmaDesk | Hay que reinstalarlos tras el despliegue |

Orden obligatorio al desplegar: primero el Central, después cada sede (ver guía de despliegue).

## 5. Verificación

- `npm run verify` (typecheck + pruebas): 75/75 al 2026-11-27 (se retiraron las 6 pruebas del Patio recortado). CI en GitHub en cada PR.
- Pruebas E2E manuales hechas en bases aisladas: entrada/salida/cierre de turno de cajero, supervisor, sync Central↔sede.
- El Patio rediseñado, el Mapa nuevo y Cristal solo se revisaron con datos de ejemplo (claro y oscuro); **falta probarlas en la app real** y medir el rendimiento del Cristal en las PCs de caja.

## 6. Riesgos y deuda abiertos

- Nunca levantar servidores de prueba contra la base real: verificar en el log la línea `[PostgreSQL] Conexión establecida ... a: <base>` antes de operar.
- PostgreSQL local usa autenticación `trust` solo para 127.0.0.1/::1 (la LAN se rechaza).
- 101 variables locales sin uso; `public/assets/farmadesk.exe` duplicado sin uso; ruta de desarrollo fija en `server/routes/farmadesk.ts`.
- `src/App.tsx` sigue en ~5.9k líneas; `OperationsView.tsx` ~4.2k.
- **Dinero:** la tabla de vehículos del Patio calcula el valor actual sin las categorías de vehículo (`calculateParkingFee` sin `vehicleCategories`), a diferencia del mapa y del cobro; puede mostrar un valor distinto con tarifas por categoría. Ver roadmap 1.3.
- Manuales de instalación desactualizados respecto a noviembre.
- Reportes, pestaña Resumen: la sección "Showcase de cierres y arqueos (Día 1 Operativo Simulado)" sugiere contenido de demostración; revisar que solo muestre datos reales.

## 7. Próximos pasos

Ver [`docs/ROADMAP.md`](ROADMAP.md) (fases, prioridades, dependencias y criterio de terminado).

## 8. Decisiones

- 2026-11-26 — Las vistas nuevas van detrás de un selector por usuario y equipo (localStorage), con la clásica por defecto, para cambiar sin riesgo y volver con un clic.
- 2026-11-26 — `CENTRAL_SERVER_URL` no se configura en el equipo de desarrollo hasta que el Central tenga el código nuevo.
- 2026-11-27 — El efecto Cristal aplica desenfoque solo a superficies grandes, para no penalizar PCs de caja modestas.
- 2026-11-27 — **Regla de rediseño:** cambiar el aspecto sin quitar nada de lo que se muestra ni de lo que se puede hacer. Se rediseña la pantalla existente cambiando solo estilos (`className`), comprobado con `npx tsx scripts/check-style-only.ts <archivo>`; no se crean pantallas paralelas recortadas.
