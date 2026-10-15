---
name: shipping-and-launch
description: Procedimientos de despliegue, verificación previa a apertura de turno y puesta en marcha de WolfZone POS. Incluye checklist de hardware (prueba de guillotina de impresora, apertura de gaveta de dinero, sincronización horaria NTP y prueba de conexión con el servidor central).
---

# Shipping & Launch - Checklist Pre-Apertura y Despliegue POS

## 🎯 Visión General

Antes de abrir la talanquera y comenzar a cobrar a clientes a las 6:00 AM, el punto de venta debe someterse a una verificación rápida de 60 segundos. Esta skill estandariza el checklist pre-operativo que asegura que la taquilla inicie sin fallas de hardware.

---

## ✅ Checklist Pre-Apertura de Turno (60 Segundos)

```
[ ] 1. VERIFICACIÓN DE HORA DEL SISTEMA (NTP)
    - Validar que la hora local coincida con el servidor de tarifas (tolerancia < 5 segundos).
    - Crucial para que las tarifas por minuto y horas de gracia se liquiden con precisión legal.

[ ] 2. PRUEBA DE IMPRESORA TÉRMICA Y CORTE DE PAPEL
    - Enviar ticket de autodiagnóstico (Test Print).
    - Verificar suficiente rollo térmico (franja roja de advertencia ausente).
    - Probar corte automático de guillotina.

[ ] 3. PRUEBA DE APERTURA DE GAVETA DE DINERO (CASH DRAWER)
    - Enviar pulso ESC/POS (PIN 2 o PIN 5 de RJ11/RJ12).
    - Confirmar apertura suave del cerrojo mecánico.

[ ] 4. BASE DE EFECTIVO INICIAL (FONDO DE SENCILLO)
    - Registrar monto inicial para cambio/vuelto (ej: $100.000 COP).
    - El saldo queda bloqueado como capital de trabajo no sujeto a ingreso por ventas.

[ ] 5. CONECTIVIDAD DE BASE DE DATOS Y TELEMETRÍA
    - Indicador de PostgreSQL en verde.
    - Indicador de enlace WebSocket con servidor central en verde o amarillo (modo autónomo listo).
```

---

## 🚀 Despliegue de Nuevas Versiones sin Detener la Operación

- **Regla:** Nunca actualizar el software mientras haya un cobro en curso en la pantalla.
- **Flujo:**
  1. Esperar a que el operador termine la transacción actual.
  2. Aplicar el paquete descargado en caliente vía `software_updater` o script `.bat`.
  3. Recargar la interfaz conservando la sesión del cajero y los vehículos activos en el parqueadero.
