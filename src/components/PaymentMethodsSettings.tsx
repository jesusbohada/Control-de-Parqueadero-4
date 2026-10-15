import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Banknote, 
  Smartphone, 
  QrCode, 
  Zap, 
  Layers, 
  Building2, 
  Check, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Edit3, 
  Sliders, 
  ArrowRightLeft,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Globe
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
  DEFAULT_WALLETS, 
  DEFAULT_QR_CODES, 
  DEFAULT_BRE_B_KEYS, 
  DEFAULT_TERMINALS,
  DEFAULT_BANK_ACCOUNTS,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500" />
            <span>Panel de Configuración de Medios de Pago</span>
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            Administre las opciones desplegables de Billeteras, Códigos QR, Llaves Bre-B, Datáfonos y políticas de cobro.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-sm transition-all active:scale-98"
          >
            <Save className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 font-black" />
          <span>¡Configuración de medios de pago y pasarela guardada exitosamente!</span>
        </div>
      )}

      {/* Internal Sub-Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('wallets')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'wallets'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Billeteras Digitales ({localConfig.wallets.filter(w => w.enabled).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('qrs')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'qrs'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Códigos QR ({localConfig.qrCodes.filter(q => q.enabled).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('bre_b')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'bre_b'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Llaves Bre-B ({localConfig.breBKeys.filter(b => b.enabled).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('terminals')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'terminals'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Datáfonos ({localConfig.terminals.filter(t => t.enabled).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('bank_accounts')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'bank_accounts'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Cuentas Bancarias ({localConfig.bankAccounts.filter(b => b.enabled).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('preferences')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'preferences'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100'
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Opciones de Billeteras Digitales
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Aparecerán dentro del botón principal "Billeteras" en la pantalla de cobro.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddWallet(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddWallet ? 'Cancelar' : 'Nueva Billetera'}</span>
            </button>
          </div>

          {/* Add Wallet Form */}
          {showAddWallet && (
            <form onSubmit={handleCreateWallet} className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
              <h5 className="font-bold text-xs text-purple-900">Agregar Billetera Digital</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Nombre (ej. Nequi, Daviplata, Dale)</label>
                  <input
                    type="text"
                    required
                    value={newWallet.name}
                    onChange={e => setNewWallet(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nequi"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Número de Celular / Cuenta</label>
                  <input
                    type="text"
                    required
                    value={newWallet.phoneNumber}
                    onChange={e => setNewWallet(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="310 892 4511"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Nombre del Titular</label>
                  <input
                    type="text"
                    value={newWallet.holderName}
                    onChange={e => setNewWallet(prev => ({ ...prev, holderName: e.target.value }))}
                    placeholder="Estacionamiento Central"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Imagen QR Digital (Opcional)</label>
                  <div className="flex items-center gap-2.5">
                    {newWallet.qrImageUrl ? (
                      <div className="relative group shrink-0 w-12 h-12 border border-slate-300 rounded-lg overflow-hidden bg-white">
                        <img src={newWallet.qrImageUrl} alt="QR preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setNewWallet(prev => ({ ...prev, qrImageUrl: '' }))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-opacity cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="w-12 h-12 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-700 dark:text-slate-200 bg-slate-50 shrink-0">
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
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
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
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700"
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
                className={`p-3.5 rounded-2xl border transition-all ${
                  wallet.enabled ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                {editingId === wallet.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEditWallet();
                    }}
                    className="space-y-3 animate-in fade-in duration-100"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Nombre</label>
                        <input
                          type="text"
                          required
                          value={editWallet.name || ''}
                          onChange={e => setEditWallet(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Celular / Cuenta</label>
                        <input
                          type="text"
                          required
                          value={editWallet.phoneNumber || ''}
                          onChange={e => setEditWallet(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-mono"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Titular</label>
                        <input
                          type="text"
                          required
                          value={editWallet.holderName || ''}
                          onChange={e => setEditWallet(prev => ({ ...prev, holderName: e.target.value }))}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Código QR Digital</label>
                        <div className="flex items-center gap-2.5">
                          {editWallet.qrImageUrl ? (
                            <div className="relative group shrink-0 w-10 h-10 border border-slate-300 rounded bg-white overflow-hidden">
                              <img src={editWallet.qrImageUrl} alt="QR preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              <button
                                type="button"
                                onClick={() => setEditWallet(prev => ({ ...prev, qrImageUrl: '' }))}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] font-bold transition-opacity cursor-pointer"
                              >
                                Quitar
                              </button>
                            </div>
                          ) : (
                            <div className="w-10 h-10 border border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-slate-700 dark:text-slate-200 bg-slate-50 shrink-0">
                              <QrCode className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
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
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-[10px] font-bold cursor-pointer transition-colors"
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
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditWallet}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{wallet.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            wallet.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600 dark:text-slate-300'
                          }`}>
                            {wallet.enabled ? 'Activa' : 'Inactiva'}
                          </span>
                          {wallet.qrImageUrl && (
                            <span className="text-[9px] bg-amber-100 border border-amber-200 text-amber-800 font-extrabold px-1 py-0.2 rounded flex items-center gap-0.5">
                              <QrCode className="w-2.5 h-2.5" />
                              <span>Con QR</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-0.5">
                          {wallet.phoneNumber} • <span className="font-sans text-slate-600 dark:text-slate-300">{wallet.holderName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartEditWallet(wallet)}
                        className="p-1 text-slate-700 dark:text-slate-200 hover:text-slate-700 rounded transition-colors"
                        title="Editar billetera"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleWallet(wallet.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          wallet.enabled ? 'bg-purple-600' : 'bg-slate-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${wallet.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWallet(wallet.id)}
                        className="p-1 text-slate-700 dark:text-slate-200 hover:text-red-500 rounded transition-colors"
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Opciones de Códigos QR Disponibles
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Aparecerán dentro del botón principal "Códigos QR" en la liquidación.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddQr(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddQr ? 'Cancelar' : 'Nuevo Código QR'}</span>
            </button>
          </div>

          {/* Add QR Form */}
          {showAddQr && (
            <form onSubmit={handleCreateQr} className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
              <h5 className="font-bold text-xs text-amber-900">Registrar Nuevo Código QR</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Nombre Descriptivo</label>
                  <input
                    type="text"
                    required
                    value={newQr.name}
                    onChange={e => setNewQr(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="QR Bancolombia / QR Redeban"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Banco o Red Emisora</label>
                  <input
                    type="text"
                    value={newQr.bankOrEntity}
                    onChange={e => setNewQr(prev => ({ ...prev, bankOrEntity: e.target.value }))}
                    placeholder="Bancolombia / Redeban"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Número de Cuenta o Código de Comercio</label>
                  <input
                    type="text"
                    required
                    value={newQr.accountNumber}
                    onChange={e => setNewQr(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="Cta Ahorros: 458-923841-02"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Nombre del Titular</label>
                  <input
                    type="text"
                    value={newQr.holderName}
                    onChange={e => setNewQr(prev => ({ ...prev, holderName: e.target.value }))}
                    placeholder="Estacionamiento Central SAS"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Imagen QR Digital (Opcional)</label>
                  <div className="flex items-center gap-2.5">
                    {newQr.qrImageUrl ? (
                      <div className="relative group shrink-0 w-12 h-12 border border-slate-300 rounded-lg overflow-hidden bg-white">
                        <img src={newQr.qrImageUrl} alt="QR preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setNewQr(prev => ({ ...prev, qrImageUrl: '' }))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-opacity cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="w-12 h-12 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-700 dark:text-slate-200 bg-slate-50 shrink-0">
                        <QrCode className="w-4 h-4 text-slate-600 dark:text-slate-300" />
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
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
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
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700"
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
                className={`p-3.5 rounded-2xl border transition-all ${
                  qr.enabled ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                {editingId === qr.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEditQr();
                    }}
                    className="space-y-3 animate-in fade-in duration-100"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Nombre Descriptivo</label>
                        <input
                          type="text"
                          required
                          value={editQr.name || ''}
                          onChange={e => setEditQr(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Banco o Entidad</label>
                        <input
                          type="text"
                          required
                          value={editQr.bankOrEntity || ''}
                          onChange={e => setEditQr(prev => ({ ...prev, bankOrEntity: e.target.value }))}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">N° Cuenta o Comercio</label>
                        <input
                          type="text"
                          required
                          value={editQr.accountNumber || ''}
                          onChange={e => setEditQr(prev => ({ ...prev, accountNumber: e.target.value }))}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Titular</label>
                        <input
                          type="text"
                          required
                          value={editQr.holderName || ''}
                          onChange={e => setEditQr(prev => ({ ...prev, holderName: e.target.value }))}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Imagen QR Digital</label>
                        <div className="flex items-center gap-2.5">
                          {editQr.qrImageUrl ? (
                            <div className="relative group shrink-0 w-10 h-10 border border-slate-300 rounded bg-white overflow-hidden">
                              <img src={editQr.qrImageUrl} alt="QR preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              <button
                                type="button"
                                onClick={() => setEditQr(prev => ({ ...prev, qrImageUrl: '' }))}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] font-bold transition-opacity cursor-pointer"
                              >
                                Quitar
                              </button>
                            </div>
                          ) : (
                            <div className="w-10 h-10 border border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-slate-700 dark:text-slate-200 bg-slate-50 shrink-0">
                              <QrCode className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
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
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-[10px] font-bold cursor-pointer transition-colors"
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
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditQr}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{qr.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            qr.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600 dark:text-slate-300'
                          }`}>
                            {qr.enabled ? 'Activo' : 'Inactivo'}
                          </span>
                          {qr.qrImageUrl && (
                            <span className="text-[9px] bg-amber-100 border border-amber-200 text-amber-800 font-extrabold px-1 py-0.2 rounded flex items-center gap-0.5">
                              <QrCode className="w-2.5 h-2.5" />
                              <span>Con QR</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-0.5">
                          {qr.accountNumber} • <span className="font-sans text-slate-600 dark:text-slate-300">{qr.bankOrEntity}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartEditQr(qr)}
                        className="p-1 text-slate-700 dark:text-slate-200 hover:text-slate-700 rounded transition-colors"
                        title="Editar código QR"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleQr(qr.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          qr.enabled ? 'bg-amber-600' : 'bg-slate-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${qr.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQr(qr.id)}
                        className="p-1 text-slate-700 dark:text-slate-200 hover:text-red-500 rounded transition-colors"
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Llaves Interoperables Bre-B (Banco de la República)
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Sistema nacional de pagos instantáneos en Colombia. Aparecerán dentro del botón "Llave Bre-B".
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddBreB(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded-xl text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddBreB ? 'Cancelar' : 'Nueva Llave Bre-B'}</span>
            </button>
          </div>

          {/* Add Bre-B Form */}
          {showAddBreB && (
            <form onSubmit={handleCreateBreB} className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-3">
              <h5 className="font-bold text-xs text-teal-900">Registrar Llave Bre-B</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Tipo de Llave</label>
                  <select
                    value={newBreB.keyType}
                    onChange={e => setNewBreB(prev => ({ ...prev, keyType: e.target.value as any }))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  >
                    <option value="phone">Número Celular</option>
                    <option value="national_id">Cédula / NIT</option>
                    <option value="email">Correo Electrónico</option>
                    <option value="code">Código Alfanumérico</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Valor de la Llave</label>
                  <input
                    type="text"
                    required
                    value={newBreB.keyValue}
                    onChange={e => setNewBreB(prev => ({ ...prev, keyValue: e.target.value }))}
                    placeholder="3108924511 o NIT"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Entidad Bancaria Aliada</label>
                  <input
                    type="text"
                    required
                    value={newBreB.registeredEntity}
                    onChange={e => setNewBreB(prev => ({ ...prev, registeredEntity: e.target.value }))}
                    placeholder="Bancolombia / Davivienda / Nequi"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Titular</label>
                  <input
                    type="text"
                    value={newBreB.holderName}
                    onChange={e => setNewBreB(prev => ({ ...prev, holderName: e.target.value }))}
                    placeholder="Estacionamiento Central SAS"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddBreB(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700"
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
                className={`p-3.5 rounded-2xl border transition-all ${
                  key.enabled ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                {editingId === key.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEditBreB();
                    }}
                    className="space-y-2.5 animate-in fade-in duration-100"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Tipo de Llave</label>
                      <select
                        value={editBreB.keyType || 'phone'}
                        onChange={e => setEditBreB(prev => ({ ...prev, keyType: e.target.value as any }))}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs outline-none"
                      >
                        <option value="phone">Número Celular</option>
                        <option value="national_id">Cédula / NIT</option>
                        <option value="email">Correo Electrónico</option>
                        <option value="alphanumeric">Llave Alfanumérica</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Valor de la Llave</label>
                      <input
                        type="text"
                        required
                        value={editBreB.keyValue || ''}
                        onChange={e => setEditBreB(prev => ({ ...prev, keyValue: e.target.value }))}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Entidad Bancaria</label>
                      <input
                        type="text"
                        required
                        value={editBreB.registeredEntity || ''}
                        onChange={e => setEditBreB(prev => ({ ...prev, registeredEntity: e.target.value }))}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Titular</label>
                      <input
                        type="text"
                        required
                        value={editBreB.holderName || ''}
                        onChange={e => setEditBreB(prev => ({ ...prev, holderName: e.target.value }))}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditBreB}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-bold"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{key.keyTypeName}</span>
                        </div>
                        <div className="text-xs font-bold font-mono text-teal-900 mt-0.5">
                          {key.keyValue}
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-300">
                          {key.registeredEntity} • {key.holderName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditBreB(key)}
                        className="p-1 text-slate-700 dark:text-slate-200 hover:text-slate-700 rounded transition-colors"
                        title="Editar llave"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleBreB(key.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          key.enabled ? 'bg-teal-600' : 'bg-slate-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${key.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBreB(key.id)}
                        className="p-1 text-slate-700 dark:text-slate-200 hover:text-red-500 rounded transition-colors"
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Datáfonos y Terminales de Pago con Tarjeta
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Dispositivos POS autorizados para cobro con tarjeta Débito / Crédito.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddTerminal(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddTerminal ? 'Cancelar' : 'Nuevo Datáfono'}</span>
            </button>
          </div>

          {/* Add Terminal Form */}
          {showAddTerminal && (
            <form onSubmit={handleCreateTerminal} className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
              <h5 className="font-bold text-xs text-blue-900">Registrar Datáfono</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Nombre o Red (Redeban, Bold, Credibanco)</label>
                  <input
                    type="text"
                    required
                    value={newTerminal.name}
                    onChange={e => setNewTerminal(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Datáfono Bold Móvil"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Número Serial / Identificador</label>
                  <input
                    type="text"
                    value={newTerminal.serialNumber}
                    onChange={e => setNewTerminal(prev => ({ ...prev, serialNumber: e.target.value }))}
                    placeholder="BLD-10294"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddTerminal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700"
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
                className={`p-3.5 rounded-2xl border transition-all ${
                  term.enabled ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                {editingId === term.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEditTerminal();
                    }}
                    className="space-y-2.5 animate-in fade-in duration-100"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Nombre / Red</label>
                      <input
                        type="text"
                        required
                        value={editTerminal.name || ''}
                        onChange={e => setEditTerminal(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Número Serial / Identificador</label>
                      <input
                        type="text"
                        value={editTerminal.serialNumber || ''}
                        onChange={e => setEditTerminal(prev => ({ ...prev, serialNumber: e.target.value }))}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-mono"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditTerminal}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{term.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            term.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600 dark:text-slate-300'
                          }`}>
                            {term.enabled ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        {term.serialNumber && (
                          <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-0.5">
                            Serial: {term.serialNumber}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartEditTerminal(term)}
                        className="p-1 text-slate-700 dark:text-slate-200 hover:text-slate-700 rounded transition-colors"
                        title="Editar datáfono"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleTerminal(term.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          term.enabled ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${term.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTerminal(term.id)}
                        className="p-1 text-slate-700 dark:text-slate-200 hover:text-red-500 rounded transition-colors"
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Cuentas Bancarias para Transferencia Directa
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Administre las cuentas bancarias autorizadas para recibir pagos por transferencia. Puede montar el código QR de cada una.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddBankAccount(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddBankAccount ? 'Cancelar' : 'Nueva Cuenta Bancaria'}</span>
            </button>
          </div>

          {/* Add Bank Account Form */}
          {showAddBankAccount && (
            <form onSubmit={handleCreateBankAccount} className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3 animate-in slide-in-from-top-2 duration-150">
              <h5 className="text-xs font-bold text-indigo-900">Registrar Nueva Cuenta Bancaria</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Entidad Bancaria</label>
                  <input
                    type="text"
                    required
                    value={newBankAccount.bankName || ''}
                    onChange={e => setNewBankAccount(prev => ({ ...prev, bankName: e.target.value }))}
                    placeholder="e.g. Bancolombia, Banco de Bogotá"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Tipo de Cuenta</label>
                  <select
                    value={newBankAccount.accountType || 'savings'}
                    onChange={e => setNewBankAccount(prev => ({ ...prev, accountType: e.target.value as 'savings' | 'checking' }))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500"
                  >
                    <option value="savings">Ahorros</option>
                    <option value="checking">Corriente</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Número de Cuenta</label>
                  <input
                    type="text"
                    required
                    value={newBankAccount.accountNumber || ''}
                    onChange={e => setNewBankAccount(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="e.g. 458-923841-02"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Titular de la Cuenta</label>
                  <input
                    type="text"
                    value={newBankAccount.holderName || ''}
                    onChange={e => setNewBankAccount(prev => ({ ...prev, holderName: e.target.value }))}
                    placeholder="e.g. Estacionamiento Central SAS"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Documento / NIT</label>
                  <input
                    type="text"
                    value={newBankAccount.holderId || ''}
                    onChange={e => setNewBankAccount(prev => ({ ...prev, holderId: e.target.value }))}
                    placeholder="e.g. NIT 901.458.723-1"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">URL de Código QR (Opcional)</label>
                  <input
                    type="text"
                    value={newBankAccount.qrImageUrl || ''}
                    onChange={e => setNewBankAccount(prev => ({ ...prev, qrImageUrl: e.target.value }))}
                    placeholder="https://ejemplo.com/qr-cuenta.png"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Upload QR Digital Image File */}
              <div className="bg-white p-3 rounded-xl border border-dashed border-indigo-200">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">Cargar Imagen Digital de Código QR</label>
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
                    className="text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  {newBankAccount.qrImageUrl && (
                    <div className="flex items-center gap-2">
                      <img
                        src={newBankAccount.qrImageUrl}
                        alt="Previsualización"
                        className="w-8 h-8 rounded border object-contain bg-white"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setNewBankAccount(prev => ({ ...prev, qrImageUrl: '' }))}
                        className="text-[10px] font-bold text-red-500 hover:underline"
                      >
                        Quitar QR
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* PSE Integration Settings for this account */}
              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src="/pse_logo.png" alt="PSE" className="w-5 h-5 rounded-full object-contain bg-white p-0.5" />
                    <span className="text-xs font-bold text-blue-950">Integración de Pagos PSE para esta Cuenta</span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-blue-900">
                    <input
                      type="checkbox"
                      checked={newBankAccount.enablePse ?? true}
                      onChange={e => setNewBankAccount(prev => ({ ...prev, enablePse: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Habilitar PSE</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Enlace de Pago PSE (URL Portal)
                    </label>
                    <input
                      type="url"
                      value={newBankAccount.pseUrl || ''}
                      onChange={e => setNewBankAccount(prev => ({ ...prev, pseUrl: e.target.value }))}
                      placeholder="https://www.pse.com.co/pago-en-linea"
                      className="w-full bg-white border border-blue-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      URL de Código QR PSE (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newBankAccount.pseQrUrl || ''}
                      onChange={e => setNewBankAccount(prev => ({ ...prev, pseQrUrl: e.target.value }))}
                      placeholder="/pse_logo.png o URL externa"
                      className="w-full bg-white border border-blue-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Subir archivo de imagen QR PSE */}
                <div className="flex items-center gap-3 pt-1 border-t border-blue-100">
                  <label className="text-[11px] font-semibold text-blue-900 shrink-0">Subir QR de PSE:</label>
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
                    className="text-xs text-slate-600 dark:text-slate-300 file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-blue-100 file:text-blue-800 hover:file:bg-blue-200 cursor-pointer"
                  />
                  {newBankAccount.pseQrUrl && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <img
                        src={newBankAccount.pseQrUrl}
                        alt="QR PSE"
                        className="w-6 h-6 rounded border object-contain bg-white"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setNewBankAccount(prev => ({ ...prev, pseQrUrl: '' }))}
                        className="text-[10px] font-bold text-red-500 hover:underline"
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
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-98"
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
                className={`p-4 rounded-2xl border transition-all ${
                  account.enabled ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                {editingId === account.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEditBankAccount();
                    }}
                    className="space-y-3 animate-in fade-in duration-100"
                  >
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Banco</label>
                        <input
                          type="text"
                          required
                          value={editBankAccount.bankName || ''}
                          onChange={e => setEditBankAccount(prev => ({ ...prev, bankName: e.target.value }))}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Tipo</label>
                        <select
                          value={editBankAccount.accountType || 'savings'}
                          onChange={e => setEditBankAccount(prev => ({ ...prev, accountType: e.target.value as 'savings' | 'checking' }))}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                        >
                          <option value="savings">Ahorros</option>
                          <option value="checking">Corriente</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">N° Cuenta</label>
                        <input
                          type="text"
                          required
                          value={editBankAccount.accountNumber || ''}
                          onChange={e => setEditBankAccount(prev => ({ ...prev, accountNumber: e.target.value }))}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Titular</label>
                        <input
                          type="text"
                          value={editBankAccount.holderName || ''}
                          onChange={e => setEditBankAccount(prev => ({ ...prev, holderName: e.target.value }))}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Documento / NIT</label>
                        <input
                          type="text"
                          value={editBankAccount.holderId || ''}
                          onChange={e => setEditBankAccount(prev => ({ ...prev, holderId: e.target.value }))}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">URL QR</label>
                        <input
                          type="text"
                          value={editBankAccount.qrImageUrl || ''}
                          onChange={e => setEditBankAccount(prev => ({ ...prev, qrImageUrl: e.target.value }))}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                      </div>
                    </div>

                    {/* QR upload in edit */}
                    <div className="bg-slate-50 p-2 rounded-lg border border-dashed border-slate-200">
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Actualizar Imagen QR</label>
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
                          className="text-[10px] text-slate-600 dark:text-slate-300 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 cursor-pointer"
                        />
                        {editBankAccount.qrImageUrl && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <img
                              src={editBankAccount.qrImageUrl}
                              alt="QR"
                              className="w-6 h-6 border object-contain bg-white rounded"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setEditBankAccount(prev => ({ ...prev, qrImageUrl: '' }))}
                              className="text-[9px] font-bold text-red-500 hover:underline"
                            >
                              Quitar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PSE configuration in edit */}
                    <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <img src="/pse_logo.png" alt="PSE" className="w-4 h-4 rounded-full object-contain bg-white p-0.5" />
                          <span className="text-[11px] font-bold text-blue-950">Configuración PSE</span>
                        </div>
                        <label className="flex items-center gap-1 cursor-pointer text-[10px] font-semibold text-blue-900">
                          <input
                            type="checkbox"
                            checked={editBankAccount.enablePse ?? true}
                            onChange={e => setEditBankAccount(prev => ({ ...prev, enablePse: e.target.checked }))}
                            className="rounded text-blue-600"
                          />
                          <span>PSE Activo</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">Enlace Pago PSE</label>
                          <input
                            type="url"
                            value={editBankAccount.pseUrl || ''}
                            onChange={e => setEditBankAccount(prev => ({ ...prev, pseUrl: e.target.value }))}
                            placeholder="https://..."
                            className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-[11px] font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-0.5">URL QR PSE</label>
                          <input
                            type="text"
                            value={editBankAccount.pseQrUrl || ''}
                            onChange={e => setEditBankAccount(prev => ({ ...prev, pseQrUrl: e.target.value }))}
                            placeholder="/pse_logo.png o URL"
                            className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-[11px] font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-blue-100">
                        <label className="text-[9px] font-bold text-blue-900 shrink-0">Subir QR PSE:</label>
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
                          className="text-[9px] text-slate-600 dark:text-slate-300 file:mr-1.5 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:bg-blue-100 file:text-blue-800 cursor-pointer"
                        />
                        {editBankAccount.pseQrUrl && (
                          <div className="flex items-center gap-1 shrink-0">
                            <img
                              src={editBankAccount.pseQrUrl}
                              alt="QR PSE"
                              className="w-5 h-5 border object-contain bg-white rounded"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setEditBankAccount(prev => ({ ...prev, pseQrUrl: '' }))}
                              className="text-[9px] font-bold text-red-500 hover:underline"
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
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{account.bankName}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            account.accountType === 'savings' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {account.accountType === 'savings' ? 'Ahorros' : 'Corriente'}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                          N°: {account.accountNumber}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                          Titular: <span className="font-medium text-slate-700 dark:text-slate-200">{account.holderName}</span>
                        </div>
                        {account.holderId && (
                          <div className="text-[10px] text-slate-700 dark:text-slate-200 font-mono">
                            Doc: {account.holderId}
                          </div>
                        )}
                        {account.qrImageUrl && (
                          <div className="pt-1.5 flex items-center gap-2">
                            <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                              <QrCode className="w-3.5 h-3.5" />
                              Código QR Vinculado
                            </span>
                            <div className="relative group">
                              <img
                                src={account.qrImageUrl}
                                alt="QR Bancario"
                                className="w-8 h-8 rounded border object-contain bg-white cursor-zoom-in hover:scale-150 transition-transform origin-left duration-200"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        )}

                        {/* PSE Status, Portal Link & PSE QR */}
                        {(account.enablePse ?? true) && (
                          <div className="pt-2 border-t border-slate-100 mt-2 flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                              <img src="/pse_logo.png" alt="PSE" className="w-4 h-4 rounded-full object-contain bg-white p-0.5" />
                              <span className="text-[10px] font-bold text-blue-900">Canal PSE Habilitado</span>
                            </div>
                            {account.pseUrl && (
                              <a
                                href={account.pseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 hover:bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>Probar Portal PSE</span>
                              </a>
                            )}
                            {account.pseQrUrl && (
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-mono text-slate-600 dark:text-slate-300 font-bold">QR PSE:</span>
                                <img
                                  src={account.pseQrUrl}
                                  alt="QR PSE"
                                  className="w-6 h-6 rounded border border-blue-200 object-contain bg-white cursor-zoom-in hover:scale-150 transition-transform origin-left duration-200"
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
                        className="p-1 text-slate-700 dark:text-slate-200 hover:text-slate-700 rounded transition-colors"
                        title="Editar cuenta bancaria"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleBankAccount(account.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          account.enabled ? 'bg-indigo-600' : 'bg-slate-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${account.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBankAccount(account.id)}
                        className="p-1 text-slate-700 dark:text-slate-200 hover:text-red-500 rounded transition-colors"
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
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Políticas Generales y Comportamiento POS
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">Medio de Pago por Defecto</label>
              <select
                value={localConfig.defaultMethod}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, defaultMethod: e.target.value as PaymentMethod }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta Débito / Crédito</option>
                <option value="wallet">Billetera Digital</option>
                <option value="qr">Código QR</option>
                <option value="bre_b">Llave Bre-B</option>
                <option value="transfer">Transferencia Bancaria</option>
              </select>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">Preseleccionado automáticamente al abrir el diálogo de cobro.</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">Permitir Pago Mixto</span>
                <input
                  type="checkbox"
                  checked={localConfig.allowMixedPayment}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, allowMixedPayment: e.target.checked }))}
                  className="w-4 h-4 text-amber-600 rounded"
                />
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Permite combinar Efectivo con Billeteras (Nequi, Daviplata), QR, Bre-B o Tarjeta en un solo cobro.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">Exigir N° Referencia / Aprobación</span>
                <input
                  type="checkbox"
                  checked={localConfig.requireReferenceForElectronic}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, requireReferenceForElectronic: e.target.checked }))}
                  className="w-4 h-4 text-amber-600 rounded"
                />
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Obliga al cajero a registrar el número de comprobante de la transferencia o voucher del datáfono.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
