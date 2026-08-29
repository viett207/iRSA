import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzDividerModule,
    NzAlertModule,
    NzCheckboxModule,
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
            <h2>Bắt đầu hành trình mới</h2>
            <p>
              Tạo tài khoản để tiếp cận hàng ngàn cơ hội việc làm
              và kết nối với nhà tuyển dụng hàng đầu.
            </p>
            <div class="branding-features">
              <div class="feature-item">
                <span nz-icon nzType="check-circle" nzTheme="fill"></span>
                <span>Miễn phí hoàn toàn</span>
              </div>
              <div class="feature-item">
                <span nz-icon nzType="check-circle" nzTheme="fill"></span>
                <span>Tạo hồ sơ trong 2 phút</span>
              </div>
              <div class="feature-item">
                <span nz-icon nzType="check-circle" nzTheme="fill"></span>
                <span>AI phân tích và gợi ý việc làm</span>
              </div>
              <div class="feature-item">
                <span nz-icon nzType="check-circle" nzTheme="fill"></span>
                <span>Bảo mật thông tin tuyệt đối</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side - Register Form -->
        <div class="auth-form-section">
          <div class="auth-card">
            @if (registered) {
              <!-- Success State -->
              <div class="success-state">
                <div class="success-icon">
                  <span nz-icon nzType="check-circle" nzTheme="fill"></span>
                </div>
                <h2>Đăng ký thành công!</h2>
                <p>
                  Chúng tôi đã gửi email xác nhận đến
                  <strong>{{ registerForm.get('email')?.value }}</strong>.
                  Vui lòng kiểm tra hộp thư và xác nhận email để kích hoạt tài khoản.
                </p>
                <div class="success-actions">
                  <button nz-button nzType="primary" nzBlock nzSize="large" routerLink="/login">
                    Đi đến trang đăng nhập
                  </button>
                  <button nz-button nzBlock nzSize="large" routerLink="/">
                    Quay về trang chủ
                  </button>
                </div>
              </div>
            } @else {
              <div class="auth-header">
                <div class="auth-logo show-mobile-only">
                  <span nz-icon nzType="thunderbolt" nzTheme="fill"></span>
                  iRSA
                </div>
                <h1 class="auth-title">Tạo tài khoản</h1>
                <p class="auth-subtitle">
                  Điền thông tin để bắt đầu tìm việc
                </p>
              </div>

              <!-- Social Register -->
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

              <!-- Register Form -->
              <form nz-form [formGroup]="registerForm" (ngSubmit)="onSubmit()" nzLayout="vertical">
                <nz-form-item>
                  <nz-form-label nzRequired>Họ và tên</nz-form-label>
                  <nz-form-control nzErrorTip="Vui lòng nhập họ tên">
                    <nz-input-group [nzPrefix]="userIcon" nzSize="large">
                      <input
                        type="text"
                        nz-input
                        formControlName="full_name"
                        placeholder="Nhập họ và tên đầy đủ"
                      />
                    </nz-input-group>
                    <ng-template #userIcon>
                      <span nz-icon nzType="user" nzTheme="outline"></span>
                    </ng-template>
                  </nz-form-control>
                </nz-form-item>

                <nz-form-item>
                  <nz-form-label nzRequired>Email</nz-form-label>
                  <nz-form-control nzErrorTip="Vui lòng nhập địa chỉ email hợp lệ">
                    <nz-input-group [nzPrefix]="emailIcon" nzSize="large">
                      <input
                        type="email"
                        nz-input
                        formControlName="email"
                        placeholder="tenban&#64;example.com"
                      />
                    </nz-input-group>
                    <ng-template #emailIcon>
                      <span nz-icon nzType="mail" nzTheme="outline"></span>
                    </ng-template>
                  </nz-form-control>
                </nz-form-item>

                <nz-form-item>
                  <nz-form-label>Số điện thoại</nz-form-label>
                  <nz-form-control>
                    <nz-input-group [nzPrefix]="phoneIcon" nzSize="large">
                      <input
                        type="tel"
                        nz-input
                        formControlName="phone"
                        placeholder="Nhập số điện thoại (không bắt buộc)"
                      />
                    </nz-input-group>
                    <ng-template #phoneIcon>
                      <span nz-icon nzType="phone" nzTheme="outline"></span>
                    </ng-template>
                  </nz-form-control>
                </nz-form-item>

                <nz-form-item>
                  <nz-form-label nzRequired>Mật khẩu</nz-form-label>
                  <nz-form-control nzErrorTip="Mật khẩu phải có ít nhất 8 ký tự">
                    <nz-input-group [nzPrefix]="passwordIcon" [nzSuffix]="passwordSuffix" nzSize="large">
                      <input
                        [type]="showPassword ? 'text' : 'password'"
                        nz-input
                        formControlName="password"
                        placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
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

                <nz-form-item>
                  <nz-form-label nzRequired>Xác nhận mật khẩu</nz-form-label>
                  <nz-form-control [nzErrorTip]="confirmPasswordError">
                    <nz-input-group [nzPrefix]="confirmIcon" [nzSuffix]="confirmSuffix" nzSize="large">
                      <input
                        [type]="showConfirmPassword ? 'text' : 'password'"
                        nz-input
                        formControlName="confirmPassword"
                        placeholder="Nhập lại mật khẩu để xác nhận"
                      />
                    </nz-input-group>
                    <ng-template #confirmIcon>
                      <span nz-icon nzType="lock" nzTheme="outline"></span>
                    </ng-template>
                    <ng-template #confirmSuffix>
                      <span
                        nz-icon
                        [nzType]="showConfirmPassword ? 'eye' : 'eye-invisible'"
                        nzTheme="outline"
                        class="password-toggle"
                        (click)="showConfirmPassword = !showConfirmPassword"
                      ></span>
                    </ng-template>
                    <ng-template #confirmPasswordError>
                      @if (registerForm.hasError('mismatch')) {
                        Mật khẩu không khớp
                      } @else {
                        Vui lòng xác nhận mật khẩu
                      }
                    </ng-template>
                  </nz-form-control>
                </nz-form-item>

                <nz-form-item>
                  <nz-form-control>
                    <label nz-checkbox formControlName="agreeTerms">
                      Tôi đồng ý với
                      <a href="#" target="_blank">Điều khoản sử dụng</a>
                      và
                      <a href="#" target="_blank">Chính sách bảo mật</a>
                    </label>
                  </nz-form-control>
                </nz-form-item>

                <button
                  nz-button
                  nzType="primary"
                  nzBlock
                  nzSize="large"
                  [nzLoading]="loading"
                  [disabled]="!registerForm.get('agreeTerms')?.value"
                  type="submit"
                  class="submit-btn"
                >
                  Tạo tài khoản
                </button>
              </form>

              <div class="auth-footer">
                Đã có tài khoản?
                <a routerLink="/login">Đăng nhập ngay</a>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
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
        grid-template-columns: 1fr 1.2fr;
        max-width: 1100px;
        width: 100%;
        background: var(--color-bg-secondary);
        border-radius: var(--radius-2xl);
        overflow: hidden;
        box-shadow: var(--shadow-2xl);

        @media (max-width: 900px) {
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
        padding: var(--space-10);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow-y: auto;
        max-height: 100vh;

        @media (max-width: 768px) {
          padding: var(--space-6);
        }
      }

      .auth-card {
        width: 100%;
        max-width: 420px;
      }

      .auth-header {
        text-align: center;
        margin-bottom: var(--space-6);
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
        .ant-form-item {
          margin-bottom: var(--space-4) !important;
        }

        .ant-form-item-label > label {
          font-weight: var(--font-medium);
          color: var(--color-text-primary);
        }

        .ant-input-affix-wrapper-lg {
          display: flex;
          align-items: center;
          padding: 10px 16px !important;
          border-radius: var(--radius-lg) !important;
        }

        .ant-input-prefix {
          margin-right: 12px !important;
          display: inline-flex;
          align-items: center;
        }

        .ant-input-suffix {
          margin-left: 12px !important;
          display: inline-flex;
          align-items: center;
        }

        .ant-input-lg {
          height: auto !important;
          padding: 0 !important;
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
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

      .submit-btn {
        height: 48px !important;
        border-radius: var(--radius-lg) !important;
        font-weight: var(--font-semibold) !important;
        font-size: var(--text-base) !important;
        margin-top: var(--space-4);
      }

      .auth-footer {
        text-align: center;
        margin-top: var(--space-6);
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

      /* Success State */
      .success-state {
        text-align: center;
        padding: var(--space-8) 0;
      }

      .success-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto var(--space-6);
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-success-bg);
        border-radius: var(--radius-full);
        color: var(--color-success);
        font-size: 40px;
      }

      .success-state h2 {
        font-family: var(--font-heading);
        font-size: var(--text-2xl);
        font-weight: var(--font-bold);
        color: var(--color-text-primary);
        margin-bottom: var(--space-4);
      }

      .success-state p {
        color: var(--color-text-secondary);
        font-size: var(--text-base);
        line-height: var(--leading-relaxed);
        margin-bottom: var(--space-8);

        strong {
          color: var(--color-text-primary);
        }
      }

      .success-actions {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);

        button {
          height: 48px !important;
          border-radius: var(--radius-lg) !important;
        }
      }

      /* Responsive */
      @media (max-width: 899px) {
        .hide-mobile {
          display: none !important;
        }
      }

      @media (min-width: 900px) {
        .show-mobile-only {
          display: none !important;
        }
      }
    `,
  ],
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  registered = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private message: NzMessageService
  ) {
    this.registerForm = this.fb.group(
      {
        full_name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        phone: [''],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
        agreeTerms: [false],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      Object.values(this.registerForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity();
        }
      });
      return;
    }

    this.loading = true;
    const { full_name, email, phone, password } = this.registerForm.value;

    this.authService
      .register({
        full_name,
        email,
        password,
        phone: phone || undefined,
      })
      .subscribe({
        next: () => {
          this.registered = true;
          this.message.success('Đăng ký thành công! Vui lòng xác nhận email.');
        },
        error: (err) => {
          this.loading = false;
          this.message.error(err.error?.detail || 'Đăng ký thất bại');
        },
      });
  }
}
