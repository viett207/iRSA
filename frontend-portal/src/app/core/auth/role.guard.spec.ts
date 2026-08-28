import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from './auth.service';
import { ToastService } from '../services/toast.service';
import { User } from '../models';

describe('RoleGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  const mockAdminUser: User = {
    id: 1,
    email: 'admin@irsa.com',
    full_name: 'Admin User',
    phone: null,
    role: 'super_admin',
    avatar_url: null,
    is_active: true,
    email_verified: true,
    company_code: null,
    approval_status: 'approved',
    created_at: '2026-08-22T00:00:00Z',
    updated_at: null,
  };

  const mockCandidateUser: User = {
    ...mockAdminUser,
    role: 'candidate',
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
    toastSpy = jasmine.createSpyObj('ToastService', ['warning', 'error']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    });
  });

  it('redirects to /login with returnUrl if unauthenticated', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);
    authServiceSpy.getAccessToken.and.returnValue(null);

    const mockRoute = {
      data: { roles: ['super_admin', 'admin'] },
    } as unknown as ActivatedRouteSnapshot;
    const mockState = { url: '/admin/users' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(mockRoute, mockState)
    );

    expect(result).toBeFalse();
    expect(authServiceSpy.logout).toHaveBeenCalledWith('/admin/users');
  });

  it('redirects to /forbidden if user role does not match expected roles', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getAccessToken.and.returnValue('valid-token');
    authServiceSpy.isTokenExpired.and.returnValue(false);
    authServiceSpy.user.and.returnValue(mockCandidateUser);

    const mockRoute = {
      data: { roles: ['super_admin', 'hr_manager'] },
    } as unknown as ActivatedRouteSnapshot;
    const mockState = { url: '/admin/dashboard' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(mockRoute, mockState)
    );

    expect(result).toBeFalse();
    expect(toastSpy.warning).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/forbidden']);
  });

  it('allows access if user has one of the required roles', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getAccessToken.and.returnValue('valid-token');
    authServiceSpy.isTokenExpired.and.returnValue(false);
    authServiceSpy.user.and.returnValue(mockAdminUser);

    const mockRoute = {
      data: { roles: ['super_admin', 'admin'] },
    } as unknown as ActivatedRouteSnapshot;
    const mockState = { url: '/admin/dashboard' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(mockRoute, mockState)
    );

    expect(result).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});
