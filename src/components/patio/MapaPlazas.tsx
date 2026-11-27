/**
 * Mapa de plazas — vista nueva (modo claro y oscuro).
 *
 * Mismas acciones que el mapa clásico (ParkingMap): plaza libre → entrada, plaza ocupada → cobro,
 * habilitar/liberar plaza y abrir la gestión de plazas. Diferencias: las plazas son botones reales
 * (teclado y lector de pantalla), "Liberar"/"Habilitar" solo aparecen con permiso, y al tocar una
 * plaza libre la vista nueva del patio la deja preseleccionada.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, Grid, LogOut, Plus, Wrench } from 'lucide-react';
import type { ParkingSpot, ParkingTicket, RatesConfig, SystemUser, VehicleCategoryConfig, VehicleType } from '../../types';
import { calculateParkingFee, formatCurrency, getVehicleRate } from '../../utils/billing';
import { renderVehicleIcon } from '../../utils/vehicleIcons';

export interface MapaPlazasProps {
  spots: ParkingSpot[];
  activeTickets: ParkingTicket[];
  rates: RatesConfig;
  vehicleCategories?: VehicleCategoryConfig[];
  currentUser?: SystemUser;
  onSelectSpotForEntry: (spotCode: string, vehicleType: VehicleType) => void;
  onSelectSpotForExit: (plate: string) => void;
  onToggleSpotStatus: (spotId: string, newStatus: 'available' | 'reserved' | 'maintenance') => void;
  onOpenSpotsManagement?: () => void;
  /** Efecto cristal (opcional, por usuario). */
  glass?: boolean;
}

const panel = 'wz-surface rounded-[22px] border border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_18px_40px_-28px_rgba(15,23,42,.35)] dark:border-white/[0.07] dark:bg-slate-900 dark:shadow-[0_18px_40px_-28px_rgba(0,0,0,.8)]';
const muted = 'text-slate-600 dark:text-slate-400';
const pill = 'inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30';
const pillOn = 'bg-slate-900 text-white dark:bg-white dark:text-slate-900';
const pillOff = 'wz-tile border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';

type StatusFilter = 'all' | 'available' | 'occupied';

