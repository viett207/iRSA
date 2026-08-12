import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
    NzDropDownModule,
    NzAvatarModule,
    NzBadgeModule,
    NzToolTipModule,
    NzDividerModule,
    NzBreadCrumbModule,
  ],
  template: `
    <nz-layout class="app-layout">
      <!-- Sidebar -->
      <nz-sider
        class="sidebar"
        nzCollapsible
        [(nzCollapsed)]="isCollapsed"
        [nzWidth]="240"
        [nzCollapsedWidth]="64"
        nzBreakpoint="lg"
        [nzTrigger]="null"
      >
        <!-- Logo -->
        <div class="sidebar-logo" [class.collapsed]="isCollapsed">
          <div class="logo-icon">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="#1890FF"/>
              <path d="M8 10h6v12H8V10zm10 0h6v12h-6V10z" fill="white"/>
              <circle cx="11" cy="16" r="2" fill="#1890FF"/>
              <circle cx="21" cy="16" r="2" fill="#1890FF"/>
            </svg>
          </div>
          @if (!isCollapsed) {
            <div class="logo-text">
              <span class="logo-title">iRSA</span>
              <span class="logo-subtitle">HR Admin</span>
            </div>
          }
        </div>

        <!-- Navigation Menu -->
        <ul nz-menu nzMode="inline" nzTheme="dark" class="sidebar-menu">
          <!-- Dashboard -->
          <li nz-menu-item nzMatchRouter routerLink="/dashboard" class="menu-item">
            <span nz-icon nzType="appstore" nzTheme="outline"></span>
            <span class="menu-text">Trang chủ</span>
          </li>

          <!-- Jobs Section -->
          <li nz-submenu nzIcon="solution" nzTitle="Việc làm" nzMatchRouter nzMatchRouterExact class="menu-item">
            <ul>
              <li nz-menu-item routerLink="/jobs" nzMatchRouter [nzMatchRouterExact]="true">
                <span nz-icon nzType="unordered-list"></span>
                Danh sách
              </li>
              <li nz-menu-item routerLink="/jobs/new" nzMatchRouter>
                <span nz-icon nzType="plus-circle"></span>
                Tạo mới
              </li>
              <li nz-menu-item routerLink="/jobs/shortlisted" nzMatchRouter>
                <span nz-icon nzType="check-circle"></span>
                Vòng 1 đạt
              </li>
              <li nz-menu-item routerLink="/jobs/interviewing" nzMatchRouter>
                <span nz-icon nzType="team"></span>
                Chờ phỏng vấn
              </li>
            </ul>
          </li>

          <!-- Reports -->
          <li nz-menu-item nzMatchRouter routerLink="/reports" class="menu-item">
            <span nz-icon nzType="bar-chart" nzTheme="outline"></span>
            <span class="menu-text">Báo cáo</span>
          </li>

          <!-- Admin Section -->
          @if (authService.hasRole('admin')) {
            <li nz-menu-item routerLink="/companies" nzMatchRouter class="menu-item">
              <span nz-icon nzType="bank" nzTheme="outline"></span>
              <span class="menu-text">Công ty</span>
            </li>
            <li nz-menu-item routerLink="/users" nzMatchRouter class="menu-item">
              <span nz-icon nzType="user" nzTheme="outline"></span>
              <span class="menu-text">Người dùng</span>
            </li>
            <li nz-menu-item routerLink="/approvals" nzMatchRouter class="menu-item">
              <span nz-icon nzType="audit" nzTheme="outline"></span>
              <span class="menu-text">Phê duyệt</span>
            </li>
          }
        </ul>

        <!-- Sidebar Footer -->
        <div class="sidebar-footer" [class.collapsed]="isCollapsed"></div>
      </nz-sider>

      <!-- Main Content Area -->
      <nz-layout class="main-area">
        <!-- Header -->
        <nz-header class="app-header">
          <div class="header-left">
            <!-- Menu Toggle -->
            <button
              class="menu-toggle"
              (click)="isCollapsed = !isCollapsed"
              nz-tooltip
              [nzTooltipTitle]="isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'"
            >
              <span
                nz-icon
                [nzType]="isCollapsed ? 'menu-unfold' : 'menu-fold'"
                nzTheme="outline"
              ></span>
            </button>

          </div>

          <div class="header-right">
            <!-- Notifications -->
            <div
              class="header-action"
              nz-dropdown
              [nzDropdownMenu]="notificationMenu"
              nzTrigger="click"
              nz-tooltip
              nzTooltipTitle="Thông báo"
            >
              <nz-badge [nzCount]="notificationSvc.unreadCount()" [nzOverflowCount]="9">
                <span nz-icon nzType="bell" nzTheme="outline"></span>
              </nz-badge>
            </div>

            <nz-dropdown-menu #notificationMenu="nzDropdownMenu">
              <div class="notification-dropdown">
                <div class="notification-header">
                  <span>Thông báo</span>
                  <a (click)="notificationSvc.markAllAsRead()">Đánh dấu đã đọc</a>
                </div>
                <div class="notification-list">
                  @for (notif of notificationSvc.notifications(); track notif.id) {
                    <div class="notification-item" [class.unread]="!notif.is_read"
                      (click)="onNotificationClick(notif)">
                      <div class="notification-icon" [ngClass]="notif.type">
                        <span nz-icon [nzType]="getNotificationIcon(notif.type)"></span>
                      </div>
                      <div class="notification-content">
                        <p class="notification-text">{{ notif.message }}</p>
                        <span class="notification-time">{{ formatTime(notif.created_at) }}</span>
                      </div>
                    </div>
                  }
                  @if (notificationSvc.notifications().length === 0) {
                    <div style="padding: 24px; text-align: center; color: #999">
                      Không có thông báo
                    </div>
                  }
                </div>
              </div>
            </nz-dropdown-menu>

            <!-- Divider -->
            <nz-divider nzType="vertical" class="header-divider hide-mobile"></nz-divider>

            <!-- User Menu -->
            <div
              class="user-profile"
              nz-dropdown
              [nzDropdownMenu]="userMenu"
              nzTrigger="click"
            >
              <nz-avatar
                [nzText]="userInitial()"
                [nzSize]="36"
                class="user-avatar"
              ></nz-avatar>
              <div class="user-info hide-mobile">
                <span class="user-name">{{ authService.user()?.full_name }}</span>
                <span class="user-role">{{ getRoleLabel() }}</span>
              </div>
              <span nz-icon nzType="down" nzTheme="outline" class="hide-mobile"></span>
            </div>

            <nz-dropdown-menu #userMenu="nzDropdownMenu">
              <ul nz-menu class="user-dropdown-menu">
                <li nz-menu-item disabled class="user-dropdown-header">
                  <div class="dropdown-user-info">
                    <nz-avatar [nzText]="userInitial()" [nzSize]="48"></nz-avatar>
                    <div>
                      <strong>{{ authService.user()?.full_name }}</strong>
                      <span>{{ authService.user()?.email }}</span>
                    </div>
                  </div>
                </li>
                <li nz-menu-divider></li>
                <li nz-menu-item routerLink="/profile">
                  <span nz-icon nzType="user" nzTheme="outline"></span>
                  Thông tin cá nhân
                </li>
                <li nz-menu-divider></li>
                <li nz-menu-item (click)="logout()" class="logout-item">
                  <span nz-icon nzType="logout" nzTheme="outline"></span>
                  Đăng xuất
                </li>
              </ul>
            </nz-dropdown-menu>
          </div>
        </nz-header>

        <!-- Page Content -->
        <nz-content class="app-content">
          <div class="content-wrapper">
            <router-outlet></router-outlet>
          </div>
        </nz-content>
      </nz-layout>
    </nz-layout>
  `,
  styles: [`
    /* ===== Layout Structure ===== */
    :host {
      display: block;
    }

    .app-layout {
      min-height: 100vh;
    }

    /* Ensure sticky header works - nz-layout must not clip overflow */
    :host ::ng-deep .main-area > .ant-layout-content {
      overflow: visible;
    }

    /* ===== Sidebar ===== */
    .sidebar {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      z-index: 100;
      display: flex;
      flex-direction: column;
    }

    .sidebar-logo {
      height: 64px;
      display: flex;
      align-items: center;
      padding: 0 16px;
      background: rgba(0, 0, 0, 0.2);
      gap: 12px;
      overflow: hidden;
      transition: all 0.2s ease;

      &.collapsed {
        padding: 0 12px;
        justify-content: center;
      }
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      flex-shrink: 0;

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .logo-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
      white-space: nowrap;
    }

    .logo-title {
      font-family: var(--font-heading);
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.5px;
    }

    .logo-subtitle {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.65);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Menu Styling */
    .sidebar-menu {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 12px 0;
    }

    .menu-item {
      margin: 4px 8px !important;
    }

    .menu-text {
      margin-left: 10px;
    }

    /* Sidebar Footer */
    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);

      &.collapsed {
        padding: 16px 8px;
      }
    }

    .help-section {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      color: rgba(255, 255, 255, 0.65);
      font-size: 13px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
      }
    }

    /* ===== Main Area ===== */
    .main-area {
      margin-left: 240px;
      transition: margin-left 0.2s ease;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    :host ::ng-deep .ant-layout-sider-collapsed + .main-area {
      margin-left: 64px;
    }

    /* ===== Header ===== */
    .app-header {
      position: sticky;
      top: 0;
      z-index: 99;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px !important;
      background: #fff !important;
      height: 64px !important;
      line-height: 64px !important;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .menu-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: var(--color-text-secondary);

      &:hover {
        background: var(--color-bg-tertiary);
        color: var(--color-primary);
      }

      span {
        font-size: 18px;
      }
    }

    .header-search {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: var(--color-bg-tertiary);
      border-radius: 8px;
      width: 240px;
      height: 36px;
      transition: all 0.2s ease;

      &:focus-within {
        background: #fff;
        box-shadow: 0 0 0 2px var(--color-primary-100);
      }

      span {
        color: var(--color-text-tertiary);
      }

      input {
        border: none;
        background: transparent;
        outline: none;
        width: 100%;
        font-size: 14px;
        color: var(--color-text-primary);

        &::placeholder {
          color: var(--color-text-tertiary);
        }
      }
    }

    .header-action {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: var(--color-text-secondary);

      &:hover {
        background: var(--color-bg-tertiary);
        color: var(--color-primary);
      }

      span {
        font-size: 20px;
      }
    }

    .header-divider {
      height: 24px;
      margin: 0 8px;
      background: var(--color-border);
    }

    /* User Profile */
    .user-profile {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px 6px 6px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: var(--color-bg-tertiary);
      }
    }

    .user-avatar {
      background: var(--color-primary) !important;
      font-weight: 600;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
    }

    .user-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .user-role {
      font-size: 12px;
      color: var(--color-text-tertiary);
    }

    /* Notification Dropdown */
    .notification-dropdown {
      width: 360px;
      background: #fff;
      border-radius: 12px;
      box-shadow: var(--shadow-xl);
      overflow: hidden;
    }

    .notification-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border);

      span {
        font-weight: 600;
        font-size: 15px;
        color: var(--color-text-primary);
      }

      a {
        font-size: 13px;
        color: var(--color-primary-light);
        cursor: pointer;

        &:hover {
          color: var(--color-primary);
        }
      }
    }

    .notification-list {
      max-height: 360px;
      overflow-y: auto;
    }

    .notification-item {
      display: flex;
      gap: 12px;
      padding: 14px 20px;
      cursor: pointer;
      transition: background 0.2s ease;

      &:hover {
        background: var(--color-bg-tertiary);
      }

      &.unread {
        background: var(--color-primary-50);

        &:hover {
          background: var(--color-primary-100);
        }
      }
    }

    .notification-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.info {
        background: var(--color-info-bg);
        color: var(--color-info);
      }

      &.success {
        background: var(--color-success-bg);
        color: var(--color-success);
      }

      &.warning {
        background: var(--color-warning-bg);
        color: var(--color-warning);
      }
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-text {
      margin: 0;
      font-size: 14px;
      color: var(--color-text-primary);
      line-height: 1.5;
    }

    .notification-time {
      font-size: 12px;
      color: var(--color-text-tertiary);
    }

    .notification-footer {
      padding: 12px 20px;
      border-top: 1px solid var(--color-border);
      text-align: center;

      a {
        font-size: 14px;
        color: var(--color-primary-light);
        font-weight: 500;

        &:hover {
          color: var(--color-primary);
        }
      }
    }

    /* User Dropdown */
    .user-dropdown-menu {
      width: 260px;
      padding: 8px !important;
    }

    .user-dropdown-header {
      padding: 12px !important;
      cursor: default !important;

      &:hover {
        background: transparent !important;
      }
    }

    .dropdown-user-info {
      display: flex;
      align-items: center;
      gap: 12px;

      div {
        display: flex;
        flex-direction: column;
        line-height: 1.4;

        strong {
          font-size: 15px;
          color: var(--color-text-primary);
        }

        span {
          font-size: 13px;
          color: var(--color-text-secondary);
        }
      }
    }

    .logout-item {
      color: var(--color-error) !important;

      &:hover {
        background: var(--color-error-bg) !important;
      }
    }

    /* ===== Content ===== */
    .app-content {
      background: var(--color-bg-primary);
      flex: 1;
      overflow-y: auto;
    }

    .content-wrapper {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* ===== Responsive ===== */
    @media (max-width: 991px) {
      .main-area {
        margin-left: 64px;
      }
    }

    @media (max-width: 767px) {
      .main-area {
        margin-left: 0;
      }

      .content-wrapper {
        padding: 16px;
      }

      .hide-mobile {
        display: none !important;
      }

      .user-profile {
        padding: 6px;
      }

      .notification-dropdown {
        width: calc(100vw - 32px);
        max-width: 360px;
      }
    }
  `],
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  isCollapsed = false;

  userInitial = computed(() =>
    this.authService.user()?.full_name?.charAt(0).toUpperCase() || 'U'
  );

  constructor(
    public authService: AuthService,
    public notificationSvc: NotificationService,
  ) {}

  ngOnInit(): void {
    this.notificationSvc.connect();
  }

  ngOnDestroy(): void {
    this.notificationSvc.disconnect();
  }

  getRoleLabel(): string {
    const role = this.authService.user()?.role;
    const labels: Record<string, string> = {
      admin: 'Quản trị viên',
      leader: 'Trưởng phòng',
      recruiter: 'Nhân viên tuyển dụng',
    };
    return labels[role || ''] || 'Người dùng';
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      application: 'file-text',
      job: 'solution',
      interview: 'calendar',
      system: 'info-circle',
    };
    return icons[type] || 'bell';
  }

  onNotificationClick(notif: any): void {
    if (!notif.is_read) {
      this.notificationSvc.markAsRead(notif.id);
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
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  }

  logout(): void {
    this.notificationSvc.disconnect();
    this.authService.logout();
  }
}
