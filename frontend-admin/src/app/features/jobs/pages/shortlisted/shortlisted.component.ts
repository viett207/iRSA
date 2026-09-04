import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzCalendarModule } from 'ng-zorro-antd/calendar';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCardModule } from 'ng-zorro-antd/card';

import { JobService } from '../../services/job.service';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  ShortlistedApplicant,
  CalendarInterviewEvent,
  AiEvaluationResponse,
  CvJdCompareResponse,
  APPLICATION_STATUS_COLORS,
} from '../../models/job.model';
import { AiEvaluationModalComponent } from '../../components/ai-evaluation-modal.component';
import { CompareCandidatesModalComponent } from '../../components/compare-candidates-modal.component';
import { CvJdCompareModalComponent } from '../../components/cv-jd-compare-modal.component';
import { InterviewScheduleModalComponent } from '../../components/interview-schedule-modal.component';
import { InterviewChatModalComponent } from '../../components/interview-chat-modal.component';

export interface JobApplicantGroup {
  jobId: number;
  jobTitle: string;
  applicants: ShortlistedApplicant[];
}

interface JobInterviewOverview extends JobApplicantGroup {
  total: number;
  scheduled: number;
  unscheduled: number;
  pendingConfirmation: number;
  priorityUnscheduled: number;
  averageMatching: number | null;
  averageAi: number | null;
  nextInterview: ShortlistedApplicant | null;
  nextApplicant: ShortlistedApplicant | null;
}

interface WorkspaceInterviewQuestion {
  id: string;
  selected: boolean;
  source: 'ai' | 'hr';
  question: string;
  category: string;
  target_skill: string | null;
  purpose: string;
  good_signs?: string[];
  red_flags?: string[];
  grading_guide?: string;
  originalQuestion: string;
  originalPurpose: string;
  edited: boolean;
}

type QuestionPreparationStatus = 'unreviewed' | 'draft' | 'ready';

@Component({
  selector: 'app-shortlisted',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzProgressModule,
    NzModalModule,
    NzSpaceModule,
    NzToolTipModule,
    NzSpinModule,
    NzAlertModule,
    NzDividerModule,
    NzDescriptionsModule,
    NzEmptyModule,
    NzBadgeModule,
    NzDropDownModule,
    NzPopconfirmModule,
    NzCheckboxModule,
    NzCalendarModule,
    NzInputModule,
    NzSelectModule,
    NzCardModule,
  ],
  templateUrl: './shortlisted.component.html',
  styleUrl: './shortlisted.component.scss',
})
export class ShortlistedComponent implements OnInit, OnDestroy {
  applicants = signal<ShortlistedApplicant[]>([]);
  calendarEvents = signal<CalendarInterviewEvent[]>([]);
  total = signal(0);
  loading = signal(false);
  calendarLoading = signal(false);
  transitioningApplicationId = signal<number | null>(null);
  currentTime = signal(Date.now());
  private roomAvailabilityTimer: ReturnType<typeof setInterval> | null = null;

  // Bảng tổng hợp là điểm vào chính; từ đây HR đi sâu vào hàng đợi hoặc lịch.
  viewMode = signal<'grouped' | 'calendar' | 'flat'>('flat');
  expandedJobIds = signal<Set<number>>(new Set());
  selectedCalendarDate = signal<Date>(new Date());

  // Filters & Search
  searchQuery = signal('');
  selectedJobFilter = signal<number | null>(null);
  scheduleFilter = signal<'all' | 'scheduled' | 'unscheduled'>('all');
  aiPriorityFilter = signal<'all' | 'attention'>('all');
  questionFilter = signal<'all' | 'needs-preparation' | 'ready'>('all');
  quickViewApplicationId = signal<number | null>(null);
  quickViewLoadingId = signal<number | null>(null);
  quickViewData = signal<Record<number, AiEvaluationResponse | null>>({});
  comparisonLoadingId = signal<number | null>(null);
  comparisonData = signal<Record<number, CvJdCompareResponse | null>>({});
  workspaceApplicantId = signal<number | null>(null);
  workspaceTab = signal<'report' | 'documents' | 'questions' | 'schedule'>('report');
  queueCollapsed = signal(false);
  documentMode = signal<'cv' | 'jd' | 'split'>('split');
  workspaceResumeLoading = signal(false);
  workspaceResumeError = signal<string | null>(null);
  workspaceResumeUrl = signal<SafeResourceUrl | null>(null);
  workspaceQuestions = signal<Record<number, WorkspaceInterviewQuestion[]>>({});
  questionPreparationState = signal<Record<number, QuestionPreparationStatus>>({});
  questionsSaving = signal(false);
  questionsGeneratingId = signal<number | null>(null);
  private workspaceResumeObjectUrl: string | null = null;
  sortBy = 'date';
  page = 1;
  compareSelected = new Set<number>();

  scoreFormat = (percent: number): string => `${Math.round(percent)}`;

