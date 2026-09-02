import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const roleGuard = (...allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    if (authService.hasRole(...allowedRoles)) {
      return true;
    }

    // Clear a stale/unsupported role, then redirect atomically from the guard.
    authService.clearSession();
    return router.createUrlTree(['/login']);
  };
};

export const adminGuard = roleGuard('admin');
export const hrGuard = roleGuard('admin', 'leader', 'recruiter');
