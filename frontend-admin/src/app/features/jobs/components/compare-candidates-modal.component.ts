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
  template: `
    <div class="compare-container">
      @if (loading) {
        <div style="text-align: center; padding: 40px">
          <nz-spin nzSimple></nz-spin>
          <p style="margin-top: 12px; color: #888">Đang tải dữ liệu so sánh...</p>
        </div>
      } @else if (error) {
        <nz-alert nzType="error" [nzMessage]="error" nzShowIcon></nz-alert>
      } @else {
        <!-- Header: Candidate names -->
        <div class="compare-row header-row">
          <div class="compare-label"></div>
          @for (c of candidates; track c.applicant.id) {
            <div class="compare-cell candidate-header">
              <div class="candidate-name">{{ c.applicant.candidate_name }}</div>
              <div class="candidate-email">{{ c.applicant.candidate_email }}</div>
            </div>
          }
        </div>

        <!-- ========== LƯỢT 1: SÀNG LỌC ========== -->
        <nz-divider nzText="Lượt 1 — Sàng lọc hồ sơ" nzOrientation="left"></nz-divider>

        @if (hasScreeningData()) {
          <!-- Screening Total Score -->
          <div class="compare-row">
            <div class="compare-label">Tổng điểm SL</div>
            @for (c of candidates; track c.applicant.id) {
              <div class="compare-cell">
                @if (c.screening) {
                  <div class="score-big" [style.color]="getScoreColor(c.screening.total_score)">
                    {{ c.screening.total_score | number:'1.0-0' }}/100
                  </div>
                } @else {
                  <nz-tag>Chưa chấm</nz-tag>
                }
              </div>
            }
          </div>

          <!-- Skill Score -->
          <div class="compare-row">
            <div class="compare-label">Kỹ năng (60%)</div>
            @for (c of candidates; track c.applicant.id) {
              <div class="compare-cell">
                @if (c.screening) {
                  <nz-progress nzType="circle" [nzPercent]="c.screening.skill_match_score"
                    [nzWidth]="50" [nzStrokeColor]="getScoreColor(c.screening.skill_match_score)"
                    [nzFormat]="scoreFormat"></nz-progress>
                }
              </div>
            }
          </div>

          <!-- Experience Score -->
          <div class="compare-row">
            <div class="compare-label">Kinh nghiệm (30%)</div>
            @for (c of candidates; track c.applicant.id) {
              <div class="compare-cell">
                @if (c.screening) {
                  <nz-progress nzType="circle" [nzPercent]="c.screening.experience_score"
                    [nzWidth]="50" [nzStrokeColor]="getScoreColor(c.screening.experience_score)"
                    [nzFormat]="scoreFormat"></nz-progress>
                }
              </div>
            }
          </div>

          <!-- Education Score -->
          <div class="compare-row">
            <div class="compare-label">Học vấn (10%)</div>
            @for (c of candidates; track c.applicant.id) {
              <div class="compare-cell">
                @if (c.screening) {
                  <nz-progress nzType="circle" [nzPercent]="c.screening.education_score"
                    [nzWidth]="50" [nzStrokeColor]="getScoreColor(c.screening.education_score)"
                    [nzFormat]="scoreFormat"></nz-progress>
                }
              </div>
            }
          </div>

          <!-- Must-have Skills -->
          <div class="compare-row">
            <div class="compare-label">KN bắt buộc - Đạt</div>
            @for (c of candidates; track c.applicant.id) {
              <div class="compare-cell">
                @for (s of getSkills(c, 'matched_must'); track s) {
                  <nz-tag nzColor="green">{{ s }}</nz-tag>
                }
              </div>
            }
          </div>

          <div class="compare-row">
            <div class="compare-label">KN bắt buộc - Thiếu</div>
            @for (c of candidates; track c.applicant.id) {
              <div class="compare-cell">
                @for (s of getSkills(c, 'missing_must'); track s) {
                  <nz-tag nzColor="red">{{ s }}</nz-tag>
                }
                @if (getSkills(c, 'missing_must').length === 0 && c.screening) {
                  <nz-tag nzColor="green"><span nz-icon nzType="check"></span> Đủ hết</nz-tag>
                }
              </div>
            }
          </div>

          <!-- Nice-to-have -->
          <div class="compare-row">
            <div class="compare-label">KN điểm cộng</div>
            @for (c of candidates; track c.applicant.id) {
              <div class="compare-cell">
                @for (s of getSkills(c, 'matched_nice'); track s) {
                  <nz-tag nzColor="blue">{{ s }}</nz-tag>
                }
              </div>
            }
          </div>

          <!-- Experience detail -->
          <div class="compare-row">
            <div class="compare-label">Kinh nghiệm</div>
            @for (c of candidates; track c.applicant.id) {
              <div class="compare-cell">
                @if (getExp(c, 'detected_years') !== null) {
                  <strong>{{ getExp(c, 'detected_years') }} năm</strong>
                  <span style="color: #888"> / cần {{ getExp(c, 'required_min') }} năm</span>
                }
              </div>
            }
          </div>

          <!-- Education detail -->
          <div class="compare-row">
            <div class="compare-label">Học vấn</div>
            @for (c of candidates; track c.applicant.id) {
              <div class="compare-cell">
                @if (getEdu(c, 'detected_level')) {
                  <nz-tag [nzColor]="getEdu(c, 'score') >= 100 ? 'green' : 'orange'">
                    {{ getEduLabel(getEdu(c, 'detected_level')) }}
                  </nz-tag>
                  <span style="color: #888"> / cần {{ getEduLabel(getEdu(c, 'required_level')) }}</span>
                }
              </div>
            }
          </div>
        } @else {
          <nz-alert nzType="info" nzMessage="Chưa có dữ liệu sàng lọc. Hãy chấm điểm trước." nzShowIcon></nz-alert>
        }

        <!-- ========== LƯỢT 2: AI ========== -->
        <nz-divider nzText="Lượt 2 — Đánh giá AI" nzOrientation="left"></nz-divider>

        @if (hasAiData()) {
          <!-- AI Total Score -->
          <div class="compare-row">
            <div class="compare-label">Điểm AI tổng</div>
            @for (c of candidates; track c.applicant.id) {
              <div class="compare-cell">
                @if (getAiScore(c) !== null) {
                  <div class="score-big" [style.color]="getScoreColor(getAiScore(c)!)">
                    {{ getAiScore(c) | number:'1.0-0' }}/100
                  </div>
                } @else {
                  <nz-tag>Chưa phân tích</nz-tag>
                }
              </div>
            }
          </div>

          <!-- AI Recommendation -->
          <div class="compare-row">
            <div class="compare-label">Đề xuất AI</div>
            @for (c of candidates; track c.applicant.id) {
              <div class="compare-cell">
                @if (getAiRecommendation(c); as rec) {
                  <nz-tag [nzColor]="getRecommendationColor(rec)">
                    {{ getRecommendationLabel(rec) }}
                  </nz-tag>
                }
              </div>
            }
          </div>

          <!-- AI Strengths -->
          <div class="compare-row">
            <div class="compare-label">Điểm mạnh</div>
            @for (c of candidates; track c.applicant.id) {
              <div class="compare-cell" style="text-align: left">
                @for (s of getAiStrengths(c); track s) {
                  <div style="margin-bottom: 2px; font-size: 12px">
                    <span nz-icon nzType="check-circle" style="color: #52c41a; margin-right: 4px"></span>{{ s }}
                  </div>
                }
              </div>
            }
          </div>

          <!-- AI Concerns -->
          <div class="compare-row">
            <div class="compare-label">Lưu ý</div>
            @for (c of candidates; track c.applicant.id) {
              <div class="compare-cell" style="text-align: left">
                @for (s of getAiConcerns(c); track s) {
                  <div style="margin-bottom: 2px; font-size: 12px">
                    <span nz-icon nzType="warning" style="color: #faad14; margin-right: 4px"></span>{{ s }}
                  </div>
                }
              </div>
            }
          </div>

          <!-- AI Experience -->
          <div class="compare-row">
            <div class="compare-label">KN (AI đánh giá)</div>
            @for (c of candidates; track c.applicant.id) {
              <div class="compare-cell">
                @if (c.ai?.ai_evaluation?.experience_assessment; as exp) {
                  <strong>{{ exp.detected_years }} năm</strong>
                  <span style="color: #888"> (liên quan: {{ exp.relevant_years }} năm)</span>
                }
              </div>
            }
          </div>

          <!-- AI Overall Assessment -->
          <div class="compare-row">
            <div class="compare-label">Nhận xét chung</div>
            @for (c of candidates; track c.applicant.id) {
              <div class="compare-cell" style="text-align: left; font-size: 12px; color: #555">
                {{ getAiAssessment(c) }}
              </div>
            }
          </div>
        } @else {
          <nz-alert nzType="info" nzMessage="Chưa có dữ liệu AI. Hãy phân tích AI trước." nzShowIcon></nz-alert>
        }
      }
    </div>
  `,
  styles: [`
    .compare-container { min-width: 500px; }
    .compare-row {
      display: flex;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .compare-label {
      width: 150px;
      flex-shrink: 0;
      font-weight: 600;
      color: #555;
      padding-top: 4px;
      font-size: 13px;
    }
    .compare-cell {
      flex: 1;
      padding: 0 8px;
      text-align: center;
    }
    .header-row .compare-cell { text-align: center; }
    .candidate-header {
      background: #fafafa;
      border-radius: 8px;
      padding: 12px;
      margin: 0 4px;
    }
    .candidate-name { font-size: 16px; font-weight: 700; }
    .candidate-email { font-size: 12px; color: #888; margin-top: 2px; }
    .score-big { font-size: 24px; font-weight: 700; }
    nz-tag { margin-bottom: 4px; }
    nz-divider { margin: 16px 0 12px; }
  `],
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
    if (score >= 70) return '#52c41a';
    if (score >= 40) return '#faad14';
    return '#ff4d4f';
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
    };
    return map[rec] || rec;
  }
}
