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
  Search, 
  Filter, 
  Wrench, 
  Bookmark, 
  CheckCircle2, 
  Sparkles,
  Info,
  RefreshCw,
  AlertTriangle
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
  onReconcileSpots?: () => Promise<{ success: boolean; freedCount?: number; activeCount?: number }>;
  onGoToExitTicket?: (ticket: ParkingTicket) => void;
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
  onReconcileSpots,
  onGoToExitTicket,
  embedded = false
}) => {
  // Tabs: 'list' | 'create_single' | 'create_bulk'
  const [activeTab, setActiveTab] = useState<'list' | 'create_single' | 'create_bulk'>('list');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Selection for bulk operations
  const [selectedSpotIds, setSelectedSpotIds] = useState<string[]>([]);

  // Reconciliation Loading state
  const [isReconciling, setIsReconciling] = useState(false);

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

  // Spot validation helpers against active patio tickets
  const isSpotReallyOccupied = (s: ParkingSpot) => {
    return activeTickets.some(t => t.spotCode === s.code || t.id === s.currentTicketId);
  };

  const getSpotActiveTicket = (s: ParkingSpot) => {
    return activeTickets.find(t => t.spotCode === s.code || t.id === s.currentTicketId);
  };

  // Reconciled counts
  const availableCount = useMemo(() => spots.filter(s => s.status === 'available').length, [spots]);
  const realOccupiedCount = useMemo(() => spots.filter(s => s.status === 'occupied' && isSpotReallyOccupied(s)).length, [spots, activeTickets]);
  const orphanOccupiedCount = useMemo(() => spots.filter(s => s.status === 'occupied' && !isSpotReallyOccupied(s)).length, [spots, activeTickets]);
  const maintenanceOrReservedCount = useMemo(() => spots.filter(s => s.status === 'maintenance' || s.status === 'reserved').length, [spots]);

  // Handler for one-click synchronization
  const handleReconcile = async () => {
    if (isReconciling) return;
    setIsReconciling(true);
    try {
      if (onReconcileSpots) {
        const res = await onReconcileSpots();
        if (res.freedCount && res.freedCount > 0) {
          showSuccess(`¡Sincronización exitosa! Se liberaron ${res.freedCount} plaza(s) huérfana(s).`);
        } else {
          showSuccess(`¡Plazas sincronizadas con el patio real! (${res.activeCount ?? activeTickets.length} vehículos activos).`);
        }
      } else {
        const orphans = spots.filter(s => s.status === 'occupied' && !isSpotReallyOccupied(s));
        if (orphans.length > 0) {
          onUpdateMultipleSpotStatus(orphans.map(o => o.id), 'available');
          showSuccess(`Se corrigieron y liberaron ${orphans.length} plazas huérfanas.`);
        } else {
          showSuccess('Todas las plazas ya coinciden con los vehículos en patio.');
        }
      }
    } catch (e: any) {
      console.warn('[SpotsManagementModal] Error al sincronizar:', e);
      alert(`Error al sincronizar plazas: ${e?.message || 'Error desconocido'}`);
    } finally {
      setIsReconciling(false);
    }
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

  // Filtered spots list with smart plate / ticket / code search and orphan support
  const filteredSpots = useMemo(() => {
    return spots.filter(s => {
      const matchesType = selectedTypeFilter === 'all' || s.type === selectedTypeFilter;
      
      let matchesStatus = true;
      if (selectedStatusFilter === 'all') {
        matchesStatus = true;
      } else if (selectedStatusFilter === 'orphan') {
        matchesStatus = s.status === 'occupied' && !isSpotReallyOccupied(s);
      } else if (selectedStatusFilter === 'occupied') {
        matchesStatus = s.status === 'occupied' && isSpotReallyOccupied(s);
      } else {
        matchesStatus = s.status === selectedStatusFilter;
      }

      const activeTicket = getSpotActiveTicket(s);
      const q = searchQuery.trim().toUpperCase();
      const matchesSearch = !q || 
        s.code.toUpperCase().includes(q) ||
        (s.zoneName && s.zoneName.toUpperCase().includes(q)) ||
        (s.notes && s.notes.toUpperCase().includes(q)) ||
        (activeTicket?.plate && activeTicket.plate.toUpperCase().includes(q)) ||
        (activeTicket?.ticketNumber && activeTicket.ticketNumber.toUpperCase().includes(q));

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [spots, selectedTypeFilter, selectedStatusFilter, searchQuery, activeTickets]);

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
      if (!spot) return false;
      const hasRealVehicle = activeTickets.some(t => t.spotCode === spot.code || t.id === spot.currentTicketId);
      return !hasRealVehicle;
    });

    if (deletableIds.length === 0) {
      alert('No se pueden eliminar plazas que tengan un vehículo activo en patio.');
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
      if (!spot) return false;
      const hasRealVehicle = activeTickets.some(t => t.spotCode === spot.code || t.id === spot.currentTicketId);
      if (hasRealVehicle && status !== 'available') return false;
      return true;
    });

    if (changeableIds.length === 0) {
      alert('Las plazas seleccionadas tienen vehículos activos en patio y no pueden cambiar de estado.');
      return;
    }

    onUpdateMultipleSpotStatus(changeableIds, status);
    setSelectedSpotIds([]);
    showSuccess(`Estado actualizado para ${changeableIds.length} plaza(s).`);
  };

  const handleLiberateSelectedOrphans = () => {
    const orphanIds = selectedSpotIds.filter(id => {
      const spot = spots.find(s => s.id === id);
      if (!spot) return false;
      const hasRealVehicle = activeTickets.some(t => t.spotCode === spot.code || t.id === spot.currentTicketId);
      return spot.status === 'occupied' && !hasRealVehicle;
    });

    if (orphanIds.length === 0) {
      alert('No hay plazas desincronizadas en la selección.');
      return;
    }

    onUpdateMultipleSpotStatus(orphanIds, 'available');
    setSelectedSpotIds([]);
    showSuccess(`${orphanIds.length} plaza(s) huérfana(s) liberada(s) correctamente.`);
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full animate-in fade-in duration-150" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150"}>
      <div className={embedded ? "wz-surface bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-[22px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] w-full flex flex-col overflow-hidden border border-slate-900/[0.06] dark:border-white/[0.07]" : "wz-surface bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-[22px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-900/[0.06] dark:border-white/[0.07]"}>
        
        {/* Modal Top Header */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-5 pt-5 pb-4 flex items-center justify-between gap-3 border-b border-slate-200/70 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold flex items-center gap-2 flex-wrap">
                <span>Gestión y Configuración de Plazas de Parqueo</span>
                <span className="text-xs bg-amber-500 text-slate-950 font-bold px-2.5 py-0.5 rounded-full tabular-nums">
                  {spots.length} Plazas
                </span>
              </h3>
              <p className="text-[13px] text-slate-600 dark:text-slate-400">
                Administre puestos individuales, marque mantenimientos o genere lotes de plazas por categoría.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Toast */}
        {successMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border-b border-emerald-200 dark:border-emerald-500/30 px-5 py-3 text-sm text-emerald-900 dark:text-emerald-200 font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Navigation Bar */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200/70 dark:border-slate-800 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              aria-selected={activeTab === 'list'}
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                activeTab === 'list' 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Ver Plazas ({spots.length})</span>
            </button>

            <button
              type="button"
              aria-selected={activeTab === 'create_single'}
              onClick={handleOpenCreateSingle}
              className={`flex items-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                activeTab === 'create_single' 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-amber-500" />
              <span>{editingSpotId ? 'Editar Plaza' : 'Crear Plaza Individual'}</span>
            </button>

            <button
              type="button"
              aria-selected={activeTab === 'create_bulk'}
              onClick={() => setActiveTab('create_bulk')}
              className={`flex items-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                activeTab === 'create_bulk' 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Generador Masivo (Lote)</span>
            </button>
          </div>

          {/* Quick Metrics & Reconcile Button */}
          <div className="flex items-center gap-2 text-[13px] flex-wrap">
            <span className="px-3 min-h-[36px] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200 font-semibold rounded-xl flex items-center gap-1.5 tabular-nums">
              <span className="w-2 h-2 rounded-full bg-emerald-500 motion-safe:animate-pulse"></span>
              {availableCount} Libres
            </span>
            <span className="px-3 min-h-[36px] bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 font-semibold rounded-xl flex items-center gap-1.5 tabular-nums" title={`${realOccupiedCount} con vehículo activo en patio`}>
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              {realOccupiedCount} Ocupadas
            </span>
            <span className="px-3 min-h-[36px] bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 font-semibold rounded-xl flex items-center gap-1.5 tabular-nums">
              <Wrench className="w-3 h-3 text-amber-600" />
              {maintenanceOrReservedCount} Mant. / Res.
            </span>

            {orphanOccupiedCount > 0 && (
              <button
                type="button"
                onClick={handleReconcile}
                className="px-3 min-h-[44px] bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer motion-safe:animate-pulse focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                title="Plazas marcadas como ocupadas pero sin ticket en patio. Clic para corregir."
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{orphanOccupiedCount} Huérfana{orphanOccupiedCount > 1 ? 's' : ''} (Clic para liberar)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleReconcile}
              disabled={isReconciling}
              className="flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 ml-auto focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
              title="Sincronizar el estado de las plazas con los tickets activos reales en patio"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin text-blue-600' : 'text-blue-600 dark:text-blue-400'}`} />
              <span>{isReconciling ? 'Sincronizando...' : 'Sincronizar con Patio'}</span>
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 bg-slate-50 dark:bg-slate-950/60">

          {/* ================= TAB 1: LISTING & MANAGEMENT ================= */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              
              {/* Search & Filter Controls */}
              <div className="wz-surface rounded-2xl border border-slate-900/[0.06] bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)] dark:border-white/[0.07] dark:bg-slate-900 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                
                {/* Search input */}
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar código, placa, ticket o zona..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 pl-10 pr-3.5 text-sm transition-colors"
                  />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                  <div className="flex items-center gap-1 min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800">
                    <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ml-1" />
                    <select
                      value={selectedTypeFilter}
                      onChange={(e) => setSelectedTypeFilter(e.target.value)}
                      className="bg-transparent min-h-[44px] text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none cursor-pointer pr-1 focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-lg"
                    >
                      <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Categorías: Todas</option>
                      {activeCategories.map(cat => (
                        <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800">
                    <select
                      value={selectedStatusFilter}
                      onChange={(e) => setSelectedStatusFilter(e.target.value)}
                      className="bg-transparent min-h-[44px] text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none cursor-pointer pr-1 focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-lg"
                    >
                      <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Estado: Todos</option>
                      <option value="available" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Solo Libres ({availableCount})</option>
                      <option value="occupied" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Solo Ocupadas ({realOccupiedCount})</option>
                      {orphanOccupiedCount > 0 && (
                        <option value="orphan" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                          ⚠️ Huérfanas / Desinc. ({orphanOccupiedCount})
                        </option>
                      )}
                      <option value="maintenance" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Mantenimiento</option>
                      <option value="reserved" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Reservadas</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 shrink-0"
                  >
                    {selectedSpotIds.length === filteredSpots.length && filteredSpots.length > 0 ? 'Desmarcar' : 'Seleccionar Todo'}
                  </button>
                </div>
              </div>

              {/* Bulk Actions Floating Bar when selection exists */}
              {selectedSpotIds.length > 0 && (
                <div className="bg-slate-900 dark:bg-slate-800 text-white p-3 rounded-2xl shadow-[0_14px_28px_-14px_rgba(15,23,42,.6)] border border-slate-800 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold tabular-nums">
                      {selectedSpotIds.length}
                    </span>
                    <span>Plaza(s) seleccionada(s)</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <button
                      type="button"
                      onClick={() => handleSetStatusForSelected('available')}
                      className="min-h-[44px] px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                    >
                      Marcar Disponibles
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetStatusForSelected('maintenance')}
                      className="min-h-[44px] px-4 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                    >
                      Marcar Mantenimiento
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetStatusForSelected('reserved')}
                      className="min-h-[44px] px-4 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                    >
                      Marcar Reservadas
                    </button>
                    {orphanOccupiedCount > 0 && (
                      <button
                        type="button"
                        onClick={handleLiberateSelectedOrphans}
                        className="min-h-[44px] px-4 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                        title="Liberar solo las plazas de la selección que están marcadas ocupadas pero no tienen vehículo en patio"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Liberar Huérfanas</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="min-h-[44px] px-4 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Spots Cards Grid */}
              {filteredSpots.length === 0 ? (
                <div className="wz-surface rounded-[22px] border border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:border-white/[0.07] dark:bg-slate-900 p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto">
                    <Grid className="w-6 h-6" />
                  </div>
                  <h4 className="font-display text-lg font-bold text-slate-800 dark:text-slate-200">No se encontraron plazas de parqueo</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                    Ajuste los criterios de búsqueda o haga clic en "Crear Plaza Individual" o "Generador Masivo" para agregar nuevas plazas.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredSpots.map((spot) => {
                    const isSelected = selectedSpotIds.includes(spot.id);
                    const activeTicket = getSpotActiveTicket(spot);
                    const hasRealVehicle = !!activeTicket;
                    const isOrphanOccupied = spot.status === 'occupied' && !hasRealVehicle;

                    return (
                      <div
                        key={spot.id}
                        className={`relative wz-surface bg-white dark:bg-slate-900 rounded-2xl border transition-all p-3.5 flex flex-col justify-between space-y-2.5 ${
                          isSelected
                            ? 'border-amber-500 ring-4 ring-amber-500/20 bg-amber-50/40 dark:bg-amber-500/10'
                            : isOrphanOccupied
                            ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/40 dark:bg-amber-500/10 shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)]'
                            : 'border-slate-900/[0.06] dark:border-white/[0.07] hover:-translate-y-px shadow-[0_1px_2px_rgba(15,23,42,.05),0_10px_24px_-16px_rgba(15,23,42,.3)]'
                        }`}
                      >
                        {/* Top Spot Header */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectSpot(spot.id)}
                              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800 cursor-pointer"
                            />
                            <span className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              {spot.code}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {!hasRealVehicle && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(spot)}
                                className="h-11 w-11 -my-2 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                                title="Editar plaza"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!hasRealVehicle && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`¿Eliminar la plaza ${spot.code}?`)) {
                                    onDeleteSpot(spot.id);
                                    showSuccess(`Plaza ${spot.code} eliminada.`);
                                  }
                                }}
                                className="h-11 w-11 -my-2 -mr-1 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                                title="Eliminar plaza"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Category & Zone Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[13px] text-slate-700 dark:text-slate-300 font-semibold">
                            {getVehicleIcon(spot.type, 'w-4 h-4 text-amber-500 shrink-0')}
                            <span className="truncate">{getVehicleName(spot.type)}</span>
                          </div>

                          {spot.zoneName && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 px-2 py-0.5 rounded-lg">
                              {spot.zoneName}
                            </div>
                          )}
                        </div>

                        {/* Status Badge & Actions */}
                        <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                          {hasRealVehicle ? (
                            <div className="w-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-2 rounded-xl space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-mono font-bold uppercase text-rose-800 dark:text-rose-200 flex items-center gap-1">
                                  <Car className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                  <span className="truncate">{activeTicket.plate}</span>
                                </span>
                                <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-300 shrink-0">
                                  {activeTicket.ticketNumber}
                                </span>
                              </div>
                              {onGoToExitTicket ? (
                                <button
                                  type="button"
                                  onClick={() => onGoToExitTicket(activeTicket)}
                                  className="w-full min-h-[44px] text-center text-sm font-semibold text-rose-800 dark:text-rose-200 hover:text-white bg-rose-100/80 hover:bg-rose-600 dark:bg-rose-500/15 dark:hover:bg-rose-600 border border-rose-300 dark:border-rose-500/40 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                                  title="Ir a registrar salida / cobrar este vehículo en el Patio POS"
                                >
                                  <span>Cobrar / Salida</span>
                                  <span>→</span>
                                </button>
                              ) : (
                                <span className="text-xs font-medium text-rose-700 dark:text-rose-300 block text-center">
                                  Vehículo en patio
                                </span>
                              )}
                            </div>
                          ) : isOrphanOccupied ? (
                            <div className="w-full bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/40 p-2 rounded-xl space-y-1.5 text-center">
                              <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center justify-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span className="truncate">Sin Ticket / Desinc.</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateSpotStatus(spot.id, 'available')}
                                className="w-full min-h-[44px] text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                                title="Liberar plaza y corregir estado a disponible"
                              >
                                Liberar Plaza
                              </button>
                            </div>
                          ) : spot.status === 'maintenance' ? (
                            <div className="w-full flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <Wrench className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                Mant.
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateSpotStatus(spot.id, 'available')}
                                className="min-h-[44px] px-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                              >
                                Habilitar
                              </button>
                            </div>
                          ) : spot.status === 'reserved' ? (
                            <div className="w-full flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-purple-800 dark:text-purple-200 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <Bookmark className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                Reservada
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateSpotStatus(spot.id, 'available')}
                                className="min-h-[44px] px-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                              >
                                Liberar
                              </button>
                            </div>
                          ) : (
                            <div className="w-full flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                Libre
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateSpotStatus(spot.id, 'maintenance')}
                                className="min-h-[44px] px-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-400 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
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
            <div className="max-w-xl mx-auto wz-surface rounded-[22px] border border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:border-white/[0.07] dark:bg-slate-900 p-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200/70 dark:border-slate-800 mb-5">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    {editingSpotId ? 'Editar Plaza de Parqueo' : 'Crear Plaza de Parqueo Individual'}
                  </h4>
                  <p className="text-[13px] text-slate-600 dark:text-slate-400">
                    Configure el código visible, la categoría de vehículo asignada y la zona física.
                  </p>
                </div>
              </div>

              {formError && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-semibold text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitSingleForm} className="space-y-4">
                {/* Spot Code */}
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Código de la Plaza *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: A-01, M-05, P-12"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 font-mono font-bold tabular-nums transition-colors"
                  />
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">
                    Debe ser único en el sistema (ejemplo: A-01 para autos, M-01 para motos).
                  </p>
                </div>

                {/* Vehicle Category */}
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
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
                          className={`min-h-[52px] rounded-2xl px-3 flex items-center gap-2.5 text-sm font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                            isSelected
                              ? 'border-2 border-blue-700 bg-gradient-to-b from-blue-50 to-blue-100 text-blue-900 shadow-[0_8px_16px_-10px_rgba(29,78,216,.7)] dark:border-blue-400 dark:from-blue-500/20 dark:to-blue-500/10 dark:text-blue-100'
                              : 'wz-tile border border-slate-200 bg-white text-slate-700 hover:-translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {getVehicleIcon(cat.icon || cat.id, isSelected ? 'w-4 h-4 text-amber-600 dark:text-amber-400' : 'w-4 h-4 text-slate-500 dark:text-slate-400')}
                          <span className="font-semibold truncate">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Zone Name */}
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Nombre de Zona / Ubicación (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Piso 1 - Sector A, Subsuelo, Zona VIP"
                    value={formZoneName}
                    onChange={(e) => setFormZoneName(e.target.value)}
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 transition-colors"
                  />
                </div>

                {/* Initial Status */}
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Estado Inicial
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 cursor-pointer"
                  >
                    <option value="available" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Disponible para Parqueo</option>
                    <option value="maintenance" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Mantenimiento / Fuera de Servicio</option>
                    <option value="reserved" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Reservada</option>
                  </select>
                </div>

                {/* Form Action Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200/70 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="min-h-[56px] rounded-2xl bg-gradient-to-b from-blue-600 to-blue-700 px-6 text-base font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 disabled:opacity-50 dark:from-blue-500 dark:to-blue-600 transition cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
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
            <div className="max-w-xl mx-auto wz-surface rounded-[22px] border border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:border-white/[0.07] dark:bg-slate-900 p-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200/70 dark:border-slate-800 mb-5">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    Generador Masivo de Plazas por Lote
                  </h4>
                  <p className="text-[13px] text-slate-600 dark:text-slate-400">
                    Cree secuencias numéricas de plazas automáticamente (ej: A-01 hasta A-20).
                  </p>
                </div>
              </div>

              {bulkError && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-semibold text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{bulkError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitBulk} className="space-y-4">
                
                <div className="grid grid-cols-3 gap-3">
                  {/* Prefix */}
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      Prefijo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: A-, M-"
                      value={bulkPrefix}
                      onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())}
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 px-3 font-mono font-bold tabular-nums"
                    />
                  </div>

                  {/* Start Number */}
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      N° Inicial *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={bulkStartNum}
                      onChange={(e) => setBulkStartNum(parseInt(e.target.value) || 1)}
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 px-3 font-mono font-bold tabular-nums"
                    />
                  </div>

                  {/* End Number */}
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      N° Final *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={bulkEndNum}
                      onChange={(e) => setBulkEndNum(parseInt(e.target.value) || 1)}
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 px-3 font-mono font-bold tabular-nums"
                    />
                  </div>
                </div>

                {/* Preview Box */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Vista previa del lote a generar:</span>
                  </div>
                  <div className="font-mono mt-1 text-[13px] font-bold tabular-nums text-slate-800 dark:text-slate-100">
                    {bulkPrefix}{bulkStartNum < 10 ? `0${bulkStartNum}` : bulkStartNum}, {bulkPrefix}{bulkStartNum + 1 < 10 ? `0${bulkStartNum + 1}` : bulkStartNum + 1} ... {bulkPrefix}{bulkEndNum < 10 ? `0${bulkEndNum}` : bulkEndNum}
                  </div>
                  <div className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                    Se intentarán crear {Math.max(0, bulkEndNum - bulkStartNum + 1)} plazas consecutivas.
                  </div>
                </div>

                {/* Vehicle Category */}
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
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
                          className={`min-h-[52px] rounded-2xl px-3 flex items-center gap-2.5 text-sm font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
                            isSelected
                              ? 'border-2 border-blue-700 bg-gradient-to-b from-blue-50 to-blue-100 text-blue-900 shadow-[0_8px_16px_-10px_rgba(29,78,216,.7)] dark:border-blue-400 dark:from-blue-500/20 dark:to-blue-500/10 dark:text-blue-100'
                              : 'wz-tile border border-slate-200 bg-white text-slate-700 hover:-translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {getVehicleIcon(cat.icon || cat.id, isSelected ? 'w-4 h-4 text-amber-600 dark:text-amber-400' : 'w-4 h-4 text-slate-500 dark:text-slate-400')}
                          <span className="font-semibold truncate">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Zone Name */}
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Nombre de Zona (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Zona Norte, Sector Motos, Piso 2"
                    value={bulkZoneName}
                    onChange={(e) => setBulkZoneName(e.target.value)}
                    className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 transition-colors"
                  />
                </div>

                {/* Form Action Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200/70 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="min-h-[56px] rounded-2xl bg-gradient-to-b from-blue-600 to-blue-700 px-6 text-base font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 disabled:opacity-50 dark:from-blue-500 dark:to-blue-600 transition cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
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
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200/70 dark:border-slate-800 px-5 py-3 flex items-center justify-between gap-3 text-[13px] font-medium text-slate-600 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Las plazas creadas o modificadas se guardan automáticamente en la base de datos local del terminal.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 shrink-0"
          >
            Cerrar Panel
          </button>
        </div>

      </div>
    </div>
  );
};
