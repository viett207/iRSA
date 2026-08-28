import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { JobService } from '../../core/services/job.service';
import { CompanyDetail, PublicJobListItem } from '../../shared/models/job.model';

export function normalizeExternalUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function getValidWorkplaceImages(values: string[] | null | undefined): string[] {
  return Array.from(
    new Set((values ?? []).map((value) => normalizeExternalUrl(value)).filter((value): value is string => !!value)),
  ).slice(0, 8);
}

export function stripCompanyHtml(value: string | null | undefined, maxLength = 180): string {
  const text = (value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgOptimizedImage,
    NzButtonModule,
    NzSpinModule,
    NzIconModule,
    NzTagModule,
    NzEmptyModule,
  ],
  template: `
    <div class="company-page">
      @if (loading) {
        <div class="loading-state">
          <nz-spin nzSize="large"></nz-spin>
          <span>Đang tải hồ sơ công ty...</span>
        </div>
      } @else if (company) {
        <header class="company-hero">
          <div class="cover-banner">
            @if (getCoverUrl(); as coverUrl) {
              <img [ngSrc]="coverUrl" [alt]="'Ảnh bìa ' + company.company_name" fill priority />
            }
            <div class="cover-overlay"></div>
            <div class="container cover-content">
              <a routerLink="/jobs" class="back-link">
                <span nz-icon nzType="arrow-left" nzTheme="outline"></span>
                <span>Quay lại danh sách việc làm</span>
              </a>
            </div>
          </div>

          <div class="container">
            <div class="company-profile-card">
              <div class="company-logo">
                @if (getLogoUrl(); as logoUrl) {
                  <img [ngSrc]="logoUrl" [alt]="'Logo ' + company.company_name" width="88" height="88" priority />
                } @else {
                  <span>{{ getCompanyInitials() }}</span>
                }
              </div>

              <div class="company-heading">
                <div class="heading-row">
                  <div>
                    @if (company.industry) {
                      <span class="industry-label">{{ company.industry }}</span>
                    }
                    <h1 class="company-title">{{ company.company_name }}</h1>
                  </div>
                  @if (getWebsiteUrl(); as websiteUrl) {
                    <a
                      nz-button
                      nzType="primary"
                      [href]="websiteUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="website-btn"
                    >
                      <span nz-icon nzType="global" nzTheme="outline"></span>
                      <span>Truy cập website</span>
                      <span nz-icon nzType="export" nzTheme="outline"></span>
                    </a>
                  }
                </div>

                <div class="company-meta">
                  <div class="meta-item">
                    <span class="meta-icon"><span nz-icon nzType="team" nzTheme="outline"></span></span>
                    <div>
                      <small>Quy mô nhân sự</small>
                      <strong>{{ company.employee_size || 'Đang cập nhật' }}</strong>
                    </div>
                  </div>
                  <div class="meta-item headquarters">
                    <span class="meta-icon"><span nz-icon nzType="environment" nzTheme="outline"></span></span>
                    <div>
                      <small>Trụ sở chính</small>
                      <strong>{{ company.headquarters || company.location || 'Đang cập nhật' }}</strong>
                    </div>
                  </div>
                  <div class="meta-item">
                    <span class="meta-icon"><span nz-icon nzType="solution" nzTheme="outline"></span></span>
                    <div>
                      <small>Cơ hội hiện có</small>
                      <strong class="jobs-highlight">{{ company.total_jobs }} vị trí đang tuyển</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main>
          <!-- About & Culture Section -->
          <section class="about-section">
            <div class="container about-grid">
              <article class="story-card">
                <span class="section-kicker">Về chúng tôi</span>
                <h2 class="section-card-title">Giới thiệu công ty</h2>
                @if (company.introduction_vi) {
                  <div class="long-copy">{{ company.introduction_vi }}</div>
                } @else {
                  <p class="empty-copy">{{ company.company_name }} đang cập nhật thông tin giới thiệu doanh nghiệp.</p>
                }
              </article>

              <article class="culture-card">
                <div class="culture-icon"><span nz-icon nzType="heart" nzTheme="fill"></span></div>
                <span class="section-kicker">Môi trường làm việc</span>
                <h2 class="section-card-title">Văn hóa doanh nghiệp</h2>
                @if (company.culture_vi) {
                  <div class="long-copy">{{ company.culture_vi }}</div>
                } @else {
                  <p class="empty-copy">Thông tin về giá trị cốt lõi và môi trường làm việc đang được cập nhật.</p>
                }
              </article>
            </div>
          </section>

          <!-- Workplace Gallery Section -->
          <section class="gallery-section">
            <div class="container">
              <div class="section-heading">
                <div>
                  <span class="section-kicker">Không gian làm việc</span>
                  <h2 class="section-title">Môi trường tại {{ company.company_name }}</h2>
                </div>
                @if (workplaceImages.length > 0) {
                  <span class="image-count">{{ workplaceImages.length }} hình ảnh</span>
                }
              </div>

              @if (workplaceImages.length > 0) {
                <div class="gallery-grid" [class.single-image]="workplaceImages.length === 1">
                  @for (image of workplaceImages; track image; let index = $index) {
                    <figure [class.featured]="index === 0 && workplaceImages.length > 2">
                      <img [src]="image" [alt]="'Môi trường làm việc tại ' + company.company_name + ' - ảnh ' + (index + 1)" loading="lazy" />
                    </figure>
                  }
                </div>
              } @else {
                <div class="gallery-empty">
                  <span nz-icon nzType="picture" nzTheme="outline"></span>
                  <div>
                    <strong>Hình ảnh môi trường làm việc đang được cập nhật</strong>
                    <p>Quay lại sau để khám phá thêm về không gian và con người tại công ty.</p>
                  </div>
                </div>
              }
            </div>
          </section>

          <!-- Job Listings Section -->
          <section class="jobs-section">
            <div class="container">
              <div class="section-heading jobs-heading">
                <div>
                  <span class="section-kicker">Gia nhập đội ngũ</span>
                  <h2 class="section-title">Vị trí đang tuyển dụng</h2>
                  <p class="section-sub">{{ company.total_jobs }} cơ hội nghề nghiệp tại {{ company.company_name }}</p>
                </div>
                <a routerLink="/jobs" [queryParams]="{ company_code: company.company_code }" nz-button class="view-in-jobs-btn">
                  <span>Xem trong trang tìm việc</span>
                  <span nz-icon nzType="arrow-right" nzTheme="outline"></span>
                </a>
              </div>

              @if (company.jobs.length > 0) {
                <div class="jobs-grid">
                  @for (job of company.jobs; track job.id) {
                    <article class="job-card">
                      <div class="job-card-header">
                        <div class="job-icon">
                          <span nz-icon nzType="file-text" nzTheme="outline"></span>
                        </div>
                        <div class="job-title-block">
                          <a [routerLink]="['/jobs', job.slug]" class="job-title-link">{{ job.title_vi }}</a>
                          @if (job.department) {
                            <span class="job-dept">{{ job.department }}</span>
                          }
                        </div>
                        @if (isNewJob(job)) {
                          <nz-tag class="new-tag">Mới</nz-tag>
                        }
                      </div>

                      <div class="job-facts">
                        <span class="fact-item">
                          <span nz-icon nzType="environment" nzTheme="outline"></span>
                          {{ job.location || 'Linh hoạt' }}
                        </span>
                        <span class="fact-item">
                          <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                          {{ formatEmploymentType(job.employment_type) }}
                        </span>
                        <span class="salary-fact">
                          <span nz-icon nzType="dollar" nzTheme="outline"></span>
                          {{ formatSalary(job.salary_min, job.salary_max) }}
                        </span>
                      </div>

                      @if (getJobDescription(job)) {
                        <p class="job-description">{{ getJobDescription(job) }}</p>
                      }

                      @if (job.must_have_skills.length > 0) {
                        <div class="skills-list">
                          @for (skill of job.must_have_skills.slice(0, 4); track skill) {
                            <span class="skill-pill">{{ skill }}</span>
                          }
                          @if (job.must_have_skills.length > 4) {
                            <span class="more-skills">+{{ job.must_have_skills.length - 4 }}</span>
                          }
                        </div>
                      }

                      <footer class="job-card-footer">
                        <span class="deadline" [class.near]="isDeadlineNear(job)">
                          <span nz-icon nzType="calendar" nzTheme="outline"></span>
                          {{ job.application_deadline ? 'Hạn ' + formatDate(job.application_deadline) : 'Tuyển liên tục' }}
                        </span>
                        <a [routerLink]="['/jobs', job.slug]" nz-button nzType="primary" class="apply-cta-btn">
                          <span>Xem chi tiết</span>
                          <span nz-icon nzType="arrow-right" nzTheme="outline"></span>
                        </a>
                      </footer>
                    </article>
                  }
                </div>
              } @else {
                <div class="jobs-empty">
                  <nz-empty nzNotFoundContent="Công ty chưa có vị trí tuyển dụng đang mở."></nz-empty>
                  <a routerLink="/jobs" nz-button nzType="primary">Khám phá công việc khác</a>
                </div>
              }
            </div>
          </section>
        </main>
      } @else {
        <div class="not-found">
          <nz-empty nzNotFoundContent="Không tìm thấy công ty hoặc hồ sơ công ty chưa được công khai."></nz-empty>
          <a routerLink="/jobs" nz-button nzType="primary">Quay lại trang tìm việc</a>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .company-page {
        min-height: 100vh;
        color: var(--color-text-primary);
        background: var(--color-bg-primary);
      }

      .container {
        max-width: var(--container-max);
        width: 100%;
        margin: 0 auto;
        padding-inline: var(--container-padding);
      }

      .loading-state,
      .not-found {
        min-height: 65vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--space-4);
        color: var(--color-text-secondary);
      }

      /* Company Hero */
      .company-hero {
        padding-bottom: var(--space-8);
        background: var(--color-bg-primary);
      }

      .cover-banner {
        position: relative;
        height: 280px;
        overflow: hidden;
        background: linear-gradient(135deg, #0A387E 0%, #0F52BA 60%, #1E40AF 100%);

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }

      .cover-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(10, 56, 126, 0.2) 0%, rgba(10, 56, 126, 0.65) 100%);
      }

      .cover-content {
        position: absolute;
        z-index: 1;
        inset: var(--space-5) 0 auto;
      }

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: var(--radius-full);
        color: #FFFFFF;
        background: rgba(10, 56, 126, 0.4);
        backdrop-filter: blur(8px);
        font-size: var(--text-xs);
        font-weight: 500;
        transition: all var(--transition-fast);

        &:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #FFFFFF;
        }
      }

      /* Profile Card */
      .company-profile-card {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: flex-start;
        gap: var(--space-6);
        margin-top: -64px;
        padding: 24px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        background: var(--color-bg-secondary);
        box-shadow: var(--shadow-md);
      }

      .company-logo {
        flex: none;
        width: 104px;
        height: 104px;
        display: grid;
        place-items: center;
        overflow: hidden;
        border: 1px solid var(--color-primary-100);
        border-radius: var(--radius-lg);
        color: var(--color-primary);
        background: var(--color-primary-surface);
        box-shadow: var(--shadow-sm);
        font-family: var(--font-heading);
        font-size: var(--text-3xl);
        font-weight: 700;

        img {
          width: 100%;
          height: 100%;
          padding: 8px;
          object-fit: contain;
        }
      }

      .company-heading {
        flex: 1;
        min-width: 0;
      }

      .heading-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
        margin-bottom: var(--space-4);
      }

      .industry-label,
      .section-kicker {
        display: block;
        margin-bottom: 4px;
        color: var(--color-primary);
        font-size: var(--text-xs);
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .company-title {
        margin: 0;
        font-family: var(--font-heading);
        font-size: clamp(22px, 2.5vw, 28px);
        font-weight: 700;
        line-height: 1.25;
        color: var(--color-text-primary);
      }

      .website-btn {
        height: 40px !important;
        border-radius: var(--radius-md) !important;
        font-weight: 600 !important;
        font-size: var(--text-sm) !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        flex-shrink: 0;
      }

      .company-meta {
        display: grid;
        grid-template-columns: 1fr 1.4fr 1.1fr;
        gap: var(--space-3);
      }

      .meta-item {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: 10px 14px;
        border-radius: var(--radius-md);
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);

        .meta-icon {
          flex: none;
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          color: var(--color-primary);
          background: var(--color-primary-surface);
          font-size: 16px;
        }

        div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        small {
          color: var(--color-text-tertiary);
          font-size: 11px;
        }

        strong {
          overflow: hidden;
          font-size: var(--text-sm);
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--color-text-primary);
        }

        .jobs-highlight {
          color: var(--color-primary);
        }
      }

      /* About & Culture Section */
      .about-section {
        padding: var(--space-8) 0;
      }

      .about-grid {
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        gap: var(--space-5);
      }

      .story-card,
      .culture-card {
        padding: 24px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        background: var(--color-bg-secondary);
        box-shadow: var(--shadow-card);
      }

      .section-card-title,
      .section-heading h2 {
        margin: 0 0 var(--space-3);
        font-family: var(--font-heading);
        font-size: var(--text-xl);
        font-weight: 700;
        color: var(--color-text-primary);
      }

      .culture-card {
        background: linear-gradient(145deg, var(--color-primary-surface), var(--color-bg-secondary));
        position: relative;
        overflow: hidden;
      }

      .culture-icon {
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        margin-bottom: var(--space-3);
        border-radius: var(--radius-md);
        color: #FFFFFF;
        background: var(--color-primary);
        font-size: 20px;
      }

      .long-copy {
        color: var(--color-text-secondary);
        line-height: var(--leading-relaxed);
        font-size: 14.5px;
        white-space: pre-line;
      }

      .empty-copy {
        margin: 0;
        color: var(--color-text-tertiary);
        font-style: italic;
        line-height: var(--leading-relaxed);
        font-size: var(--text-sm);
      }

      /* Gallery Section */
      .gallery-section {
        padding: var(--space-10) 0;
        background: var(--color-bg-tertiary);
      }

      .section-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: var(--space-4);
        margin-bottom: var(--space-5);

        .section-title {
          font-family: var(--font-heading);
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }
      }

      .image-count {
        padding: 4px 12px;
        border-radius: var(--radius-full);
        color: var(--color-primary);
        background: var(--color-primary-surface);
        border: 1px solid var(--color-primary-200);
        font-size: var(--text-xs);
        font-weight: 600;
      }

      .gallery-grid {
        display: grid;
        grid-auto-rows: 200px;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-3);

        figure {
          overflow: hidden;
          margin: 0;
          border-radius: var(--radius-lg);
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);

          &.featured {
            grid-row: span 2;
            grid-column: span 2;
          }

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform var(--transition-normal);
          }

          &:hover img {
            transform: scale(1.03);
          }
        }

        &.single-image {
          grid-template-columns: 1fr;

          figure {
            height: min(440px, 60vw);
          }
        }
      }

      .gallery-empty {
        min-height: 160px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-4);
        padding: var(--space-6);
        border: 2px dashed var(--color-border);
        border-radius: var(--radius-xl);
        color: var(--color-text-tertiary);
        text-align: left;
        background: var(--color-bg-secondary);

        span {
          font-size: 36px;
          color: var(--color-text-tertiary);
        }

        strong {
          display: block;
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
        }

        p {
          margin: 2px 0 0;
          font-size: var(--text-xs);
        }
      }

      /* Jobs Section */
      .jobs-section {
        padding: var(--space-12) 0 var(--space-16);
      }

      .jobs-heading {
        align-items: center;

        .section-sub {
          margin: 4px 0 0;
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
        }
      }

      .view-in-jobs-btn {
        height: 38px;
        border-radius: var(--radius-md);
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-weight: 500;
      }

      .jobs-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-4);
      }

      .job-card {
        display: flex;
        flex-direction: column;
        padding: 20px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        background: var(--color-bg-secondary);
        box-shadow: var(--shadow-card);
        transition: transform var(--transition-normal), box-shadow var(--transition-normal), border-color var(--transition-normal);
        cursor: pointer;

        &:hover {
          transform: translateY(-4px);
          border-color: var(--color-primary-200);
          box-shadow: var(--shadow-card-hover), 0 0 0 1px rgba(15, 82, 186, 0.06);

          .job-title-link {
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

      .job-card-header {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        margin-bottom: 12px;
      }

      .job-icon {
        flex: none;
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        border-radius: var(--radius-md);
        color: var(--color-primary);
        background: var(--color-primary-surface);
        border: 1px solid var(--color-primary-100);
        font-size: 18px;
        transition: background var(--transition-normal), border-color var(--transition-normal);
      }

      .job-title-block {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }

      .job-title-link {
        color: var(--color-text-primary);
        font-family: var(--font-heading);
        font-size: var(--text-base);
        font-weight: 600;
        line-height: 1.35;
        transition: color var(--transition-fast);
      }

      .job-dept {
        margin-top: 2px;
        color: var(--color-text-tertiary);
        font-size: var(--text-xs);
      }

      .new-tag {
        background: var(--color-primary-surface) !important;
        color: var(--color-primary) !important;
        border: 1px solid var(--color-primary-200) !important;
        border-radius: var(--radius-sm) !important;
        font-weight: 600;
      }

      .job-facts {
        display: flex;
        flex-wrap: wrap;
        gap: 6px 12px;
        margin-bottom: 12px;
        color: var(--color-text-secondary);
        font-size: var(--text-xs);

        .fact-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--color-bg-primary);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
        }

        .salary-fact {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--color-success);
          background: var(--color-success-bg);
          border: 1px solid var(--color-success-border);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-family: var(--font-heading);
        }
      }

      .job-description {
        display: -webkit-box;
        overflow: hidden;
        min-height: 40px;
        margin: 0 0 12px;
        color: var(--color-text-secondary);
        font-size: 13.5px;
        line-height: 1.5;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }

      .skills-list {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        margin-bottom: 14px;

        .skill-pill {
          background: var(--color-bg-tertiary);
          color: var(--color-text-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: 2px 8px;
          font-size: 11.5px;
          font-weight: 500;
        }

        .more-skills {
          color: var(--color-text-tertiary);
          font-size: 11.5px;
        }
      }

      .job-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        margin-top: auto;
        padding-top: 12px;
        border-top: 1px solid var(--color-border-light);

        .deadline {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--color-text-tertiary);
          font-size: var(--text-xs);

          &.near {
            color: var(--color-warning);
            font-weight: 600;
          }
        }

        .apply-cta-btn {
          height: 34px !important;
          padding: 0 14px !important;
          border-radius: var(--radius-md) !important;
          font-size: var(--text-xs) !important;
          font-weight: 600 !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 4px !important;
        }
      }

      .jobs-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-10);
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
      }

      /* Responsive Breakpoints */
      @media (max-width: 991px) {
        .company-profile-card {
          flex-direction: column;
        }

        .company-logo {
          width: 88px;
          height: 88px;
          margin-top: -48px;
        }

        .company-heading {
          width: 100%;
        }

        .company-meta {
          grid-template-columns: 1fr 1fr;
        }

        .meta-item.headquarters {
          grid-column: span 2;
        }

        .about-grid,
        .jobs-grid {
          grid-template-columns: 1fr;
        }

        .gallery-grid {
          grid-auto-rows: 170px;
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 600px) {
        .cover-banner {
          height: 220px;
        }

        .company-profile-card {
          margin-top: -40px;
          padding: 16px;
        }

        .heading-row {
          flex-direction: column;
          gap: var(--space-3);
        }

        .company-title {
          font-size: var(--text-xl);
        }

        .website-btn {
          width: 100%;
          justify-content: center !important;
        }

        .company-meta {
          grid-template-columns: 1fr;
        }

        .meta-item.headquarters {
          grid-column: auto;
        }

        .section-heading {
          flex-direction: column;
          align-items: flex-start;
          gap: var(--space-2);
        }

        .view-in-jobs-btn {
          width: 100%;
          justify-content: center;
        }

        .gallery-grid {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          gap: 10px;

          figure,
          figure.featured {
            flex: 0 0 84%;
            height: 220px;
            scroll-snap-align: start;
          }
        }

        .job-card-footer {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;

          .apply-cta-btn {
            width: 100%;
            justify-content: center !important;
          }
        }
      }
    `,
  ],
})
export class CompanyDetailComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly jobService = inject(JobService);

  company: CompanyDetail | null = null;
  loading = true;

  private readonly employmentTypeMap: Record<string, string> = {
    full_time: 'Toàn thời gian',
    part_time: 'Bán thời gian',
    contract: 'Hợp đồng',
    internship: 'Thực tập',
    intern: 'Thực tập',
    remote: 'Từ xa',
  };

  get workplaceImages(): string[] {
    return getValidWorkplaceImages(this.company?.workplace_images);
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const code = params.get('code');
      if (code) this.loadCompany(code);
    });
  }

  loadCompany(code: string): void {
    this.loading = true;
    this.company = null;
    this.jobService.getCompanyDetail(code).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (company) => {
        this.company = company;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  getCoverUrl(): string | null {
    return normalizeExternalUrl(this.company?.cover_image_url);
  }

  getLogoUrl(): string | null {
    return normalizeExternalUrl(this.company?.logo_url);
  }

  getWebsiteUrl(): string | null {
    return normalizeExternalUrl(this.company?.website_url);
  }

  getCompanyInitials(): string {
    return (this.company?.company_name ?? 'Công ty')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'CT';
  }

  formatEmploymentType(type: string | null): string {
    return type ? this.employmentTypeMap[type] || type : 'Linh hoạt';
  }

  formatSalary(min?: number | null, max?: number | null): string {
    if (min != null && max != null && min > 0 && max > 0) {
      return min === max ? `${min} triệu` : `${min} - ${max} triệu`;
    }
    if (min != null && min > 0) return `Từ ${min} triệu`;
    if (max != null && max > 0) return `Đến ${max} triệu`;
    return 'Thỏa thuận';
  }

  getJobDescription(job: PublicJobListItem): string {
    return stripCompanyHtml(job.description_vi);
  }

  formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
  }

  isNewJob(job: PublicJobListItem): boolean {
    if (!job.published_at) return false;
    const elapsed = Date.now() - new Date(job.published_at).getTime();
    return elapsed >= 0 && elapsed <= 3 * 86_400_000;
  }

  isDeadlineNear(job: PublicJobListItem): boolean {
    if (!job.application_deadline) return false;
    const remaining = new Date(job.application_deadline).getTime() - Date.now();
    return remaining >= 0 && remaining <= 7 * 86_400_000;
  }
}
