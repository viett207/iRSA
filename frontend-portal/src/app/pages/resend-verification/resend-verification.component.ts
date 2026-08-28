import { Component, inject, DestroyRef, signal, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-resend-verification',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzAlertModule,
    NzIconModule,
  ],
  template: `
    <div class="resend-container">
      <div class="resend-card">
        <div class="icon-header">
          <div class="icon-circle">
            <span nz-icon nzType="mail" nzTheme="outline"></span>
          </div>
        </div>

        <h2>Gửi lại email xác thực</h2>
        <p class="subtitle">Nhập email bạn đã đăng ký để nhận lại liên kết kích hoạt tài khoản</p>

        @if (message()) {
          <nz-alert
            [nzType]="messageType()"
            [nzMessage]="message()!"
            nzShowIcon
            class="alert-box"
          ></nz-alert>
        }

        <form (ngSubmit)="onSubmit()">
          <nz-form-item>
            <nz-form-label nzRequired>Địa chỉ Email</nz-form-label>
            <nz-form-control nzErrorTip="Vui lòng nhập đúng định dạng email">
              <nz-input-group [nzPrefix]="emailIcon" nzSize="large">
                <input
                  nz-input
                  type="email"
                  placeholder="email@example.com"
                  [(ngModel)]="email"
                  name="email"
                  required
                />
              </nz-input-group>
              <ng-template #emailIcon>
                <span nz-icon nzType="mail" nzTheme="outline"></span>
              </ng-template>
            </nz-form-control>
          </nz-form-item>

          <button
            nz-button
            nzType="primary"
            nzBlock
            nzSize="large"
            class="submit-btn"
            [nzLoading]="loading()"
            [disabled]="!email || loading() || cooldown() > 0"
          >
            @if (cooldown() > 0) {
              <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
              <span>Gửi lại sau ({{ cooldown() }}s)</span>
            } @else {
              <span nz-icon nzType="send" nzTheme="outline"></span>
              <span>Gửi lại email xác thực</span>
            }
          </button>
        </form>

        <div class="back-link">
          <a routerLink="/login">
            <span nz-icon nzType="arrow-left" nzTheme="outline"></span>
            <span>Quay lại trang đăng nhập</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .resend-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 160px);
      padding: var(--space-6) var(--space-4);
      background-color: var(--color-bg-primary);
    }

    .resend-card {
      background: var(--color-bg-secondary);
      border-radius: var(--radius-2xl);
      padding: 44px 36px;
      max-width: 460px;
      width: 100%;
      box-shadow: var(--shadow-2xl);
      border: 1px solid var(--color-border);

      @media (max-width: 576px) {
        padding: 32px 20px;
      }
    }

    .icon-header {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
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
      border: 1px solid var(--color-primary-100, #dbeafe);
    }

    h2 {
      text-align: center;
      margin-bottom: 8px;
      font-family: var(--font-heading);
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
      color: var(--color-text-primary);
    }

    .subtitle {
      text-align: center;
      color: var(--color-text-secondary);
      font-size: var(--text-sm);
      margin-bottom: 24px;
      line-height: var(--leading-relaxed);
    }

    .alert-box {
      margin-bottom: var(--space-5);
      text-align: left;
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
      margin-top: 20px;
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
  `],
})
export class ResendVerificationComponent implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private authService = inject(AuthService);

  email = '';
  readonly loading = signal<boolean>(false);
  readonly cooldown = signal<number>(0);
  readonly message = signal<string | null>(null);
  readonly messageType = signal<'success' | 'error' | 'warning'>('success');

  private cooldownSub: Subscription | null = null;

  ngOnDestroy(): void {
    this.cooldownSub?.unsubscribe();
  }

  onSubmit(): void {
    if (!this.email || this.loading() || this.cooldown() > 0) return;

    this.loading.set(true);
    this.message.set(null);

    this.authService
      .resendVerification(this.email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.loading.set(false);
          this.messageType.set('success');
          this.message.set(res?.message || 'Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.');
          this.startCooldown(60);
        },
        error: (err) => {
          this.loading.set(false);
          const detail = err?.error?.detail;
          const status = err?.status;

          if (status === 429 || (typeof detail === 'string' && detail.includes('60'))) {
            this.startCooldown(60);
            this.messageType.set('warning');
            this.message.set(typeof detail === 'string' ? detail : 'Bạn đã yêu cầu quá nhiều lần. Vui lòng đợi 60 giây.');
          } else {
            this.messageType.set('error');
            this.message.set(typeof detail === 'string' && detail ? detail : 'Không thể gửi lại email xác thực. Vui lòng thử lại.');
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
}

