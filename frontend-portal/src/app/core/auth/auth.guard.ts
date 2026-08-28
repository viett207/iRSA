import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Route guard that requires user to be authenticated.
 * If unauthenticated or token is expired, redirects to /login with returnUrl.
 * If user email is unverified, redirects to /email-required.
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

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

  return true;
};

/**
 * Route guard for guest-only pages (e.g. /login, /register).
 * If already authenticated, redirects to home '/'.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
