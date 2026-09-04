import { Component, signal, computed, OnInit, OnDestroy, DestroyRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, interval, of, startWith, switchMap } from 'rxjs';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { SoundService } from '../../core/services/sound.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
    NzDropDownModule,
    NzAvatarModule,
    NzBadgeModule,
    NzToolTipModule,
    NzDividerModule,
    NzBreadCrumbModule,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  jobsMenuOpen = true;
  processMenuOpen = true;
  workspaceSearch = '';
  readonly newApplicationCount = signal(0);
  readonly soundSvc = inject(SoundService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dashboardService = inject(DashboardService);
  private readonly acknowledgedApplicationIds = new Set<number>();
  private applicationAlertSnapshotReady = false;

  userInitial = computed(() =>
    this.authService.user()?.full_name?.charAt(0).toUpperCase() || 'U'
  );

  constructor(
    public authService: AuthService,
    public notificationSvc: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  searchWorkspace(): void {
    const search = this.workspaceSearch.trim();
    if (!search) {
      this.clearWorkspaceSearch();
      return;
    }
    this.router.navigate(['/jobs'], { queryParams: { search } });
  }

  breadcrumbs(): string[] {
    const path = this.router.url.split('?')[0];
    const routes: Array<[RegExp, string[]]> = [
      [/^\/dashboard\/?$/, ['Hệ thống', 'Bảng điều khiển']],
      [/^\/reports\/?$/, ['Hệ thống', 'Báo cáo & Thống kê']],
      [/^\/jobs\/new\/?$/, ['Quản lý tuyển dụng', 'Tin tuyển dụng', 'Tạo tin tuyển dụng mới']],
      [/^\/jobs\/shortlisted\/?$/, ['Quản lý tuyển dụng', 'Quy trình tuyển dụng AI', '1. Hẹn lịch phỏng vấn']],
      [/^\/jobs\/interviewing\/?$/, ['Quản lý tuyển dụng', 'Quy trình tuyển dụng AI', '2. Phỏng vấn AI']],
      [/^\/jobs\/interview-passed\/?$/, ['Quản lý tuyển dụng', 'Quy trình tuyển dụng AI', '3. Đạt phỏng vấn']],
      [/^\/jobs\/[^/]+\/?$/, ['Quản lý tuyển dụng', 'Tin tuyển dụng', 'Chi tiết tin tuyển dụng']],
      [/^\/jobs\/?$/, ['Quản lý tuyển dụng', 'Tin tuyển dụng', 'Tất cả tin tuyển dụng']],
      [/^\/applications\/?$/, ['Quản lý tuyển dụng', 'Tin tuyển dụng', 'Hồ sơ ứng tuyển']],
      [/^\/candidates\/?$/, ['Quản lý tuyển dụng', 'Tin tuyển dụng', 'Ứng viên']],
      [/^\/companies\/[^/]+\/?$/, ['Quản trị hệ thống', 'Quản lý Công ty', 'Chi tiết Công ty']],
      [/^\/companies\/?$/, ['Quản trị hệ thống', 'Quản lý Công ty']],
      [/^\/users\/?$/, ['Quản trị hệ thống', 'Quản lý Người dùng']],
      [/^\/approvals\/?$/, ['Quản trị hệ thống', 'Quản lý Người dùng', 'Chờ phê duyệt']],
    ];
    return routes.find(([pattern]) => pattern.test(path))?.[1] ?? ['Hệ thống', 'Bảng điều khiển'];
  }

  isRouteActive(targetPath: string): boolean {
    const currentPath = (this.router.url.split('?')[0].replace(/\/+$/, '') || '/').toLowerCase();
    const cleanTarget = (targetPath.replace(/\/+$/, '') || '/').toLowerCase();
    return currentPath === cleanTarget;
  }

  @HostListener('document:keydown', ['$event'])
  focusQuickSearch(event: KeyboardEvent): void {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
    event.preventDefault();
    document.getElementById('workspace-quick-search')?.focus();
  }

  onWorkspaceSearchChange(value: string): void {
    if (!value.trim() && this.router.parseUrl(this.router.url).queryParams['search']) {
      this.clearWorkspaceSearch();
    }
  }

  ngOnInit(): void {
    this.notificationSvc.connect();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.workspaceSearch = params.get('search') ?? '';
      });

    interval(30_000)
      .pipe(
        startWith(0),
        switchMap(() => this.dashboardService.getStats().pipe(catchError(() => of(null)))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (dashboard) => {
          if (dashboard) this.updateApplicationAlerts(dashboard.recent_applications);
        },
      });
  }

  ngOnDestroy(): void {
    this.notificationSvc.disconnect();
  }

  private clearWorkspaceSearch(): void {
    const urlTree = this.router.parseUrl(this.router.url);
    if (!urlTree.queryParams['search']) return;

    delete urlTree.queryParams['search'];
    void this.router.navigateByUrl(urlTree, { replaceUrl: true });
  }

  /** Marks only the currently visible new applications as read for this HR account. */
  acknowledgeNewApplications(): void {
    this.readCurrentSubmittedApplicationIds().forEach((id) => this.acknowledgedApplicationIds.add(id));
    this.persistApplicationAlertState();
    this.newApplicationCount.set(0);
  }

  private recentSubmittedApplicationIds: number[] = [];

  private updateApplicationAlerts(recentApplications: Array<{ id: number; status: string }>): void {
    this.recentSubmittedApplicationIds = recentApplications
      .filter((application) => application.status === 'submitted')
      .map((application) => application.id);

    if (!this.applicationAlertSnapshotReady) {
      const savedState = this.readApplicationAlertState();
      savedState.ids.forEach((id) => this.acknowledgedApplicationIds.add(id));

      // First use creates a baseline. Existing records are not incorrectly shown as a new alert.
      if (!savedState.initialized) {
        this.readCurrentSubmittedApplicationIds().forEach((id) => this.acknowledgedApplicationIds.add(id));
        this.persistApplicationAlertState();
      }
      this.applicationAlertSnapshotReady = true;
    }

    this.newApplicationCount.set(
      this.readCurrentSubmittedApplicationIds().filter((id) => !this.acknowledgedApplicationIds.has(id)).length
    );
  }

  private readCurrentSubmittedApplicationIds(): number[] {
    return this.recentSubmittedApplicationIds;
  }

  private readApplicationAlertState(): { initialized: boolean; ids: number[] } {
    try {
      const stored = localStorage.getItem(this.applicationAlertStorageKey());
      if (!stored) return { initialized: false, ids: [] };
      const parsed: unknown = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object') return { initialized: false, ids: [] };
      const state = parsed as { initialized?: unknown; ids?: unknown };
      return {
        initialized: state.initialized === true,
        ids: Array.isArray(state.ids) ? state.ids.filter((id): id is number => typeof id === 'number') : [],
      };
    } catch {
      return { initialized: false, ids: [] };
    }
  }

  private persistApplicationAlertState(): void {
    try {
      const ids = [...this.acknowledgedApplicationIds].slice(-500);
      localStorage.setItem(this.applicationAlertStorageKey(), JSON.stringify({ initialized: true, ids }));
    } catch {
      // Local storage can be unavailable in private browser contexts; alerts still work for this session.
    }
  }

  private applicationAlertStorageKey(): string {
    return `irsa:application-alerts:v1:${this.authService.user()?.id ?? 'anonymous'}`;
  }

  getRoleLabel(): string {
    const role = this.authService.user()?.role;
    const labels: Record<string, string> = {
      admin: 'Quản trị viên',
      leader: 'Trưởng phòng',
      recruiter: 'Nhân viên tuyển dụng',
    };
    return labels[role || ''] || 'Người dùng';
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      application: 'file-text',
      job: 'solution',
      interview: 'calendar',
      system: 'info-circle',
    };
    return icons[type] || 'bell';
  }

  onNotificationClick(notif: any): void {
    if (!notif.is_read) {
      this.notificationSvc.markAsRead(notif.id);
    }
  }

  formatTime(isoDate: string): string {
    if (!isoDate) return '';
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  }

  logout(): void {
    this.notificationSvc.disconnect();
    this.authService.logout();
  }
}
