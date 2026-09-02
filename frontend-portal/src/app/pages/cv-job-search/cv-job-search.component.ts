/**
 * CV Job Search page — finds jobs matching the candidate's CV via AI scoring.
 */
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { FormsModule } from '@angular/forms';

import { JobService } from '../../core/services/job.service';
import { ResumeService } from '../../core/services/resume.service';
import { CVJobMatchItem, CVJobSearchResponse } from '../../shared/models/job.model';
import { Resume } from '../../shared/models/resume.model';

@Component({
  selector: 'app-cv-job-search',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzCardModule,
    NzButtonModule,
    NzTagModule,
    NzSpinModule,
    NzMessageModule,
    NzIconModule,
    NzPaginationModule,
    NzEmptyModule,
    NzDividerModule,
    NzProgressModule,
    NzSliderModule,
    NzInputNumberModule,
    FormsModule,
  ],
  templateUrl: './cv-job-search.component.html',
  styleUrl: './cv-job-search.component.scss',
})
export class CVJobSearchComponent implements OnInit {
  private jobService = inject(JobService);
  private resumeService = inject(ResumeService);
  private message = inject(NzMessageService);
  private router = inject(Router);

  defaultResume: Resume | null = null;
  selectedFile: File | null = null;
  allJobs: CVJobMatchItem[] = [];
  filteredJobs: CVJobMatchItem[] = [];
  totalJobs = 0;
  currentPage = 1;
  pageSize = 20;
  searching = false;
  searched = false;
  scoreThreshold = 0;

  thresholdFormatter = (value: number) => `${value}%`;

  get paginatedJobs(): CVJobMatchItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredJobs.slice(start, start + this.pageSize);
  }

  ngOnInit(): void {
    this.loadDefaultResume();
  }

  loadDefaultResume(): void {
    this.resumeService.list().subscribe({
      next: (res) => {
        this.defaultResume = res.items.find((r) => r.is_default) ?? null;
      },
      error: () => {
        // Not critical — user can still upload a file
      },
    });
  }

  searchWithDefault(): void {
    this.currentPage = 1;
    this.doSearch({});
  }

  searchWithFile(): void {
    if (!this.selectedFile) return;
    this.currentPage = 1;
    this.doSearch({ file: this.selectedFile });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    if (this.selectedFile) {
      this.doSearch({ file: this.selectedFile });
    } else {
      this.doSearch({});
    }
  }

  private doSearch(params: { file?: File; resume_id?: number }): void {
    this.searching = true;
    // Fetch all results (large page) for client-side threshold filtering
    this.jobService
      .searchByCV({ ...params, page: 1, size: 200 })
      .subscribe({
        next: (res) => {
          this.allJobs = res.items;
          this.applyThreshold();
          this.searching = false;
          this.searched = true;
        },
        error: (err) => {
          this.message.error(err.error?.detail || 'Có lỗi xảy ra khi tìm kiếm');
          this.searching = false;
        },
      });
  }

  onThresholdChange(): void {
    this.currentPage = 1;
    this.applyThreshold();
  }

  private applyThreshold(): void {
    this.filteredJobs = this.allJobs.filter(
      (j) => j.total_score >= this.scoreThreshold
    );
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
      this.searched = false;
      this.allJobs = [];
    this.filteredJobs = [];
    }
  }

  clearFile(): void {
    this.selectedFile = null;
    this.searched = false;
    this.allJobs = [];
    this.filteredJobs = [];
  }

  goToJob(slug: string): void {
    this.router.navigate(['/jobs', slug]);
  }

  getScoreClass(score: number): string {
    if (score >= 70) return 'score-high';
    if (score >= 40) return 'score-medium';
    return 'score-low';
  }

  formatSalary(min: number | null, max: number | null): string {
    if (min && max) return `${min}–${max} triệu`;
    if (min) return `Từ ${min} triệu`;
    if (max) return `Đến ${max} triệu`;
    return 'Thỏa thuận';
  }
}
