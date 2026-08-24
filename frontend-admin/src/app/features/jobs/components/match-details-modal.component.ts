import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { MatchDetailsResponse } from '../models/job.model';

const EDUCATION_LABELS: Record<string, string> = {
  high_school: 'THPT',
  bachelor: 'Cử nhân',
  master: 'Thạc sĩ',
  phd: 'Tiến sĩ',
};

const SECTION_LABELS: Record<string, string> = {
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
  full_text: 'Full CV',
  none: '-',
};

@Component({
  selector: 'app-match-details-modal',
  standalone: true,
  imports: [
    CommonModule,
    NzTagModule,
    NzProgressModule,
    NzDividerModule,
    NzAlertModule,
    NzSpinModule,
    NzIconModule,
    NzDescriptionsModule,
    NzEmptyModule,
    NzToolTipModule,
  ],
  template: `
    @if (loading) {
      <div style="text-align: center; padding: 40px">
        <nz-spin nzSimple></nz-spin>
        <p style="margin-top: 12px; color: #888">Đang tải chi tiết...</p>
      </div>
    } @else if (error) {
      <nz-alert nzType="error" [nzMessage]="error" nzShowIcon></nz-alert>
    } @else if (data) {
      <!-- Sections Detected Banner -->
      @if (data.match_details.sections_found.length > 0) {
        <div class="sections-banner">
          <span nz-icon nzType="partition" nzTheme="outline" style="margin-right: 6px"></span>
          Phát hiện:
          @for (s of data.match_details.sections_found; track s) {
            <nz-tag nzColor="geekblue" style="margin-left: 4px">{{ getSectionLabel(s) }}</nz-tag>
          }
        </div>
      } @else {
        <nz-alert
          nzType="warning"
          nzMessage="Không phát hiện phân mục trong CV. Tìm kiếm toàn văn."
          nzShowIcon
          style="margin-bottom: 16px"
        ></nz-alert>
      }

      <!-- Score Breakdown -->
      <section class="section">
        <h4 class="section-title">
          <span nz-icon nzType="bar-chart" nzTheme="outline"></span>
          Phân tích điểm
        </h4>
        <div class="score-breakdown">
          <div class="score-row">
            <div class="score-label">
              Kỹ năng ({{ getWeight('skills') }}%)
              <span class="search-hint">{{ getSectionHint(data.match_details.skills.search_section) }}</span>
            </div>
            <div class="score-bar">
              <nz-progress
                [nzPercent]="data.skill_match_score"
                [nzStrokeColor]="getScoreColor(data.skill_match_score)"
                [nzFormat]="formatWeighted(data.skill_match_score, getWeight('skills') / 100, getWeight('skills'))"
                nzSize="small"
              ></nz-progress>
            </div>
          </div>
          <div class="score-row">
            <div class="score-label">
              Kinh nghiệm ({{ getWeight('experience') }}%)
              <span class="search-hint">{{ getSectionHint(data.match_details.experience.search_section) }}</span>
            </div>
            <div class="score-bar">
              <nz-progress
                [nzPercent]="data.experience_score"
                [nzStrokeColor]="getScoreColor(data.experience_score)"
                [nzFormat]="formatWeighted(data.experience_score, getWeight('experience') / 100, getWeight('experience'))"
                nzSize="small"
              ></nz-progress>
            </div>
          </div>
          <div class="score-row">
            <div class="score-label">
              Học vấn ({{ getWeight('education') }}%)
              <span class="search-hint">{{ getSectionHint(data.match_details.education.search_section) }}</span>
            </div>
            <div class="score-bar">
              <nz-progress
                [nzPercent]="data.education_score"
                [nzStrokeColor]="getScoreColor(data.education_score)"
                [nzFormat]="formatWeighted(data.education_score, getWeight('education') / 100, getWeight('education'))"
                nzSize="small"
              ></nz-progress>
            </div>
          </div>
          <nz-divider style="margin: 8px 0"></nz-divider>
          <div class="score-row total-row">
            <div class="score-label"><strong>Tổng điểm</strong></div>
            <div class="score-bar">
              <nz-progress
                [nzPercent]="data.total_score"
                [nzStrokeColor]="getScoreColor(data.total_score)"
                nzSize="small"
              ></nz-progress>
            </div>
          </div>
        </div>
      </section>

      <nz-divider></nz-divider>

      <!-- Skills Matched -->
      <section class="section">
        <h4 class="section-title">
          <span nz-icon nzType="check-circle" nzTheme="outline" style="color: #52c41a"></span>
          Kỹ năng khớp
        </h4>

        @if (data.match_details.skills.matched_must.length > 0) {
          <div class="skill-group">
            <span class="skill-group-label">Bắt buộc:</span>
            @for (skill of data.match_details.skills.matched_must; track skill) {
              <nz-tag nzColor="success"
                nz-tooltip
                [nzTooltipTitle]="'Tìm thấy trong ' + getSectionLabel(getSkillSection(skill))"
              >
                <span nz-icon nzType="check" style="margin-right: 4px"></span>
                {{ skill }}
                <span class="section-badge" [class]="'badge-' + getSkillSection(skill)">
                  {{ getSectionLabel(getSkillSection(skill)) }}
                </span>
              </nz-tag>
            }
          </div>
        }

        @if (data.match_details.skills.matched_nice.length > 0) {
          <div class="skill-group">
            <span class="skill-group-label">Ưu tiên:</span>
            @for (skill of data.match_details.skills.matched_nice; track skill) {
              <nz-tag nzColor="green"
                nz-tooltip
                [nzTooltipTitle]="'Tìm thấy trong ' + getSectionLabel(getSkillSection(skill))"
              >
                <span nz-icon nzType="check" style="margin-right: 4px"></span>
                {{ skill }}
                <span class="section-badge" [class]="'badge-' + getSkillSection(skill)">
                  {{ getSectionLabel(getSkillSection(skill)) }}
                </span>
              </nz-tag>
            }
          </div>
        }

        @if (
          data.match_details.skills.matched_must.length === 0 &&
          data.match_details.skills.matched_nice.length === 0
        ) {
          <p style="color: #999; font-style: italic">Không tìm thấy kỹ năng khớp.</p>
        }
      </section>

      <!-- Skills Missing -->
      @if (
        data.match_details.skills.missing_must.length > 0 ||
        data.match_details.skills.missing_nice.length > 0
      ) {
        <section class="section" style="margin-top: 12px">
          <h4 class="section-title">
            <span nz-icon nzType="close-circle" nzTheme="outline" style="color: #ff4d4f"></span>
            Kỹ năng thiếu
          </h4>

          @if (data.match_details.skills.missing_must.length > 0) {
            <div class="skill-group">
              <span class="skill-group-label">Bắt buộc:</span>
              @for (skill of data.match_details.skills.missing_must; track skill) {
                <nz-tag nzColor="error">
                  <span nz-icon nzType="close" style="margin-right: 4px"></span>
                  {{ skill }}
                </nz-tag>
              }
            </div>
          }

          @if (data.match_details.skills.missing_nice.length > 0) {
            <div class="skill-group">
              <span class="skill-group-label">Ưu tiên:</span>
              @for (skill of data.match_details.skills.missing_nice; track skill) {
                <nz-tag nzColor="orange">
                  <span nz-icon nzType="minus" style="margin-right: 4px"></span>
                  {{ skill }}
                </nz-tag>
              }
            </div>
          }
        </section>
      }

      <nz-divider></nz-divider>

      <!-- Experience & Education -->
      <section class="section">
        <h4 class="section-title">
          <span nz-icon nzType="solution" nzTheme="outline"></span>
          Kinh nghiệm & Học vấn
        </h4>
        <nz-descriptions nzBordered [nzColumn]="2" nzSize="small">
          <nz-descriptions-item nzTitle="Kinh nghiệm phát hiện">
            <nz-tag [nzColor]="data.match_details.experience.score >= 100 ? 'success' : 'warning'">
              {{ data.match_details.experience.detected_years }} năm
            </nz-tag>
            <span class="search-source">
              {{ getSectionLabel(data.match_details.experience.search_section) }}
            </span>
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="Yêu cầu">
            {{ data.match_details.experience.required_min }} năm
            @if (data.match_details.experience.required_max) {
              - {{ data.match_details.experience.required_max }} năm
            }
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="Học vấn phát hiện">
            <nz-tag [nzColor]="data.match_details.education.score >= 100 ? 'success' : 'warning'">
              {{ getEducationLabel(data.match_details.education.detected_level) }}
            </nz-tag>
            <span class="search-source">
              {{ getSectionLabel(data.match_details.education.search_section) }}
            </span>
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="Yêu cầu">
            {{ getEducationLabel(data.match_details.education.required_level) }}
          </nz-descriptions-item>
        </nz-descriptions>
      </section>

      <!-- Resume Snippets -->
      @if (data.resume_snippets.length > 0) {
        <nz-divider></nz-divider>
        <section class="section">
          <h4 class="section-title">
            <span nz-icon nzType="file-search" nzTheme="outline"></span>
            Trích dẫn từ CV
          </h4>
          @for (snippet of data.resume_snippets; track snippet.keyword) {
            <div class="snippet-card">
              <div style="margin-bottom: 4px; display: flex; align-items: center; gap: 6px">
                <nz-tag nzColor="blue">{{ snippet.keyword }}</nz-tag>
                <span class="snippet-section-label">
                  <span nz-icon nzType="environment" nzTheme="outline" style="margin-right: 2px"></span>
                  {{ getSectionLabel(snippet.section) }}
                </span>
              </div>
              <p class="snippet-text" [innerHTML]="highlightKeyword(snippet.context, snippet.keyword)"></p>
            </div>
          }
        </section>
      }
    }
  `,
  styles: [
    `
      .sections-banner {
        background: #f0f5ff;
        border: 1px solid #d6e4ff;
        border-radius: 6px;
        padding: 8px 12px;
        margin-bottom: 16px;
        font-size: 13px;
        color: #555;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
      }
      .section { margin-bottom: 4px; }
      .section-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .score-breakdown { padding: 0 8px; }
      .score-row {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
      }
      .score-label {
        width: 180px;
        flex-shrink: 0;
        font-size: 13px;
        color: #555;
      }
      .score-bar { flex: 1; }
      .total-row .score-label { font-size: 14px; }
      .search-hint {
        font-size: 11px;
        color: #1890ff;
        margin-left: 4px;
      }
      .skill-group {
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px;
      }
      .skill-group-label {
        font-size: 12px;
        color: #888;
        min-width: 64px;
      }
      .section-badge {
        font-size: 10px;
        margin-left: 4px;
        padding: 0 4px;
        border-radius: 3px;
        background: rgba(0,0,0,0.06);
        color: #666;
      }
      .badge-skills {
        background: #e6fffb;
        color: #13c2c2;
      }
      .badge-full_text {
        background: #fff7e6;
        color: #fa8c16;
      }
      .search-source {
        font-size: 11px;
        color: #1890ff;
        margin-left: 6px;
      }
      .snippet-card {
        background: #fafafa;
        border: 1px solid #f0f0f0;
        border-radius: 6px;
        padding: 10px 12px;
        margin-bottom: 8px;
      }
      .snippet-text {
        font-size: 13px;
        color: #555;
        line-height: 1.6;
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .snippet-section-label {
        font-size: 11px;
        color: #8c8c8c;
        display: flex;
        align-items: center;
      }
    `,
  ],
})
export class MatchDetailsModalComponent {
  readonly modalData = inject(NZ_MODAL_DATA) as {
    data: MatchDetailsResponse | null;
    loading: boolean;
    error: string | null;
  };

