import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { ToastService } from '../services/toast.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getAccessToken',
      'getRefreshToken',
      'refreshToken',
      'logout',
    ]);
    toastSpy = jasmine.createSpyObj('ToastService', ['reportHttpError']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('attaches Bearer token to authenticated requests when token exists', () => {
    authServiceSpy.getAccessToken.and.returnValue('mock-access-token');

    http.get('/api/v1/jobs').subscribe();

    const req = httpMock.expectOne('/api/v1/jobs');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-access-token');
    req.flush({ items: [] });
  });

  it('does NOT attach Authorization header to public auth endpoints', () => {
    authServiceSpy.getAccessToken.and.returnValue('mock-access-token');

    http.post('/pub/auth/login', { email: 'test@test.com', password: 'password' }).subscribe();

    const req = httpMock.expectOne('/pub/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ access_token: 'new-token' });
  });

  it('handles 401 error by refreshing token and retrying original request', () => {
    authServiceSpy.getAccessToken.and.returnValues('old-token', 'new-refreshed-token');
    authServiceSpy.getRefreshToken.and.returnValue('mock-refresh-token');
    authServiceSpy.refreshToken.and.returnValue(
      of({
        access_token: 'new-refreshed-token',
        refresh_token: 'new-refresh-token',
        token_type: 'bearer',
      })
    );

    http.get('/api/v1/profile').subscribe({
      next: (res) => {
        expect(res).toEqual({ name: 'Candidate' });
      },
    });

    // 1st request fails with 401
    const req1 = httpMock.expectOne('/api/v1/profile');
    expect(req1.request.headers.get('Authorization')).toBe('Bearer old-token');
    req1.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.refreshToken).toHaveBeenCalled();

    // 2nd retried request with new token succeeds
    const req2 = httpMock.expectOne('/api/v1/profile');
    expect(req2.request.headers.get('Authorization')).toBe('Bearer new-refreshed-token');
    req2.flush({ name: 'Candidate' });
  });

  it('logs out and reports error when 401 refresh token fails', () => {
    authServiceSpy.getAccessToken.and.returnValue('expired-token');
    authServiceSpy.getRefreshToken.and.returnValue('invalid-refresh-token');
    authServiceSpy.refreshToken.and.returnValue(
      throwError(() => new Error('Refresh failed'))
    );

    http.get('/api/v1/profile').subscribe({
      error: (err) => {
        expect(err).toBeTruthy();
      },
    });

    const req = httpMock.expectOne('/api/v1/profile');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(toastSpy.reportHttpError).toHaveBeenCalled();
  });

  it('logs out immediately when 401 occurs and no refresh token is available', () => {
    authServiceSpy.getAccessToken.and.returnValue('expired-token');
    authServiceSpy.getRefreshToken.and.returnValue(null);

    http.get('/api/v1/profile').subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
      },
    });

    const req = httpMock.expectOne('/api/v1/profile');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.refreshToken).not.toHaveBeenCalled();
    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(toastSpy.reportHttpError).toHaveBeenCalledWith(
      jasmine.objectContaining({ status: 401 }),
      'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    );
  });

  it('handles 403 Forbidden error and reports message to toast', () => {
    authServiceSpy.getAccessToken.and.returnValue('valid-token');

    http.delete('/api/v1/admin/users/1').subscribe({
      error: (err) => {
        expect(err.status).toBe(403);
      },
    });

    const req = httpMock.expectOne('/api/v1/admin/users/1');
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

    expect(toastSpy.reportHttpError).toHaveBeenCalledWith(
      jasmine.objectContaining({ status: 403 }),
      'Bạn không có quyền thực hiện thao tác này.'
    );
  });

  it('handles 500 Internal Server Error and reports message to toast', () => {
    authServiceSpy.getAccessToken.and.returnValue('valid-token');

    http.get('/api/v1/jobs/broken').subscribe({
      error: (err) => {
        expect(err.status).toBe(500);
      },
    });

    const req = httpMock.expectOne('/api/v1/jobs/broken');
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

    expect(toastSpy.reportHttpError).toHaveBeenCalledWith(
      jasmine.objectContaining({ status: 500 }),
      'Hệ thống máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
    );
  });

  it('handles status 0 network error and reports message to toast', () => {
    http.get('/api/v1/jobs').subscribe({
      error: (err) => {
        expect(err.status).toBe(0);
      },
    });

    const req = httpMock.expectOne('/api/v1/jobs');
    req.error(new ProgressEvent('Network error'), { status: 0 });

    expect(toastSpy.reportHttpError).toHaveBeenCalledWith(
      jasmine.objectContaining({ status: 0 }),
      'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.'
    );
  });
});
