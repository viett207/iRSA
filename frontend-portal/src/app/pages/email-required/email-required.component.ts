import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-email-required',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzResultModule,
    NzButtonModule,
    NzAlertModule,
    NzIconModule,
  ],
  template: `
    <div class="email-required-container">
      <div class="email-required-card">
        <div class="icon-wrapper">
          <span nz-icon nzType="mail" nzTheme="outline"></span>
        </div>
        <h2>Xác thực email để tiếp tục</h2>
        <p class="description">
          Tài khoản <strong>{{ userEmail }}</strong> chưa được xác thực email.
          Vui lòng kiểm tra hộp thư và nhấn vào link xác thực để sử dụng tài khoản.
        </p>

        @if (message) {
          <nz-alert
            [nzType]="messageType"
            [nzMessage]="message"
            nzShowIcon
            style="margin-bottom: 16px;"
          ></nz-alert>
        }

        <div class="actions">
          <button
            nz-button
            nzType="primary"
            nzSize="large"
            nzBlock
            [nzLoading]="sending"
            (click)="resendEmail()"
          >
            <span nz-icon nzType="send" nzTheme="outline"></span>
            Gửi lại email xác thực
          </button>
          <button
            nz-button
            nzSize="large"
            nzBlock
            (click)="logout()"
          >
            <span nz-icon nzType="logout" nzTheme="outline"></span>
            Đăng xuất
          </button>
        </div>

        <p class="hint">
          Không nhận được email? Kiểm tra thư mục spam hoặc bấm "Gửi lại email xác thực".
        </p>
      </div>
    </div>
  `,
  styles: [`
    .email-required-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 200px);
      padding: 24px;
    }
    .email-required-card {
      background: var(--color-bg-secondary, #fff);
      border-radius: 16px;
      padding: 48px 40px;
      max-width: 460px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border: 1px solid var(--color-border, #f0f0f0);
    }
    .icon-wrapper {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #fff7e6;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 36px;
      color: #fa8c16;
    }
    h2 {
      margin-bottom: 12px;
      font-size: 22px;
    }
    .description {
      color: var(--color-text-secondary, #666);
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }
    .hint {
      font-size: 13px;
      color: var(--color-text-tertiary, #999);
    }
  `],
})
export class EmailRequiredComponent {
  private authService = inject(AuthService);

  sending = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  get userEmail(): string {
    return this.authService.user()?.email || '';
  }

  resendEmail(): void {
    const email = this.userEmail;
    if (!email) return;

    this.sending = true;
    this.message = '';

    this.authService.resendVerification(email).subscribe({
      next: () => {
        this.sending = false;
        this.messageType = 'success';
        this.message = 'Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.';
      },
      error: (err) => {
        this.sending = false;
        this.messageType = 'error';
        this.message = err?.error?.detail || 'Có lỗi xảy ra. Vui lòng thử lại.';
      },
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