  get data(): MatchDetailsResponse | null {
    return this.modalData.data;
  }
  get loading(): boolean {
    return this.modalData.loading;
  }
  get error(): string | null {
    return this.modalData.error;
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#52c41a';
    if (score >= 40) return '#faad14';
    return '#ff4d4f';
  }

  getWeight(key: 'skills' | 'experience' | 'education'): number {
    const defaults = { skills: 60, experience: 30, education: 10 };
    const weights = this.data?.match_details?.weights;
    if (!weights) return defaults[key];
    return Math.round(weights[key] * 100);
  }

  formatWeighted(rawScore: number, weight: number, maxPoints: number): (p: number) => string {
    const weighted = Math.round(rawScore * weight);
    return () => `${weighted}/${maxPoints}`;
  }

  getEducationLabel(level: string | null): string {
    if (!level) return 'Không xác định';
    return EDUCATION_LABELS[level] || level;
  }

  getSectionLabel(section: string): string {
    return SECTION_LABELS[section] || section;
  }

  getSectionHint(section: string): string {
    if (section === 'full_text') return '(toàn văn)';
    if (section === 'none') return '';
    return `(${this.getSectionLabel(section)})`;
  }

  getSkillSection(skill: string): string {
    if (!this.data) return 'full_text';
    return this.data.match_details.skills.match_sections[skill] || 'full_text';
  }

  highlightKeyword(text: string, keyword: string): string {
    if (!keyword) return this.escapeHtml(text);
    const escaped = this.escapeHtml(text);
    const kwEscaped = this.escapeHtml(keyword);
    const escapedKw = kwEscaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![a-zA-Z0-9_#+])(${escapedKw})(?![a-zA-Z0-9_#+])`, 'gi');
    return escaped.replace(regex, '<mark style="background:#ffe58f;padding:1px 2px;border-radius:2px">$1</mark>');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
