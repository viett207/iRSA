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
  template: `
    <header class="header">
      <div class="header-inner">
        <!-- Logo -->
        <a routerLink="/" class="logo">
          <span class="logo-icon">
            <span nz-icon nzType="thunderbolt" nzTheme="fill"></span>
          </span>
          <span class="logo-text">iRSA</span>
        </a>

        <!-- Right Section -->
        <div class="header-right">
          @if (authService.isAuthenticated()) {
            <!-- Notification Bell (Desktop) -->
            <div
              class="notif-bell hide-mobile"
              nz-dropdown
              [nzDropdownMenu]="notifMenu"
              nzTrigger="click"
              nzPlacement="bottomRight"
            >
              <nz-badge [nzCount]="notificationSvc.unreadCount()" [nzOverflowCount]="9" nzSize="small">
                <span nz-icon nzType="bell" nzTheme="outline"></span>
              </nz-badge>
            </div>
            <nz-dropdown-menu #notifMenu>
              <div class="notif-dropdown">
                <div class="notif-header">
                  <strong class="notif-title">Thông báo</strong>
                  <button type="button" class="notif-read-all-btn" (click)="notificationSvc.markAllAsRead()">
                    Đã đọc tất cả
                  </button>
                </div>
                <div class="notif-list">
                  @for (n of notificationSvc.notifications(); track n.id) {
                    <div
                      class="notif-item"
                      [class.unread]="!n.is_read"
                      (click)="onNotifClick(n)"
                    >
                      <div class="notif-msg">{{ n.message }}</div>
                      <div class="notif-time">{{ formatTime(n.created_at) }}</div>
                    </div>
                  }
                  @if (notificationSvc.notifications().length === 0) {
                    <div class="notif-empty">Không có thông báo mới</div>
                  }
                </div>
              </div>
            </nz-dropdown-menu>

            <!-- User Menu (Desktop) -->
            <div
              class="user-trigger hide-mobile"
              nz-dropdown
              [nzDropdownMenu]="userMenu"
              nzPlacement="bottomRight"
            >
              <nz-avatar
                [nzText]="getInitials()"
                nzSize="default"
                class="user-avatar"
              ></nz-avatar>
              <span class="user-name">{{ authService.user()?.full_name }}</span>
              <span nz-icon nzType="down" nzTheme="outline" class="arrow"></span>
            </div>
            <nz-dropdown-menu #userMenu>
              <ul nz-menu class="user-dropdown">
                <li nz-menu-item disabled class="dropdown-header">
                  <div class="user-info">
                    <strong class="dropdown-user-name">{{ authService.user()?.full_name }}</strong>
                    <small class="dropdown-user-email">{{ authService.user()?.email }}</small>
                  </div>
                </li>
                <li nz-menu-divider></li>
                <li nz-menu-item routerLink="/dashboard/profile">
                  <span nz-icon nzType="user" nzTheme="outline"></span>
                  Hồ sơ cá nhân
                </li>
                <li nz-menu-item routerLink="/dashboard/interview-invitations">
                  <span nz-icon nzType="calendar" nzTheme="outline"></span>
                  Lời mời phỏng vấn
                </li>
                <li nz-menu-item routerLink="/dashboard/applications">
                  <span nz-icon nzType="file-text" nzTheme="outline"></span>
                  Đơn ứng tuyển
                </li>
                <li nz-menu-item routerLink="/dashboard/cv-search">
                  <span nz-icon nzType="file-search" nzTheme="outline"></span>
                  Tìm việc theo CV
                </li>
                <li nz-menu-divider></li>
                <li nz-menu-item (click)="logout()" class="logout-item">
                  <span nz-icon nzType="logout" nzTheme="outline"></span>
                  Đăng xuất
                </li>
              </ul>
            </nz-dropdown-menu>

            <!-- Notification Bell (Mobile) -->
            <div
              class="notif-bell show-mobile-only"
              nz-dropdown
              [nzDropdownMenu]="notifMenuMobile"
              nzTrigger="click"
              nzPlacement="bottomRight"
            >
              <nz-badge [nzCount]="notificationSvc.unreadCount()" [nzOverflowCount]="9" nzSize="small">
                <span nz-icon nzType="bell" nzTheme="outline"></span>
              </nz-badge>
            </div>
            <nz-dropdown-menu #notifMenuMobile>
              <div class="notif-dropdown">
                <div class="notif-header">
                  <strong class="notif-title">Thông báo</strong>
                  <button type="button" class="notif-read-all-btn" (click)="notificationSvc.markAllAsRead()">
                    Đã đọc tất cả
                  </button>
                </div>
                <div class="notif-list mobile-notif-list">
                  @for (n of notificationSvc.notifications(); track n.id) {
                    <div
                      class="notif-item"
                      [class.unread]="!n.is_read"
                      (click)="onNotifClick(n)"
                    >
                      <div class="notif-msg">{{ n.message }}</div>
                      <div class="notif-time">{{ formatTime(n.created_at) }}</div>
                    </div>
                  }
                  @if (notificationSvc.notifications().length === 0) {
                    <div class="notif-empty">Không có thông báo mới</div>
                  }
                </div>
              </div>
            </nz-dropdown-menu>

            <!-- Avatar only (Mobile) -->
            <nz-avatar
              class="show-mobile-only user-avatar mobile-avatar-btn"
              [nzText]="getInitials()"
              nzSize="small"
              (click)="mobileMenuOpen = true"
            ></nz-avatar>
          } @else {
            <!-- Auth Buttons -->
            <div class="auth-buttons">
              <button nz-button nzType="text" routerLink="/login" class="login-btn">
                Đăng nhập
              </button>
              <button nz-button nzType="primary" routerLink="/register" class="register-btn">
                Đăng ký
              </button>
            </div>
          }

          @if (authService.isAuthenticated()) {
            <!-- Mobile Menu Toggle -->
            <button
              nz-button
              nzType="text"
              class="mobile-toggle show-mobile-only"
              (click)="mobileMenuOpen = true"
              aria-label="Mở menu"
            >
              <span nz-icon nzType="menu" nzTheme="outline" style="font-size: 20px;"></span>
            </button>
          }
        </div>
      </div>
    </header>

    <!-- Mobile Drawer -->
    <nz-drawer
      [nzVisible]="mobileMenuOpen"
      nzPlacement="right"
      nzTitle="Menu tài khoản"
      (nzOnClose)="mobileMenuOpen = false"
      [nzWidth]="300"
      nzClosable
    >
      <ng-container *nzDrawerContent>
        <div class="mobile-menu">
          @if (authService.isAuthenticated()) {
            <div class="mobile-user">
              <nz-avatar [nzText]="getInitials()" [nzSize]="48" class="user-avatar"></nz-avatar>
              <div class="mobile-user-details">
                <strong class="mobile-user-name">{{ authService.user()?.full_name }}</strong>
                <small class="mobile-user-email">{{ authService.user()?.email }}</small>
              </div>
            </div>
          }

          <ul nz-menu nzMode="vertical" class="mobile-nav">
            @if (authService.isAuthenticated()) {
              <li nz-menu-item routerLink="/dashboard/profile" (click)="mobileMenuOpen = false">
                <span nz-icon nzType="user" nzTheme="outline"></span>
                Hồ sơ cá nhân
              </li>
              <li nz-menu-item routerLink="/dashboard/interview-invitations" (click)="mobileMenuOpen = false">
                <span nz-icon nzType="calendar" nzTheme="outline"></span>
                Lời mời phỏng vấn
              </li>
              <li nz-menu-item routerLink="/dashboard/applications" (click)="mobileMenuOpen = false">
                <span nz-icon nzType="file-text" nzTheme="outline"></span>
                Đơn ứng tuyển
              </li>
              <li nz-menu-item routerLink="/dashboard/cv-search" (click)="mobileMenuOpen = false">
                <span nz-icon nzType="file-search" nzTheme="outline"></span>
                Tìm việc theo CV
              </li>
              <li nz-menu-divider></li>
              <li nz-menu-item (click)="logout(); mobileMenuOpen = false" class="logout-item">
                <span nz-icon nzType="logout" nzTheme="outline"></span>
                Đăng xuất
              </li>
            }
          </ul>
        </div>
      </ng-container>
    </nz-drawer>
  `,
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
    return name.split(' ').map((n) => n.charAt(0)).slice(0, 2).join('').toUpperCase();
  }

  onNotifClick(n: AppNotification): void {
    if (!n.is_read) {
      this.notificationSvc.markAsRead(n.id);
    }
    if (n.type === 'interview') {
      const rawId = n.data ? n.data['interview_id'] : null;
      const interviewId =
        rawId !== null && rawId !== undefined ? String(rawId) : undefined;

      if (interviewId) {
        this.router.navigate(['/dashboard/interview-invitations'], {
          queryParams: { highlight: interviewId },
        });
      } else {
        this.router.navigate(['/dashboard/interview-invitations']);
      }
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
