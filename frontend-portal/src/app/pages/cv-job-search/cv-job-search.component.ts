/**
 * CV Job Search page — finds jobs matching the candidate's CV via AI scoring.
 */
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { FormsModule } from '@angular/forms';

import { JobService } from '../../core/services/job.service';
import { ResumeService } from '../../core/services/resume.service';
import { CVJobMatchItem, CVJobSearchResponse } from '../../shared/models/job.model';
import { Resume } from '../../shared/models/resume.model';

@Component({
  selector: 'app-cv-job-search',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzCardModule,
    NzButtonModule,
    NzTagModule,
    NzSpinModule,
    NzMessageModule,
    NzIconModule,
    NzPaginationModule,
    NzEmptyModule,
    NzDividerModule,
    NzProgressModule,
    NzSliderModule,
    NzInputNumberModule,
    FormsModule,
  ],
  template: `
    <div class="cv-search-page">
      <div class="container">
        <!-- Page Header -->
        <div class="page-header">
          <h1>
            <span nz-icon nzType="file-search" nzTheme="outline"></span>
            Tìm việc làm phù hợp với CV
          </h1>
          <p>Hệ thống sẽ phân tích CV của bạn và gợi ý những vị trí phù hợp nhất</p>
        </div>

        <!-- CV Selection Card -->
        <nz-card class="search-card">
          <div class="search-options">
            <!-- Option 1: Use default CV -->
            <div class="option-block">
              <h3>Sử dụng CV mặc định</h3>
              @if (defaultResume) {
                <div class="default-cv-info">
                  <span nz-icon nzType="file-pdf" nzTheme="outline" class="file-icon"></span>
                  <span class="filename">{{ defaultResume.original_filename }}</span>
                </div>
                <button
                  nz-button
                  nzType="primary"
                  [nzLoading]="searching"
                  (click)="searchWithDefault()"
                  class="search-btn"
                >
                  <span nz-icon nzType="search" nzTheme="outline"></span>
                  Tìm việc với CV này
                </button>
              } @else {
                <div class="no-cv-hint">
                  <span nz-icon nzType="info-circle" nzTheme="outline"></span>
                  Bạn chưa có CV mặc định.
                  <a routerLink="/dashboard/profile">Tải lên CV tại đây</a>
                </div>
              }
            </div>

            <nz-divider nzType="vertical" class="divider-vertical"></nz-divider>
            <div class="divider-label">hoặc</div>
            <nz-divider nzType="vertical" class="divider-vertical"></nz-divider>

            <!-- Option 2: Upload new CV -->
            <div class="option-block">
              <h3>Tải lên CV mới</h3>
              <div class="upload-area">
                <input
                  type="file"
                  #fileInput
                  accept=".pdf,.doc,.docx"
                  style="display:none"
                  (change)="onFileSelected($event)"
                />
                @if (selectedFile) {
                  <div class="selected-file">
                    <span nz-icon nzType="file" nzTheme="outline" class="file-icon"></span>
                    <span class="filename">{{ selectedFile.name }}</span>
                    <span
                      nz-icon nzType="close-circle" nzTheme="outline"
                      class="remove-btn"
                      (click)="clearFile()"
                    ></span>
                  </div>
                  <button
                    nz-button
                    nzType="primary"
                    [nzLoading]="searching"
                    (click)="searchWithFile()"
                    class="search-btn"
                  >
                    <span nz-icon nzType="search" nzTheme="outline"></span>
                    Tìm việc với CV này
                  </button>
                } @else {
                  <button
                    nz-button
                    nzType="dashed"
                    (click)="fileInput.click()"
                    class="upload-btn"
                  >
                    <span nz-icon nzType="upload" nzTheme="outline"></span>
                    Chọn file CV (PDF, DOC, DOCX)
                  </button>
                }
              </div>
            </div>
          </div>
        </nz-card>

        <!-- Results -->
        @if (searching) {
          <div class="loading-state">
            <nz-spin nzSize="large" nzTip="Đang phân tích CV..."></nz-spin>
          </div>
        } @else if (searched) {
          <div class="results-section">
            <div class="results-header">
              <h2>Kết quả sàng lọc</h2>
              <span class="result-count">{{ filteredJobs.length }}/{{ allJobs.length }} vị trí</span>
            </div>

            <!-- Score Threshold Filter -->
            <nz-card class="threshold-card">
              <div class="threshold-control">
                <div class="threshold-label">
                  <span nz-icon nzType="filter" nzTheme="outline"></span>
                  <span>Điểm tối thiểu:</span>
                  <strong class="threshold-value" [class]="getScoreClass(scoreThreshold)">
                    {{ scoreThreshold }}%
                  </strong>
                </div>
                <div class="threshold-slider">
                  <nz-slider
                    [(ngModel)]="scoreThreshold"
                    [nzMin]="0"
                    [nzMax]="100"
                    [nzStep]="5"
                    [nzTipFormatter]="thresholdFormatter"
                    (nzOnAfterChange)="onThresholdChange()"
                  ></nz-slider>
                </div>
                <nz-input-number
                  [(ngModel)]="scoreThreshold"
                  [nzMin]="0"
                  [nzMax]="100"
                  [nzStep]="5"
                  nzSize="small"
                  (ngModelChange)="onThresholdChange()"
                  class="threshold-input"
                ></nz-input-number>
              </div>
            </nz-card>

            @if (filteredJobs.length === 0) {
              <nz-empty
                nzNotFoundContent="Không có vị trí nào đạt điểm tối thiểu. Hãy giảm ngưỡng điểm."
              ></nz-empty>
            } @else {
              <div class="job-list">
                @for (job of paginatedJobs; track job.id) {
                  <nz-card
                    class="job-card"
                    [nzHoverable]="true"
                    (click)="goToJob(job.slug)"
                  >
                    <div class="job-card-inner">
                      <!-- Score Badge -->
                      <div class="score-section">
                        <div class="score-badge" [class]="getScoreClass(job.total_score)">
                          {{ job.total_score | number:'1.0-0' }}%
                        </div>
                        <span class="score-label">Phù hợp</span>
                      </div>

                      <!-- Job Info -->
                      <div class="job-info">
                        <h3 class="job-title">{{ job.title_vi }}</h3>
                        <div class="job-meta">
                          @if (job.department) {
                            <span class="meta-item">
                              <span nz-icon nzType="team" nzTheme="outline"></span>
                              {{ job.department }}
                            </span>
                          }
                          @if (job.location) {
                            <span class="meta-item">
                              <span nz-icon nzType="environment" nzTheme="outline"></span>
                              {{ job.location }}
                            </span>
                          }
                          @if (job.employment_type) {
                            <span class="meta-item">
                              <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                              {{ job.employment_type }}
                            </span>
                          }
                          @if (job.salary_min || job.salary_max) {
                            <span class="meta-item salary">
                              <span nz-icon nzType="dollar" nzTheme="outline"></span>
                              {{ formatSalary(job.salary_min, job.salary_max) }}
                            </span>
                          }
                        </div>

                        <!-- Score breakdown -->
                        <div class="score-breakdown">
                          <span class="breakdown-item">
                            Kỹ năng: <strong>{{ job.skill_score | number:'1.0-0' }}%</strong>
                          </span>
                          <span class="breakdown-item">
                            Kinh nghiệm: <strong>{{ job.experience_score | number:'1.0-0' }}%</strong>
                          </span>
                          <span class="breakdown-item">
                            Học vấn: <strong>{{ job.education_score | number:'1.0-0' }}%</strong>
                          </span>
                        </div>

                        <!-- Matched skills -->
                        @if (job.matched_skills.length > 0) {
                          <div class="matched-skills">
                            <span class="skills-label">Kỹ năng phù hợp:</span>
                            @for (skill of job.matched_skills.slice(0, 6); track skill) {
                              <nz-tag nzColor="blue">{{ skill }}</nz-tag>
                            }
                            @if (job.matched_skills.length > 6) {
                              <nz-tag>+{{ job.matched_skills.length - 6 }}</nz-tag>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  </nz-card>
                }
              </div>

              <!-- Pagination -->
              @if (filteredJobs.length > pageSize) {
                <div class="pagination-wrapper">
                  <nz-pagination
                    [nzTotal]="filteredJobs.length"
                    [nzPageIndex]="currentPage"
                    [nzPageSize]="pageSize"
                    (nzPageIndexChange)="onPageChange($event)"
                  ></nz-pagination>
                </div>
              }
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .cv-search-page {
      padding: var(--space-8) 0;
      min-height: 100vh;
      background: var(--color-bg-primary);
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 0 var(--container-padding, 16px);
    }
    .page-header {
      margin-bottom: var(--space-6, 24px);
      text-align: center;
      h1 {
        font-size: var(--text-2xl, 24px);
        font-weight: 700;
        color: var(--color-text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      p { color: var(--color-text-secondary); text-align: center; }
    }
    .search-card { margin-bottom: 24px; }
    .search-options {
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }
    .option-block {
      flex: 1;
      min-width: 200px;
      h3 {
        font-weight: 600;
        margin-bottom: 12px;
        color: var(--color-text-primary);
      }
    }
    .divider-vertical { height: 100px; }
    .divider-label {
      color: var(--color-text-secondary);
      font-size: 12px;
      white-space: nowrap;
    }
    .default-cv-info, .selected-file {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--color-bg-secondary, #f5f5f5);
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .file-icon { color: #ff4d4f; font-size: 18px; }
    .filename {
      flex: 1;
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .remove-btn {
      cursor: pointer;
      color: var(--color-text-secondary);
      &:hover { color: #ff4d4f; }
    }
    .search-btn { width: 100%; }
    .upload-btn { width: 100%; }
    .no-cv-hint {
      color: var(--color-text-secondary);
      font-size: 14px;
      a { color: var(--color-primary, #1677ff); }
    }
    .loading-state {
      display: flex;
      justify-content: center;
      padding: 64px 0;
    }
    .threshold-card { margin-bottom: 16px; }
    .threshold-control {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .threshold-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: var(--color-text-secondary);
      white-space: nowrap;
    }
    .threshold-value {
      font-size: 16px;
      min-width: 40px;
      text-align: center;
    }
    .threshold-value.score-high { color: #52c41a; }
    .threshold-value.score-medium { color: #faad14; }
    .threshold-value.score-low { color: #ff4d4f; }
    .threshold-slider { flex: 1; min-width: 150px; }
    .threshold-input { width: 70px; }
    @media (max-width: 600px) {
      .threshold-control { flex-wrap: wrap; }
      .threshold-slider { min-width: 100%; order: 3; }
    }
    .results-section { margin-top: 8px; }
    .results-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      h2 { font-size: 18px; font-weight: 600; margin: 0; }
    }
    .result-count {
      color: var(--color-text-secondary);
      font-size: 14px;
      background: var(--color-bg-secondary, #f5f5f5);
      padding: 2px 10px;
      border-radius: 20px;
    }
    .job-list { display: flex; flex-direction: column; gap: 12px; }
    .job-card {
      cursor: pointer;
      transition: box-shadow 0.2s;
      &:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
    }
    .job-card-inner { display: flex; gap: 16px; align-items: flex-start; }
    .score-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 64px;
    }
    .score-badge {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      color: white;
      margin-bottom: 4px;
    }
    .score-badge.score-high { background: #52c41a; }
    .score-badge.score-medium { background: #faad14; }
    .score-badge.score-low { background: #ff4d4f; }
    .score-label { font-size: 11px; color: var(--color-text-secondary); }
    .job-info { flex: 1; }
    .job-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; color: var(--color-text-primary); }
    .job-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 8px;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: var(--color-text-secondary);
    }
    .salary { color: #52c41a; font-weight: 500; }
    .score-breakdown {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-bottom: 8px;
    }
    .breakdown-item strong { color: var(--color-text-primary); }
    .matched-skills {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
    }
    .skills-label { font-size: 12px; color: var(--color-text-secondary); margin-right: 4px; }
    .pagination-wrapper { display: flex; justify-content: center; margin-top: 24px; }
  `],
})
export class CVJobSearchComponent implements OnInit {
  private jobService = inject(JobService);
  private resumeService = inject(ResumeService);
  private message = inject(NzMessageService);
  private router = inject(Router);

