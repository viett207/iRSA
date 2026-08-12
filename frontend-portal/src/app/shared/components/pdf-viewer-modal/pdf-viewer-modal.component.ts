import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';

export interface PdfViewerModalData {
  blobUrl: string;
  filename: string;
}

@Component({
  selector: 'app-pdf-viewer-modal',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzSpinModule],
  template: `
    <div class="pdf-viewer-wrapper">
      @if (iframeLoading) {
        <div class="loading-overlay">
          <nz-spin nzSize="large" nzTip="Đang tải tài liệu..."></nz-spin>
        </div>
      }
      <iframe
        [src]="safeUrl"
        class="pdf-iframe"
        (load)="onIframeLoad()"
      ></iframe>
    </div>
    <div class="modal-footer">
      <a
        nz-button
        nzType="default"
        [href]="data.blobUrl"
        [download]="data.filename"
      >
        <span nz-icon nzType="download" nzTheme="outline"></span>
        Tải xuống
      </a>
      <button nz-button nzType="primary" (click)="modalRef.close()">
        Đóng
      </button>
    </div>
  `,
  styles: [`
    .pdf-viewer-wrapper {
      position: relative;
      width: 100%;
      height: 70vh;
      min-height: 400px;
      background: #f5f5f5;
      border-radius: 4px;
      overflow: hidden;
    }

    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
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
    URL.revokeObjectURL(this.data.blobUrl);
  }
}
