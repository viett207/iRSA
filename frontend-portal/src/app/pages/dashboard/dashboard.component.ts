import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../core/auth/auth.service';
import { ApplicationService } from '../../core/services/application.service';
import { ToastService } from '../../core/services/toast.service';
import {
  Application,
  APPLICATION_STATUS_COLORS,
  APPLICATION_STATUS_LABELS,
  ApplicationStatus,
  CandidateInterview,
} from '../../shared/models/application.model';

export type TimelineStepState = 'completed' | 'current' | 'pending' | 'skipped' | 'failed';

const INTERVIEW_REACHED_STATUSES = new Set(['interviewing', 'offered', 'hired']);
const FINAL_STATUSES = new Set(['hired', 'rejected']);

export function hasReachedInterview(application: Application): boolean {
  return (
    INTERVIEW_REACHED_STATUSES.has(application.status) ||
    (application.interviews ?? []).some((interview) => interview.status !== 'cancelled')
  );
}

export function canWithdrawApplication(application: Application): boolean {
  return application.status === 'submitted';
}

export function getOnlineMeetingUrl(interview: CandidateInterview): string | null {
  const location = interview.location?.trim() ?? '';
  return interview.interview_type === 'online' && /^https?:\/\//i.test(location)
    ? location
    : null;
}

export function getTimelineStepState(
  application: Application,
  stepIndex: number,
): TimelineStepState {
  const reviewed = application.status !== 'submitted';
  const interviewed = hasReachedInterview(application);
  const final = FINAL_STATUSES.has(application.status);

  if (stepIndex === 0) return reviewed ? 'completed' : 'current';
  if (stepIndex === 1) {
    if (!reviewed) return 'pending';
    return interviewed || final ? 'completed' : 'current';
  }
  if (stepIndex === 2) {
    if (interviewed) return final || application.status === 'offered' ? 'completed' : 'current';
    return final ? 'skipped' : 'pending';
  }
  if (application.status === 'rejected') return 'failed';
  if (application.status === 'hired') return 'completed';
  if (application.status === 'offered') return 'current';
  return 'pending';
}

