import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { ToastService } from '../../core/services/toast.service';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';

interface PasswordCriterion {
  label: string;
  met: boolean;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TranslateModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzDividerModule,
    NzAlertModule,
    NzCheckboxModule,
  ],
  template: `
    <div class="auth-page">
      <div class="auth-container">
        <!-- Left Side - Branding -->
        <div class="auth-branding hide-mobile">
          <div class="branding-decorations" aria-hidden="true">
            <div class="glow-orb glow-orb-1"></div>
            <div class="glow-orb glow-orb-2"></div>
            <div class="glow-orb glow-orb-3"></div>
            <svg class="tech-pattern" width="100%" height="100%" viewBox="0 0 500 600" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="net-grad-reg-top" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#0284c7" stop-opacity="0.45"/>
                  <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.25"/>
                </linearGradient>
                <linearGradient id="net-grad-reg-bot" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.4"/>
                  <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.25"/>
                </linearGradient>
                <filter id="glow-dot-reg" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <!-- Top Network Cluster (Above Text Area) -->
              <path d="M 35 50 L 120 90 L 230 55 L 360 85 L 465 40" stroke="url(#net-grad-reg-top)" stroke-width="1.2" stroke-dasharray="4 4"/>
              <path d="M 120 90 L 190 30 L 290 68 L 360 85" stroke="url(#net-grad-reg-top)" stroke-width="1.2"/>
              <path d="M 35 50 L 85 18 L 190 30" stroke="url(#net-grad-reg-top)" stroke-width="1"/>

              <circle cx="35" cy="50" r="3.5" fill="#38bdf8" filter="url(#glow-dot-reg)"/>
              <circle cx="85" cy="18" r="3" fill="#60a5fa"/>
              <circle cx="120" cy="90" r="4.5" fill="#38bdf8" filter="url(#glow-dot-reg)"/>
              <circle cx="190" cy="30" r="4" fill="#93c5fd"/>
              <circle cx="230" cy="55" r="3.5" fill="#38bdf8"/>
              <circle cx="290" cy="68" r="4" fill="#60a5fa" filter="url(#glow-dot-reg)"/>
              <circle cx="360" cy="85" r="4.5" fill="#38bdf8" filter="url(#glow-dot-reg)"/>
              <circle cx="465" cy="40" r="3.5" fill="#818cf8"/>

              <!-- Top Decorative Orbit & Sparkle -->
              <circle cx="440" cy="60" r="60" stroke="rgba(37, 99, 235, 0.14)" stroke-width="1.5" stroke-dasharray="6 6"/>
              <g transform="translate(425, 75) scale(0.8)" stroke="rgba(37, 99, 235, 0.25)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </g>

              <!-- Outer Margins Light Accents -->
              <circle cx="18" cy="280" r="3" fill="#38bdf8" filter="url(#glow-dot-reg)"/>
              <circle cx="482" cy="300" r="3" fill="#60a5fa" filter="url(#glow-dot-reg)"/>
              <g transform="translate(455, 250) scale(0.8)" stroke="rgba(2, 132, 199, 0.22)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </g>

              <!-- Bottom Network Cluster (Below Feature Items) -->
              <path d="M 35 520 L 125 555 L 235 510 L 365 550 L 465 510" stroke="url(#net-grad-reg-bot)" stroke-width="1.2" stroke-dasharray="5 5"/>
              <path d="M 125 555 L 210 585 L 320 570 L 435 585" stroke="url(#net-grad-reg-bot)" stroke-width="1.2"/>
              <path d="M 235 510 L 320 570" stroke="url(#net-grad-reg-bot)" stroke-width="1"/>

              <circle cx="35" cy="520" r="3.5" fill="#38bdf8" filter="url(#glow-dot-reg)"/>
              <circle cx="125" cy="555" r="4.5" fill="#60a5fa" filter="url(#glow-dot-reg)"/>
              <circle cx="210" cy="585" r="3" fill="#93c5fd"/>
              <circle cx="235" cy="510" r="4" fill="#38bdf8"/>
              <circle cx="320" cy="570" r="4" fill="#60a5fa" filter="url(#glow-dot-reg)"/>
              <circle cx="365" cy="550" r="4.5" fill="#38bdf8" filter="url(#glow-dot-reg)"/>
              <circle cx="435" cy="585" r="3.5" fill="#818cf8"/>
              <circle cx="465" cy="510" r="3.5" fill="#38bdf8"/>

              <!-- Bottom Decorative Orbit & Icons -->
              <circle cx="75" cy="550" r="60" stroke="rgba(2, 132, 199, 0.15)" stroke-width="1.5"/>
              <g transform="translate(25, 485) scale(0.85)" stroke="rgba(30, 64, 175, 0.25)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                <path d="M12 12v.01"/>
              </g>
              <g transform="translate(445, 485) scale(0.85)" stroke="rgba(2, 132, 199, 0.25)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </g>
            </svg>
          </div>
          <div class="branding-content">
            <div class="brand-logo">
              <div class="brand-logo-badge">
                <span nz-icon nzType="thunderbolt" nzTheme="fill"></span>
              </div>
              <span>iRSA</span>
            </div>
            <h2>Bắt đầu hành trình mới</h2>
            <p>
              Tạo tài khoản để tiếp cận hàng ngàn cơ hội việc làm
              và kết nối với nhà tuyển dụng hàng đầu.
            </p>
            <div class="branding-features">
              <div class="feature-item">
                <div class="feature-icon">
                  <span nz-icon nzType="check" nzTheme="outline"></span>
                </div>
                <span>Miễn phí hoàn toàn</span>
              </div>
              <div class="feature-item">
                <div class="feature-icon">
                  <span nz-icon nzType="check" nzTheme="outline"></span>
                </div>
                <span>Tạo hồ sơ trong 2 phút</span>
              </div>
              <div class="feature-item">
                <div class="feature-icon">
                  <span nz-icon nzType="check" nzTheme="outline"></span>
                </div>
                <span>AI phân tích và gợi ý việc làm</span>
              </div>
              <div class="feature-item">
                <div class="feature-icon">
                  <span nz-icon nzType="check" nzTheme="outline"></span>
                </div>
                <span>Bảo mật thông tin tuyệt đối</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side - Register Form -->
        <div class="auth-form-section">
          <div class="auth-card">
            @if (registered) {
              <!-- Success State -->
              <div class="success-state">
                <div class="success-icon">
                  <span nz-icon nzType="check-circle" nzTheme="fill"></span>
                </div>
                <h2>Đăng ký thành công!</h2>
                <p>
                  Chúng tôi đã gửi email xác nhận đến
                  <strong>{{ registerForm.get('email')?.value }}</strong>.
                  Vui lòng kiểm tra hộp thư và xác nhận email để kích hoạt tài khoản.
                </p>
                <div class="success-actions">
                  <button nz-button nzType="primary" nzBlock nzSize="large" routerLink="/login">
                    Đi đến trang đăng nhập
                  </button>
                  <button nz-button nzBlock nzSize="large" routerLink="/">
                    Quay về trang chủ
                  </button>
                </div>
              </div>
            } @else {
              <div class="auth-header">
                <div class="auth-logo show-mobile-only">
                  <span nz-icon nzType="thunderbolt" nzTheme="fill"></span>
                  <span>iRSA</span>
                </div>
                <h1 class="auth-title">Tạo tài khoản</h1>
                <p class="auth-subtitle">
                  Điền thông tin để bắt đầu tìm việc
                </p>
              </div>

              <!-- Social Register -->
              <div class="social-login">
                <button
                  nz-button
                  nzBlock
                  class="social-btn google"
                  type="button"
                  [nzLoading]="googleLoading"
                  [disabled]="googleLoading || loading"
                  (click)="onGoogleLogin()"
                >
                  <svg class="google-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  Tiếp tục với Google
                </button>
              </div>

              <div class="auth-divider">
                <nz-divider nzText="hoặc"></nz-divider>
              </div>

              <!-- Registration Form -->
              <form nz-form [formGroup]="registerForm" (ngSubmit)="onSubmit()" nzLayout="vertical" aria-label="Form đăng ký tài khoản ứng viên">
                <!-- Full Name -->
                <nz-form-item>
                  <nz-form-label nzRequired nzFor="reg-fullname">Họ và tên</nz-form-label>
                  <nz-form-control [nzErrorTip]="fullNameErrorTpl">
                    <nz-input-group [nzPrefix]="userIcon" nzSize="large">
                      <input
                        id="reg-fullname"
                        type="text"
                        nz-input
                        formControlName="full_name"
                        placeholder="Nhập họ và tên đầy đủ"
                        autocomplete="name"
                        aria-required="true"
                        aria-label="Họ và tên đầy đủ"
                      />
                    </nz-input-group>
                    <ng-template #userIcon>
                      <span nz-icon nzType="user" nzTheme="outline" aria-hidden="true"></span>
                    </ng-template>
                    <ng-template #fullNameErrorTpl>
                      @if (registerForm.get('full_name')?.hasError('required')) {
                        Vui lòng nhập họ và tên
                      } @else if (registerForm.get('full_name')?.hasError('minlength')) {
                        Họ và tên phải có ít nhất 2 ký tự
                      }
                    </ng-template>
                  </nz-form-control>
                </nz-form-item>

                <!-- Email -->
                <nz-form-item>
                  <nz-form-label nzRequired nzFor="reg-email">Email</nz-form-label>
                  <nz-form-control [nzErrorTip]="emailErrorTpl">
                    <nz-input-group [nzPrefix]="emailIcon" nzSize="large">
                      <input
                        id="reg-email"
                        type="email"
                        nz-input
                        formControlName="email"
                        placeholder="tenban&#64;example.com"
                        autocomplete="email"
                        aria-required="true"
                        aria-label="Địa chỉ email"
                      />
                    </nz-input-group>
                    <ng-template #emailIcon>
                      <span nz-icon nzType="mail" nzTheme="outline" aria-hidden="true"></span>
                    </ng-template>
                    <ng-template #emailErrorTpl>
                      @if (registerForm.get('email')?.hasError('required')) {
                        Vui lòng nhập địa chỉ email
                      } @else if (registerForm.get('email')?.hasError('pattern') || registerForm.get('email')?.hasError('email')) {
                        Địa chỉ email không đúng định dạng
                      }
                    </ng-template>
                  </nz-form-control>
                </nz-form-item>

                <!-- Phone -->
                <nz-form-item>
                  <nz-form-label nzFor="reg-phone">Số điện thoại</nz-form-label>
                  <nz-form-control>
                    <nz-input-group [nzPrefix]="phoneIcon" nzSize="large">
                      <input
                        id="reg-phone"
                        type="tel"
                        nz-input
                        formControlName="phone"
                        placeholder="Nhập số điện thoại (không bắt buộc)"
                        autocomplete="tel"
                        aria-label="Số điện thoại liên hệ"
                      />
                    </nz-input-group>
                    <ng-template #phoneIcon>
                      <span nz-icon nzType="phone" nzTheme="outline" aria-hidden="true"></span>
                    </ng-template>
                  </nz-form-control>
                </nz-form-item>

                <!-- Password -->
                <nz-form-item>
                  <nz-form-label nzRequired nzFor="reg-password">Mật khẩu</nz-form-label>
                  <nz-form-control [nzErrorTip]="passwordErrorTpl">
                    <nz-input-group [nzPrefix]="passwordIcon" [nzSuffix]="passwordSuffix" nzSize="large">
                      <input
                        id="reg-password"
                        [type]="showPassword() ? 'text' : 'password'"
                        nz-input
                        formControlName="password"
                        placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
                        (input)="onPasswordInput()"
                        autocomplete="new-password"
                        aria-required="true"
                        aria-label="Mật khẩu tạo mới"
                      />
                    </nz-input-group>
                    <ng-template #passwordIcon>
                      <span nz-icon nzType="lock" nzTheme="outline" aria-hidden="true"></span>
                    </ng-template>
                    <ng-template #passwordSuffix>
                      <span
                        nz-icon
                        [nzType]="showPassword() ? 'eye' : 'eye-invisible'"
                        nzTheme="outline"
                        class="password-toggle"
                        role="button"
                        tabindex="0"
                        [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                        (click)="showPassword.set(!showPassword())"
                        (keydown.enter)="showPassword.set(!showPassword())"
                        (keydown.space)="$event.preventDefault(); showPassword.set(!showPassword())"
                      ></span>
                    </ng-template>
                    <ng-template #passwordErrorTpl>
                      @if (registerForm.get('password')?.hasError('required')) {
                        Vui lòng nhập mật khẩu
                      } @else if (registerForm.get('password')?.hasError('minlength')) {
                        Mật khẩu phải có ít nhất 8 ký tự
                      }
                    </ng-template>
                  </nz-form-control>
                </nz-form-item>

                <!-- Password Strength Meter -->
                @if (registerForm.get('password')?.value) {
                  <div class="strength-meter" role="status" aria-live="polite">
                    <div class="strength-header">
                      <span class="strength-label">Độ an toàn:</span>
                      <span class="strength-text" [ngClass]="strengthClass()">{{ strengthLabel() }}</span>
                    </div>
                    <div class="strength-bars">
                      <div class="bar" [ngClass]="getBarClass(1)"></div>
                      <div class="bar" [ngClass]="getBarClass(2)"></div>
                      <div class="bar" [ngClass]="getBarClass(3)"></div>
                      <div class="bar" [ngClass]="getBarClass(4)"></div>
                    </div>

                    <!-- Criteria Checklist -->
                    <div class="criteria-list">
                      @for (item of criteria(); track item.label) {
                        <div class="criteria-item" [class.met]="item.met">
                          <span
                            nz-icon
                            [nzType]="item.met ? 'check-circle' : 'close-circle'"
                            [nzTheme]="item.met ? 'fill' : 'outline'"
                            aria-hidden="true"
                          ></span>
                          <span>{{ item.label }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Confirm Password -->
                <nz-form-item>
                  <nz-form-label nzRequired nzFor="reg-confirmpassword">Nhập lại mật khẩu</nz-form-label>
                  <nz-form-control [nzErrorTip]="confirmPasswordErrorTpl">
                    <nz-input-group [nzPrefix]="confirmIcon" [nzSuffix]="confirmSuffix" nzSize="large">
                      <input
                        id="reg-confirmpassword"
                        [type]="showConfirmPassword() ? 'text' : 'password'"
                        nz-input
                        formControlName="confirmPassword"
                        placeholder="Nhập lại mật khẩu để xác nhận"
                        autocomplete="new-password"
                        aria-required="true"
                        aria-label="Xác nhận mật khẩu"
                      />
                    </nz-input-group>
                    <ng-template #confirmIcon>
                      <span nz-icon nzType="lock" nzTheme="outline" aria-hidden="true"></span>
                    </ng-template>
                    <ng-template #confirmSuffix>
                      <span
                        nz-icon
                        [nzType]="showConfirmPassword() ? 'eye' : 'eye-invisible'"
                        nzTheme="outline"
                        class="password-toggle"
                        role="button"
                        tabindex="0"
                        [attr.aria-label]="showConfirmPassword() ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'"
                        (click)="showConfirmPassword.set(!showConfirmPassword())"
                        (keydown.enter)="showConfirmPassword.set(!showConfirmPassword())"
                        (keydown.space)="$event.preventDefault(); showConfirmPassword.set(!showConfirmPassword())"
                      ></span>
                    </ng-template>
                    <ng-template #confirmPasswordErrorTpl>
                      @if (registerForm.hasError('mismatch') && registerForm.get('confirmPassword')?.touched) {
                        Mật khẩu xác nhận không khớp
                      } @else {
                        Vui lòng nhập lại mật khẩu
                      }
                    </ng-template>
                  </nz-form-control>
                </nz-form-item>

                <!-- Terms Checkbox -->
                <nz-form-item class="terms-form-item">
                  <nz-form-control [nzErrorTip]="'Bạn cần đồng ý với Điều khoản sử dụng để tiếp tục'">
                    <label nz-checkbox formControlName="agreeTerms" aria-label="Đồng ý với điều khoản sử dụng và chính sách bảo mật">
                      Tôi đồng ý với
                      <a routerLink="/terms" target="_blank" aria-label="Đọc Điều khoản sử dụng">Điều khoản sử dụng</a>
                      và
                      <a routerLink="/privacy" target="_blank" aria-label="Đọc Chính sách bảo mật">Chính sách bảo mật</a>
                    </label>
                  </nz-form-control>
                </nz-form-item>

                <!-- Submit Button -->
                <button
                  nz-button
                  nzType="primary"
                  nzBlock
                  nzSize="large"
                  [nzLoading]="loading"
                  [disabled]="!registerForm.get('agreeTerms')?.value"
                  type="submit"
                  class="submit-btn"
                  aria-label="Tạo tài khoản mới"
                >
                  Tạo tài khoản
                </button>
              </form>

              <div class="auth-footer">
                Đã có tài khoản?
                <a routerLink="/login">Đăng nhập ngay</a>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-page {
        min-height: calc(100vh - 140px);
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: clamp(24px, 4vh, 48px) 16px;
        position: relative;
      }

      .auth-container {
        display: grid;
        grid-template-columns: 44% 56%;
        max-width: 1020px;
        min-height: 640px;
        width: 100%;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 16px 40px -12px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.05);
        border: 1px solid var(--color-border);
        position: relative;
        z-index: 1;
        align-items: stretch;
      }

      /* Branding Section (Left Column) */
      .auth-branding {
        background: radial-gradient(circle at 10% 15%, rgba(56, 189, 248, 0.22) 0%, transparent 50%),
                    radial-gradient(circle at 90% 85%, rgba(59, 130, 246, 0.16) 0%, transparent 50%),
                    linear-gradient(150deg, #f0f7ff 0%, #e0f2fe 35%, #dbeafe 70%, #bfdbfe 100%);
        padding: clamp(36px, 5vh, 48px) clamp(28px, 3.5vw, 40px);
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
        overflow: hidden;
        color: var(--color-text-primary);
        border-right: 1px solid rgba(191, 219, 254, 0.6);
      }

      .branding-decorations {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 0;
      }

      .glow-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(50px);
        pointer-events: none;
      }

      .glow-orb-1 {
        width: 240px;
        height: 240px;
        top: -30px;
        right: -30px;
        background: radial-gradient(circle, rgba(56, 189, 248, 0.28) 0%, transparent 70%);
      }

      .glow-orb-2 {
        width: 220px;
        height: 220px;
        bottom: -30px;
        left: -30px;
        background: radial-gradient(circle, rgba(96, 165, 250, 0.24) 0%, transparent 70%);
      }

      .glow-orb-3 {
        width: 160px;
        height: 160px;
        top: 8%;
        left: 8%;
        background: radial-gradient(circle, rgba(186, 230, 253, 0.3) 0%, transparent 70%);
      }

      .tech-pattern {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0.75;
        z-index: 0;
        pointer-events: none;
      }

      .branding-content {
        position: relative;
        z-index: 2;
      }

      .brand-logo {
        display: inline-flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 24px;

        span:last-child {
          font-family: var(--font-heading);
          font-size: 28px;
          font-weight: 800;
          color: var(--color-primary);
          letter-spacing: -0.02em;
        }
      }

      .brand-logo-badge {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: #ffffff;
        border: 1px solid rgba(59, 130, 246, 0.18);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(15, 82, 186, 0.12), 0 1px 2px rgba(15, 82, 186, 0.08);

        span {
          font-size: 26px;
          color: var(--color-primary);
          filter: drop-shadow(0 2px 6px rgba(15, 82, 186, 0.25));
        }
      }

      .branding-content h2 {
        font-family: var(--font-heading);
        font-size: clamp(22px, 2.2vw, 28px);
        font-weight: 700;
        margin: 0 0 10px 0;
        color: var(--color-text-primary);
        line-height: 1.3;
        letter-spacing: -0.01em;
      }

      .branding-content p {
        font-size: 14px;
        line-height: 1.6;
        color: var(--color-text-secondary);
        margin: 0 0 20px 0;
        font-weight: 400;
      }

      .branding-features {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .feature-item {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 13.5px;
        color: var(--color-text-primary);
        font-weight: 500;
      }

      .feature-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgba(59, 130, 246, 0.12);
        border: 1px solid rgba(59, 130, 246, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        span {
          font-size: 12px;
          color: var(--color-primary);
          font-weight: 700;
        }
      }

      /* Form Section (Right Column) */
      .auth-form-section {
        padding: clamp(20px, 3vh, 30px) clamp(20px, 2.8vw, 36px);
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at 90% 10%, rgba(56, 189, 248, 0.12) 0%, transparent 45%),
                    radial-gradient(circle at 50% 95%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
                    radial-gradient(circle at 95% 50%, rgba(224, 242, 254, 0.2) 0%, transparent 40%),
                    linear-gradient(145deg, #f8fbff 0%, #f0f7ff 50%, #e6f2fe 100%);
        position: relative;
        overflow: hidden;
      }

      .auth-card {
        width: 100%;
        max-width: 430px;
        margin: 0 auto;
        padding: clamp(20px, 2.5vh, 26px) clamp(18px, 2.5vw, 24px);
        background: #ffffff;
        border: 1px solid rgba(226, 232, 240, 0.85);
        border-radius: 18px;
        box-shadow: 0 10px 30px -8px rgba(15, 23, 42, 0.06), 0 0 1px 1px rgba(0, 0, 0, 0.03);
        position: relative;
        z-index: 1;
      }

      .auth-header {
        text-align: center;
        margin-bottom: 12px;
      }

      .auth-logo.show-mobile-only {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-family: var(--font-heading);
        font-size: 22px;
        font-weight: 800;
        color: var(--color-primary);
        margin-bottom: 12px;

        span:first-child {
          font-size: 24px;
        }
      }

      .auth-title {
        font-family: var(--font-heading);
        font-size: 22px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0 0 3px 0;
        letter-spacing: -0.01em;
      }

      .auth-subtitle {
        color: var(--color-text-secondary);
        font-size: 13px;
        margin: 0;
        line-height: 1.35;
      }

      /* Social Login */
      .social-login {
        margin-bottom: 2px;
      }

      .social-btn {
        height: 42px !important;
        border-radius: 10px !important;
        font-weight: 500 !important;
        font-size: 13.5px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 9px !important;
        border: 1px solid var(--color-border) !important;
        color: var(--color-text-primary) !important;
        background: #ffffff !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        transition: all var(--transition-fast) !important;

        &.google {
          .google-icon,
          svg {
            width: 17px;
            height: 17px;
            min-width: 17px;
            min-height: 17px;
            flex-shrink: 0;
            display: inline-block;
            vertical-align: middle;
          }

          &:hover:not([disabled]) {
            border-color: var(--color-primary-light) !important;
            color: var(--color-primary) !important;
            background: #f8fafc !important;
            box-shadow: 0 2px 6px rgba(15, 82, 186, 0.08);
          }
        }
      }

      .auth-divider {
        margin: 10px 0 12px 0;

        ::ng-deep .ant-divider-inner-text {
          color: var(--color-text-tertiary);
          font-size: 12px;
          font-weight: 400;
          padding: 0 10px;
        }

        ::ng-deep .ant-divider-horizontal::before,
        ::ng-deep .ant-divider-horizontal::after {
          border-top-color: rgba(203, 213, 225, 0.6) !important;
        }
      }

      /* Form Styles */
      ::ng-deep {
        .ant-form-item {
          margin-bottom: 10px !important;
        }

        .ant-form-item-label {
          padding: 0 0 2px !important;
        }

        .ant-form-item-label > label {
          font-weight: 500;
          color: var(--color-text-primary);
          font-size: 12.5px !important;
          height: auto !important;
          line-height: 1.3 !important;
        }

        .ant-input-affix-wrapper-lg {
          height: 42px !important;
          min-height: 42px !important;
          padding: 0 12px !important;
          border-radius: 10px !important;
          border: 1px solid rgba(203, 213, 225, 0.8);
          font-size: 13.5px;
          transition: all var(--transition-fast);
          background: #ffffff;
          display: flex !important;
          align-items: center !important;

          &:hover {
            border-color: var(--color-primary-light) !important;
          }

          &-focused {
            border-color: var(--color-primary) !important;
            box-shadow: 0 0 0 3px rgba(15, 82, 186, 0.12) !important;
          }

          .ant-input {
            height: 38px !important;
            font-size: 13.5px !important;
            background: transparent;
            color: var(--color-text-primary);
          }

          .ant-input-prefix {
            margin-right: 8px !important;
            font-size: 14px !important;
            color: var(--color-text-tertiary) !important;
            display: flex !important;
            align-items: center !important;
          }

          .ant-input-suffix {
            margin-left: 8px !important;
            font-size: 14px !important;
            display: flex !important;
            align-items: center !important;
          }
        }

        .ant-form-item-explain,
        .ant-form-item-explain-error {
          font-size: 11px !important;
          line-height: 1.2 !important;
          min-height: auto !important;
          padding-top: 2px !important;
        }

        .terms-form-item {
          margin-bottom: 12px !important;
          margin-top: 2px !important;
        }

        .ant-checkbox-wrapper {
          font-size: 12px !important;
          line-height: 1.4 !important;
          color: var(--color-text-secondary);
          display: inline-flex !important;
          align-items: flex-start !important;

          .ant-checkbox {
            top: 2px !important;
          }

          a {
            color: var(--color-primary);
            font-weight: 500;

            &:hover {
              color: var(--color-primary-dark);
              text-decoration: underline;
            }
          }
        }
      }

      .password-toggle {
        cursor: pointer;
        color: var(--color-text-tertiary);
        font-size: 14px;
        transition: color var(--transition-fast);

        &:hover {
          color: var(--color-text-primary);
        }
      }

      /* Password Strength Meter */
      .strength-meter {
        background: #f8fafc;
        border: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 9px;
        padding: 6px 10px;
        margin-bottom: 8px;
      }

      .strength-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
        font-size: 11px;
      }

      .strength-label {
        color: var(--color-text-secondary);
        font-weight: var(--font-medium);
      }

      .strength-text {
        font-weight: var(--font-semibold);

        &.strength-weak {
          color: var(--color-danger);
        }
        &.strength-fair {
          color: var(--color-warning);
        }
        &.strength-good {
          color: var(--color-primary);
        }
        &.strength-strong {
          color: var(--color-success);
        }
      }

      .strength-bars {
        display: flex;
        gap: 6px;
        margin-bottom: 5px;

        .bar {
          flex: 1;
          height: 4px;
          background: var(--color-border);
          border-radius: var(--radius-full);
          transition: background var(--transition-normal);

          &.filled-weak {
            background: var(--color-danger);
          }
          &.filled-fair {
            background: var(--color-warning);
          }
          &.filled-good {
            background: var(--color-primary);
          }
          &.filled-strong {
            background: var(--color-success);
          }
        }
      }

      .criteria-list {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3px 8px;

        @media (max-width: 480px) {
          grid-template-columns: 1fr;
        }
      }

      .criteria-item {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        color: var(--color-text-tertiary);
        transition: color var(--transition-fast);

        span:first-child {
          font-size: 11px;
          color: var(--color-text-muted);
        }

        &.met {
          color: var(--color-text-primary);

          span:first-child {
            color: var(--color-success);
          }
        }
      }

      .submit-btn {
        height: 42px !important;
        border-radius: 10px !important;
        font-weight: 600 !important;
        font-size: 14px !important;
        background: linear-gradient(135deg, #1d4ed8 0%, #0f52ba 100%) !important;
        border: none !important;
        color: #ffffff !important;
        box-shadow: 0 4px 14px rgba(15, 82, 186, 0.28) !important;
        transition: all var(--transition-fast) !important;
        margin-top: 2px;

        &:hover:not([disabled]) {
          background: linear-gradient(135deg, #1e40af 0%, #0a387e 100%) !important;
          box-shadow: 0 6px 18px rgba(15, 82, 186, 0.38) !important;
          transform: translateY(-1px);
        }

        &:active:not([disabled]) {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(15, 82, 186, 0.25) !important;
        }
      }

      .auth-footer {
        text-align: center;
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid rgba(226, 232, 240, 0.6);
        color: var(--color-text-secondary);
        font-size: 12.5px;

        a {
          color: var(--color-primary);
          font-weight: 600;
          margin-left: 4px;
          transition: color var(--transition-fast);

          &:hover {
            color: var(--color-primary-dark);
            text-decoration: underline;
          }
        }
      }

      /* Success State */
      .success-state {
        text-align: center;
        padding: var(--space-8) 0;
      }

      .success-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto var(--space-6);
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-success-bg);
        border-radius: var(--radius-full);
        color: var(--color-success);
        font-size: 40px;
      }

      .success-state h2 {
        font-family: var(--font-heading);
        font-size: var(--text-2xl);
        font-weight: var(--font-bold);
        color: var(--color-text-primary);
        margin-bottom: var(--space-4);
      }

      .success-state p {
        color: var(--color-text-secondary);
        font-size: var(--text-base);
        line-height: var(--leading-relaxed);
        margin-bottom: var(--space-8);

        strong {
          color: var(--color-text-primary);
        }
      }

      .success-actions {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);

        button {
          height: 48px !important;
          border-radius: var(--radius-lg) !important;
        }
      }

      /* Dark Mode Compatibility */
      :host-context([data-theme='dark']),
      :host-context(.dark) {
        .auth-page {
          background: var(--color-bg-primary);
        }

        .auth-container {
          background: #0f172a;
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        /* Branding Section in Dark Mode */
        .auth-branding {
          background: radial-gradient(circle at 12% 18%, rgba(56, 189, 248, 0.15) 0%, transparent 45%),
                      radial-gradient(circle at 88% 82%, rgba(59, 130, 246, 0.12) 0%, transparent 50%),
                      linear-gradient(150deg, #0b1329 0%, #0f172a 45%, #1e293b 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          color: #f8fafc;
        }

        .glow-orb-1 {
          background: radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%);
        }

        .glow-orb-2 {
          background: radial-gradient(circle, rgba(96, 165, 250, 0.18) 0%, transparent 70%);
        }

        .glow-orb-3 {
          background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
        }

        .tech-pattern {
          opacity: 0.85;
        }

        .brand-logo-badge {
          background: #1e293b;
          border-color: rgba(96, 165, 250, 0.35);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), 0 0 12px rgba(59, 130, 246, 0.2);

          span {
            color: #60a5fa;
            filter: drop-shadow(0 2px 8px rgba(59, 130, 246, 0.5));
          }
        }

        .brand-logo span:last-child {
          color: #60a5fa;
        }

        .branding-content h2 {
          color: #f8fafc;
        }

        .branding-content p {
          color: #94a3b8;
        }

        .feature-item {
          color: #e2e8f0;
        }

        .feature-icon {
          background: rgba(59, 130, 246, 0.18);
          border-color: rgba(96, 165, 250, 0.35);

          span {
            color: #60a5fa;
          }
        }

        .auth-form-section {
          background: radial-gradient(circle at 90% 10%, rgba(56, 189, 248, 0.08) 0%, transparent 45%),
                      radial-gradient(circle at 50% 95%, rgba(59, 130, 246, 0.06) 0%, transparent 50%),
                      linear-gradient(145deg, #0f172a 0%, #172033 50%, #1e293b 100%);
        }

        .auth-card {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .auth-title {
          color: #f8fafc;
        }

        .auth-subtitle {
          color: #94a3b8;
        }

        .social-btn.google {
          background: rgba(15, 23, 42, 0.6) !important;
          border-color: rgba(255, 255, 255, 0.12) !important;
          color: #e2e8f0 !important;

          &:hover:not([disabled]) {
            background: rgba(30, 41, 59, 0.9) !important;
            border-color: var(--color-primary-light) !important;
            color: #ffffff !important;
          }
        }

        .ant-input-affix-wrapper-lg {
          background: rgba(15, 23, 42, 0.6) !important;
          border-color: rgba(255, 255, 255, 0.12) !important;

          .ant-input {
            color: #f1f5f9 !important;
          }

          &:hover {
            border-color: var(--color-primary-light) !important;
            background: rgba(15, 23, 42, 0.8) !important;
          }

          &-focused {
            background: rgba(15, 23, 42, 0.9) !important;
            border-color: var(--color-primary) !important;
          }
        }

        .terms-form-item ::ng-deep .ant-checkbox-wrapper {
          color: #94a3b8;
        }

        .strength-meter {
          background: rgba(15, 23, 42, 0.6);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .auth-divider {
          ::ng-deep .ant-divider-horizontal::before,
          ::ng-deep .ant-divider-horizontal::after {
            border-top-color: rgba(255, 255, 255, 0.1) !important;
          }
          ::ng-deep .ant-divider-inner-text {
            color: #64748b !important;
          }
        }

        .auth-footer {
          border-top-color: rgba(255, 255, 255, 0.1);
          color: #94a3b8;

          a {
            color: #60a5fa;
            &:hover {
              color: #93c5fd;
            }
          }
        }
      }

      /* Responsive */
      @media (max-width: 900px) {
        .auth-container {
          grid-template-columns: 1fr;
          max-width: 480px;
          border-radius: 18px;
        }

        .hide-mobile {
          display: none !important;
        }

        .show-mobile-only {
          display: flex !important;
        }

        .auth-form-section {
          padding: 24px 16px;
        }

        .auth-card {
          padding: 20px 16px;
          border-radius: 16px;
        }
      }

      @media (min-width: 901px) and (max-width: 1040px) {
        .tech-pattern {
          opacity: 0.55;
        }
      }

      @media (min-width: 901px) {
        .show-mobile-only {
          display: none !important;
        }
      }
    `,
  ],
})
export class RegisterComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly message = inject(ToastService);

  loading = false;
  googleLoading = false;
  registered = false;

  onGoogleLogin(): void {
    if (this.googleLoading || this.loading) return;
    this.googleLoading = true;

    this.authService.initiateGoogleSignIn().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (user) => {
        this.googleLoading = false;
        this.message.success('Đăng nhập thành công');
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl && returnUrl !== '/register' && returnUrl !== '/login') {
          this.router.navigateByUrl(returnUrl);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err: unknown) => {
        this.googleLoading = false;
        if (err instanceof HttpErrorResponse) {
          this.message.errorFromHttp(err, 'Đăng nhập với Google không thành công. Vui lòng thử lại.', true);
        } else {
          const errMsg = (err as Error)?.message || '';
          if (
            errMsg.includes('popup_closed') ||
            errMsg.includes('user_cancel') ||
            errMsg.includes('access_denied') ||
            errMsg.includes('closed_by_user')
          ) {
          } else if (
            errMsg.toLowerCase().includes('client id') ||
            errMsg.toLowerCase().includes('client_id') ||
            errMsg.toLowerCase().includes('googleclientid') ||
            errMsg.includes('YOUR_GOOGLE_CLIENT_ID')
          ) {
            this.message.warning('Chưa cấu hình Google Client ID. Vui lòng cấu hình googleClientId trong environment.ts.');
          } else {
            this.message.error(errMsg || 'Đăng nhập với Google không thành công. Vui lòng thử lại.');
          }
        }
      },
    });
  }
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly passwordScore = signal(0);
  readonly criteria = signal<PasswordCriterion[]>([
    { label: 'Tối thiểu 8 ký tự', met: false },
    { label: 'Chữ hoa và chữ thường', met: false },
    { label: 'Ít nhất 1 chữ số (0-9)', met: false },
    { label: 'Ký tự đặc biệt (!@#$...)', met: false },
  ]);

  readonly strengthLabel = computed(() => {
    const score = this.passwordScore();
    if (score <= 1) return 'Yếu';
    if (score === 2) return 'Trung bình';
    if (score === 3) return 'Khá';
    return 'Rất mạnh';
  });

  readonly strengthClass = computed(() => {
    const score = this.passwordScore();
    if (score <= 1) return 'strength-weak';
    if (score === 2) return 'strength-fair';
    if (score === 3) return 'strength-good';
    return 'strength-strong';
  });

  readonly registerForm: FormGroup = this.fb.group(
    {
      full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      email: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
        ],
      ],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      agreeTerms: [false, [Validators.requiredTrue]],
    },
    { validators: this.passwordMatchValidator }
  );

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (!password || !confirmPassword) return null;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onPasswordInput(): void {
    const val = this.registerForm.get('password')?.value || '';
    let score = 0;

    const hasMinLength = val.length >= 8;
    const hasUpperAndLower = /[a-z]/.test(val) && /[A-Z]/.test(val);
    const hasDigit = /\d/.test(val);
    const hasSpecial = /[^a-zA-Z0-9]/.test(val);

    if (hasMinLength) score++;
    if (hasUpperAndLower) score++;
    if (hasDigit) score++;
    if (hasSpecial) score++;

    this.passwordScore.set(score);
    this.criteria.set([
      { label: 'Tối thiểu 8 ký tự', met: hasMinLength },
      { label: 'Chữ hoa và chữ thường', met: hasUpperAndLower },
      { label: 'Ít nhất 1 chữ số (0-9)', met: hasDigit },
      { label: 'Ký tự đặc biệt (!@#$...)', met: hasSpecial },
    ]);
  }

  getBarClass(index: number): string {
    const score = this.passwordScore();
    if (score < index) return '';
    if (score <= 1) return 'filled-weak';
    if (score === 2) return 'filled-fair';
    if (score === 3) return 'filled-good';
    return 'filled-strong';
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading = false;
          this.registered = true;
          this.message.success('Đăng ký tài khoản thành công! Vui lòng kiểm tra email xác nhận.');
        },
        error: (err) => {
          this.loading = false;
          this.message.errorFromHttp(err, 'Đăng ký tài khoản không thành công. Vui lòng thử lại.');
        },
      });
  }
}
