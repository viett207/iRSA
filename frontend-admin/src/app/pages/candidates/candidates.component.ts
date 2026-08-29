import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { ApplicationDirectoryService, DirectoryCandidate } from '../../core/services/application-directory.service';
import { APPLICATION_STATUS_COLORS, APPLICATION_STATUS_LABELS } from '../../features/jobs/models/job.model';

@Component({
  selector: 'app-candidates', standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe, NzButtonModule, NzEmptyModule, NzIconModule, NzInputModule, NzSkeletonModule, NzTableModule, NzTagModule, NzToolTipModule],
  template: `
    <main class="directory-page">
      <header class="page-header"><div><h1>Ứng viên</h1><p>Mỗi ứng viên được gộp từ toàn bộ hồ sơ đã nộp để HR xem bức tranh đầy đủ hơn.</p></div><a nz-button routerLink="/applications"><span nz-icon nzType="file-text"></span>Xem hồ sơ ứng tuyển</a></header>
      <section class="summary-strip static-kpi-grid static-kpi-grid--three" aria-label="Tóm tắt ứng viên">
        <article class="static-display-card static-kpi-card static-kpi-card--primary">
          <span class="static-kpi-icon" aria-hidden="true"><span nz-icon nzType="team"></span></span>
          <span class="static-kpi-content"><span class="static-kpi-label">Tổng ứng viên</span><strong class="static-kpi-value">{{ candidates().length }}</strong></span>
        </article>
        <article class="static-display-card static-kpi-card static-kpi-card--success">
          <span class="static-kpi-icon" aria-hidden="true"><span nz-icon nzType="robot"></span></span>
          <span class="static-kpi-content"><span class="static-kpi-label">Có đánh giá AI</span><strong class="static-kpi-value">{{ evaluatedCount() }}</strong></span>
        </article>
        <article class="static-display-card static-kpi-card static-kpi-card--warning">
          <span class="static-kpi-icon" aria-hidden="true"><span nz-icon nzType="branches"></span></span>
          <span class="static-kpi-content"><span class="static-kpi-label">Ứng viên nhiều hơn 1 vị trí</span><strong class="static-kpi-value">{{ multiApplicationCount() }}</strong></span>
        </article>
      </section>
      <section class="directory-card">
        <div class="toolbar"><label class="search-field"><span nz-icon nzType="search"></span><input nz-input [(ngModel)]="searchTerm" (ngModelChange)="resetPage()" placeholder="Tìm theo họ tên, email hoặc vị trí" aria-label="Tìm ứng viên" /></label><button nz-button (click)="load()" [disabled]="loading()"><span nz-icon nzType="reload"></span>Làm mới</button></div>
        @if (loading()) { <div class="skeleton-list"><nz-skeleton [nzActive]="true" [nzParagraph]="{ rows: 6 }"></nz-skeleton></div> }
        @else if (loadError()) { <div class="load-error" role="alert"><span nz-icon nzType="exclamation-circle"></span><div><strong>Không thể tải danh sách ứng viên</strong><span>Kiểm tra kết nối rồi thử lại.</span></div><button nz-button nzSize="small" (click)="load()"><span nz-icon nzType="reload"></span>Thử lại</button></div> }
        @else if (filteredCandidates().length) {
          <nz-table #candidatesTable [nzData]="pagedCandidates()" [nzShowPagination]="false" nzSize="middle"><thead><tr><th>Ứng viên</th><th>Vị trí đã ứng tuyển</th><th>Hồ sơ</th><th>Cập nhật gần nhất</th><th>Điểm AI tốt nhất</th><th></th></tr></thead><tbody>
            @for (candidate of candidatesTable.data; track candidate.key) { <tr><td><div class="person"><span class="avatar">{{ initials(candidate.name) }}</span><div><strong>{{ candidate.name }}</strong><small>{{ candidate.email }}</small></div></div></td><td><div class="job-list">@for (title of candidate.jobTitles.slice(0, 2); track title) { <span>{{ title }}</span> } @if (candidate.jobTitles.length > 2) { <small>+{{ candidate.jobTitles.length - 2 }} vị trí khác</small> }</div></td><td><strong>{{ candidate.applications.length }}</strong></td><td><div>{{ candidate.latestApplication.submitted_at | date:'dd/MM/yyyy' }}</div><nz-tag [nzColor]="statusColor(candidate.latestApplication.status)">{{ statusLabel(candidate.latestApplication.status) }}</nz-tag></td><td><strong class="score" [class.score--empty]="candidate.bestAiScore === null">{{ candidate.bestAiScore ?? '—' }}</strong></td><td class="actions"><a nz-button nzType="link" routerLink="/applications" [queryParams]="{ candidate: candidate.email }" nz-tooltip nzTooltipTitle="Xem hồ sơ của ứng viên"><span nz-icon nzType="right"></span></a></td></tr> }
          </tbody></nz-table>
          <footer class="table-footer"><span>{{ filteredCandidates().length }} ứng viên phù hợp</span><div><button nz-button nzSize="small" (click)="previousPage()" [disabled]="page() === 1">Trước</button><span>Trang {{ page() }}/{{ totalPages() }}</span><button nz-button nzSize="small" (click)="nextPage()" [disabled]="page() === totalPages()">Sau</button></div></footer>
        } @else { <nz-empty nzNotFoundContent="Chưa tìm thấy ứng viên phù hợp"></nz-empty> }
      </section>
    </main>
  `,
  styles: [`
    .directory-page{max-width:1400px;margin:0 auto;animation:enter .32s ease-out}.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:20px}.page-kicker{margin:0 0 6px;color:var(--color-primary);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.page-header h1{margin:0;color:var(--color-text);font-family:var(--font-heading);font-size:clamp(24px,2.45vw,30px);font-weight:700;line-height:1.12;letter-spacing:-.04em}.page-header p:not(.page-kicker){margin:8px 0 0;color:var(--color-text-secondary);font-size:14px;font-weight:500}.summary-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;overflow:hidden;margin-bottom:18px;border:1px solid var(--color-border-light);border-radius:15px;background:var(--color-border-light)}.summary-strip div{padding:15px 20px;background:var(--color-bg-card)}.summary-strip span,.summary-strip strong{display:block}.summary-strip span{margin-bottom:4px;color:var(--color-text-secondary);font-size:12px;font-weight:600}.summary-strip strong{color:var(--color-text);font-size:25px;line-height:1;font-variant-numeric:tabular-nums}.directory-card{overflow:hidden;border:1px solid var(--color-border-light);border-radius:17px;background:var(--color-bg-card);box-shadow:0 12px 28px hsl(220 30% 18% / .055)}.toolbar{display:flex;align-items:center;gap:10px;padding:17px;border-bottom:1px solid var(--color-border-light)}.search-field{display:flex;align-items:center;gap:8px;flex:1;max-width:440px;padding:0 11px;border:1px solid var(--color-border);border-radius:9px;color:var(--color-text-tertiary);background:var(--color-bg-secondary)}.search-field:focus-within{border-color:var(--color-primary);box-shadow:0 0 0 3px hsl(215 78% 48% / .12)}.search-field input{border:0!important;background:transparent!important;box-shadow:none!important}.skeleton-list{padding:22px}.person{display:flex;align-items:center;gap:10px}.avatar{display:grid;width:34px;height:34px;place-items:center;border-radius:10px;color:var(--color-primary);background:var(--color-primary-50);font-size:11px;font-weight:800}.person strong{display:block;color:var(--color-text);font-size:13px}.person small{display:block;margin-top:3px;color:var(--color-text-secondary);font-size:11px}.job-list{display:grid;gap:4px}.job-list span{color:var(--color-text);font-size:12px;font-weight:600}.job-list small{color:var(--color-text-secondary);font-size:11px}.score{color:var(--color-primary);font-variant-numeric:tabular-nums}.score--empty{color:var(--color-text-tertiary)}.actions{text-align:right}.table-footer{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:13px 17px;border-top:1px solid var(--color-border-light);color:var(--color-text-secondary);font-size:12px}.table-footer div{display:flex;align-items:center;gap:8px}@keyframes enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@media(max-width:700px){.page-header{align-items:flex-start;flex-direction:column}.summary-strip{grid-template-columns:1fr}.toolbar{align-items:stretch;flex-direction:column}.search-field{max-width:none}.directory-card{border-radius:13px}.table-footer{align-items:flex-start;flex-direction:column}:host ::ng-deep .ant-table{overflow-x:auto}}
    /* A short, one-word heading reads optically larger; align it with the other Admin pages. */
    .page-header h1 { font-size: 26px; }
  `, `
    .load-error{display:flex;align-items:center;gap:12px;margin:18px;padding:16px;border:1px solid hsl(0 70% 82%);border-radius:12px;color:var(--color-error);background:var(--color-error-bg)}.load-error>div{display:grid;gap:2px}.load-error span{font-size:12px}.load-error button{margin-left:auto}
  `],
})
export class CandidatesComponent implements OnInit {
  private readonly directory = inject(ApplicationDirectoryService); private readonly destroyRef = inject(DestroyRef);
  readonly candidates = signal<DirectoryCandidate[]>([]); readonly loading = signal(true); readonly loadError = signal(false); readonly page = signal(1); readonly pageSize = 10; searchTerm = '';
  readonly filteredCandidates = computed(() => { const search = this.searchTerm.trim().toLowerCase(); return this.candidates().filter((candidate) => !search || [candidate.name, candidate.email, ...candidate.jobTitles].some((value) => value.toLowerCase().includes(search))); });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredCandidates().length / this.pageSize)));
  readonly pagedCandidates = computed(() => this.filteredCandidates().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  readonly evaluatedCount = computed(() => this.candidates().filter((candidate) => candidate.bestAiScore !== null).length);
  readonly multiApplicationCount = computed(() => this.candidates().filter((candidate) => candidate.applications.length > 1).length);
  ngOnInit(): void { this.load(); }
  load(): void { this.loading.set(true); this.loadError.set(false); this.directory.getAllCandidates().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (candidates) => { this.candidates.set(candidates); this.loading.set(false); this.resetPage(); }, error: () => { this.loading.set(false); this.loadError.set(true); } }); }
  resetPage(): void { this.page.set(1); } previousPage(): void { this.page.update((page) => Math.max(1, page - 1)); } nextPage(): void { this.page.update((page) => Math.min(this.totalPages(), page + 1)); }
  initials(name: string): string { return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase() || 'UV'; }
  statusLabel(status: string): string { return APPLICATION_STATUS_LABELS[status] ?? status; } statusColor(status: string): string { return APPLICATION_STATUS_COLORS[status] ?? 'default'; }
}
