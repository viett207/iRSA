import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzResultModule } from 'ng-zorro-antd/result';
import { environment } from '../../../environments/environment';

/** Validator: confirm password must match password. */
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirm = control.get('confirm_password');
  if (password && confirm && password.value !== confirm.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-hr-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzAlertModule,
    NzResultModule,
  ],
  templateUrl: './hr-register.component.html',
  styleUrl: './hr-register.component.scss',
})
export class HRRegisterComponent {
  registerForm: FormGroup;
  loading = false;
  registered = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
  ) {
    this.registerForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
        phone: ['', [Validators.maxLength(50)]],
        company_code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirm_password: ['', [Validators.required]],
      },
      { validators: passwordMatchValidator },
    );
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      Object.values(this.registerForm.controls).forEach((c) => {
        if (c.invalid) { c.markAsDirty(); c.updateValueAndValidity(); }
      });
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { email, full_name, phone, company_code, password } = this.registerForm.value;

    this.http.post<{ message: string }>(
      `${environment.publicApiUrl}/auth/register-hr`,
      { email, full_name, phone: phone || null, company_code, password },
    ).subscribe({
      next: () => {
        this.loading = false;
        this.registered = true;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.detail || 'Đăng ký thất bại. Vui lòng thử lại.';
      },
    });
  }
}
