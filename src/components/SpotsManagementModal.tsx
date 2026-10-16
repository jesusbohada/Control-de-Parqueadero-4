import React, { useState, useMemo } from 'react';
import { 
  X, 
  Grid, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  AlertCircle, 
  Car, 
  Bike, 
  Truck, 
  Search, 
  Filter, 
  Layers, 
  Wrench, 
  Bookmark, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  Compass, 
  Bus,
  Sparkles,
  Info
} from 'lucide-react';
import { ParkingSpot, VehicleType, VehicleCategoryConfig, ParkingTicket } from '../types';
import { renderVehicleIcon } from '../utils/vehicleIcons';

interface SpotsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  spots: ParkingSpot[];
  activeTickets: ParkingTicket[];
  vehicleCategories: VehicleCategoryConfig[];
  onSaveSpot: (spot: ParkingSpot) => void;
  onSaveMultipleSpots: (newSpots: ParkingSpot[]) => void;
  onDeleteSpot: (spotId: string) => void;
  onDeleteMultipleSpots: (spotIds: string[]) => void;
  onUpdateSpotStatus: (spotId: string, status: 'available' | 'reserved' | 'maintenance') => void;
  onUpdateMultipleSpotStatus: (spotIds: string[], status: 'available' | 'reserved' | 'maintenance') => void;
  embedded?: boolean;
}

