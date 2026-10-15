---
name: security-and-hardening
description: Blindaje de seguridad financiera y control de acceso en WolfZone POS. Especializada en arqueo ciego de caja, prevención de manipulación de tarifas y tiempos, firmas criptográficas anti-duplicación de tickets QR, control estricto de roles (Cajero, Supervisor, Admin Maestro) y protección de credenciales PostgreSQL y contraseñas VNC.
---

# Security & Hardening - WolfZone POS & Seguridad Financiera

## 🎯 Visión General

El punto de venta de un parqueadero gestiona recaudaciones diarias de efectivo físico y transacciones electrónicas. La seguridad no se limita a HTTPS o contraseñas; abarca la **integridad de la recaudación**, la **prevención de evasión o alteración de boletos** y el **blindaje de auditoría**.

---

## 🔒 Estándares de Seguridad WolfZone POS

### 1. Arqueo Ciego Obligatorio (Blind Shift Close)
- **Principio:** El cajero al cerrar su turno debe contar físicamente los billetes y monedas e ingresar los totales en el sistema **sin saber cuánto dinero espera el software**.
- **Regla:** La pantalla de conteo jamás muestra `Saldo Esperado` ni `Diferencia de Caja` al rol `cajero`.
- Solo tras confirmar el arqueo y registrar el cierre, el sistema compara con el monto auditado y genera la alerta de faltante/sobrante para el rol `admin` o `supervisor`.

```typescript
// Modelo seguro de cierre de turno ciego
export interface BlindShiftDeclaration {
  shiftId: string;
  cashierId: string;
  closedAt: string;
  declaredCash: number;       // Efectivo físico contado por el cajero
  declaredCard: number;       // Vouchers de datáfono contados
  declaredTransfers: number;  // Transferencias comprobadas
  // El sistema calcula en servidor/admin:
  // expectedTotal: number;
  // difference: number; (declaredTotal - expectedTotal)
}
```

### 2. Firmas Criptográficas Anti-Fraude en Tickets (QR / Código de Barras)
- Para evitar que un usuario altere la hora de entrada de un ticket o clone un comprobante para pagar menos:
- Cada ticket emitido incluye un hash de verificación basado en `SHA-256(plate + entryTimestamp + branchCode + secretSalt)`.
- Al escanear el boleto en salida, el sistema recalcula el hash y valida la existencia del ticket en el registro activo. Si no coincide, alerta de ticket adulterado.

### 3. Matriz de Control de Acceso por Roles (RBAC)
- **Cajero:**
  - Permitido: Registrar entradas de vehículos, consultar liquidación, cobrar, emitir comprobante, apertura controlada de gaveta para vuelto.
  - Prohibido: Modificar tarifas, cambiar hora de entrada de un vehículo, anular cobros sin clave de supervisor, ver reportes consolidados de recaudación.
- **Supervisor:**
  - Permitido: Autorizar descuentos extraordinarios, justificar pérdida de boleto con firma digital, autorizar reapertura de gaveta.
- **Administrador Maestro:**
  - Configuración de tarifas, sincronización entre sedes, gestión de usuarios, backup y restauración de base de datos.

### 4. Protección de Credenciales y Acceso Remoto
- Las contraseñas de VNC, RustDesk y PostgreSQL registradas en `data/sync-branches-telemetry.json` deben tratarse como confidenciales.
- Se prohíbe exponer claves maestras en respuestas públicas del servidor HTTP sin autenticación previa mediante token Bearer.
