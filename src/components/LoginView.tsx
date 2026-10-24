import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User, 
  Crown, 
  ShieldCheck, 
  Briefcase, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle,
  Clock,
  Server,
  Wifi,
  Printer,
  Sparkles,
  Building,
  KeyRound,
  Globe,
  Delete,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemUser, BranchLocation } from '../types';
import { playSound } from '../utils/audio';

interface LoginViewProps {
  users: SystemUser[];
  onLogin?: (user: SystemUser) => void;
  onLoginSuccess?: (user: SystemUser) => void;
  onQuickLogin?: (user: SystemUser) => void;
  businessName?: string;
  currentBranch?: BranchLocation;
}

export const LoginView: React.FC<LoginViewProps> = ({
  users,
  onLogin,
  onLoginSuccess,
  businessName = 'CONTROL DE PARQUEADERO POS',
  currentBranch,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginMode, setLoginMode] = useState<'standard' | 'operator_pin'>('operator_pin');
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Reloj digital en vivo para terminal de taquilla
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Seleccionar automáticamente el primer usuario activo al abrir
  useEffect(() => {
    if (users.length > 0 && !selectedOperatorId) {
      const activeUser = users.find(u => u.isActive !== false) || users[0];
      setSelectedOperatorId(activeUser.id);
    }
  }, [users, selectedOperatorId]);

  const performLogin = (userToLogin: SystemUser) => {
    playSound('success', true);
    if (onLogin) {
      onLogin(userToLogin);
    } else if (onLoginSuccess) {
      onLoginSuccess(userToLogin);
    }
  };

  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanUser = loginMode === 'operator_pin' 
      ? (users.find(u => u.id === selectedOperatorId)?.username || '').trim().toLowerCase()
      : username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setError('Por favor selecciona tu operador o ingresa tu usuario.');
      playSound('alert', true);
      return;
    }

    if (!cleanPass) {
      setError(loginMode === 'operator_pin' ? 'Por favor digita tu PIN de acceso.' : 'Por favor ingresa tu contraseña.');
      playSound('alert', true);
      return;
    }

    setIsLoggingIn(true);

    try {
      // 1. Intentar autenticación directa en backend contra PostgreSQL
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass })
      });
      const data = await res.json();

      if (data.success && data.user) {
        performLogin(data.user);
        return;
      }

      if (res.status === 401 || res.status === 403) {
        setError(data.error || 'Credenciales inválidas. Verifica tu contraseña o PIN.');
        playSound('alert', true);
        setIsLoggingIn(false);
        return;
      }
    } catch {
      // Fallback a contingencia local si la red está inaccesible
    }

    // Fallback local con lista de usuarios en memoria
    const foundUser = users.find(u => {
      const uName = u.username.toLowerCase();
      if (uName === cleanUser) return true;
      if (cleanUser === 'cajero' && uName === 'caja') return true;
      if (cleanUser === 'caja' && uName === 'cajero') return true;
      return false;
    });

    if (!foundUser) {
      setError('El usuario ingresado no existe en el sistema.');
      playSound('alert', true);
      setIsLoggingIn(false);
      return;
    }

    if (foundUser.isActive === false) {
      setError('Este usuario se encuentra desactivado. Consulta con el Administrador Maestro.');
      playSound('alert', true);
      setIsLoggingIn(false);
      return;
    }

    const isPasswordMatch = foundUser.password === cleanPass;

    if (!isPasswordMatch) {
      setError('Contraseña o PIN incorrecto. Verifica e intenta nuevamente.');
      playSound('alert', true);
      setIsLoggingIn(false);
      return;
    }

    performLogin(foundUser);
  };

  // Teclado numérico táctil (POS Numpad)
  const handleNumpadPress = (digit: string) => {
    playSound('beep', true);
    setError(null);
    if (password.length < 12) {
      setPassword(prev => prev + digit);
    }
  };

  const handleNumpadBackspace = () => {
    playSound('beep', true);
    setError(null);
    setPassword(prev => prev.slice(0, -1));
  };

  const handleNumpadClear = () => {
    playSound('beep', true);
    setError(null);
    setPassword('');
  };

  const selectedOperator = users.find(u => u.id === selectedOperatorId);

  return (
    <div className="min-h-screen w-full bg-[#0a0d14] text-slate-100 flex items-center justify-center p-3 sm:p-6 lg:p-10 relative overflow-hidden select-none">
      {/* Fondo High-Tech con iluminación ambiental y rejilla táctica */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-amber-500/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Contenedor Principal Adaptable */}
      <div className="w-full max-w-6xl relative z-10 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* ========================================================================= */}
          {/* PANEL IZQUIERDO: SHOWCASE OPERATIVO, RELOJ Y ESTADO DEL SISTEMA          */}
          {/* ========================================================================= */}
          <motion.div 
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden"
          >
            {/* Acento superior de luz */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500 opacity-80" />

            {/* Encabezado y Marca */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>SISTEMA EN LÍNEA 24/7</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800">
                  {currentBranch ? currentBranch.name : 'Matriz Principal'}
                </div>
              </div>

              {/* Logo y Título Principal */}
              <div className="flex items-center gap-4 mb-5">
                <div className="relative group shrink-0">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-800 to-slate-900 border border-amber-500/40 p-1 flex items-center justify-center shadow-lg shadow-amber-500/10">
                    <img
                      src="/assets/wolf_logo_login_1790375008175.jpg"
                      alt="WolfZone Logo"
                      className="w-full h-full object-contain rounded-xl"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="hidden items-center justify-center w-full h-full text-amber-500 font-black font-mono text-xl">
                      POS
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-black tracking-widest text-amber-500 uppercase block">
                    Enterprise Parking Platform
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight truncate">
                    {businessName}
                  </h1>
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Control de Acceso & Facturación POS</span>
                  </span>
                </div>
              </div>

              {/* Reloj Digital de Alta Precisión */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 mb-6 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>HORA OFICIAL DE TAQUILLA</span>
                  </span>
                  <span className="text-[10px] font-bold text-amber-400 uppercase">GMT-5 Colombia</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-white">
                  {currentTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </div>
                <div className="text-xs text-slate-400 font-medium capitalize mt-0.5">
                  {currentTime.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              {/* Chips de Telemetría Operativa */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Diagnóstico del Sistema</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <Server className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-200 block truncate text-[11px]">Motor PostgreSQL</span>
                      <span className="text-[10px] text-emerald-400 font-mono block">En Línea • 0ms</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                      <Wifi className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-200 block truncate text-[11px]">Modo Operativo</span>
                      <span className="text-[10px] text-cyan-400 font-mono block">Offline-First Seguro</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-200 block truncate text-[11px]">Impresión Térmica</span>
                      <span className="text-[10px] text-slate-400 font-mono block">Tickets 58mm / 80mm</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-200 block truncate text-[11px]">Trazabilidad DIAN</span>
                      <span className="text-[10px] text-indigo-400 font-mono block">Cierres Z Auditables</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie del Panel Izquierdo */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Puerto Local 3000</span>
              </span>
              <span className="text-amber-500 font-bold font-mono">WolfZone v4.2 PRO</span>
            </div>
          </motion.div>

          {/* ========================================================================= */}
          {/* PANEL DERECHO: ESTACIÓN DE AUTENTICACIÓN TÁCTIL (LOGIN & NUMPAD)          */}
          {/* ========================================================================= */}
          <motion.div 
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800/90 backdrop-blur-2xl shadow-2xl relative overflow-hidden"
          >
            {/* Acento superior de luz */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

            <div>
              {/* Encabezado del Formulario */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2 tracking-tight">
                    <KeyRound className="w-5 h-5 text-amber-500" />
                    <span>Autenticación de Terminal</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Ingresa tus credenciales para habilitar la taquilla
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('operator_pin');
                      setError(null);
                      playSound('beep', true);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                      loginMode === 'operator_pin'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Cajero (PIN)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('standard');
                      setError(null);
                      playSound('beep', true);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                      loginMode === 'standard'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Usuario & Clave</span>
                  </button>
                </div>
              </div>

              {/* Mensajes de Alerta / Error */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 overflow-hidden shadow-xs"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="font-semibold">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* MODO 1: CAJERO RÁPIDO CON PIN Y TECLADO TÁCTIL */}
              {loginMode === 'operator_pin' ? (
                <div className="space-y-4">
                  {/* Selector visual de cajeros */}
                  <div>
                    <label className="block text-[11px] font-bold font-mono uppercase tracking-wider text-slate-400 mb-2">
                      1. Selecciona tu Perfil de Operador:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {users.map(u => {
                        const isSelected = u.id === selectedOperatorId;
                        const isDisabled = u.isActive === false;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            disabled={isDisabled || isLoggingIn}
                            onClick={() => {
                              setSelectedOperatorId(u.id);
                              setPassword('');
                              setError(null);
                              playSound('beep', true);
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer relative overflow-hidden ${
                              isDisabled
                                ? 'opacity-30 border-slate-800 bg-slate-950/40 cursor-not-allowed'
                                : isSelected
                                ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-400/40'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {u.role === 'master' ? (
                                <Crown className="w-4 h-4" />
                              ) : u.role === 'supervisor' ? (
                                <ShieldCheck className="w-4 h-4" />
                              ) : (
                                <Briefcase className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-black truncate block leading-tight">{u.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono block uppercase">
                                {u.role}
                              </span>
                            </div>
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Campo de PIN y Teclado Táctil */}
                  <div>
                    <label className="block text-[11px] font-bold font-mono uppercase tracking-wider text-slate-400 mb-2">
                      2. Digita tu PIN de Acceso ({selectedOperator?.name || 'Operador'}):
                    </label>

                    {/* Display del PIN */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="relative flex-1">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleFormSubmit();
                          }}
                          placeholder="Digita tu PIN con el teclado o pantalla táctil"
                          autoFocus
                          disabled={isLoggingIn}
                          className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-3 text-base text-center font-mono font-black tracking-widest text-amber-400 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                          tabIndex={-1}
                          title={showPassword ? 'Ocultar PIN' : 'Ver PIN'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleNumpadClear}
                        className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold transition cursor-pointer"
                        title="Limpiar campo"
                      >
                        C
                      </button>
                    </div>

                    {/* Teclado Táctil Numérico (POS Touch Numpad) */}
                    <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleNumpadPress(num)}
                          disabled={isLoggingIn}
                          className="pk-pos-key h-11 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white font-mono font-bold text-lg flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleNumpadBackspace}
                        disabled={isLoggingIn}
                        className="pk-pos-key h-11 rounded-xl bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-700 text-slate-400 hover:text-rose-300 flex items-center justify-center transition active:scale-95 cursor-pointer"
                        title="Borrar dígito"
                      >
                        <Delete className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNumpadPress('0')}
                        disabled={isLoggingIn}
                        className="pk-pos-key h-11 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white font-mono font-bold text-lg flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormSubmit()}
                        disabled={isLoggingIn || !password}
                        className="pk-pos-key h-11 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-sm flex items-center justify-center transition active:scale-95 cursor-pointer shadow-md shadow-amber-500/20"
                        title="Ingresar"
                      >
                        <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* MODO 2: USUARIO Y CONTRASEÑA ESTÁNDAR */
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                      Nombre de Usuario
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-500 transition-colors">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="ej. admin, supervisor, caja"
                        disabled={isLoggingIn}
                        autoFocus
                        required
                        className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                      Contraseña / Clave Maestra
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-500 transition-colors">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={isLoggingIn}
                        required
                        className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                        aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Botón Principal para Modo Estándar */}
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="pk-pos-key w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                  >
                    {isLoggingIn ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Validando credenciales...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4.5 h-4.5 stroke-[2.5]" />
                        <span>Ingresar a la Terminal POS</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Botón Principal para Modo PIN */}
              {loginMode === 'operator_pin' && (
                <button
                  type="button"
                  onClick={() => handleFormSubmit()}
                  disabled={isLoggingIn || !password}
                  className="pk-pos-key w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer mt-4"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Iniciando sesión...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4.5 h-4.5 stroke-[2.5]" />
                      <span>Ingresar con {selectedOperator?.name || 'Operador'}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Pie de Seguridad y Trazabilidad */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Acceso Auditado y Cifrado</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Presiona <kbd className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-bold">Enter ↵</kbd>
              </span>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};
