import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from '../services/toast.service';

/** Context token to prevent infinite retry loops on 401 errors */
export const AUTH_RETRY = new HttpContextToken<boolean>(() => false);

/** Public authentication endpoints that do not require Authorization header */
const AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/google',
  '/auth/register',
  '/auth/refresh',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/forgot-password',
  '/auth/reset-password',
] as const;

function isAuthEndpoint(url: string): boolean {
  return AUTH_ENDPOINTS.some((path) => url.includes(path));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toast = inject(ToastService);
  const token = authService.getAccessToken();
  const authEndpoint = isAuthEndpoint(req.url);

  // Attach Bearer token to all non-auth requests if available
  if (token && !authEndpoint) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 1. Handle 401 Unauthorized - Attempt Token Refresh
      const shouldRefresh =
        error.status === 401 &&
        !authEndpoint &&
        !req.context.get(AUTH_RETRY) &&
        authService.getRefreshToken() !== null;

      if (shouldRefresh) {
        return authService.refreshToken().pipe(
          catchError((refreshError: unknown) => {
            authService.logout();
            toast.reportHttpError(error, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return throwError(() => refreshError);
          }),
          switchMap(() => {
            const newToken = authService.getAccessToken();
            if (!newToken) {
              authService.logout();
              toast.reportHttpError(error, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
              return throwError(() => error);
            }

            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
              },
              context: req.context.set(AUTH_RETRY, true),
            });

            return next(retryReq).pipe(
              catchError((retryError: HttpErrorResponse) => {
                if (retryError.status === 401) {
                  authService.logout();
                  toast.reportHttpError(retryError, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                } else {
                  toast.reportHttpError(retryError);
                }
                return throwError(() => retryError);
              }),
            );
          }),
        );
      }

      // If 401 on authenticated endpoint without refresh available
      if (error.status === 401 && !authEndpoint) {
        authService.logout();
        toast.reportHttpError(error, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
      // 2. Handle 403 Forbidden
      else if (error.status === 403) {
        toast.reportHttpError(error, 'Bạn không có quyền thực hiện thao tác này.');
      }
      // 3. Handle 500 / 502 / 503 / 504 Server Errors
      else if (error.status >= 500) {
        toast.reportHttpError(error, 'Hệ thống máy chủ đang gặp sự cố. Vui lòng thử lại sau.');
      }
      // 4. Handle Network / Connection errors
      else if (error.status === 0) {
        toast.reportHttpError(error, 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.');
      }
      // Other errors for non-auth endpoints
      else if (!authEndpoint) {
        toast.reportHttpError(error);
      }

      return throwError(() => error);
    }),
  );
};