export const SpotsManagementModal: React.FC<SpotsManagementModalProps> = ({
  isOpen,
  onClose,
  spots,
  activeTickets,
  vehicleCategories = [],
  onSaveSpot,
  onSaveMultipleSpots,
  onDeleteSpot,
  onDeleteMultipleSpots,
  onUpdateSpotStatus,
  onUpdateMultipleSpotStatus,
  embedded = false
}) => {
  if (!isOpen && !embedded) return null;

  // Tabs: 'list' | 'create_single' | 'create_bulk'
  const [activeTab, setActiveTab] = useState<'list' | 'create_single' | 'create_bulk'>('list');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Selection for bulk operations
  const [selectedSpotIds, setSelectedSpotIds] = useState<string[]>([]);

  // Single Edit / Create Form State
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<VehicleType>('car');
  const [formStatus, setFormStatus] = useState<'available' | 'reserved' | 'maintenance'>('available');
  const [formZoneName, setFormZoneName] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Bulk Generator State
  const [bulkPrefix, setBulkPrefix] = useState('P-');
  const [bulkStartNum, setBulkStartNum] = useState<number>(1);
  const [bulkEndNum, setBulkEndNum] = useState<number>(10);
  const [bulkType, setBulkType] = useState<VehicleType>('car');
  const [bulkZoneName, setBulkZoneName] = useState('');
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Success Toast
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Helper for vehicle category names & icons
  const activeCategories = useMemo(() => {
    if (vehicleCategories && vehicleCategories.length > 0) {
      const active = vehicleCategories.filter(c => c.isActive !== false && c.enabled !== false);
      if (active.length > 0) return active;
    }
    return [
      { id: 'car', name: 'Carro / Auto', icon: 'Car' },
      { id: 'motorcycle', name: 'Motocicleta', icon: 'Bike' },
      { id: 'suv', name: 'Camioneta / SUV', icon: 'Truck' },
      { id: 'bicycle', name: 'Bicicleta', icon: 'Bike' },
    ];
  }, [vehicleCategories]);

  const getVehicleIcon = (type: string, className = 'w-4 h-4') => {
    return renderVehicleIcon(type, className, vehicleCategories);
  };

  const getVehicleName = (type: string) => {
    const custom = vehicleCategories?.find(c => c.id === type);
    if (custom) return custom.name;
    switch (type) {
      case 'car': return 'Carro / Auto';
      case 'motorcycle': return 'Motocicleta';
      case 'suv': return 'Camioneta / SUV';
      case 'bicycle': return 'Bicicleta';
      default: return String(type).toUpperCase();
    }
  };

  // Filtered spots list
  const filteredSpots = useMemo(() => {
    return spots.filter(s => {
      const matchesType = selectedTypeFilter === 'all' || s.type === selectedTypeFilter;
      const matchesStatus = selectedStatusFilter === 'all' || s.status === selectedStatusFilter;
      const matchesSearch = !searchQuery.trim() || 
        s.code.toUpperCase().includes(searchQuery.trim().toUpperCase()) ||
        (s.zoneName && s.zoneName.toUpperCase().includes(searchQuery.trim().toUpperCase())) ||
        (s.notes && s.notes.toUpperCase().includes(searchQuery.trim().toUpperCase()));
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [spots, selectedTypeFilter, selectedStatusFilter, searchQuery]);

  // Handle single create / edit submission
  const handleOpenCreateSingle = () => {
    setEditingSpotId(null);
    setFormCode('');
    setFormType(activeCategories[0]?.id || 'car');
    setFormStatus('available');
    setFormZoneName('');
    setFormNotes('');
    setFormError(null);
    setActiveTab('create_single');
  };

  const handleOpenEdit = (spot: ParkingSpot) => {
    setEditingSpotId(spot.id);
    setFormCode(spot.code);
    setFormType(spot.type);
    setFormStatus(spot.status === 'occupied' ? 'available' : spot.status);
    setFormZoneName(spot.zoneName || '');
    setFormNotes(spot.notes || '');
    setFormError(null);
    setActiveTab('create_single');
  };

  const handleSubmitSingleForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = formCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 2) {
      setFormError('Ingrese un código de plaza válido (mínimo 2 caracteres, ej: A-01)');
      return;
    }

    // Check code duplication
    const duplicate = spots.find(s => s.code.toUpperCase() === cleanCode && s.id !== editingSpotId);
    if (duplicate) {
      setFormError(`El código de plaza "${cleanCode}" ya existe en el sistema.`);
      return;
    }

    const spotToSave: ParkingSpot = {
      id: editingSpotId || `spot-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: cleanCode,
      type: formType,
      status: editingSpotId ? (spots.find(s => s.id === editingSpotId)?.status === 'occupied' ? 'occupied' : formStatus) : formStatus,
      zoneName: formZoneName.trim() || undefined,
      notes: formNotes.trim() || undefined,
    };

    onSaveSpot(spotToSave);
    showSuccess(editingSpotId ? `Plaza ${cleanCode} actualizada correctamente.` : `Plaza ${cleanCode} creada con éxito.`);
    setActiveTab('list');
  };

  // Handle Bulk Generator Submission
  const handleSubmitBulk = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError(null);

    const prefix = bulkPrefix.trim().toUpperCase();
    if (bulkStartNum < 1 || bulkEndNum < bulkStartNum) {
      setBulkError('El número final debe ser mayor o igual al número inicial.');
      return;
    }

    const count = bulkEndNum - bulkStartNum + 1;
    if (count > 100) {
      setBulkError('Puede generar un máximo de 100 plazas por lote a la vez.');
      return;
    }

    const newSpotsBatch: ParkingSpot[] = [];
    const existingCodes = new Set(spots.map(s => s.code.toUpperCase()));
    const duplicatesSkipped: string[] = [];

    for (let i = bulkStartNum; i <= bulkEndNum; i++) {
      const numStr = i < 10 ? `0${i}` : `${i}`;
      const code = `${prefix}${numStr}`;

      if (existingCodes.has(code)) {
        duplicatesSkipped.push(code);
      } else {
        existingCodes.add(code);
        newSpotsBatch.push({
          id: `spot-bulk-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
          code,
          type: bulkType,
          status: 'available',
          zoneName: bulkZoneName.trim() || undefined,
        });
      }
    }

    if (newSpotsBatch.length === 0) {
      setBulkError('Todas las plazas del rango solicitado ya existen en el parqueadero.');
      return;
    }

    onSaveMultipleSpots(newSpotsBatch);
    showSuccess(`¡Se crearon ${newSpotsBatch.length} plazas de parqueo correctamente!${duplicatesSkipped.length > 0 ? ` (${duplicatesSkipped.length} duplicados omitidos)` : ''}`);
    setActiveTab('list');
  };

  // Bulk Selection Handlers
  const handleToggleSelectSpot = (id: string) => {
    setSelectedSpotIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedSpotIds.length === filteredSpots.length) {
      setSelectedSpotIds([]);
    } else {
      setSelectedSpotIds(filteredSpots.map(s => s.id));
    }
  };

  const handleDeleteSelected = () => {
    const deletableIds = selectedSpotIds.filter(id => {
      const spot = spots.find(s => s.id === id);
      return spot && spot.status !== 'occupied';
    });

    if (deletableIds.length === 0) {
      alert('No se pueden eliminar plazas que se encuentren ocupadas actualmente por un vehículo.');
      return;
    }

    if (confirm(`¿Está seguro de eliminar ${deletableIds.length} plaza(s) de parqueo seleccionada(s)?`)) {
      onDeleteMultipleSpots(deletableIds);
      setSelectedSpotIds([]);
      showSuccess(`${deletableIds.length} plazas eliminadas con éxito.`);
    }
  };

  const handleSetStatusForSelected = (status: 'available' | 'reserved' | 'maintenance') => {
    const changeableIds = selectedSpotIds.filter(id => {
      const spot = spots.find(s => s.id === id);
      return spot && spot.status !== 'occupied';
    });

    if (changeableIds.length === 0) {
      alert('Las plazas seleccionadas están ocupadas y no pueden cambiar de estado.');
      return;
    }

    onUpdateMultipleSpotStatus(changeableIds, status);
    setSelectedSpotIds([]);
    showSuccess(`Estado actualizado para ${changeableIds.length} plaza(s).`);
  };

  return (
    <div className={embedded ? "w-full animate-in fade-in duration-150" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"}>
      <div className={embedded ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-xl w-full flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800" : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"}>
        
        {/* Modal Top Header */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-wide flex items-center gap-2">
                <span>Gestión y Configuración de Plazas de Parqueo</span>
                <span className="text-xs bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full">
                  {spots.length} Plazas
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Administre puestos individuales, marque mantenimientos o genere lotes de plazas por categoría.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-xl transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Toast */}
        {successMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800/80 px-5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Navigation Bar */}
        <div className="bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 p-1 rounded-xl">
            <button
              type="button"
              aria-selected={activeTab === 'list'}
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'list' 
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/60 dark:border-slate-700/60' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Ver Plazas ({spots.length})</span>
            </button>

            <button
              type="button"
              aria-selected={activeTab === 'create_single'}
              onClick={handleOpenCreateSingle}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'create_single' 
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/60 dark:border-slate-700/60' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-amber-500" />
              <span>{editingSpotId ? 'Editar Plaza' : 'Crear Plaza Individual'}</span>
            </button>

            <button
              type="button"
              aria-selected={activeTab === 'create_bulk'}
              onClick={() => setActiveTab('create_bulk')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'create_bulk' 
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/60 dark:border-slate-700/60' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Generador Masivo (Lote)</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {spots.filter(s => s.status === 'available').length} Libres
            </span>
            <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold rounded-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              {spots.filter(s => s.status === 'occupied').length} Ocupadas
            </span>
            <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold rounded-lg flex items-center gap-1.5">
              <Wrench className="w-3 h-3 text-amber-600" />
              {spots.filter(s => s.status === 'maintenance' || s.status === 'reserved').length} Mant. / Res.
            </span>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 bg-slate-50/50 dark:bg-slate-950/50">

          {/* ================= TAB 1: LISTING & MANAGEMENT ================= */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              
              {/* Search & Filter Controls */}
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                
                {/* Search input */}
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar código, zona o notas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors"
                  />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-xl text-xs">
                    <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ml-1" />
                    <select
                      value={selectedTypeFilter}
                      onChange={(e) => setSelectedTypeFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-1"
                    >
                      <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Categorías: Todas</option>
                      {activeCategories.map(cat => (
                        <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-xl text-xs">
                    <select
                      value={selectedStatusFilter}
                      onChange={(e) => setSelectedStatusFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-1"
                    >
                      <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Estado: Todos</option>
                      <option value="available" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Solo Libres</option>
                      <option value="occupied" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Solo Ocupadas</option>
                      <option value="maintenance" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Mantenimiento</option>
                      <option value="reserved" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Reservadas</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs transition-colors shrink-0 cursor-pointer"
                  >
                    {selectedSpotIds.length === filteredSpots.length && filteredSpots.length > 0 ? 'Desmarcar' : 'Seleccionar Todo'}
                  </button>
                </div>
              </div>

              {/* Bulk Actions Floating Bar when selection exists */}
              {selectedSpotIds.length > 0 && (
                <div className="bg-slate-900 dark:bg-slate-850 text-white p-3 rounded-2xl shadow-lg border border-slate-800 dark:border-slate-750 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black">
                      {selectedSpotIds.length}
                    </span>
                    <span>Plaza(s) seleccionada(s)</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <button
                      type="button"
                      onClick={() => handleSetStatusForSelected('available')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Marcar Disponibles
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetStatusForSelected('maintenance')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Marcar Mantenimiento
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetStatusForSelected('reserved')}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Marcar Reservadas
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Spots Cards Grid */}
              {filteredSpots.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto">
                    <Grid className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No se encontraron plazas de parqueo</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                    Ajuste los criterios de búsqueda o haga clic en "Crear Plaza Individual" o "Generador Masivo" para agregar nuevas plazas.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredSpots.map((spot) => {
                    const isSelected = selectedSpotIds.includes(spot.id);
                    const isOccupied = spot.status === 'occupied';
                    const activeTicket = activeTickets.find(t => t.spotCode === spot.code || t.id === spot.currentTicketId);

                    return (
                      <div
                        key={spot.id}
                        className={`relative bg-white dark:bg-slate-900 rounded-2xl border transition-all p-3.5 flex flex-col justify-between space-y-2.5 ${
                          isSelected
                            ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                        }`}
                      >
                        {/* Top Spot Header */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectSpot(spot.id)}
                              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800 cursor-pointer"
                            />
                            <span className="font-black font-mono text-base text-slate-900 dark:text-slate-100 tracking-tight">
                              {spot.code}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {!isOccupied && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(spot)}
                                className="p-1 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Editar plaza"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!isOccupied && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`¿Eliminar la plaza ${spot.code}?`)) {
                                    onDeleteSpot(spot.id);
                                    showSuccess(`Plaza ${spot.code} eliminada.`);
                                  }
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Eliminar plaza"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Category & Zone Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-bold">
                            {getVehicleIcon(spot.type, 'w-4 h-4 text-amber-500 shrink-0')}
                            <span className="truncate">{getVehicleName(spot.type)}</span>
                          </div>

                          {spot.zoneName && (
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold truncate bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 px-2 py-0.5 rounded-md">
                              {spot.zoneName}
                            </div>
                          )}
                        </div>

                        {/* Status Badge & Actions */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          {isOccupied ? (
                            <div className="w-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-1.5 rounded-xl text-center">
                              <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-300 block truncate">
                                Ocupada ({activeTicket?.plate || 'En Uso'})
                              </span>
                            </div>
                          ) : spot.status === 'maintenance' ? (
                            <div className="w-full flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <Wrench className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                Mant.
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateSpotStatus(spot.id, 'available')}
                                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                              >
                                Habilitar
                              </button>
                            </div>
                          ) : spot.status === 'reserved' ? (
                            <div className="w-full flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <Bookmark className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                Reservada
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateSpotStatus(spot.id, 'available')}
                                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                              >
                                Liberar
                              </button>
                            </div>
                          ) : (
                            <div className="w-full flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                Libre
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateSpotStatus(spot.id, 'maintenance')}
                                className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer"
                                title="Marcar en mantenimiento"
                              >
                                Mant.
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* ================= TAB 2: CREATE / EDIT SINGLE SPOT ================= */}
          {activeTab === 'create_single' && (
            <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    {editingSpotId ? 'Editar Plaza de Parqueo' : 'Crear Plaza de Parqueo Individual'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Configure el código visible, la categoría de vehículo asignada y la zona física.
                  </p>
                </div>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitSingleForm} className="space-y-4">
                {/* Spot Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Código de la Plaza *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: A-01, M-05, P-12"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 rounded-xl px-3.5 py-2.5 font-mono text-base font-bold text-slate-900 dark:text-slate-100 outline-none transition-colors"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Debe ser único en el sistema (ejemplo: A-01 para autos, M-01 para motos).
                  </p>
                </div>

                {/* Vehicle Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Categoría de Vehículo Asignada *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {activeCategories.map((cat) => {
                      const isSelected = formType === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setFormType(cat.id)}
                          className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer text-xs ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-300 font-bold shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700/60'
                          }`}
                        >
                          {getVehicleIcon(cat.icon || cat.id, isSelected ? 'w-4 h-4 text-amber-600 dark:text-amber-400' : 'w-4 h-4 text-slate-500 dark:text-slate-400')}
                          <span className="font-bold truncate">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Zone Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Nombre de Zona / Ubicación (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Piso 1 - Sector A, Subsuelo, Zona VIP"
                    value={formZoneName}
                    onChange={(e) => setFormZoneName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors"
                  />
                </div>

                {/* Initial Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Estado Inicial
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="available" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Disponible para Parqueo</option>
                    <option value="maintenance" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Mantenimiento / Fuera de Servicio</option>
                    <option value="reserved" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Reservada</option>
                  </select>
                </div>

                {/* Form Action Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingSpotId ? 'Guardar Cambios' : 'Crear Plaza'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= TAB 3: BULK GENERATOR (LOTES) ================= */}
          {activeTab === 'create_bulk' && (
            <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    Generador Masivo de Plazas por Lote
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Cree secuencias numéricas de plazas automáticamente (ej: A-01 hasta A-20).
                  </p>
                </div>
              </div>

              {bulkError && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{bulkError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitBulk} className="space-y-4">
                
                <div className="grid grid-cols-3 gap-3">
                  {/* Prefix */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                      Prefijo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: A-, M-"
                      value={bulkPrefix}
                      onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 rounded-xl px-3 py-2 font-mono text-sm font-bold text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>

                  {/* Start Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                      N° Inicial *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={bulkStartNum}
                      onChange={(e) => setBulkStartNum(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 rounded-xl px-3 py-2 font-mono text-sm font-bold text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>

                  {/* End Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                      N° Final *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={bulkEndNum}
                      onChange={(e) => setBulkEndNum(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 rounded-xl px-3 py-2 font-mono text-sm font-bold text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>
                </div>

                {/* Preview Box */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Vista previa del lote a generar:</span>
                  </div>
                  <div className="font-mono mt-1 text-[11px] font-bold text-slate-800 dark:text-slate-100">
                    {bulkPrefix}{bulkStartNum < 10 ? `0${bulkStartNum}` : bulkStartNum}, {bulkPrefix}{bulkStartNum + 1 < 10 ? `0${bulkStartNum + 1}` : bulkStartNum + 1} ... {bulkPrefix}{bulkEndNum < 10 ? `0${bulkEndNum}` : bulkEndNum}
                  </div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                    Se intentarán crear {Math.max(0, bulkEndNum - bulkStartNum + 1)} plazas consecutivas.
                  </div>
                </div>

                {/* Vehicle Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Categoría de Vehículo para Todo el Lote *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {activeCategories.map((cat) => {
                      const isSelected = bulkType === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setBulkType(cat.id)}
                          className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer text-xs ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-300 font-bold shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700/60'
                          }`}
                        >
                          {getVehicleIcon(cat.icon || cat.id, isSelected ? 'w-4 h-4 text-amber-600 dark:text-amber-400' : 'w-4 h-4 text-slate-500 dark:text-slate-400')}
                          <span className="font-bold truncate">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Zone Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Nombre de Zona (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Zona Norte, Sector Motos, Piso 2"
                    value={bulkZoneName}
                    onChange={(e) => setBulkZoneName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none transition-colors"
                  />
                </div>

                {/* Form Action Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generar {Math.max(0, bulkEndNum - bulkStartNum + 1)} Plazas</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Modal Bottom Bar */}
        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Las plazas creadas o modificadas se guardan automáticamente en la base de datos local del terminal.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold cursor-pointer transition-colors border border-slate-300 dark:border-slate-700"
          >
            Cerrar Panel
          </button>
        </div>

      </div>
    </div>
  );
};
