import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService, AppNotification } from '../../../core/services/notification.service';
import { SoundService } from '../../../core/services/sound.service';
import { ChatService } from '../../../core/services/chat.service';

@Component({
  selector: 'app-portal-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzIconModule,
    NzAvatarModule,
    NzDropDownModule,
    NzMenuModule,
    NzButtonModule,
    NzDrawerModule,
    NzBadgeModule,
    NzToolTipModule,
  ],
  styleUrl: './portal-header.component.css',
  templateUrl: './portal-header.component.html',
})
export class PortalHeaderComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  notificationSvc = inject(NotificationService);
  soundSvc = inject(SoundService);
  chatService = inject(ChatService);
  private router = inject(Router);
  private chatSub?: Subscription;

  mobileMenuOpen = false;

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.notificationSvc.connect();
      this.chatService.loadUnreadCount();
      this.chatSub = this.notificationSvc.chatMessages$.subscribe((data) => {
        if (data?.message?.sender_role !== 'candidate') {
          this.chatService.unreadCount.update((c) => c + 1);
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.chatSub?.unsubscribe();
    this.notificationSvc.disconnect();
  }

  getInitials(): string {
    const name = this.authService.user()?.full_name || 'U';
    return name.split(' ').map(n => n.charAt(0)).slice(0, 2).join('').toUpperCase();
  }

  onNotifClick(n: AppNotification): void {
    if (!n.is_read) {
      this.notificationSvc.markAsRead(n.id);
    }
    const data = (n as any).data;
    if (data?.application_id) {
      this.router.navigate(['/dashboard/inbox'], {
        queryParams: { appId: data.application_id },
      });
    } else if (n.type === 'interview' || n.type === 'application') {
      this.router.navigate(['/dashboard/inbox']);
    }
  }

  formatTime(isoDate: string): string {
    if (!isoDate) return '';
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  }

  logout(): void {
    this.notificationSvc.disconnect();
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
