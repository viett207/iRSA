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
  templateUrl: './resend-verification.component.html',
  styleUrl: './resend-verification.component.scss',
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
