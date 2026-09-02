import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NZ_MODAL_DATA, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { JobService } from '../services/job.service';
import { AiEvaluationResponse } from '../models/job.model';
import { AiEvaluationModalComponent } from './ai-evaluation-modal.component';

const RECOMMENDATION_LABELS: Record<string, { text: string; color: string }> = {
  STRONG_FIT: { text: 'Rất phù hợp', color: 'success' },
  GOOD_FIT: { text: 'Phù hợp', color: 'green' },
  PARTIAL_FIT: { text: 'Phù hợp một phần', color: 'warning' },
  WEAK_FIT: { text: 'Ít phù hợp', color: 'orange' },
  NOT_FIT: { text: 'Không phù hợp', color: 'error' },
};

export interface StageInfo {
  step: number;
  name: string;
  agent: string;
  desc: string;
  status: 'waiting' | 'running' | 'done';
}

@Component({
  selector: 'app-ai-scoring-progress-modal',
  standalone: true,
  imports: [
    CommonModule,
    NzProgressModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzSpinModule,
    NzAlertModule,
    NzDividerModule,
  ],
  templateUrl: './ai-scoring-progress-modal.component.html',
  styleUrl: './ai-scoring-progress-modal.component.scss',
})
export class AiScoringProgressModalComponent implements OnInit, OnDestroy {
  readonly modalRef = inject(NzModalRef);
  readonly modalData = inject(NZ_MODAL_DATA) as {
    jobId: number;
    appId: number;
    candidateName: string;
    jobTitle: string;
  };
  private readonly jobService = inject(JobService);
  private readonly modalService = inject(NzModalService);

  get candidateName(): string {
    return this.modalData.candidateName;
  }
  get jobTitle(): string {
    return this.modalData.jobTitle;
  }

  progressPercent = 10;
  currentStatusMessage = 'Đang khởi tạo Agent Workflow...';
  completed = false;
  errorMessage: string | null = null;
  resultData: AiEvaluationResponse | null = null;

  stages: StageInfo[] = [
    {
      step: 1,
      name: 'Trích xuất & Phân mảnh cấu trúc CV',
      agent: 'Extractor Node',
      desc: 'Đọc tài liệu CV, phân tích cú pháp (Kỹ năng, Kinh nghiệm, Học vấn) và phân đoạn ngữ cảnh (Semantic Chunks)...',
      status: 'running',
    },
    {
      step: 2,
      name: 'Phân tích & Khớp năng lực chuyên sâu',
      agent: 'Evaluator Node (LLM Reasoning)',
      desc: 'Đối chiếu chi tiết kỹ năng Must-Have & Nice-To-Have, tính số năm kinh nghiệm và đánh giá mức độ tương thích...',
      status: 'waiting',
    },
    {
      step: 3,
      name: 'Tự kiểm chứng & Phản biện chống ảo giác',
      agent: 'Verifier Node (Anti-Hallucination)',
      desc: 'Rà soát từng trích dẫn bằng chứng (Evidence Grounding) so với CV gốc, phát hiện và ngăn ngừa ảo giác...',
      status: 'waiting',
    },
    {
      step: 4,
      name: 'Sinh bộ câu hỏi phỏng vấn & Cẩm nang HR',
      agent: 'Question Generator Node',
      desc: 'Thiết kế bộ câu hỏi phỏng vấn nhắm trúng năng lực ứng viên kèm cẩm nang Good Signs / Red Flags cho HR...',
      status: 'waiting',
    },
    {
      step: 5,
      name: 'Tổng hợp kết quả & Lưu đánh giá',
      agent: 'Database & Notification Node',
      desc: 'Tính toán điểm tổng thể, gắn nhãn khuyến nghị và hoàn tất quy trình đánh giá...',
      status: 'waiting',
    },
  ];

  private timerRef: any = null;
  private pollCount = 0;

  ngOnInit(): void {
    this.startSimulationAndPolling();
  }

  ngOnDestroy(): void {
    if (this.timerRef) {
      clearInterval(this.timerRef);
    }
  }

