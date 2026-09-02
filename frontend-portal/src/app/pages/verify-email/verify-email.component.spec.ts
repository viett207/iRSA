import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { VerifyEmailComponent } from './verify-email.component';
import { AuthService } from '../../core/auth/auth.service';
import { NZ_ICONS } from 'ng-zorro-antd/icon';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import {
  ArrowRightOutline,
  MailOutline,
  ClockCircleOutline,
  CloseCircleFill,
  LoginOutline,
} from '@ant-design/icons-angular/icons';

describe('VerifyEmailComponent', () => {
  let component: VerifyEmailComponent;
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const createComponent = (token: string | null = 'valid-token') => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['verifyEmail']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [VerifyEmailComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: NZ_ICONS,
          useValue: [
            ArrowRightOutline,
            MailOutline,
            ClockCircleOutline,
            CloseCircleFill,
            LoginOutline,
          ],
        },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
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

    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
  };

  it('shows error state when token is missing in query params', () => {
    createComponent(null);
    fixture.detectChanges();

    expect(component.status()).toBe('error');
    expect(component.errorTitle()).toContain('Thiếu mã xác thực');
    expect(authServiceSpy.verifyEmail).not.toHaveBeenCalled();
  });

  it('calls verifyEmail when token is present and handles success with 5s countdown', fakeAsync(() => {
    createComponent('test-token-123');
    authServiceSpy.verifyEmail.and.returnValue(of({ message: 'Email đã được xác thực thành công' }));

    fixture.detectChanges();

    expect(authServiceSpy.verifyEmail).toHaveBeenCalledWith('test-token-123');
    expect(component.status()).toBe('success');
    expect(component.countdown()).toBe(5);

    // Advance 1 second
    tick(1000);
    expect(component.countdown()).toBe(4);

    // Advance 4 more seconds (total 5s)
    tick(4000);
    expect(component.countdown()).toBe(0);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('handles verification error properly', () => {
    createComponent('invalid-token');
    authServiceSpy.verifyEmail.and.returnValue(
      throwError(() => ({
        error: { detail: 'Token xác thực không hợp lệ hoặc đã hết hạn' },
      }))
    );

    fixture.detectChanges();

    expect(authServiceSpy.verifyEmail).toHaveBeenCalledWith('invalid-token');
    expect(component.status()).toBe('error');
    expect(component.errorMessage()).toBe('Token xác thực không hợp lệ hoặc đã hết hạn');
  });

  it('goToLogin navigates directly to /login and clears timer', () => {
    createComponent('valid-token');
    authServiceSpy.verifyEmail.and.returnValue(of({ message: 'OK' }));

    fixture.detectChanges();

    component.goToLogin();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
