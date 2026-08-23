import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { CvJdCompareResponse, EDUCATION_LABELS } from '../models/job.model';

@Component({
  selector: 'app-cv-jd-compare-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTagModule,
    NzDividerModule,
    NzAlertModule,
    NzSpinModule,
    NzIconModule,
    NzDescriptionsModule,
    NzEmptyModule,
    NzToolTipModule,
    NzInputModule,
    NzButtonModule,
    NzBadgeModule,
  ],
  template: `
    @if (loading) {
      <div style="text-align: center; padding: 50px">
        <nz-spin nzSimple></nz-spin>
        <p style="margin-top: 12px; color: #888">Đang tải và đối chiếu dữ liệu CV & JD...</p>
      </div>
    } @else if (error) {
      <nz-alert nzType="error" [nzMessage]="error" nzShowIcon></nz-alert>
    } @else if (data) {
      <div class="compare-container">
        <!-- Top Toolbar & Skill Summary -->
        <div class="top-summary-card">
          <div class="summary-header">
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600">
                <span nz-icon nzType="diff" nzTheme="outline" style="color: #1890ff; margin-right: 6px"></span>
                Đối chiếu trực quan: {{ data.candidate_name }} &harr; {{ data.job_title }}
              </h3>
              <div style="font-size: 12px; color: #888; margin-top: 2px">
                File CV: <strong>{{ data.resume_filename }}</strong> | Ứng tuyển: <strong>{{ data.job_department || 'Công ty' }}</strong>
              </div>
            </div>
            <!-- Custom Search Filter -->
            <div style="width: 260px">
              <nz-input-group [nzPrefix]="prefixSearch" nzSize="small">
                <input
                  type="text"
                  nz-input
                  placeholder="Tìm & highlight từ khóa..."
                  [(ngModel)]="customSearchTerm"
                />
              </nz-input-group>
              <ng-template #prefixSearch>
                <span nz-icon nzType="search"></span>
              </ng-template>
            </div>
          </div>

          <nz-divider style="margin: 10px 0"></nz-divider>

          <!-- Matching skills badges -->
          <div class="skills-summary-bar">
            <div class="skill-category">
              <span class="skill-category-title">
                <span nz-icon nzType="check-circle" style="color: #52c41a"></span>
                Khớp trong CV ({{ data.matched_skills.length }}):
              </span>
              <div class="tags-container">
                @for (skill of data.matched_skills; track skill) {
                  <nz-tag nzColor="success" class="clickable-tag" (click)="setSearchTerm(skill)">
                    <span nz-icon nzType="check"></span> {{ skill }}
                  </nz-tag>
                }
                @if (data.matched_skills.length === 0) {
                  <span style="font-size: 12px; color: #999; font-style: italic">Không tìm thấy từ khóa kỹ năng khớp trực tiếp</span>
                }
              </div>
            </div>

            @if (data.missing_skills.length > 0) {
              <div class="skill-category" style="margin-top: 8px">
                <span class="skill-category-title">
                  <span nz-icon nzType="close-circle" style="color: #fa8c16"></span>
                  Chưa thấy trong CV ({{ data.missing_skills.length }}):
                </span>
                <div class="tags-container">
                  @for (skill of data.missing_skills; track skill) {
                    <nz-tag nzColor="orange" class="clickable-tag" (click)="setSearchTerm(skill)">
                      <span nz-icon nzType="minus"></span> {{ skill }}
                    </nz-tag>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- 2 Columns: Split View -->
        <div class="split-view-grid">
          <!-- Left Column: CV Content -->
          <div class="panel-column cv-panel">
            <div class="panel-header">
              <div class="panel-title">
                <span nz-icon nzType="file-text" nzTheme="outline" style="color: #1890ff"></span>
                Nội dung CV ứng viên
              </div>
              <nz-tag nzColor="blue">{{ data.candidate_name }}</nz-tag>
            </div>
            <div class="panel-body">
              @if (data.cv_text) {
                <div class="text-content cv-text" [innerHTML]="highlightText(data.cv_text)"></div>
              } @else {
                <nz-empty nzNotFoundContent="Không có nội dung văn bản trích xuất được từ CV (hoặc file scan/ảnh)"></nz-empty>
              }
            </div>
          </div>

          <!-- Right Column: JD Content -->
          <div class="panel-column jd-panel">
            <div class="panel-header">
              <div class="panel-title">
                <span nz-icon nzType="audit" nzTheme="outline" style="color: #52c41a"></span>
                Mô tả & Tiêu chí công việc (JD)
              </div>
              <nz-tag nzColor="green">{{ data.job_title }}</nz-tag>
            </div>
            <div class="panel-body">
              <!-- Job Criteria Overview -->
              <div class="jd-section">
                <h4 class="jd-section-title">
                  <span nz-icon nzType="control" nzTheme="outline"></span>
                  Tiêu chí tuyển dụng
                </h4>
                <nz-descriptions nzBordered [nzColumn]="2" nzSize="small">
                  <nz-descriptions-item nzTitle="Kinh nghiệm">
                    {{ data.min_experience_years }} năm
                    @if (data.max_experience_years) { - {{ data.max_experience_years }} năm }
                  </nz-descriptions-item>
                  <nz-descriptions-item nzTitle="Học vấn">
                    {{ getEducationLabel(data.min_education) }}
                  </nz-descriptions-item>
                  <nz-descriptions-item nzTitle="Kỹ năng bắt buộc" [nzSpan]="2">
                    @for (s of data.must_have_skills; track s) {
                      <nz-tag [nzColor]="isSkillMatched(s) ? 'success' : 'red'">
                        <span nz-icon [nzType]="isSkillMatched(s) ? 'check' : 'close'"></span>
                        {{ s }}
                      </nz-tag>
                    }
                    @if (data.must_have_skills.length === 0) {
                      <span style="color: #999">-</span>
                    }
                  </nz-descriptions-item>
                  <nz-descriptions-item nzTitle="Kỹ năng ưu tiên" [nzSpan]="2">
                    @for (s of data.nice_to_have_skills; track s) {
                      <nz-tag [nzColor]="isSkillMatched(s) ? 'green' : 'orange'">
                        <span nz-icon [nzType]="isSkillMatched(s) ? 'check' : 'minus'"></span>
                        {{ s }}
                      </nz-tag>
                    }
                    @if (data.nice_to_have_skills.length === 0) {
                      <span style="color: #999">-</span>
                    }
                  </nz-descriptions-item>
                </nz-descriptions>
              </div>

              <!-- Job Description -->
              @if (data.job_description) {
                <div class="jd-section">
                  <h4 class="jd-section-title">
                    <span nz-icon nzType="project" nzTheme="outline"></span>
                    Mô tả công việc
                  </h4>
                  <div class="text-content" [innerHTML]="highlightText(data.job_description)"></div>
                </div>
              }

              <!-- Job Requirements -->
              @if (data.job_requirements) {
                <div class="jd-section">
                  <h4 class="jd-section-title">
                    <span nz-icon nzType="check-square" nzTheme="outline"></span>
                    Yêu cầu ứng viên
                  </h4>
                  <div class="text-content" [innerHTML]="highlightText(data.job_requirements)"></div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .compare-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .top-summary-card {
        background: #fdfdfd;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        padding: 12px 16px;
      }
      .summary-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      }
      .skills-summary-bar {
        font-size: 13px;
      }
      .skill-category {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .skill-category-title {
        font-weight: 600;
        font-size: 12px;
        color: #555;
        min-width: 140px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .clickable-tag {
        cursor: pointer;
        transition: transform 0.15s;
        margin: 0;
      }
      .clickable-tag:hover {
        transform: scale(1.05);
      }
      .split-view-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        height: calc(80vh - 160px);
        min-height: 480px;
      }
      .panel-column {
        display: flex;
        flex-direction: column;
        border: 1px solid #d9d9d9;
        border-radius: 8px;
        overflow: hidden;
        background: #fff;
      }
      .cv-panel {
        border-top: 3px solid #1890ff;
      }
      .jd-panel {
        border-top: 3px solid #52c41a;
      }
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 14px;
        background: #fafafa;
        border-bottom: 1px solid #f0f0f0;
      }
      .panel-title {
        font-weight: 600;
        font-size: 14px;
        color: #333;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .panel-body {
        flex: 1;
        overflow-y: auto;
        padding: 14px;
        font-size: 13px;
        line-height: 1.7;
      }
      .text-content {
        white-space: pre-wrap;
        font-family: inherit;
        color: #333;
        word-break: break-word;
      }
      .cv-text {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      .jd-section {
        margin-bottom: 16px;
      }
      .jd-section-title {
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 8px;
        color: #444;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      :host ::ng-deep mark.match-highlight {
        background-color: #b7eb8f;
        color: #135200;
        padding: 2px 4px;
        border-radius: 3px;
        font-weight: 600;
      }
      :host ::ng-deep mark.search-highlight {
        background-color: #ffe58f;
        color: #873800;
        padding: 2px 4px;
        border-radius: 3px;
        font-weight: 600;
      }
      @media (max-width: 900px) {
        .split-view-grid {
          grid-template-columns: 1fr;
          height: auto;
        }
        .panel-body {
          max-height: 400px;
        }
      }
    `,
  ],
})
export class CvJdCompareModalComponent {
  readonly modalData = inject(NZ_MODAL_DATA) as {
    data: CvJdCompareResponse | null;
    loading: boolean;
    error: string | null;
  };

