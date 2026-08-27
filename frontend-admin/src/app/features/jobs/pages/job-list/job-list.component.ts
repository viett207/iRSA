import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

import { JobService } from '../../services/job.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { VIETNAMESE_INDUSTRIES } from '../../../../shared/constants/vietnamese-industries';
import {
  Job,
  JobStatus,
  EmploymentType,
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  EMPLOYMENT_TYPE_LABELS,
} from '../../models/job.model';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzSelectModule,
    NzPopconfirmModule,
    NzModalModule,
    NzInputModule,
    NzDropDownModule,
    NzSpaceModule,
    NzToolTipModule,
    NzCardModule,
    NzBadgeModule,
    NzAvatarModule,
    NzEmptyModule,
  ],
  template: `
    <div class="job-list-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Quản lý Việc làm</h1>
          <p class="page-subtitle">Quản lý các tin tuyển dụng và theo dõi số lượng ứng viên theo thời gian thực</p>
        </div>
        <div class="header-actions">
          <button nz-button nzType="primary" routerLink="/jobs/new" class="create-btn">
            <span nz-icon nzType="plus"></span>
            Tạo tin mới
          </button>
        </div>
      </div>

      <!-- Stats Summary (Accurate Live Counts) -->
      <div class="stats-row">
        @for (stat of jobStats; track stat.label) {
          <div class="stat-item static-display-card static-kpi-card" [class]="'stat-item stat-item--' + stat.color + ' static-display-card static-kpi-card'">
            <div class="stat-icon static-kpi-icon" aria-hidden="true">
              <span nz-icon [nzType]="stat.icon" nzTheme="outline"></span>
            </div>
            <div class="stat-content static-kpi-content">
              <span class="stat-label static-kpi-label">{{ stat.label }}</span>
              <span class="stat-value static-kpi-value">{{ stat.value }}</span>
            </div>
          </div>
        }
      </div>

      <!-- Advanced Multi-Filter Card -->
      <nz-card class="filter-card">
        <div class="filter-grid">
          <!-- Row 1: Search, Status, Department, Location, Employment Type -->
          <div class="filter-row primary-row">
            <!-- Search Keyword -->
            <div class="search-input">
              <nz-input-group [nzPrefix]="searchIcon" [nzSuffix]="clearSearchIcon">
                <input
                  nz-input
                  [(ngModel)]="searchText"
                  placeholder="Tìm theo tiêu đề, kỹ năng, phòng ban, địa điểm..."
                  (keyup.enter)="onSearch()"
                />
              </nz-input-group>
              <ng-template #searchIcon>
                <span nz-icon nzType="search" nzTheme="outline"></span>
              </ng-template>
              <ng-template #clearSearchIcon>
                @if (searchText) {
                  <span nz-icon nzType="close-circle" nzTheme="fill" (click)="searchText = ''; onSearch()" style="cursor: pointer; color: #999"></span>
                }
              </ng-template>
            </div>

            <!-- Status Filter -->
            <nz-select
              [(ngModel)]="statusFilter"
              nzPlaceHolder="Tất cả trạng thái"
              nzAllowClear
              style="width: 170px"
              (ngModelChange)="onFilterChange()"
            >
              @for (status of statusOptions; track status.value) {
                <nz-option [nzValue]="status.value" [nzLabel]="status.label"></nz-option>
              }
            </nz-select>

            <!-- Department / Industry Filter -->
            <nz-select
              [(ngModel)]="departmentFilter"
              nzPlaceHolder="Ngành nghề / Phòng ban"
              nzAllowClear
              nzShowSearch
              style="width: 200px"
              (ngModelChange)="onFilterChange()"
            >
              @for (dept of allDepartments; track dept) {
                <nz-option [nzValue]="dept" [nzLabel]="dept"></nz-option>
              }
            </nz-select>

            <!-- Location Filter -->
            <nz-select
              [(ngModel)]="locationFilter"
              nzPlaceHolder="Địa điểm làm việc"
              nzAllowClear
              nzShowSearch
              style="width: 170px"
              (ngModelChange)="onFilterChange()"
            >
              @for (loc of locationOptions; track loc) {
                <nz-option [nzValue]="loc" [nzLabel]="loc"></nz-option>
              }
            </nz-select>

            <!-- Employment Type Filter -->
            <nz-select
              [(ngModel)]="employmentTypeFilter"
              nzPlaceHolder="Hình thức"
              nzAllowClear
              style="width: 150px"
              (ngModelChange)="onFilterChange()"
            >
              @for (type of employmentTypeOptions; track type.value) {
                <nz-option [nzValue]="type.value" [nzLabel]="type.label"></nz-option>
              }
            </nz-select>
          </div>

          <!-- Row 2: Salary, Experience, Applicants, Sort By, Actions -->
          <div class="filter-row secondary-row">
            <!-- Salary Preset Filter -->
            <nz-select
              [(ngModel)]="salaryPresetFilter"
              nzPlaceHolder="Mức lương"
              nzAllowClear
              style="width: 170px"
              (ngModelChange)="onFilterChange()"
            >
              @for (sal of salaryPresets; track sal.value) {
                <nz-option [nzValue]="sal.value" [nzLabel]="sal.label"></nz-option>
              }
            </nz-select>

            <!-- Experience Range Filter -->
            <nz-select
              [(ngModel)]="experienceFilter"
              nzPlaceHolder="Kinh nghiệm"
              nzAllowClear
              style="width: 170px"
              (ngModelChange)="onFilterChange()"
            >
              @for (exp of experienceOptions; track exp.value) {
                <nz-option [nzValue]="exp.value" [nzLabel]="exp.label"></nz-option>
              }
            </nz-select>

            <!-- Has Applicants Filter -->
            <nz-select
              [(ngModel)]="hasApplicantsFilter"
              nzPlaceHolder="Hồ sơ ứng viên"
              nzAllowClear
              style="width: 170px"
              (ngModelChange)="onFilterChange()"
            >
              <nz-option [nzValue]="true" nzLabel="Đã có ứng viên"></nz-option>
              <nz-option [nzValue]="false" nzLabel="Chưa có ứng viên"></nz-option>
            </nz-select>

            <!-- Sort Order Filter -->
            <nz-select
              [(ngModel)]="sortBy"
              nzPlaceHolder="Sắp xếp theo"
              style="width: 180px"
              (ngModelChange)="onFilterChange()"
            >
              <nz-option nzValue="newest" nzLabel="Mới nhất"></nz-option>
              <nz-option nzValue="oldest" nzLabel="Cũ nhất"></nz-option>
              <nz-option nzValue="applicants_desc" nzLabel="Ứng viên nhiều nhất"></nz-option>
              <nz-option nzValue="salary_desc" nzLabel="Lương cao nhất"></nz-option>
              <nz-option nzValue="salary_asc" nzLabel="Lương thấp nhất"></nz-option>
            </nz-select>

            <!-- Filter Reset & Results count -->
            <div class="filter-actions">
              <button nz-button (click)="clearFilters()" nz-tooltip nzTooltipTitle="Xóa toàn bộ các bộ lọc và tìm kiếm">
                <span nz-icon nzType="reload"></span>
                Đặt lại
              </button>
              <nz-tag nzColor="blue" class="filter-result">
                Tìm thấy <strong>{{ total() }}</strong> tin
              </nz-tag>
            </div>
          </div>
        </div>
      </nz-card>

      <!-- Table -->
      <nz-card class="table-card">
        <nz-table
          #jobTable
          [nzData]="jobs()"
          [nzLoading]="loading()"
          [nzTotal]="total()"
          [nzPageSize]="pageSize"
          [nzPageIndex]="pageIndex"
          [nzFrontPagination]="false"
          [nzShowSizeChanger]="true"
          [nzPageSizeOptions]="[10, 20, 50]"
          (nzQueryParams)="onQueryParamsChange($event)"
          nzSize="middle"
          [nzNoResult]="emptyTemplate"
        >
          <thead>
            <tr>
              <th nzWidth="30%">Tin tuyển dụng</th>
              <th nzWidth="12%">Ngành nghề</th>
              <th nzWidth="13%">Trạng thái</th>
              <th nzWidth="10%">Ứng viên</th>
              <th nzWidth="13%">Người tạo</th>
              <th nzWidth="22%">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            @for (job of jobTable.data; track job.id) {
              <tr class="job-row">
                <td>
                  <div class="job-info">
                    <a [routerLink]="['/jobs', job.id]" class="job-title">
                      {{ job.title_vi }}
                    </a>
                    <div class="job-meta">
                      @if (job.location) {
                        <span class="meta-item">
                          <span nz-icon nzType="environment" nzTheme="outline"></span>
                          {{ job.location }}
                        </span>
                      }
                      @if (job.employment_type) {
                        <span class="meta-item">
                          <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                          {{ getEmploymentTypeLabel(job.employment_type) }}
                        </span>
                      }
                      @if (job.salary_min != null || job.salary_max != null) {
                        <span class="meta-item salary">
                          <span nz-icon nzType="dollar" nzTheme="outline"></span>
                          {{ formatSalary(job.salary_min, job.salary_max) }}
                        </span>
                      }
                    </div>
                  </div>
                </td>
                <td>
                  <span class="department-text">{{ job.department || '-' }}</span>
                </td>
                <td>
                  <div class="status-cell">
                    <nz-tag
                      class="status-tag"
                      [nzColor]="getStatusColor(job.status)"
                    >
                      <span nz-icon [nzType]="getStatusIcon(job.status)"></span>
                      {{ getStatusLabel(job.status) }}
                    </nz-tag>
                    @if (job.is_published) {
                      <nz-tag class="published-tag" nzColor="success">
                        <span nz-icon nzType="global"></span>
                        Đã đăng
                      </nz-tag>
                    }
                  </div>
                </td>
                <td>
                  <div class="applicant-count">
                    <span class="count-number" [style.color]="job.applications_count > 0 ? '#1890ff' : '#888'">
                      {{ job.applications_count }}
                    </span>
                    <span class="count-label">hồ sơ</span>
                  </div>
                </td>
                <td>
                  <div class="creator-info">
                    <nz-avatar
                      [nzText]="getInitial(job.creator_name || 'U')"
                      [nzSize]="28"
                    ></nz-avatar>
                    <span class="creator-name">{{ job.creator_name || '-' }}</span>
                  </div>
                </td>
                <td>
                  <div class="actions-cell">
                    <!-- View -->
                    <button
                      nz-button
                      nzType="default"
                      [routerLink]="['/jobs', job.id]"
                      nz-tooltip
                      nzTooltipTitle="Xem chi tiết & Quản lý ứng viên"
                    >
                      <span nz-icon nzType="eye"></span>
                      Chi tiết
                    </button>

                    <!-- Edit (draft/rejected) -->
                    @if (canEdit(job)) {
                      <button
                        nz-button
                        nzType="default"
                        [routerLink]="['/jobs', job.id, 'edit']"
                        nz-tooltip
                        nzTooltipTitle="Chỉnh sửa"
                      >
                        <span nz-icon nzType="edit"></span>
                        Sửa
                      </button>
                    }

                    <!-- More Actions Dropdown -->
                    <button
                      nz-button
                      nzType="default"
                      nz-dropdown
                      [nzDropdownMenu]="menu"
                      nzPlacement="bottomRight"
                    >
                      <span nz-icon nzType="ellipsis"></span>
                    </button>
                    <nz-dropdown-menu #menu="nzDropdownMenu">
                      <ul nz-menu class="action-dropdown">
                        <!-- Submit for approval (draft) -->
                        @if (canSubmit(job)) {
                          <li nz-menu-item (click)="submitJob(job)">
                            <span nz-icon nzType="send" class="menu-icon"></span>
                            Gửi phê duyệt
                          </li>
                        }

                        <!-- Approve (pending_approval, leader/admin only) -->
                        @if (canApprove(job)) {
                          <li nz-menu-item (click)="approveJob(job)" class="approve-item">
                            <span nz-icon nzType="check" class="menu-icon"></span>
                            Phê duyệt
                          </li>
                          <li nz-menu-item (click)="showRejectModal(job)" class="reject-item">
                            <span nz-icon nzType="close" class="menu-icon"></span>
                            Từ chối
                          </li>
                        }

                        <!-- Publish (approved) -->
                        @if (canPublish(job)) {
                          <li nz-menu-item (click)="publishJob(job)" class="publish-item">
                            <span nz-icon nzType="global" class="menu-icon"></span>
                            Đăng tin
                          </li>
                        }

                        <!-- Unpublish (published) -->
                        @if (canUnpublish(job)) {
                          <li nz-menu-item (click)="unpublishJob(job)">
                            <span nz-icon nzType="stop" class="menu-icon"></span>
                            Gỡ tin
                          </li>
                        }

                        <!-- Close (active) -->
                        @if (canClose(job)) {
                          <li
                            nz-menu-item
                            nz-popconfirm
                            nzPopconfirmTitle="Bạn có chắc chắn muốn đóng tin tuyển dụng này?"
                            nzOkText="Đóng tuyển"
                            nzCancelText="Hủy"
                            (nzOnConfirm)="closeJob(job)"
                            nzPopconfirmPlacement="left"
                            class="reject-item"
                          >
                            <span nz-icon nzType="poweroff" class="menu-icon"></span>
                            Đóng tuyển
                          </li>
                        }

                        <!-- Delete (draft only) -->
                        @if (canDelete(job)) {
                          <li
                            nz-menu-item
                            nz-popconfirm
                            nzPopconfirmTitle="Bạn có chắc chắn muốn xóa tin tuyển dụng này?"
                            nzOkText="Xóa"
                            nzCancelText="Hủy"
                            (nzOnConfirm)="deleteJob(job)"
                            nzPopconfirmPlacement="left"
                            class="reject-item"
                          >
                            <span nz-icon nzType="delete" class="menu-icon"></span>
                            Xóa tin
                          </li>
                        }
                      </ul>
                    </nz-dropdown-menu>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </nz-table>
      </nz-card>

      <!-- Empty State Template -->
      <ng-template #emptyTemplate>
        <nz-empty
          [nzNotFoundImage]="'simple'"
          [nzNotFoundContent]="emptyContent"
        >
          <ng-template #emptyContent>
            <div class="empty-state">
              <p class="empty-title">Không tìm thấy tin tuyển dụng nào</p>
              <p class="empty-desc">
                @if (hasActiveFilters) {
                  Hãy thử điều chỉnh hoặc đặt lại bộ lọc tìm kiếm
                } @else {
                  Chưa có tin tuyển dụng nào được tạo
                }
              </p>
              @if (hasActiveFilters) {
                <button nz-button nzType="primary" (click)="clearFilters()">
                  Đặt lại bộ lọc
                </button>
              } @else {
                <button nz-button nzType="primary" routerLink="/jobs/new">
                  <span nz-icon nzType="plus"></span>
                  Tạo tin đầu tiên
                </button>
              }
            </div>
          </ng-template>
        </nz-empty>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .job-list-page {
        padding: 0;
        animation: fadeIn 0.3s ease;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
        gap: 16px;
      }

      .page-title {
        font-family: var(--font-heading);
        font-size: 24px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0 0 4px 0;
      }

      .page-subtitle {
        font-size: 14px;
        color: var(--color-text-secondary);
        margin: 0;
      }

      .create-btn {
        height: 40px;
        padding: 0 20px;
      }

      /* Stats Row */
      .stats-row {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 18px;
        margin-bottom: 20px;
      }

      .stat-item {
        position: relative;
        min-width: 0;
        min-height: 108px;
        padding: 16px 18px;
        overflow: hidden;
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border-light) !important;
        border-radius: var(--radius-xl) !important;
        box-shadow: none !important;
        display: grid;
        place-items: center;

        &::after {
          position: absolute;
          right: -88px;
          bottom: -78px;
          width: 126px;
          height: 126px;
          border: 1px solid var(--color-border-light);
          border-radius: 50%;
          box-shadow: 0 0 0 18px hsl(214 70% 96% / 0.58);
          content: '';
          opacity: 0.62;
          pointer-events: none;
        }

        &--primary {
          .stat-icon {
            color: var(--color-primary);
            background: var(--color-primary-50);
          }
        }

        &--success {
          .stat-icon {
            color: var(--color-success);
            background: var(--color-success-bg);
          }
        }

        &--warning {
          .stat-icon {
            color: var(--color-warning);
            background: var(--color-warning-bg);
          }
        }

        &--default {
          .stat-icon {
            color: var(--color-text-secondary);
            background: var(--color-bg-tertiary);
          }
        }
      }

      .stat-icon {
        position: absolute;
        z-index: 1;
        left: 18px;
        top: 50%;
        display: grid;
        width: 42px;
        height: 42px;
        place-items: center;
        border-radius: 12px;
        transform: translateY(-50%);

        span {
          font-size: 19px;
        }
      }

      .stat-content {
        position: relative;
        z-index: 1;
        display: flex;
        min-width: 0;
        padding-inline: 48px;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        text-align: center;
      }

      .stat-value {
        font-family: var(--font-heading);
        font-size: 28px;
        font-weight: 700;
        line-height: 1;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.04em;
        color: var(--color-text-primary);
      }

      .stat-label {
        font-size: 12px;
        font-weight: 700;
        line-height: 1.3;
        color: var(--color-text-secondary);
        text-wrap: balance;
      }

      /* Filter Card */
      .filter-card {
        margin-bottom: 20px;
      }

      .filter-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .filter-row {
        display: flex;
        gap: 10px;
        align-items: stretch;
        flex-wrap: wrap;
      }

      .search-input {
        flex: 1;
        min-width: 260px;
      }

      .filter-actions {
        display: flex;
        align-items: stretch;
        gap: 10px;
        margin-left: auto;
      }

      :host ::ng-deep .filter-card .ant-input-affix-wrapper,
      :host ::ng-deep .filter-card .ant-select-selector,
      .filter-actions .ant-btn,
      :host ::ng-deep .filter-result.ant-tag {
        height: 44px !important;
        border-radius: 8px !important;
      }

      :host ::ng-deep .filter-card .ant-input-affix-wrapper {
        display: flex;
        align-items: center;
        padding-inline: 14px;
      }

      :host ::ng-deep .filter-card .ant-input-affix-wrapper > input.ant-input {
        height: 42px;
      }

      :host ::ng-deep .filter-card .ant-select-selector {
        display: flex;
        align-items: center;
        padding-inline: 13px !important;
      }

      :host ::ng-deep .filter-card .ant-select-selection-item,
      :host ::ng-deep .filter-card .ant-select-selection-placeholder {
        line-height: 42px !important;
      }

      .filter-actions .ant-btn,
      :host ::ng-deep .filter-result.ant-tag {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .filter-actions .ant-btn {
        gap: 7px;
        padding-inline: 18px;
        font-weight: 600;
      }

      :host ::ng-deep .filter-result.ant-tag {
        margin: 0;
        padding-inline: 13px;
        font-size: 12px;
        white-space: nowrap;
      }

      /* Table Card */
      .table-card {
        margin-bottom: 24px;
      }

      .job-row {
        transition: background-color 0.2s ease;

        &:hover {
          background-color: var(--color-bg-tertiary);
        }
      }

      .job-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .job-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--color-primary);
        text-decoration: none;
        transition: color 0.2s ease;

        &:hover {
          color: var(--color-primary-600);
          text-decoration: underline;
        }
      }

      .job-meta {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 12px;
        color: var(--color-text-tertiary);
      }

      .meta-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;

        &.salary {
          color: var(--color-success);
          font-weight: 500;
        }
      }

      .department-text {
        font-size: 13px;
        color: var(--color-text-primary);
      }

      .status-cell {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .status-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .published-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .applicant-count {
        display: flex;
        flex-direction: column;
      }

      .count-number {
        font-family: var(--font-heading);
        font-size: 16px;
        font-weight: 600;
      }

      .count-label {
        font-size: 11px;
        color: var(--color-text-tertiary);
      }

      .creator-info {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .creator-name {
        font-size: 12px;
        color: var(--color-text-secondary);
      }

      .actions-cell {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
      }

      .action-dropdown {
        min-width: 160px;
      }

      .menu-icon {
        margin-right: 8px;
      }

      .approve-item {
        color: var(--color-success);
      }

      .reject-item {
        color: var(--color-error);
      }

      .publish-item {
        color: var(--color-primary);
      }

      .empty-state {
        padding: 24px 0;
        text-align: center;
      }

      .empty-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--color-text-primary);
        margin: 0 0 8px 0;
      }

      .empty-desc {
        font-size: 14px;
        color: var(--color-text-secondary);
        margin: 0 0 16px 0;
      }

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

      @media (max-width: 767px) {
        .page-header {
          flex-direction: column;
          align-items: stretch;
        }

        .stats-row {
          grid-template-columns: 1fr;
        }

        .stat-item {
          min-width: 100%;
        }

        .filter-row {
          flex-direction: column;
          align-items: stretch;
        }

        .search-input {
          min-width: 100%;
        }

        .filter-actions {
          margin-left: 0;
        }
      }
    `,
  ],
})
export class JobListComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private dashboardService = inject(DashboardService);
  private jobService = inject(JobService);
  private authService = inject(AuthService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);
  private router = inject(Router);
  private notificationSvc = inject(NotificationService);

  jobs = signal<Job[]>([]);
  loading = signal(false);
  total = signal(0);

  pageIndex = 1;
  pageSize = 20;

  // Filters
  searchText = '';
  statusFilter: JobStatus | null = null;
  departmentFilter: string | null = null;
  locationFilter: string | null = null;
  employmentTypeFilter: string | null = null;
  salaryPresetFilter: string | null = null;
  experienceFilter: string | null = null;
  hasApplicantsFilter: boolean | null = null;
  sortBy = 'newest';

  jobStats: { label: string; value: number; color: string; icon: string }[] = [];
  allDepartments: string[] = VIETNAMESE_INDUSTRIES;

  statusOptions = [
    { value: 'active', label: 'Đang tuyển (Active)' },
    { value: 'pending_approval', label: 'Chờ duyệt (Pending)' },
    { value: 'approved', label: 'Đã duyệt (Approved)' },
    { value: 'draft', label: 'Bản nháp (Draft)' },
    { value: 'closed', label: 'Đã đóng (Closed)' },
    { value: 'rejected', label: 'Bị từ chối (Rejected)' },
  ];

  locationOptions = [
    'Hà Nội',
    'TP. Hồ Chí Minh',
    'Đà Nẵng',
    'Hải Phòng',
    'Cần Thơ',
    'Bình Dương',
    'Đồng Nai',
    'Bắc Ninh',
    'Quảng Ninh',
    'Remote (Làm việc từ xa)',
    'Hybrid (Linh hoạt)',
  ];

  employmentTypeOptions = [
    { value: 'full_time', label: 'Toàn thời gian (Full-time)' },
    { value: 'part_time', label: 'Bán thời gian (Part-time)' },
    { value: 'contract', label: 'Hợp đồng (Contract)' },
    { value: 'internship', label: 'Thực tập (Internship)' },
  ];

  salaryPresets = [
    { value: 'all', label: 'Tất cả mức lương' },
    { value: 'u15', label: 'Dưới 15 triệu' },
    { value: '15to30', label: '15 - 30 triệu' },
    { value: '30to50', label: '30 - 50 triệu' },
    { value: 'gt50', label: 'Trên 50 triệu' },
  ];

  experienceOptions = [
    { value: 'all', label: 'Tất cả kinh nghiệm' },
    { value: '0to1', label: 'Dưới 1 năm / Không yêu cầu' },
    { value: '1to2', label: '1 - 2 năm' },
    { value: '3to5', label: '3 - 5 năm' },
    { value: 'gt5', label: 'Trên 5 năm' },
  ];

  get hasActiveFilters(): boolean {
    return (
      !!this.searchText ||
      !!this.statusFilter ||
      !!this.departmentFilter ||
      !!this.locationFilter ||
      !!this.employmentTypeFilter ||
      (!!this.salaryPresetFilter && this.salaryPresetFilter !== 'all') ||
      (!!this.experienceFilter && this.experienceFilter !== 'all') ||
      this.hasApplicantsFilter !== null
    );
  }

  ngOnInit(): void {
    this.loadJobs();
    this.loadStats();

    // Auto-reload when new notification arrives
    this.notificationSvc.dataChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((n) => {
        if (['application', 'job'].includes(n.type)) {
          this.loadJobs();
          this.loadStats();
        }
      });
  }

  loadJobs(): void {
    this.loading.set(true);

    let salaryMin: number | undefined;
    let salaryMax: number | undefined;
    if (this.salaryPresetFilter === 'u15') salaryMax = 15;
    else if (this.salaryPresetFilter === '15to30') { salaryMin = 15; salaryMax = 30; }
    else if (this.salaryPresetFilter === '30to50') { salaryMin = 30; salaryMax = 50; }
    else if (this.salaryPresetFilter === 'gt50') salaryMin = 50;

    let minExp: number | undefined;
    let maxExp: number | undefined;
    if (this.experienceFilter === '0to1') maxExp = 1;
    else if (this.experienceFilter === '1to2') { minExp = 1; maxExp = 2; }
    else if (this.experienceFilter === '3to5') { minExp = 3; maxExp = 5; }
    else if (this.experienceFilter === 'gt5') minExp = 5;

    this.jobService
      .list({
        page: this.pageIndex,
        page_size: this.pageSize,
        status: this.statusFilter || undefined,
        department: this.departmentFilter || undefined,
        location: this.locationFilter || undefined,
        employment_type: this.employmentTypeFilter || undefined,
        salary_min: salaryMin,
        salary_max: salaryMax,
        min_experience: minExp,
        max_experience: maxExp,
        has_applications: this.hasApplicantsFilter !== null ? this.hasApplicantsFilter : undefined,
        search: this.searchText || undefined,
        order_by: this.sortBy,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.jobs.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
          this.mergeDepartments(res.items);
        },
        error: () => {
          this.message.error('Không thể tải danh sách việc làm');
          this.loading.set(false);
        },
      });
  }

  private loadStats(): void {
    this.dashboardService
      .getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const sc = data.job_status_counts;
          const totalJobs = Object.values(sc).reduce((sum, v) => sum + v, 0);
          const activeCount = sc['active'] || 0;
          const pendingCount = sc['pending_approval'] || 0;
          const closedCount = sc['closed'] || 0;
          const totalApps = data.stats.total_applications || 0;

          this.jobStats = [
            { label: 'Tất cả tin', value: totalJobs, color: 'primary', icon: 'solution' },
            { label: 'Đang tuyển', value: activeCount, color: 'success', icon: 'thunderbolt' },
            { label: 'Chờ duyệt', value: pendingCount, color: 'warning', icon: 'clock-circle' },
            { label: 'Đã đóng', value: closedCount, color: 'default', icon: 'poweroff' },
            { label: 'Tổng hồ sơ ứng tuyển', value: totalApps, color: 'primary', icon: 'file-text' },
          ];
        },
      });
  }

  private mergeDepartments(jobs: Job[]): void {
    const deptSet = new Set<string>(this.allDepartments);
    for (const job of jobs) {
      if (job.department) deptSet.add(job.department);
    }
    this.allDepartments = Array.from(deptSet).sort();
  }

  onQueryParamsChange(params: NzTableQueryParams): void {
    this.pageIndex = params.pageIndex;
    this.pageSize = params.pageSize;
    this.loadJobs();
  }

  onFilterChange(): void {
    this.pageIndex = 1;
    this.loadJobs();
  }

  onSearch(): void {
    this.pageIndex = 1;
    this.loadJobs();
  }

  clearFilters(): void {
    this.searchText = '';
    this.statusFilter = null;
    this.departmentFilter = null;
    this.locationFilter = null;
    this.employmentTypeFilter = null;
    this.salaryPresetFilter = null;
    this.experienceFilter = null;
    this.hasApplicantsFilter = null;
    this.sortBy = 'newest';
    this.pageIndex = 1;
    this.loadJobs();
  }

  getStatusLabel(status: JobStatus): string {
    return JOB_STATUS_LABELS[status] || status;
  }

  getStatusColor(status: JobStatus): string {
    return JOB_STATUS_COLORS[status] || 'default';
  }

  getStatusIcon(status: JobStatus): string {
    const icons: Record<JobStatus, string> = {
      draft: 'edit',
      pending_approval: 'clock-circle',
      approved: 'check-circle',
      rejected: 'close-circle',
      active: 'thunderbolt',
      closed: 'poweroff',
    };
    return icons[status] || 'file-text';
  }

  getEmploymentTypeLabel(type?: EmploymentType): string {
    return (type && EMPLOYMENT_TYPE_LABELS[type]) || type || '-';
  }

  formatSalary(min?: number, max?: number): string {
    if (min == null && max == null) return 'Thỏa thuận';
    if (min != null && max != null) return `${min} - ${max} triệu`;
    if (min != null) return `Từ ${min} triệu`;
    return `Đến ${max} triệu`;
  }

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  canEdit(job: Job): boolean {
    const user = this.authService.user();
    if (!user) return false;
    if (['draft', 'rejected'].includes(job.status)) {
      return this.authService.hasRole('admin') || job.created_by === user.id;
    }
    return false;
  }

  canSubmit(job: Job): boolean {
    const user = this.authService.user();
    if (!user) return false;
    return (
      ['draft', 'rejected'].includes(job.status) &&
      (this.authService.hasRole('admin') || job.created_by === user.id)
    );
  }

  canApprove(job: Job): boolean {
    return (
      job.status === 'pending_approval' &&
      this.authService.hasRole('admin', 'leader')
    );
  }

  canPublish(job: Job): boolean {
    return (
      job.status === 'approved' &&
      !job.is_published &&
      this.authService.hasRole('admin', 'recruiter', 'leader')
    );
  }

  canUnpublish(job: Job): boolean {
    return (
      job.is_published &&
      this.authService.hasRole('admin', 'recruiter', 'leader')
    );
  }

  canClose(job: Job): boolean {
    return (
      job.status === 'active' &&
      this.authService.hasRole('admin', 'recruiter', 'leader')
    );
  }

  canDelete(job: Job): boolean {
    const user = this.authService.user();
    if (!user) return false;
    return (
      job.status === 'draft' &&
      (this.authService.hasRole('admin') || job.created_by === user.id)
    );
  }

  submitJob(job: Job): void {
    this.jobService.submit(job.id).subscribe({
      next: () => {
        this.message.success('Đã gửi tin tuyển dụng để phê duyệt');
        this.loadJobs();
        this.loadStats();
      },
      error: () => this.message.error('Không thể gửi phê duyệt'),
    });
  }

  approveJob(job: Job): void {
    this.jobService.approve(job.id, {}).subscribe({
      next: () => {
        this.message.success('Đã phê duyệt tin tuyển dụng');
        this.loadJobs();
        this.loadStats();
      },
      error: () => this.message.error('Không thể phê duyệt'),
    });
  }

  showRejectModal(job: Job): void {
    let reason = '';
    this.modal.confirm({
      nzTitle: 'Từ chối tin tuyển dụng',
      nzContent: `
        <div style="margin-top: 12px">
          <label style="display: block; margin-bottom: 6px; font-weight: 500">Lý do từ chối:</label>
          <textarea id="reject-reason" class="ant-input" rows="3" placeholder="Nhập lý do từ chối để người tạo tin chỉnh sửa..."></textarea>
        </div>
      `,
      nzOkText: 'Từ chối',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        const textarea = document.getElementById('reject-reason') as HTMLTextAreaElement;
        reason = textarea?.value || 'Không đạt yêu cầu';
        return this.jobService
          .reject(job.id, { reason })
          .toPromise()
          .then(() => {
            this.message.success('Đã từ chối tin tuyển dụng');
            this.loadJobs();
            this.loadStats();
          })
          .catch(() => {
            this.message.error('Không thể từ chối tin');
          });
      },
    });
  }

  publishJob(job: Job): void {
    this.jobService.publish(job.id).subscribe({
      next: () => {
        this.message.success('Đã đăng tin tuyển dụng lên cổng tìm việc');
        this.loadJobs();
        this.loadStats();
      },
      error: () => this.message.error('Không thể đăng tin'),
    });
  }

  unpublishJob(job: Job): void {
    this.jobService.unpublish(job.id).subscribe({
      next: () => {
        this.message.success('Đã gỡ tin tuyển dụng');
        this.loadJobs();
        this.loadStats();
      },
      error: () => this.message.error('Không thể gỡ tin'),
    });
  }

  closeJob(job: Job): void {
    this.jobService.close(job.id).subscribe({
      next: () => {
        this.message.success('Đã đóng tin tuyển dụng');
        this.loadJobs();
        this.loadStats();
      },
      error: () => this.message.error('Không thể đóng tin'),
    });
  }

  deleteJob(job: Job): void {
    this.jobService.delete(job.id).subscribe({
      next: () => {
        this.message.success('Đã xóa tin tuyển dụng');
        this.loadJobs();
        this.loadStats();
      },
      error: () => this.message.error('Không thể xóa tin'),
    });
  }
}
