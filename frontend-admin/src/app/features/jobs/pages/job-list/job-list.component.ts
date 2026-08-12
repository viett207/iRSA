import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

import { JobService } from '../../services/job.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import {
  Job,
  JobStatus,
  EmploymentType,
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  EMPLOYMENT_TYPE_LABELS,
} from '../../models/job.model';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzSelectModule,
    NzPopconfirmModule,
    NzModalModule,
    NzInputModule,
    NzDropDownModule,
    NzSpaceModule,
    NzToolTipModule,
    NzCardModule,
    NzBadgeModule,
    NzAvatarModule,
    NzEmptyModule,
  ],
  template: `
    <div class="job-list-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Quản lý Việc làm</h1>
          <p class="page-subtitle">Quản lý các tin tuyển dụng của công ty</p>
        </div>
        <div class="header-actions">
          <button nz-button nzType="primary" routerLink="/jobs/new" class="create-btn">
            <span nz-icon nzType="plus"></span>
            Tạo tin mới
          </button>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="stats-row">
        @for (stat of jobStats; track stat.label) {
          <div class="stat-item" [class]="'stat-item--' + stat.color">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        }
      </div>

      <!-- Filters Section -->
      <nz-card class="filter-card">
        <div class="filter-row">
          <!-- Search -->
          <div class="search-input">
            <nz-input-group [nzPrefix]="searchIcon">
              <input
                nz-input
                [(ngModel)]="searchText"
                placeholder="Tìm kiếm theo tiêu đề, ngành nghề..."
                (keyup.enter)="onSearch()"
              />
            </nz-input-group>
            <ng-template #searchIcon>
              <span nz-icon nzType="search" nzTheme="outline"></span>
            </ng-template>
          </div>

          <!-- Status Filter -->
          <nz-select
            [(ngModel)]="statusFilter"
            nzPlaceHolder="Trạng thái"
            nzAllowClear
            style="width: 160px"
            (ngModelChange)="onFilterChange()"
          >
            @for (status of statusOptions; track status.value) {
              <nz-option [nzValue]="status.value" [nzLabel]="status.label"></nz-option>
            }
          </nz-select>

          <!-- Department Filter -->
          <nz-select
            [(ngModel)]="departmentFilter"
            nzPlaceHolder="Ngành nghề"
            nzAllowClear
            style="width: 160px"
            (ngModelChange)="onFilterChange()"
          >
            @for (dept of departments; track dept) {
              <nz-option [nzValue]="dept" [nzLabel]="dept"></nz-option>
            }
          </nz-select>

          <div class="filter-actions">
            <button nz-button (click)="clearFilters()">
              <span nz-icon nzType="reload"></span>
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </nz-card>

      <!-- Table -->
      <nz-card class="table-card">
        <nz-table
          #jobTable
          [nzData]="jobs()"
          [nzLoading]="loading()"
          [nzTotal]="total()"
          [nzPageSize]="pageSize"
          [nzPageIndex]="pageIndex"
          [nzFrontPagination]="false"
          [nzShowSizeChanger]="true"
          [nzPageSizeOptions]="[10, 20, 50]"
          (nzQueryParams)="onQueryParamsChange($event)"
          nzSize="middle"
          [nzNoResult]="emptyTemplate"
        >
          <thead>
            <tr>
              <th nzWidth="30%">Tin tuyển dụng</th>
              <th nzWidth="12%">Ngành nghề</th>
              <th nzWidth="13%">Trạng thái</th>
              <th nzWidth="8%">Ứng viên</th>
              <th nzWidth="12%">Người tạo</th>
              <th nzWidth="25%">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            @for (job of jobTable.data; track job.id) {
              <tr class="job-row">
                <td>
                  <div class="job-info">
                    <a [routerLink]="['/jobs', job.id]" class="job-title">
                      {{ job.title_vi }}
                    </a>
                    <div class="job-meta">
                      @if (job.location) {
                        <span class="meta-item">
                          <span nz-icon nzType="environment" nzTheme="outline"></span>
                          {{ job.location }}
                        </span>
                      }
                      @if (job.employment_type) {
                        <span class="meta-item">
                          <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                          {{ getEmploymentTypeLabel(job.employment_type) }}
                        </span>
                      }
                      @if (job.salary_min != null || job.salary_max != null) {
                        <span class="meta-item salary">
                          <span nz-icon nzType="dollar" nzTheme="outline"></span>
                          {{ formatSalary(job.salary_min, job.salary_max) }}
                        </span>
                      }
                    </div>
                  </div>
                </td>
                <td>
                  <span class="department-text">{{ job.department || '-' }}</span>
                </td>
                <td>
                  <div class="status-cell">
                    <nz-tag
                      class="status-tag"
                      [nzColor]="getStatusColor(job.status)"
                    >
                      <span nz-icon [nzType]="getStatusIcon(job.status)"></span>
                      {{ getStatusLabel(job.status) }}
                    </nz-tag>
                    @if (job.is_published) {
                      <nz-tag class="published-tag" nzColor="success">
                        <span nz-icon nzType="global"></span>
                        Đã đăng
                      </nz-tag>
                    }
                  </div>
                </td>
                <td>
                  <div class="applicant-count">
                    <span class="count-number">{{ job.applications_count }}</span>
                    <span class="count-label">ứng viên</span>
                  </div>
                </td>
                <td>
                  <div class="creator-info">
                    <nz-avatar
                      [nzText]="getInitial(job.creator_name || 'U')"
                      [nzSize]="28"
                    ></nz-avatar>
                    <span class="creator-name">{{ job.creator_name || '-' }}</span>
                  </div>
                </td>
                <td>
                  <div class="actions-cell">
                    <!-- View -->
                    <button
                      nz-button
                      nzType="default"
                      [routerLink]="['/jobs', job.id]"
                      nz-tooltip
                      nzTooltipTitle="Xem chi tiết"
                    >
                      <span nz-icon nzType="eye"></span>
                      Xem
                    </button>

                    <!-- Edit (draft/rejected) -->
                    @if (canEdit(job)) {
                      <button
                        nz-button
                        nzType="default"
                        [routerLink]="['/jobs', job.id, 'edit']"
                        nz-tooltip
                        nzTooltipTitle="Chỉnh sửa"
                      >
                        <span nz-icon nzType="edit"></span>
                        Sửa
                      </button>
                    }

                    <!-- More Actions -->
                    <button
                      nz-button
                      nzType="default"
                      nzShape="circle"
                      nz-dropdown
                      [nzDropdownMenu]="actionMenu"
                      nz-tooltip
                      nzTooltipTitle="Thao tác khác"
                    >
                      <span nz-icon nzType="ellipsis"></span>
                    </button>
                    <nz-dropdown-menu #actionMenu="nzDropdownMenu">
                      <ul nz-menu class="action-dropdown">
                        <!-- Submit -->
                        @if (canSubmit(job)) {
                          <li nz-menu-item (click)="submitJob(job)">
                            <span nz-icon nzType="send" class="menu-icon"></span>
                            Gửi duyệt
                          </li>
                        }
                        <!-- Approve/Reject -->
                        @if (canApprove(job)) {
                          <li nz-menu-item (click)="approveJob(job)" class="approve-item">
                            <span nz-icon nzType="check-circle" class="menu-icon"></span>
                            Phê duyệt
                          </li>
                          <li nz-menu-item (click)="rejectJob(job)" class="reject-item">
                            <span nz-icon nzType="close-circle" class="menu-icon"></span>
                            Từ chối
                          </li>
                        }
                        <!-- Publish -->
                        @if (canPublish(job)) {
                          <li nz-menu-item (click)="publishJob(job)" class="publish-item">
                            <span nz-icon nzType="global" class="menu-icon"></span>
                            Đăng tin
                          </li>
                        }
                        <!-- Unpublish -->
                        @if (canUnpublish(job)) {
                          <li nz-menu-item (click)="unpublishJob(job)">
                            <span nz-icon nzType="stop" class="menu-icon"></span>
                            Gỡ tin
                          </li>
                        }
                        <!-- Close -->
                        @if (canClose(job)) {
                          <li nz-menu-item (click)="closeJob(job)">
                            <span nz-icon nzType="poweroff" class="menu-icon"></span>
                            Đóng tuyển
                          </li>
                        }
                        <!-- Delete -->
                        @if (canDelete(job)) {
                          <li nz-menu-divider></li>
                          <li nz-menu-item nzDanger (click)="confirmDelete(job)">
                            <span nz-icon nzType="delete" class="menu-icon"></span>
                            Xóa
                          </li>
                        }
                      </ul>
                    </nz-dropdown-menu>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </nz-table>

        <ng-template #emptyTemplate>
          <nz-empty
            nzNotFoundContent="Chưa có tin tuyển dụng nào"
            [nzNotFoundFooter]="emptyFooter"
          ></nz-empty>
          <ng-template #emptyFooter>
            <button nz-button nzType="primary" routerLink="/jobs/new">
              Tạo tin tuyển dụng đầu tiên
            </button>
          </ng-template>
        </ng-template>
      </nz-card>
    </div>
  `,
  styles: [`
    .job-list-page {
      animation: fadeIn 0.3s ease-out;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .page-title {
      font-family: var(--font-heading);
      font-size: 24px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 4px 0;
    }

    .page-subtitle {
      font-size: 14px;
      color: var(--color-text-secondary);
      margin: 0;
    }

    .create-btn {
      height: 40px;
      padding: 0 20px;
    }

    /* Stats Row */
    .stats-row {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .stat-item {
      flex: 1;
      min-width: 140px;
      padding: 16px 20px;
      background: var(--color-bg-secondary);
      border-radius: 10px;
      border: 1px solid var(--color-border-light);
      display: flex;
      flex-direction: column;
      gap: 4px;

      &--primary {
        border-left: 3px solid var(--color-primary);
      }

      &--success {
        border-left: 3px solid var(--color-success);
      }

      &--warning {
        border-left: 3px solid var(--color-warning);
      }

      &--default {
        border-left: 3px solid var(--color-text-tertiary);
      }
    }

    .stat-value {
      font-family: var(--font-heading);
      font-size: 24px;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .stat-label {
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    /* Filter Card */
    .filter-card {
      margin-bottom: 24px;
    }

    .filter-row {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 200px;
      max-width: 320px;
    }

    .filter-actions {
      margin-left: auto;
    }

    /* Table Card */
    .table-card {
      margin-bottom: 24px;
    }

    /* Job Row */
    .job-row {
      transition: background 0.2s ease;

      &:hover {
        background: var(--color-primary-50);
      }
    }

    .job-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .job-title {
      font-weight: 600;
      font-size: 15px;
      color: var(--color-text-primary);
      transition: color 0.2s ease;

      &:hover {
        color: var(--color-primary);
      }
    }

    .job-title-en {
      font-size: 13px;
      color: var(--color-text-tertiary);
    }

    .job-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 4px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--color-text-secondary);

      span[nz-icon] {
        font-size: 12px;
      }

      &.salary {
        color: var(--color-success);
        font-weight: 500;
      }
    }

    .department-text {
      font-size: 14px;
      color: var(--color-text-primary);
    }

    /* Status Cell */
    .status-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .status-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;

      span[nz-icon] {
        font-size: 12px;
      }
    }

    .published-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;

      span[nz-icon] {
        font-size: 10px;
      }
    }

    /* Applicant Count */
    .applicant-count {
      display: flex;
      flex-direction: column;
    }

    .count-number {
      font-family: var(--font-heading);
      font-size: 18px;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .count-label {
      font-size: 11px;
      color: var(--color-text-tertiary);
    }

    /* Creator Info */
    .creator-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .creator-name {
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    /* Actions Cell */
    .actions-cell {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-wrap: wrap;
    }

    .action-dropdown {
      min-width: 160px;
    }

    .menu-icon {
      margin-right: 8px;
    }

    .approve-item {
      color: var(--color-success);
    }

    .reject-item {
      color: var(--color-error);
    }

    .publish-item {
      color: var(--color-primary);
    }

    /* Animation */
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

      .stats-row {
        flex-direction: column;
      }

      .stat-item {
        min-width: 100%;
      }

      .filter-row {
        flex-direction: column;
        align-items: stretch;
      }

      .search-input {
        max-width: none;
      }

      .filter-actions {
        margin-left: 0;
      }
    }
  `],
})
export class JobListComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private dashboardService = inject(DashboardService);

  jobs = signal<Job[]>([]);
  loading = signal(false);
  total = signal(0);

  pageIndex = 1;
  pageSize = 20;
  statusFilter: JobStatus | null = null;
  departmentFilter: string | null = null;
  searchText = '';

  jobStats: { label: string; value: number; color: string }[] = [];
  departments: string[] = [];

  statusOptions = [
    { value: 'draft', label: JOB_STATUS_LABELS.draft },
    { value: 'pending_approval', label: JOB_STATUS_LABELS.pending_approval },
    { value: 'approved', label: JOB_STATUS_LABELS.approved },
    { value: 'rejected', label: JOB_STATUS_LABELS.rejected },
    { value: 'active', label: JOB_STATUS_LABELS.active },
    { value: 'closed', label: JOB_STATUS_LABELS.closed },
  ];

  constructor(
    private jobService: JobService,
    private authService: AuthService,
    private message: NzMessageService,
    private modal: NzModalService,
    private router: Router,
    private notificationSvc: NotificationService,
  ) {}

  ngOnInit(): void {
    this.loadJobs();
    this.loadStats();
    // Auto-reload when new notification about jobs/applications arrives
    this.notificationSvc.dataChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((n) => {
        if (['application', 'job'].includes(n.type)) {
          this.loadJobs();
          this.loadStats();
        }
      });
  }

  loadJobs(): void {
    this.loading.set(true);
    this.jobService
      .list({
        page: this.pageIndex,
        page_size: this.pageSize,
        status: this.statusFilter || undefined,
        search: this.searchText || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.jobs.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
          this.extractDepartments(res.items);
        },
        error: () => {
          this.message.error('Không thể tải danh sách việc làm');
          this.loading.set(false);
        },
      });
  }

  private loadStats(): void {
    this.dashboardService.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const sc = data.job_status_counts;
          const totalJobs = Object.values(sc).reduce((sum, v) => sum + v, 0);
          const activeCount = sc['active'] || 0;
          const pendingCount = sc['pending_approval'] || 0;
          const closedCount = sc['closed'] || 0;

          this.jobStats = [
            { label: 'Tất cả', value: totalJobs, color: 'primary' },
            { label: 'Đang tuyển', value: activeCount, color: 'success' },
            { label: 'Chờ duyệt', value: pendingCount, color: 'warning' },
            { label: 'Đã đóng', value: closedCount, color: 'default' },
          ];
        },
      });
  }

  private extractDepartments(jobs: Job[]): void {
    const deptSet = new Set<string>();
    for (const job of jobs) {
      if (job.department) deptSet.add(job.department);
    }
    if (deptSet.size > 0) {
      this.departments = Array.from(deptSet).sort();
    }
  }

  onQueryParamsChange(params: NzTableQueryParams): void {
    this.pageIndex = params.pageIndex;
    this.pageSize = params.pageSize;
    this.loadJobs();
  }

  onFilterChange(): void {
    this.pageIndex = 1;
    this.loadJobs();
  }

  onSearch(): void {
    this.pageIndex = 1;
    this.loadJobs();
  }

  clearFilters(): void {
    this.statusFilter = null;
    this.departmentFilter = null;
    this.searchText = '';
    this.pageIndex = 1;
    this.loadJobs();
  }

  // Helper methods
  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  getStatusLabel(status: JobStatus): string {
    return JOB_STATUS_LABELS[status] || status;
  }

  getStatusColor(status: JobStatus): string {
    return JOB_STATUS_COLORS[status] || 'default';
  }

  getStatusIcon(status: JobStatus): string {
    const icons: Record<string, string> = {
      draft: 'edit',
      pending_approval: 'clock-circle',
      approved: 'check-circle',
      rejected: 'close-circle',
      active: 'check',
      closed: 'stop',
    };
    return icons[status] || 'file';
  }

  getEmploymentTypeLabel(type: string): string {
    return EMPLOYMENT_TYPE_LABELS[type as EmploymentType] || type;
  }

  formatSalary(min?: number, max?: number): string {
    if (min != null && max != null && min > 0 && max > 0) {
      return min === max ? `${min} triệu` : `${min} - ${max} triệu`;
    }
    if (max != null && max > 0) return `Lên đến ${max} triệu`;
    if (min != null && min > 0) return `Từ ${min} triệu`;
    return 'Thỏa thuận';
  }

  // Permission: only the HR who created the job can operate (except approve)
  private isOwner(job: Job): boolean {
    return job.created_by === this.authService.user()?.id;
  }

  canEdit(job: Job): boolean {
    return ['draft', 'rejected'].includes(job.status) && this.isOwner(job);
  }

  canDelete(job: Job): boolean {
    return job.status === 'draft' && this.isOwner(job);
  }

  canSubmit(job: Job): boolean {
    return ['draft', 'rejected'].includes(job.status) && this.isOwner(job);
  }

  canApprove(job: Job): boolean {
    return (
      job.status === 'pending_approval' &&
      this.authService.hasRole('leader', 'admin')
    );
  }

  canPublish(job: Job): boolean {
    return job.status === 'approved' && this.isOwner(job);
  }

  canUnpublish(job: Job): boolean {
    return job.status === 'active' && this.isOwner(job);
  }

  canClose(job: Job): boolean {
    return job.status === 'active' && this.isOwner(job);
  }

  // Actions
  submitJob(job: Job): void {
    this.jobService.submit(job.id).subscribe({
      next: () => {
        this.message.success('Đã gửi yêu cầu phê duyệt');
        this.loadJobs();
      },
      error: () => this.message.error('Không thể gửi yêu cầu'),
    });
  }

  approveJob(job: Job): void {
    this.modal.confirm({
      nzTitle: 'Phê duyệt tin tuyển dụng?',
      nzContent: `Bạn có chắc muốn phê duyệt "${job.title_vi}"?`,
      nzOkText: 'Phê duyệt',
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.jobService.approve(job.id).subscribe({
          next: () => {
            this.message.success('Đã phê duyệt');
            this.loadJobs();
          },
          error: () => this.message.error('Không thể phê duyệt'),
        });
      },
    });
  }

  rejectJob(job: Job): void {
    this.modal.confirm({
      nzTitle: 'Từ chối tin tuyển dụng?',
      nzContent: `Bạn có chắc muốn từ chối "${job.title_vi}"?`,
      nzOkText: 'Từ chối',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.jobService.reject(job.id, { reason: 'Cần chỉnh sửa thêm' }).subscribe({
          next: () => {
            this.message.success('Đã từ chối');
            this.loadJobs();
          },
          error: () => this.message.error('Không thể từ chối'),
        });
      },
    });
  }

  publishJob(job: Job): void {
    this.jobService.publish(job.id).subscribe({
      next: () => {
        this.message.success('Đã đăng tin tuyển dụng');
        this.loadJobs();
      },
      error: () => this.message.error('Không thể đăng tin'),
    });
  }

  unpublishJob(job: Job): void {
    this.jobService.unpublish(job.id).subscribe({
      next: () => {
        this.message.success('Đã gỡ tin tuyển dụng');
        this.loadJobs();
      },
      error: () => this.message.error('Không thể gỡ tin'),
    });
  }

  closeJob(job: Job): void {
    this.modal.confirm({
      nzTitle: 'Đóng tuyển dụng?',
      nzContent: `Tin "${job.title_vi}" sẽ không nhận ứng viên mới. Tiếp tục?`,
      nzOkText: 'Đóng tuyển',
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.jobService.close(job.id).subscribe({
          next: () => {
            this.message.success('Đã đóng tuyển dụng');
            this.loadJobs();
          },
          error: () => this.message.error('Không thể đóng'),
        });
      },
    });
  }

  confirmDelete(job: Job): void {
    this.modal.confirm({
      nzTitle: 'Xóa tin tuyển dụng?',
      nzContent: `Bạn có chắc muốn xóa "${job.title_vi}"? Thao tác này không thể hoàn tác.`,
      nzOkText: 'Xóa',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.jobService.delete(job.id).subscribe({
          next: () => {
            this.message.success('Đã xóa');
            this.loadJobs();
          },
          error: () => this.message.error('Không thể xóa'),
        });
      },
    });
  }
}
