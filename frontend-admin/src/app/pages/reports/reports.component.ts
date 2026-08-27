import { Component, signal, computed, OnInit, inject, DestroyRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzMessageService } from 'ng-zorro-antd/message';
import {
  ReportService,
  ReportsOverview,
  DailyCount,
  ScoreBucket,
} from '../../core/services/report.service';

const JOB_STATUS_ORDER = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'active',
  'closed',
] as const;

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzCardModule,
    NzGridModule,
    NzIconModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzSelectModule,
    NzToolTipModule,
    NzEmptyModule,
    NzSpinModule,
    NzDividerModule,
  ],
  template: `
    <div class="reports">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Báo cáo tuyển dụng</h1>
          <p class="page-subtitle">
            Thống kê tuyển dụng của công ty bạn
          </p>
        </div>
        <div class="header-actions">
          <nz-select
            [(ngModel)]="selectedDays"
            (ngModelChange)="onPeriodChange($event)"
            style="width: 180px"
          >
            <nz-option [nzValue]="7" nzLabel="7 ngày gần đây"></nz-option>
            <nz-option [nzValue]="30" nzLabel="30 ngày gần đây"></nz-option>
            <nz-option [nzValue]="90" nzLabel="90 ngày gần đây"></nz-option>
            <nz-option [nzValue]="365" nzLabel="1 năm gần đây"></nz-option>
          </nz-select>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <nz-spin nzSimple [nzSize]="'large'"></nz-spin>
          <p class="loading-text">Đang tải báo cáo...</p>
        </div>
      } @else {
        <!-- KPI Summary Cards -->
        <div nz-row [nzGutter]="[20, 20]" class="kpi-section">
          @for (kpi of kpis(); track kpi.label) {
            <div nz-col [nzXs]="24" [nzSm]="12" [nzLg]="8">
              <div class="kpi-card static-display-card static-kpi-card" [class]="'kpi-card kpi-card--' + kpi.color + ' static-display-card static-kpi-card static-kpi-card--' + kpi.color">
                <div class="kpi-icon static-kpi-icon">
                  <span nz-icon [nzType]="kpi.icon" nzTheme="outline"></span>
                </div>
                <div class="kpi-content static-kpi-content">
                  <div class="kpi-label static-kpi-label">{{ kpi.label }}</div>
                  <div class="kpi-value static-kpi-value">{{ kpi.value }}</div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Charts Row -->
        <div nz-row [nzGutter]="[24, 24]" class="charts-section">
          <!-- Application Trend Chart -->
          <div nz-col [nzXs]="24" [nzLg]="16">
            <nz-card class="chart-card">
              <div class="card-header">
                <h3 class="card-title">
                  <span nz-icon nzType="line-chart" nzTheme="outline"></span>
                  Xu hướng ứng tuyển
                </h3>
                <span class="card-subtitle">{{ selectedDays }} ngày gần đây</span>
              </div>
              <div class="trend-chart">
                @if (trendData().length === 0) {
                  <nz-empty nzNotFoundContent="Chưa có dữ liệu"></nz-empty>
                } @else {
                  <div class="trend-chart-container">
                    <div class="trend-y-axis">
                      <span class="y-label">{{ trendMax() }}</span>
                      <span class="y-label">{{ Math.round(trendMax() / 2) }}</span>
                      <span class="y-label">0</span>
                    </div>
                    <div class="trend-bars-wrapper">
                      <div class="trend-grid-lines">
                        <div class="grid-line"></div>
                        <div class="grid-line"></div>
                        <div class="grid-line"></div>
                      </div>
                      <div class="trend-bars" [class.trend-bars--sparse]="trendActiveCount() <= 10">
                        @for (item of trendData(); track item.date) {
                          <div
                            class="trend-bar-col"
                            [nz-tooltip]="item.date + ': ' + item.count + ' hồ sơ'"
                            [class.trend-bar-col--active]="item.count > 0"
                          >
                            <div
                              class="trend-bar"
                              [style.height.%]="trendMax() > 0 ? (item.count / trendMax()) * 100 : 0"
                              [class.trend-bar--zero]="item.count === 0"
                            >
                              @if (item.count > 0) {
                                <span class="trend-value">{{ item.count }}</span>
                              }
                            </div>
                          </div>
                        }
                      </div>
                      <div class="trend-x-axis">
                        @for (label of trendXLabels(); track label.index) {
                          <span class="x-label" [style.left.%]="label.position">{{ label.text }}</span>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </nz-card>
          </div>

          <!-- Score Distribution -->
          <div nz-col [nzXs]="24" [nzLg]="8">
            <nz-card class="chart-card">
              <div class="card-header">
                <h3 class="card-title">
                  <span nz-icon nzType="bar-chart" nzTheme="outline"></span>
                  Phân bố điểm AI
                </h3>
                <span class="card-subtitle">Điểm 0-100</span>
              </div>
              <div class="score-chart">
                @for (bucket of scoreData(); track bucket.range) {
                  <div class="score-row">
                    <span class="score-label">{{ bucket.range }}</span>
                    <div class="score-bar-track">
                      <div
                        class="score-bar-fill"
                        [style.width.%]="scoreMax() > 0 ? (bucket.count / scoreMax()) * 100 : 0"
                        [class]="getScoreBarClass(bucket.range)"
                      ></div>
                    </div>
                    <span class="score-count">{{ bucket.count }}</span>
                  </div>
                }
              </div>
            </nz-card>
          </div>
        </div>

        <!-- Status Breakdown Row -->
        <div nz-row [nzGutter]="[24, 24]" class="status-section">
          <!-- Application Status -->
          <div nz-col [nzXs]="24" [nzMd]="12">
            <nz-card class="chart-card">
              <div class="card-header">
                <h3 class="card-title">
                  <span nz-icon nzType="pie-chart" nzTheme="outline"></span>
                  Trạng thái hồ sơ
                </h3>
              </div>
              <div class="status-breakdown">
                @for (item of appStatusData(); track item.status) {
                  <div class="status-item">
                    <div class="status-info">
                      <nz-tag [nzColor]="getAppStatusColor(item.status)">
                        {{ getAppStatusLabel(item.status) }}
                      </nz-tag>
                    </div>
                    <div class="status-bar-track">
                      <div
                        class="status-bar-fill"
                        [style.width.%]="data()!.total_applications > 0
                          ? (item.count / data()!.total_applications) * 100
                          : 0"
                        [style.background]="getAppStatusHex(item.status)"
                      ></div>
                    </div>
                    <div class="status-count">
                      <strong>{{ item.count }}</strong>
                      <span class="status-pct">
                        ({{ data()!.total_applications > 0
                          ? Math.round((item.count / data()!.total_applications) * 100)
                          : 0 }}%)
                      </span>
                    </div>
                  </div>
                }
              </div>
            </nz-card>
          </div>

          <!-- Job Status -->
          <div nz-col [nzXs]="24" [nzMd]="12">
            <nz-card class="chart-card">
              <div class="card-header">
                <h3 class="card-title">
                  <span nz-icon nzType="apartment" nzTheme="outline"></span>
                  Trạng thái tin tuyển dụng
                </h3>
              </div>
              <div class="status-breakdown">
                @for (item of jobStatusData(); track item.status) {
                  <div class="status-item">
                    <div class="status-info">
                      <nz-tag [nzColor]="getJobStatusColor(item.status)">
                        {{ getJobStatusLabel(item.status) }}
                      </nz-tag>
                    </div>
                    <div class="status-bar-track">
                      <div
                        class="status-bar-fill"
                        [style.width.%]="data()!.total_jobs > 0
                          ? (item.count / data()!.total_jobs) * 100
                          : 0"
                        [style.background]="getJobStatusHex(item.status)"
                      ></div>
                    </div>
                    <div class="status-count">
                      <strong>{{ item.count }}</strong>
                      <span class="status-pct">
                        ({{ data()!.total_jobs > 0
                          ? Math.round((item.count / data()!.total_jobs) * 100)
                          : 0 }}%)
                      </span>
                    </div>
                  </div>
                }
              </div>
            </nz-card>
          </div>
        </div>

        <!-- Top Jobs & Department Tables -->
        <div nz-row [nzGutter]="[24, 24]" class="tables-section">
          <!-- Top Jobs -->
          <div nz-col [nzXs]="24" [nzLg]="12">
            <nz-card #topJobsCard class="table-card">
              <div class="card-header">
                <h3 class="card-title">
                  <span nz-icon nzType="trophy" nzTheme="outline"></span>
                  Top vị trí tuyển dụng
                </h3>
                <span class="card-subtitle">Theo số lượng hồ sơ</span>
              </div>
              <nz-table
                #topJobsTable
                [nzData]="topJobs()"
                [nzShowPagination]="false"
                [nzFrontPagination]="false"
                nzSize="middle"
                [nzNoResult]="noJobsTemplate"
              >
                <thead>
                  <tr>
                    <th nzWidth="50px">#</th>
                    <th>Vị trí</th>
                    <th>Ngành nghề</th>
                    <th nzWidth="100px">Hồ sơ</th>
                    <th nzWidth="110px">Điểm TB</th>
                  </tr>
                </thead>
                <tbody>
                  @for (job of topJobsTable.data; track job.job_id; let i = $index) {
                    <tr>
                      <td>
                        <span class="rank-badge" [class]="'rank-badge--' + (i < 3 ? i : 'default')">
                          {{ i + 1 }}
                        </span>
                      </td>
                      <td>
                        <a [routerLink]="['/jobs', job.job_id]" class="job-link">{{ job.title }}</a>
                      </td>
                      <td>
                        <span class="dept-text">{{ job.department || 'Chưa phân loại' }}</span>
                      </td>
                      <td>
                        <strong>{{ job.application_count }}</strong>
                      </td>
                      <td>
                        @if (job.avg_score !== null) {
                          <div class="score-pill" [class]="getScorePillClass(job.avg_score)">
                            {{ job.avg_score }}
                          </div>
                        } @else {
                          <span class="no-score">--</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </nz-table>
              <ng-template #noJobsTemplate>
                <nz-empty nzNotFoundContent="Chưa có dữ liệu"></nz-empty>
              </ng-template>
            </nz-card>
          </div>

          <!-- Department Stats -->
          <div nz-col [nzXs]="24" [nzLg]="12">
            <nz-card class="table-card department-card" [style.height.px]="topJobsHeight()">
              <div class="card-header">
                <h3 class="card-title">
                  <span nz-icon nzType="bank" nzTheme="outline"></span>
                  Thống kê ngành nghề
                </h3>
              </div>
              <div class="dept-list">
                @for (dept of deptStats(); track dept.department) {
                  <div class="dept-item">
                    <div class="dept-header">
                      <span class="dept-name">{{ dept.department }}</span>
                      @if (dept.avg_score !== null) {
                        <span class="dept-score" [class]="getScorePillClass(dept.avg_score)">
                          {{ dept.avg_score }} điểm
                        </span>
                      }
                    </div>
                    <div class="dept-metrics">
                      <span class="dept-metric">
                        <span nz-icon nzType="solution" nzTheme="outline"></span>
                        {{ dept.job_count }} tin
                      </span>
                      <span class="dept-metric">
                        <span nz-icon nzType="file-text" nzTheme="outline"></span>
                        {{ dept.application_count }} hồ sơ
                      </span>
                    </div>
                    <div class="dept-bar-track">
                      <div
                        class="dept-bar-fill"
                        [style.width.%]="deptMaxApps() > 0
                          ? (dept.application_count / deptMaxApps()) * 100
                          : 0"
                      ></div>
                    </div>
                  </div>
                }
                @if (deptStats().length === 0) {
                  <nz-empty nzNotFoundContent="Chưa có dữ liệu"></nz-empty>
                }
              </div>
            </nz-card>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .reports {
      animation: fadeIn 0.3s ease-out;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .page-title {
      font-family: var(--font-heading);
      font-size: clamp(24px, 2.45vw, 30px);
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

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 50vh;
      gap: 16px;
    }

    .loading-text {
      color: var(--color-text-secondary);
      font-size: 15px;
    }

    /* KPI Cards */
    .kpi-section {
      margin-bottom: 24px;
    }

    .kpi-card {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 96px;
      padding: 14px 16px;
      background: var(--color-bg-secondary);
      border-radius: 12px;
      border: 1px solid var(--color-border-light);
      box-shadow: var(--shadow-card);
      text-align: center;
      transition: all 0.2s ease;
      height: 100%;

      &:hover {
        box-shadow: var(--shadow-card-hover);
        transform: translateY(-2px);
      }
    }

    .kpi-icon {
      position: absolute;
      left: 16px;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      font-size: 18px;

      .kpi-card--primary & {
        background: var(--color-primary-50);
        color: var(--color-primary);
      }
      .kpi-card--success & {
        background: var(--color-success-bg);
        color: var(--color-success);
      }
      .kpi-card--warning & {
        background: var(--color-warning-bg);
        color: var(--color-warning);
      }
      .kpi-card--error & {
        background: var(--color-error-bg);
        color: var(--color-error);
      }
      .kpi-card--info & {
        background: var(--color-info-bg);
        color: var(--color-info);
      }
      .kpi-card--purple & {
        background: #F9F0FF;
        color: #722ED1;
      }
    }

    .kpi-value {
      font-family: var(--font-heading);
      font-size: 25px;
      font-weight: 700;
      color: var(--color-text-primary);
      line-height: 1;
    }

    .kpi-content {
      width: 100%;
      min-width: 0;
      text-align: center;
    }

    .kpi-label {
      font-size: 13px;
      color: var(--color-text-secondary);
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: 8px;
    }

    :host ::ng-deep .kpi-section > .ant-col {
      display: flex;
    }

    .kpi-card {
      width: 100%;
    }

    /* Card Styles */
    .charts-section, .status-section, .tables-section {
      margin-bottom: 24px;
    }

    .chart-card {
      height: 100%;
    }

    :host ::ng-deep .charts-section > .ant-col {
      display: flex;
    }

    :host ::ng-deep .charts-section .chart-card {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    :host ::ng-deep .charts-section .chart-card > .ant-card-body {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }

    .table-card {
      height: auto;
    }

    :host ::ng-deep .tables-section > .ant-col {
      display: block;
    }

    :host ::ng-deep .tables-section nz-card.department-card,
    :host ::ng-deep .tables-section .department-card.ant-card {
      display: flex;
      flex-direction: column;
      width: 100%;
      overflow: hidden;
    }

    :host ::ng-deep .tables-section nz-card.department-card > .ant-card-body,
    :host ::ng-deep .tables-section .department-card.ant-card > .ant-card-body {
      display: flex;
      flex: 1;
      min-height: 0;
      flex-direction: column;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .card-title {
      font-family: var(--font-heading);
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;

      span[nz-icon] {
        font-size: 18px;
        color: var(--color-primary-light);
      }
    }

    .card-subtitle {
      font-size: 13px;
      color: var(--color-text-tertiary);
    }

    /* Trend Chart */
    .trend-chart-container {
      display: flex;
      gap: 8px;
      width: 100%;
      height: 100%;
      min-height: 240px;
    }

    .trend-chart {
      display: flex;
      flex: 1;
      min-height: 0;
      width: 100%;
    }

    .trend-y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding-top: 16px;
      padding-bottom: 28px;
      min-width: 32px;
      text-align: right;
    }

    .y-label {
      font-size: 11px;
      color: var(--color-text-tertiary);
    }

    .trend-bars-wrapper {
      flex: 1;
      position: relative;
      padding: 16px 0 28px;
    }

    .trend-grid-lines {
      position: absolute;
      top: 16px;
      left: 0;
      right: 0;
      bottom: 28px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      pointer-events: none;
    }

    .grid-line {
      height: 1px;
      background: var(--color-border-light);
    }

    .trend-bars {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      height: calc(100% - 44px);
      gap: clamp(4px, 0.8vw, 10px);
    }

    .trend-bar-col {
      flex: 1 1 0;
      max-width: 22px;
      height: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      cursor: pointer;
      min-width: 4px;
    }

    .trend-bars--sparse .trend-bar-col--active {
      flex: 0 0 clamp(22px, 2.7vw, 30px);
      max-width: 30px;
      min-width: 22px;
    }

    .trend-bar {
      position: relative;
      width: 100%;
      background: linear-gradient(180deg, hsl(208 82% 62%), hsl(214 78% 47%));
      border-radius: 6px 6px 2px 2px;
      min-height: 0;
      box-shadow: 0 5px 12px hsl(215 75% 45% / 0.2);
      transform-origin: bottom;
      animation: trend-bar-enter 0.48s cubic-bezier(0.22, 1, 0.36, 1) both;
      transition: height 0.3s ease, background 0.15s ease, transform 0.2s ease;

      .trend-bar-col:hover & {
        background: linear-gradient(180deg, hsl(207 88% 58%), hsl(220 80% 43%));
        transform: scaleX(1.08);
      }

      &--zero {
        min-height: 2px;
        background: var(--color-border-light);
        box-shadow: none;
        animation: none;
      }
    }

    .trend-value {
      position: absolute;
      left: 50%;
      bottom: calc(100% + 5px);
      transform: translateX(-50%);
      color: hsl(218 35% 31%);
      font-size: 10px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      line-height: 1;
      pointer-events: none;
    }

    @keyframes trend-bar-enter {
      from {
        opacity: 0;
        transform: scaleY(0.12);
      }

      to {
        opacity: 1;
        transform: scaleY(1);
      }
    }

    .trend-x-axis {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 24px;
    }

    .x-label {
      position: absolute;
      font-size: 11px;
      color: var(--color-text-tertiary);
      transform: translateX(-50%);
      white-space: nowrap;
    }

    /* Score Distribution Chart */
    .score-chart {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .score-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .score-label {
      width: 50px;
      font-size: 12px;
      color: var(--color-text-secondary);
      text-align: right;
      flex-shrink: 0;
    }

    .score-bar-track {
      flex: 1;
      height: 22px;
      background: var(--color-bg-tertiary);
      border-radius: 4px;
      overflow: hidden;
    }

    .score-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.4s ease;

      &.score-low { background: var(--color-error); }
      &.score-mid { background: var(--color-warning); }
      &.score-high { background: var(--color-success); }
      &.score-top { background: var(--color-primary-light); }
    }

    .score-count {
      width: 32px;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-primary);
      text-align: right;
      flex-shrink: 0;
    }

    /* Status Breakdown */
    .status-breakdown {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-info {
      width: 100px;
      flex-shrink: 0;
    }

    .status-bar-track {
      flex: 1;
      height: 20px;
      background: var(--color-bg-tertiary);
      border-radius: 4px;
      overflow: hidden;
    }

    .status-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.4s ease;
    }

    .status-count {
      min-width: 70px;
      text-align: right;
      font-size: 13px;
      flex-shrink: 0;
    }

    .status-pct {
      color: var(--color-text-tertiary);
      font-size: 12px;
    }

    /* Top Jobs Table */
    .rank-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      font-family: var(--font-heading);

      &--0 {
        background: #FFF7E6;
        color: #D46B08;
      }
      &--1 {
        background: #F0F5FF;
        color: #2F54EB;
      }
      &--2 {
        background: #FFF1F0;
        color: #CF1322;
      }
      &--default {
        background: var(--color-bg-tertiary);
        color: var(--color-text-secondary);
      }
    }

    .job-link {
      font-weight: 500;
      color: var(--color-primary-light);

      &:hover {
        color: var(--color-primary);
        text-decoration: underline;
      }
    }

    .dept-text {
      color: var(--color-text-secondary);
      font-size: 13px;
    }

    .score-pill {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;

      &.pill-low {
        background: var(--color-error-bg);
        color: var(--color-error-dark);
      }
      &.pill-mid {
        background: var(--color-warning-bg);
        color: var(--color-warning-dark);
      }
      &.pill-high {
        background: var(--color-success-bg);
        color: var(--color-success-dark);
      }
      &.pill-top {
        background: var(--color-primary-50);
        color: var(--color-primary);
      }
    }

    .no-score {
      color: var(--color-text-tertiary);
    }

    /* Department Stats */
    .dept-list {
      display: flex;
      flex: 1;
      min-height: 0;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-gutter: stable;
      padding-right: 6px;
      scrollbar-color: hsl(214 25% 75%) transparent;
      scrollbar-width: thin;
    }

    .dept-list::-webkit-scrollbar {
      width: 6px;
    }

    .dept-list::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: hsl(214 25% 72%);
    }

    .dept-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .dept-item {
      padding: 14px 16px;
      background: var(--color-bg-tertiary);
      border-radius: 10px;
      transition: background 0.15s ease;

      &:hover {
        background: var(--color-primary-50);
      }
    }

    .dept-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .dept-name {
      font-weight: 600;
      font-size: 14px;
      color: var(--color-text-primary);
    }

    .dept-score {
      font-size: 12px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
    }

    .dept-metrics {
      display: flex;
      gap: 16px;
      margin-bottom: 10px;
    }

    .dept-metric {
      font-size: 13px;
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      gap: 4px;

      span[nz-icon] {
        font-size: 14px;
      }
    }

    .dept-bar-track {
      height: 6px;
      background: var(--color-border-light);
      border-radius: 3px;
      overflow: hidden;
    }

    .dept-bar-fill {
      height: 100%;
      background: var(--color-primary-light);
      border-radius: 3px;
      transition: width 0.4s ease;
    }

    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
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

      .kpi-value {
        font-size: 22px;
      }

      .trend-chart-container {
        height: 180px;
        min-height: 180px;
      }

      .status-item {
        flex-wrap: wrap;
      }

      .status-info {
        width: 80px;
      }

      .status-count {
        min-width: 60px;
      }
    }
  `],
})
export class ReportsComponent implements OnInit {
  Math = Math;

