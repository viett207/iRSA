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
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

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
    NzDividerModule,
    RouterModule,
  ],
  template: `
    <div class="login-page">
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
              <rect width="40" height="40" rx="10" fill="#0050B3"/>
              <path d="M10 12.5h7.5v15H10V12.5zm12.5 0H30v15h-7.5V12.5z" fill="white"/>
              <circle cx="13.75" cy="20" r="2.5" fill="#0050B3"/>
              <circle cx="26.25" cy="20" r="2.5" fill="#0050B3"/>
            </svg>
            <span class="mobile-brand">iRSA Admin</span>
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
                    placeholder="Nhập mật khẩu"
                  />
                </nz-input-group>
                <ng-template #lockIcon>
                  <span nz-icon nzType="lock" nzTheme="outline"></span>
                </ng-template>
                <ng-template #passwordSuffix>
                  <span
                    nz-icon
                    class="password-toggle"
                    [nzType]="showPassword ? 'eye-invisible' : 'eye'"
                    (click)="showPassword = !showPassword"
                  ></span>
                </ng-template>
              </nz-form-control>
            </nz-form-item>

            <div class="form-options">
              <label nz-checkbox formControlName="remember">Ghi nhớ đăng nhập</label>
              <a class="forgot-link">Quên mật khẩu?</a>
            </div>

            <button
              nz-button
              nzType="primary"
              nzSize="large"
              nzBlock
              [nzLoading]="loading"
              type="submit"
              class="login-btn"
            >
              Đăng nhập
            </button>

          </form>

          <div class="register-hr-link">
            <a routerLink="/register-hr">Đăng ký tài khoản HR</a>
          </div>

          <nz-divider nzText="Tài khoản Admin mặc định"></nz-divider>

          <div class="help-section">
            <div class="credentials" (click)="fillAdminAccount()" style="cursor: pointer;" title="Nhấn để tự động điền">
              <div class="credential-item">
                <span class="credential-label">Tài khoản:</span>
                <code>admin&#64;example.com</code>
              </div>
              <div class="credential-item">
                <span class="credential-label">Mật khẩu:</span>
                <code>Admin&#64;123456</code>
              </div>
            </div>
            <p class="help-hint" style="margin-top: 8px; margin-bottom: 0; font-size: 12px; color: var(--color-text-tertiary);">
              (Nhấp vào khung để tự động điền tài khoản)
            </p>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      display: flex;
      min-height: 100vh;
    }

    /* Left Panel - Branding */
    .branding-panel {
      flex: 1;
      background: linear-gradient(135deg, #0050B3 0%, #003A82 50%, #001D66 100%);
      color: #fff;
      padding: 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -50%;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
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
      font-size: 42px;
      font-weight: 700;
      line-height: 1.2;
      margin: 0 0 24px 0;

      .highlight {
        color: #69B1FF;
      }
    }

    .hero-description {
      font-size: 16px;
      line-height: 1.7;
      opacity: 0.85;
      max-width: 440px;
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
      flex: 0 0 520px;
      background: var(--color-bg-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px;
    }

    .form-container {
      width: 100%;
      max-width: 380px;
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
      font-size: 28px;
      font-weight: 700;
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

    nz-input-group {
      ::ng-deep .ant-input-affix-wrapper {
        border-radius: 12px !important;

        &:focus,
        &.ant-input-affix-wrapper-focused {
          box-shadow: 0 0 0 2px var(--color-primary-100, #BAE0FF) !important;
        }
      }

      ::ng-deep .ant-input {
        border-radius: 12px !important;
      }
    }

    .password-toggle {
      cursor: pointer;
      color: var(--color-text-tertiary);
      transition: color 0.2s ease;

      &:hover {
        color: var(--color-text-primary);
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
      cursor: pointer;

      &:hover {
        color: var(--color-primary);
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
        transform: translateY(0);
      }
    }

    /* Register HR Link */
    .register-hr-link {
      text-align: center;
      margin-top: 12px;
      font-size: 14px;

      a {
        color: var(--color-primary-light);
        &:hover { color: var(--color-primary); }
      }
    }

    /* Help Section */
    .help-section {
      text-align: center;
    }

    .help-text {
      font-size: 13px;
      color: var(--color-text-tertiary);
      margin: 0 0 12px 0;
    }

    .credentials {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--color-bg-tertiary);
      padding: 16px;
      border-radius: 10px;
    }

    .credential-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
    }

    .credential-label {
      color: var(--color-text-secondary);
    }

    code {
      background: var(--color-bg-secondary);
      padding: 4px 8px;
      border-radius: 4px;
      font-family: 'SF Mono', Consolas, monospace;
      font-size: 12px;
      color: var(--color-primary);
      border: 1px solid var(--color-border);
    }

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
        padding: 24px;
      }

      .mobile-logo {
        display: flex;
      }

      .form-container {
        max-width: 100%;
      }
    }
  `],
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private message: NzMessageService
  ) {
    this.loginForm = this.fb.group({
      email: ['admin@example.com', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      password: ['Admin@123456', [Validators.required, Validators.minLength(8)]],
      remember: [true],
    });

    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  fillAdminAccount(): void {
    this.loginForm.patchValue({
      email: 'admin@example.com',
      password: 'Admin@123456',
    });
    this.message.info('Đã tự động điền tài khoản Admin');
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

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.message.success('Đăng nhập thành công');
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.message.error(this.getLoginErrorMessage(err));
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
