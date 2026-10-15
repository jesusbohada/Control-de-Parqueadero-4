import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Smartphone, 
  QrCode, 
  Zap,
  Building2, 
  ShieldCheck, 
  ArrowRight,
  ExternalLink,
  Globe
} from 'lucide-react';
import { PaymentMethod, PaymentGatewayConfig, WalletOption, QrOption, BreBKey, BankAccountOption } from '../types';
import { formatCurrency } from '../utils/billing';
import { DynamicQrCode } from './DynamicQrCode';

interface PaymentQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  method: PaymentMethod;
  totalAmount: number;
  currencySymbol: string;
  config: PaymentGatewayConfig;
  ticketNumber?: string;
  plate?: string;
  subMethodName?: string;
  accountDetails?: {
    accountNumber?: string;
    holderName?: string;
    entityName?: string;
  };
  pseUrl?: string;
  pseQrUrl?: string;
  initialTab?: 'standard' | 'pse';
}

export const PaymentQrModal: React.FC<PaymentQrModalProps> = ({
  isOpen,
  onClose,
  method,
  totalAmount,
  currencySymbol,
  config,
  ticketNumber,
  plate,
  subMethodName,
  accountDetails,
  pseUrl,
  pseQrUrl,
  initialTab,
}) => {
  const [copied, setCopied] = useState(false);
  const [pseCopied, setPseCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'standard' | 'pse'>(initialTab || 'standard');

  if (!isOpen) return null;

  const isWallet = method === 'wallet' || method === 'nequi' || method === 'daviplata';
  const isQr = method === 'qr' || method === 'qr_bancolombia';
  const isBreB = method === 'bre_b';
  const isTransfer = method === 'transfer';

  const defaultBank = config.bankAccounts?.[0];

  const accountPhone = 
    accountDetails?.accountNumber ||
    (method === 'nequi' ? config.nequiPhone : '') ||
    (method === 'daviplata' ? config.daviplataPhone : '') ||
    (method === 'qr_bancolombia' ? config.bancolombiaAccount : '') ||
    (defaultBank ? `${defaultBank.bankName} ${defaultBank.accountNumber}` : '310 892 4511');

  const accountHolder = 
    accountDetails?.holderName || 
    (method === 'nequi' ? config.nequiHolder : '') ||
    (method === 'daviplata' ? config.daviplataHolder : '') ||
    (defaultBank ? defaultBank.holderName : 'Estacionamiento Central');

  const entity = accountDetails?.entityName || (
    isBreB ? 'Banco de la República / Red Interoperable' :
    isTransfer ? (defaultBank?.bankName || 'Transferencia Bancaria') :
    'Canal Digital'
  );

  // Find matching bank account and resolve PSE parameters
  const matchingBank = config.bankAccounts?.find(b => b.accountNumber === accountPhone || b.bankName === subMethodName || b.bankName === entity) || defaultBank;
  const resolvedPseUrl = pseUrl || matchingBank?.pseUrl || config.generalPseUrl || 'https://registro.pse.com.co';
  const resolvedPseQrUrl = pseQrUrl || matchingBank?.pseQrUrl || config.generalPseQrUrl || '/pse_logo.png';
  const hasPseOption = isTransfer || !!matchingBank?.pseUrl || !!config.generalPseUrl;

  // Find matching wallet, qr, or bank account with custom uploaded QR image
  let uploadedQrUrl: string | undefined = undefined;
  if (isWallet) {
    const matchingWallet = config.wallets?.find(w => w.phoneNumber === accountPhone || w.name === subMethodName);
    uploadedQrUrl = (matchingWallet as any)?.qrImageUrl;
  } else if (isQr) {
    const matchingQr = config.qrCodes?.find(q => q.accountNumber === accountPhone || q.name === subMethodName);
    uploadedQrUrl = matchingQr?.qrImageUrl;
  } else if (isTransfer) {
    if (activeTab === 'pse') {
      uploadedQrUrl = resolvedPseQrUrl;
    } else {
      uploadedQrUrl = matchingBank?.qrImageUrl || defaultBank?.qrImageUrl;
    }
  }

  const title = activeTab === 'pse' ? 'Pago por PSE (Enlace & QR)' : (subMethodName || (
    isBreB ? 'Llave Bre-B (Pago Inmediato)' :
    isQr ? 'Código QR Bancario' :
    isWallet ? 'Billetera Digital' :
    'Transferencia Bancaria'
  ));

  const themeColors = activeTab === 'pse'
    ? {
        bgHeader: 'bg-blue-900',
        badge: 'bg-blue-100 text-blue-950 border-blue-300',
        qrBorder: 'border-blue-700',
        dotColor: 'bg-blue-950',
      }
    : isBreB
    ? {
        bgHeader: 'bg-teal-700',
        badge: 'bg-teal-100 text-teal-900 border-teal-300',
        qrBorder: 'border-teal-600',
        dotColor: 'bg-teal-950',
      }
    : isQr
    ? {
        bgHeader: 'bg-amber-600',
        badge: 'bg-amber-100 text-amber-900 border-amber-300',
        qrBorder: 'border-amber-500',
        dotColor: 'bg-slate-900',
      }
    : isWallet
    ? {
        bgHeader: 'bg-purple-800',
        badge: 'bg-purple-100 text-purple-900 border-purple-300',
        qrBorder: 'border-purple-600',
        dotColor: 'bg-purple-950',
      }
    : isTransfer
    ? {
        bgHeader: 'bg-indigo-800',
        badge: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        qrBorder: 'border-indigo-600',
        dotColor: 'bg-indigo-950',
      }
    : {
        bgHeader: 'bg-slate-900',
        badge: 'bg-slate-100 text-slate-800 dark:text-slate-200 border-slate-300',
        qrBorder: 'border-slate-800',
        dotColor: 'bg-slate-900',
      };

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(accountPhone.replace(/[^0-9a-zA-Z@.-]/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyPseUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && resolvedPseUrl) {
      navigator.clipboard.writeText(resolvedPseUrl);
      setPseCopied(true);
      setTimeout(() => setPseCopied(false), 2500);
    }
  };

  const handleOpenPse = () => {
    if (resolvedPseUrl && typeof window !== 'undefined') {
      window.open(resolvedPseUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`${themeColors.bgHeader} text-white p-4 flex items-center justify-between transition-colors`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden">
              {activeTab === 'pse' ? (
                <img 
                  src="/pse_logo.png" 
                  alt="PSE" 
                  className="w-7 h-7 object-contain rounded-full bg-white p-0.5" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : isBreB ? (
                <Zap className="w-5 h-5 text-amber-800 dark:text-amber-300" />
              ) : isQr ? (
                <QrCode className="w-5 h-5 text-white" />
              ) : isTransfer ? (
                <Building2 className="w-5 h-5 text-white" />
              ) : (
                <Smartphone className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">{title}</h3>
              <p className="text-[11px] text-white/80">{activeTab === 'pse' ? 'Pagos Seguros en Línea (Colombia)' : entity}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transfer Subtabs: Bank Account vs PSE */}
        {hasPseOption && (
          <div className="flex border-b border-slate-200 bg-slate-100 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('standard')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'standard'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Cuenta & QR</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pse')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'pse'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span>Canal PSE</span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-5 flex flex-col items-center text-center space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Amount Badge */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Monto Exacto a Transferir
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5">
              {formatCurrency(totalAmount, currencySymbol)}
            </span>
            {plate && (
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
                Vehículo Placa: <strong className="font-mono text-slate-900 dark:text-slate-100">{plate}</strong>
              </span>
            )}
          </div>

          {/* Active Mode: Standard Transfer QR or PSE QR */}
          {activeTab === 'pse' ? (
            <div className="w-full space-y-3">
              {/* PSE QR Matrix Box */}
              <div className="relative p-2 bg-white border-2 border-dashed border-blue-400 rounded-2xl shadow-sm mx-auto">
                <DynamicQrCode
                  value={resolvedPseUrl}
                  customImageUrl={uploadedQrUrl}
                  size={176}
                  centerLogo="/pse_logo.png"
                  alt="Código QR PSE Colombia"
                />
              </div>

              {/* PSE Direct Link Actions */}
              <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2.5 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                    <Globe className="w-3.5 h-3.5 text-blue-700" />
                    <span>Enlace de Pago PSE</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded">
                    EN LÍNEA
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-700 dark:text-slate-200 bg-white p-2 rounded border border-blue-200 truncate select-all">
                  {resolvedPseUrl}
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleOpenPse}
                    className="flex-1 py-1.5 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-98 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Portal PSE</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPseUrl}
                    className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-blue-300 text-blue-900 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-98 cursor-pointer"
                  >
                    {pseCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{pseCopied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-slate-600 dark:text-slate-300 bg-slate-50 p-2 rounded-lg border border-slate-200 text-left space-y-1">
                <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Instrucciones PSE:
                </div>
                <p>1. El cliente escanea el QR o abre el enlace en su móvil.</p>
                <p>2. Selecciona su banco (Bancolombia, Davivienda, Nequi, etc.) y autoriza.</p>
                <p>3. Ingrese el número de aprobación o CUS arrojado por PSE en el POS.</p>
              </div>
            </div>
          ) : (
            /* Standard Transfer / QR / Wallet Box */
            <>
              {/* Stylized QR Matrix Canvas Box */}
              <div className="relative p-2 bg-white border-2 border-dashed border-slate-300 rounded-2xl shadow-sm mx-auto">
                <DynamicQrCode
                  value={accountPhone || 'Transferencia Bancaria'}
                  customImageUrl={uploadedQrUrl}
                  size={176}
                  alt="Código QR de Pago"
                />
              </div>

              {/* Account and Phone details */}
              <div className="w-full space-y-2 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium block">
                      {isBreB ? 'Llave Bre-B Registrada' : 'Número / Cuenta para Transferir'}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">{accountPhone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1 font-semibold text-[11px] cursor-pointer"
                    title="Copiar número"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 text-center">
                  Titular de cuenta: <strong className="text-slate-800 dark:text-slate-200">{accountHolder}</strong>
                </div>
              </div>

              <p className="text-[10px] text-slate-700 dark:text-slate-200">
                Pídale al cliente escanear con su app bancaria o digitar los datos. Solicite el comprobante y registre el código en el sistema.
              </p>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Listo, Continuar Cobro
          </button>
        </div>
      </div>
    </div>
  );
};
