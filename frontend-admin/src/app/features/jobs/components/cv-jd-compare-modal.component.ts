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
import { NzProgressModule } from 'ng-zorro-antd/progress';
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
    NzProgressModule,
  ],
  templateUrl: './cv-jd-compare-modal.component.html',
  styleUrl: './cv-jd-compare-modal.component.scss',
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

  getScoreColor(score: number): string {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#1890FF';
    if (score >= 40) return '#faad14';
    return '#ff4d4f';
  }

  getMatchAssessment(score: number): string {
    if (score >= 80) return 'Khớp cao · Phù hợp để phân tích AI sâu hơn';
    if (score >= 60) return 'Khớp khá · Nên xem bằng chứng trước khi chấm AI';
    if (score >= 40) return 'Khớp trung bình · Cần HR đọc kỹ CV';
    return 'Khớp thấp · Cân nhắc trước khi dùng lượt chấm AI';
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
        // Use token boundaries to avoid partial word match (e.g., 'oop' inside 'hadoop')
        const regex = new RegExp(`(?<![a-zA-Z0-9_#+])(${this.escapeRegex(kwEsc)})(?![a-zA-Z0-9_#+])`, 'gi');
        escaped = escaped.replace(
          regex,
          '<mark class="match-highlight">$1</mark>'
        );
      }
    }

    // 2. Highlight custom search term if HR entered one
    if (this.customSearchTerm.trim()) {
      const termEsc = this.escapeHtml(this.customSearchTerm.trim());
      const regex = new RegExp(`(?<![a-zA-Z0-9_#+])(${this.escapeRegex(termEsc)})(?![a-zA-Z0-9_#+])`, 'gi');
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
