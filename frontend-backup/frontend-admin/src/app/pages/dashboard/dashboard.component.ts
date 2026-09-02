import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { finalize } from 'rxjs';
import {
  DashboardService,
  DashboardStats,
  RecentApplication,
} from '../../core/services/dashboard.service';

interface StatusMetric {
  key: string;
  label: string;
  count: number;
  percentage: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NzSkeletonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly dashboard = signal<DashboardStats | null>(null);

  readonly recentApplications = computed<RecentApplication[]>(
    () => this.dashboard()?.recent_applications ?? [],
  );

  readonly applicationStatuses = computed<StatusMetric[]>(() => {
    const counts = this.dashboard()?.application_status_counts ?? {};
    const total = this.dashboard()?.stats.total_applications ?? 0;
    const definitions: Array<[string, string]> = [
      ['submitted', 'Đã nộp'],
      ['reviewing', 'Đang xem xét'],
      ['shortlisted', 'Vào danh sách rút gọn'],
      ['interviewing', 'Đang phỏng vấn'],
      ['offered', 'Đã gửi đề nghị'],
      ['hired', 'Đã tuyển'],
      ['rejected', 'Không phù hợp'],
    ];
    return definitions
      .map(([key, label]) => ({
        key,
        label,
        count: counts[key] ?? 0,
        percentage: total > 0 ? Math.round(((counts[key] ?? 0) / total) * 1000) / 10 : 0,
      }))
      .filter((item) => item.count > 0);
  });

  readonly jobStatuses = computed<StatusMetric[]>(() => {
    const counts = this.dashboard()?.job_status_counts ?? {};
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const labels: Record<string, string> = {
      draft: 'Bản nháp',
      pending_approval: 'Chờ phê duyệt',
      approved: 'Đã phê duyệt',
      published: 'Đã đăng',
      active: 'Đang tuyển',
      closed: 'Đã đóng',
      rejected: 'Bị từ chối',
      archived: 'Lưu trữ',
    };
    return Object.entries(counts)
      .map(([key, count]) => ({
        key,
        label: labels[key] ?? key,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.dashboardService.getStats()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => this.dashboard.set(data),
        error: () => this.loadError.set(true),
      });
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value);
  }

  formatDate(value: string | null): string {
    if (!value) return 'Chưa cập nhật';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      submitted: 'Đã nộp',
      reviewing: 'Đang xem xét',
      shortlisted: 'Vào vòng',
      interviewing: 'Phỏng vấn',
      offered: 'Đã gửi đề nghị',
      hired: 'Đã tuyển',
      rejected: 'Không phù hợp',
    };
    return labels[status] ?? status;
  }

  formatEmploymentType(type?: string | null): string {
    if (!type) return '';
    const labels: Record<string, string> = {
      full_time: 'Toàn thời gian',
      part_time: 'Bán thời gian',
      contract: 'Hợp đồng',
      internship: 'Thực tập',
      remote: 'Làm việc từ xa',
      hybrid: 'Linh hoạt',
    };
    return labels[type] ?? type;
  }
}
