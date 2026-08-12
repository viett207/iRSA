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

        <!-- Desktop Nav -->
        <nav class="nav hide-mobile">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">
            <span nz-icon nzType="home" nzTheme="outline"></span>
            Trang chủ
          </a>
          <a routerLink="/jobs" routerLinkActive="active" class="nav-link">
            <span nz-icon nzType="search" nzTheme="outline"></span>
            Tìm việc
          </a>
        </nav>

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
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
                  <strong>Thông báo</strong>
                  <a (click)="notificationSvc.markAllAsRead()" style="font-size: 12px;">Đã đọc tất cả</a>
                </div>
                <div style="max-height: 320px; overflow-y: auto;">
                  @for (n of notificationSvc.notifications(); track n.id) {
                    <div
                      (click)="onNotifClick(n)"
                      style="padding: 10px 16px; cursor: pointer; border-bottom: 1px solid #fafafa;"
                      [style.background]="n.is_read ? 'transparent' : '#e6f7ff'"
                    >
                      <div style="font-size: 13px;">{{ n.message }}</div>
                      <div style="font-size: 11px; color: #999; margin-top: 2px;">{{ formatTime(n.created_at) }}</div>
                    </div>
                  }
                  @if (notificationSvc.notifications().length === 0) {
                    <div style="padding: 24px; text-align: center; color: #999;">Không có thông báo</div>
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
                nzSize="small"
                class="user-avatar"
              ></nz-avatar>
              <span class="user-name">{{ authService.user()?.full_name }}</span>
              <span nz-icon nzType="down" nzTheme="outline" class="arrow"></span>
            </div>
            <nz-dropdown-menu #userMenu>
              <ul nz-menu class="user-dropdown">
                <li nz-menu-item disabled class="dropdown-header">
                  <strong>{{ authService.user()?.full_name }}</strong>
                  <small>{{ authService.user()?.email }}</small>
                </li>
                <li nz-menu-divider></li>
                <li nz-menu-item routerLink="/dashboard/profile">
                  <span nz-icon nzType="user" nzTheme="outline"></span>
                  Hồ sơ cá nhân
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
            <div class="notif-bell show-mobile-only"
              nz-dropdown [nzDropdownMenu]="notifMenuMobile" nzTrigger="click" nzPlacement="bottomRight">
              <nz-badge [nzCount]="notificationSvc.unreadCount()" [nzOverflowCount]="9" nzSize="small">
                <span nz-icon nzType="bell" nzTheme="outline"></span>
              </nz-badge>
            </div>
            <nz-dropdown-menu #notifMenuMobile>
              <div class="notif-dropdown">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid #f0f0f0;">
                  <strong style="font-size: 13px;">Thông báo</strong>
                  <a (click)="notificationSvc.markAllAsRead()" style="font-size: 11px;">Đã đọc tất cả</a>
                </div>
                <div style="max-height: 280px; overflow-y: auto;">
                  @for (n of notificationSvc.notifications(); track n.id) {
                    <div (click)="onNotifClick(n)"
                      style="padding: 8px 14px; cursor: pointer; border-bottom: 1px solid #fafafa;"
                      [style.background]="n.is_read ? 'transparent' : '#e6f7ff'">
                      <div style="font-size: 12px;">{{ n.message }}</div>
                      <div style="font-size: 10px; color: #999; margin-top: 2px;">{{ formatTime(n.created_at) }}</div>
                    </div>
                  }
                  @if (notificationSvc.notifications().length === 0) {
                    <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">Không có thông báo</div>
                  }
                </div>
              </div>
            </nz-dropdown-menu>

            <!-- Avatar only (Mobile) -->
            <nz-avatar
              class="show-mobile-only user-avatar"
              [nzText]="getInitials()"
              nzSize="small"
              (click)="mobileMenuOpen = true"
              style="cursor: pointer;"
            ></nz-avatar>
          } @else {
            <!-- Auth Buttons (Desktop) -->
            <div class="auth-buttons hide-mobile">
              <button nz-button nzType="text" routerLink="/login" class="login-btn">
                Đăng nhập
              </button>
              <button nz-button nzType="primary" routerLink="/register">
                Đăng ký
              </button>
            </div>
          }

          <!-- Mobile Menu Toggle -->
          <button
            nz-button
            nzType="text"
            class="mobile-toggle show-mobile-only"
            (click)="mobileMenuOpen = true"
          >
            <span nz-icon nzType="menu" nzTheme="outline" style="font-size: 22px;"></span>
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile Drawer -->
    <nz-drawer
      [nzVisible]="mobileMenuOpen"
      nzPlacement="right"
      nzTitle="Menu"
      (nzOnClose)="mobileMenuOpen = false"
      [nzWidth]="280"
      nzClosable
    >
      <ng-container *nzDrawerContent>
        <div class="mobile-menu">
          @if (authService.isAuthenticated()) {
            <div class="mobile-user">
              <nz-avatar [nzText]="getInitials()" [nzSize]="48" class="user-avatar"></nz-avatar>
              <div>
                <strong>{{ authService.user()?.full_name }}</strong>
                <small>{{ authService.user()?.email }}</small>
              </div>
            </div>
          } @else {
            <div class="mobile-auth">
              <button nz-button nzType="primary" nzBlock routerLink="/login" (click)="mobileMenuOpen = false">
                Đăng nhập
              </button>
              <button nz-button nzBlock routerLink="/register" (click)="mobileMenuOpen = false">
                Đăng ký
              </button>
            </div>
          }

          <ul nz-menu nzMode="vertical" class="mobile-nav">
            <li nz-menu-item routerLink="/" (click)="mobileMenuOpen = false">
              <span nz-icon nzType="home" nzTheme="outline"></span>
              Trang chủ
            </li>
            <li nz-menu-item routerLink="/jobs" (click)="mobileMenuOpen = false">
              <span nz-icon nzType="search" nzTheme="outline"></span>
              Tìm việc
            </li>
            @if (authService.isAuthenticated()) {
              <li nz-menu-divider></li>
              <li nz-menu-item routerLink="/dashboard/profile" (click)="mobileMenuOpen = false">
                <span nz-icon nzType="user" nzTheme="outline"></span>
                Hồ sơ cá nhân
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
    return name.split(' ').map(n => n.charAt(0)).slice(0, 2).join('').toUpperCase();
  }

  onNotifClick(n: AppNotification): void {
    if (!n.is_read) {
      this.notificationSvc.markAsRead(n.id);
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
