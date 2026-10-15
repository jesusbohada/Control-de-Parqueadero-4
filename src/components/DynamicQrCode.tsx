import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface DynamicQrCodeProps {
  value: string;
  customImageUrl?: string;
  size?: number;
  className?: string;
  centerLogo?: string;
  alt?: string;
}

export const DynamicQrCode: React.FC<DynamicQrCodeProps> = ({
  value,
  customImageUrl,
  size = 160,
  className = '',
  centerLogo,
  alt = 'Código QR de Pago',
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    // If a user uploaded a base64 custom QR image
    if (customImageUrl && customImageUrl.startsWith('data:image')) {
      setDataUrl(customImageUrl);
      return;
    }

    // If custom image is a real uploaded URL (not the default logo which is not a QR)
    if (customImageUrl && !customImageUrl.includes('pse_logo') && !customImageUrl.includes('logo_')) {
      setDataUrl(customImageUrl);
      return;
    }

    if (!value) return;

    QRCode.toDataURL(value, {
      width: Math.max(size * 2, 320),
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#090d16',
        light: '#ffffff',
      },
    })
      .then((url) => {
        setDataUrl(url);
        setError(false);
      })
      .catch((err) => {
        console.error('Error al generar código QR:', err);
        setError(true);
      });
  }, [value, customImageUrl, size]);

  if (customImageUrl && customImageUrl.startsWith('data:image')) {
    return (
      <div className={`relative flex items-center justify-center bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm ${className}`}>
        <img
          src={customImageUrl}
          alt={alt}
          style={{ width: size, height: size }}
          className="object-contain rounded-lg"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (error || !dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-[10px] text-slate-600 dark:text-slate-300 font-mono text-center p-2 ${className}`}
      >
        <span>Cargando QR...</span>
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center justify-center bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm ${className}`}>
      <img
        src={dataUrl}
        alt={alt}
        style={{ width: size, height: size }}
        className="object-contain rounded-lg select-none"
      />
      {centerLogo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-white p-0.5 shadow-md border border-slate-200 flex items-center justify-center">
            <img src={centerLogo} alt="Logo" className="w-full h-full object-contain rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
};
