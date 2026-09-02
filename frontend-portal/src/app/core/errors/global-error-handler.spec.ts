import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ToastService } from '../services/toast.service';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  let handler: GlobalErrorHandler;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    toast = jasmine.createSpyObj<ToastService>('ToastService', [
      'reportHttpError',
      'error',
    ]);

    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        { provide: ToastService, useValue: toast },
      ],
    });

    handler = TestBed.inject(GlobalErrorHandler);
    spyOn(console, 'error');
  });

  it('routes HTTP errors through the safe HTTP message mapper', () => {
    const error = new HttpErrorResponse({ status: 500 });

    handler.handleError(error);

    expect(toast.reportHttpError).toHaveBeenCalledOnceWith(error);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('unwraps HTTP errors from rejected promises', () => {
    const error = new HttpErrorResponse({ status: 401 });

    handler.handleError({ rejection: error });

    expect(toast.reportHttpError).toHaveBeenCalledOnceWith(error);
  });

  it('shows a generic message for unexpected runtime errors', () => {
    handler.handleError(new Error('Sensitive implementation detail'));

    expect(toast.error).toHaveBeenCalledWith(
      'Đã xảy ra lỗi không mong muốn. Vui lòng tải lại trang và thử lại.',
    );
  });
});
