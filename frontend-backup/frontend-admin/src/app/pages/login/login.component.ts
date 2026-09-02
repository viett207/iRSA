import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCheckboxModule,
    NzIconModule,
    RouterModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  loginError: string | null = null;
  showPassword = false;
  portalUrl = environment.portalUrl || 'https://portal-irsa.vercel.app/';
  forgotPasswordUrl = `${this.portalUrl.replace(/\/+$/, '')}/forgot-password`;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private message: NzMessageService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      remember: [true],
    });

    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  clearLoginError(): void {
    this.loginError = null;
  }

  fillAdminAccount(): void {
    this.loginForm.patchValue({
      email: 'admin@example.com',
      password: 'Admin@123456',
    });
    this.clearLoginError();
    this.message.info('Đã tự động điền tài khoản Admin');
  }

  onSubmit(): void {
    this.clearLoginError();

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
      next: () => {
        this.message.success('Đăng nhập thành công');
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loginError = this.getLoginErrorMessage(err);
      },
    });
  }

  private getLoginErrorMessage(err: HttpErrorResponse): string {
    const detail = err.error?.detail;
    const code = typeof detail === 'object' ? detail?.code : undefined;
    const messages: Record<string, string> = {
      INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra và thử lại.',
      EMAIL_NOT_VERIFIED: 'Email chưa được xác thực. Vui lòng kiểm tra hộp thư để kích hoạt tài khoản.',
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
}
