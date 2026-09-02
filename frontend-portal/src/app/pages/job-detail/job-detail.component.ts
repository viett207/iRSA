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
  templateUrl: './job-detail.component.html',
  styleUrl: './job-detail.component.scss',
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
