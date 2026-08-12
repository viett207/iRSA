import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { JobService } from '../../core/services/job.service';
import { PublicJobListItem, ActiveCompany } from '../../shared/models/job.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzButtonModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzTagModule,
    NzSpinModule,
    NzEmptyModule,
    DatePipe,
  ],
  template: `
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-bg-pattern"></div>
      <div class="hero-container">
        <div class="hero-content">
          <h1 class="hero-title">
            Tìm việc làm<br />
            <span class="hero-highlight">phù hợp với bạn</span>
          </h1>

          <!-- Search Box -->
          <div class="search-box">
            <div class="search-input">
              <nz-input-group [nzPrefix]="searchIcon" nzSize="large">
                <input
                  type="text"
                  nz-input
                  placeholder="Tìm kiếm vị trí, kỹ năng..."
                  [(ngModel)]="searchQuery"
                  (keyup.enter)="onSearch()"
                />
              </nz-input-group>
              <ng-template #searchIcon>
                <span nz-icon nzType="search" nzTheme="outline"></span>
              </ng-template>
            </div>
            <button nz-button nzType="primary" nzSize="large" class="search-btn" (click)="onSearch()">
              Tìm kiếm
            </button>
          </div>

          <!-- Category Quick Filters -->
          <div class="category-chips">
            @for (category of categories; track category.name) {
              <button class="category-chip" routerLink="/jobs" [queryParams]="{department: category.name}">
                <span nz-icon [nzType]="category.icon" nzTheme="outline"></span>
                {{ category.label }}
              </button>
            }
          </div>
        </div>
      </div>
    </section>

    <!-- Active Companies -->
    @if (activeCompanies.length > 0) {
      <section class="companies-section">
        <div class="container">
          <div class="section-header">
            <h2>Doanh nghiệp đang tuyển dụng</h2>
          </div>
          <div class="companies-grid">
            @for (company of activeCompanies; track company.company_code) {
              <a class="company-card" [routerLink]="['/companies', company.company_code]">
                <div class="company-avatar">
                  {{ company.company_name.charAt(0) }}
                </div>
                <div class="company-info">
                  <div class="company-name">{{ company.company_name }}</div>
                  <div class="company-meta">
                    <span *ngIf="company.industry">{{ company.industry }}</span>
                    <span *ngIf="company.location">
                      <span nz-icon nzType="environment" nzTheme="outline"></span>
                      {{ company.location }}
                    </span>
                  </div>
                </div>
                <div class="company-badge">
                  {{ company.job_count }} vị trí
                </div>
              </a>
            }
          </div>
        </div>
      </section>
    }

    <!-- Latest Jobs -->
    <section class="jobs-section">
      <div class="container">
        <div class="section-header">
          <h2>Việc làm mới nhất</h2>
          <span class="job-count" *ngIf="totalJobs > 0">{{ totalJobs }} vị trí đang tuyển</span>
        </div>

        <nz-spin [nzSpinning]="loading">
          @if (jobs.length > 0) {
            <div nz-row [nzGutter]="[24, 24]">
              @for (job of jobs; track job.id) {
                <div nz-col [nzXs]="24" [nzMd]="12" [nzLg]="8">
                  <div class="job-card" [routerLink]="['/jobs', job.slug]">
                    <div class="job-header">
                      <div class="job-icon">
                        <span nz-icon nzType="file-text" nzTheme="outline"></span>
                      </div>
                      <div class="job-info">
                        <div class="job-title">{{ job.title_vi }}</div>
                        <div class="job-dept" *ngIf="job.department">{{ job.department }}</div>
                      </div>
                    </div>
                    <div class="job-meta">
                      <span class="meta-item" *ngIf="job.location">
                        <span nz-icon nzType="environment" nzTheme="outline"></span>
                        {{ job.location }}
                      </span>
                      <span class="meta-item" *ngIf="job.employment_type">
                        <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                        {{ formatEmploymentType(job.employment_type) }}
                      </span>
                    </div>
                    <div class="job-footer">
                      <span class="salary" *ngIf="job.salary_min || job.salary_max">
                        {{ formatSalary(job.salary_min, job.salary_max) }}
                      </span>
                      <span class="posted-date" *ngIf="job.published_at">
                        {{ job.published_at | date:'dd/MM/yyyy' }}
                      </span>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else if (!loading) {
            <nz-empty nzNotFoundContent="Chưa có việc làm nào được đăng tuyển"></nz-empty>
          }
        </nz-spin>

        <div class="section-cta" *ngIf="totalJobs > 6">
          <button nz-button nzType="primary" nzSize="large" routerLink="/jobs">
            Xem tất cả việc làm
            <span nz-icon nzType="arrow-right" nzTheme="outline"></span>
          </button>
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* Hero Section */
    .hero-section {
      background: linear-gradient(135deg, var(--color-primary) 0%, #0072E5 50%, #00A3E0 100%);
      position: relative;
      overflow: hidden;
      padding: var(--space-16) 0;
      margin: calc(-1 * var(--header-height)) 0 0 0;
      padding-top: calc(var(--header-height) + var(--space-16));
      @media (max-width: 768px) {
        padding: var(--space-10) 0;
        padding-top: calc(var(--header-height) + var(--space-10));
      }
    }
    .hero-bg-pattern {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      opacity: 0.5; pointer-events: none;
    }
    .hero-container {
      max-width: var(--container-max); margin: 0 auto;
      padding: 0 var(--container-padding); position: relative; z-index: 1;
    }
    .hero-content {
      max-width: 720px; margin: 0 auto; text-align: center;
    }
    .hero-title {
      font-family: var(--font-heading); font-size: var(--text-5xl);
      font-weight: var(--font-extrabold); color: white;
      line-height: 1.1; margin-bottom: var(--space-6); letter-spacing: -0.02em;
      @media (max-width: 768px) { font-size: var(--text-3xl); }
    }
    .hero-highlight {
      background: linear-gradient(90deg, #FFD93D 0%, #FF9F43 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }

    /* Search Box */
    .search-box {
      background: var(--color-bg-secondary); border-radius: var(--radius-2xl);
      padding: var(--space-2); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      display: flex; gap: var(--space-2); max-width: 600px; margin: 0 auto var(--space-6);
      @media (max-width: 640px) {
        flex-direction: column; padding: var(--space-4); border-radius: var(--radius-xl);
      }
    }
    .search-input {
      flex: 1;
      .ant-input-affix-wrapper {
        border: none !important; background: transparent !important;
        box-shadow: none !important; padding: 12px 16px !important; font-size: var(--text-base) !important;
      }
      .ant-input {
        font-size: var(--text-base) !important;
        &::placeholder { color: var(--color-text-tertiary); }
      }
    }
    .search-btn {
      flex-shrink: 0; padding: 0 var(--space-8) !important;
      height: 48px !important; border-radius: var(--radius-xl) !important;
      font-weight: var(--font-semibold) !important;
      @media (max-width: 640px) { width: 100%; }
    }

    /* Category Chips */
    .category-chips {
      display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-3);
    }
    .category-chip {
      display: inline-flex; align-items: center; gap: var(--space-2);
      background: rgba(255,255,255,0.15); backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.25); border-radius: var(--radius-full);
      padding: 10px 20px; font-size: var(--text-sm); font-weight: var(--font-medium);
      color: white; cursor: pointer; transition: all var(--transition-fast);
      &:hover { background: rgba(255,255,255,0.25); transform: translateY(-2px); }
    }

    /* Jobs Section */
    .jobs-section {
      padding: var(--space-16) 0;
      background: var(--color-bg-primary);
      @media (max-width: 768px) { padding: var(--space-10) 0; }
    }
    .container {
      max-width: var(--container-max); margin: 0 auto; padding: 0 var(--container-padding);
    }
    .section-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: var(--space-8);
      h2 {
        font-family: var(--font-heading); font-size: var(--text-2xl);
        font-weight: var(--font-bold); color: var(--color-text-primary); margin: 0;
      }
    }
    .job-count {
      font-size: var(--text-sm); color: var(--color-text-secondary);
      background: var(--color-bg-tertiary); padding: 4px 12px; border-radius: var(--radius-full);
    }
    .section-cta {
      text-align: center; margin-top: var(--space-10);
      button { display: inline-flex; align-items: center; gap: var(--space-2); }
    }

    /* Job Card */
    .job-card {
      background: var(--color-bg-secondary); border-radius: var(--radius-xl);
      padding: var(--space-6); border: 1px solid var(--color-border);
      transition: all var(--transition-normal); cursor: pointer;
      height: 100%; display: flex; flex-direction: column;
      &:hover {
        transform: translateY(-4px); box-shadow: var(--shadow-lg);
        border-color: var(--color-primary-200);
      }
    }
    .job-header {
      display: flex; gap: var(--space-4); margin-bottom: var(--space-4);
    }
    .job-icon {
      width: 48px; height: 48px; border-radius: var(--radius-lg);
      background: var(--color-primary-50); display: flex;
      align-items: center; justify-content: center;
      color: var(--color-primary); font-size: 20px; flex-shrink: 0;
    }
    .job-info { flex: 1; min-width: 0; }
    .job-title {
      font-family: var(--font-heading); font-size: var(--text-base);
      font-weight: var(--font-semibold); color: var(--color-text-primary);
      margin-bottom: var(--space-1); display: -webkit-box;
      -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .job-dept {
      font-size: var(--text-sm); color: var(--color-text-secondary);
    }
    .job-meta {
      display: flex; flex-wrap: wrap; gap: var(--space-4);
      margin-bottom: var(--space-4); font-size: var(--text-sm);
      color: var(--color-text-secondary); flex: 1;
      .meta-item { display: flex; align-items: center; gap: var(--space-1); }
    }
    .job-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: var(--space-4); border-top: 1px solid var(--color-border); margin-top: auto;
    }
    .salary {
      font-family: var(--font-heading); font-weight: var(--font-semibold);
      color: var(--color-success); font-size: var(--text-sm);
    }
    .posted-date {
      font-size: var(--text-xs); color: var(--color-text-tertiary);
    }

    /* Companies Section */
    .companies-section {
      padding: var(--space-12) 0;
      background: var(--color-bg-secondary);
    }
    .companies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--space-4);
    }
    .company-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-5);
      background: #fff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      cursor: pointer;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s ease;
    }
    .company-card:hover {
      border-color: var(--color-primary);
      box-shadow: 0 4px 12px rgba(0, 80, 179, 0.1);
      transform: translateY(-2px);
    }
    .company-avatar {
      width: 48px; height: 48px;
      border-radius: var(--radius-lg);
      background: var(--color-primary);
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 700;
      flex-shrink: 0;
    }
    .company-info { flex: 1; min-width: 0; }
    .company-name {
      font-weight: var(--font-semibold);
      font-size: var(--text-base);
      color: var(--color-text-primary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .company-meta {
      display: flex; gap: var(--space-3);
      font-size: var(--text-xs); color: var(--color-text-secondary);
      margin-top: 2px;
    }
    .company-meta span { display: flex; align-items: center; gap: 2px; }
    .company-badge {
      flex-shrink: 0;
      padding: 4px 10px;
      background: var(--color-primary-50);
      color: var(--color-primary);
      border-radius: var(--radius-md);
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);
      white-space: nowrap;
    }
    @media (max-width: 768px) {
      .companies-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  private jobService = inject(JobService);

  searchQuery = '';
  jobs: PublicJobListItem[] = [];
  totalJobs = 0;
  loading = false;
  activeCompanies: ActiveCompany[] = [];

  categories = [
    { name: 'Công nghệ thông tin', label: 'Công nghệ thông tin', icon: 'laptop' },
    { name: 'Tài chính - Ngân hàng', label: 'Tài chính - Ngân hàng', icon: 'bank' },
    { name: 'Xây dựng', label: 'Xây dựng', icon: 'build' },
    { name: 'Y tế - Dược phẩm', label: 'Y tế - Dược phẩm', icon: 'medicine-box' },
    { name: 'Giáo dục - Đào tạo', label: 'Giáo dục - Đào tạo', icon: 'read' },
  ];

  ngOnInit(): void {
    this.loadLatestJobs();
    this.loadActiveCompanies();
  }

  onSearch(): void {
    const q = this.searchQuery.trim();
    this.router.navigate(['/jobs'], { queryParams: q ? { q } : {} });
  }

  formatEmploymentType(type: string): string {
    const map: Record<string, string> = {
      full_time: 'Toàn thời gian',
      part_time: 'Bán thời gian',
      contract: 'Hợp đồng',
      internship: 'Thực tập',
      remote: 'Từ xa',
    };
    return map[type] || type;
  }

  formatSalary(min?: number, max?: number): string {
    const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(0)} triệu` : n.toLocaleString());
    if (min && max) return `${fmt(min)} - ${fmt(max)} VNĐ`;
    if (min) return `Từ ${fmt(min)} VNĐ`;
    return '';
  }

  private loadActiveCompanies(): void {
    this.jobService.listActiveCompanies(10).subscribe({
      next: (res) => this.activeCompanies = res.items,
      error: () => {},
    });
  }

  private loadLatestJobs(): void {
    this.loading = true;
    this.jobService.list({ size: 6, order_by: 'newest' }).subscribe({
      next: (res) => {
        this.jobs = res.items;
        this.totalJobs = res.total;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
  
}
