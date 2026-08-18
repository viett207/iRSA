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
import { AiEvaluationResponse, AiSkillAssessment, AiInterviewQuestion } from '../models/job.model';

const RECOMMENDATION_LABELS: Record<string, { text: string; color: string }> = {
  STRONG_FIT: { text: 'Rất phù hợp', color: 'success' },
  GOOD_FIT: { text: 'Phù hợp', color: 'green' },
  PARTIAL_FIT: { text: 'Phù hợp một phần', color: 'warning' },
  WEAK_FIT: { text: 'Ít phù hợp', color: 'orange' },
  NOT_FIT: { text: 'Không phù hợp', color: 'error' },
};

const LEVEL_LABELS: Record<string, string> = {
  expert: 'Chuyên gia',
  advanced: 'Nâng cao',
  intermediate: 'Trung bình',
  beginner: 'Cơ bản',
  unknown: 'Không xác định',
};

@Component({
  selector: 'app-ai-evaluation-modal',
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
        <p style="margin-top: 12px; color: #888">Đang tải kết quả AI...</p>
      </div>
    } @else if (error) {
      <nz-alert nzType="error" [nzMessage]="error" nzShowIcon></nz-alert>
    } @else if (eval) {
      <div class="evaluation-grid">
      <!-- Overall Score & Recommendation -->
      <div class="overview-card">
        <div class="overview-score">
          <nz-progress
            [nzPercent]="eval.overall_score"
            nzType="circle"
            [nzWidth]="80"
            [nzStrokeColor]="getScoreColor(eval.overall_score)"
          ></nz-progress>
        </div>
        <div class="overview-info">
          <nz-tag [nzColor]="getRecommendationColor(eval.recommendation)">
            {{ getRecommendationLabel(eval.recommendation) }}
          </nz-tag>
          <p class="assessment-text">{{ eval.overall_assessment }}</p>
        </div>
      </div>

      <nz-divider></nz-divider>

      <!-- Skill Assessments -->
      <section class="section">
        <h4 class="section-title">
          <span nz-icon nzType="code" nzTheme="outline"></span>
          Đánh giá kỹ năng
        </h4>
        @for (skill of eval.skill_assessments; track skill.skill) {
          <div class="skill-row">
            <div class="skill-info">
              <nz-tag [nzColor]="skill.found ? 'success' : 'error'">
                <span nz-icon [nzType]="skill.found ? 'check' : 'close'" style="margin-right: 4px"></span>
                {{ skill.skill }}
              </nz-tag>
              <nz-tag nzColor="default" style="font-size: 11px">
                {{ getLevelLabel(skill.level) }}
              </nz-tag>
            </div>
            <div class="skill-bar">
              <nz-progress
                [nzPercent]="skill.confidence"
                nzSize="small"
                [nzStrokeColor]="getScoreColor(skill.confidence)"
                [nzFormat]="confidenceFormat"
              ></nz-progress>
            </div>
            <div class="skill-evidence">{{ skill.evidence }}</div>
          </div>
        }
      </section>

      <nz-divider></nz-divider>

      <!-- Experience & Education -->
      <section class="section">
        <h4 class="section-title">
          <span nz-icon nzType="solution" nzTheme="outline"></span>
          Kinh nghiệm & Học vấn
        </h4>
        <nz-descriptions nzBordered [nzColumn]="2" nzSize="small">
          <nz-descriptions-item nzTitle="Kinh nghiệm phát hiện">
            {{ eval.experience_assessment.detected_years }} năm
            (liên quan: {{ eval.experience_assessment.relevant_years }} năm)
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="Độ tin cậy">
            <nz-progress
              [nzPercent]="eval.experience_assessment.confidence"
              nzSize="small"
              [nzStrokeColor]="getScoreColor(eval.experience_assessment.confidence)"
              style="width: 120px"
            ></nz-progress>
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="Học vấn">
            {{ eval.education_assessment.detected_level }}
            @if (eval.education_assessment.field_relevant) {
              <nz-tag nzColor="green" style="margin-left: 4px">Đúng ngành</nz-tag>
            }
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="Nhận xét">
            {{ eval.education_assessment.summary }}
          </nz-descriptions-item>
        </nz-descriptions>
      </section>

      <nz-divider></nz-divider>

      <!-- Strengths & Concerns -->
      <div style="display: flex; gap: 16px">
        <section class="section" style="flex: 1">
          <h4 class="section-title" style="color: #52c41a">
            <span nz-icon nzType="like" nzTheme="outline"></span>
            Điểm mạnh
          </h4>
          @for (s of eval.strengths; track s) {
            <div class="bullet-item success">{{ s }}</div>
          }
          @if (eval.strengths.length === 0) {
            <p style="color: #ccc; font-style: italic">Không có</p>
          }
        </section>

        <section class="section" style="flex: 1">
          <h4 class="section-title" style="color: #ff4d4f">
            <span nz-icon nzType="warning" nzTheme="outline"></span>
            Lưu ý
          </h4>
          @for (c of eval.concerns; track c) {
            <div class="bullet-item warning">{{ c }}</div>
          }
          @if (eval.concerns.length === 0) {
            <p style="color: #ccc; font-style: italic">Không có</p>
          }
        </section>
      </div>

      <!-- Interview Questions -->
      @if (eval.interview_questions && eval.interview_questions.length > 0) {
        <nz-divider></nz-divider>
        <section class="section questions-section">
          <h4 class="section-title">
            <span nz-icon nzType="question-circle" nzTheme="outline" style="color: #1890ff"></span>
            Câu hỏi phỏng vấn gợi ý ({{ eval.interview_questions.length }})
          </h4>
          @for (q of eval.interview_questions; track q.question; let i = $index) {
            <div class="question-card">
              <div class="question-header">
                <span class="question-number">{{ i + 1 }}</span>
                <nz-tag [nzColor]="getCategoryColor(q.category)">
                  {{ getCategoryLabel(q.category) }}
                </nz-tag>
                @if (q.target_skill) {
                  <nz-tag nzColor="default" style="font-size: 11px">{{ q.target_skill }}</nz-tag>
                }
              </div>
              <p class="question-text">{{ q.question }}</p>
              <p class="question-purpose">
                <span nz-icon nzType="bulb" nzTheme="outline" style="margin-right: 4px"></span>
                {{ q.purpose }}
              </p>
            </div>
          }
        </section>
      }
      </div>
    } @else {
      <nz-empty nzNotFoundContent="Chưa có kết quả đánh giá AI"></nz-empty>
    }
  `,
  styles: [`
    .evaluation-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }
    .evaluation-grid > nz-divider { display: none; }
    .overview-card {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 16px;
      grid-column: 1 / -1;
      border: 1px solid #e6f0ff;
      border-radius: 10px;
      background: linear-gradient(135deg, #f5f9ff, #fff);
    }
    .overview-info { flex: 1; }
    .assessment-text {
      margin: 8px 0 0;
      font-size: 13px;
      color: #555;
      line-height: 1.6;
    }
    .section {
      margin: 0;
      padding: 16px;
      border: 1px solid #f0f0f0;
      border-radius: 10px;
      min-width: 0;
      background: #fff;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .skill-row {
      display: grid;
      grid-template-columns: minmax(180px, .8fr) minmax(140px, .55fr);
      gap: 4px 12px;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f5f5f5;
    }
    .skill-info {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 0;
    }
    .skill-bar { width: 100%; }
    .skill-evidence {
      grid-column: 1 / -1;
      font-size: 12px;
      color: #888;
      margin-top: 2px;
      font-style: italic;
    }
    .bullet-item {
      font-size: 13px;
      padding: 4px 0 4px 16px;
      position: relative;
      color: #555;
    }
    .bullet-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 10px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .bullet-item.success::before { background: #52c41a; }
    .bullet-item.warning::before { background: #faad14; }
    .question-card {
      background: #fafafa;
      border: 1px solid #f0f0f0;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }
    .questions-section {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .questions-section .section-title { grid-column: 1 / -1; }
    .questions-section .question-card { margin-bottom: 0; }
    .question-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .question-number {
      background: #1890ff;
      color: #fff;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .question-text {
      font-size: 13px;
      color: #333;
      margin: 0 0 4px;
      line-height: 1.6;
      font-weight: 500;
    }
    .question-purpose {
      font-size: 12px;
      color: #888;
      margin: 0;
      font-style: italic;
    }
    @media (max-width: 1050px) {
      .evaluation-grid { grid-template-columns: 1fr; }
      .overview-card { grid-column: auto; }
    }
    @media (max-width: 680px) {
      .questions-section { grid-template-columns: 1fr; }
      .skill-row { grid-template-columns: 1fr; }
      .skill-evidence { grid-column: auto; }
      .overview-card { align-items: flex-start; gap: 12px; padding: 12px; }
      .section { padding: 12px; }
    }
  `],
})
export class AiEvaluationModalComponent {
  readonly modalData = inject(NZ_MODAL_DATA) as {
    data: AiEvaluationResponse | null;
    loading: boolean;
    error: string | null;
  };

  get data() { return this.modalData.data; }
  get loading() { return this.modalData.loading; }
  get error() { return this.modalData.error; }
  get eval() { return this.data?.ai_evaluation ?? null; }

  confidenceFormat = (p: number) => `${p}%`;

  getScoreColor(score: number): string {
    if (score >= 70) return '#52c41a';
    if (score >= 40) return '#faad14';
    return '#ff4d4f';
  }

  getRecommendationLabel(rec: string): string {
    return RECOMMENDATION_LABELS[rec]?.text || rec;
  }

  getRecommendationColor(rec: string): string {
    return RECOMMENDATION_LABELS[rec]?.color || 'default';
  }

  getLevelLabel(level: string): string {
    return LEVEL_LABELS[level] || level;
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      technical: 'blue',
      behavioral: 'purple',
      experience: 'cyan',
    };
    return colors[category] || 'default';
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      technical: 'Kỹ thuật',
      behavioral: 'Hành vi',
      experience: 'Kinh nghiệm',
    };
    return labels[category] || category;
  }
}
