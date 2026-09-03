import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastService } from '../../../core/services/toast.service';

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
    TranslateModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzEmptyModule,
    NzCardModule,
    NzToolTipModule,
    NzModalModule,
    NzPaginationModule,
  ],
  template: `
    <div class="applications-page">
      <div class="container">
        <!-- Back Link -->
        <div class="back-link-wrapper">
          <a routerLink="/" class="back-link">
            <span nz-icon nzType="arrow-left" nzTheme="outline"></span>
            <span>Quay lại trang chủ</span>
          </a>
        </div>

        <header class="page-header">
          <span class="eyebrow">ỨNG TUYỂN CỦA TÔI</span>
          <h1>Đơn ứng tuyển của tôi</h1>
          <p>Theo dõi tiến trình và trạng thái các vị trí bạn đã ứng tuyển</p>
        </header>

        <!-- Desktop Table View -->
        <div class="desktop-table-container hide-mobile">
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
              [nzNoResult]="emptyTpl"
            >
              <thead>
                <tr>
                  <th>Vị trí</th>
                  <th>Công ty</th>
                  <th>Địa điểm</th>
                  <th>Trạng thái</th>
                  <th>Ngày nộp</th>
                  <th nzWidth="180px">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (app of applications; track app.id) {
                  <tr>
                    <td>
                      <div class="job-title">{{ app.job_title }}</div>
                    </td>
                    <td>{{ app.job_department || '-' }}</td>
                    <td>{{ app.job_location || '-' }}</td>
                    <td>
                      <nz-tag [nzColor]="getStatusColor(app.public_status)">
                        {{ getStatusLabel(app.public_status) }}
                      </nz-tag>
                    </td>
                    <td>{{ app.submitted_at | date: 'dd/MM/yyyy' }}</td>
                    <td>
                      <div class="actions-cell">
                        <button
                          nz-button
                          nzType="link"
                          nzSize="small"
                          nz-tooltip
                          nzTooltipTitle="Xem CV đã nộp"
                          (click)="openPdfViewer(app)"
                        >
                          <span nz-icon nzType="file-pdf" nzTheme="outline"></span>
                          <span>Xem CV</span>
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
                          <span>Xem tin</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </nz-table>

            <ng-template #emptyTpl>
              <nz-empty
                nzNotFoundImage="simple"
                nzNotFoundContent="Bạn chưa có hồ sơ ứng tuyển nào"
              >
                <a routerLink="/jobs" nz-button nzType="primary">
                  Tìm việc làm
                </a>
              </nz-empty>
            </ng-template>
          </nz-card>
        </div>

        <!-- Mobile Card List View -->
        <div class="mobile-card-list show-mobile-only">
          @if (loading) {
            <div class="loading-state">
              <span nz-icon nzType="loading" nzTheme="outline" class="loading-icon"></span>
              <p>Đang tải danh sách hồ sơ...</p>
            </div>
          } @else if (applications.length === 0) {
            <nz-card>
              <nz-empty
                nzNotFoundImage="simple"
                nzNotFoundContent="Bạn chưa có hồ sơ ứng tuyển nào"
              >
                <a routerLink="/jobs" nz-button nzType="primary" nzSize="large" class="mobile-action-btn">
                  Tìm việc làm ngay
                </a>
              </nz-empty>
            </nz-card>
          } @else {
            <div class="cards-wrapper">
              @for (app of applications; track app.id) {
                <div class="application-card">
                  <div class="card-header">
                    <div class="card-title-group">
                      <h3 class="card-job-title">{{ app.job_title }}</h3>
                      @if (app.job_department || app.job_location) {
                        <div class="card-meta">
                          @if (app.job_department) {
                            <span><span nz-icon nzType="apartment" nzTheme="outline"></span>{{ app.job_department }}</span>
                          }
                          @if (app.job_location) {
                            <span><span nz-icon nzType="environment" nzTheme="outline"></span>{{ app.job_location }}</span>
                          }
                        </div>
                      }
                    </div>
                    <nz-tag [nzColor]="getStatusColor(app.public_status)" class="card-status-tag">
                      {{ getStatusLabel(app.public_status) }}
                    </nz-tag>
                  </div>

                  <div class="card-details">
                    <div class="detail-row">
                      <span class="detail-label">Ngày nộp đơn:</span>
                      <span class="detail-value">{{ app.submitted_at | date: 'dd/MM/yyyy · HH:mm' }}</span>
                    </div>
                    @if (app.resume_filename) {
                      <div class="detail-row">
                        <span class="detail-label">File CV:</span>
                        <span class="detail-value filename-text">{{ app.resume_filename }}</span>
                      </div>
                    }
                  </div>

                  <div class="card-actions">
                    <button
                      nz-button
                      nzType="default"
                      class="mobile-touch-btn"
                      (click)="openPdfViewer(app)"
                    >
                      <span nz-icon nzType="file-pdf" nzTheme="outline"></span>
                      <span>Xem CV</span>
                    </button>
                    <a
                      [routerLink]="['/jobs', app.job_slug]"
                      nz-button
                      nzType="primary"
                      class="mobile-touch-btn"
                    >
                      <span nz-icon nzType="eye" nzTheme="outline"></span>
                      <span>Xem tin</span>
                    </a>
                  </div>
                </div>
              }
            </div>

            @if (total > pageSize) {
              <div class="mobile-pagination">
                <nz-pagination
                  [nzPageIndex]="page"
                  [nzTotal]="total"
                  [nzPageSize]="pageSize"
                  [nzSimple]="true"
                  (nzPageIndexChange)="onPageChange($event)"
                ></nz-pagination>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .applications-page {
        min-height: calc(100vh - var(--header-height));
        padding: 40px 0 64px;
        background: linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 5%, var(--color-bg-primary)) 0, var(--color-bg-primary) 260px);
      }

      .container {
        width: min(1120px, calc(100% - 40px));
        margin: 0 auto;
        padding: 0;
      }

      .back-link-wrapper {
        margin-bottom: var(--space-5, 20px);
      }

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--color-text-secondary);
        font-size: var(--text-sm, 14px);
        font-weight: 500;
        text-decoration: none;
        transition: color var(--transition-fast, .2s ease);

        &:hover {
          color: var(--color-primary);
        }
      }

      .page-header {
        margin-bottom: 28px;

        .eyebrow {
          display: block;
          margin-bottom: 8px;
          color: var(--color-primary);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        h1 {
          font-family: var(--font-heading);
          font-size: clamp(24px, 2.5vw, 28px);
          font-weight: 700;
          line-height: 1.25;
          letter-spacing: -0.01em;
          color: var(--color-text-primary);
          margin: 0;
        }

        p {
          max-width: 680px;
          margin: 10px 0 0;
          color: var(--color-text-secondary);
          font-size: 15px;
          line-height: 1.6;
        }
      }

      .job-title {
        font-weight: var(--font-medium);
        color: var(--color-text-primary);
      }

      .actions-cell {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
        white-space: nowrap;
      }

      /* Mobile Card List */
      .cards-wrapper {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }

      .application-card {
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        padding: var(--space-5);
        box-shadow: var(--shadow-sm);
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-3);
      }

      .card-title-group {
        flex: 1;
      }

      .card-job-title {
        font-family: var(--font-heading);
        font-size: var(--text-base);
        font-weight: var(--font-bold);
        color: var(--color-text-primary);
        margin: 0 0 var(--space-1);
      }

      .card-meta {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-3);
        font-size: var(--text-xs);
        color: var(--color-text-tertiary);

        span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
      }

      .card-status-tag {
        margin: 0 !important;
        font-weight: var(--font-medium);
      }

      .card-details {
        background: var(--color-bg-tertiary, #f8fafc);
        border-radius: var(--radius-md);
        padding: var(--space-3);
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: var(--text-xs);
      }

      .detail-label {
        color: var(--color-text-tertiary);
      }

      .detail-value {
        color: var(--color-text-primary);
        font-weight: var(--font-medium);

        &.filename-text {
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .card-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
      }

      .mobile-touch-btn {
        height: 44px !important;
        border-radius: var(--radius-lg) !important;
        font-weight: var(--font-medium) !important;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .loading-state {
        text-align: center;
        padding: var(--space-12) 0;
        color: var(--color-text-tertiary);

        .loading-icon {
          font-size: 32px;
          color: var(--color-primary);
          margin-bottom: var(--space-3);
        }
      }

      .mobile-action-btn {
        height: 48px !important;
        border-radius: var(--radius-lg) !important;
        font-weight: var(--font-semibold) !important;
      }

      .mobile-pagination {
        display: flex;
        justify-content: center;
        padding: var(--space-6) 0 var(--space-2);
      }

      @media (max-width: 700px) {
        .applications-page {
          padding: 28px 0 44px;
        }
        .container {
          width: min(100% - 24px, 1120px);
        }
        .page-header {
          align-items: flex-start;
          flex-direction: column;
          margin-bottom: 22px;
        }
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

      /* Dark Mode Overrides */
      :host-context([data-theme='dark']),
      :host-context(.dark) {
        .application-card {
          background: var(--color-bg-secondary);
          border-color: var(--color-border);
        }

        .card-details {
          background: var(--color-bg-tertiary);
        }
      }
    `,
  ],
})
export class ApplicationsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private applicationService = inject(ApplicationService);
  private modal = inject(NzModalService);
  private message = inject(ToastService);

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
    this.applicationService
      .list(this.page, this.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
    this.applicationService
      .downloadResume(app.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
