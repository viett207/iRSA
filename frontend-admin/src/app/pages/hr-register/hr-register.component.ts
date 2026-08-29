import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzResultModule } from 'ng-zorro-antd/result';
import { environment } from '../../../environments/environment';

/** Validator: confirm password must match password. */
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirm = control.get('confirm_password');
  if (password && confirm && password.value !== confirm.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-hr-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzAlertModule,
    NzResultModule,
  ],
  template: `
    <div class="register-page">
      <!-- Left Panel: Branding -->
      <div class="branding-panel">
        <div class="branding-content">
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
          <div class="hero-section">
            <h1 class="hero-title">
              Tham gia cùng<br/>
              <span class="highlight">đội ngũ HR</span>
            </h1>
            <p class="hero-description">
              Đăng ký tài khoản HR để quản lý tuyển dụng, sàng lọc ứng viên
              và theo dõi quy trình hiệu quả với iRSA.
            </p>
          </div>
          <div class="steps-list">
            <div class="step-item">
              <span class="step-number">1</span>
              <div class="step-text">
                <strong>Đăng ký tài khoản</strong>
                <span>Điền thông tin và mã công ty</span>
              </div>
            </div>
            <div class="step-item">
              <span class="step-number">2</span>
              <div class="step-text">
                <strong>Xác thực email</strong>
                <span>Kiểm tra hộp thư và xác thực</span>
              </div>
            </div>
            <div class="step-item">
              <span class="step-number">3</span>
              <div class="step-text">
                <strong>Chờ phê duyệt</strong>
                <span>Quản trị viên xét duyệt tài khoản</span>
              </div>
            </div>
          </div>
        </div>
        <div class="branding-footer">
          <p>2024 iRSA. All rights reserved.</p>
        </div>
      </div>

      <!-- Right Panel: Form -->
      <div class="form-panel">
        <div class="form-container">
          <!-- Success State -->
          @if (registered) {
            <nz-result
              nzStatus="success"
              nzTitle="Đăng ký thành công!"
              nzSubTitle="Vui lòng kiểm tra email để xác thực tài khoản. Sau khi xác thực, tài khoản sẽ được quản trị viên phê duyệt."
            >
              <div nz-result-extra>
                <a routerLink="/login" nz-button nzType="primary" nzSize="large">
                  Quay lại đăng nhập
                </a>
              </div>
            </nz-result>
          } @else {
            <!-- Form Header -->
            <div class="form-header">
              <h2 class="form-title">Đăng ký tài khoản HR</h2>
              <p class="form-subtitle">Tạo tài khoản để quản lý tuyển dụng cho doanh nghiệp.</p>
            </div>

            @if (errorMessage) {
              <nz-alert nzType="error" [nzMessage]="errorMessage" nzShowIcon style="margin-bottom: 20px;"></nz-alert>
            }

            <form nz-form nzLayout="vertical" [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
              <nz-form-item>
                <nz-form-label nzFor="email" nzNoColon>Email</nz-form-label>
                <nz-form-control [nzErrorTip]="emailError">
                  <nz-input-group [nzPrefix]="emailIcon" nzSize="large">
                    <input id="email" type="email" nz-input formControlName="email" placeholder="hr@company.com"/>
                  </nz-input-group>
                  <ng-template #emailIcon><span nz-icon nzType="mail" nzTheme="outline"></span></ng-template>
                  <ng-template #emailError>Vui lòng nhập email hợp lệ</ng-template>
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label nzFor="full_name" nzNoColon>Họ và tên</nz-form-label>
                <nz-form-control nzErrorTip="Vui lòng nhập họ và tên (tối thiểu 2 ký tự)">
                  <nz-input-group [nzPrefix]="userIcon" nzSize="large">
                    <input id="full_name" type="text" nz-input formControlName="full_name" placeholder="Nguyễn Văn A"/>
                  </nz-input-group>
                  <ng-template #userIcon><span nz-icon nzType="user" nzTheme="outline"></span></ng-template>
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label nzFor="phone" nzNoColon>Số điện thoại <span class="optional">(tùy chọn)</span></nz-form-label>
                <nz-form-control>
                  <nz-input-group [nzPrefix]="phoneIcon" nzSize="large">
                    <input id="phone" type="tel" nz-input formControlName="phone" placeholder="0901234567"/>
                  </nz-input-group>
                  <ng-template #phoneIcon><span nz-icon nzType="phone" nzTheme="outline"></span></ng-template>
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label nzFor="company_code" nzNoColon>Mã công ty</nz-form-label>
                <nz-form-control nzErrorTip="Vui lòng nhập mã công ty">
                  <nz-input-group [nzPrefix]="bankIcon" nzSize="large">
                    <input id="company_code" type="text" nz-input formControlName="company_code" placeholder="ACME"/>
                  </nz-input-group>
                  <ng-template #bankIcon><span nz-icon nzType="bank" nzTheme="outline"></span></ng-template>
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label nzFor="password" nzNoColon>Mật khẩu</nz-form-label>
                <nz-form-control nzErrorTip="Mật khẩu tối thiểu 8 ký tự">
                  <nz-input-group [nzPrefix]="lockIcon" [nzSuffix]="pwSuffix" nzSize="large">
                    <input id="password" [type]="showPassword ? 'text' : 'password'" nz-input formControlName="password" placeholder="Tối thiểu 8 ký tự"/>
                  </nz-input-group>
                  <ng-template #lockIcon><span nz-icon nzType="lock" nzTheme="outline"></span></ng-template>
                  <ng-template #pwSuffix>
                    <span nz-icon class="toggle-pw" [nzType]="showPassword ? 'eye-invisible' : 'eye'" (click)="showPassword = !showPassword"></span>
                  </ng-template>
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label nzFor="confirm_password" nzNoColon>Xác nhận mật khẩu</nz-form-label>
                <nz-form-control [nzErrorTip]="confirmError">
                  <nz-input-group [nzPrefix]="lockIcon2" nzSize="large">
                    <input id="confirm_password" [type]="showPassword ? 'text' : 'password'" nz-input formControlName="confirm_password" placeholder="Nhập lại mật khẩu"/>
                  </nz-input-group>
                  <ng-template #lockIcon2><span nz-icon nzType="lock" nzTheme="outline"></span></ng-template>
                  <ng-template #confirmError>
                    @if (registerForm.get('confirm_password')?.errors?.['required']) { Vui lòng xác nhận mật khẩu }
                    @else { Mật khẩu xác nhận không khớp }
                  </ng-template>
                </nz-form-control>
              </nz-form-item>

              <button nz-button nzType="primary" nzSize="large" nzBlock [nzLoading]="loading" type="submit" class="submit-btn">
                Đăng ký
              </button>
            </form>

            <div class="login-link">
              Đã có tài khoản? <a routerLink="/login">Đăng nhập</a>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-page {
      display: flex;
      min-height: 100vh;
    }

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

    .branding-content { position: relative; z-index: 1; }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 64px;
      svg { width: 48px; height: 48px; }
    }

    .brand-text { display: flex; flex-direction: column; }
    .brand-name { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .brand-tagline { font-size: 13px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; }

    .hero-section { margin-bottom: 48px; }

    .hero-title {
      font-size: 38px;
      font-weight: 700;
      line-height: 1.2;
      margin: 0 0 20px 0;
      .highlight { color: #69B1FF; }
    }

    .hero-description { font-size: 15px; line-height: 1.7; opacity: 0.85; max-width: 420px; margin: 0; }

    .steps-list { display: flex; flex-direction: column; gap: 20px; }

    .step-item { display: flex; align-items: flex-start; gap: 16px; }

    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }

    .step-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      strong { font-size: 15px; font-weight: 600; }
      span { font-size: 13px; opacity: 0.75; }
    }

    .branding-footer {
      position: relative;
      z-index: 1;
      p { margin: 0; font-size: 13px; opacity: 0.6; }
    }

    .form-panel {
      flex: 0 0 540px;
      background: var(--color-bg-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px;
      overflow-y: auto;
    }

    .form-container {
      width: 100%;
      max-width: 400px;
    }

    .form-header { margin-bottom: 28px; }

    .form-title {
      font-size: 26px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 8px 0;
    }

    .form-subtitle { font-size: 14px; color: var(--color-text-secondary); margin: 0; }

    .optional { font-size: 12px; color: var(--color-text-tertiary); font-weight: 400; }

    .register-form { margin-bottom: 16px; }

    nz-form-item {
      margin-bottom: 20px !important;
      width: 100%;
    }

    nz-form-label {
      font-weight: 500 !important;
      padding-bottom: 6px !important;
    }

    nz-form-control {
      width: 100%;
    }

    ::ng-deep {
      .register-form {
        .ant-form-item-control-input-content {
          display: block;
          width: 100%;
        }

        .ant-input-affix-wrapper-lg {
          width: 100%;
          min-height: 48px;
          padding: 10px 16px !important;
          border-radius: 12px !important;
          display: flex;
          align-items: center;
          border: 1px solid var(--color-border, #d9d9d9);
          box-shadow: none;
          transition: all 0.2s ease;

          &:hover {
            border-color: var(--color-primary-300, #69b1ff);
          }

          &:focus,
          &.ant-input-affix-wrapper-focused {
            border-color: var(--color-primary, #0050b3) !important;
            box-shadow: 0 0 0 2px var(--color-primary-100, #BAE0FF) !important;
          }
        }

        .ant-input-prefix {
          margin-right: 12px !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-tertiary, #8c8c8c);
          font-size: 18px;
        }

        .ant-input-suffix {
          margin-left: 12px !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .ant-input-lg {
          height: auto !important;
          padding: 0 !important;
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
          font-size: 15px;
          line-height: 1.5;
        }
      }
    }

    .toggle-pw {
      cursor: pointer;
      color: var(--color-text-tertiary);
      &:hover { color: var(--color-text-primary); }
    }

    .submit-btn {
      height: 48px !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      border-radius: 12px !important;
      margin-top: 8px;
    }

    .login-link {
      text-align: center;
      font-size: 14px;
      color: var(--color-text-secondary);
      a { color: var(--color-primary-light); }
    }

    @media (max-width: 1024px) {
      .branding-panel { flex: 0 0 380px; padding: 40px; }
      .form-panel { flex: 1; }
    }

    @media (max-width: 768px) {
      .register-page { flex-direction: column; }
      .branding-panel { display: none; }
      .form-panel { flex: 1; padding: 24px; }
      .form-container { max-width: 100%; }
    }
  `],
})
export class HRRegisterComponent {
  registerForm: FormGroup;
  loading = false;
  registered = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
  ) {
    this.registerForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
        phone: ['', [Validators.maxLength(50)]],
        company_code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirm_password: ['', [Validators.required]],
      },
      { validators: passwordMatchValidator },
    );
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      Object.values(this.registerForm.controls).forEach((c) => {
        if (c.invalid) { c.markAsDirty(); c.updateValueAndValidity(); }
      });
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { email, full_name, phone, company_code, password } = this.registerForm.value;

    this.http.post<{ message: string }>(
      `${environment.publicApiUrl}/auth/register-hr`,
      { email, full_name, phone: phone || null, company_code, password },
    ).subscribe({
      next: () => {
        this.loading = false;
        this.registered = true;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.detail || 'Đăng ký thất bại. Vui lòng thử lại.';
      },
    });
  }
}
