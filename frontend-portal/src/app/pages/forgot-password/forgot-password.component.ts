import { Component, DestroyRef, inject, signal, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzResultModule } from 'ng-zorro-antd/result';
import { interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
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
        @if (!submitted()) {
          <!-- Form Header -->
          <div class="auth-header">
            <div class="icon-circle">
              <span nz-icon nzType="lock" nzTheme="outline"></span>
            </div>
            <h1 class="auth-title">Quên mật khẩu?</h1>
            <p class="auth-subtitle">
              Nhập email đã đăng ký của bạn. Chúng tôi sẽ gửi hướng dẫn kèm liên kết để bạn đặt lại mật khẩu mới.
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

          <form nz-form [formGroup]="form" (ngSubmit)="onSubmit()" nzLayout="vertical" aria-label="Form yêu cầu khôi phục mật khẩu">
            <nz-form-item>
              <nz-form-label nzRequired nzFor="forgot-email">Địa chỉ Email</nz-form-label>
              <nz-form-control nzErrorTip="Vui lòng nhập đúng định dạng email">
                <nz-input-group [nzPrefix]="emailIcon" nzSize="large">
                  <input
                    id="forgot-email"
                    nz-input
                    type="email"
                    formControlName="email"
                    placeholder="example&#64;email.com"
                    autocomplete="email"
                    aria-required="true"
                    aria-label="Địa chỉ email đã đăng ký tài khoản"
                  />
                </nz-input-group>
                <ng-template #emailIcon>
                  <span nz-icon nzType="mail" nzTheme="outline" aria-hidden="true"></span>
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
              aria-label="Gửi hướng dẫn khôi phục mật khẩu"
            >
              <span nz-icon nzType="send" nzTheme="outline" aria-hidden="true"></span>
              <span>Gửi hướng dẫn khôi phục</span>
            </button>
          </form>

          <div class="back-link">
            <a routerLink="/login" aria-label="Quay trở lại trang đăng nhập">
              <span nz-icon nzType="arrow-left" nzTheme="outline" aria-hidden="true"></span>
              <span>Quay lại đăng nhập</span>
            </a>
          </div>
        } @else {
          <!-- Success State -->
          <div class="success-container">
            <div class="success-icon-wrapper">
              <div class="pulse-ring"></div>
              <svg class="success-svg" viewBox="0 0 52 52">
                <circle class="success-circle" cx="26" cy="26" r="24" fill="none" />
                <path class="success-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>

            <h1 class="state-title text-success">Đã gửi email khôi phục!</h1>
            <p class="state-description">
              Nếu email <strong class="email-highlight">{{ submittedEmail() }}</strong> tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn.
            </p>

            <div class="guide-box">
              <div class="guide-item">
                <div class="step-num">1</div>
                <div class="step-text">Kiểm tra hộp thư đến hoặc mục <em>Thư rác / Spam / Quảng cáo</em>.</div>
              </div>
              <div class="guide-item">
                <div class="step-num">2</div>
                <div class="step-text">Nhấp vào nút <strong>"Đặt lại mật khẩu"</strong> trong email (liên kết có hiệu lực trong 1 giờ).</div>
              </div>
              <div class="guide-item">
                <div class="step-num">3</div>
                <div class="step-text">Nhập mật khẩu mới an toàn và đăng nhập lại vào iRSA.</div>
              </div>
            </div>

            @if (resendMessage()) {
              <nz-alert
                [nzType]="resendMessageType()"
                [nzMessage]="resendMessage()!"
                nzShowIcon
                class="alert-box"
              ></nz-alert>
            }

            <!-- Cooldown indicator -->
            @if (cooldown() > 0) {
              <div class="cooldown-badge">
                <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                <span>Có thể gửi lại sau <strong>{{ cooldown() }}s</strong></span>
              </div>
            }

            <div class="success-actions">
              <button
                nz-button
                nzType="primary"
                nzSize="large"
                nzBlock
                class="action-btn-primary"
                routerLink="/login"
              >
                <span>Về trang đăng nhập</span>
                <span nz-icon nzType="arrow-right" nzTheme="outline"></span>
              </button>

              <button
                nz-button
                nzSize="large"
                nzBlock
                class="action-btn-default"
                [nzLoading]="resending()"
                [disabled]="resending() || cooldown() > 0"
                (click)="resendEmail()"
              >
                @if (cooldown() > 0) {
                  <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                  <span>Gửi lại sau ({{ cooldown() }}s)</span>
                } @else {
                  <span nz-icon nzType="mail" nzTheme="outline"></span>
                  <span>Gửi lại email</span>
                }
              </button>

              <button
                nz-button
                nzType="text"
                nzBlock
                class="change-email-btn"
                (click)="resetForm()"
              >
                <span>Thử địa chỉ email khác</span>
              </button>
            </div>
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

    /* Success State Animations */
    .success-container {
      text-align: center;
    }

    .success-icon-wrapper {
      width: 84px;
      height: 84px;
      margin: 0 auto 20px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pulse-ring {
      position: absolute;
      width: 84px;
      height: 84px;
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
      width: 84px;
      height: 84px;
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

    .state-title {
      font-family: var(--font-heading);
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
      margin-bottom: 8px;

      &.text-success {
        color: var(--color-success-dark, var(--color-success));
      }
    }

    .state-description {
      color: var(--color-text-secondary);
      font-size: var(--text-sm);
      line-height: var(--leading-relaxed);
      margin-bottom: 20px;

      .email-highlight {
        color: var(--color-primary);
        word-break: break-all;
      }
    }

    .guide-box {
      background: var(--color-bg-tertiary, #f8fafc);
      border: 1px solid var(--color-border-light, #e2e8f0);
      border-radius: var(--radius-lg);
      padding: 14px;
      margin-bottom: 20px;
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .guide-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      line-height: 1.4;

      .step-num {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--color-primary);
        color: white;
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 1px;
      }

      .step-text {
        flex: 1;
      }
    }

    .cooldown-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--color-warning-bg, #fffbeb);
      color: var(--color-warning-dark, #b45309);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: var(--radius-full);
      padding: 4px 14px;
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      margin-bottom: 16px;

      strong {
        font-weight: var(--font-bold);
      }
    }

    .success-actions {
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

    .change-email-btn {
      color: var(--color-text-tertiary) !important;
      font-size: var(--text-xs) !important;

      &:hover {
        color: var(--color-primary) !important;
      }
    }
  `],
})
export class ForgotPasswordComponent implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  readonly form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
  });

  readonly loading = signal<boolean>(false);
  readonly submitted = signal<boolean>(false);
  readonly submittedEmail = signal<string>('');
  readonly error = signal<string | null>(null);

  // Resend state & anti-spam cooldown
  readonly resending = signal<boolean>(false);
  readonly cooldown = signal<number>(0);
  readonly resendMessage = signal<string | null>(null);
  readonly resendMessageType = signal<'success' | 'error' | 'warning'>('success');

  private cooldownSub: Subscription | null = null;

  ngOnDestroy(): void {
    this.cooldownSub?.unsubscribe();
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading()) {
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
    const email = this.form.value.email.trim();

    this.authService
      .forgotPassword(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.submittedEmail.set(email);
          this.submitted.set(true);
          this.startCooldown(60);
        },
        error: (err) => {
          this.loading.set(false);
          const detail = err?.error?.detail;
          if (typeof detail === 'string' && detail) {
            this.error.set(detail);
          } else {
            this.error.set('Không thể gửi yêu cầu đặt lại mật khẩu lúc này. Vui lòng thử lại sau.');
          }
        },
      });
  }

  resendEmail(): void {
    const email = this.submittedEmail();
    if (!email || this.resending() || this.cooldown() > 0) return;

    this.resending.set(true);
    this.resendMessage.set(null);

    this.authService
      .forgotPassword(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.resending.set(false);
          this.resendMessageType.set('success');
          this.resendMessage.set('Đã gửi lại hướng dẫn đặt lại mật khẩu thành công!');
          this.startCooldown(60);
        },
        error: (err) => {
          this.resending.set(false);
          const detail = err?.error?.detail;
          const status = err?.status;

          if (status === 429 || (typeof detail === 'string' && detail.includes('60'))) {
            this.startCooldown(60);
            this.resendMessageType.set('warning');
            this.resendMessage.set(typeof detail === 'string' ? detail : 'Bạn đã yêu cầu quá nhiều lần. Vui lòng đợi 60 giây.');
          } else {
            this.resendMessageType.set('error');
            this.resendMessage.set('Không thể gửi lại email lúc này. Vui lòng thử lại sau.');
          }
        },
      });
  }

  private startCooldown(seconds: number): void {
    this.cooldown.set(seconds);
    this.cooldownSub?.unsubscribe();

    this.cooldownSub = interval(1000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        takeWhile(() => this.cooldown() > 0, true)
      )
      .subscribe({
        next: () => {
          const nextVal = Math.max(0, this.cooldown() - 1);
          this.cooldown.set(nextVal);
          if (nextVal <= 0) {
            this.cooldownSub?.unsubscribe();
          }
        },
      });
  }

  resetForm(): void {
    this.cooldownSub?.unsubscribe();
    this.submitted.set(false);
    this.submittedEmail.set('');
    this.error.set(null);
    this.resendMessage.set(null);
    this.form.reset();
  }
}

