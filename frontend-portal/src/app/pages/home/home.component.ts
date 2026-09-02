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
