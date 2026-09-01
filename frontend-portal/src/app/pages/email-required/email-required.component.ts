import { Component, inject, DestroyRef, signal, OnInit, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-email-required',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzResultModule,
    NzButtonModule,
    NzAlertModule,
    NzIconModule,
    NzInputModule,
  ],
  template: `
    <div class="email-required-page">
      <div class="email-required-card">
        <!-- Icon -->
        <div class="icon-wrapper">
          <div class="icon-pulse"></div>
          <div class="icon-inner">
            <span nz-icon nzType="mail" nzTheme="outline"></span>
          </div>
        </div>

        <h1 class="card-title">Kích hoạt tài khoản Email</h1>
        <p class="card-description">
          Tài khoản
          <strong class="email-highlight">{{ displayEmail }}</strong>
          cần được xác thực email trước khi bạn có thể sử dụng các dịch vụ tuyển dụng trên <strong>iRSA</strong>.
        </p>

        @if (message()) {
          <nz-alert
            [nzType]="message()!.type"
            [nzMessage]="message()!.text"
            nzShowIcon
            class="alert-box"
          ></nz-alert>
        }

        <!-- Steps Guide -->
        <div class="guide-box">
          <div class="guide-item">
            <div class="step-num">1</div>
            <div class="step-text">Kiểm tra hộp thư đến (hoặc mục <em>Spam / Thư rác</em>) của <strong>{{ displayEmail }}</strong>.</div>
          </div>
          <div class="guide-item">
            <div class="step-num">2</div>
            <div class="step-text">Nhấp vào liên kết <strong>Xác thực tài khoản</strong> trong email được gửi từ hệ thống iRSA.</div>
          </div>
          <div class="guide-item">
            <div class="step-num">3</div>
            <div class="step-text">Sau khi xác thực thành công, bạn có thể đăng nhập và trải nghiệm đầy đủ tính năng.</div>
          </div>
        </div>

        <!-- Cooldown / Anti-spam Indicator -->
        @if (cooldown() > 0) {
          <div class="cooldown-badge">
            <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
            <span>Bạn có thể gửi lại email sau <strong>{{ cooldown() }}s</strong></span>
          </div>
        }

        <!-- Actions -->
        <div class="actions">
          <button
            nz-button
            nzType="primary"
            nzSize="large"
            nzBlock
            class="resend-btn"
            [nzLoading]="sending()"
            [disabled]="sending() || cooldown() > 0 || !displayEmail"
            (click)="resendEmail()"
          >
            @if (cooldown() > 0) {
              <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
              <span>Gửi lại sau ({{ cooldown() }}s)</span>
            } @else {
              <span nz-icon nzType="send" nzTheme="outline"></span>
              <span>Gửi lại email kích hoạt</span>
            }
          </button>

          <button
            nz-button
            nzSize="large"
            nzBlock
            class="login-btn"
            (click)="goToLogin()"
          >
            <span nz-icon nzType="check-circle" nzTheme="outline"></span>
            <span>Tôi đã kích hoạt - Đăng nhập</span>
          </button>

          <button
            nz-button
            nzType="text"
            nzBlock
            class="logout-btn"
            (click)="logout()"
          >
            <span nz-icon nzType="logout" nzTheme="outline"></span>
            <span>Đăng xuất / Đổi tài khoản khác</span>
          </button>
        </div>

        <div class="card-footer">
          <p class="hint">
            Vẫn không nhận được email? Vui lòng kiểm tra kỹ thư mục Thư rác/Quảng cáo hoặc bấm <strong>"Gửi lại email kích hoạt"</strong> phía trên.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .email-required-page {
      min-height: calc(100vh - 160px);
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--space-6) var(--space-4);
      background-color: var(--color-bg-primary);
    }

    .email-required-card {
      background: var(--color-bg-secondary);
      border-radius: var(--radius-2xl);
      padding: 48px 36px;
      max-width: 520px;
      width: 100%;
      text-align: center;
      box-shadow: var(--shadow-2xl);
      border: 1px solid var(--color-border);
      position: relative;
      overflow: hidden;

      @media (max-width: 576px) {
        padding: 36px 20px;
      }
    }

    /* Icon Animation */
    .icon-wrapper {
      width: 88px;
      height: 88px;
      margin: 0 auto 24px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-pulse {
      position: absolute;
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: rgba(245, 158, 11, 0.15);
      animation: pulse-ring 2.2s infinite ease-out;
      pointer-events: none;
    }

    @keyframes pulse-ring {
      0% {
        transform: scale(0.9);
        opacity: 0.9;
      }
      70% {
        transform: scale(1.4);
        opacity: 0;
      }
      100% {
        transform: scale(1.4);
        opacity: 0;
      }
    }

    .icon-inner {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--color-warning-bg, #fffbeb);
      border: 2px solid rgba(245, 158, 11, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 38px;
      color: var(--color-warning, #d97706);
      position: relative;
      z-index: 1;
      animation: gentle-float 3s ease-in-out infinite;
    }

    @keyframes gentle-float {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-4px);
      }
    }

    .card-title {
      font-family: var(--font-heading);
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
      color: var(--color-text-primary);
      margin-bottom: 12px;
      line-height: var(--leading-tight);
    }

    .card-description {
      color: var(--color-text-secondary);
      font-size: var(--text-base);
      line-height: var(--leading-relaxed);
      margin-bottom: 24px;

      .email-highlight {
        color: var(--color-primary);
        word-break: break-all;
      }
    }

    .alert-box {
      margin-bottom: 20px;
      text-align: left;
      border-radius: var(--radius-md);
    }

    /* Guide Box */
    .guide-box {
      background: var(--color-bg-tertiary, #f8fafc);
      border: 1px solid var(--color-border-light, #e2e8f0);
      border-radius: var(--radius-lg);
      padding: 16px;
      margin-bottom: 24px;
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .guide-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      line-height: 1.5;

      .step-num {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--color-primary);
        color: white;
        font-size: 12px;
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

    /* Cooldown Badge */
    .cooldown-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--color-warning-bg, #fffbeb);
      color: var(--color-warning-dark, #b45309);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: var(--radius-full);
      padding: 6px 16px;
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      margin-bottom: 16px;

      strong {
        font-weight: var(--font-bold);
      }
    }

    /* Actions */
    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }

    .resend-btn {
      height: 48px !important;
      border-radius: var(--radius-lg) !important;
      font-weight: var(--font-semibold) !important;
      font-size: var(--text-base) !important;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .login-btn {
      height: 44px !important;
      border-radius: var(--radius-lg) !important;
      font-weight: var(--font-medium) !important;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .logout-btn {
      color: var(--color-text-tertiary) !important;
      font-size: var(--text-sm) !important;

      &:hover {
        color: var(--color-danger) !important;
      }
    }

    .card-footer {
      border-top: 1px solid var(--color-border);
      padding-top: 16px;
      margin-top: 8px;

      .hint {
        font-size: var(--text-xs);
        color: var(--color-text-tertiary);
        margin: 0;
        line-height: 1.5;
      }
    }
  `],
})
export class EmailRequiredComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  readonly cooldown = signal<number>(0);
  readonly sending = signal<boolean>(false);
  readonly message = signal<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  manualEmail = '';

  private cooldownSub: Subscription | null = null;

  ngOnInit(): void {
    const queryEmail = this.route.snapshot.queryParamMap.get('email');
    if (queryEmail) {
      this.manualEmail = queryEmail;
    }
  }

  ngOnDestroy(): void {
    this.cooldownSub?.unsubscribe();
  }

  get displayEmail(): string {
    return this.authService.user()?.email || this.manualEmail || 'email của bạn';
  }

  resendEmail(): void {
    const email = this.authService.user()?.email || this.manualEmail;
    if (!email) {
      this.message.set({
        type: 'warning',
        text: 'Không tìm thấy địa chỉ email. Vui lòng đăng nhập lại để tiếp tục.',
      });
      return;
    }

    if (this.cooldown() > 0 || this.sending()) {
      return;
    }

    this.sending.set(true);
    this.message.set(null);

    this.authService
      .resendVerification(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.sending.set(false);
          this.message.set({
            type: 'success',
            text: res?.message || 'Đã gửi lại email kích hoạt thành công! Vui lòng kiểm tra hộp thư của bạn.',
          });
          this.startCooldown(60);
        },
        error: (err) => {
          this.sending.set(false);
          const detail = err?.error?.detail;
          const status = err?.status;

          if (status === 429 || (typeof detail === 'string' && detail.includes('60'))) {
            this.startCooldown(60);
            this.message.set({
              type: 'warning',
              text: typeof detail === 'string' ? detail : 'Bạn đã yêu cầu quá nhiều lần. Vui lòng đợi 60 giây.',
            });
          } else {
            this.message.set({
              type: 'error',
              text: typeof detail === 'string' && detail ? detail : 'Không thể gửi lại email xác thực lúc này. Vui lòng thử lại sau.',
            });
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

  goToLogin(): void {
    this.cooldownSub?.unsubscribe();
    this.authService.logout();
  }

  logout(): void {
    this.cooldownSub?.unsubscribe();
    this.authService.logout();
  }
}

