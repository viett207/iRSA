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
  template: `
    <div class="page-header">
      <h2>
        <span nz-icon nzType="trophy" nzTheme="outline" style="color: #faad14; margin-right: 8px"></span>
        Vòng 3 - Đã Pass phỏng vấn & Đề xuất tuyển dụng
      </h2>
      <p style="color: #888; margin: 4px 0 16px">
        Danh sách ứng viên đã vượt qua vòng phỏng vấn trực tiếp. Xem lại biên bản ghi âm, điểm số AI và chốt quyết định tuyển dụng.
      </p>
    </div>

    <!-- Stats cards -->
    <div style="display: flex; gap: 16px; margin-bottom: 20px">
      <nz-card style="flex: 1; text-align: center" nzSize="small">
        <nz-statistic
          nzTitle="Tổng ứng viên đạt PV"
          [nzValue]="total()"
          [nzPrefix]="totalIcon"
        ></nz-statistic>
        <ng-template #totalIcon><span nz-icon nzType="team"></span></ng-template>
      </nz-card>
      <nz-card style="flex: 1; text-align: center" nzSize="small">
        <nz-statistic
          nzTitle="Đã đề xuất nhận việc (Offered)"
          [nzValue]="offeredCount()"
          [nzValueStyle]="{ color: '#faad14' }"
          [nzPrefix]="offeredIcon"
        ></nz-statistic>
        <ng-template #offeredIcon><span nz-icon nzType="gift"></span></ng-template>
      </nz-card>
      <nz-card style="flex: 1; text-align: center" nzSize="small">
        <nz-statistic
          nzTitle="Chính thức trúng tuyển (Hired)"
          [nzValue]="hiredCount()"
          [nzValueStyle]="{ color: '#52c41a' }"
          [nzPrefix]="hiredIcon"
        ></nz-statistic>
        <ng-template #hiredIcon><span nz-icon nzType="check-circle"></span></ng-template>
      </nz-card>
    </div>

    <!-- Filter toolbar -->
    <div style="margin-bottom: 12px; display: flex; gap: 8px">
      <button nz-button nzSize="small"
        [nzType]="statusFilter === 'all' ? 'primary' : 'default'"
        (click)="changeFilter('all')">Tất cả ({{ total() }})</button>
      <button nz-button nzSize="small"
        [nzType]="statusFilter === 'offered' ? 'primary' : 'default'"
        (click)="changeFilter('offered')">
        <nz-tag nzColor="gold" style="margin:0">Đã đề xuất tuyển ({{ offeredCount() }})</nz-tag>
      </button>
      <button nz-button nzSize="small"
        [nzType]="statusFilter === 'hired' ? 'primary' : 'default'"
        (click)="changeFilter('hired')">
        <nz-tag nzColor="success" style="margin:0">Đã tuyển ({{ hiredCount() }})</nz-tag>
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
          <th nzWidth="12%">Điểm AI CV</th>
          <th nzWidth="12%">Trạng thái</th>
          <th nzWidth="12%">Cập nhật</th>
          <th nzWidth="26%">Biên bản PV & Tuyển dụng</th>
        </tr>
      </thead>
      <tbody>
        @for (app of passedTable.data; track app.id) {
          <tr>
            <td>
              <strong>{{ app.candidate_name }}</strong><br />
              <small style="color: #888">{{ app.candidate_email }}</small>
            </td>
            <td><a [routerLink]="['/jobs', app.job_id]"><strong>{{ app.job_title }}</strong></a></td>
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
              <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center">
                <!-- View interview room report -->
                <button
                  nz-button
                  nzSize="small"
                  style="color: #722ed1; border-color: #d3adf7; font-weight: 500"
                  (click)="openInterviewRoom(app)"
                  nz-tooltip
                  nzTooltipTitle="Xem lại biên bản phỏng vấn, câu trả lời, ghi âm và điểm số"
                >
                  <span nz-icon nzType="solution"></span>
                  Biên bản PV
                </button>

                @if (app.status === 'offered') {
                  <button nz-button nzSize="small" nzType="primary"
                    style="background: #52c41a; border-color: #52c41a; font-weight: 600"
                    nz-popconfirm nzPopconfirmTitle="Xác nhận ứng viên này CHÍNH THỨC TRÚNG TUYỂN (Hired)?"
                    (nzOnConfirm)="updateStatus(app, 'hired')"
                    nz-tooltip nzTooltipTitle="Chốt trúng tuyển">
                    <span nz-icon nzType="check"></span> Tuyển
                  </button>

                  <button nz-button nzSize="small" nzDanger
                    nz-popconfirm nzPopconfirmTitle="Từ chối ứng viên này?"
                    (nzOnConfirm)="updateStatus(app, 'rejected')"
                    nz-tooltip nzTooltipTitle="Không đạt">
                    <span nz-icon nzType="close"></span>
                  </button>

                  <button nz-button nzSize="small"
                    nz-popconfirm nzPopconfirmTitle="Đưa ứng viên quay lại Vòng 2: Phỏng vấn?"
                    (nzOnConfirm)="updateStatus(app, 'interviewing')"
                    nz-tooltip nzTooltipTitle="Quay lại phỏng vấn">
                    <span nz-icon nzType="rollback"></span>
                  </button>
                } @else {
                  <nz-tag nzColor="success">
                    <span nz-icon nzType="check-circle" style="margin-right: 4px"></span>
                    Đã hoàn tất tuyển dụng
                  </nz-tag>
                }
              </div>
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
  loading = signal(false);
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
    this.jobService.updateApplicationStatus(app.job_id, app.id, newStatus).subscribe({
      next: () => {
        const labels: Record<string, string> = {
          hired: 'Chính thức trúng tuyển',
          rejected: 'Không đạt',
          interviewing: 'Quay lại vòng phỏng vấn',
        };
        this.message.success(`${app.candidate_name}: ${labels[newStatus] || newStatus}`);
        this.loadPassed();
      },
      error: (err) => {
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
