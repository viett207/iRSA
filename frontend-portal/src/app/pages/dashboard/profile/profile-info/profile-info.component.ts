import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

import { Profile, ProfileUpdate } from '../../../../shared/models/profile.model';

const OPTIONAL_URL_VALIDATOR: ValidatorFn = (control): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (!value) return null;

  try {
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.')
      ? null
      : { url: true };
  } catch {
    return { url: true };
  }
};

export function normalizeProfileUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

@Component({
  selector: 'app-profile-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzButtonModule, NzFormModule, NzIconModule, NzInputModule],
  template: `
    <section class="profile-card" aria-labelledby="personal-info-title">
      <div class="section-heading">
        <span class="section-icon"><span nz-icon nzType="user" nzTheme="outline"></span></span>
        <div>
          <h2 id="personal-info-title">Thông tin cá nhân</h2>
          <p>Thông tin chính xác giúp nhà tuyển dụng dễ dàng liên hệ với bạn.</p>
        </div>
      </div>

      <form nz-form nzLayout="vertical" [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-grid">
          <nz-form-item>
            <nz-form-label nzRequired>Họ và tên</nz-form-label>
            <nz-form-control nzErrorTip="Vui lòng nhập họ tên từ 2 đến 255 ký tự.">
              <nz-input-group [nzPrefix]="userIcon">
                <input nz-input formControlName="full_name" autocomplete="name" placeholder="Nguyễn Văn An" />
              </nz-input-group>
              <ng-template #userIcon><span nz-icon nzType="user" nzTheme="outline"></span></ng-template>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>Email</nz-form-label>
            <nz-form-control nzErrorTip="Vui lòng nhập địa chỉ email hợp lệ.">
              <nz-input-group [nzPrefix]="mailIcon">
                <input nz-input type="email" formControlName="email" autocomplete="email" placeholder="tenban@example.com" />
              </nz-input-group>
              <ng-template #mailIcon><span nz-icon nzType="mail" nzTheme="outline"></span></ng-template>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>Số điện thoại</nz-form-label>
            <nz-form-control nzErrorTip="Số điện thoại chưa đúng định dạng.">
              <nz-input-group [nzPrefix]="phoneIcon">
                <input nz-input type="tel" formControlName="phone" autocomplete="tel" placeholder="0912 345 678" />
              </nz-input-group>
              <ng-template #phoneIcon><span nz-icon nzType="phone" nzTheme="outline"></span></ng-template>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>Địa chỉ</nz-form-label>
            <nz-form-control>
              <nz-input-group [nzPrefix]="locationIcon">
                <input nz-input formControlName="location" autocomplete="street-address" placeholder="Quận 1, TP. Hồ Chí Minh" />
              </nz-input-group>
              <ng-template #locationIcon><span nz-icon nzType="environment" nzTheme="outline"></span></ng-template>
            </nz-form-control>
          </nz-form-item>
        </div>

        <nz-form-item>
          <nz-form-label>Tiêu đề chuyên môn</nz-form-label>
          <nz-form-control>
            <input nz-input formControlName="headline" maxlength="255" placeholder="Ví dụ: Frontend Developer · 3 năm kinh nghiệm" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label>Giới thiệu ngắn</nz-form-label>
          <nz-form-control>
            <textarea nz-input formControlName="summary" maxlength="3000" [nzAutosize]="{ minRows: 3, maxRows: 6 }" placeholder="Tóm tắt kinh nghiệm, thế mạnh và mục tiêu nghề nghiệp của bạn..."></textarea>
            <span class="character-count">{{ form.controls.summary.value.length }}/3000</span>
          </nz-form-control>
        </nz-form-item>

        <div class="links-heading">
          <h3>Liên kết nghề nghiệp</h3>
          <p>Bạn có thể nhập đường dẫn có hoặc không có <span>https://</span>.</p>
        </div>
        <div class="links-grid">
          <nz-form-item>
            <nz-form-label>LinkedIn</nz-form-label>
            <nz-form-control nzErrorTip="Đường dẫn LinkedIn chưa hợp lệ.">
              <nz-input-group [nzPrefix]="linkedinIcon">
                <input nz-input formControlName="linkedin_url" inputmode="url" placeholder="linkedin.com/in/ten-cua-ban" />
              </nz-input-group>
              <ng-template #linkedinIcon><span nz-icon nzType="linkedin" nzTheme="outline"></span></ng-template>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>GitHub</nz-form-label>
            <nz-form-control nzErrorTip="Đường dẫn GitHub chưa hợp lệ.">
              <nz-input-group [nzPrefix]="githubIcon">
                <input nz-input formControlName="github_url" inputmode="url" placeholder="github.com/ten-cua-ban" />
              </nz-input-group>
              <ng-template #githubIcon><span nz-icon nzType="github" nzTheme="outline"></span></ng-template>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item class="portfolio-field">
            <nz-form-label>Portfolio</nz-form-label>
            <nz-form-control nzErrorTip="Đường dẫn Portfolio chưa hợp lệ.">
              <nz-input-group [nzPrefix]="portfolioIcon">
                <input nz-input formControlName="portfolio_url" inputmode="url" placeholder="portfolio-cua-ban.com" />
              </nz-input-group>
              <ng-template #portfolioIcon><span nz-icon nzType="global" nzTheme="outline"></span></ng-template>
            </nz-form-control>
          </nz-form-item>
        </div>

        <div class="form-actions">
          <span class="privacy-note"><span nz-icon nzType="safety-certificate" nzTheme="outline"></span> Thông tin chỉ được dùng cho mục đích tuyển dụng.</span>
          <button nz-button nzType="primary" type="submit" [nzLoading]="saving">
            <span nz-icon nzType="save" nzTheme="outline"></span>
            Lưu thay đổi
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .profile-card { padding: 32px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-bg-secondary); box-shadow: var(--shadow-card); }
    .section-heading { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 28px; }
    .section-icon { display: grid; place-items: center; flex: 0 0 44px; height: 44px; border-radius: var(--radius-md); color: var(--color-primary); background: var(--color-primary-50); border: 1px solid var(--color-primary-100); font-size: 20px; }
    h2, h3, p { margin: 0; }
    h2 { color: var(--color-text-primary); font: 700 20px/1.3 var(--font-heading); }
    .section-heading p, .links-heading p { margin-top: 5px; color: var(--color-text-secondary); font-size: 13.5px; }
    .form-grid, .links-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 20px; row-gap: 4px; }
    .portfolio-field { grid-column: 1 / -1; }
    nz-form-item { margin-bottom: 20px; }
    ::ng-deep nz-form-label label { color: var(--color-text-primary) !important; font-weight: 600 !important; font-size: var(--text-sm) !important; }
    .character-count { display: block; margin-top: 5px; color: var(--color-text-tertiary); font-size: 11.5px; text-align: right; }
    .links-heading { padding-top: 8px; margin: 8px 0 16px; border-top: 1px dashed var(--color-border); padding-top: 16px; }
    .links-heading h3 { color: var(--color-text-primary); font-size: 15px; font-weight: 700; font-family: var(--font-heading); }
    .links-heading span { color: var(--color-primary); font-weight: 600; }
    .form-actions { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 12px; padding-top: 24px; border-top: 1px solid var(--color-border); }
    .privacy-note { display: flex; align-items: center; gap: 7px; color: var(--color-text-secondary); font-size: 12.5px; }
    .privacy-note [nz-icon] { color: var(--color-success); font-size: 14px; }
    .form-actions button { min-height: 44px; padding: 0 24px; font-weight: 600; border-radius: var(--radius-md); }
    @media (max-width: 768px) {
      .profile-card { padding: 20px 16px; border-radius: var(--radius-md); }
      .form-grid, .links-grid { grid-template-columns: 1fr; }
      .portfolio-field { grid-column: auto; }
      .form-actions { align-items: stretch; flex-direction: column; }
      .form-actions button { width: 100%; }
    }
  `],
})
export class ProfileInfoComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) profile!: Profile;
  @Input() saving = false;
  @Output() save = new EventEmitter<ProfileUpdate>();

  readonly form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.pattern(/^[+0-9][0-9\s().-]{7,19}$/)]],
    location: ['', [Validators.maxLength(255)]],
    headline: ['', [Validators.maxLength(255)]],
    summary: ['', [Validators.maxLength(3000)]],
    linkedin_url: ['', [OPTIONAL_URL_VALIDATOR]],
    github_url: ['', [OPTIONAL_URL_VALIDATOR]],
    portfolio_url: ['', [OPTIONAL_URL_VALIDATOR]],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['profile'] && this.profile) {
      this.form.reset({
        full_name: this.profile.full_name ?? '',
        email: this.profile.email ?? '',
        phone: this.profile.phone ?? '',
        location: this.profile.location ?? '',
        headline: this.profile.headline ?? '',
        summary: this.profile.summary ?? '',
        linkedin_url: this.profile.linkedin_url ?? '',
        github_url: this.profile.github_url ?? '',
        portfolio_url: this.profile.portfolio_url ?? '',
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.save.emit({
      full_name: value.full_name.trim(),
      email: value.email.trim().toLowerCase(),
      phone: value.phone.trim() || null,
      location: value.location.trim() || null,
      headline: value.headline.trim() || null,
      summary: value.summary.trim() || null,
      linkedin_url: normalizeProfileUrl(value.linkedin_url),
      github_url: normalizeProfileUrl(value.github_url),
      portfolio_url: normalizeProfileUrl(value.portfolio_url),
    });
  }
}
