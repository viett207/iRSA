import { Component, OnInit, OnDestroy, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzResultModule } from 'ng-zorro-antd/result';
import { interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';

export interface PasswordCriteria {
  label: string;
  met: boolean;
}

@Component({
  selector: 'app-reset-password',
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
    <div class="auth-page">
      <div class="auth-card">
        @if (!token()) {
          <!-- Invalid / Missing Token -->
          <div class="state-container error-state">
            <div class="error-icon-wrapper">
              <div class="error-pulse-ring"></div>
              <div class="error-icon-circle">
                <span nz-icon nzType="close-circle" nzTheme="fill"></span>
              </div>
            </div>

            <h1 class="state-title text-error">Liên kết không hợp lệ</h1>
            <p class="state-description">
              Không tìm thấy mã xác thực (token) trong liên kết đặt lại mật khẩu hoặc liên kết đã bị hỏng.
            </p>

            <div class="actions">
              <button
                nz-button
                nzType="primary"
                nzSize="large"
                class="action-btn-primary"
                routerLink="/forgot-password"
              >
                <span nz-icon nzType="mail" nzTheme="outline"></span>
                <span>Yêu cầu liên kết mới</span>
              </button>
              <button
                nz-button
                nzSize="large"
                class="action-btn-default"
                routerLink="/login"
              >
                <span nz-icon nzType="arrow-left" nzTheme="outline"></span>
                <span>Về trang đăng nhập</span>
              </button>
            </div>
          </div>
        } @else if (success()) {
          <!-- Success State -->
          <div class="state-container success-state">
            <div class="success-icon-wrapper">
              <div class="pulse-ring"></div>
              <svg class="success-svg" viewBox="0 0 52 52">
                <circle class="success-circle" cx="26" cy="26" r="24" fill="none" />
                <path class="success-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>

            <h1 class="state-title text-success">Đặt lại mật khẩu thành công!</h1>
            <p class="state-description">
              Mật khẩu tài khoản của bạn đã được cập nhật thành công. Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.
            </p>

            <div class="countdown-box">
              <div class="countdown-badge">
                <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                <span>Tự động chuyển về trang Đăng nhập sau <strong>{{ countdown() }}s</strong></span>
              </div>
              <div class="countdown-progress-track">
                <div class="countdown-progress-fill" [style.width.%]="(countdown() / 5) * 100"></div>
              </div>
            </div>

            <div class="actions">
              <button
                nz-button
                nzType="primary"
                nzSize="large"
                class="action-btn-primary"
                (click)="goToLogin()"
              >
                <span>Đăng nhập ngay</span>
                <span nz-icon nzType="arrow-right" nzTheme="outline"></span>
              </button>
            </div>
          </div>
        } @else {
          <!-- Reset Password Form -->
          <div class="auth-header">
            <div class="icon-circle">
              <span nz-icon nzType="key" nzTheme="outline"></span>
            </div>
            <h1 class="auth-title">Đặt lại mật khẩu</h1>
            <p class="auth-subtitle">
              Tạo mật khẩu mới an toàn cho tài khoản iRSA của bạn.
            </p>
          </div>

          @if (error()) {
            <nz-alert
              nzType="error"
              [nzMessage]="error()!"
              nzShowIcon
              nzCloseable
              (nzOnClose)="error.set(null)"
              class="alert-box"
            ></nz-alert>
          }

          <form nz-form [formGroup]="form" (ngSubmit)="onSubmit()" nzLayout="vertical" aria-label="Form đặt lại mật khẩu mới">
            <!-- New Password -->
            <nz-form-item>
              <nz-form-label nzRequired nzFor="reset-password">Mật khẩu mới</nz-form-label>
              <nz-form-control nzErrorTip="Mật khẩu phải có tối thiểu 8 ký tự">
                <nz-input-group
                  [nzPrefix]="passwordIcon"
                  [nzSuffix]="passwordSuffix"
                  nzSize="large"
                >
                  <input
                    id="reset-password"
                    nz-input
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password"
                    placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                    (input)="onPasswordInput()"
                    autocomplete="new-password"
                    aria-required="true"
                    aria-label="Mật khẩu mới"
                  />
                </nz-input-group>
                <ng-template #passwordIcon>
                  <span nz-icon nzType="lock" nzTheme="outline" aria-hidden="true"></span>
                </ng-template>
                <ng-template #passwordSuffix>
                  <span
                    nz-icon
                    [nzType]="showPassword() ? 'eye' : 'eye-invisible'"
                    nzTheme="outline"
                    class="password-toggle"
                    role="button"
                    tabindex="0"
                    [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'"
                    (click)="showPassword.set(!showPassword())"
                    (keydown.enter)="showPassword.set(!showPassword())"
                    (keydown.space)="$event.preventDefault(); showPassword.set(!showPassword())"
                  ></span>
                </ng-template>
              </nz-form-control>
            </nz-form-item>

            <!-- Password Strength Indicator -->
            @if (form.get('password')?.value) {
              <div class="strength-meter" role="status" aria-live="polite">
                <div class="strength-header">
                  <span class="strength-label">Độ an toàn:</span>
                  <span class="strength-text" [ngClass]="strengthClass()">{{ strengthLabel() }}</span>
                </div>
                <div class="strength-bars">
                  <div class="bar" [ngClass]="getBarClass(1)"></div>
                  <div class="bar" [ngClass]="getBarClass(2)"></div>
                  <div class="bar" [ngClass]="getBarClass(3)"></div>
                  <div class="bar" [ngClass]="getBarClass(4)"></div>
                </div>

                <!-- Criteria Checklist -->
                <div class="criteria-list">
                  @for (item of criteria(); track item.label) {
                    <div class="criteria-item" [class.met]="item.met">
                      <span
                        nz-icon
                        [nzType]="item.met ? 'check-circle' : 'close-circle'"
                        [nzTheme]="item.met ? 'fill' : 'outline'"
                        aria-hidden="true"
                      ></span>
                      <span>{{ item.label }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Confirm Password -->
            <nz-form-item>
              <nz-form-label nzRequired nzFor="reset-confirmpassword">Xác nhận mật khẩu mới</nz-form-label>
              <nz-form-control [nzErrorTip]="confirmPasswordErrorTpl">
                <nz-input-group
                  [nzPrefix]="confirmIcon"
                  [nzSuffix]="confirmSuffix"
                  nzSize="large"
                >
                  <input
                    id="reset-confirmpassword"
                    nz-input
                    [type]="showConfirmPassword() ? 'text' : 'password'"
                    formControlName="confirmPassword"
                    placeholder="Nhập lại mật khẩu mới"
                    autocomplete="new-password"
                    aria-required="true"
                    aria-label="Xác nhận lại mật khẩu mới"
                  />
                </nz-input-group>
                <ng-template #confirmIcon>
                  <span nz-icon nzType="lock" nzTheme="outline" aria-hidden="true"></span>
                </ng-template>
                <ng-template #confirmSuffix>
                  <span
                    nz-icon
                    [nzType]="showConfirmPassword() ? 'eye' : 'eye-invisible'"
                    nzTheme="outline"
                    class="password-toggle"
                    role="button"
                    tabindex="0"
                    [attr.aria-label]="showConfirmPassword() ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'"
                    (click)="showConfirmPassword.set(!showConfirmPassword())"
                    (keydown.enter)="showConfirmPassword.set(!showConfirmPassword())"
                    (keydown.space)="$event.preventDefault(); showConfirmPassword.set(!showConfirmPassword())"
                  ></span>
                </ng-template>
                <ng-template #confirmPasswordErrorTpl>
                  @if (form.hasError('mismatch') && form.get('confirmPassword')?.touched) {
                    Mật khẩu xác nhận không khớp
                  } @else {
                    Vui lòng xác nhận lại mật khẩu
                  }
                </ng-template>
              </nz-form-control>
            </nz-form-item>

            <button
              nz-button
              nzType="primary"
              nzSize="large"
              nzBlock
              class="submit-btn"
              [nzLoading]="loading()"
              [disabled]="form.invalid || loading()"
              type="submit"
              aria-label="Cập nhật mật khẩu mới"
            >
              <span nz-icon nzType="check" nzTheme="outline" aria-hidden="true"></span>
              <span>Cập nhật mật khẩu</span>
            </button>
          </form>

          <div class="back-link">
            <a routerLink="/login" aria-label="Quay lại trang đăng nhập">
              <span nz-icon nzType="arrow-left" nzTheme="outline" aria-hidden="true"></span>
              <span>Quay lại trang đăng nhập</span>
            </a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: calc(100vh - 160px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-6) var(--space-4);
      background-color: var(--color-bg-primary);
    }

    .auth-card {
      background: var(--color-bg-secondary);
      border-radius: var(--radius-2xl);
      box-shadow: var(--shadow-2xl);
      border: 1px solid var(--color-border);
      padding: 48px 36px;
      width: 100%;
      max-width: 480px;
      position: relative;
      overflow: hidden;

      @media (max-width: 576px) {
        padding: 32px 20px;
      }
    }

    .auth-header {
      text-align: center;
      margin-bottom: 28px;
    }

    .icon-circle {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: var(--color-primary-50, #eff6ff);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin: 0 auto 16px;
      border: 1px solid var(--color-primary-100, #dbeafe);
    }

    .auth-title {
      font-family: var(--font-heading);
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
      color: var(--color-text-primary);
      margin-bottom: 8px;
    }

    .auth-subtitle {
      color: var(--color-text-secondary);
      font-size: var(--text-sm);
      line-height: var(--leading-relaxed);
      margin: 0;
    }

    .alert-box {
      margin-bottom: 20px;
      text-align: left;
      border-radius: var(--radius-md);
    }

    .password-toggle {
      cursor: pointer;
      color: var(--color-text-tertiary);
      transition: color var(--transition-fast);

      &:hover {
        color: var(--color-text-primary);
      }
    }

    /* Strength Meter */
    .strength-meter {
      background: var(--color-bg-tertiary, #f8fafc);
      border: 1px solid var(--color-border-light, #e2e8f0);
      border-radius: var(--radius-lg);
      padding: 12px 14px;
      margin-bottom: 20px;
      margin-top: -6px;
    }

    .strength-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: var(--text-xs);
      margin-bottom: 6px;
    }

    .strength-label {
      color: var(--color-text-tertiary);
    }

    .strength-text {
      font-weight: 700;

      &.strength-weak { color: var(--color-danger, #ef4444); }
      &.strength-fair { color: var(--color-warning, #f59e0b); }
      &.strength-good { color: var(--color-primary, #3b82f6); }
      &.strength-strong { color: var(--color-success, #10b981); }
    }

    .strength-bars {
      display: flex;
      gap: 4px;
      height: 4px;
      margin-bottom: 10px;
    }

    .bar {
      flex: 1;
      height: 100%;
      background: var(--color-neutral-200, #e2e8f0);
      border-radius: var(--radius-full);
      transition: background var(--transition-normal);

      &.filled-weak { background: var(--color-danger, #ef4444); }
      &.filled-fair { background: var(--color-warning, #f59e0b); }
      &.filled-good { background: var(--color-primary, #3b82f6); }
      &.filled-strong { background: var(--color-success, #10b981); }
    }

    .criteria-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;

      @media (max-width: 480px) {
        grid-template-columns: 1fr;
      }
    }

    .criteria-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--color-text-tertiary);
      transition: color var(--transition-fast);

      span:first-child {
        font-size: 12px;
      }

      &.met {
        color: var(--color-success-dark, #065f46);
        font-weight: 500;

        span:first-child {
          color: var(--color-success, #10b981);
        }
      }
    }

    .submit-btn {
      height: 48px !important;
      border-radius: var(--radius-lg) !important;
      font-weight: var(--font-semibold) !important;
      font-size: var(--text-base) !important;
      margin-top: 8px;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .back-link {
      text-align: center;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--color-border);

      a {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--color-text-secondary);
        font-size: var(--text-sm);
        font-weight: var(--font-medium);

        &:hover {
          color: var(--color-primary);
        }
      }
    }

    /* State container */
    .state-container {
      text-align: center;
      padding: 8px 0;
    }

    /* Success State */
    .success-icon-wrapper {
      width: 88px;
      height: 88px;
      margin: 0 auto 20px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pulse-ring {
      position: absolute;
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.15);
      animation: pulse-wave 2.2s infinite ease-out;
      pointer-events: none;
    }

    @keyframes pulse-wave {
      0% { transform: scale(0.9); opacity: 0.9; }
      70% { transform: scale(1.4); opacity: 0; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    .success-svg {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      display: block;
      stroke-width: 3.5;
      stroke: var(--color-success);
      stroke-miterlimit: 10;
      box-shadow: inset 0px 0px 0px var(--color-success);
      animation: fill-success 0.4s ease-in-out 0.4s forwards, scale-pop 0.35s ease-in-out 0.85s both;
    }

    .success-circle {
      stroke-dasharray: 166;
      stroke-dashoffset: 166;
      stroke-width: 3.5;
      stroke-miterlimit: 10;
      stroke: var(--color-success);
      fill: none;
      animation: stroke-circle 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
    }

    .success-check {
      transform-origin: 50% 50%;
      stroke-dasharray: 48;
      stroke-dashoffset: 48;
      stroke-width: 4;
      stroke: #ffffff;
      animation: stroke-check 0.4s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
    }

    @keyframes stroke-circle { 100% { stroke-dashoffset: 0; } }
    @keyframes stroke-check { 100% { stroke-dashoffset: 0; } }
    @keyframes fill-success { 100% { box-shadow: inset 0px 0px 0px 44px var(--color-success); } }
    @keyframes scale-pop {
      0%, 100% { transform: none; }
      50% { transform: scale3d(1.12, 1.12, 1); }
    }

    /* Error State */
    .error-icon-wrapper {
      width: 84px;
      height: 84px;
      margin: 0 auto 20px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .error-pulse-ring {
      position: absolute;
      width: 84px;
      height: 84px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.15);
      animation: pulse-wave 2.2s infinite ease-out;
      pointer-events: none;
    }

    .error-icon-circle {
      font-size: 64px;
      color: var(--color-danger);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .state-title {
      font-family: var(--font-heading);
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
      margin-bottom: 8px;

      &.text-success { color: var(--color-success-dark, var(--color-success)); }
      &.text-error { color: var(--color-danger-dark, var(--color-danger)); }
    }

    .state-description {
      color: var(--color-text-secondary);
      font-size: var(--text-sm);
      line-height: var(--leading-relaxed);
      margin-bottom: 24px;
    }

    .countdown-box {
      width: 100%;
      max-width: 340px;
      margin: 0 auto 24px;
      background: var(--color-success-bg, #ecfdf5);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: var(--radius-lg);
      padding: 10px 14px;
    }

    .countdown-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      color: var(--color-success-dark, #065f46);
      margin-bottom: 6px;

      strong {
        font-weight: 700;
        font-size: var(--text-sm);
      }
    }

    .countdown-progress-track {
      width: 100%;
      height: 4px;
      background: rgba(16, 185, 129, 0.2);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .countdown-progress-fill {
      height: 100%;
      background: var(--color-success);
      border-radius: var(--radius-full);
      transition: width 1s linear;
    }

    .actions {
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
  `],
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  readonly token = signal<string | null>(null);
  readonly loading = signal<boolean>(false);
  readonly success = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly countdown = signal<number>(5);

  readonly showPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);

  readonly passwordScore = signal<number>(0);
  readonly criteria = signal<PasswordCriteria[]>([
    { label: 'Tối thiểu 8 ký tự', met: false },
    { label: 'Chữ hoa và chữ thường', met: false },
    { label: 'Ít nhất 1 chữ số (0-9)', met: false },
    { label: 'Ký tự đặc biệt (!@#$...)', met: false },
  ]);

  readonly strengthLabel = computed(() => {
    const score = this.passwordScore();
    if (score <= 1) return 'Yếu';
    if (score === 2) return 'Trung bình';
    if (score === 3) return 'Khá';
    return 'Mạnh';
  });

  readonly strengthClass = computed(() => {
    const score = this.passwordScore();
    if (score <= 1) return 'strength-weak';
    if (score === 2) return 'strength-fair';
    if (score === 3) return 'strength-good';
    return 'strength-strong';
  });

  private countdownSub: Subscription | null = null;

  readonly form: FormGroup = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator }
  );

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (!password || !confirmPassword) return null;
    return password === confirmPassword ? null : { mismatch: true };
  }

  ngOnInit(): void {
    const queryToken = this.route.snapshot.queryParamMap.get('token');
    if (queryToken) {
      this.token.set(queryToken);
    }
  }

  ngOnDestroy(): void {
    this.countdownSub?.unsubscribe();
  }

  onPasswordInput(): void {
    const val = this.form.get('password')?.value || '';
    let score = 0;

    const hasMinLength = val.length >= 8;
    const hasUpperAndLower = /[a-z]/.test(val) && /[A-Z]/.test(val);
    const hasDigit = /\d/.test(val);
    const hasSpecial = /[^a-zA-Z0-9]/.test(val);

    if (hasMinLength) score++;
    if (hasUpperAndLower) score++;
    if (hasDigit) score++;
    if (hasSpecial) score++;

    this.passwordScore.set(score);
    this.criteria.set([
      { label: 'Tối thiểu 8 ký tự', met: hasMinLength },
      { label: 'Chữ hoa và chữ thường', met: hasUpperAndLower },
      { label: 'Ít nhất 1 chữ số (0-9)', met: hasDigit },
      { label: 'Ký tự đặc biệt (!@#$...)', met: hasSpecial },
    ]);
  }

  getBarClass(index: number): string {
    const score = this.passwordScore();
    if (score < index) return '';
    if (score <= 1) return 'filled-weak';
    if (score === 2) return 'filled-fair';
    if (score === 3) return 'filled-good';
    return 'filled-strong';
  }

  onSubmit(): void {
    if (this.form.invalid || !this.token() || this.loading()) {
      Object.values(this.form.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity();
        }
      });
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    const newPassword = this.form.value.password;

    this.authService
      .resetPassword(this.token()!, newPassword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set(true);
          this.startCountdown();
        },
        error: (err) => {
          this.loading.set(false);
          const detail = err?.error?.detail;
          if (typeof detail === 'string' && detail) {
            this.error.set(detail);
          } else {
            this.error.set('Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn hoặc không hợp lệ.');
          }
        },
      });
  }

  private startCountdown(): void {
    this.countdown.set(5);
    this.countdownSub?.unsubscribe();

    this.countdownSub = interval(1000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        takeWhile(() => this.countdown() > 0, true)
      )
      .subscribe({
        next: () => {
          const current = Math.max(0, this.countdown() - 1);
          this.countdown.set(current);
          if (current <= 0) {
            this.goToLogin();
          }
        },
      });
  }

  goToLogin(): void {
    this.countdownSub?.unsubscribe();
    this.router.navigate(['/login']);
  }
}

