import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';

import { CompanyService } from '../../../core/services/company.service';
import { Company } from '../models/company-api.model';
import { VIETNAMESE_PROVINCES } from '../../../shared/constants/vietnamese-provinces';
import { VIETNAMESE_INDUSTRIES } from '../../../shared/constants/vietnamese-industries';

@Component({
  selector: 'app-company-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzIconModule,
  ],
  template: `
    <nz-modal
      [(nzVisible)]="visible"
      [nzTitle]="company ? 'Chỉnh sửa công ty' : 'Tạo công ty mới'"
      (nzOnCancel)="close()"
      (nzOnOk)="submit()"
      [nzOkLoading]="saving"
      [nzOkDisabled]="formGroup.invalid"
      [nzOkText]="company ? 'Lưu thay đổi' : 'Tạo công ty'"
      nzCancelText="Hủy"
      [nzWidth]="760"
    >
      <ng-container *nzModalContent>
        <div class="company-form-shell">
          <header class="company-form-intro">
            <div class="intro-icon" aria-hidden="true"><span nz-icon nzType="bank"></span></div>
            <div>
              <p class="intro-kicker">Hồ sơ nhà tuyển dụng</p>
              <h3>{{ company ? 'Cập nhật thông tin công ty' : 'Tạo hồ sơ công ty' }}</h3>
              <p>Thông tin này sẽ là nền tảng để quản lý tin tuyển dụng và nhận diện doanh nghiệp trong hệ thống.</p>
            </div>
          </header>

          <div class="company-form-layout">
            <form class="company-form" nz-form [formGroup]="formGroup" nzLayout="vertical" autocomplete="off">
          <div class="form-section-heading">
            <span>01</span>
            <div><strong>Nhận diện doanh nghiệp</strong><small>Thông tin cốt lõi để tìm và quản lý công ty.</small></div>
          </div>
          <!-- Company Code -->
          <nz-form-item>
            <nz-form-label nzRequired>Mã công ty</nz-form-label>
            <nz-form-control [nzErrorTip]="codeErrorTpl">
              <input
                nz-input
                formControlName="company_code"
                placeholder="VD: COMP-001"
              />
              <ng-template #codeErrorTpl let-control>
                @if (control.hasError('required')) {
                  Mã công ty là bắt buộc
                } @else if (control.hasError('minlength')) {
                  Mã công ty phải có ít nhất 2 ký tự
                } @else if (control.hasError('maxlength')) {
                  Mã công ty không được quá 50 ký tự
                }
              </ng-template>
            </nz-form-control>
          </nz-form-item>

          <!-- Company Name -->
          <nz-form-item>
            <nz-form-label nzRequired>Tên công ty</nz-form-label>
            <nz-form-control [nzErrorTip]="nameErrorTpl">
              <input
                nz-input
                formControlName="company_name"
                placeholder="Nhập tên công ty"
              />
              <ng-template #nameErrorTpl let-control>
                @if (control.hasError('required')) {
                  Tên công ty là bắt buộc
                } @else if (control.hasError('minlength')) {
                  Tên công ty phải có ít nhất 2 ký tự
                } @else if (control.hasError('maxlength')) {
                  Tên công ty không được quá 255 ký tự
                }
              </ng-template>
            </nz-form-control>
          </nz-form-item>

          <div class="form-section-heading form-section-heading--details">
            <span>02</span>
            <div><strong>Ngành nghề & khu vực</strong><small>Giúp phân loại tin tuyển dụng và thống kê chính xác hơn.</small></div>
          </div>
          <!-- Location -->
          <nz-form-item>
            <nz-form-label>Địa điểm</nz-form-label>
            <nz-form-control>
              <nz-select
                formControlName="location"
                nzPlaceHolder="Chọn tỉnh/thành phố"
                nzAllowClear
                nzShowSearch
              >
                @for (province of provinces; track province) {
                  <nz-option [nzValue]="province" [nzLabel]="province"></nz-option>
                }
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <!-- Industry -->
          <nz-form-item>
            <nz-form-label>Ngành nghề</nz-form-label>
            <nz-form-control>
              <nz-select
                formControlName="industry"
                nzPlaceHolder="Chọn ngành nghề"
                nzAllowClear
                nzShowSearch
              >
                @for (industry of industries; track industry) {
                  <nz-option [nzValue]="industry" [nzLabel]="industry"></nz-option>
                }
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <div class="form-section-heading form-section-heading--description">
            <span>03</span>
            <div><strong>Giới thiệu doanh nghiệp</strong><small>Giúp ứng viên hiểu rõ hơn về công ty và môi trường làm việc.</small></div>
          </div>
          <nz-form-item class="company-description-field">
            <nz-form-label>Giới thiệu công ty</nz-form-label>
            <nz-form-control [nzErrorTip]="descriptionErrorTpl">
              <textarea
                nz-input
                formControlName="description"
                rows="5"
                maxlength="2000"
                placeholder="Chia sẻ ngắn gọn về lĩnh vực hoạt động, văn hóa hoặc điểm nổi bật của công ty..."
              ></textarea>
              <div class="field-counter">{{ formValue('description').length }}/2000 ký tự</div>
              <ng-template #descriptionErrorTpl let-control>
                @if (control.hasError('maxlength')) {
                  Giới thiệu công ty không được quá 2.000 ký tự
                }
              </ng-template>
            </nz-form-control>
          </nz-form-item>
            </form>

            <aside class="company-preview" aria-label="Xem trước hồ sơ công ty">
              <p class="preview-label">Xem trước hồ sơ</p>
              <div class="preview-status"><span></span> Thông tin hiển thị sau khi lưu</div>
              <article class="company-preview-card">
                <div class="company-avatar">{{ companyInitial() }}</div>
                <h4>{{ companyNamePreview() }}</h4>
                <span class="company-code-preview">{{ companyCodePreview() }}</span>
                <p class="company-summary">{{ companySummary() }}</p>
                <dl>
                  <div>
                    <dt><span nz-icon nzType="apartment"></span> Ngành nghề</dt>
                    <dd>{{ industryPreview() }}</dd>
                  </div>
                  <div>
                    <dt><span nz-icon nzType="environment"></span> Địa điểm</dt>
                    <dd>{{ locationPreview() }}</dd>
                  </div>
                </dl>
              </article>
              <p class="preview-hint">Bạn có thể chỉnh sửa thông tin này sau khi tạo công ty.</p>
            </aside>
          </div>
        </div>
      </ng-container>
    </nz-modal>
  `,
  styles: [`
    :host ::ng-deep .ant-modal-body {
      padding: 0 !important;
    }

    .company-form-shell {
      padding: 24px;
    }

    .company-form-intro {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 22px;
      padding: 16px;
      border: 1px solid var(--color-primary-100);
      border-radius: 14px;
      background: linear-gradient(135deg, var(--color-primary-50), hsl(0 0% 100%));

      h3 {
        margin: 0 0 4px;
        color: var(--color-text-primary);
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.025em;
      }

      p:not(.intro-kicker) {
        max-width: 54ch;
        margin: 0;
        color: var(--color-text-secondary);
        font-size: 13px;
        line-height: 1.55;
      }

      &::after {
        content: '';
        position: absolute;
        right: -32px;
        bottom: -48px;
        width: 132px;
        height: 132px;
        border: 1px solid rgb(161 161 170 / 0.28);
        border-radius: 50%;
        box-shadow: 0 0 0 18px rgb(161 161 170 / 0.08);
        pointer-events: none;
      }
    }

    .intro-icon {
      display: grid;
      width: 40px;
      height: 40px;
      flex: 0 0 40px;
      place-items: center;
      border-radius: 11px;
      color: var(--color-primary);
      background: hsl(0 0% 100% / 0.82);
      box-shadow: 0 5px 12px rgb(24 24 27 / 0.08);
      font-size: 19px;
    }

    .intro-kicker,
    .preview-label {
      margin: 0 0 4px;
      color: var(--color-primary);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .company-form-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 220px;
      gap: 22px;
      align-items: start;
    }

    .company-form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 14px;
      width: 100%;
    }

    .form-section-heading {
      display: flex;
      grid-column: 1 / -1;
      align-items: center;
      gap: 9px;
      margin: 0 0 13px;

      > span {
        display: grid;
        width: 25px;
        height: 25px;
        flex: 0 0 25px;
        place-items: center;
        border-radius: 8px;
        color: var(--color-primary);
        background: var(--color-primary-50);
        font-size: 10px;
        font-weight: 800;
      }

      strong,
      small {
        display: block;
      }

      strong {
        color: var(--color-text-primary);
        font-size: 13px;
        font-weight: 700;
      }

      small {
        margin-top: 1px;
        color: var(--color-text-tertiary);
        font-size: 11px;
        line-height: 1.4;
      }
    }

    .form-section-heading--details {
      margin-top: 5px;
    }

    .form-section-heading--description,
    :host ::ng-deep .company-form .company-description-field {
      grid-column: 1 / -1;
    }

    .form-section-heading--description {
      margin-top: 18px;
    }

    :host ::ng-deep .company-description-field textarea.ant-input {
      display: block;
      width: 100% !important;
      min-height: 116px;
      resize: vertical;
      line-height: 1.55;
    }

    :host ::ng-deep .company-form .company-description-field,
    :host ::ng-deep .company-form .company-description-field .ant-form-item-control,
    :host ::ng-deep .company-form .company-description-field .ant-form-item-control-input,
    :host ::ng-deep .company-form .company-description-field .ant-form-item-control-input-content {
      width: 100%;
    }

    .field-counter {
      margin-top: 5px;
      color: var(--color-text-tertiary);
      font-size: 11px;
      text-align: right;
    }

    :host ::ng-deep .company-form nz-form-item {
      margin-bottom: 16px;
    }

    :host ::ng-deep .company-form nz-form-item:nth-of-type(1),
    :host ::ng-deep .company-form nz-form-item:nth-of-type(2) {
      grid-column: 1 / -1;
    }

    :host ::ng-deep .company-form nz-form-item:nth-last-child(-n + 2) {
      margin-bottom: 0;
    }

    :host ::ng-deep .company-form .ant-form-item-label > label {
      font-size: 13px;
      font-weight: 600;
    }

    :host ::ng-deep .company-form .ant-select-selector,
    :host ::ng-deep .company-form .ant-input {
      min-height: 40px;
    }

    .company-preview {
      min-width: 0;
    }

    .preview-status {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: -1px 0 9px;
      color: var(--color-text-secondary);
      font-size: 11px;
      font-weight: 600;

      span {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--color-success-light);
        box-shadow: 0 0 0 3px hsl(153 46% 54% / 0.15);
      }
    }

    .company-preview-card {
      position: relative;
      padding: 16px;
      overflow: hidden;
      border: 1px solid var(--color-border-light);
      border-radius: 14px;
      background: var(--color-bg-tertiary);
      transition: transform var(--transition-normal), box-shadow var(--transition-normal);

      &:hover {
        box-shadow: 0 10px 22px hsl(220 30% 18% / 0.08);
        transform: translateY(-2px);
      }

      &::before {
        content: '';
        position: absolute;
        top: -36px;
        right: -26px;
        width: 108px;
        height: 108px;
        border-radius: 50%;
        background: rgb(244 244 245 / 0.9);
        pointer-events: none;
      }

      h4 {
        position: relative;
        margin: 11px 0 2px;
        overflow: hidden;
        color: var(--color-text-primary);
        font-size: 15px;
        font-weight: 700;
        line-height: 1.35;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .company-avatar {
      position: relative;
      display: grid;
      width: 42px;
      height: 42px;
      place-items: center;
      border-radius: 12px;
      color: var(--color-primary);
      background: hsl(0 0% 100%);
      box-shadow: 0 3px 8px hsl(220 30% 18% / 0.08);
      font-size: 17px;
      font-weight: 800;
    }

    .company-code-preview {
      color: var(--color-text-tertiary);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.03em;
    }

    .company-summary {
      margin: 13px 0;
      color: var(--color-text-secondary);
      font-size: 12px;
      line-height: 1.55;
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 5;
    }

    .company-preview dl {
      display: grid;
      gap: 10px;
      margin: 0;
    }

    .company-preview dl div {
      padding-top: 10px;
      border-top: 1px solid var(--color-border-light);
    }

    .company-preview dt {
      margin-bottom: 3px;
      color: var(--color-text-tertiary);
      font-size: 11px;
      font-weight: 600;
    }

    .company-preview dd {
      margin: 0;
      overflow: hidden;
      color: var(--color-text-primary);
      font-size: 12px;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .preview-hint {
      margin: 9px 2px 0;
      color: var(--color-text-tertiary);
      font-size: 11px;
      line-height: 1.45;
    }

    @media (max-width: 640px) {
      .company-form-layout,
      .company-form {
        grid-template-columns: 1fr;
      }

      :host ::ng-deep .company-form nz-form-item {
        grid-column: 1 !important;
        margin-bottom: 14px !important;
      }

      :host ::ng-deep .company-form nz-form-item:last-child {
        margin-bottom: 0 !important;
      }
    }
  `],
})
export class CompanyFormModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() company: Company | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<Company>();

  private companyService = inject(CompanyService);
  private message = inject(NzMessageService);

  saving = false;
  provinces = VIETNAMESE_PROVINCES;
  industries = VIETNAMESE_INDUSTRIES;

  formGroup = new FormGroup({
    company_code: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
    ]),
    company_name: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(255),
    ]),
    location: new FormControl('', [Validators.maxLength(255)]),
    industry: new FormControl('', [Validators.maxLength(255)]),
    description: new FormControl('', [Validators.maxLength(2000)]),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.setupForm();
    }
  }

  private setupForm(): void {
    if (this.company) {
      this.formGroup.patchValue({
        company_code: this.company.company_code,
        company_name: this.company.company_name,
        location: this.company.location || '',
        industry: this.company.industry || '',
        description: this.company.description || '',
      });
      // Disable company_code in edit mode (it's the unique identifier)
      this.formGroup.get('company_code')?.disable();
    } else {
      this.formGroup.reset({
        company_code: '',
        company_name: '',
        location: '',
        industry: '',
        description: '',
      });
      this.formGroup.get('company_code')?.enable();
    }
  }

  companyInitial(): string {
    return this.companyNamePreview().charAt(0).toLocaleUpperCase('vi-VN') || 'C';
  }

  companyNamePreview(): string {
    return this.formValue('company_name') || 'Tên công ty';
  }

  companyCodePreview(): string {
    return this.formValue('company_code') || 'MÃ CÔNG TY';
  }

  industryPreview(): string {
    return this.formValue('industry') || 'Chưa cập nhật';
  }

  locationPreview(): string {
    return this.formValue('location') || 'Chưa cập nhật';
  }

  companySummary(): string {
    const description = this.formValue('description');
    if (description) return description;

    const industry = this.formValue('industry');
    const location = this.formValue('location');

    if (industry && location) return `Hoạt động trong lĩnh vực ${industry} tại ${location}.`;
    if (industry) return `Hoạt động trong lĩnh vực ${industry}.`;
    if (location) return `Doanh nghiệp có địa điểm tại ${location}.`;
    return 'Hoàn thiện ngành nghề và địa điểm để hồ sơ doanh nghiệp rõ ràng hơn.';
  }

  formValue(field: 'company_code' | 'company_name' | 'location' | 'industry' | 'description'): string {
    return this.formGroup.getRawValue()[field]?.trim() || '';
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.saving = false;
  }

  submit(): void {
    if (this.formGroup.invalid) {
      Object.values(this.formGroup.controls).forEach(control => {
        control.markAsTouched();
        control.updateValueAndValidity();
      });
      return;
    }

    this.saving = true;
    const formValue = this.formGroup.getRawValue();

    if (this.company) {
      this.companyService.update(this.company.id, {
        company_name: formValue.company_name || undefined,
        location: formValue.location || undefined,
        industry: formValue.industry || undefined,
        description: formValue.description || null,
      }).subscribe({
        next: (company) => {
          this.saved.emit(company);
          this.close();
        },
        error: (err) => {
          this.message.error(err.error?.detail || 'Không thể cập nhật công ty');
          this.saving = false;
        },
      });
    } else {
      this.companyService.create({
        company_code: formValue.company_code || '',
        company_name: formValue.company_name || '',
        location: formValue.location || undefined,
        industry: formValue.industry || undefined,
        description: formValue.description || undefined,
      }).subscribe({
        next: (company) => {
          this.saved.emit(company);
          this.close();
        },
        error: (err) => {
          this.message.error(err.error?.detail || 'Không thể tạo công ty');
          this.saving = false;
        },
      });
    }
  }
}
