import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { EmailRequiredComponent } from './email-required.component';
import { AuthService } from '../../core/auth/auth.service';
import { signal } from '@angular/core';
import { User } from '../../shared/models/user.model';
import { NZ_ICONS } from 'ng-zorro-antd/icon';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import {
  MailOutline,
  ClockCircleOutline,
  CheckCircleOutline,
  SendOutline,
  LogoutOutline,
  WarningOutline,
} from '@ant-design/icons-angular/icons';

describe('EmailRequiredComponent', () => {
  let component: EmailRequiredComponent;
  let fixture: ComponentFixture<EmailRequiredComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockUser: User = {
    id: 1,
    email: 'candidate@example.com',
    full_name: 'Nguyễn Văn A',
    phone: null,
    role: 'candidate',
    avatar_url: null,
    is_active: true,
    email_verified: false,
    company_code: null,
    approval_status: 'approved',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
  };

  const createComponent = (currentUser: User | null = mockUser, queryEmail: string | null = null) => {
    const userSignal = signal<User | null>(currentUser);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['resendVerification', 'logout'], {
      user: userSignal.asReadonly(),
    });
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [EmailRequiredComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: NZ_ICONS,
          useValue: [
            MailOutline,
            ClockCircleOutline,
            CheckCircleOutline,
            SendOutline,
            LogoutOutline,
            WarningOutline,
          ],
        },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'email' ? queryEmail : null),
              },
            },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(EmailRequiredComponent);
    component = fixture.componentInstance;
  };

  it('displays user email from AuthService', () => {
    createComponent(mockUser);
    fixture.detectChanges();

    expect(component.displayEmail).toBe('candidate@example.com');
  });

  it('resends verification email and triggers 60s cooldown countdown', fakeAsync(() => {
    createComponent(mockUser);
    authServiceSpy.resendVerification.and.returnValue(
      of({ message: 'Đã gửi lại email xác thực' })
    );

    fixture.detectChanges();
    expect(component.cooldown()).toBe(0);

    component.resendEmail();
    expect(authServiceSpy.resendVerification).toHaveBeenCalledWith('candidate@example.com');
    expect(component.message()?.type).toBe('success');
    expect(component.cooldown()).toBe(60);

    // Advance 1s
    tick(1000);
    expect(component.cooldown()).toBe(59);

    // Advance 59s more (total 60s)
    tick(59000);
    expect(component.cooldown()).toBe(0);
  }));

  it('prevents resending while cooldown is active', () => {
    createComponent(mockUser);
    authServiceSpy.resendVerification.and.returnValue(of({ message: 'OK' }));

    fixture.detectChanges();
    component.resendEmail();
    expect(authServiceSpy.resendVerification).toHaveBeenCalledTimes(1);

    // Try to trigger again while cooldown > 0
    component.resendEmail();
    expect(authServiceSpy.resendVerification).toHaveBeenCalledTimes(1);
  });

  it('handles rate limit error by activating 60s cooldown', () => {
    createComponent(mockUser);
    authServiceSpy.resendVerification.and.returnValue(
      throwError(() => ({
        status: 400,
        error: { detail: 'Vui lòng đợi ít nhất 60 giây trước khi gửi lại' },
      }))
    );

    fixture.detectChanges();
    component.resendEmail();

    expect(component.cooldown()).toBe(60);
    expect(component.message()?.type).toBe('warning');
  });

  it('calls authService.logout on logout', () => {
    createComponent(mockUser);
    fixture.detectChanges();

    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });
});
