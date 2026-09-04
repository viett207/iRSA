import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  NzTableFilterFn,
  NzTableFilterList,
  NzTableModule,
  NzTableSortFn,
} from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';

import { ApplicationService } from '../../../core/services/application.service';
import {
  PdfViewerModalComponent,
  PdfViewerModalData,
} from '../../../shared/components/pdf-viewer-modal/pdf-viewer-modal.component';
import {
  Application,
  ApplicationStatusCounts,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  ApplicationStatus,
} from '../../../shared/models/application.model';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzEmptyModule,
    NzCardModule,
    NzToolTipModule,
    NzModalModule,
    NzInputModule,
    NzDropDownModule,
  ],
  templateUrl: './applications.component.html',
  styleUrl: './applications.component.scss',
})
export class ApplicationsComponent implements OnInit {
  private applicationService = inject(ApplicationService);
  private modal = inject(NzModalService);
  private message = inject(NzMessageService);

  loading = true;
  applications: Application[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  statusCounts: ApplicationStatusCounts = {
    in_review: 0,
    shortlisted: 0,
    not_selected: 0,
    selected: 0,
  };

  // In-column filter states
  searchTitle = '';
  searchTitleInput = '';
  visiblePosition = false;

  departmentFilterList: NzTableFilterList = [];
  locationFilterList: NzTableFilterList = [];
  readonly statusFilterList: NzTableFilterList = [
    { text: 'Đang xem xét', value: 'in_review' },
    { text: 'Đã chọn vòng 2', value: 'shortlisted' },
    { text: 'Đã tuyển chọn', value: 'selected' },
    { text: 'Không phù hợp', value: 'not_selected' },
  ];

  readonly departmentFilterFn: NzTableFilterFn<Application> = (selected, item) =>
    this.matchesSelectedValues(selected, item.job_department || '');
  readonly locationFilterFn: NzTableFilterFn<Application> = (selected, item) =>
    this.matchesSelectedValues(selected, item.job_location || '');
  readonly statusFilterFn: NzTableFilterFn<Application> = (selected, item) =>
    this.matchesSelectedValues(selected, item.public_status);
  readonly submittedSortFn: NzTableSortFn<Application> = (a, b) =>
    new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();

  get filteredApplications(): Application[] {
    const search = this.searchTitle ? this.searchTitle.trim().toLowerCase() : '';
    const normSearch = search ? this.normalizeString(search) : '';

    return this.applications.filter((app) => {
      // 1. Vị trí
      if (search) {
        const title = (app.job_title || '').toLowerCase();
        const normTitle = this.normalizeString(title);
        if (!title.includes(search) && !normTitle.includes(normSearch)) {
          return false;
        }
      }
      return true;
    });
  }

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.loading = true;
    this.applicationService.list(1, 50).subscribe({
      next: (res) => {
        this.applications = res.items;
        this.total = res.total;
        this.statusCounts = res.status_counts;
        this.updateFilterLists();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onPositionVisibleChange(visible: boolean): void {
    this.visiblePosition = visible;
    if (visible) {
      this.searchTitleInput = this.searchTitle;
    }
  }

  applyTitleSearch(): void {
    this.searchTitle = this.searchTitleInput;
    this.visiblePosition = false;
    this.page = 1;
  }

  resetTitleSearch(): void {
    this.searchTitleInput = '';
    this.searchTitle = '';
    this.visiblePosition = false;
    this.page = 1;
  }

  resetAllFilters(): void {
    this.resetTitleSearch();
  }

  private normalizeString(str: string): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd');
  }

  getStatusLabel(status: string): string {
    return APPLICATION_STATUS_LABELS[status as ApplicationStatus] || status;
  }

  getStatusColor(status: string): string {
    return APPLICATION_STATUS_COLORS[status as ApplicationStatus] || 'default';
  }

  openPdfViewer(app: Application): void {
    const loadingId = this.message.loading('Đang tải CV...', { nzDuration: 0 }).messageId;
    this.applicationService.downloadResume(app.id).subscribe({
      next: (blob) => {
        this.message.remove(loadingId);
        const blobUrl = URL.createObjectURL(blob);
        this.modal.create<PdfViewerModalComponent, PdfViewerModalData>({
          nzTitle: app.resume_filename || 'CV ứng tuyển',
          nzContent: PdfViewerModalComponent,
          nzData: { blobUrl, filename: app.resume_filename },
          nzWidth: '90vw',
          nzStyle: { maxWidth: '1000px' },
          nzFooter: null,
          nzMaskClosable: true,
        });
      },
      error: () => {
        this.message.remove(loadingId);
        this.message.error('Không thể tải CV. Vui lòng thử lại.');
      },
    });
  }

  private updateFilterLists(): void {
    this.departmentFilterList = this.createFilterList(
      this.applications.map((application) => application.job_department),
    );
    this.locationFilterList = this.createFilterList(
      this.applications.map((application) => application.job_location),
    );
  }

  private createFilterList(values: Array<string | undefined>): NzTableFilterList {
    return [...new Set(values.filter((value): value is string => !!value?.trim()))]
      .sort((a, b) => a.localeCompare(b, 'vi'))
      .map((value) => ({ text: value, value }));
  }

  private matchesSelectedValues(selected: string[] | string, value: string): boolean {
    if (!selected || (Array.isArray(selected) && selected.length === 0)) return true;
    return (Array.isArray(selected) ? selected : [selected]).includes(value);
  }

  downloadResume(app: Application): void {
    const loadingId = this.message.loading('Đang tải CV...', { nzDuration: 0 }).messageId;
    this.applicationService.downloadResume(app.id).subscribe({
      next: (blob) => {
        this.message.remove(loadingId);
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = app.resume_filename || `CV-${app.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
      },
      error: () => {
        this.message.remove(loadingId);
        this.message.error('Không thể tải CV. Vui lòng thử lại.');
      },
    });
  }
}
