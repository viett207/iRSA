import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzMessageService } from 'ng-zorro-antd/message';

import { UserService } from '../../../core/services/user.service';
import { CompanyService } from '../../../core/services/company.service';
import { User } from '../../../shared/models/user.model';
import { UserUpdate } from '../models/user-api.model';
import { Company } from '../../companies/models/company-api.model';

type UserRole = 'candidate' | 'recruiter' | 'leader' | 'admin';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzSwitchModule,
  ],
  templateUrl: './user-form-modal.component.html',
})
export class UserFormModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() user: User | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<User>();

  private userService = inject(UserService);
  private companyService = inject(CompanyService);
  private message = inject(NzMessageService);

  saving = false;
  companyList = signal<Company[]>([]);

  formGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    full_name: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(255),
    ]),
    phone: new FormControl('', [Validators.maxLength(50)]),
    password: new FormControl('', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]),
    role: new FormControl<UserRole>('candidate', { nonNullable: true, validators: [Validators.required] }),
    company_code: new FormControl<string | null>(null),
    is_active: new FormControl(true, { nonNullable: true }),
  });

  /** Whether current role selection is an HR role that needs a company */
  isHrRole(): boolean {
    const role = this.formGroup.get('role')?.value;
    return role === 'recruiter' || role === 'leader';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.setupForm();
    }
  }

  private setupForm(): void {
    // Load companies for the dropdown
    this.loadCompanies();

    if (this.user) {
      // Edit mode: pre-populate form
      this.formGroup.patchValue({
        email: this.user.email,
        full_name: this.user.full_name,
        phone: this.user.phone || '',
        password: '',
        role: this.user.role,
        company_code: this.user.company_code,
        is_active: this.user.is_active,
      });
      // Disable email in edit mode
      this.formGroup.get('email')?.disable();
      // Make password optional in edit mode
      this.formGroup.get('password')?.clearValidators();
      this.formGroup.get('password')?.setValidators([Validators.minLength(8), Validators.maxLength(128)]);
    } else {
      // Create mode: reset form
      this.formGroup.reset({
        email: '',
        full_name: '',
        phone: '',
        password: '',
        role: 'candidate',
        company_code: null,
        is_active: true,
      });
      // Enable email in create mode
      this.formGroup.get('email')?.enable();
      // Password required in create mode
      this.formGroup.get('password')?.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(128)]);
    }
    this.formGroup.get('password')?.updateValueAndValidity();
  }

  private loadCompanies(): void {
    this.companyService.list({ page_size: 100 }).subscribe({
      next: (res) => this.companyList.set(res.items),
      error: () => this.companyList.set([]),
    });
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.saving = false;
  }

  submit(): void {
    if (this.formGroup.invalid) {
      // Mark all fields as touched to show errors
      Object.values(this.formGroup.controls).forEach(control => {
        control.markAsTouched();
        control.updateValueAndValidity();
      });
      return;
    }

    this.saving = true;
    const formValue = this.formGroup.getRawValue();

    if (this.user) {
      // Update existing user
      const updateData: UserUpdate = {
        full_name: formValue.full_name || undefined,
        phone: formValue.phone || undefined,
        role: formValue.role,
        is_active: formValue.is_active,
        company_code: this.isHrRole() ? (formValue.company_code || undefined) : undefined,
      };
      // Only include password if provided
      if (formValue.password) {
        updateData.password = formValue.password;
      }

      this.userService.update(this.user.id, updateData).subscribe({
        next: (user) => {
          this.saved.emit(user);
          this.close();
        },
        error: (err) => {
          const errorMsg = err.error?.detail || 'Không thể cập nhật người dùng';
          this.message.error(errorMsg);
          this.saving = false;
        },
      });
    } else {
      // Create new user
      this.userService.create({
        email: formValue.email || '',
        full_name: formValue.full_name || '',
        phone: formValue.phone || undefined,
        password: formValue.password || '',
        role: formValue.role,
        company_code: this.isHrRole() ? (formValue.company_code || undefined) : undefined,
      }).subscribe({
        next: (user) => {
          this.saved.emit(user);
          this.close();
        },
        error: (err) => {
          const errorMsg = err.error?.detail || 'Không thể tạo người dùng';
          this.message.error(errorMsg);
          this.saving = false;
        },
      });
    }
  }
}
