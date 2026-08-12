import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
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
  ],
  template: `
    <div class="verify-container">
      @if (loading) {
        <div class="loading-state">
          <nz-spin nzSize="large" nzTip="Đang xác thực email..."></nz-spin>
        </div>
      } @else if (success) {
        <nz-result
          nzStatus="success"
          nzTitle="Xác thực email thành công!"
          nzSubTitle="Tài khoản của bạn đã được xác thực. Bạn có thể đăng nhập ngay bây giờ."
        >
          <div nz-result-extra>
            <button nz-button nzType="primary" nzSize="large" routerLink="/login">
              Đăng nhập
            </button>
          </div>
        </nz-result>
      } @else {
        <nz-result
          nzStatus="error"
          [nzTitle]="errorTitle"
          [nzSubTitle]="errorMessage"
        >
          <div nz-result-extra>
            <button nz-button nzType="primary" nzSize="large" (click)="resendVerification()">
              Gửi lại email xác thực
            </button>
            <button nz-button nzSize="large" routerLink="/login">
              Về trang đăng nhập
            </button>
          </div>
        </nz-result>
      }
    </div>
  `,
  styles: [`
    .verify-container {
      max-width: 600px;
      margin: 80px auto;
      padding: 0 24px;
    }
    .loading-state {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
    }
  `],
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  loading = true;
  success = false;
  errorTitle = 'Xác thực thất bại';
  errorMessage = 'Token xác thực không hợp lệ hoặc đã hết hạn.';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading = false;
      this.errorMessage = 'Không tìm thấy token xác thực trong đường link.';
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
      },
      error: (err) => {
        this.loading = false;
        this.success = false;
        this.errorMessage =
          err?.error?.detail || 'Token xác thực không hợp lệ hoặc đã hết hạn.';
      },
    });
  }

  resendVerification(): void {
    this.router.navigate(['/resend-verification']);
  }
}
