import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, switchMap, tap, catchError } from 'rxjs/operators';
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
import { NzMessageService } from 'ng-zorro-antd/message';

import { JobService } from '../../core/services/job.service';
import { ApplicationService } from '../../core/services/application.service';
import { AuthService } from '../../core/auth/auth.service';
import { PublicJobListItem, ActiveCompany, PublicJob } from '../../shared/models/job.model';
import { VIETNAMESE_INDUSTRIES } from '../../shared/constants/vietnamese-industries';
import { JobsDrawersComponent } from './components/jobs-drawers.component';
import { JobsFilterPanelComponent } from './components/jobs-filter-panel.component';
import { JobsResultsToolbarComponent } from './components/jobs-results-toolbar.component';
import { JobsResultsComponent } from './components/jobs-results.component';
import { JobsSearchHeroComponent } from './components/jobs-search-hero.component';

export interface Job {
  id: number;
  slug: string;
  title: string;
  company: string;
  companyCode?: string;
  companyInitial: string;
  companyGradient: string;
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
    JobsDrawersComponent,
    JobsFilterPanelComponent,
    JobsResultsToolbarComponent,
    JobsResultsComponent,
    JobsSearchHeroComponent,
  ],
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.scss'],
})
export class JobsComponent implements OnInit, OnDestroy {
  readonly view = this;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobService = inject(JobService);
  private applicationService = inject(ApplicationService);
  public authService = inject(AuthService);
  private message = inject(NzMessageService);

