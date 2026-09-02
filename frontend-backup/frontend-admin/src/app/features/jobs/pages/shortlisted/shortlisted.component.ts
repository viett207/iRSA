import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
import { InterviewRoomModalComponent } from '../../components/interview-room-modal.component';

export interface JobApplicantGroup {
  jobId: number;
  jobTitle: string;
  applicants: ShortlistedApplicant[];
}

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
export class ShortlistedComponent implements OnInit {
  applicants = signal<ShortlistedApplicant[]>([]);
  calendarEvents = signal<CalendarInterviewEvent[]>([]);
  total = signal(0);
  loading = signal(false);
  calendarLoading = signal(false);
  transitioningApplicationId = signal<number | null>(null);

  // View state: 'grouped' (Mặc định: Gom theo việc làm), 'calendar' (Xem Lịch), 'flat' (Bảng phẳng)
  viewMode = signal<'grouped' | 'calendar' | 'flat'>('grouped');
  calendarDisplayMode = signal<'month' | 'day'>('month');
  expandedJobIds = signal<Set<number>>(new Set());
  selectedCalendarDate = signal<Date>(new Date());

  // Filters & Search
  searchQuery = signal('');
  selectedJobFilter = signal<number | null>(null);
  scheduleFilter = signal<'all' | 'scheduled' | 'unscheduled'>('all');
  sortBy = 'date';
  page = 1;
  compareSelected = new Set<number>();

  scoreFormat = (percent: number): string => `${Math.round(percent)}`;

  // KPI Metrics
  scheduledCount = computed(() => this.applicants().filter((a) => a.interview_date != null).length);
  unscheduledCount = computed(() => this.applicants().filter((a) => a.interview_date == null).length);

  // Filtered applicants
  filteredApplicants = computed(() => {
    let list = this.applicants();
    const q = this.searchQuery().trim().toLowerCase();
    const jf = this.selectedJobFilter();
    const sf = this.scheduleFilter();

    if (jf !== null) {
      list = list.filter((a) => a.job_id === jf);
    }
    if (sf === 'scheduled') {
      list = list.filter((a) => a.interview_date != null);
    } else if (sf === 'unscheduled') {
      list = list.filter((a) => a.interview_date == null);
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
    return this.calendarEvents()
      .filter((e) => this.toDateKey(new Date(e.interview_date)) === dateStr)
      .sort((a, b) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime());
  });

  constructor(
    private jobService: JobService,
    private message: NzMessageService,
    private modal: NzModalService,
    public authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadShortlisted();
    this.loadCalendarEvents();
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

  setCalendarDisplayMode(mode: 'month' | 'day'): void {
    this.calendarDisplayMode.set(mode);
  }

  moveSelectedDay(offset: number): void {
    const date = new Date(this.selectedCalendarDate());
    date.setDate(date.getDate() + offset);
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

  formatWeekday(date: Date): string {
    const value = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(date);
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  formatMonthLabel(date: Date): string {
    return `Tháng ${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  getEventsOnDate(date: Date): CalendarInterviewEvent[] {
    const key = this.toDateKey(date);
    return this.calendarEvents().filter(
      (e) => this.toDateKey(new Date(e.interview_date)) === key
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
    if (score >= 70) return '#52c41a';
    if (score >= 40) return '#faad14';
    return '#ff4d4f';
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
      nzFooter: null,
      nzWidth: 580,
    });
    const instance = modalRef.componentInstance;
    if (instance) {
      instance.jobId = app.job_id;
      instance.appId = app.id;
      instance.candidateName = app.candidate_name;
    }
    modalRef.afterClose.subscribe((res) => {
      this.loadShortlisted();
      this.loadCalendarEvents();
      if (res) {
        this.message.success(`Đã cập nhật lịch phỏng vấn cho ứng viên "${app.candidate_name}"`);
      }
    });
  }

  openInterviewRoom(app: ShortlistedApplicant): void {
    const modalRef = this.modal.create({
      nzTitle: `Phòng phỏng vấn AI - ${app.candidate_name}`,
      nzContent: InterviewRoomModalComponent,
      nzData: {
        jobId: app.job_id,
        appId: app.id,
        candidateName: app.candidate_name,
      },
      nzFooter: null,
      nzWidth: '94vw',
      nzStyle: { top: '20px', maxWidth: '1400px' },
      nzMaskClosable: false,
    });

    modalRef.afterClose.subscribe((res) => {
      this.loadShortlisted();
      this.loadCalendarEvents();
    });
  }

  openCalendarEventRoom(ev: CalendarInterviewEvent): void {
    const modalRef = this.modal.create({
      nzTitle: `Phòng phỏng vấn AI - ${ev.candidate_name}`,
      nzContent: InterviewRoomModalComponent,
      nzData: {
        jobId: ev.job_id,
        appId: ev.application_id,
        candidateName: ev.candidate_name,
      },
      nzFooter: null,
      nzWidth: '94vw',
      nzStyle: { top: '20px', maxWidth: '1400px' },
      nzMaskClosable: false,
    });

    modalRef.afterClose.subscribe(() => {
      this.loadShortlisted();
      this.loadCalendarEvents();
    });
  }

  openCalendarEventReschedule(ev: CalendarInterviewEvent): void {
    const modalRef = this.modal.create({
      nzTitle: `Đặt lại lịch phỏng vấn: ${ev.candidate_name}`,
      nzContent: InterviewScheduleModalComponent,
      nzFooter: null,
      nzWidth: 580,
    });
    const instance = modalRef.componentInstance;
    if (instance) {
      instance.jobId = ev.job_id;
      instance.appId = ev.application_id;
      instance.candidateName = ev.candidate_name;
    }
    modalRef.afterClose.subscribe((res) => {
      this.loadShortlisted();
      this.loadCalendarEvents();
      if (res) {
        this.message.success(`Đã cập nhật lịch phỏng vấn cho ${ev.candidate_name}`);
      }
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
