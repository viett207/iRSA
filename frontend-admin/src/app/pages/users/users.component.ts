import { Component, OnInit, signal, computed, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { UserService } from '../../core/services/user.service';
import { CompanyService } from '../../core/services/company.service';
import { User } from '../../shared/models/user.model';
import { Company } from '../companies/models/company-api.model';
import { UserCreate, UserUpdate } from './models/user-api.model';

export type UserRole = 'candidate' | 'recruiter' | 'leader' | 'admin';

export interface UserStatsSummary {
  total: number;
  active: number;
  recruiters: number;
  candidates: number;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzSelectModule,
    NzInputModule,
    NzCardModule,
    NzDrawerModule,
    NzSwitchModule,
    NzDropDownModule,
    NzAvatarModule,
    NzEmptyModule,
    NzPopconfirmModule,
    NzToolTipModule,
    NzTagModule,
    NzFormModule,
    NzModalModule,
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly userService = inject(UserService);
  private readonly companyService = inject(CompanyService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly route = inject(ActivatedRoute);

  // Data states
  readonly users = signal<User[]>([]);
  readonly loading = signal<boolean>(false);
  readonly total = signal<number>(0);
  readonly companies = signal<Company[]>([]);
  readonly accountMode = signal<'pending' | 'all'>('all');
  readonly pendingUsers = signal<User[]>([]);
  readonly pendingLoading = signal(false);
  readonly pendingTotal = signal(0);
  readonly pendingSearch = signal('');
  readonly pendingRole = signal<UserRole | 'all'>('all');
  readonly selectedPendingUser = signal<User | null>(null);
  readonly processingApprovalId = signal<number | null>(null);

  readonly filteredPendingUsers = computed(() => {
    const keyword = this.pendingSearch().trim().toLocaleLowerCase('vi');
    const role = this.pendingRole();
    return this.pendingUsers().filter((user) => {
      const matchesRole = role === 'all' || user.role === role;
      const haystack = `${user.full_name} ${user.email} ${user.phone || ''} ${user.company_code || ''}`.toLocaleLowerCase('vi');
      return matchesRole && (!keyword || haystack.includes(keyword));
    });
  });

  // Selection states (Batch actions)
  readonly selectedUserIds = signal<Set<number>>(new Set());
  readonly bulkMode = signal(false);

  // Filter & Search states
  readonly activeSegment = signal<string>('all'); // all | recruiter | candidate | leader | admin | inactive
  readonly searchText = signal<string>('');
  readonly statusFilter = signal<boolean | null>(null);
  private readonly searchChanges = new Subject<string>();

  // Pagination
  pageIndex = 1;
  pageSize = 15;

  // Drawer (Slide-Over Detail & Edit)
  readonly drawerVisible = signal<boolean>(false);
  readonly drawerMode = signal<'view' | 'edit' | 'create'>('view');
  readonly selectedUser = signal<User | null>(null);
  readonly drawerSaving = signal<boolean>(false);

  // Reactive Form for Create / Edit inside Drawer
  readonly userForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    full_name: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]),
    phone: new FormControl('', [Validators.maxLength(50)]),
    password: new FormControl('', [Validators.minLength(8), Validators.maxLength(128)]),
    role: new FormControl<UserRole>('candidate', { nonNullable: true, validators: [Validators.required] }),
    company_code: new FormControl<string | null>(null),
    is_active: new FormControl(true, { nonNullable: true }),
  });

  // KPI Metrics computed
  readonly statsSummary = computed<UserStatsSummary>(() => {
    const list = this.users();
    const totalCount = this.total();
    const activeCount = list.filter((u) => u.is_active).length;
    const recruiterCount = list.filter((u) => u.role === 'recruiter' || u.role === 'leader').length;
    const candidateCount = list.filter((u) => u.role === 'candidate').length;

    return {
      total: totalCount || list.length,
      active: activeCount,
      recruiters: recruiterCount,
      candidates: candidateCount,
    };
  });
  readonly visibleInactiveCount = computed(() => this.users().filter((user) => !user.is_active).length);
  readonly visibleUnverifiedCount = computed(() => this.users().filter((user) => !user.email_verified).length);
  readonly visibleHrCount = computed(() => this.users().filter((user) => ['admin', 'leader', 'recruiter'].includes(user.role)).length);
  readonly hasActiveUserFilters = computed(() => !!(this.searchText().trim() || this.activeSegment() !== 'all' || this.statusFilter() !== null));

  // Checkbox helpers
  readonly isAllChecked = computed(() => {
    const list = this.users();
    const selected = this.selectedUserIds();
    return list.length > 0 && list.every((u) => selected.has(u.id));
  });

  readonly isIndeterminate = computed(() => {
    const list = this.users();
    const selected = this.selectedUserIds();
    const someChecked = list.some((u) => selected.has(u.id));
    return someChecked && !this.isAllChecked();
  });

  ngOnInit(): void {
    if (this.route.snapshot.data['accountMode'] === 'pending') {
      this.accountMode.set('pending');
    }
    this.loadUsers();
    this.loadCompanies();
    this.loadPendingUsers();
    this.searchChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.loadUsers());
  }

  setAccountMode(mode: 'pending' | 'all'): void {
    this.accountMode.set(mode);
    this.closeDrawer();
    if (mode === 'pending') this.loadPendingUsers();
  }

  loadPendingUsers(): void {
    this.pendingLoading.set(true);
    this.userService
      .listPendingApprovals({ page: 1, page_size: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.pendingUsers.set(res.items || []);
          this.pendingTotal.set(res.total || 0);
          const selectedId = this.selectedPendingUser()?.id;
          if (selectedId) {
            this.selectedPendingUser.set((res.items || []).find((user) => user.id === selectedId) || null);
          }
          this.pendingLoading.set(false);
        },
        error: () => {
          this.pendingLoading.set(false);
          this.message.error('Không thể tải danh sách tài khoản chờ duyệt');
        },
      });
  }

  selectPendingUser(user: User): void {
    this.selectedPendingUser.set(user);
  }

  clearPendingSelection(): void {
    this.selectedPendingUser.set(null);
  }

  confirmPendingAction(user: User, action: 'approve' | 'reject'): void {
    const approving = action === 'approve';
    this.modal.confirm({
      nzTitle: approving ? 'Phê duyệt tài khoản?' : 'Từ chối tài khoản?',
      nzContent: approving
        ? `Tài khoản ${user.full_name} sẽ được kích hoạt với vai trò ${this.getRoleLabel(user.role)}.`
        : `Yêu cầu của ${user.full_name} sẽ bị từ chối và không được cấp quyền truy cập.`,
      nzOkText: approving ? 'Phê duyệt' : 'Từ chối',
      nzOkDanger: !approving,
      nzCancelText: 'Hủy',
      nzOnOk: () => this.processPendingAction(user, action),
    });
  }

  private processPendingAction(user: User, action: 'approve' | 'reject'): Promise<void> {
    this.processingApprovalId.set(user.id);
    const request$ = action === 'approve' ? this.userService.approveUser(user.id) : this.userService.rejectUser(user.id);
    return new Promise((resolve, reject) => {
      request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.processingApprovalId.set(null);
          this.selectedPendingUser.set(null);
          this.message.success(action === 'approve' ? 'Đã phê duyệt tài khoản' : 'Đã từ chối yêu cầu đăng ký');
          this.loadPendingUsers();
          this.loadUsers();
          resolve();
        },
        error: () => {
          this.processingApprovalId.set(null);
          this.message.error(action === 'approve' ? 'Phê duyệt thất bại' : 'Từ chối thất bại');
          reject();
        },
      });
    });
  }

  getCompany(user: User): Company | null {
    if (!user.company_code) return null;
    return this.companies().find((company) => company.company_code === user.company_code) || null;
  }

  getPermissionSummary(role: string): string[] {
    const permissions: Record<string, string[]> = {
      admin: ['Quản trị người dùng và công ty', 'Phân quyền và phê duyệt tài khoản', 'Truy cập toàn bộ dữ liệu quản trị'],
      leader: ['Quản lý tin và quy trình tuyển dụng', 'Theo dõi, đánh giá đội ngũ tuyển dụng', 'Xem báo cáo tuyển dụng của công ty'],
      recruiter: ['Tạo và quản lý tin tuyển dụng', 'Đánh giá hồ sơ và điều phối phỏng vấn', 'Xem dữ liệu trong công ty được phân công'],
      candidate: ['Quản lý hồ sơ cá nhân', 'Ứng tuyển và theo dõi tiến trình', 'Tham gia lịch phỏng vấn được mời'],
    };
    return permissions[role] || [];
  }

  loadCompanies(): void {
    this.companyService
      .list({ page_size: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.companies.set(res.items || []),
        error: () => {},
      });
  }

  loadUsers(): void {
    this.loading.set(true);

    let roleParam: UserRole | undefined = undefined;
    let isActiveParam: boolean | undefined = this.statusFilter() ?? undefined;

    const segment = this.activeSegment();
    if (segment === 'recruiter') roleParam = 'recruiter';
    else if (segment === 'candidate') roleParam = 'candidate';
    else if (segment === 'leader') roleParam = 'leader';
    else if (segment === 'admin') roleParam = 'admin';
    else if (segment === 'inactive') isActiveParam = false;

    this.userService
      .list({
        page: this.pageIndex,
        page_size: this.pageSize,
        role: roleParam,
        is_active: isActiveParam,
        search: this.searchText() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.users.set(res.items || []);
          this.total.set(res.total || 0);
          this.loading.set(false);
        },
        error: () => {
          this.message.error('Không thể tải danh sách người dùng');
          this.loading.set(false);
        },
      });
  }

  // Segmented tab switch
  setSegment(segment: string): void {
    this.activeSegment.set(segment);
    this.pageIndex = 1;
    this.selectedUserIds.set(new Set());
    this.loadUsers();
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.pageIndex = 1;
    this.searchChanges.next(value);
  }

  changeStatusFilter(value: boolean | null): void {
    this.statusFilter.set(value);
    this.pageIndex = 1;
    this.loadUsers();
  }

  resetUserFilters(): void {
    this.searchText.set('');
    this.activeSegment.set('all');
    this.statusFilter.set(null);
    this.pageIndex = 1;
    this.loadUsers();
  }

  onQueryParamsChange(params: NzTableQueryParams): void {
    this.pageIndex = params.pageIndex;
    this.pageSize = params.pageSize;
    this.loadUsers();
  }

  // Row selection
  toggleSelectAll(checked: boolean): void {
    const nextSet = new Set<number>();
    if (checked) {
      this.users().forEach((u) => nextSet.add(u.id));
    }
    this.selectedUserIds.set(nextSet);
  }

  toggleSelectUser(id: number, checked: boolean): void {
    this.selectedUserIds.update((set) => {
      const copy = new Set(set);
      if (checked) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }

  clearSelection(): void {
    this.selectedUserIds.set(new Set());
  }

  toggleBulkMode(): void {
    this.bulkMode.update((enabled) => !enabled);
    this.clearSelection();
  }

  // Batch actions
  batchUpdateActive(isActive: boolean): void {
    const ids = Array.from(this.selectedUserIds());
    if (ids.length === 0) return;

    let completed = 0;
    ids.forEach((id) => {
      this.userService
        .update(id, { is_active: isActive })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            completed++;
            if (completed === ids.length) {
              this.message.success(`Đã ${isActive ? 'kích hoạt' : 'vô hiệu hóa'} ${ids.length} người dùng thành công`);
              this.clearSelection();
              this.loadUsers();
            }
          },
        });
    });
  }

  // Export CSV
  exportUsers(selectedOnly: boolean = false): void {
    const listToExport = selectedOnly
      ? this.users().filter((u) => this.selectedUserIds().has(u.id))
      : this.users();

    if (listToExport.length === 0) {
      this.message.warning('Không có dữ liệu người dùng để xuất');
      return;
    }

    const headers = ['ID', 'Họ và tên', 'Email', 'Số điện thoại', 'Vai trò', 'Trạng thái', 'Công ty', 'Ngày tạo'];
    const rows = listToExport.map((u) => [
      u.id,
      `"${u.full_name || ''}"`,
      u.email,
      u.phone || '',
      this.getRoleLabel(u.role),
      u.is_active ? 'Hoạt động' : 'Vô hiệu hóa',
      u.company_code || '',
      this.formatDate(u.created_at),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `danh_sach_nguoi_dung_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.message.success('Đã xuất danh sách người dùng thành công');
  }

  // Delete User with inline popconfirm
  deleteUser(user: User): void {
    this.userService
      .delete(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.message.success(`Đã xóa tài khoản ${user.full_name}`);
          if (this.selectedUser()?.id === user.id) {
            this.closeDrawer();
          }
          this.loadUsers();
        },
        error: () => this.message.error('Không thể xóa người dùng'),
      });
  }

  // Drawer Open / Close
  openUserDrawer(user: User, mode: 'view' | 'edit' = 'view'): void {
    this.selectedUser.set(user);
    this.drawerMode.set('edit');

    this.userForm.reset({
      email: user.email,
      full_name: user.full_name,
      phone: user.phone || '',
      password: '',
      role: user.role,
      company_code: user.company_code || null,
      is_active: user.is_active,
    });
    this.userForm.get('email')?.disable();
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();

    this.drawerVisible.set(true);
  }

  openCreateUserDrawer(): void {
    this.selectedUser.set(null);
    this.drawerMode.set('create');

    this.userForm.reset({
      email: '',
      full_name: '',
      phone: '',
      password: '',
      role: 'candidate',
      company_code: null,
      is_active: true,
    });
    this.userForm.get('email')?.enable();
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(128)]);
    this.userForm.get('password')?.updateValueAndValidity();

    this.drawerVisible.set(true);
  }

  closeDrawer(): void {
    this.drawerVisible.set(false);
    this.selectedUser.set(null);
  }

  // Save user from Drawer
  saveDrawerUser(): void {
    if (this.userForm.invalid) {
      Object.values(this.userForm.controls).forEach((ctrl) => {
        if (ctrl.invalid) {
          ctrl.markAsDirty();
          ctrl.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    this.drawerSaving.set(true);
    const formVal = this.userForm.getRawValue();

    if (this.drawerMode() === 'create') {
      const createData: UserCreate = {
        email: formVal.email || '',
        full_name: formVal.full_name || '',
        phone: formVal.phone || undefined,
        password: formVal.password || '',
        role: formVal.role,
        company_code: formVal.company_code || undefined,
      };

      this.userService
        .create(createData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.drawerSaving.set(false);
            this.message.success('Đã tạo người dùng mới thành công');
            this.closeDrawer();
            this.loadUsers();
          },
          error: (err) => {
            this.drawerSaving.set(false);
            const detail = err?.error?.detail || 'Không thể tạo người dùng';
            this.message.error(detail);
          },
        });
    } else {
      const user = this.selectedUser();
      if (!user) return;

      const updateData: UserUpdate = {
        full_name: formVal.full_name || undefined,
        phone: formVal.phone || undefined,
        role: formVal.role,
        company_code: formVal.company_code || undefined,
        is_active: formVal.is_active,
        password: formVal.password ? formVal.password : undefined,
      };

      this.userService
        .update(user.id, updateData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updated) => {
            this.drawerSaving.set(false);
            this.message.success('Đã cập nhật thông tin người dùng');
            this.selectedUser.set(updated);
            this.closeDrawer();
            this.loadUsers();
          },
          error: () => {
            this.drawerSaving.set(false);
            this.message.error('Không thể cập nhật người dùng');
          },
        });
    }
  }

  // Label Helpers
  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      admin: 'Quản trị viên',
      leader: 'Trưởng nhóm HR',
      recruiter: 'Chuyên viên tuyển dụng',
      candidate: 'Ứng viên',
    };
    return map[role] || role;
  }

  getInitial(name: string): string {
    return name?.trim()?.charAt(0)?.toUpperCase() || 'U';
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
}
