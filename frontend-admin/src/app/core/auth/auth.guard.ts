import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const roleGuard = (...allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    if (authService.hasRole(...allowedRoles)) {
      return true;
    }

    // No matching role → log out and redirect to login (avoids redirect loop)
    authService.logout();
    return false;
  };
};

export const adminGuard = roleGuard('admin');
export const hrGuard = roleGuard('admin', 'leader', 'recruiter');
