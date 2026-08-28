import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { ToastService } from '../../core/services/toast.service';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';

import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TranslateModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCheckboxModule,
    NzIconModule,
    NzDividerModule,
    NzModalModule,
    NzAlertModule,
    FocusTrapDirective,
  ],
  template: `
    <div class="auth-page">
      <div class="auth-container">
        <!-- Left Side - Branding -->
        <div class="auth-branding hide-mobile">
          <div class="branding-decorations" aria-hidden="true">
            <div class="glow-orb glow-orb-1"></div>
            <div class="glow-orb glow-orb-2"></div>
            <div class="glow-orb glow-orb-3"></div>
            <svg class="tech-pattern" width="100%" height="100%" viewBox="0 0 500 600" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="net-grad-top" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#0284c7" stop-opacity="0.45"/>
                  <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.25"/>
                </linearGradient>
                <linearGradient id="net-grad-bot" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.4"/>
                  <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.25"/>
                </linearGradient>
                <filter id="glow-dot" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <!-- Top Network Cluster (Above Text Area) -->
              <path d="M 35 55 L 120 100 L 230 60 L 360 95 L 465 45" stroke="url(#net-grad-top)" stroke-width="1.2" stroke-dasharray="4 4"/>
              <path d="M 120 100 L 190 35 L 290 75 L 360 95" stroke="url(#net-grad-top)" stroke-width="1.2"/>
              <path d="M 35 55 L 85 20 L 190 35" stroke="url(#net-grad-top)" stroke-width="1"/>

              <circle cx="35" cy="55" r="3.5" fill="#38bdf8" filter="url(#glow-dot)"/>
              <circle cx="85" cy="20" r="3" fill="#60a5fa"/>
              <circle cx="120" cy="100" r="4.5" fill="#38bdf8" filter="url(#glow-dot)"/>
              <circle cx="190" cy="35" r="4" fill="#93c5fd"/>
              <circle cx="230" cy="60" r="3.5" fill="#38bdf8"/>
              <circle cx="290" cy="75" r="4" fill="#60a5fa" filter="url(#glow-dot)"/>
              <circle cx="360" cy="95" r="4.5" fill="#38bdf8" filter="url(#glow-dot)"/>
              <circle cx="465" cy="45" r="3.5" fill="#818cf8"/>

              <!-- Top Decorative Orbit & Sparkle -->
              <circle cx="440" cy="70" r="65" stroke="rgba(37, 99, 235, 0.14)" stroke-width="1.5" stroke-dasharray="6 6"/>
              <g transform="translate(425, 90) scale(0.8)" stroke="rgba(37, 99, 235, 0.25)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </g>

              <!-- Outer Margins Light Accents -->
              <circle cx="20" cy="260" r="3" fill="#38bdf8" filter="url(#glow-dot)"/>
              <circle cx="480" cy="280" r="3" fill="#60a5fa" filter="url(#glow-dot)"/>
              <g transform="translate(455, 230) scale(0.8)" stroke="rgba(2, 132, 199, 0.22)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </g>

              <!-- Bottom Network Cluster (Below Text Area) -->
              <path d="M 35 480 L 125 530 L 235 475 L 365 525 L 465 470" stroke="url(#net-grad-bot)" stroke-width="1.2" stroke-dasharray="5 5"/>
              <path d="M 125 530 L 210 565 L 320 545 L 435 565" stroke="url(#net-grad-bot)" stroke-width="1.2"/>
              <path d="M 235 475 L 320 545" stroke="url(#net-grad-bot)" stroke-width="1"/>

              <circle cx="35" cy="480" r="3.5" fill="#38bdf8" filter="url(#glow-dot)"/>
              <circle cx="125" cy="530" r="4.5" fill="#60a5fa" filter="url(#glow-dot)"/>
              <circle cx="210" cy="565" r="3" fill="#93c5fd"/>
              <circle cx="235" cy="475" r="4" fill="#38bdf8"/>
              <circle cx="320" cy="545" r="4" fill="#60a5fa" filter="url(#glow-dot)"/>
              <circle cx="365" cy="525" r="4.5" fill="#38bdf8" filter="url(#glow-dot)"/>
              <circle cx="435" cy="565" r="3.5" fill="#818cf8"/>
              <circle cx="465" cy="470" r="3.5" fill="#38bdf8"/>

              <!-- Bottom Decorative Orbit & Icons -->
              <circle cx="75" cy="535" r="70" stroke="rgba(2, 132, 199, 0.15)" stroke-width="1.5"/>
              <g transform="translate(25, 455) scale(0.85)" stroke="rgba(30, 64, 175, 0.25)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                <path d="M12 12v.01"/>
              </g>
              <g transform="translate(445, 455) scale(0.85)" stroke="rgba(2, 132, 199, 0.25)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </g>
            </svg>
          </div>
          <div class="branding-content">
            <div class="brand-logo">
              <div class="brand-logo-badge">
                <span nz-icon nzType="thunderbolt" nzTheme="fill"></span>
              </div>
              <span>iRSA</span>
            </div>
            <h2>Chào mừng bạn trở lại!</h2>
            <p>
              Đăng nhập để tiếp tục ứng tuyển và khám phá hàng ngàn cơ hội việc làm hấp dẫn.
            </p>
          </div>
        </div>

        <!-- Right Side - Login Form -->
        <div class="auth-form-section">
          <div class="auth-card">
            <div class="auth-header">
              <div class="auth-logo show-mobile-only">
                <span nz-icon nzType="thunderbolt" nzTheme="fill"></span>
                <span>iRSA</span>
              </div>
              <h1 class="auth-title">Đăng nhập</h1>
              <p class="auth-subtitle">
                Nhập thông tin tài khoản của bạn để tiếp tục
              </p>
            </div>

            <!-- Social Login -->
            <div class="social-login">
              <button
                nz-button
                nzBlock
                class="social-btn google"
                type="button"
                [nzLoading]="googleLoading"
                [disabled]="googleLoading || loading"
                (click)="onGoogleLogin()"
              >
                <svg class="google-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Tiếp tục với Google
              </button>
            </div>

            <div class="auth-divider">
              <nz-divider nzText="Hoặc đăng nhập bằng email"></nz-divider>
            </div>

            <!-- Login Form -->
            <form nz-form [formGroup]="loginForm" (ngSubmit)="onSubmit()" nzLayout="vertical">
              <nz-form-item>
                <nz-form-label nzRequired nzFor="login-email">Email</nz-form-label>
                <nz-form-control nzErrorTip="Vui lòng nhập địa chỉ email hợp lệ!">
                  <nz-input-group [nzPrefix]="emailIcon" nzSize="large">
                    <input
                      id="login-email"
                      type="email"
                      nz-input
                      formControlName="email"
                      placeholder="name@example.com"
                      autocomplete="email"
                      aria-required="true"
                    />
                  </nz-input-group>
                  <ng-template #emailIcon>
                    <span nz-icon nzType="mail" nzTheme="outline" aria-hidden="true"></span>
                  </ng-template>
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label nzRequired nzFor="login-password">Mật khẩu</nz-form-label>
                <nz-form-control nzErrorTip="Vui lòng nhập mật khẩu (tối thiểu 8 ký tự)!">
                  <nz-input-group [nzPrefix]="passwordIcon" [nzSuffix]="passwordSuffix" nzSize="large">
                    <input
                      id="login-password"
                      [type]="showPassword ? 'text' : 'password'"
                      nz-input
                      formControlName="password"
                      placeholder="••••••••"
                      autocomplete="current-password"
                      aria-required="true"
                    />
                  </nz-input-group>
                  <ng-template #passwordIcon>
                    <span nz-icon nzType="lock" nzTheme="outline" aria-hidden="true"></span>
                  </ng-template>
                  <ng-template #passwordSuffix>
                    <span
                      nz-icon
                      [nzType]="showPassword ? 'eye' : 'eye-invisible'"
                      nzTheme="outline"
                      class="password-toggle"
                      role="button"
                      tabindex="0"
                      (click)="showPassword = !showPassword"
                    ></span>
                  </ng-template>
                </nz-form-control>
              </nz-form-item>

              <div class="form-options">
                <label nz-checkbox formControlName="remember">Ghi nhớ đăng nhập</label>
                <a routerLink="/forgot-password" class="forgot-link">Quên mật khẩu?</a>
              </div>

              <button
                nz-button
                nzType="primary"
                nzBlock
                nzSize="large"
                [nzLoading]="loading"
                type="submit"
                class="submit-btn"
              >
                Đăng nhập
              </button>
            </form>

            <div class="auth-footer">
              Chưa có tài khoản?
              <a routerLink="/register">Đăng ký ngay</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Email Verification Modal -->
    <nz-modal
      [(nzVisible)]="showVerifyModal"
      nzTitle="Email chưa được xác thực"
      [nzFooter]="null"
      [nzClosable]="true"
      [nzKeyboard]="true"
      (nzOnCancel)="closeVerifyModal()"
      nzWidth="460px"
    >
      <ng-container *nzModalContent>
        <div
          class="verify-modal-body"
          appFocusTrap
          (escapePressed)="closeVerifyModal()"
          role="dialog"
          aria-modal="true"
          aria-label="Cửa sổ thông báo xác thực email"
        >
          <div class="verify-icon" aria-hidden="true">
            <span nz-icon nzType="mail" nzTheme="outline"></span>
          </div>
          <p class="verify-desc">
            Tài khoản <strong>{{ unverifiedEmail }}</strong> chưa được xác thực email.
            Vui lòng kiểm tra hộp thư và nhấn vào link xác thực để sử dụng tài khoản.
          </p>

          @if (verifyMessage) {
            <nz-alert
              [nzType]="verifyMessageType"
              [nzMessage]="verifyMessage"
              nzShowIcon
              class="verify-alert"
              role="alert"
              aria-live="polite"
            ></nz-alert>
          }

          <div class="verify-actions">
            <button
              nz-button
              nzType="primary"
              nzBlock
              nzSize="large"
              [nzLoading]="sendingVerify"
              (click)="resendVerification()"
              aria-label="Gửi lại email xác thực tài khoản"
            >
              <span nz-icon nzType="send" nzTheme="outline" aria-hidden="true"></span>
              Gửi lại email xác thực
            </button>
            <button nz-button nzBlock (click)="logoutAndClose()" aria-label="Đăng xuất khỏi phiên hiện tại">
              <span nz-icon nzType="logout" nzTheme="outline" aria-hidden="true"></span>
              Đăng xuất
            </button>
          </div>
          <p class="verify-hint">Không nhận được email? Kiểm tra thư mục spam.</p>
        </div>
      </ng-container>
    </nz-modal>
  `,
  styles: [
    `
      .auth-page {
        min-height: calc(100vh - 140px);
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: clamp(28px, 5vh, 56px) 16px;
        position: relative;
      }

      .auth-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        max-width: 980px;
        min-height: 580px;
        width: 100%;
        background: #ffffff;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 16px 40px -12px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.05);
        border: 1px solid var(--color-border);
        position: relative;
        z-index: 1;
      }

      /* Branding Section (Left Column) */
      .auth-branding {
        background: radial-gradient(circle at 10% 15%, rgba(56, 189, 248, 0.22) 0%, transparent 50%),
                    radial-gradient(circle at 90% 85%, rgba(59, 130, 246, 0.16) 0%, transparent 50%),
                    linear-gradient(150deg, #f0f7ff 0%, #e0f2fe 35%, #dbeafe 70%, #bfdbfe 100%);
        padding: clamp(36px, 5vh, 52px);
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
        overflow: hidden;
        color: var(--color-text-primary);
        border-right: 1px solid rgba(191, 219, 254, 0.6);
      }

      .branding-decorations {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 0;
      }

      .glow-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(50px);
        pointer-events: none;
      }

      .glow-orb-1 {
        width: 220px;
        height: 220px;
        top: -30px;
        right: -20px;
        background: radial-gradient(circle, rgba(56, 189, 248, 0.28) 0%, transparent 70%);
      }

      .glow-orb-2 {
        width: 220px;
        height: 220px;
        bottom: -30px;
        left: -20px;
        background: radial-gradient(circle, rgba(96, 165, 250, 0.24) 0%, transparent 70%);
      }

      .glow-orb-3 {
        width: 160px;
        height: 160px;
        top: 8%;
        left: 8%;
        background: radial-gradient(circle, rgba(186, 230, 253, 0.3) 0%, transparent 70%);
      }

      .tech-pattern {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0.75;
        z-index: 0;
        pointer-events: none;
      }

      .branding-content {
        position: relative;
        z-index: 2;
      }

      .brand-logo {
        display: inline-flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 28px;

        span:last-child {
          font-family: var(--font-heading);
          font-size: 28px;
          font-weight: 800;
          color: var(--color-primary);
          letter-spacing: -0.02em;
        }
      }

      .brand-logo-badge {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: #ffffff;
        border: 1px solid rgba(59, 130, 246, 0.18);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(15, 82, 186, 0.12), 0 1px 2px rgba(15, 82, 186, 0.08);

        span {
          font-size: 26px;
          color: var(--color-primary);
          filter: drop-shadow(0 2px 6px rgba(15, 82, 186, 0.25));
        }
      }

      .branding-content h2 {
        font-family: var(--font-heading);
        font-size: clamp(24px, 2.4vw, 30px);
        font-weight: 700;
        margin: 0 0 14px 0;
        color: var(--color-text-primary);
        line-height: 1.3;
        letter-spacing: -0.01em;
      }

      .branding-content p {
        font-size: 15px;
        line-height: 1.65;
        color: var(--color-text-secondary);
        margin: 0;
        max-width: 380px;
        font-weight: 400;
      }

      /* Form Section (Right Column) - Light White-Blue Container */
      .auth-form-section {
        padding: clamp(24px, 4vh, 40px) clamp(20px, 3.5vw, 36px);
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at 90% 10%, rgba(56, 189, 248, 0.14) 0%, transparent 45%),
                    radial-gradient(circle at 50% 95%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                    radial-gradient(circle at 95% 50%, rgba(224, 242, 254, 0.25) 0%, transparent 40%),
                    linear-gradient(145deg, #f8fbff 0%, #f0f7ff 50%, #e6f2fe 100%);
        position: relative;
        overflow: hidden;
      }

      .auth-card {
        width: 100%;
        max-width: 375px;
        margin: 0 auto;
        padding: clamp(26px, 3.5vh, 32px) clamp(22px, 3vw, 28px);
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.85);
        border-radius: 16px;
        box-shadow: 0 12px 32px -8px rgba(15, 23, 42, 0.06), 0 0 1px 1px rgba(255, 255, 255, 0.6), inset 0 1px 1px 0 rgba(255, 255, 255, 0.9);
        transition: all var(--transition-normal);
        position: relative;
        z-index: 1;
      }

      .auth-header {
        text-align: center;
        margin-bottom: 18px;
      }

      .auth-logo.show-mobile-only {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-family: var(--font-heading);
        font-size: 22px;
        font-weight: 800;
        color: var(--color-primary);
        margin-bottom: 14px;

        span:first-child {
          font-size: 24px;
        }
      }

      .auth-title {
        font-family: var(--font-heading);
        font-size: 24px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0 0 4px 0;
        letter-spacing: -0.01em;
      }

      .auth-subtitle {
        color: var(--color-text-secondary);
        font-size: 13.5px;
        margin: 0;
        line-height: 1.4;
      }

      /* Social Login */
      .social-login {
        margin-bottom: 2px;
      }

      .social-btn {
        height: 44px !important;
        width: 100% !important;
        border-radius: 10px !important;
        font-weight: 500 !important;
        font-size: 14px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 9px !important;
        border: 1px solid rgba(255, 255, 255, 0.8) !important;
        color: var(--color-text-primary) !important;
        background: rgba(255, 255, 255, 0.6) !important;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        box-shadow: 0 1px 3px rgba(15, 82, 186, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.85);
        transition: all var(--transition-fast) !important;

        &.google {
          .google-icon,
          svg {
            width: 18px;
            height: 18px;
            min-width: 18px;
            min-height: 18px;
            flex-shrink: 0;
            display: inline-block;
            vertical-align: middle;
          }

          &:hover {
            border-color: rgba(59, 130, 246, 0.35) !important;
            color: var(--color-primary) !important;
            background: rgba(255, 255, 255, 0.88) !important;
            box-shadow: 0 4px 12px rgba(15, 82, 186, 0.08) !important;
          }
        }
      }

      .auth-divider {
        margin: 14px 0 16px 0;

        ::ng-deep .ant-divider-inner-text {
          color: var(--color-text-tertiary);
          font-size: 12.5px;
          font-weight: 400;
          padding: 0 10px;
        }

        ::ng-deep .ant-divider-horizontal::before,
        ::ng-deep .ant-divider-horizontal::after {
          border-top-color: rgba(203, 213, 225, 0.5) !important;
        }
      }

      /* Form Styles */
      ::ng-deep {
        .ant-form-item {
          margin-bottom: 14px;
        }

        .ant-form-item-label > label {
          font-weight: 500;
          font-size: 13px;
          color: var(--color-text-primary);
          height: auto;
          margin-bottom: 3px;
        }

        .ant-input-affix-wrapper-lg {
          height: 44px !important;
          padding: 0 12px !important;
          border-radius: 10px !important;
          border: 1px solid rgba(203, 213, 225, 0.65);
          font-size: 13.5px;
          transition: all var(--transition-fast);
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.02);

          &:hover {
            border-color: rgba(59, 130, 246, 0.4) !important;
            background: rgba(255, 255, 255, 0.82);
          }

          &-focused {
            border-color: var(--color-primary) !important;
            background: rgba(255, 255, 255, 0.95) !important;
            box-shadow: 0 0 0 3px rgba(15, 82, 186, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.8) !important;
          }

          .ant-input-prefix {
            margin-right: 8px;
            color: var(--color-text-tertiary);
            font-size: 15px;
          }

          input.ant-input {
            font-size: 13.5px;
            background: transparent;
            color: var(--color-text-primary);
          }
        }

        .ant-form-item-explain-error {
          font-size: 11.5px;
          margin-top: 3px;
        }
      }

      .password-toggle {
        cursor: pointer;
        color: var(--color-text-tertiary);
        font-size: 15px;
        transition: color var(--transition-fast);

        &:hover {
          color: var(--color-text-primary);
        }
      }

      .form-options {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 2px 0 16px 0;
        font-size: 13px;
        white-space: nowrap;

        ::ng-deep .ant-checkbox-wrapper {
          font-size: 13px;
          color: var(--color-text-secondary);
          font-weight: 400;
          white-space: nowrap;
        }
      }

      .forgot-link {
        font-size: 13px;
        color: var(--color-primary);
        font-weight: 500;
        white-space: nowrap;
        transition: color var(--transition-fast);

        &:hover {
          color: var(--color-primary-dark);
          text-decoration: underline;
        }
      }

      .submit-btn {
        height: 44px !important;
        width: 100% !important;
        border-radius: 10px !important;
        font-weight: 600 !important;
        font-size: 14.5px !important;
        background: linear-gradient(135deg, #1d4ed8 0%, #0f52ba 100%) !important;
        border: none !important;
        color: #ffffff !important;
        box-shadow: 0 4px 14px rgba(15, 82, 186, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
        transition: all var(--transition-fast) !important;

        &:hover {
          background: linear-gradient(135deg, #1e40af 0%, #0a387e 100%) !important;
          box-shadow: 0 6px 18px rgba(15, 82, 186, 0.38) !important;
          transform: translateY(-1px);
        }

        &:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(15, 82, 186, 0.25) !important;
        }
      }

      .auth-footer {
        text-align: center;
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid rgba(226, 232, 240, 0.5);
        color: var(--color-text-secondary);
        font-size: 13px;

        a {
          color: var(--color-primary);
          font-weight: 600;
          margin-left: 5px;
          transition: color var(--transition-fast);

          &:hover {
            color: var(--color-primary-dark);
            text-decoration: underline;
          }
        }
      }

      /* Dark Mode Compatibility */
      :host-context(.dark) {
        .auth-page {
          background: var(--color-bg-primary);
        }

        .auth-container {
          background: var(--color-bg-secondary);
        }

        .auth-form-section {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.3) 0%, rgba(30, 41, 59, 0.4) 100%);
        }

        .auth-card {
          background: rgba(15, 23, 42, 0.55);
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .social-btn.google {
          background: rgba(30, 41, 59, 0.55) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          color: #e2e8f0 !important;

          &:hover {
            background: rgba(30, 41, 59, 0.8) !important;
            border-color: var(--color-primary-light) !important;
          }
        }

        .ant-input-affix-wrapper-lg {
          background: rgba(15, 23, 42, 0.5) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;

          input.ant-input {
            color: #f1f5f9 !important;
          }

          &:hover {
            border-color: var(--color-primary-light) !important;
            background: rgba(15, 23, 42, 0.65) !important;
          }

          &-focused {
            background: rgba(15, 23, 42, 0.8) !important;
            border-color: var(--color-primary) !important;
          }
        }

        .auth-divider {
          ::ng-deep .ant-divider-horizontal::before,
          ::ng-deep .ant-divider-horizontal::after {
            border-top-color: rgba(255, 255, 255, 0.08) !important;
          }
        }

        .auth-footer {
          border-top-color: rgba(255, 255, 255, 0.08);
        }
      }

      /* Responsive */
      @media (max-width: 850px) {
        .auth-container {
          grid-template-columns: 1fr;
          max-width: 440px;
          border-radius: 18px;
        }

        .hide-mobile {
          display: none !important;
        }

        .show-mobile-only {
          display: flex !important;
        }

        .auth-form-section {
          padding: 24px 16px;
        }

        .auth-card {
          padding: 24px 18px;
          border-radius: 14px;
        }
      }

      @media (min-width: 851px) and (max-width: 1024px) {
        .tech-pattern {
          opacity: 0.45;
        }
      }

      @media (min-width: 851px) {
        .show-mobile-only {
          display: none !important;
        }
      }

      /* Verification Modal */
      .verify-modal-body {
        text-align: center;
        padding: 8px 0;
      }

      .verify-icon {
        font-size: 48px;
        color: var(--color-primary);
        margin-bottom: 16px;
      }

      .verify-alert {
        margin-bottom: 16px;
        text-align: left;
      }

      .verify-desc {
        font-size: var(--text-base);
        color: var(--color-text-secondary);
        margin-bottom: 24px;
        line-height: 1.6;
      }

      .verify-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 16px;
      }

      .verify-hint {
        font-size: var(--text-xs);
        color: var(--color-text-tertiary);
        margin: 0;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly destroyRef = inject(DestroyRef);
  loginForm: FormGroup;
  loading = false;
  googleLoading = false;
  showPassword = false;

  // Verification modal
  showVerifyModal = false;
  sendingVerify = false;
  unverifiedEmail = '';
  verifyMessage = '';
  verifyMessageType: 'success' | 'error' = 'success';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private message: ToastService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      remember: [true],
    });
  }

  onGoogleLogin(): void {
    if (this.googleLoading || this.loading) return;
    this.googleLoading = true;

    this.authService.initiateGoogleSignIn().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (user) => {
        this.googleLoading = false;
        this.message.success('Đăng nhập thành công');
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl && returnUrl !== '/login') {
          this.router.navigateByUrl(returnUrl);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err: unknown) => {
        this.googleLoading = false;
        if (err instanceof HttpErrorResponse) {
          this.message.errorFromHttp(err, this.getLoginErrorMessage(err), true);
        } else {
          const errMsg = (err as Error)?.message || '';
          if (
            errMsg.includes('popup_closed') ||
            errMsg.includes('user_cancel') ||
            errMsg.includes('access_denied') ||
            errMsg.includes('closed_by_user')
          ) {
          } else if (
            errMsg.toLowerCase().includes('client id') ||
            errMsg.toLowerCase().includes('client_id') ||
            errMsg.toLowerCase().includes('googleclientid') ||
            errMsg.includes('YOUR_GOOGLE_CLIENT_ID')
          ) {
            this.message.warning('Chưa cấu hình Google Client ID. Vui lòng cấu hình googleClientId trong environment.ts.');
          } else {
            this.message.error(errMsg || 'Đăng nhập với Google không thành công. Vui lòng thử lại.');
          }
        }
      },
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      Object.values(this.loginForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity();
        }
      });
      return;
    }

    this.loading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (user) => {
        this.loading = false;
        if (!user.email_verified) {
          this.unverifiedEmail = user.email;
          this.showVerifyModal = true;
        } else {
          this.message.success('Đăng nhập thành công');
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          if (returnUrl && returnUrl !== '/login') {
            this.router.navigateByUrl(returnUrl);
          } else {
            this.router.navigate(['/']);
          }
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        const code = err.error?.detail?.code;
        if (code === 'EMAIL_NOT_VERIFIED') {
          this.unverifiedEmail = email;
          this.verifyMessage = '';
          this.showVerifyModal = true;
          return;
        }
        this.message.errorFromHttp(err, this.getLoginErrorMessage(err), true);
      },
    });
  }

  private getLoginErrorMessage(err: HttpErrorResponse): string {
    const detail = err.error?.detail;
    const code = typeof detail === 'object' ? detail?.code : undefined;
    const messages: Record<string, string> = {
      INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra và thử lại.',
      ACCOUNT_PENDING_APPROVAL: 'Tài khoản đang chờ quản trị viên phê duyệt.',
      ACCOUNT_REJECTED: 'Yêu cầu đăng ký tài khoản đã bị từ chối. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
      ACCOUNT_DEACTIVATED: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.',
    };
    if (code && messages[code]) {
      return messages[code];
    }
    const message = typeof detail === 'string' ? detail : detail?.message;
    return message || 'Đăng nhập không thành công. Vui lòng thử lại.';
  }

  resendVerification(): void {
    if (!this.unverifiedEmail) return;
    this.sendingVerify = true;
    this.verifyMessage = '';

    this.authService.resendVerification(this.unverifiedEmail).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.sendingVerify = false;
        this.verifyMessageType = 'success';
        this.verifyMessage = res.message || 'Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.';
      },
      error: (err: HttpErrorResponse) => {
        this.sendingVerify = false;
        this.verifyMessageType = 'error';
        const msg = err.error?.detail;
        this.verifyMessage = typeof msg === 'string' ? msg : 'Không thể gửi email xác thực. Vui lòng thử lại sau.';
      },
    });
  }

  closeVerifyModal(): void {
    this.showVerifyModal = false;
    this.verifyMessage = '';
  }

  logoutAndClose(): void {
    this.closeVerifyModal();
    this.authService.logout();
  }
}
