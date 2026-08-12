import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { Subscription } from 'rxjs';
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
import { NotificationService } from '../../../../core/services/notification.service';
import {
  ShortlistedApplicant,
  AiEvaluationResponse,
  AiSkillAssessment,
  APPLICATION_STATUS_COLORS,
} from '../../models/job.model';
import { AiEvaluationModalComponent } from '../../components/ai-evaluation-modal.component';
import { CompareCandidatesModalComponent } from '../../components/compare-candidates-modal.component';

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
        <span nz-icon nzType="check-circle" nzTheme="outline" style="color: #52c41a; margin-right: 8px"></span>
        Vòng 1 - Ứng viên đạt
      </h2>
      <p style="color: #888; margin: 4px 0 16px">
        Danh sách ứng viên đã qua sàng lọc. Phân tích AI tự động khi shortlist.
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
          [nzType]="sortBy === 'score' ? 'primary' : 'default'"
          (click)="changeSortBy('score')">
          <span nz-icon nzType="sort-descending"></span> Điểm sàng lọc
        </button>
        <button *nzSpaceItem nz-button nzSize="small"
          [nzType]="sortBy === 'ai_score' ? 'primary' : 'default'"
          (click)="changeSortBy('ai_score')">
          <span nz-icon nzType="robot"></span> Điểm AI
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
        <nz-tag *nzSpaceItem nzColor="green">{{ total() }} ứng viên</nz-tag>
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
          <th nzWidth="16%">Ứng viên</th>
          <th nzWidth="14%">Vị trí</th>
          <th nzWidth="9%">Điểm SL</th>
          <th nzWidth="9%">Điểm AI</th>
          <th nzWidth="10%">Ngày nộp</th>
          <th nzWidth="14%">Quyết định</th>
          <th nzWidth="24%">Thao tác</th>
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
              <a [routerLink]="['/jobs', app.job_id]">{{ app.job_title }}</a>
            </td>

            <!-- Screening score -->
            <td>
              @if (app.total_score != null) {
                <nz-progress
                  [nzPercent]="app.total_score"
                  nzType="circle"
                  [nzWidth]="38"
                  [nzStrokeColor]="getScoreColor(app.total_score)"
                  [nzFormat]="scoreFormat"
                ></nz-progress>
              } @else {
                <nz-tag>N/A</nz-tag>
              }
            </td>

            <!-- AI score -->
            <td>
              @if (app.ai_score != null) {
                <nz-progress
                  [nzPercent]="app.ai_score"
                  nzType="circle"
                  [nzWidth]="38"
                  [nzStrokeColor]="getScoreColor(app.ai_score)"
                  [nzFormat]="scoreFormat"
                ></nz-progress>
              } @else if (evaluatingAppId === app.id) {
                <nz-spin nzSimple nzSize="small"></nz-spin>
              } @else {
                <nz-tag>Chưa có</nz-tag>
              }
            </td>

            <!-- Date -->
            <td>{{ formatDate(app.submitted_at) }}</td>

            <!-- Decision: status transition (owner only) -->
            <td>
              @if (isOwner(app)) {
                <button nz-button nzSize="small" nz-dropdown [nzDropdownMenu]="statusMenu"
                  nzTrigger="click">
                  Chuyển trạng thái
                  <span nz-icon nzType="down"></span>
                </button>
                <nz-dropdown-menu #statusMenu="nzDropdownMenu">
                  <ul nz-menu>
                    <li nz-menu-item
                      nz-popconfirm nzPopconfirmTitle="Chuyển sang phỏng vấn?"
                      (nzOnConfirm)="updateStatus(app, 'interviewing')">
                      <nz-tag [nzColor]="getStatusColor('interviewing')">Phỏng vấn</nz-tag>
                    </li>
                    <li nz-menu-item
                      nz-popconfirm nzPopconfirmTitle="Từ chối ứng viên này?"
                      (nzOnConfirm)="updateStatus(app, 'rejected')">
                      <nz-tag [nzColor]="getStatusColor('rejected')">Từ chối</nz-tag>
                    </li>
                    <li nz-menu-item
                      nz-popconfirm nzPopconfirmTitle="Đưa về xem xét lại?"
                      (nzOnConfirm)="updateStatus(app, 'reviewing')">
                      <nz-tag [nzColor]="getStatusColor('reviewing')">Xem xét lại</nz-tag>
                    </li>
                  </ul>
                </nz-dropdown-menu>
              } @else {
                <span style="color: #999">—</span>
              }
            </td>

            <!-- Actions -->
            <td>
              <div style="display: flex; gap: 4px">
                @if (isOwner(app)) {
                  <button nz-button nzSize="small" nzType="primary" nzGhost
                    (click)="triggerAi(app)"
                    [nzLoading]="evaluatingAppId === app.id">
                    <span nz-icon nzType="robot"></span>
                    @if (app.has_ai_evaluation) { Phân tích lại } @else { Phân tích AI }
                  </button>
                }
                <button nz-button nzSize="small" nzType="primary"
                  (click)="viewAiDetails(app)"
                  [disabled]="!app.has_ai_evaluation">
                  <span nz-icon nzType="file-search"></span>
                  Xem kết quả
                </button>
              </div>
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
export class ShortlistedComponent implements OnInit, OnDestroy {
  applicants = signal<ShortlistedApplicant[]>([]);
  total = signal(0);
  loading = signal(false);
  page = 1;
  sortBy = 'date';
  evaluatingAppId: number | null = null;
  compareSelected = new Set<number>();
  private sub?: Subscription;

