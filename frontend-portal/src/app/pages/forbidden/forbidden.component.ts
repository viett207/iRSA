import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule, RouterModule, NzButtonModule, NzIconModule],
  template: `
    <div class="forbidden-page">
      <div class="forbidden-card">
        <!-- Visual SVG Illustration -->
        <div class="illustration-wrapper">
          <div class="ambient-glow"></div>
          <svg class="illustration-svg" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Background Elements -->
            <circle cx="32" cy="40" r="12" fill="var(--color-danger)" fill-opacity="0.12" class="float-slow" />
            <circle cx="168" cy="44" r="14" fill="var(--color-warning)" fill-opacity="0.15" class="float-fast" />
            
            <!-- Ground Line -->
            <path d="M20 142H180" stroke="var(--color-border)" stroke-width="2" stroke-linecap="round" stroke-dasharray="6 6"/>

            <!-- Shield Shape -->
            <g class="shield-group">
              <path
                d="M100 24L144 44V88C144 116 100 136 100 136C100 136 56 116 56 88V44L100 24Z"
                fill="var(--color-danger-bg, #fef2f2)"
                stroke="var(--color-danger)"
                stroke-width="3"
                stroke-linejoin="round"
              />
              <path
                d="M100 36L134 52V86C134 108 100 124 100 124C100 124 66 108 66 86V52L100 36Z"
                fill="var(--color-danger)"
                fill-opacity="0.08"
              />
              
              <!-- Lock Icon in Shield -->
              <!-- Lock Shackle -->
              <path
                d="M90 74V64C90 58.4772 94.4772 54 100 54C105.523 54 110 58.4772 110 64V74"
                stroke="var(--color-danger)"
                stroke-width="3"
                stroke-linecap="round"
              />
              <!-- Lock Body -->
              <rect
                x="84"
                y="74"
                width="32"
                height="24"
                rx="5"
                fill="var(--color-danger)"
              />
              <!-- Keyhole -->
              <circle cx="100" cy="84" r="2.5" fill="white" />
              <path d="M100 86V91" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </g>
          </svg>
        </div>

        <div class="status-code">403</div>
        <h1 class="forbidden-title">Quyền truy cập bị từ chối</h1>
        <p class="forbidden-desc">
          Tài khoản của bạn không có đủ thẩm quyền cần thiết để truy cập vào tài nguyên hoặc chức năng này.
          Nếu bạn cần quyền truy cập, vui lòng liên hệ Quản trị viên hệ thống để được hỗ trợ.
        </p>

        @if (authService.user(); as user) {
          <div class="user-badge">
            <span class="badge-label">Tài khoản hiện tại:</span>
            <strong class="user-email">{{ user.email }}</strong>
            <span class="role-tag">{{ getRoleLabel(user.role) }}</span>
          </div>
        }

        <div class="forbidden-actions">
          <button
            nz-button
            nzType="primary"
            nzSize="large"
            class="action-btn-primary"
            routerLink="/"
          >
            <span nz-icon nzType="home" nzTheme="outline"></span>
            <span>Quay lại trang chủ</span>
          </button>

          <button
            nz-button
            nzSize="large"
            class="action-btn-default"
            (click)="goBack()"
          >
            <span nz-icon nzType="arrow-left" nzTheme="outline"></span>
            <span>Quay lại trang trước đó</span>
          </button>

          @if (authService.isAuthenticated()) {
            <button
              nz-button
              nzType="text"
              class="switch-account-btn"
              (click)="logoutAndSwitchAccount()"
            >
              <span nz-icon nzType="logout" nzTheme="outline"></span>
              <span>Đăng nhập tài khoản khác</span>
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .forbidden-page {
        min-height: calc(100vh - 160px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-8) var(--space-4);
        background-color: var(--color-bg-primary);
      }

      .forbidden-card {
        background: var(--color-bg-secondary);
        border-radius: var(--radius-2xl);
        box-shadow: var(--shadow-2xl);
        border: 1px solid var(--color-border);
        padding: 48px 36px;
        width: 100%;
        max-width: 540px;
        text-align: center;
        position: relative;
        overflow: hidden;

        @media (max-width: 576px) {
          padding: 32px 20px;
        }
      }

      .illustration-wrapper {
        width: 100%;
        max-width: 220px;
        height: 160px;
        margin: 0 auto 12px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .ambient-glow {
        position: absolute;
        width: 160px;
        height: 120px;
        border-radius: 50%;
        background: var(--color-danger);
        opacity: 0.08;
        filter: blur(28px);
        pointer-events: none;
      }

      .illustration-svg {
        width: 100%;
        height: 100%;
      }

      .float-slow {
        animation: float 3.5s ease-in-out infinite;
      }

      .float-fast {
        animation: float 2.4s ease-in-out infinite reverse;
      }

      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }

      .shield-group {
        animation: shield-pulse 3s ease-in-out infinite;
        transform-origin: 100px 80px;
      }

      @keyframes shield-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.04); }
      }

      .status-code {
        font-family: var(--font-heading);
        font-size: var(--text-5xl);
        font-weight: var(--font-extrabold);
        color: var(--color-danger, #ef4444);
        line-height: 1;
        margin-bottom: 8px;
        letter-spacing: 3px;
      }

      .forbidden-title {
        font-family: var(--font-heading);
        font-size: var(--text-2xl);
        font-weight: var(--font-bold);
        color: var(--color-text-primary);
        margin-bottom: 12px;
      }

      .forbidden-desc {
        color: var(--color-text-secondary);
        font-size: var(--text-sm);
        line-height: var(--leading-relaxed);
        margin-bottom: 20px;
      }

      .user-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: var(--color-bg-tertiary, #f8fafc);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-full);
        padding: 6px 16px;
        font-size: var(--text-xs);
        margin-bottom: 24px;
        flex-wrap: wrap;
        justify-content: center;

        .badge-label {
          color: var(--color-text-tertiary);
        }

        .user-email {
          color: var(--color-text-primary);
        }

        .role-tag {
          background: var(--color-primary-50, #eff6ff);
          color: var(--color-primary);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-weight: var(--font-semibold);
          font-size: 11px;
        }
      }

      .forbidden-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .action-btn-primary {
        height: 48px !important;
        border-radius: var(--radius-lg) !important;
        font-weight: var(--font-semibold) !important;
        font-size: var(--text-base) !important;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .action-btn-default {
        height: 44px !important;
        border-radius: var(--radius-lg) !important;
        font-weight: var(--font-medium) !important;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .switch-account-btn {
        color: var(--color-text-tertiary) !important;
        font-size: var(--text-xs) !important;
        margin-top: 4px;

        &:hover {
          color: var(--color-primary) !important;
        }
      }
    `,
  ],
})
export class ForbiddenComponent {
  readonly authService = inject(AuthService);
  private readonly location = inject(Location);

  getRoleLabel(role?: string): string {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'hr_manager': return 'HR Manager';
      case 'recruiter': return 'Recruiter';
      case 'interviewer': return 'Interviewer';
      case 'candidate': return 'Ứng viên';
      default: return role || 'Khách';
    }
  }

  goBack(): void {
    this.location.back();
  }

  logoutAndSwitchAccount(): void {
    this.authService.logout();
  }
}
