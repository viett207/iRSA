import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTableModule } from 'ng-zorro-antd/table';
import { InterviewRoomModalComponent } from '../../components/interview-room-modal.component';
import { InterviewPassedApplicant } from '../../models/job.model';
import { JobService } from '../../services/job.service';

@Component({
  selector: 'app-interview-passed',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NzTableModule, NzButtonModule, NzPopconfirmModule, NzModalModule],
  templateUrl: './interview-passed.component.html',
  styleUrl: './interview-passed.component.scss',
})
export class InterviewPassedComponent implements OnInit {
  readonly applicants = signal<InterviewPassedApplicant[]>([]);
  readonly loading = signal(false);
  readonly transitioningApplicationId = signal<number | null>(null);
  readonly searchText = signal('');
  readonly selectedJobId = signal(0);
  readonly statusFilter = signal<'all' | 'offered' | 'hired'>('all');
  readonly attentionFilter = signal<'all' | 'missing-summary' | 'stale' | 'ready'>('all');
  readonly selectedDateRange = signal<Date[] | null>(null);
  readonly datePickerOpen = signal(false);
  readonly pendingDateStart = signal<Date | null>(null);
  readonly hoveredDate = signal<Date | null>(null);
  readonly calendarCursor = signal(this.startOfMonth(new Date()));
  readonly calendarDays = computed(() => this.createCalendarDays(this.calendarCursor()));
  readonly calendarLabel = computed(() => this.calendarCursor().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }));
  readonly dateRangeLabel = computed(() => {
    const range = this.selectedDateRange();
    if (!range) return 'Tất cả thời gian';
    return `${this.formatShortDate(range[0])} – ${this.formatShortDate(range[1])}`;
  });
  page = 1;

  readonly offeredCount = computed(() => this.applicants().filter((app) => app.status === 'offered').length);
  readonly hiredCount = computed(() => this.applicants().filter((app) => app.status === 'hired').length);
  readonly missingSummaryCount = computed(() => this.applicants().filter((app) => app.status === 'offered' && app.interview_score == null).length);
  readonly staleDecisionCount = computed(() => this.applicants().filter((app) => app.status === 'offered' && this.isOlderThanDays(app.updated_at, 3)).length);
  readonly readyDecisionCount = computed(() => this.applicants().filter((app) => app.status === 'offered' && app.interview_score != null).length);
  readonly availableJobs = computed(() => {
    const jobs = new Map<number, string>();
    this.applicants().forEach((app) => jobs.set(app.job_id, app.job_title));
    return Array.from(jobs, ([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title, 'vi'));
  });
  readonly filteredApplicants = computed(() => {
    const query = this.searchText().trim().toLocaleLowerCase('vi');
    const jobId = this.selectedJobId();
    const status = this.statusFilter();
    const attention = this.attentionFilter();
    return this.applicants()
      .filter((app) => status === 'all' || app.status === status)
      .filter((app) => jobId === 0 || app.job_id === jobId)
      .filter((app) => !query || `${app.candidate_name} ${app.candidate_email} ${app.job_title}`.toLocaleLowerCase('vi').includes(query))
      .filter((app) => this.matchesUpdatedRange(app.updated_at))
      .filter((app) => attention === 'all'
        || (attention === 'missing-summary' && app.status === 'offered' && app.interview_score == null)
        || (attention === 'stale' && app.status === 'offered' && this.isOlderThanDays(app.updated_at, 3))
        || (attention === 'ready' && app.status === 'offered' && app.interview_score != null))
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'offered' ? -1 : 1;
        if (a.status === 'offered') {
          const missingSummary = Number(b.interview_score == null) - Number(a.interview_score == null);
          if (missingSummary !== 0) return missingSummary;
          return new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime();
        }
        return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      });
  });

  constructor(
    private readonly jobService: JobService,
    private readonly message: NzMessageService,
    private readonly modal: NzModalService,
    private readonly elementRef: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void { this.loadPassed(); }

  loadPassed(): void {
    this.loading.set(true);
    this.jobService.getInterviewPassed({ page: 1, size: 100 }).subscribe({
      next: (res) => { this.applicants.set(res.items); this.loading.set(false); },
      error: () => { this.message.error('Không thể tải danh sách ứng viên đạt phỏng vấn'); this.loading.set(false); },
    });
  }

  changeFilter(filter: 'all' | 'offered' | 'hired'): void {
    this.statusFilter.set(filter);
    this.attentionFilter.set('all');
    this.page = 1;
  }

  changeAttentionFilter(filter: 'all' | 'missing-summary' | 'stale' | 'ready'): void {
    this.attentionFilter.set(filter);
    if (filter !== 'all') this.statusFilter.set('offered');
    this.page = 1;
  }

  toggleDatePicker(event: MouseEvent): void {
    event.stopPropagation();
    const willOpen = !this.datePickerOpen();
    this.datePickerOpen.set(willOpen);
    this.pendingDateStart.set(null);
    this.hoveredDate.set(null);
    if (willOpen) this.calendarCursor.set(this.startOfMonth(this.selectedDateRange()?.[0] || new Date()));
  }

  selectRangeDate(date: Date): void {
    const start = this.pendingDateStart();
    if (!start) {
      this.pendingDateStart.set(new Date(date));
      this.hoveredDate.set(new Date(date));
      return;
    }
    const dates = [new Date(start), new Date(date)].sort((a, b) => a.getTime() - b.getTime());
    this.selectedDateRange.set(dates);
    this.pendingDateStart.set(null);
    this.hoveredDate.set(null);
    this.datePickerOpen.set(false);
    this.page = 1;
  }

  previewRange(date: Date): void {
    if (this.pendingDateStart()) this.hoveredDate.set(new Date(date));
  }

  changeCalendarMonth(offset: number, event: MouseEvent): void {
    event.stopPropagation();
    const next = new Date(this.calendarCursor());
    next.setMonth(next.getMonth() + offset);
    this.calendarCursor.set(this.startOfMonth(next));
  }

  applyRecentRange(daysAgo: number, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedDateRange.set(this.createRecentRange(daysAgo));
    this.pendingDateStart.set(null);
    this.hoveredDate.set(null);
    this.datePickerOpen.set(false);
    this.page = 1;
  }

  clearDateRange(event: MouseEvent): void {
    event.stopPropagation();
    this.selectedDateRange.set(null);
    this.pendingDateStart.set(null);
    this.hoveredDate.set(null);
    this.datePickerOpen.set(false);
    this.page = 1;
  }

  isCurrentCalendarMonth(date: Date): boolean {
    const cursor = this.calendarCursor();
    return date.getMonth() === cursor.getMonth() && date.getFullYear() === cursor.getFullYear();
  }

  isRangeEdge(date: Date): boolean {
    const range = this.visibleDateRange();
    return !!range && (this.isSameDay(date, range[0]) || this.isSameDay(date, range[1]));
  }

  isInVisibleRange(date: Date): boolean {
    const range = this.visibleDateRange();
    if (!range) return false;
    const time = this.dayTimestamp(date);
    return time >= this.dayTimestamp(range[0]) && time <= this.dayTimestamp(range[1]);
  }

  isToday(date: Date): boolean { return this.isSameDay(date, new Date()); }

  @HostListener('document:click', ['$event'])
  closeDatePickerOnOutsideClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.datePickerOpen.set(false);
      this.pendingDateStart.set(null);
      this.hoveredDate.set(null);
    }
  }

  resetFilters(): void {
    this.searchText.set('');
    this.selectedJobId.set(0);
    this.statusFilter.set('all');
    this.attentionFilter.set('all');
    this.selectedDateRange.set(null);
    this.datePickerOpen.set(false);
    this.pendingDateStart.set(null);
    this.hoveredDate.set(null);
    this.page = 1;
  }

  showPendingDecisions(): void {
    this.changeFilter('offered');
    requestAnimationFrame(() => document.getElementById('decision-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  showAttention(filter: 'missing-summary' | 'stale' | 'ready'): void {
    this.changeAttentionFilter(filter);
    requestAnimationFrame(() => document.getElementById('decision-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  getCandidateInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(-2).map((part) => part[0]).join('').toUpperCase() || 'UV';
  }

  formatScore(score: number): string { return Number.isInteger(score) ? `${score}` : score.toFixed(1); }
  formatDate(date: string | null): string { return date ? new Date(date).toLocaleDateString('vi-VN') : 'Chưa cập nhật'; }
  getStatusLabel(status: string): string { return status === 'hired' ? 'Đã tuyển' : status === 'offered' ? 'Chờ quyết định' : status; }

  getRecommendationLabel(recommendation?: string | null): string {
    const labels: Record<string, string> = { STRONG_HIRE: 'Rất phù hợp', HIRE: 'Đề xuất tuyển', CONSIDER: 'Cần cân nhắc', REJECT: 'Không đề xuất' };
    return recommendation ? labels[recommendation] || recommendation : 'Đã có kết quả';
  }

  private matchesUpdatedRange(value: string | null): boolean {
    const range = this.selectedDateRange();
    if (!range?.length) return true;
    if (!value) return false;
    const time = new Date(value).getTime();
    const from = new Date(range[0]);
    const to = new Date(range[1]);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return time >= from.getTime() && time <= to.getTime();
  }

  private createRecentRange(daysAgo: number): Date[] {
    const from = new Date();
    const to = new Date();
    from.setDate(from.getDate() - daysAgo);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return [from, to];
  }

  private createCalendarDays(cursor: Date): Date[] {
    const first = this.startOfMonth(cursor);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }

  private startOfMonth(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), 1); }
  private dayTimestamp(date: Date): number { return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime(); }
  private isSameDay(left: Date, right: Date): boolean { return this.dayTimestamp(left) === this.dayTimestamp(right); }
  private formatShortDate(date: Date): string { return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

  private visibleDateRange(): Date[] | null {
    const pendingStart = this.pendingDateStart();
    const hovered = this.hoveredDate();
    if (pendingStart && hovered) return [pendingStart, hovered].sort((a, b) => a.getTime() - b.getTime());
    return this.selectedDateRange();
  }

  private isOlderThanDays(value: string | null, days: number): boolean {
    if (!value) return false;
    return new Date(value).getTime() < Date.now() - days * 24 * 60 * 60_000;
  }

  updateStatus(app: InterviewPassedApplicant, newStatus: string): void {
    if (this.transitioningApplicationId() !== null) return;
    this.transitioningApplicationId.set(app.id);
    this.jobService.updateApplicationStatus(app.job_id, app.id, newStatus).subscribe({
      next: () => {
        this.transitioningApplicationId.set(null);
        const labels: Record<string, string> = { hired: 'Đã xác nhận tuyển', rejected: 'Đã chuyển sang không tuyển', interviewing: 'Đã đưa lại vòng phỏng vấn' };
        this.message.success(`${app.candidate_name}: ${labels[newStatus] || newStatus}`);
        this.loadPassed();
      },
      error: (err) => { this.transitioningApplicationId.set(null); this.message.error(err.error?.detail || 'Không thể cập nhật trạng thái'); },
    });
  }

  openInterviewRecord(app: InterviewPassedApplicant): void {
    const modalRef = this.modal.create({
      nzTitle: `Biên bản phỏng vấn · ${app.candidate_name}`,
      nzContent: InterviewRoomModalComponent,
      nzData: { jobId: app.job_id, appId: app.id, candidateName: app.candidate_name, mode: 'report' },
      nzFooter: null,
      nzWidth: '90vw',
      nzStyle: { top: '28px', maxWidth: '1180px' },
      nzMaskClosable: false,
    });
    modalRef.afterClose.subscribe(() => this.loadPassed());
  }
}
