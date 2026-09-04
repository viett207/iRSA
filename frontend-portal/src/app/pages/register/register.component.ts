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
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzDividerModule,
    NzAlertModule,
    NzCheckboxModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  registered = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private message: NzMessageService
  ) {
    this.registerForm = this.fb.group(
      {
        full_name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        phone: [''],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
        agreeTerms: [false],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      Object.values(this.registerForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity();
        }
      });
      return;
    }

    this.loading = true;
    const { full_name, email, phone, password } = this.registerForm.value;

    this.authService
      .register({
        full_name,
        email,
        password,
        phone: phone || undefined,
      })
      .subscribe({
        next: () => {
          this.registered = true;
          this.message.success('Đăng ký thành công! Vui lòng xác nhận email.');
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          this.message.error(this.getRegisterErrorMessage(err));
        },
      });
  }

  private getRegisterErrorMessage(err: HttpErrorResponse): string {
    const detail = err.error?.detail;
    if (err.status === 0) {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend (cổng 8000) đã được khởi động chưa.';
    }
    if (err.status === 409 || (typeof detail === 'string' && detail.toLowerCase().includes('already registered'))) {
      return 'Email này đã được đăng ký trong hệ thống. Vui lòng đăng nhập hoặc sử dụng email khác.';
    }
    if (err.status === 422) {
      if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0];
        if (first.loc?.includes('password')) return 'Mật khẩu phải có độ dài tối thiểu 8 ký tự.';
        if (first.loc?.includes('email')) return 'Địa chỉ email không đúng định dạng.';
        if (first.msg) return first.msg;
      }
      return 'Thông tin đăng ký chưa hợp lệ. Vui lòng kiểm tra lại.';
    }
    if (err.status === 429) {
      return 'Bạn đã thao tác đăng ký quá nhiều lần. Vui lòng đợi một lát rồi thử lại.';
    }
    if (err.status >= 500) {
      return 'Hệ thống đang gặp sự cố khi xử lý tài khoản. Vui lòng thử lại sau.';
    }
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    if (typeof detail === 'object' && detail?.message) {
      return detail.message;
    }
    return 'Đăng ký thất bại. Vui lòng kiểm tra thông tin và thử lại.';
  }
}
