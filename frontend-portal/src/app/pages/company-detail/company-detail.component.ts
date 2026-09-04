import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';

import { JobService } from '../../core/services/job.service';
import { CompanyJobSummary, CompanyOverview } from '../../shared/models/job.model';

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzButtonModule,
    NzEmptyModule,
    NzIconModule,
    NzInputModule,
    NzSkeletonModule,
  ],
  templateUrl: './company-detail.component.html',
  styleUrl: './company-detail.component.scss',
})
export class CompanyDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly jobService = inject(JobService);
  private readonly destroyRef = inject(DestroyRef);

  overview = signal<CompanyOverview | null>(null);
  loading = signal(true);
  loadError = signal(false);
  searchQuery = signal<string>('');
  selectedDepartment = signal<string>('all');
  private companyCodeOrId: string | null = null;

  private employmentTypeMap: Record<string, string> = {
    full_time: 'Toàn thời gian',
    part_time: 'Bán thời gian',
    contract: 'Hợp đồng',
    intern: 'Thực tập',
    remote: 'Từ xa',
  };

  departments = computed(() => {
    const jobs = this.overview()?.jobs || [];
    const deptSet = new Set<string>();
    jobs.forEach((job) => {
      if (job.department && job.department.trim()) {
        deptSet.add(job.department.trim());
      }
    });
    return Array.from(deptSet).sort((a, b) => a.localeCompare(b, 'vi'));
  });

  filteredJobs = computed<CompanyJobSummary[]>(() => {
    const jobs = this.overview()?.jobs || [];
    const query = this.searchQuery().trim();
    const normQuery = this.removeVietnameseTones(query);
    const selectedDept = this.selectedDepartment();

    return jobs.filter((job) => {
      // Department filter
      if (selectedDept !== 'all' && (job.department || '').trim() !== selectedDept) {
        return false;
      }

      // Search query filter
      if (!normQuery) {
        return true;
      }

      const titleNorm = this.removeVietnameseTones(job.title_vi || '');
      const deptNorm = this.removeVietnameseTones(job.department || '');
      const locNorm = this.removeVietnameseTones(job.location || '');
      const empTypeLabel = this.employmentTypeMap[job.employment_type || ''] || job.employment_type || '';
      const empTypeNorm = this.removeVietnameseTones(empTypeLabel);

      return (
        titleNorm.includes(normQuery) ||
        deptNorm.includes(normQuery) ||
        locNorm.includes(normQuery) ||
        empTypeNorm.includes(normQuery)
      );
    });
  });

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedDepartment.set('all');
  }

  private removeVietnameseTones(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const code = params.get('code') || params.get('id');
      this.companyCodeOrId = code ? code.trim() : null;
      this.loadOverview();
    });
  }

  loadOverview(): void {
    if (!this.companyCodeOrId) {
      this.loading.set(false);
      this.loadError.set(true);
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);
    this.jobService.getCompanyDetail(this.companyCodeOrId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overview) => {
          this.overview.set(overview);
          this.loading.set(false);
        },
        error: () => {
          this.overview.set(null);
          this.loading.set(false);
          this.loadError.set(true);
        },
      });
  }

  getInitial(name: string): string {
    return name ? name.trim().charAt(0).toLocaleUpperCase('vi-VN') || 'C' : 'C';
  }

  getCompanySummary(data: CompanyOverview): string {
    const industry = data.company?.industry ? ` trong lĩnh vực ${data.company.industry}` : '';
    const location = data.company?.location ? `, hoạt động tại ${data.company.location}` : '';
    return `${data.company?.company_name || 'Doanh nghiệp'}${industry}${location}.`;
  }

  getCompanyDescription(data: CompanyOverview): string {
    return data.company?.description?.trim() || this.getCompanySummary(data);
  }

  formatDate(value: string | Date | null | undefined): string {
    if (!value) return '';
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .format(new Date(value));
  }

  formatEmploymentType(value: string | null | undefined): string {
    if (!value) return 'Linh hoạt';
    return this.employmentTypeMap[value] || value;
  }

  formatSalary(min: number | null | undefined, max: number | null | undefined): string {
    if (min && max) return `${(min / 1000000).toFixed(0)} - ${(max / 1000000).toFixed(0)} triệu`;
    if (min) return `Từ ${(min / 1000000).toFixed(0)} triệu`;
    if (max) return `Đến ${(max / 1000000).toFixed(0)} triệu`;
    return 'Thỏa thuận';
  }
}
