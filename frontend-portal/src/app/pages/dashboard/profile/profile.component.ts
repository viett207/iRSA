import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { ProfileService } from '../../../core/services/profile.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Profile, ProfileUpdate } from '../../../shared/models/profile.model';
import { ProfileInfoComponent } from './profile-info/profile-info.component';
import { ResumeManagementComponent } from './resume-management/resume-management.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzAlertModule,
    NzButtonModule,
    NzIconModule,
    NzSpinModule,
    ProfileInfoComponent,
    ResumeManagementComponent,
  ],
  template: `
    <main class="profile-page">
      <div class="page-shell">
        <!-- Back Link -->
        <div class="back-link-wrapper">
          <a routerLink="/" class="back-link">
            <span nz-icon nzType="arrow-left" nzTheme="outline"></span>
            <span>Quay lại trang chủ</span>
          </a>
        </div>

        <header class="page-header">
          <div>
            <span class="eyebrow">HỒ SƠ ỨNG VIÊN</span>
            <h1>Quản lý hồ sơ của bạn</h1>
            <p>Cập nhật thông tin liên hệ và chuẩn bị CV phù hợp cho mỗi cơ hội nghề nghiệp.</p>
          </div>
          <span class="secure-note">
            <span nz-icon nzType="safety-certificate" nzTheme="outline"></span>
            Dữ liệu của bạn được bảo mật
          </span>
        </header>

        @if (loadingProfile) {
          <div class="loading-card">
            <nz-spin nzSize="large"></nz-spin>
            <span>Đang tải hồ sơ ứng viên...</span>
          </div>
        } @else if (profile) {
          <div class="profile-sections">
            <app-profile-info
              [profile]="profile"
              [saving]="savingProfile"
              (save)="saveProfile($event)"
            ></app-profile-info>
            <app-resume-management></app-resume-management>
          </div>
        } @else if (profileError) {
          <div class="error-card">
            <nz-alert
              nzType="error"
              nzShowIcon
              nzMessage="Không thể hiển thị hồ sơ ứng viên"
              [nzDescription]="profileError"
            ></nz-alert>
            <button nz-button nzType="primary" (click)="loadProfile()">
              <span nz-icon nzType="reload" nzTheme="outline"></span>
              Thử tải lại
            </button>
          </div>
        }
      </div>
    </main>
  `,
  styles: [`
    .profile-page { min-height: calc(100vh - var(--header-height)); padding: 40px 0 64px; background: linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 5%, var(--color-bg-primary)) 0, var(--color-bg-primary) 260px); }
    .page-shell { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }
    .back-link-wrapper { margin-bottom: var(--space-5, 20px); }
    .back-link { display: inline-flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: var(--text-sm, 14px); font-weight: 500; text-decoration: none; transition: color var(--transition-fast, .2s ease); }
    .back-link:hover { color: var(--color-primary); }
    .page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 30px; margin-bottom: 28px; }
    .eyebrow { display: block; margin-bottom: 8px; color: var(--color-primary); font-size: 11px; font-weight: 800; letter-spacing: .12em; }
    h1 { margin: 0; color: var(--color-text-primary); font: 800 clamp(28px, 4vw, 40px)/1.2 var(--font-heading); letter-spacing: -.02em; }
    .page-header p { max-width: 680px; margin: 10px 0 0; color: var(--color-text-secondary); font-size: 15px; line-height: 1.6; }
    .secure-note { display: inline-flex; align-items: center; gap: 5px; color: var(--color-success); font-size: 11.5px; white-space: nowrap; }
    .profile-sections { display: grid; gap: 22px; animation: profile-enter .3s ease both; }
    .loading-card, .error-card { padding: 56px 24px; border: 1px solid var(--color-border); border-radius: 20px; background: var(--color-bg-secondary); box-shadow: var(--shadow-sm); }
    .loading-card { min-height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: var(--color-text-secondary); }
    .error-card button { margin-top: 16px; }
    @keyframes profile-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @media (max-width: 700px) {
      .profile-page { padding: 28px 0 44px; }
      .page-shell { width: min(100% - 24px, 1120px); }
      .page-header { align-items: flex-start; flex-direction: column; margin-bottom: 22px; }
      .secure-note { align-self: flex-start; }
    }
  `],
})
export class ProfileComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly profileService = inject(ProfileService);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);

  loadingProfile = true;
  savingProfile = false;
  profile: Profile | null = null;
  profileError: string | null = null;

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loadingProfile = true;
    this.profileError = null;
    this.profileService.get().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.loadingProfile = false;
      },
      error: (error: HttpErrorResponse) => {
        this.profileError = 'Vui lòng kiểm tra kết nối và thử tải lại hồ sơ.';
        this.toast.errorFromHttp(error, 'Không thể tải thông tin hồ sơ.', true);
        this.loadingProfile = false;
      },
    });
  }

  saveProfile(update: ProfileUpdate): void {
    this.savingProfile = true;
    this.profileService.update(update).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.authService.updateCachedUser({
          email: profile.email,
          full_name: profile.full_name,
          phone: profile.phone,
        });
        this.savingProfile = false;
        this.toast.success('Đã lưu thông tin hồ sơ.');
      },
      error: (error: HttpErrorResponse) => {
        this.savingProfile = false;
        const fallback = error.status === 409
          ? 'Email này đã được sử dụng bởi tài khoản khác.'
          : 'Không thể lưu hồ sơ. Vui lòng kiểm tra thông tin và thử lại.';
        this.toast.errorFromHttp(error, fallback, true);
      },
    });
  }
}
