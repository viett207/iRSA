import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationListResponse {
  items: AppNotification[];
  total: number;
  unread_count: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private baseUrl = `${environment.apiUrl}/notifications`;
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private reconnectAttempts = 0;

  /** Real-time chat messages stream */
  readonly chatMessages$ = new Subject<any>();

  /** All loaded notifications */
  notifications = signal<AppNotification[]>([]);
  /** Unread count for badge */
  unreadCount = signal(0);

  constructor(private http: HttpClient) {}

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
      this.reconnectAttempts = 0;
      // Keep alive with ping every 30s
      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send('ping');
        }
      }, 30000);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'init') {
          this.unreadCount.set(data.unread_count);
        } else if (data.type === 'notification') {
          // Prepend new notification to list
          const notif: AppNotification = data.notification;
          this.notifications.update((list) => [notif, ...list]);
          this.unreadCount.update((c) => c + 1);
        } else if (data.type === 'chat_message') {
          this.chatMessages$.next(data);
        }
      } catch {
        // Ignore non-JSON (e.g., "pong")
      }
    };

    this.ws.onclose = () => {
      this.clearTimers();
      // Auto-reconnect with exponential backoff (5s -> 10s -> 20s -> max 30s)
      const delay = Math.min(30000, 5000 * Math.pow(1.5, this.reconnectAttempts));
      this.reconnectAttempts++;
      this.reconnectTimer = setTimeout(() => this.connectWebSocket(), delay);
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
