import { Injectable, signal, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NzMessageDataOptions, NzMessageRef } from 'ng-zorro-antd/message';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationListResponse {
  items: AppNotification[];
  total: number;
  unread_count: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAppNotification(value: unknown): value is AppNotification {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value['id'] === 'number' &&
    typeof value['type'] === 'string' &&
    typeof value['title'] === 'string' &&
    typeof value['message'] === 'string' &&
    typeof value['is_read'] === 'boolean' &&
    typeof value['created_at'] === 'string' &&
    (value['data'] === null || isRecord(value['data']))
  );
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private baseUrl = `${environment.apiUrl}/notifications`;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  /** All loaded notifications */
  notifications = signal<AppNotification[]>([]);
  /** Unread count for badge */
  unreadCount = signal(0);

  constructor(
    private http: HttpClient,
    private toast: ToastService,
  ) {}

  // --- Toast Helpers (Success, Error, Info, Warning) with auto-dismiss (3-5s) ---

  success(content: unknown, options?: NzMessageDataOptions): void {
    this.toast.success(content, options);
  }

  info(content: unknown, options?: NzMessageDataOptions): void {
    this.toast.info(content, options);
  }

  warning(content: unknown, options?: NzMessageDataOptions): void {
    this.toast.warning(content, options);
  }

  error(content: unknown, options?: NzMessageDataOptions): void {
    this.toast.error(content, options);
  }

  loading(content: string, options?: NzMessageDataOptions): NzMessageRef {
    return this.toast.loading(content, options);
  }

  removeToast(id?: string): void {
    this.toast.remove(id);
  }

  reportHttpError(error: unknown, fallback?: string): void {
    this.toast.reportHttpError(error, fallback);
  }

  errorFromHttp(error: unknown, fallback?: string, preferFallback = false): void {
    this.toast.errorFromHttp(error, fallback, preferFallback);
  }

  // --- WebSocket & In-App Notifications ---

  /** Connect WebSocket and load initial notifications. Call after login. */
  connect(): void {
    this.loadNotifications();
    this.connectWebSocket();
  }

  /** Disconnect WebSocket. Call on logout. */
  disconnect(): void {
    this.closeWebSocket();
    this.notifications.set([]);
    this.unreadCount.set(0);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  /** Load notifications from REST API */
  loadNotifications(page = 1): void {
    this.http
      .get<NotificationListResponse>(`${this.baseUrl}?page=${page}&size=20`)
      .subscribe({
        next: (res) => {
          this.notifications.set(res.items);
          this.unreadCount.set(res.unread_count);
        },
      });
  }

  /** Mark single notification as read */
  markAsRead(id: number): void {
    this.http.patch(`${this.baseUrl}/${id}/read`, {}).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        this.unreadCount.update((c) => Math.max(0, c - 1));
      },
    });
  }

  /** Mark all as read */
  markAllAsRead(): void {
    this.http.patch(`${this.baseUrl}/read-all`, {}).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => ({ ...n, is_read: true }))
        );
        this.unreadCount.set(0);
      },
    });
  }

  // --- WebSocket ---

  private connectWebSocket(): void {
    this.closeWebSocket();

    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Convert http(s) to ws(s)
    const wsBase = environment.apiUrl.replace(/^http/, 'ws');
    const url = `${wsBase}/notifications/ws?token=${token}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      // Keep alive with ping every 30s
      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send('ping');
        }
      }, 30000);
    };

    this.ws.onmessage = (event) => {
      try {
        const data: unknown = JSON.parse(event.data);
        if (!isRecord(data)) {
          return;
        }

        if (data['type'] === 'init' && typeof data['unread_count'] === 'number') {
          this.unreadCount.set(data['unread_count']);
        } else if (data['type'] === 'notification' && isAppNotification(data['notification'])) {
          // Prepend new notification to list
          const notif = data['notification'];
          this.notifications.update((list) => [notif, ...list]);
          this.unreadCount.update((c) => c + 1);
          this.toast.info(`${notif.title}: ${notif.message}`);
        }
      } catch {
        // Ignore non-JSON (e.g., "pong")
      }
    };

    this.ws.onclose = () => {
      this.clearTimers();
      // Auto-reconnect after 5s
      this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 5000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private closeWebSocket(): void {
    this.clearTimers();
    if (this.ws) {
      this.ws.onclose = null; // Prevent auto-reconnect
      this.ws.close();
      this.ws = null;
    }
  }

  private clearTimers(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
