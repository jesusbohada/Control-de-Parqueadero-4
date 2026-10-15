---
name: api-and-interface-design
description: Diseño de contratos de API para hardware periférico y sincronización distribuida en WolfZone POS. Protocolos para servicio de impresión local (ESC/POS), puente de básculas seriales, relés de talanquera, endpoints de telemetría multi-sede (REST/WebSocket) y formato de paquetes de actualización central.
---

# API & Interface Design - Protocolos de Hardware y Sincronización POS

## 🎯 Visión General

WolfZone POS se comunica con múltiples capas: dispositivos físicos locales (impresoras por USB/COM/Red, cajones de dinero, cámaras LPR, barreras vehiculares) y servidores remotos en la nube o matriz. Esta skill define los contratos de interfaz estables.

---

## 🔌 1. API del Servicio de Impresión Local (`print-service.js`)

El frontend web se comunica con el servicio Node.js local que gestiona los puertos de hardware:

```typescript
// Contrato de impresión de Ticket de Entrada
export interface PrintTicketRequest {
  ticketNumber: string;
  plate: string;
  vehicleType: 'car' | 'motorcycle' | 'truck' | 'bicycle';
  entryTime: string; // ISO 8601
  barcodeContent: string;
  qrPayload: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  rateDescription: string;
  cutPaper: boolean;
  openDrawer: boolean;
}

// Endpoint local en host: POST http://localhost:3001/api/print
```

---

## 📡 2. Contrato de Sincronización Multi-Sede (`data/sync-branches-telemetry.json`)

Para que la sede central conozca el estado de sedes remotas (como Sede Calle 72, Unicentro, etc.):

```typescript
export interface BranchSyncMessage {
  type: 'TELEMETRY_HEARTBEAT' | 'TRANSACTION_BATCH' | 'ALERT_EVENT';
  branchId: string;
  timestamp: string;
  payload: {
    occupiedSpots: number;
    totalSpots: number;
    todayRevenue: number;
    todayVehicles: number;
    activeShiftNumber: number;
    currentCashier: string;
    diskSpaceFreeMb: number;
    systemVersion: string;
  };
}
```

---

## ⚖️ 3. Reglas de Idempotencia y Desconexión
- Todo comando de apertura de talanquera o registro de cobro debe portar un `idempotencyKey` UUIDv4.
- Si la conexión se interrumpe y la petición se reintenta, el backend no duplicará el cobro ni registrará una salida repetida.
