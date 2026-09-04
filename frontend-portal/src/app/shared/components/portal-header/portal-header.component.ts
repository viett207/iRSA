import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzBadgeModule } from 'ng-zorro-antd/badge';

import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService, AppNotification } from '../../../core/services/notification.service';

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
  ],
  styleUrl: './portal-header.component.css',
  templateUrl: './portal-header.component.html',
})
export class PortalHeaderComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  notificationSvc = inject(NotificationService);
  private router = inject(Router);

  mobileMenuOpen = false;

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.notificationSvc.connect();
    }
  }

  ngOnDestroy(): void {
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
