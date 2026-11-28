import React, { useState, useMemo } from 'react';
import { 
  Handshake, 
  Plus, 
  Search, 
  Check, 
  X, 
  Edit3, 
  Trash2, 
  Building2, 
  Clock, 
  Percent, 
  DollarSign, 
  FileText, 
  Tag,
} from 'lucide-react';
import { CommercialAgreement, AgreementDiscountType } from '../types';
import { playSound } from '../utils/audio';
import { formatCurrency } from '../utils/billing';

interface CommercialAgreementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreements: CommercialAgreement[];
  onSaveAgreement: (agreement: CommercialAgreement) => void;
  onDeleteAgreement: (id: string) => void;
  embedded?: boolean;
}

export const CommercialAgreementsModal: React.FC<CommercialAgreementsModalProps> = ({
  isOpen,
  onClose,
  agreements,
  onSaveAgreement,
  onDeleteAgreement,
  embedded = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<Partial<CommercialAgreement> | null>(null);

  const filteredAgreements = useMemo(() => {
    return agreements.filter(ag => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        ag.name.toLowerCase().includes(q) || 
        ag.code.toLowerCase().includes(q) ||
        (ag.businessName && ag.businessName.toLowerCase().includes(q)) ||
        (ag.nit && ag.nit.toLowerCase().includes(q));

      const matchesType = filterType === 'all' || ag.discountType === filterType;
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && ag.isActive) ||
        (filterStatus === 'inactive' && !ag.isActive);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [agreements, searchTerm, filterType, filterStatus]);

  const handleOpenNew = () => {
    const nextCode = `CONV-0${agreements.length + 1}`;
    setEditingAgreement({
      id: `conv_${Date.now()}`,
      code: nextCode,
      name: '',
      businessName: '',
      nit: '',
      phone: '',
      contactPerson: '',
      discountType: 'free_minutes',
      discountValue: 60,
      applicableVehicleTypes: ['all'],
      requiresSealOrVoucher: true,
      sealPromptLabel: 'N° Factura o Sello de Comercio',
      billingEntity: 'customer_pays_balance',
      isActive: true,
      notes: ''
    });
    setIsFormOpen(true);
    playSound('beep');
  };

  const handleEdit = (ag: CommercialAgreement) => {
    setEditingAgreement({ ...ag });
    setIsFormOpen(true);
    playSound('beep');
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgreement || !editingAgreement.name?.trim() || !editingAgreement.code?.trim()) return;

    const agreementToSave: CommercialAgreement = {
      id: editingAgreement.id || `conv_${Date.now()}`,
      code: editingAgreement.code.trim().toUpperCase(),
      name: editingAgreement.name.trim(),
      businessName: editingAgreement.businessName?.trim() || editingAgreement.name.trim(),
      nit: editingAgreement.nit?.trim() || '',
      phone: editingAgreement.phone?.trim() || '',
      contactPerson: editingAgreement.contactPerson?.trim() || '',
      discountType: editingAgreement.discountType || 'free_minutes',
      discountValue: Number(editingAgreement.discountValue) || 0,
      applicableVehicleTypes: editingAgreement.applicableVehicleTypes || ['all'],
      requiresSealOrVoucher: editingAgreement.requiresSealOrVoucher ?? true,
      sealPromptLabel: editingAgreement.sealPromptLabel?.trim() || 'N° Factura o Sello',
      billingEntity: editingAgreement.billingEntity || 'customer_pays_balance',
      isActive: editingAgreement.isActive ?? true,
      notes: editingAgreement.notes?.trim() || '',
      createdAt: editingAgreement.createdAt || new Date().toISOString()
    };

    onSaveAgreement(agreementToSave);
    setIsFormOpen(false);
    setEditingAgreement(null);
    playSound('success');
  };

  const handleToggleActive = (ag: CommercialAgreement) => {
    onSaveAgreement({
      ...ag,
      isActive: !ag.isActive
    });
    playSound('beep');
  };

  const getDiscountBadge = (ag: CommercialAgreement) => {
    switch (ag.discountType) {
      case 'free_minutes':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] tabular-nums font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
            <Clock className="w-3.5 h-3.5" />
            <span>{ag.discountValue} Minutos Gratis</span>
          </span>
        );
      case 'percentage_discount':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] tabular-nums font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <Percent className="w-3.5 h-3.5" />
            <span>{ag.discountValue}% Descuento</span>
          </span>
        );
      case 'fixed_discount':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] tabular-nums font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Rebaja de {formatCurrency(ag.discountValue)}</span>
          </span>
        );
      case 'flat_rate':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] tabular-nums font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
            <Tag className="w-3.5 h-3.5" />
            <span>Tarifa Plana {formatCurrency(ag.discountValue)}</span>
          </span>
        );
      default:
        return null;
    }
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full animate-in fade-in duration-150" : "fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"}>
      <div 
        id="agreements-management-modal-dialog"
        className={embedded 
          ? "wz-surface w-full rounded-[22px] border border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:border-white/[0.07] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:bg-slate-900 overflow-hidden flex flex-col text-slate-900 dark:text-slate-100" 
          : "wz-surface w-full max-w-5xl rounded-[22px] border border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:border-white/[0.07] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:bg-slate-900 overflow-hidden flex flex-col max-h-[92vh] text-slate-900 dark:text-slate-100"}
      >
        {/* Encabezado */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white dark:from-slate-700 dark:to-slate-800">
              <Handshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Convenios Comerciales & Sellos de Descuento
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/20">
                  Alianzas POS
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Gestiona acuerdos comerciales con comercios vecinos (minutos gratis, descuentos porcentuales o tarifa plana).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              id="btn-new-commercial-agreement"
              onClick={handleOpenNew}
              className="min-h-[48px] rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 disabled:opacity-50 dark:from-blue-500 dark:to-blue-600 flex items-center justify-center gap-1.5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Convenio</span>
            </button>

            {!embedded && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                title="Cerrar módulo"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* KPIs Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-slate-200/70 dark:border-slate-800 text-xs">
          <div className="wz-surface rounded-2xl border border-slate-900/[0.06] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] dark:border-white/[0.07] dark:bg-slate-900">
            <p className="text-slate-600 dark:text-slate-400 font-medium text-[13px]">Convenios Registrados</p>
            <p className="font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">{agreements.length}</p>
          </div>
          <div className="wz-surface rounded-2xl border border-slate-900/[0.06] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] dark:border-white/[0.07] dark:bg-slate-900">
            <p className="text-slate-600 dark:text-slate-400 font-medium text-[13px]">Convenios Activos</p>
            <p className="font-display text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">
              {agreements.filter(a => a.isActive).length} <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">/ {agreements.length}</span>
            </p>
          </div>
          <div className="wz-surface rounded-2xl border border-slate-900/[0.06] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] dark:border-white/[0.07] dark:bg-slate-900">
            <p className="text-slate-600 dark:text-slate-400 font-medium text-[13px]">Con Validación de Sello</p>
            <p className="font-display text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400 mt-0.5">
              {agreements.filter(a => a.requiresSealOrVoucher).length}
            </p>
          </div>
          <div className="wz-surface rounded-2xl border border-slate-900/[0.06] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] dark:border-white/[0.07] dark:bg-slate-900">
            <p className="text-slate-600 dark:text-slate-400 font-medium text-[13px]">Modalidades de Alivio</p>
            <p className="font-display text-2xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">4 Tipos</p>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="p-4 border-b border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, código, empresa o NIT..."
              className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 text-sm placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
            >
              <option value="all">Todas las Modalidades</option>
              <option value="free_minutes">Minutos Gratis</option>
              <option value="percentage_discount">Porcentaje (%)</option>
              <option value="fixed_discount">Rebaja en Pesos ($)</option>
              <option value="flat_rate">Tarifa Plana</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Solo Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>

        {/* Listado de Convenios */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3">
          {filteredAgreements.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
              <Handshake className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">No hay convenios comerciales</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                No se encontraron convenios que coincidan con la búsqueda. Puedes registrar uno nuevo con el botón superior.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAgreements.map(ag => (
                <div 
                  key={ag.id}
                  className={`wz-surface rounded-2xl border p-4 transition flex flex-col justify-between ${
                    ag.isActive 
                      ? 'border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] hover:-translate-y-px dark:border-white/[0.07] dark:bg-slate-900'
                      : 'border-slate-200 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-900/50'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                            {ag.code}
                          </span>
                          <h4 className="font-display font-bold text-slate-900 dark:text-white text-base">
                            {ag.name}
                          </h4>
                        </div>
                        <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{ag.businessName} {ag.nit ? `• NIT: ${ag.nit}` : ''}</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(ag)}
                        className={`min-h-[44px] px-3.5 rounded-full text-xs font-bold transition-colors cursor-pointer border ${
                          ag.isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                        title="Clic para conmutar estado de actividad"
                      >
                        {ag.isActive ? 'ACTIVO' : 'INACTIVO'}
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                      {getDiscountBadge(ag)}

                      {ag.requiresSealOrVoucher && (
                        <span className="text-xs font-medium text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-500/30 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>Requiere Sello/Factura</span>
                        </span>
                      )}
                    </div>

                    {ag.notes && (
                      <p className="text-[13px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 line-clamp-2">
                        {ag.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="text-[13px] text-slate-600 dark:text-slate-400">
                      {ag.billingEntity === 'ally_billed_monthly' ? (
                        <span className="text-purple-700 dark:text-purple-300 font-bold">Cobro Mensual al Aliado</span>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400">Cliente paga saldo en taquilla</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(ag)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 hover:text-blue-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Editar convenio"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar el convenio "${ag.name}"?`)) {
                            onDeleteAgreement(ag.id);
                            playSound('beep');
                          }
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Eliminar convenio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Creación / Edición */}
        {isFormOpen && editingAgreement && (
          <div className="fixed inset-0 z-60 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
            <div className="wz-surface w-full max-w-xl rounded-[22px] border border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:border-white/[0.07] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:bg-slate-900 p-6 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/70 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white dark:from-slate-700 dark:to-slate-800">
                    <Handshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg">
                      {editingAgreement.id && agreements.some(a => a.id === editingAgreement.id) 
                        ? 'Editar Convenio Comercial' 
                        : 'Nuevo Convenio Comercial'}
                    </h3>
                    <p className="text-[13px] text-slate-600 dark:text-slate-400">
                      Configure el descuento y condiciones para este establecimiento aliado.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSubmit} className="space-y-4 overflow-y-auto pr-1 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                      Código *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingAgreement.code || ''}
                      onChange={(e) => setEditingAgreement(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="CONV-01"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:placeholder:text-slate-500 font-mono font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                      Nombre Público del Convenio *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingAgreement.name || ''}
                      onChange={(e) => setEditingAgreement(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="ej. Gimnasio SmartFit / Supermercado Éxito"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:placeholder:text-slate-500 font-semibold text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                      Razón Social / Empresa Aliada
                    </label>
                    <input
                      type="text"
                      value={editingAgreement.businessName || ''}
                      onChange={(e) => setEditingAgreement(prev => ({ ...prev, businessName: e.target.value }))}
                      placeholder="ej. SmartFit Colombia S.A.S."
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                      NIT / Identificación
                    </label>
                    <input
                      type="text"
                      value={editingAgreement.nit || ''}
                      onChange={(e) => setEditingAgreement(prev => ({ ...prev, nit: e.target.value }))}
                      placeholder="ej. 900.412.890-1"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:placeholder:text-slate-500 tabular-nums text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Modalidad de Descuento */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="font-display font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    <span>Configuración del Alivio / Descuento</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                        Modalidad de Descuento
                      </label>
                      <select
                        value={editingAgreement.discountType || 'free_minutes'}
                        onChange={(e) => setEditingAgreement(prev => ({ ...prev, discountType: e.target.value as AgreementDiscountType }))}
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:placeholder:text-slate-500 font-semibold text-slate-900 dark:text-slate-100"
                      >
                        <option value="free_minutes">Minutos Gratis (ej: 60 min, 120 min)</option>
                        <option value="percentage_discount">Porcentaje de Descuento (ej: 50%)</option>
                        <option value="fixed_discount">Rebaja en Pesos Directa (ej: -$3.000)</option>
                        <option value="flat_rate">Tarifa Plana Fija (ej: $5.000 único)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                        {editingAgreement.discountType === 'free_minutes' && 'Minutos Gratis *'}
                        {editingAgreement.discountType === 'percentage_discount' && 'Porcentaje (%) *'}
                        {editingAgreement.discountType === 'fixed_discount' && 'Monto a Descontar ($ COP) *'}
                        {editingAgreement.discountType === 'flat_rate' && 'Tarifa Plana ($ COP) *'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step={editingAgreement.discountType === 'percentage_discount' ? '1' : '50'}
                        required
                        value={editingAgreement.discountValue ?? ''}
                        onChange={(e) => setEditingAgreement(prev => ({ ...prev, discountValue: Number(e.target.value) }))}
                        placeholder={editingAgreement.discountType === 'percentage_discount' ? '50' : '60'}
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:placeholder:text-slate-500 tabular-nums font-bold text-blue-700 dark:text-blue-300"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <label className="flex min-h-[44px] items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingAgreement.requiresSealOrVoucher ?? true}
                        onChange={(e) => setEditingAgreement(prev => ({ ...prev, requiresSealOrVoucher: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-5 h-5 cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Exigir N° de Factura, Sello o Comprobante en Taquilla
                      </span>
                    </label>
                  </div>

                  {editingAgreement.requiresSealOrVoucher && (
                    <div>
                      <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                        Etiqueta del Comprobante (lo que se le pide al cajero):
                      </label>
                      <input
                        type="text"
                        value={editingAgreement.sealPromptLabel || ''}
                        onChange={(e) => setEditingAgreement(prev => ({ ...prev, sealPromptLabel: e.target.value }))}
                        placeholder="ej. N° Factura de Compra Supermercado"
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  )}
                </div>

                {/* Forma de Liquidación */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                      Asignación de Cobro
                    </label>
                    <select
                      value={editingAgreement.billingEntity || 'customer_pays_balance'}
                      onChange={(e) => setEditingAgreement(prev => ({ ...prev, billingEntity: e.target.value as any }))}
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:placeholder:text-slate-500 font-semibold text-slate-900 dark:text-slate-100"
                    >
                      <option value="customer_pays_balance">Cliente paga saldo restante en taquilla</option>
                      <option value="ally_billed_monthly">Comercio aliado asume el 100% (Facturar a fin de mes)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                      Estado
                    </label>
                    <select
                      value={editingAgreement.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setEditingAgreement(prev => ({ ...prev, isActive: e.target.value === 'active' }))}
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:placeholder:text-slate-500 font-semibold text-slate-900 dark:text-slate-100"
                    >
                      <option value="active">Activo (Disponible en Taquilla)</option>
                      <option value="inactive">Inactivo (Oculto)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Condiciones / Observaciones
                  </label>
                  <textarea
                    rows={2}
                    value={editingAgreement.notes || ''}
                    onChange={(e) => setEditingAgreement(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="ej. Válido únicamente con factura de compra superior a $50.000 COP expedida en el mismo día."
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="min-h-[48px] rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 disabled:opacity-50 dark:from-blue-500 dark:to-blue-600 flex items-center justify-center gap-1.5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar Convenio</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