  private destroyRef = inject(DestroyRef);
  private reportService = inject(ReportService);
  private message = inject(NzMessageService);
  private topJobsResizeObserver?: ResizeObserver;

  @ViewChild('topJobsCard', { read: ElementRef }) topJobsCard?: ElementRef<HTMLElement>;

  loading = signal(true);
  data = signal<ReportsOverview | null>(null);
  topJobsHeight = signal<number | null>(null);
  selectedDays = 30;

  kpis = computed(() => {
    const d = this.data();
    if (!d) return [];
    return [
      { label: 'Tin tuyển dụng', value: d.total_jobs, icon: 'solution', color: 'primary' },
      { label: 'Đang đăng tin', value: d.active_jobs, icon: 'check-circle', color: 'success' },
      { label: 'Hồ sơ nhận được', value: d.total_applications, icon: 'file-text', color: 'info' },
      { label: 'Đã chấm điểm', value: d.scored_applications, icon: 'robot', color: 'purple' },
      { label: 'Điểm trung bình', value: d.avg_score ?? '--', icon: 'dashboard', color: 'warning' },
      { label: 'Đã tuyển', value: d.hired_count, icon: 'user-add', color: 'success' },
    ];
  });

  trendData = computed(() => this.data()?.application_trend ?? []);
  trendMax = computed(() => {
    const items = this.trendData();
    const max = items.reduce((m, i) => Math.max(m, i.count), 0);
    return max || 1;
  });
  trendActiveCount = computed(() =>
    this.trendData().filter(item => item.count > 0).length
  );
  trendXLabels = computed(() => {
    const items = this.trendData();
    if (items.length === 0) return [];
    const lastIndex = Math.max(1, items.length - 1);
    const step = Math.max(1, Math.floor(items.length / 6));
    const labels: { text: string; position: number; index: number }[] = [];
    for (let i = 0; i < items.length; i += step) {
      const d = items[i].date;
      const parts = d.split('-');
      labels.push({
        text: `${parts[2]}/${parts[1]}`,
        position: (i / lastIndex) * 100,
        index: i,
      });
    }
    return labels;
  });

