import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';

import { NzSelectModule } from 'ng-zorro-antd/select';

import { CompanyService } from '../../core/services/company.service';
import { Company } from './models/company-api.model';
import { CompanyFormModalComponent } from './company-form-modal/company-form-modal.component';
import { VIETNAMESE_PROVINCES } from '../../shared/constants/vietnamese-provinces';
import { VIETNAMESE_INDUSTRIES } from '../../shared/constants/vietnamese-industries';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzCardModule,
    NzDropDownModule,
    NzModalModule,
    NzEmptyModule,
    NzToolTipModule,
    NzPaginationModule,
    NzSkeletonModule,
    NzSelectModule,
    RouterLink,
    CompanyFormModalComponent,
  ],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.scss',
})
export class CompaniesComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  companies = signal<Company[]>([]);
  loading = signal(false);
  total = signal(0);

  pageIndex = 1;
  pageSize = 20;
  searchText = '';
  industryFilter: string | null = null;
  locationFilter: string | null = null;

  industries = VIETNAMESE_INDUSTRIES;
  provinces = VIETNAMESE_PROVINCES;

  showFormModal = false;
  editingCompany: Company | null = null;

  constructor(
    private companyService: CompanyService,
    private message: NzMessageService,
    private modal: NzModalService,
  ) {}

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.loading.set(true);
    this.companyService.list({
      page: this.pageIndex,
      page_size: this.pageSize,
      search: this.searchText || undefined,
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
  }

  onPageSizeChange(pageSize: number): void {
    this.pageIndex = 1;
    this.pageSize = pageSize;
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

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  getCompanyInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || 'CT';
  }

  openCreateModal(): void {
    this.editingCompany = null;
    this.showFormModal = true;
  }

  editCompany(company: Company): void {
    this.editingCompany = company;
    this.showFormModal = true;
  }

  onCompanySaved(company: Company): void {
    this.showFormModal = false;
    this.loadCompanies();
    this.message.success(this.editingCompany ? 'Đã cập nhật công ty' : 'Đã tạo công ty');
  }

  confirmDelete(company: Company): void {
    this.modal.confirm({
      nzTitle: 'Xóa công ty?',
      nzContent: `Bạn có chắc muốn xóa "${company.company_name}"? Thao tác này không thể hoàn tác.`,
      nzOkText: 'Xóa',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.companyService.delete(company.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.message.success('Đã xóa công ty');
              this.loadCompanies();
            },
            error: () => this.message.error('Không thể xóa công ty'),
          });
      },
    });
  }
}