  scoreFormat = (p: number) => `${Math.round(p)}`;

  constructor(
    private jobService: JobService,
    private modal: NzModalService,
    private message: NzMessageService,
    private authService: AuthService,
    private notificationSvc: NotificationService,
  ) {}

  /** HR/Admin/Recruiter or owner can operate */
  isOwner(app: ShortlistedApplicant): boolean {
    const u = this.authService.user();
    if (!u) return false;
    return this.authService.hasRole('admin', 'hr', 'leader', 'manager', 'recruiter') || app.job_created_by === u.id;
  }

  ngOnInit(): void {
    this.loadData();
    this.sub = this.notificationSvc.dataChanged$.subscribe((n) => {
      if (['application', 'job'].includes(n.type)) this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  loadData(): void {
    this.loading.set(true);
    this.jobService
      .getShortlisted({ page: this.page, size: 20, sort_by: this.sortBy })
      .subscribe({
        next: (res) => {
          this.applicants.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => {
          this.message.error('Lỗi tải danh sách ứng viên');
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

  triggerAi(app: ShortlistedApplicant): void {
    this.evaluatingAppId = app.id;
    this.jobService.triggerAiEvaluation(app.job_id, app.id).subscribe({
      next: () => {
        this.message.success('Đã gửi yêu cầu phân tích AI. Vui lòng chờ...');
        // Poll for result after 10s
        setTimeout(() => {
          this.evaluatingAppId = null;
          this.loadData();
        }, 10000);
      },
      error: () => {
        this.message.error('Lỗi khi gửi yêu cầu phân tích AI');
        this.evaluatingAppId = null;
      },
    });
  }

  viewAiDetails(app: ShortlistedApplicant): void {
    if (!app.has_ai_evaluation) {
      this.message.info('Chưa có kết quả AI. Hãy bấm "Phân tích AI" trước.');
      return;
    }

    // Fetch data first, then open modal with complete data
    this.jobService.getAiEvaluation(app.job_id, app.id).subscribe({
      next: (res) => {
        this.modal.create({
          nzTitle: `Đánh giá AI - ${app.candidate_name}`,
          nzContent: AiEvaluationModalComponent,
          nzWidth: 700,
          nzData: { loading: false, data: res, error: null },
          nzFooter: null,
        });
      },
      error: () => {
        this.message.error('Lỗi tải kết quả AI');
      },
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

  getStatusColor(status: string): string {
    return APPLICATION_STATUS_COLORS[status] || 'default';
  }

  updateStatus(app: ShortlistedApplicant, newStatus: string): void {
    this.jobService.updateApplicationStatus(app.job_id, app.id, newStatus).subscribe({
      next: () => {
        const labels: Record<string, string> = {
          interviewing: 'Phỏng vấn',
          rejected: 'Từ chối',
          reviewing: 'Xem xét lại',
        };
        this.message.success(`Đã chuyển sang: ${labels[newStatus] || newStatus}`);
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

  /** Only allow compare when 2 selected candidates are from the same job */
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
}
