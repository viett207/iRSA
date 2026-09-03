import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { AiEvaluationResponse, MatchDetailsResponse } from '../models/job.model';
import { JobService } from '../services/job.service';
import type { InterviewRoomModalComponent } from './interview-room-modal.component';

type ReferenceMode = 'cv' | 'report' | 'split';

@Component({
  selector: 'app-interview-screening-reference',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzSpinModule],
  templateUrl: './interview-screening-reference.component.html',
  styleUrl: './interview-screening-reference.component.scss',
})
export class InterviewScreeningReferenceComponent implements OnInit, OnDestroy {
  @Input({ required: true }) room!: InterviewRoomModalComponent;

  readonly mode = signal<ReferenceMode>('split');
  readonly resumeUrl = signal<SafeResourceUrl | null>(null);
  readonly resumeLoading = signal(true);
  readonly resumeError = signal<string | null>(null);
  readonly reportLoading = signal(true);
  readonly matchDetails = signal<MatchDetailsResponse | null>(null);
  readonly aiEvaluation = signal<AiEvaluationResponse | null>(null);

  private resumeObjectUrl: string | null = null;

  constructor(
    private readonly jobService: JobService,
    private readonly sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    const data = this.room.data();
    if (!data) return;
    this.loadResume(data.job_id, data.application_id);
    this.loadReport(data.job_id, data.application_id);
  }

  ngOnDestroy(): void {
    if (this.resumeObjectUrl) URL.revokeObjectURL(this.resumeObjectUrl);
  }

  setMode(mode: ReferenceMode): void {
    this.mode.set(mode);
  }

  openResumeFullscreen(): void {
    if (this.resumeObjectUrl) window.open(this.resumeObjectUrl, '_blank', 'noopener,noreferrer');
  }

  private loadResume(jobId: number, applicationId: number): void {
    this.resumeLoading.set(true);
    this.jobService.downloadResume(jobId, applicationId).subscribe({
      next: (blob) => {
        const pdf = new Blob([blob], { type: blob.type || 'application/pdf' });
        this.resumeObjectUrl = URL.createObjectURL(pdf);
        this.resumeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.resumeObjectUrl));
        this.resumeLoading.set(false);
      },
      error: () => {
        this.resumeError.set('Không thể tải bản xem trước CV.');
        this.resumeLoading.set(false);
      },
    });
  }

  private loadReport(jobId: number, applicationId: number): void {
    this.reportLoading.set(true);
    let pending = 2;
    const completeOne = () => {
      pending -= 1;
      if (pending === 0) this.reportLoading.set(false);
    };

    this.jobService.getMatchDetails(jobId, applicationId).subscribe({
      next: (result) => {
        this.matchDetails.set(result);
        completeOne();
      },
      error: completeOne,
    });
    this.jobService.getAiEvaluation(jobId, applicationId).subscribe({
      next: (result) => {
        this.aiEvaluation.set(result);
        completeOne();
      },
      error: completeOne,
    });
  }
}
