import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../core/auth/auth.service';
import { NZ_ICONS } from 'ng-zorro-antd/icon';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import {
  LockOutline,
  MailOutline,
  SendOutline,
  ArrowLeftOutline,
  ArrowRightOutline,
  ClockCircleOutline,
} from '@ant-design/icons-angular/icons';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['forgotPassword']);

    TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: NZ_ICONS,
          useValue: [
            LockOutline,
            MailOutline,
            SendOutline,
            ArrowLeftOutline,
            ArrowRightOutline,
            ClockCircleOutline,
          ],
        },
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => null,
              },
            },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and have an invalid form initially', () => {
    expect(component).toBeTruthy();
    expect(component.form.valid).toBeFalse();
    expect(component.submitted()).toBeFalse();
  });

  it('validates email format correctly', () => {
    const emailControl = component.form.get('email');

    emailControl?.setValue('');
    expect(emailControl?.valid).toBeFalse();

    emailControl?.setValue('not-an-email');
    expect(emailControl?.valid).toBeFalse();

    emailControl?.setValue('user@example.com');
    expect(emailControl?.valid).toBeTrue();
  });

  it('submits form successfully and starts 60s cooldown', fakeAsync(() => {
    authServiceSpy.forgotPassword.and.returnValue(of({ message: 'Email sent' }));

    component.form.get('email')?.setValue('test@example.com');
    component.onSubmit();

    expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith('test@example.com');
    expect(component.submitted()).toBeTrue();
    expect(component.submittedEmail()).toBe('test@example.com');
    expect(component.cooldown()).toBe(60);

    // Advance 1s
    tick(1000);
    expect(component.cooldown()).toBe(59);

    // Advance 59s more
    tick(59000);
    expect(component.cooldown()).toBe(0);
  }));

  it('handles submission error gracefully', () => {
    authServiceSpy.forgotPassword.and.returnValue(
      throwError(() => ({ error: { detail: 'Không thể xử lý yêu cầu' } }))
    );

    component.form.get('email')?.setValue('test@example.com');
    component.onSubmit();

    expect(component.submitted()).toBeFalse();
    expect(component.error()).toBe('Không thể xử lý yêu cầu');
  });

  it('resends email and restarts cooldown', fakeAsync(() => {
    authServiceSpy.forgotPassword.and.returnValue(of({ message: 'Email sent' }));

    component.submittedEmail.set('test@example.com');
    component.submitted.set(true);
    component.cooldown.set(0);

    component.resendEmail();

    expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith('test@example.com');
    expect(component.resendMessageType()).toBe('success');
    expect(component.cooldown()).toBe(60);

    tick(60000);
  }));

  it('handles 429 rate limit during resend', () => {
    authServiceSpy.forgotPassword.and.returnValue(
      throwError(() => ({
        status: 429,
        error: { detail: 'Vui lòng đợi 60 giây trước khi yêu cầu lại' },
      }))
    );

    component.submittedEmail.set('test@example.com');
    component.submitted.set(true);
    component.cooldown.set(0);

    component.resendEmail();

    expect(component.resendMessageType()).toBe('warning');
    expect(component.cooldown()).toBe(60);
  });

  it('resets form when resetForm is called', () => {
    component.submitted.set(true);
    component.submittedEmail.set('test@example.com');
    component.resetForm();

    expect(component.submitted()).toBeFalse();
    expect(component.submittedEmail()).toBe('');
    expect(component.form.value.email).toBeFalsy();
  });
});
