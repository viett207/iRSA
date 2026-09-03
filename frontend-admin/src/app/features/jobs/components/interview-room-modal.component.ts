import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  OnDestroy,
  Output,
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
import { InterviewCandidateBannerComponent } from './interview-candidate-banner.component';
import { InterviewLiveRoomComponent } from './interview-live-room.component';
import { InterviewScreeningReferenceComponent } from './interview-screening-reference.component';
import { InterviewSummaryComponent } from './interview-summary.component';
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
  liveTranscript: string;
  interimTranscript: string;
  liveTranscriptActive: boolean;
  liveTranscriptSupported: boolean;
  transcriptFinalized: boolean;
  transcriptionFailed: boolean;
  speechRecognition?: any;
  speechRestartTimer?: ReturnType<typeof setTimeout>;
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
    InterviewCandidateBannerComponent,
    InterviewLiveRoomComponent,
    InterviewScreeningReferenceComponent,
    InterviewSummaryComponent,
  ],
  templateUrl: './interview-room-modal.component.html',
  styleUrl: './interview-room-modal.component.scss',
})
export class InterviewRoomModalComponent implements OnInit, OnDestroy {
  readonly view = this;

  private readonly injectedModalData = inject(NZ_MODAL_DATA, { optional: true }) as {
    jobId: number;
    appId: number;
    candidateName: string;
  } | null;
  private modalRef = inject(NzModalRef, { optional: true });

