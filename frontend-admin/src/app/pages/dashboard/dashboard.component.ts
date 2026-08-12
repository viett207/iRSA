import { Component, signal, computed, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardService, DashboardStats } from '../../core/services/dashboard.service';
import { JobService } from '../../features/jobs/services/job.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';

interface StatCard {
  title: string;
  value: number;
  suffix?: string;
  icon: string;
  iconColor: 'primary' | 'success' | 'warning' | 'error';
}

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface RecentApplication {
  id: number;
  jobId: number;
  candidateName: string;
  jobTitle: string;
  appliedAt: string;
  status: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzCardModule,
    NzGridModule,
    NzStatisticModule,
    NzIconModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzAvatarModule,
    NzToolTipModule,
    NzEmptyModule,
    NzSkeletonModule,
    NzSpinModule,
    NzModalModule,
  ],
  template: `
    <div class="dashboard">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Xin chào, {{ userName() }}!</h1>
          <p class="page-subtitle">
            Đây là tổng quan hoạt động tuyển dụng của bạn hôm nay.
          </p>
        </div>
        <div class="header-actions">
          <button nz-button nzType="primary" routerLink="/jobs/new">
            <span nz-icon nzType="plus"></span>
            Tạo tin tuyển dụng
          </button>
        </div>
      </div>

      <!-- KPI Stats Grid -->
      <div nz-row [nzGutter]="[24, 24]" class="stats-section">
        @for (stat of stats(); track stat.title) {
          <div nz-col [nzXs]="24" [nzSm]="12" [nzLg]="6">
            <div class="stat-card">
              <div class="stat-icon" [class]="'stat-icon--' + stat.iconColor">
                <span nz-icon [nzType]="stat.icon" nzTheme="outline"></span>
              </div>
              <div class="stat-content">
                <span class="stat-label">{{ stat.title }}</span>
                <div class="stat-value-row">
                  <span class="stat-value">{{ stat.value }}</span>
                  @if (stat.suffix) {
                    <span class="stat-suffix">{{ stat.suffix }}</span>
                  }
                </div>
                
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Main Content Grid -->
      <div nz-row [nzGutter]="[24, 24]" class="main-content">
        <!-- Quick Actions -->
        <div nz-col [nzXs]="24" [nzLg]="12">
          <nz-card class="actions-card">
            <div class="card-header">
              <h3 class="card-title">Thao tác nhanh</h3>
            </div>
            <div class="quick-actions-grid">
              @for (action of quickActions; track action.label) {
                <a
                  class="action-item"
                  [routerLink]="action.route"
                  [class]="'action-item--' + action.color"
                >
                  <div class="action-icon">
                    <span nz-icon [nzType]="action.icon" nzTheme="outline"></span>
                  </div>
                  <div class="action-text">
                    <span class="action-label">{{ action.label }}</span>
                    <span class="action-desc">{{ action.description }}</span>
                  </div>
                  <span nz-icon nzType="right" class="action-arrow"></span>
                </a>
              }
            </div>
          </nz-card>
        </div>
      </div>

      <!-- Recent Applications Table -->
      <nz-card class="table-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Hồ sơ ứng tuyển gần đây</h3>
            <span class="card-subtitle">Cập nhật 5 phút trước</span>
          </div>
          <a routerLink="/applications" class="view-all-link">
            Xem tất cả
            <span nz-icon nzType="arrow-right"></span>
          </a>
        </div>

        <nz-table
          #applicationTable
          [nzData]="recentApplications()"
          [nzShowPagination]="false"
          [nzFrontPagination]="false"
          nzSize="middle"
          [nzNoResult]="emptyTemplate"
        >
          <thead>
            <tr>
              <th>Ứng viên</th>
              <th>Vị trí ứng tuyển</th>
              <th>Ngày nộp</th>
              <th>Trạng thái</th>
              <th nzWidth="100px"></th>
            </tr>
          </thead>
          <tbody>
            @for (app of applicationTable.data; track app.id) {
              <tr>
                <td>
                  <div class="candidate-cell">
                    <nz-avatar
                      [nzText]="getInitial(app.candidateName)"
                      [nzSize]="36"
                      class="candidate-avatar"
                    ></nz-avatar>
                    <span class="candidate-name">{{ app.candidateName }}</span>
                  </div>
                </td>
                <td>
                  <span class="job-title">{{ app.jobTitle }}</span>
                </td>
                <td>
                  <span class="date-text">{{ app.appliedAt }}</span>
                </td>
                <td>
                  <nz-tag [nzColor]="getStatusColor(app.status)">
                    {{ getStatusLabel(app.status) }}
                  </nz-tag>
                </td>
                <td>
                  <button
                    nz-button
                    nzType="link"
                    nzSize="small"
                    (click)="viewResume(app)"
                    nz-tooltip
                    nzTooltipTitle="Xem CV"
                  >
                    <span nz-icon nzType="file-pdf"></span>
                  </button>
                  <button
                    nz-button
                    nzType="link"
                    nzSize="small"
                    (click)="downloadResume(app)"
                    nz-tooltip
                    nzTooltipTitle="Tải CV"
                  >
                    <span nz-icon nzType="download"></span>
                  </button>
                  <button
                    nz-button
                    nzType="link"
                    nzSize="small"
                    [routerLink]="['/applications', app.id]"
                    nz-tooltip
                    nzTooltipTitle="Xem chi tiết"
                  >
                    <span nz-icon nzType="eye"></span>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </nz-table>
        <ng-template #emptyTemplate>
          <nz-empty
            nzNotFoundContent="Chưa có hồ sơ ứng tuyển nào"
            [nzNotFoundFooter]="emptyFooter"
          ></nz-empty>
          <ng-template #emptyFooter>
            <button nz-button nzType="primary" routerLink="/jobs/new">
              Tạo tin tuyển dụng đầu tiên
            </button>
          </ng-template>
        </ng-template>
      </nz-card>

      <!-- Pending Approvals (for leaders/admins) -->
      @if (authService.hasRole('leader', 'admin') && pendingApprovals().length > 0) {
        <nz-card class="approvals-card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Cần phê duyệt</h3>
              <span class="card-subtitle">{{ pendingApprovals().length }} tin đang chờ</span>
            </div>
            <a routerLink="/jobs" [queryParams]="{status: 'pending_approval'}" class="view-all-link">
              Xem tất cả
              <span nz-icon nzType="arrow-right"></span>
            </a>
          </div>
          <div class="approval-list">
            @for (job of pendingApprovals(); track job.id) {
              <div class="approval-item">
                <div class="approval-info">
                  <span class="approval-title">{{ job.title }}</span>
                  <span class="approval-meta">
                    Tạo bởi {{ job.creator }} - {{ job.createdAt }}
                  </span>
                </div>
                <div class="approval-actions">
                  <button
                    nz-button
                    nzType="primary"
                    nzSize="small"
                    nz-tooltip
                    nzTooltipTitle="Phê duyệt"
                  >
                    <span nz-icon nzType="check"></span>
                  </button>
                  <button
                    nz-button
                    nzDanger
                    nzSize="small"
                    nz-tooltip
                    nzTooltipTitle="Từ chối"
                  >
                    <span nz-icon nzType="close"></span>
                  </button>
                </div>
              </div>
            }
          </div>
        </nz-card>
      }

      <!-- Resume PDF Viewer Modal -->
      <nz-modal
        [(nzVisible)]="resumeModalVisible"
        [nzTitle]="'CV: ' + resumeModalTitle"
        (nzOnCancel)="resumeModalVisible = false"
        [nzFooter]="null"
        [nzWidth]="900"
        nzCentered
      >
        <ng-container *nzModalContent>
          @if (resumeModalLoading) {
            <div style="text-align: center; padding: 40px">
              <nz-spin nzSimple></nz-spin>
              <p style="margin-top: 12px; color: #888">Đang tải CV...</p>
            </div>
          } @else if (resumeModalUrl) {
            <iframe
              [src]="resumeModalUrl"
              style="width: 100%; height: 75vh; border: none; border-radius: 4px"
            ></iframe>
          }
        </ng-container>
      </nz-modal>
    </div>
  `,
  styles: [`
    .dashboard {
      animation: fadeIn 0.3s ease-out;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .page-title {
      font-family: var(--font-heading);
      font-size: 28px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 8px 0;
    }

    .page-subtitle {
      font-size: 15px;
      color: var(--color-text-secondary);
      margin: 0;
    }

    /* Stats Section */
    .stats-section {
      margin-bottom: 24px;
    }

    .stat-card {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 24px;
      background: var(--color-bg-secondary);
      border-radius: 12px;
      border: 1px solid var(--color-border-light);
      box-shadow: var(--shadow-card);
      transition: all 0.2s ease;
      height: 100%;

      &:hover {
        box-shadow: var(--shadow-card-hover);
        transform: translateY(-2px);
      }
    }

    .stat-icon {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      span {
        font-size: 24px;
      }

      &--primary {
        background: var(--color-primary-50);
        color: var(--color-primary);
      }

      &--success {
        background: var(--color-success-bg);
        color: var(--color-success);
      }

      &--warning {
        background: var(--color-warning-bg);
        color: var(--color-warning);
      }

      &--error {
        background: var(--color-error-bg);
        color: var(--color-error);
      }
    }

    .stat-content {
      flex: 1;
      min-width: 0;
    }

    .stat-label {
      display: block;
      font-size: 13px;
      color: var(--color-text-secondary);
      margin-bottom: 8px;
    }

    .stat-value-row {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .stat-value {
      font-family: var(--font-heading);
      font-size: 28px;
      font-weight: 700;
      color: var(--color-text-primary);
      line-height: 1;
    }

    .stat-suffix {
      font-size: 14px;
      color: var(--color-text-secondary);
    }

    .stat-trend {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 8px;
      font-size: 12px;

      span[nz-icon] {
        font-size: 14px;
      }

      &--up {
        color: var(--color-success);
      }

      &--down {
        color: var(--color-error);
      }
    }

    /* Main Content */
    .main-content {
      margin-bottom: 24px;
    }

    /* Card Styles */
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .card-title {
      font-family: var(--font-heading);
      font-size: 17px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .card-subtitle {
      display: block;
      font-size: 13px;
      color: var(--color-text-tertiary);
      margin-top: 4px;
    }

    .view-all-link {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      color: var(--color-primary-light);
      font-weight: 500;

      &:hover {
        color: var(--color-primary);
      }
    }

    /* Funnel Card */
    .funnel-card {
      height: 100%;
    }

    .funnel-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .funnel-stage {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .funnel-bar-wrapper {
      flex: 1;
      height: 36px;
      background: var(--color-bg-tertiary);
      border-radius: 8px;
      overflow: hidden;
    }

    .funnel-bar {
      height: 100%;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 12px;
      transition: width 0.5s ease;
    }

    .funnel-count {
      font-family: var(--font-heading);
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }

    .funnel-label {
      width: 120px;
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
    }

    .funnel-name {
      font-size: 13px;
      color: var(--color-text-primary);
    }

    .funnel-percent {
      font-size: 13px;
      color: var(--color-text-tertiary);
    }

    .funnel-footer {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--color-border-light);
    }

    .conversion-rate {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: var(--color-text-secondary);

      span[nz-icon] {
        color: var(--color-warning);
      }

      strong {
        color: var(--color-text-primary);
      }
    }

    /* Quick Actions */
    .actions-card {
      height: 100%;
    }

    .quick-actions-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .action-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--color-bg-tertiary);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: var(--color-primary-50);
        transform: translateX(4px);

        .action-arrow {
          opacity: 1;
          transform: translateX(0);
        }
      }
    }

    .action-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      span {
        font-size: 20px;
      }

      .action-item--primary & {
        background: var(--color-primary-100);
        color: var(--color-primary);
      }

      .action-item--success & {
        background: var(--color-success-bg);
        color: var(--color-success);
      }

      .action-item--warning & {
        background: var(--color-warning-bg);
        color: var(--color-warning);
      }
    }

    .action-text {
      flex: 1;
      min-width: 0;
    }

    .action-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .action-desc {
      display: block;
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-top: 2px;
    }

    .action-arrow {
      color: var(--color-primary);
      opacity: 0;
      transform: translateX(-8px);
      transition: all 0.2s ease;
    }

    /* Table Card */
    .table-card {
      margin-bottom: 24px;
    }

    .candidate-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .candidate-avatar {
      background: var(--color-primary) !important;
      font-weight: 600;
    }

    .candidate-name {
      font-weight: 500;
      color: var(--color-text-primary);
    }

    .job-title {
      color: var(--color-text-primary);
    }

    .date-text {
      color: var(--color-text-secondary);
      font-size: 13px;
    }

    /* Approvals Card */
    .approvals-card {
      border-left: 4px solid var(--color-warning);
    }

    .approval-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .approval-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      background: var(--color-bg-tertiary);
      border-radius: 8px;
      gap: 16px;
    }

    .approval-info {
      flex: 1;
      min-width: 0;
    }

    .approval-title {
      display: block;
      font-weight: 500;
      color: var(--color-text-primary);
      margin-bottom: 4px;
    }

    .approval-meta {
      font-size: 12px;
      color: var(--color-text-tertiary);
    }

    .approval-actions {
      display: flex;
      gap: 8px;
    }

    /* Animations */
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Responsive */
    @media (max-width: 767px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
      }

      .page-title {
        font-size: 24px;
      }

      .stat-card {
        padding: 16px;
      }

      .stat-icon {
        width: 44px;
        height: 44px;

        span {
          font-size: 20px;
        }
      }

      .stat-value {
        font-size: 24px;
      }

      .funnel-label {
        width: 80px;
      }

      .action-item {
        padding: 12px;
      }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private dashboardService = inject(DashboardService);
  private jobService = inject(JobService);
  private message = inject(NzMessageService);
  private sanitizer = inject(DomSanitizer);
  authService = inject(AuthService);

  loading = signal(true);

  userName = computed(() => {
    const fullName = this.authService.user()?.full_name || 'Người dùng';
    return fullName.split(' ').slice(-1)[0];
  });

  stats = signal<StatCard[]>([]);
  funnelStages = signal<FunnelStage[]>([]);
  recentApplications = signal<RecentApplication[]>([]);
  pendingApprovals = signal<{ id: number; title: string; creator: string; createdAt: string }[]>([]);

  // Resume viewer modal state
  resumeModalVisible = false;
  resumeModalLoading = false;
  resumeModalUrl: SafeResourceUrl | null = null;
  resumeModalTitle = '';

  conversionRate = computed(() => {
    const stages = this.funnelStages();
    if (stages.length < 2 || stages[0].count === 0) return 0;
    return Math.round((stages[stages.length - 1].count / stages[0].count) * 100);
  });

  quickActions = [
    {
      icon: 'plus-circle',
      label: 'Tạo tin tuyển dụng',
      description: 'Đăng tin mới ngay hôm nay',
      route: '/jobs/new',
      color: 'primary',
    },
    {
      icon: 'filter',
      label: 'Quản lý tin tuyển dụng',
      description: 'Xem và quản lý tất cả tin',
      route: '/jobs',
      color: 'success',
    },
    {
      icon: 'team',
      label: 'Quản lý người dùng',
      description: 'Quản lý tài khoản hệ thống',
      route: '/users',
      color: 'warning',
    },
  ];

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.dashboardService.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.buildStats(data);
          this.buildFunnel(data);
          this.buildRecentApplications(data);
          this.buildPendingApprovals(data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  private buildStats(data: DashboardStats): void {
    this.stats.set([
      {
        title: 'Tin tuyển dụng đang mở',
        value: data.stats.active_jobs,
        icon: 'solution',
        iconColor: 'primary',
      },
      {
        title: 'Tổng hồ sơ ứng tuyển',
        value: data.stats.total_applications,
        icon: 'file-text',
        iconColor: 'success',
      },
      {
        title: 'Tổng ứng viên',
        value: data.stats.total_candidates,
        icon: 'team',
        iconColor: 'warning',
      },
    ]);
  }

  private buildFunnel(data: DashboardStats): void {
    const sc = data.application_status_counts;
    const total = Object.values(sc).reduce((sum, v) => sum + v, 0);
    if (total === 0) {
      this.funnelStages.set([]);
      return;
    }

    const submitted = (sc['submitted'] || 0) + (sc['reviewing'] || 0) + (sc['shortlisted'] || 0) +
      (sc['interviewing'] || 0) + (sc['offered'] || 0) + (sc['hired'] || 0) + (sc['rejected'] || 0) + (sc['error'] || 0);
    const screened = (sc['reviewing'] || 0) + (sc['shortlisted'] || 0) +
      (sc['interviewing'] || 0) + (sc['offered'] || 0) + (sc['hired'] || 0) + (sc['rejected'] || 0);
    const shortlisted = (sc['shortlisted'] || 0) + (sc['interviewing'] || 0) + (sc['offered'] || 0) + (sc['hired'] || 0);
    const interviewing = (sc['interviewing'] || 0) + (sc['offered'] || 0) + (sc['hired'] || 0);
    const hired = sc['hired'] || 0;

    const pct = (v: number) => submitted > 0 ? Math.round((v / submitted) * 100) : 0;

    this.funnelStages.set([
      { name: 'Nộp hồ sơ', count: submitted, percentage: 100, color: '#1890FF' },
      { name: 'Đã sàng lọc', count: screened, percentage: pct(screened), color: '#52C41A' },
      { name: 'Vào vòng', count: shortlisted, percentage: pct(shortlisted), color: '#FA8C16' },
      { name: 'Phỏng vấn', count: interviewing, percentage: pct(interviewing), color: '#722ED1' },
      { name: 'Tuyển dụng', count: hired, percentage: pct(hired), color: '#13C2C2' },
    ]);
  }

  private buildRecentApplications(data: DashboardStats): void {
    this.recentApplications.set(
      data.recent_applications.map((app) => ({
        id: app.id,
        jobId: app.job_id,
        candidateName: app.candidate_name,
        jobTitle: app.job_title,
        appliedAt: app.submitted_at ? this.formatTimeAgo(app.submitted_at) : '',
        status: app.status,
      }))
    );
  }

  private buildPendingApprovals(data: DashboardStats): void {
    this.pendingApprovals.set(
      data.pending_approvals.map((job) => ({
        id: job.id,
        title: job.title,
        creator: job.creator,
        createdAt: job.created_at ? this.formatTimeAgo(job.created_at) : '',
      }))
    );
  }

  private formatTimeAgo(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  }

  getInitial(name: string): string {
    return name?.charAt(0)?.toUpperCase() || 'U';
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      submitted: 'default',
      reviewing: 'processing',
      shortlisted: 'green',
      interviewing: 'geekblue',
      offered: 'gold',
      hired: 'success',
      rejected: 'error',
      error: 'volcano',
    };
    return colors[status] || 'default';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      submitted: 'Đã nộp',
      reviewing: 'Đang xem',
      shortlisted: 'Vào vòng',
      interviewing: 'Phỏng vấn',
      offered: 'Đề xuất',
      hired: 'Đã tuyển',
      rejected: 'Từ chối',
      error: 'Lỗi',
    };
    return labels[status] || status;
  }

  downloadResume(app: RecentApplication): void {
    this.jobService.downloadResume(app.jobId, app.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${app.candidateName}_CV.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.message.error('Không thể tải CV');
      },
    });
  }

  viewResume(app: RecentApplication): void {
    this.resumeModalTitle = app.candidateName;
    this.resumeModalLoading = true;
    this.resumeModalUrl = null;
    this.resumeModalVisible = true;

    this.jobService.getResumeUrl(app.jobId, app.id).subscribe({
      next: (res) => {
        this.resumeModalUrl = this.sanitizer.bypassSecurityTrustResourceUrl(res.url);
        this.resumeModalLoading = false;
      },
      error: () => {
        this.resumeModalLoading = false;
        this.resumeModalVisible = false;
        this.message.error('Không thể tải CV');
      },
    });
  }

}
