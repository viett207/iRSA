import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzSliderModule } from 'ng-zorro-antd/slider';

import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzAlertModule } from 'ng-zorro-antd/alert';

import { JobService } from '../../services/job.service';
import {
  Job,
  JobCreate,
  JobUpdate,
  EMPLOYMENT_TYPE_LABELS,
  EDUCATION_LABELS,
  VIETNAM_LOCATIONS,
} from '../../models/job.model';
import { VIETNAMESE_INDUSTRIES } from '../../../../shared/constants/vietnamese-industries';
import { CompanyService } from '../../../../core/services/company.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Company } from '../../../../pages/companies/models/company-api.model';

@Component({
  selector: 'app-job-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzSelectModule,
    NzDatePickerModule,
    NzTabsModule,
    NzTagModule,
    NzInputNumberModule,
    NzSpinModule,
    NzCardModule,
    NzGridModule,
    NzIconModule,
    NzToolTipModule,
    NzDividerModule,
    NzStepsModule,
    NzSliderModule,
    NzUploadModule,
    NzAlertModule,
  ],
  templateUrl: './job-form.component.html',
  styleUrl: './job-form.component.scss',
})
export class JobFormComponent implements OnInit {
  form!: FormGroup;
  loading = signal(false);
  saving = signal(false);
  currentStep = 0;

  // AI JD Upload & Parsing state
  parsingJd = signal(false);
  uploadedJdFilename = signal<string | null>(null);
  parsedSummary = signal<{ skillsCount: number; exp: number } | null>(null);
  isDragOver = false;

  jobId: number | null = null;
  job: Job | null = null;
  companyList = signal<Company[]>([]);

  isEditMode = computed(() => !!this.jobId);

  employmentTypes = Object.entries(EMPLOYMENT_TYPE_LABELS).map(
    ([value, label]) => ({ value, label })
  );