  defaultResume: Resume | null = null;
  selectedFile: File | null = null;
  allJobs: CVJobMatchItem[] = [];
  filteredJobs: CVJobMatchItem[] = [];
  totalJobs = 0;
  currentPage = 1;
  pageSize = 20;
  searching = false;
  searched = false;
  scoreThreshold = 0;

  thresholdFormatter = (value: number) => `${value}%`;

  get paginatedJobs(): CVJobMatchItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredJobs.slice(start, start + this.pageSize);
  }

  ngOnInit(): void {
    this.loadDefaultResume();
  }

  loadDefaultResume(): void {
    this.resumeService.list().subscribe({
      next: (res) => {
        this.defaultResume = res.items.find((r) => r.is_default) ?? null;
      },
      error: () => {
        // Not critical — user can still upload a file
      },
    });
  }

  searchWithDefault(): void {
    this.currentPage = 1;
    this.doSearch({});
  }

  searchWithFile(): void {
    if (!this.selectedFile) return;
    this.currentPage = 1;
    this.doSearch({ file: this.selectedFile });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    if (this.selectedFile) {
      this.doSearch({ file: this.selectedFile });
    } else {
      this.doSearch({});
    }
  }

  private doSearch(params: { file?: File; resume_id?: number }): void {
    this.searching = true;
    // Fetch all results (large page) for client-side threshold filtering
    this.jobService
      .searchByCV({ ...params, page: 1, size: 200 })
      .subscribe({
        next: (res) => {
          this.allJobs = res.items;
          this.applyThreshold();
          this.searching = false;
          this.searched = true;
        },
        error: (err) => {
          this.message.error(err.error?.detail || 'Có lỗi xảy ra khi tìm kiếm');
          this.searching = false;
        },
      });
  }

  onThresholdChange(): void {
    this.currentPage = 1;
    this.applyThreshold();
  }

  private applyThreshold(): void {
    this.filteredJobs = this.allJobs.filter(
      (j) => j.total_score >= this.scoreThreshold
    );
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
      this.searched = false;
      this.allJobs = [];
    this.filteredJobs = [];
    }
  }

  clearFile(): void {
    this.selectedFile = null;
    this.searched = false;
    this.allJobs = [];
    this.filteredJobs = [];
  }

  goToJob(slug: string): void {
    this.router.navigate(['/jobs', slug]);
  }

  getScoreClass(score: number): string {
    if (score >= 70) return 'score-high';
    if (score >= 40) return 'score-medium';
    return 'score-low';
  }

  formatSalary(min: number | null, max: number | null): string {
    if (min && max) return `${min}–${max} triệu`;
    if (min) return `Từ ${min} triệu`;
    if (max) return `Đến ${max} triệu`;
    return 'Thỏa thuận';
  }
}
