import { Component, OnInit, OnDestroy, inject, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzResultModule,
    NzButtonModule,
    NzSpinModule,
    NzIconModule,
    NzAlertModule,
  ],
  template: `
    <div class="verify-page">
      <div class="verify-card">
        @if (status() === 'loading') {
          <div class="state-container loading-state">
            <div class="spinner-wrapper">
              <nz-spin nzSimple nzSize="large"></nz-spin>
            </div>
            <h2>Đang xác thực email</h2>
            <p class="subtitle">Hệ thống đang kiểm tra và kích hoạt tài khoản của bạn, vui lòng đợi trong giây lát...</p>
          </div>
        } @else if (status() === 'success') {
          <div class="state-container success-state">
            <!-- Animated Success Checkmark -->
            <div class="success-icon-wrapper">
              <div class="pulse-ring"></div>
              <svg class="success-svg" viewBox="0 0 52 52">
                <circle class="success-circle" cx="26" cy="26" r="24" fill="none" />
                <path class="success-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>

            <h1 class="state-title text-success">Xác thực email thành công!</h1>
            <p class="state-description">
              Tài khoản của bạn đã được kích hoạt thành công. Bạn có thể sử dụng tất cả dịch vụ và tìm kiếm cơ hội việc làm trên <strong>iRSA</strong>.
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
          <div class="state-container error-state">
            <div class="error-icon-wrapper">
              <div class="error-pulse-ring"></div>
              <div class="error-icon-circle">
                <span nz-icon nzType="close-circle" nzTheme="fill"></span>
              </div>
            </div>

            <h1 class="state-title text-error">{{ errorTitle() }}</h1>
            <p class="state-description">
              {{ errorMessage() }}
            </p>

            <div class="actions error-actions">
              <button
                nz-button
                nzType="primary"
                nzSize="large"
                class="action-btn-primary"
                (click)="goToResend()"
              >
                <span nz-icon nzType="mail" nzTheme="outline"></span>
                <span>Gửi lại email xác thực</span>
              </button>
              <button
                nz-button
                nzSize="large"
                class="action-btn-default"
                (click)="goToLogin()"
              >
                <span nz-icon nzType="login" nzTheme="outline"></span>
                <span>Về trang đăng nhập</span>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .verify-page {
      min-height: calc(100vh - 160px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-6) var(--space-4);
      background-color: var(--color-bg-primary);
    }

    .verify-card {
      background: var(--color-bg-secondary);
      border-radius: var(--radius-2xl);
      box-shadow: var(--shadow-2xl);
      border: 1px solid var(--color-border);
      width: 100%;
      max-width: 540px;
      padding: 48px 36px;
      text-align: center;
      position: relative;
      overflow: hidden;

      @media (max-width: 576px) {
        padding: 36px 20px;
      }
    }

    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* Loading State */
    .loading-state {
      padding: 24px 0;

      .spinner-wrapper {
        margin-bottom: 24px;
        transform: scale(1.3);
      }

      h2 {
        font-size: var(--text-2xl);
        font-weight: var(--font-bold);
        color: var(--color-text-primary);
        margin-bottom: 8px;
      }

      .subtitle {
        color: var(--color-text-secondary);
        font-size: var(--text-base);
        max-width: 420px;
        line-height: var(--leading-relaxed);
        margin: 0;
      }
    }

    /* Success State & Animations */
    .success-icon-wrapper {
      width: 92px;
      height: 92px;
      margin: 0 auto 24px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pulse-ring {
      position: absolute;
      width: 92px;
      height: 92px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.15);
      animation: pulse-wave 2.2s infinite ease-out;
      pointer-events: none;
    }

    @keyframes pulse-wave {
      0% {
        transform: scale(0.9);
        opacity: 0.9;
      }
      70% {
        transform: scale(1.45);
        opacity: 0;
      }
      100% {
        transform: scale(1.45);
        opacity: 0;
      }
    }

    .success-svg {
      width: 92px;
      height: 92px;
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

    @keyframes stroke-circle {
      100% {
        stroke-dashoffset: 0;
      }
    }

    @keyframes stroke-check {
      100% {
        stroke-dashoffset: 0;
      }
    }

    @keyframes fill-success {
      100% {
        box-shadow: inset 0px 0px 0px 48px var(--color-success);
      }
    }

    @keyframes scale-pop {
      0%, 100% {
        transform: none;
      }
      50% {
        transform: scale3d(1.12, 1.12, 1);
      }
    }

    /* Error State */
    .error-icon-wrapper {
      width: 88px;
      height: 88px;
      margin: 0 auto 24px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .error-pulse-ring {
      position: absolute;
      width: 88px;
      height: 88px;
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
      animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }

    @keyframes shake {
      10%, 90% { transform: translate3d(-1px, 0, 0); }
      20%, 80% { transform: translate3d(2px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
      40%, 60% { transform: translate3d(3px, 0, 0); }
    }

    .state-title {
      font-family: var(--font-heading);
      font-size: var(--text-3xl);
      font-weight: var(--font-bold);
      margin-bottom: 12px;
      line-height: var(--leading-tight);

      &.text-success {
        color: var(--color-success-dark, var(--color-success));
      }

      &.text-error {
        color: var(--color-danger-dark, var(--color-danger));
      }
    }

    .state-description {
      color: var(--color-text-secondary);
      font-size: var(--text-base);
      line-height: var(--leading-relaxed);
      margin-bottom: 28px;
      max-width: 460px;
    }

    /* Countdown indicator */
    .countdown-box {
      width: 100%;
      max-width: 360px;
      margin: 0 auto 28px;
      background: var(--color-success-bg, #ecfdf5);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: var(--radius-lg);
      padding: 12px 16px;
    }

    .countdown-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--color-success-dark, #065f46);
      margin-bottom: 8px;

      strong {
        font-weight: var(--font-bold);
        font-size: var(--text-base);
        color: var(--color-success-dark, #065f46);
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

    /* Actions */
    .actions {
      width: 100%;
      max-width: 360px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 0 auto;

      &.error-actions {
        max-width: 400px;
      }
    }

    .action-btn-primary {
      height: 48px !important;
      border-radius: var(--radius-lg) !important;
      font-weight: var(--font-semibold) !important;
      font-size: var(--text-base) !important;
      width: 100%;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .action-btn-default {
      height: 48px !important;
      border-radius: var(--radius-lg) !important;
      font-weight: var(--font-medium) !important;
      font-size: var(--text-base) !important;
      width: 100%;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
  `],
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  readonly status = signal<'loading' | 'success' | 'error'>('loading');
  readonly countdown = signal<number>(5);
  readonly errorTitle = signal<string>('Xác thực thất bại');
  readonly errorMessage = signal<string>('Token xác thực không hợp lệ hoặc đã hết hạn.');

  private countdownSub: Subscription | null = null;

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.status.set('error');
      this.errorTitle.set('Thiếu mã xác thực');
      this.errorMessage.set('Không tìm thấy mã xác thực (token) trong liên kết. Vui lòng kiểm tra lại đường dẫn trong email của bạn.');
      return;
    }

    this.authService
      .verifyEmail(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.status.set('success');
          this.startCountdown();
        },
        error: (err) => {
          this.status.set('error');
          this.errorTitle.set('Xác thực không thành công');
          const detail = err?.error?.detail;
          if (typeof detail === 'string' && detail) {
            this.errorMessage.set(detail);
          } else {
            this.errorMessage.set('Mã xác thực không hợp lệ, đã hết hạn (24 giờ) hoặc đã được sử dụng trước đó.');
          }
        },
      });
  }

  ngOnDestroy(): void {
    this.countdownSub?.unsubscribe();
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

  goToResend(): void {
    this.countdownSub?.unsubscribe();
    this.router.navigate(['/resend-verification']);
  }
}
