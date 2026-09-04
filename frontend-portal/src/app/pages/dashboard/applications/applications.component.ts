import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';

import { ApplicationService } from '../../../core/services/application.service';
import {
  PdfViewerModalComponent,
  PdfViewerModalData,
} from '../../../shared/components/pdf-viewer-modal/pdf-viewer-modal.component';
import {
  Application,
  ApplicationStatusCounts,
  APPLICATION_STATUS_LABELS,
  ApplicationStatus,
} from '../../../shared/models/application.model';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzTableModule,
    NzIconModule,
    NzEmptyModule,
    NzCardModule,
    NzToolTipModule,
    NzModalModule,
  ],
  templateUrl: './applications.component.html',
  styleUrl: './applications.component.scss',
})
export class ApplicationsComponent implements OnInit {
  private applicationService = inject(ApplicationService);
  private modal = inject(NzModalService);
  private message = inject(NzMessageService);

  loading = true;
  applications: Application[] = [];
  statusCounts: ApplicationStatusCounts = {
    in_review: 0,
    shortlisted: 0,
    not_selected: 0,
    selected: 0,
  };
  total = 0;
  page = 1;
  pageSize = 20;

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.loading = true;
    this.applicationService.list(this.page, this.pageSize).subscribe({
      next: (res) => {
        this.applications = res.items;
        this.total = res.total;
        this.statusCounts = res.status_counts;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onPageChange(page: number): void {
    this.page = page;
    this.loadApplications();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.page = 1;
    this.loadApplications();
  }

  getStatusLabel(status: string): string {
    return APPLICATION_STATUS_LABELS[status as ApplicationStatus] || status;
  }

  getStatusDescription(status: string): string {
    const descriptions: Record<string, string> = {
      in_review: 'Doanh nghiệp đang đánh giá hồ sơ',
      shortlisted: 'Bạn đã tiến vào vòng tiếp theo',
      not_selected: 'Hồ sơ chưa phù hợp với vị trí này',
      selected: 'Chúc mừng, bạn đã được tuyển chọn',
    };
    return descriptions[status] || 'Trạng thái hồ sơ đã được cập nhật';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      in_review: 'clock-circle',
      shortlisted: 'star',
      not_selected: 'close-circle',
      selected: 'check-circle',
    };
    return icons[status] || 'info-circle';
  }

  openPdfViewer(app: Application): void {
    const loadingId = this.message.loading('Đang tải CV...', { nzDuration: 0 }).messageId;
    this.applicationService.downloadResume(app.id).subscribe({
      next: (blob) => {
        this.message.remove(loadingId);
        const blobUrl = URL.createObjectURL(blob);
        this.modal.create<PdfViewerModalComponent, PdfViewerModalData>({
          nzTitle: app.resume_filename || 'CV ứng tuyển',
          nzContent: PdfViewerModalComponent,
          nzData: { blobUrl, filename: app.resume_filename },
          nzWidth: '90vw',
          nzStyle: { maxWidth: '1000px' },
          nzFooter: null,
          nzMaskClosable: true,
        });
      },
      error: () => {
        this.message.remove(loadingId);
        this.message.error('Không thể tải CV. Vui lòng thử lại.');
      },
    });
  }
}
