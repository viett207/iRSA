import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { JobService } from '../../core/services/job.service';
import { PublicCompanyItem } from '../../shared/models/job.model';
import { VIETNAMESE_PROVINCES } from '../../shared/constants/vietnamese-provinces';
import { VIETNAMESE_INDUSTRIES } from '../../shared/constants/vietnamese-industries';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzCardModule,
    NzEmptyModule,
    NzPaginationModule,
    NzSkeletonModule,
    NzSelectModule,
    NzTagModule,
  ],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.scss',
})
export class CompaniesComponent implements OnInit {
  private readonly jobService = inject(JobService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  companies = signal<PublicCompanyItem[]>([]);
  loading = signal(false);
  total = signal(0);

  pageIndex = 1;
  pageSize = 20;
  searchText = '';
  industryFilter: string | null = null;
  locationFilter: string | null = null;

  industries = VIETNAMESE_INDUSTRIES;
  provinces = VIETNAMESE_PROVINCES;

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.loading.set(true);
    this.jobService.listCompanies({
      page: this.pageIndex,
      page_size: this.pageSize,
      search: this.searchText.trim() || undefined,
      industry: this.industryFilter || undefined,
      location: this.locationFilter || undefined,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.companies.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.message.error('Không thể tải danh sách công ty');
        this.loading.set(false);
      },
    });
  }

  onPageIndexChange(pageIndex: number): void {
    this.pageIndex = pageIndex;
    this.loadCompanies();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.pageIndex = 1;
    this.loadCompanies();
  }

  onSearch(): void {
    this.pageIndex = 1;
    this.loadCompanies();
  }

  onFilterChange(): void {
    this.pageIndex = 1;
    this.loadCompanies();
  }

  clearFilters(): void {
    this.searchText = '';
    this.industryFilter = null;
    this.locationFilter = null;
    this.pageIndex = 1;
    this.loadCompanies();
  }

  getCompanyInitials(name: string): string {
    if (!name) return 'C';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Chưa cập nhật';
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .format(new Date(value));
  }
}
