import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
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
  page = 1;

  readonly offeredCount = computed(() => this.applicants().filter((app) => app.status === 'offered').length);
  readonly hiredCount = computed(() => this.applicants().filter((app) => app.status === 'hired').length);
  readonly priorityApplicants = computed(() => this.applicants()
    .filter((app) => app.status === 'offered')
    .sort((a, b) => {
      const missingSummary = Number(a.interview_score == null) - Number(b.interview_score == null);
      if (missingSummary !== 0) return -missingSummary;
      return new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime();
    }));
  readonly availableJobs = computed(() => {
    const jobs = new Map<number, string>();
    this.applicants().forEach((app) => jobs.set(app.job_id, app.job_title));
    return Array.from(jobs, ([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title, 'vi'));
  });
  readonly filteredApplicants = computed(() => {
    const query = this.searchText().trim().toLocaleLowerCase('vi');
    const jobId = this.selectedJobId();
    const status = this.statusFilter();
    return this.applicants()
      .filter((app) => status === 'all' || app.status === status)
      .filter((app) => jobId === 0 || app.job_id === jobId)
      .filter((app) => !query || `${app.candidate_name} ${app.candidate_email} ${app.job_title}`.toLocaleLowerCase('vi').includes(query))
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'offered' ? -1 : 1;
        return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      });
  });

  constructor(private readonly jobService: JobService, private readonly message: NzMessageService, private readonly modal: NzModalService) {}

  ngOnInit(): void { this.loadPassed(); }

  loadPassed(): void {
    this.loading.set(true);
    this.jobService.getInterviewPassed({ page: 1, size: 100 }).subscribe({
      next: (res) => { this.applicants.set(res.items); this.loading.set(false); },
      error: () => { this.message.error('Không thể tải danh sách ứng viên đạt phỏng vấn'); this.loading.set(false); },
    });
  }

  changeFilter(filter: 'all' | 'offered' | 'hired'): void { this.statusFilter.set(filter); this.page = 1; }

  showPendingDecisions(): void {
    this.changeFilter('offered');
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

  getPriorityReason(app: InterviewPassedApplicant): string {
    if (app.interview_score == null) return 'Chưa có tổng kết phỏng vấn';
    return `${this.getRecommendationLabel(app.interview_recommendation)} · ${this.formatScore(app.interview_score)}/100`;
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

  openInterviewRoom(app: InterviewPassedApplicant): void {
    const modalRef = this.modal.create({
      nzTitle: `Biên bản phỏng vấn - ${app.candidate_name}`,
      nzContent: InterviewRoomModalComponent,
      nzData: { jobId: app.job_id, appId: app.id, candidateName: app.candidate_name },
      nzFooter: null,
      nzWidth: '94vw',
      nzStyle: { top: '20px', maxWidth: '1400px' },
      nzMaskClosable: false,
    });
    modalRef.afterClose.subscribe(() => this.loadPassed());
  }
}
