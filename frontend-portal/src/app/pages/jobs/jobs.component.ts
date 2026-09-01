import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError } from 'rxjs/operators';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastService } from '../../core/services/toast.service';

import { JobService } from '../../core/services/job.service';
import { ApplicationService } from '../../core/services/application.service';
import { AuthService } from '../../core/auth/auth.service';
import { PublicJobListItem, ActiveCompany, PublicJob } from '../../shared/models/job.model';
import { VIETNAMESE_INDUSTRIES } from '../../shared/constants/vietnamese-industries';

interface Job {
  id: number;
  slug: string;
  title: string;
  company: string;
  companyCode?: string;
  companyInitial: string;
  companyGradient: string;
  department?: string;
  location: string;
  type: string;
  employmentTypeValue: string;
  experience: string;
  minExperienceYears?: number;
  maxExperienceYears?: number;
  skills: string[];
  salaryMin?: number;
  salaryMax?: number;
  salaryLabel: string;
  salaryFormatted: string;
  postedDate: string;
  deadlineDate?: string;
  applicants: number;
  descriptionSnippet: string;
  descriptionVi?: string;
  isHot?: boolean;
  isNew?: boolean;
  isApplied?: boolean;
  isSaved?: boolean;
}

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    NzGridModule,
    NzCardModule,
    NzInputModule,
    NzButtonModule,
    NzSelectModule,
    NzCheckboxModule,
    NzRadioModule,
    NzTagModule,
    NzIconModule,
    NzBadgeModule,
    NzEmptyModule,
    NzPaginationModule,
    NzDrawerModule,
    NzSpinModule,
    NzSkeletonModule,
    NzAutocompleteModule,
    NzSliderModule,
    NzToolTipModule,
    NzDividerModule,
    NzSegmentedModule,
  ],
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.scss'],
})
export class JobsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobService = inject(JobService);
  private applicationService = inject(ApplicationService);
  public authService = inject(AuthService);
  public translate = inject(TranslateService);
  private message = inject(ToastService);

  appliedJobIds = new Set<number>();
  savedJobIds = new Set<number>();
  private searchSubject = new Subject<string>();
  private suggestionSubject = new Subject<string>();

  // Filter models
  searchQuery = '';
  selectedLocation = '';
  selectedCategory: string | null = null;
  selectedSalaryPreset: string = 'all';
  companyCodeFilter: string | null = null;
  postedDateFilter: string = 'all';
  onlySavedFilter = false;
  sortBy = 'newest';
  salaryRange: [number, number] = [0, 100];
  currentPage = 1;
  pageSize = 20;

  // View mode: 'grid' (widescreen 2-col cards) or 'split' (master-detail with sticky live preview)
  viewMode: 'grid' | 'split' = 'grid';
  selectedJobForPreview: Job | null = null;
  previewJobDetail: PublicJob | null = null;
  previewLoading = false;

  // Drawer for mobile / quick preview
  filterDrawerOpen = false;
  quickPreviewDrawerOpen = false;
  quickPreviewJob: Job | null = null;

  loading = false;
  totalJobs = 0;
  animatedTotalJobs = 0;
  suggestions: PublicJobListItem[] = [];
  suggestionsLoading = false;
  allActiveCompanies: ActiveCompany[] = [];
  filteredCompanies: ActiveCompany[] = [];

  locations = [
    'Hồ Chí Minh',
    'Hà Nội',
    'Đà Nẵng',
    'Cần Thơ',
    'Hải Phòng',
    'Bình Dương',
    'Đồng Nai',
  ];

  jobTypes = [
    { value: 'full_time', label: 'Toàn thời gian', checked: false, icon: 'clock-circle' },
    { value: 'part_time', label: 'Bán thời gian', checked: false, icon: 'hourglass' },
    { value: 'contract', label: 'Hợp đồng / Dự án', checked: false, icon: 'file-protect' },
    { value: 'internship', label: 'Thực tập / Fresher', checked: false, icon: 'schedule' },
  ];

  experienceLevels = [
    { value: 'entry', label: 'Mới tốt nghiệp / Chưa có KN', min: 0, max: 0, checked: false },
    { value: 'junior', label: '1 - 2 năm (Junior)', min: 1, max: 2, checked: false },
    { value: 'mid', label: '3 - 5 năm (Mid-level)', min: 3, max: 5, checked: false },
    { value: 'senior', label: '5+ năm (Senior)', min: 5, max: undefined, checked: false },
    { value: 'manager', label: 'Quản lý / Trưởng nhóm', min: 7, max: undefined, checked: false },
  ];

  categories = VIETNAMESE_INDUSTRIES.map((ind) => ({
    value: ind,
    label: ind,
    checked: false,
  }));

  quickChips = [
    { id: 'hot', label: 'Tuyển gấp', active: false },
    { id: 'new', label: 'Mới đăng 24h', active: false },
    { id: 'high_salary', label: 'Lương > 30 triệu', active: false },
    { id: 'hcm', label: 'TP. Hồ Chí Minh', active: false },
    { id: 'hanoi', label: 'Hà Nội', active: false },
    { id: 'fulltime', label: 'Toàn thời gian', active: false },
    { id: 'fresher', label: 'Fresher / Thực tập', active: false },
    { id: 'senior', label: 'Senior (5+ năm)', active: false },
  ];

  salaryPresets = [
    { label: 'Tất cả', value: 'all', range: [0, 100] as [number, number] },
    { label: '< 15 triệu', value: 'under_15', range: [0, 15] as [number, number] },
    { label: '15 - 30 triệu', value: '15_30', range: [15, 30] as [number, number] },
    { label: '30 - 50 triệu', value: '30_50', range: [30, 50] as [number, number] },
    { label: '> 50 triệu', value: 'over_50', range: [50, 100] as [number, number] },
  ];

  jobs: Job[] = [];
  apiJobs: PublicJobListItem[] = [];

  private avatarGradients = [
    'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary-dark) 100%)',
    'linear-gradient(135deg, var(--color-primary-cyan) 0%, var(--color-primary-dark) 100%)',
    'linear-gradient(135deg, var(--color-success-light) 0%, var(--color-success-dark) 100%)',
    'linear-gradient(135deg, var(--color-warning-light) 0%, var(--color-warning-dark) 100%)',
    'linear-gradient(135deg, var(--color-secondary-light) 0%, var(--color-secondary-dark) 100%)',
    'linear-gradient(135deg, var(--color-danger-light) 0%, var(--color-danger-dark) 100%)',
    'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary-dark) 100%)',
    'linear-gradient(135deg, var(--color-warning) 0%, var(--color-warning-dark) 100%)',
  ];

  get filteredJobs(): Job[] {
    if (this.onlySavedFilter) {
      return this.jobs.filter((j) => this.savedJobIds.has(j.id));
    }
    return this.jobs;
  }

  get paginatedJobs(): Job[] {
    return this.filteredJobs;
  }

  ngOnInit(): void {
    this.loadSavedJobIds();
    this.loadAppliedJobIds();
    this.loadActiveCompanies();

    // Responsive default view mode: wide screens default to split or grid
    if (window.innerWidth >= 1440) {
      // default grid for wide screen, user can easily toggle
    }

    this.searchSubject
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadJobs();
      });

    this.suggestionSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap((query) => {
          if (!query || query.trim().length < 2) {
            this.suggestions = [];
            this.suggestionsLoading = false;
          } else {
            this.suggestionsLoading = true;
          }
        }),
        switchMap((query) => {
          if (!query || query.trim().length < 2) {
            return of({ items: [] as PublicJobListItem[] });
          }
          return this.jobService.list({ q: query.trim(), size: 6 }).pipe(
            catchError(() => of({ items: [] as PublicJobListItem[] }))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          this.suggestions = res.items || [];
          this.suggestionsLoading = false;
        },
        error: () => {
          this.suggestions = [];
          this.suggestionsLoading = false;
        },
      });

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const categoryParam = params['category'] || params['department'];
      if (categoryParam) {
        this.selectedCategory = categoryParam;
        const cat = this.categories.find((c) => c.value === categoryParam);
        if (cat) cat.checked = true;
      }
      if (params['location']) {
        this.selectedLocation = params['location'];
      }
      if (params['q']) {
        this.searchQuery = params['q'];
      }
      if (params['company_code']) {
        this.companyCodeFilter = params['company_code'];
      } else {
        this.companyCodeFilter = null;
      }
      if (params['salary_min'] || params['salary_max']) {
        const min = params['salary_min'] ? parseInt(params['salary_min'], 10) : 0;
        const max = params['salary_max'] ? parseInt(params['salary_max'], 10) : 100;
        this.salaryRange = [min, max];
      }
      this.loadJobs();
    });
  }

  loadSavedJobIds(): void {
    try {
      const raw = localStorage.getItem('irsa_saved_job_ids');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.savedJobIds = new Set(parsed);
        }
      }
    } catch {
      this.savedJobIds = new Set();
    }
  }

  toggleSaveJob(event: Event, job: Job): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.savedJobIds.has(job.id)) {
      this.savedJobIds.delete(job.id);
      job.isSaved = false;
      this.message.info('Đã bỏ lưu tin tuyển dụng');
    } else {
      this.savedJobIds.add(job.id);
      job.isSaved = true;
      this.message.success('Đã lưu tin tuyển dụng vào danh sách yêu thích');
    }
    try {
      localStorage.setItem('irsa_saved_job_ids', JSON.stringify(Array.from(this.savedJobIds)));
    } catch {}
  }

  loadActiveCompanies(): void {
    this.jobService.listActiveCompanies(50).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.allActiveCompanies = res.items || [];
        this.filteredCompanies = res.items || [];
      },
      error: () => {},
    });
  }

  onCompanySearch(term: string): void {
    if (!term) {
      this.filteredCompanies = this.allActiveCompanies;
      return;
    }
    const lower = term.toLowerCase();
    this.filteredCompanies = this.allActiveCompanies.filter(
      (c) => c.company_name.toLowerCase().includes(lower)
    );
  }

  loadAppliedJobIds(): void {
    if (!this.authService.isAuthenticated()) return;
    this.applicationService.getAppliedJobIds().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (ids) => {
        this.appliedJobIds = new Set(ids);
        this.jobs.forEach((j) => (j.isApplied = this.appliedJobIds.has(j.id)));
      },
      error: () => {},
    });
  }

  loadJobs(): void {
    this.loading = true;
    const selectedType = this.jobTypes.find((t) => t.checked);
    const expParams = this.getExperienceParams();

    // Map backend supported order_by values
    let backendOrderBy: string | undefined = undefined;
    if (['salary_desc', 'salary_asc', 'popular'].includes(this.sortBy)) {
      backendOrderBy = this.sortBy;
    }

    this.jobService
      .list({
        q: this.searchQuery ? this.searchQuery.trim() : undefined,
        location: this.selectedLocation || undefined,
        employment_type: selectedType?.value,
        department: this.selectedCategory || undefined,
        company_code: this.companyCodeFilter || undefined,
        salary_min: this.salaryRange[0] > 0 ? this.salaryRange[0] : undefined,
        salary_max: this.salaryRange[1] < 100 ? this.salaryRange[1] : undefined,
        ...expParams,
        order_by: backendOrderBy,
        page: this.currentPage,
        size: this.pageSize,
      })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          this.apiJobs = res.items || [];
          this.totalJobs = res.total || 0;
          this.animateTotalJobs(this.totalJobs);
          this.jobs = this.mapApiJobsToDisplay(this.apiJobs);
          this.applySorting();
          this.loading = false;

          // If in split mode and no job selected or current selection not in list, select first
          if (this.viewMode === 'split' && this.jobs.length > 0) {
            if (!this.selectedJobForPreview || !this.jobs.some((j) => j.id === this.selectedJobForPreview?.id)) {
              this.selectJobForLivePreview(this.jobs[0]);
            }
          }
        },
        error: () => {
          this.loading = false;
          this.jobs = [];
          this.totalJobs = 0;
          this.animatedTotalJobs = 0;
        },
      });
  }

  private animateTotalJobs(target: number): void {
    if (target <= 0) {
      this.animatedTotalJobs = 0;
      return;
    }
    const start = this.animatedTotalJobs;
    const duration = 600;
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      this.animatedTotalJobs = Math.round(start + (target - start) * eased);
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };
    requestAnimationFrame(update);
  }

  private applySorting(): void {
    if (!this.jobs || this.jobs.length <= 1) return;

    switch (this.sortBy) {
      case 'popular': // Nhiều ứng viên nhất
        this.jobs.sort((a, b) => (b.applicants || 0) - (a.applicants || 0));
        break;
      case 'least_applicants': // Ít ứng viên nhất
        this.jobs.sort((a, b) => (a.applicants || 0) - (b.applicants || 0));
        break;
      case 'full_time_first': // Toàn thời gian trước
        this.jobs.sort((a, b) => {
          const aIsFt = (a.employmentTypeValue === 'full_time' || a.type.toLowerCase().includes('toàn thời gian')) ? 1 : 0;
          const bIsFt = (b.employmentTypeValue === 'full_time' || b.type.toLowerCase().includes('toàn thời gian')) ? 1 : 0;
          return bIsFt - aIsFt;
        });
        break;
      case 'part_time_first': // Bán thời gian trước
        this.jobs.sort((a, b) => {
          const aIsPt = (a.employmentTypeValue === 'part_time' || a.type.toLowerCase().includes('bán thời gian')) ? 1 : 0;
          const bIsPt = (b.employmentTypeValue === 'part_time' || b.type.toLowerCase().includes('bán thời gian')) ? 1 : 0;
          return bIsPt - aIsPt;
        });
        break;
      case 'salary_desc': // Lương cao nhất
        this.jobs.sort((a, b) => (b.salaryMax || b.salaryMin || 0) - (a.salaryMax || a.salaryMin || 0));
        break;
      case 'salary_asc': // Lương thấp nhất
        this.jobs.sort((a, b) => (a.salaryMin || a.salaryMax || 0) - (b.salaryMin || b.salaryMax || 0));
        break;
      default:
        break;
    }
  }

  private mapApiJobsToDisplay(apiJobs: PublicJobListItem[]): Job[] {
    return apiJobs.map((j) => {
      const companyName = j.company_name || (j.company_code ? j.company_code : '');
      const initial = (companyName.trim()[0] || (j.department ? j.department.trim()[0] : 'J')).toUpperCase();
      const gradient = this.getGradientForString(companyName || j.title_vi);
      const isNew = this.isNewToday(j.published_at);
      const isHot = (j.applications_count && j.applications_count >= 5) || false;

      // Clean snippet from description if provided
      let snippet = '';
      if (j.description_vi) {
        snippet = j.description_vi.replace(/<[^>]*>/g, '').trim();
        if (snippet.length > 130) {
          snippet = snippet.substring(0, 127) + '...';
        }
      }
      if (!snippet) {
        const placeName = companyName || 'doanh nghiệp';
        snippet = `Cơ hội làm việc tại ${placeName} với mức đãi ngộ hấp dẫn, môi trường chuyên nghiệp, phát triển kỹ năng vượt trội.`;
      }

      const skills = (j.must_have_skills && j.must_have_skills.length > 0)
        ? j.must_have_skills.slice(0, 4)
        : this.generateFallbackSkills(j.title_vi);

      return {
        id: j.id,
        slug: j.slug || j.id.toString(),
        title: j.title_vi,
        company: companyName,
        companyCode: j.company_code ?? undefined,
        companyInitial: initial,
        companyGradient: gradient,
        department: j.department || undefined,
        location: j.location || 'Việt Nam',
        type: this.getEmploymentTypeLabel(j.employment_type),
        employmentTypeValue: j.employment_type || 'full_time',
        experience: this.formatExperienceLabel(j.min_experience_years, j.max_experience_years),
        minExperienceYears: j.min_experience_years ?? undefined,
        maxExperienceYears: j.max_experience_years ?? undefined,
        skills,
        salaryMin: j.salary_min ?? undefined,
        salaryMax: j.salary_max ?? undefined,
        salaryLabel: this.formatSalaryLabel(j.salary_min, j.salary_max),
        salaryFormatted: this.formatSalaryFormatted(j.salary_min, j.salary_max),
        postedDate: this.formatDate(j.published_at),
        deadlineDate: j.application_deadline ? this.formatDeadline(j.application_deadline) : undefined,
        applicants: j.applications_count || 0,
        descriptionSnippet: snippet,
        descriptionVi: j.description_vi ?? undefined,
        isHot,
        isNew,
        isApplied: this.appliedJobIds.has(j.id),
        isSaved: this.savedJobIds.has(j.id),
      };
    });
  }

  private generateFallbackSkills(title: string): string[] {
    const t = title.toLowerCase();
    if (t.includes('frontend') || t.includes('react') || t.includes('angular') || t.includes('vue')) {
      return ['TypeScript', 'Frontend', 'REST API', 'Git'];
    }
    if (t.includes('backend') || t.includes('python') || t.includes('java') || t.includes('golang') || t.includes('node')) {
      return ['Backend', 'SQL', 'Database', 'Microservices'];
    }
    if (t.includes('ai') || t.includes('data') || t.includes('machine learning')) {
      return ['Python', 'AI/ML', 'Data Analysis', 'LLM'];
    }
    if (t.includes('design') || t.includes('ui') || t.includes('ux')) {
      return ['Figma', 'UI/UX', 'Design System', 'Prototyping'];
    }
    if (t.includes('marketing') || t.includes('sale') || t.includes('kinh doanh')) {
      return ['Communication', 'Marketing', 'Planning', 'Teamwork'];
    }
    return ['Chuyên môn', 'Kỹ năng mềm', 'Làm việc nhóm'];
  }

  private getGradientForString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % this.avatarGradients.length;
    return this.avatarGradients[index];
  }

  private formatSalaryLabel(min?: number | null, max?: number | null): string {
    if (min != null && max != null) {
      return min === max ? `${min} triệu` : `${min} - ${max} triệu`;
    }
    if (min != null) return `Từ ${min} triệu`;
    if (max != null) return `Tới ${max} triệu`;
    return 'Thương lượng';
  }

  private formatSalaryFormatted(min?: number | null, max?: number | null): string {
    if (min != null && max != null) {
      return min === max ? `${min} triệu VNĐ` : `${min} - ${max} triệu VNĐ`;
    }
    if (min != null) return `Từ ${min} triệu VNĐ`;
    if (max != null) return `Đến ${max} triệu VNĐ`;
    return 'Thoả thuận';
  }

  private formatExperienceLabel(min?: number | null, max?: number | null): string {
    if (min != null && max != null) {
      if (min === 0 && max === 0) return 'Không yêu cầu KN';
      return `${min} - ${max} năm KN`;
    }
    if (min != null && min > 0) return `${min}+ năm KN`;
    if (min === 0) return 'Không yêu cầu KN';
    return 'Không yêu cầu KN';
  }

  private getEmploymentTypeLabel(type?: string | null): string {
    const labels: Record<string, string> = {
      full_time: 'Toàn thời gian',
      part_time: 'Bán thời gian',
      contract: 'Hợp đồng',
      internship: 'Thực tập / Fresher',
    };
    return labels[type || ''] || type || 'Toàn thời gian';
  }

  private formatDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa đăng';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days <= 7) return `${days} ngày trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatDeadline(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  private isNewToday(dateStr?: string | null): boolean {
    if (!dateStr) return false;
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff < 48 * 60 * 60 * 1000;
  }

  private getExperienceParams(): { min_experience?: number; max_experience?: number } {
    const selected = this.experienceLevels.filter((e) => e.checked);
    if (selected.length === 0) return {};

    const ranges: Record<string, [number, number | undefined]> = {
      entry: [0, 0],
      junior: [1, 2],
      mid: [3, 5],
      senior: [5, undefined],
      manager: [7, undefined],
    };

    let minExp = Infinity;
    let maxExp = 0;
    let hasOpenEnd = false;

    for (const sel of selected) {
      const [min, max] = ranges[sel.value] || [0, undefined];
      if (min < minExp) minExp = min;
      if (max === undefined) hasOpenEnd = true;
      else if (max > maxExp) maxExp = max;
    }

    return {
      min_experience: minExp === Infinity ? undefined : minExp,
      max_experience: hasOpenEnd ? undefined : maxExp,
    };
  }

  onSearchInput(query: string): void {
    this.searchSubject.next(query);
    if (!query || query.trim().length < 2) {
      this.suggestions = [];
      this.suggestionsLoading = false;
    }
    this.suggestionSubject.next(query);
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadJobs();
  }

  selectSuggestion(item: PublicJobListItem): void {
    this.searchQuery = item.title_vi;
    this.onSearch();
  }

  onJobTypeChange(selected: { value: string; checked: boolean }): void {
    if (selected.checked) {
      this.jobTypes.forEach((t) => {
        if (t.value !== selected.value) t.checked = false;
      });
    }
    this.currentPage = 1;
    this.loadJobs();
  }

  onExperienceChange(selected: { value: string; checked: boolean }): void {
    if (selected.checked) {
      this.experienceLevels.forEach((e) => {
        if (e.value !== selected.value) e.checked = false;
      });
    }
    this.currentPage = 1;
    this.loadJobs();
  }

  onSalaryPresetSelect(valueOrPreset: string | { label?: string; value: string; range: [number, number] }): void {
    let targetValue = 'all';
    let targetRange: [number, number] = [0, 100];

    if (typeof valueOrPreset === 'string') {
      targetValue = valueOrPreset;
      const found = this.salaryPresets.find((p) => p.value === targetValue);
      if (found) {
        targetRange = [...found.range];
      }
    } else if (valueOrPreset && typeof valueOrPreset === 'object') {
      targetValue = valueOrPreset.value || 'all';
      if (valueOrPreset.range) {
        targetRange = [...valueOrPreset.range];
      }
    }

    this.selectedSalaryPreset = targetValue;
    this.salaryRange = [...targetRange];
    this.currentPage = 1;
    this.loadJobs();
  }

  toggleQuickChip(chip: { id: string; label: string; active: boolean }): void {
    chip.active = !chip.active;
    this.currentPage = 1;

    switch (chip.id) {
      case 'hot':
        this.sortBy = chip.active ? 'popular' : 'newest';
        break;
      case 'new':
        this.sortBy = 'newest';
        break;
      case 'high_salary':
        this.salaryRange = chip.active ? [30, 100] : [0, 100];
        break;
      case 'hcm':
        this.selectedLocation = chip.active ? 'Hồ Chí Minh' : '';
        break;
      case 'hanoi':
        this.selectedLocation = chip.active ? 'Hà Nội' : '';
        break;
      case 'fulltime':
        const ft = this.jobTypes.find((t) => t.value === 'full_time');
        if (ft) ft.checked = chip.active;
        break;
      case 'fresher':
        const entry = this.experienceLevels.find((e) => e.value === 'entry');
        if (entry) entry.checked = chip.active;
        break;
      case 'senior':
        const snr = this.experienceLevels.find((e) => e.value === 'senior');
        if (snr) snr.checked = chip.active;
        break;
    }
    this.loadJobs();
  }

  setViewMode(mode: 'grid' | 'split'): void {
    this.viewMode = mode;
    if (mode === 'split' && this.jobs.length > 0 && !this.selectedJobForPreview) {
      this.selectJobForLivePreview(this.jobs[0]);
    }
  }

  selectJobForLivePreview(job: Job): void {
    this.selectedJobForPreview = job;
    this.previewLoading = true;
    this.previewJobDetail = null;

    this.jobService.getBySlug(job.slug).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.previewJobDetail = res;
        this.previewLoading = false;
      },
      error: () => {
        this.previewLoading = false;
      },
    });
  }

  openQuickPreview(event: Event, job: Job): void {
    event.stopPropagation();
    event.preventDefault();
    this.quickPreviewJob = job;
    this.quickPreviewDrawerOpen = true;
  }

  copyJobLink(job: Job): void {
    const url = `${window.location.origin}/jobs/${job.slug}`;
    navigator.clipboard.writeText(url).then(
      () => this.message.success('Đã sao chép liên kết công việc vào bộ nhớ tạm'),
      () => this.message.error('Không thể sao chép liên kết')
    );
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadJobs();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadJobs();
    window.scrollTo({ top: 380, behavior: 'smooth' });
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadJobs();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedLocation = '';
    this.selectedCategory = null;
    this.selectedSalaryPreset = 'all';
    this.companyCodeFilter = null;
    this.onlySavedFilter = false;
    this.postedDateFilter = 'all';
    this.filteredCompanies = this.allActiveCompanies;
    this.salaryRange = [0, 100];
    this.jobTypes.forEach((t) => (t.checked = false));
    this.experienceLevels.forEach((e) => (e.checked = false));
    this.categories.forEach((c) => (c.checked = false));
    this.quickChips.forEach((c) => (c.active = false));
    this.filterDrawerOpen = false;
    this.currentPage = 1;
    this.loadJobs();
  }

  applyFilters(): void {
    this.filterDrawerOpen = false;
    this.onFilterChange();
  }

  hasActiveFilters(): boolean {
    return (
      !!this.searchQuery ||
      !!this.selectedLocation ||
      !!this.selectedCategory ||
      !!this.companyCodeFilter ||
      this.onlySavedFilter ||
      this.salaryRange[0] > 0 ||
      this.salaryRange[1] < 100 ||
      this.jobTypes.some((t) => t.checked) ||
      this.experienceLevels.some((e) => e.checked) ||
      this.categories.some((c) => c.checked)
    );
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchQuery) count++;
    if (this.selectedLocation) count++;
    if (this.selectedCategory) count++;
    if (this.companyCodeFilter) count++;
    if (this.onlySavedFilter) count++;
    if (this.salaryRange[0] > 0 || this.salaryRange[1] < 100) count++;
    count += this.jobTypes.filter((t) => t.checked).length;
    count += this.experienceLevels.filter((e) => e.checked).length;
    return count;
  }

  getActiveFilters(): Array<{ key: string; value: string; label: string }> {
    const filters: Array<{ key: string; value: string; label: string }> = [];

    if (this.searchQuery) {
      filters.push({ key: 'q', value: this.searchQuery, label: `Từ khóa: "${this.searchQuery}"` });
    }
    if (this.selectedLocation) {
      filters.push({ key: 'location', value: this.selectedLocation, label: `Địa điểm: ${this.selectedLocation}` });
    }
    if (this.selectedCategory) {
      filters.push({ key: 'category', value: this.selectedCategory, label: `Ngành: ${this.selectedCategory}` });
    }
    if (this.companyCodeFilter) {
      const comp = this.allActiveCompanies.find((c) => c.company_code === this.companyCodeFilter);
      filters.push({
        key: 'company',
        value: this.companyCodeFilter,
        label: `Công ty: ${comp?.company_name || this.companyCodeFilter}`,
      });
    }
    if (this.salaryRange[0] > 0 || this.salaryRange[1] < 100) {
      filters.push({
        key: 'salary',
        value: 'range',
        label: `Lương: ${this.salaryRange[0]}tr - ${this.salaryRange[1] === 100 ? '100tr+' : this.salaryRange[1] + 'tr'}`,
      });
    }
    if (this.onlySavedFilter) {
      filters.push({ key: 'onlySaved', value: 'true', label: 'Việc đã lưu' });
    }

    this.jobTypes
      .filter((t) => t.checked)
      .forEach((t) => filters.push({ key: 'jobType', value: t.value, label: t.label }));

    this.experienceLevels
      .filter((e) => e.checked)
      .forEach((e) => filters.push({ key: 'experience', value: e.value, label: e.label }));

    return filters;
  }

  removeFilter(key: string, value: string): void {
    if (key === 'q') {
      this.searchQuery = '';
    } else if (key === 'location') {
      this.selectedLocation = '';
    } else if (key === 'category') {
      this.selectedCategory = null;
    } else if (key === 'company') {
      this.companyCodeFilter = null;
    } else if (key === 'salary') {
      this.salaryRange = [0, 100];
      this.selectedSalaryPreset = 'all';
    } else if (key === 'onlySaved') {
      this.onlySavedFilter = false;
    } else if (key === 'jobType') {
      const type = this.jobTypes.find((t) => t.value === value);
      if (type) type.checked = false;
    } else if (key === 'experience') {
      const exp = this.experienceLevels.find((e) => e.value === value);
      if (exp) exp.checked = false;
    }
    this.onFilterChange();
  }

  navigateToJob(job: Job): void {
    this.router.navigate(['/jobs', job.slug]);
  }
}
