import React, { useState, useMemo } from 'react';
import { 
  Car, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  Settings2, 
  Search
} from 'lucide-react';
import { VehicleCategoryConfig, SystemUser } from '../types';
import { 
  VEHICLE_TERRESTRIAL_ICONS, 
  renderVehicleIcon, 
} from '../utils/vehicleIcons';

interface VehicleCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: VehicleCategoryConfig[];
  onSaveCategory: (category: VehicleCategoryConfig) => void;
  onDeleteCategory: (categoryId: string) => void;
  currentUser: SystemUser;
  embedded?: boolean;
}

export const VehicleCategoriesModal: React.FC<VehicleCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSaveCategory,
  onDeleteCategory,
  currentUser,
  embedded = false
}) => {
  const [editingCategory, setEditingCategory] = useState<VehicleCategoryConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('Car');
  const [formHourlyRate, setFormHourlyRate] = useState<number>(4500);
  const [formMinuteRate, setFormMinuteRate] = useState<number>(75);
  const [formDailyRate, setFormDailyRate] = useState<number>(28000);
  const [formGracePeriodMinutes, setFormGracePeriodMinutes] = useState<number>(15);
  const [formLostTicketFee, setFormLostTicketFee] = useState<number>(15000);
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Icon search and categorization
  const [iconSearch, setIconSearch] = useState('');
  const [selectedIconGroup, setSelectedIconGroup] = useState<'all' | 'cars' | 'motos' | 'heavy' | 'eco' | 'special'>('all');

  const filteredIcons = useMemo(() => {
    return VEHICLE_TERRESTRIAL_ICONS.filter(ic => {
      const matchesGroup = selectedIconGroup === 'all' || ic.category === selectedIconGroup;
      const q = iconSearch.trim().toLowerCase();
      const matchesSearch = !q || 
        ic.name.toLowerCase().includes(q) || 
        ic.description.toLowerCase().includes(q) || 
        ic.keywords.toLowerCase().includes(q) ||
        ic.id.toLowerCase().includes(q);
      return matchesGroup && matchesSearch;
    });
  }, [iconSearch, selectedIconGroup]);

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormName('');
    setFormIcon('Car');
    setIconSearch('');
    setSelectedIconGroup('all');
    setFormHourlyRate(4500);
    setFormMinuteRate(75);
    setFormDailyRate(28000);
    setFormGracePeriodMinutes(15);
    setFormLostTicketFee(15000);
    setFormDescription('');
    setFormIsActive(true);
    setErrorMessage(null);
    setIsCreating(true);
  };

  const handleOpenEdit = (cat: VehicleCategoryConfig) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormIcon(cat.icon || 'Car');
    setIconSearch('');
    setSelectedIconGroup('all');
    const hr = cat.defaultHourlyRate ?? cat.rate?.hourRate ?? 4500;
    const mr = cat.defaultMinuteRate ?? cat.rate?.minuteRate ?? Math.round(hr / 60);
    const dr = cat.defaultDailyRate ?? cat.rate?.dayRate ?? hr * 7;
    setFormHourlyRate(hr);
    setFormMinuteRate(mr);
    setFormDailyRate(dr);
    setFormGracePeriodMinutes(cat.gracePeriodMinutes ?? cat.rate?.gracePeriodMinutes ?? 15);
    setFormLostTicketFee(cat.rate?.lostTicketFee ?? 15000);
    setFormDescription(cat.description || '');
    setFormIsActive(cat.isActive !== false && cat.enabled !== false);
    setErrorMessage(null);
    setIsCreating(true);
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingCategory(null);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMessage('El nombre de la categoría es requerido');
      return;
    }

    const catId = editingCategory 
      ? editingCategory.id 
      : formName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);

    const hr = Number(formHourlyRate) || 0;
    const mr = Number(formMinuteRate) || 0;
    const dr = Number(formDailyRate) || 0;
    const gp = Number(formGracePeriodMinutes) || 15;
    const lostFee = Number(formLostTicketFee) || 15000;

    const updatedCategory: VehicleCategoryConfig = {
      id: catId,
      name: formName.trim(),
      icon: formIcon,
      defaultHourlyRate: hr,
      defaultMinuteRate: mr,
      defaultDailyRate: dr,
      gracePeriodMinutes: gp,
      rate: {
        hourRate: hr,
        minuteRate: mr,
        dayRate: dr,
        gracePeriodMinutes: gp,
        minimumChargeMinutes: gp,
        lostTicketFee: lostFee,
      },
      enabled: formIsActive,
      description: formDescription.trim(),
      isActive: formIsActive,
      isPreset: editingCategory ? editingCategory.isPreset : false,
      displayOrder: editingCategory ? editingCategory.displayOrder : categories.length + 1,
    };

    onSaveCategory(updatedCategory);
    handleCancelForm();
  };

  const renderIcon = (iconName?: string) => {
    return renderVehicleIcon(iconName, 'w-5 h-5', categories);
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full animate-in fade-in duration-150" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm overflow-y-auto"}>
      <div 
        id="vehicle-categories-modal"
        className={embedded ? "wz-surface relative w-full rounded-[22px] border border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:border-white/[0.07] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:bg-slate-900 overflow-hidden flex flex-col" : "wz-surface relative w-full max-w-4xl rounded-[22px] border border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:border-white/[0.07] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:bg-slate-900 overflow-hidden flex flex-col max-h-[90vh]"}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                Configuración de Categorías de Vehículos y Tarifas
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  WolfZone POS
                </span>
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Personaliza los tipos de vehículos que ingresan al parqueadero, sus tarifas por minuto/hora/día y tiempos de gracia.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Create or Edit Form */}
          {isCreating ? (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  {editingCategory ? `Editar Categoría: ${editingCategory.name}` : 'Crear Nueva Categoría de Vehículo'}
                </h3>
                <span className="text-[13px] text-slate-600 dark:text-slate-400">
                  {editingCategory?.isPreset ? 'Categoría Base del Sistema' : 'Categoría Personalizada'}
                </span>
              </div>

              {errorMessage && (
                <div className="rounded-xl border px-3.5 py-3 text-sm bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                    Nombre de la Categoría <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Camioneta 4x4, Patineta Eléctrica, Buseta..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <span>Ícono de Vehículo Terrestre</span>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        ({VEHICLE_TERRESTRIAL_ICONS.length} íconos disponibles)
                      </span>
                    </label>

                    {/* Badge del ícono seleccionado actualmente */}
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-900 dark:text-blue-200 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-xl border border-blue-200 dark:border-blue-500/30">
                      {renderVehicleIcon(formIcon, 'w-4 h-4 text-amber-600 dark:text-amber-400')}
                      <span className="text-xs truncate max-w-[140px] font-bold">
                        {VEHICLE_TERRESTRIAL_ICONS.find(i => i.id === formIcon)?.name || formIcon}
                      </span>
                    </div>
                  </div>

                  {/* Buscador de íconos */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar ícono terrestre (ej. auto, moto, bus, furgón, grúa, ambulancia)..."
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    {iconSearch && (
                      <button
                        type="button"
                        onClick={() => setIconSearch('')}
                        className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-white text-sm cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filtros por grupo vehicular */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedIconGroup('all')}
                      className={`min-h-[44px] shrink-0 rounded-xl px-3 text-sm font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                        selectedIconGroup === 'all'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      Todos ({VEHICLE_TERRESTRIAL_ICONS.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIconGroup('cars')}
                      className={`min-h-[44px] shrink-0 rounded-xl px-3 text-sm font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                        selectedIconGroup === 'cars'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      Autos & SUVs
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIconGroup('motos')}
                      className={`min-h-[44px] shrink-0 rounded-xl px-3 text-sm font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                        selectedIconGroup === 'motos'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      Motos & Bicis
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIconGroup('heavy')}
                      className={`min-h-[44px] shrink-0 rounded-xl px-3 text-sm font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                        selectedIconGroup === 'heavy'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      Buses & Carga
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIconGroup('eco')}
                      className={`min-h-[44px] shrink-0 rounded-xl px-3 text-sm font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                        selectedIconGroup === 'eco'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      Eléctricos & Eco
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIconGroup('special')}
                      className={`min-h-[44px] shrink-0 rounded-xl px-3 text-sm font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                        selectedIconGroup === 'special'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      Especiales & Auxilio
                    </button>
                  </div>

                  {/* Cuadrícula de íconos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-52 overflow-y-auto p-2 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                    {filteredIcons.length === 0 ? (
                      <div className="col-span-full py-6 text-center text-sm text-slate-600 dark:text-slate-400">
                        No se encontró ningún ícono para &quot;{iconSearch}&quot;
                      </div>
                    ) : (
                      filteredIcons.map((ic) => {
                        const IconComp = ic.icon;
                        const isSelected = formIcon === ic.id;
                        return (
                          <button
                            key={ic.id}
                            type="button"
                            onClick={() => setFormIcon(ic.id)}
                            title={`${ic.name} • ${ic.description}`}
                            className={`flex flex-col items-center justify-center min-h-[52px] p-2 rounded-2xl text-xs transition cursor-pointer gap-1 text-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                              isSelected
                                ? 'border-2 border-blue-700 bg-gradient-to-b from-blue-50 to-blue-100 text-blue-900 font-bold shadow-[0_8px_16px_-10px_rgba(29,78,216,.7)] dark:border-blue-400 dark:from-blue-500/20 dark:to-blue-500/10 dark:text-blue-100'
                                : 'wz-tile border border-slate-200 bg-white text-slate-700 hover:-translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <IconComp className={`w-5 h-5 ${isSelected ? 'text-blue-800 dark:text-blue-100 stroke-[2.2]' : 'text-slate-700 dark:text-slate-300'}`} />
                            <span className="text-xs leading-tight truncate w-full font-medium">
                              {ic.name.split('/')[0].trim()}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                    Tarifa por Hora ($ COP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formHourlyRate}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormHourlyRate(val);
                      setFormMinuteRate(Math.round(val / 60));
                    }}
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                    Tarifa por Fracción / Minuto ($ COP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={formMinuteRate}
                    onChange={(e) => setFormMinuteRate(Number(e.target.value))}
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                    Tarifa por Día Completo ($ COP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formDailyRate}
                    onChange={(e) => setFormDailyRate(Number(e.target.value))}
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                    Tiempo de Gracia Gratuito (Minutos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formGracePeriodMinutes}
                    onChange={(e) => setFormGracePeriodMinutes(Number(e.target.value))}
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                    Multa Ticket Perdido ($ COP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formLostTicketFee}
                    onChange={(e) => setFormLostTicketFee(Number(e.target.value))}
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 tabular-nums"
                  />
                </div>

                <div className="col-span-1 md:col-span-2 space-y-1.5">
                  <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                    Descripción / Observaciones
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Aplica para vehículos con altura mayor a 2.10m..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {formIsActive ? 'Categoría Activa (Visible en Registro de Entrada)' : 'Categoría Oculta'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[48px] rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 disabled:opacity-50 dark:from-blue-500 dark:to-blue-600 flex items-center justify-center gap-1.5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                >
                  <Check className="w-4 h-4" />
                  Guardar Categoría
                </button>
              </div>
            </form>
          ) : null}

          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              Categorías de vehículos configuradas para selección en el panel de entrada POS:
            </div>

            {!isCreating && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="min-h-[48px] rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 disabled:opacity-50 dark:from-blue-500 dark:to-blue-600 flex items-center justify-center gap-1.5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
              >
                <Plus className="w-4 h-4" />
                Nueva Categoría de Vehículo
              </button>
            )}
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`wz-surface p-4 rounded-2xl border transition flex flex-col justify-between ${
                  cat.isActive 
                    ? 'border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] hover:-translate-y-px dark:border-white/[0.07] dark:bg-slate-900' 
                    : 'bg-slate-50 border-slate-200 opacity-70 dark:bg-slate-900/50 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                        {renderIcon(cat.icon)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">{cat.name}</h4>
                          {cat.isPreset && (
                            <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                              Base
                            </span>
                          )}
                        </div>
                        {cat.description && (
                          <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-0.5">{cat.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right tabular-nums">
                      <div className="font-display text-lg font-bold text-blue-700 dark:text-blue-300">
                        ${(cat.defaultHourlyRate ?? cat.rate?.hourRate ?? 0).toLocaleString()}/h
                      </div>
                      <div className="text-[13px] text-slate-600 dark:text-slate-400">
                        ${(cat.defaultMinuteRate ?? cat.rate?.minuteRate ?? Math.round((cat.defaultHourlyRate ?? cat.rate?.hourRate ?? 0) / 60)).toLocaleString()}/min
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-200/70 dark:border-slate-800 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
                      <span className="text-slate-600 dark:text-slate-400 text-xs block">Día 24h:</span>
                      <span className="text-slate-900 dark:text-slate-100 tabular-nums font-bold text-sm">
                        ${(cat.defaultDailyRate ?? cat.rate?.dayRate ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
                      <span className="text-slate-600 dark:text-slate-400 text-xs block">Gracia:</span>
                      <span className="text-emerald-700 dark:text-emerald-400 tabular-nums font-bold text-sm">{cat.gracePeriodMinutes ?? cat.rate?.gracePeriodMinutes ?? 15} min</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
                      <span className="text-slate-600 dark:text-slate-400 text-xs block">Multa Tkt:</span>
                      <span className="text-rose-700 dark:text-rose-400 tabular-nums font-bold text-sm">
                        ${(cat.rate?.lostTicketFee ?? 15000).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onSaveCategory({ ...cat, isActive: !cat.isActive })}
                    className={`min-h-[44px] text-sm font-semibold px-3.5 rounded-xl border transition-colors cursor-pointer ${
                      cat.isActive
                        ? 'text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                        : 'text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {cat.isActive ? '✓ Activo en Entrada' : 'Desactivado'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                      title="Editar categoría"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    {!cat.isPreset && (
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(cat.id)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Total Categorías: <strong className="text-slate-900 dark:text-slate-200">{categories.length}</strong> | Activas:{' '}
            <strong className="text-emerald-700 dark:text-emerald-400">{categories.filter(c => c.isActive).length}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
