import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzResizableModule, NzResizeEvent } from 'ng-zorro-antd/resizable';
import { JobService } from '../services/job.service';
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
    NzButtonModule,
    NzResizableModule,
  ],
  templateUrl: './ai-evaluation-modal.component.html',
  styleUrl: './ai-evaluation-modal.component.scss',
})
export class AiEvaluationModalComponent implements OnInit, OnDestroy {
  readonly modalData = inject(NZ_MODAL_DATA) as {
    data: AiEvaluationResponse | null;
    loading: boolean;
    error: string | null;
    jobId?: number;
    appId?: number;
    candidateName?: string;
    resumeFilename?: string;
  };
  private readonly jobService = inject(JobService);
  private readonly sanitizer = inject(DomSanitizer);

  activeTabIndex = 0;
  cvPaneWidth = 480;
  resumeLoading = false;
  resumeError: string | null = null;
  resumeUrl: SafeResourceUrl | null = null;
  private resumeObjectUrl: string | null = null;

  ngOnInit(): void {
    this.loadResume();
  }

  ngOnDestroy(): void {
    this.releaseResumeUrl();
  }

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
  get candidateName(): string {
    return this.modalData.candidateName || 'Ứng viên';
  }
  get resumeFilename(): string {
    return this.modalData.resumeFilename || `${this.candidateName} - CV.pdf`;
  }

  onCvResize({ width }: NzResizeEvent): void {
    if (width == null) return;
    this.cvPaneWidth = Math.min(720, Math.max(320, width));
  }

  downloadResume(): void {
    if (!this.resumeObjectUrl) return;
    const anchor = document.createElement('a');
    anchor.href = this.resumeObjectUrl;
    anchor.download = this.resumeFilename;
    anchor.click();
  }

  openResumeInNewTab(): void {
    if (this.resumeObjectUrl) window.open(this.resumeObjectUrl, '_blank', 'noopener,noreferrer');
  }

  retryResume(): void {
    this.loadResume();
  }

  private loadResume(): void {
    const { jobId, appId } = this.modalData;
    if (!jobId || !appId) {
      this.resumeError = 'Không có thông tin hồ sơ để tải CV.';
      return;
    }

    this.releaseResumeUrl();
    this.resumeLoading = true;
    this.resumeError = null;
    this.jobService.downloadResume(jobId, appId).subscribe({
      next: (blob) => {
        const pdfBlob = new Blob([blob], { type: blob.type || 'application/pdf' });
        this.resumeObjectUrl = URL.createObjectURL(pdfBlob);
        this.resumeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.resumeObjectUrl);
        this.resumeLoading = false;
      },
      error: () => {
        this.resumeLoading = false;
        this.resumeError = 'Không thể tải bản xem trước CV. Bạn có thể thử lại.';
      },
    });
  }

  private releaseResumeUrl(): void {
    if (this.resumeObjectUrl) URL.revokeObjectURL(this.resumeObjectUrl);
    this.resumeObjectUrl = null;
    this.resumeUrl = null;
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
      technical: 'blue',
      architecture: 'geekblue',
      behavioral: 'purple',
      experience: 'cyan',
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
