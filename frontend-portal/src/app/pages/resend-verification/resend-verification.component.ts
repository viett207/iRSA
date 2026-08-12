import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzIconModule } from 'ng-zorro-antd/icon';
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
        <h2>Gửi lại email xác thực</h2>
        <p class="subtitle">Nhập email bạn đã đăng ký để nhận lại link xác thực</p>

        @if (message) {
          <nz-alert
            [nzType]="messageType"
            [nzMessage]="message"
            nzShowIcon
            style="margin-bottom: 16px;"
          ></nz-alert>
        }

        <form (ngSubmit)="onSubmit()">
          <nz-form-item>
            <nz-form-label>Email</nz-form-label>
            <nz-form-control>
              <nz-input-group [nzPrefix]="emailIcon">
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
            [nzLoading]="loading"
            [disabled]="!email"
          >
            Gửi lại email xác thực
          </button>
        </form>

        <div class="back-link">
          <a routerLink="/login">
            <span nz-icon nzType="arrow-left" nzTheme="outline"></span>
            Quay lại đăng nhập
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
      min-height: calc(100vh - 200px);
      padding: 24px;
    }
    .resend-card {
      background: var(--color-bg-secondary, #fff);
      border-radius: 12px;
      padding: 40px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border: 1px solid var(--color-border, #f0f0f0);
    }
    h2 {
      text-align: center;
      margin-bottom: 8px;
    }
    .subtitle {
      text-align: center;
      color: var(--color-text-secondary, #666);
      margin-bottom: 24px;
    }
    .back-link {
      text-align: center;
      margin-top: 16px;
      a {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
    }
  `],
})
export class ResendVerificationComponent {
  private authService = inject(AuthService);

  email = '';
  loading = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  onSubmit(): void {
    if (!this.email) return;
    this.loading = true;
    this.message = '';

    this.authService.resendVerification(this.email).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.messageType = 'success';
        this.message = res?.message || 'Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.';
      },
      error: (err) => {
        this.loading = false;
        this.messageType = 'error';
        this.message = err?.error?.detail || 'Có lỗi xảy ra. Vui lòng thử lại.';
      },
    });
  }
}
