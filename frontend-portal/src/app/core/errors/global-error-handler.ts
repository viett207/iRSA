import { ErrorHandler, Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../services/toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly toast = inject(ToastService);

  handleError(error: unknown): void {
    const originalError = this.unwrapError(error);

    if (originalError instanceof HttpErrorResponse) {
      this.toast.reportHttpError(originalError);
    } else {
      this.toast.error('Đã xảy ra lỗi không mong muốn. Vui lòng tải lại trang và thử lại.');
    }

    // Keep diagnostic detail out of the UI while preserving it for developers.
    console.error(error);
  }

  /** Zone.js may wrap rejected promises before forwarding them to ErrorHandler. */
  private unwrapError(error: unknown): unknown {
    if (!error || typeof error !== 'object') {
      return error;
    }

    const wrappedError = error as {
      rejection?: unknown;
      ngOriginalError?: unknown;
    };

    return wrappedError.rejection ?? wrappedError.ngOriginalError ?? error;
  }
}
