import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { signal } from '@angular/core';
import { User } from '../models';

describe('AuthGuard & GuestGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    phone: null,
    role: 'candidate',
    avatar_url: null,
    is_active: true,
    email_verified: true,
    company_code: null,
    approval_status: 'none',
    created_at: '2026-08-22T00:00:00Z',
    updated_at: null,
  };

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'isAuthenticated',
      'getAccessToken',
      'isTokenExpired',
      'logout',
      'user',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  describe('authGuard', () => {
    it('redirects to /login with returnUrl and calls logout when user is not authenticated', () => {
      authServiceSpy.isAuthenticated.and.returnValue(false);
      authServiceSpy.getAccessToken.and.returnValue(null);

      const mockRoute = {} as ActivatedRouteSnapshot;
      const mockState = { url: '/dashboard/applications' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBeFalse();
      expect(authServiceSpy.logout).toHaveBeenCalledWith('/dashboard/applications');
    });

    it('redirects to /login when token is expired', () => {
      authServiceSpy.isAuthenticated.and.returnValue(true);
      authServiceSpy.getAccessToken.and.returnValue('expired-token');
      authServiceSpy.isTokenExpired.and.returnValue(true);

      const mockRoute = {} as ActivatedRouteSnapshot;
      const mockState = { url: '/dashboard/profile' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBeFalse();
      expect(authServiceSpy.logout).toHaveBeenCalledWith('/dashboard/profile');
    });

    it('redirects to /email-required if user email is not verified', () => {
      authServiceSpy.isAuthenticated.and.returnValue(true);
      authServiceSpy.getAccessToken.and.returnValue('valid-token');
      authServiceSpy.isTokenExpired.and.returnValue(false);
      authServiceSpy.user.and.returnValue({ ...mockUser, email_verified: false });

      const mockRoute = {} as ActivatedRouteSnapshot;
      const mockState = { url: '/dashboard' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/email-required']);
    });

    it('allows navigation when user is authenticated with verified email and valid token', () => {
      authServiceSpy.isAuthenticated.and.returnValue(true);
      authServiceSpy.getAccessToken.and.returnValue('valid-token');
      authServiceSpy.isTokenExpired.and.returnValue(false);
      authServiceSpy.user.and.returnValue(mockUser);

      const mockRoute = {} as ActivatedRouteSnapshot;
      const mockState = { url: '/dashboard' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBeTrue();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });

  describe('guestGuard', () => {
    it('allows access for guests who are not authenticated', () => {
      authServiceSpy.isAuthenticated.and.returnValue(false);

      const mockRoute = {} as ActivatedRouteSnapshot;
      const mockState = {} as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() =>
        guestGuard(mockRoute, mockState)
      );

      expect(result).toBeTrue();
    });

    it('redirects authenticated users away from guest pages to home', () => {
      authServiceSpy.isAuthenticated.and.returnValue(true);

      const mockRoute = {} as ActivatedRouteSnapshot;
      const mockState = {} as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() =>
        guestGuard(mockRoute, mockState)
      );

      expect(result).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });
  });
});
