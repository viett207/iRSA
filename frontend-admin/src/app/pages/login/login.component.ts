import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCheckboxModule,
    NzIconModule,
    RouterModule,
  ],
  template: `
    <main class="login-page" aria-label="Đăng nhập quản trị iRSA">
      <!-- Left Panel: Branding -->
      <div class="branding-panel">
        <div class="branding-content">
          <!-- Logo -->
          <div class="brand-logo">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="12" fill="white" fill-opacity="0.15"/>
              <path d="M12 15h9v18h-9V15zm15 0h9v18h-9V15z" fill="white"/>
              <circle cx="16.5" cy="24" r="3" fill="rgba(255,255,255,0.3)"/>
              <circle cx="31.5" cy="24" r="3" fill="rgba(255,255,255,0.3)"/>
            </svg>
            <div class="brand-text">
              <span class="brand-name">iRSA</span>
              <span class="brand-tagline">HR Admin</span>
            </div>
          </div>

          <!-- Hero Text -->
          <div class="hero-section">
            <h1 class="hero-title">
              Hệ thống tuyển dụng<br/>
              <span class="highlight">thông minh</span>
            </h1>
            <p class="hero-description">
              Quản lý tin tuyển dụng, sàng lọc ứng viên tự động với AI,
              và theo dõi quy trình tuyển dụng hiệu quả.
            </p>
          </div>

          <!-- Features List -->
          <div class="features-list">
            <div class="feature-item">
              <span class="feature-icon">
                <span nz-icon nzType="robot" nzTheme="outline"></span>
              </span>
              <div class="feature-text">
                <strong>Sàng lọc AI</strong>
                <span>Tự động đánh giá và xếp hạng ứng viên</span>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">
                <span nz-icon nzType="dashboard" nzTheme="outline"></span>
              </span>
              <div class="feature-text">
                <strong>Báo cáo thông minh</strong>
                <span>Theo dõi hiệu quả tuyển dụng theo thời gian thực</span>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">
                <span nz-icon nzType="safety" nzTheme="outline"></span>
              </span>
              <div class="feature-text">
                <strong>Bảo mật cao</strong>
                <span>Dữ liệu được mã hóa và bảo vệ an toàn</span>
              </div>
            </div>
          </div>
        </div>

        <div class="workflow-visual" aria-hidden="true">
          <svg viewBox="0 0 520 230" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle class="workflow-halo workflow-halo--large" cx="296" cy="108" r="88" />
            <circle class="workflow-halo workflow-halo--small" cx="108" cy="150" r="46" />

            <path class="workflow-route" d="M132 154C182 154 178 102 240 102" />
            <path class="workflow-route" d="M300 102C340 102 346 70 390 70" />
            <path class="workflow-route workflow-route--muted" d="M302 112C334 126 350 159 390 159" />

            <g class="workflow-card workflow-card--candidate">
              <rect x="20" y="122" width="118" height="64" rx="14" />
              <rect class="workflow-card-line" x="40" y="144" width="47" height="6" rx="3" />
              <rect class="workflow-card-line workflow-card-line--short" x="40" y="158" width="68" height="5" rx="2.5" />
              <circle class="workflow-card-dot" cx="112" cy="151" r="8" />
            </g>
            <text class="workflow-label" x="20" y="210">Hồ sơ ứng viên</text>

            <g class="workflow-core">
              <circle cx="270" cy="104" r="34" />
              <path d="M256 97H267V111H256V97ZM274 97H285V111H274V97Z" />
              <path class="workflow-core-line" d="M259 118H281" />
            </g>
            <text class="workflow-label workflow-label--center" x="270" y="160">AI phân tích</text>

            <g class="workflow-card workflow-card--signal">
              <rect x="390" y="38" width="110" height="64" rx="14" />
              <path class="workflow-chart" d="M412 82L428 67L441 76L468 52" />
              <circle class="workflow-chart-dot" cx="468" cy="52" r="4" />
            </g>
            <text class="workflow-label" x="390" y="126">Đánh giá phù hợp</text>

            <g class="workflow-card workflow-card--shortlist">
              <rect x="390" y="128" width="110" height="58" rx="14" />
              <circle class="workflow-check-ring" cx="416" cy="157" r="11" />
              <path class="workflow-check" d="M410 157L414 161L422 152" />
              <rect class="workflow-card-line" x="438" y="151" width="38" height="6" rx="3" />
              <rect class="workflow-card-line workflow-card-line--short" x="438" y="164" width="27" height="5" rx="2.5" />
            </g>
            <text class="workflow-label" x="390" y="210">Ưu tiên phỏng vấn</text>
          </svg>
        </div>

        <!-- Footer -->
        <div class="branding-footer">
          <p>2024 iRSA. All rights reserved.</p>
        </div>
      </div>

      <!-- Right Panel: Login Form -->
      <div class="form-panel">
        <div class="form-container">
          <!-- Mobile Logo -->
          <div class="mobile-logo">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="10" fill="#18181B"/>
              <path d="M10 12.5h7.5v15H10V12.5zm12.5 0H30v15h-7.5V12.5z" fill="white"/>
              <circle cx="13.75" cy="20" r="2.5" fill="#71717A"/>
              <circle cx="26.25" cy="20" r="2.5" fill="#71717A"/>
            </svg>
            <span class="mobile-brand">iRSA Admin</span>
          </div>

          <div class="auth-mascot" aria-hidden="true">
            <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle class="mascot-halo" cx="48" cy="48" r="45"/>
              <path class="mascot-spark" d="M17 24v8M13 28h8M75 15v6M72 18h6"/>
              <path class="mascot-antenna" d="M48 22v-7"/>
              <circle class="mascot-antenna-dot" cx="48" cy="12" r="4"/>
              <rect class="mascot-face" x="22" y="23" width="52" height="44" rx="16"/>
              <circle class="mascot-eye" cx="39" cy="43" r="4"/>
              <circle class="mascot-eye" cx="57" cy="43" r="4"/>
              <path class="mascot-smile" d="M40 55c5 5 11 5 16 0"/>
              <rect class="mascot-cv" x="58" y="56" width="29" height="27" rx="8"/>
              <path class="mascot-cv-line" d="M65 64h11M65 69h8"/>
              <circle class="mascot-check-dot" cx="78" cy="76" r="5"/>
              <path class="mascot-check" d="m75.5 76 1.7 1.7 3.2-3.6"/>
            </svg>
          </div>

          <!-- Form Header -->
          <div class="form-header">
            <h2 class="form-title">Đăng nhập</h2>
            <p class="form-subtitle">Chào mừng quay trở lại! Vui lòng đăng nhập để tiếp tục.</p>
          </div>

          <!-- Login Form -->
          <form nz-form nzLayout="vertical" [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
            <nz-form-item>
              <nz-form-label nzFor="email" nzNoColon>Email</nz-form-label>
              <nz-form-control nzErrorTip="Vui lòng nhập email hợp lệ">
                <nz-input-group [nzPrefix]="emailIcon" nzSize="large">
                  <input
                    id="email"
                    type="email"
                    nz-input
                    formControlName="email"
                    autocomplete="email"
                    (input)="clearLoginError()"
                    placeholder="admin&#64;irsa.local"
                  />
                </nz-input-group>
                <ng-template #emailIcon>
                  <span nz-icon nzType="mail" nzTheme="outline"></span>
                </ng-template>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzFor="password" nzNoColon>Mật khẩu</nz-form-label>
              <nz-form-control nzErrorTip="Vui lòng nhập mật khẩu">
                <nz-input-group [nzPrefix]="lockIcon" [nzSuffix]="passwordSuffix" nzSize="large">
                  <input
                    id="password"
                    [type]="showPassword ? 'text' : 'password'"
                    nz-input
                    formControlName="password"
                    autocomplete="current-password"
                    (input)="clearLoginError()"
                    placeholder="Nhập mật khẩu"
                  />
                </nz-input-group>
                <ng-template #lockIcon>
                  <span nz-icon nzType="lock" nzTheme="outline"></span>
                </ng-template>
                <ng-template #passwordSuffix>
                  <button
                    type="button"
                    class="password-toggle"
                    [attr.aria-label]="showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'"
                    [attr.aria-pressed]="showPassword"
                    (click)="showPassword = !showPassword"
                  >
                    <span nz-icon [nzType]="showPassword ? 'eye-invisible' : 'eye'" aria-hidden="true"></span>
                  </button>
                </ng-template>
              </nz-form-control>
            </nz-form-item>

            <div class="form-options">
              <label nz-checkbox formControlName="remember">Ghi nhớ đăng nhập</label>
              <a [href]="forgotPasswordUrl" class="forgot-link">Quên mật khẩu?</a>
            </div>

            <div *ngIf="loginError" class="login-error" role="alert" aria-live="assertive">
              <span nz-icon nzType="close-circle" nzTheme="fill" aria-hidden="true"></span>
              <span>{{ loginError }}</span>
            </div>

            <button
              nz-button
              nzType="primary"
              nzSize="large"
              nzBlock
              [nzLoading]="loading"
              [disabled]="loading"
              type="submit"
              class="login-btn"
            >
              Đăng nhập
            </button>

          </form>

          <section class="demo-account" aria-labelledby="admin-account-title">
            <div class="demo-account-heading">
              <span nz-icon nzType="user" nzTheme="outline" aria-hidden="true"></span>
              <span id="admin-account-title">Tài khoản Admin</span>
            </div>
            <button
              type="button"
              class="credentials-card"
              (click)="fillAdminAccount()"
              title="Nhấn để tự động điền tài khoản Admin"
            >
              <span class="credential-item">
                <span class="credential-label">Email</span>
                <code>admin&#64;example.com</code>
              </span>
              <span class="credential-item">
                <span class="credential-label">Mật khẩu</span>
                <code>Admin&#64;123456</code>
              </span>
              <span class="credentials-hint">Nhấn vào đây để tự động điền</span>
            </button>
          </section>

          <div class="register-hr-link">
            <a routerLink="/register-hr">Đăng ký tài khoản HR</a>
          </div>

          <div class="portal-switch-section">
            <a [href]="portalUrl" class="portal-switch-btn">
              <span nz-icon nzType="swap" nzTheme="outline"></span>
              <span>Chuyển sang Cổng ứng viên (Portal)</span>
            </a>
          </div>

        </div>
      </div>
    </main>
  `,
  styles: [`
    .login-page {
      display: flex;
      min-height: 100dvh;
    }

    /* Left Panel - Branding */
    .branding-panel {
      flex: 1;
      background:
        radial-gradient(ellipse 72% 58% at 90% 4%, hsl(211 84% 54% / 0.44), transparent 72%),
        radial-gradient(ellipse 64% 62% at -8% 100%, hsl(224 78% 32% / 0.88), transparent 75%),
        hsl(217 82% 29%);
      color: #fff;
      padding: clamp(2.75rem, 4.6vw, 5.5rem);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      isolation: isolate;

      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: radial-gradient(hsl(0 0% 100% / 0.14) 0.75px, transparent 0.75px);
        background-size: 18px 18px;
        mask-image: linear-gradient(to bottom, hsl(0 0% 0% / 0.42), transparent 60%);
        opacity: 0.32;
        pointer-events: none;
      }
    }

    .branding-content {
      position: relative;
      z-index: 1;
    }

    /* Brand Logo */
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 64px;

      svg {
        width: 48px;
        height: 48px;
      }
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-family: var(--font-heading);
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    .brand-tagline {
      font-size: 13px;
      opacity: 0.7;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Hero Section */
    .hero-section {
      margin-bottom: 48px;
    }

    .hero-title {
      font-family: var(--font-heading);
      font-size: clamp(2.5rem, 3.1vw, 3.5rem);
      font-weight: 800;
      line-height: 1.12;
      letter-spacing: -0.045em;
      color: hsl(0 0% 100%);
      text-wrap: balance;
      margin: 0 0 24px 0;

      .highlight {
        color: hsl(211 100% 78%);
      }
    }

    .hero-description {
      font-size: 16px;
      line-height: 1.7;
      color: hsl(214 100% 93% / 0.9);
      max-width: 34rem;
      margin: 0;
    }

    /* Features List */
    .features-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .feature-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      span {
        font-size: 20px;
      }
    }

    .feature-text {
      display: flex;
      flex-direction: column;
      gap: 4px;

      strong {
        font-size: 15px;
        font-weight: 600;
      }

      span {
        font-size: 13px;
        opacity: 0.75;
      }
    }

    .workflow-visual {
      position: absolute;
      z-index: 0;
      right: clamp(1.5rem, 4vw, 5rem);
      bottom: clamp(4.5rem, 10vh, 7rem);
      width: min(31rem, 55%);
      pointer-events: none;
      filter: drop-shadow(0 18px 30px hsl(221 76% 18% / 0.2));

      svg {
        display: block;
        width: 100%;
        height: auto;
        overflow: visible;
      }
    }

    .workflow-halo {
      fill: hsl(211 100% 78% / 0.025);
      stroke: hsl(211 100% 82% / 0.18);
      stroke-width: 1;
      stroke-dasharray: 3 7;
    }

    .workflow-halo--small {
      fill: none;
      stroke-opacity: 0.1;
    }

    .workflow-route {
      stroke: hsl(211 100% 82% / 0.54);
      stroke-width: 1.5;
      stroke-dasharray: 4 6;
      stroke-linecap: round;
    }

    .workflow-route--muted {
      stroke-opacity: 0.42;
    }

    .workflow-card > rect:first-child {
      fill: hsl(0 0% 100% / 0.11);
      stroke: hsl(211 100% 89% / 0.26);
      stroke-width: 1;
    }

    .workflow-card--candidate > rect:first-child {
      fill: hsl(211 100% 84% / 0.14);
    }

    .workflow-card--shortlist > rect:first-child {
      fill: hsl(0 0% 100% / 0.15);
    }

    .workflow-card-line {
      fill: hsl(0 0% 100% / 0.78);
    }

    .workflow-card-line--short {
      fill: hsl(211 100% 84% / 0.52);
    }

    .workflow-card-dot {
      fill: hsl(211 100% 78%);
    }

    .workflow-core circle {
      fill: hsl(211 100% 84% / 0.22);
      stroke: hsl(211 100% 89% / 0.48);
      stroke-width: 1.25;
    }

    .workflow-core path:not(.workflow-core-line) {
      fill: hsl(0 0% 100% / 0.94);
    }

    .workflow-core-line {
      stroke: hsl(211 100% 84% / 0.72);
      stroke-width: 2;
      stroke-linecap: round;
    }

    .workflow-chart {
      stroke: hsl(211 100% 84% / 0.94);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .workflow-chart-dot {
      fill: hsl(0 0% 100% / 0.95);
    }

    .workflow-check-ring {
      fill: hsl(211 100% 84% / 0.18);
      stroke: hsl(211 100% 84% / 0.74);
    }

    .workflow-check {
      stroke: hsl(0 0% 100% / 0.95);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .workflow-label {
      fill: hsl(211 100% 92% / 0.78);
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.015em;
    }

    .workflow-label--center {
      text-anchor: middle;
    }

    /* Branding Footer */
    .branding-footer {
      position: relative;
      z-index: 1;

      p {
        margin: 0;
        font-size: 13px;
        opacity: 0.6;
      }
    }

    /* Right Panel - Form */
    .form-panel {
      flex: 0 0 clamp(32rem, 34vw, 40rem);
      background:
        radial-gradient(circle at 96% 8%, hsl(212 94% 90% / 0.7), transparent 18rem),
        var(--color-bg-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: clamp(2.5rem, 4.6vw, 5.5rem);
      position: relative;
      overflow: hidden;
    }

    .form-container {
      width: 100%;
      max-width: 24.5rem;
      position: relative;
      z-index: 1;
    }

    /* Mobile Logo */
    .mobile-logo {
      display: none;
      align-items: center;
      gap: 12px;
      margin-bottom: 32px;

      svg {
        width: 40px;
        height: 40px;
      }
    }

    .mobile-brand {
      font-family: var(--font-heading);
      font-size: 20px;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    /* Form Header */
    .form-header {
      margin-bottom: 32px;
    }

    .form-title {
      font-family: var(--font-heading);
      font-size: clamp(1.85rem, 2.2vw, 2.25rem);
      font-weight: 800;
      letter-spacing: -0.035em;
      color: var(--color-text-primary);
      margin: 0 0 8px 0;
    }

    .form-subtitle {
      font-size: 15px;
      color: var(--color-text-secondary);
      margin: 0;
      line-height: 1.6;
    }

    /* Login Form */
    .login-form {
      margin-bottom: 24px;
    }

    nz-form-item {
      margin-bottom: 20px;
    }

    nz-form-label {
      font-weight: 500 !important;
      padding-bottom: 6px !important;
    }

    :host ::ng-deep nz-input-group.ant-input-affix-wrapper {
      border-radius: 12px !important;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background-color var(--transition-fast);

      &:hover {
        border-color: var(--color-primary-300) !important;
      }

      &:focus-within,
      &.ant-input-affix-wrapper-focused {
        border-color: var(--color-primary) !important;
        box-shadow: 0 0 0 3px hsl(212 94% 90% / 0.9) !important;
      }
    }

    /* Global tokens also target the native input inside this wrapper. The
       wrapper owns the only border and focus ring on login fields. */
    :host ::ng-deep nz-input-group.ant-input-affix-wrapper > input.ant-input {
      min-height: 0 !important;
      height: auto !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      outline: 0 !important;
      box-shadow: none !important;
      background: transparent !important;

      &:focus {
        border: 0 !important;
        box-shadow: none !important;
      }
    }

    .password-toggle {
      cursor: pointer;
      color: var(--color-text-tertiary);
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      display: grid;
      place-items: center;
      transition: color var(--transition-fast), background-color var(--transition-fast), transform var(--transition-fast);

      &:hover {
        color: var(--color-text-primary);
        background: var(--color-bg-tertiary);
      }

      &:active {
        transform: scale(0.94);
      }

      &:focus-visible {
        outline: 3px solid var(--color-primary-100);
        outline-offset: 1px;
      }
    }

    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      width: 100%;
    }

    .forgot-link {
      font-size: 14px;
      color: var(--color-primary-light);
      font-weight: var(--font-medium);

      &:hover {
        color: var(--color-primary);
      }

      &:focus-visible {
        outline: 3px solid var(--color-primary-100);
        outline-offset: 3px;
        border-radius: var(--radius-sm);
      }
    }

    .login-error {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      margin: -6px 0 18px;
      padding: 10px 12px;
      border: 1px solid hsl(0 67% 48% / 0.18);
      border-radius: var(--radius-lg);
      background: var(--color-error-bg);
      color: var(--color-error-dark);
      font-size: var(--text-sm);
      line-height: var(--leading-normal);

      > span:first-child {
        margin-top: 2px;
      }
    }

    .login-btn {
      height: 48px !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      border-radius: 12px !important;
      transition: all 0.25s ease;

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 80, 179, 0.25);
      }

      &:active:not(:disabled) {
        transform: translateY(1px) scale(0.99);
      }

      &:focus-visible {
        outline: 3px solid var(--color-primary-100);
        outline-offset: 3px;
      }
    }

    .demo-account {
      padding-top: 18px;
      border-top: 1px solid var(--color-border);
    }

    .demo-account-heading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      margin-bottom: 10px;
      color: var(--color-text-secondary);
      font-size: 13px;
      font-weight: 600;
    }

    .credentials-card {
      display: flex;
      width: 100%;
      flex-direction: column;
      gap: 8px;
      padding: 13px 15px;
      border: 1px dashed var(--color-border);
      border-radius: 10px;
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      font: inherit;
      cursor: pointer;
      transition: border-color var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast);

      &:hover {
        border-color: var(--color-primary);
        background: var(--color-bg-secondary);
      }

      &:focus-visible {
        outline: 3px solid var(--color-primary-100);
        outline-offset: 2px;
      }
    }

    .credential-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
    }

    .credential-label {
      color: var(--color-text-secondary);
    }

    .credential-item code {
      padding: 3px 8px;
      border: 1px solid var(--color-border);
      border-radius: 5px;
      background: var(--color-bg-secondary);
      color: var(--color-primary);
      font-family: 'SFMono-Regular', Consolas, monospace;
      font-size: 12px;
    }

    .credentials-hint {
      color: var(--color-text-tertiary);
      font-size: 11px;
      text-align: center;
    }

    /* Register HR Link */
    .register-hr-link {
      text-align: center;
      margin-top: 20px;
      font-size: 14px;

      a {
        color: var(--color-primary-light);
        &:hover { color: var(--color-primary); }
      }
    }

    .portal-switch-section {
      margin-top: 24px;
      text-align: center;
    }

    .portal-switch-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 42px;
      border-radius: 10px;
      background: var(--color-bg-secondary);
      color: var(--color-primary);
      font-weight: 500;
      font-size: 14px;
      border: 1px solid var(--color-border);
      transition: all 0.2s ease;
      text-decoration: none;

      &:hover {
        background: var(--color-primary);
        color: #ffffff;
        border-color: var(--color-primary);
        box-shadow: 0 4px 12px rgba(0, 80, 179, 0.2);
      }

      &:focus-visible {
        outline: 3px solid var(--color-primary-100);
        outline-offset: 3px;
      }
    }

    /* Warm Slate authentication surface */
    .login-page {
      color: #18181B;
      background: #F3F0E6;
    }

    .branding-panel {
      color: #FFFFFF;
      background: #18181B;

      &::before {
        background-image: radial-gradient(rgb(255 255 255 / .13) .75px, transparent .75px);
      }
    }

    .hero-title {
      color: #FFFFFF;

      .highlight { color: #D4D4D8; }
    }

    .hero-description { color: rgb(244 244 245 / .82); }
    .feature-icon { background: rgb(255 255 255 / .09); }

    .workflow-visual { filter: drop-shadow(0 18px 30px rgb(0 0 0 / .18)); }
    .workflow-halo { fill: rgb(255 255 255 / .02); stroke: rgb(212 212 216 / .26); }
    .workflow-route { stroke: rgb(212 212 216 / .58); }
    .workflow-card > rect:first-child,
    .workflow-card--candidate > rect:first-child,
    .workflow-card--shortlist > rect:first-child { fill: rgb(255 255 255 / .08); stroke: rgb(228 228 231 / .28); }
    .workflow-card-line,
    .workflow-card-line--short { fill: rgb(244 244 245 / .72); }
    .workflow-card-dot { fill: #A1A1AA; }
    .workflow-core circle { fill: rgb(255 255 255 / .1); stroke: rgb(228 228 231 / .5); }
    .workflow-core-line,
    .workflow-chart { stroke: #D4D4D8; }
    .workflow-check-ring { fill: rgb(255 255 255 / .08); stroke: #A1A1AA; }
    .workflow-label { fill: rgb(244 244 245 / .75); }

    .form-panel {
      background: #F3F0E6;
    }

    .form-container {
      max-width: 27rem;
      padding: 34px;
      border: 1px solid #E4DFD3;
      border-radius: 16px;
      background: #FFFFFF;
      box-shadow: 0 10px 30px rgb(24 24 27 / .06);
    }

    .form-title { color: #18181B; }
    .form-subtitle { color: #71717A; }

    .auth-mascot {
      width: 82px;
      height: 82px;
      margin: 0 0 18px;
    }

    .auth-mascot svg { display: block; width: 100%; height: 100%; }
    .mascot-halo { fill: #F3F0E6; stroke: #E4DFD3; }
    .mascot-spark { stroke: #A1A1AA; stroke-width: 2; stroke-linecap: round; }
    .mascot-antenna { stroke: #18181B; stroke-width: 3; stroke-linecap: round; }
    .mascot-antenna-dot,
    .mascot-face { fill: #18181B; }
    .mascot-eye { fill: #FFFFFF; }
    .mascot-smile { stroke: #FFFFFF; stroke-width: 2.5; stroke-linecap: round; }
    .mascot-cv { fill: #FFFFFF; stroke: #18181B; stroke-width: 2; }
    .mascot-cv-line { stroke: #71717A; stroke-width: 2; stroke-linecap: round; }
    .mascot-check-dot { fill: #10B981; }
    .mascot-check { stroke: #FFFFFF; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }

    :host ::ng-deep nz-input-group.ant-input-affix-wrapper {
      border-color: #E4DFD3 !important;
      background: #FAFAFA !important;

      &:hover { border-color: #A1A1AA !important; }

      &:focus-within,
      &.ant-input-affix-wrapper-focused {
        border-color: #18181B !important;
        background: #FFFFFF !important;
        box-shadow: 0 0 0 3px rgb(24 24 27 / .1) !important;
      }
    }

    .login-btn:hover:not(:disabled),
    .portal-switch-btn:hover {
      box-shadow: 0 6px 16px rgb(24 24 27 / .14);
    }

    .credentials-card {
      border-color: #E4DFD3;
      background: #FAFAFA;
    }

    .credential-item code {
      color: #18181B;
      background: #FFFFFF;
      font-family: var(--font-mono);
    }

    .register-hr-link a,
    .forgot-link { color: #3F3F46; font-weight: 600; }

    /* Responsive */
    @media (max-width: 1024px) {
      .branding-panel {
        flex: 0 0 400px;
        padding: 40px;
      }

      .hero-title {
        font-size: 32px;
      }

      .form-panel {
        flex: 1;
      }

    }

    @media (max-width: 768px) {
      .login-page {
        flex-direction: column;
      }

      .branding-panel {
        display: none;
      }

      .form-panel {
        flex: 1;
        min-height: 100dvh;
        padding: 24px;
      }

      .mobile-logo {
        display: flex;
      }

      .form-container {
        max-width: 100%;
        padding: 24px;
      }
    }
  `],
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  loginError: string | null = null;
  showPassword = false;
  portalUrl = environment.portalUrl || 'https://portal-irsa.vercel.app/';
  forgotPasswordUrl = `${this.portalUrl.replace(/\/+$/, '')}/forgot-password`;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private message: NzMessageService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      remember: [true],
    });

    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  clearLoginError(): void {
    this.loginError = null;
  }

  fillAdminAccount(): void {
    this.loginForm.patchValue({
      email: 'admin@example.com',
      password: 'Admin@123456',
    });
    this.clearLoginError();
    this.message.info('Đã tự động điền tài khoản Admin');
  }

  onSubmit(): void {
    this.clearLoginError();

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

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.message.success('Đăng nhập thành công');
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loginError = this.getLoginErrorMessage(err);
      },
    });
  }

  private getLoginErrorMessage(err: HttpErrorResponse): string {
    const detail = err.error?.detail;
    const code = typeof detail === 'object' ? detail?.code : undefined;
    const messages: Record<string, string> = {
      INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra và thử lại.',
      EMAIL_NOT_VERIFIED: 'Email chưa được xác thực. Vui lòng kiểm tra hộp thư để kích hoạt tài khoản.',
      ACCOUNT_PENDING_APPROVAL: 'Tài khoản đang chờ quản trị viên phê duyệt.',
      ACCOUNT_REJECTED: 'Yêu cầu đăng ký tài khoản đã bị từ chối. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
      ACCOUNT_DISABLED: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
    };

    if (code && messages[code]) return messages[code];
    if (err.status === 0) return 'Không thể kết nối đến hệ thống. Vui lòng kiểm tra mạng và thử lại.';
    if (err.status === 429) return 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi một lát rồi thử lại.';
    if (err.status === 422) return 'Thông tin đăng nhập chưa hợp lệ. Vui lòng kiểm tra email và mật khẩu.';
    if (err.status >= 500) return 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.';
    if (typeof detail === 'object' && detail?.message) return detail.message;
    if (typeof detail === 'string') return detail;
    return 'Không thể đăng nhập. Vui lòng thử lại.';
  }
}
