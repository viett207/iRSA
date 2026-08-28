import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  NzMessageDataOptions,
  NzMessageRef,
  NzMessageService,
} from 'ng-zorro-antd/message';

const DEFAULT_DURATION_MS = 4_000;
const GENERIC_ERROR_MESSAGE = 'Đã xảy ra lỗi. Vui lòng thử lại.';
const GENERIC_INFO_MESSAGE = 'Bạn có thông báo mới.';

/**
 * Centralizes user-facing toast messages. HTTP errors are mapped to friendly
 * Vietnamese messages with automatic raw JSON filtering and deduplication.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly message = inject(NzMessageService);
  private readonly pendingHttpErrors = new WeakMap<HttpErrorResponse, ReturnType<typeof setTimeout>>();
  private readonly recentHttpMessages = new Map<string, number>();

  success(content: unknown, options?: NzMessageDataOptions): void {
    this.message.success(this.safeContent(content), this.withDefaults(options));
  }

  info(content: unknown, options?: NzMessageDataOptions): void {
    this.message.info(this.safeContent(content, GENERIC_INFO_MESSAGE), this.withDefaults(options));
  }

  warning(content: unknown, options?: NzMessageDataOptions): void {
    this.message.warning(this.safeContent(content), this.withDefaults(options));
  }

  error(content: unknown, options?: NzMessageDataOptions): void {
    this.message.error(this.safeContent(content), this.withDefaults(options));
  }

  loading(content: string, options?: NzMessageDataOptions): NzMessageRef {
    return this.message.loading(this.safeContent(content, 'Đang xử lý...'), this.withDefaults(options));
  }

  remove(id?: string): void {
    this.message.remove(id);
  }

  /** Shows an HTTP error once, coalescing parallel identical failures. */
  reportHttpError(error: unknown, fallback = GENERIC_ERROR_MESSAGE): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.error(fallback);
      return;
    }

    if (this.pendingHttpErrors.has(error)) {
      return;
    }

    const timer = setTimeout(() => {
      this.pendingHttpErrors.delete(error);
      this.showHttpErrorOnce(this.getHttpErrorMessage(error, fallback));
    });
    this.pendingHttpErrors.set(error, timer);
  }

  /** For a component that owns a contextual fallback message. */
  errorFromHttp(
    error: unknown,
    fallback = GENERIC_ERROR_MESSAGE,
    preferFallback = false,
  ): void {
    this.cancelPendingHttpError(error);
    this.showHttpErrorOnce(
      preferFallback ? this.safeContent(fallback) : this.getHttpErrorMessage(error, fallback),
    );
  }

  /** Converts HTTP error status code and payload into a user-friendly Vietnamese text. */
  getHttpErrorMessage(error: unknown, fallback = GENERIC_ERROR_MESSAGE): string {
    if (!(error instanceof HttpErrorResponse)) {
      return this.safeContent(fallback);
    }

    // Network disconnection / CORS blocked / Server offline
    if (error.status === 0) {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.';
    }

    // Try extracting backend detail if it is clean Vietnamese text
    const customMessage = this.extractCleanDetail(error);
    if (customMessage) {
      return customMessage;
    }

    switch (error.status) {
      case 400:
      case 422:
        return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.';
      case 401:
        return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      case 403:
        return 'Bạn không có quyền thực hiện thao tác này.';
      case 404:
        return 'Không tìm thấy dữ liệu yêu cầu.';
      case 409:
        return 'Dữ liệu đã thay đổi hoặc đang bị trùng. Vui lòng kiểm tra lại.';
      case 413:
        return 'Tệp tải lên vượt quá dung lượng cho phép.';
      case 415:
        return 'Định dạng tệp không được hỗ trợ.';
      case 429:
        return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.';
      default:
        return error.status >= 500
          ? 'Hệ thống máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
          : this.safeContent(fallback);
    }
  }

  private withDefaults(options?: NzMessageDataOptions): NzMessageDataOptions {
    return {
      nzDuration: DEFAULT_DURATION_MS,
      nzAnimate: true,
      nzPauseOnHover: true,
      ...options,
    };
  }

  private cancelPendingHttpError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      return;
    }

    const pendingTimer = this.pendingHttpErrors.get(error);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.pendingHttpErrors.delete(error);
    }
  }

  /** Coalesces identical failures from parallel requests while a toast is visible. */
  private showHttpErrorOnce(content: string): void {
    const now = Date.now();
    const lastShownAt = this.recentHttpMessages.get(content);
    if (lastShownAt !== undefined && now - lastShownAt < DEFAULT_DURATION_MS) {
      return;
    }

    for (const [message, shownAt] of this.recentHttpMessages) {
      if (now - shownAt >= DEFAULT_DURATION_MS) {
        this.recentHttpMessages.delete(message);
      }
    }

    this.recentHttpMessages.set(content, now);
    this.message.error(content, this.withDefaults());
  }

  /** Extracts custom error detail from API response if it is clean text, avoiding raw JSON/objects. */
  private extractCleanDetail(error: HttpErrorResponse): string | null {
    const errorBody = error.error;
    if (!errorBody || typeof errorBody !== 'object') {
      return null;
    }

    const detail = errorBody.detail;
    if (typeof detail === 'string') {
      const trimmed = detail.trim();
      // Skip raw JSON or technical error codes/objects
      if (
        trimmed.startsWith('{') ||
        trimmed.startsWith('[') ||
        trimmed === '[object Object]' ||
        trimmed.includes('Traceback (most recent call last)')
      ) {
        return null;
      }
      return trimmed.length > 0 && trimmed.length <= 300 ? trimmed : null;
    }

    if (typeof errorBody.message === 'string') {
      const msg = errorBody.message.trim();
      if (msg && !msg.startsWith('{') && !msg.startsWith('[') && msg !== '[object Object]') {
        return msg;
      }
    }

    return null;
  }

  /** Strips raw JSON, objects, and technical garbage from text rendered on UI. */
  private safeContent(content: unknown, fallback = GENERIC_ERROR_MESSAGE): string {
    if (typeof content !== 'string') {
      return fallback;
    }

    const trimmed = content.trim();
    if (
      !trimmed ||
      trimmed === '[object Object]' ||
      trimmed.startsWith('{') ||
      trimmed.startsWith('[')
    ) {
      return fallback;
    }

    return trimmed;
  }
}