  educationLevels = Object.entries(EDUCATION_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  locations = VIETNAM_LOCATIONS;
  industries = VIETNAMESE_INDUSTRIES;

  constructor(
    private fb: FormBuilder,
    private jobService: JobService,
    private companyService: CompanyService,
    private authService: AuthService,
    private message: NzMessageService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCompanies();
    this.prefillCompany();
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.jobId = +params['id'];
        this.loadJob();
      }
    });
  }

  private initForm(): void {
    this.form = this.fb.group({
      title_vi: ['', [Validators.required, Validators.maxLength(255)]],
      description_vi: [''],
      requirements_vi: [''],
      company_code: [null, Validators.required],
      department: [null],
      location: [null],
      employment_type: [null],
      salary_min: [null],
      salary_max: [null],
      application_deadline: [null],
      must_have_skills: [[]],
      nice_to_have_skills: [[]],
      min_experience_years: [0],
      max_experience_years: [null],
      min_education: [null],
      weight_skills: [60],
      weight_experience: [30],
      weight_education: [10],
    });
  }

  private loadCompanies(): void {
    this.companyService.list({ page_size: 100 }).subscribe({
      next: (response) => this.companyList.set(response.items),
      error: () => this.companyList.set([]),
    });
  }

  private prefillCompany(): void {
    const currentUser = this.authService.user();
    if (currentUser?.role !== 'admin' && currentUser?.company_code) {
      this.form.patchValue({ company_code: currentUser.company_code });
      this.form.get('company_code')?.disable();
    }
  }

  private loadJob(): void {
    if (!this.jobId) return;
    this.loading.set(true);
    this.jobService.get(this.jobId).subscribe({
      next: (job) => {
        this.job = job;
        this.patchForm(job);
        this.loading.set(false);
      },
      error: () => {
        this.message.error('Không thể tải thông tin việc làm');
        this.loading.set(false);
        this.router.navigate(['/jobs']);
      },
    });
  }

  private patchForm(job: Job): void {
    this.form.patchValue({
      title_vi: job.title_vi,
      description_vi: job.description_vi,
      requirements_vi: job.requirements_vi,
      company_code: job.company_code ?? null,
      department: job.department,
      location: job.location,
      employment_type: job.employment_type,
      salary_min: job.salary_min ?? null,
      salary_max: job.salary_max ?? null,
      application_deadline: job.application_deadline ? new Date(job.application_deadline) : null,
    });

    if (job.criteria) {
      this.form.patchValue({
        must_have_skills: job.criteria.must_have_skills || [],
        nice_to_have_skills: job.criteria.nice_to_have_skills || [],
        min_experience_years: job.criteria.min_experience_years,
        max_experience_years: job.criteria.max_experience_years,
        min_education: job.criteria.min_education,
        weight_skills: job.criteria.weight_skills ?? 60,
        weight_experience: job.criteria.weight_experience ?? 30,
        weight_education: job.criteria.weight_education ?? 10,
      });
    }
  }

  private buildPayload(): JobCreate | JobUpdate {
    const v = this.form.getRawValue();
    return {
      title_vi: v.title_vi,
      description_vi: v.description_vi || undefined,
      requirements_vi: v.requirements_vi || undefined,
      company_code: v.company_code || undefined,
      department: v.department || undefined,
      location: v.location || undefined,
      employment_type: v.employment_type || undefined,
      salary_min: v.salary_min ?? undefined,
      salary_max: v.salary_max ?? undefined,
      application_deadline: v.application_deadline ? this.formatDate(v.application_deadline) : undefined,
      criteria: {
        must_have_skills: Array.isArray(v.must_have_skills)
          ? v.must_have_skills.map((s: any) => String(s).trim()).filter((s: string) => !!s)
          : [],
        nice_to_have_skills: Array.isArray(v.nice_to_have_skills)
          ? v.nice_to_have_skills.map((s: any) => String(s).trim()).filter((s: string) => !!s)
          : [],
        min_experience_years: v.min_experience_years != null ? +v.min_experience_years : 0,
        max_experience_years: v.max_experience_years ? +v.max_experience_years : undefined,
        min_education: v.min_education || undefined,
        weight_skills: +v.weight_skills,
        weight_experience: +v.weight_experience,
        weight_education: +v.weight_education,
      },
    };
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  nextStep(): void {
    if (this.currentStep === 0) {
      if (!this.form.get('title_vi')?.valid) {
        this.form.get('title_vi')?.markAsTouched();
        this.message.warning('Vui lòng nhập tiêu đề tiếng Việt');
        return;
      }
    }
    if (this.currentStep === 1) {
      if (this.getWeightsTotal() !== 100) {
        this.message.warning('Tổng trọng số phải bằng 100%');
        return;
      }
    }
    this.currentStep++;
    window.scrollTo(0, 0);
  }

  prevStep(): void {
    this.currentStep--;
    window.scrollTo(0, 0);
  }

  saveDraft(): void {
    if (this.form.get('title_vi')?.invalid) {
      this.form.get('title_vi')?.markAsTouched();
      this.message.warning('Vui lòng nhập tiêu đề');
      return;
    }
    if (this.form.get('company_code')?.invalid) {
      this.form.get('company_code')?.markAsTouched();
      this.message.warning('Vui lòng chọn công ty đăng tuyển');
      return;
    }
    this.saving.set(true);
    const payload = this.buildPayload();
    const request$ = this.isEditMode()
      ? this.jobService.update(this.jobId!, payload)
      : this.jobService.create(payload as JobCreate);

    request$.subscribe({
      next: (job) => {
        this.message.success('Đã lưu bản nháp');
        this.saving.set(false);
        if (!this.isEditMode()) this.router.navigate(['/jobs', job.id, 'edit']);
      },
      error: () => {
        this.message.error('Không thể lưu');
        this.saving.set(false);
      },
    });
  }

  saveAndSubmit(): void {
    if (this.form.get('title_vi')?.invalid) {
      this.form.get('title_vi')?.markAsTouched();
      this.message.warning('Vui lòng nhập tiêu đề');
      return;
    }
    if (this.form.get('company_code')?.invalid) {
      this.form.get('company_code')?.markAsTouched();
      this.message.warning('Vui lòng chọn công ty đăng tuyển');
      return;
    }
    if (this.getWeightsTotal() !== 100) {
      this.currentStep = 1;
      this.message.warning('Tổng trọng số sàng lọc phải bằng 100%');
      return;
    }
    this.saving.set(true);
    const payload = this.buildPayload();
    const save$ = this.isEditMode()
      ? this.jobService.update(this.jobId!, payload)
      : this.jobService.create(payload as JobCreate);

    save$.subscribe({
      next: (job) => {
        this.jobService.submit(job.id).subscribe({
          next: () => {
            this.message.success('Đã gửi yêu cầu phê duyệt');
            this.saving.set(false);
            this.router.navigate(['/jobs', job.id]);
          },
          error: () => {
            this.message.error('Không thể gửi yêu cầu phê duyệt');
            this.saving.set(false);
          },
        });
      },
      error: () => {
        this.message.error('Không thể lưu');
        this.saving.set(false);
      },
    });
  }

  getWeightsTotal(): number {
    const s = this.form.get('weight_skills')?.value ?? 0;
    const e = this.form.get('weight_experience')?.value ?? 0;
    const d = this.form.get('weight_education')?.value ?? 0;
    return s + e + d;
  }

  onWeightChange(changed: string): void {
    const fields = ['weight_skills', 'weight_experience', 'weight_education'];
    const values: Record<string, number> = {};
    for (const f of fields) {
      values[f] = this.form.get(f)?.value ?? 0;
    }

    const total = values['weight_skills'] + values['weight_experience'] + values['weight_education'];
    if (total === 100) return;

    // Auto-adjust: distribute the difference to the other two fields proportionally
    const others = fields.filter(f => f !== changed);
    const othersSum = others.reduce((sum, f) => sum + values[f], 0);
    const remainder = 100 - values[changed];

    if (othersSum === 0) {
      // Split remainder evenly between the other two
      const half = Math.round(remainder / 2);
      this.form.patchValue({
        [others[0]]: half,
        [others[1]]: remainder - half,
      }, { emitEvent: false });
    } else {
      // Distribute proportionally
      const first = Math.round((values[others[0]] / othersSum) * remainder);
      this.form.patchValue({
        [others[0]]: first,
        [others[1]]: remainder - first,
      }, { emitEvent: false });
    }
  }

  onBack(): void {
    this.router.navigate(['/jobs']);
  }

  // --- AI JD Upload & Autofill Handlers ---

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.processJdFile(file);
      input.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.processJdFile(file);
    }
  }

  processJdFile(file: File): void {
    const fn = file.name.toLowerCase();
    if (!fn.endsWith('.pdf') && !fn.endsWith('.docx') && !fn.endsWith('.doc')) {
      this.message.error('Vui lòng chọn file Word (.docx, .doc) hoặc file PDF (.pdf)');
      return;
    }

    this.parsingJd.set(true);
    this.jobService.parseJdFile(file).subscribe({
      next: (res) => {
        this.parsingJd.set(false);
        this.uploadedJdFilename.set(res.filename);

        const d = res.data;
        if (!d) {
          this.message.warning('Không tìm thấy thông tin phù hợp trong file JD');
          return;
        }

        // Auto-fill basic info
        const patchData: Record<string, any> = {};
        if (d.title_vi) patchData['title_vi'] = d.title_vi;
        if (d.department) patchData['department'] = d.department;
        if (d.location) patchData['location'] = d.location;
        if (d.employment_type) patchData['employment_type'] = d.employment_type;
        if (d.salary_min != null) patchData['salary_min'] = d.salary_min;
        if (d.salary_max != null) patchData['salary_max'] = d.salary_max;
        if (d.description_vi) patchData['description_vi'] = d.description_vi;
        if (d.requirements_vi) patchData['requirements_vi'] = d.requirements_vi;

        // Auto-fill screening criteria
        if (d.criteria) {
          if (Array.isArray(d.criteria.must_have_skills)) {
            patchData['must_have_skills'] = d.criteria.must_have_skills;
          }
          if (Array.isArray(d.criteria.nice_to_have_skills)) {
            patchData['nice_to_have_skills'] = d.criteria.nice_to_have_skills;
          }
          if (d.criteria.min_experience_years != null) {
            patchData['min_experience_years'] = d.criteria.min_experience_years;
          }
          if (d.criteria.max_experience_years != null) {
            patchData['max_experience_years'] = d.criteria.max_experience_years;
          }
          if (d.criteria.min_education) {
            patchData['min_education'] = d.criteria.min_education;
          }
        }

        this.form.patchValue(patchData);

        const mustCount = d.criteria?.must_have_skills?.length || 0;
        const niceCount = d.criteria?.nice_to_have_skills?.length || 0;
        this.parsedSummary.set({
          skillsCount: mustCount + niceCount,
          exp: d.criteria?.min_experience_years || 0,
        });

        this.message.success(
          `✨ AI đã trích xuất thông tin từ JD thành công (${mustCount + niceCount} kỹ năng gợi ý)! Bạn có thể kiểm tra và tùy chỉnh lại các tiêu chí bên dưới.`,
          { nzDuration: 5500 }
        );
      },
      error: (err) => {
        this.parsingJd.set(false);
        const detail = err?.error?.detail || 'Không thể trích xuất nội dung từ file JD. Vui lòng kiểm tra lại file.';
        this.message.error(detail);
      },
    });
  }

  clearJdUpload(): void {
    this.uploadedJdFilename.set(null);
    this.parsedSummary.set(null);
  }
}
