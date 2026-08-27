import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import { UserService } from '../../core/services/user.service';
import { User } from '../../shared/models/user.model';
import { UserFormModalComponent } from './user-form-modal/user-form-modal.component';

type UserRole = 'candidate' | 'recruiter' | 'leader' | 'admin';

// Role configuration
const ROLE_LABELS: Record<UserRole, string> = {
  candidate: 'Ứng viên',
  recruiter: 'Tuyển dụng',
  leader: 'Trưởng nhóm',
  admin: 'Quản trị',
};

const ROLE_COLORS: Record<UserRole, string> = {
  candidate: 'blue',
  recruiter: 'purple',
  leader: 'orange',
  admin: 'red',
};

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzSelectModule,
    NzInputModule,
    NzCardModule,
    NzDropDownModule,
    NzModalModule,
    NzAvatarModule,
    NzEmptyModule,
    NzToolTipModule,
    UserFormModalComponent,
  ],
  template: `
    <div class="users-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Quản lý Người dùng</h1>
          <p class="page-subtitle">Quản lý tài khoản người dùng trong hệ thống</p>
        </div>
        <div class="header-actions">
          <button nz-button nzType="primary" (click)="openCreateModal()" class="create-btn">
            <span nz-icon nzType="plus"></span>
            Tạo người dùng
          </button>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="stats-row static-kpi-grid static-kpi-grid--five">
        @for (stat of userStats; track stat.label) {
          <div class="stat-item static-display-card static-kpi-card" [class]="'stat-item stat-item--' + stat.color + ' static-display-card static-kpi-card static-kpi-card--' + stat.color">
            <span class="static-kpi-icon" aria-hidden="true"><span nz-icon [nzType]="stat.icon"></span></span>
            <div class="static-kpi-content">
              <span class="stat-label static-kpi-label">{{ stat.label }}</span>
              <span class="stat-value static-kpi-value">{{ stat.value }}</span>
            </div>
          </div>
        }
      </div>

      <!-- Filters Section -->
      <nz-card class="filter-card">
        <div class="filter-row">
          <!-- Search -->
          <div class="search-input">
            <nz-input-group [nzPrefix]="searchIcon">
              <input
                nz-input
                [(ngModel)]="searchText"
                placeholder="Tìm kiếm theo tên, email..."
                (keyup.enter)="onSearch()"
              />
            </nz-input-group>
            <ng-template #searchIcon>
              <span nz-icon nzType="search" nzTheme="outline"></span>
            </ng-template>
          </div>

          <!-- Role Filter -->
          <nz-select
            [(ngModel)]="roleFilter"
            nzPlaceHolder="Vai trò"
            nzAllowClear
            style="width: 140px"
            (ngModelChange)="onFilterChange()"
          >
            <nz-option nzValue="candidate" nzLabel="Ứng viên"></nz-option>
            <nz-option nzValue="recruiter" nzLabel="Tuyển dụng"></nz-option>
            <nz-option nzValue="leader" nzLabel="Trưởng nhóm"></nz-option>
            <nz-option nzValue="admin" nzLabel="Quản trị"></nz-option>
          </nz-select>

          <!-- Status Filter -->
          <nz-select
            [(ngModel)]="statusFilter"
            nzPlaceHolder="Trạng thái"
            nzAllowClear
            style="width: 140px"
            (ngModelChange)="onFilterChange()"
          >
            <nz-option [nzValue]="true" nzLabel="Hoạt động"></nz-option>
            <nz-option [nzValue]="false" nzLabel="Vô hiệu"></nz-option>
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
          #userTable
          [nzData]="users()"
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
              <th nzWidth="25%">Thông tin</th>
              <th nzWidth="12%">Vai trò</th>
              <th nzWidth="12%">Trạng thái</th>
              <th nzWidth="12%">Email</th>
              <th nzWidth="18%">Ngày tạo</th>
              <th nzWidth="21%">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            @for (user of userTable.data; track user.id) {
              <tr class="user-row">
                <td>
                  <div class="user-info">
                    <nz-avatar
                      [nzText]="getInitial(user.full_name)"
                      [nzSrc]="user.avatar_url || ''"
                      [nzSize]="40"
                      class="user-avatar"
                    ></nz-avatar>
                    <div class="user-details">
                      <span class="user-name">{{ user.full_name }}</span>
                      <span class="user-email">{{ user.email }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <nz-tag [nzColor]="getRoleColor(user.role)">
                    {{ getRoleLabel(user.role) }}
                  </nz-tag>
                </td>
                <td>
                  <nz-tag [nzColor]="user.is_active ? 'success' : 'default'">
                    <span nz-icon [nzType]="user.is_active ? 'check-circle' : 'stop'" nzTheme="outline"></span>
                    {{ user.is_active ? 'Hoạt động' : 'Vô hiệu' }}
                  </nz-tag>
                </td>
                <td>
                  <nz-tag [nzColor]="user.email_verified ? 'blue' : 'orange'">
                    <span nz-icon [nzType]="user.email_verified ? 'mail' : 'warning'" nzTheme="outline"></span>
                    {{ user.email_verified ? 'Đã xác thực' : 'Chưa xác thực' }}
                  </nz-tag>
                </td>
                <td>
                  <span class="created-date">{{ formatDate(user.created_at) }}</span>
                </td>
                <td>
                  <div class="actions-cell">
                    <button
                      nz-button
                      nzType="text"
                      nzSize="small"
                      (click)="editUser(user)"
                      nz-tooltip
                      nzTooltipTitle="Chỉnh sửa"
                    >
                      <span nz-icon nzType="edit"></span>
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
                      <span nz-icon nzType="more"></span>
                    </button>
                    <nz-dropdown-menu #actionMenu="nzDropdownMenu">
                      <ul nz-menu class="action-dropdown">
                        <li nz-menu-item (click)="toggleActive(user)">
                          <span nz-icon [nzType]="user.is_active ? 'stop' : 'check-circle'" class="menu-icon"></span>
                          {{ user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt' }}
                        </li>
                        <li nz-menu-divider></li>
                        <li nz-menu-item nzDanger (click)="confirmDelete(user)">
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
            nzNotFoundContent="Chưa có người dùng nào"
            [nzNotFoundFooter]="emptyFooter"
          ></nz-empty>
          <ng-template #emptyFooter>
            <button nz-button nzType="primary" (click)="openCreateModal()">
              Tạo người dùng đầu tiên
            </button>
          </ng-template>
        </ng-template>
      </nz-card>

      <!-- User Form Modal -->
      <app-user-form-modal
        [(visible)]="showFormModal"
        [user]="editingUser"
        (saved)="onUserSaved($event)"
      ></app-user-form-modal>
    </div>
  `,
  styles: [`
    .users-page {
      animation: fadeIn 0.3s ease-out;
    }

    /* Page Header */
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
      font-size: 24px;
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

    /* Stats Row */
    .stats-row {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .stat-item {
      flex: 1;
      min-width: 140px;
      padding: 16px 20px;
      background: var(--color-bg-secondary);
      border-radius: 10px;
      border: 1px solid var(--color-border-light);
      display: flex;
      flex-direction: column;
      gap: 4px;

      &--primary {
        border-left: 3px solid var(--color-primary);
      }

      &--success {
        border-left: 3px solid var(--color-success);
      }

      &--blue {
        border-left: 3px solid #1890ff;
      }

      &--purple {
        border-left: 3px solid #722ed1;
      }

      &--orange {
        border-left: 3px solid #fa8c16;
      }
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

    /* Filter Card */
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

    /* Table Card */
    .table-card {
      margin-bottom: 24px;
    }

    /* User Row */
    .user-row {
      transition: background 0.2s ease;

      &:hover {
        background: var(--color-primary-50);
      }
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      flex-shrink: 0;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .user-name {
      font-weight: 600;
      font-size: 14px;
      color: var(--color-text-primary);
    }

    .user-email {
      font-size: 12px;
      color: var(--color-text-tertiary);
    }

    .created-date {
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    /* Actions Cell */
    .actions-cell {
      display: flex;
      gap: 4px;
      align-items: center;

      button {
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      [nz-icon] {
        font-size: 18px;
      }
    }

    .action-dropdown {
      min-width: 160px;

      [nz-icon] {
        font-size: 16px;
      }
    }

    .menu-icon {
      margin-right: 8px;
    }

    /* Animation */
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Responsive */
    @media (max-width: 767px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
      }

      .stats-row {
        flex-direction: column;
      }

      .stat-item {
        min-width: 100%;
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
export class UsersComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  users = signal<User[]>([]);
  loading = signal(false);
  total = signal(0);

  pageIndex = 1;
  pageSize = 20;
  roleFilter: UserRole | null = null;
  statusFilter: boolean | null = null;
  searchText = '';

  // Modal state
  showFormModal = false;
  editingUser: User | null = null;

  // Stats summary - calculated from current page data
  userStats = [
    { label: 'Tất cả', value: 0, color: 'primary', icon: 'team' },
    { label: 'Hoạt động', value: 0, color: 'success', icon: 'check-circle' },
    { label: 'Ứng viên', value: 0, color: 'blue', icon: 'user' },
    { label: 'Tuyển dụng', value: 0, color: 'purple', icon: 'solution' },
    { label: 'Quản lý', value: 0, color: 'orange', icon: 'safety-certificate' },
  ];

  constructor(
    private userService: UserService,
    private message: NzMessageService,
    private modal: NzModalService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.userService.list({
      page: this.pageIndex,
      page_size: this.pageSize,
      role: this.roleFilter || undefined,
      is_active: this.statusFilter ?? undefined,
      search: this.searchText || undefined,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.users.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
        this.updateStats(res.items);
      },
      error: () => {
        this.message.error('Không thể tải danh sách người dùng');
        this.loading.set(false);
      },
    });
  }

  updateStats(items: User[]): void {
    const activeCount = items.filter(u => u.is_active).length;
    const candidateCount = items.filter(u => u.role === 'candidate').length;
    const recruiterCount = items.filter(u => u.role === 'recruiter').length;
    const managerCount = items.filter(u => u.role === 'leader' || u.role === 'admin').length;

    this.userStats = [
      { label: 'Tất cả', value: items.length, color: 'primary', icon: 'team' },
      { label: 'Hoạt động', value: activeCount, color: 'success', icon: 'check-circle' },
      { label: 'Ứng viên', value: candidateCount, color: 'blue', icon: 'user' },
      { label: 'Tuyển dụng', value: recruiterCount, color: 'purple', icon: 'solution' },
      { label: 'Quản lý', value: managerCount, color: 'orange', icon: 'safety-certificate' },
    ];
  }

  onQueryParamsChange(params: NzTableQueryParams): void {
    this.pageIndex = params.pageIndex;
    this.pageSize = params.pageSize;
    this.loadUsers();
  }

  onFilterChange(): void {
    this.pageIndex = 1;
    this.loadUsers();
  }

  onSearch(): void {
    this.pageIndex = 1;
    this.loadUsers();
  }

  clearFilters(): void {
    this.roleFilter = null;
    this.statusFilter = null;
    this.searchText = '';
    this.pageIndex = 1;
    this.loadUsers();
  }

  // Helper methods
  getInitial(name: string): string {
    return name?.charAt(0)?.toUpperCase() || 'U';
  }

  getRoleLabel(role: UserRole): string {
    return ROLE_LABELS[role] || role;
  }

  getRoleColor(role: UserRole): string {
    return ROLE_COLORS[role] || 'default';
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

  // Modal actions
  openCreateModal(): void {
    this.editingUser = null;
    this.showFormModal = true;
  }

  editUser(user: User): void {
    this.editingUser = user;
    this.showFormModal = true;
  }

  onUserSaved(user: User): void {
    this.showFormModal = false;
    this.loadUsers();
    this.message.success(this.editingUser ? 'Đã cập nhật người dùng' : 'Đã tạo người dùng');
  }

  toggleActive(user: User): void {
    const action = user.is_active ? 'vô hiệu hóa' : 'kích hoạt';
    this.modal.confirm({
      nzTitle: `${user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'} người dùng?`,
      nzContent: `Bạn có chắc muốn ${action} "${user.full_name}"?`,
      nzOkText: user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt',
      nzOkDanger: user.is_active,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.userService.update(user.id, { is_active: !user.is_active })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.message.success(`Đã ${action} người dùng`);
              this.loadUsers();
            },
            error: () => this.message.error(`Không thể ${action} người dùng`),
          });
      },
    });
  }

  confirmDelete(user: User): void {
    this.modal.confirm({
      nzTitle: 'Xóa người dùng?',
      nzContent: `Bạn có chắc muốn xóa "${user.full_name}"? Thao tác này không thể hoàn tác.`,
      nzOkText: 'Xóa',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.userService.delete(user.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.message.success('Đã xóa người dùng');
              this.loadUsers();
            },
            error: () => this.message.error('Không thể xóa người dùng'),
          });
      },
    });
  }
}
