import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { JobService } from '../../services/job.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { VIETNAMESE_INDUSTRIES } from '../../../../shared/constants/vietnamese-industries';
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
    NzToolTipModule,
    NzCardModule,
    NzAvatarModule,
    NzEmptyModule,
    NzPaginationModule,
    NzSpinModule,
  ],
  templateUrl: './job-list.component.html',
  styleUrl: './job-list.component.scss',
})
export class JobListComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private dashboardService = inject(DashboardService);
  private jobService = inject(JobService);
  private authService = inject(AuthService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationSvc = inject(NotificationService);

  jobs = signal<Job[]>([]);
  loading = signal(false);
  total = signal(0);

  pageIndex = 1;
  pageSize = 20;
  viewMode: 'list' | 'grid' = 'list';

  // Filters
  searchText = '';
  statusFilter: JobStatus | null = null;
  departmentFilter: string | null = null;
  locationFilter: string | null = null;
  employmentTypeFilter: string | null = null;
  salaryPresetFilter: string | null = null;
  experienceFilter: string | null = null;
  hasApplicantsFilter: boolean | null = null;
  sortBy = 'newest';

  jobStats: { label: string; value: number; color: string; description: string; statusKey: JobStatus | 'all' }[] = [];
  allDepartments: string[] = VIETNAMESE_INDUSTRIES;
  statusCounts: Record<string, number> = {};
  totalJobsCount = 0;

  statusOptions = [
    { value: 'active', label: 'Đang tuyển (Active)' },
    { value: 'pending_approval', label: 'Chờ duyệt (Pending)' },
    { value: 'approved', label: 'Đã duyệt (Approved)' },
    { value: 'draft', label: 'Bản nháp (Draft)' },
    { value: 'closed', label: 'Đã đóng (Closed)' },
    { value: 'rejected', label: 'Bị từ chối (Rejected)' },
  ];

  locationOptions = [
    'Hà Nội',
    'TP. Hồ Chí Minh',
    'Đà Nẵng',
    'Hải Phòng',
    'Cần Thơ',
    'Bình Dương',
    'Đồng Nai',
    'Bắc Ninh',
    'Quảng Ninh',
    'Remote (Làm việc từ xa)',
    'Hybrid (Linh hoạt)',
  ];

  employmentTypeOptions = [
    { value: 'full_time', label: 'Toàn thời gian (Full-time)' },
    { value: 'part_time', label: 'Bán thời gian (Part-time)' },
    { value: 'contract', label: 'Hợp đồng (Contract)' },
    { value: 'internship', label: 'Thực tập (Internship)' },
  ];

  salaryPresets = [
    { value: 'all', label: 'Tất cả mức lương' },
    { value: 'u15', label: 'Dưới 15 triệu' },
    { value: '15to30', label: '15 - 30 triệu' },
    { value: '30to50', label: '30 - 50 triệu' },
    { value: 'gt50', label: 'Trên 50 triệu' },
  ];

  experienceOptions = [
    { value: 'all', label: 'Tất cả kinh nghiệm' },
    { value: '0to1', label: 'Dưới 1 năm / Không yêu cầu' },
    { value: '1to2', label: '1 - 2 năm' },
    { value: '3to5', label: '3 - 5 năm' },
    { value: 'gt5', label: 'Trên 5 năm' },
  ];

  get hasActiveFilters(): boolean {
    return (
      !!this.searchText ||
      !!this.statusFilter ||
      !!this.departmentFilter ||
      !!this.locationFilter ||
      !!this.employmentTypeFilter ||
      (!!this.salaryPresetFilter && this.salaryPresetFilter !== 'all') ||
      (!!this.experienceFilter && this.experienceFilter !== 'all') ||
      this.hasApplicantsFilter !== null
    );
  }

  selectStatus(status: JobStatus | 'all'): void {
    if (status === 'all') {
      this.statusFilter = null;
    } else {
      this.statusFilter = status;
    }
    this.onFilterChange();
  }

  isStatusActive(status: JobStatus | 'all'): boolean {
    if (status === 'all') {
      return this.statusFilter === null;
    }
    return this.statusFilter === status;
  }

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const requestedStatus = params.get('status') as JobStatus | null;
        const requestedSearch = params.get('search');
        if (requestedStatus && this.statusOptions.some((status) => status.value === requestedStatus)) {
          this.statusFilter = requestedStatus;
          this.pageIndex = 1;
        }
        if (requestedSearch !== null) {
          this.searchText = requestedSearch;
          this.pageIndex = 1;
        }
        this.loadJobs();
      });
    this.loadStats();

    // Auto-reload when new notification arrives
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

    let salaryMin: number | undefined;
    let salaryMax: number | undefined;
    if (this.salaryPresetFilter === 'u15') salaryMax = 15;
    else if (this.salaryPresetFilter === '15to30') { salaryMin = 15; salaryMax = 30; }
    else if (this.salaryPresetFilter === '30to50') { salaryMin = 30; salaryMax = 50; }
    else if (this.salaryPresetFilter === 'gt50') salaryMin = 50;

    let minExp: number | undefined;
    let maxExp: number | undefined;
    if (this.experienceFilter === '0to1') maxExp = 1;
    else if (this.experienceFilter === '1to2') { minExp = 1; maxExp = 2; }
    else if (this.experienceFilter === '3to5') { minExp = 3; maxExp = 5; }
    else if (this.experienceFilter === 'gt5') minExp = 5;

    this.jobService
      .list({
        page: this.pageIndex,
        page_size: this.pageSize,
        status: this.statusFilter || undefined,
        department: this.departmentFilter || undefined,
        location: this.locationFilter || undefined,
        employment_type: this.employmentTypeFilter || undefined,
        salary_min: salaryMin,
        salary_max: salaryMax,
        min_experience: minExp,
        max_experience: maxExp,
        has_applications: this.hasApplicantsFilter !== null ? this.hasApplicantsFilter : undefined,
        search: this.searchText || undefined,
        order_by: this.sortBy,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.jobs.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
          this.mergeDepartments(res.items);
        },
        error: () => {
          this.message.error('Không thể tải danh sách việc làm');
          this.loading.set(false);
        },
      });
  }

  private loadStats(): void {
    this.dashboardService
      .getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const sc = data.job_status_counts || {};
          this.statusCounts = sc;
          const totalJobs = Object.values(sc).reduce((sum, v) => sum + v, 0);
          this.totalJobsCount = totalJobs;
          const activeCount = sc['active'] || 0;
          const pendingCount = sc['pending_approval'] || 0;
          const draftCount = sc['draft'] || 0;
          const closedCount = sc['closed'] || 0;

          this.jobStats = [
            { label: 'Tất cả tin', value: totalJobs, color: 'primary', description: 'Toàn bộ tin trên hệ thống', statusKey: 'all' },
            { label: 'Đang tuyển', value: activeCount, color: 'success', description: 'Tin đang mở nhận hồ sơ', statusKey: 'active' },
            { label: 'Chờ duyệt', value: pendingCount, color: 'warning', description: 'Tin đang chờ phê duyệt', statusKey: 'pending_approval' },
            { label: 'Bản nháp', value: draftCount, color: 'default', description: 'Tin nháp chưa gửi duyệt', statusKey: 'draft' },
            { label: 'Đã đóng', value: closedCount, color: 'dark', description: 'Tin đã dừng nhận hồ sơ', statusKey: 'closed' },
          ];
        },
      });
  }

  private mergeDepartments(jobs: Job[]): void {
    const deptSet = new Set<string>(this.allDepartments);
    for (const job of jobs) {
      if (job.department) deptSet.add(job.department);
    }
    this.allDepartments = Array.from(deptSet).sort();
  }

  onQueryParamsChange(params: NzTableQueryParams): void {
    this.pageIndex = params.pageIndex;
    this.pageSize = params.pageSize;
    this.loadJobs();
  }

  setViewMode(mode: 'list' | 'grid'): void {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.pageIndex = 1;
    this.pageSize = mode === 'grid' ? 18 : 20;
    this.loadJobs();
  }

  onGridPageChange(pageIndex: number): void {
    this.pageIndex = pageIndex;
    this.loadJobs();
  }

  onGridPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.pageIndex = 1;
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
    this.searchText = '';
    this.statusFilter = null;
    this.departmentFilter = null;
    this.locationFilter = null;
    this.employmentTypeFilter = null;
    this.salaryPresetFilter = null;
    this.experienceFilter = null;
    this.hasApplicantsFilter = null;
    this.sortBy = 'newest';
    this.pageIndex = 1;
    this.loadJobs();
  }

  getStatusLabel(status: JobStatus): string {
    return JOB_STATUS_LABELS[status] || status;
  }

  getStatusColor(status: JobStatus): string {
    return JOB_STATUS_COLORS[status] || 'default';
  }

  getStatusIcon(status: JobStatus): string {
    const icons: Record<JobStatus, string> = {
      draft: 'edit',
      pending_approval: 'clock-circle',
      approved: 'check-circle',
      rejected: 'close-circle',
      active: 'thunderbolt',
      closed: 'poweroff',
    };
    return icons[status] || 'file-text';
  }

  getEmploymentTypeLabel(type?: EmploymentType): string {
    return (type && EMPLOYMENT_TYPE_LABELS[type]) || type || '-';
  }

  formatSalary(min?: number, max?: number): string {
    if (min == null && max == null) return 'Thỏa thuận';
    if (min != null && max != null) return `${min} - ${max} triệu`;
    if (min != null) return `Từ ${min} triệu`;
    return `Đến ${max} triệu`;
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(value));
  }

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  canEdit(job: Job): boolean {
    const user = this.authService.user();
    if (!user) return false;
    if (['draft', 'rejected'].includes(job.status)) {
      return this.authService.hasRole('admin') || job.created_by === user.id;
    }
    return false;
  }

  canSubmit(job: Job): boolean {
    const user = this.authService.user();
    if (!user) return false;
    return (
      ['draft', 'rejected'].includes(job.status) &&
      (this.authService.hasRole('admin') || job.created_by === user.id)
    );
  }

  canApprove(job: Job): boolean {
    return (
      job.status === 'pending_approval' &&
      this.authService.hasRole('admin', 'leader')
    );
  }

  canPublish(job: Job): boolean {
    return (
      job.status === 'approved' &&
      !job.is_published &&
      this.authService.hasRole('admin', 'recruiter', 'leader')
    );
  }

  canUnpublish(job: Job): boolean {
    return (
      job.is_published &&
      this.authService.hasRole('admin', 'recruiter', 'leader')
    );
  }

  canClose(job: Job): boolean {
    return (
      job.status === 'active' &&
      this.authService.hasRole('admin', 'recruiter', 'leader')
    );
  }

  canDelete(job: Job): boolean {
    const user = this.authService.user();
    if (!user) return false;
    return (
      job.status === 'draft' &&
      (this.authService.hasRole('admin') || job.created_by === user.id)
    );
  }

  submitJob(job: Job): void {
    this.jobService.submit(job.id).subscribe({
      next: () => {
        this.message.success('Đã gửi tin tuyển dụng để phê duyệt');
        this.loadJobs();
        this.loadStats();
      },
      error: () => this.message.error('Không thể gửi phê duyệt'),
    });
  }

  approveJob(job: Job): void {
    this.jobService.approve(job.id, {}).subscribe({
      next: () => {
        this.message.success('Đã phê duyệt tin tuyển dụng');
        this.loadJobs();
        this.loadStats();
      },
      error: () => this.message.error('Không thể phê duyệt'),
    });
  }

  showRejectModal(job: Job): void {
    let reason = '';
    this.modal.confirm({
      nzTitle: 'Từ chối tin tuyển dụng',
      nzContent: `
        <div style="margin-top: 12px">
          <label style="display: block; margin-bottom: 6px; font-weight: 500">Lý do từ chối:</label>
          <textarea id="reject-reason" class="ant-input" rows="3" placeholder="Nhập lý do từ chối để người tạo tin chỉnh sửa..."></textarea>
        </div>
      `,
      nzOkText: 'Từ chối',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        const textarea = document.getElementById('reject-reason') as HTMLTextAreaElement;
        reason = textarea?.value || 'Không đạt yêu cầu';
        return this.jobService
          .reject(job.id, { reason })
          .toPromise()
          .then(() => {
            this.message.success('Đã từ chối tin tuyển dụng');
            this.loadJobs();
            this.loadStats();
          })
          .catch(() => {
            this.message.error('Không thể từ chối tin');
          });
      },
    });
  }

  publishJob(job: Job): void {
    this.jobService.publish(job.id).subscribe({
      next: () => {
        this.message.success('Đã đăng tin tuyển dụng lên cổng tìm việc');
        this.loadJobs();
        this.loadStats();
      },
      error: () => this.message.error('Không thể đăng tin'),
    });
  }

  unpublishJob(job: Job): void {
    this.modal.confirm({
      nzTitle: 'Gỡ tin khỏi Portal?',
      nzContent: `Tin “${job.title_vi}” sẽ không còn hiển thị trên cổng ứng viên nhưng vẫn được giữ trong hệ thống. Bạn có chắc chắn muốn gỡ?`,
      nzOkText: 'Gỡ khỏi Portal',
      nzCancelText: 'Hủy',
      nzOnOk: () => this.jobService.unpublish(job.id).toPromise()
        .then(() => {
          this.message.success('Đã gỡ tin khỏi Portal');
          this.loadJobs();
          this.loadStats();
        })
        .catch(() => {
          this.message.error('Không thể gỡ tin khỏi Portal');
          return Promise.reject();
        }),
    });
  }

  closeJob(job: Job): void {
    this.modal.confirm({
      nzTitle: 'Đóng tuyển vị trí này?',
      nzContent: `Tin “${job.title_vi}” sẽ dừng nhận hồ sơ mới. Bạn có chắc chắn muốn tiếp tục?`,
      nzOkText: 'Đóng tuyển',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => this.jobService.close(job.id).toPromise()
        .then(() => {
          this.message.success('Đã đóng tin tuyển dụng');
          this.loadJobs();
          this.loadStats();
        })
        .catch(() => {
          this.message.error('Không thể đóng tin tuyển dụng');
          return Promise.reject();
        }),
    });
  }

  deleteJob(job: Job): void {
    this.jobService.delete(job.id).subscribe({
      next: () => {
        this.message.success('Đã xóa tin tuyển dụng');
        this.loadJobs();
        this.loadStats();
      },
      error: () => this.message.error('Không thể xóa tin'),
    });
  }
}
