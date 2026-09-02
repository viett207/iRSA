import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { JobService } from '../../services/job.service';
import { InterviewingApplicant } from '../../models/job.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { InterviewScheduleModalComponent } from '../../components/interview-schedule-modal.component';
import { CompareCandidatesModalComponent } from '../../components/compare-candidates-modal.component';
import { InterviewRoomModalComponent } from '../../components/interview-room-modal.component';

@Component({
  selector: 'app-interviewing',
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
    NzPopconfirmModule,
    NzStatisticModule,
    NzCardModule,
    NzToolTipModule,
    NzModalModule,
    NzCheckboxModule,
  ],
  templateUrl: './interviewing.component.html',
  styleUrl: './interviewing.component.scss',
})
export class InterviewingComponent implements OnInit, OnDestroy {
  applicants = signal<InterviewingApplicant[]>([]);
  total = signal(0);
  loading = signal(false);
  transitioningApplicationId = signal<number | null>(null);
  page = 1;
  sortBy = 'date';
  compareSelected = new Set<number>();
  private sub?: Subscription;

  scoreFormat = (p: number) => `${Math.round(p)}`;

  constructor(
    private jobService: JobService,
    private message: NzMessageService,
    private modal: NzModalService,
    private authService: AuthService,
    private notificationSvc: NotificationService,
  ) {}

  isOwner(app: InterviewingApplicant): boolean {
    return app.job_created_by === this.authService.user()?.id;
  }

  ngOnInit(): void {
    this.loadData();
    this.sub = this.notificationSvc.dataChanged$.subscribe((n) => {
      if (['application', 'interview'].includes(n.type)) this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  loadData(): void {
    this.loading.set(true);
    this.jobService.getInterviewing({ page: this.page, size: 20, sort_by: this.sortBy })
      .subscribe({
        next: (res) => {
          this.applicants.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
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
    const ref = this.modal.create({
      nzTitle: `Phòng phỏng vấn: ${app.candidate_name} - ${app.job_title}`,
      nzContent: InterviewRoomModalComponent,
      nzData: {
        jobId: app.job_id,
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
      this.loadData();
    });
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
