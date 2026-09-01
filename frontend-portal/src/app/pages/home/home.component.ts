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
      <div class="hero-decorations" aria-hidden="true">
        <div class="glow-orb glow-orb-1"></div>
        <div class="glow-orb glow-orb-2"></div>
        <div class="glow-orb glow-orb-3"></div>
        <svg class="hero-tech-pattern" width="100%" height="100%" viewBox="0 0 1440 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="hero-net-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.45"/>
              <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.2"/>
            </linearGradient>
            <linearGradient id="hero-net-grad-rev" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.45"/>
              <stop offset="100%" stop-color="#818cf8" stop-opacity="0.2"/>
            </linearGradient>
            <filter id="hero-glow-dot" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <!-- Left Side Tech Network Lines -->
          <path d="M 60 70 L 160 130 L 110 230 L 240 280 L 160 390 L 80 460" stroke="url(#hero-net-grad)" stroke-width="1.2" stroke-dasharray="4 4"/>
          <path d="M 160 130 L 320 90 L 420 170 L 510 110" stroke="url(#hero-net-grad)" stroke-width="1.2"/>
          <path d="M 240 280 L 380 260 L 470 340 L 530 450" stroke="url(#hero-net-grad)" stroke-width="1.2" stroke-dasharray="6 6"/>
          <path d="M 110 230 L 260 210 L 380 260 L 310 390 L 160 390" stroke="url(#hero-net-grad)" stroke-width="1"/>

          <!-- Left Side Light Points / Nodes -->
          <circle cx="60" cy="70" r="3.5" fill="#38bdf8" filter="url(#hero-glow-dot)"/>
          <circle cx="160" cy="130" r="4.5" fill="#60a5fa" filter="url(#hero-glow-dot)"/>
          <circle cx="320" cy="90" r="3" fill="#38bdf8"/>
          <circle cx="420" cy="170" r="4.5" fill="#93c5fd" filter="url(#hero-glow-dot)"/>
          <circle cx="110" cy="230" r="3.5" fill="#38bdf8"/>
          <circle cx="260" cy="210" r="4" fill="#60a5fa" filter="url(#hero-glow-dot)"/>
          <circle cx="240" cy="280" r="4.5" fill="#38bdf8" filter="url(#hero-glow-dot)"/>
          <circle cx="380" cy="260" r="3.5" fill="#818cf8"/>
          <circle cx="470" cy="340" r="4" fill="#38bdf8" filter="url(#hero-glow-dot)"/>
          <circle cx="160" cy="390" r="3.5" fill="#60a5fa"/>
          <circle cx="310" cy="390" r="4" fill="#38bdf8" filter="url(#hero-glow-dot)"/>
          <circle cx="80" cy="460" r="4" fill="#93c5fd"/>
          <circle cx="530" cy="450" r="3.5" fill="#818cf8"/>

          <!-- Right Side Tech Network Lines -->
          <path d="M 1380 70 L 1280 130 L 1330 230 L 1200 280 L 1280 390 L 1360 460" stroke="url(#hero-net-grad-rev)" stroke-width="1.2" stroke-dasharray="4 4"/>
          <path d="M 1280 130 L 1120 90 L 1020 170 L 930 110" stroke="url(#hero-net-grad-rev)" stroke-width="1.2"/>
          <path d="M 1200 280 L 1060 260 L 970 340 L 910 450" stroke="url(#hero-net-grad-rev)" stroke-width="1.2" stroke-dasharray="6 6"/>
          <path d="M 1330 230 L 1180 210 L 1060 260 L 1130 390 L 1280 390" stroke="url(#hero-net-grad-rev)" stroke-width="1"/>

          <!-- Right Side Light Points / Nodes -->
          <circle cx="1380" cy="70" r="3.5" fill="#38bdf8" filter="url(#hero-glow-dot)"/>
          <circle cx="1280" cy="130" r="4.5" fill="#60a5fa" filter="url(#hero-glow-dot)"/>
          <circle cx="1120" cy="90" r="3" fill="#38bdf8"/>
          <circle cx="1020" cy="170" r="4.5" fill="#93c5fd" filter="url(#hero-glow-dot)"/>
          <circle cx="1330" cy="230" r="3.5" fill="#38bdf8"/>
          <circle cx="1180" cy="210" r="4" fill="#60a5fa" filter="url(#hero-glow-dot)"/>
          <circle cx="1200" cy="280" r="4.5" fill="#38bdf8" filter="url(#hero-glow-dot)"/>
          <circle cx="1060" cy="260" r="3.5" fill="#818cf8"/>
          <circle cx="970" cy="340" r="4" fill="#38bdf8" filter="url(#hero-glow-dot)"/>
          <circle cx="1280" cy="390" r="3.5" fill="#60a5fa"/>
          <circle cx="1130" cy="390" r="4" fill="#38bdf8" filter="url(#hero-glow-dot)"/>
          <circle cx="1360" cy="460" r="4" fill="#93c5fd"/>
          <circle cx="910" cy="450" r="3.5" fill="#818cf8"/>

          <!-- Decorative Orbit Rings in Empty Margins -->
          <circle cx="200" cy="80" r="140" stroke="rgba(96, 165, 250, 0.15)" stroke-width="1.5" stroke-dasharray="8 8"/>
          <circle cx="1240" cy="80" r="140" stroke="rgba(96, 165, 250, 0.15)" stroke-width="1.5" stroke-dasharray="8 8"/>
          <circle cx="100" cy="440" r="100" stroke="rgba(56, 189, 248, 0.16)" stroke-width="1.5"/>
          <circle cx="1340" cy="440" r="100" stroke="rgba(56, 189, 248, 0.16)" stroke-width="1.5"/>

          <!-- Subtle Outline Career & Tech Icons along margins -->
          <!-- Top Left: Briefcase Outline -->
          <g transform="translate(48, 140) scale(0.9)" stroke="rgba(96, 165, 250, 0.28)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            <path d="M12 12v.01"/>
          </g>

          <!-- Bottom Left: Code Brackets Outline -->
          <g transform="translate(52, 330) scale(0.9)" stroke="rgba(56, 189, 248, 0.28)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </g>

          <!-- Top Right: Sparkle / Star Outline -->
          <g transform="translate(1360, 160) scale(0.85)" stroke="rgba(96, 165, 250, 0.28)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </g>

          <!-- Bottom Right: Search Outline -->
          <g transform="translate(1350, 340) scale(0.9)" stroke="rgba(56, 189, 248, 0.28)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </g>
        </svg>
      </div>

      <div class="hero-container">
        <div class="hero-content">
          <div class="hero-badge">
            <span nz-icon nzType="thunderbolt" nzTheme="fill" class="hero-badge-icon"></span>
            <span>Nền tảng Tuyển dụng Thông minh iRSA</span>
          </div>

          <h1 class="hero-title">
            Tìm kiếm việc làm <span class="hero-highlight">phù hợp với bạn</span>
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
                <span nz-icon nzType="search" nzTheme="outline" class="input-icon"></span>
              </ng-template>
            </div>
            <button nz-button nzType="primary" nzSize="large" class="search-btn" (click)="onSearch()">
              <span>Tìm kiếm</span>
            </button>
          </div>

          <!-- Category Quick Filters -->
          <div class="category-chips">
            <span class="category-chips-label">Ngành nghề phổ biến:</span>
            <div class="category-chips-list">
              @for (category of categories; track category.name) {
                <button
                  type="button"
                  class="category-chip"
                  routerLink="/jobs"
                  [queryParams]="{category: category.name}"
                >
                  @if (category.icon) {
                    <span nz-icon [nzType]="category.icon" nzTheme="outline"></span>
                  }
                  <span>{{ category.label }}</span>
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Latest Jobs -->
    <section class="jobs-section">
      <div class="container">
        <div class="section-header">
          <div>
            <h2 class="section-title">Việc làm mới nhất</h2>
            <p class="section-subtitle">Cơ hội nghề nghiệp hấp dẫn được cập nhật liên tục</p>
          </div>
          @if (totalJobs > 0) {
            <span class="job-count-pill">{{ totalJobs }} vị trí đang tuyển</span>
          }
        </div>

        <nz-spin [nzSpinning]="loading">
          @if (jobs.length > 0) {
            <div nz-row [nzGutter]="[20, 20]">
              @for (job of jobs; track job.id) {
                <div nz-col [nzXs]="24" [nzSm]="12" [nzLg]="8">
                  <div class="job-card" [routerLink]="['/jobs', job.slug]">
                    <div class="job-card-top">
                      <div class="job-icon">
                        <span nz-icon nzType="file-text" nzTheme="outline"></span>
                      </div>
                      <div class="job-main-info">
                        <h3 class="job-title" [title]="job.title_vi">{{ job.title_vi }}</h3>
                        @if (job.department) {
                          <div class="job-dept">{{ job.department }}</div>
                        }
                      </div>
                    </div>

                    <div class="job-meta">
                      @if (job.location) {
                        <span class="meta-item">
                          <span nz-icon nzType="environment" nzTheme="outline"></span>
                          <span>{{ job.location }}</span>
                        </span>
                      }
                      @if (job.employment_type) {
                        <span class="meta-item">
                          <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                          <span>{{ formatEmploymentType(job.employment_type) }}</span>
                        </span>
                      }
                    </div>

                    <div class="job-card-footer">
                      <div class="salary">
                        {{ formatSalary(job.salary_min, job.salary_max) || 'Thỏa thuận' }}
                      </div>
                      @if (job.published_at) {
                        <span class="posted-date">
                          {{ job.published_at | date:'dd/MM/yyyy' }}
                        </span>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else if (!loading) {
            <div class="empty-state-card">
              <nz-empty nzNotFoundContent="Chưa có việc làm nào được đăng tuyển"></nz-empty>
            </div>
          }
        </nz-spin>

        @if (totalJobs > 6) {
          <div class="section-cta">
            <button nz-button nzType="primary" nzSize="large" routerLink="/jobs" class="view-all-btn">
              <span>Xem tất cả {{ totalJobs }} việc làm</span>
              <span nz-icon nzType="arrow-right" nzTheme="outline"></span>
            </button>
          </div>
        }
      </div>
    </section>

    <!-- Active Companies -->
    @if (activeCompanies.length > 0) {
      <section class="companies-section">
        <div class="container">
          <div class="section-header">
            <div>
              <h2 class="section-title">Doanh nghiệp đang tuyển dụng</h2>
              <p class="section-subtitle">Kết nối trực tiếp với các nhà tuyển dụng uy tín hàng đầu</p>
            </div>
          </div>

          <div class="companies-grid">
            @for (company of activeCompanies; track company.company_code) {
              <a class="company-card" [routerLink]="['/companies', company.company_code]">
                <div class="company-card-top">
                  <div class="company-avatar">
                    <span>{{ company.company_name.charAt(0) }}</span>
                  </div>
                  <div class="company-info">
                    <h3 class="company-name" [title]="company.company_name">{{ company.company_name }}</h3>
                    <div class="company-meta">
                      @if (company.industry) {
                        <span class="meta-item" [title]="company.industry">
                          <span nz-icon nzType="appstore" nzTheme="outline"></span>
                          <span>{{ company.industry }}</span>
                        </span>
                      }
                      @if (company.location) {
                        <span class="meta-item" [title]="company.location">
                          <span nz-icon nzType="environment" nzTheme="outline"></span>
                          <span>{{ company.location }}</span>
                        </span>
                      }
                    </div>
                  </div>
                </div>
                <div class="company-card-bottom">
                  <span class="company-badge">
                    {{ company.job_count }} việc làm
                  </span>
                  <span nz-icon nzType="arrow-right" nzTheme="outline" class="company-card-arrow"></span>
                </div>
              </a>
            }
          </div>
        </div>
      </section>
    }
  `,
  styles: [`
    /* ==========================================================================
       Hero Section
       ========================================================================== */
    .hero-section {
      background: radial-gradient(circle at 12% 15%, rgba(56, 189, 248, 0.14) 0%, transparent 45%),
                  radial-gradient(circle at 88% 85%, rgba(96, 165, 250, 0.12) 0%, transparent 50%),
                  radial-gradient(circle at 50% 50%, rgba(36, 50, 75, 0.6) 0%, transparent 70%),
                  linear-gradient(180deg, #222f46 0%, #293852 50%, #202c42 100%);
      position: relative;
      overflow: hidden;
      padding: clamp(40px, 4.5vw, 56px) 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.10);
    }

    .hero-decorations {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }

    .glow-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(60px);
      pointer-events: none;
    }

    .glow-orb-1 {
      width: 380px;
      height: 380px;
      top: -80px;
      right: 5%;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%);
    }

    .glow-orb-2 {
      width: 360px;
      height: 360px;
      bottom: -80px;
      left: 5%;
      background: radial-gradient(circle, rgba(96, 165, 250, 0.12) 0%, transparent 70%);
    }

    .glow-orb-3 {
      width: 300px;
      height: 300px;
      top: 30%;
      left: 45%;
      background: radial-gradient(circle, rgba(129, 140, 248, 0.10) 0%, transparent 70%);
    }

    .hero-tech-pattern {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0.85;
      pointer-events: none;
      z-index: 0;
    }

    .hero-container {
      max-width: var(--container-max);
      margin: 0 auto;
      padding: 0 var(--container-padding);
      position: relative;
      z-index: 1;
    }

    .hero-content {
      max-width: 1080px;
      margin: 0 auto;
      text-align: center;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 4px 14px;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.28);
      border-radius: var(--radius-full);
      color: #38bdf8;
      font-size: 13.5px;
      font-weight: 600;
      letter-spacing: 0.01em;
      margin-bottom: 12px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      cursor: default;
      user-select: none;

      .hero-badge-icon {
        color: #38bdf8;
        font-size: 14px;
      }
    }

    .hero-title {
      font-family: var(--font-heading);
      font-size: clamp(32px, 4.5vw, 48px);
      font-weight: 800;
      color: #ffffff;
      line-height: 1.25;
      margin-bottom: 22px;
      letter-spacing: -0.025em;
    }

    .hero-highlight {
      background: linear-gradient(135deg, #38bdf8 0%, #60a5fa 50%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 800;
      display: inline-block;
    }

    /* Search Box */
    .search-box {
      background: #ffffff;
      border-radius: 16px;
      padding: 6px 6px 6px 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1);
      display: flex;
      gap: 10px;
      max-width: 680px;
      margin: 0 auto 20px;
      align-items: center;
      transition: all var(--transition-normal);

      &:focus-within {
        box-shadow: 0 20px 44px -8px rgba(0, 0, 0, 0.45), 0 0 0 3px rgba(59, 130, 246, 0.3);
        border-color: var(--color-primary-light);
      }

      @media (max-width: 640px) {
        flex-direction: column;
        padding: 10px;
        border-radius: 16px;
        gap: 10px;
      }
    }

    .search-input {
      flex: 1;
      width: 100%;
      min-width: 0;

      ::ng-deep .ant-input-affix-wrapper {
        border: none !important;
        background: transparent !important;
        box-shadow: none !important;
        padding: 0 8px !important;
        font-size: 15.5px !important;
        height: 48px !important;
        display: flex !important;
        align-items: center !important;
      }

      ::ng-deep .ant-input {
        font-size: 15.5px !important;
        font-family: var(--font-body) !important;
        color: #0f172a !important;
        background: transparent !important;

        &::placeholder {
          color: #64748b !important;
          font-size: 15px !important;
        }
      }

      .input-icon {
        color: #64748b;
        font-size: 19px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color var(--transition-fast);
      }

      ::ng-deep .ant-input-affix-wrapper-focused .input-icon {
        color: var(--color-primary);
      }
    }

    .search-btn {
      flex-shrink: 0;
      padding: 0 32px !important;
      height: 48px !important;
      border-radius: 12px !important;
      font-weight: 600 !important;
      font-size: 15px !important;
      background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%) !important;
      border: none !important;
      color: #ffffff !important;
      box-shadow: var(--shadow-md) !important;
      transition: all var(--transition-fast) !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;

      &:hover {
        background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%) !important;
        box-shadow: var(--shadow-lg) !important;
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
        box-shadow: var(--shadow-sm) !important;
      }

      @media (max-width: 640px) {
        width: 100% !important;
        height: 44px !important;
      }
    }

    /* Category Chips */
    .category-chips {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .category-chips-label {
      font-size: 13.5px;
      color: #cbd5e1;
      font-weight: 500;
      white-space: nowrap;
      text-align: center;
    }

    .category-chips-list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .category-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.08);
      border: 1.5px solid rgba(255, 255, 255, 0.16);
      border-radius: var(--radius-full);
      padding: 6px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #f8fafc;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: all var(--transition-fast);
      text-decoration: none;
      white-space: nowrap;

      .anticon {
        font-size: 14px;
        color: #38bdf8;
        transition: all var(--transition-fast);
      }

      &:hover {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: #FFFFFF;
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);

        .anticon {
          color: #FFFFFF;
          transform: scale(1.08);
        }
      }

      &:active {
        transform: translateY(0);
        box-shadow: var(--shadow-xs);
      }
    }

    @media (max-width: 900px) {
      .hero-tech-pattern {
        opacity: 0.55;
      }
    }

    @media (max-width: 600px) {
      .hero-tech-pattern {
        opacity: 0.35;
      }
    }

    /* ==========================================================================
       Shared Section Styles
       ========================================================================== */
    .container {
      max-width: var(--container-max);
      margin: 0 auto;
      padding: 0 var(--container-padding);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: var(--space-6);
      gap: var(--space-4);
      flex-wrap: wrap;
    }

    .section-title {
      font-family: var(--font-heading);
      font-size: clamp(20px, 2.5vw, 24px);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 4px;
      letter-spacing: -0.015em;
    }

    .section-subtitle {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      margin: 0;
    }

    .job-count-pill {
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--color-primary);
      background: var(--color-primary-surface);
      border: 1px solid var(--color-primary-200);
      padding: 4px 12px;
      border-radius: var(--radius-full);
      white-space: nowrap;
    }

    .section-cta {
      text-align: center;
      margin-top: var(--space-10);

      .view-all-btn {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: 0 28px !important;
        height: 44px !important;
        font-weight: 600;
      }
    }

    /* ==========================================================================
       Companies Section
       ========================================================================== */
    .companies-section {
      padding: var(--space-16) 0 var(--space-20);
      background: var(--color-bg-secondary);
      border-top: 1px solid var(--color-border);

      @media (max-width: 768px) {
        padding: var(--space-10) 0 var(--space-16);
      }
    }

    .companies-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 20px;

      @media (max-width: 1024px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      @media (max-width: 640px) {
        grid-template-columns: 1fr;
      }
    }

    .company-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 18px;
      padding: 20px 20px 16px;
      cursor: pointer;
      text-decoration: none;
      color: inherit;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.25s ease;
      position: relative;
      overflow: hidden;

      /* 1. Cam / Warm Orange variant */
      &:nth-child(4n + 1) {
        background: linear-gradient(145deg, #FFFDFB 0%, #FFF4EB 100%);
        border: 1px solid #FED7AA;

        .company-avatar {
          background: #FFFFFF;
          color: #EA580C;
          border: 1px solid rgba(254, 215, 170, 0.7);
          box-shadow: 0 4px 12px rgba(234, 88, 12, 0.08);
        }

        .company-badge {
          background: #FFEDD5;
          color: #C2410C;
          border: 1px solid #FDBA74;
        }

        .company-card-arrow {
          color: #EA580C;
        }

        &:hover {
          border-color: #FB923C;
          box-shadow: 0 12px 28px -4px rgba(234, 88, 12, 0.14), 0 4px 12px rgba(0, 0, 0, 0.04);
        }
      }

      /* 2. Xanh dương / Soft Blue variant */
      &:nth-child(4n + 2) {
        background: linear-gradient(145deg, #F8FAFF 0%, #EFF6FF 100%);
        border: 1px solid #BFDBFE;

        .company-avatar {
          background: #FFFFFF;
          color: #2563EB;
          border: 1px solid rgba(191, 219, 254, 0.7);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08);
        }

        .company-badge {
          background: #DBEAFE;
          color: #1D4ED8;
          border: 1px solid #93C5FD;
        }

        .company-card-arrow {
          color: #2563EB;
        }

        &:hover {
          border-color: #60A5FA;
          box-shadow: 0 12px 28px -4px rgba(37, 99, 235, 0.14), 0 4px 12px rgba(0, 0, 0, 0.04);
        }
      }

      /* 3. Đỏ nhẹ / Rose variant */
      &:nth-child(4n + 3) {
        background: linear-gradient(145deg, #FFFBFB 0%, #FEF2F2 100%);
        border: 1px solid #FECACA;

        .company-avatar {
          background: #FFFFFF;
          color: #E11D48;
          border: 1px solid rgba(254, 202, 202, 0.7);
          box-shadow: 0 4px 12px rgba(225, 29, 72, 0.08);
        }

        .company-badge {
          background: #FEE2E2;
          color: #BE123C;
          border: 1px solid #FCA5A5;
        }

        .company-card-arrow {
          color: #E11D48;
        }

        &:hover {
          border-color: #F87171;
          box-shadow: 0 12px 28px -4px rgba(225, 29, 72, 0.14), 0 4px 12px rgba(0, 0, 0, 0.04);
        }
      }

      /* 4. Xanh lá / Teal / Emerald variant */
      &:nth-child(4n) {
        background: linear-gradient(145deg, #F7FCF9 0%, #ECFDF5 100%);
        border: 1px solid #A7F3D0;

        .company-avatar {
          background: #FFFFFF;
          color: #059669;
          border: 1px solid rgba(167, 243, 208, 0.7);
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.08);
        }

        .company-badge {
          background: #D1FAE5;
          color: #047857;
          border: 1px solid #6EE7B7;
        }

        .company-card-arrow {
          color: #059669;
        }

        &:hover {
          border-color: #34D399;
          box-shadow: 0 12px 28px -4px rgba(5, 150, 105, 0.14), 0 4px 12px rgba(0, 0, 0, 0.04);
        }
      }

      &:hover {
        transform: translateY(-4px);

        .company-name {
          color: var(--color-primary);
        }

        .company-card-arrow {
          transform: translateX(4px);
        }
      }
    }

    .company-card-top {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .company-avatar {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-heading);
      font-size: 20px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .company-info {
      flex: 1;
      min-width: 0;
    }

    .company-name {
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: 15.5px;
      color: #0f172a;
      line-height: 1.35;
      margin: 0 0 6px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color var(--transition-fast);
    }

    .company-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12.5px;
      color: #475569;

      .meta-item {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        [nz-icon] {
          font-size: 12px;
          color: #64748b;
          flex-shrink: 0;
        }

        span:last-child {
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }

    .company-card-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid rgba(15, 23, 42, 0.06);
    }

    .company-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      letter-spacing: 0.01em;
    }

    .company-card-arrow {
      font-size: 14px;
      transition: transform 0.25s ease;
    }

    /* ==========================================================================
       Latest Jobs Section
       ========================================================================== */
    .jobs-section {
      padding: var(--space-16) 0 var(--space-20);
      background: var(--color-bg-primary);

      @media (max-width: 768px) {
        padding: var(--space-10) 0 var(--space-16);
      }
    }

    .job-card {
      background: var(--color-bg-secondary);
      border-radius: var(--radius-xl);
      padding: 20px;
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-card);
      transition: transform var(--transition-normal), box-shadow var(--transition-normal), border-color var(--transition-normal);
      cursor: pointer;
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;

      &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-card-hover), 0 0 0 1px rgba(15, 82, 186, 0.06);
        border-color: var(--color-primary-200);

        .job-title {
          color: var(--color-primary);
        }

        .job-icon {
          background: var(--color-primary-100);
          border-color: var(--color-primary-200);
        }
      }

      &:active {
        transform: translateY(-1px);
        box-shadow: var(--shadow-card);
      }
    }

    .job-card-top {
      display: flex;
      gap: 14px;
      margin-bottom: 14px;
    }

    .job-icon {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-md);
      background: var(--color-primary-surface);
      border: 1px solid var(--color-primary-100);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary);
      font-size: 18px;
      flex-shrink: 0;
      transition: background var(--transition-normal), border-color var(--transition-normal);
    }

    .job-main-info {
      flex: 1;
      min-width: 0;
    }

    .job-title {
      font-family: var(--font-heading);
      font-size: var(--text-base);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 3px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.35;
      transition: color var(--transition-fast);
    }

    .job-dept {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      font-weight: 400;
    }

    .job-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      flex: 1;

      .meta-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: var(--color-bg-tertiary);
        padding: 3px 8px;
        border-radius: var(--radius-sm);
      }
    }

    .job-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid var(--color-border-light);
      margin-top: auto;
    }

    .salary {
      font-family: var(--font-heading);
      font-weight: 600;
      color: var(--color-success);
      font-size: var(--text-sm);
      display: inline-flex;
      align-items: center;
    }

    .posted-date {
      font-size: var(--text-xs);
      color: var(--color-text-tertiary);
    }

    .empty-state-card {
      background: var(--color-bg-secondary);
      border-radius: var(--radius-xl);
      border: 1px solid var(--color-border);
      padding: var(--space-8);
    }

    /* Dark Mode Overrides */
    :host-context([data-theme='dark']),
    :host-context(.dark) {
      .hero-section {
        background: radial-gradient(circle at 12% 15%, rgba(56, 189, 248, 0.12) 0%, transparent 45%),
                    radial-gradient(circle at 88% 85%, rgba(96, 165, 250, 0.10) 0%, transparent 50%),
                    radial-gradient(circle at 50% 50%, rgba(36, 50, 75, 0.6) 0%, transparent 70%),
                    linear-gradient(180deg, #222f46 0%, #293852 50%, #202c42 100%);
        border-bottom-color: rgba(255, 255, 255, 0.10);
      }

      .hero-title {
        color: #f8fafc;
      }

      .hero-highlight {
        background: linear-gradient(135deg, #38bdf8 0%, #60a5fa 50%, #818cf8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .search-box {
        background: #1e293b;
        border-color: rgba(255, 255, 255, 0.12);
        box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.5);

        &:focus-within {
          border-color: var(--color-primary);
          box-shadow: 0 20px 44px -8px rgba(0, 0, 0, 0.6), 0 0 0 3px rgba(59, 130, 246, 0.25);
        }
      }

      .search-input {
        ::ng-deep .ant-input {
          color: #f8fafc !important;

          &::placeholder {
            color: #94a3b8 !important;
          }
        }

        .input-icon {
          color: #94a3b8;
        }

        ::ng-deep .ant-input-affix-wrapper-focused .input-icon {
          color: var(--color-primary);
        }
      }

      .category-chips-label {
        color: #94a3b8;
      }

      .category-chip {
        background: #1e293b;
        border-color: rgba(59, 130, 246, 0.35);
        color: #60a5fa;

        .anticon {
          color: #60a5fa;
        }

        &:hover {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: #ffffff;

          .anticon {
            color: #ffffff;
          }
        }
      }

      .companies-section {
        background: var(--color-bg-secondary);
        border-bottom-color: var(--color-border);
      }

      .company-card:nth-child(4n + 1) {
        background: linear-gradient(145deg, #1c1917 0%, #291a13 100%);
        border-color: rgba(251, 146, 60, 0.3);

        .company-avatar {
          background: #291a13;
          color: #fb923c;
          border-color: rgba(251, 146, 60, 0.4);
        }

        .company-badge {
          background: rgba(234, 88, 12, 0.2);
          color: #fdba74;
          border-color: rgba(251, 146, 60, 0.4);
        }

        .company-card-arrow {
          color: #fb923c;
        }

        &:hover {
          border-color: #fb923c;
          box-shadow: 0 12px 28px -4px rgba(234, 88, 12, 0.25);
        }
      }

      .company-card:nth-child(4n + 2) {
        background: linear-gradient(145deg, #0f172a 0%, #172554 100%);
        border-color: rgba(96, 165, 250, 0.3);

        .company-avatar {
          background: #172554;
          color: #60a5fa;
          border-color: rgba(96, 165, 250, 0.4);
        }

        .company-badge {
          background: rgba(37, 99, 235, 0.2);
          color: #93c5fd;
          border-color: rgba(96, 165, 250, 0.4);
        }

        .company-card-arrow {
          color: #60a5fa;
        }

        &:hover {
          border-color: #60a5fa;
          box-shadow: 0 12px 28px -4px rgba(37, 99, 235, 0.25);
        }
      }

      .company-card:nth-child(4n + 3) {
        background: linear-gradient(145deg, #1c1917 0%, #2d1519 100%);
        border-color: rgba(248, 113, 113, 0.3);

        .company-avatar {
          background: #2d1519;
          color: #f87171;
          border-color: rgba(248, 113, 113, 0.4);
        }

        .company-badge {
          background: rgba(225, 29, 72, 0.2);
          color: #fca5a5;
          border-color: rgba(248, 113, 113, 0.4);
        }

        .company-card-arrow {
          color: #f87171;
        }

        &:hover {
          border-color: #f87171;
          box-shadow: 0 12px 28px -4px rgba(225, 29, 72, 0.25);
        }
      }

      .company-card:nth-child(4n) {
        background: linear-gradient(145deg, #0f172a 0%, #062e24 100%);
        border-color: rgba(52, 211, 153, 0.3);

        .company-avatar {
          background: #062e24;
          color: #34d399;
          border-color: rgba(52, 211, 153, 0.4);
        }

        .company-badge {
          background: rgba(5, 150, 105, 0.2);
          color: #6ee7b7;
          border-color: rgba(52, 211, 153, 0.4);
        }

        .company-card-arrow {
          color: #34d399;
        }

        &:hover {
          border-color: #34d399;
          box-shadow: 0 12px 28px -4px rgba(5, 150, 105, 0.25);
        }
      }

      .company-name {
        color: #f8fafc;
      }

      .company-meta {
        color: #94a3b8;
      }

      .company-card-bottom {
        border-top-color: rgba(255, 255, 255, 0.08);
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
    { name: 'Tài chính - Ngân hàng', label: 'Tài chính - Ngân hàng', icon: '' },
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

  formatSalary(min?: number | null, max?: number | null): string {
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
