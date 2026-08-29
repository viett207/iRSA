import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NZ_MODAL_DATA, NzModalRef, NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

import { NzRadioModule } from 'ng-zorro-antd/radio';

import { JobService } from '../services/job.service';
import {
  AiInterviewQuestion,
  InterviewAnswer,
  InterviewDataResponse,
  APPLICATION_STATUS_COLORS,
  APPLICATION_STATUS_LABELS,
} from '../models/job.model';

interface QuestionState {
  question: AiInterviewQuestion;
  selected: boolean;
  recording: boolean;
  recordingSeconds: number;
  timerInterval?: any;
  mediaRecorder?: MediaRecorder;
  audioChunks: Blob[];
  audioBlob?: Blob;
  localAudioUrl?: string;
  rawAudioUrl?: string;
  audioUrl?: string;
  transcript: string;
  transcribing: boolean;
  evaluating: boolean;
  answer?: InterviewAnswer;
  showGuide: boolean;
  volumeLevel: number;
  audioContext?: AudioContext;
  analyser?: AnalyserNode;
  animFrameId?: number;
  activeStreams?: MediaStream[];
}

@Component({
  selector: 'app-interview-room-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzProgressModule,
    NzTabsModule,
    NzCardModule,
    NzSpinModule,
    NzAlertModule,
    NzInputModule,
    NzDescriptionsModule,
    NzPopconfirmModule,
    NzCheckboxModule,
    NzToolTipModule,
    NzBadgeModule,
    NzSelectModule,
    NzDividerModule,
    NzEmptyModule,
    NzModalModule,
    NzRadioModule,
  ],
  template: `
    <div class="interview-room-container">
      @if (loading()) {
        <div style="text-align: center; padding: 40px">
          <nz-spin nzSimple nzSize="large"></nz-spin>
          <p style="margin-top: 16px; color: #666; font-size: 14px">
            Đang tải dữ liệu phòng phỏng vấn và bộ câu hỏi...
          </p>
        </div>
      } @else if (data()) {
        <!-- Top Banner: Candidate & Job Profile -->
        <div class="candidate-banner">
          <div class="banner-left">
            <div class="avatar-circle">
              <span nz-icon nzType="user" style="font-size: 24px; color: #1890ff"></span>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px">
                <h3 style="margin: 0; font-size: 18px; font-weight: 600">
                  {{ data()!.candidate.name }}
                </h3>
                <nz-tag [nzColor]="getStatusColor(data()!.application_status)">
                  {{ getStatusLabel(data()!.application_status) }}
                </nz-tag>
              </div>
              <div style="font-size: 12px; color: #666; margin-top: 4px">
                <span><span nz-icon nzType="mail"></span> {{ data()!.candidate.email }}</span>
                @if (data()!.candidate.phone) {
                  <span style="margin-left: 12px"><span nz-icon nzType="phone"></span> {{ data()!.candidate.phone }}</span>
                }
                <span style="margin-left: 12px"><span nz-icon nzType="solution"></span> <strong>{{ data()!.job_title }}</strong></span>
              </div>
            </div>
          </div>

          <!-- Screening score pill -->
          <div class="banner-right">
            @if (data()!.screening_ai_score != null) {
              <div class="score-pill">
                <div style="font-size: 11px; color: #888">Điểm AI CV</div>
                <nz-progress
                  [nzPercent]="data()!.screening_ai_score!"
                  nzType="circle"
                  [nzWidth]="42"
                  [nzStrokeColor]="getScoreColor(data()!.screening_ai_score!)"
                  [nzFormat]="scoreFormat"
                ></nz-progress>
              </div>
            }
            @if (overallScore() != null) {
              <div class="score-pill interview-score">
                <div style="font-size: 11px; color: #1890ff; font-weight: 600">Điểm Phỏng vấn</div>
                <nz-progress
                  [nzPercent]="overallScore()!"
                  nzType="circle"
                  [nzWidth]="46"
                  [nzStrokeColor]="getScoreColor(overallScore()!)"
                  [nzFormat]="scoreFormat"
                ></nz-progress>
              </div>
            }
          </div>
        </div>

        <!-- Main Workspace Tabs -->
        <nz-tabset [(nzSelectedIndex)]="activeTabIndex" style="margin-top: 12px">
          
          <!-- TAB 1: PHÒNG PHỎNG VẤN & GHI ÂM TỪNG CÂU -->
          <nz-tab [nzTitle]="tabLiveTitle">
            <ng-template #tabLiveTitle>
              <span nz-icon nzType="audio" style="color: #ff4d4f"></span>
              <strong>Phòng phỏng vấn ({{ activeQuestions().length }} câu hỏi)</strong>
            </ng-template>

            <div class="tab-body">
              <!-- Interview Mode Selection Banner -->
              <div class="interview-mode-banner">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px">
                  <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
                    <span style="font-weight: 600; color: #262626; display: flex; align-items: center; gap: 6px">
                      <span nz-icon nzType="setting" style="color: #1890ff"></span> Hình thức phỏng vấn:
                    </span>
                    <nz-radio-group [(ngModel)]="interviewMode" nzButtonStyle="solid" nzSize="small">
                      <label nz-radio-button nzValue="offline">
                        <span nz-icon nzType="team"></span> 🏢 Trực tiếp (Chỉ Mic)
                      </label>
                      <label nz-radio-button nzValue="online">
                        <span nz-icon nzType="video-camera"></span> 🌐 Online (Google Meet + Mic)
                      </label>
                    </nz-radio-group>
                  </div>

                  @if (interviewMode === 'online') {
                    <nz-tag nzColor="blue">
                      <span nz-icon nzType="sound"></span> Ghi âm đồng thời: Tab Meet & Mic
                    </nz-tag>
                  } @else {
                    <nz-tag nzColor="green">
                      <span nz-icon nzType="audio"></span> Ghi âm: Microphone phòng
                    </nz-tag>
                  }
                </div>

                @if (interviewMode === 'online') {
                  <div class="online-hint-box">
                    <span nz-icon nzType="info-circle" style="color: #1890ff; font-size: 16px; margin-top: 2px"></span>
                    <div>
                      <strong>Hướng dẫn phỏng vấn Online:</strong> Khi bấm <em>"Bắt đầu ghi âm"</em>, trình duyệt sẽ mở cửa sổ chia sẻ. Bạn hãy chọn <strong>Tab Google Meet</strong> (hoặc Toàn màn hình) và <strong>tick chọn "Chia sẻ âm thanh tab" (Share tab audio)</strong>. Hệ thống sẽ tự động hòa âm giọng ứng viên và microphone của bạn vào cùng 1 bản ghi!
                    </div>
                  </div>
                }
              </div>

              <!-- Quick Stats & Actions Header -->
              <div class="room-action-bar">
                <div style="display: flex; align-items: center; gap: 8px">
                  <nz-tag nzColor="blue">
                    <span nz-icon nzType="check-circle"></span>
                    Đã chấm: {{ answeredCount() }}/{{ activeQuestions().length }} câu
                  </nz-tag>
                  @if (answeredCount() > 0) {
                    <nz-tag nzColor="green">
                      Điểm TB tạm tính: <strong>{{ averageAnswerScore() }}/100</strong>
                    </nz-tag>
                  }
                </div>

                <div style="display: flex; gap: 8px">
                  <button nz-button nzSize="small" nzType="default" (click)="openAddCustomModal()">
                    <span nz-icon nzType="plus"></span> Thêm câu hỏi nhanh
                  </button>
                  <button
                    nz-button
                    nzSize="small"
                    nzType="primary"
                    [nzLoading]="summarizing"
                    [disabled]="answeredCount() === 0"
                    (click)="triggerSummary()"
                  >
                    <span nz-icon nzType="radar-chart"></span> Tổng kết phỏng vấn bằng AI
                  </button>
                </div>
              </div>

              <!-- Question Cards List -->
              @if (activeQuestions().length === 0) {
                <div style="text-align: center; padding: 40px; background: #fafafa; border-radius: 8px; border: 1px dashed #d9d9d9">
                  <span nz-icon nzType="question-circle" style="font-size: 32px; color: #faad14"></span>
                  <p style="margin-top: 12px; font-weight: 500">Chưa có câu hỏi phỏng vấn nào được chọn.</p>
                  <button nz-button nzType="primary" (click)="activeTabIndex = 1">
                    <span nz-icon nzType="form"></span> Sang tab "Quản lý câu hỏi" để thiết lập
                  </button>
                </div>
              } @else {
                <div class="questions-stream">
                  @for (qState of activeQuestions(); track qState.question.question; let i = $index) {
                    <div class="question-eval-card" [class.evaluated]="!!qState.answer">
                      
                      <!-- Card Header -->
                      <div class="q-header">
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1">
                          <span class="q-index-pill">{{ i + 1 }}</span>
                          <nz-tag [nzColor]="getCategoryColor(qState.question.category)">
                            {{ getCategoryLabel(qState.question.category) }}
                          </nz-tag>
                          @if (qState.question.target_skill) {
                            <nz-tag nzColor="geekblue">{{ qState.question.target_skill }}</nz-tag>
                          }
                          @if (qState.answer) {
                            <nz-tag nzColor="success">
                              <span nz-icon nzType="check"></span> Đã chấm: <strong>{{ qState.answer.score }}/100</strong>
                            </nz-tag>
                          }
                        </div>

                        <button
                          nz-button
                          nzType="link"
                          nzSize="small"
                          (click)="qState.showGuide = !qState.showGuide"
                          style="padding: 0; font-size: 12px"
                        >
                          <span nz-icon [nzType]="qState.showGuide ? 'up' : 'down'"></span>
                          {{ qState.showGuide ? 'Ẩn cẩm nang HR' : 'Xem cẩm nang HR' }}
                        </button>
                      </div>

                      <!-- Question Content -->
                      <div class="q-content">
                        <p class="q-text">{{ qState.question.question }}</p>
                        <div class="q-purpose">
                          <span nz-icon nzType="bulb" style="color: #faad14; margin-right: 4px"></span>
                          <strong>Mục đích:</strong> {{ qState.question.purpose }}
                        </div>
                      </div>

                      <!-- Non-Tech HR Guide Box -->
                      @if (qState.showGuide) {
                        <div class="guide-collapsible">
                          @if (qState.question.good_signs && qState.question.good_signs.length > 0) {
                            <div class="guide-sub-block good">
                              <strong style="color: #389e0d">
                                <span nz-icon nzType="check-circle"></span> Dấu hiệu ĐẠT / Câu trả lời tốt:
                              </strong>
                              <ul style="margin: 4px 0 0; padding-left: 18px">
                                @for (g of qState.question.good_signs; track g) {
                                  <li>{{ g }}</li>
                                }
                              </ul>
                            </div>
                          }
                          @if (qState.question.red_flags && qState.question.red_flags.length > 0) {
                            <div class="guide-sub-block warn">
                              <strong style="color: #cf1322">
                                <span nz-icon nzType="warning"></span> Cảnh báo / Trả lời kém (Red flags):
                              </strong>
                              <ul style="margin: 4px 0 0; padding-left: 18px">
                                @for (r of qState.question.red_flags; track r) {
                                  <li>{{ r }}</li>
                                }
                              </ul>
                            </div>
                          }
                        </div>
                      }

                      <!-- Recording & Audio Toolset -->
                      <div class="audio-control-bar">
                        <!-- Record Action Buttons -->
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
                          @if (!qState.recording) {
                            <button
                              nz-button
                              nzType="primary"
                              nzDanger
                              (click)="startRecording(qState)"
                              [disabled]="isAnyRecording() && !qState.recording"
                            >
                              <span nz-icon [nzType]="interviewMode === 'online' ? 'video-camera' : 'audio'"></span>
                              @if (qState.localAudioUrl || qState.rawAudioUrl || qState.audioUrl) {
                                {{ interviewMode === 'online' ? 'Ghi âm lại Online (Meet + Mic)' : 'Ghi âm lại câu này' }}
                              } @else {
                                {{ interviewMode === 'online' ? 'Bắt đầu ghi âm Online (Meet + Mic)' : 'Bắt đầu ghi âm câu trả lời' }}
                              }
                            </button>
                          } @else {
                            <button nz-button nzType="primary" nzDanger (click)="stopRecording(qState)">
                              <span nz-icon nzType="pause-circle"></span>
                              Dừng ghi âm ({{ formatSeconds(qState.recordingSeconds) }})
                            </button>
                            <span class="recording-pulse">
                              <span class="dot"></span> {{ interviewMode === 'online' ? 'Đang thu Meet & Mic...' : 'Đang thu mic...' }}
                            </span>
                          }

                          <!-- Upload file audio button -->
                          <label class="custom-file-upload">
                            <input
                              type="file"
                              accept="audio/*"
                              style="display: none"
                              (change)="onFileSelected($event, qState)"
                            />
                            <span nz-button nzType="default" nzSize="middle">
                              <span nz-icon nzType="upload"></span> Tải file ghi âm (.mp3/.wav/.webm)
                            </span>
                          </label>
                        </div>

                        <!-- Real-time Volume Level Meter Bar when Recording -->
                        @if (qState.recording) {
                          <div class="live-volume-meter">
                            <span style="font-size: 11px; font-weight: 600; color: #555">
                              <span nz-icon nzType="sound"></span> Âm lượng Mic:
                            </span>
                            <div class="meter-track">
                              <div
                                class="meter-fill"
                                [style.width.%]="qState.volumeLevel"
                                [class.high]="qState.volumeLevel > 70"
                                [class.med]="qState.volumeLevel > 30 && qState.volumeLevel <= 70"
                              ></div>
                            </div>
                            <span style="font-size: 11px; font-weight: 700; width: 34px; text-align: right">
                              {{ qState.volumeLevel }}%
                            </span>
                          </div>
                        }

                        <!-- Audio Playback Controls -->
                        @if (qState.localAudioUrl || qState.rawAudioUrl || qState.audioUrl) {
                          <div class="audio-player-wrapper">
                            <button
                              nz-button
                              nzType="primary"
                              nzSize="small"
                              (click)="togglePlayAudio(qState, i)"
                              style="background: #1890ff; font-weight: 600; margin-right: 8px"
                            >
                              <span nz-icon [nzType]="playingIndex === i ? 'pause-circle' : 'play-circle'"></span>
                              {{ playingIndex === i ? 'Tạm dừng' : '▶️ Nghe lại' }}
                            </button>

                            <audio
                              [src]="getAudioSrc(qState, i)"
                              controls
                              preload="auto"
                              style="height: 36px; min-width: 240px"
                            ></audio>
                          </div>
                        }
                      </div>

                      <!-- Transcript & Transcription / Scoring Action Row -->
                      <div class="evaluation-action-row">
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 6px">
                          <div style="display: flex; justify-content: space-between; align-items: center">
                            <span style="font-size: 12px; font-weight: 600; color: #555">
                              <span nz-icon nzType="file-text"></span> Nội dung câu trả lời (Transcript):
                            </span>

                            <!-- Dedicated Speech-to-Text Button -->
                            @if (qState.audioBlob || qState.localAudioUrl || qState.rawAudioUrl || qState.audioUrl) {
                              <button
                                nz-button
                                nzSize="small"
                                nzType="dashed"
                                [nzLoading]="qState.transcribing"
                                (click)="transcribeAudioOnly(qState, i)"
                                style="color: #722ed1; border-color: #d3adf7; font-weight: 600"
                              >
                                <span nz-icon nzType="translation"></span>
                                Bóc băng lời nói sang văn bản (STT)
                              </button>
                            }
                          </div>

                          <textarea
                            nz-input
                            [(ngModel)]="qState.transcript"
                            [nzAutosize]="{ minRows: 2, maxRows: 4 }"
                            placeholder="Văn bản bóc băng câu trả lời sẽ hiển thị tại đây sau khi bấm 'Bóc băng' hoặc 'Chấm điểm'. Bạn có thể xem và chỉnh sửa trực tiếp..."
                            style="font-size: 13px"
                          ></textarea>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 6px; justify-content: flex-end">
                          <button
                            nz-button
                            nzType="primary"
                            [nzLoading]="qState.evaluating"
                            [disabled]="!qState.audioBlob && !qState.localAudioUrl && !qState.rawAudioUrl && !qState.audioUrl && !qState.transcript.trim()"
                            (click)="evaluateAnswer(qState, i)"
                            style="height: 42px; padding: 0 18px; background: #52c41a; border-color: #52c41a; font-weight: 600"
                          >
                            <span nz-icon nzType="robot"></span>
                            {{ qState.answer ? 'Chấm điểm lại' : 'Chấm điểm câu này' }}
                          </button>
                        </div>
                      </div>

                      <!-- AI Evaluation Results Box -->
                      @if (qState.answer) {
                        <div class="ai-answer-result-box">
                          <div class="result-top-line">
                            <div style="display: flex; align-items: center; gap: 10px">
                              <nz-progress
                                [nzPercent]="qState.answer.score"
                                nzType="circle"
                                [nzWidth]="48"
                                [nzStrokeColor]="getScoreColor(qState.answer.score)"
                                [nzFormat]="scoreFormat"
                              ></nz-progress>
                              <div>
                                <strong style="font-size: 14px; color: #222">Đánh giá câu trả lời:</strong>
                                <p style="margin: 2px 0 0; font-size: 13px; color: #444">
                                  {{ qState.answer.assessment }}
                                </p>
                              </div>
                            </div>
                          </div>

                          <!-- Strengths & Improvements -->
                          <div class="strengths-weakness-grid">
                            <div class="sw-col">
                              <strong style="color: #389e0d; font-size: 12px">
                                <span nz-icon nzType="like"></span> Điểm mạnh:
                              </strong>
                              <ul style="margin: 4px 0 0; padding-left: 16px; font-size: 12px; color: #444">
                                @for (s of qState.answer.strengths; track s) {
                                  <li>{{ s }}</li>
                                }
                              </ul>
                            </div>

                            <div class="sw-col">
                              <strong style="color: #fa8c16; font-size: 12px">
                                <span nz-icon nzType="warning"></span> Điểm cần đào sâu / Thiếu sót:
                              </strong>
                              <ul style="margin: 4px 0 0; padding-left: 16px; font-size: 12px; color: #444">
                                @for (w of qState.answer.improvements; track w) {
                                  <li>{{ w }}</li>
                                }
                              </ul>
                            </div>
                          </div>

                          <!-- STAR Analysis if present -->
                          @if (qState.answer.star_analysis && (qState.answer.star_analysis.situation || qState.answer.star_analysis.action)) {
                            <div class="star-card">
                              <div style="font-size: 11px; font-weight: 600; color: #1890ff; margin-bottom: 4px">
                                <span nz-icon nzType="compass"></span> Mô hình STAR phát hiện từ câu trả lời:
                              </div>
                              <div class="star-grid">
                                <div><strong>Tình huống (S):</strong> {{ qState.answer.star_analysis.situation || '—' }}</div>
                                <div><strong>Nhiệm vụ (T):</strong> {{ qState.answer.star_analysis.task || '—' }}</div>
                                <div><strong>Hành động (A):</strong> {{ qState.answer.star_analysis.action || '—' }}</div>
                                <div><strong>Kết quả (R):</strong> {{ qState.answer.star_analysis.result || '—' }}</div>
                              </div>
                            </div>
                          }

                          <!-- Follow-up Question Suggestion -->
                          @if (qState.answer.follow_up_question) {
                            <div class="follow-up-box">
                              <span nz-icon nzType="question" style="color: #1890ff"></span>
                              <strong>Gợi ý câu hỏi đào sâu tiếp theo:</strong>
                              <span style="font-style: italic; color: #222; margin-left: 4px">
                                "{{ qState.answer.follow_up_question }}"
                              </span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </nz-tab>

          <!-- TAB 2: THIẾT LẬP & TÙY BIẾN BỘ CÂU HỎI -->
          <nz-tab [nzTitle]="tabSetupTitle">
            <ng-template #tabSetupTitle>
              <span nz-icon nzType="form"></span>
              Thiết lập bộ câu hỏi ({{ allQuestionStates().length }})
            </ng-template>

            <div class="tab-body">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
                <div>
                  <h4 style="margin: 0; font-weight: 600">Chọn lọc các câu hỏi sẽ dùng trong phỏng vấn</h4>
                  <p style="margin: 2px 0 0; color: #888; font-size: 12px">
                    Tick chọn câu hỏi phù hợp, thêm câu hỏi tự soạn hoặc yêu cầu AI tạo thêm câu hỏi theo chủ đề.
                  </p>
                </div>

                <div style="display: flex; gap: 8px">
                  <button nz-button nzType="dashed" (click)="openGenerateAiModal()">
                    <span nz-icon nzType="bulb"></span> AI sinh thêm câu hỏi
                  </button>
                  <button nz-button nzType="default" (click)="openAddCustomModal()">
                    <span nz-icon nzType="plus"></span> Thêm câu hỏi tùy chỉnh
                  </button>
                  <button nz-button nzType="primary" (click)="saveQuestions()">
                    <span nz-icon nzType="save"></span> Xác nhận & Lưu bộ câu hỏi
                  </button>
                </div>
              </div>

              <!-- Question Selection List -->
              <div class="setup-questions-list">
                @for (qState of allQuestionStates(); track qState.question.question; let i = $index) {
                  <div class="setup-q-row" [class.selected]="qState.selected">
                    <label nz-checkbox [(ngModel)]="qState.selected"></label>
                    <span class="q-index-pill" style="margin-left: 8px">{{ i + 1 }}</span>
                    <div style="flex: 1; margin: 0 12px">
                      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px">
                        <nz-tag [nzColor]="getCategoryColor(qState.question.category)">
                          {{ getCategoryLabel(qState.question.category) }}
                        </nz-tag>
                        @if (qState.question.target_skill) {
                          <nz-tag nzColor="geekblue">{{ qState.question.target_skill }}</nz-tag>
                        }
                      </div>
                      <div style="font-weight: 600; font-size: 13px; color: #222">{{ qState.question.question }}</div>
                      <div style="font-size: 12px; color: #666; margin-top: 2px">Mục đích: {{ qState.question.purpose }}</div>
                    </div>
                    <button nz-button nzType="text" nzDanger (click)="removeQuestion(i)" nz-tooltip nzTooltipTitle="Xóa câu hỏi này">
                      <span nz-icon nzType="delete"></span> Xóa
                    </button>
                  </div>
                }
              </div>
            </div>
          </nz-tab>

          <!-- TAB 3: TỔNG KẾT & CHỐT QUYẾT ĐỊNH -->
          <nz-tab [nzTitle]="tabSummaryTitle">
            <ng-template #tabSummaryTitle>
              <span nz-icon nzType="trophy" style="color: #faad14"></span>
              Tổng kết & Chốt quyết định
            </ng-template>

            <div class="tab-body">
              <div class="summary-card-large">
                <div class="summary-top">
                  <div style="display: flex; align-items: center; gap: 16px">
                    <nz-progress
                      [nzPercent]="overallScore() || 0"
                      nzType="circle"
                      [nzWidth]="80"
                      [nzStrokeColor]="getScoreColor(overallScore() || 0)"
                      [nzFormat]="scoreFormat"
                    ></nz-progress>
                    <div>
                      <div style="display: flex; align-items: center; gap: 8px">
                        <h3 style="margin: 0; font-size: 18px">Kết quả phỏng vấn tổng thể</h3>
                        @if (recommendation()) {
                          <nz-tag [nzColor]="getRecColor(recommendation()!)" style="font-size: 13px; padding: 2px 10px">
                            {{ getRecLabel(recommendation()!) }}
                          </nz-tag>
                        }
                      </div>
                      <p style="margin: 6px 0 0; color: #444; font-size: 13px; line-height: 1.6">
                        {{ overallFeedback() || 'Chưa có tổng kết. Hãy bấm "Tổng kết phỏng vấn bằng AI" sau khi đã chấm các câu hỏi.' }}
                      </p>
                    </div>
                  </div>

                  <button
                    nz-button
                    nzType="primary"
                    [nzLoading]="summarizing"
                    [disabled]="answeredCount() === 0"
                    (click)="triggerSummary()"
                  >
                    <span nz-icon nzType="sync"></span> Cập nhật tổng kết AI
                  </button>
                </div>

                <nz-divider></nz-divider>

                <!-- Final Decision Actions -->
                <div class="decision-box">
                  <h4 style="margin: 0 0 12px; font-weight: 600">
                    <span nz-icon nzType="safety-certificate" style="color: #1890ff"></span>
                    Chốt quyết định cho ứng viên {{ data()!.candidate.name }}:
                  </h4>

                  <div style="display: flex; gap: 12px; flex-wrap: wrap">
                    <button
                      nz-button
                      nzType="primary"
                      nzSize="large"
                      style="background: #52c41a; border-color: #52c41a"
                      nz-popconfirm
                      nzPopconfirmTitle="Xác nhận ĐẠT phỏng vấn và chuyển sang đề xuất tuyển dụng (Offered)?"
                      (nzOnConfirm)="updateApplicationStatus('offered')"
                    >
                      <span nz-icon nzType="like"></span>
                      Phỏng vấn ĐẠT - Đề xuất tuyển (Chuyển sang Đã trúng tuyển)
                    </button>

                    <button
                      nz-button
                      nzDanger
                      nzSize="large"
                      nz-popconfirm
                      nzPopconfirmTitle="Xác nhận ứng viên KHÔNG ĐẠT phỏng vấn?"
                      (nzOnConfirm)="updateApplicationStatus('rejected')"
                    >
                      <span nz-icon nzType="dislike"></span>
                      Không đạt phỏng vấn
                    </button>

                    <button
                      nz-button
                      nzType="default"
                      nzSize="large"
                      nz-popconfirm
                      nzPopconfirmTitle="Đưa ứng viên quay lại vòng Shortlist để xem xét thêm?"
                      (nzOnConfirm)="updateApplicationStatus('shortlisted')"
                    >
                      <span nz-icon nzType="rollback"></span>
                      Quay lại Shortlist
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </nz-tab>
        </nz-tabset>
      }
    </div>

    <!-- Modal: Thêm câu hỏi tùy chỉnh -->
    <nz-modal
      [(nzVisible)]="customModalVisible"
      nzTitle="Thêm câu hỏi phỏng vấn tùy chỉnh"
      (nzOnCancel)="customModalVisible = false"
      (nzOnOk)="submitCustomQuestion()"
    >
      <ng-container *nzModalContent>
        <div style="display: flex; flex-direction: column; gap: 12px">
          <div>
            <label style="font-weight: 500; display: block; margin-bottom: 4px">Nội dung câu hỏi *</label>
            <textarea
              nz-input
              [(ngModel)]="newQuestion.question"
              [nzAutosize]="{ minRows: 2, maxRows: 4 }"
              placeholder="Nhập câu hỏi phỏng vấn..."
            ></textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
            <div>
              <label style="font-weight: 500; display: block; margin-bottom: 4px">Phân loại</label>
              <nz-select [(ngModel)]="newQuestion.category" style="width: 100%">
                <nz-option nzValue="technical" nzLabel="Kỹ thuật"></nz-option>
                <nz-option nzValue="architecture" nzLabel="Kiến trúc hệ thống"></nz-option>
                <nz-option nzValue="behavioral" nzLabel="Hành vi & Văn hóa"></nz-option>
                <nz-option nzValue="situational" nzLabel="Xử lý tình huống"></nz-option>
              </nz-select>
            </div>
            <div>
              <label style="font-weight: 500; display: block; margin-bottom: 4px">Kỹ năng mục tiêu</label>
              <input nz-input [(ngModel)]="newQuestion.target_skill" placeholder="Ví dụ: PostgreSQL, React..." />
            </div>
          </div>

          <div>
            <label style="font-weight: 500; display: block; margin-bottom: 4px">Mục đích câu hỏi</label>
            <input nz-input [(ngModel)]="newQuestion.purpose" placeholder="Ví dụ: Kiểm tra tư duy tối ưu DB..." />
          </div>
        </div>
      </ng-container>
    </nz-modal>

    <!-- Modal: AI Sinh thêm câu hỏi -->
    <nz-modal
      [(nzVisible)]="aiGenModalVisible"
      nzTitle="AI Sinh thêm bộ câu hỏi phỏng vấn"
      (nzOnCancel)="aiGenModalVisible = false"
      (nzOnOk)="submitGenerateAiQuestions()"
      [nzOkLoading]="aiGenerating"
    >
      <ng-container *nzModalContent>
        <div style="display: flex; flex-direction: column; gap: 12px">
          <p style="color: #666; font-size: 13px">
            AI sẽ dựa trên hồ sơ của ứng viên <strong>{{ data()?.candidate?.name }}</strong> và tiêu chuẩn vị trí <strong>{{ data()?.job_title }}</strong> để tạo ra các câu hỏi chuyên sâu.
          </p>

          <div>
            <label style="font-weight: 500; display: block; margin-bottom: 4px">Chủ đề trọng tâm</label>
            <nz-select [(ngModel)]="aiGenTopic" style="width: 100%">
              <nz-option nzValue="technical" nzLabel="Kỹ thuật & Công nghệ lõi"></nz-option>
              <nz-option nzValue="system_design" nzLabel="Thiết kế hệ thống & Kiến trúc"></nz-option>
              <nz-option nzValue="problem_solving" nzLabel="Giải quyết sự cố & Tối ưu hiệu năng"></nz-option>
              <nz-option nzValue="behavioral" nzLabel="Giao tiếp & Làm việc nhóm"></nz-option>
            </nz-select>
          </div>

          <div>
            <label style="font-weight: 500; display: block; margin-bottom: 4px">Số lượng câu hỏi</label>
            <nz-select [(ngModel)]="aiGenCount" style="width: 100%">
              <nz-option [nzValue]="2" nzLabel="2 câu hỏi"></nz-option>
              <nz-option [nzValue]="3" nzLabel="3 câu hỏi (Khuyến nghị)"></nz-option>
              <nz-option [nzValue]="5" nzLabel="5 câu hỏi"></nz-option>
            </nz-select>
          </div>
        </div>
      </ng-container>
    </nz-modal>
  `,
  styles: [
    `
      .interview-room-container {
        display: flex;
        flex-direction: column;
      }
      .candidate-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 18px;
        background: linear-gradient(135deg, #f0f7ff, #ffffff);
        border: 1px solid #d6e4ff;
        border-radius: 10px;
      }
      .banner-left {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .avatar-circle {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: #e6f7ff;
        border: 1px solid #91d5ff;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .banner-right {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .score-pill {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #fff;
        padding: 4px 10px;
        border-radius: 8px;
        border: 1px solid #f0f0f0;
      }
      .score-pill.interview-score {
        border-color: #91d5ff;
        background: #f6ffed;
      }
      .tab-body {
        padding-top: 8px;
      }
      .interview-mode-banner {
        background: #fbfdff;
        border: 1px solid #d6e4ff;
        border-radius: 8px;
        padding: 10px 14px;
        margin-bottom: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .online-hint-box {
        background: #e6f7ff;
        border: 1px solid #91d5ff;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12.5px;
        color: #0958d9;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        line-height: 1.5;
      }
      .room-action-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
        background: #fafafa;
        padding: 10px 14px;
        border-radius: 8px;
        border: 1px solid #f0f0f0;
      }
      .questions-stream {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .question-eval-card {
        background: #ffffff;
        border: 1px solid #e8e8e8;
        border-radius: 10px;
        padding: 16px;
        transition: all 0.2s ease;
      }
      .question-eval-card.evaluated {
        border-color: #b7eb8f;
        background: #fdfffa;
      }
      .q-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .q-index-pill {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #1890ff;
        color: #fff;
        font-weight: 600;
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .q-text {
        font-size: 15px;
        font-weight: 600;
        color: #1f1f1f;
        margin: 0 0 4px;
        line-height: 1.5;
      }
      .q-purpose {
        font-size: 12px;
        color: #666;
        margin-bottom: 8px;
      }
      .guide-collapsible {
        background: #f9f9f9;
        border: 1px dashed #d9d9d9;
        border-radius: 6px;
        padding: 10px 12px;
        margin-bottom: 12px;
      }
      .guide-sub-block {
        font-size: 12px;
        line-height: 1.5;
      }
      .guide-sub-block.warn {
        margin-top: 6px;
      }
      .audio-control-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #f5f9ff;
        border: 1px solid #e6f0ff;
        border-radius: 8px;
        padding: 10px 14px;
        margin-bottom: 10px;
        flex-wrap: wrap;
        gap: 12px;
      }
      .recording-pulse {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #ff4d4f;
        font-weight: 600;
        font-size: 12px;
      }
      .recording-pulse .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #ff4d4f;
        animation: pulse 1s infinite;
      }
      @keyframes pulse {
        0% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.2); }
        100% { opacity: 1; transform: scale(1); }
      }
      .live-volume-meter {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #ffffff;
        padding: 4px 12px;
        border-radius: 20px;
        border: 1px solid #d9d9d9;
      }
      .meter-track {
        width: 140px;
        height: 10px;
        background: #f0f0f0;
        border-radius: 5px;
        overflow: hidden;
      }
      .meter-fill {
        height: 100%;
        background: #52c41a;
        transition: width 0.08s ease-out;
      }
      .meter-fill.med {
        background: #faad14;
      }
      .meter-fill.high {
        background: #ff4d4f;
      }
      .audio-player-wrapper {
        display: flex;
        align-items: center;
        background: #fff;
        padding: 4px 10px;
        border-radius: 6px;
        border: 1px solid #d6e4ff;
      }
      .audio-player-wrapper audio {
        height: 36px;
        outline: none;
      }
      .evaluation-action-row {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        background: #fafafa;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid #f0f0f0;
      }
      .ai-answer-result-box {
        margin-top: 12px;
        background: #ffffff;
        border: 1px solid #d9f7be;
        border-radius: 8px;
        padding: 14px;
      }
      .result-top-line {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .strengths-weakness-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        background: #fafafa;
        padding: 10px 12px;
        border-radius: 6px;
        margin-bottom: 10px;
      }
      .star-card {
        background: #e6f7ff;
        border: 1px solid #91d5ff;
        border-radius: 6px;
        padding: 8px 12px;
        margin-bottom: 8px;
      }
      .star-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px 12px;
        font-size: 12px;
        color: #333;
      }
      .follow-up-box {
        background: #fffbe6;
        border: 1px solid #ffe58f;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12px;
        color: #d46b08;
      }
      .setup-questions-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .setup-q-row {
        display: flex;
        align-items: center;
        background: #fafafa;
        border: 1px solid #f0f0f0;
        border-radius: 8px;
        padding: 10px 14px;
        transition: all 0.2s ease;
      }
      .setup-q-row.selected {
        background: #f0f7ff;
        border-color: #adc6ff;
      }
      .summary-card-large {
        background: #ffffff;
        border: 1px solid #e8e8e8;
        border-radius: 10px;
        padding: 20px;
      }
      .summary-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .decision-box {
        background: #f6ffed;
        border: 1px solid #b7eb8f;
        border-radius: 8px;
        padding: 16px;
      }
    `,
  ],
})
export class InterviewRoomModalComponent implements OnInit, OnDestroy {
  readonly modalData = inject(NZ_MODAL_DATA) as {
    jobId: number;
    appId: number;
    candidateName: string;
  };
  private modalRef = inject(NzModalRef);

