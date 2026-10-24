import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle,
  Building2,
  Server,
  Sparkles,
  ShieldCheck
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

  // Determinar si opera como Servidor Central o Sucursal
  const workMode = typeof window !== 'undefined' ? localStorage.getItem('pk_work_mode') : null;
  const isServer = workMode === 'server';
  const stationLabel = currentBranch?.name 
    ? `Sucursal: ${currentBranch.name}` 
    : (isServer ? 'Servidor Central (Matriz)' : 'Estación de Taquilla');

  const performLogin = (userToLogin: SystemUser) => {
    playSound('success', true);
    if (onLogin) {
      onLogin(userToLogin);
    } else if (onLoginSuccess) {
      onLoginSuccess(userToLogin);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setError('Por favor ingresa tu usuario.');
      playSound('alert', true);
      return;
    }

    if (!cleanPass) {
      setError('Por favor ingresa tu contraseña.');
      playSound('alert', true);
      return;
    }

    setIsLoggingIn(true);

    try {
      // 1. Intentar autenticación contra PostgreSQL en backend
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
        setError(data.error || 'Credenciales inválidas. Verifica tu usuario y contraseña.');
        playSound('alert', true);
        setIsLoggingIn(false);
        return;
      }
    } catch {
      // Fallback a contingencia local si el backend no responde
    }

    // 2. Fallback de contingencia local
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
      setError('Este usuario se encuentra desactivado.');
      playSound('alert', true);
      setIsLoggingIn(false);
      return;
    }

    const isPasswordMatch = foundUser.password === cleanPass;

    if (!isPasswordMatch) {
      setError('Contraseña incorrecta. Verifica e intenta nuevamente.');
      playSound('alert', true);
      setIsLoggingIn(false);
      return;
    }

    performLogin(foundUser);
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F17] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Fondo elegante con iluminación ambiental suave */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.12),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[400px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Tarjeta Central de Acceso */}
      <motion.div 
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[420px] bg-slate-900/80 border border-slate-800/90 rounded-3xl p-7 sm:p-9 backdrop-blur-2xl shadow-2xl relative z-10"
      >
        {/* Línea de acento luminoso superior */}
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

        {/* Encabezado: Logo y Nombre de Marca */}
        <div className="text-center mb-6 flex flex-col items-center">
          {/* Logo de la marca con animación sutil */}
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700/80 p-2 shadow-xl shadow-amber-500/10 flex items-center justify-center mb-3.5 cursor-pointer relative group"
          >
            <img
              src="/assets/wolf_logo_login_1790375008175.jpg"
              alt="Logo Parqueadero POS"
              className="w-full h-full object-contain rounded-xl drop-shadow-md"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="hidden items-center justify-center w-full h-full text-amber-500 font-black font-mono text-2xl">
              POS
            </div>
          </motion.div>

          {/* Título de la Aplicación */}
          <h1 className="text-lg font-black tracking-tight text-white uppercase font-sans">
            {businessName}
          </h1>

          {/* Indicador de Sucursal o Servidor Central */}
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800/90 text-xs font-mono text-slate-300 shadow-inner">
            {isServer ? (
              <Server className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            ) : (
              <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <span className="font-semibold text-slate-200">{stationLabel}</span>
          </div>
        </div>

        {/* Mensaje de Alerta / Error */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 overflow-hidden shadow-xs"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-semibold">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulario de Login Limpio */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Casilla de Usuario */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              Usuario
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-500 transition-colors">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                disabled={isLoggingIn}
                autoFocus
                required
                className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-amber-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono shadow-inner"
              />
            </div>
          </div>

          {/* Casilla de Contraseña */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              Contraseña
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
                className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-amber-500 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono shadow-inner"
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

          {/* Botón de Iniciar Sesión */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoggingIn}
            className="pk-pos-key w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 active:from-amber-600 active:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer mt-5"
          >
            {isLoggingIn ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4.5 h-4.5 stroke-[2.5]" />
                <span>Iniciar Sesión</span>
              </>
            )}
          </motion.button>
        </form>

        {/* Pie de Página Minimalista y Seguro */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <span className="text-[11px] font-mono text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500/70" />
            <span>Terminal POS Segura • Acceso Restringido</span>
          </span>
        </div>
      </motion.div>
    </div>
  );
};
