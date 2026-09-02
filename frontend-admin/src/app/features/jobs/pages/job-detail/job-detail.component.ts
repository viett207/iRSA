import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

import { JobService } from '../../services/job.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { MatchDetailsModalComponent } from '../../components/match-details-modal.component';
import { InterviewScheduleModalComponent } from '../../components/interview-schedule-modal.component';
import { CompareCandidatesModalComponent } from '../../components/compare-candidates-modal.component';
import { CvJdCompareModalComponent } from '../../components/cv-jd-compare-modal.component';
import { AiEvaluationModalComponent } from '../../components/ai-evaluation-modal.component';
import { AiScoringProgressModalComponent } from '../../components/ai-scoring-progress-modal.component';
import { InterviewRoomModalComponent } from '../../components/interview-room-modal.component';
import {
  Job,
  JobStatus,
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  EMPLOYMENT_TYPE_LABELS,
  EDUCATION_LABELS,
  Applicant,
  ApplicationStatus,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  STATUS_TRANSITIONS,
  MatchDetailsResponse,
  CvJdCompareResponse,
  AiEvaluationResponse,
} from '../../models/job.model';

import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzPageHeaderModule,
    NzDescriptionsModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzStepsModule,
    NzTabsModule,
    NzCardModule,
    NzSpinModule,
    NzModalModule,
    NzInputModule,
    NzAlertModule,
    NzDividerModule,
    NzStatisticModule,
    NzGridModule,
    NzSpaceModule,
    NzTableModule,
    NzToolTipModule,
    NzListModule,
    NzDropDownModule,
    NzPopconfirmModule,
    NzPopoverModule,
    NzProgressModule,
    NzCheckboxModule,
    NzDatePickerModule,
    NzSelectModule,
  ],
  templateUrl: './job-detail.component.html',
  styleUrl: './job-detail.component.scss',
})
export class JobDetailComponent implements OnInit, OnDestroy {
  job = signal<Job | null>(null);
  loading = signal(false);
  readonly workflowStages = ['Bản nháp', 'Chờ duyệt', 'Đã duyệt', 'Đang tuyển'];

  // Applicants tab state
  applicants = signal<Applicant[]>([]);
  applicantsTotal = signal(0);
  applicantsLoading = signal(false);
  transitioningApplicationId = signal<number | null>(null);
  applicantsPage = 1;
  private applicantsLoaded = false;
  private matchingRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private matchingRefreshAttempts = 0;
  private readonly matchingRefreshIntervalMs = 3_000;
  private readonly maxMatchingRefreshAttempts = 100;

  rejectModalVisible = false;
  rejectReason = '';
  downloadingAppId: number | null = null;
  evaluatingAppId: number | null = null;
  evaluatingAll = false;
  sortBy: 'date' | 'ai_score' = 'date';
  compareSelected = new Set<number>();
  applicantSearchTerm = '';
  applicantAiFilter: 'all' | 'pending' | 'evaluated' = 'all';
  submittedDate = '';
  submittedDateObj: Date | null = null;

