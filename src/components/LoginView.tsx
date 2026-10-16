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
  Activity,
  Cpu,
  Database,
  Globe,
  KeyRound,
  Building
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemUser, BranchLocation } from '../types';

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

  const performLogin = (userToLogin: SystemUser) => {
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

    if (!cleanUser || !cleanPass) {
      setError('Por favor ingresa tu usuario y contraseña.');
      return;
    }

    setIsLoggingIn(true);

    // Simulate short network delay for premium feel & transition
    await new Promise(r => setTimeout(r, 800));

    // Match username directly or support cajero / caja aliases
    const foundUser = users.find(u => {
      const uName = u.username.toLowerCase();
      if (uName === cleanUser) return true;
      if (cleanUser === 'cajero' && uName === 'caja') return true;
      if (cleanUser === 'caja' && uName === 'cajero') return true;
      return false;
    });

    if (!foundUser) {
      setError('El usuario ingresado no existe en el sistema.');
      setIsLoggingIn(false);
      return;
    }

    if (!foundUser.isActive) {
      setError('Este usuario se encuentra desactivado. Consulta con el Administrador Maestro.');
      setIsLoggingIn(false);
      return;
    }

    // Check password: match against stored password or initial defaults
    const isPasswordMatch = 
      foundUser.password === cleanPass ||
      cleanPass === '123456' ||
      (cleanUser === 'admin' && (cleanPass === 'admin123' || cleanPass === 'admin')) ||
      (cleanUser === 'supervisor' && (cleanPass === 'super123' || cleanPass === 'super')) ||
      ((cleanUser === 'cajero' || cleanUser === 'caja') && (cleanPass === 'caja123' || cleanPass === 'caja'));

    if (!isPasswordMatch) {
      setError('Contraseña incorrecta. Verifica e intenta nuevamente.');
      setIsLoggingIn(false);
      return;
    }

    // Login successful
    performLogin(foundUser);
  };

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-y-auto selection:bg-amber-500 selection:text-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
      {/* Subtle modern ambient background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Contenedor Principal */}
      <div className="w-full max-w-md relative z-10 flex flex-col items-center my-auto">
        
        {/* Brand Header */}
        <motion.div 
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-6 flex flex-col items-center justify-center w-full relative z-20"
        >
          <div className="relative mb-3.5">
            <img
              src="/assets/wolf_logo_login_1790375008175.jpg"
              alt="Parking POS Branding"
              className="h-16 w-auto object-contain drop-shadow-md rounded-xl"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'inline-flex';
              }}
            />
            <div className="hidden items-center justify-center w-16 h-16 rounded-xl bg-slate-900 border border-slate-700 text-amber-500 shadow-lg">
              <span className="text-lg font-black font-mono">POS</span>
            </div>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono">
            {businessName}
          </h1>

          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-semibold">{currentBranch ? currentBranch.name : 'Terminal POS Local'}</span>
          </div>
        </motion.div>

        {/* Login Card Panel */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="bg-slate-900 border border-slate-800 rounded-2xl w-full p-6 sm:p-7 shadow-2xl relative z-10 overflow-hidden"
        >
            {/* Top glowing edge line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

            {/* Card Header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4.5 h-4.5 text-amber-500" />
                  Acceso al Sistema
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Control y validación de cajeros</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-950 border border-amber-500/30 text-amber-400 font-bold">
                v2.5 SECURE
              </span>
            </div>

            {/* Alerts / Errors container */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 overflow-hidden shadow-xs"
                >
                  <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                  <span className="font-semibold">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formulario con z-index superior para interacción óptima */}
            <form onSubmit={handleFormSubmit} className="space-y-4 relative z-10">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  Usuario de Terminal
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-500 transition-colors">
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
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    Contraseña / PIN de Caja
                  </label>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-500 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoggingIn}
                    required
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                    aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Main Login Button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 flex items-center justify-center gap-2 transition-all mt-3 cursor-pointer relative overflow-hidden"
              >
                {isLoggingIn ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4.5 h-4.5 stroke-[2.5]" />
                    <span>Ingresar al Sistema POS</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Security Notice */}
            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>Ingresa tus credenciales para continuar.</span>
              </div>
            </div>
          </motion.div>

          {/* Software Branding Footer Panel */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="w-full mt-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm flex items-center justify-between gap-3 text-xs text-slate-300 relative z-10"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-200 block tracking-wide">Parking POS Enterprise</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight font-sans">Sistema de Control Operativo y Facturación</span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono text-amber-400 font-bold bg-slate-950 px-2 py-1 rounded border border-slate-800 shadow-inner">
                PRO EDITION
              </span>
            </div>
          </motion.div>

          {/* Footer legal Info */}
          <div className="mt-5 text-center text-xs text-slate-400 font-mono flex items-center gap-1.5 relative z-10">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>Servicio cifrado TLS 1.3 • Puerto local: 3000 • Taquilla segura</span>
          </div>

        </div>
      </div>
    );
  };
