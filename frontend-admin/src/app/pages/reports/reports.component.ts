import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { finalize } from 'rxjs';
import { DailyCount, ReportService, ReportsOverview, StatusCount } from '../../core/services/report.service';

interface StatusMetric extends StatusCount {
  label: string;
  percentage: number;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NzSkeletonModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  readonly Math = Math;
  private readonly destroyRef = inject(DestroyRef);
  private readonly reportService = inject(ReportService);
  private readonly message = inject(NzMessageService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly data = signal<ReportsOverview | null>(null);
  selectedDays = 30;

  readonly trendMaximum = computed(() =>
    Math.max(...(this.data()?.application_trend ?? []).map((item) => item.count), 1),
  );

  readonly trendSeries = computed(() => {
    const items = this.data()?.application_trend ?? [];
    return items.map((item, index) => {
      if (index < 6) return { ...item, movingAverage: null as number | null };
      const window = items.slice(index - 6, index + 1);
      const movingAverage = window.reduce((sum, point) => sum + point.count, 0) / 7;
      return { ...item, movingAverage };
    });
  });

  readonly showTrendAverage = computed(() => this.selectedDays >= 30 && this.trendSeries().length >= 7);

  readonly trendAveragePoints = computed(() => {
    if (!this.showTrendAverage()) return '';
    const items = this.trendSeries();
    const max = this.trendMaximum();
    return items
      .map((item, index) => item.movingAverage == null ? null : {
        x: ((index + 0.5) / items.length) * 1000,
        y: 200 - (item.movingAverage / max) * 200,
      })
      .filter((point): point is { x: number; y: number } => point !== null)
      .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
      .join(' ');
  });

  readonly scoreMaximum = computed(() =>
    Math.max(...(this.data()?.score_distribution ?? []).map((item) => item.count), 1),
  );

  readonly applicationStatuses = computed<StatusMetric[]>(() => {
    const report = this.data();
    if (!report) return [];
    const labels: Record<string, string> = {
      submitted: 'Đã nộp', reviewing: 'Đang xem xét', shortlisted: 'Vào vòng',
      interviewing: 'Phỏng vấn', offered: 'Đã gửi đề nghị', hired: 'Đã tuyển',
      rejected: 'Không phù hợp', error: 'Lỗi xử lý',
    };
    return report.application_by_status
      .map((item) => ({
        ...item,
        label: labels[item.status] ?? item.status,
        percentage: report.total_applications > 0
          ? Math.round((item.count / report.total_applications) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  });

  readonly jobStatuses = computed<StatusMetric[]>(() => {
    const report = this.data();
    if (!report) return [];
    const labels: Record<string, string> = {
      draft: 'Bản nháp', pending_approval: 'Chờ phê duyệt', approved: 'Đã phê duyệt',
      active: 'Đang tuyển', closed: 'Đã đóng', rejected: 'Bị từ chối', archived: 'Lưu trữ',
    };
    return report.job_by_status
      .map((item) => ({
        ...item,
        label: labels[item.status] ?? item.status,
        percentage: report.total_jobs > 0
          ? Math.round((item.count / report.total_jobs) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  });

  ngOnInit(): void {
    this.loadReport();
  }

  onPeriodChange(days: number): void {
    this.selectedDays = days;
    this.loadReport();
  }

  loadReport(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.reportService.getOverview(this.selectedDays)
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => this.data.set(report),
        error: () => {
          this.loadError.set(true);
          this.message.error('Không thể tải Báo cáo & Thống kê');
        },
      });
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value);
  }

  formatScore(value: number | null | undefined): string {
    return value == null ? '—' : `${value.toFixed(1)}%`;
  }

  formatRate(value: number | null | undefined): string {
    return value == null ? '—' : `${value.toFixed(1)}%`;
  }

  formatTrendDate(value: string): string {
    const [, month, day] = value.split('-');
    return `${day}/${month}`;
  }

  getTrendTooltip(item: DailyCount & { movingAverage: number | null }): string {
    const daily = `${this.formatTrendDate(item.date)}: ${item.count} hồ sơ`;
    if (!this.showTrendAverage() || item.movingAverage == null) return daily;
    return `${daily} · Trung bình 7 ngày: ${item.movingAverage.toFixed(1)}`;
  }

  getApplicationStatusBarColor(status: string): string {
    const colors: Record<string, string> = {
      submitted: '#18181B', reviewing: '#3F3F46', shortlisted: '#71717A',
      interviewing: '#71717A', offered: '#A1A1AA', hired: '#10B981',
      rejected: '#FB7185', error: '#FB7185',
    };
    return colors[status] ?? '#71717A';
  }

  getJobStatusBarColor(status: string): string {
    const colors: Record<string, string> = {
      draft: '#A1A1AA', pending_approval: '#71717A', approved: '#52525B',
      active: '#10B981', closed: '#71717A', rejected: '#FB7185', archived: '#D4D4D8',
    };
    return colors[status] ?? '#A1A1AA';
  }

  exportExcel(): void {
    const report = this.data();
    if (!report) return;
    const rows: Array<Array<string | number>> = [
      ['BÁO CÁO & THỐNG KÊ TUYỂN DỤNG'],
      [`Khoảng xu hướng và phỏng vấn: ${this.selectedDays} ngày gần đây`],
      [],
      ['Chỉ số', 'Giá trị'],
      ['Tổng tin tuyển dụng', report.total_jobs],
      ['Tin đang tuyển', report.active_jobs],
      ['Tổng hồ sơ', report.total_applications],
      ['Hồ sơ đã chấm AI', report.scored_applications],
      ['Điểm AI trung bình', report.avg_score ?? 'Chưa có dữ liệu'],
      ['Đã tuyển', report.hired_count],
      ['Phỏng vấn hoàn thành', report.completed_interviews ?? 0],
      ['Tỷ lệ phỏng vấn đạt', report.interview_pass_rate ?? 'Chưa có dữ liệu'],
      [],
      ['Vị trí tuyển dụng', 'Phòng ban', 'Hồ sơ', 'Điểm AI trung bình'],
      ...report.top_jobs.map((job) => [job.title, job.department ?? 'Chưa phân loại', job.application_count, job.avg_score ?? 'Chưa có dữ liệu']),
    ];
    const worksheet = rows.map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="${typeof cell === 'number' ? 'Number' : 'String'}">${this.escapeXml(String(cell))}</Data></Cell>`).join('')}</Row>`).join('');
    const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Báo cáo tuyển dụng"><Table>${worksheet}</Table></Worksheet></Workbook>`;
    const date = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bao-cao-tuyen-dung-${date}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private escapeXml(value: string): string {
    return value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character] ?? character);
  }
}
