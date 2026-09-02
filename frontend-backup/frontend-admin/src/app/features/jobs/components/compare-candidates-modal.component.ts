import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { JobService } from '../services/job.service';
import { MatchDetailsResponse, AiEvaluationResponse } from '../models/job.model';

/** Minimal fields needed - works with Applicant, ShortlistedApplicant, InterviewingApplicant */
interface ComparableCandidate {
  id: number;
  candidate_name: string;
  candidate_email: string;
}

interface CompareData {
  jobId: number;
  candidates: ComparableCandidate[];
}

interface CandidateCompare {
  applicant: ComparableCandidate;
  /** Lượt 1: screening match details */
  screening: MatchDetailsResponse | null;
  /** Lượt 2: AI evaluation */
  ai: AiEvaluationResponse | null;
  loading: boolean;
}

@Component({
  selector: 'app-compare-candidates-modal',
  standalone: true,
  imports: [
    CommonModule,
    NzSpinModule,
    NzTagModule,
    NzProgressModule,
    NzAlertModule,
    NzDividerModule,
    NzIconModule,
  ],
  templateUrl: './compare-candidates-modal.component.html',
  styleUrl: './compare-candidates-modal.component.scss',
})
export class CompareCandidatesModalComponent implements OnInit {
  candidates: CandidateCompare[] = [];
  loading = true;
  error: string | null = null;

  private eduLabels: Record<string, string> = {
    high_school: 'THPT',
    bachelor: 'Cử nhân',
    master: 'Thạc sĩ',
    phd: 'Tiến sĩ',
  };

  scoreFormat = (p: number) => `${Math.round(p)}`;

  constructor(
    @Inject(NZ_MODAL_DATA) private data: CompareData,
    private jobService: JobService,
  ) {}

  ngOnInit(): void {
    if (!this.data?.candidates || this.data.candidates.length === 0) {
      this.candidates = [];
      this.loading = false;
      return;
    }

    this.candidates = this.data.candidates.map(a => ({
      applicant: a,
      screening: null,
      ai: null,
      loading: true,
    }));

    // Fetch both screening + AI data for each candidate in parallel
    const requests = this.data.candidates.map(a =>
      forkJoin({
        screening: this.jobService.getMatchDetails(this.data.jobId, a.id).pipe(
          catchError(() => of(null))
        ),
        ai: this.jobService.getAiEvaluation(this.data.jobId, a.id).pipe(
          catchError(() => of(null))
        ),
      })
    );

    if (requests.length === 0) {
      this.loading = false;
      return;
    }

    forkJoin(requests).subscribe({
      next: (results) => {
        results.forEach((res, i) => {
          this.candidates[i].screening = res.screening;
          this.candidates[i].ai = res.ai;
          this.candidates[i].loading = false;
        });
        this.loading = false;
      },
      error: () => {
        this.error = 'Không thể tải dữ liệu so sánh.';
        this.loading = false;
      },
    });
  }

  hasScreeningData(): boolean {
    return this.candidates.some(c => c.screening !== null);
  }

  hasAiData(): boolean {
    return this.candidates.some(c => c.ai?.has_evaluation);
  }

  getSkills(c: CandidateCompare, key: string): string[] {
    const skills = c.screening?.match_details?.skills as Record<string, any> | undefined;
    return skills?.[key] || [];
  }

  getExp(c: CandidateCompare, key: string): any {
    const exp = c.screening?.match_details?.experience as Record<string, any> | undefined;
    return exp?.[key] ?? null;
  }

  getEdu(c: CandidateCompare, key: string): any {
    const edu = c.screening?.match_details?.education as Record<string, any> | undefined;
    return edu?.[key] ?? null;
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#52705c';
    if (score >= 40) return '#8a7654';
    return '#a66a62';
  }

  getEduLabel(level: string | null): string {
    return this.eduLabels[level || ''] || level || 'N/A';
  }

  getAiScore(c: CandidateCompare): number | null {
    return c.ai?.ai_evaluation?.overall_score ?? null;
  }

  getAiRecommendation(c: CandidateCompare): string {
    return c.ai?.ai_evaluation?.recommendation || '';
  }

  getAiStrengths(c: CandidateCompare): string[] {
    return c.ai?.ai_evaluation?.strengths || [];
  }

  getAiConcerns(c: CandidateCompare): string[] {
    return c.ai?.ai_evaluation?.concerns || [];
  }

  getAiAssessment(c: CandidateCompare): string {
    return c.ai?.ai_evaluation?.overall_assessment || '';
  }

  getRecommendationColor(rec: string): string {
    const map: Record<string, string> = {
      strong_yes: 'green',
      yes: 'cyan',
      maybe: 'orange',
      no: 'red',
      strong_no: 'red',
      STRONG_FIT: 'green',
      GOOD_FIT: 'green',
      PARTIAL_FIT: 'orange',
      WEAK_FIT: 'orange',
      NOT_FIT: 'red',
    };
    return map[rec] || 'default';
  }

  getRecommendationLabel(rec: string): string {
    const map: Record<string, string> = {
      strong_yes: 'Rất phù hợp',
      yes: 'Phù hợp',
      maybe: 'Cần cân nhắc',
      no: 'Không phù hợp',
      strong_no: 'Không phù hợp',
      STRONG_FIT: 'Rất phù hợp',
      GOOD_FIT: 'Phù hợp',
      PARTIAL_FIT: 'Cần cân nhắc',
      WEAK_FIT: 'Ít phù hợp',
      NOT_FIT: 'Không phù hợp',
    };
    return map[rec] || rec;
  }
}
