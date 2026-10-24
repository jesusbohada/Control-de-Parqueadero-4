import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle,
  Building2,
  Server,
  ShieldCheck,
  Video,
  Sparkles,
  SlidersHorizontal,
  Maximize2,
  Minimize2
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

// ============================================================================
// ESCENAS DE VIDEO REAL (MODO CÁMARAS AUXILIARES)
// ============================================================================
export interface VideoBackgroundOption {
  id: string;
  name: string;
  src: string;
  iconLabel: string;
  badge: string;
}

export const VIDEO_SCENES: VideoBackgroundOption[] = [
  {
    id: 'parking',
    name: 'Parqueadero Real',
    src: '/assets/parking_lot.mp4',
    iconLabel: '🅿️',
    badge: 'Vehículos en Parqueadero'
  },
  {
    id: 'traffic',
    name: 'Tráfico Urbano',
    src: '/assets/car-detection.mp4',
    iconLabel: '🚗',
    badge: 'Flujo Continuo Vía Rápida'
  },
  {
    id: 'night',
    name: 'Tránsito Nocturno',
    src: '/assets/night_traffic.mp4',
    iconLabel: '🌙',
    badge: 'Luces y Faros Nocturnos'
  },
  {
    id: 'cross',
    name: 'Avenida Principal',
    src: '/assets/street_cross.mp4',
    iconLabel: '🚦',
    badge: 'Cruce Metropolitano'
  }
];

interface RealTrafficBackgroundProps {
  currentScene: VideoBackgroundOption;
  blurLevel: number;
}

