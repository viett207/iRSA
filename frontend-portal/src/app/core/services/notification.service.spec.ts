import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { NotificationService } from './notification.service';
import { ToastService } from './toast.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    toastSpy = jasmine.createSpyObj('ToastService', [
      'success',
      'info',
      'warning',
      'error',
      'loading',
      'remove',
      'reportHttpError',
      'errorFromHttp',
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        NotificationService,
        { provide: ToastService, useValue: toastSpy },
      ],
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.disconnect();
  });

  it('delegates toast success, error, info, warning calls to ToastService', () => {
    service.success('Thành công!');
    expect(toastSpy.success).toHaveBeenCalledWith('Thành công!', undefined);

    service.error('Có lỗi xảy ra!');
    expect(toastSpy.error).toHaveBeenCalledWith('Có lỗi xảy ra!', undefined);

    service.info('Thông báo mới');
    expect(toastSpy.info).toHaveBeenCalledWith('Thông báo mới', undefined);

    service.warning('Cảnh báo');
    expect(toastSpy.warning).toHaveBeenCalledWith('Cảnh báo', undefined);
  });

  it('loads notifications and updates signals correctly', () => {
    service.loadNotifications(1);

    const req = httpMock.expectOne('http://localhost:8000/api/v1/notifications?page=1&size=20');
    expect(req.request.method).toBe('GET');

    req.flush({
      items: [
        {
          id: 1,
          type: 'job_applied',
          title: 'Ứng tuyển thành công',
          message: 'Đơn của bạn đã được gửi',
          data: null,
          is_read: false,
          created_at: '2026-08-22T10:00:00Z',
        },
      ],
      total: 1,
      unread_count: 1,
    });

    expect(service.notifications().length).toBe(1);
    expect(service.unreadCount()).toBe(1);
  });

  it('marks a single notification as read and updates count', () => {
    service.notifications.set([
      {
        id: 1,
        type: 'job_applied',
        title: 'Ứng tuyển',
        message: 'Test',
        data: null,
        is_read: false,
        created_at: '2026-08-22T10:00:00Z',
      },
    ]);
    service.unreadCount.set(1);

    service.markAsRead(1);

    const req = httpMock.expectOne('http://localhost:8000/api/v1/notifications/1/read');
    expect(req.request.method).toBe('PATCH');
    req.flush({});

    expect(service.notifications()[0].is_read).toBeTrue();
    expect(service.unreadCount()).toBe(0);
  });

  it('marks all notifications as read and resets count to 0', () => {
    service.notifications.set([
      {
        id: 1,
        type: 'job',
        title: 'Job 1',
        message: 'Msg 1',
        data: null,
        is_read: false,
        created_at: '2026-08-22T10:00:00Z',
      },
      {
        id: 2,
        type: 'job',
        title: 'Job 2',
        message: 'Msg 2',
        data: null,
        is_read: false,
        created_at: '2026-08-22T10:00:00Z',
      },
    ]);
    service.unreadCount.set(2);

    service.markAllAsRead();

    const req = httpMock.expectOne('http://localhost:8000/api/v1/notifications/read-all');
    expect(req.request.method).toBe('PATCH');
    req.flush({});

    expect(service.notifications().every((n) => n.is_read)).toBeTrue();
    expect(service.unreadCount()).toBe(0);
  });
});
