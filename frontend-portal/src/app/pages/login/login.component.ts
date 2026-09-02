import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
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
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCheckboxModule,
    NzIconModule,
    NzDividerModule,
    NzModalModule,
    NzAlertModule,
  ],
  template: `
    <div class="auth-page">
      <div class="auth-container">
        <!-- Left Side - Branding -->
        <div class="auth-branding hide-mobile">
          <div class="branding-content">
            <div class="brand-logo">
              <span nz-icon nzType="thunderbolt" nzTheme="fill"></span>
              <span>iRSA</span>
            </div>
            <h2>Chào mừng trở lại!</h2>
            <p>
              Đăng nhập để tiếp tục tìm kiếm cơ hội nghề nghiệp
              và theo dõi trạng thái ứng tuyển của bạn.
            </p>
            <div class="branding-features">
              <div class="feature-item">
                <span nz-icon nzType="check-circle" nzTheme="fill"></span>
                <span>Truy cập nhanh vào hồ sơ</span>
              </div>
              <div class="feature-item">
                <span nz-icon nzType="check-circle" nzTheme="fill"></span>
                <span>Theo dõi đơn ứng tuyển</span>
              </div>
              <div class="feature-item">
                <span nz-icon nzType="check-circle" nzTheme="fill"></span>
                <span>Nhận thông báo việc làm mới</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side - Login Form -->
        <div class="auth-form-section">
          <div class="auth-card">
            <div class="auth-header">
              <div class="auth-logo show-mobile-only">
                <span nz-icon nzType="thunderbolt" nzTheme="fill"></span>
                iRSA
              </div>
              <h1 class="auth-title">Đăng nhập</h1>
              <p class="auth-subtitle">
                Nhập thông tin tài khoản để tiếp tục
              </p>
            </div>

            <!-- Social Login -->
            <div class="social-login">
              <button nz-button nzBlock class="social-btn google">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Tiếp tục với Google
              </button>
            </div>

            <div class="auth-divider">
              <nz-divider nzText="hoặc"></nz-divider>
            </div>

            <!-- Login Form -->
            <form nz-form [formGroup]="loginForm" (ngSubmit)="onSubmit()" nzLayout="vertical">
              <nz-form-item>
                <nz-form-label nzRequired>Email</nz-form-label>
                <nz-form-control nzErrorTip="Vui lòng nhập địa chỉ email hợp lệ">
                  <nz-input-group [nzPrefix]="emailIcon" nzSize="large">
                    <input
                      type="email"
                      nz-input
                      formControlName="email"
                      placeholder="example&#64;email.com"
                    />
                  </nz-input-group>
                  <ng-template #emailIcon>
                    <span nz-icon nzType="mail" nzTheme="outline"></span>
                  </ng-template>
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label nzRequired>Mật khẩu</nz-form-label>
                <nz-form-control nzErrorTip="Vui lòng nhập mật khẩu">
                  <nz-input-group [nzPrefix]="passwordIcon" [nzSuffix]="passwordSuffix" nzSize="large">
                    <input
                      [type]="showPassword ? 'text' : 'password'"
                      nz-input
                      formControlName="password"
                      placeholder="Nhập mật khẩu"
                    />
                  </nz-input-group>
                  <ng-template #passwordIcon>
                    <span nz-icon nzType="lock" nzTheme="outline"></span>
                  </ng-template>
                  <ng-template #passwordSuffix>
                    <span
                      nz-icon
                      [nzType]="showPassword ? 'eye' : 'eye-invisible'"
                      nzTheme="outline"
                      class="password-toggle"
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

            <nz-divider nzText="Tài khoản Ứng viên mặc định"></nz-divider>

            <div class="help-section">
              <div class="credentials" (click)="fillCandidateAccount()" style="cursor: pointer;" title="Nhấn để tự động điền">
                <div class="credential-item">
                  <span class="credential-label">Tài khoản:</span>
                  <code>nguyenviet2k72k3&#64;gmail.com</code>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Mật khẩu:</span>
                  <code>12345abcde</code>
                </div>
              </div>
              <p class="help-hint">
                (Nhấp vào khung để tự động điền tài khoản)
              </p>
            </div>

            <div class="admin-switch-section">
              <a [href]="adminUrl" class="admin-switch-btn">
                <span nz-icon nzType="swap" nzTheme="outline"></span>
                <span>Chuyển sang Cổng quản trị (Admin)</span>
              </a>
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
      (nzOnCancel)="closeVerifyModal()"
      nzWidth="460px"
    >
      <ng-container *nzModalContent>
        <div class="verify-modal-body">
          <div class="verify-icon">
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
              style="margin-bottom: 16px;"
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
            >
              <span nz-icon nzType="send" nzTheme="outline"></span>
              Gửi lại email xác thực
            </button>
            <button nz-button nzBlock (click)="logoutAndClose()">
              <span nz-icon nzType="logout" nzTheme="outline"></span>
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
        min-height: 100vh;
        background: var(--color-bg-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-4);
      }

      .auth-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        max-width: 1000px;
        width: 100%;
        background: var(--color-bg-secondary);
        border-radius: var(--radius-2xl);
        overflow: hidden;
        box-shadow: var(--shadow-2xl);

        @media (max-width: 768px) {
          grid-template-columns: 1fr;
        }
      }

      /* Branding Section */
      .auth-branding {
        background: linear-gradient(135deg, var(--color-primary) 0%, #0072E5 100%);
        padding: var(--space-12);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          opacity: 0.5;
        }
      }

      .branding-content {
        position: relative;
        z-index: 1;
        color: white;
      }

      .brand-logo {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-family: var(--font-heading);
        font-size: var(--text-2xl);
        font-weight: var(--font-extrabold);
        margin-bottom: var(--space-8);

        span:first-child {
          font-size: 32px;
        }
      }

      .branding-content h2 {
        font-family: var(--font-heading);
        font-size: var(--text-3xl);
        font-weight: var(--font-bold);
        margin-bottom: var(--space-4);
        color: white;
      }

      .branding-content p {
        font-size: var(--text-base);
        line-height: var(--leading-relaxed);
        opacity: 0.9;
        margin-bottom: var(--space-8);
      }

      .branding-features {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }

      .feature-item {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        font-size: var(--text-sm);
        opacity: 0.9;

        span:first-child {
          color: #52C41A;
          font-size: 18px;
        }
      }

      /* Form Section */
      .auth-form-section {
        padding: var(--space-12);
        display: flex;
        align-items: center;
        justify-content: center;

        @media (max-width: 768px) {
          padding: var(--space-8);
        }
      }

      .auth-card {
        width: 100%;
        max-width: 380px;
      }

      .auth-header {
        text-align: center;
        margin-bottom: var(--space-8);
      }

      .auth-logo {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        font-family: var(--font-heading);
        font-size: var(--text-2xl);
        font-weight: var(--font-extrabold);
        color: var(--color-primary);
        margin-bottom: var(--space-6);

        span:first-child {
          font-size: 28px;
        }
      }

      .auth-title {
        font-family: var(--font-heading);
        font-size: var(--text-2xl);
        font-weight: var(--font-bold);
        color: var(--color-text-primary);
        margin-bottom: var(--space-2);
      }

      .auth-subtitle {
        color: var(--color-text-secondary);
        font-size: var(--text-sm);
        margin: 0;
      }

      /* Social Login */
      .social-login {
        margin-bottom: var(--space-2);
      }

      .social-btn {
        height: 48px !important;
        border-radius: var(--radius-lg) !important;
        font-weight: var(--font-medium) !important;
        display: flex !important;
        align-items: center;
        justify-content: center;
        gap: var(--space-3);

        &.google {
          border-color: var(--color-border) !important;
          color: var(--color-text-primary) !important;

          &:hover {
            border-color: var(--color-primary) !important;
            color: var(--color-primary) !important;
          }
        }
      }

      .auth-divider {
        margin: var(--space-4) 0;

        ::ng-deep .ant-divider-inner-text {
          color: var(--color-text-tertiary);
          font-size: var(--text-sm);
        }
      }

      /* Form Styles */
      ::ng-deep {
        .ant-form-item-label > label {
          font-weight: var(--font-medium);
          color: var(--color-text-primary);
        }

        .ant-input-affix-wrapper-lg {
          padding: 12px 16px !important;
          border-radius: var(--radius-lg) !important;
        }
      }

      .password-toggle {
        cursor: pointer;
        color: var(--color-text-tertiary);
        transition: color var(--transition-fast);

        &:hover {
          color: var(--color-text-secondary);
        }
      }

      .form-options {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-6);
      }

      .forgot-link {
        font-size: var(--text-sm);
        color: var(--color-primary);
        font-weight: var(--font-medium);

        &:hover {
          text-decoration: underline;
        }
      }

      .submit-btn {
        height: 48px !important;
        border-radius: var(--radius-lg) !important;
        font-weight: var(--font-semibold) !important;
        font-size: var(--text-base) !important;
      }

      .auth-footer {
        text-align: center;
        margin-top: var(--space-8);
        padding-top: var(--space-6);
        border-top: 1px solid var(--color-border);
        color: var(--color-text-secondary);
        font-size: var(--text-sm);

        a {
          color: var(--color-primary);
          font-weight: var(--font-semibold);
          margin-left: var(--space-1);

          &:hover {
            text-decoration: underline;
          }
        }
      }

      /* Responsive */
      @media (max-width: 767px) {
        .hide-mobile {
          display: none !important;
        }
      }

      @media (min-width: 768px) {
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

      /* Help Section */
      .help-section {
        text-align: center;
      }

      .credentials {
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: var(--color-bg-tertiary, #f5f5f5);
        padding: 14px 16px;
        border-radius: 10px;
        border: 1px dashed var(--color-border, #d9d9d9);
        transition: all 0.2s ease;
      }

      .credentials:hover {
        border-color: var(--color-primary, #0072e5);
        background: var(--color-bg-secondary, #fafafa);
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
        background: var(--color-bg-secondary, #fff);
        padding: 3px 8px;
        border-radius: 4px;
        font-family: 'SF Mono', Consolas, monospace;
        font-size: 12px;
        color: var(--color-primary);
        border: 1px solid var(--color-border, #d9d9d9);
      }

      .help-hint {
        margin-top: 8px;
        margin-bottom: 0;
        font-size: 12px;
        color: var(--color-text-tertiary);
      }

      .admin-switch-section {
        margin-top: 16px;
        text-align: center;
      }

      .admin-switch-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        height: 42px;
        border-radius: var(--radius-lg);
        background: var(--color-bg-secondary);
        color: var(--color-primary);
        font-weight: var(--font-medium);
        font-size: var(--text-sm);
        border: 1px solid var(--color-border);
        transition: all var(--transition-fast);
        text-decoration: none;

        &:hover {
          background: var(--color-primary);
          color: #ffffff;
          border-color: var(--color-primary);
          box-shadow: 0 4px 12px rgba(0, 114, 229, 0.2);
        }
      }

      /* Warm Slate authentication layout */
      .auth-page {
        align-items: stretch;
        padding: 32px;
        background: #f3f0e6;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      .auth-container {
        grid-template-columns: minmax(360px, .9fr) minmax(440px, 1.1fr);
        max-width: 1180px;
        min-height: calc(100vh - 64px);
        margin: auto;
        border: 1px solid #e4dfd3;
        border-radius: 16px;
        background: #fff;
        box-shadow: 0 12px 36px rgb(24 24 27 / 7%);
      }

      .auth-branding {
        align-items: flex-start;
        justify-content: center;
        padding: 56px;
        background: #18181b;
      }

      .branding-content { max-width: 410px; }
      .branding-content h2 { color: #fff; font-size: 32px; letter-spacing: -.035em; }
      .branding-content p { color: rgb(244 244 245 / 82%); }
      .feature-item { color: #e4e4e7; }
      .feature-item span:first-child { color: #10b981; }

      .auth-form-section {
        align-items: center;
        justify-content: flex-start;
        padding: 56px 64px;
        background: #fff;
      }

      .auth-card { max-width: 430px; }
      .auth-header { text-align: left; margin-bottom: 28px; }
      .auth-logo { justify-content: flex-start; color: #18181b; }
      .auth-title { color: #18181b; font-size: 30px; letter-spacing: -.035em; }
      .auth-subtitle { color: #71717a; }

      ::ng-deep .ant-input-affix-wrapper-lg {
        border-color: #e4dfd3 !important;
        background: #fafafa !important;
      }

      ::ng-deep .ant-input-affix-wrapper-focused,
      ::ng-deep .ant-input-affix-wrapper:focus-within {
        border-color: #18181b !important;
        background: #fff !important;
        box-shadow: 0 0 0 3px rgb(24 24 27 / 10%) !important;
      }

      .submit-btn {
        border-color: #18181b !important;
        color: #fff !important;
        background: #18181b !important;
      }

      .forgot-link,
      .auth-footer a { color: #18181b; }
      .auth-footer { text-align: left; }
      .help-section { text-align: left; }
      .admin-switch-section { text-align: left; }
      .credentials { border-color: #e4dfd3; background: #fafafa; }
      code { color: #18181b; font-family: 'Geist Mono', 'SFMono-Regular', Consolas, monospace; }
      .admin-switch-btn { color: #18181b; background: #fff; border-color: #e4dfd3; }
      .admin-switch-btn:hover { color: #fff; background: #18181b; border-color: #18181b; box-shadow: none; }

      @media (max-width: 767px) {
        .auth-page { padding: 0; background: #fff; }
        .auth-container { display: block; min-height: 100vh; border: 0; border-radius: 0; }
        .auth-form-section { padding: 32px 24px; }
      }
    `,
  ],
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  showPassword = false;
  adminUrl = environment.adminUrl || 'http://localhost:4200';

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
    private message: NzMessageService
  ) {
    this.loginForm = this.fb.group({
      email: ['nguyenviet2k72k3@gmail.com', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      password: ['12345abcde', [Validators.required, Validators.minLength(8)]],
      remember: [true],
    });
  }

  fillCandidateAccount(): void {
    this.loginForm.patchValue({
      email: 'nguyenviet2k72k3@gmail.com',
      password: '12345abcde',
    });
    this.message.info('Đã tự động điền tài khoản Ứng viên');
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
      next: (user) => {
        this.loading = false;
        if (!user.email_verified) {
          this.unverifiedEmail = user.email;
          this.showVerifyModal = true;
        } else {
          this.message.success('Đăng nhập thành công');
          this.router.navigate(['/']);
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
        this.message.error(this.getLoginErrorMessage(err));
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

  resendVerification(): void {
    this.sendingVerify = true;
    this.verifyMessage = '';
    this.authService.resendVerification(this.unverifiedEmail).subscribe({
      next: () => {
        this.sendingVerify = false;
        this.verifyMessage = 'Email xác thực đã được gửi lại thành công!';
        this.verifyMessageType = 'success';
      },
      error: (err) => {
        this.sendingVerify = false;
        this.verifyMessage = err.error?.detail || 'Gửi email thất bại. Vui lòng thử lại.';
        this.verifyMessageType = 'error';
      },
    });
  }

  closeVerifyModal(): void {
    this.showVerifyModal = false;
    this.verifyMessage = '';
  }

  logoutAndClose(): void {
    this.authService.logout();
    this.showVerifyModal = false;
    this.verifyMessage = '';
  }
}
