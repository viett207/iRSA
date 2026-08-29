import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzGridModule } from 'ng-zorro-antd/grid';

import { JobService } from '../../core/services/job.service';
import { CompanyDetail, PublicJobListItem } from '../../shared/models/job.model';

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzSpinModule,
    NzIconModule,
    NzTagModule,
    NzEmptyModule,
    NzGridModule,
  ],
  template: `
    <nz-spin [nzSpinning]="loading">
      @if (company) {
        <!-- Company Header -->
        <section class="company-header">
          <div class="container">
            <div class="company-profile">
              <div class="company-avatar">
                {{ company.company_name.charAt(0) }}
              </div>
              <div class="company-info">
                <h1 class="company-name">{{ company.company_name }}</h1>
                <div class="company-meta">
                  <span *ngIf="company.industry" class="meta-item">
                    <span nz-icon nzType="bank" nzTheme="outline"></span>
                    {{ company.industry }}
                  </span>
                  <span *ngIf="company.location" class="meta-item">
                    <span nz-icon nzType="environment" nzTheme="outline"></span>
                    {{ company.location }}
                  </span>
                  <span class="meta-item">
                    <span nz-icon nzType="team" nzTheme="outline"></span>
                    {{ company.total_jobs }} vị trí đang tuyển
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="company-overview-section">
          <div class="container">
            <div class="company-overview-card">
              <div class="overview-main">
                <p class="section-eyebrow">Về doanh nghiệp</p>
                <h2>Giới thiệu về {{ company.company_name }}</h2>
                @if (company.description) {
                  <p class="company-description">{{ company.description }}</p>
                } @else {
                  <p class="company-description company-description-muted">
                    Công ty đang cập nhật phần giới thiệu. Bạn có thể xem các vị trí tuyển dụng bên dưới.
                  </p>
                }
              </div>
              <div class="overview-facts">
                @if (company.industry) {
                  <div class="overview-fact">
                    <span nz-icon nzType="bank" nzTheme="outline"></span>
                    <span><small>Lĩnh vực</small><strong>{{ company.industry }}</strong></span>
                  </div>
                }
                @if (company.location) {
                  <div class="overview-fact">
                    <span nz-icon nzType="environment" nzTheme="outline"></span>
                    <span><small>Địa điểm</small><strong>{{ company.location }}</strong></span>
                  </div>
                }
                <div class="overview-fact">
                  <span nz-icon nzType="file-text" nzTheme="outline"></span>
                  <span><small>Đang tuyển</small><strong>{{ company.total_jobs }} vị trí</strong></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Jobs List -->
        <section class="jobs-section">
          <div class="container">
            <h2 class="section-title">
              <span nz-icon nzType="file-text" nzTheme="outline"></span>
              Vị trí đang tuyển dụng
            </h2>

            @if (company.jobs.length > 0) {
              <div nz-row [nzGutter]="[24, 24]">
                @for (job of company.jobs; track job.id) {
                  <div nz-col [nzXs]="24" [nzMd]="12" [nzLg]="8">
                    <a class="job-card" [routerLink]="['/jobs', job.slug]">
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
                        <span class="job-meta-item" *ngIf="job.location">
                          <span nz-icon nzType="environment" nzTheme="outline"></span>
                          {{ job.location }}
                        </span>
                        <span class="job-meta-item" *ngIf="job.employment_type">
                          <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                          {{ formatEmploymentType(job.employment_type) }}
                        </span>
                      </div>
                      <div class="job-footer">
                        <span class="salary" *ngIf="job.salary_min || job.salary_max">
                          {{ formatSalary(job.salary_min, job.salary_max) }}
                        </span>
                        <span class="deadline" *ngIf="job.application_deadline">
                          <span nz-icon nzType="calendar" nzTheme="outline"></span>
                          Hạn: {{ job.application_deadline | date:'dd/MM/yyyy' }}
                        </span>
                      </div>
                    </a>
                  </div>
                }
              </div>
            } @else {
              <nz-empty nzNotFoundContent="Chưa có vị trí tuyển dụng nào"></nz-empty>
            }
          </div>
        </section>
      }

      @if (!loading && !company) {
        <div class="not-found">
          <nz-empty nzNotFoundContent="Không tìm thấy công ty"></nz-empty>
        </div>
      }
    </nz-spin>
  `,
  styles: [`
    .company-header {
      background: linear-gradient(135deg, var(--color-primary, #1890ff) 0%, #0072E5 100%);
      padding: 48px 0;
      color: #fff;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }
    .company-profile {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .company-avatar {
      width: 80px;
      height: 80px;
      border-radius: 16px;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
    }
    .company-name {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px;
      color: #fff;
    }
    .company-meta {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 15px;
      opacity: 0.9;
    }

    .company-overview-section {
      padding: 32px 0 0;
    }
    .company-overview-card {
      display: grid;
      grid-template-columns: minmax(0, 1.7fr) minmax(270px, 0.8fr);
      gap: 36px;
      padding: 30px 32px;
      border: 1px solid #e8edf5;
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 8px 26px rgba(17, 57, 102, 0.05);
    }
    .section-eyebrow {
      margin: 0 0 6px;
      color: var(--color-primary, #1890ff);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .overview-main h2 {
      margin: 0 0 12px;
      color: #1b2b48;
      font-size: 22px;
      font-weight: 700;
    }
    .company-description {
      max-width: 720px;
      margin: 0;
      color: #52627a;
      font-size: 15px;
      line-height: 1.75;
      white-space: pre-line;
    }
    .company-description-muted { font-style: italic; }
    .overview-facts {
      display: grid;
      align-content: center;
      gap: 16px;
      padding-left: 30px;
      border-left: 1px solid #edf0f5;
    }
    .overview-fact {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--color-primary, #1890ff);
    }
    .overview-fact > span:last-child {
      display: grid;
      gap: 2px;
      color: #52627a;
    }
    .overview-fact small {
      color: #8b97aa;
      font-size: 12px;
    }
    .overview-fact strong {
      color: #24334d;
      font-size: 14px;
      font-weight: 600;
    }

    .jobs-section {
      padding: 40px 0 60px;
    }
    .section-title {
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .job-card {
      display: block;
      background: #fff;
      border: 1px solid #f0f0f0;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s;
      text-decoration: none;
      color: inherit;
      height: 100%;
    }
    .job-card:hover {
      border-color: var(--color-primary, #1890ff);
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      transform: translateY(-2px);
    }
    .job-header {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
    }
    .job-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #e6f7ff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: var(--color-primary, #1890ff);
      flex-shrink: 0;
    }
    .job-title {
      font-size: 16px;
      font-weight: 600;
      color: #262626;
      line-height: 1.4;
    }
    .job-dept {
      font-size: 13px;
      color: #8c8c8c;
      margin-top: 2px;
    }
    .job-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .job-meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #595959;
    }
    .job-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #f5f5f5;
    }
    .salary {
      font-weight: 600;
      color: #fa541c;
      font-size: 14px;
    }
    .deadline {
      font-size: 13px;
      color: #8c8c8c;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .not-found {
      padding: 80px 24px;
      text-align: center;
    }
    @media (max-width: 768px) {
      .company-profile { flex-direction: column; text-align: center; }
      .company-meta { justify-content: center; }
      .company-name { font-size: 22px; }
    }
  `],
})
export class CompanyDetailComponent implements OnInit {
  company: CompanyDetail | null = null;
  loading = true;

  private employmentTypeMap: Record<string, string> = {
    full_time: 'Toàn thời gian',
    part_time: 'Bán thời gian',
    contract: 'Hợp đồng',
    intern: 'Thực tập',
    remote: 'Từ xa',
  };

  constructor(
    private route: ActivatedRoute,
    private jobService: JobService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params['code']) {
        this.loadCompany(params['code']);
      }
    });
  }

  loadCompany(code: string): void {
    this.loading = true;
    this.jobService.getCompanyDetail(code).subscribe({
      next: (data) => {
        this.company = data;
        this.loading = false;
      },
      error: () => {
        this.company = null;
        this.loading = false;
      },
    });
  }

  formatEmploymentType(type: string): string {
    return this.employmentTypeMap[type] || type;
  }

  formatSalary(min?: number | null, max?: number | null): string {
    if (min && max) return `${min} - ${max} triệu`;
    if (min) return `Từ ${min} triệu`;
    if (max) return `Đến ${max} triệu`;
    return '';
  }
}
