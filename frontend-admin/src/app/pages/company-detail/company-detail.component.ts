import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { CompanyService } from '../../core/services/company.service';
import { CompanyOverview } from '../companies/models/company-api.model';

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
  ],
  template: `
    <main class="company-detail-page">
      <a class="back-link" routerLink="/companies">
        <span nz-icon nzType="arrow-left" aria-hidden="true"></span>
        Danh sách công ty
      </a>

      @if (loading()) {
        <section class="loading-card" aria-label="Đang tải hồ sơ công ty">
          <nz-skeleton [nzActive]="true" [nzParagraph]="{ rows: 6 }"></nz-skeleton>
        </section>
      } @else if (loadError()) {
        <section class="state-card" role="alert">
          <span class="state-icon" nz-icon nzType="exclamation-circle" aria-hidden="true"></span>
          <div>
            <h1>Không thể tải thông tin công ty</h1>
            <p>Hãy kiểm tra kết nối rồi thử lại.</p>
          </div>
          <button nz-button nzType="primary" (click)="loadOverview()">
            <span nz-icon nzType="reload"></span>
            Thử lại
          </button>
        </section>
      } @else {
        @if (overview(); as data) {
        <section class="company-cover" aria-hidden="true">
          <span class="cover-orb cover-orb--one"></span>
          <span class="cover-orb cover-orb--two"></span>
          <span class="cover-grid"></span>
        </section>
        <section class="company-hero" aria-labelledby="company-title">
          <div class="company-avatar" aria-hidden="true">{{ getInitial(data.company.company_name) }}</div>
          <div class="company-identity">
            <h1 id="company-title">{{ data.company.company_name }}</h1>
            <p class="company-summary">{{ getCompanySummary(data) }}</p>
            <div class="company-tags">
              <nz-tag nzColor="blue">{{ data.company.company_code }}</nz-tag>
              @if (data.company.industry) {
                <span><span nz-icon nzType="appstore" aria-hidden="true"></span>{{ data.company.industry }}</span>
              }
              @if (data.company.location) {
                <span><span nz-icon nzType="environment" aria-hidden="true"></span>{{ data.company.location }}</span>
              }
            </div>
          </div>
        </section>

        <nav class="profile-tabs" aria-label="Nội dung hồ sơ công ty">
          <a class="profile-tab profile-tab--active" href="#company-overview">Tổng quan</a>
          <a class="profile-tab" href="#company-jobs">Tin tuyển dụng <span>{{ data.stats.active_jobs }}</span></a>
        </nav>

        <section class="stat-grid" aria-label="Chỉ số tuyển dụng">
          <article class="metric-card metric-card--accent">
            <span class="metric-icon" nz-icon nzType="global" aria-hidden="true"></span>
            <span class="metric-label">Đang tuyển</span>
            <strong>{{ data.stats.active_jobs }}</strong>
            <span class="metric-note">vị trí đã đăng tuyển</span>
          </article>
          <article class="metric-card">
            <span class="metric-icon" nz-icon nzType="solution" aria-hidden="true"></span>
            <span class="metric-label">Tổng vị trí</span>
            <strong>{{ data.stats.total_jobs }}</strong>
            <span class="metric-note">tin đã tạo trong hệ thống</span>
          </article>
          <article class="metric-card">
            <span class="metric-icon" nz-icon nzType="file-text" aria-hidden="true"></span>
            <span class="metric-label">Tổng hồ sơ</span>
            <strong>{{ data.stats.total_applications }}</strong>
            <span class="metric-note">hồ sơ đã nộp</span>
          </article>
          <article class="metric-card">
            <span class="metric-icon" nz-icon nzType="clock-circle" aria-hidden="true"></span>
            <span class="metric-label">Đang xử lý</span>
            <strong>{{ data.stats.in_progress_applications }}</strong>
            <span class="metric-note">hồ sơ trong quy trình tuyển</span>
          </article>
        </section>

        <section class="content-grid" id="company-overview">
          <nz-card class="jobs-card">
            <article class="company-introduction">
              <div class="introduction-heading">
                <span nz-icon nzType="idcard" aria-hidden="true"></span>
                <h2>Giới thiệu công ty</h2>
              </div>
              <p>{{ getCompanyDescription(data) }}</p>
            </article>

            <div class="section-divider"></div>
            <div class="section-header">
              <div>
                <h2 id="company-jobs">Tin tuyển dụng</h2>
                <p>{{ data.stats.active_jobs }} vị trí đang tuyển · Hiển thị {{ data.jobs.length }} trên {{ data.stats.total_jobs }} tin.</p>
              </div>
            </div>

            @if (data.jobs.length) {
              <div class="job-list">
                @for (job of data.jobs; track job.id) {
                  <a class="job-row" [routerLink]="['/jobs', job.id]">
                    <div class="job-primary">
                      <strong>{{ job.title_vi }}</strong>
                      <div class="job-meta">
                        @if (job.department) { <span>{{ job.department }}</span> }
                        @if (job.location) { <span><span nz-icon nzType="environment" aria-hidden="true"></span>{{ job.location }}</span> }
                        <span>{{ formatDate(job.created_at) }}</span>
                      </div>
                    </div>
                    <nz-tag [nzColor]="getStatusColor(job.status)">{{ getStatusLabel(job.status) }}</nz-tag>
                    <div class="application-total">
                      <strong>{{ job.applications_count }}</strong>
                      <span>hồ sơ</span>
                    </div>
                    <span nz-icon nzType="right" class="job-arrow" aria-hidden="true"></span>
                  </a>
                }
              </div>
            } @else {
              <nz-empty nzNotFoundContent="Công ty này chưa tạo tin tuyển dụng nào"></nz-empty>
            }
          </nz-card>

          <aside aria-label="Thông tin công ty">
            <nz-card class="information-card">
              <h2>Thông tin công ty</h2>
              <dl>
                <div>
                  <dt>Mã công ty</dt>
                  <dd><nz-tag nzColor="blue">{{ data.company.company_code }}</nz-tag></dd>
                </div>
                <div>
                  <dt>Ngành nghề</dt>
                  <dd>{{ data.company.industry || 'Chưa cập nhật' }}</dd>
                </div>
                <div>
                  <dt>Địa điểm</dt>
                  <dd>{{ data.company.location || 'Chưa cập nhật' }}</dd>
                </div>
                <div>
                  <dt>Đội ngũ tuyển dụng</dt>
                  <dd>{{ data.stats.hr_members }} thành viên HR đang hoạt động</dd>
                </div>
              </dl>
            </nz-card>

            <nz-card class="workflow-card">
              <span nz-icon nzType="environment" aria-hidden="true"></span>
              <div>
                <strong>Địa điểm công ty</strong>
                <p>{{ data.company.location || 'Công ty chưa cập nhật địa điểm hoạt động.' }}</p>
              </div>
            </nz-card>
          </aside>
        </section>
        }
      }
    </main>
  `,
  styles: [`
    .company-detail-page { animation: page-enter .24s ease-out; max-width: 1280px; margin: 0 auto; padding-bottom: 18px; }
    .back-link { display: inline-flex; align-items: center; gap: 7px; margin-bottom: 16px; color: var(--color-text-secondary); font-size: 13px; font-weight: 600; transition: color .18s ease, transform .18s ease; }
    .back-link:hover { color: var(--color-primary); transform: translateX(-2px); }
    .company-cover { position: relative; height: 174px; overflow: hidden; border-radius: 18px 18px 0 0; background: linear-gradient(120deg, hsl(215 58% 29%), hsl(211 70% 43%)); }
    .company-cover::before { position: absolute; inset: 0; background-image: linear-gradient(hsl(0 0% 100% / .08) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / .08) 1px, transparent 1px); background-size: 28px 28px; content: ''; mask-image: linear-gradient(110deg, hsl(0 0% 0% / .9), transparent 86%); }
    .cover-orb { position: absolute; border-radius: 50%; background: hsl(196 93% 75% / .2); filter: blur(1px); }
    .cover-orb--one { top: -92px; right: 14%; width: 235px; height: 235px; }
    .cover-orb--two { right: -52px; bottom: -88px; width: 218px; height: 218px; background: hsl(0 0% 100% / .12); }
    .cover-grid { position: absolute; top: 23px; right: 29px; width: 151px; height: 95px; border: 1px solid hsl(0 0% 100% / .2); border-radius: 10px; transform: rotate(-8deg); }
    .company-hero { position: relative; z-index: 1; display: grid; grid-template-columns: 88px minmax(0, 1fr); align-items: center; gap: 20px; min-height: 144px; margin: -49px 24px 0; padding: 23px 28px; border: 1px solid var(--color-border-light); border-radius: 15px; background: var(--color-bg-secondary); box-shadow: 0 12px 30px hsl(215 42% 28% / .12); }
    .company-avatar { display: grid; width: 88px; height: 88px; place-items: center; border: 5px solid var(--color-bg-secondary); border-radius: 20px; color: #fff; background: var(--color-primary); box-shadow: 0 9px 18px hsl(215 62% 35% / .2); font-family: var(--font-heading); font-size: 34px; font-weight: 750; }
    .company-identity h1 { margin: 0; color: var(--color-text-primary); font-family: var(--font-heading); font-size: 29px; font-weight: 750; letter-spacing: -.04em; line-height: 1.15; text-wrap: balance; }
    .company-summary { max-width: 690px; margin: 7px 0 0; color: var(--color-text-secondary); font-size: 13px; line-height: 1.55; }
    .company-tags { display: flex; align-items: center; gap: 10px; margin-top: 10px; color: var(--color-text-secondary); font-size: 12px; flex-wrap: wrap; }
    .company-tags > span { display: inline-flex; align-items: center; gap: 5px; }
    .profile-tabs { display: flex; align-items: center; gap: 22px; min-height: 58px; margin: 0 24px 18px; padding: 0 6px; border-bottom: 1px solid var(--color-border-light); }
    .profile-tab { position: relative; display: inline-flex; align-items: center; gap: 7px; height: 58px; color: var(--color-text-secondary); font-size: 13px; font-weight: 650; }
    .profile-tab span { display: grid; min-width: 20px; height: 18px; place-items: center; border-radius: 5px; color: var(--color-primary); background: var(--color-primary-50); font-size: 10px; font-variant-numeric: tabular-nums; }
    .profile-tab--active { color: var(--color-primary); }
    .profile-tab--active::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; border-radius: 2px; background: var(--color-primary); content: ''; }
    .stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 13px; margin: 0 0 18px; }
    .metric-card { position: relative; display: grid; grid-template-columns: 36px 1fr; column-gap: 10px; row-gap: 3px; min-height: 108px; padding: 18px; border: 1px solid var(--color-border-light); border-radius: 13px; background: var(--color-bg-secondary); box-shadow: 0 6px 18px hsl(215 40% 25% / .04); overflow: hidden; }
    .metric-card::after { position: absolute; right: -22px; bottom: -33px; width: 95px; height: 95px; border: 1px solid hsl(214 50% 75% / .26); border-radius: 50%; content: ''; }
    .metric-card--accent { border-color: var(--color-primary-200); background: var(--color-primary-50); }
    .metric-icon { display: grid; grid-row: span 3; width: 36px; height: 36px; place-items: center; border-radius: 10px; color: var(--color-primary); background: hsl(213 85% 92%); font-size: 17px; }
    .metric-card--accent .metric-icon { color: #fff; background: var(--color-primary); }
    .metric-label { color: var(--color-text-secondary); font-size: 12px; font-weight: 600; }
    .metric-card strong { align-self: end; color: var(--color-text-primary); font-size: 25px; font-variant-numeric: tabular-nums; line-height: 1; }
    .metric-note { color: var(--color-text-tertiary); font-size: 11px; white-space: nowrap; }
    .content-grid { display: grid; grid-template-columns: minmax(0, 2.15fr) minmax(280px, .85fr); gap: 18px; align-items: start; }
    :host ::ng-deep .jobs-card .ant-card-body, :host ::ng-deep .information-card .ant-card-body { padding: 22px; }
    .company-introduction { padding: 1px 1px 5px; }
    .introduction-heading { display: flex; align-items: center; gap: 9px; }
    .introduction-heading > span { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 8px; color: var(--color-primary); background: var(--color-primary-50); font-size: 14px; }
    .company-introduction h2 { margin: 0; color: var(--color-text-primary); font-family: var(--font-heading); font-size: 17px; font-weight: 700; letter-spacing: -.02em; }
    .company-introduction p { max-width: 72ch; margin: 13px 0 0; color: var(--color-text-secondary); font-size: 13px; line-height: 1.75; white-space: pre-line; }
    .section-divider { height: 1px; margin: 22px 0; background: var(--color-border-light); }
    .section-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
    .section-header h2, .information-card h2 { margin: 0; color: var(--color-text-primary); font-family: var(--font-heading); font-size: 17px; font-weight: 700; letter-spacing: -.02em; }
    .section-header p { margin: 5px 0 0; color: var(--color-text-secondary); font-size: 12px; }
    .job-list { border-top: 1px solid var(--color-border-light); }
    .job-row { display: grid; grid-template-columns: minmax(0, 1fr) auto 66px 14px; align-items: center; gap: 14px; min-height: 71px; padding: 12px 4px; border-bottom: 1px solid var(--color-border-light); color: inherit; transition: background .18s ease, padding .18s ease; }
    .job-row:hover { padding-right: 9px; padding-left: 9px; border-radius: 9px; background: var(--color-primary-50); }
    .job-primary { min-width: 0; }
    .job-primary strong { display: block; overflow: hidden; color: var(--color-text-primary); font-size: 13px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
    .job-meta { display: flex; gap: 10px; margin-top: 6px; color: var(--color-text-secondary); font-size: 11px; }
    .job-meta span { display: inline-flex; align-items: center; gap: 3px; }
    .application-total { display: grid; justify-items: end; gap: 2px; color: var(--color-text-secondary); font-size: 10px; }
    .application-total strong { color: var(--color-text-primary); font-size: 15px; font-variant-numeric: tabular-nums; line-height: 1; }
    .job-arrow { color: var(--color-text-tertiary); font-size: 11px; }
    .information-card h2 { margin-bottom: 16px; }
    .information-card dl { display: grid; gap: 14px; margin: 0; }
    .information-card dl > div { display: grid; gap: 5px; padding-bottom: 13px; border-bottom: 1px solid var(--color-border-light); }
    .information-card dl > div:last-child { padding-bottom: 0; border-bottom: 0; }
    .information-card dt { color: var(--color-text-tertiary); font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    .information-card dd { margin: 0; color: var(--color-text-primary); font-size: 13px; font-weight: 600; }
    .workflow-card { margin-top: 15px; background: hsl(213 66% 97%); }
    :host ::ng-deep .workflow-card .ant-card-body { display: flex; align-items: flex-start; gap: 12px; padding: 17px; }
    .workflow-card > span { display: grid; flex: 0 0 auto; width: 34px; height: 34px; place-items: center; border-radius: 10px; color: var(--color-primary); background: hsl(213 83% 91%); font-size: 16px; }
    .workflow-card strong { display: block; margin-top: 1px; color: var(--color-text-primary); font-size: 13px; }
    .workflow-card p { margin: 5px 0 0; color: var(--color-text-secondary); font-size: 12px; line-height: 1.55; }
    .loading-card, .state-card { padding: 28px; border: 1px solid var(--color-border-light); border-radius: 16px; background: var(--color-bg-secondary); }
    .state-card { display: flex; align-items: center; gap: 15px; }
    .state-icon { color: var(--color-error); font-size: 25px; }
    .state-card h1 { margin: 0; font-size: 17px; }
    .state-card p { margin: 4px 0 0; color: var(--color-text-secondary); font-size: 13px; }
    .state-card button { margin-left: auto; }
    @keyframes page-enter { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
  `],
})
export class CompanyDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly companyService = inject(CompanyService);
  private readonly destroyRef = inject(DestroyRef);

  overview = signal<CompanyOverview | null>(null);
  loading = signal(true);
  loadError = signal(false);
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
          this.loading.set(false);
        },
        error: () => {
          this.overview.set(null);
          this.loading.set(false);
          this.loadError.set(true);
        },
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
