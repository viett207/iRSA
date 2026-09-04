import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { JobService } from '../../core/services/job.service';
import { PublicJobListItem, ActiveCompany } from '../../shared/models/job.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzButtonModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzTagModule,
    NzSpinModule,
    NzEmptyModule,
    DatePipe,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  private jobService = inject(JobService);

  searchQuery = '';
  jobs: PublicJobListItem[] = [];
  totalJobs = 0;
  loading = false;
  activeCompanies: ActiveCompany[] = [];

  categories = [
    { name: 'Công nghệ thông tin', label: 'Công nghệ', icon: 'laptop' },
    { name: 'Tài chính - Ngân hàng', label: 'Tài chính', icon: 'bank' },
    { name: 'Xây dựng', label: 'Xây dựng', icon: 'build' },
    { name: 'Y tế - Dược phẩm', label: 'Y tế', icon: 'medicine-box' },
    { name: 'Giáo dục - Đào tạo', label: 'Giáo dục', icon: 'read' },
  ];

  ngOnInit(): void {
    this.loadLatestJobs();
    this.loadActiveCompanies();
  }

  onSearch(): void {
    const q = this.searchQuery.trim();
    this.router.navigate(['/jobs'], { queryParams: q ? { q } : {} });
  }

  formatEmploymentType(type: string): string {
    const map: Record<string, string> = {
      full_time: 'Toàn thời gian',
      part_time: 'Bán thời gian',
      contract: 'Hợp đồng',
      internship: 'Thực tập',
      remote: 'Từ xa',
    };
    return map[type] || type;
  }

  formatSalary(min?: number, max?: number): string {
    const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(0)} triệu` : n.toLocaleString());
    if (min && max) return `${fmt(min)} - ${fmt(max)} VNĐ`;
    if (min) return `Từ ${fmt(min)} VNĐ`;
    return '';
  }

  getInitials(name?: string): string {
    if (!name) return 'IR';
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }

  isNewJob(publishedAt?: string): boolean {
    if (!publishedAt) return false;
    const published = new Date(publishedAt).getTime();
    return !Number.isNaN(published) && Date.now() - published <= 7 * 24 * 60 * 60 * 1000;
  }

  getDeadlineLabel(deadline?: string): string {
    if (!deadline) return 'Không giới hạn';
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (diff < 0) return 'Đã hết hạn';
    if (diff === 0) return 'Hết hạn hôm nay';
    if (diff <= 7) return `Còn ${diff} ngày`;
    return `Đến ${new Date(deadline).toLocaleDateString('vi-VN')}`;
  }

  formatExperience(min?: number, max?: number): string {
    if (!min && !max) return 'Không yêu cầu';
    if (min != null && max != null) return `${min}–${max} năm`;
    if (min != null) return `Từ ${min} năm`;
    return `Tối đa ${max} năm`;
  }

  private loadActiveCompanies(): void {
    this.jobService.listActiveCompanies(10).subscribe({
      next: (res) => this.activeCompanies = res.items,
      error: () => {},
    });
  }

  private loadLatestJobs(): void {
    this.loading = true;
    this.jobService.list({ size: 6, order_by: 'newest' }).subscribe({
      next: (res) => {
        this.jobs = res.items;
        this.totalJobs = res.total;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
  
}
