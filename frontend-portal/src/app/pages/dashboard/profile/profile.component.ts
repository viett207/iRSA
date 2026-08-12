import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
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
  `],
})
export class ProfileComponent implements OnInit {
  private profileService = inject(ProfileService);
  private message = inject(NzMessageService);

  loadingProfile = true;
  savingProfile = false;
  profile: Profile | null = null;

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loadingProfile = true;
    this.profileService.get().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.loadingProfile = false;
      },
      error: () => {
        this.message.error('Không thể tải thông tin hồ sơ');
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
        error: (err) => {
          this.message.error(err.error?.detail || 'Có lỗi xảy ra');
          this.savingProfile = false;
        },
      });
  }
}
