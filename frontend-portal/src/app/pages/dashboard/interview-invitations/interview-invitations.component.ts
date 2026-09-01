import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { ApplicationService } from '../../../core/services/application.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  CandidateInterviewActionRequest,
  InterviewInvitation,
} from '../../../shared/models/application.model';

export function getSafeMeetingUrl(invitation: InterviewInvitation): string | null {
  const location = invitation.location?.trim() ?? '';
  return invitation.interview_type === 'online' && /^https?:\/\//i.test(location)
    ? location
    : null;
}

export function canRespondToInvitation(invitation: InterviewInvitation): boolean {
  if (invitation.status !== 'scheduled' || invitation.candidate_response !== 'pending') {
    return false;
  }
  const ivTime = new Date(invitation.interview_date).getTime();
  return !isNaN(ivTime) && ivTime > Date.now();
}

@Component({
  selector: 'app-interview-invitations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzCardModule,
    NzGridModule,
    NzButtonModule,
    NzTagModule,
    NzIconModule,
    NzEmptyModule,
    NzSpinModule,
    NzModalModule,
    NzDatePickerModule,
    NzInputModule,
    NzPaginationModule,
  ],
  template: `
    <div class="invitations-page">
      <div class="container">
        <!-- Back Link -->
        <div class="back-link-wrapper">
          <a routerLink="/" class="back-link">
            <span nz-icon nzType="arrow-left" nzTheme="outline"></span>
            <span>Quay lại trang chủ</span>
          </a>
        </div>

        <header class="page-header">
          <div class="header-copy">
            <span class="eyebrow">LỊCH PHỎNG VẤN</span>
            <h1>Lời mời phỏng vấn</h1>
            <p>Xem và phản hồi lịch phỏng vấn do nhà tuyển dụng gửi</p>
          </div>
        </header>

        @if (loading) {
          <div class="state-container loading-state">
            <nz-spin nzSize="large"></nz-spin>
            <span class="loading-text">Đang tải lời mời phỏng vấn...</span>
          </div>
        } @else if (hasError) {
          <nz-card class="state-card error-card">
            <div class="error-state">
              <span nz-icon nzType="close-circle" nzTheme="fill" class="error-icon"></span>
              <h3>Không thể tải danh sách lời mời</h3>
              <p>Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.</p>
              <button nz-button nzType="primary" (click)="loadInvitations()">
                <span nz-icon nzType="reload" nzTheme="outline"></span>
                Thử lại
              </button>
            </div>
          </nz-card>
        } @else if (invitations.length === 0) {
          <nz-card class="state-card">
            <nz-empty
              nzNotFoundImage="simple"
              nzNotFoundContent="Bạn chưa có lời mời phỏng vấn nào"
            >
              <a routerLink="/dashboard/applications" nz-button nzType="primary">
                Xem đơn ứng tuyển
              </a>
            </nz-empty>
          </nz-card>
        } @else {
          <div class="invitations-grid">
            @for (item of invitations; track item.id) {
              <article
                class="invitation-card"
                [id]="'invitation-card-' + item.id"
                [class.is-highlighted]="item.id === highlightedId"
              >
                <div class="card-top">
                  <div class="job-meta">
                    <span class="type-pill">
                      <span
                        nz-icon
                        [nzType]="item.interview_type === 'online' ? 'video-camera' : 'environment'"
                        nzTheme="outline"
                      ></span>
                      {{ item.interview_type === 'online' ? 'Trực tuyến' : 'Trực tiếp' }}
                    </span>
                    <h2 class="job-title">
                      @if (item.job_slug) {
                        <a [routerLink]="['/jobs', item.job_slug]">{{ item.job_title }}</a>
                      } @else {
                        <span>{{ item.job_title }}</span>
                      }
                    </h2>
                    @if (item.company_name || item.job_department || item.scheduler_name) {
                      <div class="host-info">
                        @if (item.company_name) {
                          <span class="company-name">
                            <span nz-icon nzType="bank" nzTheme="outline"></span>
                            {{ item.company_name }}
                          </span>
                        }
                        @if (item.job_department) {
                          <span class="department-name">
                            <span nz-icon nzType="apartment" nzTheme="outline"></span>
                            {{ item.job_department }}
                          </span>
                        }
                        @if (item.scheduler_name) {
                          <span class="scheduler-name">
                            <span nz-icon nzType="user" nzTheme="outline"></span>
                            Người đặt: {{ item.scheduler_name }}
                          </span>
                        }
                      </div>
                    }
                  </div>
                  <nz-tag [nzColor]="getStatusBadge(item).color" class="status-tag">
                    {{ getStatusBadge(item).label }}
                  </nz-tag>
                </div>

                <div class="card-body">
                  <div class="detail-row">
                    <span class="detail-label">
                      <span nz-icon nzType="calendar" nzTheme="outline"></span>
                      Thời gian:
                    </span>
                    <span class="detail-value time-value">
                      {{ item.interview_date | date: 'EEEE, dd/MM/yyyy · HH:mm' }}
                    </span>
                  </div>

                  @if (item.interview_type === 'online') {
                    <div class="detail-row">
                      <span class="detail-label">
                        <span nz-icon nzType="link" nzTheme="outline"></span>
                        Link họp:
                      </span>
                      <span class="detail-value">
                        @if (getMeetingUrl(item); as meetingUrl) {
                          <a
                            [href]="meetingUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="safe-link"
                          >
                            Tham gia phỏng vấn
                            <span nz-icon nzType="export" nzTheme="outline"></span>
                          </a>
                        } @else {
                          <span class="text-muted">Link họp sẽ được gửi trước buổi phỏng vấn</span>
                        }
                      </span>
                    </div>
                  } @else {
                    <div class="detail-row">
                      <span class="detail-label">
                        <span nz-icon nzType="environment" nzTheme="outline"></span>
                        Địa điểm:
                      </span>
                      <span class="detail-value">
                        {{ item.location?.trim() || 'Địa điểm sẽ được cập nhật' }}
                      </span>
                    </div>
                  }

                  @if (item.notes) {
                    <div class="notes-box">
                      <span class="notes-label">Ghi chú từ nhà tuyển dụng:</span>
                      <p class="notes-text">{{ item.notes }}</p>
                    </div>
                  }

                  @if (item.candidate_response === 'reschedule_requested') {
                    <div class="response-info-box reschedule-info">
                      <span class="info-title">
                        <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                        Thời gian bạn đề xuất:
                      </span>
                      <span class="info-date">
                        {{ item.candidate_proposed_date | date: 'EEEE, dd/MM/yyyy · HH:mm' }}
                      </span>
                      @if (item.candidate_response_note) {
                        <p class="info-note">“{{ item.candidate_response_note }}”</p>
                      }
                    </div>
                  } @else if (item.candidate_response_note) {
                    <div class="response-info-box">
                      <span class="info-title">Phản hồi của bạn:</span>
                      <p class="info-note">“{{ item.candidate_response_note }}”</p>
                    </div>
                  }
                </div>

                @if (canRespond(item)) {
                  <footer class="card-actions">
                    <button
                      nz-button
                      nzType="primary"
                      class="action-btn accept-btn"
                      [nzLoading]="submittingId === item.id"
                      [disabled]="submittingId !== null"
                      (click)="confirmAccept(item)"
                    >
                      <span nz-icon nzType="check" nzTheme="outline"></span>
                      Chấp nhận
                    </button>
                    <button
                      nz-button
                      nzDanger
                      class="action-btn decline-btn"
                      [nzLoading]="submittingId === item.id"
                      [disabled]="submittingId !== null"
                      (click)="confirmDecline(item)"
                    >
                      <span nz-icon nzType="close" nzTheme="outline"></span>
                      Từ chối
                    </button>
                    <button
                      nz-button
                      nzType="default"
                      class="action-btn reschedule-btn"
                      [disabled]="submittingId !== null"
                      (click)="openRescheduleModal(item)"
                    >
                      <span nz-icon nzType="calendar" nzTheme="outline"></span>
                      Hẹn khi khác
                    </button>
                  </footer>
                }
              </article>
            }
          </div>

          @if (total > pageSize) {
            <div class="pagination-wrapper">
              <nz-pagination
                [nzPageIndex]="page"
                [nzTotal]="total"
                [nzPageSize]="pageSize"
                [nzShowSizeChanger]="true"
                [nzPageSizeOptions]="[10, 20, 50]"
                (nzPageIndexChange)="onPageChange($event)"
                (nzPageSizeChange)="onPageSizeChange($event)"
              ></nz-pagination>
            </div>
          }
        }
      </div>

      <!-- Modal Hẹn khi khác -->
      <nz-modal
        [(nzVisible)]="rescheduleModalVisible"
        nzTitle="Đề xuất thời gian phỏng vấn khác"
        (nzOnCancel)="closeRescheduleModal()"
        (nzOnOk)="submitReschedule()"
        [nzOkLoading]="submittingId === selectedInterview?.id"
        nzOkText="Gửi đề xuất"
        nzCancelText="Hủy"
        [nzOkDisabled]="!isRescheduleValid()"
      >
        <ng-container *nzModalContent>
          <div class="reschedule-form">
            <p class="reschedule-intro">
              Vui lòng chọn thời gian bạn có thể tham gia phỏng vấn cho vị trí
              <strong>{{ selectedInterview?.job_title }}</strong>:
            </p>

            <div class="form-field">
              <label class="field-label" for="proposed-date-picker">
                Thời gian đề xuất <span class="required-star">*</span>
              </label>
              <nz-date-picker
                id="proposed-date-picker"
                nzShowTime
                nzFormat="dd/MM/yyyy HH:mm"
                [(ngModel)]="proposedDate"
                [nzDisabledDate]="disabledDate"
                nzPlaceHolder="Chọn ngày và giờ trong tương lai"
                style="width: 100%;"
              ></nz-date-picker>
            </div>

            <div class="form-field">
              <label class="field-label" for="reschedule-note-input">
                Ghi chú cho nhà tuyển dụng (tùy chọn)
              </label>
              <textarea
                id="reschedule-note-input"
                nz-input
                [(ngModel)]="rescheduleNote"
                rows="3"
                maxlength="1000"
                placeholder="Lý do đề xuất dời lịch hoặc thông tin bổ sung..."
              ></textarea>
              <div class="char-count">{{ (rescheduleNote || '').length }}/1000 ký tự</div>
            </div>
          </div>
        </ng-container>
      </nz-modal>
    </div>
  `,
  styles: [
    `
      .invitations-page {
        min-height: 100vh;
        padding: var(--space-8) 0;
        background: var(--color-bg-primary);
      }

      .container {
        max-width: var(--container-max);
        margin: 0 auto;
        padding: 0 var(--container-padding);
      }

      .back-link-wrapper {
        margin-bottom: var(--space-5);
      }

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--color-text-secondary);
        font-size: var(--text-sm);
        font-weight: 500;
        text-decoration: none;
        transition: color var(--transition-fast);

        &:hover {
          color: var(--color-primary);
        }
      }

      .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-5);
        margin-bottom: var(--space-8);

        .eyebrow {
          display: block;
          margin-bottom: 5px;
          color: var(--color-primary);
          font-size: var(--text-xs);
          font-weight: var(--font-bold);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0 0 var(--space-2);
          color: var(--color-text-primary);
          font-family: var(--font-heading);
          font-size: var(--text-3xl);
          font-weight: var(--font-bold);
        }

        p {
          margin: 0;
          color: var(--color-text-secondary);
        }
      }

      .state-container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: var(--space-12) 0;

        &.loading-state {
          flex-direction: column;
          gap: var(--space-3);
          min-height: 180px;
          text-align: center;

          nz-spin {
            display: inline-flex;
            justify-content: center;
            align-items: center;
          }

          .loading-text {
            font-size: var(--text-sm);
            color: var(--color-text-secondary);
            white-space: nowrap;
            text-align: center;
          }
        }
      }

      .state-card {
        border-radius: var(--radius-xl) !important;
        border: 1px solid var(--color-border) !important;
        background: var(--color-bg-secondary) !important;
        box-shadow: var(--shadow-card) !important;
      }

      .error-state {
        text-align: center;
        padding: var(--space-8) var(--space-4);

        .error-icon {
          font-size: 48px;
          color: var(--color-danger, #ef4444);
          margin-bottom: var(--space-4);
        }

        h3 {
          margin: 0 0 var(--space-2);
          font-family: var(--font-heading);
          color: var(--color-text-primary);
          font-size: var(--text-lg);
        }

        p {
          color: var(--color-text-secondary);
          margin-bottom: var(--space-6);
        }
      }

      .invitations-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-5);
      }

      .invitation-card {
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        padding: var(--space-6);
        box-shadow: var(--shadow-card);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: var(--space-5);
        transition: transform var(--transition-normal), border-color var(--transition-normal), box-shadow var(--transition-normal);
        position: relative;

        &:hover {
          transform: translateY(-4px);
          border-color: var(--color-primary-200);
          box-shadow: var(--shadow-card-hover), 0 8px 24px -4px rgba(15, 82, 186, 0.1), 0 0 0 1px rgba(15, 82, 186, 0.06);

          .job-title a,
          .job-title span {
            color: var(--color-primary);
          }
        }

        &:active {
          transform: translateY(-1px);
          box-shadow: var(--shadow-card);
        }

        &.is-highlighted {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.2);
        }
      }

      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-4);
      }

      .type-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--color-primary);
        font-size: var(--text-xs);
        font-weight: var(--font-semibold);
        margin-bottom: var(--space-1);
      }

      .job-title {
        margin: 0 0 var(--space-2);
        font-family: var(--font-heading);
        font-size: var(--text-lg);
        font-weight: var(--font-bold);
        color: var(--color-text-primary);
        transition: color var(--transition-fast);

        a {
          color: inherit;
          text-decoration: none;
          transition: color var(--transition-fast);

          &:hover {
            color: var(--color-primary);
          }
        }
      }

      .host-info {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-3);
        font-size: var(--text-xs);
        color: var(--color-text-secondary);

        span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
      }

      .status-tag {
        margin: 0 !important;
        font-weight: var(--font-medium);
        padding: 4px 10px !important;
        border-radius: var(--radius-md) !important;
      }

      .card-body {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        background: var(--color-bg-tertiary);
        padding: var(--space-4);
        border-radius: var(--radius-lg);
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-3);
        font-size: var(--text-sm);
      }

      .detail-label {
        color: var(--color-text-tertiary);
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }

      .detail-value {
        color: var(--color-text-primary);
        font-weight: var(--font-medium);
        text-align: right;

        &.time-value {
          color: var(--color-primary);
          font-weight: var(--font-semibold);
        }
      }

      .safe-link {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--color-primary);
        font-weight: var(--font-semibold);
        text-decoration: underline;

        &:hover {
          color: var(--color-primary-hover, var(--color-primary));
        }
      }

      .text-muted {
        color: var(--color-text-tertiary);
        font-style: italic;
      }

      .notes-box {
        margin-top: var(--space-2);
        padding-top: var(--space-3);
        border-top: 1px dashed var(--color-border);

        .notes-label {
          display: block;
          font-size: var(--text-xs);
          color: var(--color-text-tertiary);
          margin-bottom: 2px;
        }

        .notes-text {
          margin: 0;
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          line-height: 1.45;
        }
      }

      .response-info-box {
        margin-top: var(--space-2);
        padding: var(--space-3);
        border-radius: var(--radius-md);
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border-light, var(--color-border));

        &.reschedule-info {
          border-left: 3px solid var(--color-warning, #f59e0b);
        }

        .info-title {
          display: block;
          font-size: var(--text-xs);
          font-weight: var(--font-semibold);
          color: var(--color-text-primary);
          margin-bottom: 2px;
        }

        .info-date {
          display: block;
          font-size: var(--text-sm);
          font-weight: var(--font-semibold);
          color: var(--color-warning-dark, #b45309);
        }

        .info-note {
          margin: 4px 0 0;
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          font-style: italic;
        }
      }

      .card-actions {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-3);
      }

      .action-btn {
        height: 42px !important;
        border-radius: var(--radius-lg) !important;
        font-weight: var(--font-semibold) !important;
        font-size: var(--text-sm) !important;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .pagination-wrapper {
        display: flex;
        justify-content: center;
        margin-top: var(--space-8);
      }

      /* Modal Form */
      .reschedule-form {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);

        .reschedule-intro {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-size: var(--text-xs);
          font-weight: var(--font-semibold);
          color: var(--color-text-primary);
        }

        .required-star {
          color: var(--color-danger, #ef4444);
        }

        .char-count {
          text-align: right;
          font-size: var(--text-xs);
          color: var(--color-text-tertiary);
        }
      }

      @media (max-width: 991px) {
        .invitations-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 640px) {
        .invitations-page {
          padding-top: var(--space-5);
        }

        .page-header {
          flex-direction: column;
          align-items: flex-start;

          h1 {
            font-size: var(--text-2xl);
          }
        }

        .invitation-card {
          padding: var(--space-4);
        }

        .card-top {
          flex-direction: column;
          gap: var(--space-2);
        }

        .card-actions {
          grid-template-columns: 1fr;
        }

        .action-btn {
          height: 46px !important;
          width: 100%;
        }

        .detail-row {
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .detail-value {
          text-align: left;
        }
      }

      /* Dark Mode Overrides */
      :host-context([data-theme='dark']),
      :host-context(.dark) {
        .invitation-card {
          background: var(--color-bg-secondary);
          border-color: var(--color-border);

          &.highlighted {
            border-color: var(--color-primary);
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3), var(--shadow-card-hover);
          }
        }

        .card-details {
          background: var(--color-bg-tertiary);
        }

        .reschedule-info {
          background: rgba(245, 158, 11, 0.12);
          border-color: rgba(245, 158, 11, 0.3);

          .info-date {
            color: #fbbf24;
          }
        }
      }
    `,
  ],
})
export class InterviewInvitationsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly applicationService = inject(ApplicationService);
  private readonly modal = inject(NzModalService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  loading = true;
  hasError = false;
  invitations: InterviewInvitation[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  highlightedId: number | null = null;
  submittingId: number | null = null;

  // Reschedule Modal State
  rescheduleModalVisible = false;
  selectedInterview: InterviewInvitation | null = null;
  proposedDate: Date | null = null;
  rescheduleNote = '';

  disabledDate = (current: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return current < today;
  };

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const highlightParam = params['highlight'] || params['interview_id'];
        if (highlightParam) {
          this.highlightedId = Number(highlightParam);
        }
      });

    this.loadInvitations();
  }

  loadInvitations(): void {
    this.loading = true;
    this.hasError = false;
    this.applicationService
      .listInterviewInvitations(this.page, this.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.invitations = response.items;
          this.total = response.total;
          this.loading = false;
          if (this.highlightedId) {
            setTimeout(() => this.scrollToCard(this.highlightedId!), 250);
          }
        },
        error: () => {
          this.loading = false;
          this.hasError = true;
        },
      });
  }

  onPageChange(page: number): void {
    this.page = page;
    this.loadInvitations();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.page = 1;
    this.loadInvitations();
  }

  scrollToCard(interviewId: number): void {
    const el = document.getElementById(`invitation-card-${interviewId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  canRespond(item: InterviewInvitation): boolean {
    return canRespondToInvitation(item);
  }

  getMeetingUrl(item: InterviewInvitation): string | null {
    return getSafeMeetingUrl(item);
  }

  getStatusBadge(item: InterviewInvitation): { label: string; color: string } {
    if (item.status === 'cancelled' && item.candidate_response === 'declined') {
      return { label: 'Đã từ chối', color: 'error' };
    }
    if (item.status === 'cancelled') {
      return { label: 'Đã hủy', color: 'default' };
    }
    if (item.status === 'completed') {
      return { label: 'Đã hoàn thành', color: 'default' };
    }
    switch (item.candidate_response) {
      case 'accepted':
        return { label: 'Đã chấp nhận', color: 'success' };
      case 'declined':
        return { label: 'Đã từ chối', color: 'error' };
      case 'reschedule_requested':
        return { label: 'Đã đề nghị hẹn lại', color: 'warning' };
      case 'pending':
      default:
        return { label: 'Chờ phản hồi', color: 'processing' };
    }
  }

  confirmAccept(item: InterviewInvitation): void {
    if (this.submittingId !== null) return;
    this.modal.confirm({
      nzTitle: 'Chấp nhận lời mời phỏng vấn?',
      nzContent: `Bạn có chắc chắn muốn xác nhận tham gia buổi phỏng vấn cho vị trí “${item.job_title}”?`,
      nzOkText: 'Chấp nhận',
      nzCancelText: 'Hủy',
      nzOnOk: () => this.submitResponse(item.id, { response: 'accepted' }),
    });
  }

  confirmDecline(item: InterviewInvitation): void {
    if (this.submittingId !== null) return;
    this.modal.confirm({
      nzTitle: 'Từ chối lời mời phỏng vấn?',
      nzContent: `Bạn có chắc chắn muốn từ chối lời mời phỏng vấn cho vị trí “${item.job_title}”? Thao tác này sẽ hủy lịch phỏng vấn.`,
      nzOkText: 'Từ chối',
      nzOkDanger: true,
      nzCancelText: 'Giữ lại',
      nzOnOk: () => this.submitResponse(item.id, { response: 'declined' }),
    });
  }

  openRescheduleModal(item: InterviewInvitation): void {
    if (this.submittingId !== null) return;
    this.selectedInterview = item;
    this.proposedDate = null;
    this.rescheduleNote = '';
    this.rescheduleModalVisible = true;
  }

  closeRescheduleModal(): void {
    this.rescheduleModalVisible = false;
    this.selectedInterview = null;
    this.proposedDate = null;
    this.rescheduleNote = '';
  }

  isRescheduleValid(): boolean {
    return !!this.proposedDate && new Date(this.proposedDate).getTime() > Date.now();
  }

  submitReschedule(): void {
    if (!this.selectedInterview || !this.isRescheduleValid() || this.submittingId !== null) return;
    const proposedDateIso = new Date(this.proposedDate!).toISOString();
    const note = this.rescheduleNote.trim() || undefined;
    const interviewId = this.selectedInterview.id;

    this.submitResponse(interviewId, {
      response: 'reschedule_requested',
      proposed_date: proposedDateIso,
      note,
    });
    this.closeRescheduleModal();
  }

  submitResponse(interviewId: number, payload: CandidateInterviewActionRequest): void {
    if (this.submittingId !== null) return;
    this.submittingId = interviewId;

    this.applicationService
      .respondToInterviewInvitation(interviewId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.invitations = this.invitations.map((item) =>
            item.id === interviewId ? updated : item,
          );
          this.submittingId = null;
          this.toast.success('Đã gửi phản hồi thành công.');
        },
        error: (error) => {
          this.submittingId = null;
          this.toast.errorFromHttp(
            error,
            'Không thể gửi phản hồi lúc này. Vui lòng thử lại.',
            true,
          );
        },
      });
  }
}
