import { Component, signal, computed, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardService, DashboardStats } from '../../core/services/dashboard.service';
import { JobService } from '../../features/jobs/services/job.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { firstValueFrom } from 'rxjs';

interface StatCard {
  title: string;
  value: number;
  suffix?: string;
  icon: string;
  iconColor: 'primary' | 'success' | 'warning' | 'error';
  route: string;
}

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface RecentApplication {
  id: number;
  jobId: number;
  candidateName: string;
  jobTitle: string;
  appliedAt: string;
  status: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzCardModule,
    NzGridModule,
    NzStatisticModule,
    NzIconModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzAvatarModule,
    NzToolTipModule,
    NzEmptyModule,
    NzSkeletonModule,
    NzSpinModule,
    NzModalModule,
  ],
  template: `
    <div class="dashboard">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <p class="dashboard-kicker">Bảng điều hành tuyển dụng</p>
          <h1 class="page-title">Xin chào, {{ userName() }}!</h1>
          <p class="page-subtitle">
            Đây là tổng quan hoạt động tuyển dụng của bạn hôm nay.
          </p>
        </div>
        <div class="header-actions">
          <span class="today-chip"><i></i>Hôm nay</span>
          <button nz-button nzType="primary" routerLink="/jobs/new">
            <span nz-icon nzType="plus"></span>
            Tạo tin tuyển dụng
          </button>
        </div>
      </div>

      @if (loadError()) {
        <div class="dashboard-error" role="alert">
          <span nz-icon nzType="exclamation-circle" aria-hidden="true"></span>
          <span>Không thể cập nhật dữ liệu tổng quan. Vui lòng thử lại.</span>
          <button nz-button nzSize="small" (click)="loadDashboard()" [disabled]="loading()">
            <span nz-icon nzType="reload"></span>
            Thử lại
          </button>
        </div>
      }

      <section class="priority-card" aria-labelledby="priority-title">
        <div class="priority-copy">
          <span class="priority-kicker">Việc cần ưu tiên hôm nay</span>
          <h2 id="priority-title">{{ recentApplications().length }} hồ sơ mới đang chờ đội tuyển dụng xem xét</h2>
          <p>Xử lý sớm các hồ sơ phù hợp để giữ tiến độ tuyển dụng và phản hồi ứng viên đúng hạn.</p>
        </div>
        <div class="priority-actions">
          <a nz-button class="priority-primary" routerLink="/applications">Xem hàng chờ <span nz-icon nzType="arrow-right"></span></a>
          <a nz-button class="priority-secondary" routerLink="/jobs">Quản lý vị trí</a>
        </div>
      </section>

      <!-- KPI Stats Grid -->
      <div nz-row [nzGutter]="[24, 24]" class="stats-section">
        @for (stat of stats(); track stat.title) {
          <div nz-col [nzXs]="24" [nzSm]="12" [nzLg]="8">
            <a class="stat-card" [routerLink]="stat.route" [attr.aria-label]="'Xem ' + stat.title">
              <div class="stat-icon" [class]="'stat-icon--' + stat.iconColor">
                <span nz-icon [nzType]="stat.icon" nzTheme="outline"></span>
              </div>
              <div class="stat-content">
                <span class="stat-label">{{ stat.title }}</span>
                <div class="stat-value-row">
                  <span class="stat-value">{{ stat.value }}</span>
                  @if (stat.suffix) {
                    <span class="stat-suffix">{{ stat.suffix }}</span>
                  }
                </div>
                
              </div>
            </a>
          </div>
        }
      </div>

      <!-- Main Content Grid -->
      <div nz-row [nzGutter]="[24, 24]" class="main-content">
        <!-- Quick Actions -->
        <div nz-col [nzXs]="24" [nzLg]="12">
          <nz-card class="actions-card">
            <div class="card-header">
              <h3 class="card-title">Thao tác nhanh</h3>
            </div>
            <div class="quick-actions-grid">
              @for (action of quickActions; track action.label) {
                @if (!action.adminOnly || authService.hasRole('admin')) {
                <a
                  class="action-item"
                  [routerLink]="action.route"
                  [class]="'action-item--' + action.color"
                >
                  <div class="action-icon">
                    <span nz-icon [nzType]="action.icon" nzTheme="outline"></span>
                  </div>
                  <div class="action-text">
                    <span class="action-label">{{ action.label }}</span>
                    <span class="action-desc">{{ action.description }}</span>
                  </div>
                  <span nz-icon nzType="right" class="action-arrow"></span>
                </a>
                }
              }
            </div>
          </nz-card>
        </div>

        <div nz-col [nzXs]="24" [nzLg]="12">
          <nz-card class="funnel-card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Tiến độ tuyển dụng</h3>
                <span class="card-subtitle">Tổng quan ứng viên trong quy trình hiện tại</span>
              </div>
              <a routerLink="/applications" class="view-all-link">
                Xem hồ sơ
                <span nz-icon nzType="arrow-right"></span>
              </a>
            </div>

            @if (funnelStages().length) {
              <div class="funnel-container">
                @for (stage of funnelStages(); track stage.name; let index = $index) {
                  <div class="funnel-stage" [class]="'funnel-stage funnel-stage--' + index">
                    <span class="funnel-index">{{ index + 1 }}</span>
                    <span class="funnel-name">{{ stage.name }}</span>
                    <div class="funnel-bar-wrapper">
                      <div class="funnel-bar" [style.width.%]="stage.percentage"></div>
                    </div>
                    <span class="funnel-count">{{ stage.count }}</span>
                  </div>
                }
              </div>
              <div class="funnel-footer">
                <span class="funnel-dot"></span>
                <span>Tỷ lệ chuyển đổi hiện tại: <strong>{{ conversionRate() }}%</strong></span>
              </div>
            } @else {
              <nz-empty nzNotFoundContent="Chưa có dữ liệu ứng viên"></nz-empty>
            }
          </nz-card>
        </div>
      </div>

      <!-- Recent Applications Table -->
      <nz-card class="table-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Hồ sơ ứng tuyển gần đây</h3>
            <span class="card-subtitle">Dữ liệu cập nhật gần nhất</span>
          </div>
          <div class="card-header-actions">
            <button nz-button nzType="link" nzSize="small" (click)="loadDashboard()" [disabled]="loading()">
              <span nz-icon nzType="reload"></span>
              Làm mới
            </button>
            <a routerLink="/applications" class="view-all-link">
              Xem tất cả
              <span nz-icon nzType="arrow-right"></span>
            </a>
          </div>
        </div>

        <nz-table
          #applicationTable
          [nzData]="recentApplications()"
          [nzShowPagination]="false"
          [nzFrontPagination]="false"
          nzSize="middle"
          [nzNoResult]="emptyTemplate"
        >
          <thead>
            <tr>
              <th>Ứng viên</th>
              <th>Vị trí ứng tuyển</th>
              <th>Ngày nộp</th>
              <th>Trạng thái</th>
              <th nzWidth="245px">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            @for (app of applicationTable.data; track app.id) {
              <tr>
                <td>
                  <div class="candidate-cell">
                    <nz-avatar
                      [nzText]="getInitial(app.candidateName)"
                      [nzSize]="36"
                      class="candidate-avatar"
                    ></nz-avatar>
                    <span class="candidate-name">{{ app.candidateName }}</span>
                  </div>
                </td>
                <td>
                  <span class="job-title">{{ app.jobTitle }}</span>
                </td>
                <td>
                  <span class="date-text">{{ app.appliedAt }}</span>
                </td>
                <td>
                  <nz-tag [nzColor]="getStatusColor(app.status)">
                    {{ getStatusLabel(app.status) }}
                  </nz-tag>
                </td>
                <td>
                  <button
                    nz-button
                    nzType="link"
                    nzSize="small"
                    (click)="viewResume(app)"
                    nz-tooltip
                    nzTooltipTitle="Xem CV"
                  >
                    <span nz-icon nzType="file-pdf"></span> Xem CV
                  </button>
                  <button
                    nz-button
                    nzType="link"
                    nzSize="small"
                    (click)="downloadResume(app)"
                    nz-tooltip
                    nzTooltipTitle="Tải CV"
                  >
                    <span nz-icon nzType="download"></span> Tải CV
                  </button>
                  <button
                    nz-button
                    nzType="link"
                    nzSize="small"
                    [routerLink]="['/jobs', app.jobId]"
                    nz-tooltip
                    nzTooltipTitle="Xem chi tiết"
                  >
                    <span nz-icon nzType="eye"></span> Chi tiết
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </nz-table>
        <ng-template #emptyTemplate>
          <nz-empty
            nzNotFoundContent="Chưa có hồ sơ ứng tuyển nào"
            [nzNotFoundFooter]="emptyFooter"
          ></nz-empty>
          <ng-template #emptyFooter>
            <button nz-button nzType="primary" routerLink="/jobs/new">
              Tạo tin tuyển dụng đầu tiên
            </button>
          </ng-template>
        </ng-template>
      </nz-card>

      <!-- Pending Approvals (for leaders/admins) -->
      @if (authService.hasRole('leader', 'admin') && pendingApprovals().length > 0) {
        <nz-card class="approvals-card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Cần phê duyệt</h3>
              <span class="card-subtitle">{{ pendingApprovals().length }} tin đang chờ</span>
            </div>
            <a routerLink="/jobs" [queryParams]="{status: 'pending_approval'}" class="view-all-link">
              Xem tất cả
              <span nz-icon nzType="arrow-right"></span>
            </a>
          </div>
          <div class="approval-list">
            @for (job of pendingApprovals(); track job.id) {
              <div class="approval-item">
                <div class="approval-info">
                  <span class="approval-title">{{ job.title }}</span>
                  <span class="approval-meta">
                    Tạo bởi {{ job.creator }} - {{ job.createdAt }}
                  </span>
                </div>
                <div class="approval-actions">
                  <button
                    nz-button
                    nzType="primary"
                    nzSize="small"
                    nz-tooltip
                    nzTooltipTitle="Phê duyệt"
                    (click)="approvePendingJob(job)"
                    [nzLoading]="approvalProcessingId === job.id"
                    [disabled]="approvalProcessingId !== null"
                  >
                    <span nz-icon nzType="check"></span> Phê duyệt
                  </button>
                  <button
                    nz-button
                    nzDanger
                    nzSize="small"
                    nz-tooltip
                    nzTooltipTitle="Từ chối"
                    (click)="rejectPendingJob(job)"
                    [disabled]="approvalProcessingId !== null"
                  >
                    <span nz-icon nzType="close"></span> Từ chối
                  </button>
                </div>
              </div>
            }
          </div>
        </nz-card>
      }

      <!-- Resume PDF Viewer Modal -->
      <nz-modal
        [(nzVisible)]="resumeModalVisible"
        [nzTitle]="'CV: ' + resumeModalTitle"
        (nzOnCancel)="closeResumeModal()"
        [nzFooter]="null"
        [nzWidth]="900"
        nzCentered
      >
        <ng-container *nzModalContent>
          @if (resumeModalLoading) {
            <div style="text-align: center; padding: 40px">
              <nz-spin nzSimple></nz-spin>
              <p style="margin-top: 12px; color: #888">Đang tải CV...</p>
            </div>
          } @else if (resumeModalUrl) {
            <iframe
              [src]="resumeModalUrl"
              style="width: 100%; height: 75vh; border: none; border-radius: 4px"
            ></iframe>
          }
        </ng-container>
      </nz-modal>
    </div>
  `,
  styles: [`
    .dashboard {
      animation: fadeIn 0.3s ease-out;
    }

    /* Dashboard presentation: API calls, signals and actions remain unchanged. */
    .dashboard { max-width: 1400px; margin: 0 auto; animation: dashboard-enter 0.42s cubic-bezier(0.2, 0.8, 0.2, 1); }
    .page-header { align-items: flex-end; margin-bottom: 22px; }
    .dashboard-kicker, .priority-kicker { display: block; margin: 0 0 6px; color: var(--color-primary); font-size: 10px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; }
    .page-title { max-width: 18ch; font-size: clamp(28px, 3vw, 38px); line-height: 1.08; letter-spacing: -0.055em; text-wrap: balance; }
    .page-subtitle { max-width: 62ch; font-size: 14px; line-height: 1.6; }
    .header-actions { align-items: center; }
    .today-chip { display: inline-flex; align-items: center; gap: 8px; margin-right: 4px; padding: 8px 10px; border: 1px solid var(--color-border-light); border-radius: 9px; color: var(--color-text-secondary); background: var(--color-bg-secondary); font-size: 12px; white-space: nowrap; }
    .today-chip i, .funnel-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--color-success); box-shadow: 0 0 0 4px var(--color-success-bg); }
    .priority-card { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; overflow: hidden; margin-bottom: 18px; padding: 23px 25px; border-radius: 18px; color: #fff; background: radial-gradient(circle at 87% -35%, hsl(209 86% 67% / 0.38), transparent 19rem), hsl(220 35% 17%); box-shadow: 0 16px 34px hsl(220 35% 17% / 0.18); }
    .priority-card::after { position: absolute; top: -92px; right: -72px; width: 240px; height: 240px; border: 1px solid hsl(210 75% 77% / 0.24); border-radius: 50%; box-shadow: 0 0 0 30px hsl(210 75% 77% / 0.05); content: ''; pointer-events: none; }
    .priority-copy, .priority-actions { position: relative; z-index: 1; }
    .priority-kicker { color: hsl(207 86% 74%); }
    .priority-copy h2 { max-width: 36ch; margin: 0; font-family: var(--font-heading); font-size: 20px; line-height: 1.25; letter-spacing: -0.035em; }
    .priority-copy p { max-width: 65ch; margin: 6px 0 0; color: hsl(215 20% 78%); font-size: 12px; }
    .priority-actions { display: flex; align-items: center; gap: 8px; }
    .priority-actions a { display: inline-flex; align-items: center; gap: 7px; min-height: 38px; border-radius: 9px; font-size: 12px; font-weight: 700; transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease; }
    .priority-actions a:hover { transform: translateY(-1px); }
    .priority-primary { border-color: #fff !important; color: hsl(220 35% 17%) !important; background: #fff !important; }
    .priority-secondary { border-color: hsl(215 26% 44%) !important; color: #fff !important; background: hsl(218 29% 25% / 0.78) !important; }
    .stats-section { margin-bottom: 18px; }
    .stat-card { align-items: center; min-height: 112px; padding: 18px; border-radius: 14px; box-shadow: 0 3px 10px hsl(220 30% 18% / 0.035); }
    .stat-card:hover { border-color: var(--color-primary-200); box-shadow: 0 12px 26px hsl(220 30% 18% / 0.08); transform: translateY(-3px); }
    .stat-icon { width: 44px; height: 44px; border-radius: 12px; }.stat-icon span { font-size: 20px; }.stat-label { margin-bottom: 5px; font-size: 12px; }.stat-value { font-size: 30px; font-variant-numeric: tabular-nums; letter-spacing: -0.065em; }
    .main-content { margin-bottom: 18px; }
    :host ::ng-deep .actions-card.ant-card, :host ::ng-deep .funnel-card.ant-card, :host ::ng-deep .table-card.ant-card, :host ::ng-deep .approvals-card.ant-card { overflow: hidden; border: 1px solid var(--color-border-light); border-radius: 18px; box-shadow: 0 10px 28px hsl(220 30% 18% / 0.055); }
    :host ::ng-deep .actions-card .ant-card-body, :host ::ng-deep .funnel-card .ant-card-body, :host ::ng-deep .table-card .ant-card-body, :host ::ng-deep .approvals-card .ant-card-body { padding: 21px; }
    .card-header { align-items: center; margin-bottom: 16px; }.card-title { font-size: 16px; letter-spacing: -0.035em; }.view-all-link { color: var(--color-primary); font-size: 12px; font-weight: 700; }
    .quick-actions-grid { gap: 8px; }.action-item { gap: 13px; padding: 12px; border: 1px solid transparent; border-radius: 11px; background: var(--color-bg-tertiary); }.action-item:hover { border-color: var(--color-primary-200); background: var(--color-primary-50); transform: translateX(3px); }.action-icon { width: 40px; height: 40px; border-radius: 11px; }.action-icon span { font-size: 18px; }.action-label { font-size: 13px; }
    .funnel-container { gap: 11px; }.funnel-stage { display: grid; grid-template-columns: 22px minmax(95px, 1fr) minmax(70px, 2.1fr) 36px; gap: 9px; align-items: center; }.funnel-index { display: grid; width: 22px; height: 22px; place-items: center; border-radius: 7px; color: var(--color-primary); background: var(--color-primary-50); font-size: 10px; font-weight: 800; }.funnel-name { font-size: 12px; font-weight: 600; }.funnel-bar-wrapper { height: 7px; border-radius: 99px; background: var(--color-bg-tertiary); }.funnel-bar { min-width: 6px; padding: 0; border-radius: inherit; background: var(--color-primary); animation: fill-funnel 0.7s cubic-bezier(0.2, 0.8, 0.2, 1); }.funnel-stage--1 .funnel-bar { background: hsl(199 58% 42%); }.funnel-stage--2 .funnel-bar { background: hsl(165 41% 36%); }.funnel-stage--3 .funnel-bar { background: hsl(35 62% 43%); }.funnel-stage--4 .funnel-bar { background: hsl(219 26% 43%); }.funnel-count { color: var(--color-text-secondary); font-size: 12px; font-variant-numeric: tabular-nums; text-align: right; }.funnel-footer { display: flex; align-items: center; gap: 9px; margin-top: 17px; padding: 11px 12px; border: 0; border-radius: 10px; color: var(--color-text-secondary); background: var(--color-primary-50); font-size: 11px; }.funnel-footer strong { color: var(--color-primary); font-variant-numeric: tabular-nums; }
    .table-card { margin-bottom: 18px; }.card-header-actions { display: inline-flex; align-items: center; gap: 10px; }.dashboard-error { display: flex; align-items: center; gap: 10px; margin: -6px 0 18px; padding: 11px 13px; border: 1px solid hsl(0 70% 82%); border-radius: 10px; color: var(--color-error); background: var(--color-error-bg); font-size: 13px; }.dashboard-error button { margin-left: auto; }.dashboard-error .anticon { font-size: 16px; }:host ::ng-deep .table-card .ant-table { background: transparent; }:host ::ng-deep .table-card .ant-table-thead > tr > th { padding-top: 10px; padding-bottom: 10px; color: var(--color-text-tertiary); background: var(--color-bg-tertiary); font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }:host ::ng-deep .table-card .ant-table-tbody > tr > td { padding-top: 13px; padding-bottom: 13px; }:host ::ng-deep .table-card .ant-table-tbody > tr:hover > td { background: var(--color-primary-50); }.candidate-avatar { color: var(--color-primary) !important; background: var(--color-primary-50) !important; }.candidate-name { font-size: 13px; font-weight: 600; }:host ::ng-deep .approvals-card.ant-card { border-left: 3px solid var(--color-warning); }
    @keyframes dashboard-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } @keyframes fill-funnel { from { transform: scaleX(0); transform-origin: left; } to { transform: scaleX(1); transform-origin: left; } }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .page-title {
      font-family: var(--font-heading);
      font-size: 28px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 8px 0;
    }

    .page-subtitle {
      font-size: 15px;
      color: hsl(218 22% 29%);
      font-weight: 500;
      margin: 0;
    }

    /* Stats Section */
    .stats-section {
      margin-bottom: 24px;
    }

    .stat-card {
      display: flex;
      position: relative;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 24px;
      background: var(--color-bg-secondary);
      border-radius: 12px;
      border: 1px solid var(--color-border-light);
      box-shadow: var(--shadow-card);
      transition: all 0.2s ease;
      height: 100%;
      color: inherit;
      text-decoration: none;

      &:hover {
        box-shadow: var(--shadow-card-hover);
        transform: translateY(-2px);
      }

      &:focus-visible {
        outline: 3px solid hsl(215 78% 48% / 0.32);
        outline-offset: 3px;
      }
    }

    .stat-icon {
      position: absolute;
      left: 16px;
      width: 52px;
      height: 52px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      span {
        font-size: 24px;
      }

      &--primary {
        background: var(--color-primary-50);
        color: var(--color-primary);
      }

      &--success {
        background: var(--color-success-bg);
        color: var(--color-success);
      }

      &--warning {
        background: var(--color-warning-bg);
        color: var(--color-warning);
      }

      &--error {
        background: var(--color-error-bg);
        color: var(--color-error);
      }
    }

    .stat-content {
      flex: 0 1 auto;
      width: 100%;
      min-width: 0;
      text-align: center;
    }

    .stat-label {
      display: block;
      padding: 0;
      font-size: 13px;
      color: var(--color-text-secondary);
      margin-bottom: 8px;
    }

    .stat-value-row {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 4px;
    }

    .stat-value {
      font-family: var(--font-heading);
      font-size: 28px;
      font-weight: 700;
      color: var(--color-text-primary);
      line-height: 1;
    }

    /* Main Content */
    .main-content {
      /* Tách nhẹ hai thẻ tổng quan khỏi bảng hồ sơ bên dưới. */
      margin-bottom: 12px !important;
    }

    /* Card Styles */
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .card-title {
      font-family: var(--font-heading);
      font-size: 17px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .card-subtitle {
      display: block;
      font-size: 13px;
      color: hsl(218 13% 41%);
      font-weight: 500;
      margin-top: 4px;
    }

    .view-all-link {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      color: var(--color-primary-light);
      font-weight: 500;

      &:hover {
        color: var(--color-primary);
      }
    }

    /* Funnel Card */
    .funnel-card {
      height: 100%;
    }

    .funnel-container {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .funnel-stage {
      display: grid;
      grid-template-columns: 22px 100px minmax(0, 1fr) 36px;
      align-items: center;
      gap: 10px;
    }

    .funnel-bar-wrapper {
      min-width: 0;
      height: 30px;
      background: var(--color-bg-tertiary);
      border-radius: 7px;
      overflow: hidden;
    }

    .funnel-bar {
      height: 100%;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 12px;
      transition: width 0.5s ease;
    }

    .funnel-count {
      font-family: var(--font-heading);
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }

    /* Quick Actions */
    .actions-card {
      height: 100%;
    }

    .quick-actions-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .action-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--color-bg-tertiary);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: var(--color-primary-50);
        transform: translateX(4px);

        .action-arrow {
          opacity: 1;
          transform: translateX(0);
        }
      }
    }

    .action-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      span {
        font-size: 20px;
      }

      .action-item--primary & {
        background: var(--color-primary-100);
        color: var(--color-primary);
      }

      .action-item--success & {
        background: var(--color-success-bg);
        color: var(--color-success);
      }

      .action-item--warning & {
        background: var(--color-warning-bg);
        color: var(--color-warning);
      }
    }

    .action-text {
      flex: 1;
      min-width: 0;
    }

    .action-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .action-desc {
      display: block;
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-top: 2px;
    }

    .action-arrow {
      color: var(--color-primary);
      opacity: 0;
      transform: translateX(-8px);
      transition: all 0.2s ease;
    }

    /* Table Card */
    .table-card {
      margin-bottom: 24px;
    }

    :host ::ng-deep .table-card .ant-table-thead > tr > th {
      text-align: center;
    }

    :host ::ng-deep .table-card .ant-table-tbody > tr > td:last-child {
      white-space: nowrap;
      text-align: center;
    }

    :host ::ng-deep .table-card .ant-table-tbody > tr > td:last-child .ant-btn {
      min-width: 32px;
      padding-inline: 5px;
    }

    :host ::ng-deep .table-card .ant-table-tbody > tr > td:last-child .ant-btn .anticon {
      font-size: 17px;
    }

    .candidate-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .candidate-avatar {
      background: var(--color-primary) !important;
      font-weight: 600;
    }

    .candidate-name {
      font-weight: 500;
      color: var(--color-text-primary);
    }

    .job-title {
      color: var(--color-text-primary);
    }

    .date-text {
      color: hsl(218 15% 39%);
      font-size: 13px;
    }

    /* Approvals Card */
    .approvals-card {
      border-left: 4px solid var(--color-warning);
    }

    .approval-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .approval-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      background: var(--color-bg-tertiary);
      border-radius: 8px;
      gap: 16px;
    }

    .approval-info {
      flex: 1;
      min-width: 0;
    }

    .approval-title {
      display: block;
      font-weight: 500;
      color: var(--color-text-primary);
      margin-bottom: 4px;
    }

    .approval-meta {
      font-size: 12px;
      color: hsl(218 13% 41%);
      font-weight: 500;
    }

    .approval-actions {
      display: flex;
      gap: 8px;
    }

    /* Animations */
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Responsive */
    @media (max-width: 767px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
      }

      .page-title {
        font-size: 24px;
      }

      .stat-card {
        padding: 16px;
      }

      .stat-icon {
        width: 44px;
        height: 44px;

        span {
          font-size: 20px;
        }
      }

      .stat-value {
        font-size: 24px;
      }

      .funnel-label {
        width: 80px;
      }

      .action-item {
        padding: 12px;
      }

      .priority-card {
        grid-template-columns: 1fr;
        padding: 20px;
      }

      .priority-actions {
        flex-wrap: wrap;
      }

      .funnel-stage {
        grid-template-columns: 22px minmax(80px, 1fr) minmax(42px, 1.3fr) 30px;
        gap: 6px;
      }

      :host ::ng-deep .actions-card .ant-card-body,
      :host ::ng-deep .funnel-card .ant-card-body,
      :host ::ng-deep .table-card .ant-card-body,
      :host ::ng-deep .approvals-card .ant-card-body {
        padding: 16px;
      }
    }

    /* Compact hierarchy for day-to-day HR use. */
    .page-title { font-size: clamp(24px, 2.45vw, 30px); }
    .priority-card { gap: 18px; padding: 18px 21px; }
    .priority-kicker { font-size: 11px; }
    .priority-copy h2 { color: #fff; font-size: 19px; font-weight: 700; }
    .priority-copy p { max-width: none; color: hsl(215 25% 85%); font-size: 12px; font-weight: 600; white-space: nowrap; }
    .priority-actions a { min-height: 34px; font-size: 11px; }
    .stat-card { min-height: 96px; padding: 14px 16px; gap: 12px; }
    .stat-icon { width: 40px; height: 40px; }
    .stat-icon span { font-size: 18px; }
    .stat-value { font-size: 25px; }
    .stat-label { font-weight: 700; }
    .stat-card { align-items: center; min-height: 0; }
    :host ::ng-deep .stats-section > .ant-col {
      display: flex;
    }
    :host ::ng-deep .stats-section.ant-row { justify-content: flex-start; }
    .stat-card { width: 100%; max-width: none; }

    @media (max-width: 767px) {
      .page-title { font-size: 24px; }
      .priority-card { padding: 17px; }
      .priority-copy p { white-space: normal; }
      :host ::ng-deep .stats-section > .ant-col { flex-basis: 100%; width: 100% !important; }
      .stat-card { width: 100%; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private dashboardService = inject(DashboardService);
  private jobService = inject(JobService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);
  private sanitizer = inject(DomSanitizer);
  authService = inject(AuthService);

  loading = signal(true);
  loadError = signal(false);

  userName = computed(() => {
    const fullName = this.authService.user()?.full_name || 'Người dùng';
    return fullName.split(' ').slice(-1)[0];
  });

  stats = signal<StatCard[]>([]);
  funnelStages = signal<FunnelStage[]>([]);
  recentApplications = signal<RecentApplication[]>([]);
  pendingApprovals = signal<{ id: number; title: string; creator: string; createdAt: string }[]>([]);
  approvalProcessingId: number | null = null;

  // Resume viewer modal state
  resumeModalVisible = false;
  resumeModalLoading = false;
  resumeModalUrl: SafeResourceUrl | null = null;
  resumeModalTitle = '';
  private resumeObjectUrl: string | null = null;

  conversionRate = computed(() => {
    const stages = this.funnelStages();
    if (stages.length < 2 || stages[0].count === 0) return 0;
    return Math.round((stages[stages.length - 1].count / stages[0].count) * 100);
  });

  quickActions = [
    {
      icon: 'plus-circle',
      label: 'Tạo tin tuyển dụng',
      description: 'Đăng tin mới ngay hôm nay',
      route: '/jobs/new',
      color: 'primary',
    },
    {
      icon: 'filter',
      label: 'Quản lý tin tuyển dụng',
      description: 'Xem và quản lý tất cả tin',
      route: '/jobs',
      color: 'success',
    },
    {
      icon: 'team',
      label: 'Quản lý người dùng',
      description: 'Quản lý tài khoản hệ thống',
      route: '/users',
      color: 'warning',
      adminOnly: true,
    },
  ];

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.dashboardService.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.buildStats(data);
          this.buildFunnel(data);
          this.buildRecentApplications(data);
          this.buildPendingApprovals(data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
        },
      });
  }

  approvePendingJob(job: { id: number }): void {
    this.modal.confirm({
      nzTitle: 'Phê duyệt tin tuyển dụng?',
      nzContent: 'Tin tuyển dụng sẽ chuyển sang trạng thái đã phê duyệt.',
      nzOkText: 'Phê duyệt',
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.approvalProcessingId = job.id;
        return firstValueFrom(this.jobService.approve(job.id, {}))
          .then(() => {
            this.message.success('Đã phê duyệt tin tuyển dụng');
            this.loadDashboard();
          })
          .catch(() => {
            this.message.error('Không thể phê duyệt tin tuyển dụng');
            return Promise.reject();
          })
          .finally(() => {
            this.approvalProcessingId = null;
          });
      },
    });
  }

  rejectPendingJob(job: { id: number }): void {
    this.modal.confirm({
      nzTitle: 'Từ chối tin tuyển dụng?',
      nzContent: `
        <div style="margin-top: 12px">
          <p style="margin-bottom: 8px">Tin tuyển dụng sẽ được trả lại để người tạo chỉnh sửa.</p>
          <label for="dashboard-reject-reason" style="display:block;margin-bottom:6px;font-weight:500">Lý do từ chối</label>
          <textarea id="dashboard-reject-reason" class="ant-input" rows="3" placeholder="Nêu rõ nội dung cần chỉnh sửa..."></textarea>
        </div>
      `,
      nzOkText: 'Từ chối',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.approvalProcessingId = job.id;
        const reason = (document.getElementById('dashboard-reject-reason') as HTMLTextAreaElement | null)?.value.trim()
          || 'Cần chỉnh sửa trước khi phê duyệt.';
        return firstValueFrom(this.jobService.reject(job.id, { reason }))
          .then(() => {
            this.message.success('Đã từ chối tin tuyển dụng');
            this.loadDashboard();
          })
          .catch(() => {
            this.message.error('Không thể từ chối tin tuyển dụng');
            return Promise.reject();
          })
          .finally(() => {
            this.approvalProcessingId = null;
          });
      },
    });
  }

  private buildStats(data: DashboardStats): void {
    this.stats.set([
      {
        title: 'Tin tuyển dụng đang mở',
        value: data.stats.active_jobs,
        icon: 'solution',
        iconColor: 'primary',
        route: '/jobs',
      },
      {
        title: 'Tổng hồ sơ ứng tuyển',
        value: data.stats.total_applications,
        icon: 'file-text',
        iconColor: 'success',
        route: '/applications',
      },
      {
        title: 'Tổng ứng viên',
        value: data.stats.total_candidates,
        icon: 'team',
        iconColor: 'warning',
        route: '/candidates',
      },
    ]);
  }

  private buildFunnel(data: DashboardStats): void {
    const sc = data.application_status_counts;
    const total = Object.values(sc).reduce((sum, v) => sum + v, 0);
    if (total === 0) {
      this.funnelStages.set([]);
      return;
    }

    const submitted = (sc['submitted'] || 0) + (sc['reviewing'] || 0) + (sc['shortlisted'] || 0) +
      (sc['interviewing'] || 0) + (sc['offered'] || 0) + (sc['hired'] || 0) + (sc['rejected'] || 0) + (sc['error'] || 0);
    const screened = (sc['reviewing'] || 0) + (sc['shortlisted'] || 0) +
      (sc['interviewing'] || 0) + (sc['offered'] || 0) + (sc['hired'] || 0) + (sc['rejected'] || 0);
    const shortlisted = (sc['shortlisted'] || 0) + (sc['interviewing'] || 0) + (sc['offered'] || 0) + (sc['hired'] || 0);
    const interviewing = (sc['interviewing'] || 0) + (sc['offered'] || 0) + (sc['hired'] || 0);
    const hired = sc['hired'] || 0;

    const pct = (v: number) => submitted > 0 ? Math.round((v / submitted) * 100) : 0;

    this.funnelStages.set([
      { name: 'Nộp hồ sơ', count: submitted, percentage: 100, color: '#1890FF' },
      { name: 'Đã sàng lọc', count: screened, percentage: pct(screened), color: '#52C41A' },
      { name: 'Vào vòng', count: shortlisted, percentage: pct(shortlisted), color: '#FA8C16' },
      { name: 'Phỏng vấn', count: interviewing, percentage: pct(interviewing), color: '#722ED1' },
      { name: 'Tuyển dụng', count: hired, percentage: pct(hired), color: '#13C2C2' },
    ]);
  }

  private buildRecentApplications(data: DashboardStats): void {
    this.recentApplications.set(
      data.recent_applications.map((app) => ({
        id: app.id,
        jobId: app.job_id,
        candidateName: app.candidate_name,
        jobTitle: app.job_title,
        appliedAt: app.submitted_at ? this.formatTimeAgo(app.submitted_at) : '',
        status: app.status,
      }))
    );
  }

  private buildPendingApprovals(data: DashboardStats): void {
    this.pendingApprovals.set(
      data.pending_approvals.map((job) => ({
        id: job.id,
        title: job.title,
        creator: job.creator,
        createdAt: job.created_at ? this.formatTimeAgo(job.created_at) : '',
      }))
    );
  }

  private formatTimeAgo(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  }

  getInitial(name: string): string {
    return name?.charAt(0)?.toUpperCase() || 'U';
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      submitted: 'default',
      reviewing: 'processing',
      shortlisted: 'green',
      interviewing: 'geekblue',
      offered: 'gold',
      hired: 'success',
      rejected: 'error',
      error: 'volcano',
    };
    return colors[status] || 'default';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      submitted: 'Đã nộp',
      reviewing: 'Đang xem',
      shortlisted: 'Vào vòng',
      interviewing: 'Phỏng vấn',
      offered: 'Đề xuất',
      hired: 'Đã tuyển',
      rejected: 'Từ chối',
      error: 'Lỗi',
    };
    return labels[status] || status;
  }

  downloadResume(app: RecentApplication): void {
    this.jobService.downloadResume(app.jobId, app.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${app.candidateName}_CV.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.message.error('Không thể tải CV');
      },
    });
  }

  viewResume(app: RecentApplication): void {
    this.resumeModalTitle = app.candidateName;
    this.releaseResumeObjectUrl();
    this.resumeModalUrl = null;
    this.resumeModalLoading = true;
    this.resumeModalVisible = true;

    // Tải qua HttpClient có Bearer token, rồi nhúng blob cùng origin vào iframe.
    // Cách này không bị trình duyệt chặn vì chính sách frame của endpoint API.
    this.jobService.downloadResume(app.jobId, app.id).subscribe({
      next: (blob) => {
        const pdfBlob = new Blob([blob], { type: blob.type || 'application/pdf' });
        this.resumeObjectUrl = URL.createObjectURL(pdfBlob);
        this.resumeModalUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.resumeObjectUrl);
        this.resumeModalLoading = false;
      },
      error: () => {
        this.resumeModalLoading = false;
        this.resumeModalVisible = false;
        this.message.error('Không thể tải CV');
      },
    });
  }

  closeResumeModal(): void {
    this.resumeModalVisible = false;
    this.resumeModalUrl = null;
    this.releaseResumeObjectUrl();
  }

  private releaseResumeObjectUrl(): void {
    if (this.resumeObjectUrl) {
      URL.revokeObjectURL(this.resumeObjectUrl);
      this.resumeObjectUrl = null;
    }
  }

}
