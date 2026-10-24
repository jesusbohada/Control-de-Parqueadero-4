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

// ============================================================================
// COMPONENTE: FONDO ANIMADO DE TRÁNSITO VEHICULAR EN MOVIMIENTO (CINEMATIC BLUR)
// ============================================================================
interface TrafficVehicle {
  x: number;
  laneIndex: number;
  speed: number;
  type: 'car' | 'moto' | 'suv' | 'truck';
  color: string;
  roofColor: string;
  length: number;
  width: number;
}

interface BokehParticle {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  pulseSpeed: number;
}

const TrafficBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    // Definición de carriles (Vía expresa en 2 sentidos)
    const lanes = [
      { yRatio: 0.18, dir: 1, speedFactor: 1.1 },
      { yRatio: 0.28, dir: 1, speedFactor: 1.4 },
      { yRatio: 0.38, dir: 1, speedFactor: 1.2 },
      { yRatio: 0.62, dir: -1, speedFactor: 1.2 },
      { yRatio: 0.72, dir: -1, speedFactor: 1.5 },
      { yRatio: 0.82, dir: -1, speedFactor: 1.1 },
    ];

    const vehicleColors = ['#1e293b', '#0f172a', '#334155', '#475569', '#1e1b4b', '#312e81', '#1e3a5f'];
    const roofColors = ['#334155', '#1e293b', '#475569', '#64748b', '#3b82f6'];

    // Inicializar flota de vehículos
    const vehicles: TrafficVehicle[] = [];
    lanes.forEach((lane, laneIdx) => {
      // 3 a 4 vehículos por carril espaciados
      const count = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const types: ('car' | 'moto' | 'suv' | 'truck')[] = ['car', 'car', 'suv', 'moto', 'truck'];
        const type = types[Math.floor(Math.random() * types.length)];
        let len = 50;
        let wid = 20;

        if (type === 'moto') {
          len = 28;
          wid = 12;
        } else if (type === 'suv') {
          len = 60;
          wid = 24;
        } else if (type === 'truck') {
          len = 85;
          wid = 26;
        }

        vehicles.push({
          x: (width / count) * i + Math.random() * 120,
          laneIndex: laneIdx,
          speed: (1.6 + Math.random() * 1.8) * lane.speedFactor,
          type,
          color: vehicleColors[Math.floor(Math.random() * vehicleColors.length)],
          roofColor: roofColors[Math.floor(Math.random() * roofColors.length)],
          length: len,
          width: wid
        });
      }
    });

    // Puntos bokeh urbanos en el horizonte
    const bokeh: BokehParticle[] = [];
    const bokehColors = ['rgba(245, 158, 11, ', 'rgba(234, 179, 8, ', 'rgba(56, 189, 248, ', 'rgba(239, 68, 68, ', 'rgba(255, 255, 255, '];
    for (let i = 0; i < 35; i++) {
      bokeh.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.4),
        radius: 3 + Math.random() * 14,
        color: bokehColors[Math.floor(Math.random() * bokehColors.length)],
        alpha: 0.1 + Math.random() * 0.35,
        pulseSpeed: 0.01 + Math.random() * 0.02
      });
    }

    let tick = 0;

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      // 1. Fondo base de asfalto nocturno con leve reflejo
      const gradBg = ctx.createLinearGradient(0, 0, 0, height);
      gradBg.addColorStop(0, '#06080e');
      gradBg.addColorStop(0.5, '#0b0f17');
      gradBg.addColorStop(1, '#05070c');
      ctx.fillStyle = gradBg;
      ctx.fillRect(0, 0, width, height);

      // 2. Dibujar bokeh urbano lejano
      bokeh.forEach(b => {
        const dynamicAlpha = b.alpha + Math.sin(tick * b.pulseSpeed) * 0.1;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${b.color}${Math.max(0.05, dynamicAlpha)})`;
        ctx.fill();
      });

      // 3. Dibujar calzadas y líneas de carril
      lanes.forEach(lane => {
        const laneY = height * lane.yRatio;
        
        // Línea reflectiva discontinua del carril
        ctx.beginPath();
        ctx.setLineDash([20, 24]);
        ctx.lineDashOffset = -tick * lane.dir * 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(0, laneY + 16);
        ctx.lineTo(width, laneY + 16);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Separador central de la autopista con brillo ámbar tenue
      const midY = height * 0.5;
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      // 4. Renderizar y mover cada vehículo con sus luces
      vehicles.forEach(v => {
        const lane = lanes[v.laneIndex];
        const dir = lane.dir;
        const laneY = height * lane.yRatio;

        // Actualizar posición
        v.x += v.speed * dir;

        // Bucle infinito continuo
        if (dir === 1 && v.x > width + 160) {
          v.x = -160;
        } else if (dir === -1 && v.x < -160) {
          v.x = width + 160;
        }

        const vx = v.x;
        const vy = laneY - v.width / 2;
        const vLen = v.length;
        const vWid = v.width;

        // A. Luces Delanteras (Faros y haz de luz proyectado hacia adelante)
        if (dir === 1) {
          // Vehículo va hacia la derecha -> Faros alumbran hacia la derecha
          const beamGrad = ctx.createRadialGradient(
            vx + vLen, vy + vWid / 2, 2,
            vx + vLen + 110, vy + vWid / 2, 80
          );
          beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
          beamGrad.addColorStop(0.3, 'rgba(253, 224, 71, 0.2)');
          beamGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');

          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(vx + vLen, vy + 2);
          ctx.lineTo(vx + vLen + 130, vy - 20);
          ctx.lineTo(vx + vLen + 130, vy + vWid + 20);
          ctx.lineTo(vx + vLen, vy + vWid - 2);
          ctx.closePath();
          ctx.fill();

          // Puntos de faro delantero
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#fef08a';
          ctx.shadowBlur = 10;
          ctx.fillRect(vx + vLen - 2, vy + 3, 3, 4);
          ctx.fillRect(vx + vLen - 2, vy + vWid - 7, 3, 4);
          ctx.shadowBlur = 0;

          // B. Luces Traseras (Stops rojos con estela de luz hacia atrás)
          const tailGrad = ctx.createLinearGradient(vx, vy, vx - 50, vy);
          tailGrad.addColorStop(0, 'rgba(239, 68, 68, 0.6)');
          tailGrad.addColorStop(0.5, 'rgba(220, 38, 38, 0.25)');
          tailGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');

          ctx.fillStyle = tailGrad;
          ctx.fillRect(vx - 50, vy + 2, 50, 4);
          ctx.fillRect(vx - 50, vy + vWid - 6, 50, 4);

          // Puntos de luz roja de los stops
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.fillRect(vx - 1, vy + 2, 3, 4);
          ctx.fillRect(vx - 1, vy + vWid - 6, 3, 4);
          ctx.shadowBlur = 0;

        } else {
          // Vehículo va hacia la izquierda -> Faros alumbran hacia la izquierda
          const beamGrad = ctx.createRadialGradient(
            vx, vy + vWid / 2, 2,
            vx - 110, vy + vWid / 2, 80
          );
          beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
          beamGrad.addColorStop(0.3, 'rgba(253, 224, 71, 0.2)');
          beamGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');

          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(vx, vy + 2);
          ctx.lineTo(vx - 130, vy - 20);
          ctx.lineTo(vx - 130, vy + vWid + 20);
          ctx.lineTo(vx, vy + vWid - 2);
          ctx.closePath();
          ctx.fill();

          // Puntos de faro delantero
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#fef08a';
          ctx.shadowBlur = 10;
          ctx.fillRect(vx - 1, vy + 3, 3, 4);
          ctx.fillRect(vx - 1, vy + vWid - 7, 3, 4);
          ctx.shadowBlur = 0;

          // B. Luces Traseras (Stops rojos hacia la derecha)
          const tailGrad = ctx.createLinearGradient(vx + vLen, vy, vx + vLen + 50, vy);
          tailGrad.addColorStop(0, 'rgba(239, 68, 68, 0.6)');
          tailGrad.addColorStop(0.5, 'rgba(220, 38, 38, 0.25)');
          tailGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');

          ctx.fillStyle = tailGrad;
          ctx.fillRect(vx + vLen, vy + 2, 50, 4);
          ctx.fillRect(vx + vLen, vy + vWid - 6, 50, 4);

          // Puntos de luz roja
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.fillRect(vx + vLen - 2, vy + 2, 3, 4);
          ctx.fillRect(vx + vLen - 2, vy + vWid - 6, 3, 4);
          ctx.shadowBlur = 0;
        }

        // C. Cuerpo y Silueta del Vehículo
        ctx.fillStyle = v.color;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(vx, vy, vLen, vWid, [4]);
        } else {
          ctx.rect(vx, vy, vLen, vWid);
        }
        ctx.fill();

        // Techo / Cabina del vehículo con reflejo de parabrisas
        if (v.type !== 'moto') {
          ctx.fillStyle = v.roofColor;
          const cabinMargin = v.type === 'truck' ? 14 : 10;
          ctx.fillRect(vx + cabinMargin, vy + 3, vLen - cabinMargin * 2, vWid - 6);

          // Parabrisas reflectivo
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          const windX = dir === 1 ? vx + vLen - cabinMargin : vx + cabinMargin - 4;
          ctx.fillRect(windX, vy + 4, 3, vWid - 8);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Canvas animado con desenfoque sutil y mayor nitidez visual */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ filter: 'blur(1.2px) saturate(1.25)' }}
      />
      
      {/* Viñeta oscura central para garantizar 100% de legibilidad y contraste */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(11, 15, 23, 0.72) 0%, rgba(11, 15, 23, 0.38) 55%, rgba(11, 15, 23, 0.86) 100%)'
        }}
      />
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL DE LOGIN
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
      {/* Fondo Animado de Tránsito con Vehículos y Luces en Movimiento */}
      <TrafficBackground />

      {/* Tarjeta Central de Acceso Elegante y Sobria */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[420px] bg-slate-900/85 border border-slate-800/90 rounded-3xl p-7 sm:p-9 backdrop-blur-2xl shadow-2xl relative z-10"
      >
        {/* Línea de acento luminoso superior en ámbar */}
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />

        {/* Encabezado: Logo y Nombre de Marca */}
        <div className="text-center mb-6 flex flex-col items-center">
          {/* Logo de la marca con agradable interacción */}
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
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-slate-950/90 border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
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
