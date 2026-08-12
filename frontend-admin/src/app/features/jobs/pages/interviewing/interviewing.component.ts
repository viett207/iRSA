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
  template: `
    <div class="page-header">
      <h2>
        <span nz-icon nzType="team" nzTheme="outline" style="color: #1890ff; margin-right: 8px"></span>
        Chờ phỏng vấn
      </h2>
      <p style="color: #888; margin: 4px 0 16px">
        Quản lý ứng viên đang trong giai đoạn phỏng vấn.
      </p>
    </div>

    <!-- Stats -->
    <div style="display: flex; gap: 16px; margin-bottom: 20px">
      <nz-card style="flex: 1; text-align: center" nzSize="small">
        <nz-statistic
          nzTitle="Đang chờ phỏng vấn"
          [nzValue]="total()"
          [nzPrefix]="totalIcon"
          [nzValueStyle]="{ color: '#1890ff' }"
        ></nz-statistic>
        <ng-template #totalIcon><span nz-icon nzType="clock-circle"></span></ng-template>
      </nz-card>
    </div>

    <!-- Sort toolbar -->
    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center">
      <div style="display: flex; gap: 8px">
        <button nz-button nzSize="small"
          [nzType]="sortBy === 'date' ? 'primary' : 'default'"
          (click)="changeSortBy('date')">
          <span nz-icon nzType="calendar"></span> Ngày cập nhật
        </button>
        <button nz-button nzSize="small"
          [nzType]="sortBy === 'score' ? 'primary' : 'default'"
          (click)="changeSortBy('score')">
          <span nz-icon nzType="sort-descending"></span> Điểm sàng lọc
        </button>
        <button nz-button nzSize="small"
          [nzType]="sortBy === 'ai_score' ? 'primary' : 'default'"
          (click)="changeSortBy('ai_score')">
          <span nz-icon nzType="robot"></span> Điểm AI
        </button>
      </div>
      <button nz-button nzSize="small"
        [disabled]="compareSelected.size !== 2 || !canCompare()"
        (click)="openCompare()"
        nz-tooltip
        [nzTooltipTitle]="!canCompare() ? 'Chọn 2 ứng viên cùng vị trí' : 'So sánh 2 ứng viên'">
        <span nz-icon nzType="swap"></span>
        So sánh ({{ compareSelected.size }}/2)
      </button>
    </div>

    <!-- Table -->
    <nz-table
      #interviewTable
      [nzData]="applicants()"
      [nzLoading]="loading()"
      [nzTotal]="total()"
      [nzPageIndex]="page"
      [nzPageSize]="20"
      [nzFrontPagination]="false"
      (nzPageIndexChange)="onPageChange($event)"
      nzSize="middle"
    >
      <thead>
        <tr>
          <th nzWidth="4%"></th>
          <th nzWidth="18%">Ứng viên</th>
          <th nzWidth="16%">Vị trí</th>
          <th nzWidth="8%">Điểm SL</th>
          <th nzWidth="8%">Điểm AI</th>
          <th nzWidth="10%">Cập nhật</th>
          <th nzWidth="8%">Lịch PV</th>
          <th nzWidth="18%">Kết quả phỏng vấn</th>
        </tr>
      </thead>
      <tbody>
        @for (app of interviewTable.data; track app.id) {
          <tr>
            <td>
              <label nz-checkbox
                [nzChecked]="compareSelected.has(app.id)"
                [nzDisabled]="!compareSelected.has(app.id) && compareSelected.size >= 2"
                (nzCheckedChange)="toggleCompare(app.id, $event)">
              </label>
            </td>
            <td>
              <strong>{{ app.candidate_name }}</strong><br />
              <small style="color: #888">{{ app.candidate_email }}</small>
            </td>
            <td><a [routerLink]="['/jobs', app.job_id]">{{ app.job_title }}</a></td>
            <td>
              @if (app.total_score != null) {
                <nz-progress nzType="circle" [nzPercent]="app.total_score"
                  [nzWidth]="38" [nzStrokeColor]="getScoreColor(app.total_score)"
                  [nzFormat]="scoreFormat"></nz-progress>
              } @else { <nz-tag>N/A</nz-tag> }
            </td>
            <td>
              @if (app.ai_score != null) {
                <nz-progress nzType="circle" [nzPercent]="app.ai_score"
                  [nzWidth]="38" [nzStrokeColor]="getScoreColor(app.ai_score)"
                  [nzFormat]="scoreFormat"></nz-progress>
              } @else { <nz-tag>N/A</nz-tag> }
            </td>
            <td>{{ formatDate(app.updated_at) }}</td>
            <td>
              @if (isOwner(app)) {
                <button nz-button nzType="primary"
                  (click)="openScheduleInterview(app)"
                  nz-tooltip nzTooltipTitle="Đặt lịch phỏng vấn">
                  <span nz-icon nzType="calendar"></span>
                  Đặt lịch
                </button>
              } @else {
                <span style="color: #999">—</span>
              }
            </td>
            <td>
              @if (isOwner(app)) {
                <div style="display: flex; gap: 4px">
                  <button nz-button nzSize="small" nzType="primary"
                    nz-popconfirm nzPopconfirmTitle="Đạt phỏng vấn - đề xuất tuyển?"
                    (nzOnConfirm)="updateStatus(app, 'offered')">
                    <span nz-icon nzType="like"></span> Đạt
                  </button>
                  <button nz-button nzSize="small" nzDanger
                    nz-popconfirm nzPopconfirmTitle="Không đạt phỏng vấn?"
                    (nzOnConfirm)="updateStatus(app, 'rejected')">
                    <span nz-icon nzType="dislike"></span> Không đạt
                  </button>
                  <button nz-button nzSize="small"
                    nz-popconfirm nzPopconfirmTitle="Đưa về danh sách shortlist?"
                    (nzOnConfirm)="updateStatus(app, 'shortlisted')"
                    nz-tooltip nzTooltipTitle="Quay lại shortlist">
                    <span nz-icon nzType="rollback"></span>
                  </button>
                </div>
              } @else {
                <span style="color: #999">—</span>
              }
            </td>
          </tr>
        }
      </tbody>
    </nz-table>
  `,
  styles: [`
    .page-header h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 0;
      display: flex;
      align-items: center;
    }
    :host ::ng-deep .ant-table-cell { vertical-align: middle; }
  `],
})
export class InterviewingComponent implements OnInit, OnDestroy {
  applicants = signal<InterviewingApplicant[]>([]);
  total = signal(0);
  loading = signal(false);
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
    this.jobService.updateApplicationStatus(app.job_id, app.id, newStatus).subscribe({
      next: () => {
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
