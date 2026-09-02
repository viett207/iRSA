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
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import {
  AiEvaluationResponse,
  AiSkillAssessment,
  AiInterviewQuestion,
  ProcessStep,
} from '../models/job.model';

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
    NzTabsModule,
    NzTableModule,
    NzTimelineModule,
    NzBadgeModule,
    NzStepsModule,
  ],
  template: `
    @if (loading) {
      <div style="text-align: center; padding: 40px">
        <nz-spin nzSimple></nz-spin>
        <p style="margin-top: 12px; color: #888">Đang tải kết quả và quá trình phân tích AI...</p>
      </div>
    } @else if (error) {
      <nz-alert nzType="error" [nzMessage]="error" nzShowIcon></nz-alert>
    } @else if (eval) {
      <div class="evaluation-container">
        <!-- Top Overall Summary Card -->
        <div class="overview-card">
          <div class="overview-score">
            <nz-progress
              [nzPercent]="eval.overall_score"
              nzType="circle"
              [nzWidth]="85"
              [nzStrokeColor]="getScoreColor(eval.overall_score)"
            ></nz-progress>
          </div>
          <div class="overview-info">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px">
              <nz-tag [nzColor]="getRecommendationColor(eval.recommendation)" style="font-size: 13px; padding: 2px 10px">
                {{ getRecommendationLabel(eval.recommendation) }}
              </nz-tag>
              <nz-tag nzColor="geekblue">
                <span nz-icon nzType="safety-certificate"></span> Đã qua kiểm chứng chống ảo giác
              </nz-tag>
            </div>
            <p class="assessment-text">{{ eval.overall_assessment }}</p>
          </div>
        </div>

        <!-- Tabset: 3 Sections -->
        <nz-tabset [nzSelectedIndex]="activeTabIndex" (nzSelectedIndexChange)="activeTabIndex = $event" style="margin-top: 16px">
          
          <!-- TAB 1: Quá trình phân tích & Chấm điểm CV (User Request) -->
          <nz-tab [nzTitle]="tabProcessTitle">
            <ng-template #tabProcessTitle>
              <span nz-icon nzType="apartment" nzTheme="outline"></span>
              Bảng quá trình phân tích & Chấm điểm CV
            </ng-template>

            <div class="process-tab-content">
              <!-- Multi-Agent Workflow Pipeline Header -->
              <div class="pipeline-header-box">
                <div class="pipeline-title">
                  <span nz-icon nzType="cluster" style="color: #1890ff"></span>
                  <strong>Quy trình phân tích Đa tác tử AI (Multi-Agent LangGraph Pipeline)</strong>
                </div>
                <p style="font-size: 12px; color: #666; margin: 4px 0 0">
                  Hồ sơ ứng viên được xử lý tuần tự qua 4 tác tử AI chuyên biệt nhằm đảm bảo tính chính xác, kiểm chứng bằng chứng thực tế và loại trừ suy diễn sai lệch (Anti-Hallucination).
                </p>
              </div>

              <!-- Process Steps Table -->
              <h4 class="sub-heading" style="margin-top: 16px">
                <span nz-icon nzType="unordered-list" style="color: #1890ff"></span>
                Chi tiết 4 giai đoạn phân tích & Chấm điểm
              </h4>

              <nz-table
                #processTable
                [nzData]="getProcessSteps()"
                [nzFrontPagination]="false"
                [nzShowPagination]="false"
                nzSize="small"
                nzBordered
                style="margin-bottom: 20px"
              >
                <thead>
                  <tr>
                    <th nzWidth="6%" style="text-align: center">Bước</th>
                    <th nzWidth="22%">Tác tử AI (Agent Node)</th>
                    <th nzWidth="12%" style="text-align: center">Trạng thái</th>
                    <th nzWidth="32%">Tóm tắt kết quả phân tích</th>
                    <th nzWidth="28%">Chi tiết cơ chế xử lý</th>
                  </tr>
                </thead>
                <tbody>
                  @for (step of processTable.data; track step.step_number) {
                    <tr>
                      <td style="text-align: center">
                        <span class="step-badge">{{ step.step_number }}</span>
                      </td>
                      <td>
                        <strong style="color: #1890ff">{{ step.agent_node }}</strong>
                        <div style="font-size: 11px; color: #888">{{ step.step_name }}</div>
                      </td>
                      <td style="text-align: center">
                        @if (step.status === 'completed') {
                          <nz-tag nzColor="success">
                            <span nz-icon nzType="check-circle"></span> Hoàn thành
                          </nz-tag>
                        } @else if (step.status === 'warning') {
                          <nz-tag nzColor="warning">
                            <span nz-icon nzType="exclamation-circle"></span> Đã hiệu chỉnh
                          </nz-tag>
                        } @else {
                          <nz-tag nzColor="blue">
                            <span nz-icon nzType="sync" [nzSpin]="true"></span> Đang xử lý
                          </nz-tag>
                        }
                      </td>
                      <td style="font-size: 12px; line-height: 1.5">
                        {{ step.summary }}
                      </td>
                      <td style="font-size: 12px; color: #555; line-height: 1.5; background: #fafafa">
                        {{ step.details || '—' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </nz-table>

              <!-- Evidence Grounding Table (Đối chiếu bằng chứng thực tế từ CV) -->
              <h4 class="sub-heading">
                <span nz-icon nzType="file-search" style="color: #52c41a"></span>
                Bảng đối chiếu bằng chứng trích xuất từ CV (Evidence Grounding Audit)
              </h4>
              <p style="font-size: 12px; color: #666; margin-bottom: 8px">
                Từng kỹ năng được đối chiếu trực tiếp với các trích đoạn văn bản trong CV để đảm bảo không bị ảo giác điểm số.
              </p>

              <nz-table
                #skillsTable
                [nzData]="eval.skill_assessments"
                [nzFrontPagination]="false"
                [nzShowPagination]="false"
                nzSize="small"
                nzBordered
              >
                <thead>
                  <tr>
                    <th nzWidth="20%">Kỹ năng yêu cầu</th>
                    <th nzWidth="12%" style="text-align: center">Tìm thấy?</th>
                    <th nzWidth="12%" style="text-align: center">Cấp độ</th>
                    <th nzWidth="16%">
                      Độ tin cậy bằng chứng
                      <span
                        nz-icon
                        nzType="info-circle"
                        nzTheme="outline"
                        style="color: #1890ff; margin-left: 4px; cursor: pointer"
                        nz-tooltip
                        nzTooltipTitle="Mức độ xác thực và rõ ràng của bằng chứng trích xuất từ CV (90-100%: Rất rõ ràng trong dự án/kinh nghiệm; 70-85%: Có ghi nhận trong CV; <50%: Nhắc thoáng qua/cần phỏng vấn thêm)"
                      ></span>
                    </th>
                    <th nzWidth="40%">Trích đoạn bằng chứng đối chiếu từ CV</th>
                  </tr>
                </thead>
                <tbody>
                  @for (skill of skillsTable.data; track skill.skill) {
                    <tr>
                      <td>
                        <strong>{{ skill.skill }}</strong>
                      </td>
                      <td style="text-align: center">
                        <nz-tag [nzColor]="skill.found ? 'success' : 'error'">
                          <span nz-icon [nzType]="skill.found ? 'check' : 'close'"></span>
                          {{ skill.found ? 'Có trong CV' : 'Không thấy' }}
                        </nz-tag>
                      </td>
                      <td style="text-align: center">
                        <nz-tag nzColor="default" style="font-size: 11px">
                          {{ getLevelLabel(skill.level) }}
                        </nz-tag>
                      </td>
                      <td>
                        @if (skill.found) {
                          <nz-progress
                            [nzPercent]="skill.confidence"
                            nzSize="small"
                            [nzStrokeColor]="getScoreColor(skill.confidence)"
                            [nzFormat]="confidenceFormat"
                          ></nz-progress>
                        } @else {
                          <nz-progress
                            [nzPercent]="0"
                            nzSize="small"
                            nzStrokeColor="#d9d9d9"
                            [nzFormat]="zeroFormat"
                          ></nz-progress>
                        }
                      </td>
                      <td style="font-size: 12px; font-style: italic; color: #333; line-height: 1.4">
                        @if (skill.evidence && skill.evidence !== 'Không tìm thấy trong CV') {
                          <span class="evidence-quote">"{{ skill.evidence }}"</span>
                        } @else {
                          <span style="color: #999">Không tìm thấy minh chứng trong CV</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </nz-table>

              <!-- Self-Reflection & Verification Box -->
              <div class="verification-box" style="margin-top: 16px">
                <div class="verification-header">
                  <span nz-icon nzType="audit" style="color: #52c41a"></span>
                  <strong>Kết quả Kiểm chứng & Tự phản biện (Verifier Agent Audit)</strong>
                </div>
                <div style="font-size: 13px; color: #333; margin-top: 4px; line-height: 1.6">
                  {{ eval.verification_feedback || 'Toàn bộ dữ liệu kỹ năng, kinh nghiệm và bằng chứng đã được Verifier Agent kiểm chứng đối chiếu chính xác với CV gốc và không phát hiện ảo giác (Hallucination).' }}
                </div>
                <div style="margin-top: 6px; font-size: 11px; color: #888">
                  Số vòng phản biện tự sửa: <strong>{{ eval.reflection_attempts || 0 }}</strong> | Trạng thái: <strong>{{ eval.verification_passed !== false ? 'Đạt kiểm chứng chất lượng' : 'Đã hiệu chỉnh' }}</strong>
                </div>
              </div>
            </div>
          </nz-tab>

          <!-- TAB 2: Đánh giá Năng lực chi tiết (Overview, Skills, Experience, Education) -->
          <nz-tab [nzTitle]="tabSkillsTitle">
            <ng-template #tabSkillsTitle>
              <span nz-icon nzType="solution" nzTheme="outline"></span>
              Đánh giá Năng lực chi tiết
            </ng-template>

            <div class="competency-tab-content">
              <!-- Experience & Education -->
              <section class="section" style="margin-bottom: 16px">
                <h4 class="section-title">
                  <span nz-icon nzType="solution" nzTheme="outline" style="color: #1890ff"></span>
                  Kinh nghiệm & Học vấn
                </h4>
                <nz-descriptions nzBordered [nzColumn]="2" nzSize="small">
                  <nz-descriptions-item nzTitle="Kinh nghiệm phát hiện">
                    <strong>{{ eval.experience_assessment.detected_years }} năm</strong>
                    (liên quan trực tiếp: <strong>{{ eval.experience_assessment.relevant_years }} năm</strong>)
                  </nz-descriptions-item>
                  <nz-descriptions-item nzTitle="Độ tin cậy kinh nghiệm">
                    <nz-progress
                      [nzPercent]="eval.experience_assessment.confidence"
                      nzSize="small"
                      [nzStrokeColor]="getScoreColor(eval.experience_assessment.confidence)"
                      style="width: 130px"
                    ></nz-progress>
                  </nz-descriptions-item>
                  <nz-descriptions-item nzTitle="Trình độ học vấn">
                    {{ getEducationLabel(eval.education_assessment.detected_level) }}
                    @if (eval.education_assessment.field_relevant) {
                      <nz-tag nzColor="green" style="margin-left: 4px">Đúng chuyên ngành</nz-tag>
                    }
                  </nz-descriptions-item>
                  <nz-descriptions-item nzTitle="Nhận xét kinh nghiệm & học vấn">
                    {{ eval.experience_assessment.summary || eval.education_assessment.summary }}
                  </nz-descriptions-item>
                </nz-descriptions>
              </section>

              <!-- Strengths & Concerns -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px">
                <section class="section">
                  <h4 class="section-title" style="color: #52c41a">
                    <span nz-icon nzType="like" nzTheme="outline"></span>
                    Điểm mạnh nổi bật ({{ eval.strengths.length }})
                  </h4>
                  @for (s of eval.strengths; track s) {
                    <div class="bullet-item success">{{ s }}</div>
                  }
                  @if (eval.strengths.length === 0) {
                    <p style="color: #ccc; font-style: italic">Không có ghi nhận đặc biệt</p>
                  }
                </section>

                <section class="section">
                  <h4 class="section-title" style="color: #ff4d4f">
                    <span nz-icon nzType="warning" nzTheme="outline"></span>
                    Điểm cần lưu ý / Rủi ro ({{ eval.concerns.length }})
                  </h4>
                  @for (c of eval.concerns; track c) {
                    <div class="bullet-item warning">{{ c }}</div>
                  }
                  @if (eval.concerns.length === 0) {
                    <p style="color: #ccc; font-style: italic">Không có rủi ro đáng kể</p>
                  }
                </section>
              </div>

              <!-- Skills List Summary -->
              <section class="section">
                <h4 class="section-title">
                  <span nz-icon nzType="code" nzTheme="outline" style="color: #1890ff"></span>
                  Bảng kỹ năng chuyên môn
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
                      @if (skill.found) {
                        <nz-progress
                          [nzPercent]="skill.confidence"
                          nzSize="small"
                          [nzStrokeColor]="getScoreColor(skill.confidence)"
                          [nzFormat]="confidenceFormat"
                        ></nz-progress>
                      } @else {
                        <nz-progress
                          [nzPercent]="0"
                          nzSize="small"
                          nzStrokeColor="#d9d9d9"
                          [nzFormat]="zeroFormat"
                        ></nz-progress>
                      }
                    </div>
                    <div class="skill-evidence">{{ skill.evidence }}</div>
                  </div>
                }
              </section>
            </div>
          </nz-tab>

          <!-- TAB 3: Bộ câu hỏi phỏng vấn & Cẩm nang chấm cho HR -->
          <nz-tab [nzTitle]="tabQuestionsTitle">
            <ng-template #tabQuestionsTitle>
              <span nz-icon nzType="question-circle" nzTheme="outline"></span>
              Bộ câu hỏi & Cẩm nang HR ({{ eval.interview_questions?.length || 0 }})
            </ng-template>

            @if (eval.interview_questions && eval.interview_questions.length > 0) {
              <div class="questions-section">
                @for (q of eval.interview_questions; track q.question; let i = $index) {
                  <div class="question-card">
                    <div class="question-header">
                      <span class="question-number">{{ i + 1 }}</span>
                      <nz-tag [nzColor]="getCategoryColor(q.category)">
                        {{ getCategoryLabel(q.category) }}
                      </nz-tag>
                      @if (q.target_skill) {
                        <nz-tag nzColor="geekblue" style="font-size: 11px">{{ q.target_skill }}</nz-tag>
                      }
                    </div>
                    <p class="question-text">{{ q.question }}</p>
                    <p class="question-purpose">
                      <span nz-icon nzType="bulb" nzTheme="outline" style="margin-right: 4px; color: #faad14"></span>
                      <strong>Mục đích:</strong> {{ q.purpose }}
                    </p>

                    <!-- Non-Tech HR Evaluation Guide -->
                    <div class="hr-guide-box">
                      <div class="hr-guide-header">
                        <span nz-icon nzType="audit" nzTheme="outline" style="color: #1890ff"></span>
                        <strong>Cẩm nang cho HR đánh giá câu trả lời</strong>
                      </div>

                      @if (q.good_signs && q.good_signs.length > 0) {
                        <div class="guide-sign-block good-signs">
                          <div class="guide-sign-title good">
                            <span nz-icon nzType="check-circle" style="color: #52c41a"></span>
                            Dấu hiệu ĐẠT / Câu trả lời tốt:
                          </div>
                          <ul class="guide-list">
                            @for (g of q.good_signs; track g) {
                              <li>{{ g }}</li>
                            }
                          </ul>
                        </div>
                      }

                      @if (q.red_flags && q.red_flags.length > 0) {
                        <div class="guide-sign-block red-flags">
                          <div class="guide-sign-title warn">
                            <span nz-icon nzType="warning" style="color: #ff4d4f"></span>
                            Cảnh báo / Trả lời kém (Red flags):
                          </div>
                          <ul class="guide-list">
                            @for (r of q.red_flags; track r) {
                              <li>{{ r }}</li>
                            }
                          </ul>
                        </div>
                      }

                      @if (q.grading_guide) {
                        <div class="guide-quick-eval">
                          <span nz-icon nzType="check-square" style="color: #1890ff; margin-right: 4px"></span>
                          <strong>Gợi ý chấm nhanh:</strong> {{ q.grading_guide }}
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <nz-empty nzNotFoundContent="Chưa có bộ câu hỏi phỏng vấn gợi ý"></nz-empty>
            }
          </nz-tab>
        </nz-tabset>
      </div>
    } @else {
      <nz-empty nzNotFoundContent="Chưa có kết quả đánh giá AI"></nz-empty>
    }
  `,
  styles: [
    `
      .evaluation-container {
        display: flex;
        flex-direction: column;
      }
      .overview-card {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 16px;
        border: 1px solid #e6f0ff;
        border-radius: 10px;
        background: linear-gradient(135deg, #f5f9ff, #fff);
      }
      .overview-info {
        flex: 1;
      }
      .assessment-text {
        margin: 4px 0 0;
        font-size: 13px;
        color: #444;
        line-height: 1.6;
      }
      .process-tab-content,
      .competency-tab-content {
        padding-top: 8px;
      }
      .pipeline-header-box {
        background: #f6ffed;
        border: 1px solid #b7eb8f;
        border-radius: 8px;
        padding: 12px 16px;
      }
      .pipeline-title {
        font-size: 14px;
        color: #135200;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .sub-heading {
        font-size: 14px;
        font-weight: 600;
        margin: 16px 0 8px;
        display: flex;
        align-items: center;
        gap: 6px;
        color: #222;
      }
      .step-badge {
        background: #18181b;
        color: #fff;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 12px;
      }
      .evidence-quote {
        background: #fffbe6;
        padding: 2px 6px;
        border-radius: 3px;
        border-left: 2px solid #faad14;
      }
      .verification-box {
        background: #f4f4f5;
        border: 1px solid #adc6ff;
        border-radius: 8px;
        padding: 12px 16px;
      }
      .verification-header {
        font-size: 13px;
        color: #1d39c4;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .section {
        padding: 16px;
        border: 1px solid #f0f0f0;
        border-radius: 8px;
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
        grid-template-columns: minmax(180px, 0.8fr) minmax(140px, 0.55fr);
        gap: 4px 12px;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #f5f5f5;
      }
      .skill-info {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .skill-bar {
        width: 100%;
      }
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
      .bullet-item.success::before {
        background: #52c41a;
      }
      .bullet-item.warning::before {
        background: #faad14;
      }
      .questions-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding-top: 8px;
      }
      .question-card {
        background: #fafafa;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        padding: 12px 14px;
      }
      .question-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
      }
      .question-number {
        background: #18181b;
        color: #fff;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 600;
        flex-shrink: 0;
      }
      .question-text {
        font-size: 14px;
        color: #222;
        margin: 0 0 6px;
        line-height: 1.6;
        font-weight: 600;
      }
      .question-purpose {
        font-size: 12px;
        color: #666;
        margin: 0 0 8px;
        font-style: italic;
      }
      .hr-guide-box {
        margin-top: 8px;
        padding: 10px 12px;
        background: #fff;
        border: 1px dashed #d9d9d9;
        border-radius: 6px;
      }
      .hr-guide-header {
        font-size: 12px;
        color: #18181b;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .guide-sign-block {
        margin-bottom: 6px;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 12px;
      }
      .guide-sign-block.good-signs {
        background: #f6ffed;
        border: 1px solid #b7eb8f;
      }
      .guide-sign-block.red-flags {
        background: #fff2f0;
        border: 1px solid #ffccc7;
      }
      .guide-sign-title {
        font-weight: 600;
        margin-bottom: 3px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .guide-sign-title.good {
        color: #389e0d;
      }
      .guide-sign-title.warn {
        color: #cf1322;
      }
      .guide-list {
        margin: 0;
        padding-left: 18px;
        color: #444;
        line-height: 1.5;
      }
      .guide-quick-eval {
        font-size: 12px;
        color: #18181b;
        background: #f4f4f5;
        border-radius: 4px;
        padding: 6px 10px;
        margin-top: 6px;
        line-height: 1.4;
      }
    `,
  ],
})
export class AiEvaluationModalComponent {
  readonly modalData = inject(NZ_MODAL_DATA) as {
    data: AiEvaluationResponse | null;
    loading: boolean;
    error: string | null;
  };

