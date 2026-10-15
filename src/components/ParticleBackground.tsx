import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  glowColor: string;
  alpha: number;
  pulseSpeed: number;
  pulseAngle: number;
  isAccent?: boolean;
}

interface BokehMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates and state
    const mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      radius: 160,
      active: false,
    };

    const ripples: Ripple[] = [];

    // Particle color palettes (Amber / WolfZone Gold with Cyber Blue accents)
    const particleColors = [
      { fill: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' }, // Amber 500
      { fill: '#fbbf24', glow: 'rgba(251, 191, 36, 0.45)' }, // Amber 400
      { fill: '#d97706', glow: 'rgba(217, 119, 6, 0.35)' }, // Amber 600
      { fill: '#fef3c7', glow: 'rgba(254, 243, 199, 0.5)' }, // Warm gold highlight
    ];

    const accentColors = [
      { fill: '#38bdf8', glow: 'rgba(56, 189, 248, 0.45)' }, // Cyan 400
      { fill: '#34d399', glow: 'rgba(52, 211, 153, 0.4)' }, // Emerald 400
    ];

    // Determine particle count based on screen area
    const particleCount = Math.min(Math.max(Math.floor((width * height) / 14000), 55), 110);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const isAccent = Math.random() < 0.15;
      const palette = isAccent
        ? accentColors[Math.floor(Math.random() * accentColors.length)]
        : particleColors[Math.floor(Math.random() * particleColors.length)];

      const baseRadius = isAccent ? Math.random() * 2 + 1.8 : Math.random() * 2 + 1.2;

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.75,
        vy: (Math.random() - 0.5) * 0.75,
        radius: baseRadius,
        baseRadius,
        color: palette.fill,
        glowColor: palette.glow,
        alpha: Math.random() * 0.45 + 0.35,
        pulseSpeed: Math.random() * 0.03 + 0.015,
        pulseAngle: Math.random() * Math.PI * 2,
        isAccent,
      });
    }

    // Background floating glowing bokeh motes (subtle ambient depth)
    const bokehMotes: BokehMote[] = [];
    const bokehCount = Math.min(Math.max(Math.floor((width * height) / 45000), 12), 24);
    for (let i = 0; i < bokehCount; i++) {
      const isCyan = Math.random() < 0.3;
      bokehMotes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -Math.random() * 0.3 - 0.1, // Gently drift upwards like embers
        radius: Math.random() * 24 + 14,
        color: isCyan ? 'rgba(56, 189, 248,' : 'rgba(245, 158, 11,',
        alpha: Math.random() * 0.06 + 0.02,
      });
    }

    // Resize handler
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    // Mouse & Touch listeners
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.targetX = -9999;
      mouse.targetY = -9999;
      mouse.active = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
        mouse.active = true;
      }
    };

    const handleTouchEnd = () => {
      mouse.targetX = -9999;
      mouse.targetY = -9999;
      mouse.active = false;
    };

    const handleClick = (e: MouseEvent) => {
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 10,
        maxRadius: 180,
        alpha: 0.7,
      });

      // Scatter nearby particles slightly on click
      for (const p of particles) {
        const dx = p.x - e.clientX;
        const dy = p.y - e.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180 && dist > 0) {
          const force = (180 - dist) / 180;
          p.vx += (dx / dist) * force * 3.5;
          p.vy += (dy / dist) * force * 3.5;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('click', handleClick);

    // Max distance to draw connection lines
    const maxDistance = 135;
    const maxDistanceSq = maxDistance * maxDistance;

    // Animation Loop
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 16.666, 2.5);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      if (mouse.active) {
        mouse.x += (mouse.targetX - mouse.x) * 0.15;
        mouse.y += (mouse.targetY - mouse.y) * 0.15;
      } else {
        mouse.x = -9999;
        mouse.y = -9999;
      }

      // 1. Draw subtle background bokeh motes (glowing soft embers)
      for (const b of bokehMotes) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // Wrap around borders
        if (b.y < -b.radius) {
          b.y = height + b.radius;
          b.x = Math.random() * width;
        }
        if (b.x < -b.radius) b.x = width + b.radius;
        if (b.x > width + b.radius) b.x = -b.radius;

        const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
        gradient.addColorStop(0, `${b.color} ${b.alpha})`);
        gradient.addColorStop(0.5, `${b.color} ${b.alpha * 0.5})`);
        gradient.addColorStop(1, `${b.color} 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Process Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 4.5 * dt;
        r.alpha -= 0.018 * dt;

        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245, 158, 11, ${Math.max(r.alpha, 0)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // 3. Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Damping velocity back to natural speed
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Ensure minimum motion
        if (Math.abs(p.vx) < 0.15) p.vx = (Math.random() - 0.5) * 0.5;
        if (Math.abs(p.vy) < 0.15) p.vy = (Math.random() - 0.5) * 0.5;

        // Bounce gently off boundaries
        if (p.x < 0) {
          p.x = 0;
          p.vx = Math.abs(p.vx);
        } else if (p.x > width) {
          p.x = width;
          p.vx = -Math.abs(p.vx);
        }

        if (p.y < 0) {
          p.y = 0;
          p.vy = Math.abs(p.vy);
        } else if (p.y > height) {
          p.y = height;
          p.vy = -Math.abs(p.vy);
        }

        // Pulse size
        p.pulseAngle += p.pulseSpeed * dt;
        p.radius = p.baseRadius + Math.sin(p.pulseAngle) * 0.5;

        // Interactive mouse interaction (repel & orbit smoothly)
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouse.radius && dist > 0) {
            const force = (mouse.radius - dist) / mouse.radius;
            // Gentle repulsion away from cursor
            p.vx -= (dx / dist) * force * 0.45 * dt;
            p.vy -= (dy / dist) * force * 0.45 * dt;

            // Connect to mouse with dynamic beam
            const mouseAlpha = (1 - dist / mouse.radius) * 0.65;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(245, 158, 11, ${mouseAlpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }

        // Draw connections to nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistanceSq) {
            const dist = Math.sqrt(distSq);
            const lineAlpha = (1 - dist / maxDistance) * 0.32;

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = p.isAccent || p2.isAccent
              ? `rgba(56, 189, 248, ${lineAlpha})`
              : `rgba(245, 158, 11, ${lineAlpha})`;
            ctx.lineWidth = lineAlpha * 1.5;
            ctx.stroke();
          }
        }

        // Draw particle node
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.glowColor;
        ctx.shadowBlur = p.isAccent ? 12 : 8;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.restore();
      }

      // Draw cursor ambient glow ring if active
      if (mouse.active) {
        ctx.save();
        const cursorGlow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 90);
        cursorGlow.addColorStop(0, 'rgba(245, 158, 11, 0.18)');
        cursorGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.06)');
        cursorGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = cursorGlow;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 90, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ display: 'block' }}
    />
  );
};
