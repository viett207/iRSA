/**
 * CV Job Search page — uploads a CV and ranks suitable jobs by score.
 */
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Component, DestroyRef, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { JobService } from '../../core/services/job.service';
import { ToastService } from '../../core/services/toast.service';
import {
  ResumeUploaderComponent,
  ResumeUploaderSelection,
} from '../../shared/components/resume-uploader.component';
import { CVJobMatchItem, CVJobSearchResponse } from '../../shared/models/job.model';
import { Resume } from '../../shared/models/resume.model';

type AnalysisStage = 'uploading' | 'extracting' | 'matching' | 'done';

export function sortJobMatchesByScore(jobs: CVJobMatchItem[]): CVJobMatchItem[] {
  return [...jobs].sort((first, second) => second.total_score - first.total_score);
}

@Component({
  selector: 'app-cv-job-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    ResumeUploaderComponent,
    NzButtonModule,
    NzCardModule,
    NzEmptyModule,
    NzIconModule,
    NzInputNumberModule,
    NzPaginationModule,
    NzProgressModule,
    NzSliderModule,
    NzTagModule,
    NzToolTipModule,
  ],
  template: `
    <main class="cv-search-page">
      <div class="container">
        <!-- Back Link -->
        <div class="back-link-wrapper">
          <a routerLink="/" class="back-link">
            <span nz-icon nzType="arrow-left" nzTheme="outline"></span>
            <span>Quay lại trang chủ</span>
          </a>
        </div>

        <header class="page-header">
          <span class="eyebrow">AI CV MATCHING</span>
          <h1>Tìm việc làm bằng CV</h1>
          <p>Tải lên CV của bạn hoặc chọn CV đã lưu để hệ thống AI phân tích và gợi ý các công việc phù hợp nhất.</p>
        </header>

        <nz-card class="search-card" [nzBordered]="false">
          <div class="uploader-heading">
            <div>
              <span class="section-kicker">Chọn hồ sơ ứng tuyển</span>
              <h2>CV dùng để tìm việc</h2>
            </div>
            <span class="secure-note">
              <span nz-icon nzType="safety-certificate" nzTheme="outline"></span>
              Dữ liệu của bạn được bảo mật
            </span>
          </div>

          <app-resume-uploader
            [disabled]="searching"
            [showSavedResumes]="true"
            (selectionChange)="onResumeSelectionChange($event)"
          ></app-resume-uploader>

          <button
            type="button"
            nz-button
            nzType="primary"
            nzSize="large"
            class="analyze-button"
            [disabled]="searching"
            [nzLoading]="searching"
            (click)="searchWithSelection()"
          >
            <span nz-icon nzType="search" nzTheme="outline"></span>
            {{ selectedResume ? 'Tìm việc với CV đã lưu' : 'Phân tích CV và tìm việc' }}
          </button>
        </nz-card>

        @if (searching) {
          <section class="analysis-panel" aria-live="polite" aria-busy="true">
            <div class="analysis-topline">
              <div class="ai-orb"><span nz-icon nzType="robot" nzTheme="outline"></span></div>
              <div>
                <span class="section-kicker">Đang xử lý</span>
                <h2>{{ progressLabel }}</h2>
              </div>
              <strong class="progress-number">{{ analysisProgress }}%</strong>
            </div>

            <nz-progress
              [nzPercent]="analysisProgress"
              [nzShowInfo]="false"
              nzStatus="active"
              [nzStrokeWidth]="10"
            ></nz-progress>

            <div class="analysis-steps">
              <div class="analysis-step" [class.active]="analysisStage === 'uploading'" [class.done]="isStageDone('uploading')">
                <span class="step-icon"><span nz-icon [nzType]="isStageDone('uploading') ? 'check' : 'cloud-upload'" nzTheme="outline"></span></span>
                <div><strong>Tải CV</strong><span>{{ uploadStepDescription }}</span></div>
              </div>
              <div class="step-line" [class.done]="isStageDone('uploading')"></div>
              <div class="analysis-step" [class.active]="analysisStage === 'extracting'" [class.done]="isStageDone('extracting')">
                <span class="step-icon"><span nz-icon [nzType]="isStageDone('extracting') ? 'check' : 'file-text'" nzTheme="outline"></span></span>
                <div><strong>Trích xuất nội dung</strong><span>Đọc kỹ năng và kinh nghiệm</span></div>
              </div>
              <div class="step-line" [class.done]="isStageDone('extracting')"></div>
              <div class="analysis-step" [class.active]="analysisStage === 'matching'" [class.done]="isStageDone('matching')">
                <span class="step-icon"><span nz-icon [nzType]="isStageDone('matching') ? 'check' : 'fund-projection-screen'" nzTheme="outline"></span></span>
                <div><strong>Đối chiếu việc làm</strong><span>Xếp hạng theo độ phù hợp</span></div>
              </div>
            </div>
          </section>
        }

        @if (searched && !searching) {
          <section class="results-section" id="recommendations">
            <div class="results-heading">
              <div>
                <span class="section-kicker">Gợi ý dành cho bạn</span>
                <h2>Việc làm phù hợp nhất</h2>
                <p>Kết quả được sắp xếp theo mức độ phù hợp từ cao xuống thấp.</p>
              </div>
              <span class="result-count">{{ filteredJobs.length }}/{{ allJobs.length }} vị trí</span>
            </div>

            <div class="filter-card">
              <div class="threshold-copy">
                <span nz-icon nzType="filter" nzTheme="outline"></span>
                <span>Chỉ hiện việc làm đạt từ</span>
                <strong [ngClass]="getScoreClass(scoreThreshold)">{{ scoreThreshold }}%</strong>
              </div>
              <nz-slider
                [(ngModel)]="scoreThreshold"
                [nzMin]="0"
                [nzMax]="100"
                [nzStep]="5"
                [nzTipFormatter]="thresholdFormatter"
                (ngModelChange)="onThresholdChange()"
                (nzOnAfterChange)="onThresholdChange()"
              ></nz-slider>
              <nz-input-number
                [(ngModel)]="scoreThreshold"
                [nzMin]="0"
                [nzMax]="100"
                [nzStep]="5"
                nzSize="default"
                (ngModelChange)="onThresholdChange()"
              ></nz-input-number>
            </div>

            @if (filteredJobs.length === 0) {
              <div class="empty-results">
                <nz-empty nzNotFoundContent="Chưa có vị trí phù hợp với mức điểm đã chọn."></nz-empty>
                @if (scoreThreshold > 0) {
                  <button type="button" nz-button (click)="resetThreshold()">Xem tất cả kết quả</button>
                }
              </div>
            } @else {
              <div class="job-grid">
                @for (job of paginatedJobs; track job.id; let rank = $index) {
                  <article class="job-card" tabindex="0" (click)="goToJob(job.slug)" (keydown.enter)="goToJob(job.slug)">
                    <div class="card-accent" [ngClass]="getScoreClass(job.total_score)"></div>
                    <div class="job-card-header">
                      <div class="job-rank">
                        @if (currentPage === 1 && rank < 3) {
                          <span nz-icon nzType="trophy" nzTheme="fill"></span>
                          Top {{ rank + 1 }} phù hợp
                        } @else {
                          Gợi ý #{{ (currentPage - 1) * pageSize + rank + 1 }}
                        }
                      </div>
                      <div
                        class="match-score"
                        [ngClass]="getScoreClass(job.total_score)"
                        nz-tooltip
                        nzTooltipTitle="Điểm số tương thích toàn diện giữa hồ sơ của bạn và bản mô tả công việc (JD)"
                      >
                        <strong>{{ job.total_score | number:'1.0-0' }}%</strong>
                        <span>Match</span>
                      </div>
                    </div>

                    <h3>{{ job.title_vi }}</h3>
                    <div class="company-name">
                      <span nz-icon nzType="bank" nzTheme="outline"></span>
                      {{ job.company_name || job.department || 'Nhà tuyển dụng' }}
                    </div>

                    <div class="job-meta">
                      @if (job.location) {
                        <span nz-tooltip [nzTooltipTitle]="'Địa điểm: ' + job.location"><span nz-icon nzType="environment" nzTheme="outline"></span>{{ job.location }}</span>
                      }
                      @if (job.employment_type) {
                        <span nz-tooltip [nzTooltipTitle]="'Hình thức làm việc: ' + job.employment_type"><span nz-icon nzType="clock-circle" nzTheme="outline"></span>{{ job.employment_type }}</span>
                      }
                      <span class="salary" nz-tooltip nzTooltipTitle="Mức thu nhập dự kiến"><span nz-icon nzType="dollar" nzTheme="outline"></span>{{ formatSalary(job.salary_min, job.salary_max) }}</span>
                    </div>

                    <div class="score-breakdown" aria-label="Chi tiết điểm phù hợp">
                      <div nz-tooltip nzTooltipTitle="Mức độ trùng khớp kỹ năng chuyên môn"><span>Kỹ năng</span><strong>{{ job.skill_score | number:'1.0-0' }}%</strong></div>
                      <div nz-tooltip nzTooltipTitle="Mức độ phù hợp về số năm và lĩnh vực kinh nghiệm"><span>Kinh nghiệm</span><strong>{{ job.experience_score | number:'1.0-0' }}%</strong></div>
                      <div nz-tooltip nzTooltipTitle="Mức độ đáp ứng về bằng cấp và chứng chỉ"><span>Học vấn</span><strong>{{ job.education_score | number:'1.0-0' }}%</strong></div>
                    </div>

                    <div class="skill-groups">
                      <div class="skill-group">
                        <div class="skill-label matched-label">
                          <span nz-icon nzType="check-circle" nzTheme="fill"></span>
                          Kỹ năng đã đáp ứng
                        </div>
                        <div class="skill-tags">
                          @for (skill of job.matched_skills.slice(0, 5); track skill) {
                            <nz-tag class="matched-tag">{{ skill }}</nz-tag>
                          } @empty {
                            <span class="no-skills">Chưa phát hiện kỹ năng trùng khớp</span>
                          }
                          @if (job.matched_skills.length > 5) {
                            <nz-tag class="more-tag">+{{ job.matched_skills.length - 5 }}</nz-tag>
                          }
                        </div>
                      </div>

                      <div class="skill-group">
                        <div class="skill-label missing-label">
                          <span nz-icon nzType="minus-circle" nzTheme="fill"></span>
                          Kỹ năng còn thiếu
                        </div>
                        <div class="skill-tags">
                          @for (skill of job.missing_skills.slice(0, 5); track skill) {
                            <nz-tag class="missing-tag">{{ skill }}</nz-tag>
                          } @empty {
                            <span class="no-skills all-matched">Bạn đã đáp ứng toàn bộ kỹ năng</span>
                          }
                          @if (job.missing_skills.length > 5) {
                            <nz-tag class="more-tag">+{{ job.missing_skills.length - 5 }}</nz-tag>
                          }
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      nz-button
                      nzType="primary"
                      nzBlock
                      nzSize="large"
                      class="apply-button"
                      (click)="applyNow(job, $event)"
                    >
                      Ứng tuyển ngay
                      <span nz-icon nzType="arrow-right" nzTheme="outline"></span>
                    </button>
                  </article>
                }
              </div>

              @if (filteredJobs.length > pageSize) {
                <div class="pagination-wrapper">
                  <nz-pagination
                    [nzTotal]="filteredJobs.length"
                    [nzPageIndex]="currentPage"
                    [nzPageSize]="pageSize"
                    [nzShowSizeChanger]="false"
                    (nzPageIndexChange)="onPageChange($event)"
                  ></nz-pagination>
                </div>
              }
            }
          </section>
        }
      </div>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .cv-search-page {
      min-height: calc(100vh - var(--header-height));
      padding: 40px 0 64px;
      background: linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 5%, var(--color-bg-primary)) 0, var(--color-bg-primary) 260px);
    }
    .container { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }
    .back-link-wrapper { margin-bottom: var(--space-5, 20px); }
    .back-link { display: inline-flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: var(--text-sm, 14px); font-weight: 500; text-decoration: none; transition: color var(--transition-fast, .2s ease); }
    .back-link:hover { color: var(--color-primary); }
    .page-header { margin-bottom: 28px; }
    .eyebrow, .section-kicker { display: block; color: var(--color-primary); font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 8px; }
    .page-header h1 { font-family: var(--font-heading); margin: 0; color: var(--color-text-primary); font-size: clamp(24px, 2.5vw, 28px); font-weight: 700; line-height: 1.25; letter-spacing: -0.01em; }
    .page-header p { max-width: 680px; margin: 10px 0 0; color: var(--color-text-secondary); font-size: 15px; line-height: 1.6; }
    .results-heading p { margin: 0; color: var(--color-text-secondary); font-size: 13.5px; }
    .search-card { margin-bottom: 16px; overflow: hidden; border: 1px solid var(--color-border); border-radius: 16px; box-shadow: var(--shadow-sm); }
    .search-card ::ng-deep .ant-card-body { padding: 16px 20px 18px; }
    .uploader-heading { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 10px; }
    .uploader-heading h2, .analysis-topline h2, .results-heading h2 { margin: 0; color: var(--color-text-primary); font-size: 16.5px; font-weight: 700; }
    .secure-note { display: inline-flex; align-items: center; gap: 5px; color: var(--color-success); font-size: 11.5px; white-space: nowrap; }
    .analyze-button { width: 100%; height: 42px; margin-top: 10px; border-radius: 10px; font-weight: 600; font-size: 14px; }
    .analysis-panel { margin: 24px 0; padding: 26px; border: 1px solid var(--color-primary-200); border-radius: 18px; background: linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-bg-primary) 50%, var(--color-primary-50) 100%); box-shadow: var(--shadow-lg); overflow: hidden; }
    .analysis-panel ::ng-deep .ant-progress-inner { background-color: var(--color-primary-100) !important; border: 1px solid var(--color-primary-200); }
    .analysis-panel ::ng-deep .ant-progress-bg { background: linear-gradient(90deg, var(--color-primary-light) 0%, var(--color-primary) 100%) !important; box-shadow: var(--shadow-sm); }
    .analysis-topline { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
    .analysis-topline .section-kicker { color: var(--color-primary); }
    .analysis-topline h2 { margin: 0; color: var(--color-text-primary); font-size: 20px; font-weight: 700; }
    .ai-orb { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%; color: var(--color-primary); background: var(--color-primary-50); border: 1.5px solid var(--color-primary-200); font-size: 24px; box-shadow: 0 0 0 6px var(--color-primary-100), var(--shadow-md); animation: pulse 1.8s ease-in-out infinite; }
    .analysis-topline > div:nth-child(2) { flex: 1; }
    .progress-number { color: var(--color-primary); font-size: 24px; font-weight: 800; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.06); }
    .analysis-steps { display: grid; grid-template-columns: minmax(130px, 1fr) 50px minmax(150px, 1fr) 50px minmax(150px, 1fr); align-items: center; gap: 10px; margin-top: 24px; }
    .analysis-step { display: flex; align-items: center; gap: 10px; opacity: .85; transition: opacity .25s ease, transform .25s ease; }
    .analysis-step.active, .analysis-step.done { opacity: 1; }
    .analysis-step.active { transform: translateY(-2px); }
    .step-icon { flex: none; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; color: var(--color-text-secondary); background: var(--color-bg-secondary); border: 2px solid var(--color-border); font-size: 16px; transition: all .25s ease; }
    .step-icon [nz-icon] { font-size: 16px; display: inline-flex; align-items: center; justify-content: center; }
    .analysis-step.active .step-icon { color: #FFFFFF; background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%); border: 2px solid var(--color-primary); box-shadow: 0 0 0 4px var(--color-primary-200); animation: pulse 1.4s ease-in-out infinite; }
    .analysis-step.done .step-icon { color: #FFFFFF; background: var(--color-success); border: 2px solid var(--color-success); box-shadow: 0 0 0 3px var(--color-success-bg); }
    .analysis-step div { display: flex; flex-direction: column; }
    .analysis-step strong { color: var(--color-text-primary); font-size: 13.5px; font-weight: 600; }
    .analysis-step span { color: var(--color-text-tertiary); font-size: 11.5px; }
    .analysis-step.active strong { color: var(--color-text-primary); font-weight: 700; }
    .analysis-step.active span { color: var(--color-primary); font-weight: 600; }
    .analysis-step.done strong { color: var(--color-success); font-weight: 700; }
    .analysis-step.done span { color: var(--color-success-dark); font-weight: 500; }
    .step-line { height: 3px; background: var(--color-border); border-radius: 2px; transition: background .25s ease; }
    .step-line.done { background: var(--color-success); }
    .results-section { margin-top: 34px; scroll-margin-top: 90px; }
    .results-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
    .results-heading h2 { font-size: 27px; }
    .result-count { flex: none; padding: 7px 13px; border-radius: 999px; color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 9%, transparent); font-size: 13px; font-weight: 600; }
    .filter-card { display: grid; grid-template-columns: auto minmax(180px, 1fr) 80px; align-items: center; gap: 20px; padding: 16px 24px; margin-bottom: 20px; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-bg-primary); }
    .filter-card nz-slider { margin: 0 4px; }
    .filter-card nz-input-number { width: 80px; justify-self: end; }
    .filter-card ::ng-deep .ant-input-number { border-radius: 8px; border-color: var(--color-border); transition: border-color .2s ease, box-shadow .2s ease; }
    .filter-card ::ng-deep .ant-input-number:hover,
    .filter-card ::ng-deep .ant-input-number-focused { border-color: var(--color-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent); }
    .filter-card ::ng-deep .ant-input-number-input { text-align: center; font-weight: 600; font-size: 13.5px; padding: 0 8px; }
    .threshold-copy { display: flex; align-items: center; gap: 7px; color: var(--color-text-secondary); font-size: 13px; }
    .threshold-copy strong { min-width: 35px; font-size: 15px; }
    .score-high { color: var(--color-success); }
    .score-medium { color: var(--color-warning); }
    .score-low { color: var(--color-danger); }
    .job-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
    .job-card { position: relative; display: flex; flex-direction: column; min-width: 0; padding: 24px; overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-bg-secondary); box-shadow: var(--shadow-card); cursor: pointer; transition: transform .2s cubic-bezier(0.4,0,0.2,1), box-shadow .2s cubic-bezier(0.4,0,0.2,1), border-color .2s cubic-bezier(0.4,0,0.2,1); }
    .job-card:hover, .job-card:focus-visible { outline: none; transform: translateY(-4px); border-color: var(--color-primary-200); box-shadow: var(--shadow-card-hover), 0 0 0 1px rgba(15, 82, 186, 0.06); }
    .job-card:active { transform: translateY(-1px); box-shadow: var(--shadow-card); }
    .card-accent { position: absolute; inset: 0 auto 0 0; width: 4px; background: currentColor; }
    .job-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .job-rank { display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: var(--radius-sm); color: var(--color-warning-dark, #b45309); background: var(--color-warning-bg); font-size: 11.5px; font-weight: 700; border: 1px solid rgba(217, 119, 6, 0.2); }
    .match-score { flex: none; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 68px; height: 68px; border: 5px solid currentColor; border-radius: 50%; background: var(--color-bg-secondary); box-shadow: var(--shadow-sm); }
    .match-score strong { font-size: 18px; line-height: 1; font-weight: 800; }
    .match-score span { margin-top: 2px; color: var(--color-text-secondary); font-size: 10px; text-transform: uppercase; font-weight: 600; }
    .job-card h3 { margin: 12px 0 6px; color: var(--color-text-primary); font-size: 1.125rem; line-height: 1.35; font-weight: 700; font-family: var(--font-heading); }
    .company-name { display: flex; align-items: center; gap: 6px; color: var(--color-primary); font-size: 14px; font-weight: 600; }
    .job-meta { display: flex; flex-wrap: wrap; gap: 8px 16px; margin: 14px 0; color: var(--color-text-secondary); font-size: 12.5px; }
    .job-meta > span { display: flex; align-items: center; gap: 5px; }
    .job-meta .salary { color: var(--color-success); font-weight: 700; background: var(--color-success-bg); padding: 2px 8px; border-radius: var(--radius-xs); }
    .score-breakdown { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px; margin-bottom: 16px; border-radius: var(--radius-md); background: var(--color-bg-tertiary); border: 1px solid var(--color-border); }
    .score-breakdown div { display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; }
    .score-breakdown span { color: var(--color-text-secondary); font-size: 11px; font-weight: 500; }
    .score-breakdown strong { color: var(--color-text-primary); font-size: 14px; font-weight: 700; }
    .skill-groups { display: flex; flex-direction: column; gap: 14px; flex: 1; }
    .skill-label { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 12.5px; font-weight: 600; }
    .matched-label { color: var(--color-success); }
    .missing-label { color: var(--color-text-secondary); }
    .skill-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-tags nz-tag { margin: 0; border-radius: var(--radius-sm); font-size: 11.5px; padding: 3px 8px; }
    .matched-tag { color: var(--color-success) !important; border-color: rgba(5, 150, 105, 0.3) !important; background: var(--color-success-bg) !important; font-weight: 500; }
    .missing-tag { color: var(--color-text-secondary) !important; border-color: var(--color-border) !important; background: var(--color-bg-secondary) !important; font-weight: 500; }
    .more-tag { color: var(--color-text-secondary) !important; }
    .no-skills { color: var(--color-text-tertiary); font-size: 11.5px; font-style: italic; }
    .no-skills.all-matched { color: var(--color-success); font-weight: 500; }
    .apply-button { height: 44px; margin-top: 20px; border-radius: var(--radius-md); font-weight: 600; }
    .pagination-wrapper, .empty-results { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 26px; }
    .empty-results { padding: 42px; border-radius: 16px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
    @media (max-width: 900px) {
      .job-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 700px) {
      .cv-search-page { padding: 28px 0 44px; }
      .container { width: min(100% - 24px, 1120px); }
      .page-header { align-items: flex-start; flex-direction: column; margin-bottom: 22px; }
      .search-card ::ng-deep .ant-card-body { padding: 18px; }
      .uploader-heading, .results-heading { align-items: flex-start; flex-direction: column; }
      .secure-note { align-self: flex-start; }
      .analysis-panel { padding: 20px 16px; }
      .analysis-topline { align-items: flex-start; }
      .analysis-steps { grid-template-columns: 1fr; gap: 8px; }
      .step-line { width: 2px; height: 18px; margin-left: 17px; }
      .filter-card { grid-template-columns: 1fr 80px; gap: 12px 16px; padding: 14px 16px; }
      .filter-card nz-slider { grid-column: 1 / -1; grid-row: 2; margin: 4px 0 0; }
      .job-card { padding: 18px; }
    }

    /* Dark Mode Overrides */
    :host-context([data-theme='dark']),
    :host-context(.dark) {
      .analysis-panel {
        background: linear-gradient(135deg, #111e38 0%, #0f172a 50%, #1e293b 100%);
        border-color: rgba(59, 130, 246, 0.3);
        box-shadow: 0 10px 28px -6px rgba(0, 0, 0, 0.4);
      }
      .analysis-panel ::ng-deep .ant-progress-inner {
        background-color: #1e293b !important;
        border-color: #334155;
      }
      .analysis-panel ::ng-deep .ant-progress-bg {
        background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%) !important;
      }
      .analysis-topline .section-kicker {
        color: #60a5fa;
      }
      .analysis-topline h2 {
        color: #f8fafc;
      }
      .ai-orb {
        background: #1e293b;
        color: #60a5fa;
        border-color: #3b82f6;
        box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      .progress-number {
        color: #60a5fa;
      }
      .step-icon {
        background: var(--color-bg-secondary);
        border-color: var(--color-border);
        color: var(--color-text-secondary);
      }
      .analysis-step strong {
        color: #f1f5f9;
      }
      .analysis-step span {
        color: #94a3b8;
      }
      .analysis-step.active strong {
        color: #f8fafc;
      }
      .analysis-step.active span {
        color: #60a5fa;
      }
      .step-line {
        background: #334155;
      }
      .filter-card {
        background: var(--color-bg-secondary);
        border-color: var(--color-border);
      }
      .score-breakdown {
        background: var(--color-bg-tertiary);
        border-color: var(--color-border);
      }
      .job-card {
        background: var(--color-bg-secondary);
        border-color: var(--color-border);
      }
      .match-score {
        background: var(--color-bg-secondary);
      }
    }
  `],
})
export class CVJobSearchComponent implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly jobService = inject(JobService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private progressSubscription: Subscription | null = null;

  ngOnDestroy(): void {
    this.stopProgressAnimation();
  }

  selectedFile: File | null = null;
  selectedResume: Resume | null = null;
  allJobs: CVJobMatchItem[] = [];
  filteredJobs: CVJobMatchItem[] = [];
  currentPage = 1;
  readonly pageSize = 10;
  searching = false;
  searched = false;
  scoreThreshold = 0;
  analysisProgress = 0;
  uploadProgress = 0;
  analysisStage: AnalysisStage = 'uploading';

  readonly thresholdFormatter = (value: number): string => `${value}%`;

  get paginatedJobs(): CVJobMatchItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredJobs.slice(start, start + this.pageSize);
  }

  get progressLabel(): string {
    switch (this.analysisStage) {
      case 'uploading': return 'Đang tải CV an toàn lên hệ thống...';
      case 'extracting': return 'Đang trích xuất kỹ năng và kinh nghiệm...';
      case 'matching': return 'Đang xếp hạng các công việc phù hợp...';
      case 'done': return 'Đã hoàn tất phân tích CV';
    }
  }

  get uploadStepDescription(): string {
    if (!this.selectedFile) return 'Sử dụng CV đã lưu';
    return this.analysisStage === 'uploading' ? `Đã tải ${this.uploadProgress}%` : 'Tải lên hoàn tất';
  }

  onResumeSelectionChange(selection: ResumeUploaderSelection): void {
    this.selectedFile = selection?.source === 'file' ? selection.file : null;
    this.selectedResume = selection?.source === 'saved' ? selection.resume : null;
    this.resetResults();
  }

  searchWithSelection(): void {
    if (this.searching) return;
    if (this.selectedFile) {
      this.startSearch({ file: this.selectedFile });
      return;
    }
    if (this.selectedResume) {
      this.startSearch({ resume_id: this.selectedResume.id });
      return;
    }
    this.toast.warning('Vui lòng tải lên file CV hoặc chọn CV đã lưu để tiếp tục.');
  }

  private startSearch(params: { file?: File; resume_id?: number }): void {
    this.searching = true;
    this.searched = false;
    this.currentPage = 1;
    this.allJobs = [];
    this.filteredJobs = [];
    this.startProgressAnimation(!!params.file);

    this.jobService.searchByCVWithProgress({ ...params, page: 1, size: 200 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const percent = event.total
              ? Math.round((event.loaded / event.total) * 100)
              : Math.min(this.uploadProgress + 10, 95);
            this.uploadProgress = Math.min(percent, 100);
            this.analysisProgress = Math.max(this.analysisProgress, Math.round(this.uploadProgress * 0.4));
            if (this.uploadProgress >= 100) {
              this.analysisStage = 'extracting';
              this.analysisProgress = Math.max(this.analysisProgress, 42);
            }
          }
          if (event.type === HttpEventType.Response && event.body) {
            this.completeSearch(event.body);
          }
        },
        error: (error: unknown) => {
          this.stopProgressAnimation();
          this.searching = false;
          this.toast.errorFromHttp(error, 'Không thể phân tích CV lúc này. Vui lòng thử lại.');
        },
      });
  }

  private completeSearch(response: CVJobSearchResponse): void {
    this.stopProgressAnimation();
    this.analysisStage = 'done';
    this.analysisProgress = 100;
    this.allJobs = sortJobMatchesByScore(
      response.items.map((job) => ({
        ...job,
        company_name: job.company_name ?? job.department ?? null,
        matched_skills: job.matched_skills ?? [],
        missing_skills: job.missing_skills ?? [],
      })),
    );
    this.applyThreshold();
    this.searching = false;
    this.searched = true;
  }

  private startProgressAnimation(hasFile: boolean): void {
    this.stopProgressAnimation();
    this.uploadProgress = hasFile ? 0 : 100;
    this.analysisProgress = hasFile ? 4 : 42;
    this.analysisStage = hasFile ? 'uploading' : 'extracting';
    this.progressSubscription = interval(320)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.analysisStage === 'uploading') {
          this.analysisProgress = Math.min(this.analysisProgress + 1, 38);
          return;
        }
        this.analysisProgress = Math.min(this.analysisProgress + 2, 92);
        if (this.analysisProgress >= 68) this.analysisStage = 'matching';
      });
  }

  private stopProgressAnimation(): void {
    this.progressSubscription?.unsubscribe();
    this.progressSubscription = null;
  }

  private resetResults(): void {
    this.searched = false;
    this.allJobs = [];
    this.filteredJobs = [];
    this.currentPage = 1;
  }

  onThresholdChange(): void {
    this.currentPage = 1;
    this.applyThreshold();
  }

  resetThreshold(): void {
    this.scoreThreshold = 0;
    this.onThresholdChange();
  }

  private applyThreshold(): void {
    const threshold = Math.max(0, Math.min(100, Number(this.scoreThreshold) || 0));
    this.filteredJobs = sortJobMatchesByScore(
      this.allJobs.filter((job) => Math.round(Number(job.total_score) || 0) >= threshold),
    );
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    document.getElementById('recommendations')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  goToJob(slug: string): void {
    void this.router.navigate(['/jobs', slug]);
  }

  applyNow(job: CVJobMatchItem, event: Event): void {
    event.stopPropagation();
    void this.router.navigate(['/jobs', job.slug], { queryParams: { apply: '1' } });
  }

  isStageDone(stage: Exclude<AnalysisStage, 'done'>): boolean {
    const order: AnalysisStage[] = ['uploading', 'extracting', 'matching', 'done'];
    return order.indexOf(this.analysisStage) > order.indexOf(stage);
  }

  getScoreClass(score: number): string {
    const num = Number(score) || 0;
    if (num >= 70) return 'score-high';
    if (num >= 40) return 'score-medium';
    return 'score-low';
  }

  formatSalary(min: number | null, max: number | null): string {
    if (min != null && max != null) return `${min}–${max} triệu`;
    if (min != null) return `Từ ${min} triệu`;
    if (max != null) return `Đến ${max} triệu`;
    return 'Thỏa thuận';
  }
}
