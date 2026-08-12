import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, TokenResponse, LoginRequest } from '../../shared/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly USER_KEY = 'current_user';

  private currentUser = signal<User | null>(null);
  user = this.currentUser.asReadonly();
  isAuthenticated = computed(() => !!this.currentUser());

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const stored = localStorage.getItem(this.USER_KEY);
    if (stored) {
      try {
        this.currentUser.set(JSON.parse(stored));
      } catch {
        this.clearStorage();
      }
    }
  }

  login(credentials: LoginRequest): Observable<User> {
    return this.http
      .post<TokenResponse>(`${environment.publicApiUrl}/auth/login`, credentials)
      .pipe(
        tap((tokens) => this.storeTokens(tokens)),
        switchMap(() => this.fetchCurrentUser()),
        catchError((error) => {
          this.clearStorage();
          return throwError(() => error);
        })
      );
  }

  private storeTokens(tokens: TokenResponse): void {
    localStorage.setItem(this.TOKEN_KEY, tokens.access_token);
    localStorage.setItem(this.REFRESH_KEY, tokens.refresh_token);
  }

  private fetchCurrentUser(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`).pipe(
      tap((user) => {
        this.currentUser.set(user);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }),
      catchError((error) => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  refreshToken(): Observable<TokenResponse> {
    const refreshToken = localStorage.getItem(this.REFRESH_KEY);
    return this.http
      .post<TokenResponse>(`${environment.publicApiUrl}/auth/refresh`, {
        refresh_token: refreshToken,
      })
      .pipe(
        tap((tokens) => this.storeTokens(tokens)),
        catchError((error) => {
          this.logout();
          return throwError(() => error);
        })
      );
  }

  logout(): void {
    this.clearStorage();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private clearStorage(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  hasRole(...roles: string[]): boolean {
    const user = this.currentUser();
    return user ? roles.includes(user.role) : false;
  }
}
