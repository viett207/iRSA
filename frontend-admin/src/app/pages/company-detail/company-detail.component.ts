import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzMessageService } from 'ng-zorro-antd/message';

import { CompanyService } from '../../core/services/company.service';
import { CompanyOverview } from '../companies/models/company-api.model';
import { VIETNAMESE_PROVINCES } from '../../shared/constants/vietnamese-provinces';
import { VIETNAMESE_INDUSTRIES } from '../../shared/constants/vietnamese-industries';

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NzButtonModule,
    NzCardModule,
    NzEmptyModule,
    NzIconModule,
    NzSkeletonModule,
    NzTagModule,
    NzInputModule,
    NzSelectModule,
    NzFormModule,
    ReactiveFormsModule,
  ],
  templateUrl: './company-detail.component.html',
  styleUrl: './company-detail.component.scss',
})
export class CompanyDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly companyService = inject(CompanyService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly message = inject(NzMessageService);

  overview = signal<CompanyOverview | null>(null);
  loading = signal(true);
  loadError = signal(false);
  editMode = signal(false);
  saving = signal(false);
  readonly provinces = VIETNAMESE_PROVINCES;
  readonly industries = VIETNAMESE_INDUSTRIES;
  readonly companyForm = new FormGroup({
    company_name: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]),
    location: new FormControl<string | null>(null),
    industry: new FormControl<string | null>(null),
    description: new FormControl('', [Validators.maxLength(2000)]),
  });
  private companyId: number | null = null;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const companyId = Number(params.get('id'));
      this.companyId = Number.isInteger(companyId) && companyId > 0 ? companyId : null;
      this.loadOverview();
    });
  }

  loadOverview(): void {
    if (!this.companyId) {
      this.loading.set(false);
      this.loadError.set(true);
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);
    this.companyService.getOverview(this.companyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overview) => {
          this.overview.set(overview);
          this.resetForm(overview);
          if (this.route.snapshot.queryParamMap.get('edit') === '1') this.editMode.set(true);
          this.loading.set(false);
        },
        error: () => {
          this.overview.set(null);
          this.loading.set(false);
          this.loadError.set(true);
        },
      });
  }

  startEditing(): void {
    const data = this.overview();
    if (!data) return;
    this.resetForm(data);
    this.editMode.set(true);
  }

  cancelEditing(): void {
    const data = this.overview();
    if (data) this.resetForm(data);
    this.editMode.set(false);
    this.clearEditQuery();
  }

  saveCompany(): void {
    if (!this.companyId || this.companyForm.invalid || this.saving()) {
      this.companyForm.markAllAsTouched();
      return;
    }
    const value = this.companyForm.getRawValue();
    this.saving.set(true);
    this.companyService.update(this.companyId, {
      company_name: value.company_name?.trim() || undefined,
      location: value.location || null,
      industry: value.industry || null,
      description: value.description?.trim() || null,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (company) => {
        this.overview.update((current) => current ? { ...current, company } : current);
        this.editMode.set(false);
        this.saving.set(false);
        this.clearEditQuery();
        this.message.success('Đã cập nhật hồ sơ công ty');
      },
      error: (error) => {
        this.saving.set(false);
        this.message.error(error.error?.detail || 'Không thể cập nhật công ty');
      },
    });
  }

  private resetForm(data: CompanyOverview): void {
    this.companyForm.reset({
      company_name: data.company.company_name,
      location: data.company.location,
      industry: data.company.industry,
      description: data.company.description || '',
    });
  }

  private clearEditQuery(): void {
    if (!this.route.snapshot.queryParamMap.has('edit')) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { edit: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  getInitial(name: string): string {
    return name.trim().charAt(0).toLocaleUpperCase('vi-VN') || 'C';
  }

  getCompanySummary(data: CompanyOverview): string {
    const industry = data.company.industry ? ` trong lĩnh vực ${data.company.industry}` : '';
    const location = data.company.location ? `, hoạt động tại ${data.company.location}` : '';
    return `${data.company.company_name}${industry}${location}.`;
  }

  getCompanyDescription(data: CompanyOverview): string {
    return data.company.description?.trim() || this.getCompanySummary(data);
  }

  getStatusColor(status: string): string {
    return {
      draft: 'default',
      pending_approval: 'orange',
      approved: 'blue',
      rejected: 'red',
      active: 'green',
      closed: 'default',
    }[status] || 'default';
  }

  getStatusLabel(status: string): string {
    return {
      draft: 'Nháp',
      pending_approval: 'Chờ duyệt',
      approved: 'Đã duyệt',
      rejected: 'Từ chối',
      active: 'Đang tuyển',
      closed: 'Đã đóng',
    }[status] || status;
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .format(new Date(value));
  }
}
