import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzResultModule } from 'ng-zorro-antd/result';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzAlertModule,
    NzResultModule,
  ],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        @if (!submitted) {
          <h2>
            <span nz-icon nzType="lock" nzTheme="outline" style="margin-right: 8px"></span>
            Quên mật khẩu
          </h2>
          <p style="color: #888; margin-bottom: 24px">
            Nhập email đã đăng ký, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
          </p>

          @if (error) {
            <nz-alert nzType="error" [nzMessage]="error" nzShowIcon
              style="margin-bottom: 16px" nzCloseable></nz-alert>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <nz-form-item>
              <nz-form-control nzErrorTip="Vui lòng nhập email hợp lệ">
                <nz-input-group nzPrefixIcon="mail" nzSize="large">
                  <input nz-input formControlName="email" placeholder="Email" />
                </nz-input-group>
              </nz-form-control>
            </nz-form-item>

            <button nz-button nzType="primary" nzSize="large" nzBlock
              [nzLoading]="loading" [disabled]="form.invalid">
              Gửi hướng dẫn
            </button>
          </form>

          <div style="text-align: center; margin-top: 16px">
            <a routerLink="/login">
              <span nz-icon nzType="arrow-left" style="margin-right: 4px"></span>
              Quay lại đăng nhập
            </a>
          </div>
        } @else {
          <nz-result nzStatus="success"
            nzTitle="Đã gửi email!"
            nzSubTitle="Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (bao gồm thư rác).">
            <div nz-result-extra>
              <button nz-button nzType="primary" routerLink="/login">
                Quay lại đăng nhập
              </button>
            </div>
          </nz-result>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 60vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 16px;
    }
    .auth-card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      padding: 40px;
      width: 100%;
      max-width: 440px;
    }
    h2 {
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
    }
  `],
})
export class ForgotPasswordComponent {
  form: FormGroup;
  loading = false;
  submitted = false;
  error: string | null = null;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;

    this.authService.forgotPassword(this.form.value.email).subscribe({
      next: () => {
        this.loading = false;
        this.submitted = true;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.detail || 'Có lỗi xảy ra. Vui lòng thử lại.';
      },
    });
  }
}
