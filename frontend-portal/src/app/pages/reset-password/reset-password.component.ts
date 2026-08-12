import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzResultModule } from 'ng-zorro-antd/result';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-reset-password',
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
        @if (!token) {
          <nz-result nzStatus="error"
            nzTitle="Link không hợp lệ"
            nzSubTitle="Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.">
            <div nz-result-extra>
              <button nz-button nzType="primary" routerLink="/forgot-password">
                Yêu cầu link mới
              </button>
            </div>
          </nz-result>
        } @else if (success) {
          <nz-result nzStatus="success"
            nzTitle="Đặt lại mật khẩu thành công!"
            nzSubTitle="Bạn có thể đăng nhập bằng mật khẩu mới.">
            <div nz-result-extra>
              <button nz-button nzType="primary" routerLink="/login">
                Đăng nhập
              </button>
            </div>
          </nz-result>
        } @else {
          <h2>
            <span nz-icon nzType="key" nzTheme="outline" style="margin-right: 8px"></span>
            Đặt lại mật khẩu
          </h2>
          <p style="color: #888; margin-bottom: 24px">Nhập mật khẩu mới cho tài khoản của bạn.</p>

          @if (error) {
            <nz-alert nzType="error" [nzMessage]="error" nzShowIcon
              style="margin-bottom: 16px" nzCloseable></nz-alert>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <nz-form-item>
              <nz-form-control nzErrorTip="Mật khẩu tối thiểu 8 ký tự">
                <nz-input-group nzPrefixIcon="lock" nzSize="large">
                  <input nz-input type="password" formControlName="password"
                    placeholder="Mật khẩu mới (tối thiểu 8 ký tự)" />
                </nz-input-group>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-control nzErrorTip="Mật khẩu không khớp">
                <nz-input-group nzPrefixIcon="lock" nzSize="large">
                  <input nz-input type="password" formControlName="confirmPassword"
                    placeholder="Xác nhận mật khẩu mới" />
                </nz-input-group>
              </nz-form-control>
            </nz-form-item>

            <button nz-button nzType="primary" nzSize="large" nzBlock
              [nzLoading]="loading"
              [disabled]="form.invalid || form.value.password !== form.value.confirmPassword">
              Đặt lại mật khẩu
            </button>
          </form>
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
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  token: string | null = null;
  loading = false;
  success = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthService,
  ) {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
  }

  onSubmit(): void {
    if (this.form.invalid || !this.token) return;
    if (this.form.value.password !== this.form.value.confirmPassword) return;

    this.loading = true;
    this.error = null;

    this.authService.resetPassword(this.token, this.form.value.password).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.detail || 'Có lỗi xảy ra. Token có thể đã hết hạn.';
      },
    });
  }
}
