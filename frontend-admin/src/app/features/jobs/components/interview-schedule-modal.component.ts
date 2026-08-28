import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { JobService } from '../services/job.service';
import {
  CANDIDATE_RESPONSE_COLORS,
  CANDIDATE_RESPONSE_LABELS,
  Interview,
  InterviewCreateRequest,
} from '../models/job.model';

@Component({
  selector: 'app-interview-schedule-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzFormModule,
    NzInputModule,
    NzDatePickerModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzEmptyModule,
    NzSpinModule,
    NzPopconfirmModule,
  ],
  template: `
    <!-- Existing interviews -->
    <nz-spin [nzSpinning]="loading">
      @if (interviews.length > 0) {
        <div class="existing-interviews">
          <h4>Lịch phỏng vấn đã đặt</h4>
          @for (iv of interviews; track iv.id) {
            <div class="interview-item" [class.cancelled]="iv.status === 'cancelled'">
              <div class="interview-info">
                <div class="interview-date">
                  <span nz-icon nzType="calendar"></span>
                  {{ iv.interview_date | date:'dd/MM/yyyy HH:mm' }}
                </div>
                <div class="interview-meta">
                  <nz-tag [nzColor]="iv.interview_type === 'online' ? 'blue' : 'green'">
                    {{ iv.interview_type === 'online' ? 'Online' : 'Trực tiếp' }}
                  </nz-tag>
                  <nz-tag [nzColor]="getStatusColor(iv.status)">
                    {{ getStatusLabel(iv.status) }}
                  </nz-tag>
                  @if (iv.candidate_response) {
                    <nz-tag [nzColor]="getCandidateResponseColor(iv.candidate_response)">
                      {{ getCandidateResponseLabel(iv.candidate_response) }}
                    </nz-tag>
                  }
                </div>
                <div class="interview-location" *ngIf="iv.location">
                  <span nz-icon nzType="environment"></span> {{ iv.location }}
                </div>
                <div class="interview-notes" *ngIf="iv.notes">
                  <span nz-icon nzType="message"></span> Ghi chú gửi UV: {{ iv.notes }}
                </div>
                <div class="interview-scheduler" *ngIf="iv.scheduler_name">
                  <span nz-icon nzType="user"></span> Người đặt: {{ iv.scheduler_name }}
                </div>

                @if (iv.candidate_response === 'reschedule_requested') {
                  <div class="reschedule-proposal-box">
                    <div class="proposal-title">
                      <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                      <strong>Ứng viên đề xuất đổi sang:</strong>
                      <span class="proposed-date">{{ iv.candidate_proposed_date | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                    @if (iv.candidate_response_note) {
                      <p class="proposal-note">“{{ iv.candidate_response_note }}”</p>
                    }
                    @if (iv.candidate_proposed_date && iv.status === 'scheduled') {
                      <button nz-button nzSize="small" nzType="default" class="apply-proposal-btn" (click)="applyProposedDate(iv.candidate_proposed_date)">
                        <span nz-icon nzType="swap"></span> Áp dụng ngày giờ đề xuất
                      </button>
                    }
                  </div>
                } @else if (iv.candidate_response_note) {
                  <div class="candidate-note-box">
                    <span nz-icon nzType="message"></span>
                    <span>Phản hồi từ ứng viên: “{{ iv.candidate_response_note }}”</span>
                  </div>
                }
              </div>
              @if (iv.status === 'scheduled') {
                <div class="interview-actions">
                  <button nz-button nzSize="small" nzType="primary" (click)="markCompleted(iv)">
                    <span nz-icon nzType="check"></span> Hoàn thành
                  </button>
                  <button nz-button nzSize="small" nzDanger
                    nz-popconfirm nzPopconfirmTitle="Hủy lịch phỏng vấn này?"
                    (nzOnConfirm)="cancelExisting(iv)">
                    <span nz-icon nzType="close"></span> Hủy
                  </button>
                </div>
              }
            </div>
          }
        </div>
        <hr style="margin: 16px 0; border-color: #f0f0f0;">
      }
    </nz-spin>

    <!-- Schedule new -->
    <h4>Đặt lịch mới / Cập nhật lịch</h4>
    <nz-form-item>
      <nz-form-label>Ngày giờ phỏng vấn</nz-form-label>
      <nz-form-control>
        <nz-date-picker
          [(ngModel)]="form.interview_date"
          nzShowTime
          nzFormat="dd/MM/yyyy HH:mm"
          nzPlaceHolder="Chọn ngày giờ"
          style="width: 100%"
        ></nz-date-picker>
      </nz-form-control>
    </nz-form-item>

    <nz-form-item>
      <nz-form-label>Hình thức</nz-form-label>
      <nz-form-control>
        <nz-select [(ngModel)]="form.interview_type" style="width: 100%">
          <nz-option nzValue="online" nzLabel="Online (Google Meet / Zoom)"></nz-option>
          <nz-option nzValue="offline" nzLabel="Trực tiếp"></nz-option>
        </nz-select>
      </nz-form-control>
    </nz-form-item>

    <nz-form-item>
      <nz-form-label>{{ form.interview_type === 'online' ? 'Link phỏng vấn' : 'Địa chỉ' }}</nz-form-label>
      <nz-form-control>
        <input nz-input [(ngModel)]="form.location"
          [placeholder]="form.interview_type === 'online' ? 'https://meet.google.com/...' : 'Số 1 Đại Cồ Việt, Hà Nội'" />
      </nz-form-control>
    </nz-form-item>

    <nz-form-item>
      <nz-form-label>Ghi chú cho ứng viên</nz-form-label>
      <nz-form-control>
        <textarea nz-input [(ngModel)]="form.notes" [nzAutosize]="{ minRows: 2, maxRows: 4 }"
          placeholder="VD: Vui lòng chuẩn bị laptop, mang theo CCCD..."></textarea>
      </nz-form-control>
    </nz-form-item>

    <div class="modal-footer">
      <button nz-button (click)="modalRef.close()">Đóng</button>
      <button nz-button nzType="primary" [nzLoading]="submitting"
        [disabled]="!form.interview_date" (click)="submit()">
        <span nz-icon nzType="calendar"></span> Lưu & Gửi lịch
      </button>
    </div>
  `,
  styles: [`
    .existing-interviews { margin-bottom: 8px; }
    .interview-item {
      padding: 14px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      background: #fafafa;
    }
    .interview-item.cancelled { opacity: 0.6; }
    .interview-date { font-weight: 700; margin-bottom: 4px; font-size: 14px; color: #1e293b; }
    .interview-meta { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
    .interview-location, .interview-notes, .interview-scheduler {
      font-size: 13px; color: #475569; margin-top: 3px;
    }
    .reschedule-proposal-box {
      margin-top: 8px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #fffbe6;
      border: 1px solid #ffe58f;
    }
    .proposal-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #d46b08;
    }
    .proposed-date {
      font-weight: 700;
      color: #d46b08;
    }
    .proposal-note {
      margin: 4px 0 6px;
      font-size: 12.5px;
      color: #873800;
      font-style: italic;
    }
    .apply-proposal-btn {
      margin-top: 4px;
      font-size: 12px;
      border-color: #d46b08;
      color: #d46b08;
    }
    .apply-proposal-btn:hover {
      background: #ffe58f;
    }
    .candidate-note-box {
      margin-top: 6px;
      font-size: 12.5px;
      color: #475569;
      font-style: italic;
    }
    .interview-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    nz-form-item { margin-bottom: 12px; }
    h4 { margin: 0 0 12px; font-weight: 600; }
  `],
})
export class InterviewScheduleModalComponent implements OnInit {
  @Input() jobId!: number;
  @Input() appId!: number;
  @Input() candidateName = '';