  customSearchTerm = '';

  get data(): CvJdCompareResponse | null {
    return this.modalData.data;
  }
  get loading(): boolean {
    return this.modalData.loading;
  }
  get error(): string | null {
    return this.modalData.error;
  }

  isSkillMatched(skill: string): boolean {
    if (!this.data?.matched_skills) return false;
    return this.data.matched_skills.some(
      (s) => s.toLowerCase().trim() === skill.toLowerCase().trim()
    );
  }

  getEducationLabel(level?: string | null): string {
    if (!level) return 'Không yêu cầu cụ thể';
    return EDUCATION_LABELS[level] || level;
  }

  setSearchTerm(term: string): void {
    this.customSearchTerm = term;
  }

  highlightText(text: string | null | undefined): string {
    if (!text) return '';
    let escaped = this.escapeHtml(text);

    // 1. Highlight matched keywords from CV & JD
    const matchedKeywords = this.data?.matched_keywords || [];
    if (matchedKeywords.length > 0) {
      // Sort keywords by length descending so longer phrases match first
      const sortedKw = [...matchedKeywords]
        .filter((k) => k && k.trim().length > 1)
        .sort((a, b) => b.length - a.length);

      for (const kw of sortedKw) {
        const kwEsc = this.escapeHtml(kw.trim());
        const regex = new RegExp(`(${this.escapeRegex(kwEsc)})`, 'gi');
        escaped = escaped.replace(
          regex,
          '<mark class="match-highlight">$1</mark>'
        );
      }
    }

    // 2. Highlight custom search term if HR entered one
    if (this.customSearchTerm.trim()) {
      const termEsc = this.escapeHtml(this.customSearchTerm.trim());
      const regex = new RegExp(`(${this.escapeRegex(termEsc)})`, 'gi');
      escaped = escaped.replace(
        regex,
        '<mark class="search-highlight">$1</mark>'
      );
    }

    return escaped;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
