import { Component, OnInit, inject, SecurityContext, DestroyRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { ToastService } from '../../core/services/toast.service';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';

import { JobService } from '../../core/services/job.service';
import { ApplicationService } from '../../core/services/application.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  ResumeUploaderComponent,
  ResumeUploaderSelection,
} from '../../shared/components/resume-uploader.component';
import { PublicJob, CompanyDetail } from '../../shared/models/job.model';
import { Resume } from '../../shared/models/resume.model';

export function normalizeContactPhone(value: string): string {
  return value.replace(/[\s.()-]/g, '');
}

export function getContactPhoneError(value: string): string | null {
  const normalized = normalizeContactPhone(value);
  if (!normalized) return 'Vui lòng nhập số điện thoại liên hệ.';
  return /^(?:\+84|0)\d{9}$/.test(normalized)
    ? null
    : 'Số điện thoại chưa hợp lệ. Ví dụ: 0912 345 678.';
}

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgOptimizedImage,
    FormsModule,
    TranslateModule,
    NzGridModule,
    NzCardModule,
    NzButtonModule,
    NzTagModule,
    NzIconModule,
    NzDividerModule,
    NzModalModule,
    NzInputModule,
    ResumeUploaderComponent,
    NzSpinModule,
    NzAlertModule,
    NzDescriptionsModule,
    NzSkeletonModule,
  ],
  template: `
    <div class="job-detail-page">
      @if (loading) {
        <div class="loading-container">
          <nz-skeleton [nzActive]="true" [nzParagraph]="{ rows: 10 }"></nz-skeleton>
        </div>
      } @else if (error) {
        <div class="error-container">
          <nz-alert
            nzType="error"
            nzMessage="Đã có lỗi xảy ra"
            [nzDescription]="error"
            nzShowIcon
          ></nz-alert>
          <button nz-button nzType="primary" routerLink="/jobs" class="back-error-btn">
            Quay lại danh sách việc làm
          </button>
        </div>
      } @else if (job) {
        <div class="container">
          <!-- Back Breadcrumb / Link -->
          <div class="back-link-wrapper">
            <a routerLink="/jobs" class="back-link">
              <span nz-icon nzType="arrow-left" nzTheme="outline"></span>
              <span>Quay lại danh sách việc làm</span>
            </a>
          </div>

          <div nz-row [nzGutter]="24" class="job-detail-layout">
            <!-- Left Main Column (16 cols) -->
            <div nz-col [nzXs]="24" [nzLg]="16">
              <!-- Job Header Card -->
              <div class="job-header-card">
                <div class="job-header">
                  <div class="company-lockup">
                    <div class="company-logo">
                      @if (job.company_logo_url) {
                        <img [ngSrc]="job.company_logo_url" [alt]="'Logo ' + getCompanyName()" width="56" height="56" priority />
                      } @else {
                        <span>{{ getCompanyInitials() }}</span>
                      }
                    </div>
                    <div class="header-copy">
                      <h1 class="job-title">{{ job.title_vi }}</h1>
                      @if (job.company_code) {
                        <a class="company-name" [routerLink]="['/companies', job.company_code]">
                          <span nz-icon nzType="bank" nzTheme="outline"></span>
                          <span>{{ getCompanyName() }}</span>
                          <span nz-icon nzType="arrow-right" nzTheme="outline" class="link-arrow"></span>
                        </a>
                      } @else {
                        <span class="company-name">
                          <span nz-icon nzType="bank" nzTheme="outline"></span>
                          <span>{{ getCompanyName() }}</span>
                        </span>
                      }
                    </div>
                  </div>

                  <div class="job-meta-bar">
                    @if (job.department) {
                      <span class="meta-item">
                        <span nz-icon nzType="appstore" nzTheme="outline"></span>
                        <span>{{ job.department }}</span>
                      </span>
                    }
                    @if (job.location) {
                      <span class="meta-item">
                        <span nz-icon nzType="environment" nzTheme="outline"></span>
                        <span>{{ job.location }}</span>
                      </span>
                    }
                    @if (job.employment_type) {
                      <span class="meta-item">
                        <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                        <span>{{ getEmploymentTypeLabel(job.employment_type) }}</span>
                      </span>
                    }
                    @if (job.application_deadline) {
                      <span class="meta-item deadline" [class.expiring]="isDeadlineNear()">
                        <span nz-icon nzType="calendar" nzTheme="outline"></span>
                        <span>Hạn nộp: {{ job.application_deadline | date: 'dd/MM/yyyy' }}</span>
                      </span>
                    }
                  </div>

                  <div class="salary-strip">
                    <div class="salary-badge">
                      <span nz-icon nzType="dollar" nzTheme="outline"></span>
                      <span>{{ formatSalary(job.salary_min, job.salary_max) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Job Description -->
              <div class="content-card">
                <h2 class="content-card-title">
                  <span nz-icon nzType="file-text" nzTheme="outline" class="title-icon"></span>
                  <span>Mô tả công việc</span>
                </h2>
                @if (job.description_vi) {
                  <div class="content-text" [innerHTML]="sanitizeHtml(job.description_vi)"></div>
                } @else {
                  <p class="empty-content">Chưa có mô tả chi tiết cho vị trí này.</p>
                }
              </div>

              <!-- Job Requirements -->
              <div class="content-card">
                <h2 class="content-card-title">
                  <span nz-icon nzType="audit" nzTheme="outline" class="title-icon"></span>
                  <span>Yêu cầu công việc</span>
                </h2>
                @if (job.requirements_vi) {
                  <div class="content-text" [innerHTML]="sanitizeHtml(job.requirements_vi)"></div>
                } @else {
                  <p class="empty-content">Chưa có yêu cầu cụ thể cho vị trí này.</p>
                }
              </div>

              <!-- Skills -->
              @if (job.must_have_skills.length > 0 || job.nice_to_have_skills.length > 0) {
                <div class="content-card">
                  <h2 class="content-card-title">
                    <span nz-icon nzType="tags" nzTheme="outline" class="title-icon"></span>
                    <span>Kỹ năng yêu cầu</span>
                  </h2>
                  @if (job.must_have_skills.length > 0) {
                    <div class="skills-section">
                      <h4 class="skills-subtitle">Kỹ năng bắt buộc:</h4>
                      <div class="skills-tags">
                        @for (skill of job.must_have_skills; track skill) {
                          <nz-tag class="skill-tag-primary">{{ skill }}</nz-tag>
                        }
                      </div>
                    </div>
                  }
                  @if (job.nice_to_have_skills.length > 0) {
                    <div class="skills-section">
                      <h4 class="skills-subtitle">Kỹ năng ưu tiên:</h4>
                      <div class="skills-tags">
                        @for (skill of job.nice_to_have_skills; track skill) {
                          <nz-tag class="skill-tag-secondary">{{ skill }}</nz-tag>
                        }
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- Benefits -->
              <div class="content-card benefits-card">
                <h2 class="content-card-title">
                  <span nz-icon nzType="gift" nzTheme="outline" class="title-icon green"></span>
                  <span>Quyền lợi được hưởng</span>
                </h2>
                @if (job.benefits_vi) {
                  <div class="content-text" [innerHTML]="sanitizeHtml(job.benefits_vi)"></div>
                } @else {
                  <p class="empty-content">Chưa có thông tin quyền lợi cho vị trí này.</p>
                }
              </div>
            </div>

            <!-- Right Sidebar Column (8 cols) -->
            <div nz-col [nzXs]="24" [nzLg]="8">
              <div class="sidebar-sticky-wrap">
                <aside class="apply-card">
                  <h3 class="apply-card-title">Ứng tuyển ngay</h3>

                  @if (!authService.isAuthenticated()) {
                    <p class="login-prompt">
                      Đăng nhập để nộp đơn ứng tuyển nhanh chóng và theo dõi trạng thái hồ sơ của bạn.
                    </p>
                    <button
                      nz-button
                      nzType="primary"
                      nzBlock
                      nzSize="large"
                      routerLink="/login"
                      [queryParams]="{ returnUrl: '/jobs/' + job.slug }"
                      class="main-apply-btn"
                    >
                      Đăng nhập để ứng tuyển
                    </button>
                  } @else if (hasApplied) {
                    <button
                      nz-button
                      nzBlock
                      nzSize="large"
                      disabled
                      class="applied-btn"
                    >
                      <span nz-icon nzType="check-circle" nzTheme="outline"></span>
                      Đã nộp đơn ứng tuyển
                    </button>
                  } @else {
                    <button
                      nz-button
                      nzType="primary"
                      nzBlock
                      nzSize="large"
                      (click)="openApplyModal()"
                      class="main-apply-btn"
                    >
                      <span nz-icon nzType="send" nzTheme="outline"></span>
                      Nộp đơn ứng tuyển
                    </button>
                  }

                  <nz-divider class="apply-divider"></nz-divider>

                  <!-- Job Quick Summary Descriptions -->
                  <div class="summary-list">
                    @if (job.min_experience_years !== undefined) {
                      <div class="summary-item">
                        <span class="summary-label">
                          <span nz-icon nzType="trophy" nzTheme="outline"></span>
                          Kinh nghiệm
                        </span>
                        <strong class="summary-value">{{ getExperienceText() }}</strong>
                      </div>
                    }
                    @if (job.min_education) {
                      <div class="summary-item">
                        <span class="summary-label">
                          <span nz-icon nzType="read" nzTheme="outline"></span>
                          Học vấn
                        </span>
                        <strong class="summary-value">{{ getEducationLabel(job.min_education) }}</strong>
                      </div>
                    }
                    @if (job.application_deadline) {
                      <div class="summary-item">
                        <span class="summary-label">
                          <span nz-icon nzType="calendar" nzTheme="outline"></span>
                          Hạn nộp hồ sơ
                        </span>
                        <strong class="summary-value">{{ job.application_deadline | date: 'dd/MM/yyyy' }}</strong>
                      </div>
                    }
                    @if (job.published_at) {
                      <div class="summary-item">
                        <span class="summary-label">
                          <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                          Ngày đăng
                        </span>
                        <strong class="summary-value">{{ job.published_at | date: 'dd/MM/yyyy' }}</strong>
                      </div>
                    }
                  </div>
                </aside>

                <!-- Company Info Card (Under div Ứng tuyển ngay) -->
                <div class="company-sidebar-card">
                  <div class="company-sidebar-header">
                    <div class="company-sidebar-logo">
                      @if (getCompanyLogoUrl(); as logoUrl) {
                        <img [ngSrc]="logoUrl" [alt]="'Logo ' + getCompanyName()" width="48" height="48" />
                      } @else {
                        <span>{{ getCompanyInitials() }}</span>
                      }
                    </div>
                    <div class="company-sidebar-titles">
                      <h4 class="company-sidebar-name">
                        @if (job.company_code) {
                          <a [routerLink]="['/companies', job.company_code]">
                            {{ getCompanyName() }}
                          </a>
                        } @else {
                          <span>{{ getCompanyName() }}</span>
                        }
                      </h4>
                      @if (companyDetail?.industry) {
                        <span class="company-sidebar-industry">{{ companyDetail?.industry }}</span>
                      }
                    </div>
                  </div>

                  <nz-divider class="company-sidebar-divider"></nz-divider>

                  <div class="company-sidebar-meta">
                    @if (companyDetail?.employee_size) {
                      <div class="meta-row">
                        <span class="meta-icon"><span nz-icon nzType="team" nzTheme="outline"></span></span>
                        <div class="meta-content">
                          <span class="meta-title">Quy mô nhân sự</span>
                          <strong class="meta-value">{{ companyDetail?.employee_size }}</strong>
                        </div>
                      </div>
                    }

                    @if (getCompanyLocation(); as compLoc) {
                      <div class="meta-row">
                        <span class="meta-icon"><span nz-icon nzType="environment" nzTheme="outline"></span></span>
                        <div class="meta-content">
                          <span class="meta-title">Địa điểm / Trụ sở</span>
                          <strong class="meta-value">{{ compLoc }}</strong>
                        </div>
                      </div>
                    }

                    @if (companyDetail?.website_url) {
                      <div class="meta-row">
                        <span class="meta-icon"><span nz-icon nzType="global" nzTheme="outline"></span></span>
                        <div class="meta-content">
                          <span class="meta-title">Website</span>
                          <a [href]="getCompanyWebsiteUrl()" target="_blank" rel="noopener noreferrer" class="website-link">
                            {{ formatWebsiteUrl(companyDetail?.website_url) }}
                            <span nz-icon nzType="export" nzTheme="outline"></span>
                          </a>
                        </div>
                      </div>
                    }
                  </div>

                  @if (getCompanyIntro(); as intro) {
                    <p class="company-sidebar-intro">{{ intro }}</p>
                  }

                  @if (job.company_code) {
                    <div class="company-sidebar-action">
                      <a
                        nz-button
                        nzBlock
                        [routerLink]="['/companies', job.company_code]"
                        class="view-company-btn"
                      >
                        <span>Xem trang công ty</span>
                        <span nz-icon nzType="arrow-right" nzTheme="outline"></span>
                      </a>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile Sticky Apply Bar -->
        <div class="mobile-sticky-apply" role="region" aria-label="Thao tác ứng tuyển">
          <div class="sticky-job-copy">
            <strong>{{ job.title_vi }}</strong>
            <span class="sticky-salary">{{ formatSalary(job.salary_min, job.salary_max) }}</span>
          </div>
          @if (!authService.isAuthenticated()) {
            <button nz-button nzType="primary" routerLink="/login" [queryParams]="{ returnUrl: '/jobs/' + job.slug }">
              Đăng nhập
            </button>
          } @else if (hasApplied) {
            <button nz-button disabled>
              <span nz-icon nzType="check" nzTheme="outline"></span>
              Đã nộp
            </button>
          } @else {
            <button nz-button nzType="primary" (click)="openApplyModal()">
              <span nz-icon nzType="send" nzTheme="outline"></span>
              Ứng tuyển
            </button>
          }
        </div>
      }
    </div>

    <!-- Apply Modal -->
    <nz-modal
      [(nzVisible)]="applyModalVisible"
      [nzTitle]="job ? ('Ứng tuyển vị trí: ' + job.title_vi) : 'Nộp đơn ứng tuyển'"
      [nzFooter]="applyModalFooter"
      (nzOnCancel)="closeApplyModal()"
      [nzWidth]="720"
      [nzMaskClosable]="!submitting"
      [nzClosable]="!submitting"
    >
      <ng-container *nzModalContent>
        <div class="apply-form">
          <div class="form-section">
            <label class="form-label">Chọn CV ứng tuyển <span class="required">*</span></label>
            <app-resume-uploader
              [disabled]="submitting"
              [showSavedResumes]="true"
              (selectionChange)="onResumeSelectionChange($event)"
            ></app-resume-uploader>
          </div>

          <div class="form-section">
            <label for="contact-phone" class="form-label">Số điện thoại liên hệ <span class="required">*</span></label>
            <div class="phone-input" [class.has-error]="phoneError">
              <span nz-icon nzType="phone" nzTheme="outline"></span>
              <input
                id="contact-phone"
                nz-input
                type="tel"
                inputmode="tel"
                maxlength="20"
                [(ngModel)]="contactPhone"
                (ngModelChange)="validatePhone()"
                placeholder="Ví dụ: 0912 345 678"
                [disabled]="submitting"
              />
            </div>
            @if (phoneError) {
              <span class="field-error" role="alert">{{ phoneError }}</span>
            }
          </div>

          <div class="form-section">
            <div class="label-row">
              <label for="cover-letter" class="form-label">Thư giới thiệu (Không bắt buộc)</label>
              <span class="char-count">{{ coverLetter.length }}/1500</span>
            </div>
            <textarea
              id="cover-letter"
              nz-input
              rows="4"
              maxlength="1500"
              [(ngModel)]="coverLetter"
              placeholder="Giới thiệu ngắn gọn về kinh nghiệm, điểm mạnh hoặc lý do bạn phù hợp với vị trí này..."
              [disabled]="submitting"
              class="cover-letter-input"
            ></textarea>
          </div>
        </div>
      </ng-container>

      <ng-template #applyModalFooter>
        <div class="modal-footer-actions">
          <button nz-button (click)="closeApplyModal()" [disabled]="submitting">
            Hủy
          </button>
          <button
            nz-button
            nzType="primary"
            [nzLoading]="submitting"
            [disabled]="!canSubmit()"
            (click)="submitApplication()"
          >
            Xác nhận ứng tuyển
          </button>
        </div>
      </ng-template>
    </nz-modal>
  `,
  styles: [
    `
      .job-detail-page {
        padding: var(--space-6) 0 var(--space-16);
        background: var(--color-bg-primary);
        min-height: 100vh;
      }

      .container {
        max-width: var(--container-max);
        margin: 0 auto;
        padding: 0 var(--container-padding);
      }

      .loading-container,
      .error-container {
        max-width: 800px;
        margin: var(--space-12) auto;
        padding: 0 var(--container-padding);
      }

      .back-error-btn {
        margin-top: 16px;
      }

      .back-link-wrapper {
        margin-bottom: var(--space-5);
      }

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--color-text-secondary);
        font-size: var(--text-sm);
        font-weight: 500;
        transition: color var(--transition-fast);

        &:hover {
          color: var(--color-primary);
        }
      }

      .job-detail-layout {
        align-items: flex-start;
      }

      /* Job Header Card */
      .job-header-card {
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-card);
        padding: 24px;
        margin-bottom: var(--space-5);
      }

      .job-header {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .company-lockup {
        display: flex;
        align-items: flex-start;
        gap: 16px;
      }

      .company-logo {
        width: 64px;
        height: 64px;
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-primary-100);
        background: var(--color-primary-surface);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;

        img {
          object-fit: contain;
        }

        span {
          font-family: var(--font-heading);
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--color-primary);
        }
      }

      .header-copy {
        flex: 1;
        min-width: 0;
      }

      .job-title {
        font-family: var(--font-heading);
        font-size: clamp(22px, 2.5vw, 28px);
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0 0 6px;
        line-height: 1.3;
      }

      .company-name {
        font-size: var(--text-base);
        color: var(--color-primary);
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 6px;

        .link-arrow {
          font-size: 12px;
          transition: transform var(--transition-fast);
        }

        &:hover .link-arrow {
          transform: translateX(3px);
        }
      }

      .job-meta-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px 16px;
        padding-top: 4px;

        .meta-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          background: var(--color-bg-primary);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);

          .anticon {
            color: var(--color-text-tertiary);
          }

          &.deadline {
            color: var(--color-text-secondary);
          }

          &.deadline.expiring {
            color: var(--color-error);
            background: var(--color-error-bg);
            border-color: var(--color-error-border);
            font-weight: 600;

            .anticon {
              color: var(--color-error);
            }
          }
        }
      }

      .salary-strip {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 2px;
      }

      .salary-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: var(--color-success-bg);
        color: var(--color-success);
        border: 1px solid var(--color-success-border);
        padding: 6px 14px;
        border-radius: var(--radius-sm);
        font-size: var(--text-base);
        font-weight: 700;
        font-family: var(--font-heading);
      }

      /* Content Cards */
      .content-card {
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-card);
        padding: 24px;
        margin-bottom: var(--space-5);
      }

      .content-card-title {
        font-family: var(--font-heading);
        font-size: var(--text-lg);
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0 0 16px;
        display: flex;
        align-items: center;
        gap: 8px;

        .title-icon {
          color: var(--color-primary);
          font-size: 18px;

          &.green {
            color: var(--color-success);
          }
        }
      }

      .content-text {
        font-size: 14.5px;
        line-height: 1.65;
        color: var(--color-text-secondary);

        ::ng-deep p {
          margin-bottom: 12px;
          line-height: 1.65;
        }

        ::ng-deep ul, ::ng-deep ol {
          padding-left: 20px;
          margin-bottom: 12px;

          li {
            margin-bottom: 6px;
            line-height: 1.6;
          }
        }
      }

      .empty-content {
        color: var(--color-text-tertiary);
        font-style: italic;
        margin: 0;
      }

      .benefits-card {
        border-left: 3px solid var(--color-success);
      }

      .skills-section {
        margin-bottom: 16px;

        &:last-child {
          margin-bottom: 0;
        }
      }

      .skills-subtitle {
        font-size: var(--text-xs);
        font-weight: 600;
        color: var(--color-text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 8px;
      }

      .skills-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .skill-tag-primary {
        background: var(--color-primary-surface) !important;
        color: var(--color-primary) !important;
        border: 1px solid var(--color-primary-200) !important;
        font-size: var(--text-xs) !important;
        padding: 3px 10px !important;
        border-radius: var(--radius-sm) !important;
        font-weight: 500;
      }

      .skill-tag-secondary {
        background: var(--color-bg-tertiary) !important;
        color: var(--color-text-secondary) !important;
        border: 1px solid var(--color-border) !important;
        font-size: var(--text-xs) !important;
        padding: 3px 10px !important;
        border-radius: var(--radius-sm) !important;
      }

      .sidebar-sticky-wrap {
        position: sticky;
        top: calc(var(--header-height) + 16px);
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }

      /* Apply Card (Right Column) */
      .apply-card {
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-card);
        padding: 24px;
      }

      .apply-card-title {
        font-family: var(--font-heading);
        font-size: var(--text-base);
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0 0 14px;
      }

      .login-prompt {
        color: var(--color-text-secondary);
        font-size: var(--text-sm);
        line-height: var(--leading-relaxed);
        margin-bottom: 16px;
      }

      .main-apply-btn {
        height: 46px !important;
        font-weight: 600 !important;
        font-size: var(--text-sm) !important;
        border-radius: var(--radius-md) !important;
      }

      .applied-btn {
        height: 46px !important;
        color: var(--color-success) !important;
        border-color: var(--color-success-border) !important;
        background: var(--color-success-bg) !important;
        font-weight: 600 !important;
        cursor: default;
      }

      .apply-divider {
        margin: 18px 0 !important;
        border-color: var(--color-border-light) !important;
      }

      .summary-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .summary-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: var(--text-sm);
        padding-bottom: 8px;
        border-bottom: 1px solid var(--color-border-light);

        &:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .summary-label {
          color: var(--color-text-secondary);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-xs);

          .anticon {
            color: var(--color-text-tertiary);
          }
        }

        .summary-value {
          color: var(--color-text-primary);
          font-weight: 600;
          font-size: var(--text-sm);
        }
      }

      /* Company Sidebar Card */
      .company-sidebar-card {
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-card);
        padding: 22px;
        transition: border-color var(--transition-fast);

        &:hover {
          border-color: var(--color-primary-200);
        }
      }

      .company-sidebar-header {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .company-sidebar-logo {
        width: 48px;
        height: 48px;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-primary-100);
        background: var(--color-primary-surface);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;

        img {
          object-fit: contain;
        }

        span {
          font-family: var(--font-heading);
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--color-primary);
        }
      }

      .company-sidebar-titles {
        flex: 1;
        min-width: 0;
      }

      .company-sidebar-name {
        font-family: var(--font-heading);
        font-size: var(--text-base);
        font-weight: 700;
        margin: 0 0 2px;
        line-height: 1.35;

        a {
          color: var(--color-text-primary);
          transition: color var(--transition-fast);

          &:hover {
            color: var(--color-primary);
          }
        }

        span {
          color: var(--color-text-primary);
        }
      }

      .company-sidebar-industry {
        display: inline-block;
        font-size: var(--text-xs);
        color: var(--color-text-tertiary);
        font-weight: 500;
      }

      .company-sidebar-divider {
        margin: 14px 0 !important;
        border-color: var(--color-border-light) !important;
      }

      .company-sidebar-meta {
        display: flex;
        flex-direction: column;
        gap: 10px;

        .meta-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: var(--text-sm);

          .meta-icon {
            color: var(--color-primary);
            font-size: 15px;
            margin-top: 2px;
            flex-shrink: 0;
          }

          .meta-content {
            display: flex;
            flex-direction: column;
            gap: 1px;
            min-width: 0;
          }

          .meta-title {
            font-size: var(--text-xs);
            color: var(--color-text-tertiary);
          }

          .meta-value {
            color: var(--color-text-primary);
            font-weight: 600;
            font-size: var(--text-xs);
            word-break: break-word;
          }

          .website-link {
            color: var(--color-primary);
            font-size: var(--text-xs);
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            word-break: break-all;

            &:hover {
              text-decoration: underline;
            }
          }
        }
      }

      .company-sidebar-intro {
        font-size: var(--text-xs);
        line-height: 1.6;
        color: var(--color-text-secondary);
        margin: 12px 0 0;
        padding-top: 10px;
        border-top: 1px dashed var(--color-border-light);
      }

      .company-sidebar-action {
        margin-top: 14px;

        .view-company-btn {
          height: 38px !important;
          border-radius: var(--radius-md) !important;
          font-size: var(--text-xs) !important;
          font-weight: 600 !important;
          color: var(--color-primary) !important;
          border-color: var(--color-primary-200) !important;
          background: var(--color-primary-surface) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          transition: all var(--transition-fast) !important;

          &:hover {
            background: var(--color-primary) !important;
            color: #FFFFFF !important;
            border-color: var(--color-primary) !important;
          }
        }
      }

      /* Apply Modal Form */
      .apply-form {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .form-section {
        .form-label {
          display: block;
          font-weight: 600;
          font-size: var(--text-sm);
          color: var(--color-text-primary);
          margin-bottom: 6px;
        }

        .required {
          color: var(--color-error);
        }

        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .char-count {
          font-size: 11px;
          color: var(--color-text-tertiary);
        }
      }

      .phone-input {
        display: flex;
        align-items: center;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 0 12px;
        background: var(--color-bg-secondary);
        height: 42px;
        transition: all var(--transition-fast);

        span {
          color: var(--color-text-tertiary);
          margin-right: 8px;
          font-size: 16px;
        }

        input {
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          font-size: var(--text-sm);
          color: var(--color-text-primary);
          background: transparent;
        }

        &:focus-within {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(15, 82, 186, 0.12);
        }

        &.has-error {
          border-color: var(--color-error);
        }
      }

      .field-error {
        color: var(--color-error);
        font-size: var(--text-xs);
        margin-top: 4px;
        display: block;
      }

      .cover-letter-input {
        border-radius: var(--radius-md) !important;
        font-size: var(--text-sm);
      }

      .modal-footer-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
      }

      /* Mobile Sticky Apply Bar */
      .mobile-sticky-apply {
        display: none;
      }

      @media (max-width: 991px) {
        .mobile-sticky-apply {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: var(--z-sticky);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border-top: 1px solid var(--color-border);
          box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.08);
        }

        .sticky-job-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;

          strong {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: var(--color-text-primary);
            font-size: var(--text-sm);
          }

          .sticky-salary {
            color: var(--color-success);
            font-size: var(--text-xs);
            font-weight: 600;
          }
        }

        .mobile-sticky-apply button {
          flex-shrink: 0;
          height: 42px;
          border-radius: var(--radius-md);
          font-weight: 600;
          padding: 0 18px;
        }
      }

      @media (max-width: 560px) {
        .company-lockup {
          align-items: flex-start;
        }

        .company-logo {
          width: 52px;
          height: 52px;
        }

        .job-title {
          font-size: var(--text-xl);
        }

        .sticky-job-copy {
          max-width: 55%;
        }
      }
    `,
  ],
})
export class JobDetailComponent implements OnInit {
  @ViewChild(ResumeUploaderComponent) private resumeUploader?: ResumeUploaderComponent;

