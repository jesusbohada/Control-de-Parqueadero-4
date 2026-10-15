---
name: test-driven-development
description: Metodología de pruebas automatizadas y TDD enfocada en cálculos financieros y tarifas vehiculares en WolfZone POS. Cobertura para casos de esquina en minutos de gracia, redondeo de fracciones, tarifas nocturnas, penalizaciones por ticket perdido y conciliación de caja en arqueo ciego.
---

# Test-Driven Development - Tarifas y Cálculos Financieros POS

## 🎯 Visión General

Un error de un solo peso o de un minuto en una fórmula de cobro de parqueadero puede generar demandas de clientes, auditorías de impuestos o pérdidas millonarias tras miles de rotaciones vehiculares. El código financiero y de tarifas debe desarrollarse y blindarse con **Test-Driven Development (TDD)** estricto.

---

## 🧪 Casos de Prueba Esenciales para Tarifas de Parqueadero

### 1. Período de Gracia Gratuito
- **Escenario:** Un cliente entra y sale en menos de 15 minutos (tiempo de gracia).
- **Expectativa:** Total a pagar = `$0 COP`. Estado = `isGracePeriod: true`.

### 2. Fracción de Hora Redondeada Hacia Arriba
- **Escenario:** Tarifa = `$4.000 COP / hora o fracción`. Tiempo transcurrido = `61 minutos`.
- **Expectativa:** 2 horas cobradas = `$8.000 COP`.

### 3. Tarifa Plena con Tope Máximo Diario
- **Escenario:** Tarifa = `$4.000 COP / hora`. Tiempo = `12 horas` (total $48.000). Tope diario configurado = `$25.000 COP`.
- **Expectativa:** Total a pagar = `$25.000 COP`.

### 4. Ticket Perdido (Penalización Administrativa)
- **Escenario:** El cliente no presenta comprobante. Tarifa fija por ticket perdido = `$20.000 COP` + tiempo transcurrido o flat fee según política.
- **Expectativa:** Registro con bandera de auditoría `isLostTicket: true` y supervisor requerido.

### 5. Arqueo Ciego y Diferencia de Caja
- **Escenario:**
  - Sistema registró: Efectivo esperado `$350.000 COP`.
  - Cajero declaró a ciegas: `$345.000 COP`.
- **Expectativa:** Faltante de caja = `-$5.000 COP`. Generación de alerta de discrepancia sin permitir que el cajero modifique su declaración tras presionar confirmar.
