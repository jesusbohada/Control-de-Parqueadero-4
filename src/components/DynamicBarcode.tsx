import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface DynamicBarcodeProps {
  value: string;
  format?: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC' | 'ITF14';
  width?: number;
  height?: number;
  displayValue?: boolean;
  text?: string;
  fontSize?: number;
  fontOptions?: string;
  font?: string;
  textAlign?: string;
  textPosition?: 'bottom' | 'top';
  textMargin?: number;
  background?: string;
  lineColor?: string;
  margin?: number;
  className?: string;
}

export const DynamicBarcode: React.FC<DynamicBarcodeProps> = ({
  value,
  format = 'CODE128',
  width = 1.6,
  height = 42,
  displayValue = true,
  text,
  fontSize = 12,
  font = 'monospace',
  textAlign = 'center',
  textPosition = 'bottom',
  textMargin = 2,
  background = '#ffffff',
  lineColor = '#000000',
  margin = 4,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    try {
      JsBarcode(svgRef.current, value, {
        format,
        width,
        height,
        displayValue,
        text: text !== undefined ? text : value,
        fontSize,
        font,
        textAlign,
        textPosition,
        textMargin,
        background,
        lineColor,
        margin
      });
    } catch (err) {
      console.warn('[DynamicBarcode] Error generando código de barras:', err);
    }
  }, [
    value,
    format,
    width,
    height,
    displayValue,
    text,
    fontSize,
    font,
    textAlign,
    textPosition,
    textMargin,
    background,
    lineColor,
    margin
  ]);

  if (!value) return null;

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <svg ref={svgRef} className="max-w-full h-auto" />
    </div>
  );
};