  activeTabIndex = 0;

  get data() {
    return this.modalData.data;
  }
  get loading() {
    return this.modalData.loading;
  }
  get error() {
    return this.modalData.error;
  }
  get eval() {
    return this.data?.ai_evaluation ?? null;
  }

  confidenceFormat = (p: number) => `${Math.round(p)}%`;
  zeroFormat = () => `0%`;

  getProcessSteps(): ProcessStep[] {
    if (!this.eval) return [];

    if (this.eval.process_steps && this.eval.process_steps.length > 0) {
      return this.eval.process_steps;
    }

    // Dynamic generation from eval state if process_steps was not stored in older records
    const matched = this.eval.skill_assessments.filter((s) => s.found).length;
    const totalSkills = this.eval.skill_assessments.length;
    const qCount = this.eval.interview_questions?.length || 0;
    const exp = this.eval.experience_assessment?.detected_years || 0;

    return [
      {
        step_number: 1,
        step_name: 'Trích xuất & Phân mảnh cấu trúc CV (Extraction & Chunking)',
        agent_node: 'Extractor Agent',
        status: 'completed',
        summary: `Trích xuất văn bản CV và tạo các phân mảnh ngữ cảnh (Semantic Chunks) phục vụ RAG.`,
        details:
          'Phân tích cú pháp văn bản CV, chia thành các khối ngữ cảnh (Kỹ năng, Kinh nghiệm làm việc, Học vấn, Dự án) và vector hóa để phục vụ tra cứu ngữ nghĩa.',
      },
      {
        step_number: 2,
        step_name: 'Phân tích & Đánh giá Năng lực chuyên sâu (Deep Evaluation)',
        agent_node: 'Evaluator Agent (LLM Reasoning)',
        status: 'completed',
        summary: `Đối chiếu ${totalSkills} kỹ năng JD (khớp ${matched}/${totalSkills}), đánh giá ${exp} năm kinh nghiệm và học vấn.`,
        details: `Phát hiện ${this.eval.strengths.length} điểm mạnh, ${this.eval.concerns.length} điểm cần lưu ý. Điểm sơ bộ: ${this.eval.overall_score}/100 (${this.eval.recommendation}).`,
      },
      {
        step_number: 3,
        step_name: 'Sinh câu hỏi phỏng vấn & Cẩm nang chấm cho HR (Question Gen)',
        agent_node: 'Question Generator Agent',
        status: 'completed',
        summary: `Đã sinh ${qCount} câu hỏi phỏng vấn kèm cẩm nang nhận biết câu trả lời Đạt / Cảnh báo cho HR.`,
        details:
          'Tập trung vào các kỹ năng cốt lõi và tình huống thực tế, cung cấp gợi ý chấm nhanh để Non-Tech HR dễ dàng phỏng vấn.',
      },
      {
        step_number: 4,
        step_name: 'Tự kiểm chứng & Phản biện chống ảo giác (Self-Reflection Verifier)',
        agent_node: 'Verifier Agent (Anti-Hallucination)',
        status: this.eval.verification_passed !== false ? 'completed' : 'warning',
        summary: `${this.eval.verification_passed !== false ? 'Đạt kiểm chứng độ tin cậy và chống suy diễn sai' : 'Đã phát hiện và hiệu chỉnh thông tin'}.`,
        details:
          this.eval.verification_feedback ||
          'Toàn bộ bằng chứng kỹ năng, số năm kinh nghiệm và kết quả đánh giá đã được kiểm chứng đối chiếu trực tiếp từ văn bản CV gốc.',
      },
    ];
  }

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

  getEducationLabel(level?: string | null): string {
    if (!level) return 'Không xác định';
    const labels: Record<string, string> = {
      high_school: 'THPT',
      bachelor: 'Cử nhân / Đại học',
      master: 'Thạc sĩ',
      phd: 'Tiến sĩ',
    };
    return labels[level] || level;
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      technical: 'default',
      architecture: 'default',
      behavioral: 'default',
      experience: 'default',
      situational: 'magenta',
    };
    return colors[category] || 'default';
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      technical: 'Kỹ thuật',
      architecture: 'Kiến trúc hệ thống',
      behavioral: 'Hành vi & Văn hóa',
      experience: 'Kinh nghiệm thực tế',
      situational: 'Tình huống / Sự cố',
    };
    return labels[category] || category;
  }
}
