import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { AuthService } from '../../core/auth/auth.service';
import { ApplicationService } from '../../core/services/application.service';
import {
  Application,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  ApplicationStatus,
} from '../../shared/models/application.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzGridModule,
    NzCardModule,
    NzStatisticModule,
    NzIconModule,
    NzButtonModule,
    NzTagModule,
    NzEmptyModule,
    NzSpinModule,
  ],
  template: `
    <div class="dashboard-page">
      <div class="container">
        <div class="page-header">
          <h1>Xin chào, {{ authService.user()?.full_name }}!</h1>
          <p>Quản lý hồ sơ ứng tuyển và theo dõi tiến độ của bạn</p>
        </div>

        <!-- Stats Cards -->
        <div nz-row [nzGutter]="[16, 16]" class="stats-row">
          <div nz-col [nzXs]="12" [nzSm]="6">
            <nz-card class="stat-card">
              <nz-statistic
                nzTitle="Đã ứng tuyển"
                [nzValue]="stats.total"
                [nzPrefix]="totalPrefix"
              ></nz-statistic>
              <ng-template #totalPrefix>
                <span nz-icon nzType="file-text" nzTheme="outline"></span>
              </ng-template>
            </nz-card>
          </div>
          <div nz-col [nzXs]="12" [nzSm]="6">
            <nz-card class="stat-card in-review">
              <nz-statistic
                nzTitle="Đang xem xét"
                [nzValue]="stats.inReview"
                [nzPrefix]="reviewPrefix"
              ></nz-statistic>
              <ng-template #reviewPrefix>
                <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
              </ng-template>
            </nz-card>
          </div>
          <div nz-col [nzXs]="12" [nzSm]="6">
            <nz-card class="stat-card shortlisted">
              <nz-statistic
                nzTitle="Vòng tiếp theo"
                [nzValue]="stats.shortlisted"
                [nzPrefix]="shortlistPrefix"
              ></nz-statistic>
              <ng-template #shortlistPrefix>
                <span nz-icon nzType="star" nzTheme="outline"></span>
              </ng-template>
            </nz-card>
          </div>
          <div nz-col [nzXs]="12" [nzSm]="6">
            <nz-card class="stat-card selected">
              <nz-statistic
                nzTitle="Đã tuyển"
                [nzValue]="stats.selected"
                [nzPrefix]="selectedPrefix"
              ></nz-statistic>
              <ng-template #selectedPrefix>
                <span nz-icon nzType="trophy" nzTheme="outline"></span>
              </ng-template>
            </nz-card>
          </div>
        </div>

        <!-- Recent Applications -->
        <nz-card class="section-card">
          <div class="section-header">
            <h2>Ứng tuyển gần đây</h2>
            <a routerLink="/dashboard/applications" nz-button nzType="link">
              Xem tất cả
              <span nz-icon nzType="arrow-right" nzTheme="outline"></span>
            </a>
          </div>

          @if (loading) {
            <div class="loading-wrapper">
              <nz-spin nzSize="default"></nz-spin>
            </div>
          } @else if (recentApplications.length === 0) {
            <nz-empty
              nzNotFoundImage="simple"
              nzNotFoundContent="Bạn chưa có hồ sơ ứng tuyển nào"
            >
              <a routerLink="/jobs" nz-button nzType="primary">
                Tìm việc làm
              </a>
            </nz-empty>
          } @else {
            <div class="applications-list">
              @for (app of recentApplications; track app.id) {
                <div class="application-item" [routerLink]="['/dashboard/applications', app.id]">
                  <div class="app-info">
                    <div class="job-title">{{ app.job_title }}</div>
                    <div class="job-meta">
                      @if (app.job_department) {
                        <span>{{ app.job_department }}</span>
                      }
                      @if (app.job_location) {
                        <span>{{ app.job_location }}</span>
                      }
                    </div>
                  </div>
                  <div class="app-status">
                    <nz-tag [nzColor]="getStatusColor(app.public_status)">
                      {{ getStatusLabel(app.public_status) }}
                    </nz-tag>
                  </div>
                  <div class="app-date">
                    {{ app.submitted_at | date: 'dd/MM/yyyy' }}
                  </div>
                </div>
              }
            </div>
          }
        </nz-card>

        <!-- Quick Actions -->
        <div nz-row [nzGutter]="16" class="actions-row">
          <div nz-col [nzXs]="24" [nzSm]="12">
            <nz-card class="action-card" routerLink="/dashboard/profile">
              <div class="action-content">
                <span nz-icon nzType="user" nzTheme="outline" class="action-icon"></span>
                <div>
                  <h3>Hồ sơ cá nhân</h3>
                  <p>Cập nhật thông tin và CV của bạn</p>
                </div>
              </div>
            </nz-card>
          </div>
          <div nz-col [nzXs]="24" [nzSm]="12">
            <nz-card class="action-card" routerLink="/jobs">
              <div class="action-content">
                <span nz-icon nzType="search" nzTheme="outline" class="action-icon"></span>
                <div>
                  <h3>Tìm việc làm</h3>
                  <p>Khám phá cơ hội nghề nghiệp mới</p>
                </div>
              </div>
            </nz-card>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-page {
        padding: var(--space-8) 0;
        min-height: 100vh;
        background: var(--color-bg-primary);
      }

      .container {
        max-width: var(--container-max);
        margin: 0 auto;
        padding: 0 var(--container-padding);
      }

      .page-header {
        margin-bottom: var(--space-8);

        h1 {
          font-family: var(--font-heading);
          font-size: var(--text-2xl);
          font-weight: var(--font-bold);
          color: var(--color-text-primary);
          margin-bottom: var(--space-2);
        }

        p {
          color: var(--color-text-secondary);
        }
      }

      .stats-row {
        margin-bottom: var(--space-8);
      }

      .stat-card {
        text-align: center;

        .ant-statistic-title {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
        }

        .ant-statistic-content {
          font-size: var(--text-2xl);
        }

        .anticon {
          margin-right: var(--space-2);
          color: var(--color-primary);
        }
      }

      .section-card {
        margin-bottom: var(--space-8);
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-4);

        h2 {
          font-family: var(--font-heading);
          font-size: var(--text-lg);
          font-weight: var(--font-semibold);
          margin: 0;
        }
      }

      .loading-wrapper {
        display: flex;
        justify-content: center;
        padding: var(--space-8);
      }

      .applications-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }

      .application-item {
        display: flex;
        align-items: center;
        gap: var(--space-4);
        padding: var(--space-4);
        background: var(--color-bg-tertiary);
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: all var(--transition-fast);

        &:hover {
          background: var(--color-bg-secondary);
          box-shadow: var(--shadow-sm);
        }

        .app-info {
          flex: 1;
          min-width: 0;
        }

        .job-title {
          font-weight: var(--font-medium);
          color: var(--color-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .job-meta {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          display: flex;
          gap: var(--space-3);
        }

        .app-date {
          font-size: var(--text-sm);
          color: var(--color-text-tertiary);
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          flex-wrap: wrap;

          .app-status {
            order: -1;
          }

          .app-date {
            width: 100%;
            margin-top: var(--space-2);
          }
        }
      }

      .actions-row {
        .action-card {
          cursor: pointer;
          transition: all var(--transition-fast);

          &:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
          }
        }

        .action-content {
          display: flex;
          align-items: center;
          gap: var(--space-4);

          .action-icon {
            font-size: 32px;
            color: var(--color-primary);
          }

          h3 {
            font-weight: var(--font-semibold);
            margin-bottom: var(--space-1);
          }

          p {
            font-size: var(--text-sm);
            color: var(--color-text-secondary);
            margin: 0;
          }
        }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private applicationService = inject(ApplicationService);

  loading = true;
  recentApplications: Application[] = [];
  stats = {
    total: 0,
    inReview: 0,
    shortlisted: 0,
    selected: 0,
  };

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.loading = true;
    this.applicationService.list(1, 5).subscribe({
      next: (res) => {
        this.recentApplications = res.items;
        this.stats.total = res.total;
        this.stats.inReview = res.status_counts.in_review;
        this.stats.shortlisted = res.status_counts.shortlisted;
        this.stats.selected = res.status_counts.selected;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  getStatusLabel(status: string): string {
    return APPLICATION_STATUS_LABELS[status as ApplicationStatus] || status;
  }

  getStatusColor(status: string): string {
    return APPLICATION_STATUS_COLORS[status as ApplicationStatus] || 'default';
  }
}
