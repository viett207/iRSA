import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { RouterLink } from '@angular/router';
import { JobService } from '../../services/job.service';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  ShortlistedApplicant,
  AiEvaluationResponse,
  CvJdCompareResponse,
  APPLICATION_STATUS_COLORS,
} from '../../models/job.model';
import { AiEvaluationModalComponent } from '../../components/ai-evaluation-modal.component';
import { CompareCandidatesModalComponent } from '../../components/compare-candidates-modal.component';
import { CvJdCompareModalComponent } from '../../components/cv-jd-compare-modal.component';
import { InterviewScheduleModalComponent } from '../../components/interview-schedule-modal.component';
import { InterviewRoomModalComponent } from '../../components/interview-room-modal.component';

@Component({
  selector: 'app-shortlisted',
  standalone: true,
  imports: [
    CommonModule,
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
  ],
  template: `
    <div class="page-header">
      <h2>
        <span nz-icon nzType="calendar" nzTheme="outline" style="color: #1890ff; margin-right: 8px"></span>
        Vòng 1 - Hẹn lịch phỏng vấn
      </h2>
      <p style="color: #888; margin: 4px 0 16px">
        Danh sách ứng viên đã vượt qua vòng sơ loại CV. Thiết lập lịch hẹn hoặc bắt đầu phỏng vấn trực tiếp.
      </p>
    </div>

    <!-- Toolbar -->
    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center">
      <nz-space [nzSize]="8">
        <button *nzSpaceItem nz-button nzSize="small"
          [nzType]="sortBy === 'date' ? 'primary' : 'default'"
          (click)="changeSortBy('date')">
          <span nz-icon nzType="calendar"></span> Ngày cập nhật
        </button>
        <button *nzSpaceItem nz-button nzSize="small"
          [nzType]="sortBy === 'ai_score' ? 'primary' : 'default'"
          (click)="changeSortBy('ai_score')">
          <span nz-icon nzType="robot"></span> Điểm AI CV
        </button>
      </nz-space>

      <nz-space [nzSize]="8">
        <button *nzSpaceItem nz-button nzSize="small"
          [disabled]="compareSelected.size !== 2 || !canCompare()"
          (click)="openCompare()"
          nz-tooltip
          [nzTooltipTitle]="!canCompare() ? 'Chọn 2 ứng viên cùng vị trí' : 'So sánh 2 ứng viên'">
          <span nz-icon nzType="swap"></span>
          So sánh ({{ compareSelected.size }}/2)
        </button>
        <nz-tag *nzSpaceItem nzColor="cyan">{{ total() }} ứng viên chờ hẹn lịch</nz-tag>
      </nz-space>
    </div>

    <!-- Table -->
    <nz-table
      #shortlistedTable
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
          <th nzWidth="20%">Ứng viên</th>
          <th nzWidth="18%">Vị trí</th>
          <th nzWidth="14%">Đánh giá AI CV</th>
          <th nzWidth="12%">Ngày nộp</th>
          <th nzWidth="16%">Hẹn lịch phỏng vấn</th>
          <th nzWidth="16%">Chuyển bước</th>
        </tr>
      </thead>
      <tbody>
        @for (app of shortlistedTable.data; track app.id) {
          <tr>
            <!-- Compare checkbox -->
            <td>
              <label nz-checkbox
                [nzChecked]="compareSelected.has(app.id)"
                [nzDisabled]="!compareSelected.has(app.id) && compareSelected.size >= 2"
                (nzCheckedChange)="toggleCompare(app.id, $event)">
              </label>
            </td>
            <!-- Candidate -->
            <td>
              <strong>{{ app.candidate_name }}</strong><br />
              <small style="color: #888">{{ app.candidate_email }}</small>
            </td>

            <!-- Job title (linked) -->
            <td>
              <a [routerLink]="['/jobs', app.job_id]"><strong>{{ app.job_title }}</strong></a>
            </td>

            <!-- AI score -->
            <td>
              @if (app.ai_score != null) {
                <div style="cursor: pointer; display: flex; align-items: center; gap: 8px"
                  (click)="viewAiDetails(app)"
                  nz-tooltip nzTooltipTitle="Nhấn để xem đánh giá chi tiết của AI Agent">
                  <nz-progress
                    [nzPercent]="app.ai_score"
                    nzType="circle"
                    [nzWidth]="38"
                    [nzStrokeColor]="getScoreColor(app.ai_score)"
                    [nzFormat]="scoreFormat"
                  ></nz-progress>
                  <span style="font-size: 11px; color: #1890ff; font-weight: 500">Xem phân tích</span>
                </div>
              } @else {
                <nz-tag>Chưa chấm AI</nz-tag>
              }
            </td>

            <!-- Date -->
            <td>{{ formatDate(app.submitted_at) }}</td>

            <!-- Scheduling Action Only -->
            <td>
              <button
                nz-button
                nzSize="small"
                nzType="primary"
                (click)="openScheduleInterview(app)"
                nz-tooltip
                nzTooltipTitle="Thiết lập thời gian và hình thức phỏng vấn"
              >
                <span nz-icon nzType="calendar"></span>
                📅 Đặt lịch PV
              </button>
            </td>

            <!-- Decision: status transition (owner only) -->
            <td>
              @if (isOwner(app)) {
                <div style="display: flex; gap: 4px; align-items: center">
                  <button
                    nz-button
                    nzSize="small"
                    nzType="dashed"
                    style="color: #722ed1; border-color: #d3adf7; font-weight: 600"
                    nz-popconfirm
                    nzPopconfirmTitle="Xác nhận chuyển ứng viên này sang Vòng 2: Phỏng vấn?"
                    (nzOnConfirm)="updateStatus(app, 'interviewing')"
                    nz-tooltip
                    nzTooltipTitle="Chuyển sang Vòng 2: Phòng phỏng vấn AI"
                  >
                    <span nz-icon nzType="arrow-right"></span>
                    Sang PV
                  </button>

                  <button nz-button nzSize="small" nz-dropdown [nzDropdownMenu]="statusMenu" nzTrigger="click">
                    <span nz-icon nzType="ellipsis"></span>
                  </button>
                  <nz-dropdown-menu #statusMenu="nzDropdownMenu">
                    <ul nz-menu>
                      <li nz-menu-item
                        nz-popconfirm nzPopconfirmTitle="Chuyển sang Vòng 2 - Phỏng vấn?"
                        (nzOnConfirm)="updateStatus(app, 'interviewing')">
                        <nz-tag [nzColor]="getStatusColor('interviewing')">Phỏng vấn</nz-tag>
                      </li>
                      <li nz-menu-item
                        nz-popconfirm nzPopconfirmTitle="Từ chối ứng viên này?"
                        (nzOnConfirm)="updateStatus(app, 'rejected')">
                        <nz-tag [nzColor]="getStatusColor('rejected')">Không đạt</nz-tag>
                      </li>
                      <li nz-menu-item
                        nz-popconfirm nzPopconfirmTitle="Đưa về xem xét lại?"
                        (nzOnConfirm)="updateStatus(app, 'reviewing')">
                        <nz-tag [nzColor]="getStatusColor('reviewing')">Xem xét lại</nz-tag>
                      </li>
                    </ul>
                  </nz-dropdown-menu>
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
    .page-header { margin-bottom: 8px; }
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
export class ShortlistedComponent implements OnInit {
  applicants = signal<ShortlistedApplicant[]>([]);
  total = signal(0);
  loading = signal(false);
  page = 1;
  sortBy = 'date';
  compareSelected = new Set<number>();

  scoreFormat = (percent: number): string => `${Math.round(percent)}`;

  constructor(
    private jobService: JobService,
    private message: NzMessageService,
    private modal: NzModalService,
    public authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadShortlisted();
  }

  loadShortlisted(): void {
    this.loading.set(true);
    this.jobService.getShortlisted({ page: this.page, sort_by: this.sortBy }).subscribe({
      next: (res) => {
        this.applicants.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.message.error('Không thể tải danh sách ứng viên đạt');
        this.loading.set(false);
      },
    });
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
    this.jobService.updateApplicationStatus(app.job_id, app.id, newStatus).subscribe({
      next: () => {
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
      nzWidth: 560,
    });
    const instance = modalRef.componentInstance;
    if (instance) {
      instance.jobId = app.job_id;
      instance.appId = app.id;
      instance.candidateName = app.candidate_name;
    }
    modalRef.afterClose.subscribe(() => {
      this.loadShortlisted();
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
      if (res?.statusUpdated) {
        this.loadShortlisted();
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
    };
    this.modal.create({
      nzTitle: `Đánh giá AI - ${app.candidate_name}`,
      nzContent: AiEvaluationModalComponent,
      nzData: modalData,
      nzFooter: null,
      nzWidth: 'min(1200px, calc(100vw - 48px))',
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
