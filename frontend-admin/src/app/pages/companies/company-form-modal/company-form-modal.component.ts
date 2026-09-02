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
  templateUrl: './company-form-modal.component.html',
  styleUrl: './company-form-modal.component.scss',
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
