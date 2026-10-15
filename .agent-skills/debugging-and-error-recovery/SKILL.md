---
name: debugging-and-error-recovery
description: Diagnóstico sistemático y recuperación autónoma de fallos de hardware y software en WolfZone POS. Protocolos para atascos y fin de papel en impresoras térmicas ESC/POS, desconexión de escáneres de código de barras USB/HID, caídas de conexión a PostgreSQL y tolerancia a fallos de energía eléctrica.
---

# Debugging & Error Recovery - Hardware y Conectividad POS

## 🎯 Visión General

En una taquilla de parqueadero, los fallos son inevitablemente físicos: el papel térmico se agota mientras hay 10 autos esperando salir, un cable USB del escáner se afloja por vibraciones o la luz eléctrica parpadea. WolfZone POS debe recuperarse de forma elegante y autónoma sin pérdida de datos ni duplicación de cobros.

---

## 🛠️ Protocolos de Recuperación por Tipo de Incidencia

### 1. Impresora Térmica: Fin de Papel o Atasco (Out-of-Paper)
- **Síntoma:** Error de comunicación con `print-service.js` o timeout al emitir comprobante.
- **Protocolo de Recuperación:**
  1. El sistema **no cancela** la transacción de cobro ya registrada.
  2. Muestra un diálogo flotante claro: *"Impresora sin papel o desconectada. ¿Desea reintentar impresión o enviar ticket digital?"*.
  3. Mantiene el trabajo en la cola local de impresión en memoria (`pendingPrintJobs`).
  4. Una vez que el operador recarga el rollo y confirma, el ticket se imprime inmediatamente sin tener que volver a ingresar la placa.

### 2. Lector de Códigos de Barras USB / LPR Desconectado
- **Síntoma:** El operador pasa el ticket por el escáner láser y no ocurre ninguna acción.
- **Protocolo de Diagnóstico:**
  - El sistema detecta ausencia de eventos de teclado HID en el campo de búsqueda rápida.
  - Habilita automáticamente el **Teclado Numérico y Alfanumérico Táctil** en pantalla como método de respaldo.
  - Ofrece atajo rápido `F2` o botón táctil grande *"Digitar Placa Manual"* para no detener el flujo vehicular.

### 3. Pérdida de Conexión a Base de Datos PostgreSQL
- **Síntoma:** Error `ECONNREFUSED 5432` o latencia superior a 3000ms.
- **Protocolo de Recuperación:**
  1. Activación automática del **Modo Offline-First**:
     - Las transacciones activas se guardan en `localStorage` o `IndexedDB` con estado `pending_sync`.
     - Se notifica discretamente en la barra superior: *"Modo Local Activo - Reconectando PostgreSQL..."*.
  2. Reintentos con retroceso exponencial (*exponential backoff*): 1s, 2s, 5s, 10s.
  3. Al restablecer la conexión, se vacía la cola de transacciones locales y se confirman los IDs en PostgreSQL mediante transacción única (`BEGIN ... COMMIT`).

### 4. Corte de Energía y Recuperación de Sesión (Crash Recovery)
- Al reiniciar el equipo tras un corte eléctrico:
- El sistema restaura automáticamente:
  - Turno de caja activo del operador.
  - Lista de vehículos dentro de las instalaciones con sus horas de entrada intactas.
  - Conteo de plazas ocupadas.
