import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  QrCode, 
  Zap, 
  Building2, 
  Check, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Edit3, 
  Sliders, 
  ExternalLink,
} from 'lucide-react';
import { 
  PaymentGatewayConfig, 
  PaymentMethod, 
  WalletOption, 
  QrOption, 
  BreBKey, 
  CardTerminalOption,
  BankAccountOption
} from '../types';
import { 
  DEFAULT_PAYMENT_GATEWAY_CONFIG, 
  ensurePaymentGatewayConfigDefaults
} from '../utils/paymentUtils';

interface PaymentMethodsSettingsProps {
  config: PaymentGatewayConfig;
  onSaveConfig: (newConfig: PaymentGatewayConfig) => void;
}

export const PaymentMethodsSettings: React.FC<PaymentMethodsSettingsProps> = ({
  config,
  onSaveConfig,
}) => {
  const [localConfig, setLocalConfig] = useState<PaymentGatewayConfig>(() => 
    ensurePaymentGatewayConfigDefaults(config)
  );

  useEffect(() => {
    setLocalConfig(ensurePaymentGatewayConfigDefaults(config));
  }, [config]);

  const [activeSubTab, setActiveSubTab] = useState<'wallets' | 'qrs' | 'bre_b' | 'terminals' | 'bank_accounts' | 'preferences'>('wallets');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New Wallet Form State
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newWallet, setNewWallet] = useState<Partial<WalletOption>>({
    name: '',
    phoneNumber: '',
    holderName: '',
    qrImageUrl: '',
    enabled: true,
  });

  // New QR Form State
  const [showAddQr, setShowAddQr] = useState(false);
  const [newQr, setNewQr] = useState<Partial<QrOption>>({
    name: '',
    bankOrEntity: '',
    accountNumber: '',
    holderName: '',
    qrImageUrl: '',
    enabled: true,
  });

  // New Bre-B Form State
  const [showAddBreB, setShowAddBreB] = useState(false);
  const [newBreB, setNewBreB] = useState<Partial<BreBKey>>({
    keyType: 'phone',
    keyTypeName: 'Número Celular',
    keyValue: '',
    registeredEntity: 'Bancolombia',
    holderName: '',
    enabled: true,
  });

  // New Terminal Form State
  const [showAddTerminal, setShowAddTerminal] = useState(false);
  const [newTerminal, setNewTerminal] = useState<Partial<CardTerminalOption>>({
    name: '',
    serialNumber: '',
    enabled: true,
  });

  // New Bank Account Form State
  const [showAddBankAccount, setShowAddBankAccount] = useState(false);
  const [newBankAccount, setNewBankAccount] = useState<Partial<BankAccountOption>>({
    bankName: '',
    accountType: 'savings',
    accountNumber: '',
    holderName: '',
    holderId: '',
    qrImageUrl: '',
    pseUrl: '',
    pseQrUrl: '',
    enablePse: true,
    enabled: true,
  });

  // Editing state for all types
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWallet, setEditWallet] = useState<Partial<WalletOption>>({});
  const [editQr, setEditQr] = useState<Partial<QrOption>>({});
  const [editBreB, setEditBreB] = useState<Partial<BreBKey>>({});
  const [editTerminal, setEditTerminal] = useState<Partial<CardTerminalOption>>({});
  const [editBankAccount, setEditBankAccount] = useState<Partial<BankAccountOption>>({});

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveConfig(localConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    if (confirm('¿Restablecer la configuración de medios de pago, billeteras, QR y llaves Bre-B a los valores iniciales?')) {
      setLocalConfig(DEFAULT_PAYMENT_GATEWAY_CONFIG);
      onSaveConfig(DEFAULT_PAYMENT_GATEWAY_CONFIG);
    }
  };

  // --- Wallet Helpers ---
  const handleToggleWallet = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      wallets: prev.wallets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w)
    }));
  };

  const handleDeleteWallet = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      wallets: prev.wallets.filter(w => w.id !== id)
    }));
  };

  const handleQrUpload = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartEditWallet = (wallet: WalletOption) => {
    setEditingId(wallet.id);
    setEditWallet({ ...wallet });
  };

  const handleSaveEditWallet = () => {
    if (!editWallet.name || !editWallet.phoneNumber) return;
    setLocalConfig(prev => ({
      ...prev,
      wallets: prev.wallets.map(w => w.id === editingId ? { ...w, ...editWallet as WalletOption } : w)
    }));
    setEditingId(null);
    setEditWallet({});
  };

  const handleCreateWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWallet.name || !newWallet.phoneNumber) return;

    const created: WalletOption = {
      id: `wallet_${Date.now()}`,
      name: newWallet.name.trim(),
      phoneNumber: newWallet.phoneNumber.trim(),
      holderName: newWallet.holderName?.trim() || 'Establecimiento',
      qrImageUrl: newWallet.qrImageUrl || undefined,
      enabled: true,
      icon: 'Smartphone',
    };

    setLocalConfig(prev => ({
      ...prev,
      wallets: [...prev.wallets, created]
    }));

    setNewWallet({ name: '', phoneNumber: '', holderName: '', qrImageUrl: '', enabled: true });
    setShowAddWallet(false);
  };

  // --- QR Helpers ---
  const handleToggleQr = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      qrCodes: prev.qrCodes.map(q => q.id === id ? { ...q, enabled: !q.enabled } : q)
    }));
  };

  const handleDeleteQr = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      qrCodes: prev.qrCodes.filter(q => q.id !== id)
    }));
  };

  const handleStartEditQr = (qr: QrOption) => {
    setEditingId(qr.id);
    setEditQr({ ...qr });
  };

  const handleSaveEditQr = () => {
    if (!editQr.name || !editQr.accountNumber) return;
    setLocalConfig(prev => ({
      ...prev,
      qrCodes: prev.qrCodes.map(q => q.id === editingId ? { ...q, ...editQr as QrOption } : q)
    }));
    setEditingId(null);
    setEditQr({});
  };

  const handleCreateQr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQr.name || !newQr.accountNumber) return;

    const created: QrOption = {
      id: `qr_${Date.now()}`,
      name: newQr.name.trim(),
      bankOrEntity: newQr.bankOrEntity?.trim() || 'Banco',
      accountNumber: newQr.accountNumber.trim(),
      holderName: newQr.holderName?.trim() || 'Establecimiento',
      qrImageUrl: newQr.qrImageUrl || undefined,
      enabled: true,
    };

    setLocalConfig(prev => ({
      ...prev,
      qrCodes: [...prev.qrCodes, created]
    }));

    setNewQr({ name: '', bankOrEntity: '', accountNumber: '', holderName: '', qrImageUrl: '', enabled: true });
    setShowAddQr(false);
  };

  // --- Bre-B Helpers ---
  const handleToggleBreB = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      breBKeys: prev.breBKeys.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b)
    }));
  };

  const handleDeleteBreB = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      breBKeys: prev.breBKeys.filter(b => b.id !== id)
    }));
  };

  const handleStartEditBreB = (b: BreBKey) => {
    setEditingId(b.id);
    setEditBreB({ ...b });
  };

  const handleSaveEditBreB = () => {
    if (!editBreB.keyValue || !editBreB.registeredEntity) return;
    const keyTypeName = 
      editBreB.keyType === 'phone' ? 'Número Celular' :
      editBreB.keyType === 'national_id' ? 'Cédula / NIT' :
      editBreB.keyType === 'email' ? 'Correo Electrónico' : 'Llave Alfanumérica';

    setLocalConfig(prev => ({
      ...prev,
      breBKeys: prev.breBKeys.map(b => b.id === editingId ? { 
        ...b, 
        ...editBreB as BreBKey,
        keyTypeName
      } : b)
    }));
    setEditingId(null);
    setEditBreB({});
  };

  const handleCreateBreB = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBreB.keyValue || !newBreB.registeredEntity) return;

    const keyTypeName = 
      newBreB.keyType === 'phone' ? 'Número Celular' :
      newBreB.keyType === 'national_id' ? 'Cédula / NIT' :
      newBreB.keyType === 'email' ? 'Correo Electrónico' : 'Llave Alfanumérica';

    const created: BreBKey = {
      id: `breb_${Date.now()}`,
      keyType: (newBreB.keyType as any) || 'phone',
      keyTypeName,
      keyValue: newBreB.keyValue.trim(),
      registeredEntity: newBreB.registeredEntity.trim(),
      holderName: newBreB.holderName?.trim() || 'Establecimiento',
      enabled: true,
    };

    setLocalConfig(prev => ({
      ...prev,
      breBKeys: [...prev.breBKeys, created]
    }));

    setNewBreB({ keyType: 'phone', keyTypeName: 'Número Celular', keyValue: '', registeredEntity: 'Bancolombia', holderName: '', enabled: true });
    setShowAddBreB(false);
  };

  // --- Terminal Helpers ---
  const handleToggleTerminal = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      terminals: prev.terminals.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t)
    }));
  };

  const handleDeleteTerminal = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      terminals: prev.terminals.filter(t => t.id !== id)
    }));
  };

  const handleStartEditTerminal = (t: CardTerminalOption) => {
    setEditingId(t.id);
    setEditTerminal({ ...t });
  };

  const handleSaveEditTerminal = () => {
    if (!editTerminal.name) return;
    setLocalConfig(prev => ({
      ...prev,
      terminals: prev.terminals.map(t => t.id === editingId ? { ...t, ...editTerminal as CardTerminalOption } : t)
    }));
    setEditingId(null);
    setEditTerminal({});
  };

  const handleCreateTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerminal.name) return;

    const created: CardTerminalOption = {
      id: `term_${Date.now()}`,
      name: newTerminal.name.trim(),
      serialNumber: newTerminal.serialNumber?.trim() || '',
      enabled: true,
    };

    setLocalConfig(prev => ({
      ...prev,
      terminals: [...prev.terminals, created]
    }));

    setNewTerminal({ name: '', serialNumber: '', enabled: true });
    setShowAddTerminal(false);
  };

  // --- Bank Account Helpers ---
  const handleToggleBankAccount = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b)
    }));
  };

  const handleDeleteBankAccount = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter(b => b.id !== id)
    }));
  };

  const handleStartEditBankAccount = (b: BankAccountOption) => {
    setEditingId(b.id);
    setEditBankAccount({ ...b });
  };

  const handleSaveEditBankAccount = () => {
    if (!editBankAccount.bankName || !editBankAccount.accountNumber) return;
    setLocalConfig(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map(b => b.id === editingId ? { ...b, ...editBankAccount as BankAccountOption } : b)
    }));
    setEditingId(null);
    setEditBankAccount({});
  };

  const handleCreateBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankAccount.bankName || !newBankAccount.accountNumber) return;

    const created: BankAccountOption = {
      id: `bank_${Date.now()}`,
      bankName: newBankAccount.bankName.trim(),
      accountType: newBankAccount.accountType as 'savings' | 'checking' || 'savings',
      accountNumber: newBankAccount.accountNumber.trim(),
      holderName: newBankAccount.holderName?.trim() || 'Establecimiento SAS',
      holderId: newBankAccount.holderId?.trim() || '',
      qrImageUrl: newBankAccount.qrImageUrl || undefined,
      pseUrl: newBankAccount.pseUrl?.trim() || undefined,
      pseQrUrl: newBankAccount.pseQrUrl || undefined,
      enablePse: newBankAccount.enablePse ?? true,
      enabled: true,
    };

    setLocalConfig(prev => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, created]
    }));

    setNewBankAccount({ 
      bankName: '', 
      accountType: 'savings', 
      accountNumber: '', 
      holderName: '', 
      holderId: '', 
      qrImageUrl: '', 
      pseUrl: '', 
      pseQrUrl: '', 
      enablePse: true, 
      enabled: true 
    });
    setShowAddBankAccount(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/70 dark:border-slate-800">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500" />
            <span>Panel de Configuración de Medios de Pago</span>
          </h3>
          <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-0.5">
            Administre las opciones desplegables de Billeteras, Códigos QR, Llaves Bre-B, Datáfonos y políticas de cobro.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-4 text-sm font-bold text-white shadow-[0_10px_20px_-12px_rgba(15,23,42,.6)] transition hover:-translate-y-px cursor-pointer dark:from-blue-500 dark:to-blue-600"
          >
            <Save className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm font-semibold text-emerald-900 flex items-center gap-2 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>¡Configuración de medios de pago y pasarela guardada exitosamente!</span>
        </div>
      )}

      {/* Internal Sub-Tabs Navigation */}
      <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setActiveSubTab('wallets')}
          className={`flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition cursor-pointer ${
            activeSubTab === 'wallets'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Billeteras Digitales ({localConfig.wallets.filter(w => w.enabled).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('qrs')}
          className={`flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition cursor-pointer ${
            activeSubTab === 'qrs'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Códigos QR ({localConfig.qrCodes.filter(q => q.enabled).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('bre_b')}
          className={`flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition cursor-pointer ${
            activeSubTab === 'bre_b'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Llaves Bre-B ({localConfig.breBKeys.filter(b => b.enabled).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('terminals')}
          className={`flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition cursor-pointer ${
            activeSubTab === 'terminals'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Datáfonos ({localConfig.terminals.filter(t => t.enabled).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('bank_accounts')}
          className={`flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition cursor-pointer ${
            activeSubTab === 'bank_accounts'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Cuentas Bancarias ({localConfig.bankAccounts.filter(b => b.enabled).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('preferences')}
          className={`flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition cursor-pointer ${
            activeSubTab === 'preferences'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Políticas de Cobro</span>
        </button>
      </div>

      {/* --- SUB-TAB 1: WALLETS --- */}
      {activeSubTab === 'wallets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Opciones de Billeteras Digitales
              </h4>
              <p className="text-[13px] text-slate-600 dark:text-slate-400">
                Aparecerán dentro del botón principal "Billeteras" en la pantalla de cobro.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddWallet(prev => !prev)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-4 text-sm font-semibold text-purple-800 transition hover:bg-purple-100 cursor-pointer dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-200 dark:hover:bg-purple-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddWallet ? 'Cancelar' : 'Nueva Billetera'}</span>
            </button>
          </div>

          {/* Add Wallet Form */}
          {showAddWallet && (
            <form onSubmit={handleCreateWallet} className="rounded-2xl border border-purple-200 bg-purple-50 p-4 space-y-3 dark:border-purple-500/30 dark:bg-purple-500/10">
              <h5 className="font-display text-base font-bold text-purple-900 dark:text-purple-100">Agregar Billetera Digital</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Nombre (ej. Nequi, Daviplata, Dale)</label>
                  <input
                    type="text"
                    required
                    value={newWallet.name}
                    onChange={e => setNewWallet(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nequi"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Número de Celular / Cuenta</label>
                  <input
                    type="text"
                    required
                    value={newWallet.phoneNumber}
                    onChange={e => setNewWallet(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="310 892 4511"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Nombre del Titular</label>
                  <input
                    type="text"
                    value={newWallet.holderName}
                    onChange={e => setNewWallet(prev => ({ ...prev, holderName: e.target.value }))}
                    placeholder="Estacionamiento Central"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Imagen QR Digital (Opcional)</label>
                  <div className="flex items-center gap-2.5">
                    {newWallet.qrImageUrl ? (
                      <div className="relative group shrink-0 w-12 h-12 border border-slate-300 rounded-xl overflow-hidden bg-white">
                        <img src={newWallet.qrImageUrl} alt="QR preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setNewWallet(prev => ({ ...prev, qrImageUrl: '' }))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="w-12 h-12 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 shrink-0">
                        <QrCode className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      id="new-wallet-qr"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleQrUpload(file, (base64) => {
                            setNewWallet(prev => ({ ...prev, qrImageUrl: base64 }));
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor="new-wallet-qr"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      Cargar Imagen QR
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddWallet(false)}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-purple-600 to-purple-700 px-4 text-sm font-bold text-white shadow-[0_10px_20px_-12px_rgba(15,23,42,.6)] transition hover:-translate-y-px cursor-pointer dark:from-purple-500 dark:to-purple-600"
                >
                  Guardar Billetera
                </button>
              </div>
            </form>
          )}

          {/* Wallets List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {localConfig.wallets.map((wallet) => (
              <div
                key={wallet.id}
                className={`p-4 rounded-2xl border transition ${
                  wallet.enabled
                    ? 'wz-surface border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] dark:border-white/[0.07] dark:bg-slate-900'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-60'
                }`}
              >
                {editingId === wallet.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEditWallet();
                    }}
                    className="space-y-3 motion-safe:animate-in motion-safe:fade-in duration-100"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Nombre</label>
                        <input
                          type="text"
                          required
                          value={editWallet.name || ''}
                          onChange={e => setEditWallet(prev => ({ ...prev, name: e.target.value }))}
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Celular / Cuenta</label>
                        <input
                          type="text"
                          required
                          value={editWallet.phoneNumber || ''}
                          onChange={e => setEditWallet(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono tabular-nums"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Titular</label>
                        <input
                          type="text"
                          required
                          value={editWallet.holderName || ''}
                          onChange={e => setEditWallet(prev => ({ ...prev, holderName: e.target.value }))}
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Código QR Digital</label>
                        <div className="flex items-center gap-2.5">
                          {editWallet.qrImageUrl ? (
                            <div className="relative group shrink-0 w-12 h-12 border border-slate-300 dark:border-slate-600 rounded-xl bg-white overflow-hidden">
                              <img src={editWallet.qrImageUrl} alt="QR preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              <button
                                type="button"
                                onClick={() => setEditWallet(prev => ({ ...prev, qrImageUrl: '' }))}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity cursor-pointer"
                              >
                                Quitar
                              </button>
                            </div>
                          ) : (
                            <div className="w-12 h-12 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 shrink-0">
                              <QrCode className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            id={`edit-wallet-qr-${wallet.id}`}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleQrUpload(file, (base64) => {
                                  setEditWallet(prev => ({ ...prev, qrImageUrl: base64 }));
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor={`edit-wallet-qr-${wallet.id}`}
                            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                          >
                            Cargar Imagen QR
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditWallet}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-b from-purple-600 to-purple-700 px-3.5 text-sm font-bold text-white cursor-pointer transition hover:-translate-y-px dark:from-purple-500 dark:to-purple-600"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-200">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{wallet.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${
                            wallet.enabled
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                          }`}>
                            {wallet.enabled ? 'Activa' : 'Inactiva'}
                          </span>
                          {wallet.qrImageUrl && (
                            <span className="text-xs bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <QrCode className="w-2.5 h-2.5" />
                              <span>Con QR</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] font-mono tabular-nums text-slate-600 dark:text-slate-400 mt-0.5">
                          {wallet.phoneNumber} • <span className="font-sans text-slate-600 dark:text-slate-400">{wallet.holderName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartEditWallet(wallet)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        title="Editar billetera"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleWallet(wallet.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                          wallet.enabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${wallet.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWallet(wallet.id)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 cursor-pointer dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                        title="Eliminar opción"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 2: QR CODES --- */}
      {activeSubTab === 'qrs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Opciones de Códigos QR Disponibles
              </h4>
              <p className="text-[13px] text-slate-600 dark:text-slate-400">
                Aparecerán dentro del botón principal "Códigos QR" en la liquidación.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddQr(prev => !prev)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 cursor-pointer dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddQr ? 'Cancelar' : 'Nuevo Código QR'}</span>
            </button>
          </div>

          {/* Add QR Form */}
          {showAddQr && (
            <form onSubmit={handleCreateQr} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              <h5 className="font-display text-base font-bold text-amber-900 dark:text-amber-100">Registrar Nuevo Código QR</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Nombre Descriptivo</label>
                  <input
                    type="text"
                    required
                    value={newQr.name}
                    onChange={e => setNewQr(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="QR Bancolombia / QR Redeban"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Banco o Red Emisora</label>
                  <input
                    type="text"
                    value={newQr.bankOrEntity}
                    onChange={e => setNewQr(prev => ({ ...prev, bankOrEntity: e.target.value }))}
                    placeholder="Bancolombia / Redeban"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Número de Cuenta o Código de Comercio</label>
                  <input
                    type="text"
                    required
                    value={newQr.accountNumber}
                    onChange={e => setNewQr(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="Cta Ahorros: 458-923841-02"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Nombre del Titular</label>
                  <input
                    type="text"
                    value={newQr.holderName}
                    onChange={e => setNewQr(prev => ({ ...prev, holderName: e.target.value }))}
                    placeholder="Estacionamiento Central SAS"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Imagen QR Digital (Opcional)</label>
                  <div className="flex items-center gap-2.5">
                    {newQr.qrImageUrl ? (
                      <div className="relative group shrink-0 w-12 h-12 border border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden bg-white">
                        <img src={newQr.qrImageUrl} alt="QR preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setNewQr(prev => ({ ...prev, qrImageUrl: '' }))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="w-12 h-12 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 shrink-0">
                        <QrCode className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      id="new-qr-image"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleQrUpload(file, (base64) => {
                            setNewQr(prev => ({ ...prev, qrImageUrl: base64 }));
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor="new-qr-image"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      Cargar Imagen QR
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddQr(false)}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-600 to-amber-700 px-4 text-sm font-bold text-white shadow-[0_10px_20px_-12px_rgba(15,23,42,.6)] transition hover:-translate-y-px cursor-pointer dark:from-amber-500 dark:to-amber-600"
                >
                  Guardar Código QR
                </button>
              </div>
            </form>
          )}

          {/* QR List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {localConfig.qrCodes.map((qr) => (
              <div
                key={qr.id}
                className={`p-4 rounded-2xl border transition ${
                  qr.enabled
                    ? 'wz-surface border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] dark:border-white/[0.07] dark:bg-slate-900'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-60'
                }`}
              >
                {editingId === qr.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEditQr();
                    }}
                    className="space-y-3 motion-safe:animate-in motion-safe:fade-in duration-100"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Nombre Descriptivo</label>
                        <input
                          type="text"
                          required
                          value={editQr.name || ''}
                          onChange={e => setEditQr(prev => ({ ...prev, name: e.target.value }))}
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Banco o Entidad</label>
                        <input
                          type="text"
                          required
                          value={editQr.bankOrEntity || ''}
                          onChange={e => setEditQr(prev => ({ ...prev, bankOrEntity: e.target.value }))}
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">N° Cuenta o Comercio</label>
                        <input
                          type="text"
                          required
                          value={editQr.accountNumber || ''}
                          onChange={e => setEditQr(prev => ({ ...prev, accountNumber: e.target.value }))}
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Titular</label>
                        <input
                          type="text"
                          required
                          value={editQr.holderName || ''}
                          onChange={e => setEditQr(prev => ({ ...prev, holderName: e.target.value }))}
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Imagen QR Digital</label>
                        <div className="flex items-center gap-2.5">
                          {editQr.qrImageUrl ? (
                            <div className="relative group shrink-0 w-12 h-12 border border-slate-300 dark:border-slate-600 rounded-xl bg-white overflow-hidden">
                              <img src={editQr.qrImageUrl} alt="QR preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              <button
                                type="button"
                                onClick={() => setEditQr(prev => ({ ...prev, qrImageUrl: '' }))}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity cursor-pointer"
                              >
                                Quitar
                              </button>
                            </div>
                          ) : (
                            <div className="w-12 h-12 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 shrink-0">
                              <QrCode className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            id={`edit-qr-img-${qr.id}`}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleQrUpload(file, (base64) => {
                                  setEditQr(prev => ({ ...prev, qrImageUrl: base64 }));
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor={`edit-qr-img-${qr.id}`}
                            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                          >
                            Cargar Imagen QR
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditQr}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-b from-amber-600 to-amber-700 px-3.5 text-sm font-bold text-white cursor-pointer transition hover:-translate-y-px dark:from-amber-500 dark:to-amber-600"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{qr.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${
                            qr.enabled
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                          }`}>
                            {qr.enabled ? 'Activo' : 'Inactivo'}
                          </span>
                          {qr.qrImageUrl && (
                            <span className="text-xs bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <QrCode className="w-2.5 h-2.5" />
                              <span>Con QR</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] font-mono tabular-nums text-slate-600 dark:text-slate-400 mt-0.5">
                          {qr.accountNumber} • <span className="font-sans text-slate-600 dark:text-slate-400">{qr.bankOrEntity}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartEditQr(qr)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        title="Editar código QR"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleQr(qr.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                          qr.enabled ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${qr.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQr(qr.id)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 cursor-pointer dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                        title="Eliminar opción"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 3: BRE-B KEYS --- */}
      {activeSubTab === 'bre_b' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Llaves Interoperables Bre-B (Banco de la República)
              </h4>
              <p className="text-[13px] text-slate-600 dark:text-slate-400">
                Sistema nacional de pagos instantáneos en Colombia. Aparecerán dentro del botón "Llave Bre-B".
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddBreB(prev => !prev)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-semibold text-teal-800 transition hover:bg-teal-100 cursor-pointer dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200 dark:hover:bg-teal-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddBreB ? 'Cancelar' : 'Nueva Llave Bre-B'}</span>
            </button>
          </div>

          {/* Add Bre-B Form */}
          {showAddBreB && (
            <form onSubmit={handleCreateBreB} className="rounded-2xl border border-teal-200 bg-teal-50 p-4 space-y-3 dark:border-teal-500/30 dark:bg-teal-500/10">
              <h5 className="font-display text-base font-bold text-teal-900 dark:text-teal-100">Registrar Llave Bre-B</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Tipo de Llave</label>
                  <select
                    value={newBreB.keyType}
                    onChange={e => setNewBreB(prev => ({ ...prev, keyType: e.target.value as any }))}
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="phone" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Número Celular</option>
                    <option value="national_id" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Cédula / NIT</option>
                    <option value="email" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Correo Electrónico</option>
                    <option value="code" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Código Alfanumérico</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Valor de la Llave</label>
                  <input
                    type="text"
                    required
                    value={newBreB.keyValue}
                    onChange={e => setNewBreB(prev => ({ ...prev, keyValue: e.target.value }))}
                    placeholder="3108924511 o NIT"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Entidad Bancaria Aliada</label>
                  <input
                    type="text"
                    required
                    value={newBreB.registeredEntity}
                    onChange={e => setNewBreB(prev => ({ ...prev, registeredEntity: e.target.value }))}
                    placeholder="Bancolombia / Davivienda / Nequi"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Titular</label>
                  <input
                    type="text"
                    value={newBreB.holderName}
                    onChange={e => setNewBreB(prev => ({ ...prev, holderName: e.target.value }))}
                    placeholder="Estacionamiento Central SAS"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddBreB(false)}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-teal-600 to-teal-700 px-4 text-sm font-bold text-white shadow-[0_10px_20px_-12px_rgba(15,23,42,.6)] transition hover:-translate-y-px cursor-pointer dark:from-teal-500 dark:to-teal-600"
                >
                  Guardar Llave Bre-B
                </button>
              </div>
            </form>
          )}

          {/* Bre-B List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {localConfig.breBKeys.map((key) => (
              <div
                key={key.id}
                className={`p-4 rounded-2xl border transition ${
                  key.enabled
                    ? 'wz-surface border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] dark:border-white/[0.07] dark:bg-slate-900'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-60'
                }`}
              >
                {editingId === key.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEditBreB();
                    }}
                    className="space-y-3 motion-safe:animate-in motion-safe:fade-in duration-100"
                  >
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Tipo de Llave</label>
                      <select
                        value={editBreB.keyType || 'phone'}
                        onChange={e => setEditBreB(prev => ({ ...prev, keyType: e.target.value as any }))}
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="phone" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Número Celular</option>
                        <option value="national_id" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Cédula / NIT</option>
                        <option value="email" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Correo Electrónico</option>
                        <option value="alphanumeric" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Llave Alfanumérica</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Valor de la Llave</label>
                      <input
                        type="text"
                        required
                        value={editBreB.keyValue || ''}
                        onChange={e => setEditBreB(prev => ({ ...prev, keyValue: e.target.value }))}
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Entidad Bancaria</label>
                      <input
                        type="text"
                        required
                        value={editBreB.registeredEntity || ''}
                        onChange={e => setEditBreB(prev => ({ ...prev, registeredEntity: e.target.value }))}
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Titular</label>
                      <input
                        type="text"
                        required
                        value={editBreB.holderName || ''}
                        onChange={e => setEditBreB(prev => ({ ...prev, holderName: e.target.value }))}
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditBreB}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-b from-teal-600 to-teal-700 px-3.5 text-sm font-bold text-white cursor-pointer transition hover:-translate-y-px dark:from-teal-500 dark:to-teal-600"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-200">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{key.keyTypeName}</span>
                        </div>
                        <div className="text-sm font-bold font-mono tabular-nums text-teal-900 dark:text-teal-200 mt-0.5">
                          {key.keyValue}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {key.registeredEntity} • {key.holderName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditBreB(key)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        title="Editar llave"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleBreB(key.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                          key.enabled ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${key.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBreB(key.id)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 cursor-pointer dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                        title="Eliminar llave"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 4: CARD TERMINALS --- */}
      {activeSubTab === 'terminals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Datáfonos y Terminales de Pago con Tarjeta
              </h4>
              <p className="text-[13px] text-slate-600 dark:text-slate-400">
                Dispositivos POS autorizados para cobro con tarjeta Débito / Crédito.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddTerminal(prev => !prev)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 cursor-pointer dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddTerminal ? 'Cancelar' : 'Nuevo Datáfono'}</span>
            </button>
          </div>

          {/* Add Terminal Form */}
          {showAddTerminal && (
            <form onSubmit={handleCreateTerminal} className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3 dark:border-blue-500/30 dark:bg-blue-500/10">
              <h5 className="font-display text-base font-bold text-blue-900 dark:text-blue-100">Registrar Datáfono</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Nombre o Red (Redeban, Bold, Credibanco)</label>
                  <input
                    type="text"
                    required
                    value={newTerminal.name}
                    onChange={e => setNewTerminal(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Datáfono Bold Móvil"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Número Serial / Identificador</label>
                  <input
                    type="text"
                    value={newTerminal.serialNumber}
                    onChange={e => setNewTerminal(prev => ({ ...prev, serialNumber: e.target.value }))}
                    placeholder="BLD-10294"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono tabular-nums"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddTerminal(false)}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-4 text-sm font-bold text-white shadow-[0_10px_20px_-12px_rgba(15,23,42,.6)] transition hover:-translate-y-px cursor-pointer dark:from-blue-500 dark:to-blue-600"
                >
                  Guardar Datáfono
                </button>
              </div>
            </form>
          )}

          {/* Terminal List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {localConfig.terminals.map((term) => (
              <div
                key={term.id}
                className={`p-4 rounded-2xl border transition ${
                  term.enabled
                    ? 'wz-surface border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] dark:border-white/[0.07] dark:bg-slate-900'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-60'
                }`}
              >
                {editingId === term.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEditTerminal();
                    }}
                    className="space-y-3 motion-safe:animate-in motion-safe:fade-in duration-100"
                  >
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Nombre / Red</label>
                      <input
                        type="text"
                        required
                        value={editTerminal.name || ''}
                        onChange={e => setEditTerminal(prev => ({ ...prev, name: e.target.value }))}
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Número Serial / Identificador</label>
                      <input
                        type="text"
                        value={editTerminal.serialNumber || ''}
                        onChange={e => setEditTerminal(prev => ({ ...prev, serialNumber: e.target.value }))}
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono tabular-nums"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditTerminal}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-3.5 text-sm font-bold text-white cursor-pointer transition hover:-translate-y-px dark:from-blue-500 dark:to-blue-600"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{term.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${
                            term.enabled
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                          }`}>
                            {term.enabled ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        {term.serialNumber && (
                          <div className="text-[13px] font-mono tabular-nums text-slate-600 dark:text-slate-400 mt-0.5">
                            Serial: {term.serialNumber}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartEditTerminal(term)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        title="Editar datáfono"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleTerminal(term.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                          term.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${term.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTerminal(term.id)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 cursor-pointer dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                        title="Eliminar datáfono"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 5: BANK ACCOUNTS --- */}
      {activeSubTab === 'bank_accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Cuentas Bancarias para Transferencia Directa
              </h4>
              <p className="text-[13px] text-slate-600 dark:text-slate-400">
                Administre las cuentas bancarias autorizadas para recibir pagos por transferencia. Puede montar el código QR de cada una.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddBankAccount(prev => !prev)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-100 cursor-pointer dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddBankAccount ? 'Cancelar' : 'Nueva Cuenta Bancaria'}</span>
            </button>
          </div>

          {/* Add Bank Account Form */}
          {showAddBankAccount && (
            <form onSubmit={handleCreateBankAccount} className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 space-y-3 dark:border-indigo-500/30 dark:bg-indigo-500/10 motion-safe:animate-in motion-safe:slide-in-from-top-2 duration-150">
              <h5 className="font-display text-base font-bold text-indigo-900 dark:text-indigo-100">Registrar Nueva Cuenta Bancaria</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Entidad Bancaria</label>
                  <input
                    type="text"
                    required
                    value={newBankAccount.bankName || ''}
                    onChange={e => setNewBankAccount(prev => ({ ...prev, bankName: e.target.value }))}
                    placeholder="e.g. Bancolombia, Banco de Bogotá"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Tipo de Cuenta</label>
                  <select
                    value={newBankAccount.accountType || 'savings'}
                    onChange={e => setNewBankAccount(prev => ({ ...prev, accountType: e.target.value as 'savings' | 'checking' }))}
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="savings">Ahorros</option>
                    <option value="checking">Corriente</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Número de Cuenta</label>
                  <input
                    type="text"
                    required
                    value={newBankAccount.accountNumber || ''}
                    onChange={e => setNewBankAccount(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="e.g. 458-923841-02"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Titular de la Cuenta</label>
                  <input
                    type="text"
                    value={newBankAccount.holderName || ''}
                    onChange={e => setNewBankAccount(prev => ({ ...prev, holderName: e.target.value }))}
                    placeholder="e.g. Estacionamiento Central SAS"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Documento / NIT</label>
                  <input
                    type="text"
                    value={newBankAccount.holderId || ''}
                    onChange={e => setNewBankAccount(prev => ({ ...prev, holderId: e.target.value }))}
                    placeholder="e.g. NIT 901.458.723-1"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">URL de Código QR (Opcional)</label>
                  <input
                    type="text"
                    value={newBankAccount.qrImageUrl || ''}
                    onChange={e => setNewBankAccount(prev => ({ ...prev, qrImageUrl: e.target.value }))}
                    placeholder="https://ejemplo.com/qr-cuenta.png"
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Upload QR Digital Image File */}
              <div className="rounded-xl border border-dashed border-indigo-200 bg-white p-3 dark:border-indigo-500/30 dark:bg-slate-800/80">
                <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Cargar Imagen Digital de Código QR</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleQrUpload(e.target.files[0], (base64) => {
                          setNewBankAccount(prev => ({ ...prev, qrImageUrl: base64 }));
                        });
                      }
                    }}
                    className="text-sm text-slate-600 dark:text-slate-400 file:mr-3 file:min-h-[40px] file:rounded-xl file:border-0 file:px-3 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-500/15 file:text-indigo-800 dark:file:text-indigo-200 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-500/25 cursor-pointer"
                  />
                  {newBankAccount.qrImageUrl && (
                    <div className="flex items-center gap-2">
                      <img
                        src={newBankAccount.qrImageUrl}
                        alt="Previsualización"
                        className="w-8 h-8 rounded-lg border object-contain bg-white"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setNewBankAccount(prev => ({ ...prev, qrImageUrl: '' }))}
                        className="inline-flex min-h-[44px] items-center px-2 text-xs font-semibold text-rose-700 hover:underline cursor-pointer dark:text-rose-300"
                      >
                        Quitar QR
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* PSE Integration Settings for this account */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-3 dark:border-blue-500/30 dark:bg-blue-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src="/pse_logo.png" alt="PSE" className="w-5 h-5 rounded-full object-contain bg-white p-0.5" />
                    <span className="text-sm font-bold text-blue-900 dark:text-blue-200">Integración de Pagos PSE para esta Cuenta</span>
                  </div>
                  <label className="flex min-h-[44px] items-center gap-2 cursor-pointer text-sm font-semibold text-blue-900 dark:text-blue-200">
                    <input
                      type="checkbox"
                      checked={newBankAccount.enablePse ?? true}
                      onChange={e => setNewBankAccount(prev => ({ ...prev, enablePse: e.target.checked }))}
                      className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Habilitar PSE</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">
                      Enlace de Pago PSE (URL Portal)
                    </label>
                    <input
                      type="url"
                      value={newBankAccount.pseUrl || ''}
                      onChange={e => setNewBankAccount(prev => ({ ...prev, pseUrl: e.target.value }))}
                      placeholder="https://www.pse.com.co/pago-en-linea"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">
                      URL de Código QR PSE (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newBankAccount.pseQrUrl || ''}
                      onChange={e => setNewBankAccount(prev => ({ ...prev, pseQrUrl: e.target.value }))}
                      placeholder="/pse_logo.png o URL externa"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono tabular-nums"
                    />
                  </div>
                </div>

                {/* Subir archivo de imagen QR PSE */}
                <div className="flex items-center gap-3 pt-2 border-t border-blue-200/70 dark:border-blue-500/20">
                  <label className="text-[13px] font-medium text-blue-900 dark:text-blue-200 shrink-0">Subir QR de PSE:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleQrUpload(e.target.files[0], (base64) => {
                          setNewBankAccount(prev => ({ ...prev, pseQrUrl: base64 }));
                        });
                      }
                    }}
                    className="text-sm text-slate-600 dark:text-slate-400 file:mr-3 file:min-h-[40px] file:rounded-xl file:border-0 file:px-3 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-500/15 file:text-blue-800 dark:file:text-blue-200 hover:file:bg-blue-100 dark:hover:file:bg-blue-500/25 cursor-pointer"
                  />
                  {newBankAccount.pseQrUrl && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <img
                        src={newBankAccount.pseQrUrl}
                        alt="QR PSE"
                        className="w-6 h-6 rounded-lg border object-contain bg-white"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setNewBankAccount(prev => ({ ...prev, pseQrUrl: '' }))}
                        className="inline-flex min-h-[44px] items-center px-2 text-xs font-semibold text-rose-700 hover:underline cursor-pointer dark:text-rose-300"
                      >
                        Quitar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-indigo-600 to-indigo-700 px-4 text-sm font-bold text-white shadow-[0_10px_20px_-12px_rgba(15,23,42,.6)] transition hover:-translate-y-px cursor-pointer dark:from-indigo-500 dark:to-indigo-600"
                >
                  Registrar Cuenta
                </button>
              </div>
            </form>
          )}

          {/* Bank Accounts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {localConfig.bankAccounts.map((account) => (
              <div
                key={account.id}
                className={`p-4 rounded-2xl border transition ${
                  account.enabled
                    ? 'wz-surface border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] dark:border-white/[0.07] dark:bg-slate-900'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-60'
                }`}
              >
                {editingId === account.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEditBankAccount();
                    }}
                    className="space-y-3 motion-safe:animate-in motion-safe:fade-in duration-100"
                  >
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Banco</label>
                        <input
                          type="text"
                          required
                          value={editBankAccount.bankName || ''}
                          onChange={e => setEditBankAccount(prev => ({ ...prev, bankName: e.target.value }))}
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Tipo</label>
                        <select
                          value={editBankAccount.accountType || 'savings'}
                          onChange={e => setEditBankAccount(prev => ({ ...prev, accountType: e.target.value as 'savings' | 'checking' }))}
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value="savings">Ahorros</option>
                          <option value="checking">Corriente</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">N° Cuenta</label>
                        <input
                          type="text"
                          required
                          value={editBankAccount.accountNumber || ''}
                          onChange={e => setEditBankAccount(prev => ({ ...prev, accountNumber: e.target.value }))}
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Titular</label>
                        <input
                          type="text"
                          value={editBankAccount.holderName || ''}
                          onChange={e => setEditBankAccount(prev => ({ ...prev, holderName: e.target.value }))}
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Documento / NIT</label>
                        <input
                          type="text"
                          value={editBankAccount.holderId || ''}
                          onChange={e => setEditBankAccount(prev => ({ ...prev, holderId: e.target.value }))}
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">URL QR</label>
                        <input
                          type="text"
                          value={editBankAccount.qrImageUrl || ''}
                          onChange={e => setEditBankAccount(prev => ({ ...prev, qrImageUrl: e.target.value }))}
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* QR upload in edit */}
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800/60">
                      <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Actualizar Imagen QR</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleQrUpload(e.target.files[0], (base64) => {
                                setEditBankAccount(prev => ({ ...prev, qrImageUrl: base64 }));
                              });
                            }
                          }}
                          className="text-sm text-slate-600 dark:text-slate-400 file:mr-3 file:min-h-[40px] file:rounded-xl file:border-0 file:px-3 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-500/15 file:text-indigo-800 dark:file:text-indigo-200 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-500/25 cursor-pointer"
                        />
                        {editBankAccount.qrImageUrl && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <img
                              src={editBankAccount.qrImageUrl}
                              alt="QR"
                              className="w-6 h-6 border object-contain bg-white rounded-lg"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setEditBankAccount(prev => ({ ...prev, qrImageUrl: '' }))}
                              className="inline-flex min-h-[44px] items-center px-2 text-xs font-semibold text-rose-700 hover:underline cursor-pointer dark:text-rose-300"
                            >
                              Quitar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PSE configuration in edit */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-3 dark:border-blue-500/30 dark:bg-blue-500/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <img src="/pse_logo.png" alt="PSE" className="w-4 h-4 rounded-full object-contain bg-white p-0.5" />
                          <span className="text-sm font-bold text-blue-900 dark:text-blue-200">Configuración PSE</span>
                        </div>
                        <label className="flex min-h-[44px] items-center gap-2 cursor-pointer text-sm font-semibold text-blue-900 dark:text-blue-200">
                          <input
                            type="checkbox"
                            checked={editBankAccount.enablePse ?? true}
                            onChange={e => setEditBankAccount(prev => ({ ...prev, enablePse: e.target.checked }))}
                            className="h-5 w-5 rounded text-blue-600 cursor-pointer"
                          />
                          <span>PSE Activo</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">Enlace Pago PSE</label>
                          <input
                            type="url"
                            value={editBankAccount.pseUrl || ''}
                            onChange={e => setEditBankAccount(prev => ({ ...prev, pseUrl: e.target.value }))}
                            placeholder="https://..."
                            className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-400">URL QR PSE</label>
                          <input
                            type="text"
                            value={editBankAccount.pseQrUrl || ''}
                            onChange={e => setEditBankAccount(prev => ({ ...prev, pseQrUrl: e.target.value }))}
                            placeholder="/pse_logo.png o URL"
                            className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono tabular-nums"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-blue-200/70 dark:border-blue-500/20">
                        <label className="text-[13px] font-medium text-blue-900 dark:text-blue-200 shrink-0">Subir QR PSE:</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleQrUpload(e.target.files[0], (base64) => {
                                setEditBankAccount(prev => ({ ...prev, pseQrUrl: base64 }));
                              });
                            }
                          }}
                          className="text-sm text-slate-600 dark:text-slate-400 file:mr-3 file:min-h-[40px] file:rounded-xl file:border-0 file:px-3 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-500/15 file:text-blue-800 dark:file:text-blue-200 hover:file:bg-blue-100 dark:hover:file:bg-blue-500/25 cursor-pointer"
                        />
                        {editBankAccount.pseQrUrl && (
                          <div className="flex items-center gap-1 shrink-0">
                            <img
                              src={editBankAccount.pseQrUrl}
                              alt="QR PSE"
                              className="w-5 h-5 border object-contain bg-white rounded-lg"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setEditBankAccount(prev => ({ ...prev, pseQrUrl: '' }))}
                              className="inline-flex min-h-[44px] items-center px-2 text-xs font-semibold text-rose-700 hover:underline cursor-pointer dark:text-rose-300"
                            >
                              Quitar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-b from-indigo-600 to-indigo-700 px-3.5 text-sm font-bold text-white cursor-pointer transition hover:-translate-y-px dark:from-indigo-500 dark:to-indigo-600"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-500/30">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-base font-bold text-slate-900 dark:text-slate-100">{account.bankName}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold border ${
                            account.accountType === 'savings'
                              ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-500/30'
                              : 'bg-blue-50 dark:bg-blue-500/10 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-500/30'
                          }`}>
                            {account.accountType === 'savings' ? 'Ahorros' : 'Corriente'}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                          N°: {account.accountNumber}
                        </div>
                        <div className="text-[13px] text-slate-600 dark:text-slate-400">
                          Titular: <span className="font-medium text-slate-800 dark:text-slate-100">{account.holderName}</span>
                        </div>
                        {account.holderId && (
                          <div className="text-xs text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                            Doc: {account.holderId}
                          </div>
                        )}
                        {account.qrImageUrl && (
                          <div className="pt-1.5 flex items-center gap-2">
                            <span className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1">
                              <QrCode className="w-3.5 h-3.5" />
                              Código QR Vinculado
                            </span>
                            <div className="relative group">
                              <img
                                src={account.qrImageUrl}
                                alt="QR Bancario"
                                className="w-8 h-8 rounded-lg border object-contain bg-white cursor-zoom-in hover:scale-150 transition-transform origin-left duration-200"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        )}

                        {/* PSE Status, Portal Link & PSE QR */}
                        {(account.enablePse ?? true) && (
                          <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 mt-3 flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-2.5 py-1 rounded-lg">
                              <img src="/pse_logo.png" alt="PSE" className="w-4 h-4 rounded-full object-contain bg-white p-0.5" />
                              <span className="text-xs font-bold text-blue-900 dark:text-blue-200">Canal PSE Habilitado</span>
                            </div>
                            {account.pseUrl && (
                              <a
                                href={account.pseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-blue-800 dark:text-blue-200 hover:text-blue-900 dark:hover:text-blue-100 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>Probar Portal PSE</span>
                              </a>
                            )}
                            {account.pseQrUrl && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 font-bold">QR PSE:</span>
                                <img
                                  src={account.pseQrUrl}
                                  alt="QR PSE"
                                  className="w-6 h-6 rounded-lg border border-blue-200 dark:border-blue-800 object-contain bg-white cursor-zoom-in hover:scale-150 transition-transform origin-left duration-200"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartEditBankAccount(account)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        title="Editar cuenta bancaria"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleBankAccount(account.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                          account.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${account.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBankAccount(account.id)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 cursor-pointer dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                        title="Eliminar cuenta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 5: PREFERENCES --- */}
      {activeSubTab === 'preferences' && (
        <div className="wz-surface rounded-[22px] border border-slate-900/[0.06] bg-gradient-to-b from-white to-slate-50/60 shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:border-white/[0.07] dark:from-slate-900 dark:to-slate-900/80 dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] p-5 space-y-4">
          <h4 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Políticas Generales y Comportamiento POS
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="wz-surface rounded-2xl border border-slate-900/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] dark:border-white/[0.07] dark:bg-slate-900 space-y-2">
              <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Medio de Pago por Defecto</label>
              <select
                value={localConfig.defaultMethod}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, defaultMethod: e.target.value as PaymentMethod }))}
                className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta Débito / Crédito</option>
                <option value="wallet">Billetera Digital</option>
                <option value="qr">Código QR</option>
                <option value="bre_b">Llave Bre-B</option>
                <option value="transfer">Transferencia Bancaria</option>
              </select>
              <p className="text-[13px] text-slate-600 dark:text-slate-400">Preseleccionado automáticamente al abrir el diálogo de cobro.</p>
            </div>

            <div className="wz-surface rounded-2xl border border-slate-900/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] dark:border-white/[0.07] dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Permitir Pago Mixto</span>
                <input
                  type="checkbox"
                  checked={localConfig.allowMixedPayment}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, allowMixedPayment: e.target.checked }))}
                  className="h-5 w-5 rounded text-amber-600 cursor-pointer"
                />
              </div>
              <p className="text-[13px] text-slate-600 dark:text-slate-400">
                Permite combinar Efectivo con Billeteras (Nequi, Daviplata), QR, Bre-B o Tarjeta en un solo cobro.
              </p>
            </div>

            <div className="wz-surface rounded-2xl border border-slate-900/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] dark:border-white/[0.07] dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Exigir N° Referencia / Aprobación</span>
                <input
                  type="checkbox"
                  checked={localConfig.requireReferenceForElectronic}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, requireReferenceForElectronic: e.target.checked }))}
                  className="h-5 w-5 rounded text-amber-600 cursor-pointer"
                />
              </div>
              <p className="text-[13px] text-slate-600 dark:text-slate-400">
                Obliga al cajero a registrar el número de comprobante de la transferencia o voucher del datáfono.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
