import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzGridModule } from 'ng-zorro-antd/grid';

import { JobService } from '../../core/services/job.service';
import { CompanyDetail, PublicJobListItem } from '../../shared/models/job.model';

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzSpinModule,
    NzIconModule,
    NzTagModule,
    NzEmptyModule,
    NzGridModule,
  ],
  templateUrl: './company-detail.component.html',
  styleUrl: './company-detail.component.scss',
})
export class CompanyDetailComponent implements OnInit {
  company: CompanyDetail | null = null;
  loading = true;

  private employmentTypeMap: Record<string, string> = {
    full_time: 'Toàn thời gian',
    part_time: 'Bán thời gian',
    contract: 'Hợp đồng',
    intern: 'Thực tập',
    remote: 'Từ xa',
  };

  constructor(
    private route: ActivatedRoute,
    private jobService: JobService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params['code']) {
        this.loadCompany(params['code']);
      }
    });
  }

  loadCompany(code: string): void {
    this.loading = true;
    this.jobService.getCompanyDetail(code).subscribe({
      next: (data) => {
        this.company = data;
        this.loading = false;
      },
      error: () => {
        this.company = null;
        this.loading = false;
      },
    });
  }

  formatEmploymentType(type: string): string {
    return this.employmentTypeMap[type] || type;
  }

  formatSalary(min?: number | null, max?: number | null): string {
    if (min && max) return `${min} - ${max} triệu`;
    if (min) return `Từ ${min} triệu`;
    if (max) return `Đến ${max} triệu`;
    return '';
  }
}
