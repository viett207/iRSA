import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../core/auth/auth.service';
import { NZ_ICONS } from 'ng-zorro-antd/icon';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import {
  LockOutline,
  KeyOutline,
  MailOutline,
  EyeOutline,
  EyeInvisibleOutline,
  ArrowLeftOutline,
  ArrowRightOutline,
  ClockCircleOutline,
  CheckCircleOutline,
  CheckCircleFill,
  CloseCircleOutline,
  CloseCircleFill,
} from '@ant-design/icons-angular/icons';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  const createComponent = (token: string | null = 'valid-reset-token') => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['resetPassword']);

    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: NZ_ICONS,
          useValue: [
            LockOutline,
            KeyOutline,
            MailOutline,
            EyeOutline,
            EyeInvisibleOutline,
            ArrowLeftOutline,
            ArrowRightOutline,
            ClockCircleOutline,
            CheckCircleOutline,
            CheckCircleFill,
            CloseCircleOutline,
            CloseCircleFill,
          ],
        },
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'token' ? token : null),
              },
            },
          },
        },
      ],
    });

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
  };

  it('renders invalid link state if token is missing in URL', () => {
    createComponent(null);
    fixture.detectChanges();

    expect(component.token()).toBeNull();
    expect(authServiceSpy.resetPassword).not.toHaveBeenCalled();
  });

  it('calculates password strength criteria correctly', () => {
    createComponent('sample-token');
    fixture.detectChanges();

    // 1. Weak password: < 8 chars
    component.form.get('password')?.setValue('abc');
    component.onPasswordInput();
    expect(component.passwordScore()).toBe(0);
    expect(component.strengthLabel()).toBe('Yếu');

    // 2. 8 chars lowercase + uppercase
    component.form.get('password')?.setValue('Abcdefgh');
    component.onPasswordInput();
    expect(component.passwordScore()).toBe(2);
    expect(component.strengthLabel()).toBe('Trung bình');

    // 3. 8 chars lowercase + uppercase + digits
    component.form.get('password')?.setValue('Abcdefg1');
    component.onPasswordInput();
    expect(component.passwordScore()).toBe(3);
    expect(component.strengthLabel()).toBe('Khá');

    // 4. Strong: 8 chars lowercase + uppercase + digits + special
    component.form.get('password')?.setValue('Abcdefg1@');
    component.onPasswordInput();
    expect(component.passwordScore()).toBe(4);
    expect(component.strengthLabel()).toBe('Mạnh');
  });

  it('validates password matching before submitting', () => {
    createComponent('sample-token');
    fixture.detectChanges();

    component.form.get('password')?.setValue('Password123@');
    component.form.get('confirmPassword')?.setValue('PasswordMismatch@');

    expect(component.form.hasError('mismatch')).toBeTrue();
    expect(component.form.valid).toBeFalse();

    component.form.get('confirmPassword')?.setValue('Password123@');
    expect(component.form.hasError('mismatch')).toBeFalse();
    expect(component.form.valid).toBeTrue();
  });

  it('submits reset password successfully and triggers 5s countdown to login', fakeAsync(() => {
    createComponent('valid-token-123');
    authServiceSpy.resetPassword.and.returnValue(
      of({ message: 'Mật khẩu đã được đặt lại thành công' })
    );

    fixture.detectChanges();

    component.form.get('password')?.setValue('NewPassword123@');
    component.form.get('confirmPassword')?.setValue('NewPassword123@');

    component.onSubmit();

    expect(authServiceSpy.resetPassword).toHaveBeenCalledWith('valid-token-123', 'NewPassword123@');
    expect(component.success()).toBeTrue();
    expect(component.countdown()).toBe(5);

    // Tick 2 seconds
    tick(2000);
    expect(component.countdown()).toBe(3);

    // Tick 3 more seconds (5 total)
    tick(3000);
    expect(component.countdown()).toBe(0);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('handles backend token expiration / reset error', () => {
    createComponent('expired-token');
    authServiceSpy.resetPassword.and.returnValue(
      throwError(() => ({
        error: { detail: 'Token đã hết hạn hoặc không hợp lệ' },
      }))
    );

    fixture.detectChanges();

    component.form.get('password')?.setValue('NewPassword123@');
    component.form.get('confirmPassword')?.setValue('NewPassword123@');

    component.onSubmit();

    expect(component.success()).toBeFalse();
    expect(component.error()).toBe('Token đã hết hạn hoặc không hợp lệ');
  });

  it('goToLogin navigates directly to /login', () => {
    createComponent('valid-token');
    fixture.detectChanges();

    component.goToLogin();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
