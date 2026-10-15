---
name: frontend-ui-engineering
description: Construye interfaces táctiles de alta resiliencia para terminales industriales POS y quioscos de autoservicio en WolfZone POS. Garantiza objetivos táctiles de 44-52px, ratios de contraste WCAG AAA en modos claro y oscuro, fuentes monoespaciadas para cifras monetarias y reglas precisas de impresión térmica para papel continuo de 58mm y 80mm.
---

# Frontend UI Engineering - WolfZone POS & Kiosko Táctil

## 🎯 Visión General

En entornos de parqueadero y puntos de venta de alto tráfico, los operadores trabajan jornadas continuas bajo condiciones extremas: pantallas táctiles resistivas o capacitivas con grasa o polvo, cabinas con luz solar directa o escasa iluminación nocturna, y la necesidad de emitir y cobrar tickets en menos de 5 segundos.

Esta skill establece las **reglas inmutables** de ingeniería de interfaz para WolfZone POS.

---

## 🛑 Las 5 Reglas de Oro en Interfaces Táctiles POS

### 1. Objetivos Táctiles Generosos (Touch Targets >= 48px - 52px)
- **Prohibido:** Botones de cobro, teclado numérico o selector de vehículos con alturas inferiores a 44px.
- **Estándar POS:** Botones principales de acción (`Cobrar`, `Imprimir Ticket`, `Abrir Gaveta`) con altura mínima de **52px**, tipografía en negrita (`font-bold`) y padding horizontal mínimo de `px-4`.
- **Espaciado entre botones:** Mínimo `gap-2` (8px) para evitar toques accidentales con dedos enguantados o cansancio muscular.

### 2. Blindaje de Contraste WCAG AAA (Sin Textos Lavados)
- **Modo Oscuro Industrial:**
  - Fondo primario: `--bg-app: #0B0F19` / `--bg-surface-1: #111827`
  - Texto principal: `--text-primary: #F8FAFC` (Slate-50, ratio > 16:1 contra fondo)
  - Textos secundarios: Mínimo `#94A3B8` (Slate-400), nunca grises semitransparentes difíciles de leer.
- **Modo Claro Industrial:**
  - Fondo primario: `--bg-app: #F8FAFC` / `--bg-surface-1: #FFFFFF`
  - Texto principal: `--text-primary: #020617` (Slate-950 puro, contraste absoluto)
  - Bordes de inputs: `--border-input: #CBD5E1` (visibles sin esfuerzo visual).
- **Consistencia:** Prohibido usar `text-white` sin un fondo oscuro garantizado o `text-black` sin fondo claro garantizado. Utilizar siempre las clases semánticas de `index.css`: `.u-text-main`, `.u-text-secondary`, `.u-bg-card`.

### 3. Cifras Monetarias y Horarias Tabulares (`font-mono tabular-nums`)
- Los montos en dinero (`$ 45.000 COP`), tiempos transcurridos (`02h : 45m : 12s`), placas (`AAA-123`) y números de factura deben usar siempre `font-mono tabular-nums`.
- Evita el baile o temblor visual de dígitos cuando el reloj de liquidación se actualiza segundo a segundo.

### 4. Impresión Térmica ESC/POS Fiel (`@media print`)
- El diseño visual del comprobante en pantalla debe coincidir exactamente con el resultado en papel térmico de 80mm o 58mm:
  ```css
  @media print {
    body {
      background: white !important;
      color: black !important;
      font-family: 'Courier New', monospace !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .no-print {
      display: none !important;
    }
    .print-ticket-80mm {
      width: 76mm !important;
      max-width: 76mm !important;
      font-size: 11px !important;
      line-height: 1.2 !important;
    }
    .print-ticket-58mm {
      width: 48mm !important;
      max-width: 48mm !important;
      font-size: 10px !important;
      line-height: 1.1 !important;
    }
  }
  ```

### 5. Atajos de Teclado Físico y Numérico Virtual
- Soporte para lectores de código de barras USB tipo HID (que envían caracteres rápidos finalizados en tecla `Enter`).
- El input de búsqueda de placa/ticket debe capturar automáticamente el foco tras presionar `F2` o tras finalizar cada cobro.

---

## 📐 Patrón de Componente: Teclado Numérico POS Táctil

```tsx
interface NumpadProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export const PosNumpad: React.FC<NumpadProps> = ({ value, onChange, onSubmit, onClear }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'];

  const handleClick = (key: string) => {
    if (key === 'C') return onClear();
    if (key === 'OK') return onSubmit();
    onChange(value + key);
  };

  return (
    <div className="grid grid-cols-3 gap-2 p-2 bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xs">
      {keys.map((key) => {
        const isAction = key === 'OK' || key === 'C';
        const isOk = key === 'OK';
        return (
          <button
            key={key}
            type="button"
            onClick={() => handleClick(key)}
            className={`h-14 rounded-xl font-mono text-xl font-bold flex items-center justify-center transition-all active:scale-95 select-none ${
              isOk
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                : key === 'C'
                ? 'bg-rose-700 hover:bg-rose-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
            }`}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
};
```