  @Input() jobId: number | null = null;
  @Input() appId: number | null = null;
  @Input() candidateName = '';
  @Output() roomClosed = new EventEmitter<{ statusUpdated?: string } | void>();

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
    return this.activeQuestions().filter((q) => this.hasAnswerEvaluation(q)).length;
  });

  averageAnswerScore = computed(() => {
    const answered = this.activeQuestions().filter((q) => this.hasAnswerEvaluation(q));
    if (answered.length === 0) return 0;
    const sum = answered.reduce((acc, cur) => acc + Number(cur.answer!.score), 0);
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
    this.stopLiveTranscription(qState);
    if (qState.activeStreams) {
      this.cleanupActiveStreams(qState.activeStreams);
      qState.activeStreams = [];
    }
    qState.volumeLevel = 0;
  }

  loadData(): void {
    const jobId = this.jobId ?? this.injectedModalData?.jobId;
    const appId = this.appId ?? this.injectedModalData?.appId;
    if (!jobId || !appId) {
      this.loading.set(false);
      this.message.error('Thiếu thông tin để mở phòng phỏng vấn');
      return;
    }
    this.loading.set(true);
    this.jobService.getInterviewData(jobId, appId).subscribe({
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
            liveTranscript: '',
            interimTranscript: '',
            liveTranscriptActive: false,
            liveTranscriptSupported: this.supportsLiveTranscription(),
            transcriptFinalized: !!ans?.transcript,
            transcriptionFailed: false,
            transcribing: false,
            evaluating: false,
            answer: this.isCompleteAnswer(ans) ? ans : undefined,
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

  hasAnswerEvaluation(qState: QuestionState): boolean {
    return this.isCompleteAnswer(qState.answer);
  }

  private isCompleteAnswer(answer?: InterviewAnswer): answer is InterviewAnswer {
    return !!answer
      && Number.isFinite(Number(answer.score))
      && typeof answer.assessment === 'string'
      && answer.assessment.trim().length > 0
      && Array.isArray(answer.strengths)
      && Array.isArray(answer.improvements);
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
          micStream = await this.requestMicrophone();
          activeStreams.push(micStream);
        } catch (micErr: any) {
          console.warn('Microphone not accessible:', micErr);
          this.message.warning(
            `${this.getMicrophoneErrorMessage(micErr)} Hệ thống sẽ chỉ ghi âm thanh tab máy tính.`
          );
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
          micStream = await this.requestMicrophone();
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
          console.error('Microphone access error:', micErr);
          this.message.error(this.getMicrophoneErrorMessage(micErr));
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
      qState.transcript = '';
      qState.liveTranscript = '';
      qState.interimTranscript = '';
      qState.transcriptFinalized = false;
      qState.transcriptionFailed = false;
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
          this.message.success('Đã lưu bản ghi âm. Hệ thống đang hoàn thiện bản chép lời...');
          this.cdr.detectChanges();
          this.transcribeAudioOnly(qState, this.activeQuestions().indexOf(qState), true);
        });
      };

      mediaRecorder.start(100);
      this.startLiveTranscription(qState);

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

  private async requestMicrophone(): Promise<MediaStream> {
    if (!window.isSecureContext) {
      throw new DOMException(
        'Microphone chỉ hoạt động trên HTTPS hoặc http://localhost:4200.',
        'SecurityError'
      );
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new DOMException(
        'Trình duyệt không hỗ trợ truy cập microphone.',
        'NotSupportedError'
      );
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
        },
      });
    } catch (err: any) {
      // Some browsers/devices reject optional processing constraints. Retry with
      // the broadest constraint so any available microphone can still be used.
      if (err?.name === 'OverconstrainedError' || err?.name === 'TypeError') {
        return navigator.mediaDevices.getUserMedia({ audio: true });
      }
      throw err;
    }
  }

  private getMicrophoneErrorMessage(error: any): string {
    switch (error?.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Quyền microphone đang bị chặn. Nhấn biểu tượng bên trái thanh địa chỉ, chọn Microphone → Cho phép rồi tải lại trang.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'Không tìm thấy microphone. Hãy kết nối hoặc bật thiết bị thu âm trong Windows.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Microphone đang bị ứng dụng khác chiếm dụng. Hãy đóng ứng dụng ghi âm/họp khác rồi thử lại.';
      case 'SecurityError':
        return error?.message || 'Microphone chỉ hoạt động trên HTTPS hoặc localhost.';
      case 'NotSupportedError':
        return error?.message || 'Trình duyệt hiện tại không hỗ trợ microphone.';
      default:
        return `Không thể truy cập microphone${error?.message ? `: ${error.message}` : '.'}`;
    }
  }

  stopRecording(qState: QuestionState): void {
    if (qState.recording) {
      qState.recording = false;
      this.stopLiveTranscription(qState);
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
      qState.transcriptFinalized = false;
      qState.transcriptionFailed = false;
      this.message.success(`Đã nạp file âm thanh: ${file.name}`);
      this.cdr.detectChanges();
    }
  }

  transcribeAudioOnly(qState: QuestionState, index: number, automatic = false): void {
    const d = this.data();
    if (!d || !d.interview?.id || !qState.audioBlob) {
      this.message.warning('Chưa có file ghi âm để bóc băng');
      return;
    }
    if (qState.transcribing) return;

    qState.transcribing = true;
    qState.transcriptionFailed = false;
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
              qState.liveTranscript = '';
              qState.interimTranscript = '';
              qState.transcriptFinalized = true;
              if (res.audio_url) {
                // Do not overwrite localAudioUrl so user can still listen instantly
                qState.rawAudioUrl = qState.localAudioUrl || res.audio_url;
                qState.audioUrl = res.audio_url;
              }
              this.message.success(automatic
                ? 'Đã hoàn thiện bản chép lời từ bản ghi âm.'
                : 'Bóc băng lời nói thành văn bản thành công!');
            } else {
              qState.transcriptionFailed = true;
              this.message.warning('Không nhận diện được giọng nói trong bản ghi âm.');
            }
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            qState.transcribing = false;
            qState.transcriptionFailed = true;
            if (err?.status === 503) {
              this.message.warning(
                qState.transcript.trim()
                  ? 'Dịch vụ STT đang bận. Bản nháp trực tiếp đã được giữ lại; bạn có thể thử hoàn thiện sau.'
                  : 'Dịch vụ STT đang bận. Bản ghi âm đã được giữ lại; vui lòng thử lại sau ít phút.'
              );
            } else {
              this.message.error(err?.error?.detail || 'Không thể hoàn thiện bản chép lời. Bản ghi âm vẫn được giữ để thử lại.');
            }
            this.cdr.detectChanges();
          });
        },
      });
  }

  private supportsLiveTranscription(): boolean {
    const browserWindow = window as any;
    return !!(browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition);
  }

  private startLiveTranscription(qState: QuestionState): void {
    const browserWindow = window as any;
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    qState.liveTranscriptSupported = !!Recognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    qState.speechRecognition = recognition;

    recognition.onstart = () => {
      this.ngZone.run(() => {
        qState.liveTranscriptActive = true;
        this.cdr.detectChanges();
      });
    };

    recognition.onresult = (event: any) => {
      let confirmed = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i]?.[0]?.transcript || '';
        if (event.results[i].isFinal) confirmed += text;
        else interim += text;
      }

      this.ngZone.run(() => {
        if (confirmed.trim()) {
          qState.liveTranscript = `${qState.liveTranscript} ${confirmed}`.trim();
        }
        qState.interimTranscript = interim.trim();
        qState.transcript = [qState.liveTranscript, qState.interimTranscript]
          .filter(Boolean)
          .join(' ')
          .trim();
        this.cdr.detectChanges();
      });
    };

    recognition.onerror = (event: any) => {
      this.ngZone.run(() => {
        qState.liveTranscriptActive = false;
        if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
          qState.liveTranscriptSupported = false;
          this.message.warning('Trình duyệt không cho phép nhận dạng trực tiếp. Bản ghi vẫn được bóc băng sau khi dừng.');
        }
        this.cdr.detectChanges();
      });
    };

    recognition.onend = () => {
      this.ngZone.run(() => {
        qState.liveTranscriptActive = false;
        if (qState.recording && qState.liveTranscriptSupported) {
          qState.speechRestartTimer = setTimeout(() => {
            if (!qState.recording) return;
            try {
              recognition.start();
            } catch (_) {}
          }, 250);
        }
        this.cdr.detectChanges();
      });
    };

    try {
      recognition.start();
    } catch (_) {
      qState.liveTranscriptActive = false;
    }
  }

  private stopLiveTranscription(qState: QuestionState): void {
    if (qState.speechRestartTimer) {
      clearTimeout(qState.speechRestartTimer);
      qState.speechRestartTimer = undefined;
    }
    if (qState.speechRecognition) {
      try {
        qState.speechRecognition.stop();
      } catch (_) {}
      qState.speechRecognition = undefined;
    }
    qState.liveTranscriptActive = false;
    qState.interimTranscript = '';
    if (qState.liveTranscript.trim()) qState.transcript = qState.liveTranscript.trim();
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

    // HR may move to the final decision at any time. AI summary is only
    // generated when at least one answer has actually been evaluated.
    this.activeTabIndex = 2;
    if (this.answeredCount() === 0) {
      this.message.info('Chưa có câu trả lời được chấm. HR vẫn có thể đưa ra quyết định thủ công.');
      this.cdr.detectChanges();
      return;
    }

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
              liveTranscript: '',
              interimTranscript: '',
              liveTranscriptActive: false,
              liveTranscriptSupported: this.supportsLiveTranscription(),
              transcriptFinalized: false,
              transcriptionFailed: false,
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
              liveTranscript: '',
              interimTranscript: '',
              liveTranscriptActive: false,
              liveTranscriptSupported: this.supportsLiveTranscription(),
              transcriptFinalized: false,
              transcriptionFailed: false,
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
        const result = { statusUpdated: newStatus };
        if (this.modalRef) {
          this.modalRef.close(result);
        } else {
          this.roomClosed.emit(result);
        }
      },
      error: (err) => {
        this.message.error(err?.error?.detail || 'Lỗi cập nhật trạng thái');
      },
    });
  }

  closeRoom(): void {
    this.allQuestionStates().forEach((qState) => this.cleanupAudioResources(qState));
    if (this.modalRef) this.modalRef.close();
    else this.roomClosed.emit();
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
