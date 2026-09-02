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
  templateUrl: './match-details-modal.component.html',
  styleUrl: './match-details-modal.component.scss',
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
