import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { ProfileService } from '../../../core/services/profile.service';
import { Profile } from '../../../shared/models/profile.model';

import { ProfileInfoComponent } from './profile-info/profile-info.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzAlertModule,
    NzButtonModule,
    NzSpinModule,
    ProfileInfoComponent,
  ],
  template: `
    <div class="profile-page">
      <div class="container">
        <div class="page-header">
          <h1>Hồ sơ cá nhân</h1>
          <p>Quản lý thông tin cá nhân của bạn</p>
        </div>

        @if (loadingProfile) {
          <nz-card>
            <div class="loading-wrapper">
              <nz-spin nzSize="large"></nz-spin>
            </div>
          </nz-card>
        } @else if (profile) {
          <app-profile-info
            [profile]="profile"
            [saving]="savingProfile"
            (save)="saveProfile()"
          ></app-profile-info>
        } @else if (profileError) {
          <nz-alert
            nzType="error"
            nzShowIcon
            nzMessage="Không thể hiển thị hồ sơ cá nhân"
            [nzDescription]="profileError"
          ></nz-alert>
          <button nz-button nzType="primary" class="retry-button" (click)="loadProfile()">
            Thử tải lại
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      padding: var(--space-8) 0;
      min-height: 100vh;
      background: var(--color-bg-primary);
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 var(--container-padding);
    }

    .page-header {
      margin-bottom: var(--space-6);

      h1 {
        font-family: var(--font-heading);
        font-size: var(--text-2xl);
        font-weight: var(--font-bold);
        color: var(--color-text-primary);
        margin-bottom: var(--space-2);
      }

      p { color: var(--color-text-secondary); }
    }

    .loading-wrapper {
      display: flex;
      justify-content: center;
      padding: var(--space-12);
    }

    .retry-button {
      margin-top: var(--space-4);
    }
  `],
})
export class ProfileComponent implements OnInit {
  private profileService = inject(ProfileService);
  private message = inject(NzMessageService);

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
    this.profileService.get().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.loadingProfile = false;
      },
      error: (err: HttpErrorResponse) => {
        this.profileError = this.getProfileErrorMessage(err);
        this.message.error(this.profileError);
        this.loadingProfile = false;
      },
    });
  }

  saveProfile(): void {
    if (!this.profile) return;
    this.savingProfile = true;
    this.profileService
      .update({
        full_name: this.profile.full_name,
        phone: this.profile.phone,
        headline: this.profile.headline,
        summary: this.profile.summary,
        location: this.profile.location,
        linkedin_url: this.profile.linkedin_url,
        portfolio_url: this.profile.portfolio_url,
      })
      .subscribe({
        next: (profile) => {
          this.profile = profile;
          this.message.success('Đã lưu thay đổi');
          this.savingProfile = false;
        },
        error: (err: HttpErrorResponse) => {
          this.message.error(this.getProfileErrorMessage(err, true));
          this.savingProfile = false;
        },
      });
  }

  private getProfileErrorMessage(err: HttpErrorResponse, saving = false): string {
    const detail = err.error?.detail;
    const serverMessage = typeof detail === 'object' ? detail?.message : detail;
    if (err.status === 0) return 'Không thể kết nối đến hệ thống. Vui lòng kiểm tra backend và kết nối mạng.';
    if (err.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (err.status === 403) return 'Tài khoản không có quyền truy cập hồ sơ ứng viên.';
    if (err.status === 404) return 'Không tìm thấy hồ sơ cá nhân của bạn.';
    if (err.status === 422) return saving
      ? 'Thông tin hồ sơ chưa hợp lệ. Vui lòng kiểm tra các trường vừa nhập.'
      : 'Dữ liệu hồ sơ từ hệ thống không hợp lệ.';
    if (err.status >= 500) return 'Hệ thống chưa thể xử lý hồ sơ lúc này. Vui lòng thử lại sau.';
    if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
    return saving ? 'Không thể lưu hồ sơ. Vui lòng thử lại.' : 'Không thể tải thông tin hồ sơ.';
  }
}