  scoreData = computed(() => this.data()?.score_distribution ?? []);
  scoreMax = computed(() =>
    this.scoreData().reduce((m, b) => Math.max(m, b.count), 0) || 1
  );

  appStatusData = computed(() => {
    const items = this.data()?.application_by_status ?? [];
    return [...items].sort((a, b) => b.count - a.count);
  });

  jobStatusData = computed(() => {
    const countsByStatus = new Map(
      (this.data()?.job_by_status ?? []).map((item) => [item.status, item.count]),
    );

    // Luôn hiển thị đủ vòng đời tin tuyển dụng, kể cả khi trạng thái chưa có dữ liệu.
    return JOB_STATUS_ORDER.map((status) => ({
      status,
      count: countsByStatus.get(status) ?? 0,
    }));
  });

  topJobs = computed(() => this.data()?.top_jobs ?? []);
  deptStats = computed(() => this.data()?.department_stats ?? []);
  deptMaxApps = computed(() =>
    this.deptStats().reduce((m, d) => Math.max(m, d.application_count), 0) || 1
  );

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.topJobsResizeObserver?.disconnect());
    this.loadReport();
  }

  onPeriodChange(days: number): void {
    this.selectedDays = days;
    this.loadReport();
  }

  private loadReport(): void {
    this.loading.set(true);
    this.reportService
      .getOverview(this.selectedDays)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.loading.set(false);
          this.syncDepartmentCardHeight();
        },
        error: () => {
          this.message.error('Không thể tải báo cáo. Vui lòng thử lại.');
          this.loading.set(false);
        },
      });
  }

  private syncDepartmentCardHeight(): void {
    requestAnimationFrame(() => {
      const element = this.topJobsCard?.nativeElement;
      if (!element) return;

      this.topJobsResizeObserver?.disconnect();
      const updateHeight = () => this.topJobsHeight.set(Math.ceil(element.getBoundingClientRect().height));
      updateHeight();
      this.topJobsResizeObserver = new ResizeObserver(updateHeight);
      this.topJobsResizeObserver.observe(element);
    });
  }

  getScoreBarClass(range: string): string {
    const start = parseInt(range.split('-')[0], 10);
    if (start < 30) return 'score-low';
    if (start < 60) return 'score-mid';
    if (start < 80) return 'score-high';
    return 'score-top';
  }

  getScorePillClass(score: number): string {
    if (score < 30) return 'pill-low';
    if (score < 60) return 'pill-mid';
    if (score < 80) return 'pill-high';
    return 'pill-top';
  }

  getAppStatusColor(status: string): string {
    const map: Record<string, string> = {
      submitted: 'default',
      reviewing: 'processing',
      shortlisted: 'green',
      interviewing: 'geekblue',
      offered: 'gold',
      hired: 'success',
      rejected: 'error',
      error: 'volcano',
    };
    return map[status] || 'default';
  }

  getAppStatusLabel(status: string): string {
    const map: Record<string, string> = {
      submitted: 'Đã nộp',
      reviewing: 'Đang xem',
      shortlisted: 'Vào vòng',
      interviewing: 'Phỏng vấn',
      offered: 'Đề xuất',
      hired: 'Đã tuyển',
      rejected: 'Từ chối',
      error: 'Lỗi',
    };
    return map[status] || status;
  }

  getAppStatusHex(status: string): string {
    const map: Record<string, string> = {
      submitted: '#8C8C8C',
      reviewing: '#1890FF',
      shortlisted: '#52C41A',
      interviewing: '#2F54EB',
      offered: '#FA8C16',
      hired: '#52C41A',
      rejected: '#FF4D4F',
      error: '#FA541C',
    };
    return map[status] || '#8C8C8C';
  }

  getJobStatusColor(status: string): string {
    const map: Record<string, string> = {
      draft: 'default',
      pending_approval: 'gold',
      approved: 'blue',
      rejected: 'error',
      active: 'success',
      closed: 'default',
    };
    return map[status] || 'default';
  }

  getJobStatusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Nháp',
      pending_approval: 'Chờ duyệt',
      approved: 'Đã duyệt',
      rejected: 'Từ chối',
      active: 'Đang mở',
      closed: 'Đã đóng',
    };
    return map[status] || status;
  }

  getJobStatusHex(status: string): string {
    const map: Record<string, string> = {
      draft: '#8C8C8C',
      pending_approval: '#FA8C16',
      approved: '#1890FF',
      rejected: '#FF4D4F',
      active: '#52C41A',
      closed: '#BFBFBF',
    };
    return map[status] || '#8C8C8C';
  }
}
