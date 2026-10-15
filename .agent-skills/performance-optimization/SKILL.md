---
name: performance-optimization
description: Optimiza la ejecución en tiempo real de WolfZone POS para operar 24/7 sin degradación de memoria ni latencia. Especializada en algoritmos de liquidación tarifaria por minuto/fracción sin bloqueo del hilo principal, renderizado memoizado de mapas de más de 500 plazas vehiculares a 60 FPS y persistencia local sin cuellos de botella I/O.
---

# Performance Optimization - WolfZone POS & Tiempo Real

## 🎯 Visión General

Una terminal de parqueadero no es una aplicación web típica: se ejecuta de manera ininterrumpida durante semanas sin reinicio de navegador, procesa eventos de entrada/salida continuos, actualiza contadores por segundo y debe responder al lector de tickets en menos de **50 milisegundos**.

---

## ⚡ Pilares de Rendimiento en WolfZone POS

### 1. Liquidación Tarifaria Reactiva Sin Bloqueos
- **Problema común:** Calcular la tarifa de todos los vehículos activos en cada frame de animación satura la CPU.
- **Solución WolfZone:** Separar la actualización del reloj global (1 segundo) de la liquidación del vehículo en pantalla. Usar `useMemo` anclado a la clave `[entryTime, rateId, vehicleType, nowSecond]`:

```typescript
export const calculateFeeMemoized = (
  entryDate: Date,
  currentDate: Date,
  rateConfig: RateTier
): CalculatedParkingFee => {
  const elapsedMs = Math.max(0, currentDate.getTime() - entryDate.getTime());
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

  // Período de gracia gratuito (ej: 15 minutos)
  if (elapsedMinutes <= rateConfig.graceMinutes) {
    return { total: 0, minutes: elapsedMinutes, isGracePeriod: true };
  }

  // Cálculo por fracción o tarifa plana
  const billableMinutes = elapsedMinutes;
  const fractions = Math.ceil(billableMinutes / rateConfig.fractionMinutes);
  const total = Math.min(
    fractions * rateConfig.fractionPrice,
    rateConfig.maxDailyCap || Infinity
  );

  return { total, minutes: elapsedMinutes, isGracePeriod: false };
};
```

### 2. Cuadrícula de Plazas de Parqueo (500+ Bahías a 60 FPS)
- **Virtualización y memoización:** Cada celda o plaza (`SpotCard`) debe envolverse en `React.memo` con comparación personalizada superficial de `spot.status`, `spot.occupiedPlate` y `spot.updatedAt`.
- **Evitar recrear funciones en loops:** Pasar callbacks estables generados con `useCallback` o despachar mediante `dispatch` de acciones tipo reducer.

### 3. Prevención de Fugas de Memoria en Operación 24/7
- **Limpieza rigurosa de timers:** Todo `setInterval`, `setTimeout` o listener de WebSocket debe retornar su función de limpieza en `useEffect`.
- **Rotación de logs en cliente:** Los buffers de auditoría en memoria (como `syncAuditLogs`) deben limitarse estrictamente a los últimos 500 registros con `.slice(-500)` para evitar que el consumo de RAM crezca indefinidamente.

### 4. Caché Inteligente de Datos Maestros
- Las listas de **Sedes (`data/sync-branches-telemetry.json`)**, **Tarifas** y **Categorías de Vehículos** cambian con poca frecuencia. Se cachean en memoria y se sincronizan por eventos delta en lugar de peticiones completas recurrentes.
