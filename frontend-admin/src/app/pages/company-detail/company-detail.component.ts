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

import { CompanyService } from '../../core/services/company.service';
import { CompanyOverview } from '../companies/models/company-api.model';

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
  private readonly companyService = inject(CompanyService);
  private readonly destroyRef = inject(DestroyRef);

  overview = signal<CompanyOverview | null>(null);
  loading = signal(true);
  loadError = signal(false);
  private companyId: number | null = null;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const companyId = Number(params.get('id'));
      this.companyId = Number.isInteger(companyId) && companyId > 0 ? companyId : null;
      this.loadOverview();
    });
  }

  loadOverview(): void {
    if (!this.companyId) {
      this.loading.set(false);
      this.loadError.set(true);
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);
    this.companyService.getOverview(this.companyId)
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
    return name.trim().charAt(0).toLocaleUpperCase('vi-VN') || 'C';
  }

  getCompanySummary(data: CompanyOverview): string {
    const industry = data.company.industry ? ` trong lĩnh vực ${data.company.industry}` : '';
    const location = data.company.location ? `, hoạt động tại ${data.company.location}` : '';
    return `${data.company.company_name}${industry}${location}.`;
  }

  getCompanyDescription(data: CompanyOverview): string {
    return data.company.description?.trim() || this.getCompanySummary(data);
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

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .format(new Date(value));
  }
}
