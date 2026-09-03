import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from '../services/toast.service';

/**
 * Route guard that checks if the authenticated user has one of the required roles.
 * Allowed roles can be passed in Route data via `roles` or `expectedRoles`.
 * If unauthenticated, redirects to /login with returnUrl.
 * If unauthorized, redirects to /forbidden (403).
 */
export const roleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const token = authService.getAccessToken();

  if (!authService.isAuthenticated() || !token || authService.isTokenExpired(token)) {
    authService.logout(state.url);
    return false;
  }

  const user = authService.user();
  if (user && !user.email_verified) {
    router.navigate(['/email-required']);
    return false;
  }

  const expectedRoles: string[] =
    route.data['roles'] ||
    (route.data['expectedRole'] ? [route.data['expectedRole']] : []) ||
    [];

  if (expectedRoles.length > 0) {
    const userRole = user?.role;
    const hasRole = userRole ? expectedRoles.includes(userRole) : false;

    if (!hasRole) {
      toast.warning('Bạn không có quyền truy cập vào chức năng hoặc khu vực này.');
      router.navigate(['/forbidden']);
      return false;
    }
  }

  return true;
};