  data = signal<InterviewDataResponse | null>(null);
  loading = signal(true);
  activeTabIndex = 0;

  allQuestionStates = signal<QuestionState[]>([]);
  activeQuestions = computed(() => this.allQuestionStates().filter((q) => q.selected));

  overallScore = signal<number | null>(null);
  overallFeedback = signal<string | null>(null);
  recommendation = signal<string | null>(null);
  summarizing = false;

  // Interview Mode: 'offline' (Mic only) or 'online' (Meet System Audio + Mic)
  interviewMode: 'offline' | 'online' = 'offline';

  // Audio playback tracking
  playingIndex: number | null = null;
  activeAudioElement?: HTMLAudioElement;

  // Custom question modal
  customModalVisible = false;
  newQuestion = {
    question: '',
    category: 'technical',
    target_skill: '',
    purpose: '',
  };

  // AI question modal
  aiGenModalVisible = false;
  aiGenTopic = 'technical';
  aiGenCount = 3;
  aiGenerating = false;

  scoreFormat = (p: number) => `${Math.round(p)}`;

  answeredCount = computed(() => {
    return this.activeQuestions().filter((q) => !!q.answer).length;
  });

  averageAnswerScore = computed(() => {
    const answered = this.activeQuestions().filter((q) => !!q.answer);
    if (answered.length === 0) return 0;
    const sum = answered.reduce((acc, cur) => acc + (cur.answer?.score || 0), 0);
    return Math.round((sum / answered.length) * 10) / 10;
  });