interface InterviewNotice {
  applicationId: number;
  jobTitle: string;
  jobSlug: string;
  interview: CandidateInterview;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    NzGridModule,
    NzCardModule,
    NzStatisticModule,
    NzIconModule,
    NzButtonModule,
    NzTagModule,
    NzEmptyModule,
    NzSpinModule,
    NzModalModule,
  ],
  template: `
    <div class="dashboard-page">
      <div class="container">
        <header class="page-header">
          <div>
            <span class="eyebrow">TỔNG QUAN</span>
            <h1>Xin chào, {{ authService.user()?.full_name }}!</h1>
            <p>Theo dõi các vị trí đã ứng tuyển và lịch phỏng vấn sắp tới của bạn.</p>
          </div>
          <a routerLink="/jobs" nz-button nzType="primary" nzSize="large">
            <span nz-icon nzType="search" nzTheme="outline"></span>
            Tìm việc ngay
          </a>
        </header>

        <div nz-row [nzGutter]="[20, 20]" class="stats-row">
          <div nz-col [nzXs]="12" [nzSm]="12" [nzMd]="6">
            <nz-card class="stat-card stat-card--total" routerLink="/dashboard/applications">
              <div class="stat-icon-wrapper">
                <span nz-icon nzType="file-text" nzTheme="outline"></span>
              </div>
              <nz-statistic nzTitle="Đã nộp" [nzValue]="stats.total"></nz-statistic>
            </nz-card>
          </div>
          <div nz-col [nzXs]="12" [nzSm]="12" [nzMd]="6">
            <nz-card class="stat-card in-review stat-card--review" routerLink="/dashboard/applications">
              <div class="stat-icon-wrapper">
                <span nz-icon nzType="eye" nzTheme="outline"></span>
              </div>
              <nz-statistic nzTitle="Đang xem xét" [nzValue]="stats.inReview"></nz-statistic>
            </nz-card>
          </div>
          <div nz-col [nzXs]="12" [nzSm]="12" [nzMd]="6">
            <nz-card class="stat-card shortlisted stat-card--shortlist" routerLink="/dashboard/applications">
              <div class="stat-icon-wrapper">
                <span nz-icon nzType="calendar" nzTheme="outline"></span>
              </div>
              <nz-statistic nzTitle="Vào vòng tiếp" [nzValue]="stats.shortlisted"></nz-statistic>
            </nz-card>
          </div>
          <div nz-col [nzXs]="12" [nzSm]="12" [nzMd]="6">
            <nz-card class="stat-card selected stat-card--selected" routerLink="/dashboard/applications">
              <div class="stat-icon-wrapper">
                <span nz-icon nzType="trophy" nzTheme="outline"></span>
              </div>
              <nz-statistic nzTitle="Trúng tuyển" [nzValue]="stats.selected"></nz-statistic>
            </nz-card>
          </div>
        </div>

        @if (interviewNotices.length > 0) {
          <section class="interviews-section" aria-labelledby="interview-heading">
            <div class="section-heading">
              <div>
                <span class="eyebrow">Lịch sắp tới</span>
                <h2 id="interview-heading">Bạn có lịch phỏng vấn</h2>
              </div>
              <span class="interview-count">{{ interviewNotices.length }} lịch</span>
            </div>

            <div class="interview-grid">
              @for (notice of interviewNotices; track notice.interview.id) {
                <article class="interview-card">
                  <div class="interview-icon">
                    <span nz-icon nzType="video-camera" nzTheme="outline"></span>
                  </div>
                  <div class="interview-content">
                    <div class="interview-title-row">
                      <div>
                        <span class="interview-label">Phỏng vấn {{ getInterviewTypeLabel(notice.interview) }}</span>
                        <a [routerLink]="['/jobs', notice.jobSlug]">{{ notice.jobTitle }}</a>
                      </div>
                      <nz-tag nzColor="processing">Đã xác nhận lịch</nz-tag>
                    </div>

                    <div class="interview-details">
                      <span>
                        <span nz-icon nzType="calendar" nzTheme="outline"></span>
                        {{ notice.interview.interview_date | date: 'EEEE, dd/MM/yyyy · HH:mm' }}
                      </span>
                      @if (getInterviewLocation(notice.interview)) {
                        <span>
                          <span nz-icon nzType="environment" nzTheme="outline"></span>
                          {{ getInterviewLocation(notice.interview) }}
                        </span>
                      }
                    </div>

                    @if (notice.interview.notes) {
                      <p class="interview-notes">{{ notice.interview.notes }}</p>
                    }

                    @if (getMeetingUrl(notice.interview); as meetingUrl) {
                      <a nz-button nzType="primary" [href]="meetingUrl" target="_blank" rel="noopener noreferrer">
                        <span nz-icon nzType="link" nzTheme="outline"></span>
                        Mở link phỏng vấn
                      </a>
                    } @else if (notice.interview.interview_type === 'online') {
                      <span class="link-pending">
                        <span nz-icon nzType="info-circle" nzTheme="outline"></span>
                        Link phỏng vấn sẽ được nhà tuyển dụng cập nhật.
                      </span>
                    }
                  </div>
                </article>
              }
            </div>
          </section>
        }

        <nz-card class="section-card applications-card">
          <div class="section-heading applications-heading">
            <div>
              <span class="eyebrow">Tiến độ tuyển dụng</span>
              <h2>Đơn ứng tuyển của bạn</h2>
            </div>
            <a routerLink="/dashboard/applications" nz-button nzType="link">
              Xem dạng danh sách
              <span nz-icon nzType="arrow-right" nzTheme="outline"></span>
            </a>
          </div>

          @if (loading) {
            <div class="loading-wrapper"><nz-spin nzSize="large"></nz-spin></div>
          } @else if (applications.length === 0) {
            <nz-empty nzNotFoundImage="simple" nzNotFoundContent="Bạn chưa có hồ sơ ứng tuyển nào">
              <a routerLink="/jobs" nz-button nzType="primary">Tìm việc làm</a>
            </nz-empty>
          } @else {
            <div class="applications-list">
              @for (app of applications; track app.id) {
                <article class="application-item">
                  <div class="application-header">
                    <div class="app-info">
                      <a class="job-title" [routerLink]="['/jobs', app.job_slug]">{{ app.job_title }}</a>
                      <div class="job-meta">
                        @if (app.job_department) {
                          <span><span nz-icon nzType="apartment" nzTheme="outline"></span>{{ app.job_department }}</span>
                        }
                        @if (app.job_location) {
                          <span><span nz-icon nzType="environment" nzTheme="outline"></span>{{ app.job_location }}</span>
                        }
                      </div>
                    </div>
                    <nz-tag [nzColor]="getStatusColor(app.public_status)">
                      {{ getStatusLabel(app.public_status) }}
                    </nz-tag>
                  </div>

                  <ol class="status-timeline" aria-label="Tiến trình ứng tuyển">
                    @for (step of timelineSteps; track step.label; let index = $index) {
                      <li [class]="'timeline-step ' + getStepState(app, index)">
                        <div class="step-marker">
                          <span nz-icon [nzType]="getStepIcon(app, index)" nzTheme="outline"></span>
                        </div>
                        <div class="step-copy">
                          <strong>{{ step.label }}</strong>
                          <span>{{ getStepDescription(app, index) }}</span>
                        </div>
                      </li>
                    }
                  </ol>

                  <footer class="application-footer">
                    <span>
                      <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                      Nộp ngày {{ app.submitted_at | date: 'dd/MM/yyyy · HH:mm' }}
                    </span>
                    @if (canWithdraw(app)) {
                      <button nz-button nzDanger nzType="text" [nzLoading]="cancellingId === app.id" (click)="confirmWithdraw(app)">
                        <span nz-icon nzType="close-circle" nzTheme="outline"></span>
                        Hủy ứng tuyển
                      </button>
                    }
                  </footer>
                </article>
              }
            </div>
          }
        </nz-card>

        <div nz-row [nzGutter]="16" class="actions-row">
          <div nz-col [nzXs]="24" [nzSm]="12">
            <nz-card class="action-card" routerLink="/dashboard/profile">
              <div class="action-content">
                <span nz-icon nzType="user" nzTheme="outline" class="action-icon"></span>
                <div><h3>Hồ sơ cá nhân</h3><p>Cập nhật thông tin và CV của bạn</p></div>
              </div>
            </nz-card>
          </div>
          <div nz-col [nzXs]="24" [nzSm]="12">
            <nz-card class="action-card" routerLink="/dashboard/cv-search">
              <div class="action-content">
                <span nz-icon nzType="thunderbolt" nzTheme="outline" class="action-icon"></span>
                <div><h3>Tìm việc bằng CV</h3><p>Khám phá công việc phù hợp với kỹ năng của bạn</p></div>
              </div>
            </nz-card>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-page { min-height: 100vh; padding: var(--space-8) 0; background: var(--color-bg-primary); }
      .container { max-width: var(--container-max); margin: 0 auto; padding: 0 var(--container-padding); }
      .eyebrow { display: block; margin-bottom: 5px; color: var(--color-primary); font-size: var(--text-xs); font-weight: var(--font-bold); letter-spacing: .08em; text-transform: uppercase; }
      .page-header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-5); margin-bottom: var(--space-8); }
      .page-header h1 { margin: 0 0 var(--space-2); color: var(--color-text-primary); font-family: var(--font-heading); font-size: var(--text-3xl); font-weight: var(--font-bold); }
      .page-header p { margin: 0; color: var(--color-text-secondary); }
      .stats-row {
        margin-bottom: 32px !important;

        @media (max-width: 1023px) {
          margin-bottom: 24px !important;
        }

        @media (max-width: 767px) {
          margin-bottom: 20px !important;
        }
      }

      .stat-card {
        height: 100%;
        text-align: center;
        border-radius: var(--radius-lg) !important;
        border: 1px solid var(--color-border) !important;
        background: var(--color-bg-secondary) !important;
        box-shadow: var(--shadow-card) !important;
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
        cursor: pointer;

        ::ng-deep .ant-card-body {
          padding: 24px 16px !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        &:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-card-hover) !important;
          border-color: rgba(var(--color-primary-rgb), 0.35) !important;
        }
      }

      .stat-icon-wrapper {
        width: 48px;
        height: 48px;
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        margin: 0 auto 12px;
      }

      .stat-card--total .stat-icon-wrapper {
        background: var(--color-primary-50);
        color: var(--color-primary);
        border: 1px solid var(--color-primary-100);
      }

      .stat-card--review .stat-icon-wrapper {
        background: #f0f9ff;
        color: #0284c7;
        border: 1px solid #e0f2fe;
      }

      .stat-card--shortlist .stat-icon-wrapper {
        background: var(--color-warning-bg);
        color: var(--color-warning-dark);
        border: 1px solid rgba(217, 119, 6, 0.2);
      }

      .stat-card--selected .stat-icon-wrapper {
        background: var(--color-success-bg);
        color: var(--color-success);
        border: 1px solid rgba(5, 150, 105, 0.2);
      }

      ::ng-deep .stat-card .ant-statistic {
        display: flex;
        flex-direction: column-reverse;
        align-items: center;
      }

      ::ng-deep .stat-card .ant-statistic-title {
        color: var(--color-text-secondary) !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        margin-top: 4px !important;
        margin-bottom: 0 !important;
      }

      ::ng-deep .stat-card .ant-statistic-content {
        font-size: 28px !important;
        font-weight: 800 !important;
        font-family: var(--font-heading) !important;
        color: var(--color-text-primary) !important;
        line-height: 1.15;
      }

      .section-heading { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-4); }
      .section-heading h2 { margin: 0; color: var(--color-text-primary); font-family: var(--font-heading); font-size: var(--text-xl); font-weight: var(--font-semibold); }
      .interviews-section {
        margin-bottom: 32px;

        @media (max-width: 1023px) {
          margin-bottom: 24px;
        }

        @media (max-width: 767px) {
          margin-bottom: 20px;
        }
      }

      .interview-count { padding: 5px 12px; border-radius: 999px; color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 9%, transparent); font-size: var(--text-xs); font-weight: var(--font-bold); }
      .interview-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
      .interview-card { position: relative; display: flex; gap: var(--space-4); overflow: hidden; padding: var(--space-5); border: 1px solid color-mix(in srgb, var(--color-primary) 24%, var(--color-border)); border-radius: var(--radius-xl); background: linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 8%, var(--color-bg-primary)), var(--color-bg-primary)); box-shadow: var(--shadow-md); }
      .interview-card::before { position: absolute; inset: 0 auto 0 0; width: 4px; background: var(--color-primary); content: ''; }
      .interview-icon { flex: none; display: grid; place-items: center; width: 50px; height: 50px; border-radius: 14px; color: white; background: var(--color-primary); font-size: 24px; box-shadow: 0 8px 18px color-mix(in srgb, var(--color-primary) 25%, transparent); }
      .interview-content { flex: 1; min-width: 0; }
      .interview-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); }
      .interview-title-row a { display: block; color: var(--color-text-primary); font-size: var(--text-base); font-weight: var(--font-bold); }
      .interview-label { display: block; margin-bottom: 3px; color: var(--color-primary); font-size: var(--text-xs); font-weight: var(--font-semibold); }
      .interview-details { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); margin: var(--space-3) 0; color: var(--color-text-secondary); font-size: var(--text-sm); }
      .interview-details span { display: inline-flex; align-items: center; gap: 6px; }
      .interview-notes { margin: 0 0 var(--space-3); color: var(--color-text-secondary); font-size: var(--text-sm); }
      .link-pending { display: inline-flex; align-items: center; gap: 6px; color: var(--color-warning); font-size: var(--text-xs); }
      .section-card {
        margin-bottom: 32px;
        border-radius: var(--radius-xl) !important;
        border: 1px solid var(--color-border) !important;
        box-shadow: var(--shadow-card) !important;
        background: var(--color-bg-secondary) !important;

        @media (max-width: 1023px) {
          margin-bottom: 24px;
        }

        @media (max-width: 767px) {
          margin-bottom: 20px;
        }
      }
      .applications-heading { margin-bottom: var(--space-6); }
      .loading-wrapper { display: flex; justify-content: center; padding: var(--space-12); }
      .applications-list { display: flex; flex-direction: column; gap: var(--space-4); }
      .application-item { overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-xl); background: var(--color-bg-primary); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
      .application-item:hover { border-color: color-mix(in srgb, var(--color-primary) 28%, var(--color-border)); box-shadow: var(--shadow-sm); }
      .application-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); padding: var(--space-5) var(--space-5) var(--space-4); }
      .app-info { min-width: 0; }
      .job-title { display: inline-block; margin-bottom: var(--space-2); color: var(--color-text-primary); font-size: var(--text-lg); font-weight: var(--font-bold); }
      .job-title:hover { color: var(--color-primary); }
      .job-meta { display: flex; flex-wrap: wrap; gap: var(--space-3); color: var(--color-text-secondary); font-size: var(--text-sm); }
      .job-meta span { display: inline-flex; align-items: center; gap: 5px; }
      .status-timeline { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0; padding: var(--space-5); border-block: 1px solid var(--color-border); background: var(--color-bg-tertiary); list-style: none; }
      .timeline-step { position: relative; min-width: 0; display: flex; gap: var(--space-3); padding-right: var(--space-4); color: var(--color-text-tertiary); }
      .timeline-step:not(:last-child)::after { position: absolute; z-index: 0; top: 18px; left: 39px; right: 4px; height: 2px; background: var(--color-border); content: ''; }
      .timeline-step.completed:not(:last-child)::after { background: var(--color-success); }
      .step-marker { position: relative; z-index: 1; flex: none; display: grid; place-items: center; width: 36px; height: 36px; border: 2px solid var(--color-border); border-radius: 50%; background: var(--color-bg-primary); }
      .step-copy { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
      .step-copy strong { color: inherit; font-size: var(--text-sm); line-height: 1.3; }
      .step-copy span { overflow: hidden; color: var(--color-text-tertiary); font-size: 11px; line-height: 1.35; text-overflow: ellipsis; }
      .timeline-step.completed { color: var(--color-success); }
      .timeline-step.completed .step-marker { border-color: var(--color-success); color: white; background: var(--color-success); }
      .timeline-step.current { color: var(--color-primary); }
      .timeline-step.current .step-marker { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 10%, var(--color-bg-primary)); box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 10%, transparent); }
      .timeline-step.failed { color: var(--color-danger); }
      .timeline-step.failed .step-marker { border-color: var(--color-danger); color: white; background: var(--color-danger); }
      .timeline-step.skipped { opacity: .55; }
      .application-footer { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) var(--space-5); color: var(--color-text-tertiary); font-size: var(--text-xs); }
      .application-footer > span { display: inline-flex; align-items: center; gap: 6px; }
      .actions-row .action-card { height: 100%; cursor: pointer; transition: transform var(--transition-fast), box-shadow var(--transition-fast); }
      .actions-row .action-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
      .action-content { display: flex; align-items: center; gap: var(--space-4); }
      .action-icon { color: var(--color-primary); font-size: 32px; }
      .action-content h3 { margin-bottom: var(--space-1); font-weight: var(--font-semibold); }
      .action-content p { margin: 0; color: var(--color-text-secondary); font-size: var(--text-sm); }
      @media (max-width: 991px) {
        .interview-grid { grid-template-columns: 1fr; }
        .status-timeline { grid-template-columns: 1fr; gap: 0; }
        .timeline-step { min-height: 64px; padding: 0 0 var(--space-4); }
        .timeline-step:not(:last-child)::after { top: 38px; bottom: 0; left: 17px; right: auto; width: 2px; height: auto; }
      }
      @media (max-width: 640px) {
        .dashboard-page { padding-top: var(--space-5); }
        .page-header { align-items: flex-start; flex-direction: column; }
        .page-header h1 { font-size: var(--text-2xl); }
        .page-header > a { width: 100%; }
        .section-heading { align-items: flex-start; }
        .applications-heading a { padding-inline: 0; }
        .interview-card { padding: var(--space-4); }
        .interview-icon { width: 42px; height: 42px; font-size: 20px; }
        .interview-title-row { flex-direction: column; }
        .application-header, .application-footer { align-items: flex-start; flex-direction: column; }
        .application-footer button { width: 100%; }
        .stat-card ::ng-deep .ant-card-body {
          padding: 16px 8px !important;
        }
        .stat-icon-wrapper {
          width: 40px;
          height: 40px;
          font-size: 18px;
          margin-bottom: 8px;
        }
        ::ng-deep .stat-card .ant-statistic-content {
          font-size: 24px !important;
        }
        ::ng-deep .stat-card .ant-statistic-title {
          font-size: 12px !important;
        }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly applicationService = inject(ApplicationService);
  private readonly modal = inject(NzModalService);
  private readonly toast = inject(ToastService);
  readonly authService = inject(AuthService);

  readonly timelineSteps = [
    { label: 'Đã nộp đơn' },
    { label: 'Nhà tuyển dụng đã xem CV' },
    { label: 'Đã vào vòng Phỏng vấn' },
    { label: 'Kết quả' },
  ];

  loading = true;
  cancellingId: number | null = null;
  applications: Application[] = [];
  stats = { total: 0, inReview: 0, shortlisted: 0, selected: 0 };

  get interviewNotices(): InterviewNotice[] {
    return this.applications
      .flatMap((application) =>
        (application.interviews ?? [])
          .filter(
            (interview) =>
              interview.status === 'scheduled' &&
              interview.candidate_response === 'accepted',
          )
          .map((interview) => ({
            applicationId: application.id,
            jobTitle: application.job_title,
            jobSlug: application.job_slug,
            interview,
          })),
      )
      .sort(
        (first, second) =>
          new Date(first.interview.interview_date).getTime() -
          new Date(second.interview.interview_date).getTime(),
      );
  }

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.loading = true;
    this.applicationService
      .list(1, 50)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.applications = response.items;
          this.stats = {
            total: response.total,
            inReview: response.status_counts.in_review,
            shortlisted: response.status_counts.shortlisted,
            selected: response.status_counts.selected,
          };
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  getStatusLabel(status: string): string {
    return APPLICATION_STATUS_LABELS[status as ApplicationStatus] || status;
  }

  getStatusColor(status: string): string {
    return APPLICATION_STATUS_COLORS[status as ApplicationStatus] || 'default';
  }

  getStepState(application: Application, index: number): TimelineStepState {
    return getTimelineStepState(application, index);
  }

  getStepIcon(application: Application, index: number): string {
    const state = this.getStepState(application, index);
    if (state === 'completed') return 'check';
    if (state === 'failed') return 'close';
    return ['send', 'eye', 'video-camera', 'trophy'][index];
  }

  getStepDescription(application: Application, index: number): string {
    if (index === 0) return new Date(application.submitted_at).toLocaleDateString('vi-VN');
    if (index === 1) return application.status === 'submitted' ? 'Đang chờ xem CV' : 'CV đã được mở xem';
    if (index === 2) {
      const interview = (application.interviews ?? []).find((item) => item.status !== 'cancelled');
      if (interview) return new Date(interview.interview_date).toLocaleString('vi-VN');
      return FINAL_STATUSES.has(application.status) ? 'Không áp dụng' : 'Đang chờ lịch';
    }
    const resultLabels: Record<string, string> = {
      offered: 'Đang chờ phản hồi offer',
      hired: 'Chúc mừng, bạn đã được tuyển',
      rejected: 'Hồ sơ chưa phù hợp',
    };
    return resultLabels[application.status] ?? 'Đang chờ kết quả';
  }

  getInterviewTypeLabel(interview: CandidateInterview): string {
    return interview.interview_type === 'online' ? 'trực tuyến' : 'trực tiếp';
  }

  getMeetingUrl(interview: CandidateInterview): string | null {
    return getOnlineMeetingUrl(interview);
  }

  getInterviewLocation(interview: CandidateInterview): string | null {
    if (getOnlineMeetingUrl(interview)) return 'Trực tuyến';
    return interview.location?.trim() || (interview.interview_type === 'offline' ? 'Địa điểm sẽ được cập nhật' : null);
  }

  canWithdraw(application: Application): boolean {
    return canWithdrawApplication(application);
  }

  confirmWithdraw(application: Application): void {
    this.modal.confirm({
      nzTitle: 'Hủy đơn ứng tuyển?',
      nzContent: `Bạn có chắc muốn hủy đơn cho vị trí “${application.job_title}”? Thao tác này không thể hoàn tác.`,
      nzOkText: 'Hủy ứng tuyển',
      nzOkDanger: true,
      nzCancelText: 'Giữ lại đơn',
      nzOnOk: async () => {
        this.cancellingId = application.id;
        try {
          await firstValueFrom(this.applicationService.withdraw(application.id));
          this.applications = this.applications.filter((item) => item.id !== application.id);
          this.stats.total = Math.max(0, this.stats.total - 1);
          this.stats.inReview = Math.max(0, this.stats.inReview - 1);
          this.toast.success('Đã hủy đơn ứng tuyển thành công.');
        } catch (error) {
          this.toast.errorFromHttp(
            error,
            error instanceof HttpErrorResponse && error.status === 409
              ? 'Không thể hủy vì nhà tuyển dụng đã xem hoặc xử lý CV của bạn.'
              : 'Không thể hủy đơn ứng tuyển lúc này. Vui lòng thử lại.',
            true,
          );
        } finally {
          this.cancellingId = null;
        }
      },
    });
  }
}
