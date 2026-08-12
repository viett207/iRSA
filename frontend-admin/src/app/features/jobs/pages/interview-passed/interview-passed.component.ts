import { Component, OnInit, signal } from '@angular/core';
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
import { JobService } from '../../services/job.service';
import {
  InterviewPassedApplicant,
  APPLICATION_STATUS_COLORS,
} from '../../models/job.model';

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
  ],
  template: `
    <div class="page-header">
      <h2>
        <span nz-icon nzType="trophy" nzTheme="outline" style="color: #faad14; margin-right: 8px"></span>
        Ứng viên đạt phỏng vấn
      </h2>
      <p style="color: #888; margin: 4px 0 16px">
        Theo dõi ứng viên đã được đề xuất hoặc tuyển dụng.
      </p>
    </div>

    <!-- Stats cards -->
    <div style="display: flex; gap: 16px; margin-bottom: 20px">
      <nz-card style="flex: 1; text-align: center" nzSize="small">
        <nz-statistic
          nzTitle="Tổng"
          [nzValue]="total()"
          [nzPrefix]="totalIcon"
        ></nz-statistic>
        <ng-template #totalIcon><span nz-icon nzType="team"></span></ng-template>
      </nz-card>
      <nz-card style="flex: 1; text-align: center" nzSize="small">
        <nz-statistic
          nzTitle="Đã đề xuất"
          [nzValue]="offeredCount()"
          [nzValueStyle]="{ color: '#faad14' }"
          [nzPrefix]="offeredIcon"
        ></nz-statistic>
        <ng-template #offeredIcon><span nz-icon nzType="gift"></span></ng-template>
      </nz-card>
      <nz-card style="flex: 1; text-align: center" nzSize="small">
        <nz-statistic
          nzTitle="Đã tuyển"
          [nzValue]="hiredCount()"
          [nzValueStyle]="{ color: '#52c41a' }"
          [nzPrefix]="hiredIcon"
        ></nz-statistic>
        <ng-template #hiredIcon><span nz-icon nzType="check-circle"></span></ng-template>
      </nz-card>
    </div>

    <!-- Filter toolbar -->
    <div style="margin-bottom: 12px; display: flex; gap: 8px">
      <button *nzSpaceItem nz-button nzSize="small"
        [nzType]="statusFilter === 'all' ? 'primary' : 'default'"
        (click)="changeFilter('all')">Tất cả</button>
      <button *nzSpaceItem nz-button nzSize="small"
        [nzType]="statusFilter === 'offered' ? 'primary' : 'default'"
        (click)="changeFilter('offered')">
        <nz-tag nzColor="gold" style="margin:0">Đã đề xuất</nz-tag>
      </button>
      <button *nzSpaceItem nz-button nzSize="small"
        [nzType]="statusFilter === 'hired' ? 'primary' : 'default'"
        (click)="changeFilter('hired')">
        <nz-tag nzColor="success" style="margin:0">Đã tuyển</nz-tag>
      </button>
    </div>

    <!-- Table -->
    <nz-table
      #passedTable
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
          <th nzWidth="20%">Ứng viên</th>
          <th nzWidth="18%">Vị trí</th>
          <th nzWidth="10%">Điểm SL</th>
          <th nzWidth="10%">Điểm AI</th>
          <th nzWidth="12%">Trạng thái</th>
          <th nzWidth="12%">Cập nhật</th>
          <th nzWidth="18%">Thao tác</th>
        </tr>
      </thead>
      <tbody>
        @for (app of passedTable.data; track app.id) {
          <tr>
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
            <td>
              <nz-tag [nzColor]="getStatusColor(app.status)">
                {{ getStatusLabel(app.status) }}
              </nz-tag>
            </td>
            <td>{{ formatDate(app.updated_at) }}</td>
            <td>
              @if (app.status === 'offered') {
                <div style="display: flex; gap: 4px">
                  <button nz-button nzSize="small" nzType="primary"
                    nz-popconfirm nzPopconfirmTitle="Xác nhận tuyển dụng?"
                    (nzOnConfirm)="updateStatus(app, 'hired')">
                    <span nz-icon nzType="check"></span> Tuyển
                  </button>
                  <button nz-button nzSize="small" nzDanger
                    nz-popconfirm nzPopconfirmTitle="Từ chối ứng viên?"
                    (nzOnConfirm)="updateStatus(app, 'rejected')">
                    <span nz-icon nzType="close"></span> Từ chối
                  </button>
                </div>
              } @else {
                <nz-tag nzColor="success">
                  <span nz-icon nzType="check-circle" style="margin-right: 4px"></span>
                  Hoàn tất
                </nz-tag>
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
export class InterviewPassedComponent implements OnInit {
  applicants = signal<InterviewPassedApplicant[]>([]);
  total = signal(0);
  offeredCount = signal(0);
  hiredCount = signal(0);
  loading = signal(false);
  page = 1;
  statusFilter = 'all';

  scoreFormat = (p: number) => `${Math.round(p)}`;

  constructor(
    private jobService: JobService,
    private message: NzMessageService,
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadCounts();
  }

  loadData(): void {
    this.loading.set(true);
    this.jobService
      .getInterviewPassed({ page: this.page, size: 20, status_filter: this.statusFilter })
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

  loadCounts(): void {
    this.jobService.getInterviewPassed({ page: 1, size: 1, status_filter: 'offered' })
      .subscribe(res => this.offeredCount.set(res.total));
    this.jobService.getInterviewPassed({ page: 1, size: 1, status_filter: 'hired' })
      .subscribe(res => this.hiredCount.set(res.total));
  }

  onPageChange(page: number): void {
    this.page = page;
    this.loadData();
  }

  changeFilter(filter: string): void {
    this.statusFilter = filter;
    this.page = 1;
    this.loadData();
  }

  updateStatus(app: InterviewPassedApplicant, newStatus: string): void {
    this.jobService.updateApplicationStatus(app.job_id, app.id, newStatus).subscribe({
      next: () => {
        if (newStatus === 'hired') {
          this.message.success(`${app.candidate_name} đã được tuyển dụng!`);
          app.status = 'hired';
          this.loadCounts();
        } else {
          this.message.success('Đã từ chối ứng viên');
          this.applicants.update(list => list.filter(a => a.id !== app.id));
          this.total.update(t => t - 1);
          this.loadCounts();
        }
      },
      error: (err) => {
        this.message.error(err.error?.detail || 'Lỗi cập nhật trạng thái');
      },
    });
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#52c41a';
    if (score >= 40) return '#faad14';
    return '#ff4d4f';
  }

  getStatusColor(status: string): string {
    return APPLICATION_STATUS_COLORS[status] || 'default';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      offered: 'Đã đề xuất',
      hired: 'Đã tuyển',
    };
    return labels[status] || status;
  }

  formatDate(date: string | null): string {
    if (!date) return '--';
    return new Date(date).toLocaleDateString('vi-VN');
  }
}
