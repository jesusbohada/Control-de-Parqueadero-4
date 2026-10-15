---
name: observability-and-instrumentation
description: Monitoreo, telemetría y diagnósticos proactivos de WolfZone POS. Incluye supervisión del espacio en disco del host local (<500MB crítico), estado en vivo de enlaces WebSocket y latencia de sedes (data/sync-branches-telemetry.json), y registro de auditoría inmutable para eventos financieros de caja y apertura de gaveta.
---

# Observability & Instrumentation - WolfZone POS

## 🎯 Visión General

La telemetría en WolfZone POS asegura que el administrador y los ingenieros de soporte detecten problemas antes de que afecten la operación de cobro: un disco lleno en la máquina del parqueadero que congele la base de datos, un corte de fibra óptica en una sede remota o anomalías en la apertura repetida de la gaveta de dinero.

---

## 📊 Dimensiones de Telemetría Clave

### 1. Monitor de Disco Duro del Host (Semáforo de Almacenamiento)
- **Normal:** Espacio libre > 2 GB (Indicador verde en barra superior).
- **Alerta Preventiva:** Espacio libre entre 500 MB y 2 GB (Indicador ámbar con advertencia de depuración de logs).
- **Crítico Inmediato:** Espacio libre < 500 MB (Indicador rojo parpadeante).
  - En estado crítico, el sistema bloquea operaciones secundarias que consuman disco no esencial (como respaldos automáticos pesados) para preservar la integridad de la base de datos de tickets.

### 2. Telemetría de Sincronización Multi-Sede (`sync-branches-telemetry.json`)
Cada sede reporta continuamente sus métricas a través de WebSocket o sondeo HTTP:
- `wsConnected`: Estado de conexión bidireccional en tiempo real.
- `lastReportedAt`: Marca temporal ISO 8601 del último latido (heartbeat).
- `pendingUpdatesCount`: Número de transacciones locales pendientes por sincronizar hacia la nube o el servidor central.
- `occupiedSpots` vs `totalSpots`: Ocupación porcentual del parqueadero en vivo.
- `todayRevenue`: Recaudación acumulada del turno en curso.

```typescript
export interface BranchTelemetryPayload {
  branchId: string;
  timestamp: string;
  status: 'online' | 'offline' | 'degraded';
  pingMs: number;
  activeVehicles: number;
  totalSpots: number;
  occupancyPercent: number;
  openShiftsCount: number;
  unsyncedTransactions: number;
  diskFreeMb: number;
}
```

### 3. Registro de Auditoría Inmutable (Financial Audit Trail)
Cada acción sensible debe generar una entrada con marca de tiempo, usuario y justificación:
- Apertura manual de gaveta de dinero (sin cobro asociado).
- Anulación de cobro o salida forzada de vehículo.
- Aplicación de tarifa manual o descuento especial.
- Modificación de cupos de parqueadero.
- Cierre y apertura de turno de caja.
