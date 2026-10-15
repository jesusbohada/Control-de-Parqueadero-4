import { useState, useEffect, useMemo } from 'react';
import { LIGHT_THEME, DARK_THEME, ThemeColors, ThemeManager } from '../utils/themeManager';

export interface ChartThemeConfig {
  isDarkMode: boolean;
  colors: ThemeColors;
  axisStroke: string;
  tickFill: string;
  gridStroke: string;
  tooltipStyle: React.CSSProperties;
  tooltipItemStyle: React.CSSProperties;
  tooltipLabelStyle: React.CSSProperties;
  legendStyle: React.CSSProperties;
  palette: {
    primary: string;
    accent: string;
    gold: string;
    success: string;
    warning: string;
    danger: string;
    cyan: string;
    indigo: string;
    purple: string;
  };
  rechartsProps: {
    cartesianGrid: {
      strokeDasharray: string;
      stroke: string;
      opacity: number;
    };
    xAxis: {
      stroke: string;
      tick: { fill: string; fontSize: number; fontFamily: string };
      tickLine: { stroke: string };
      axisLine: { stroke: string };
    };
    yAxis: {
      stroke: string;
      tick: { fill: string; fontSize: number; fontFamily: string };
      tickLine: { stroke: string };
      axisLine: { stroke: string };
    };
    tooltip: {
      contentStyle: React.CSSProperties;
      itemStyle: React.CSSProperties;
      labelStyle: React.CSSProperties;
      cursor: { fill: string; stroke: string; strokeWidth: number };
    };
  };
}

/**
 * Hook de React para sincronizar dinámicamente gráficos de Recharts, D3 o SVG Canvas
 * con la capa semántica global de variables CSS y tokens de alto contraste WCAG AAA.
 */
export function useThemeSync(overrideIsDarkMode?: boolean): ChartThemeConfig {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof overrideIsDarkMode === 'boolean') return overrideIsDarkMode;
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return ThemeManager.getIsDark();
  });

  useEffect(() => {
    if (typeof overrideIsDarkMode === 'boolean') {
      setIsDark(overrideIsDarkMode);
      return;
    }

    if (typeof document === 'undefined') return;

    // Observer para reaccionar a cambios en class 'dark' sobre <html>
    const observer = new MutationObserver(() => {
      const currentlyDark = document.documentElement.classList.contains('dark');
      setIsDark(currentlyDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-env-theme']
    });

    return () => observer.disconnect();
  }, [overrideIsDarkMode]);

  const config = useMemo<ChartThemeConfig>(() => {
    const colors = isDark ? DARK_THEME : LIGHT_THEME;
    const axisStroke = isDark ? '#94a3b8' : '#475569';
    const tickFill = isDark ? '#cbd5e1' : '#1e293b';
    const gridStroke = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)';

    const tooltipStyle: React.CSSProperties = {
      backgroundColor: isDark ? 'rgba(17, 24, 39, 0.96)' : 'rgba(255, 255, 255, 0.98)',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
      borderRadius: '0.75rem',
      padding: '0.625rem 0.875rem',
      boxShadow: isDark
        ? '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 10px rgba(16, 185, 129, 0.2)'
        : '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 0 10px rgba(0, 0, 0, 0.05)',
      color: isDark ? '#f8fafc' : '#0f172a',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      fontSize: '0.75rem',
      lineHeight: '1.25rem',
      fontWeight: 600,
    };

    const tooltipItemStyle: React.CSSProperties = {
      color: isDark ? '#f1f5f9' : '#0f172a',
      fontWeight: 700,
      fontSize: '0.75rem',
    };

    const tooltipLabelStyle: React.CSSProperties = {
      color: isDark ? '#94a3b8' : '#64748b',
      fontWeight: 800,
      fontSize: '0.7rem',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '0.25rem',
    };

    const legendStyle: React.CSSProperties = {
      color: tickFill,
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      fontSize: '0.75rem',
      fontWeight: 600,
    };

    const palette = {
      primary: isDark ? '#38bdf8' : '#0284c7',
      accent: isDark ? '#34d399' : '#059669',
      gold: isDark ? '#fbbf24' : '#d97706',
      success: isDark ? '#10b981' : '#047857',
      warning: isDark ? '#f59e0b' : '#b45309',
      danger: isDark ? '#f43f5e' : '#b91c1c',
      cyan: isDark ? '#06b6d4' : '#0891b2',
      indigo: isDark ? '#818cf8' : '#4f46e5',
      purple: isDark ? '#c084fc' : '#7c3aed',
    };

    return {
      isDarkMode: isDark,
      colors,
      axisStroke,
      tickFill,
      gridStroke,
      tooltipStyle,
      tooltipItemStyle,
      tooltipLabelStyle,
      legendStyle,
      palette,
      rechartsProps: {
        cartesianGrid: {
          strokeDasharray: '3 3',
          stroke: gridStroke,
          opacity: 0.9,
        },
        xAxis: {
          stroke: axisStroke,
          tick: { fill: tickFill, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" },
          tickLine: { stroke: axisStroke },
          axisLine: { stroke: axisStroke },
        },
        yAxis: {
          stroke: axisStroke,
          tick: { fill: tickFill, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" },
          tickLine: { stroke: axisStroke },
          axisLine: { stroke: axisStroke },
        },
        tooltip: {
          contentStyle: tooltipStyle,
          itemStyle: tooltipItemStyle,
          labelStyle: tooltipLabelStyle,
          cursor: {
            fill: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)',
            stroke: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.3)',
            strokeWidth: 1,
          }
        }
      }
    };
  }, [isDark]);

  return config;
}
