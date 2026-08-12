import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
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
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  ApplicationStatus,
} from '../../../shared/models/application.model';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzEmptyModule,
    NzCardModule,
    NzToolTipModule,
    NzModalModule,
  ],
  template: `
    <div class="applications-page">
      <div class="container">
        <div class="page-header">
          <h1>Hồ sơ ứng tuyển</h1>
          <p>Theo dõi trạng thái các hồ sơ bạn đã nộp</p>
        </div>

        <nz-card>
          <nz-table
            #basicTable
            [nzData]="applications"
            [nzLoading]="loading"
            [nzPageSize]="pageSize"
            [nzTotal]="total"
            [nzFrontPagination]="false"
            (nzPageIndexChange)="onPageChange($event)"
            [nzShowPagination]="total > pageSize"
            nzShowSizeChanger
            [nzPageSizeOptions]="[10, 20, 50]"
            (nzPageSizeChange)="onPageSizeChange($event)"
          >
            <thead>
              <tr>
                <th>Vị trí</th>
                <th class="hide-mobile">Phòng ban</th>
                <th class="hide-mobile">Địa điểm</th>
                <th>Trạng thái</th>
                <th class="hide-mobile">Ngày nộp</th>
                <th nzWidth="180px"></th>
              </tr>
            </thead>
            <tbody>
              @for (app of applications; track app.id) {
                <tr>
                  <td>
                    <div class="job-title">{{ app.job_title }}</div>
                    <div class="mobile-meta show-mobile-only">
                      {{ app.submitted_at | date: 'dd/MM/yyyy' }}
                    </div>
                  </td>
                  <td class="hide-mobile">{{ app.job_department || '-' }}</td>
                  <td class="hide-mobile">{{ app.job_location || '-' }}</td>
                  <td>
                    <nz-tag [nzColor]="getStatusColor(app.public_status)">
                      {{ getStatusLabel(app.public_status) }}
                    </nz-tag>
                  </td>
                  <td class="hide-mobile">{{ app.submitted_at | date: 'dd/MM/yyyy' }}</td>
                  <td class="actions-cell">
                    <button
                      nz-button
                      nzType="link"
                      nzSize="small"
                      nz-tooltip
                      nzTooltipTitle="Xem CV đã nộp"
                      (click)="openPdfViewer(app)"
                    >
                      <span nz-icon nzType="file-pdf" nzTheme="outline"></span>
                      <span class="hide-mobile">Xem CV</span>
                    </button>
                    <a
                      [routerLink]="['/jobs', app.job_slug]"
                      nz-button
                      nzType="link"
                      nzSize="small"
                      nz-tooltip
                      nzTooltipTitle="Xem tin tuyển dụng"
                    >
                      <span nz-icon nzType="eye" nzTheme="outline"></span>
                      <span class="hide-mobile">Xem tin</span>
                    </a>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6">
                    <nz-empty
                      nzNotFoundImage="simple"
                      nzNotFoundContent="Bạn chưa có hồ sơ ứng tuyển nào"
                    >
                      <a routerLink="/jobs" nz-button nzType="primary">
                        Tìm việc làm
                      </a>
                    </nz-empty>
                  </td>
                </tr>
              }
            </tbody>
          </nz-table>
        </nz-card>
      </div>
    </div>
  `,
  styles: [
    `
      .applications-page {
        padding: var(--space-8) 0;
        min-height: 100vh;
        background: var(--color-bg-primary);
      }

      .container {
        max-width: var(--container-max);
        margin: 0 auto;
        padding: 0 var(--container-padding);
      }

      .page-header {
        margin-bottom: var(--space-6);

        h1 {
          font-family: var(--font-heading);
          font-size: var(--text-2xl);
          font-weight: var(--font-bold);
          color: var(--color-text-primary);
          margin-bottom: var(--space-2);
        }

        p {
          color: var(--color-text-secondary);
        }
      }

      .job-title {
        font-weight: var(--font-medium);
      }

      .mobile-meta {
        font-size: var(--text-xs);
        color: var(--color-text-tertiary);
        margin-top: var(--space-1);
      }

      .actions-cell {
        display: flex;
        gap: var(--space-1);
        white-space: nowrap;
      }

      @media (max-width: 767px) {
        .hide-mobile {
          display: none !important;
        }
      }

      @media (min-width: 768px) {
        .show-mobile-only {
          display: none !important;
        }
      }
    `,
  ],
})
export class ApplicationsComponent implements OnInit {
  private applicationService = inject(ApplicationService);
  private modal = inject(NzModalService);
  private message = inject(NzMessageService);

  loading = true;
  applications: Application[] = [];
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

  getStatusColor(status: string): string {
    return APPLICATION_STATUS_COLORS[status as ApplicationStatus] || 'default';
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
