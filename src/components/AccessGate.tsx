import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  ArrowRight, 
  KeyRound, 
  Terminal, 
  CheckCircle2, 
  FolderLock,
  ExternalLink,
  ShieldCheck,
  Sliders,
  BarChart3,
  Radio,
  Car,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { ProtectedRouteConfig, DEFAULT_PROTECTED_ROUTES, saveAuthorizedRoute, logRouteAuditEvent } from '../types/routes';

interface AccessGateProps {
  onGrantAccess: (route?: ProtectedRouteConfig) => void;
  attemptedPath: string;
  protectedRoutes?: ProtectedRouteConfig[];
}

export const AccessGate: React.FC<AccessGateProps> = ({ 
  onGrantAccess, 
  attemptedPath,
  protectedRoutes = DEFAULT_PROTECTED_ROUTES 
}) => {
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<ProtectedRouteConfig>(
    () => protectedRoutes.find(r => r.isDefault) || protectedRoutes[0]
  );

  const getRouteIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Terminal': return Terminal;
      case 'Sliders': return Sliders;
      case 'BarChart3': return BarChart3;
      case 'Radio': return Radio;
      case 'Car': return Car;
      default: return FolderLock;
    }
  };

  const handleAuthorize = (targetPathOrCode: string) => {
    const clean = targetPathOrCode.trim().toLowerCase().replace(/^\/+/, '');
    
    // 1. Direct match with configured routes (with or without leading slash)
    const matchedRoute = protectedRoutes.find(
      r => r.path.toLowerCase().replace(/^\/+/, '') === clean
    );

    if (matchedRoute) {
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', matchedRoute.path);
        saveAuthorizedRoute(matchedRoute.path);
      }
      logRouteAuditEvent({
        eventType: 'ACCESS_GRANTED',
        eventLabel: 'Acceso Autorizado por Puerta de Entrada',
        path: matchedRoute.path,
        routeName: matchedRoute.name,
        userName: 'Usuario Taquilla',
        userRole: matchedRoute.requiredRole || 'cajero',
        details: `Acceso concedido a la ruta ${matchedRoute.path} (${matchedRoute.name}) mediante puerta de control.`,
        severity: 'success'
      });
      onGrantAccess(matchedRoute);
      return;
    }

    // No bypass allowed: only valid configured routes are accepted

    logRouteAuditEvent({
      eventType: 'ACCESS_DENIED',
      eventLabel: 'Intento de Acceso No Autorizado',
      path: `/${clean}`,
      routeName: 'Ruta No Registrada / Bloqueada',
      userName: 'Desconocido',
      userRole: 'invitado',
      details: `Intento de acceso denegado a la ruta o clave no válida: "${targetPathOrCode}".`,
      severity: 'security'
    });

    setErrorMsg(
      `Ruta o credencial desconocida. Selecciona una de las ${protectedRoutes.length} áreas protegidas configuradas abajo o digita la ruta deseada.`
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAuthorize(inputCode || selectedRoute.path);
  };

  const handleSelectAndEnter = (route: ProtectedRouteConfig) => {
    setSelectedRoute(route);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', route.path);
      saveAuthorizedRoute(route.path);
    }
    logRouteAuditEvent({
      eventType: 'ACCESS_GRANTED',
      eventLabel: 'Acceso Directo a Módulo',
      path: route.path,
      routeName: route.name,
      userName: 'Operador del Sistema',
      userRole: route.requiredRole || 'cajero',
      details: `Selección directa y apertura de módulo ${route.path} (${route.name}).`,
      severity: 'success'
    });
    onGrantAccess(route);
  };

  return (
    <div className="min-h-screen bg-[#070b14] bg-gradient-to-b from-[#070b14] via-[#0a0f1d] to-[#04060c] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-black relative dark">
      {/* Decorative ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.15),rgba(255,255,255,0))] pointer-events-none" />

      <div className="relative w-full max-w-xl bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/90 space-y-6">
        {/* Top Security Icon & Brand */}
        <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
          <img
            src="/assets/wolfzone_logo_farmanorte.jpg"
            alt="WolfZone POS Farmanorte"
            className="w-14 h-14 object-cover rounded-full border border-amber-500/40 p-0.5 shadow-md shadow-amber-500/20"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Control de Acceso Multi-Ruta POS
              </span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight mt-1">
              WolfZone POS - Áreas Protegidas
            </h1>
          </div>
        </div>

        {/* Warning Notice */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-300">
              Acceso a la raíz restringido (localhost:3000)
            </p>
            <p className="text-slate-300 leading-relaxed">
              Esta terminal cuenta con <strong className="text-white font-semibold">{protectedRoutes.length} áreas administrativas privadas</strong> configuradas. Selecciona tu área de trabajo o ingresa tu ruta autorizada.
            </p>
          </div>
        </div>

        {/* Path Diagnostic */}
        <div className="bg-slate-950 rounded-2xl p-3.5 border border-slate-800 text-xs font-mono space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span>Ruta intentada por el explorador:</span>
            <span className="text-rose-400 font-bold">{attemptedPath || '/'}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Ruta activa seleccionada:</span>
            <span className="text-emerald-400 font-bold">{selectedRoute.path}</span>
          </div>
        </div>

        {/* Quick Selection List of Configured Protected Routes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-300 text-[11px] font-mono">
              Áreas Administrativas y Privadas Disponibles ({protectedRoutes.length})
            </span>
            <span className="text-slate-400 text-[11px]">Clic para ingresar directamente</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {protectedRoutes.map((route) => {
              const IconComp = getRouteIcon(route.iconName);
              const isSelected = selectedRoute.path === route.path;

              return (
                <button
                  key={route.path}
                  type="button"
                  onClick={() => handleSelectAndEnter(route)}
                  className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer group ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/40 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${
                        isSelected ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors'
                      }`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-mono text-xs font-bold text-white block">
                          {route.path}
                        </span>
                        <span className="text-xs text-slate-300 line-clamp-1 font-medium">
                          {route.name}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                      isSelected ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`} />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-1 border-t border-slate-800/90 pt-2 text-[11px]">
                    <span className="text-slate-400 font-mono">Rol: <span className="text-slate-300">{route.requiredRole || 'cajero'}</span></span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold font-mono text-[10px] border ${
                      route.badgeColor || 'bg-slate-800 text-slate-200 border-slate-700'
                    }`}>
                      {route.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Manual Input or PIN Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-1.5 flex items-center justify-between">
              <span>Ingreso Manual por Ruta o Clave PIN</span>
              <span className="text-xs text-amber-400 font-mono font-semibold">PIN Rápido: 1234</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono text-sm">
                /
              </span>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value);
                  setErrorMsg('');
                }}
                placeholder={selectedRoute.path.replace(/^\//, '')}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>
            {errorMsg && (
              <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1 font-medium">
                {errorMsg}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <span>Ingresar a {inputCode ? `/${inputCode.replace(/^\//, '')}` : selectedRoute.path}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleSelectAndEnter(protectedRoutes[0])}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Abrir POS Directo</span>
            </button>
          </div>
        </form>

        {/* Operator Instructions */}
        <div className="border-t border-slate-800 pt-3 text-center">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Persistencia activa en sessionStorage. La autorización se mantiene mientras la pestaña esté abierta.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
