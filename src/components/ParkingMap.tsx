import React, { useState, useEffect, useMemo } from 'react';
import { 
  Car, 
  Bike, 
  Truck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  Filter, 
  LogOut,
  Info,
  Grid
} from 'lucide-react';
import { ParkingSpot, ParkingTicket, RatesConfig, VehicleType, VehicleCategoryConfig, SystemUser } from '../types';
import { calculateParkingFee, formatCurrency, getVehicleRate } from '../utils/billing';
import { renderVehicleIcon } from '../utils/vehicleIcons';

interface ParkingMapProps {
  spots: ParkingSpot[];
  activeTickets: ParkingTicket[];
  rates: RatesConfig;
  vehicleCategories?: VehicleCategoryConfig[];
  currentUser?: SystemUser;
  onSelectSpotForEntry: (spotCode: string, vehicleType: VehicleType) => void;
  onSelectSpotForExit: (plate: string) => void;
  onToggleSpotStatus: (spotId: string, newStatus: 'available' | 'reserved' | 'maintenance') => void;
  onOpenSpotsManagement?: () => void;
}

export const ParkingMap: React.FC<ParkingMapProps> = ({
  spots,
  activeTickets,
  rates,
  vehicleCategories = [],
  currentUser,
  onSelectSpotForEntry,
  onSelectSpotForExit,
  onToggleSpotStatus,
  onOpenSpotsManagement,
}) => {
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied'>('all');

  // Live tick to keep elapsed times fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Quick stats
  const total = spots.length;
  const occupied = spots.filter(s => s.status === 'occupied').length;
  const available = spots.filter(s => s.status === 'available').length;
  const reserved = spots.filter(s => s.status === 'reserved' || s.status === 'maintenance').length;

  const filteredSpots = spots.filter(s => {
    const matchesZone = selectedZone === 'all' || s.type === selectedZone;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesZone && matchesStatus;
  });

  const getVehicleIcon = (type: string, className = 'w-4 h-4') => {
    return renderVehicleIcon(type, className, vehicleCategories);
  };

  const getZoneTitle = (type: VehicleType) => {
    const custom = vehicleCategories?.find(c => c.id === type);
    if (custom) return `Zona: ${custom.name}`;
    switch (type) {
      case 'car': return 'Zona A: Automóviles';
      case 'motorcycle': return 'Zona M: Motocicletas';
      case 'suv': return 'Zona S: Camionetas y SUVs';
      case 'bicycle': return 'Zona B: Bicicletas';
      default: return `Zona: ${type.toUpperCase()}`;
    }
  };

  // Group spots by vehicle type for organized floor layout
  const zones: VehicleType[] = useMemo(() => {
    const spotTypes = Array.from(new Set(spots.map(s => s.type)));
    if (vehicleCategories && vehicleCategories.length > 0) {
      const activeIds = vehicleCategories.filter(c => c.isActive !== false && c.enabled !== false).map(c => c.id);
      const combined = Array.from(new Set([...activeIds, ...spotTypes]));
      if (combined.length > 0) return combined as VehicleType[];
    }
    const combined = Array.from(new Set(['car', 'motorcycle', 'suv', 'bicycle', ...spotTypes]));
    return combined as VehicleType[];
  }, [spots, vehicleCategories]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Overview Bar */}
      <div className="bg-[var(--bg-surface-2)] rounded-2xl border border-[var(--border-subtle)] p-5 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              <span>Mapa de Plazas en Tiempo Real</span>
              <span className="text-xs font-mono font-bold bg-[var(--bg-surface-3)] text-[var(--text-primary)] px-2.5 py-0.5 rounded-lg border border-[var(--border-subtle)]">
                {total} plazas totales
              </span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">
              Haga clic en una plaza libre para registrar entrada o en una ocupada para liquidar salida.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 px-3.5 py-2 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-black text-emerald-900 dark:text-emerald-300">Disponibles</div>
                <div className="text-sm font-black text-emerald-950 dark:text-emerald-200">{available} plazas</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 px-3.5 py-2 rounded-xl">
              <Clock className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-black text-amber-900 dark:text-amber-300">Ocupadas</div>
                <div className="text-sm font-black text-amber-950 dark:text-amber-200">{occupied} plazas</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 px-3.5 py-2 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-slate-700 dark:text-slate-300 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-black text-slate-800 dark:text-slate-200">Reservadas</div>
                <div className="text-sm font-black text-slate-950 dark:text-slate-100">{reserved} plazas</div>
              </div>
            </div>

            {onOpenSpotsManagement && (
              <button
                type="button"
                onClick={onOpenSpotsManagement}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 dark:bg-amber-400 dark:hover:bg-amber-300 transition-all shadow-md shadow-amber-500/20 cursor-pointer active:scale-98"
                title="Administrar, crear, editar o eliminar plazas de parqueo"
              >
                <Grid className="w-4 h-4 text-slate-950" />
                <span>Gestión de Plazas</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter controls */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Zone filter buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-black text-slate-900 dark:text-slate-100 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200" />
              Zona:
            </span>
            <button
              type="button"
              onClick={() => setSelectedZone('all')}
              className={`text-xs px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer border ${
                selectedZone === 'all' 
                  ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 border-slate-900 dark:border-amber-400 shadow-sm' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700'
              }`}
            >
              Todas las Zonas ({total})
            </button>
            {zones.map((z) => {
              const zoneCount = spots.filter(s => s.type === z).length;
              if (zoneCount === 0) return null;
              const cat = vehicleCategories?.find(c => c.id === z);
              const label = cat?.name || (z === 'car' ? 'Autos' : z === 'motorcycle' ? 'Motos' : z === 'suv' ? 'SUVs' : z === 'bicycle' ? 'Bicis' : String(z).toUpperCase());
              const isSelected = selectedZone === z;
              return (
                <button
                  key={z}
                  type="button"
                  onClick={() => setSelectedZone(z)}
                  className={`text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-black transition-all cursor-pointer border ${
                    isSelected 
                      ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 border-slate-900 dark:border-amber-400 shadow-sm' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {getVehicleIcon(z, 'w-3.5 h-3.5')}
                  <span>{label} ({zoneCount})</span>
                </button>
              );
            })}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-slate-200/90 dark:bg-slate-800/90 p-1 rounded-xl text-xs border border-slate-300 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                statusFilter === 'all' 
                  ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm border border-slate-900 dark:border-amber-400' 
                  : 'text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-300/60 dark:hover:bg-slate-700/60'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('available')}
              className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                statusFilter === 'available' 
                  ? 'bg-emerald-600 text-white shadow-sm border border-emerald-500' 
                  : 'text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40'
              }`}
            >
              Solo Libres
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('occupied')}
              className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                statusFilter === 'occupied' 
                  ? 'bg-amber-500 text-slate-950 shadow-sm border border-amber-400' 
                  : 'text-slate-800 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-950/40'
              }`}
            >
              Solo Ocupados
            </button>
          </div>
        </div>
      </div>

      {/* Render Zones */}
      {zones.map((zoneType) => {
        if (selectedZone !== 'all' && selectedZone !== zoneType) return null;

        const zoneSpots = filteredSpots.filter(s => s.type === zoneType);
        if (zoneSpots.length === 0) return null;

        return (
          <div key={zoneType} className="bg-[var(--bg-surface-2)] rounded-2xl border border-[var(--border-subtle)] p-5 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-900 text-white dark:bg-slate-800 dark:text-amber-400 border border-[var(--border-subtle)]">
                  {getVehicleIcon(zoneType, 'w-5 h-5')}
                </div>
                <div>
                  <h3 className="font-black text-base text-[var(--text-primary)]">{getZoneTitle(zoneType)}</h3>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">
                    Tarifa: <span className="font-bold text-[var(--text-primary)]">{formatCurrency(getVehicleRate(zoneType, rates, vehicleCategories).hourRate, rates.currencySymbol)}/hora</span>
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-[var(--text-primary)] bg-[var(--bg-surface-3)] px-3 py-1 rounded-xl border border-[var(--border-subtle)]">
                {zoneSpots.filter(s => s.status === 'occupied').length} de {zoneSpots.length} ocupados
              </span>
            </div>

            {/* Grid of Spots */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {zoneSpots.map((spot) => {
                const activeTicket = activeTickets.find(t => t.spotCode === spot.code);
                const nowIso = new Date().toISOString();
                const calc = activeTicket 
                  ? calculateParkingFee(activeTicket.entryTime, nowIso, activeTicket.vehicleType, rates, vehicleCategories)
                  : null;

                if (spot.status === 'available') {
                  return (
                    <div
                      key={spot.id}
                      onClick={() => onSelectSpotForEntry(spot.code, spot.type)}
                      className="group relative bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border-2 border-dashed border-emerald-400 dark:border-emerald-600 rounded-xl p-3.5 flex flex-col justify-between min-h-[125px] cursor-pointer transition-all hover:scale-[1.02] shadow-xs"
                      title="Hacer clic para ingresar vehículo en esta plaza"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-[var(--text-primary)] bg-[var(--bg-surface-2)] px-2 py-0.5 rounded-md shadow-xs border border-emerald-300 dark:border-emerald-700">
                          {spot.code}
                        </span>
                        <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-800"></span>
                      </div>

                      <div className="text-center py-2 flex flex-col items-center">
                        <Plus className="w-6 h-6 text-emerald-700 dark:text-emerald-400 group-hover:scale-125 transition-transform" />
                        <span className="text-xs font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-wider mt-1">
                          DISPONIBLE
                        </span>
                      </div>

                      <div className="text-[11px] text-center text-emerald-700 dark:text-emerald-300 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        Asignar plaza
                      </div>
                    </div>
                  );
                }

                if (spot.status === 'occupied' && activeTicket) {
                  return (
                    <div
                      key={spot.id}
                      onClick={() => onSelectSpotForExit(activeTicket.plate)}
                      className="group relative bg-[var(--bg-surface-3)] text-[var(--text-primary)] border-2 border-amber-500 rounded-xl p-3.5 flex flex-col justify-between min-h-[125px] cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02] ring-1 ring-amber-400/50"
                      title="Hacer clic para liquidar salida"
                    >
                      {/* Top Code & Status */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-xs bg-[var(--bg-surface-2)] text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                          {spot.code}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-800 dark:text-emerald-300 font-black">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          {calc?.formattedDuration}
                        </span>
                      </div>

                      {/* Plate Badge */}
                      <div className="my-1.5 text-center">
                        <div className="bg-amber-400 text-slate-950 font-black font-mono text-sm px-2.5 py-1 rounded-md tracking-wider shadow-md inline-block">
                          {activeTicket.plate}
                        </div>
                      </div>

                      {/* Bottom Info: Fee & Exit Trigger */}
                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200 dark:border-slate-800">
                        <span className="font-mono text-amber-800 dark:text-amber-300 font-black">
                          {calc ? formatCurrency(calc.totalAmount, rates.currencySymbol) : ''}
                        </span>
                        <span className="text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors font-black shadow-xs">
                          <LogOut className="w-3 h-3" />
                          Cobrar
                        </span>
                      </div>
                    </div>
                  );
                }

                if (spot.status === 'occupied' && !activeTicket) {
                  return (
                    <div
                      key={spot.id}
                      className="bg-amber-50/70 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 rounded-xl p-3.5 flex flex-col justify-between min-h-[125px] transition-colors shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700">
                          {spot.code}
                        </span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                      </div>
                      <div className="text-center py-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto" />
                        <span className="text-[10px] font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider block mt-1">
                          OCUPADA (Sin ticket)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleSpotStatus(spot.id, 'available')}
                        className="text-[11px] font-black text-amber-800 dark:text-amber-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-center underline cursor-pointer"
                        title="Liberar plaza y cambiar estado a disponible"
                      >
                        Liberar plaza
                      </button>
                    </div>
                  );
                }

                // Reserved or Maintenance
                return (
                  <div
                    key={spot.id}
                    className="bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between min-h-[125px] opacity-90 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700">
                        {spot.code}
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    </div>
                    <div className="text-center py-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto" />
                      <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider block mt-1">
                        {spot.status === 'reserved' ? 'RESERVADO' : 'MANTENIMIENTO'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleSpotStatus(spot.id, 'available')}
                      className="text-[11px] font-black text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-700 dark:text-emerald-400 text-center underline cursor-pointer"
                    >
                      Habilitar plaza
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