  onSubmittedDateChange(date: Date | null): void {
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      this.applySubmittedDate(`${y}-${m}-${d}`);
    } else {
      this.applySubmittedDate('');
    }
  }

  // Resume viewer modal state
  resumeModalVisible = false;
  resumeModalLoading = false;
  resumeModalUrl: SafeResourceUrl | null = null;
  resumeModalFilename = '';
  private resumeObjectUrl: string | null = null;

  currentStep = computed(() => {
    const j = this.job();
    if (!j) return 0;
    switch (j.status) {
      case 'draft':
      case 'rejected':
        return 0;
      case 'pending_approval':
        return 1;
      case 'approved':
        return 2;
      case 'active':
      case 'closed':
        return 3;
      default:
        return 0;
    }
  });

  private notifSub?: import('rxjs').Subscription;

  constructor(
    private jobService: JobService,
    private authService: AuthService,
    private message: NzMessageService,
    private modal: NzModalService,
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private notificationSvc: NotificationService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.loadJob(+params['id']);
      }
    });
    // Auto-reload when data changes
    this.notifSub = this.notificationSvc.dataChanged$.subscribe((n) => {
      if (['application', 'job', 'interview'].includes(n.type)) {
        const j = this.job();
        if (j) {
          this.loadJob(j.id);
          if (this.applicantsLoaded) {
            if (n.type === 'application') this.matchingRefreshAttempts = 0;
            this.loadApplicants();
          }
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
    this.stopMatchingScoreRefresh();
  }

  loadJob(id: number): void {
    this.loading.set(true);
    this.jobService.get(id).subscribe({
      next: (job) => {
        this.job.set(job);
        this.loading.set(false);
      },
      error: () => {
        this.message.error('Không thể tải thông tin việc làm');
        this.loading.set(false);
        this.router.navigate(['/jobs']);
      },
    });
  }

  getStatusLabel(status: JobStatus): string {
    return JOB_STATUS_LABELS[status] || status;
  }

  getStatusColor(status: JobStatus): string {
    return JOB_STATUS_COLORS[status] || 'default';
  }

  getEmploymentTypeLabel(type?: string): string {
    if (!type) return '-';
    return EMPLOYMENT_TYPE_LABELS[type as keyof typeof EMPLOYMENT_TYPE_LABELS] || type;
  }

  formatSalary(min?: number, max?: number): string {
    if (min != null && max != null && min > 0 && max > 0) {
      return min === max ? `${min} triệu` : `${min} - ${max} triệu`;
    }
    if (max != null && max > 0) return `Lên đến ${max} triệu`;
    if (min != null && min > 0) return `Từ ${min} triệu`;
    return '';
  }

  getEducationLabel(level?: string | null): string {
    if (!level) return '-';
    return EDUCATION_LABELS[level] || level;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // Permission: HR/Admin/Recruiter or owner can operate
  isOwner(): boolean {
    const j = this.job();
    const u = this.authService.user();
    if (!j || !u) return false;
    return this.authService.hasRole('admin', 'hr', 'leader', 'manager', 'recruiter') || j.created_by === u.id;
  }

  canEdit(): boolean {
    const j = this.job();
    return !!j && ['draft', 'rejected'].includes(j.status) && this.isOwner();
  }

  canSubmit(): boolean {
    const j = this.job();
    return !!j && ['draft', 'rejected'].includes(j.status) && this.isOwner();
  }

  canApprove(): boolean {
    const j = this.job();
    return (
      !!j &&
      j.status === 'pending_approval' &&
      this.authService.hasRole('leader', 'admin')
    );
  }

  canPublish(): boolean {
    const j = this.job();
    return !!j && j.status === 'approved' && this.isOwner();
  }

  canUnpublish(): boolean {
    const j = this.job();
    return !!j && j.status === 'active' && this.isOwner();
  }

  canClose(): boolean {
    const j = this.job();
    return !!j && j.status === 'active' && this.isOwner();
  }

  // Actions
  submitJob(): void {
    const j = this.job();
    if (!j) return;

    this.jobService.submit(j.id).subscribe({
      next: (updated) => {
        this.job.set(updated);
        this.message.success('Đã gửi yêu cầu phê duyệt');
      },
      error: () => this.message.error('Không thể gửi yêu cầu'),
    });
  }

  approveJob(): void {
    const j = this.job();
    if (!j) return;

    this.modal.confirm({
      nzTitle: 'Phê duyệt tin tuyển dụng?',
      nzContent: `Bạn có chắc muốn phê duyệt "${j.title_vi}"?`,
      nzOnOk: () => {
        this.jobService.approve(j.id).subscribe({
          next: (updated) => {
            this.job.set(updated);
            this.message.success('Đã phê duyệt');
          },
          error: () => this.message.error('Không thể phê duyệt'),
        });
      },
    });
  }

  showRejectModal(): void {
    this.rejectReason = '';
    this.rejectModalVisible = true;
  }

  rejectJob(): void {
    const j = this.job();
    if (!j) return;

    if (!this.rejectReason.trim()) {
      this.message.warning('Vui lòng nhập lý do từ chối');
      return;
    }

    this.jobService.reject(j.id, { reason: this.rejectReason }).subscribe({
      next: (updated) => {
        this.job.set(updated);
        this.rejectModalVisible = false;
        this.message.success('Đã từ chối');
      },
      error: () => this.message.error('Không thể từ chối'),
    });
  }

  publishJob(): void {
    const j = this.job();
    if (!j) return;

    this.jobService.publish(j.id).subscribe({
      next: (updated) => {
        this.job.set(updated);
        this.message.success('Đã đăng tin tuyển dụng');
      },
      error: () => this.message.error('Không thể đăng tin'),
    });
  }

  unpublishJob(): void {
    const j = this.job();
    if (!j) return;

    this.modal.confirm({
      nzTitle: 'Gỡ tin khỏi Portal?',
      nzContent: `Tin “${j.title_vi}” sẽ không còn hiển thị trên cổng ứng viên nhưng vẫn được giữ trong hệ thống. Bạn có chắc chắn muốn gỡ?`,
      nzOkText: 'Gỡ khỏi Portal',
      nzCancelText: 'Hủy',
      nzOnOk: () => this.jobService.unpublish(j.id).toPromise()
        .then((updated) => {
          if (updated) this.job.set(updated);
          this.message.success('Đã gỡ tin khỏi Portal');
        })
        .catch(() => {
          this.message.error('Không thể gỡ tin khỏi Portal');
          return Promise.reject();
        }),
    });
  }

  closeJob(): void {
    const j = this.job();
    if (!j) return;

    this.modal.confirm({
      nzTitle: 'Đóng tuyển vị trí này?',
      nzContent: `Tin “${j.title_vi}” sẽ dừng nhận hồ sơ mới. Bạn có chắc chắn muốn tiếp tục?`,
      nzOkText: 'Đóng tuyển',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => this.jobService.close(j.id).toPromise()
        .then((updated) => {
          if (updated) this.job.set(updated);
          this.message.success('Đã đóng tin tuyển dụng');
        })
        .catch(() => {
          this.message.error('Không thể đóng tin tuyển dụng');
          return Promise.reject();
        }),
    });
  }

  // --- Applicants tab ---

  onApplicantsTabSelect(): void {
    if (!this.applicantsLoaded) {
      this.matchingRefreshAttempts = 0;
      this.loadApplicants();
      this.applicantsLoaded = true;
    }
  }

  loadApplicants(showLoading = true): void {
    const j = this.job();
    if (!j) return;

    if (showLoading) this.applicantsLoading.set(true);
    this.jobService
      .getApplications(j.id, {
        page: this.applicantsPage,
        size: 20,
        sort_by: this.sortBy,
        submitted_date: this.submittedDate || undefined,
      })
      .subscribe({
        next: (res) => {
          this.applicants.set(res.items);
          this.applicantsTotal.set(res.total);
          this.applicantsLoading.set(false);
          this.scheduleMatchingScoreRefresh();
        },
        error: () => {
          if (showLoading) this.message.error('Không thể tải danh sách ứng viên');
          this.applicantsLoading.set(false);
          if (!showLoading) this.scheduleMatchingScoreRefresh();
        },
      });
  }

  private scheduleMatchingScoreRefresh(): void {
    const hasPendingMatching = this.applicants().some((app) => this.isMatchingPending(app));
    if (!hasPendingMatching || this.matchingRefreshAttempts >= this.maxMatchingRefreshAttempts) {
      this.stopMatchingScoreRefresh();
      return;
    }

    if (this.matchingRefreshTimer !== null) return;
    this.matchingRefreshTimer = setTimeout(() => {
      this.matchingRefreshTimer = null;
      this.matchingRefreshAttempts += 1;
      this.loadApplicants(false);
    }, this.matchingRefreshIntervalMs);
  }

  private stopMatchingScoreRefresh(): void {
    if (this.matchingRefreshTimer !== null) {
      clearTimeout(this.matchingRefreshTimer);
      this.matchingRefreshTimer = null;
    }
  }

  isMatchingPending(app: Applicant): boolean {
    if (app.total_score != null) return false;
    const submittedAt = new Date(app.submitted_at).getTime();
    if (Number.isNaN(submittedAt)) return false;
    return Date.now() - submittedAt < this.maxMatchingRefreshAttempts * this.matchingRefreshIntervalMs;
  }

  onApplicantsPageChange(page: number): void {
    this.applicantsPage = page;
    this.matchingRefreshAttempts = 0;
    this.loadApplicants();
  }

  filteredApplicants(): Applicant[] {
    const term = this.applicantSearchTerm.trim().toLocaleLowerCase('vi');
    return this.applicants().filter((app) => {
      const matchesTerm = !term || `${app.candidate_name} ${app.candidate_email}`.toLocaleLowerCase('vi').includes(term);
      const evaluated = app.ai_score != null || !!app.has_ai_evaluation;
      const matchesAi = this.applicantAiFilter === 'all'
        || (this.applicantAiFilter === 'evaluated' && evaluated)
        || (this.applicantAiFilter === 'pending' && !evaluated);
      return matchesTerm && matchesAi;
    });
  }

  applySubmittedDate(value: string): void {
    this.submittedDate = value || '';
    this.applicantsPage = 1;
    this.loadApplicants();
  }

  getAppStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      submitted: 'Đã nộp',
      reviewing: 'Đang xét',
      shortlisted: 'Lọt vòng',
      interviewing: 'Phỏng vấn',
      offered: 'Đề nghị',
      hired: 'Tuyển',
      rejected: 'Từ chối',
    };
    return labels[status] || status;
  }

  getAppStatusColor(status: string): string {
    const colors: Record<string, string> = {
      submitted: 'default',
      reviewing: 'processing',
      shortlisted: 'blue',
      interviewing: 'cyan',
      offered: 'gold',
      hired: 'success',
      rejected: 'error',
    };
    return colors[status] || 'default';
  }

  // --- AI Evaluation & Matching ---

  scoreFormat = (percent: number): string => `${Math.round(percent)}`;

  getScoreColor(score: number): string {
    if (score >= 70) return '#52c41a';
    if (score >= 40) return '#faad14';
    return '#ff4d4f';
  }

  getRecommendationColor(rec?: string | null): string {
    const colors: Record<string, string> = {
      STRONG_FIT: 'success',
      GOOD_FIT: 'green',
      PARTIAL_FIT: 'warning',
      WEAK_FIT: 'orange',
      NOT_FIT: 'error',
    };
    return (rec && colors[rec]) || 'default';
  }

  getRecommendationLabel(rec?: string | null): string {
    const labels: Record<string, string> = {
      STRONG_FIT: 'Rất phù hợp',
      GOOD_FIT: 'Phù hợp',
      PARTIAL_FIT: 'Phù hợp 1 phần',
      WEAK_FIT: 'Ít phù hợp',
      NOT_FIT: 'Không phù hợp',
    };
    return (rec && labels[rec]) || rec || 'Chưa chấm AI';
  }

  evaluatingStepText = 'Bước 1: Đang trích xuất cấu trúc CV...';
  private evaluatingTimer: any = null;

  triggerAi(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    this.evaluatingAppId = app.id;
    this.startEvaluatingStepAnimation();

    // Open Live Progress Modal
    this.openScoringProgress(app);

    this.jobService.triggerAiEvaluation(j.id, app.id).subscribe({
      next: () => {
        setTimeout(() => this.loadApplicants(), 3000);
        setTimeout(() => this.loadApplicants(), 6000);
        setTimeout(() => {
          this.evaluatingAppId = null;
          if (this.evaluatingTimer) clearInterval(this.evaluatingTimer);
          this.loadApplicants();
        }, 11000);
      },
      error: () => {
        this.evaluatingAppId = null;
        if (this.evaluatingTimer) clearInterval(this.evaluatingTimer);
        this.message.error('Lỗi khi gửi yêu cầu phân tích AI');
      },
    });
  }

  confirmRerunAi(app: Applicant): void {
    this.modal.confirm({
      nzTitle: 'Chấm lại hồ sơ bằng AI?',
      nzContent: `Kết quả hiện tại của ${app.candidate_name} sẽ được thay thế sau khi tiến trình mới hoàn tất.`,
      nzOkText: 'Chấm lại',
      nzCancelText: 'Hủy',
      nzOkDanger: false,
      nzOnOk: () => this.triggerAi(app),
    });
  }

  openScoringProgress(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    this.modal.create({
      nzContent: AiScoringProgressModalComponent,
      nzData: {
        jobId: j.id,
        appId: app.id,
        candidateName: app.candidate_name,
        jobTitle: j.title_vi || 'Tuyển dụng',
      },
      nzFooter: null,
      nzWidth: 640,
      nzCentered: true,
      nzMaskClosable: false,
    });
  }

  private startEvaluatingStepAnimation(): void {
    if (this.evaluatingTimer) clearInterval(this.evaluatingTimer);
    let sec = 0;
    const stepTexts = [
      'Bước 1: Đang trích xuất & phân đoạn CV...',
      'Bước 2: AI Agent đang đánh giá năng lực...',
      'Bước 3: Đang kiểm chứng chống ảo giác...',
      'Bước 4: Đang sinh câu hỏi & cẩm nang HR...',
      'Bước 5: Đang hoàn tất lưu kết quả...',
    ];
    this.evaluatingStepText = stepTexts[0];

    this.evaluatingTimer = setInterval(() => {
      sec += 1;
      if (sec >= 2 && sec < 5) this.evaluatingStepText = stepTexts[1];
      else if (sec >= 5 && sec < 8) this.evaluatingStepText = stepTexts[2];
      else if (sec >= 8 && sec < 10) this.evaluatingStepText = stepTexts[3];
      else if (sec >= 10) this.evaluatingStepText = stepTexts[4];
    }, 1000);
  }

  aiEvaluateAll(): void {
    const j = this.job();
    if (!j) return;

    this.evaluatingAll = true;
    this.jobService.triggerAiEvaluateAll(j.id).subscribe({
      next: (res) => {
        this.message.success(`Đang phân tích AI cho ${res.count} ứng viên`);
        setTimeout(() => this.loadApplicants(), 4000);
        setTimeout(() => this.loadApplicants(), 8000);
        setTimeout(() => {
          this.evaluatingAll = false;
          this.loadApplicants();
        }, 14000);
      },
      error: () => {
        this.evaluatingAll = false;
        this.message.error('Không thể kích hoạt phân tích AI');
      },
    });
  }

  openAiEvaluation(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    if (!app.has_ai_evaluation && app.ai_score == null) {
      this.message.info('Chưa có kết quả đánh giá AI. Hãy bấm "Chấm AI" trước.');
      return;
    }

    const modalData = {
      data: null as AiEvaluationResponse | null,
      loading: true,
      error: null as string | null,
      jobId: j.id,
      appId: app.id,
      candidateName: app.candidate_name,
      resumeFilename: app.resume_filename,
    };

    this.modal.create({
      nzTitle: `Đánh giá AI - ${app.candidate_name}`,
      nzContent: AiEvaluationModalComponent,
      nzWidth: 'min(1440px, calc(100vw - 32px))',
      nzBodyStyle: { padding: '16px', overflow: 'hidden' },
      nzData: modalData,
      nzFooter: null,
      nzCentered: true,
    });

    this.jobService.getAiEvaluation(j.id, app.id).subscribe({
      next: (res) => {
        modalData.data = res;
        modalData.loading = false;
      },
      error: () => {
        modalData.loading = false;
        modalData.error = 'Không thể tải kết quả đánh giá AI.';
      },
    });
  }

  openCvJdCompare(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    const modalData = {
      data: null as CvJdCompareResponse | null,
      loading: true,
      error: null as string | null,
    };

    this.modal.create({
      nzTitle: `Đối chiếu trực quan CV & JD: ${app.candidate_name}`,
      nzContent: CvJdCompareModalComponent,
      nzData: modalData,
      nzFooter: null,
      nzWidth: 'min(1250px, calc(100vw - 32px))',
      nzCentered: true,
    });

    this.jobService.getCvJdCompare(j.id, app.id).subscribe({
      next: (res) => {
        modalData.data = res;
        modalData.loading = false;
      },
      error: () => {
        modalData.loading = false;
        modalData.error = 'Không thể tải dữ liệu đối chiếu CV và JD.';
      },
    });
  }

  changeSortBy(sort: 'date' | 'ai_score'): void {
    if (this.sortBy === sort) return;
    this.sortBy = sort;
    this.applicantsPage = 1;
    this.loadApplicants();
  }

  toggleCompare(appId: number, checked: boolean): void {
    if (checked) {
      this.compareSelected.add(appId);
    } else {
      this.compareSelected.delete(appId);
    }
  }

  openCompare(): void {
    const j = this.job();
    if (!j || this.compareSelected.size !== 2) return;

    const selected = this.applicants().filter(a => this.compareSelected.has(a.id));
    if (selected.length !== 2) return;

    this.modal.create({
      nzTitle: 'So sánh ứng viên',
      nzContent: CompareCandidatesModalComponent,
      nzData: { jobId: j.id, candidates: selected },
      nzFooter: null,
      nzWidth: 800,
      nzCentered: true,
    });
  }

  openScheduleInterview(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    const ref = this.modal.create({
      nzTitle: `Đặt lịch phỏng vấn: ${app.candidate_name}`,
      nzContent: InterviewScheduleModalComponent,
      nzFooter: null,
      nzWidth: 560,
      nzCentered: true,
    });

    // Pass data to modal component
    const instance = ref.getContentComponent();
    instance.jobId = j.id;
    instance.appId = app.id;
    instance.candidateName = app.candidate_name;

    // Reload applicants when interview scheduled (status may change to interviewing)
    ref.afterClose.subscribe((result) => {
      if (result) {
        this.loadApplicants();
      }
    });
  }

  openInterviewRoom(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    const ref = this.modal.create({
      nzTitle: `Phòng phỏng vấn: ${app.candidate_name} - ${j.title_vi}`,
      nzContent: InterviewRoomModalComponent,
      nzData: {
        jobId: j.id,
        appId: app.id,
        candidateName: app.candidate_name,
      },
      nzFooter: null,
      nzWidth: 'min(1250px, calc(100vw - 32px))',
      nzBodyStyle: { maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' },
      nzCentered: true,
      nzMaskClosable: false,
    });

    ref.afterClose.subscribe(() => {
      this.loadApplicants();
    });
  }


  // --- Status management ---

  getAvailableTransitions(status: string): ApplicationStatus[] {
    const all: ApplicationStatus[] = ['submitted', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected'];
    const list = STATUS_TRANSITIONS[status] || all;
    return list.filter((s) => s !== status);
  }

  approveToShortlist(app: Applicant): void {
    const j = this.job();
    if (!j || this.transitioningApplicationId() !== null) return;

    this.transitioningApplicationId.set(app.id);
    this.jobService.updateApplicationStatus(j.id, app.id, 'shortlisted').subscribe({
      next: (updated) => {
        this.transitioningApplicationId.set(null);
        this.applicants.update((list) =>
          list.map((a) => (a.id === app.id ? { ...a, status: updated.status, public_status: updated.public_status, updated_at: updated.updated_at } : a))
        );
        this.message.success(
          `Đã duyệt "${app.candidate_name}" ĐẠT sơ loại CV! Ứng viên đã được chuyển sang Vòng 1: Hẹn lịch phỏng vấn.`,
          { nzDuration: 4500 }
        );
      },
      error: (err) => {
        this.transitioningApplicationId.set(null);
        const detail = err?.error?.detail || 'Không thể duyệt sơ loại ứng viên';
        this.message.error(detail);
      },
    });
  }

  updateStatus(app: Applicant, newStatus: ApplicationStatus): void {
    const j = this.job();
    if (!j || this.transitioningApplicationId() !== null) return;

    this.transitioningApplicationId.set(app.id);
    this.jobService.updateApplicationStatus(j.id, app.id, newStatus).subscribe({
      next: (updated) => {
        this.transitioningApplicationId.set(null);
        this.applicants.update((list) =>
          list.map((a) => (a.id === app.id ? { ...a, status: updated.status, public_status: updated.public_status, updated_at: updated.updated_at } : a))
        );
        this.message.success(`Đã chuyển trạng thái sang "${this.getAppStatusLabel(newStatus)}"`);
      },
      error: (err) => {
        this.transitioningApplicationId.set(null);
        const detail = err?.error?.detail || 'Không thể cập nhật trạng thái';
        this.message.error(detail);
      },
    });
  }

  // --- Resume viewer ---

  downloadResume(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    this.downloadingAppId = app.id;
    this.jobService.downloadResume(j.id, app.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = app.resume_filename || `${app.candidate_name}_CV.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloadingAppId = null;
      },
      error: () => {
        this.downloadingAppId = null;
        this.message.error('Không thể tải CV');
      },
    });
  }

  viewResume(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    this.resumeModalFilename = app.resume_filename;
    this.releaseResumeObjectUrl();
    this.resumeModalUrl = null;
    this.resumeModalLoading = true;
    this.resumeModalVisible = true;

    this.jobService.downloadResume(j.id, app.id).subscribe({
      next: (blob) => {
        const pdfBlob = new Blob([blob], { type: blob.type || 'application/pdf' });
        this.resumeObjectUrl = URL.createObjectURL(pdfBlob);
        this.resumeModalUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.resumeObjectUrl);
        this.resumeModalLoading = false;
      },
      error: () => {
        this.resumeModalLoading = false;
        this.resumeModalVisible = false;
        this.message.error('Không thể tải CV');
      },
    });
  }

  closeResumeModal(): void {
    this.resumeModalVisible = false;
    this.resumeModalUrl = null;
    this.releaseResumeObjectUrl();
  }

  private releaseResumeObjectUrl(): void {
    if (this.resumeObjectUrl) {
      URL.revokeObjectURL(this.resumeObjectUrl);
      this.resumeObjectUrl = null;
    }
  }

  onBack(): void {
    this.router.navigate(['/jobs']);
  }
}