  private startSimulationAndPolling(): void {
    let elapsedSeconds = 0;

    this.timerRef = setInterval(() => {
      elapsedSeconds += 1;

      // Update simulated progress stages according to typical execution time
      if (elapsedSeconds >= 2 && elapsedSeconds < 6) {
        this.stages[0].status = 'done';
        this.stages[1].status = 'running';
        this.progressPercent = 35;
        this.currentStatusMessage = 'Bước 2: AI Agent đang phân tích năng lực chuyên sâu...';
      } else if (elapsedSeconds >= 6 && elapsedSeconds < 12) {
        this.stages[0].status = 'done';
        this.stages[1].status = 'done';
        this.stages[2].status = 'running';
        this.progressPercent = 60;
        this.currentStatusMessage = 'Bước 3: Đang kiểm chứng bằng chứng & Chống ảo giác...';
      } else if (elapsedSeconds >= 12 && elapsedSeconds < 18) {
        this.stages[0].status = 'done';
        this.stages[1].status = 'done';
        this.stages[2].status = 'done';
        this.stages[3].status = 'running';
        this.progressPercent = 80;
        this.currentStatusMessage = 'Bước 4: Đang sinh bộ câu hỏi & Cẩm nang đánh giá cho HR...';
      } else if (elapsedSeconds >= 18) {
        this.stages[0].status = 'done';
        this.stages[1].status = 'done';
        this.stages[2].status = 'done';
        this.stages[3].status = 'done';
        this.stages[4].status = 'running';
        this.progressPercent = Math.min(95, 80 + Math.floor((elapsedSeconds - 18) / 2));
        this.currentStatusMessage = 'Bước 5: Đang tổng hợp và lưu kết quả đánh giá...';
      }

      // Check backend result periodically every 2 seconds
      if (elapsedSeconds >= 2 && elapsedSeconds % 2 === 0 && !this.completed) {
        this.checkBackendResult();
      }

      // Timeout after 60s
      if (elapsedSeconds > 60 && !this.completed) {
        clearInterval(this.timerRef);
        this.checkBackendResult(true);
      }
    }, 1000);
  }

  private checkBackendResult(isLastAttempt = false): void {
    this.jobService.getAiEvaluation(this.modalData.jobId, this.modalData.appId).subscribe({
      next: (res) => {
        if (res && res.has_evaluation && res.ai_evaluation) {
          clearInterval(this.timerRef);
          this.resultData = res;
          this.stages.forEach((s) => (s.status = 'done'));
          this.progressPercent = 100;
          this.currentStatusMessage = 'Hoàn thành toàn bộ quy trình phân tích và chấm điểm AI!';
          this.completed = true;
        } else if (isLastAttempt) {
          this.errorMessage = 'Thời gian xử lý kéo dài hơn dự kiến. Bạn có thể đóng cửa sổ và xem kết quả sau ít phút.';
        }
      },
      error: () => {
        if (isLastAttempt) {
          this.errorMessage = 'Không thể lấy kết quả đánh giá AI. Vui lòng kiểm tra lại sau.';
        }
      },
    });
  }

  getStageBadgeColor(status: 'waiting' | 'running' | 'done'): string {
    if (status === 'done') return 'success';
    if (status === 'running') return 'processing';
    return 'default';
  }

  getStageStatusLabel(status: 'waiting' | 'running' | 'done'): string {
    if (status === 'done') return 'Hoàn thành';
    if (status === 'running') return 'Đang xử lý...';
    return 'Chờ xử lý';
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#52c41a';
    if (score >= 40) return '#faad14';
    return '#ff4d4f';
  }

  getRecColor(rec: string): string {
    return RECOMMENDATION_LABELS[rec]?.color || 'default';
  }

  getRecLabel(rec: string): string {
    return RECOMMENDATION_LABELS[rec]?.text || rec;
  }

  openFullEvaluation(): void {
    if (!this.resultData) return;
    this.modalRef.destroy();

    this.modalService.create({
      nzTitle: `Đánh giá AI - ${this.candidateName}`,
      nzContent: AiEvaluationModalComponent,
      nzWidth: 'min(1440px, calc(100vw - 32px))',
      nzBodyStyle: { padding: '16px', overflow: 'hidden' },
      nzData: {
        loading: false,
        data: this.resultData,
        error: null,
        jobId: this.modalData.jobId,
        appId: this.modalData.appId,
        candidateName: this.candidateName,
      },
      nzFooter: null,
      nzCentered: true,
    });
  }

  closeModal(): void {
    this.modalRef.destroy();
  }
}
