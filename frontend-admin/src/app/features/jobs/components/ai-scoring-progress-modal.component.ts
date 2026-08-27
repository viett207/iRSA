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
  template: `
    <div class="progress-modal-container">
      <!-- Header Info -->
      <div class="header-section">
        <div class="header-avatar">
          <span nz-icon nzType="robot" nzTheme="outline" style="font-size: 28px; color: #1890ff"></span>
        </div>
        <div class="header-details">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600">
            Tiến trình AI Phân tích & Chấm điểm CV
          </h3>
          <div style="font-size: 13px; color: #666; margin-top: 2px">
            Ứng viên: <strong style="color: #222">{{ candidateName }}</strong> | Vị trí: <strong>{{ jobTitle }}</strong>
          </div>
        </div>
      </div>

      <!-- Top Progress Bar -->
      <div class="progress-bar-box">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; font-weight: 500">
          <span>{{ currentStatusMessage }}</span>
          <span style="color: #1890ff; font-weight: 600">{{ progressPercent }}%</span>
        </div>
        <nz-progress
          [nzPercent]="progressPercent"
          [nzStrokeColor]="progressPercent === 100 ? '#52c41a' : { '0%': '#108ee9', '100%': '#87d068' }"
          [nzShowInfo]="false"
          nzStatus="active"
        ></nz-progress>
      </div>

      <!-- Steps Pipeline List -->
      <div class="steps-pipeline-list">
        @for (stage of stages; track stage.step) {
          <div class="stage-item" [ngClass]="stage.status">
            <!-- Icon State Indicator -->
            <div class="stage-icon-col">
              @if (stage.status === 'done') {
                <div class="icon-circle done">
                  <span nz-icon nzType="check" nzTheme="outline"></span>
                </div>
              } @else if (stage.status === 'running') {
                <div class="icon-circle running">
                  <nz-spin nzSimple nzSize="small"></nz-spin>
                </div>
              } @else {
                <div class="icon-circle waiting">
                  <span>{{ stage.step }}</span>
                </div>
              }
              @if (stage.step < stages.length) {
                <div class="vertical-connector" [ngClass]="{ active: stage.status === 'done' }"></div>
              }
            </div>

            <!-- Content Details -->
            <div class="stage-content-col">
              <div class="stage-header">
                <span class="stage-name" [ngClass]="{ active: stage.status === 'running', done: stage.status === 'done' }">
                  Bước {{ stage.step }}: {{ stage.name }}
                </span>
                <nz-tag [nzColor]="getStageBadgeColor(stage.status)" style="font-size: 11px">
                  {{ getStageStatusLabel(stage.status) }}
                </nz-tag>
              </div>
              <div class="stage-agent">
                <span nz-icon nzType="cluster" style="margin-right: 4px; color: #1890ff"></span>
                Phụ trách: <strong>{{ stage.agent }}</strong>
              </div>
              <div class="stage-desc">
                {{ stage.desc }}
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Final Evaluation Result Card (When Complete) -->
      @if (completed && resultData?.ai_evaluation) {
        <div class="final-result-box">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px">
            <div style="display: flex; align-items: center; gap: 8px">
              <span nz-icon nzType="check-circle" nzTheme="fill" style="color: #52c41a; font-size: 20px"></span>
              <strong style="font-size: 14px; color: #135200">Đã hoàn tất phân tích & Đánh giá CV!</strong>
            </div>
            <nz-tag [nzColor]="getRecColor(resultData!.ai_evaluation!.recommendation)">
              {{ getRecLabel(resultData!.ai_evaluation!.recommendation) }}
            </nz-tag>
          </div>

          <div style="display: flex; align-items: center; gap: 16px; margin: 10px 0">
            <nz-progress
              [nzPercent]="resultData!.ai_score || 0"
              nzType="circle"
              [nzWidth]="60"
              [nzStrokeColor]="getScoreColor(resultData!.ai_score || 0)"
            ></nz-progress>
            <div style="flex: 1; font-size: 13px; color: #333; line-height: 1.5">
              {{ resultData!.ai_evaluation!.overall_assessment }}
            </div>
          </div>
        </div>
      }

      @if (errorMessage) {
        <nz-alert nzType="error" [nzMessage]="errorMessage" nzShowIcon style="margin-top: 12px"></nz-alert>
      }

      <!-- Footer Buttons -->
      <div class="footer-actions">
        @if (completed && resultData?.ai_evaluation) {
          <button nz-button nzType="primary" (click)="openFullEvaluation()">
            <span nz-icon nzType="profile"></span>
            Xem toàn bộ bảng phân tích chi tiết & Cẩm nang HR
          </button>
        }
        <button nz-button nzType="default" (click)="closeModal()">
          {{ completed ? 'Đóng' : 'Chạy ngầm & Đóng' }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .progress-modal-container {
        padding: 4px 0;
      }
      .header-section {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #f0f0f0;
      }
      .header-avatar {
        width: 44px;
        height: 44px;
        border-radius: 8px;
        background: #e6f7ff;
        border: 1px solid #91d5ff;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .progress-bar-box {
        background: #fafafa;
        border: 1px solid #f0f0f0;
        border-radius: 8px;
        padding: 12px 14px;
        margin-bottom: 16px;
      }
      .steps-pipeline-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin-bottom: 16px;
      }
      .stage-item {
        display: flex;
        gap: 12px;
        padding: 8px 10px;
        border-radius: 6px;
        transition: background-color 0.2s;
      }
      .stage-item.running {
        background: #e6f7ff;
        border: 1px solid #91d5ff;
      }
      .stage-item.done {
        background: #fcfcfc;
      }
      .stage-icon-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 24px;
      }
      .icon-circle {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 600;
      }
      .icon-circle.waiting {
        background: #f0f0f0;
        color: #888;
      }
      .icon-circle.running {
        background: #fff;
        border: 1px solid #1890ff;
      }
      .icon-circle.done {
        background: #52c41a;
        color: #fff;
      }
      .vertical-connector {
        width: 2px;
        flex: 1;
        min-height: 26px;
        background: #e8e8e8;
        margin: 4px 0;
      }
      .vertical-connector.active {
        background: #52c41a;
      }
      .stage-content-col {
        flex: 1;
      }
      .stage-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .stage-name {
        font-size: 13px;
        font-weight: 600;
        color: #555;
      }
      .stage-name.active {
        color: #096dd9;
      }
      .stage-name.done {
        color: #222;
      }
      .stage-agent {
        font-size: 11px;
        color: #888;
        margin-top: 2px;
      }
      .stage-desc {
        font-size: 12px;
        color: #666;
        margin-top: 2px;
        line-height: 1.4;
      }
      .final-result-box {
        background: #f6ffed;
        border: 1px solid #b7eb8f;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 14px;
      }
      .footer-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid #f0f0f0;
      }
    `,
  ],
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
      nzWidth: 'min(1200px, calc(100vw - 48px))',
      nzBodyStyle: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' },
      nzData: { loading: false, data: this.resultData, error: null },
      nzFooter: null,
      nzCentered: true,
    });
  }

  closeModal(): void {
    this.modalRef.destroy();
  }
}