  private readonly destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobService = inject(JobService);
  private applicationService = inject(ApplicationService);
  private message = inject(ToastService);
  authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private translate = inject(TranslateService);

  job: PublicJob | null = null;
  companyDetail: CompanyDetail | null = null;
  loading = true;
  loadingCompany = false;
  error: string | null = null;
  hasApplied = false;

  // Apply modal
  applyModalVisible = false;
  selectedResume: Resume | null = null;
  selectedFile: File | null = null;
  contactPhone = '';
  phoneError: string | null = null;
  coverLetter = '';
  submitting = false;

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.loadJob(slug);
    } else {
      this.router.navigate(['/jobs']);
    }
  }

  loadJob(slug: string): void {
    this.loading = true;
    this.error = null;

    this.jobService.getBySlug(slug).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (job) => {
        this.job = job;
        this.loading = false;
        if (job.company_code) {
          this.loadCompanyDetail(job.company_code);
        } else {
          this.companyDetail = null;
        }
        const openAfterCheck = this.route.snapshot.queryParamMap.get('apply') === '1';
        this.checkAppliedStatus(job.id, openAfterCheck);
      },
      error: () => {
        this.error = this.translate.instant('jobs.noResultsTitle');
        this.loading = false;
      },
    });
  }

  loadCompanyDetail(companyCode: string): void {
    this.loadingCompany = true;
    this.jobService.getCompanyDetail(companyCode).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (comp) => {
        this.companyDetail = comp;
        this.loadingCompany = false;
      },
      error: () => {
        this.loadingCompany = false;
      },
    });
  }

  private checkAppliedStatus(jobId: number, openAfterCheck = false): void {
    if (!this.authService.isAuthenticated()) return;
    this.applicationService.getAppliedJobIds().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (ids) => {
        this.hasApplied = ids.includes(jobId);
        if (openAfterCheck && !this.hasApplied) this.openApplyModal();
      },
      error: () => {},
    });
  }

  openApplyModal(): void {
    if (this.hasApplied || !this.authService.isAuthenticated()) return;
    this.contactPhone = this.authService.user()?.phone ?? '';
    this.validatePhone();
    this.applyModalVisible = true;
  }

  closeApplyModal(): void {
    if (this.submitting) return;
    this.applyModalVisible = false;
    this.selectedResume = null;
    this.selectedFile = null;
    this.resumeUploader?.clearSelection();
    this.phoneError = null;
    this.coverLetter = '';
  }

  onResumeSelectionChange(selection: ResumeUploaderSelection): void {
    this.selectedResume = selection?.source === 'saved' ? selection.resume : null;
    this.selectedFile = selection?.source === 'file' ? selection.file : null;
  }

  canSubmit(): boolean {
    return !!(this.selectedResume || this.selectedFile) && !this.phoneError && !!this.contactPhone.trim();
  }

  validatePhone(): void {
    this.phoneError = getContactPhoneError(this.contactPhone);
  }

  submitApplication(): void {
    if (!this.job || !this.canSubmit()) return;

    this.submitting = true;
    const formData = new FormData();

    if (this.selectedResume) {
      formData.append('resume_id', this.selectedResume.id.toString());
    } else if (this.selectedFile) {
      formData.append('file', this.selectedFile, this.selectedFile.name);
    }

    formData.append('contact_phone', normalizeContactPhone(this.contactPhone));
    if (this.coverLetter.trim()) {
      formData.append('cover_letter', this.coverLetter.trim());
    }

    this.jobService.apply(this.job.slug, formData).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.message.success(this.translate.instant('jobDetail.applySuccessMsg') || 'Ứng tuyển thành công!');
        this.hasApplied = true;
        this.submitting = false;
        this.closeApplyModal();
        void this.router.navigate(['/dashboard/applications']);
      },
      error: (err: HttpErrorResponse) => {
        this.message.errorFromHttp(err, this.getApplicationErrorMessage(err), true);
        this.submitting = false;
      },
    });
  }

  private getApplicationErrorMessage(err: HttpErrorResponse): string {
    const detail = err.error?.detail;
    const code = typeof detail === 'object' ? detail?.code : undefined;
    const messages: Record<string, string> = {
      ALREADY_APPLIED: 'Bạn đã ứng tuyển vị trí này trước đó.',
      RESUME_REQUIRED: 'Vui lòng tải lên CV hoặc chọn một CV đã lưu.',
      JOB_NOT_ACCEPTING_APPLICATIONS: 'Tin tuyển dụng không tồn tại hoặc đã ngừng nhận hồ sơ.',
    };

    if (code && messages[code]) return messages[code];
    if (err.status === 0) return 'Không thể kết nối đến hệ thống. Vui lòng kiểm tra mạng và thử lại.';
    if (err.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để ứng tuyển.';
    if (err.status === 403) return 'Tài khoản của bạn không có quyền ứng tuyển vị trí này.';
    if (err.status === 413) return 'Dung lượng CV vượt quá giới hạn cho phép.';
    if (err.status === 415) return 'Định dạng CV không được hỗ trợ. Vui lòng sử dụng PDF, DOC hoặc DOCX.';
    if (err.status === 422) return 'Dữ liệu hồ sơ chưa hợp lệ. Vui lòng chọn lại CV và thử lại.';
    if (err.status === 429) return 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi một lát rồi thử lại.';
    if (err.status === 503) return 'Dịch vụ lưu trữ CV đang tạm thời gián đoạn. Vui lòng thử lại sau.';
    if (err.status >= 500) return 'Hệ thống chưa thể tiếp nhận hồ sơ lúc này. Vui lòng thử lại sau.';
    return 'Không thể gửi hồ sơ. Vui lòng thử lại.';
  }

  formatSalary(min?: number | null, max?: number | null): string {
    if (min != null && max != null && min > 0 && max > 0) {
      return min === max ? `${min} triệu` : `${min} - ${max} triệu`;
    }
    if (max != null && max > 0) return `Lên đến ${max} triệu`;
    if (min != null && min > 0) return `Từ ${min} triệu`;
    return 'Thỏa thuận';
  }

  getEmploymentTypeLabel(type: string | null): string {
    if (!type) return '-';
    const labels: Record<string, string> = {
      full_time: 'Toàn thời gian',
      part_time: 'Bán thời gian',
      contract: 'Hợp đồng',
      internship: 'Thực tập',
    };
    return labels[type] || type;
  }

  getEducationLabel(education: string): string {
    const labels: Record<string, string> = {
      high_school: 'Tốt nghiệp THPT',
      bachelor: 'Cử nhân',
      master: 'Thạc sĩ',
      phd: 'Tiến sĩ',
    };
    return labels[education] || education;
  }

  getExperienceText(): string {
    if (!this.job) return '';
    const min = this.job.min_experience_years;
    const max = this.job.max_experience_years;

    if (min === 0 && !max) return 'Không yêu cầu';
    if (!max) return `Từ ${min} năm`;
    if (min === max) return `${min} năm`;
    return `${min} - ${max} năm`;
  }

  getCompanyName(): string {
    return this.job?.company_name || this.job?.department || 'Nhà tuyển dụng';
  }

  getCompanyInitials(): string {
    return this.getCompanyName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'CT';
  }

  isDeadlineNear(): boolean {
    if (!this.job?.application_deadline) return false;
    const deadline = new Date(this.job.application_deadline);
    const remainingDays = (deadline.getTime() - Date.now()) / 86_400_000;
    return remainingDays >= 0 && remainingDays <= 7;
  }

  getCompanyLogoUrl(): string | null {
    return this.companyDetail?.logo_url || this.job?.company_logo_url || null;
  }

  getCompanyLocation(): string | null {
    return this.companyDetail?.headquarters || this.companyDetail?.location || this.job?.location || null;
  }

  getCompanyWebsiteUrl(): string | null {
    const raw = this.companyDetail?.website_url?.trim();
    if (!raw) return null;
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  }

  formatWebsiteUrl(url?: string | null): string {
    if (!url) return '';
    return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }

  getCompanyIntro(): string | null {
    const raw = this.companyDetail?.introduction_vi;
    if (!raw) return null;
    const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length <= 150) return clean;
    return `${clean.slice(0, 147)}...`;
  }

  sanitizeHtml(html: string | null | undefined): string {
    if (!html) return '';
    return this.sanitizer.sanitize(SecurityContext.HTML, html) || '';
  }
}
