import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { NZ_ICONS } from 'ng-zorro-antd/icon';
import {
  LockOutline,
  MailOutline,
  PhoneOutline,
  UserOutline,
  EyeOutline,
  EyeInvisibleOutline,
  ThunderboltFill,
  CheckCircleFill,
  CloseCircleFill,
  CheckCircleOutline,
  CloseCircleOutline,
} from '@ant-design/icons-angular/icons';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['register']);
    toastSpy = jasmine.createSpyObj('ToastService', [
      'success',
      'error',
      'info',
      'warning',
      'errorFromHttp',
      'reportHttpError',
    ]);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        provideTranslateService(),
        {
          provide: NZ_ICONS,
          useValue: [
            LockOutline,
            MailOutline,
            PhoneOutline,
            UserOutline,
            EyeOutline,
            EyeInvisibleOutline,
            ThunderboltFill,
            CheckCircleFill,
            CloseCircleFill,
            CheckCircleOutline,
            CloseCircleOutline,
          ],
        },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes the register form with controls and invalid state', () => {
    expect(component.registerForm).toBeDefined();
    expect(component.registerForm.get('full_name')?.value).toBe('');
    expect(component.registerForm.get('email')?.value).toBe('');
    expect(component.registerForm.get('password')?.value).toBe('');
    expect(component.registerForm.get('confirmPassword')?.value).toBe('');
    expect(component.registerForm.get('agreeTerms')?.value).toBe(false);
    expect(component.registerForm.valid).toBeFalse();
  });

  it('validates password matching and terms agreement', () => {
    component.registerForm.patchValue({
      full_name: 'Nguyễn Văn A',
      email: 'nguyenvana@example.com',
      password: 'Password123!',
      confirmPassword: 'DifferentPassword!',
      agreeTerms: true,
    });

    expect(component.registerForm.hasError('mismatch')).toBeTrue();
    expect(component.registerForm.valid).toBeFalse();

    component.registerForm.patchValue({
      confirmPassword: 'Password123!',
    });

    expect(component.registerForm.hasError('mismatch')).toBeFalse();
    expect(component.registerForm.valid).toBeTrue();
  });

  it('updates password strength score and criteria checklist in real-time', () => {
    component.registerForm.get('password')?.setValue('pass');
    component.onPasswordInput();
    expect(component.passwordScore()).toBe(0);
    expect(component.strengthLabel()).toBe('Yếu');

    component.registerForm.get('password')?.setValue('password123');
    component.onPasswordInput();
    expect(component.passwordScore()).toBe(2); // length >= 8 and digit
    expect(component.strengthLabel()).toBe('Trung bình');

    component.registerForm.get('password')?.setValue('Password123!');
    component.onPasswordInput();
    expect(component.passwordScore()).toBe(4); // len, upper/lower, digit, special
    expect(component.strengthLabel()).toBe('Rất mạnh');
    expect(component.criteria().every((c) => c.met)).toBeTrue();
  });

  it('toggles password and confirm password visibility', () => {
    expect(component.showPassword()).toBeFalse();
    component.showPassword.set(true);
    expect(component.showPassword()).toBeTrue();

    expect(component.showConfirmPassword()).toBeFalse();
    component.showConfirmPassword.set(true);
    expect(component.showConfirmPassword()).toBeTrue();
  });

  it('submits registration successfully and switches to registered view', () => {
    authServiceSpy.register.and.returnValue(
      of({
        access_token: 'mock-access',
        refresh_token: 'mock-refresh',
        token_type: 'bearer',
      })
    );

    component.registerForm.setValue({
      full_name: 'Nguyễn Văn A',
      email: 'nguyenvana@example.com',
      phone: '0987654321',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      agreeTerms: true,
    });

    component.onSubmit();

    expect(authServiceSpy.register).toHaveBeenCalledWith({
      full_name: 'Nguyễn Văn A',
      email: 'nguyenvana@example.com',
      password: 'Password123!',
      phone: '0987654321',
    });
    expect(component.registered).toBeTrue();
    expect(toastSpy.success).toHaveBeenCalled();
  });

  it('handles registration failure gracefully', () => {
    const errorResponse = new HttpErrorResponse({
      status: 400,
      error: { detail: 'Email đã tồn tại' },
    });
    authServiceSpy.register.and.returnValue(throwError(() => errorResponse));

    component.registerForm.setValue({
      full_name: 'Nguyễn Văn A',
      email: 'existing@example.com',
      phone: '',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      agreeTerms: true,
    });

    component.onSubmit();

    expect(component.loading).toBeFalse();
    expect(component.registered).toBeFalse();
    expect(toastSpy.errorFromHttp).toHaveBeenCalledWith(
      errorResponse,
      'Đăng ký tài khoản không thành công. Vui lòng thử lại.'
    );
  });
});
