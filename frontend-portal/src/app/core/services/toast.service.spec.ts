import { HttpErrorResponse } from '@angular/common/http';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NzMessageService } from 'ng-zorro-antd/message';

import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;
  let message: jasmine.SpyObj<NzMessageService>;

  beforeEach(() => {
    message = jasmine.createSpyObj<NzMessageService>('NzMessageService', [
      'success',
      'info',
      'warning',
      'error',
      'loading',
      'remove',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ToastService,
        { provide: NzMessageService, useValue: message },
      ],
    });

    service = TestBed.inject(ToastService);
  });

  it('uses an animated four-second toast that pauses on hover', () => {
    service.success('Lưu thành công');

    expect(message.success).toHaveBeenCalledWith('Lưu thành công', {
      nzDuration: 4_000,
      nzAnimate: true,
      nzPauseOnHover: true,
    });
  });

  it('never renders a raw JSON object as an error', () => {
    service.error({ detail: 'Internal error' });
    service.error('{"detail":"Internal error"}');

    expect(message.error).toHaveBeenCalledTimes(2);
    expect(message.error.calls.allArgs().map(([content]) => content)).toEqual([
      'Đã xảy ra lỗi. Vui lòng thử lại.',
      'Đã xảy ra lỗi. Vui lòng thử lại.',
    ]);
  });

  it('maps common HTTP statuses to friendly Vietnamese messages', () => {
    const offlineError = new HttpErrorResponse({ status: 0 });
    const unauthorizedError = new HttpErrorResponse({ status: 401 });
    const validationError = new HttpErrorResponse({ status: 422 });

    expect(service.getHttpErrorMessage(offlineError)).toContain('Không thể kết nối đến máy chủ');
    expect(service.getHttpErrorMessage(unauthorizedError)).toContain('Phiên đăng nhập đã hết hạn');
    expect(service.getHttpErrorMessage(validationError)).toContain('Dữ liệu không hợp lệ');
  });

  it('reports the same HTTP error only once', fakeAsync(() => {
    const error = new HttpErrorResponse({ status: 500 });

    service.reportHttpError(error);
    service.reportHttpError(error);
    tick();

    expect(message.error).toHaveBeenCalledTimes(1);
  }));

  it('coalesces equivalent failures from parallel HTTP requests', fakeAsync(() => {
    service.reportHttpError(new HttpErrorResponse({ status: 0 }));
    service.reportHttpError(new HttpErrorResponse({ status: 0 }));
    tick();

    expect(message.error).toHaveBeenCalledTimes(1);
    expect(message.error.calls.mostRecent().args[0]).toContain('Không thể kết nối đến máy chủ');
  }));

  it('lets a component replace the pending global toast with contextual copy', fakeAsync(() => {
    const error = new HttpErrorResponse({ status: 409 });

    service.reportHttpError(error);
    service.errorFromHttp(error, 'Bạn đã ứng tuyển vị trí này trước đó.', true);
    tick();

    expect(message.error).toHaveBeenCalledTimes(1);
    expect(message.error.calls.mostRecent().args[0]).toBe('Bạn đã ứng tuyển vị trí này trước đó.');
  }));
});
