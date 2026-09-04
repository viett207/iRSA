import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { CompanyJobSummary } from '../companies/models/company-api.model';

@Component({
  selector: 'app-company-jobs-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NzEmptyModule, NzInputModule, NzSelectModule],
  templateUrl: './company-jobs-panel.component.html',
  styleUrl: './company-jobs-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyJobsPanelComponent {
  readonly jobs = input.required<CompanyJobSummary[]>();
  readonly activeJobs = input(0);

  readonly search = signal('');
  readonly status = signal('all');
  readonly sort = signal<'newest' | 'applications' | 'title'>('newest');
  readonly page = signal(1);
  readonly pageSize = 8;
  private readonly dateFormatter = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  readonly filteredJobs = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('vi-VN');
    const status = this.status();
    return [...this.jobs()]
      .filter((job) => {
        const searchable = [job.title_vi, job.department, job.location].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN');
        return (status === 'all' || job.status === status) && (!query || searchable.includes(query));
      })
      .sort((left, right) => {
        if (this.sort() === 'applications') return right.applications_count - left.applications_count;
        if (this.sort() === 'title') return left.title_vi.localeCompare(right.title_vi, 'vi');
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      });
  });
  readonly visibleJobs = computed(() => this.filteredJobs().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredJobs().length / this.pageSize)));
  readonly withoutApplications = computed(() => this.jobs().filter((job) => job.status === 'active' && job.applications_count === 0).length);

  updateSearch(value: string): void { this.search.set(value); this.page.set(1); }
  updateStatus(value: string): void { this.status.set(value); this.page.set(1); }
  updateSort(value: 'newest' | 'applications' | 'title'): void { this.sort.set(value); this.page.set(1); }
  clearFilters(): void { this.search.set(''); this.status.set('all'); this.sort.set('newest'); this.page.set(1); }
  hasFilters(): boolean { return !!this.search().trim() || this.status() !== 'all' || this.sort() !== 'newest'; }
  changePage(delta: number): void { this.page.set(Math.min(this.totalPages(), Math.max(1, this.page() + delta))); }
  formatDate(value: string): string { return this.dateFormatter.format(new Date(value)); }
  statusLabel(status: string): string {
    return ({ draft: 'Nháp', pending_approval: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', active: 'Đang tuyển', closed: 'Đã đóng' } as Record<string, string>)[status] || status;
  }
  statusClass(status: string): string {
    return ({ draft: 'draft', pending_approval: 'pending', approved: 'approved', rejected: 'rejected', active: 'active', closed: 'closed' } as Record<string, string>)[status] || 'draft';
  }
}
