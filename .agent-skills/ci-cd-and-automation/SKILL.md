---
name: ci-cd-and-automation
description: Automatización de empaquetado, scripts de despliegue en Windows (.BAT), migraciones de PostgreSQL y actualizaciones sin detención para WolfZone POS.
---

# CI/CD & Automation - Scripts .BAT y Actualizaciones en Campo

## 🎯 Visión General

La mayoría de los terminales de parqueadero operan en entornos Windows industriales (Windows 10/11 IoT Enterprise) en redes locales cerradas sin acceso directo a GitHub o terminales Linux. La automatización se fundamenta en scripts `.BAT` robustos y paquetes de actualización versionados (`data/sync-software-releases.json`).

---

## 📦 Scripts Operativos Incluidos en la Raíz del Proyecto

1. **`INSTALAR_SISTEMA_NUEVO.bat`**: Configuración de entorno desde cero, dependencias Node.js, variables de entorno y servicio local.
2. **`INICIAR_PARQUEADERO.bat`**: Lanzador con monitor de proceso (reinicia la aplicación automáticamente si el proceso se detiene).
3. **`CREAR_BASE_DATOS_POSTGRES.bat`**: Inicialización del esquema relacional `database_schema.sql` y usuario del sistema.
4. **`REPARAR_POSTGRESQL.bat`**: Procedimiento de emergencia para recuperar el servicio PostgreSQL si se bloquea el puerto 5432 o se corrompen archivos temporales.
5. **`ACTUALIZAR_SISTEMA.bat`**: Aplica deltas de código sin sobreescribir configuraciones de sedes ni datos de caja activos.
6. **`Iniciar-FarmaDesk.bat`**: Lanza el agente de soporte y telemetría remota FarmaDesk Pro.

---

## 🔄 Protocolo de Actualización Segura

- **Paso 1:** Respaldar automáticamente la carpeta de datos y base de datos antes de aplicar cualquier parche.
- **Paso 2:** Comprobar que no existan cobros activos o talanqueras abiertas en el segundo exacto del reinicio.
- **Paso 3:** Verificar la integridad del build con `npm run build` o validación de hashes.
