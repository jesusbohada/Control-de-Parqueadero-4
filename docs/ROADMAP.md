# Roadmap — WolfZone POS

Qué viene, en qué orden y cuándo está terminado cada punto. Lo ya hecho vive en la [bitácora](BITACORA.md).
**Regla:** al terminar un punto, se borra de aquí y se anota en el historial de la bitácora; al decidir algo nuevo, se agrega aquí con prioridad y criterio de terminado.

_Última actualización: 2026-11-27 (tarde)_

Prioridad: **P0** urgente · **P1** importante · **P2** cuando haya espacio.

---

## Fase 0 — Llevar la seguridad a producción · P0

Los puertos 3000/3001 están expuestos a internet y el Central y las sedes siguen con el código anterior (sin sesiones ni claves en hash).

| # | Tarea | Depende de | Terminado cuando |
|---|---|---|---|
| 0.1 | Desplegar en el **Servidor Central** ([guía](DESPLIEGUE_SEGURIDAD_2026-11.md)) | — | El Central arranca con el código de `main`, exige sesión y los usuarios cambiaron sus claves de fábrica |
| 0.2 | Desplegar en **cada sede** | 0.1 | Cada sede tiene `SYNC_SHARED_KEY` y `CENTRAL_SERVER_URL`, y recibe los usuarios del Central |
| 0.3 | Reinstalar los **agentes FarmaDesk** | 0.2 | Cada agente conecta con su clave de agente y el control remoto funciona |
| 0.4 | Configurar `CENTRAL_SERVER_URL` en el equipo de desarrollo | 0.1 | La sede de desarrollo sincroniza usuarios con el Central |

## Fase 1 — Validar las vistas nuevas en operación real · P1

| # | Tarea | Depende de | Terminado cuando |
|---|---|---|---|
| 1.1 | Probar el **Patio rediseñado** y el **Mapa nuevo** con un cajero real | 0.2 | Un turno completo (entradas, todos los medios de pago, cierre) sin errores ni funciones faltantes |
| 1.2 | Medir el **efecto Cristal** en las PCs de caja | 1.1 | Sin lentitud perceptible; si la hay, se documenta en qué equipos apagarlo |
| 1.4 | Revisar el bloque **"Día 1 Operativo Simulado"** de Reportes | — | Solo muestra datos reales o se retira |
| 1.3 | Revisar el **valor actual de la tabla del Patio** (se calcula sin categorías de vehículo) | — | Prueba automática que compara tabla, mapa y cobro con tarifas por categoría; mismos valores |

## Fase 2 — Interfaz nueva, siguientes pantallas · P1

Regla: se rediseña la pantalla existente cambiando solo estilos (`scripts/check-style-only.ts` debe dar OK); nada de lo que hoy se muestra o se puede hacer desaparece. Si la pantalla vive en `src/App.tsx`, primero se extrae a su propio componente (commit aparte, sin cambios de comportamiento).

| # | Tarea | Depende de | Terminado cuando |
|---|---|---|---|
| 2.2 | Rediseño del resto de pantallas (Configuración, Plazas, etc.), una por PR | — | Solo estilos (checker OK); sin tocar áreas imprimibles; claro/oscuro |
| 2.3 | Decidir si el **Mapa nuevo** pasa a ser el único (retirar el clásico) | 1.1 | Cajeros lo usan un turno sin echar nada de menos |

## Fase 3 — Deuda técnica · P2

| # | Tarea | Depende de | Terminado cuando |
|---|---|---|---|
| 3.1 | Terminar de dividir `src/App.tsx` (~5.9k líneas) | 2.2 | Ningún archivo de `src/` supera ~1.5k líneas |
| 3.2 | Quitar las 101 variables locales sin uso | — | `tsc --noUnusedLocals` sin avisos |
| 3.3 | Borrar `public/assets/farmadesk.exe` duplicado y la ruta fija de desarrollo en `server/routes/farmadesk.ts` | — | La ruta sale de configuración; el build no incluye el duplicado |
| 3.4 | Actualizar los manuales de instalación con los cambios de noviembre | 0.2 | Los manuales describen sesiones, sync y `.env` actuales |

## Ideas sin priorizar

_(Agregar aquí lo que surja; se prioriza al planear la siguiente fase.)_
