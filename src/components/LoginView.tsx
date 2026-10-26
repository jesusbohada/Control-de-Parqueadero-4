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
  Sparkles,
  Maximize2,
  Minimize2,
  Radio
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
// MOTOR DE PARTÍCULAS CIBERNÉTICAS EN BUCLE CONTINUO (HTML5 CANVAS)
// ============================================================================
const CyberParticlesCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Partículas luminosas flotantes (polvo digital / chispas neón)
    const particles = Array.from({ length: 48 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 0.8,
      speedY: -(Math.random() * 0.6 + 0.2),
      speedX: (Math.random() - 0.5) * 0.35,
      opacity: Math.random() * 0.6 + 0.25,
      color: Math.random() > 0.35 ? '6, 182, 212' : '52, 211, 153' // Cian o Menta
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        if (p.y < -10) p.y = height + 10;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#06b6d4';
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />;
};

// ============================================================================
// COMPONENTE: FONDO TOTALMENTE ANIMADO EN BUCLE (VIDEO LOGUIN ANIMADO.mp4)
// ============================================================================
const AnimatedWolfzoneScene: React.FC<{ onMascotClick: () => void }> = ({ onMascotClick }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.0;
      videoRef.current.play().catch(() => {
        // Autoplay asegurado por politicas de navegador
      });
    }
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* 1. Fondo de Video Animado en Bucle (LOGUIN ANIMADO.mp4) con Fallback Poster */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        poster="/assets/login_wolfzone_art.jpg"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          filter: 'brightness(0.94) contrast(1.06) saturate(1.08)'
        }}
      >
        <source src="/assets/LOGUIN ANIMADO.mp4" type="video/mp4" />
        <source src="/assets/LOGUIN%20ANIMADO.mp4" type="video/mp4" />
      </video>

      {/* 2. Resplandor Ambiental Neón Pulsante en Bucle */}
      <motion.div
        animate={{ opacity: [0.08, 0.22, 0.08] }}
        transition={{ duration: 4.0, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-radial from-cyan-500/20 via-transparent to-transparent pointer-events-none"
      />

      {/* 3. Línea de Escaneo Holográfico Vertical en Bucle Continuo */}
      <motion.div
        animate={{ y: ['-20%', '120%'] }}
        transition={{ duration: 6.0, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-cyan-400/[0.06] to-transparent pointer-events-none z-10"
      />

      {/* 4. Motor de Partículas en Bucle */}
      <CyberParticlesCanvas />

      {/* 5. Viñeta Suave para Preservar la Legibilidad Superior del Panel */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 75% 50%, rgba(7, 11, 18, 0.40) 0%, rgba(7, 11, 18, 0.15) 50%, rgba(7, 11, 18, 0.85) 100%)'
        }}
      />

      {/* 6. Gradiente Vertical Suave */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#070b12]/90 via-transparent to-[#070b12]/60 pointer-events-none" />

      {/* 7. Zona de Interacción con la Mascota Wolfzone (Saluda al hacer clic) */}
      <motion.div
        onClick={onMascotClick}
        whileHover={{ scale: 1.01 }}
        title="¡Oficial Wolfzone en guardia! Haz clic para saludar."
        className="absolute z-20 cursor-pointer pointer-events-auto group hidden sm:block"
        style={{ left: '5%', top: '22%', width: '40%', height: '75%' }}
      >
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-20 left-12 bg-slate-950/90 border border-cyan-400/60 rounded-2xl px-4 py-2 text-xs font-mono text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] pointer-events-none flex items-center gap-2 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          <span>¡Bienvenido a Wolfzone! 🐺 Turno operativo.</span>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: LOGIN COMPLETAMENTE NUEVO
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Detección de Pantalla Completa (F11 / Modo Quiosco POS)
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
      // 1. Intentar autenticación contra el backend PostgreSQL
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
      // Contingencia local si no hay conexión con el backend
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
    <div 
      id="wolfzone-login-view" 
      className="wolfzone-login-view fixed inset-0 w-screen h-screen overflow-hidden select-none bg-[#070b12] text-slate-100 flex items-center justify-end p-4 sm:p-8 md:p-12 lg:p-16"
    >
      
      {/* ==================================================================== */}
      {/* FONDO ANIMADO EN BUCLE CONTINUO (ILUSTRACIÓN + LUCES + PARTÍCULAS) */}
      {/* ==================================================================== */}
      <AnimatedWolfzoneScene onMascotClick={handleMascotClick} />

      {/* ==================================================================== */}
      {/* PANEL HOLOGRÁFICO DE LOGIN FLOTANTE Y DEFINITIVO (DERECHA) */}
      {/* ==================================================================== */}
      <motion.div
        initial={{ opacity: 0, x: 40, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[460px] lg:max-w-[490px] bg-slate-950/95 border-2 border-cyan-400/80 rounded-3xl p-7 sm:p-9 backdrop-blur-2xl shadow-[0_0_60px_rgba(6,182,212,0.45)] relative z-20 overflow-hidden"
      >
        {/* Línea Luminosa Superior Neón */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee]" />

        {/* Encabezado Holográfico */}
        <div className="mb-6 flex flex-col items-center text-center">
          {/* Logo Oficial Wolfzone con Resplandor */}
          <div className="relative mb-3.5 group cursor-pointer" onClick={handleMascotClick}>
            <div className="absolute inset-0 bg-cyan-400/30 blur-md rounded-full" />
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-400/70 p-1 shadow-2xl relative z-10 flex items-center justify-center overflow-hidden">
              <img
                src="/assets/wolfzone_logo_farmanorte.jpg"
                alt="Logo Oficial Farmanorte Wolfzone"
                className="w-full h-full object-cover rounded-full transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </div>

          {/* Título Principal con Máximo Contraste y Blindaje Total */}
          <h1 
            className="wolfzone-title text-2xl sm:text-[28px] font-black uppercase text-white tracking-wider font-sans drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)]"
            style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
          >
            WOLFZONE PARKING
          </h1>

          {/* Badge de Estado y Sucursal */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-cyan-500/40 text-[11px] font-mono text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.25)]">
              {isServer ? (
                <Server className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="font-semibold">{stationLabel}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-mono text-emerald-300">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>TERMINAL EN LÍNEA</span>
            </div>
          </div>
        </div>

        {/* Mensaje de Alerta / Error */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5 overflow-hidden shadow-[0_0_15px_rgba(244,63,94,0.35)]"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-semibold">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulario de Login */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Campo de Usuario */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider font-mono">
              Usuario
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400/60 group-focus-within:text-cyan-300 transition-colors">
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
                className="w-full bg-slate-900/90 border border-cyan-500/40 focus:border-cyan-300 rounded-xl pl-10 pr-4 py-3 text-sm text-cyan-100 placeholder-cyan-500/35 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 font-mono shadow-inner transition-all"
              />
            </div>
          </div>

          {/* Campo de Contraseña */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider font-mono">
              Contraseña
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400/60 group-focus-within:text-cyan-300 transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoggingIn}
                required
                className="w-full bg-slate-900/90 border border-cyan-500/40 focus:border-cyan-300 rounded-xl pl-10 pr-11 py-3 text-sm text-cyan-100 placeholder-cyan-500/35 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 font-mono shadow-inner transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-cyan-400/60 hover:text-cyan-200 transition-colors cursor-pointer"
                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botón de Inicio de Sesión Neón */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 hover:from-cyan-300 hover:to-teal-200 active:from-cyan-500 active:to-teal-400 disabled:opacity-50 text-slate-950 font-black text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(6,182,212,0.85)] hover:shadow-[0_0_35px_rgba(34,211,238,1)] flex items-center justify-center gap-2 transition-all cursor-pointer mt-5 border border-cyan-100/90"
          >
            {isLoggingIn ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Verificando acceso...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4.5 h-4.5 stroke-[2.5]" />
                <span>Iniciar Sesión</span>
              </>
            )}
          </motion.button>
        </form>

        {/* Pie de Página */}
        <div className="mt-6 pt-4 border-t border-cyan-500/20 text-center flex items-center justify-between text-[11px] font-mono text-cyan-400/70">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Terminal Segura Wolfzone</span>
          </span>
          <span className="text-slate-500">v4.0 POS</span>
        </div>
      </motion.div>

      {/* ==================================================================== */}
      {/* BOTÓN FLOTANTE INFERIOR DE PANTALLA COMPLETA */}
      {/* ==================================================================== */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={toggleFullScreen}
          title={isFullscreen ? "Salir de pantalla completa" : "Ver en pantalla completa"}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-950/85 border border-cyan-500/40 hover:border-cyan-300 text-cyan-300 hover:text-white text-xs font-mono backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isFullscreen ? 'Salir de Pantalla Completa' : 'Pantalla Completa (F11)'}</span>
        </button>
      </div>
    </div>
  );
};
