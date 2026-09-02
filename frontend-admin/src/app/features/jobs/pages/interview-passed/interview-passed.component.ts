import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { JobService } from '../../services/job.service';
import {
  InterviewPassedApplicant,
  APPLICATION_STATUS_COLORS,
} from '../../models/job.model';
import { InterviewRoomModalComponent } from '../../components/interview-room-modal.component';

@Component({
  selector: 'app-interview-passed',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzProgressModule,
    NzSpaceModule,
    NzDropDownModule,
    NzPopconfirmModule,
    NzStatisticModule,
    NzCardModule,
    NzToolTipModule,
    NzModalModule,
  ],
  templateUrl: './interview-passed.component.html',
  styleUrl: './interview-passed.component.scss',
})
export class InterviewPassedComponent implements OnInit {
  applicants = signal<InterviewPassedApplicant[]>([]);
  total = signal(0);
  loading = signal(false);
  transitioningApplicationId = signal<number | null>(null);
  page = 1;
  statusFilter = 'all';

  offeredCount = computed(() => this.applicants().filter(a => a.status === 'offered').length);
  hiredCount = computed(() => this.applicants().filter(a => a.status === 'hired').length);

  scoreFormat = (percent: number): string => `${Math.round(percent)}`;

  constructor(
    private jobService: JobService,
    private message: NzMessageService,
    private modal: NzModalService,
  ) {}

  ngOnInit(): void {
    this.loadPassed();
  }

  loadPassed(): void {
    this.loading.set(true);
    const statusFilter = this.statusFilter === 'all' ? undefined : this.statusFilter;
    this.jobService.getInterviewPassed({ page: this.page, status_filter: statusFilter }).subscribe({
      next: (res) => {
        this.applicants.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.message.error('Không thể tải danh sách ứng viên đạt phỏng vấn');
        this.loading.set(false);
      },
    });
  }

  changeFilter(filter: string): void {
    this.statusFilter = filter;
    this.page = 1;
    this.loadPassed();
  }

  onPageChange(p: number): void {
    this.page = p;
    this.loadPassed();
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

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      offered: 'Đã đề xuất tuyển',
      hired: 'Đã trúng tuyển',
      rejected: 'Không đạt',
      interviewing: 'Phỏng vấn',
    };
    return labels[status] || status;
  }

  updateStatus(app: InterviewPassedApplicant, newStatus: string): void {
    if (this.transitioningApplicationId() !== null) return;
    this.transitioningApplicationId.set(app.id);
    this.jobService.updateApplicationStatus(app.job_id, app.id, newStatus).subscribe({
      next: () => {
        this.transitioningApplicationId.set(null);
        const labels: Record<string, string> = {
          hired: 'Chính thức trúng tuyển',
          rejected: 'Không đạt',
          interviewing: 'Quay lại vòng phỏng vấn',
        };
        this.message.success(`${app.candidate_name}: ${labels[newStatus] || newStatus}`);
        this.loadPassed();
      },
      error: (err) => {
        this.transitioningApplicationId.set(null);
        this.message.error(err.error?.detail || 'Lỗi cập nhật trạng thái');
      },
    });
  }

  openInterviewRoom(app: InterviewPassedApplicant): void {
    const modalRef = this.modal.create({
      nzTitle: `Biên bản phỏng vấn AI - ${app.candidate_name}`,
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

    modalRef.afterClose.subscribe(() => {
      this.loadPassed();
    });
  }
}