  constructor(
    private jobService: JobService,
    private message: NzMessageService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.activeAudioElement) {
      this.activeAudioElement.pause();
    }
    this.allQuestionStates().forEach((q) => {
      this.cleanupAudioResources(q);
    });
  }

  private cleanupActiveStreams(streams?: MediaStream[]): void {
    if (!streams) return;
    streams.forEach((stream) => {
      try {
        stream.getTracks().forEach((track) => track.stop());
      } catch (_) {}
    });
  }

  private cleanupAudioResources(qState: QuestionState): void {
    if (qState.timerInterval) clearInterval(qState.timerInterval);
    if (qState.animFrameId) cancelAnimationFrame(qState.animFrameId);
    if (qState.audioContext && qState.audioContext.state !== 'closed') {
      try {
        qState.audioContext.close();
      } catch (_) {}
    }
    if (qState.mediaRecorder && qState.mediaRecorder.state === 'recording') {
      try {
        qState.mediaRecorder.stop();
      } catch (_) {}
    }
    if (qState.activeStreams) {
      this.cleanupActiveStreams(qState.activeStreams);
      qState.activeStreams = [];
    }
    qState.volumeLevel = 0;
  }

  loadData(): void {
    this.loading.set(true);
    this.jobService.getInterviewData(this.modalData.jobId, this.modalData.appId).subscribe({
      next: (res: InterviewDataResponse) => {
        this.data.set(res);
        this.overallScore.set(res.interview?.overall_score ?? null);
        this.overallFeedback.set(res.interview?.overall_feedback ?? null);
        this.recommendation.set(res.interview?.recommendation ?? null);

        if (res.interview?.interview_type === 'online') {
          this.interviewMode = 'online';
        } else if (res.interview?.interview_type === 'offline') {
          this.interviewMode = 'offline';
        }

        const rawQuestions = res.questions && res.questions.length > 0
          ? res.questions
          : (res.suggested_questions || []);

        const states: QuestionState[] = rawQuestions.map((q, idx) => {
          const ans = res.answers ? res.answers[String(idx)] : undefined;
          return {
            question: q,
            selected: true,
            recording: false,
            recordingSeconds: 0,
            audioChunks: [],
            localAudioUrl: undefined,
            rawAudioUrl: ans?.audio_url || undefined,
            audioUrl: ans?.audio_url || undefined,
            transcript: ans?.transcript || '',
            transcribing: false,
            evaluating: false,
            answer: ans,
            showGuide: false,
            volumeLevel: 0,
          };
        });

        this.allQuestionStates.set(states);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.message.error(err?.error?.detail || 'Lỗi khi tải dữ liệu phỏng vấn');
        this.loading.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  isAnyRecording(): boolean {
    return this.allQuestionStates().some((q) => q.recording);
  }

  getAudioSrc(qState: QuestionState, index?: number): string {
    if (qState.localAudioUrl) {
      return qState.localAudioUrl;
    }
    if (qState.rawAudioUrl && qState.rawAudioUrl.startsWith('blob:')) {
      return qState.rawAudioUrl;
    }
    const d = this.data();
    if (d && d.interview?.id && index !== undefined && (qState.answer?.audio_url || qState.answer?.audio_path || qState.audioUrl || qState.rawAudioUrl)) {
      return this.jobService.getInterviewAudioUrl(d.job_id, d.application_id, d.interview.id, index);
    }
    return qState.rawAudioUrl || qState.audioUrl || '';
  }

  togglePlayAudio(qState: QuestionState, index: number): void {
    if (this.playingIndex === index && this.activeAudioElement && !this.activeAudioElement.paused) {
      this.activeAudioElement.pause();
      this.playingIndex = null;
      this.cdr.detectChanges();
      return;
    }

    const src = this.getAudioSrc(qState, index);
    if (!src) {
      this.message.warning('Chưa có dữ liệu âm thanh để phát');
      return;
    }

    if (this.activeAudioElement) {
      this.activeAudioElement.pause();
      this.activeAudioElement.currentTime = 0;
    }

    const audio = new Audio();
    audio.src = src;
    this.activeAudioElement = audio;
    this.playingIndex = index;
    this.cdr.detectChanges();

    audio.play().then(() => {
      this.ngZone.run(() => {
        this.playingIndex = index;
        this.cdr.detectChanges();
      });
    }).catch((err) => {
      console.warn('Audio playback primary stream error:', err);
      // Fallback: try rawAudioUrl directly if available
      if (qState.rawAudioUrl && src !== qState.rawAudioUrl) {
        audio.src = qState.rawAudioUrl;
        audio.play().then(() => {
          this.ngZone.run(() => {
            this.playingIndex = index;
            this.cdr.detectChanges();
          });
        }).catch((e2) => {
          this.message.error('Không thể phát âm thanh: ' + (e2.message || err.message));
          this.playingIndex = null;
          this.cdr.detectChanges();
        });
        return;
      }
      this.message.error('Không thể phát âm thanh: ' + err.message);
      this.playingIndex = null;
      this.cdr.detectChanges();
    });

    audio.onended = () => {
      this.ngZone.run(() => {
        this.playingIndex = null;
        this.cdr.detectChanges();
      });
    };
  }

  async startRecording(qState: QuestionState): Promise<void> {
    try {
      let finalStream: MediaStream;
      let micStream: MediaStream | null = null;
      let systemStream: MediaStream | null = null;
      const activeStreams: MediaStream[] = [];
      let audioCtx: AudioContext | null = null;
      let analyser: AnalyserNode | null = null;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;

      if (this.interviewMode === 'online') {
        // Step 1: Request screen/tab audio (Google Meet tab)
        try {
          systemStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          });
          activeStreams.push(systemStream);
        } catch (dispErr: any) {
          if (dispErr?.name === 'NotAllowedError' || dispErr?.name === 'AbortError') {
            this.message.warning('Bạn đã hủy chia sẻ màn hình/tab Google Meet. Chưa bắt đầu ghi âm.');
            return;
          }
          this.message.error('Không thể chia sẻ âm thanh máy tính: ' + (dispErr?.message || 'Lỗi không xác định'));
          return;
        }

        const systemAudioTracks = systemStream.getAudioTracks();
        if (systemAudioTracks.length === 0) {
          this.message.warning('⚠️ Bạn chưa tích chọn "Chia sẻ âm thanh tab" (Share tab audio) khi chia sẻ màn hình. Bản ghi chỉ thu qua Microphone.');
        }

        // Step 2: Request interviewer microphone
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
          activeStreams.push(micStream);
        } catch (micErr) {
          console.warn('Microphone not accessible:', micErr);
          this.message.warning('Không truy cập được microphone. Hệ thống sẽ chỉ ghi âm thanh tab máy tính.');
        }

        // Step 3: Mix streams via AudioContext
        if (AudioCtx) {
          audioCtx = new AudioCtx();
          const destination = audioCtx.createMediaStreamDestination();
          const mixGain = audioCtx.createGain();

          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;

          let hasAudioSource = false;

          if (systemAudioTracks.length > 0) {
            const sysSource = audioCtx.createMediaStreamSource(new MediaStream(systemAudioTracks));
            sysSource.connect(mixGain);
            hasAudioSource = true;
          }

          if (micStream && micStream.getAudioTracks().length > 0) {
            const micSource = audioCtx.createMediaStreamSource(micStream);
            micSource.connect(mixGain);
            hasAudioSource = true;
          }

          if (!hasAudioSource) {
            this.cleanupActiveStreams(activeStreams);
            if (audioCtx.state !== 'closed') audioCtx.close();
            this.message.error('Không phát hiện nguồn âm thanh nào để ghi âm (cần ít nhất Mic hoặc Âm thanh tab).');
            return;
          }

          mixGain.connect(destination);
          mixGain.connect(analyser);

          finalStream = destination.stream;
        } else {
          finalStream = systemAudioTracks.length > 0 ? new MediaStream(systemAudioTracks) : micStream!;
        }
      } else {
        // Offline mode: standard Microphone only
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
          activeStreams.push(micStream);
          finalStream = micStream;

          if (AudioCtx) {
            audioCtx = new AudioCtx();
            const source = audioCtx.createMediaStreamSource(micStream);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
          }
        } catch (micErr: any) {
          this.message.error('Không thể truy cập microphone. Vui lòng cấp quyền mic trong trình duyệt.');
          return;
        }
      }

      qState.audioChunks = [];
      qState.recording = true;
      qState.recordingSeconds = 0;
      qState.volumeLevel = 0;
      qState.localAudioUrl = undefined;
      qState.rawAudioUrl = undefined;
      qState.audioUrl = undefined;
      qState.audioBlob = undefined;
      qState.activeStreams = activeStreams;
      qState.audioContext = audioCtx || undefined;
      qState.analyser = analyser || undefined;

      // Setup Web Audio API real-time volume meter
      if (analyser) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
          if (!qState.recording) return;
          analyser!.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          this.ngZone.run(() => {
            qState.volumeLevel = Math.min(100, Math.round((avg / 100) * 100));
            this.cdr.detectChanges();
          });
          qState.animFrameId = requestAnimationFrame(updateVolume);
        };
        updateVolume();
      }

      // Detect supported MIME type
      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/mp4';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = '';
            }
          }
        }
      }
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(finalStream, options);
      qState.mediaRecorder = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          qState.audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        this.ngZone.run(() => {
          const recordedMime = mediaRecorder.mimeType || 'audio/webm';
          const blob = new Blob(qState.audioChunks, { type: recordedMime });
          qState.audioBlob = blob;
          const objectUrl = URL.createObjectURL(blob);
          qState.localAudioUrl = objectUrl;
          qState.rawAudioUrl = objectUrl;
          qState.audioUrl = objectUrl;

          this.cleanupActiveStreams(qState.activeStreams);
          qState.activeStreams = [];
          this.message.success('Đã lưu bản ghi âm! Bạn có thể bấm Play nghe lại hoặc bấm Bóc băng/Chấm điểm.');
          this.cdr.detectChanges();
        });
      };

      mediaRecorder.start(100);

      qState.timerInterval = setInterval(() => {
        this.ngZone.run(() => {
          qState.recordingSeconds += 1;
          this.cdr.detectChanges();
        });
      }, 1000);

      if (this.interviewMode === 'online') {
        this.message.info('Đang ghi âm Google Meet & Microphone...');
      } else {
        this.message.info('Đang ghi âm microphone...');
      }
      this.cdr.detectChanges();
    } catch (err: any) {
      console.error('Recording initialization error:', err);
      this.message.error('Không thể bắt đầu ghi âm: ' + (err?.message || 'Vui lòng kiểm tra quyền truy cập'));
    }
  }

  stopRecording(qState: QuestionState): void {
    if (qState.recording) {
      qState.recording = false;
      if (qState.mediaRecorder && qState.mediaRecorder.state === 'recording') {
        try {
          qState.mediaRecorder.requestData();
        } catch (_) {}
        qState.mediaRecorder.stop();
      }
      if (qState.timerInterval) clearInterval(qState.timerInterval);
      if (qState.animFrameId) cancelAnimationFrame(qState.animFrameId);
      if (qState.audioContext && qState.audioContext.state !== 'closed') {
        try {
          qState.audioContext.close();
        } catch (_) {}
      }
      if (qState.activeStreams) {
        this.cleanupActiveStreams(qState.activeStreams);
        qState.activeStreams = [];
      }
      qState.volumeLevel = 0;
      this.cdr.detectChanges();
    }
  }

  onFileSelected(event: Event, qState: QuestionState): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      qState.audioBlob = file;
      const url = URL.createObjectURL(file);
      qState.localAudioUrl = url;
      qState.rawAudioUrl = url;
      qState.audioUrl = url;
      this.message.success(`Đã nạp file âm thanh: ${file.name}`);
      this.cdr.detectChanges();
    }
  }

  transcribeAudioOnly(qState: QuestionState, index: number): void {
    const d = this.data();
    if (!d || !d.interview?.id || !qState.audioBlob) {
      this.message.warning('Chưa có file ghi âm để bóc băng');
      return;
    }

    qState.transcribing = true;
    this.cdr.detectChanges();

    this.jobService
      .transcribeInterviewAnswer(
        d.job_id,
        d.application_id,
        d.interview.id,
        index,
        qState.audioBlob
      )
      .subscribe({
        next: (res) => {
          this.ngZone.run(() => {
            qState.transcribing = false;
            if (res.transcript) {
              qState.transcript = res.transcript;
              if (res.audio_url) {
                // Do not overwrite localAudioUrl so user can still listen instantly
                qState.rawAudioUrl = qState.localAudioUrl || res.audio_url;
                qState.audioUrl = res.audio_url;
              }
              this.message.success('Bóc băng lời nói thành văn bản thành công!');
            } else {
              this.message.warning('Không nhận diện được giọng nói trong bản ghi âm.');
            }
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            qState.transcribing = false;
            this.message.error(err?.error?.detail || 'Lỗi khi bóc băng âm thanh');
            this.cdr.detectChanges();
          });
        },
      });
  }

  evaluateAnswer(qState: QuestionState, index: number): void {
    const d = this.data();
    if (!d || !d.interview?.id) {
      this.message.warning('Chưa có phiên phỏng vấn hợp lệ');
      return;
    }

    qState.evaluating = true;
    this.cdr.detectChanges();

    this.jobService
      .evaluateInterviewAnswer(
        d.job_id,
        d.application_id,
        d.interview.id,
        index,
        qState.audioBlob,
        qState.transcript
      )
      .subscribe({
        next: (res) => {
          this.ngZone.run(() => {
            qState.evaluating = false;
            if (res.answer_data) {
              qState.answer = res.answer_data;
              qState.transcript = res.answer_data.transcript || qState.transcript;
              if (res.answer_data.audio_url) {
                qState.rawAudioUrl = qState.localAudioUrl || res.answer_data.audio_url;
                qState.audioUrl = res.answer_data.audio_url;
              }
              this.message.success(`Đã chấm câu ${index + 1}: ${res.answer_data.score} điểm`);
            }
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            qState.evaluating = false;
            this.message.error(err?.error?.detail || 'Lỗi khi chấm câu trả lời');
            this.cdr.detectChanges();
          });
        },
      });
  }

  triggerSummary(): void {
    const d = this.data();
    if (!d || !d.interview?.id) return;

    this.summarizing = true;
    this.cdr.detectChanges();

    this.jobService.summarizeInterview(d.job_id, d.application_id, d.interview.id).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.summarizing = false;
          this.overallScore.set(res.overall_score);
          this.overallFeedback.set(res.summary?.overall_feedback || null);
          this.recommendation.set(res.recommendation || null);
          this.message.success('Đã tổng kết kết quả phỏng vấn bằng AI');
          this.activeTabIndex = 2;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.summarizing = false;
          this.message.error(err?.error?.detail || 'Lỗi khi tổng kết phỏng vấn');
          this.cdr.detectChanges();
        });
      },
    });
  }

  saveQuestions(): void {
    const d = this.data();
    if (!d) return;

    const selectedQs = this.activeQuestions().map((q) => q.question);
    this.jobService.saveInterviewQuestions(d.job_id, d.application_id, selectedQs).subscribe({
      next: () => {
        this.message.success('Đã lưu bộ câu hỏi phỏng vấn chính thức');
        this.activeTabIndex = 0;
        this.cdr.detectChanges();
      },
      error: () => this.message.error('Lỗi khi lưu bộ câu hỏi'),
    });
  }

  openAddCustomModal(): void {
    this.newQuestion = {
      question: '',
      category: 'technical',
      target_skill: '',
      purpose: '',
    };
    this.customModalVisible = true;
  }

  submitCustomQuestion(): void {
    if (!this.newQuestion.question.trim()) {
      this.message.warning('Vui lòng nhập nội dung câu hỏi');
      return;
    }
    const d = this.data();
    if (!d) return;

    this.jobService.addCustomQuestion(d.job_id, d.application_id, this.newQuestion).subscribe({
      next: (res) => {
        this.message.success('Đã thêm câu hỏi tùy chỉnh');
        this.customModalVisible = false;
        if (res.question) {
          this.allQuestionStates.update((list) => [
            ...list,
            {
              question: res.question,
              selected: true,
              recording: false,
              recordingSeconds: 0,
              audioChunks: [],
              transcript: '',
              transcribing: false,
              evaluating: false,
              showGuide: false,
              volumeLevel: 0,
            },
          ]);
        }
        this.cdr.detectChanges();
      },
      error: () => this.message.error('Lỗi khi thêm câu hỏi'),
    });
  }

  openGenerateAiModal(): void {
    this.aiGenModalVisible = true;
  }

  submitGenerateAiQuestions(): void {
    const d = this.data();
    if (!d) return;

    this.aiGenerating = true;
    this.cdr.detectChanges();

    this.jobService
      .generateAiQuestions(d.job_id, d.application_id, this.aiGenTopic, this.aiGenCount)
      .subscribe({
        next: (res) => {
          this.ngZone.run(() => {
            this.aiGenerating = false;
            this.aiGenModalVisible = false;
            const newQs: AiInterviewQuestion[] = res.questions || [];
            this.message.success(`AI đã tạo thêm ${newQs.length} câu hỏi`);

            const newStates: QuestionState[] = newQs.map((q) => ({
              question: q,
              selected: true,
              recording: false,
              recordingSeconds: 0,
              audioChunks: [],
              transcript: '',
              transcribing: false,
              evaluating: false,
              showGuide: false,
              volumeLevel: 0,
            }));

            this.allQuestionStates.update((list) => [...list, ...newStates]);
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.aiGenerating = false;
            this.message.error(err?.error?.detail || 'Lỗi khi sinh câu hỏi AI');
            this.cdr.detectChanges();
          });
        },
      });
  }

  removeQuestion(index: number): void {
    this.allQuestionStates.update((list) => list.filter((_, i) => i !== index));
    this.message.info('Đã xóa câu hỏi khỏi danh sách');
    this.cdr.detectChanges();
  }

  updateApplicationStatus(newStatus: string): void {
    const d = this.data();
    if (!d) return;

    this.jobService.updateApplicationStatus(d.job_id, d.application_id, newStatus).subscribe({
      next: () => {
        const labels: Record<string, string> = {
          offered: 'Đã đề xuất tuyển dụng (Chuyển sang trang Trúng tuyển)',
          rejected: 'Không đạt phỏng vấn',
          shortlisted: 'Quay lại Shortlist',
        };
        this.message.success(`${d.candidate.name}: ${labels[newStatus] || newStatus}`);
        this.modalRef.close({ statusUpdated: newStatus });
      },
      error: (err) => {
        this.message.error(err?.error?.detail || 'Lỗi cập nhật trạng thái');
      },
    });
  }

  formatSeconds(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#52c41a';
    if (score >= 40) return '#faad14';
    return '#ff4d4f';
  }

  getCategoryColor(cat: string): string {
    const colors: Record<string, string> = {
      technical: 'blue',
      architecture: 'geekblue',
      behavioral: 'purple',
      situational: 'magenta',
    };
    return colors[cat] || 'default';
  }

  getCategoryLabel(cat: string): string {
    const labels: Record<string, string> = {
      technical: 'Kỹ thuật',
      architecture: 'Kiến trúc hệ thống',
      behavioral: 'Hành vi & Văn hóa',
      situational: 'Xử lý tình huống',
    };
    return labels[cat] || cat;
  }

  getStatusColor(status: string): string {
    return APPLICATION_STATUS_COLORS[status] || 'default';
  }

  getStatusLabel(status: string): string {
    return APPLICATION_STATUS_LABELS[status] || status;
  }

  getRecColor(rec: string): string {
    const map: Record<string, string> = {
      STRONG_HIRE: 'success',
      HIRE: 'green',
      CONSIDER: 'warning',
      REJECT: 'error',
    };
    return map[rec] || 'default';
  }

  getRecLabel(rec: string): string {
    const map: Record<string, string> = {
      STRONG_HIRE: 'Rất khuyến nghị tuyển (Strong Hire)',
      HIRE: 'Đạt yêu cầu tuyển (Hire)',
      CONSIDER: 'Cần cân nhắc thêm (Consider)',
      REJECT: 'Không phù hợp (Reject)',
    };
    return map[rec] || rec;
  }
}
