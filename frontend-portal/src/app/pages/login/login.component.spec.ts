import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { NZ_ICONS } from 'ng-zorro-antd/icon';
import {
  LockOutline,
  MailOutline,
  EyeOutline,
  EyeInvisibleOutline,
  ThunderboltFill,
  CheckCircleFill,
  SendOutline,
  LogoutOutline,
} from '@ant-design/icons-angular/icons';
import { User } from '../../core/models';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    full_name: 'Test Candidate',
    phone: '0987654321',
    role: 'candidate',
    avatar_url: null,
    is_active: true,
    email_verified: true,
    company_code: null,
    approval_status: 'none',
    created_at: '2026-08-22T00:00:00Z',
    updated_at: null,
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'login',
      'resendVerification',
      'logout',
    ]);
    toastSpy = jasmine.createSpyObj('ToastService', [
      'success',
      'error',
      'info',
      'warning',
      'errorFromHttp',
      'reportHttpError',
    ]);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        provideTranslateService(),
        {
          provide: NZ_ICONS,
          useValue: [
            LockOutline,
            MailOutline,
            EyeOutline,
            EyeInvisibleOutline,
            ThunderboltFill,
            CheckCircleFill,
            SendOutline,
            LogoutOutline,
          ],
        },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes the login form with empty values and default remember checkbox', () => {
    expect(component.loginForm).toBeDefined();
    expect(component.loginForm.get('email')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
    expect(component.loginForm.get('remember')?.value).toBe(true);
    expect(component.loginForm.valid).toBeFalse();
  });

  it('validates email format and required password', () => {
    const emailControl = component.loginForm.get('email');
    const passwordControl = component.loginForm.get('password');

    emailControl?.setValue('invalid-email');
    passwordControl?.setValue('1234567');
    expect(emailControl?.valid).toBeFalse();
    expect(passwordControl?.valid).toBeFalse();

    emailControl?.setValue('valid@example.com');
    passwordControl?.setValue('validPassword123');
    expect(emailControl?.valid).toBeTrue();
    expect(passwordControl?.valid).toBeTrue();
    expect(component.loginForm.valid).toBeTrue();
  });

  it('toggles show/hide password visibility', () => {
    expect(component.showPassword).toBeFalse();
    component.showPassword = !component.showPassword;
    expect(component.showPassword).toBeTrue();
  });

  it('submits valid form and navigates to home when email is verified', () => {
    authServiceSpy.login.and.returnValue(of(mockUser));

    component.loginForm.setValue({
      email: 'valid@example.com',
      password: 'password123',
      remember: true,
    });

    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalledWith({
      email: 'valid@example.com',
      password: 'password123',
    });
    expect(toastSpy.success).toHaveBeenCalledWith('Đăng nhập thành công');
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('shows verification modal when email is not verified', () => {
    authServiceSpy.login.and.returnValue(
      of({ ...mockUser, email: 'unverified@example.com', email_verified: false })
    );

    component.loginForm.setValue({
      email: 'unverified@example.com',
      password: 'password123',
      remember: true,
    });

    component.onSubmit();

    expect(component.showVerifyModal).toBeTrue();
    expect(component.unverifiedEmail).toBe('unverified@example.com');
  });

  it('resends verification email from unverified modal', () => {
    authServiceSpy.resendVerification.and.returnValue(
      of({ message: 'Email đã được gửi' })
    );

    component.unverifiedEmail = 'unverified@example.com';
    component.resendVerification();

    expect(authServiceSpy.resendVerification).toHaveBeenCalledWith('unverified@example.com');
    expect(component.verifyMessageType).toBe('success');
    expect(component.verifyMessage).toBe('Email đã được gửi');
  });
});
