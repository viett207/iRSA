import { Component, OnInit, inject, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzUploadModule, NzUploadFile } from 'ng-zorro-antd/upload';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';

import { JobService } from '../../core/services/job.service';
import { ResumeService } from '../../core/services/resume.service';
import { ApplicationService } from '../../core/services/application.service';
import { AuthService } from '../../core/auth/auth.service';
import { PublicJob } from '../../shared/models/job.model';
import { Resume } from '../../shared/models/resume.model';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzGridModule,
    NzCardModule,
    NzButtonModule,
    NzTagModule,
    NzIconModule,
    NzDividerModule,
    NzModalModule,
    NzUploadModule,
    NzInputModule,
    NzSelectModule,
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
            nzMessage="Lỗi"
            [nzDescription]="error"
            nzShowIcon
          ></nz-alert>
          <button nz-button nzType="primary" routerLink="/jobs" class="mt-4">
            Quay lại danh sách
          </button>
        </div>
      } @else if (job) {
        <div class="container">
          <div class="back-link">
            <a routerLink="/jobs">
              <span nz-icon nzType="arrow-left" nzTheme="outline"></span>
              Quay lại danh sách việc làm
            </a>
          </div>

          <div nz-row [nzGutter]="24">
            <div nz-col [nzXs]="24" [nzLg]="16">
              <!-- Job Header -->
              <nz-card class="job-header-card">
                <div class="job-header">
                  <h1 class="job-title">{{ job.title_vi }}</h1>

                  <div class="job-meta">
                    @if (job.department) {
                      <span class="meta-item">
                        <span nz-icon nzType="apartment" nzTheme="outline"></span>
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
                        {{ getEmploymentTypeLabel(job.employment_type) }}
                      </span>
                    }
                  </div>

                  @if (job.salary_min != null || job.salary_max != null) {
                    <div class="salary-badge">
                      <span nz-icon nzType="dollar" nzTheme="outline"></span>
                      {{ formatSalary(job.salary_min, job.salary_max) }}
                    </div>
                  }
                </div>
              </nz-card>

              <!-- Job Description -->
              @if (job.description_vi) {
                <nz-card class="content-card">
                  <h3>Mô tả công việc</h3>
                  <div class="content-text" [innerHTML]="sanitizeHtml(job.description_vi)"></div>
                </nz-card>
              }

              <!-- Job Requirements -->
              @if (job.requirements_vi) {
                <nz-card class="content-card">
                  <h3>Yêu cầu</h3>
                  <div class="content-text" [innerHTML]="sanitizeHtml(job.requirements_vi)"></div>
                </nz-card>
              }

              <!-- Skills -->
              @if (job.must_have_skills.length > 0 || job.nice_to_have_skills.length > 0) {
                <nz-card class="content-card">
                  <h3>Kỹ năng</h3>
                  @if (job.must_have_skills.length > 0) {
                    <div class="skills-section">
                      <h4>Bắt buộc:</h4>
                      <div class="skills-tags">
                        @for (skill of job.must_have_skills; track skill) {
                          <nz-tag nzColor="blue">{{ skill }}</nz-tag>
                        }
                      </div>
                    </div>
                  }
                  @if (job.nice_to_have_skills.length > 0) {
                    <div class="skills-section">
                      <h4>Ưu tiên:</h4>
                      <div class="skills-tags">
                        @for (skill of job.nice_to_have_skills; track skill) {
                          <nz-tag nzColor="geekblue">{{ skill }}</nz-tag>
                        }
                      </div>
                    </div>
                  }
                </nz-card>
              }
            </div>

            <!-- Sidebar -->
            <div nz-col [nzXs]="24" [nzLg]="8">
              <nz-card class="apply-card">
                <h3>Ứng tuyển ngay</h3>

                @if (!authService.isAuthenticated()) {
                  <p class="login-prompt">
                    Vui lòng đăng nhập để ứng tuyển vị trí này
                  </p>
                  <button
                    nz-button
                    nzType="primary"
                    nzBlock
                    nzSize="large"
                    routerLink="/login"
                    [queryParams]="{ returnUrl: '/jobs/' + job.slug }"
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
                    Đã ứng tuyển
                  </button>
                } @else {
                  <button
                    nz-button
                    nzType="primary"
                    nzBlock
                    nzSize="large"
                    (click)="openApplyModal()"
                  >
                    <span nz-icon nzType="send" nzTheme="outline"></span>
                    Ứng tuyển
                  </button>
                }

                <nz-divider></nz-divider>

                <nz-descriptions [nzColumn]="1" nzSize="small">
                  @if (job.min_experience_years !== undefined) {
                    <nz-descriptions-item nzTitle="Kinh nghiệm">
                      {{ getExperienceText() }}
                    </nz-descriptions-item>
                  }
                  @if (job.min_education) {
                    <nz-descriptions-item nzTitle="Học vấn">
                      {{ getEducationLabel(job.min_education) }}
                    </nz-descriptions-item>
                  }
                  @if (job.application_deadline) {
                    <nz-descriptions-item nzTitle="Hạn nộp">
                      {{ job.application_deadline | date: 'dd/MM/yyyy' }}
                    </nz-descriptions-item>
                  }
                  @if (job.published_at) {
                    <nz-descriptions-item nzTitle="Đăng ngày">
                      {{ job.published_at | date: 'dd/MM/yyyy' }}
                    </nz-descriptions-item>
                  }
                </nz-descriptions>
              </nz-card>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Apply Modal -->
    <nz-modal
      [(nzVisible)]="applyModalVisible"
      nzTitle="Ứng tuyển vị trí"
      [nzFooter]="applyModalFooter"
      (nzOnCancel)="closeApplyModal()"
      [nzWidth]="600"
    >
      <ng-container *nzModalContent>
        <div class="apply-form">
          <!-- Resume Selection -->
          <div class="form-section">
            <label>CV / Hồ sơ của bạn <span class="required">*</span></label>

            @if (resumes.length > 0) {
              <nz-select
                [(ngModel)]="selectedResumeId"
                nzPlaceHolder="Chọn CV có sẵn"
                nzSize="large"
                style="width: 100%"
                [nzAllowClear]="true"
                (ngModelChange)="onResumeSelect($event)"
              >
                @for (resume of resumes; track resume.id) {
                  <nz-option
                    [nzValue]="resume.id"
                    [nzLabel]="resume.original_filename + (resume.is_default ? ' (Mặc định)' : '')"
                  ></nz-option>
                }
              </nz-select>

              <p class="or-divider">hoặc tải lên CV mới</p>
            }

            <nz-upload
              [(nzFileList)]="uploadedFiles"
              [nzBeforeUpload]="beforeUpload"
              nzAccept=".pdf,.docx"
            >
              <button nz-button>
                <span nz-icon nzType="upload" nzTheme="outline"></span>
                Tải lên CV (PDF, DOCX - tối đa 5MB)
              </button>
            </nz-upload>
          </div>

          <!-- Cover Letter -->
          <div class="form-section">
            <label>Thư xin việc (tùy chọn)</label>
            <textarea
              nz-input
              [(ngModel)]="coverLetter"
              [nzAutosize]="{ minRows: 4, maxRows: 8 }"
              placeholder="Giới thiệu ngắn về bản thân và lý do bạn phù hợp với vị trí này..."
            ></textarea>
          </div>
        </div>
      </ng-container>

      <ng-template #applyModalFooter>
        <button nz-button (click)="closeApplyModal()">Hủy</button>
        <button
          nz-button
          nzType="primary"
          [nzLoading]="submitting"
          [disabled]="!canSubmit()"
          (click)="submitApplication()"
        >
          Gửi hồ sơ
        </button>
      </ng-template>
    </nz-modal>
  `,
  styles: [
    `
      .job-detail-page {
        padding: var(--space-8) 0;
        min-height: 100vh;
        background: var(--color-bg-primary);
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

      .back-link {
        margin-bottom: var(--space-6);

        a {
          color: var(--color-text-secondary);
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          transition: color var(--transition-fast);

          &:hover {
            color: var(--color-primary);
          }
        }
      }

      .job-header-card {
        margin-bottom: var(--space-6);
      }

      .job-header {
        .job-title {
          font-family: var(--font-heading);
          font-size: var(--text-3xl);
          font-weight: var(--font-bold);
          color: var(--color-text-primary);
          margin-bottom: var(--space-2);
          line-height: 1.2;
        }

        .job-title-en {
          font-size: var(--text-lg);
          color: var(--color-text-secondary);
          margin-bottom: var(--space-4);
        }

        .job-meta {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-4);
          margin-bottom: var(--space-4);

          .meta-item {
            display: inline-flex;
            align-items: center;
            gap: var(--space-1);
            color: var(--color-text-secondary);
            font-size: var(--text-sm);
          }
        }

        .salary-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          background: var(--color-success-50, #f6ffed);
          color: var(--color-success);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-lg);
          font-weight: var(--font-semibold);
          font-size: var(--text-lg);
        }
      }

      .content-card {
        margin-bottom: var(--space-6);

        h3 {
          font-family: var(--font-heading);
          font-size: var(--text-xl);
          font-weight: var(--font-semibold);
          color: var(--color-text-primary);
          margin-bottom: var(--space-4);
        }

        .content-text {
          color: var(--color-text-secondary);
          line-height: var(--leading-relaxed);
          white-space: pre-line;
        }
      }

      .skills-section {
        margin-bottom: var(--space-4);

        &:last-child {
          margin-bottom: 0;
        }

        h4 {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          margin-bottom: var(--space-2);
        }

        .skills-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
        }
      }

      .apply-card {
        position: sticky;
        top: calc(var(--header-height) + var(--space-4));

        h3 {
          font-family: var(--font-heading);
          font-size: var(--text-lg);
          font-weight: var(--font-semibold);
          margin-bottom: var(--space-4);
        }

        .login-prompt {
          color: var(--color-text-secondary);
          margin-bottom: var(--space-4);
          font-size: var(--text-sm);
        }

        .applied-btn {
          opacity: 0.7;
          cursor: default;
          color: var(--color-success) !important;
          border-color: var(--color-success) !important;
        }
      }

      .apply-form {
        .form-section {
          margin-bottom: var(--space-6);

          label {
            display: block;
            font-weight: var(--font-medium);
            margin-bottom: var(--space-2);

            .required {
              color: var(--color-error);
            }
          }
        }

        .or-divider {
          text-align: center;
          color: var(--color-text-tertiary);
          font-size: var(--text-sm);
          margin: var(--space-3) 0;
        }
      }

      .mt-4 {
        margin-top: var(--space-4);
      }
    `,
  ],
})
export class JobDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobService = inject(JobService);
  private resumeService = inject(ResumeService);
  private applicationService = inject(ApplicationService);
  private modal = inject(NzModalService);
  private message = inject(NzMessageService);
  authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  job: PublicJob | null = null;
  loading = true;
  error: string | null = null;
  hasApplied = false;

  // Apply modal
  applyModalVisible = false;
  resumes: Resume[] = [];
  selectedResumeId: number | null = null;
  uploadedFiles: NzUploadFile[] = [];
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

    this.jobService.getBySlug(slug).subscribe({
      next: (job) => {
        this.job = job;
        this.loading = false;
        this.checkAppliedStatus(job.id);
      },
      error: (err) => {
        this.error = err.error?.detail || 'Không tìm thấy việc làm này';
        this.loading = false;
      },
    });
  }

  private checkAppliedStatus(jobId: number): void {
    if (!this.authService.isAuthenticated()) return;
    this.applicationService.getAppliedJobIds().subscribe({
      next: (ids) => {
        this.hasApplied = ids.includes(jobId);
      },
      error: () => {},
    });
  }

  openApplyModal(): void {
    this.applyModalVisible = true;
    this.loadResumes();
  }

  closeApplyModal(): void {
    this.applyModalVisible = false;
    this.selectedResumeId = null;
    this.uploadedFiles = [];
    this.coverLetter = '';
  }

  loadResumes(): void {
    this.resumeService.list().subscribe({
      next: (res) => {
        this.resumes = res.items;
        // Auto-select default resume
        const defaultResume = this.resumes.find((r) => r.is_default);
        if (defaultResume) {
          this.selectedResumeId = defaultResume.id;
        }
      },
      error: () => {
        // User might not have any resumes yet
      },
    });
  }

  beforeUpload = (file: NzUploadFile): boolean => {
    // Clear selection when uploading new file
    this.selectedResumeId = null;
    this.uploadedFiles = [file];
    return false; // Prevent auto upload
  };

  onResumeSelect(id: number | null): void {
    if (id) {
      this.uploadedFiles = [];
    }
  }

  canSubmit(): boolean {
    return this.selectedResumeId !== null || this.uploadedFiles.length > 0;
  }

  submitApplication(): void {
    if (!this.job || !this.canSubmit()) return;

    this.submitting = true;
    const formData = new FormData();

    if (this.selectedResumeId) {
      formData.append('resume_id', this.selectedResumeId.toString());
    } else if (this.uploadedFiles.length > 0) {
      formData.append('file', this.uploadedFiles[0] as unknown as File);
    }

    if (this.coverLetter.trim()) {
      formData.append('cover_letter', this.coverLetter.trim());
    }

    this.jobService.apply(this.job.slug, formData).subscribe({
      next: () => {
        this.message.success('Ứng tuyển thành công! Chúng tôi sẽ liên hệ với bạn sớm.');
        this.hasApplied = true;
        this.closeApplyModal();
        this.router.navigate(['/dashboard/applications']);
      },
      error: (err) => {
        this.message.error(err.error?.detail || 'Có lỗi xảy ra, vui lòng thử lại');
        this.submitting = false;
      },
    });
  }

  formatSalary(min?: number, max?: number): string {
    if (min != null && max != null && min > 0 && max > 0) {
      return min === max ? `${min} triệu` : `${min} - ${max} triệu`;
    }
    if (max != null && max > 0) return `Lên đến ${max} triệu`;
    if (min != null && min > 0) return `Từ ${min} triệu`;
    return 'Thỏa thuận';
  }

  getEmploymentTypeLabel(type: string): string {
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

  sanitizeHtml(html: string | null | undefined): string {
    if (!html) return '';
    return this.sanitizer.sanitize(SecurityContext.HTML, html) || '';
  }
}
