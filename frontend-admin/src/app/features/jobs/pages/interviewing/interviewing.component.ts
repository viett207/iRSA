import { Component, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { JobService } from '../../services/job.service';
import { InterviewingApplicant } from '../../models/job.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { InterviewScheduleModalComponent } from '../../components/interview-schedule-modal.component';
import { InterviewRoomModalComponent } from '../../components/interview-room-modal.component';

@Component({
  selector: 'app-interviewing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzTableModule,
    NzButtonModule,
    NzPopconfirmModule,
    NzToolTipModule,
    NzModalModule,
    InterviewRoomModalComponent,
  ],
  templateUrl: './interviewing.component.html',
  styleUrl: './interviewing.component.scss',
})
export class InterviewingComponent implements OnInit, OnDestroy {
  applicants = signal<InterviewingApplicant[]>([]);
  total = signal(0);
  loading = signal(false);
  currentTime = signal(Date.now());
  transitioningApplicationId = signal<number | null>(null);
  page = 1;
  sortBy = 'date';
  searchText = signal('');
  selectedJobId = signal(0);
  stageFilter = signal<'all' | 'open' | 'today' | 'upcoming' | 'decision'>('all');
  entryCandidate = signal<InterviewingApplicant | null>(null);
  activeRoomCandidate = signal<InterviewingApplicant | null>(null);
  private requestedApplicationId: number | null = null;
  private sub?: Subscription;
  private routeSub?: Subscription;
  private roomAvailabilityTimer: ReturnType<typeof setInterval> | null = null;