  // KPI Metrics
  scheduledCount = computed(() => this.applicants().filter(
    (a) => a.interview_date != null && a.interview_status !== 'cancelled'
  ).length);
  unscheduledCount = computed(() => this.applicants().filter(
    (a) => a.interview_date == null || a.interview_status === 'cancelled'
  ).length);
  selectedWorkspaceApplicant = computed(() => {
    const id = this.workspaceApplicantId();
    return id == null ? null : this.applicants().find((app) => app.id === id) ?? null;
  });
  upcomingCalendarEvents = computed(() => {
    const now = this.currentTime();
    return this.calendarEvents()
      .filter((event) => event.status !== 'cancelled' && new Date(event.interview_date).getTime() >= now)
      .sort((a, b) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime())
      .slice(0, 5);
  });

  // Filtered applicants
  filteredApplicants = computed(() => {
    let list = this.applicants();
    const q = this.searchQuery().trim().toLowerCase();
    const jf = this.selectedJobFilter();
    const sf = this.scheduleFilter();
    const af = this.aiPriorityFilter();
    const qf = this.questionFilter();

    if (jf !== null) {
      list = list.filter((a) => a.job_id === jf);
    }
    if (sf === 'scheduled') {
      list = list.filter((a) => a.interview_date != null && a.interview_status !== 'cancelled');
    } else if (sf === 'unscheduled') {
      list = list.filter((a) => a.interview_date == null || a.interview_status === 'cancelled');
    }
    if (af === 'attention') {
      list = list.filter((a) => this.needsReview(a));
    }
    if (qf === 'needs-preparation') {
      list = list.filter((a) => this.getQuestionPreparationStatus(a) !== 'ready');
    } else if (qf === 'ready') {
      list = list.filter((a) => this.getQuestionPreparationStatus(a) === 'ready');
    }
    if (q) {
      list = list.filter(
        (a) =>
          a.candidate_name.toLowerCase().includes(q) ||
          a.candidate_email.toLowerCase().includes(q) ||
          a.job_title.toLowerCase().includes(q)
      );
    }
    return list;
  });

  // Grouped by Job
  groupedJobs = computed<JobApplicantGroup[]>(() => {
    const list = this.filteredApplicants();
    const map = new Map<number, JobApplicantGroup>();

    for (const app of list) {
      if (!map.has(app.job_id)) {
        map.set(app.job_id, {
          jobId: app.job_id,
          jobTitle: app.job_title,
          applicants: [],
        });
      }
      map.get(app.job_id)!.applicants.push(app);
    }

    return Array.from(map.values());
  });

  jobInterviewOverview = computed<JobInterviewOverview[]>(() => {
    const now = this.currentTime();

    return this.groupedJobs().map((group) => {
      const scheduledApplicants = group.applicants.filter(
        (app) => !!app.interview_date && app.interview_status !== 'cancelled'
      );
      const unscheduledApplicants = group.applicants.filter(
        (app) => !app.interview_date || app.interview_status === 'cancelled'
      );
      const priorityUnscheduledApplicants = unscheduledApplicants.filter(
        (app) => (app.ai_score ?? 0) >= 80 || (app.total_score ?? 0) >= 80
      );
      const upcoming = scheduledApplicants
        .filter((app) => new Date(app.interview_date!).getTime() >= now)
        .sort((a, b) => new Date(a.interview_date!).getTime() - new Date(b.interview_date!).getTime());
      const rankedUnscheduled = [...unscheduledApplicants].sort(
        (a, b) => Math.max(b.ai_score ?? 0, b.total_score ?? 0) - Math.max(a.ai_score ?? 0, a.total_score ?? 0)
      );
      const matchingScores = group.applicants
        .map((app) => app.total_score)
        .filter((score): score is number => score != null);
      const aiScores = group.applicants
        .map((app) => app.ai_score)
        .filter((score): score is number => score != null);

      return {
        ...group,
        total: group.applicants.length,
        scheduled: scheduledApplicants.length,
        unscheduled: unscheduledApplicants.length,
        pendingConfirmation: scheduledApplicants.filter((app) => app.interview_status !== 'completed').length,
        priorityUnscheduled: priorityUnscheduledApplicants.length,
        averageMatching: this.averageScore(matchingScores),
        averageAi: this.averageScore(aiScores),
        nextInterview: upcoming[0] ?? null,
        nextApplicant: priorityUnscheduledApplicants[0] ?? rankedUnscheduled[0] ?? null,
      };
    }).sort((a, b) => {
      if (a.priorityUnscheduled !== b.priorityUnscheduled) return b.priorityUnscheduled - a.priorityUnscheduled;
      if (a.unscheduled !== b.unscheduled) return b.unscheduled - a.unscheduled;
      return a.jobTitle.localeCompare(b.jobTitle, 'vi');
    });
  });

  overviewUnscheduledCount = computed(() =>
    this.jobInterviewOverview().reduce((sum, job) => sum + job.unscheduled, 0)
  );

  overviewPriorityCount = computed(() =>
    this.jobInterviewOverview().reduce((sum, job) => sum + job.priorityUnscheduled, 0)
  );

