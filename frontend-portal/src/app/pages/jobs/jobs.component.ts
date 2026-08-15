import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, switchMap, tap, catchError } from 'rxjs/operators';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzSliderModule } from 'ng-zorro-antd/slider';

import { JobService } from '../../core/services/job.service';
import { ApplicationService } from '../../core/services/application.service';
import { AuthService } from '../../core/auth/auth.service';
import { PublicJobListItem, ActiveCompany } from '../../shared/models/job.model';
import { VIETNAMESE_INDUSTRIES } from '../../shared/constants/vietnamese-industries';

interface Job {
  id: number;
  title: string;
  company: string;
  companyInitial: string;
  location: string;
  type: string;
  experience: string;
  skills: string[];
  salaryMin?: number;
  salaryMax?: number;
  salaryLabel: string;
  postedDate: string;
  applicants: number;
  isHot?: boolean;
  isNew?: boolean;
  isApplied?: boolean;
  slug?: string;
}

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzGridModule,
    NzCardModule,
    NzInputModule,
    NzButtonModule,
    NzSelectModule,
    NzCheckboxModule,
    NzTagModule,
    NzIconModule,
    NzBadgeModule,
    NzEmptyModule,
    NzPaginationModule,
    NzDrawerModule,
    NzSpinModule,
    NzAutocompleteModule,
    NzSliderModule,
  ],
  template: `
    <div class="jobs-page">
      <!-- Header Section -->
      <section class="jobs-header">
        <div class="container">
          <h1>Tìm việc làm</h1>
          <p class="jobs-subtitle">
            Khám phá cơ hội nghề nghiệp đang chờ bạn
          </p>

          <!-- Search Bar -->
          <div class="search-bar">
            <div class="search-bar-inner">
              <nz-input-group [nzPrefix]="searchIcon" nzSize="large" class="search-input">
                <input
                  type="text"
                  nz-input
                  placeholder="Tìm kiếm vị trí, kỹ năng, công ty..."
                  [(ngModel)]="searchQuery"
                  (ngModelChange)="onSearchInput($event)"
                  (keyup.enter)="onSearch()"
                  [nzAutocomplete]="autoComplete"
                />
              </nz-input-group>
              <ng-template #searchIcon>
                <span nz-icon nzType="search" nzTheme="outline"></span>
              </ng-template>

              <nz-autocomplete #autoComplete [nzWidth]="480">
                @if (suggestionsLoading) {
                  <nz-auto-option disabled [nzValue]="searchQuery">
                    <span nz-icon nzType="loading" nzTheme="outline"></span>
                    Đang tìm kiếm...
                  </nz-auto-option>
                } @else {
                  @for (suggestion of suggestions; track suggestion.id) {
                    <nz-auto-option [nzValue]="suggestion.title_vi" [nzLabel]="suggestion.title_vi">
                      <div class="suggestion-item">
                        <div class="suggestion-title">{{ suggestion.title_vi }}</div>
                        <div class="suggestion-meta">
                          <span>{{ suggestion.department || 'iRSA' }}</span>
                          @if (suggestion.location) {
                            <span> · {{ suggestion.location }}</span>
                          }
                        </div>
                      </div>
                    </nz-auto-option>
                  }
                  @if (suggestions.length === 0 && searchQuery.length >= 2) {
                    <nz-auto-option disabled [nzValue]="searchQuery">
                      Không tìm thấy kết quả
                    </nz-auto-option>
                  }
                }
              </nz-autocomplete>

              <nz-select
                [(ngModel)]="selectedLocation"
                nzPlaceHolder="Địa điểm"
                nzSize="large"
                class="location-select hide-mobile"
                nzAllowClear
                (ngModelChange)="onFilterChange()"
              >
                @for (location of locations; track location) {
                  <nz-option [nzValue]="location" [nzLabel]="location"></nz-option>
                }
              </nz-select>

              
            </div>
          </div>
        </div>
      </section>

      <!-- Main Content -->
      <section class="jobs-content">
        <div class="container">
          <div class="jobs-layout">
            <!-- Filter Sidebar (Desktop) -->
            <aside class="filter-sidebar hide-mobile">
              <div class="filter-header">
                <h3>
                  <span nz-icon nzType="filter" nzTheme="outline"></span>
                  Bộ lọc
                </h3>
                <button nz-button nzType="link" nzSize="small" (click)="clearFilters()">
                  Xóa tất cả
                </button>
              </div>

              <!-- Job Type Filter -->
              <div class="filter-section">
                <h4 class="filter-title">Loại việc làm</h4>
                @for (type of jobTypes; track type.value) {
                  <label nz-checkbox [(ngModel)]="type.checked" (ngModelChange)="onJobTypeChange(type)">
                    {{ type.label }}
                  </label>
                }
              </div>

              <!-- Salary Range Filter -->
              <div class="filter-section">
                <h4 class="filter-title">Mức lương (triệu VNĐ)</h4>
                <div class="salary-slider-wrapper">
                  <nz-slider
                    [(ngModel)]="salaryRange"
                    [nzRange]="true"
                    [nzMin]="0"
                    [nzMax]="100"
                    [nzStep]="5"
                    (nzOnAfterChange)="onFilterChange()"
                  ></nz-slider>
                  <div class="salary-labels">
                    <span>{{ salaryRange[0] }}tr</span>
                    <span>{{ salaryRange[1] === 100 ? '100tr+' : salaryRange[1] + 'tr' }}</span>
                  </div>
                </div>
              </div>

              <!-- Category Filter -->
              <div class="filter-section">
                <h4 class="filter-title">Ngành nghề</h4>
                <nz-select
                  [(ngModel)]="selectedCategory"
                  nzPlaceHolder="Chọn ngành nghề"
                  nzAllowClear
                  nzShowSearch
                  (ngModelChange)="onCategorySelectChange()"
                  style="width: 100%"
                >
                  @for (cat of categories; track cat.value) {
                    <nz-option [nzValue]="cat.value" [nzLabel]="cat.label"></nz-option>
                  }
                </nz-select>
              </div>

              <!-- Company Filter -->
              <div class="filter-section">
                <h4 class="filter-title">Công ty</h4>
                <nz-select
                  [(ngModel)]="companyCodeFilter"
                  nzPlaceHolder="Tìm công ty..."
                  nzAllowClear
                  nzShowSearch
                  nzServerSearch
                  (nzOnSearch)="onCompanySearch($event)"
                  (ngModelChange)="onFilterChange()"
                  style="width: 100%"
                >
                  @for (c of filteredCompanies; track c.company_code) {
                    <nz-option
                      [nzValue]="c.company_code"
                      [nzLabel]="c.company_name + ' (' + c.job_count + ')'"
                    ></nz-option>
                  }
                </nz-select>
              </div>
            </aside>

            <!-- Jobs List -->
            <main class="jobs-main">
              <!-- Results Header -->
              <div class="results-header">
                <div class="results-info">
                  <span class="results-count">
                    <strong>{{ filteredJobs.length }}</strong> việc làm
                  </span>
                  <button
                    nz-button
                    nzType="text"
                    class="filter-toggle show-mobile-only"
                    (click)="filterDrawerOpen = true"
                  >
                    <span nz-icon nzType="filter" nzTheme="outline"></span>
                    Bộ lọc
                  </button>
                </div>
                <div class="sort-options">
                  <span class="sort-label hide-mobile">Sắp xếp:</span>
                  <nz-select [(ngModel)]="sortBy" nzSize="default" class="sort-select" (ngModelChange)="onFilterChange()">
                    <nz-option nzValue="newest" nzLabel="Mới nhất"></nz-option>
                    <nz-option nzValue="salary_desc" nzLabel="Lương cao nhất"></nz-option>
                    <nz-option nzValue="salary_asc" nzLabel="Lương thấp nhất"></nz-option>
                    <nz-option nzValue="popular" nzLabel="Nhiều ứng viên"></nz-option>
                  </nz-select>
                </div>
              </div>

              <!-- Active Filters -->
              @if (hasActiveFilters()) {
                <div class="active-filters">
                  @for (filter of getActiveFilters(); track filter.key) {
                    <nz-tag nzMode="closeable" (nzOnClose)="removeFilter(filter.key, filter.value)">
                      {{ filter.label }}
                    </nz-tag>
                  }
                </div>
              }

              <!-- Job Cards -->
              @if (loading) {
                <div class="loading-wrapper">
                  <nz-spin nzSize="large"></nz-spin>
                </div>
              } @else if (filteredJobs.length > 0) {
                <div class="jobs-grid">
                  @for (job of paginatedJobs; track job.id) {
                    <div class="job-card" [routerLink]="['/jobs', getJobSlug(job)]">
                      <div class="job-header">
                        <div class="company-logo">
                          {{ job.companyInitial }}
                        </div>
                        <div class="job-info">
                          <h3 class="job-title">{{ job.title }}</h3>
                          <div class="company-name">{{ job.company }}</div>
                        </div>
                      </div>

                      <div class="job-meta">
                        <span class="meta-item">
                          <span nz-icon nzType="environment" nzTheme="outline"></span>
                          {{ job.location }}
                        </span>
                        <span class="meta-item">
                          <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                          {{ job.type }}
                        </span>
                        @if (job.salaryLabel) {
                          <span class="meta-item salary-highlight">
                            <span nz-icon nzType="dollar" nzTheme="outline"></span>
                            {{ job.salaryLabel }}
                          </span>
                        }
                      </div>

                      <div class="job-footer">
                        <div class="posted-info">
                          <span class="posted-date">
                            <span nz-icon nzType="calendar" nzTheme="outline"></span>
                            {{ job.postedDate }}
                          </span>
                          @if (job.isNew) {
                            <span class="new-tag">NEW</span>
                          }
                        </div>
                        @if (job.isApplied) {
                          <button nz-button nzSize="small" disabled class="applied-btn">
                            <span nz-icon nzType="check-circle" nzTheme="outline"></span>
                            Đã ứng tuyển
                          </button>
                        } @else {
                          <button nz-button nzType="primary" nzSize="small">
                            Xem chi tiết
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>

                <!-- Pagination -->
                <div class="pagination-wrapper">
                  <nz-pagination
                    [(nzPageIndex)]="currentPage"
                    [nzTotal]="totalJobs"
                    [nzPageSize]="pageSize"
                    nzShowSizeChanger
                    [nzPageSizeOptions]="[10, 20, 50]"
                    (nzPageIndexChange)="onPageChange($event)"
                    (nzPageSizeChange)="onPageSizeChange($event)"
                  ></nz-pagination>
                </div>
              } @else {
                <div class="no-results">
                  <nz-empty
                    nzNotFoundImage="simple"
                    nzNotFoundContent="Không tìm thấy việc làm phù hợp"
                    [nzNotFoundFooter]="noResultsFooter"
                  ></nz-empty>
                  <ng-template #noResultsFooter>
                    <button nz-button nzType="primary" (click)="clearFilters()">
                      Xóa bộ lọc và thử lại
                    </button>
                  </ng-template>
                </div>
              }
            </main>
          </div>
        </div>
      </section>

      <!-- Mobile Filter Drawer -->
      <nz-drawer
        [nzVisible]="filterDrawerOpen"
        nzPlacement="right"
        nzTitle="Bộ lọc"
        (nzOnClose)="filterDrawerOpen = false"
        [nzWidth]="320"
        nzClosable
        [nzFooter]="filterDrawerFooter"
      >
        <ng-container *nzDrawerContent>
          <div class="mobile-filters">
            <!-- Location Filter (Mobile) -->
            <div class="filter-section">
              <h4 class="filter-title">Địa điểm</h4>
              <nz-select
                [(ngModel)]="selectedLocation"
                nzPlaceHolder="Chọn địa điểm"
                nzSize="large"
                style="width: 100%"
                nzAllowClear
              >
                @for (location of locations; track location) {
                  <nz-option [nzValue]="location" [nzLabel]="location"></nz-option>
                }
              </nz-select>
            </div>

            <!-- Salary Range Filter (Mobile) -->
            <div class="filter-section">
              <h4 class="filter-title">Mức lương (triệu VNĐ)</h4>
              <div class="salary-slider-wrapper">
                <nz-slider
                  [(ngModel)]="salaryRange"
                  [nzRange]="true"
                  [nzMin]="0"
                  [nzMax]="100"
                  [nzStep]="5"
                ></nz-slider>
                <div class="salary-labels">
                  <span>{{ salaryRange[0] }}tr</span>
                  <span>{{ salaryRange[1] === 100 ? '100tr+' : salaryRange[1] + 'tr' }}</span>
                </div>
              </div>
            </div>

            <!-- Job Type Filter -->
            <div class="filter-section">
              <h4 class="filter-title">Loại việc làm</h4>
              @for (type of jobTypes; track type.value) {
                <label nz-checkbox [(ngModel)]="type.checked" (ngModelChange)="onJobTypeChange(type)">
                  {{ type.label }}
                </label>
              }
            </div>

            <!-- Category Filter -->
            <div class="filter-section">
              <h4 class="filter-title">Ngành nghề</h4>
              <nz-select
                [(ngModel)]="selectedCategory"
                nzPlaceHolder="Chọn ngành nghề"
                nzAllowClear
                nzShowSearch
                (ngModelChange)="onCategorySelectChange()"
                style="width: 100%"
              >
                @for (cat of categories; track cat.value) {
                  <nz-option [nzValue]="cat.value" [nzLabel]="cat.label"></nz-option>
                }
              </nz-select>
            </div>
          </div>
        </ng-container>
        <ng-template #filterDrawerFooter>
          <div class="filter-drawer-footer">
            <button nz-button (click)="clearFilters()">Xóa tất cả</button>
            <button nz-button nzType="primary" (click)="applyFilters()">
              Áp dụng
            </button>
          </div>
        </ng-template>
      </nz-drawer>
    </div>
  `,
  styles: [
    `
      .jobs-page {
        min-height: 100vh;
        background: var(--color-bg-primary);
      }

      .container {
        max-width: var(--container-max);
        margin: 0 auto;
        padding: 0 var(--container-padding);
      }

      /* Header Section */
      .jobs-header {
        background: linear-gradient(135deg, var(--color-primary) 0%, #0072E5 100%);
        padding: var(--space-12) 0;
        text-align: center;

        h1 {
          font-family: var(--font-heading);
          font-size: var(--text-4xl);
          font-weight: var(--font-extrabold);
          color: white;
          margin-bottom: var(--space-2);

          @media (max-width: 768px) {
            font-size: var(--text-3xl);
          }
        }
      }

      .jobs-subtitle {
        color: rgba(255, 255, 255, 0.9);
        font-size: var(--text-lg);
        margin-bottom: var(--space-8);

        @media (max-width: 768px) {
          font-size: var(--text-base);
        }
      }

      /* Autocomplete Suggestions */
      .suggestion-item {
        padding: 4px 0;
      }

      .suggestion-title {
        font-weight: var(--font-medium);
        color: var(--color-text-primary);
        font-size: var(--text-sm);
        line-height: 1.4;
      }

      .suggestion-meta {
        font-size: var(--text-xs);
        color: var(--color-text-tertiary);
        margin-top: 2px;
      }

      /* Search Bar */
      .search-bar {
        max-width: 800px;
        margin: 0 auto;
      }

      .search-bar-inner {
        background: var(--color-bg-secondary);
        border-radius: var(--radius-2xl);
        padding: var(--space-2);
        display: flex;
        align-items: center;
        gap: var(--space-2);
        box-shadow: var(--shadow-xl);

        @media (max-width: 768px) {
          flex-direction: column;
          align-items: stretch;
          padding: var(--space-4);
          gap: var(--space-3);
        }
      }

      .search-input {
        flex: 1;

        .ant-input-affix-wrapper {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
        }
      }

      .location-select {
        width: 180px;
        flex-shrink: 0;

        ::ng-deep .ant-select-selector {
          border: none !important;
          background: var(--color-bg-tertiary) !important;
          height: 40px !important;
          border-radius: var(--radius-lg) !important;
        }

        ::ng-deep .ant-select-selection-item,
        ::ng-deep .ant-select-selection-placeholder {
          line-height: 40px !important;
        }
      }

      

      /* Jobs Layout */
      .jobs-content {
        padding: var(--space-8) 0;
      }

      .jobs-layout {
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: var(--space-8);

        @media (max-width: 1024px) {
          grid-template-columns: 1fr;
        }
      }

      /* Filter Sidebar */
      .filter-sidebar {
        background: var(--color-bg-secondary);
        border-radius: var(--radius-xl);
        padding: var(--space-6);
        border: 1px solid var(--color-border);
        height: fit-content;
        position: sticky;
        top: calc(var(--header-height) + var(--space-4));
      }

      .filter-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-6);
        padding-bottom: var(--space-4);
        border-bottom: 1px solid var(--color-border);

        h3 {
          font-family: var(--font-heading);
          font-size: var(--text-lg);
          font-weight: var(--font-semibold);
          color: var(--color-text-primary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
      }

      .filter-section {
        margin-bottom: var(--space-6);

        &:last-child {
          margin-bottom: 0;
        }
      }

      :host ::ng-deep .filter-section .ant-checkbox-wrapper,
      :host ::ng-deep .filter-section .ant-checkbox-wrapper + .ant-checkbox-wrapper {
        display: flex !important;
        align-items: center;
        width: 100%;
        margin-left: 0 !important;
        margin-right: 0 !important;
        margin-bottom: 0;
        padding: 7px 0;
        font-size: var(--text-sm);
        line-height: 1.4;
        box-sizing: border-box;
      }

      .filter-title {
        font-family: var(--font-heading);
        font-size: var(--text-sm);
        font-weight: var(--font-semibold);
        color: var(--color-text-primary);
        margin-bottom: var(--space-3);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .filter-count {
        color: var(--color-text-tertiary);
        font-size: var(--text-xs);
        margin-left: var(--space-1);
      }

      /* Results Header */
      .results-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-4);
        flex-wrap: wrap;
        gap: var(--space-3);
      }

      .results-info {
        display: flex;
        align-items: center;
        gap: var(--space-4);
      }

      .results-count {
        color: var(--color-text-secondary);
        font-size: var(--text-sm);
      }

      .filter-toggle {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
      }

      .sort-options {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }

      .sort-label {
        color: var(--color-text-secondary);
        font-size: var(--text-sm);
      }

      .sort-select {
        width: 160px;
      }

      /* Active Filters */
      .active-filters {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        margin-bottom: var(--space-4);

        nz-tag {
          background: var(--color-primary-50);
          color: var(--color-primary);
          border: none;
        }
      }

      /* Jobs Grid */
      .jobs-grid {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }

      /* Job Card */
      .job-card {
        background: var(--color-bg-secondary);
        border-radius: var(--radius-xl);
        padding: var(--space-6);
        border: 1px solid var(--color-border);
        transition: all var(--transition-normal);
        position: relative;

        &:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
          border-color: var(--color-primary-200);
        }
      }

      .new-tag {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: var(--radius-full);
        font-size: 11px;
        font-weight: var(--font-bold);
        background: var(--color-success);
        color: white;
        letter-spacing: 0.02em;
      }

      .applied-btn {
        opacity: 0.7;
        cursor: default;
        color: var(--color-success) !important;
        border-color: var(--color-success) !important;
      }

      .job-header {
        display: flex;
        gap: var(--space-4);
        margin-bottom: var(--space-4);
      }

      .company-logo {
        width: 56px;
        height: 56px;
        border-radius: var(--radius-lg);
        background: var(--color-bg-tertiary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-heading);
        font-size: var(--text-xl);
        font-weight: var(--font-bold);
        color: var(--color-primary);
        flex-shrink: 0;
      }

      .job-info {
        flex: 1;
        min-width: 0;
      }

      .job-title {
        font-family: var(--font-heading);
        font-size: var(--text-lg);
        font-weight: var(--font-semibold);
        color: var(--color-text-primary);
        margin-bottom: var(--space-1);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        @media (max-width: 768px) {
          white-space: normal;
        }
      }

      .company-name {
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
      }

      .job-meta {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-4);
        margin-bottom: var(--space-4);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);

        .meta-item {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1);
        }

        .salary-highlight {
          color: var(--color-success);
          font-weight: var(--font-semibold);
        }
      }

      .job-tags {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        margin-bottom: var(--space-4);

        nz-tag {
          background: var(--color-primary-50);
          color: var(--color-primary);
          border: none;
        }
      }

      .job-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: var(--space-4);
        border-top: 1px solid var(--color-border);
        gap: var(--space-3);
      }

      .posted-info {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }

      .posted-date {
        font-size: var(--text-sm);
        color: var(--color-text-tertiary);
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      /* Pagination */
      .pagination-wrapper {
        display: flex;
        justify-content: center;
        margin-top: var(--space-8);
      }

      /* No Results */
      .no-results {
        text-align: center;
        padding: var(--space-16) 0;
      }

      /* Mobile Filters */
      .mobile-filters {
        .filter-section {
          margin-bottom: var(--space-6);
          padding-bottom: var(--space-6);
          border-bottom: 1px solid var(--color-border);

          &:last-child {
            border-bottom: none;
          }
        }
      }

      :host ::ng-deep .mobile-filters .ant-checkbox-wrapper,
      :host ::ng-deep .mobile-filters .ant-checkbox-wrapper + .ant-checkbox-wrapper {
        display: flex !important;
        align-items: center;
        width: 100%;
        margin-left: 0 !important;
        margin-right: 0 !important;
        margin-bottom: 0;
        padding: 8px 0;
        font-size: var(--text-sm);
      }

      .filter-drawer-footer {
        display: flex;
        gap: var(--space-3);

        button {
          flex: 1;
        }
      }

      /* Salary Slider */
      .salary-slider-wrapper {
        padding: 0 var(--space-2);
      }

      .salary-labels {
        display: flex;
        justify-content: space-between;
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
        margin-top: var(--space-1);
      }

      /* Responsive Utilities */
      @media (max-width: 767px) {
        .hide-mobile {
          display: none !important;
        }
      }

      @media (min-width: 768px) {
        .show-mobile-only {
          display: none !important;
        }
      }
    `,
  ],
})
export class JobsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private jobService = inject(JobService);
  private applicationService = inject(ApplicationService);
  private authService = inject(AuthService);

  appliedJobIds = new Set<number>();
  private searchSubject = new Subject<string>();
  private suggestionSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  searchQuery = '';
  selectedLocation = '';
  selectedCategory: string | null = null;
  companyCodeFilter: string | null = null;
  allActiveCompanies: ActiveCompany[] = [];
  filteredCompanies: ActiveCompany[] = [];
  sortBy = 'newest';
  salaryRange: [number, number] = [0, 100];
  currentPage = 1;
  pageSize = 10;
  filterDrawerOpen = false;
  loading = false;
  totalJobs = 0;
  suggestions: PublicJobListItem[] = [];
  suggestionsLoading = false;

  locations = [
    'Hồ Chí Minh',
    'Hà Nội',
    'Đà Nẵng',
    'Cần Thơ',
    'Hải Phòng',
    'Bình Dương',
    'Đồng Nai',
  ];

  jobTypes = [
    { value: 'full_time', label: 'Toàn thời gian', checked: false },
    { value: 'part_time', label: 'Bán thời gian', checked: false },
    { value: 'contract', label: 'Hợp đồng', checked: false },
    { value: 'internship', label: 'Thực tập', checked: false },
  ];

  experienceLevels = [
    { value: 'entry', label: 'Mới tốt nghiệp', checked: false },
    { value: 'junior', label: '1-2 năm', checked: false },
    { value: 'mid', label: '3-5 năm', checked: false },
    { value: 'senior', label: '5+ năm', checked: false },
    { value: 'manager', label: 'Quản lý', checked: false },
  ];

  // Values must match the department options in admin job form
  categories = VIETNAMESE_INDUSTRIES.map(ind => ({
    value: ind, label: ind, checked: false,
  }));

  jobs: Job[] = [];
  apiJobs: PublicJobListItem[] = [];

  get filteredJobs(): Job[] {
    return this.jobs;
  }

  get paginatedJobs(): Job[] {
    return this.jobs;
  }

  ngOnInit(): void {
    this.loadAppliedJobIds();
    this.loadActiveCompanies();

    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.loadJobs();
      });

    this.suggestionSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap((query) => {
          if (!query || query.trim().length < 2) {
            this.suggestions = [];
            this.suggestionsLoading = false;
          } else {
            this.suggestionsLoading = true;
          }
        }),
        switchMap((query) => {
          if (!query || query.trim().length < 2) {
            return of({ items: [] as PublicJobListItem[] });
          }
          return this.jobService.list({ q: query.trim(), size: 5 }).pipe(
            catchError(() => of({ items: [] as PublicJobListItem[] }))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (res) => {
          this.suggestions = res.items || [];
          this.suggestionsLoading = false;
        },
        error: () => {
          this.suggestions = [];
          this.suggestionsLoading = false;
        },
      });

    this.route.queryParams.subscribe((params) => {
      if (params['category']) {
        const category = this.categories.find((c) => c.value === params['category']);
        if (category) {
          category.checked = true;
        }
      }
      if (params['q']) {
        this.searchQuery = params['q'];
      }
      if (params['company_code']) {
        this.companyCodeFilter = params['company_code'];
      } else {
        this.companyCodeFilter = null;
      }
      this.loadJobs();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadActiveCompanies(): void {
    this.jobService.listActiveCompanies(50).subscribe({
      next: (res) => {
        this.allActiveCompanies = res.items;
        this.filteredCompanies = res.items;
      },
      error: () => {},
    });
  }

  onCompanySearch(term: string): void {
    if (!term) {
      this.filteredCompanies = this.allActiveCompanies;
      return;
    }
    const lower = term.toLowerCase();
    this.filteredCompanies = this.allActiveCompanies.filter(
      (c) => c.company_name.toLowerCase().includes(lower)
    );
  }

  loadAppliedJobIds(): void {
    if (!this.authService.isAuthenticated()) return;
    this.applicationService.getAppliedJobIds().subscribe({
      next: (ids) => {
        this.appliedJobIds = new Set(ids);
        // Re-mark existing jobs if already loaded
        this.jobs.forEach((j) => (j.isApplied = this.appliedJobIds.has(j.id)));
      },
      error: () => {}, // Silently fail — user may not be logged in
    });
  }

  loadJobs(): void {
    this.loading = true;
    const selectedType = this.jobTypes.find((t) => t.checked);
    const expParams = this.getExperienceParams();

    this.jobService
      .list({
        q: this.searchQuery || undefined,
        location: this.selectedLocation || undefined,
        employment_type: selectedType?.value,
        department: this.selectedCategory || undefined,
        company_code: this.companyCodeFilter || undefined,
        salary_min: this.salaryRange[0] > 0 ? this.salaryRange[0] : undefined,
        salary_max: this.salaryRange[1] < 100 ? this.salaryRange[1] : undefined,
        ...expParams,
        order_by: this.sortBy !== 'newest' ? this.sortBy : undefined,
        page: this.currentPage,
        size: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.apiJobs = res.items;
          this.totalJobs = res.total;
          this.jobs = this.mapApiJobsToDisplay(res.items);
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  private mapApiJobsToDisplay(apiJobs: PublicJobListItem[]): Job[] {
    return apiJobs.map((j) => ({
      id: j.id,
      slug: j.slug,
      title: j.title_vi,
      company: j.department || 'iRSA',
      companyInitial: (j.department || 'I')[0].toUpperCase(),
      location: j.location || 'Việt Nam',
      type: this.getEmploymentTypeLabel(j.employment_type),
      experience: '',
      skills: [],
      salaryMin: j.salary_min ?? undefined,
      salaryMax: j.salary_max ?? undefined,
      salaryLabel: this.formatSalaryLabel(j.salary_min, j.salary_max),
      postedDate: this.formatDate(j.published_at),
      applicants: j.applications_count,
      isNew: this.isNewToday(j.published_at),
      isApplied: this.appliedJobIds.has(j.id),
    }));
  }

  private formatSalaryLabel(min?: number, max?: number): string {
    if (min != null && max != null) {
      return min === max ? `${min} triệu` : `${min} - ${max} triệu`;
    }
    if (min != null) return `Từ ${min} triệu`;
    if (max != null) return `Đến ${max} triệu`;
    return '';
  }

  private getEmploymentTypeLabel(type?: string): string {
    const labels: Record<string, string> = {
      full_time: 'Toàn thời gian',
      part_time: 'Bán thời gian',
      contract: 'Hợp đồng',
      internship: 'Thực tập',
    };
    return labels[type || ''] || type || 'Toàn thời gian';
  }

  private formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa đăng';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private isNewToday(dateStr?: string): boolean {
    if (!dateStr) return false;
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff < 24 * 60 * 60 * 1000;
  }

  private getExperienceParams(): { min_experience?: number; max_experience?: number } {
    const selected = this.experienceLevels.filter((e) => e.checked);
    if (selected.length === 0) return {};

    const ranges: Record<string, [number, number | undefined]> = {
      entry: [0, 0],
      junior: [1, 2],
      mid: [3, 5],
      senior: [5, undefined],
      manager: [7, undefined],
    };

    let minExp = Infinity;
    let maxExp = 0;
    let hasOpenEnd = false;

    for (const sel of selected) {
      const [min, max] = ranges[sel.value] || [0, undefined];
      if (min < minExp) minExp = min;
      if (max === undefined) hasOpenEnd = true;
      else if (max > maxExp) maxExp = max;
    }

    return {
      min_experience: minExp === Infinity ? undefined : minExp,
      max_experience: hasOpenEnd ? undefined : maxExp,
    };
  }

  onSearchInput(query: string): void {
    this.searchSubject.next(query);
    if (!query || query.trim().length < 2) {
      this.suggestions = [];
      this.suggestionsLoading = false;
    }
    this.suggestionSubject.next(query);
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadJobs();
  }

  onJobTypeChange(selected: { value: string; checked: boolean }): void {
    if (selected.checked) {
      this.jobTypes.forEach((t) => {
        if (t.value !== selected.value) t.checked = false;
      });
    }
    this.currentPage = 1;
    this.loadJobs();
  }

  onExperienceChange(selected: { value: string; checked: boolean }): void {
    if (selected.checked) {
      this.experienceLevels.forEach((e) => {
        if (e.value !== selected.value) e.checked = false;
      });
    }
    this.currentPage = 1;
    this.loadJobs();
  }

  onCategoryChange(selected: { value: string; checked: boolean }): void {
    if (selected.checked) {
      this.categories.forEach((c) => {
        if (c.value !== selected.value) c.checked = false;
      });
    }
    this.selectedCategory = selected.checked ? selected.value : null;
    this.currentPage = 1;
    this.loadJobs();
  }

  onCategorySelectChange(): void {
    this.currentPage = 1;
    this.loadJobs();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadJobs();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadJobs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadJobs();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedLocation = '';
    this.companyCodeFilter = null;
    this.filteredCompanies = this.allActiveCompanies;
    this.salaryRange = [0, 100];
    this.jobTypes.forEach((t) => (t.checked = false));
    this.experienceLevels.forEach((e) => (e.checked = false));
    this.categories.forEach((c) => (c.checked = false));
    this.selectedCategory = null;
    this.filterDrawerOpen = false;
    this.loadJobs();
  }

  applyFilters(): void {
    this.filterDrawerOpen = false;
    this.onFilterChange();
  }

  hasActiveFilters(): boolean {
    return (
      this.salaryRange[0] > 0 ||
      this.salaryRange[1] < 100 ||
      this.jobTypes.some((t) => t.checked) ||
      this.experienceLevels.some((e) => e.checked) ||
      this.categories.some((c) => c.checked)
    );
  }

  getActiveFilters(): Array<{ key: string; value: string; label: string }> {
    const filters: Array<{ key: string; value: string; label: string }> = [];

    if (this.salaryRange[0] > 0 || this.salaryRange[1] < 100) {
      filters.push({
        key: 'salary',
        value: 'range',
        label: `${this.salaryRange[0]}tr - ${this.salaryRange[1] === 100 ? '100tr+' : this.salaryRange[1] + 'tr'}`,
      });
    }

    this.jobTypes
      .filter((t) => t.checked)
      .forEach((t) => filters.push({ key: 'jobType', value: t.value, label: t.label }));

    this.experienceLevels
      .filter((e) => e.checked)
      .forEach((e) => filters.push({ key: 'experience', value: e.value, label: e.label }));

    this.categories
      .filter((c) => c.checked)
      .forEach((c) => filters.push({ key: 'category', value: c.value, label: c.label }));

    return filters;
  }

  removeFilter(key: string, value: string): void {
    if (key === 'salary') {
      this.salaryRange = [0, 100];
    } else if (key === 'jobType') {
      const type = this.jobTypes.find((t) => t.value === value);
      if (type) type.checked = false;
    } else if (key === 'experience') {
      const exp = this.experienceLevels.find((e) => e.value === value);
      if (exp) exp.checked = false;
    } else if (key === 'category') {
      const cat = this.categories.find((c) => c.value === value);
      if (cat) cat.checked = false;
    }
    this.onFilterChange();
  }

  getJobSlug(job: Job): string {
    const apiJob = this.apiJobs.find((j) => j.id === job.id);
    return apiJob?.slug || job.id.toString();
  }
}
