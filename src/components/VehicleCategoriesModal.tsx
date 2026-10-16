import React, { useState, useMemo } from 'react';
import { 
  Car, 
  Bike, 
  Truck, 
  Zap, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  Settings2, 
  Layers, 
  DollarSign,
  Tag,
  Shield,
  HelpCircle,
  Bus,
  Compass,
  Search
} from 'lucide-react';
import { VehicleCategoryConfig, SystemUser } from '../types';
import { 
  VEHICLE_TERRESTRIAL_ICONS, 
  renderVehicleIcon, 
  getVehicleIconComponent 
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
    <div className={embedded ? "w-full animate-in fade-in duration-150" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"}>
      <div 
        id="vehicle-categories-modal"
        className={embedded ? "relative w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col" : "relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Configuración de Categorías de Vehículos y Tarifas
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  WolfZone POS
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Personaliza los tipos de vehículos que ingresan al parqueadero, sus tarifas por minuto/hora/día y tiempos de gracia.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Create or Edit Form */}
          {isCreating ? (
            <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-950/70 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  {editingCategory ? `Editar Categoría: ${editingCategory.name}` : 'Crear Nueva Categoría de Vehículo'}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {editingCategory?.isPreset ? 'Categoría Base del Sistema' : 'Categoría Personalizada'}
                </span>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nombre de la Categoría <span className="text-amber-600 dark:text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Camioneta 4x4, Patineta Eléctrica, Buseta..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-amber-500 dark:focus:border-amber-400 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>Ícono de Vehículo Terrestre</span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold font-mono">
                        ({VEHICLE_TERRESTRIAL_ICONS.length} íconos disponibles)
                      </span>
                    </label>

                    {/* Badge del ícono seleccionado actualmente */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                      {renderVehicleIcon(formIcon, 'w-4 h-4 text-amber-600 dark:text-amber-400')}
                      <span className="text-[11px] truncate max-w-[140px] font-bold">
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
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-amber-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    {iconSearch && (
                      <button
                        type="button"
                        onClick={() => setIconSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filtros por grupo vehicular */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSelectedIconGroup('all')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer shrink-0 ${
                        selectedIconGroup === 'all'
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Todos ({VEHICLE_TERRESTRIAL_ICONS.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIconGroup('cars')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer shrink-0 ${
                        selectedIconGroup === 'cars'
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Autos & SUVs
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIconGroup('motos')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer shrink-0 ${
                        selectedIconGroup === 'motos'
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Motos & Bicis
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIconGroup('heavy')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer shrink-0 ${
                        selectedIconGroup === 'heavy'
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Buses & Carga
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIconGroup('eco')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer shrink-0 ${
                        selectedIconGroup === 'eco'
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Eléctricos & Eco
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIconGroup('special')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer shrink-0 ${
                        selectedIconGroup === 'special'
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Especiales & Auxilio
                    </button>
                  </div>

                  {/* Cuadrícula de íconos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-52 overflow-y-auto p-1.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/60 dark:bg-slate-950/60">
                    {filteredIcons.length === 0 ? (
                      <div className="col-span-full py-6 text-center text-xs text-slate-500">
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
                            className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs border transition-all cursor-pointer gap-1 text-center ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 font-bold border-amber-600 shadow-sm ring-2 ring-amber-400/40 scale-[1.02]'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <IconComp className={`w-5 h-5 ${isSelected ? 'text-slate-950 stroke-[2.2]' : 'text-slate-700 dark:text-slate-300'}`} />
                            <span className="text-[10px] leading-tight truncate w-full font-medium">
                              {ic.name.split('/')[0].trim()}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-amber-500 dark:focus:border-amber-400 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-colors font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tarifa por Fracción / Minuto ($ COP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={formMinuteRate}
                    onChange={(e) => setFormMinuteRate(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-amber-500 dark:focus:border-amber-400 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-colors font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tarifa por Día Completo ($ COP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formDailyRate}
                    onChange={(e) => setFormDailyRate(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-amber-500 dark:focus:border-amber-400 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-colors font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tiempo de Gracia Gratuito (Minutos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formGracePeriodMinutes}
                    onChange={(e) => setFormGracePeriodMinutes(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-amber-500 dark:focus:border-amber-400 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-colors font-mono"
                  />
                </div>

                <div className="col-span-1 md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Descripción / Observaciones
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Aplica para vehículos con altura mayor a 2.10m..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-amber-500 dark:focus:border-amber-400 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-colors"
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
                    <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {formIsActive ? 'Categoría Activa (Visible en Registro de Entrada)' : 'Categoría Oculta'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Guardar Categoría
                </button>
              </div>
            </form>
          ) : null}

          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Categorías de vehículos configuradas para selección en el panel de entrada POS:
            </div>

            {!isCreating && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
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
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  cat.isActive 
                    ? 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/50 shadow-xs' 
                    : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/60 opacity-65'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        {renderIcon(cat.icon)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{cat.name}</h4>
                          {cat.isPreset && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                              Base
                            </span>
                          )}
                        </div>
                        {cat.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cat.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        ${(cat.defaultHourlyRate ?? cat.rate?.hourRate ?? 0).toLocaleString()}/h
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        ${(cat.defaultMinuteRate ?? cat.rate?.minuteRate ?? Math.round((cat.defaultHourlyRate ?? cat.rate?.hourRate ?? 0) / 60)).toLocaleString()}/min
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800/70 p-2 rounded-lg border border-slate-200 dark:border-slate-700/80">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Día completo:</span>
                      <span className="text-slate-900 dark:text-slate-100 font-mono font-bold">
                        ${(cat.defaultDailyRate ?? cat.rate?.dayRate ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/70 p-2 rounded-lg border border-slate-200 dark:border-slate-700/80">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Gracia gratuita:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{cat.gracePeriodMinutes ?? cat.rate?.gracePeriodMinutes ?? 15} min</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onSaveCategory({ ...cat, isActive: !cat.isActive })}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                      cat.isActive
                        ? 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                        : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {cat.isActive ? '✓ Activo en Entrada' : 'Desactivado'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                      title="Editar categoría"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    {!cat.isPreset && (
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(cat.id)}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
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
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Total Categorías: <strong className="text-slate-900 dark:text-slate-200">{categories.length}</strong> | Activas:{' '}
            <strong className="text-emerald-600 dark:text-emerald-400">{categories.filter(c => c.isActive).length}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