  // Unique list of jobs for filter dropdown
  jobsOptions = computed(() => {
    const map = new Map<number, string>();
    for (const app of this.applicants()) {
      map.set(app.job_id, app.job_title);
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  });

  // Events on selected calendar date
  selectedDateEvents = computed(() => {
    const d = this.selectedCalendarDate();
    const dateStr = this.toDateKey(d);
    const jobId = this.selectedJobFilter();
    return this.calendarEvents()
      .filter((e) => this.toDateKey(new Date(e.interview_date)) === dateStr && (jobId == null || e.job_id === jobId))
      .sort((a, b) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime());
  });

  constructor(
    private jobService: JobService,
    private message: NzMessageService,
    private modal: NzModalService,
    private sanitizer: DomSanitizer,
    private router: Router,
    public authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadShortlisted();
    this.loadCalendarEvents();
    this.roomAvailabilityTimer = setInterval(() => this.currentTime.set(Date.now()), 30_000);
  }

  ngOnDestroy(): void {
    if (this.roomAvailabilityTimer) clearInterval(this.roomAvailabilityTimer);
    this.releaseWorkspaceResume();
  }

  toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  loadShortlisted(): void {
    this.loading.set(true);
    this.jobService.getShortlisted({ page: this.page, sort_by: this.sortBy }).subscribe({
      next: (res) => {
        this.applicants.set(res.items);
        this.questionPreparationState.update((current) => {
          const next = { ...current };
          for (const app of res.items) {
            if (!next[app.id]) next[app.id] = app.question_status ?? 'unreviewed';
          }
          return next;
        });
        this.total.set(res.total);
        this.loading.set(false);

        // Auto-expand all jobs by default
        const jobIds = new Set<number>(res.items.map((a) => a.job_id));
        this.expandedJobIds.set(jobIds);
      },
      error: () => {
        this.message.error('Không thể tải danh sách ứng viên đạt');
        this.loading.set(false);
      },
    });
  }

  loadCalendarEvents(): void {
    this.calendarLoading.set(true);
    this.jobService.getCalendarInterviews().subscribe({
      next: (events) => {
        this.calendarEvents.set(events);
        this.calendarLoading.set(false);
      },
      error: () => {
        this.calendarLoading.set(false);
      },
    });
  }

  setViewMode(mode: 'grouped' | 'calendar' | 'flat'): void {
    this.viewMode.set(mode);
    if (mode === 'calendar') {
      this.loadCalendarEvents();
    }
  }

  openPositionQueue(job: JobInterviewOverview): void {
    this.selectedJobFilter.set(job.jobId);
    this.scheduleFilter.set(job.unscheduled > 0 ? 'unscheduled' : 'all');
    this.aiPriorityFilter.set('all');
    this.viewMode.set('grouped');
    if (job.nextApplicant) {
      this.selectWorkspaceApplicant(job.nextApplicant);
    } else {
      this.clearWorkspaceApplicant();
    }
  }

  openPositionCalendar(job: JobInterviewOverview): void {
    this.selectedJobFilter.set(job.jobId);
    if (job.nextInterview?.interview_date) {
      this.selectedCalendarDate.set(new Date(job.nextInterview.interview_date));
    }
    this.setViewMode('calendar');
  }

  getSchedulingProgress(job: JobInterviewOverview): number {
    return job.total === 0 ? 0 : Math.round((job.scheduled / job.total) * 100);
  }

  getOverviewActionLabel(job: JobInterviewOverview): string {
    if (job.priorityUnscheduled > 0) return `Xử lý ${job.priorityUnscheduled} hồ sơ ưu tiên`;
    if (job.unscheduled > 0) return `Xếp lịch ${job.unscheduled} hồ sơ`;
    return 'Mở hàng đợi vị trí';
  }

  private averageScore(scores: number[]): number | null {
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  hasWorkspaceFilters(): boolean {
    return !!this.searchQuery().trim()
      || this.selectedJobFilter() !== null
      || this.scheduleFilter() !== 'all'
      || this.aiPriorityFilter() !== 'all'
      || this.questionFilter() !== 'all'
      || this.sortBy !== 'date';
  }

  clearWorkspaceFilters(): void {
    this.searchQuery.set('');
    this.selectedJobFilter.set(null);
    this.scheduleFilter.set('all');
    this.aiPriorityFilter.set('all');
    this.questionFilter.set('all');
    if (this.sortBy !== 'date') {
      this.changeSortBy('date');
    }
  }

  selectWorkspaceApplicant(app: ShortlistedApplicant): void {
    this.workspaceApplicantId.set(app.id);
    this.workspaceTab.set('report');
    this.ensureEvaluationLoaded(app);
    this.ensureComparisonLoaded(app);
    this.ensureWorkspaceQuestions(app);
    this.loadWorkspaceResume(app);
  }

  clearWorkspaceApplicant(): void {
    this.workspaceApplicantId.set(null);
  }

  setWorkspaceTab(tab: 'report' | 'documents' | 'questions' | 'schedule'): void {
    this.workspaceTab.set(tab);
  }

  toggleQueueCollapsed(): void {
    this.queueCollapsed.update((collapsed) => !collapsed);
  }

  setDocumentMode(mode: 'cv' | 'jd' | 'split'): void {
    this.documentMode.set(mode);
  }

  toggleJobExpanded(jobId: number): void {
    this.expandedJobIds.update((set) => {
      const next = new Set(set);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }

  isJobExpanded(jobId: number): boolean {
    return this.expandedJobIds().has(jobId);
  }

  isAllExpanded = computed(() => {
    const groups = this.groupedJobs();
    if (groups.length === 0) return false;
    const current = this.expandedJobIds();
    return groups.every((g) => current.has(g.jobId));
  });

  toggleExpandAll(): void {
    if (this.isAllExpanded()) {
      this.expandedJobIds.set(new Set());
    } else {
      const ids = new Set<number>(this.groupedJobs().map((g) => g.jobId));
      this.expandedJobIds.set(ids);
    }
  }

  expandAll(): void {
    const ids = new Set<number>(this.groupedJobs().map((g) => g.jobId));
    this.expandedJobIds.set(ids);
  }

  collapseAll(): void {
    this.expandedJobIds.set(new Set());
  }

  onCalendarSelect(date: Date): void {
    this.selectedCalendarDate.set(date);
  }

  moveSelectedMonth(offset: number): void {
    const current = this.selectedCalendarDate();
    const target = new Date(current.getFullYear(), current.getMonth() + offset, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(current.getDate(), lastDay));
    this.selectedCalendarDate.set(target);
  }

  selectToday(): void {
    this.selectedCalendarDate.set(new Date());
  }

  formatMonthLabel(date: Date): string {
    return `Tháng ${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  getEventsOnDate(date: Date): CalendarInterviewEvent[] {
    const key = this.toDateKey(date);
    const jobId = this.selectedJobFilter();
    return this.calendarEvents().filter(
      (e) => this.toDateKey(new Date(e.interview_date)) === key && (jobId == null || e.job_id === jobId)
    );
  }

  changeSortBy(sort: string): void {
    this.sortBy = sort;
    this.page = 1;
    this.loadShortlisted();
  }

  onPageChange(p: number): void {
    this.page = p;
    this.loadShortlisted();
  }

  isOwner(app: ShortlistedApplicant): boolean {
    return true;
  }

  getScoreColor(score: number): string {
    if (score >= 80) return '#526a59';
    if (score >= 50) return '#8a744b';
    return '#9f5f5a';
  }

  toggleAiQuickView(app: ShortlistedApplicant): void {
    if (this.quickViewApplicationId() === app.id) {
      this.quickViewApplicationId.set(null);
      return;
    }

    this.quickViewApplicationId.set(app.id);
    this.ensureEvaluationLoaded(app);
  }

  private ensureEvaluationLoaded(app: ShortlistedApplicant): void {
    if (this.quickViewData()[app.id] !== undefined || !app.has_ai_evaluation) return;
    this.quickViewLoadingId.set(app.id);
    this.jobService.getAiEvaluation(app.job_id, app.id).subscribe({
      next: (result) => {
        this.quickViewData.update((current) => ({ ...current, [app.id]: result }));
        this.initializeWorkspaceQuestions(app.id, result);
        this.quickViewLoadingId.set(null);
      },
      error: () => {
        this.quickViewData.update((current) => ({ ...current, [app.id]: null }));
        this.quickViewLoadingId.set(null);
      },
    });
  }

  private ensureComparisonLoaded(app: ShortlistedApplicant): void {
    if (this.comparisonData()[app.id] !== undefined) return;
    this.comparisonLoadingId.set(app.id);
    this.jobService.getCvJdCompare(app.job_id, app.id).subscribe({
      next: (result) => {
        this.comparisonData.update((current) => ({ ...current, [app.id]: result }));
        this.comparisonLoadingId.set(null);
      },
      error: () => {
        this.comparisonData.update((current) => ({ ...current, [app.id]: null }));
        this.comparisonLoadingId.set(null);
      },
    });
  }

  getQuickView(appId: number): AiEvaluationResponse | null | undefined {
    return this.quickViewData()[appId];
  }

  getWorkspaceComparison(appId: number): CvJdCompareResponse | null | undefined {
    return this.comparisonData()[appId];
  }

  getWorkspaceQuestions(appId: number): WorkspaceInterviewQuestion[] {
    return this.workspaceQuestions()[appId] || [];
  }

  getSelectedQuestionCount(appId: number): number {
    return this.getWorkspaceQuestions(appId).filter((question) => question.selected).length;
  }

  getEditedQuestionCount(appId: number): number {
    return this.getWorkspaceQuestions(appId).filter((question) => question.edited).length;
  }

  getAiQuestionCount(appId: number): number {
    return this.getWorkspaceQuestions(appId).filter((question) => question.source === 'ai').length;
  }

  getHrQuestionCount(appId: number): number {
    return this.getWorkspaceQuestions(appId).filter((question) => question.source === 'hr').length;
  }

  getQuestionPreparationStatus(app: ShortlistedApplicant): QuestionPreparationStatus {
    return this.questionPreparationState()[app.id] ?? app.question_status ?? 'unreviewed';
  }

  getQuestionPreparationLabel(app: ShortlistedApplicant): string {
    const labels: Record<QuestionPreparationStatus, string> = {
      unreviewed: 'Câu hỏi AI: Chưa chuẩn bị',
      draft: 'Câu hỏi AI: Đang chỉnh',
      ready: 'Câu hỏi AI: Sẵn sàng',
    };
    return labels[this.getQuestionPreparationStatus(app)];
  }

  getQuestionPreparationCount(app: ShortlistedApplicant): number {
    const loaded = this.getWorkspaceQuestions(app.id);
    return loaded.length || app.question_count || 0;
  }

  private markQuestionsDraft(appId: number): void {
    this.questionPreparationState.update((current) => ({ ...current, [appId]: 'draft' }));
  }

  addWorkspaceQuestion(appId: number): void {
    const question: WorkspaceInterviewQuestion = {
      id: `hr-${Date.now()}`,
      selected: true,
      source: 'hr',
      question: '',
      category: 'custom',
      target_skill: null,
      purpose: 'Câu hỏi bổ sung của nhà tuyển dụng',
      originalQuestion: '',
      originalPurpose: '',
      edited: true,
    };
    this.workspaceQuestions.update((current) => ({
      ...current,
      [appId]: [...(current[appId] || []), question],
    }));
    this.markQuestionsDraft(appId);
  }

  requestAiWorkspaceQuestions(app: ShortlistedApplicant): void {
    if (this.questionsGeneratingId() !== null) return;

    const comparison = this.getWorkspaceComparison(app.id);
    const missingSkills = comparison?.missing_skills?.slice(0, 4) || [];
    const focusTopic = missingSkills.length > 0
      ? `Xác minh các khoảng thiếu so với JD: ${missingSkills.join(', ')}`
      : 'Xác minh kỹ năng bắt buộc, kinh nghiệm thực tế và cách xử lý tình huống công việc';

    this.questionsGeneratingId.set(app.id);
    this.jobService.generateAiQuestions(app.job_id, app.id, focusTopic, 3).subscribe({
      next: (response) => {
        this.questionsGeneratingId.set(null);
        const generated = Array.isArray(response?.questions) ? response.questions : [];
        if (generated.length === 0) {
          this.message.warning('AI chưa tạo được câu hỏi phù hợp. Vui lòng thử lại.');
          return;
        }

        const current = this.getWorkspaceQuestions(app.id);
        const existingTexts = new Set(current.map((item) => item.question.trim().toLocaleLowerCase('vi')));
        const requestId = Date.now();
        const additions = this.mapWorkspaceQuestions(generated)
          .filter((item) => !existingTexts.has(item.question.trim().toLocaleLowerCase('vi')))
          .map((item, index) => ({ ...item, id: `ai-generated-${requestId}-${index}` }));

        if (additions.length === 0) {
          this.message.info('Các câu hỏi AI vừa đề xuất đã có trong bộ câu hỏi hiện tại.');
          return;
        }

        this.workspaceQuestions.update((state) => ({
          ...state,
          [app.id]: [...current, ...additions],
        }));
        this.markQuestionsDraft(app.id);
        this.message.success(`AI đã đề xuất thêm ${additions.length} câu hỏi. Hãy rà soát trước khi xác nhận.`);
      },
      error: (error) => {
        this.questionsGeneratingId.set(null);
        this.message.error(error?.error?.detail || 'Không thể yêu cầu AI sinh thêm câu hỏi');
      },
    });
  }

  updateWorkspaceQuestion(
    appId: number,
    questionId: string,
    changes: Partial<WorkspaceInterviewQuestion>,
  ): void {
    this.workspaceQuestions.update((current) => ({
      ...current,
      [appId]: (current[appId] || []).map((question) =>
        question.id === questionId
          ? {
              ...question,
              ...changes,
              edited: changes.question !== undefined || changes.purpose !== undefined
                ? (changes.question ?? question.question) !== question.originalQuestion
                  || (changes.purpose ?? question.purpose) !== question.originalPurpose
                : question.edited,
            }
          : question
      ),
    }));
    this.markQuestionsDraft(appId);
  }

  removeWorkspaceQuestion(appId: number, questionId: string): void {
    this.workspaceQuestions.update((current) => ({
      ...current,
      [appId]: (current[appId] || []).filter((question) => question.id !== questionId),
    }));
    this.markQuestionsDraft(appId);
  }

  saveWorkspaceQuestions(app: ShortlistedApplicant): void {
    const currentQuestions = this.getWorkspaceQuestions(app.id);
    const nonEmptyQuestions = currentQuestions.filter((item) => item.question.trim().length > 0);
    const removedEmptyCount = currentQuestions.length - nonEmptyQuestions.length;

    if (removedEmptyCount > 0) {
      this.workspaceQuestions.update((current) => ({
        ...current,
        [app.id]: nonEmptyQuestions,
      }));
    }

    const questions = this.getWorkspaceQuestionPayload(app.id);

    if (questions.length === 0) {
      this.message.warning(removedEmptyCount > 0
        ? 'Đã xóa câu hỏi trống. Hãy chọn ít nhất một câu hỏi có nội dung.'
        : 'Hãy chọn ít nhất một câu hỏi để sử dụng trong phòng phỏng vấn AI');
      return;
    }

    if (removedEmptyCount > 0) {
      this.message.info(`Đã tự động xóa ${removedEmptyCount} câu hỏi chưa có nội dung.`);
    }

    if (!app.interview_date || app.interview_status === 'cancelled') {
      this.questionPreparationState.update((current) => ({ ...current, [app.id]: 'draft' }));
      this.message.success('Đã giữ bản nháp; hãy đặt lịch trước khi xác nhận bộ câu hỏi chính thức');
      return;
    }

    this.persistWorkspaceQuestions(app, questions);
  }

  private getWorkspaceQuestionPayload(appId: number): Array<Record<string, unknown>> {
    return this.getWorkspaceQuestions(appId)
      .filter((item) => item.selected && item.question.trim())
      .map(({ id: _id, selected: _selected, source, originalQuestion: _originalQuestion, originalPurpose: _originalPurpose, edited, ...question }) => ({
        ...question,
        question: question.question.trim(),
        is_custom: source === 'hr',
        hr_edited: edited,
        hr_reviewed: true,
      }));
  }

  private persistWorkspaceQuestions(
    app: ShortlistedApplicant,
    questions: Array<Record<string, unknown>> = this.getWorkspaceQuestionPayload(app.id),
  ): void {
    if (questions.length === 0) return;
    this.questionsSaving.set(true);
    this.jobService.saveInterviewQuestions(app.job_id, app.id, questions).subscribe({
      next: () => {
        this.questionsSaving.set(false);
        const editedCount = this.getEditedQuestionCount(app.id);
        this.questionPreparationState.update((current) => ({ ...current, [app.id]: 'ready' }));
        this.applicants.update((items) => items.map((item) => item.id === app.id
          ? { ...item, question_status: 'ready', question_count: questions.length, question_edited_count: editedCount }
          : item));
        this.message.success(`Đã xác nhận ${questions.length} câu hỏi cho phòng phỏng vấn AI`);
      },
      error: () => {
        this.questionsSaving.set(false);
        this.message.error('Không thể lưu bộ câu hỏi phỏng vấn');
      },
    });
  }

  private ensureWorkspaceQuestions(app: ShortlistedApplicant): void {
    if (this.workspaceQuestions()[app.id]) return;
    if (app.interview_date && app.interview_status !== 'cancelled') {
      this.jobService.getInterviewData(app.job_id, app.id).subscribe({
        next: (data) => {
          const officialQuestions = Array.isArray(data?.questions) ? data.questions : [];
          this.workspaceQuestions.update((current) => ({
            ...current,
            [app.id]: this.mapWorkspaceQuestions(officialQuestions),
          }));
        },
        error: () => {
          const cached = this.quickViewData()[app.id];
          if (cached) this.initializeWorkspaceQuestions(app.id, cached);
        },
      });
      return;
    }
    const cached = this.quickViewData()[app.id];
    if (cached) this.initializeWorkspaceQuestions(app.id, cached);
  }

  private initializeWorkspaceQuestions(appId: number, result: AiEvaluationResponse): void {
    if (this.workspaceQuestions()[appId]) return;
    const questions = this.mapWorkspaceQuestions(result.ai_evaluation?.interview_questions || []);
    this.workspaceQuestions.update((current) => ({ ...current, [appId]: questions }));
  }

  private mapWorkspaceQuestions(questions: any[]): WorkspaceInterviewQuestion[] {
    return questions.map((question, index) => ({
      id: `${question.is_custom ? 'hr' : 'ai'}-${index}`,
      selected: true,
      source: question.is_custom ? 'hr' : 'ai',
      question: question.question || '',
      category: question.category || 'technical',
      target_skill: question.target_skill || null,
      purpose: question.purpose || 'Đánh giá năng lực ứng viên',
      good_signs: question.good_signs,
      red_flags: question.red_flags,
      grading_guide: question.grading_guide,
      originalQuestion: question.question || '',
      originalPurpose: question.purpose || 'Đánh giá năng lực ứng viên',
      edited: question.hr_edited === true || question.is_custom === true,
    }));
  }

  private loadWorkspaceResume(app: ShortlistedApplicant): void {
    this.releaseWorkspaceResume();
    this.workspaceResumeLoading.set(true);
    this.workspaceResumeError.set(null);
    this.jobService.downloadResume(app.job_id, app.id).subscribe({
      next: (blob) => {
        const pdfBlob = new Blob([blob], { type: blob.type || 'application/pdf' });
        this.workspaceResumeObjectUrl = URL.createObjectURL(pdfBlob);
        this.workspaceResumeUrl.set(
          this.sanitizer.bypassSecurityTrustResourceUrl(this.workspaceResumeObjectUrl)
        );
        this.workspaceResumeLoading.set(false);
      },
      error: () => {
        this.workspaceResumeLoading.set(false);
        this.workspaceResumeError.set('Không thể tải bản xem trước CV.');
      },
    });
  }

  private releaseWorkspaceResume(): void {
    if (this.workspaceResumeObjectUrl) URL.revokeObjectURL(this.workspaceResumeObjectUrl);
    this.workspaceResumeObjectUrl = null;
    this.workspaceResumeUrl.set(null);
  }

  getRecommendationLabel(recommendation?: string | null): string {
    const labels: Record<string, string> = {
      STRONG_FIT: 'Rất phù hợp',
      GOOD_FIT: 'Phù hợp',
      PARTIAL_FIT: 'Phù hợp một phần',
      WEAK_FIT: 'Ít phù hợp',
      NOT_FIT: 'Không phù hợp',
    };
    return recommendation ? labels[recommendation] || recommendation : 'Cần HR xem xét';
  }

  getEducationLabel(level?: string | null): string {
    const labels: Record<string, string> = {
      high_school: 'THPT',
      bachelor: 'Cử nhân / Đại học',
      master: 'Thạc sĩ',
      phd: 'Tiến sĩ',
    };
    return level ? labels[level] || level : 'Không yêu cầu';
  }

  hasQuickEvaluation(appId: number): boolean {
    return !!this.quickViewData()[appId]?.ai_evaluation;
  }

  getQuickStrength(appId: number): string {
    return this.quickViewData()[appId]?.ai_evaluation?.strengths?.[0]
      || 'Chưa có bằng chứng nổi bật được ghi nhận.';
  }

  getQuickConcern(appId: number): string {
    return this.quickViewData()[appId]?.ai_evaluation?.concerns?.[0]
      || 'Chưa phát hiện khoảng thiếu đáng kể.';
  }

  getQuickQuestion(appId: number): string {
    return this.quickViewData()[appId]?.ai_evaluation?.interview_questions?.[0]?.question
      || 'Đánh giá chưa tạo câu hỏi phỏng vấn.';
  }

  getMatchingScore(app: ShortlistedApplicant): number | null {
    return app.total_score == null ? null : Math.round(app.total_score);
  }

  needsReview(app: ShortlistedApplicant): boolean {
    if (app.status === 'reviewing') return true;
    if (app.ai_score == null || app.total_score == null) return false;
    return app.ai_score < 60 || Math.abs(app.ai_score - app.total_score) >= 20;
  }

  getCandidateInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'UV';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  getScheduleStatusLabel(app: ShortlistedApplicant): string {
    if (!app.interview_date) return 'Chưa xếp lịch';
    if (app.interview_status === 'completed') return 'Đã hoàn thành';
    if (app.interview_status === 'cancelled' || app.candidate_response === 'declined') return 'Đã từ chối / Hủy';
    if (app.candidate_response === 'accepted') return 'Ứng viên đã xác nhận';
    return 'Chờ ứng viên xác nhận';
  }

  getScheduleStatusClass(app: ShortlistedApplicant): string {
    if (!app.interview_date) return 'unscheduled';
    if (app.interview_status === 'completed') return 'completed';
    if (app.interview_status === 'cancelled' || app.candidate_response === 'declined') return 'cancelled';
    if (app.candidate_response === 'accepted') return 'confirmed';
    return 'pending-confirmation';
  }

  openCandidateChat(app: ShortlistedApplicant): void {
    const modalRef = this.modal.create({
      nzTitle: undefined,
      nzContent: InterviewChatModalComponent,
      nzFooter: null,
      nzWidth: 640,
    });
    const instance = modalRef.componentInstance;
    if (instance) {
      instance.appId = app.id;
      instance.candidateName = app.candidate_name;
      instance.jobTitle = app.job_title;
      instance.candidateResponse = app.candidate_response;
      instance.interviewDate = app.interview_date || undefined;
    }
    modalRef.afterClose.subscribe(() => {
      this.loadShortlisted();
    });
  }

  canEnterInterview(app: ShortlistedApplicant): boolean {
    return this.isRoomOpen(app.interview_date, app.interview_status);
  }

  getInterviewActionHint(app: ShortlistedApplicant): string {
    return this.getRoomAvailabilityLabel(app.interview_date, app.interview_status);
  }

  canEnterCalendarEvent(event: CalendarInterviewEvent): boolean {
    return this.isRoomOpen(event.interview_date, event.status);
  }

  getCalendarQuestionLabel(event: CalendarInterviewEvent): string {
    return event.question_status === 'ready'
      ? `Câu hỏi AI sẵn sàng · ${event.question_count || 0} câu`
      : 'Câu hỏi AI chưa chuẩn bị';
  }

  getCalendarActionHint(event: CalendarInterviewEvent): string {
    return this.getRoomAvailabilityLabel(event.interview_date, event.status);
  }

  getRoomAvailabilityLabel(date: string | null, status: string | null): string {
    if (!date) return 'Cần xếp lịch trước';
    if (status === 'cancelled') return 'Lịch đã hủy';
    if (status === 'completed') return 'Buổi phỏng vấn đã hoàn thành';
    const interviewTime = new Date(date).getTime();
    const now = this.currentTime();
    if (now < interviewTime - 10 * 60_000) return 'Phòng mở trước giờ hẹn 10 phút';
    if (now > interviewTime + 120 * 60_000) return 'Đã quá thời gian tham gia';
    return 'Phòng phỏng vấn đang mở';
  }

  private isRoomOpen(date: string | null, status: string | null): boolean {
    if (!date || status === 'cancelled' || status === 'completed') return false;
    const interviewTime = new Date(date).getTime();
    const now = this.currentTime();
    return now >= interviewTime - 10 * 60_000 && now <= interviewTime + 120 * 60_000;
  }

  formatDate(date: string | null): string {
    if (!date) return '--';
    return new Date(date).toLocaleDateString('vi-VN');
  }

  getStatusColor(status: string): string {
    return APPLICATION_STATUS_COLORS[status] || 'default';
  }

  updateStatus(app: ShortlistedApplicant, newStatus: string): void {
    if (this.transitioningApplicationId() !== null) return;
    this.transitioningApplicationId.set(app.id);
    this.jobService.updateApplicationStatus(app.job_id, app.id, newStatus).subscribe({
      next: () => {
        this.transitioningApplicationId.set(null);
        const labels: Record<string, string> = {
          interviewing: 'Vòng 2: Phỏng vấn',
          rejected: 'Không đạt',
          reviewing: 'Xem xét lại',
        };
        this.message.success(`Đã chuyển ứng viên sang: ${labels[newStatus] || newStatus}`);
        this.applicants.update(list => list.filter(a => a.id !== app.id));
        this.total.update(t => t - 1);
        this.compareSelected.delete(app.id);
      },
      error: (err) => {
        this.transitioningApplicationId.set(null);
        this.message.error(err.error?.detail || 'Lỗi cập nhật trạng thái');
      },
    });
  }

  toggleCompare(appId: number, checked: boolean): void {
    if (checked) {
      this.compareSelected.add(appId);
    } else {
      this.compareSelected.delete(appId);
    }
  }

  canCompare(): boolean {
    if (this.compareSelected.size !== 2) return false;
    const selected = this.applicants().filter(a => this.compareSelected.has(a.id));
    if (selected.length !== 2) return false;
    return selected[0].job_id === selected[1].job_id;
  }

  openCompare(): void {
    const selected = this.applicants().filter(a => this.compareSelected.has(a.id));
    if (selected.length !== 2 || selected[0].job_id !== selected[1].job_id) return;

    this.modal.create({
      nzTitle: 'So sánh ứng viên',
      nzContent: CompareCandidatesModalComponent,
      nzData: { jobId: selected[0].job_id, candidates: selected },
      nzFooter: null,
      nzWidth: 800,
      nzCentered: true,
    });
  }

  openScheduleInterview(app: ShortlistedApplicant): void {
    const modalRef = this.modal.create({
      nzTitle: `Đặt lịch phỏng vấn: ${app.candidate_name}`,
      nzContent: InterviewScheduleModalComponent,
      nzData: {
        jobId: app.job_id,
        appId: app.id,
        candidateName: app.candidate_name,
      },
      nzFooter: null,
      nzWidth: 580,
    });
    const instance = modalRef.getContentComponent();
    if (instance) {
      instance.jobId = app.job_id;
      instance.appId = app.id;
      instance.candidateName = app.candidate_name;
    }
    modalRef.afterClose.subscribe((res) => {
      this.loadShortlisted();
      this.loadCalendarEvents();
      if (res) {
        this.persistWorkspaceQuestions(app);
      }
    });
  }

  openInterviewRoom(app: ShortlistedApplicant): void {
    this.router.navigate(['/jobs/interviewing'], {
      queryParams: { applicationId: app.id, confirm: 'room' },
    });
  }

  openCalendarEventRoom(ev: CalendarInterviewEvent): void {
    this.router.navigate(['/jobs/interviewing'], {
      queryParams: { applicationId: ev.application_id, confirm: 'room' },
    });
  }

  openCalendarEventReschedule(ev: CalendarInterviewEvent): void {
    const modalRef = this.modal.create({
      nzTitle: `Đặt lại lịch phỏng vấn: ${ev.candidate_name}`,
      nzContent: InterviewScheduleModalComponent,
      nzData: {
        jobId: ev.job_id,
        appId: ev.application_id,
        candidateName: ev.candidate_name,
      },
      nzFooter: null,
      nzWidth: 580,
    });
    const instance = modalRef.getContentComponent();
    if (instance) {
      instance.jobId = ev.job_id;
      instance.appId = ev.application_id;
      instance.candidateName = ev.candidate_name;
    }
    modalRef.afterClose.subscribe((res) => {
      this.loadShortlisted();
      this.loadCalendarEvents();
    });
  }

  openCvJdCompare(app: ShortlistedApplicant): void {
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

    this.jobService.getCvJdCompare(app.job_id, app.id).subscribe({
      next: (res: CvJdCompareResponse) => {
        modalData.data = res;
        modalData.loading = false;
      },
      error: () => {
        modalData.loading = false;
        modalData.error = 'Không thể tải dữ liệu đối chiếu CV và JD.';
      },
    });
  }

  viewAiDetails(app: ShortlistedApplicant): void {
    const modalData = {
      data: null as AiEvaluationResponse | null,
      loading: true,
      error: null as string | null,
      jobId: app.job_id,
      appId: app.id,
      candidateName: app.candidate_name,
      resumeFilename: app.resume_filename,
    };
    this.modal.create({
      nzTitle: `Đánh giá AI - ${app.candidate_name}`,
      nzContent: AiEvaluationModalComponent,
      nzData: modalData,
      nzFooter: null,
      nzWidth: 'min(1440px, calc(100vw - 32px))',
      nzBodyStyle: { padding: '16px', overflow: 'hidden' },
      nzCentered: true,
    });

    this.jobService.getAiEvaluation(app.job_id, app.id).subscribe({
      next: (res: AiEvaluationResponse) => {
        modalData.data = res;
        modalData.loading = false;
      },
      error: () => {
        modalData.loading = false;
        modalData.error = 'Không thể tải kết quả đánh giá AI.';
      },
    });
  }
}