  appliedJobIds = new Set<number>();
  savedJobIds = new Set<number>();
  private searchSubject = new Subject<string>();
  private suggestionSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Filter models
  searchQuery = '';
  isKeywordFocused = false;
  selectedLocation = '';
  selectedCategory: string | null = null;
  selectedSalaryPreset: string = 'all';
  companyCodeFilter: string | null = null;
  postedDateFilter: string = 'all';
  onlySavedFilter = false;
  sortBy = 'newest';
  salaryRange: [number, number] = [0, 100];
  currentPage = 1;
  // The desktop results grid has three columns, so keep each page in complete rows.
  pageSize = 18;

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
    { id: 'hot', label: 'Tuyển gấp', nzIcon: 'fire', active: false },
    { id: 'new', label: 'Mới đăng 24h', nzIcon: 'clock-circle', active: false },
    { id: 'high_salary', label: 'Lương >30 triệu', nzIcon: 'dollar', active: false },
    { id: 'hcm', label: 'TP. Hồ Chí Minh', nzIcon: 'environment', active: false },
    { id: 'hanoi', label: 'Hà Nội', nzIcon: 'environment', active: false },
    { id: 'fresher', label: 'Fresher / Thực tập', nzIcon: 'read', active: false },
    { id: 'senior', label: 'Senior (5+ năm)', nzIcon: 'trophy', active: false },
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
    '#18181b',
    '#27272a',
    '#3f3f46',
    '#52525b',
  ];

  get filteredJobs(): Job[] {
    let result = this.jobs;
    if (this.onlySavedFilter) {
      result = result.filter((j) => this.savedJobIds.has(j.id));
    }
    if (this.postedDateFilter === '24h') {
      result = result.filter((j) => j.isNew);
    }
    return result;
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
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
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
        takeUntil(this.destroy$)
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

    this.route.queryParams.subscribe((params) => {
      if (params['category']) {
        this.selectedCategory = params['category'];
        const cat = this.categories.find((c) => c.value === params['category']);
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
      this.syncQuickChipsState();
      this.loadJobs();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.jobService.listActiveCompanies(50).subscribe({
      next: (res) => {
        this.allActiveCompanies = res.items || [];
        this.filteredCompanies = res.items || [];
        const namesByCode = new Map(
          this.allActiveCompanies.map((company) => [company.company_code, company.company_name])
        );
        this.jobs.forEach((job) => {
          const companyName = job.companyCode ? namesByCode.get(job.companyCode) : undefined;
          if (companyName) {
            job.company = companyName;
            job.companyInitial = (companyName.trim()[0] || 'D').toUpperCase();
            job.companyGradient = this.getGradientForString(companyName);
          }
        });
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
    this.applicationService.getAppliedJobIds().subscribe({
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
        order_by: this.sortBy !== 'newest' ? this.sortBy : undefined,
        page: this.currentPage,
        size: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.apiJobs = res.items || [];
          this.totalJobs = res.total || 0;
          this.jobs = this.mapApiJobsToDisplay(this.apiJobs);
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
        },
      });
  }

  private mapApiJobsToDisplay(apiJobs: PublicJobListItem[]): Job[] {
    return apiJobs.map((j) => {
      const activeCompany = this.allActiveCompanies.find(
        (company) => company.company_code === j.company_code
      );
      const companyName = j.company_name || activeCompany?.company_name || j.company_code || 'Doanh nghiệp tuyển dụng';
      const initial = (companyName.trim()[0] || 'I').toUpperCase();
      const gradient = this.getGradientForString(companyName);
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
        snippet = `Cơ hội làm việc tại ${companyName} với mức đãi ngộ hấp dẫn, môi trường chuyên nghiệp, phát triển kỹ năng vượt trội.`;
      }

      const skills = (j.must_have_skills && j.must_have_skills.length > 0)
        ? j.must_have_skills.slice(0, 4)
        : this.generateFallbackSkills(j.title_vi);

      return {
        id: j.id,
        slug: j.slug || j.id.toString(),
        title: j.title_vi,
        company: companyName,
        companyCode: j.company_code,
        companyInitial: initial,
        companyGradient: gradient,
        location: j.location || 'Việt Nam',
        type: this.getEmploymentTypeLabel(j.employment_type),
        employmentTypeValue: j.employment_type || 'full_time',
        experience: this.formatExperienceLabel(j.min_experience_years, j.max_experience_years),
        minExperienceYears: j.min_experience_years,
        maxExperienceYears: j.max_experience_years,
        skills,
        salaryMin: j.salary_min ?? undefined,
        salaryMax: j.salary_max ?? undefined,
        salaryLabel: this.formatSalaryLabel(j.salary_min, j.salary_max),
        salaryFormatted: this.formatSalaryFormatted(j.salary_min, j.salary_max),
        postedDate: this.formatDate(j.published_at),
        deadlineDate: j.application_deadline ? this.formatDeadline(j.application_deadline) : undefined,
        applicants: j.applications_count || 0,
        descriptionSnippet: snippet,
        descriptionVi: j.description_vi,
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

  private formatSalaryLabel(min?: number, max?: number): string {
    if (min != null && max != null) {
      return min === max ? `${min} triệu` : `${min} - ${max} triệu`;
    }
    if (min != null) return `Từ ${min} triệu`;
    if (max != null) return `Tới ${max} triệu`;
    return 'Thương lượng';
  }

  private formatSalaryFormatted(min?: number, max?: number): string {
    if (min != null && max != null) {
      return min === max ? `${min} triệu VNĐ` : `${min} - ${max} triệu VNĐ`;
    }
    if (min != null) return `Từ ${min} triệu VNĐ`;
    if (max != null) return `Đến ${max} triệu VNĐ`;
    return 'Thoả thuận';
  }

  private formatExperienceLabel(min?: number, max?: number): string {
    if (min != null && max != null) {
      if (min === 0 && max === 0) return 'Không yêu cầu KN';
      return `${min} - ${max} năm KN`;
    }
    if (min != null && min > 0) return `${min}+ năm KN`;
    if (min === 0) return 'Không yêu cầu KN';
    return 'Không yêu cầu KN';
  }

  private getEmploymentTypeLabel(type?: string): string {
    const labels: Record<string, string> = {
      full_time: 'Toàn thời gian',
      part_time: 'Bán thời gian',
      contract: 'Hợp đồng',
      internship: 'Thực tập / Fresher',
    };
    return labels[type || ''] || type || 'Toàn thời gian';
  }

  private formatDate(dateStr?: string): string {
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

  private isNewToday(dateStr?: string): boolean {
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
    this.syncQuickChipsState();
    this.currentPage = 1;
    this.loadJobs();
  }

  onExperienceChange(selected: { value: string; checked: boolean }): void {
    if (selected.checked) {
      this.experienceLevels.forEach((e) => {
        if (e.value !== selected.value) e.checked = false;
      });
    }
    this.syncQuickChipsState();
    this.currentPage = 1;
    this.loadJobs();
  }

  onSalaryPresetSelect(preset: { label: string; value: string; range: [number, number] }): void {
    this.selectedSalaryPreset = preset.value;
    this.salaryRange = [...preset.range];
    this.syncQuickChipsState();
    this.currentPage = 1;
    this.loadJobs();
  }

  toggleQuickChip(chip: { id: string; label: string; active: boolean }): void {
    const willBeActive = !chip.active;
    this.currentPage = 1;

    switch (chip.id) {
      case 'hot':
        this.sortBy = willBeActive ? 'popular' : 'newest';
        break;
      case 'new':
        this.postedDateFilter = willBeActive ? '24h' : 'all';
        if (willBeActive) {
          this.sortBy = 'newest';
        }
        break;
      case 'high_salary':
        this.salaryRange = willBeActive ? [30, 100] : [0, 100];
        this.selectedSalaryPreset = willBeActive ? '30_50' : 'all';
        break;
      case 'hcm':
        this.selectedLocation = willBeActive ? 'Hồ Chí Minh' : '';
        break;
      case 'hanoi':
        this.selectedLocation = willBeActive ? 'Hà Nội' : '';
        break;
      case 'fresher':
        const entry = this.experienceLevels.find((e) => e.value === 'entry');
        if (entry) {
          entry.checked = willBeActive;
          if (willBeActive) {
            this.experienceLevels.forEach((e) => {
              if (e.value !== 'entry') e.checked = false;
            });
          }
        }
        break;
      case 'senior':
        const snr = this.experienceLevels.find((e) => e.value === 'senior');
        if (snr) {
          snr.checked = willBeActive;
          if (willBeActive) {
            this.experienceLevels.forEach((e) => {
              if (e.value !== 'senior') e.checked = false;
            });
          }
        }
        break;
    }

    this.syncQuickChipsState();
    this.loadJobs();
  }

  syncQuickChipsState(): void {
    for (const chip of this.quickChips) {
      switch (chip.id) {
        case 'hot':
          chip.active = this.sortBy === 'popular';
          break;
        case 'new':
          chip.active = this.postedDateFilter === '24h';
          break;
        case 'high_salary':
          chip.active = this.salaryRange[0] >= 30;
          break;
        case 'hcm':
          chip.active =
            !!this.selectedLocation &&
            (this.selectedLocation.toLowerCase().includes('hồ chí minh') ||
              this.selectedLocation.toLowerCase().includes('hcm'));
          break;
        case 'hanoi':
          chip.active =
            !!this.selectedLocation &&
            (this.selectedLocation.toLowerCase().includes('hà nội') ||
              this.selectedLocation.toLowerCase().includes('ha noi'));
          break;
        case 'fresher':
          chip.active = !!this.experienceLevels.find((e) => e.value === 'entry')?.checked;
          break;
        case 'senior':
          chip.active = !!this.experienceLevels.find((e) => e.value === 'senior')?.checked;
          break;
      }
    }
  }

  hasActiveQuickChips(): boolean {
    return this.quickChips.some((c) => c.active);
  }

  clearQuickChips(): void {
    this.sortBy = 'newest';
    this.postedDateFilter = 'all';
    this.salaryRange = [0, 100];
    this.selectedSalaryPreset = 'all';
    this.selectedLocation = '';
    const entry = this.experienceLevels.find((e) => e.value === 'entry');
    if (entry) entry.checked = false;
    const snr = this.experienceLevels.find((e) => e.value === 'senior');
    if (snr) snr.checked = false;
    this.syncQuickChipsState();
    this.currentPage = 1;
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

    this.jobService.getBySlug(job.slug).subscribe({
      next: (res: any) => {
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
    this.syncQuickChipsState();
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
    this.sortBy = 'newest';
    this.filteredCompanies = this.allActiveCompanies;
    this.salaryRange = [0, 100];
    this.jobTypes.forEach((t) => (t.checked = false));
    this.experienceLevels.forEach((e) => (e.checked = false));
    this.categories.forEach((c) => (c.checked = false));
    this.filterDrawerOpen = false;
    this.syncQuickChipsState();
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
      this.postedDateFilter !== 'all' ||
      this.sortBy !== 'newest' ||
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
    if (this.postedDateFilter !== 'all') count++;
    if (this.sortBy !== 'newest') count++;
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
    if (this.postedDateFilter === '24h') {
      filters.push({ key: 'postedDate', value: '24h', label: 'Mới đăng 24h' });
    }
    if (this.sortBy === 'popular') {
      filters.push({ key: 'sortBy', value: 'popular', label: 'Tuyển gấp / Phổ biến' });
    } else if (this.sortBy === 'salary_desc') {
      filters.push({ key: 'sortBy', value: 'salary_desc', label: 'Lương cao nhất' });
    } else if (this.sortBy === 'salary_asc') {
      filters.push({ key: 'sortBy', value: 'salary_asc', label: 'Lương thấp nhất' });
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
    } else if (key === 'postedDate') {
      this.postedDateFilter = 'all';
    } else if (key === 'sortBy') {
      this.sortBy = 'newest';
    } else if (key === 'jobType') {
      const type = this.jobTypes.find((t) => t.value === value);
      if (type) type.checked = false;
    } else if (key === 'experience') {
      const exp = this.experienceLevels.find((e) => e.value === value);
      if (exp) exp.checked = false;
    }
    this.syncQuickChipsState();
    this.onFilterChange();
  }

  navigateToJob(job: Job): void {
    this.router.navigate(['/jobs', job.slug]);
  }
}
