import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { ApplicationDirectoryService, DirectoryApplication } from '../../core/services/application-directory.service';
import { APPLICATION_STATUS_LABELS, ApplicationStatus } from '../../features/jobs/models/job.model';

@Component({
  selector: 'app-applications', standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe, NzButtonModule, NzEmptyModule, NzIconModule, NzInputModule, NzSelectModule, NzSkeletonModule, NzTableModule, NzToolTipModule],
  templateUrl: './applications.component.html',
  styleUrl: './applications.component.scss',
})
export class ApplicationsComponent implements OnInit {
  private readonly directory = inject(ApplicationDirectoryService); private readonly destroyRef = inject(DestroyRef); private readonly route = inject(ActivatedRoute);
  readonly applications = signal<DirectoryApplication[]>([]); readonly loading = signal(true); readonly loadError = signal(false); readonly page = signal(1); readonly pageSize = 10;
  readonly searchTerm = signal('');
  readonly statusFilter = signal<ApplicationStatus | null>(null);
  readonly quickFilter = signal<'all' | 'pending' | 'evaluated'>('all');
  readonly statusOptions = Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => ({ value: value as ApplicationStatus, label }));
  readonly statusShortLabels: Record<ApplicationStatus, string> = {
    submitted: 'Mới nộp', reviewing: 'Xem xét', shortlisted: 'Sơ loại',
    interviewing: 'Phỏng vấn', offered: 'Đề nghị', hired: 'Đã tuyển', rejected: 'Không đạt',
  };
  readonly pipelineStages: { status: ApplicationStatus; label: string }[] = [
    { status: 'submitted', label: 'Mới nộp' },
    { status: 'reviewing', label: 'Đang xem xét' },
    { status: 'shortlisted', label: 'Đạt sơ loại' },
    { status: 'interviewing', label: 'Đang phỏng vấn' },
    { status: 'offered', label: 'Đề nghị tuyển dụng' },
    { status: 'hired', label: 'Đã tuyển' },
  ];
  readonly filteredApplications = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const quick = this.quickFilter();
    return this.applications().filter((application) => {
      const matchesQuick = quick === 'all'
        || (quick === 'pending' && ['submitted', 'reviewing'].includes(application.status))
        || (quick === 'evaluated' && application.has_ai_evaluation);
      const matchesStatus = !status || application.status === status;
      const matchesSearch = !search || [application.candidate_name, application.candidate_email, application.jobTitle]
        .some((value) => value.toLowerCase().includes(search));
      return matchesQuick && matchesStatus && matchesSearch;
    });
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredApplications().length / this.pageSize)));
  readonly pagedApplications = computed(() => this.filteredApplications().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  readonly pendingCount = computed(() => this.applications().filter((application) => ['submitted', 'reviewing'].includes(application.status)).length);
  readonly evaluatedCount = computed(() => this.applications().filter((application) => application.has_ai_evaluation).length);
  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.searchTerm.set(params.get('candidate') ?? '');
      this.resetPage();
    });
    this.load();
  }
  load(): void { this.loading.set(true); this.loadError.set(false); this.directory.getAllApplications().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (applications) => { this.applications.set(applications); this.loading.set(false); this.resetPage(); }, error: () => { this.loading.set(false); this.loadError.set(true); } }); }
  setQuickFilter(filter: 'all' | 'pending' | 'evaluated'): void {
    this.quickFilter.set(filter);
    this.statusFilter.set(null);
    this.resetPage();
  }
  setStatusFilter(status: ApplicationStatus | null): void {
    this.statusFilter.set(status);
    this.quickFilter.set('all');
    this.resetPage();
  }
  resetPage(): void { this.page.set(1); } previousPage(): void { this.page.update((page) => Math.max(1, page - 1)); } nextPage(): void { this.page.update((page) => Math.min(this.totalPages(), page + 1)); }
  initials(name: string): string { return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase() || 'UV'; }
  statusLabel(status: string): string { return APPLICATION_STATUS_LABELS[status] ?? status; }
  statusShortLabel(status: ApplicationStatus): string { return this.statusShortLabels[status] ?? status; }
  pipelineStageIndex(status: ApplicationStatus): number { return this.pipelineStages.findIndex((stage) => stage.status === status); }
}
