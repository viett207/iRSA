import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCheckboxModule,
    NzIconModule,
    NzDividerModule,
    NzModalModule,
    NzAlertModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  showPassword = false;
  adminUrl = environment.adminUrl || 'http://localhost:4200';

  // Verification modal
  showVerifyModal = false;
  sendingVerify = false;
  unverifiedEmail = '';
  verifyMessage = '';
  verifyMessageType: 'success' | 'error' = 'success';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private message: NzMessageService
  ) {
    this.loginForm = this.fb.group({
      email: ['nguyenviet2k72k3@gmail.com', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      password: ['12345abcde', [Validators.required, Validators.minLength(8)]],
      remember: [true],
    });
  }

  fillCandidateAccount(): void {
    this.loginForm.patchValue({
      email: 'nguyenviet2k72k3@gmail.com',
      password: '12345abcde',
    });
    this.message.info('Đã tự động điền tài khoản Ứng viên');
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      Object.values(this.loginForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity();
        }
      });
      return;
    }

    this.loading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (user) => {
        this.loading = false;
        if (!user.email_verified) {
          this.unverifiedEmail = user.email;
          this.showVerifyModal = true;
        } else {
          this.message.success('Đăng nhập thành công');
          this.router.navigate(['/']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        const code = err.error?.detail?.code;
        if (code === 'EMAIL_NOT_VERIFIED') {
          this.unverifiedEmail = email;
          this.verifyMessage = '';
          this.showVerifyModal = true;
          return;
        }
        this.message.error(this.getLoginErrorMessage(err));
      },
    });
  }

  private getLoginErrorMessage(err: HttpErrorResponse): string {
    const detail = err.error?.detail;
    const code = typeof detail === 'object' ? detail?.code : undefined;
    const messages: Record<string, string> = {
      INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra và thử lại.',
      ACCOUNT_PENDING_APPROVAL: 'Tài khoản đang chờ quản trị viên phê duyệt.',
      ACCOUNT_REJECTED: 'Yêu cầu đăng ký tài khoản đã bị từ chối. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
      ACCOUNT_DISABLED: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
    };

    if (code && messages[code]) return messages[code];
    if (err.status === 0) return 'Không thể kết nối đến hệ thống. Vui lòng kiểm tra mạng và thử lại.';
    if (err.status === 429) return 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi một lát rồi thử lại.';
    if (err.status === 422) return 'Thông tin đăng nhập chưa hợp lệ. Vui lòng kiểm tra email và mật khẩu.';
    if (err.status >= 500) return 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.';
    if (typeof detail === 'object' && detail?.message) return detail.message;
    if (typeof detail === 'string') return detail;
    return 'Không thể đăng nhập. Vui lòng thử lại.';
  }

  resendVerification(): void {
    this.sendingVerify = true;
    this.verifyMessage = '';
    this.authService.resendVerification(this.unverifiedEmail).subscribe({
      next: () => {
        this.sendingVerify = false;
        this.verifyMessage = 'Email xác thực đã được gửi lại thành công!';
        this.verifyMessageType = 'success';
      },
      error: (err) => {
        this.sendingVerify = false;
        this.verifyMessage = err.error?.detail || 'Gửi email thất bại. Vui lòng thử lại.';
        this.verifyMessageType = 'error';
      },
    });
  }

  closeVerifyModal(): void {
    this.showVerifyModal = false;
    this.verifyMessage = '';
  }

  logoutAndClose(): void {
    this.authService.logout();
    this.showVerifyModal = false;
    this.verifyMessage = '';
  }
}
