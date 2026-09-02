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
  templateUrl: './pdf-viewer-modal.component.html',
  styleUrl: './pdf-viewer-modal.component.scss',
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
