import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { FocusTrapDirective } from '../../directives/focus-trap.directive';

export interface PdfViewerModalData {
  blobUrl: string;
  filename: string;
  revokeOnDestroy?: boolean;
  previewSupported?: boolean;
}

@Component({
  selector: 'app-pdf-viewer-modal',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzSpinModule, FocusTrapDirective],
  template: `
    <div
      class="modal-inner"
      appFocusTrap
      (escapePressed)="modalRef.close()"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="'Xem trước ' + data.filename"
    >
      @if (data.previewSupported !== false) {
        <div class="pdf-viewer-wrapper">
          @if (iframeLoading) {
            <div class="loading-overlay" role="status" aria-live="polite">
              <nz-spin nzSize="large" nzTip="Đang tải tài liệu..."></nz-spin>
            </div>
          }
          <iframe
            [src]="safeUrl"
            class="pdf-iframe"
            [title]="'Xem trước ' + data.filename"
            (load)="onIframeLoad()"
          ></iframe>
        </div>
      } @else {
        <div class="unsupported-preview">
          <span nz-icon nzType="file-word" nzTheme="outline" aria-hidden="true"></span>
          <h3>Không thể xem trực tiếp file DOCX</h3>
          <p>Trình duyệt chưa hỗ trợ định dạng này. Bạn có thể tải file xuống để xem bằng Microsoft Word hoặc ứng dụng tương thích.</p>
        </div>
      }
      <div class="modal-footer">
        <a
          nz-button
          nzType="default"
          [href]="data.blobUrl"
          [download]="data.filename"
          aria-label="Tải xuống tệp CV"
        >
          <span nz-icon nzType="download" nzTheme="outline" aria-hidden="true"></span>
          <span>Tải xuống</span>
        </a>
        <button
          nz-button
          nzType="primary"
          (click)="modalRef.close()"
          aria-label="Đóng cửa sổ xem trước"
        >
          Đóng
        </button>
      </div>
    </div>
  `,
  styles: [`
    .modal-inner {
      display: flex;
      flex-direction: column;
      outline: none;
    }

    .pdf-viewer-wrapper {
      position: relative;
      width: 100%;
      height: 70vh;
      min-height: 400px;
      background: var(--color-bg-tertiary);
      border-radius: 4px;
      overflow: hidden;
    }

    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg-tertiary);
      z-index: 1;
    }

    .pdf-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding-top: 16px;
    }

    .unsupported-preview {
      min-height: 320px;
      padding: 48px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      border-radius: 8px;
      background: var(--color-bg-tertiary);
    }

    .unsupported-preview > [nz-icon] { color: var(--color-primary); font-size: 58px; }
    .unsupported-preview h3 { margin: 18px 0 8px; color: var(--color-text-primary); }
    .unsupported-preview p { max-width: 480px; margin: 0; color: var(--color-text-secondary); line-height: 1.6; }

    @media (max-width: 767px) {
      .pdf-viewer-wrapper {
        height: 60vh;
        min-height: 300px;
      }
    }
  `],
})
export class PdfViewerModalComponent implements OnDestroy {
  modalRef = inject(NzModalRef);
  data: PdfViewerModalData = inject(NZ_MODAL_DATA);
  private sanitizer = inject(DomSanitizer);

  safeUrl: SafeResourceUrl;
  iframeLoading = true;

  constructor() {
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.data.blobUrl);
  }

  onIframeLoad(): void {
    this.iframeLoading = false;
  }

  ngOnDestroy(): void {
    if (this.data.revokeOnDestroy !== false) {
      URL.revokeObjectURL(this.data.blobUrl);
    }
  }
}
