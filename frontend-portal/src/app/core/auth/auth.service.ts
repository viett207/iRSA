import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  Observable,
  tap,
  catchError,
  throwError,
  switchMap,
  finalize,
  shareReplay,
  from,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  User,
  TokenResponse,
  LoginRequest,
  RegisterRequest,
  MessageResponse,
} from '../../core/models';

interface JwtPayload {
  exp?: number;
  sub?: string;
  role?: string;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly USER_KEY = 'current_user';
  private refreshRequest$: Observable<TokenResponse> | null = null;

  private currentUser = signal<User | null>(null);
  user = this.currentUser.asReadonly();

  isAuthenticated = computed(() => {
    const user = this.currentUser();
    const token = this.getAccessToken();
    return !!user && !!token && !this.isTokenExpired(token);
  });

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const stored = localStorage.getItem(this.USER_KEY);
    const token = this.getAccessToken();

    if (stored && token) {
      if (this.isTokenExpired(token)) {
        this.clearStorage();
        this.currentUser.set(null);
        return;
      }
      try {
        this.currentUser.set(JSON.parse(stored));
      } catch {
        this.clearStorage();
        this.currentUser.set(null);
      }
    } else {
      this.clearStorage();
      this.currentUser.set(null);
    }
  }

  /**
   * Decodes JWT token payload and checks if exp timestamp is expired.
   */
  isTokenExpired(token?: string | null): boolean {
    if (!token) return true;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false; // Non-JWT token (or opaque), assume valid if exists

      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload: JwtPayload = JSON.parse(payloadJson);

      if (typeof payload.exp === 'number') {
        // Buffer of 5 seconds to prevent edge-case timing issues
        const expirationTime = payload.exp * 1000;
        return Date.now() >= expirationTime - 5000;
      }
      return false;
    } catch {
      return false;
    }
  }

  register(data: RegisterRequest): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${environment.publicApiUrl}/auth/register`, data)
      .pipe(
        catchError((error: unknown) => throwError(() => error))
      );
  }

  login(credentials: LoginRequest): Observable<User> {
    return this.http
      .post<TokenResponse>(
        `${environment.publicApiUrl}/auth/login`,
        credentials
      )
      .pipe(
        tap((tokens) => this.storeTokens(tokens)),
        switchMap(() => this.http.get<User>(`${environment.apiUrl}/auth/me`)),
        tap((user) => {
          this.currentUser.set(user);
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        }),
        catchError((error: unknown) => {
          this.clearStorage();
          return throwError(() => error);
        })
      );
  }

  loginWithGoogle(payload: { credential?: string; access_token?: string }): Observable<User> {
    return this.http
      .post<TokenResponse>(`${environment.publicApiUrl}/auth/google`, payload)
      .pipe(
        tap((tokens) => this.storeTokens(tokens)),
        switchMap(() => this.http.get<User>(`${environment.apiUrl}/auth/me`)),
        tap((user) => {
          this.currentUser.set(user);
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        }),
        catchError((error: unknown) => {
          this.clearStorage();
          return throwError(() => error);
        })
      );
  }

  private loadGoogleSdk(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).google?.accounts) {
        resolve();
        return;
      }
      const existing = typeof document !== 'undefined' ? document.getElementById('google-gsi-client') : null;
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', (err) => reject(err));
        return;
      }
      if (typeof document !== 'undefined') {
        const script = document.createElement('script');
        script.id = 'google-gsi-client';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
      } else {
        resolve();
      }
    });
  }

  initiateGoogleSignIn(): Observable<User> {
    return from(this.loadGoogleSdk()).pipe(
      switchMap(() => {
        const clientId = environment.googleClientId;

        if (!clientId) {
          return throwError(() => new Error(
            'Google Client ID chưa được cấu hình. Vui lòng thêm googleClientId vào environment.ts.'
          ));
        }

        return new Observable<{ access_token?: string; credential?: string }>((observer) => {
          try {
            const google = (window as any).google;
            if (!google?.accounts?.oauth2) {
              observer.error(new Error('Google Identity Services chưa sẵn sàng.'));
              return;
            }

            const tokenClient = google.accounts.oauth2.initTokenClient({
              client_id: clientId,
              scope: 'openid email profile',
              callback: (response: any) => {
                if (response.error) {
                  observer.error(new Error(response.error_description || response.error));
                } else if (response.access_token) {
                  observer.next({ access_token: response.access_token });
                  observer.complete();
                } else {
                  observer.error(new Error('Không nhận được token từ Google.'));
                }
              },
              error_callback: (err: any) => {
                observer.error(new Error(err?.message || 'Lỗi kết nối Google OAuth.'));
              },
            });

            tokenClient.requestAccessToken({ prompt: 'select_account' });
          } catch (err) {
            observer.error(err);
          }
        });
      }),
      switchMap((tokens) => this.loginWithGoogle(tokens))
    );
  }

  private storeTokens(tokens: TokenResponse): void {
    localStorage.setItem(this.TOKEN_KEY, tokens.access_token);
    localStorage.setItem(this.REFRESH_KEY, tokens.refresh_token);
  }

  refreshToken(): Observable<TokenResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken || this.isTokenExpired(refreshToken)) {
      this.logout();
      return throwError(() => new Error('No valid refresh token is available.'));
    }

    if (!this.refreshRequest$) {
      this.refreshRequest$ = this.http
        .post<TokenResponse>(`${environment.publicApiUrl}/auth/refresh`, {
          refresh_token: refreshToken,
        })
        .pipe(
          tap((tokens) => this.storeTokens(tokens)),
          finalize(() => {
            this.refreshRequest$ = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }

    return this.refreshRequest$;
  }

  /**
   * Logs out user, cleans up state, and optionally redirects to login with returnUrl.
   */
  logout(returnUrl?: string): void {
    this.clearStorage();
    this.currentUser.set(null);

    if (returnUrl && returnUrl !== '/login' && returnUrl !== '/') {
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
    } else {
      this.router.navigate(['/login']);
    }
  }

  private clearStorage(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  updateCachedUser(data: Pick<User, 'email' | 'full_name' | 'phone'>): void {
    const current = this.currentUser();
    if (!current) return;

    const updated = { ...current, ...data };
    this.currentUser.set(updated);
    localStorage.setItem(this.USER_KEY, JSON.stringify(updated));
  }

  verifyEmail(token: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(
      `${environment.publicApiUrl}/auth/verify-email`,
      { token },
    );
  }

  resendVerification(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(
      `${environment.publicApiUrl}/auth/resend-verification`,
      { email },
    );
  }

  forgotPassword(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(
      `${environment.publicApiUrl}/auth/forgot-password`,
      { email },
    );
  }

  resetPassword(token: string, newPassword: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(
      `${environment.publicApiUrl}/auth/reset-password`,
      {
        token,
        new_password: newPassword,
      },
    );
  }
}
