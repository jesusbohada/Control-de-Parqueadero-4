/**
 * Web Notification Service (HTML5 Notification API)
 * Proporciona notificaciones de escritorio nativas del navegador para:
 * - Alertas críticas sobre el estado de las sucursales (desconexiones, fallas de enlace, etc.)
 * - Avisos sobre paquetes de actualización pendientes recibidos desde la Central
 */

import { playSound } from '../utils/audio';

export interface WebNotificationConfig {
  enabled: boolean;
  alertOnBranchOffline: boolean;
  alertOnPendingPackages: boolean;
  alertOnCriticalTelemetry: boolean;
  playSound: boolean;
}

const STORAGE_KEY = 'pk_web_notification_config';

const DEFAULT_CONFIG: WebNotificationConfig = {
  enabled: true,
  alertOnBranchOffline: true,
  alertOnPendingPackages: true,
  alertOnCriticalTelemetry: true,
  playSound: true
};

type WebNotificationListener = (
  config: WebNotificationConfig,
  permission: NotificationPermission | 'unsupported'
) => void;

class WebNotificationService {
  private config: WebNotificationConfig;
  private listeners: Set<WebNotificationListener> = new Set();
  private sentTags: Set<string> = new Set();

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): WebNotificationConfig {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  private saveConfig(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // Ignorar errores de almacenamiento local
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  public async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.isSupported()) return 'unsupported';
    try {
      const permission = await Notification.requestPermission();
      this.notifyListeners();
      return permission;
    } catch (e) {
      console.warn('[WebNotificationService] Error solicitando permisos:', e);
      return 'denied';
    }
  }

  public getConfig(): WebNotificationConfig {
    return { ...this.config };
  }

  public updateConfig(patch: Partial<WebNotificationConfig>): void {
    this.config = { ...this.config, ...patch };
    this.saveConfig();
    this.notifyListeners();
  }

  public subscribe(listener: WebNotificationListener): () => void {
    this.listeners.add(listener);
    listener(this.getConfig(), this.getPermission());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const perm = this.getPermission();
    const cfg = this.getConfig();
    this.listeners.forEach(fn => fn(cfg, perm));
  }

  /**
   * Envía una notificación nativa si las condiciones de permiso y configuración están activas
   */
  public sendNotification(
    title: string,
    options?: NotificationOptions & {
      onClick?: () => void;
      sound?: boolean;
      force?: boolean;
    }
  ): Notification | null {
    if (!this.isSupported()) return null;
    if (this.getPermission() !== 'granted') return null;
    if (!this.config.enabled && !options?.force) return null;

    try {
      // Evitar spam de notificaciones con el mismo tag en poco tiempo
      if (options?.tag && this.sentTags.has(options.tag)) {
        // Tag repetido recientemente
      } else if (options?.tag) {
        this.sentTags.add(options.tag);
        setTimeout(() => {
          this.sentTags.delete(options.tag!);
        }, 120000); // 2 minutos de enfriamiento por tag
      }

      const notif = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        silent: !this.config.playSound,
        requireInteraction: false,
        ...options
      });

      if (this.config.playSound && options?.sound !== false) {
        playSound('alert');
      }

      if (options?.onClick) {
        notif.onclick = (e) => {
          e.preventDefault();
          window.focus();
          options.onClick!();
          notif.close();
        };
      } else {
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }

      return notif;
    } catch (err) {
      console.warn('[WebNotificationService] Error enviando notificación:', err);
      return null;
    }
  }

  /**
   * Alerta al personal cuando una sucursal cambia a estado crítico (offline / desconectada)
   */
  public notifyBranchCriticalState(
    branch: { id: string; name: string; code: string; city?: string; status?: string },
    reason: string,
    details?: string,
    onClick?: () => void
  ): Notification | null {
    if (!this.config.alertOnBranchOffline) return null;

    const title = `⚠️ Alerta Sucursal: ${branch.name} (${branch.code})`;
    const body = `${reason}${branch.city ? ` en ${branch.city}` : ''}.\n${details || 'Revise la conectividad y el enlace WebSocket.'}`;
    const tag = `branch-critical-${branch.id}-${reason.slice(0, 15)}`;

    return this.sendNotification(title, {
      body,
      tag,
      onClick
    });
  }

  /**
   * Alerta al personal cuando se reciben paquetes de actualización pendientes desde la Central
   */
  public notifyPendingCentralPackage(
    pkg: { id: string; title?: string; name?: string; version?: string; packageNumber?: string; type?: string; targetScope?: string },
    branchName?: string,
    onClick?: () => void
  ): Notification | null {
    if (!this.config.alertOnPendingPackages) return null;

    const pkgTitle = pkg.title || pkg.name || `Paquete ${pkg.packageNumber || pkg.id}`;
    const versionLabel = pkg.version ? ` (v${pkg.version})` : '';
    const title = `📦 Paquete Pendiente: ${pkgTitle}${versionLabel}`;
    const body = `Se ha recibido una actualización (${pkg.packageNumber || pkg.id}) desde la Central${branchName ? ` para ${branchName}` : ''}. Haga clic para revisar e instalar.`;
    const tag = `central-pkg-${pkg.id}`;

    return this.sendNotification(title, {
      body,
      tag,
      onClick
    });
  }

  /**
   * Envía una notificación de prueba para verificar el funcionamiento
   */
  public async testNotification(): Promise<boolean> {
    if (this.getPermission() !== 'granted') {
      const result = await this.requestPermission();
      if (result !== 'granted') return false;
    }

    const notif = this.sendNotification('🔔 Notificaciones Web Activas - FarmaDesk POS', {
      body: 'Las notificaciones del navegador están configuradas correctamente para alertar sobre sucursales y actualizaciones.',
      tag: `test-notification-${Date.now()}`,
      force: true
    });

    return notif !== null;
  }
}

export const webNotificationService = new WebNotificationService();
