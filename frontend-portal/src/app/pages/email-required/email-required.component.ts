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
  templateUrl: './email-required.component.html',
  styleUrl: './email-required.component.scss',
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
