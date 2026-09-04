import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { JobService } from '../../core/services/job.service';
import { CompanyOverview } from '../../shared/models/job.model';

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NzButtonModule,
    NzCardModule,
    NzEmptyModule,
    NzIconModule,
    NzSkeletonModule,
    NzTagModule,
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
  activeTab: 'overview' | 'jobs' = 'overview';
  private companyCodeOrId: string | null = null;

  private employmentTypeMap: Record<string, string> = {
    full_time: 'Toàn thời gian',
    part_time: 'Bán thời gian',
    contract: 'Hợp đồng',
    intern: 'Thực tập',
    remote: 'Từ xa',
  };

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

  getStatusColor(status: string): string {
    return {
      draft: 'default',
      pending_approval: 'orange',
      approved: 'blue',
      rejected: 'red',
      active: 'green',
      closed: 'default',
    }[status] || 'default';
  }

  getStatusLabel(status: string): string {
    return {
      draft: 'Nháp',
      pending_approval: 'Chờ duyệt',
      approved: 'Đã duyệt',
      rejected: 'Từ chối',
      active: 'Đang tuyển',
      closed: 'Đã đóng',
    }[status] || status;
  }

  formatDate(value: string | Date | null | undefined): string {
    if (!value) return '';
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .format(new Date(value));
  }

  formatSalary(min: number | null | undefined, max: number | null | undefined): string {
    if (min && max) return `${(min / 1000000).toFixed(0)} - ${(max / 1000000).toFixed(0)} triệu`;
    if (min) return `Từ ${(min / 1000000).toFixed(0)} triệu`;
    if (max) return `Đến ${(max / 1000000).toFixed(0)} triệu`;
    return 'Thỏa thuận';
  }
}
