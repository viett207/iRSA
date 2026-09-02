import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { AuthService } from '../../core/auth/auth.service';
import { ApplicationService } from '../../core/services/application.service';
import {
  Application,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  ApplicationStatus,
} from '../../shared/models/application.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzGridModule,
    NzCardModule,
    NzStatisticModule,
    NzIconModule,
    NzButtonModule,
    NzTagModule,
    NzEmptyModule,
    NzSpinModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private applicationService = inject(ApplicationService);

  loading = true;
  recentApplications: Application[] = [];
  stats = {
    total: 0,
    inReview: 0,
    shortlisted: 0,
    selected: 0,
  };

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.loading = true;
    this.applicationService.list(1, 5).subscribe({
      next: (res) => {
        this.recentApplications = res.items;
        this.stats.total = res.total;
        this.stats.inReview = res.status_counts.in_review;
        this.stats.shortlisted = res.status_counts.shortlisted;
        this.stats.selected = res.status_counts.selected;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  getStatusLabel(status: string): string {
    return APPLICATION_STATUS_LABELS[status as ApplicationStatus] || status;
  }

  getStatusColor(status: string): string {
    return APPLICATION_STATUS_COLORS[status as ApplicationStatus] || 'default';
  }
}
