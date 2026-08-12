import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';

import { Profile, ProfileUpdate } from '../../../../shared/models/profile.model';

@Component({
  selector: 'app-profile-info',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzGridModule,
  ],
  template: `
    <nz-card nzTitle="Thông tin cá nhân" class="section-card">
      <form nz-form nzLayout="vertical">
        <div nz-row [nzGutter]="16">
          <div nz-col [nzSpan]="12" [nzXs]="24" [nzSm]="12">
            <nz-form-item>
              <nz-form-label>Họ và tên</nz-form-label>
              <nz-form-control>
                <input nz-input [(ngModel)]="profile.full_name" name="full_name" />
              </nz-form-control>
            </nz-form-item>
          </div>
          <div nz-col [nzSpan]="12" [nzXs]="24" [nzSm]="12">
            <nz-form-item>
              <nz-form-label>Email</nz-form-label>
              <nz-form-control>
                <input nz-input [value]="profile.email" disabled />
              </nz-form-control>
            </nz-form-item>
          </div>
        </div>

        <div nz-row [nzGutter]="16">
          <div nz-col [nzSpan]="12" [nzXs]="24" [nzSm]="12">
            <nz-form-item>
              <nz-form-label>Số điện thoại</nz-form-label>
              <nz-form-control>
                <input nz-input [(ngModel)]="profile.phone" name="phone" placeholder="0912 345 678" />
              </nz-form-control>
            </nz-form-item>
          </div>
          <div nz-col [nzSpan]="12" [nzXs]="24" [nzSm]="12">
            <nz-form-item>
              <nz-form-label>Địa điểm</nz-form-label>
              <nz-form-control>
                <input nz-input [(ngModel)]="profile.location" name="location" placeholder="Hồ Chí Minh" />
              </nz-form-control>
            </nz-form-item>
          </div>
        </div>

        <nz-form-item>
          <nz-form-label>Tiêu đề chuyên môn</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              [(ngModel)]="profile.headline"
              name="headline"
              placeholder="VD: Senior Frontend Developer | 5+ năm kinh nghiệm"
            />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label>Giới thiệu bản thân</nz-form-label>
          <nz-form-control>
            <textarea
              nz-input
              [(ngModel)]="profile.summary"
              name="summary"
              [nzAutosize]="{ minRows: 3, maxRows: 6 }"
              placeholder="Mô tả ngắn về bạn, kinh nghiệm và mục tiêu nghề nghiệp..."
            ></textarea>
          </nz-form-control>
        </nz-form-item>

        <div nz-row [nzGutter]="16">
          <div nz-col [nzSpan]="12" [nzXs]="24" [nzSm]="12">
            <nz-form-item>
              <nz-form-label>LinkedIn</nz-form-label>
              <nz-form-control>
                <input
                  nz-input
                  [(ngModel)]="profile.linkedin_url"
                  name="linkedin_url"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </nz-form-control>
            </nz-form-item>
          </div>
          <div nz-col [nzSpan]="12" [nzXs]="24" [nzSm]="12">
            <nz-form-item>
              <nz-form-label>Portfolio</nz-form-label>
              <nz-form-control>
                <input
                  nz-input
                  [(ngModel)]="profile.portfolio_url"
                  name="portfolio_url"
                  placeholder="https://yourportfolio.com"
                />
              </nz-form-control>
            </nz-form-item>
          </div>
        </div>

        <div class="form-actions">
          <button nz-button nzType="primary" [nzLoading]="saving" (click)="save.emit()">
            <span nz-icon nzType="save" nzTheme="outline"></span>
            Lưu thay đổi
          </button>
        </div>
      </form>
    </nz-card>
  `,
  styles: [`
    .section-card {
      margin-bottom: var(--space-6);
    }

    .form-actions {
      margin-top: var(--space-6);
      padding-top: var(--space-6);
      border-top: 1px solid var(--color-border);
    }
  `],
})
export class ProfileInfoComponent {
  @Input({ required: true }) profile!: Profile;
  @Input() saving = false;
  @Output() save = new EventEmitter<void>();
}
