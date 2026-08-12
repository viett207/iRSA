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
  template: `
    <nz-modal
      [(nzVisible)]="visible"
      [nzTitle]="user ? 'Chỉnh sửa người dùng' : 'Tạo người dùng mới'"
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
          <!-- Email -->
          <nz-form-item>
            <nz-form-label nzRequired>Email</nz-form-label>
            <nz-form-control [nzErrorTip]="emailErrorTpl">
              <input
                nz-input
                formControlName="email"
                placeholder="Nhập email"
                autocomplete="email"
              />
              <ng-template #emailErrorTpl let-control>
                @if (control.hasError('required')) {
                  Email là bắt buộc
                } @else if (control.hasError('email')) {
                  Email không hợp lệ
                }
              </ng-template>
            </nz-form-control>
          </nz-form-item>

          <!-- Full Name -->
          <nz-form-item>
            <nz-form-label nzRequired>Họ và tên</nz-form-label>
            <nz-form-control [nzErrorTip]="nameErrorTpl">
              <input
                nz-input
                formControlName="full_name"
                placeholder="Nhập họ và tên"
              />
              <ng-template #nameErrorTpl let-control>
                @if (control.hasError('required')) {
                  Họ và tên là bắt buộc
                } @else if (control.hasError('minlength')) {
                  Họ và tên phải có ít nhất 2 ký tự
                } @else if (control.hasError('maxlength')) {
                  Họ và tên không được quá 255 ký tự
                }
              </ng-template>
            </nz-form-control>
          </nz-form-item>

          <!-- Phone -->
          <nz-form-item>
            <nz-form-label>Số điện thoại</nz-form-label>
            <nz-form-control [nzErrorTip]="phoneErrorTpl">
              <input
                nz-input
                formControlName="phone"
                placeholder="Nhập số điện thoại"
                autocomplete="tel"
              />
              <ng-template #phoneErrorTpl let-control>
                @if (control.hasError('maxlength')) {
                  Số điện thoại không được quá 50 ký tự
                }
              </ng-template>
            </nz-form-control>
          </nz-form-item>

          <!-- Role -->
          <nz-form-item>
            <nz-form-label nzRequired>Vai trò</nz-form-label>
            <nz-form-control nzErrorTip="Vai trò là bắt buộc">
              <nz-select formControlName="role" nzPlaceHolder="Chọn vai trò">
                <nz-option nzValue="candidate" nzLabel="Ứng viên"></nz-option>
                <nz-option nzValue="recruiter" nzLabel="Tuyển dụng"></nz-option>
                <nz-option nzValue="leader" nzLabel="Trưởng nhóm"></nz-option>
                <nz-option nzValue="admin" nzLabel="Quản trị"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <!-- Company (shown for HR roles) -->
          @if (isHrRole()) {
            <nz-form-item>
              <nz-form-label>Công ty</nz-form-label>
              <nz-form-control>
                <nz-select
                  formControlName="company_code"
                  nzPlaceHolder="Chọn công ty"
                  nzAllowClear
                  nzShowSearch
                >
                  @for (c of companyList(); track c.company_code) {
                    <nz-option [nzValue]="c.company_code" [nzLabel]="c.company_name + ' (' + c.company_code + ')'"></nz-option>
                  }
                </nz-select>
              </nz-form-control>
            </nz-form-item>
          }

          <!-- Password -->
          <nz-form-item>
            <nz-form-label [nzRequired]="!user">Mật khẩu</nz-form-label>
            <nz-form-control [nzErrorTip]="passwordErrorTpl">
              <input
                nz-input
                type="password"
                formControlName="password"
                [placeholder]="user ? 'Để trống nếu không đổi' : 'Nhập mật khẩu'"
                autocomplete="new-password"
              />
              <ng-template #passwordErrorTpl let-control>
                @if (control.hasError('required')) {
                  Mật khẩu là bắt buộc
                } @else if (control.hasError('minlength')) {
                  Mật khẩu phải có ít nhất 8 ký tự
                }
              </ng-template>
            </nz-form-control>
          </nz-form-item>

          <!-- Is Active & Email Verified (edit mode only) -->
          @if (user) {
            <div style="display: flex; gap: 24px;">
              <nz-form-item style="flex: 1;">
                <nz-form-label>Trạng thái</nz-form-label>
                <nz-form-control>
                  <nz-switch
                    formControlName="is_active"
                    nzCheckedChildren="Hoạt động"
                    nzUnCheckedChildren="Vô hiệu"
                  ></nz-switch>
                </nz-form-control>
              </nz-form-item>
            </div>
          }
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
