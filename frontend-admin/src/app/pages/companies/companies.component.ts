import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

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
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzCardModule,
    NzDropDownModule,
    NzModalModule,
    NzEmptyModule,
    NzToolTipModule,
    NzSelectModule,
    RouterLink,
    CompanyFormModalComponent,
  ],
  template: `
    <div class="companies-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Quản lý Công ty</h1>
          <p class="page-subtitle">Quản lý danh sách công ty trong hệ thống</p>
        </div>
        <div class="header-actions">
          <button nz-button nzType="primary" (click)="openCreateModal()" class="create-btn">
            <span nz-icon nzType="plus"></span>
            Tạo công ty
          </button>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="stats-row static-kpi-grid static-kpi-grid--one">
        <div class="stat-item stat-item--primary static-display-card static-kpi-card static-kpi-card--primary">
          <span class="static-kpi-icon" aria-hidden="true"><span nz-icon nzType="bank"></span></span>
          <div class="static-kpi-content">
            <span class="stat-label static-kpi-label">Tổng công ty</span>
            <span class="stat-value static-kpi-value">{{ total() }}</span>
          </div>
        </div>
      </div>

      <!-- Search -->
      <nz-card class="filter-card">
        <div class="filter-row">
          <div class="search-input">
            <nz-input-group [nzPrefix]="searchIcon">
              <input
                nz-input
                [(ngModel)]="searchText"
                placeholder="Tìm kiếm theo tên, mã công ty..."
                (keyup.enter)="onSearch()"
              />
            </nz-input-group>
            <ng-template #searchIcon>
              <span nz-icon nzType="search" nzTheme="outline"></span>
            </ng-template>
          </div>
          <!-- Industry Filter -->
          <nz-select
            [(ngModel)]="industryFilter"
            nzPlaceHolder="Ngành nghề"
            nzAllowClear
            nzShowSearch
            style="width: 200px"
            (ngModelChange)="onFilterChange()"
          >
            @for (industry of industries; track industry) {
              <nz-option [nzValue]="industry" [nzLabel]="industry"></nz-option>
            }
          </nz-select>

          <!-- Location Filter -->
          <nz-select
            [(ngModel)]="locationFilter"
            nzPlaceHolder="Địa điểm"
            nzAllowClear
            nzShowSearch
            style="width: 180px"
            (ngModelChange)="onFilterChange()"
          >
            @for (province of provinces; track province) {
              <nz-option [nzValue]="province" [nzLabel]="province"></nz-option>
            }
          </nz-select>

          <div class="filter-actions">
            <button nz-button (click)="clearFilters()">
              <span nz-icon nzType="reload"></span>
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </nz-card>

      <!-- Table -->
      <nz-card class="table-card">
        <nz-table
          #companyTable
          [nzData]="companies()"
          [nzLoading]="loading()"
          [nzTotal]="total()"
          [nzPageSize]="pageSize"
          [nzPageIndex]="pageIndex"
          [nzFrontPagination]="false"
          [nzShowSizeChanger]="true"
          [nzPageSizeOptions]="[10, 20, 50]"
          (nzQueryParams)="onQueryParamsChange($event)"
          nzSize="middle"
          [nzNoResult]="emptyTemplate"
        >
          <thead>
            <tr>
              <th nzWidth="15%">Mã công ty</th>
              <th nzWidth="25%">Tên công ty</th>
              <th nzWidth="20%">Địa điểm</th>
              <th nzWidth="18%">Ngành nghề</th>
              <th nzWidth="12%">Ngày tạo</th>
              <th nzWidth="10%">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            @for (company of companyTable.data; track company.id) {
              <tr class="company-row">
                <td>
                  <nz-tag nzColor="blue">{{ company.company_code }}</nz-tag>
                </td>
                <td>
                  <a class="company-name" [routerLink]="['/companies', company.id]">{{ company.company_name }}</a>
                </td>
                <td>
                  <span class="text-secondary">{{ company.location || '-' }}</span>
                </td>
                <td>
                  <span class="text-secondary">{{ company.industry || '-' }}</span>
                </td>
                <td>
                  <span class="created-date">{{ formatDate(company.created_at) }}</span>
                </td>
                <td>
                  <div class="actions-cell">
                    <button
                      nz-button
                      nzType="text"
                      nzSize="small"
                      (click)="editCompany(company)"
                      nz-tooltip
                      nzTooltipTitle="Chỉnh sửa"
                    >
                      <span nz-icon nzType="edit"></span> Sửa
                    </button>
                    <button
                      nz-button
                      nzType="text"
                      nzSize="small"
                      nz-dropdown
                      [nzDropdownMenu]="actionMenu"
                      nz-tooltip
                      nzTooltipTitle="Thao tác khác"
                    >
                      <span nz-icon nzType="more"></span> Thao tác
                    </button>
                    <nz-dropdown-menu #actionMenu="nzDropdownMenu">
                      <ul nz-menu class="action-dropdown">
                        <li nz-menu-item nzDanger (click)="confirmDelete(company)">
                          <span nz-icon nzType="delete" class="menu-icon"></span>
                          Xóa
                        </li>
                      </ul>
                    </nz-dropdown-menu>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </nz-table>

        <ng-template #emptyTemplate>
          <nz-empty
            nzNotFoundContent="Chưa có công ty nào"
            [nzNotFoundFooter]="emptyFooter"
          ></nz-empty>
          <ng-template #emptyFooter>
            <button nz-button nzType="primary" (click)="openCreateModal()">
              Tạo công ty đầu tiên
            </button>
          </ng-template>
        </ng-template>
      </nz-card>

      <!-- Company Form Modal -->
      <app-company-form-modal
        [(visible)]="showFormModal"
        [company]="editingCompany"
        (saved)="onCompanySaved($event)"
      ></app-company-form-modal>
    </div>
  `,
  styles: [`
    .companies-page {
      animation: fadeIn 0.3s ease-out;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .page-title {
      font-family: var(--font-heading);
      font-size: 26px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 4px 0;
    }

    .page-subtitle {
      font-size: 14px;
      color: var(--color-text-secondary);
      margin: 0;
    }

    .create-btn {
      height: 40px;
      padding: 0 20px;
    }

    .stats-row {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-item {
      flex: 1;
      max-width: 200px;
      padding: 16px 20px;
      background: var(--color-bg-secondary);
      border-radius: 10px;
      border: 1px solid var(--color-border-light);
      display: flex;
      flex-direction: column;
      gap: 4px;

      &--primary { border-left: 1px solid var(--color-border-light); }
    }

    .stat-value {
      font-family: var(--font-heading);
      font-size: 24px;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .stat-label {
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    .filter-card {
      margin-bottom: 24px;
    }

    .filter-row {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 200px;
      max-width: 320px;
    }

    .filter-actions {
      margin-left: auto;
    }

    .table-card {
      margin-bottom: 24px;
    }

    .company-row {
      transition: background 0.2s ease;

      &:hover {
        background: var(--color-primary-50);
      }
    }

    .company-name {
      font-weight: 600;
      font-size: 14px;
      color: var(--color-text-primary);
    }

    .text-secondary {
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .created-date {
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .actions-cell {
      display: flex;
      gap: 4px;
      align-items: center;
      justify-content: center;

      button {
        width: auto;
        min-width: 36px;
        height: 36px;
        padding-inline: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      [nz-icon] {
        font-size: 18px;
      }
    }

    .action-dropdown {
      min-width: 140px;

      [nz-icon] {
        font-size: 16px;
      }
    }

    .menu-icon {
      margin-right: 8px;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 767px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-row {
        flex-direction: column;
        align-items: stretch;
      }

      .search-input {
        max-width: none;
      }

      .filter-actions {
        margin-left: 0;
      }
    }
  `],
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

  onQueryParamsChange(params: NzTableQueryParams): void {
    this.pageIndex = params.pageIndex;
    this.pageSize = params.pageSize;
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
