import { Component, OnInit, inject, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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

                  <div class="company-sub-row" style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap;">
                    <span nz-icon nzType="bank" nzTheme="outline" style="color: #1890ff; font-size: 16px;"></span>
                    @if (job.company_code) {
                      <a [routerLink]="['/companies', job.company_code]" style="font-size: 16px; font-weight: 600; color: #1890ff;">
                        {{ job.company_name || 'FBT Telecom' }}
                      </a>
                    } @else {
                      <span style="font-size: 16px; font-weight: 600; color: #262626;">
                        {{ job.company_name || job.department || 'iRSA Tech' }}
                      </span>
                    }
                    <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #52c41a; background: #f6ffed; border: 1px solid #b7eb8f; padding: 1px 8px; border-radius: 12px;">
                      <span nz-icon nzType="check-circle" nzTheme="fill"></span> Đã xác thực
                    </span>
                  </div>

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

              <!-- Company Overview Card -->
              <nz-card class="company-sidebar-card" style="margin-top: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                  <div style="width: 44px; height: 44px; border-radius: 8px; background: linear-gradient(135deg, #1890ff, #722ed1); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700;">
                    {{ ((job.company_name || 'F').trim()[0] || 'F').toUpperCase() }}
                  </div>
                  <div>
                    <h4 style="margin: 0; font-size: 15px; font-weight: 600;">
                      @if (job.company_code) {
                        <a [routerLink]="['/companies', job.company_code]" style="color: #1890ff;">
                          {{ job.company_name || 'FBT Telecom' }}
                        </a>
                      } @else {
                        {{ job.company_name || 'FBT Telecom' }}
                      }
                    </h4>
                    <span style="font-size: 12px; color: #8c8c8c;">{{ job.company_industry || 'Công nghệ thông tin' }}</span>
                  </div>
                </div>
                @if (job.company_location || job.location) {
                  <p style="margin: 0 0 10px 0; font-size: 13px; color: #595959;">
                    <span nz-icon nzType="environment" nzTheme="outline" style="margin-right: 6px; color: #8c8c8c;"></span>
                    {{ job.company_location || job.location }}
                  </p>
                }
                @if (job.company_code) {
                  <a [routerLink]="['/companies', job.company_code]" nz-button nzType="default" nzBlock nzSize="small" style="margin-top: 8px; border-radius: 6px;">
                    <span nz-icon nzType="shop" nzTheme="outline"></span> Xem tất cả việc làm công ty
                  </a>
                }
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
    const extension = file.name.toLowerCase().split('.').pop();
    if (!extension || !['pdf', 'doc', 'docx'].includes(extension)) {
      this.message.error('Định dạng CV không được hỗ trợ. Vui lòng sử dụng PDF, DOC hoặc DOCX.');
      return false;
    }
    if ((file.size ?? 0) > 5 * 1024 * 1024) {
      this.message.error('Dung lượng CV vượt quá 5 MB. Vui lòng chọn file nhỏ hơn.');
      return false;
    }
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
      const upload = this.uploadedFiles[0];
      const rawFile = upload.originFileObj ?? (upload as unknown as File);
      formData.append('file', rawFile, upload.name);
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
      error: (err: HttpErrorResponse) => {
        this.message.error(this.getApplicationErrorMessage(err));
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
    if (typeof detail === 'object' && detail?.message) return detail.message;
    if (typeof detail === 'string') return detail;
    return 'Không thể gửi hồ sơ. Vui lòng thử lại.';
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