const RealTrafficBackground: React.FC<RealTrafficBackgroundProps> = ({
  currentScene,
  blurLevel
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.0;
      videoRef.current.play().catch(() => {});
    }
  }, [currentScene]);

  const blurPx = blurLevel === 0 ? 0 : blurLevel === 1 ? 0.8 : 1.5;
  const filterStyle = `blur(${blurPx}px) brightness(0.70) contrast(1.08) saturate(1.12)`;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#0B0F17]">
      <video
        ref={videoRef}
        key={currentScene.src}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        style={{
          filter: filterStyle,
          transform: 'scale(1.02)'
        }}
      >
        <source src={currentScene.src} type="video/mp4" />
      </video>

      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(11, 15, 23, 0.78) 0%, rgba(11, 15, 23, 0.42) 50%, rgba(11, 15, 23, 0.84) 100%)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17]/90 via-transparent to-[#0B0F17]/60 pointer-events-none" />
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: LOGIN WOLFZONE TOTALMENTE REESTRUCTURADO
// ============================================================================
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
  const [mascotWaved, setMascotWaved] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modo Visual: 'mascot' (Nuevo Arte Wolfzone Checkpoint) o 'video' (Cámaras Reales)
  const [loginMode, setLoginMode] = useState<'mascot' | 'video'>(() => {
    return (typeof window !== 'undefined' && (localStorage.getItem('pk_login_visual_mode') as 'mascot' | 'video')) || 'mascot';
  });

  // Gestión de Pantalla Completa del Navegador (F11 / POS Kiosk)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Gestión de Escenas de Video
  const [selectedSceneId, setSelectedSceneId] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('pk_login_video_scene')) || 'parking';
  });

  const [blurLevel, setBlurLevel] = useState<number>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pk_login_video_blur') : null;
    return saved !== null ? parseInt(saved, 10) : 1;
  });

  const currentScene = VIDEO_SCENES.find(s => s.id === selectedSceneId) || VIDEO_SCENES[0];

  const handleSelectScene = (id: string) => {
    setSelectedSceneId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pk_login_video_scene', id);
    }
  };

  const handleCycleBlur = () => {
    const nextBlur = (blurLevel + 1) % 3;
    setBlurLevel(nextBlur);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pk_login_video_blur', nextBlur.toString());
    }
  };

  const toggleVisualMode = (mode: 'mascot' | 'video') => {
    setLoginMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pk_login_visual_mode', mode);
    }
  };

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

  const handleMascotClick = () => {
    playSound('click', true);
    setMascotWaved(true);
    setTimeout(() => setMascotWaved(false), 1200);
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
      // Contingencia local si no hay conexión con el servidor
    }

    // 2. Contingencia local de emergencia
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
    <div className="fixed inset-0 w-screen h-screen overflow-hidden select-none bg-[#070b12] text-slate-100">
      
      {/* ==================================================================== */}
      {/* 1. MODO ARTE WOLFZONE CHECKPOINT (100% PANTALLA COMPLETA INTEGRADA) */}
      {/* ==================================================================== */}
      {loginMode === 'mascot' ? (
        <>
          {/* VISTA COMPLETA ESCRITORIO / POS / TABLETS (sm:block) */}
          <div className="absolute inset-0 w-full h-full overflow-hidden hidden sm:block">
            {/* Imagen de Arte 100% Pantalla Completa Borde a Borde */}
            <img 
              src="/assets/login_wolfzone_art.jpg" 
              alt="Sistema de Parqueadero Wolfzone Checkpoint" 
              className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none"
            />

            {/* Formulario Interactivo Sobrepuesto en las Coordenadas Milimétricas del Arte */}
            <form onSubmit={handleFormSubmit} className="contents">
              
              {/* Badge Identificador de Sede / Servidor */}
              <div 
                className="absolute flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/90 border border-cyan-400/60 text-xs md:text-sm font-mono text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)] backdrop-blur-xs z-10"
                style={{ 
                  left: '55.0%', 
                  top: '30.5%', 
                  maxWidth: '32%' 
                }}
              >
                {isServer ? (
                  <Server className="w-3.5 h-3.5 md:w-4 md:h-4 text-cyan-400 shrink-0" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400 shrink-0" />
                )}
                <span className="font-semibold truncate">{stationLabel}</span>
              </div>

              {/* Casilla 1: Usuario (Calce 100% Exacto en el Canal Neón de la Imagen) */}
              <div 
                className="absolute group z-10"
                style={{ 
                  left: '55.0%', 
                  top: '41.9%', 
                  width: '31.8%', 
                  height: '7.2%' 
                }}
              >
                <div className="absolute inset-y-0 left-0 pl-4 md:pl-5 flex items-center pointer-events-none text-cyan-400/80 group-focus-within:text-cyan-200 transition-colors">
                  <User className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario..."
                  disabled={isLoggingIn}
                  autoFocus
                  required
                  className="w-full h-full bg-transparent hover:bg-cyan-400/[0.04] focus:bg-[#071322]/80 rounded-full pl-11 md:pl-13 lg:pl-15 pr-4 text-cyan-100 placeholder-cyan-400/35 font-mono text-xs sm:text-sm md:text-base lg:text-lg font-bold tracking-wide outline-none border-0 ring-0 focus:ring-2 focus:ring-cyan-300/70 focus:shadow-[inset_0_0_15px_rgba(6,182,212,0.4)] transition-all caret-cyan-300"
                />
              </div>

              {/* Casilla 2: Contraseña (Alineada al ángulo de 2.4° de la línea del arte) */}
              <div 
                className="absolute group z-10"
                style={{ 
                  left: '55.0%', 
                  top: '55.8%', 
                  width: '31.8%', 
                  height: '7.2%',
                  transform: 'rotate(2.4deg)',
                  transformOrigin: 'left center'
                }}
              >
                <div className="absolute inset-y-0 left-0 pl-4 md:pl-5 flex items-center pointer-events-none text-cyan-400/80 group-focus-within:text-cyan-200 transition-colors">
                  <Lock className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoggingIn}
                  required
                  className="w-full h-full bg-transparent hover:bg-cyan-400/[0.04] focus:bg-[#071322]/80 rounded-full pl-11 md:pl-13 lg:pl-15 pr-12 md:pr-14 text-cyan-100 placeholder-cyan-400/35 font-mono text-xs sm:text-sm md:text-base lg:text-lg font-bold tracking-wide outline-none border-0 ring-0 focus:ring-2 focus:ring-cyan-300/70 focus:shadow-[inset_0_0_15px_rgba(6,182,212,0.4)] transition-all caret-cyan-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-4 md:pr-5 flex items-center text-cyan-400/70 hover:text-cyan-200 transition-colors cursor-pointer"
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
              </div>

              {/* Botón: Iniciar Sesión (Calibrado a 3.9° sobre la cápsula de la imagen) */}
              <div 
                className="absolute z-10"
                style={{ 
                  left: '62.3%', 
                  top: '69.5%', 
                  width: '20.0%', 
                  height: '7.6%',
                  transform: 'rotate(3.9deg)',
                  transformOrigin: 'center center'
                }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full h-full rounded-full bg-gradient-to-r from-cyan-400/95 via-teal-300 to-cyan-400/95 hover:from-cyan-300 hover:to-teal-200 active:from-cyan-500 active:to-teal-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm md:text-base lg:text-lg tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.9)] hover:shadow-[0_0_35px_rgba(34,211,238,1)] border border-cyan-100/90 transition-all cursor-pointer"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span className="hidden sm:inline">Accediendo...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 md:w-5 md:h-5 stroke-[3]" />
                      <span>Iniciar Sesión</span>
                    </>
                  )}
                </motion.button>
              </div>

              {/* Alerta de Error Reactiva Flotante */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    className="absolute z-20 p-2.5 rounded-xl bg-rose-950/95 border border-rose-500/80 text-rose-200 text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_18px_rgba(244,63,94,0.7)] backdrop-blur-md"
                    style={{ 
                      left: '55.0%', 
                      top: '78.5%', 
                      width: '31.8%',
                      transform: 'rotate(3.5deg)',
                      transformOrigin: 'left center'
                    }}
                  >
                    <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-rose-400 shrink-0" />
                    <span className="truncate font-semibold">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Interacción Amigable con la Mascota Wolfzone (Saluda al hacer clic) */}
            <motion.div
              onClick={handleMascotClick}
              whileHover={{ scale: 1.01 }}
              animate={mascotWaved ? { rotate: [0, -3, 3, -2, 0] } : {}}
              transition={{ duration: 0.5 }}
              title="¡Operador Wolfzone en guardia! Haz clic para saludar."
              className="absolute z-10 cursor-pointer group"
              style={{ left: '5%', top: '20%', width: '40%', height: '75%' }}
            >
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-16 left-12 bg-slate-950/90 border border-cyan-500/60 rounded-xl px-3.5 py-2 text-xs font-mono text-cyan-300 shadow-xl pointer-events-none flex items-center gap-2 backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                <span>¡Bienvenido a Wolfzone Checkpoint! 🐺</span>
              </div>
            </motion.div>
          </div>

          {/* VISTA MÓVIL EN PANTALLAS VERTICALES (sm:hidden) */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center p-4 sm:hidden">
            <img 
              src="/assets/login_wolfzone_art.jpg" 
              alt="Fondo Móvil"
              className="absolute inset-0 w-full h-full object-cover filter blur-xs brightness-50"
            />
            <div className="w-full max-w-sm relative z-10 bg-slate-950/90 border border-cyan-500/40 rounded-3xl p-6 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.35)]">
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] mb-3 bg-slate-900">
                  <img 
                    src="/assets/login_wolfzone_art.jpg" 
                    alt="Mascota Wolfzone"
                    className="w-full h-full object-cover object-left-top scale-175 translate-x-3 translate-y-4"
                  />
                </div>
                <h1 className="text-base font-black uppercase text-cyan-200 tracking-wider">
                  Wolfzone Checkpoint
                </h1>
                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-slate-900 border border-cyan-500/40 text-[11px] font-mono text-cyan-300">
                  {isServer ? <Server className="w-3.5 h-3.5 text-cyan-400" /> : <Building2 className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{stationLabel}</span>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="font-semibold">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-cyan-300 uppercase tracking-wider mb-1 font-mono">
                    Usuario
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-cyan-400/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ingresa tu usuario"
                      disabled={isLoggingIn}
                      className="w-full bg-slate-900 border border-cyan-500/40 focus:border-cyan-300 rounded-xl pl-10 pr-3 py-3 text-sm text-cyan-100 placeholder-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-cyan-300 uppercase tracking-wider mb-1 font-mono">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-cyan-400/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isLoggingIn}
                      className="w-full bg-slate-900 border border-cyan-500/40 focus:border-cyan-300 rounded-xl pl-10 pr-10 py-3 text-sm text-cyan-100 placeholder-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-400/70"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.6)] flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Iniciando...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 stroke-[3]" />
                      <span>Iniciar Sesión</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </>
      ) : (
        /* ==================================================================== */
        /* 2. MODO CÁMARAS DE TRÁFICO REAL */
        /* ==================================================================== */
        <>
          <RealTrafficBackground currentScene={currentScene} blurLevel={blurLevel} />

          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-[420px] bg-slate-900/85 border border-slate-800/90 rounded-3xl p-7 sm:p-9 backdrop-blur-2xl shadow-2xl relative z-10 m-auto"
          >
            <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent" />

            <div className="text-center mb-6 flex flex-col items-center">
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-cyan-500/40 p-2 shadow-xl shadow-cyan-500/10 flex items-center justify-center mb-3.5 cursor-pointer relative group"
              >
                <img
                  src="/assets/wolf_logo_login_1790375008175.jpg"
                  alt="Logo Parqueadero POS"
                  className="w-full h-full object-contain rounded-xl drop-shadow-md"
                />
              </motion.div>

              <h1 className="text-lg font-black tracking-tight text-white uppercase font-sans">
                {businessName}
              </h1>

              <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-slate-950/90 border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
                {isServer ? (
                  <Server className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span className="font-semibold text-slate-200">{stationLabel}</span>
              </div>
            </div>

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

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Usuario
                </label>
                <div className="relative group">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingresa tu usuario"
                    disabled={isLoggingIn}
                    autoFocus
                    required
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-mono shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Contraseña
                </label>
                <div className="relative group">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoggingIn}
                    required
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-cyan-400 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-mono shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500 hover:from-cyan-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer mt-5"
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

            <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
              <span className="text-[11px] font-mono text-slate-500 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400/70" />
                <span>Terminal POS Segura • Acceso Restringido</span>
              </span>
            </div>
          </motion.div>
        </>
      )}

      {/* ==================================================================== */}
      {/* BARRA INFERIOR DE ACCIONES (INTERACTIVA Y ELEGANTE) */}
      {/* ==================================================================== */}
      <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-center justify-between gap-2 z-20 pointer-events-auto">
        {/* Selector de Modo: Cabina Wolfzone vs Cámaras Reales */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-950/85 border border-cyan-500/30 backdrop-blur-md shadow-lg text-[11px] font-mono text-slate-300">
          <button
            type="button"
            onClick={() => toggleVisualMode('mascot')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              loginMode === 'mascot'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>🐺</span>
            <span>Wolfzone Checkpoint</span>
          </button>
          <button
            type="button"
            onClick={() => toggleVisualMode('video')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              loginMode === 'video'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Cámaras Reales</span>
          </button>
        </div>

        {/* Controles Específicos cuando el modo Video está Activo */}
        {loginMode === 'video' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-full bg-slate-950/80 border border-slate-800/80 backdrop-blur-md shadow-lg text-[11px] font-mono text-slate-300">
              {VIDEO_SCENES.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => handleSelectScene(scene.id)}
                  title={scene.badge}
                  className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                    scene.id === selectedSceneId
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{scene.iconLabel}</span>
                  <span className="hidden md:inline ml-1">{scene.name}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCycleBlur}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-800/80 text-slate-300 hover:text-white text-[11px] font-mono backdrop-blur-md shadow-lg cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>{blurLevel === 0 ? '0px' : blurLevel === 1 ? '0.8px' : '1.5px'}</span>
            </button>
          </div>
        )}

        {/* Acciones de Pantalla Completa y Terminal Segura */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullScreen}
            title={isFullscreen ? "Salir de pantalla completa" : "Ver en pantalla completa"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 border border-cyan-500/40 hover:border-cyan-300 text-cyan-300 hover:text-white text-[11px] font-mono backdrop-blur-md shadow-lg transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Salir Pantalla Completa' : 'Pantalla Completa'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/75 border border-slate-800 text-[11px] font-mono text-slate-400 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Terminal POS Wolfzone</span>
          </div>
        </div>
      </div>
    </div>
  );
};