  readonly filteredApplicants = computed(() => {
    const query = this.searchText().trim().toLocaleLowerCase('vi');
    const selectedJobId = this.selectedJobId();
    const stageFilter = this.stageFilter();
    return this.applicants().filter((app) => {
      const matchesQuery = !query
        || app.candidate_name.toLocaleLowerCase('vi').includes(query)
        || app.candidate_email.toLocaleLowerCase('vi').includes(query)
        || app.job_title.toLocaleLowerCase('vi').includes(query);
      const matchesJob = !selectedJobId || app.job_id === selectedJobId;
      const matchesStage = stageFilter === 'all'
        || (stageFilter === 'open' && this.canEnterInterview(app))
        || (stageFilter === 'today' && this.isInterviewToday(app))
        || (stageFilter === 'upcoming' && this.isUpcoming(app))
        || (stageFilter === 'decision' && app.has_completed_interview);
      return matchesQuery && matchesJob && matchesStage;
    }).sort((a, b) => {
      const priority = { decision: 0, open: 1, upcoming: 2, missed: 3, unscheduled: 4 };
      const stageDifference = priority[this.getInterviewStage(a)] - priority[this.getInterviewStage(b)];
      if (stageDifference !== 0) return stageDifference;
      const aTime = a.interview_date ? new Date(a.interview_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.interview_date ? new Date(b.interview_date).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  });

  readonly jobs = computed(() => {
    const unique = new Map<number, string>();
    this.applicants().forEach((app) => unique.set(app.job_id, app.job_title));
    return Array.from(unique, ([id, title]) => ({ id, title }));
  });

  readonly todayCount = computed(() => this.applicants().filter((app) => this.isInterviewToday(app)).length);
  readonly openRoomCount = computed(() => this.applicants().filter((app) => this.canEnterInterview(app)).length);
  readonly pendingDecisionCount = computed(() => this.applicants().filter((app) => app.has_completed_interview).length);
  readonly nextInterview = computed(() => {
    const now = this.currentTime();
    return this.applicants()
      .filter((app) => {
        if (!app.interview_date || app.has_completed_interview) return false;
        if (app.interview_status === 'cancelled' || app.interview_status === 'completed') return false;
        const interviewTime = new Date(app.interview_date).getTime();
        return this.canEnterInterview(app) || interviewTime > now;
      })
      .sort((a, b) => {
        const aOpen = this.canEnterInterview(a) ? 0 : 1;
        const bOpen = this.canEnterInterview(b) ? 0 : 1;
        if (aOpen !== bOpen) return aOpen - bOpen;
        return new Date(a.interview_date!).getTime() - new Date(b.interview_date!).getTime();
      })[0] || null;
  });

  constructor(
    private jobService: JobService,
    private message: NzMessageService,
    private modal: NzModalService,
    private authService: AuthService,
    private notificationSvc: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  canManageInterview(app: InterviewingApplicant): boolean {
    return this.authService.hasRole('admin', 'leader')
      || app.job_created_by === this.authService.user()?.id;
  }

  ngOnInit(): void {
    this.routeSub = this.route.queryParamMap.subscribe((params) => {
      const id = Number(params.get('applicationId'));
      this.requestedApplicationId = Number.isFinite(id) && id > 0 ? id : null;
      this.syncEntryCandidate();
    });
    this.loadData();
    this.roomAvailabilityTimer = setInterval(() => this.currentTime.set(Date.now()), 30_000);
    this.sub = this.notificationSvc.dataChanged$.subscribe((n) => {
      if (['application', 'interview'].includes(n.type)) this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.routeSub?.unsubscribe();
    if (this.roomAvailabilityTimer) clearInterval(this.roomAvailabilityTimer);
  }

  loadData(): void {
    this.loading.set(true);
    this.jobService.getInterviewing({ page: 1, size: 100, sort_by: this.sortBy })
      .subscribe({
        next: (res) => {
          this.applicants.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
          this.syncEntryCandidate();
        },
        error: () => {
          this.message.error('Lỗi tải danh sách');
          this.loading.set(false);
        },
      });
  }

  onPageChange(page: number): void {
    this.page = page;
    this.loadData();
  }

  changeSortBy(sort: string): void {
    this.sortBy = sort;
    this.page = 1;
    this.loadData();
  }

  updateStatus(app: InterviewingApplicant, newStatus: string): void {
    if (this.transitioningApplicationId() !== null) return;
    this.transitioningApplicationId.set(app.id);
    this.jobService.updateApplicationStatus(app.job_id, app.id, newStatus).subscribe({
      next: () => {
        this.transitioningApplicationId.set(null);
        const labels: Record<string, string> = {
          offered: 'Đề xuất tuyển dụng',
          rejected: 'Không đạt',
          shortlisted: 'Quay lại shortlist',
        };
        this.message.success(`${app.candidate_name}: ${labels[newStatus] || newStatus}`);
        this.applicants.update(list => list.filter(a => a.id !== app.id));
        this.total.update(t => t - 1);
      },
      error: (err) => {
        this.transitioningApplicationId.set(null);
        this.message.error(err.error?.detail || 'Lỗi cập nhật trạng thái');
      },
    });
  }

  openScheduleInterview(app: InterviewingApplicant): void {
    const ref = this.modal.create({
      nzTitle: `Đặt lịch phỏng vấn: ${app.candidate_name}`,
      nzContent: InterviewScheduleModalComponent,
      nzFooter: null,
      nzWidth: 560,
      nzCentered: true,
    });
    const instance = ref.getContentComponent();
    instance.jobId = app.job_id;
    instance.appId = app.id;
    instance.candidateName = app.candidate_name;

    ref.afterClose.subscribe((result) => {
      if (result) this.loadData();
    });
  }

  openInterviewRoom(app: InterviewingApplicant): void {
    this.entryCandidate.set(app);
    this.requestedApplicationId = app.id;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { applicationId: app.id, confirm: 'room' },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  cancelInterviewEntry(): void {
    this.entryCandidate.set(null);
    this.activeRoomCandidate.set(null);
    this.requestedApplicationId = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { applicationId: null, confirm: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  confirmInterviewEntry(): void {
    const app = this.entryCandidate();
    if (!app || !this.canEnterInterview(app)) return;
    this.entryCandidate.set(null);
    this.activeRoomCandidate.set(app);
  }

  closeEmbeddedRoom(): void {
    this.activeRoomCandidate.set(null);
    this.requestedApplicationId = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { applicationId: null, confirm: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.loadData();
  }

  private syncEntryCandidate(): void {
    if (this.activeRoomCandidate()) return;
    if (this.requestedApplicationId == null) {
      this.entryCandidate.set(null);
      return;
    }
    const candidate = this.applicants().find((app) => app.id === this.requestedApplicationId) ?? null;
    this.entryCandidate.set(candidate);
  }

  getCandidateInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'UV';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  formatDateTime(date: string | null): string {
    if (!date) return 'Chưa có lịch cụ thể';
    return new Date(date).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  canEnterInterview(app: InterviewingApplicant): boolean {
    if (!app.interview_date || app.interview_status === 'cancelled' || app.interview_status === 'completed') return false;
    const interviewTime = new Date(app.interview_date).getTime();
    const now = this.currentTime();
    return now >= interviewTime - 10 * 60_000 && now <= interviewTime + 120 * 60_000;
  }

  getRoomAvailabilityLabel(app: InterviewingApplicant): string {
    if (!app.interview_date) return 'Ứng viên chưa có lịch phỏng vấn';
    if (app.interview_status === 'cancelled') return 'Lịch phỏng vấn đã hủy';
    if (app.interview_status === 'completed') return 'Buổi phỏng vấn đã hoàn thành';
    const interviewTime = new Date(app.interview_date).getTime();
    const now = this.currentTime();
    if (now < interviewTime - 10 * 60_000) return 'Phòng mở trước giờ hẹn 10 phút';
    if (now > interviewTime + 120 * 60_000) return 'Đã quá thời gian tham gia';
    return 'Phòng phỏng vấn đang mở';
  }

  setStageFilter(filter: 'all' | 'open' | 'today' | 'upcoming' | 'decision'): void {
    this.stageFilter.set(filter);
  }

  isInterviewToday(app: InterviewingApplicant): boolean {
    if (!app.interview_date) return false;
    const date = new Date(app.interview_date);
    const today = new Date(this.currentTime());
    return date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth()
      && date.getDate() === today.getDate();
  }

  isUpcoming(app: InterviewingApplicant): boolean {
    if (!app.interview_date || app.has_completed_interview) return false;
    return new Date(app.interview_date).getTime() > this.currentTime() + 120 * 60_000;
  }

  getInterviewStage(app: InterviewingApplicant): 'open' | 'upcoming' | 'decision' | 'missed' | 'unscheduled' {
    if (app.has_completed_interview || app.interview_status === 'completed') return 'decision';
    if (!app.interview_date) return 'unscheduled';
    if (this.canEnterInterview(app)) return 'open';
    if (new Date(app.interview_date).getTime() > this.currentTime()) return 'upcoming';
    return 'missed';
  }

  getInterviewStageLabel(app: InterviewingApplicant): string {
    const labels = {
      open: 'Phòng đang mở',
      upcoming: 'Sắp diễn ra',
      decision: 'Chờ chốt kết quả',
      missed: 'Đã quá giờ',
      unscheduled: 'Chưa có lịch',
    };
    return labels[this.getInterviewStage(app)];
  }

  getQuestionReadinessLabel(app: InterviewingApplicant): string {
    if (app.question_status === 'ready') return `${app.question_count || 0} câu sẵn sàng`;
    if (app.question_status === 'draft') return 'Đang chuẩn bị';
    return 'Chưa chuẩn bị · Tùy chọn';
  }

  formatInterviewDate(date: string | null): string {
    if (!date) return 'Chưa có lịch';
    return new Date(date).toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatInterviewTime(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#52c41a';
    if (score >= 40) return '#faad14';
    return '#ff4d4f';
  }

  formatDate(date: string | null): string {
    if (!date) return '--';
    return new Date(date).toLocaleDateString('vi-VN');
  }
}