export const MapaPlazas: React.FC<MapaPlazasProps> = ({
  spots, activeTickets, rates, vehicleCategories = [], currentUser,
  onSelectSpotForEntry, onSelectSpotForExit, onToggleSpotStatus, onOpenSpotsManagement, glass = false,
}) => {
  const reduceMotion = useReducedMotion();
  const [zone, setZone] = useState<VehicleType | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 15000); return () => clearInterval(t); }, []);

  const perms = currentUser?.permissions;
  const isMaster = currentUser?.role === 'master';
  const canChangeStatus = !currentUser || isMaster || !!perms?.canChangeSpotStatus || !!perms?.canManageSpots;
  const canForceRelease = !currentUser || isMaster || !!perms?.canForceReleaseSpot || !!perms?.canManageSpots;
  const canManage = !currentUser || isMaster || !!perms?.canManageSpots || !!perms?.canEditRates;
  const money = (n: number) => formatCurrency(n, rates.currencySymbol);

  const total = spots.length;
  const occupied = spots.filter(s => s.status === 'occupied').length;
  const available = spots.filter(s => s.status === 'available').length;
  const blocked = spots.filter(s => s.status === 'reserved' || s.status === 'maintenance').length;

  // Mismo orden de zonas que el mapa clásico
  const zones: VehicleType[] = useMemo(() => {
    const spotTypes = Array.from(new Set(spots.map(s => s.type)));
    const activeIds = vehicleCategories.filter(c => c.isActive !== false && c.enabled !== false).map(c => c.id);
    const combined = activeIds.length > 0 ? [...activeIds, ...spotTypes] : ['car', 'motorcycle', 'suv', 'bicycle', ...spotTypes];
    return Array.from(new Set(combined)) as VehicleType[];
  }, [spots, vehicleCategories]);

  const zoneName = (z: VehicleType) => vehicleCategories.find(c => c.id === z)?.name
    || ({ car: 'Automóviles', motorcycle: 'Motocicletas', suv: 'Camionetas y SUV', bicycle: 'Bicicletas' } as Record<string, string>)[z]
    || String(z).toUpperCase();

  // Mismos rótulos de zona que el mapa clásico
  const zoneTitle = (z: VehicleType) => {
    if (vehicleCategories.some(c => c.id === z)) return `Zona: ${zoneName(z)}`;
    const letter = ({ car: 'A', motorcycle: 'M', suv: 'S', bicycle: 'B' } as Record<string, string>)[z];
    return letter ? `Zona ${letter}: ${zoneName(z)}` : `Zona: ${zoneName(z)}`;
  };

  const ticketBySpot = useMemo(() => {
    const m = new Map<string, ParkingTicket>();
    activeTickets.forEach(t => m.set(t.spotCode, t));
    return m;
  }, [activeTickets]);

  const visible = (s: ParkingSpot) => (zone === 'all' || s.type === zone) && (status === 'all' || s.status === status);

  const bar = (n: number, color: string) => (
    <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"><div className={`h-1.5 rounded-full ${color} transition-[width] duration-700`} style={{ width: total ? `${(n / total) * 100}%` : '0%' }} /></div>
  );

  return (
    <div className={`wz-patio-root flex flex-col gap-5 ${glass ? 'wz-glass' : ''} bg-[radial-gradient(900px_500px_at_78%_-10%,#dbe6ff_0%,transparent_60%)] p-4 text-slate-900 dark:bg-[radial-gradient(900px_500px_at_78%_-10%,rgba(37,99,235,.16)_0%,transparent_60%)] dark:text-slate-100 md:p-6`}>

      <section aria-labelledby="mapa-titulo" className={`${panel} flex flex-col gap-5 p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="mapa-titulo" className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold">
              Mapa de plazas en tiempo real
              <span className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{total} plazas totales</span>
            </h2>
            <p className={`mt-1 text-sm ${muted}`}>Toque una plaza libre para registrar la entrada o una ocupada para cobrar.</p>
          </div>
          {onOpenSpotsManagement && canManage && (
            <button type="button" onClick={onOpenSpotsManagement} title="Administrar, crear, editar o eliminar plazas de parqueo"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-b from-slate-800 to-slate-950 px-4 text-sm font-semibold text-white shadow-[0_10px_20px_-12px_rgba(15,23,42,.8)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-500/40 dark:from-white dark:to-slate-200 dark:text-slate-900">
              <Grid className="h-4 w-4" /> Gestión de plazas
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <div className="text-[13px] font-medium text-emerald-900 dark:text-emerald-200">Libres</div>
            <div className="font-display text-[28px] font-bold leading-tight text-emerald-950 dark:text-emerald-50">{available} <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">de {total}</span></div>
            {bar(available, 'bg-emerald-600 dark:bg-emerald-400')}
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <div className="text-[13px] font-medium text-amber-900 dark:text-amber-200">Ocupadas</div>
            <div className="font-display text-[28px] font-bold leading-tight text-amber-950 dark:text-amber-50">{occupied}</div>
            {bar(occupied, 'bg-amber-500 dark:bg-amber-400')}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Reservadas o en mantenimiento</div>
            <div className="font-display text-[28px] font-bold leading-tight">{blocked}</div>
            {bar(blocked, 'bg-slate-500 dark:bg-slate-400')}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div role="radiogroup" aria-label="Zona" className="flex flex-wrap items-center gap-2">
            <button type="button" role="radio" aria-checked={zone === 'all'} onClick={() => setZone('all')} className={`${pill} ${zone === 'all' ? pillOn : pillOff}`}>Todas ({total})</button>
            {zones.map(z => {
              const n = spots.filter(s => s.type === z).length;
              if (n === 0) return null;
              return (
                <button key={z} type="button" role="radio" aria-checked={zone === z} onClick={() => setZone(z)} className={`${pill} ${zone === z ? pillOn : pillOff}`}>
                  {renderVehicleIcon(z, 'h-4 w-4', vehicleCategories)}{zoneName(z)} ({n})
                </button>
              );
            })}
          </div>
          <div role="radiogroup" aria-label="Estado" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
            {([['all', 'Todas'], ['available', 'Libres'], ['occupied', 'Ocupadas']] as const).map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={status === id} onClick={() => setStatus(id)}
                className={`min-h-[36px] rounded-lg px-3 text-sm font-semibold transition ${status === id ? pillOn : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}`}>{label}</button>
            ))}
          </div>
        </div>
      </section>

      {zones.map(z => {
        if (zone !== 'all' && zone !== z) return null;
        const zoneSpots = spots.filter(s => s.type === z && visible(s));
        if (zoneSpots.length === 0) return null;
        const zoneOccupied = spots.filter(s => s.type === z && s.status === 'occupied').length;
        const zoneTotal = spots.filter(s => s.type === z).length;
        return (
          <section key={z} aria-label={zoneTitle(z)} className={`${panel} flex flex-col gap-4 p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-[0_8px_16px_-8px_rgba(15,23,42,.7)] dark:from-slate-700 dark:to-slate-800">{renderVehicleIcon(z, 'h-5 w-5', vehicleCategories)}</span>
                <div>
                  <h3 className="font-display text-lg font-bold">{zoneTitle(z)}</h3>
                  <p className={`text-sm ${muted}`}>Tarifa {money(getVehicleRate(z, rates, vehicleCategories).hourRate)} / hora</p>
                </div>
              </div>
              <span className={`rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold dark:bg-slate-800 ${muted}`}>{zoneOccupied} de {zoneTotal} ocupadas</span>
            </div>

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {zoneSpots.map((spot, i) => {
                const ticket = ticketBySpot.get(spot.code);
                const anim = reduceMotion ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, delay: Math.min(i, 24) * 0.015 } };

                if (spot.status === 'available') {
                  return (
                    <motion.li key={spot.id} {...anim}>
                      <button type="button" onClick={() => onSelectSpotForEntry(spot.code, spot.type)} aria-label={`Plaza ${spot.code} libre. Registrar entrada`} title="Hacer clic para ingresar vehículo en esta plaza"
                        className="group flex min-h-[120px] w-full flex-col justify-between rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/70 p-3.5 text-left transition hover:-translate-y-0.5 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 dark:border-emerald-600 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20">
                        <span className="flex items-center justify-between"><span className="font-display text-base font-bold">{spot.code}</span><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>
                        <span className="flex flex-col items-center gap-1 text-emerald-800 dark:text-emerald-300"><Plus className="h-6 w-6 transition group-hover:scale-110" /><span className="text-sm font-semibold">Libre</span></span>
                        <span className="text-center text-xs font-medium text-emerald-800 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 dark:text-emerald-300">Registrar entrada</span>
                      </button>
                    </motion.li>
                  );
                }

                if (spot.status === 'occupied' && ticket) {
                  const calc = calculateParkingFee(ticket.entryTime, new Date().toISOString(), ticket.vehicleType, rates, vehicleCategories);
                  return (
                    <motion.li key={spot.id} {...anim}>
                      <button type="button" onClick={() => onSelectSpotForExit(ticket.plate)} aria-label={`Plaza ${spot.code} ocupada por ${ticket.plate}, ${calc.formattedDuration}, ${money(calc.totalAmount)}. Cobrar`} title="Hacer clic para liquidar salida"
                        className="flex min-h-[120px] w-full flex-col justify-between wz-tile rounded-2xl border border-amber-300 bg-white p-3.5 text-left shadow-[0_10px_22px_-16px_rgba(180,120,0,.7)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-16px_rgba(180,120,0,.8)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/40 dark:border-amber-500/40 dark:bg-slate-800">
                        <span className="flex items-center justify-between gap-2"><span className="font-display text-base font-bold">{spot.code}</span><span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${muted}`}><span aria-hidden className="h-2 w-2 rounded-full bg-emerald-500 motion-safe:animate-pulse" />{calc.formattedDuration}</span></span>
                        <span className="self-center rounded-md bg-[#f5c400] px-2.5 py-0.5 font-plate text-xl font-bold tracking-[0.08em] text-slate-900 shadow-[inset_0_-2px_0_rgba(0,0,0,.12)]">{ticket.plate}</span>
                        <span className="flex items-center justify-between border-t border-slate-200 pt-1.5 text-sm dark:border-slate-700">
                          <span className="font-bold">{money(calc.totalAmount)}</span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-xs font-bold text-slate-950"><LogOut className="h-3 w-3" />Cobrar</span>
                        </span>
                      </button>
                    </motion.li>
                  );
                }

                const isOrphan = spot.status === 'occupied';
                const allowed = isOrphan ? canForceRelease : canChangeStatus;
                return (
                  <motion.li key={spot.id} {...anim}>
                    <div className={`flex min-h-[120px] flex-col justify-between rounded-2xl border p-3.5 ${isOrphan ? 'border-amber-400 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10' : 'border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/70'}`}>
                      <span className="flex items-center justify-between"><span className="font-display text-base font-bold">{spot.code}</span>{isOrphan ? <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-full bg-amber-500 motion-safe:animate-pulse" /><AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" /></span> : <Wrench className={`h-4 w-4 ${muted}`} />}</span>
                      <span className="text-center text-sm font-semibold">{isOrphan ? 'Ocupada sin ticket' : spot.status === 'reserved' ? 'Reservada' : 'Mantenimiento'}</span>
                      {allowed ? (
                        <button type="button" onClick={() => onToggleSpotStatus(spot.id, 'available')}
                          title={isOrphan ? 'Liberar plaza y cambiar estado a disponible' : 'Habilitar plaza y cambiar estado a disponible'}
                          className="min-h-[36px] rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-700">
                          {isOrphan ? 'Liberar plaza' : 'Habilitar plaza'}
                        </button>
                      ) : <span className={`text-center text-xs ${muted}`}>Requiere permiso</span>}
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export default MapaPlazas;
