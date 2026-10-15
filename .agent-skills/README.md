# 🐺 WolfZone POS - Catálogo de Agent Skills Industriales

Catálogo oficial de **Agent Skills** especializadas y adaptadas para **WolfZone POS** (sistema de punto de venta, gestión de parqueaderos de alto tráfico, facturación electrónica, control de acceso vehicular por talanquera/LPR y telemetría multi-sede).

Inspirado en la taxonomía de **Addy Osmani (`addyosmani/agent-skills`)**, este compendio transforma las habilidades genéricas de ingeniería de software en **estándares operativos concretos y probados en campo** para terminales táctiles, impresoras térmicas ESC/POS, bases de datos PostgreSQL locales y sincronización distribuida.

---

## 🗂️ Categorías de Skills Adaptadas

```
.agent-skills/
├── 🎨 FRONTEND & EXPERIENCIA TÁCTIL (POS / KIOSKO)
│   ├── frontend-ui-engineering/          # Ergonomía táctil (52px+), WCAG AAA, fuentes monoespaciadas, impresión térmica
│   └── browser-testing-with-devtools/    # Pruebas táctiles, emulación de pantalla industrial, renderizado de tickets
│
├── ⚡ RENDIMIENTO, TIEMPO REAL & PERSISTENCIA
│   ├── performance-optimization/         # Cálculo de tarifas en tiempo real sin bloqueo, mapa 500+ plazas a 60 FPS
│   └── incremental-implementation/       # Migraciones en caliente sin detener cobros ni taquillas activas
│
├── 🔒 SEGURIDAD, CAJA & AUDITORÍA FINANCIERA
│   ├── security-and-hardening/           # Arqueo ciego de gaveta, control RBAC, firmas anti-fraude en tickets
│   └── code-review-and-quality/          # Checklist estricto para transacciones monetarias y cambios de tarifas
│
├── 📊 OBSERVABILIDAD & TELEMETRÍA MULTI-SEDE
│   ├── observability-and-instrumentation/# Alertas de disco host (<500MB), latencia de sedes, auditoría inmutable
│   └── debugging-and-error-recovery/     # Recuperación ante atascos de impresora térmica, desconexión de scanner o caída de red
│
├── 🚀 DESPLIEGUE, HARDWARE & OPERACIÓN
│   ├── shipping-and-launch/              # Checklist pre-apertura de turno, test de gaveta y talanquera
│   ├── ci-cd-and-automation/             # Generación de instaladores .BAT y paquetes de actualización sin reiniciar OS
│   └── api-and-interface-design/         # Contratos de telemetría WebSocket y servicios de impresión ESC/POS
│
└── 🧪 CALIDAD & ESPECIFICACIONES
    ├── test-driven-development/          # Pruebas automatizadas de algoritmos de tarifas, fracciones y descuentos
    ├── spec-driven-development/          # Especificaciones formales de estados de vehículos y arqueos
    └── documentation-and-adrs/           # Registros de decisiones arquitectónicas (ADRs) del POS
```

---

## 📋 Resumen Detallado de Skills Clave para WolfZone POS

| Skill | Enfoque WolfZone POS | Regla de Oro en Producción |
| :--- | :--- | :--- |
| **`frontend-ui-engineering`** | Botones mínimos de 52px, contraste WCAG AAA > 16:1, fuentes numéricas monoespaciadas, `@media print` para tickets de 58/80mm. | *Ningún operador debe errar una tecla táctil ni perder visibilidad bajo luz solar o cabinas oscuras.* |
| **`performance-optimization`** | Tarifación continua reactiva cada segundo con `useMemo`, virtualización de patios con más de 500 bahías, zero memory leaks. | *La taquilla debe responder en < 50ms incluso con 500 vehículos en patio y 72 horas continuas de ejecución.* |
| **`security-and-hardening`** | Arqueo ciego obligatorio, firma criptográfica SHA-256 en códigos QR de tickets, permisos estrictos por rol. | *El cajero jamás ve el saldo esperado antes de contar su gaveta física.* |
| **`observability-and-instrumentation`**| Telemetría WebSocket con sedes remotas (`sync-branches-telemetry.json`), semáforo de disco local (<500MB alerta roja). | *Si el disco baja de 500MB o la base de datos se desconecta, el sistema alerta visualmente de inmediato.* |
| **`debugging-and-error-recovery`** | Tolerancia a fallos de hardware: desconexión de lector de barras USB, atasco de papel, reconexión automática a PostgreSQL. | *Si el hardware falla, el ticket se encola en memoria y se imprime en cuanto se reanude la conexión.* |
| **`shipping-and-launch`** | Protocolo de apertura matutina: test de corte de papel, apertura de gaveta, verificación de fecha/hora de tarifas y ping central. | *No se abre la taquilla hasta validar los 5 puntos del checklist de hardware.* |
| **`api-and-interface-design`** | Puente HTTP/WebSocket hacia `print-service.js` local, protocolo de sincronización de paquetes en caliente y comandos remotos. | *Los endpoints locales deben funcionar 100% offline sin depender de internet.* |
| **`test-driven-development`** | Matriz de pruebas de tarifas: minutos de gracia, tarifa plena, nocturna, pérdida de ticket, convenios y descuentos. | *Cada regla tarifaria debe contar con prueba unitaria antes de aplicarse en sedes activas.* |

---

## 🛠️ Cómo Utilizar Estas Skills en el Proyecto

1. **Para Agentes de IA y Desarrolladores:**
   - Antes de modificar el cobro de tarifas o la taquilla, consultar `test-driven-development` y `security-and-hardening`.
   - Antes de modificar componentes de interfaz, consultar `frontend-ui-engineering` para mantener los tokens de contraste WCAG AAA y los tamaños táctiles.
   - Antes de crear nuevas rutas de sincronización o telemetría, revisar `api-and-interface-design`.

2. **Para Operadores y Administradores:**
   - Acceder al visor integrado de **Agent Skills** desde la barra superior de la aplicación (`Botón 🧠 Skills POS`) para consultar guías de hardware, solución de problemas y protocolos de turno.
