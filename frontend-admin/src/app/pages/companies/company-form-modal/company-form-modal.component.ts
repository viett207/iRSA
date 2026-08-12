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
  ],
  template: `
    <nz-modal
      [(nzVisible)]="visible"
      [nzTitle]="company ? 'Chỉnh sửa công ty' : 'Tạo công ty mới'"
      (nzOnCancel)="close()"
      (nzOnOk)="submit()"
      [nzOkLoading]="saving"
      [nzOkDisabled]="formGroup.invalid"
      nzOkText="Lưu"
      nzCancelText="Hủy"
      [nzWidth]="480"
    >
      <ng-container *nzModalContent>
        <form nz-form [formGroup]="formGroup" nzLayout="vertical" autocomplete="off">
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
        </form>
      </ng-container>
    </nz-modal>
  `,
  styles: [`
    :host ::ng-deep .ant-modal-body {
      padding: 24px;
    }

    :host ::ng-deep nz-form-item {
      margin-bottom: 16px;
    }

    :host ::ng-deep nz-form-item:last-child {
      margin-bottom: 0;
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
      });
      // Disable company_code in edit mode (it's the unique identifier)
      this.formGroup.get('company_code')?.disable();
    } else {
      this.formGroup.reset({
        company_code: '',
        company_name: '',
        location: '',
        industry: '',
      });
      this.formGroup.get('company_code')?.enable();
    }
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