  interviews: Interview[] = [];
  loading = false;
  submitting = false;

  form: InterviewCreateRequest = {
    interview_date: '',
    interview_type: 'online',
    location: '',
    notes: '',
  };

  constructor(
    public modalRef: NzModalRef,
    private jobService: JobService,
    private message: NzMessageService,
  ) {}

  ngOnInit(): void {
    this.loadInterviews();
  }

  loadInterviews(): void {
    this.loading = true;
    this.jobService.getInterviews(this.jobId, this.appId).subscribe({
      next: (data) => { this.interviews = data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  submit(): void {
    if (!this.form.interview_date) return;

    this.submitting = true;
    const body: InterviewCreateRequest = {
      ...this.form,
      interview_date: new Date(this.form.interview_date).toISOString(),
    };

    this.jobService.scheduleInterview(this.jobId, this.appId, body).subscribe({
      next: (iv) => {
        this.message.success('Đã lưu và cập nhật lịch phỏng vấn');
        this.submitting = false;
        this.modalRef.close(iv);
      },
      error: (err) => {
        this.message.error(err.error?.detail || 'Không thể đặt lịch');
        this.submitting = false;
      },
    });
  }

  markCompleted(iv: Interview): void {
    this.jobService.updateInterview(this.jobId, this.appId, iv.id, { status: 'completed' }).subscribe({
      next: () => { this.message.success('Đã đánh dấu hoàn thành'); this.loadInterviews(); },
      error: () => this.message.error('Không thể cập nhật'),
    });
  }

  cancelExisting(iv: Interview): void {
    this.jobService.cancelInterview(this.jobId, this.appId, iv.id).subscribe({
      next: () => { this.message.success('Đã hủy lịch'); this.loadInterviews(); },
      error: () => this.message.error('Không thể hủy'),
    });
  }

  getStatusColor(status: string): string {
    return { scheduled: 'blue', completed: 'green', cancelled: 'default' }[status] || 'default';
  }

  getStatusLabel(status: string): string {
    return { scheduled: 'Đã lên lịch', completed: 'Hoàn thành', cancelled: 'Đã hủy' }[status] || status;
  }

  getCandidateResponseColor(response?: string): string {
    return (response && CANDIDATE_RESPONSE_COLORS[response]) || 'default';
  }

  getCandidateResponseLabel(response?: string): string {
    return (response && CANDIDATE_RESPONSE_LABELS[response]) || response || 'Chờ phản hồi';
  }

  applyProposedDate(date: string): void {
    this.form.interview_date = new Date(date) as any;
    this.message.info('Đã điền ngày giờ ứng viên đề xuất vào biểu mẫu.');
  }
}
