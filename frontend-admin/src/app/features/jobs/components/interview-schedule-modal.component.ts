import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
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
import { NzRadioModule } from 'ng-zorro-antd/radio';

import { JobService } from '../services/job.service';
import { Interview, InterviewCreateRequest } from '../models/job.model';

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
    NzRadioModule,
  ],
  templateUrl: './interview-schedule-modal.component.html',
  styleUrl: './interview-schedule-modal.component.scss',
})
export class InterviewScheduleModalComponent implements OnInit {
  private readonly modalData = inject(NZ_MODAL_DATA, { optional: true }) as {
    jobId?: number;
    appId?: number;
    candidateName?: string;
  } | null;

  private _jobId!: number;
  private _appId!: number;

  @Input()
  set jobId(val: number) {
    this._jobId = val;
    if (this._jobId && this._appId && !this.loading && this.interviews.length === 0) {
      this.loadInterviews();
    }
  }
  get jobId(): number {
    return this._jobId;
  }

  @Input()
  set appId(val: number) {
    this._appId = val;
    if (this._jobId && this._appId && !this.loading && this.interviews.length === 0) {
      this.loadInterviews();
    }
  }
  get appId(): number {
    return this._appId;
  }

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
    if (this.modalData) {
      if (this.modalData.jobId) this._jobId = this.modalData.jobId;
      if (this.modalData.appId) this._appId = this.modalData.appId;
      if (this.modalData.candidateName) this.candidateName = this.modalData.candidateName;
    }
    if (this._jobId && this._appId) {
      this.loadInterviews();
    }
  }

  loadInterviews(): void {
    if (!this._jobId || !this._appId) return;
    this.loading = true;
    this.jobService.getInterviews(this._jobId, this._appId).subscribe({
      next: (data) => {
        const latest = [...data].sort((left, right) => right.id - left.id)[0];
        if (latest && latest.status === 'scheduled') {
          this.interviews = [latest];
          if (!this.form.interview_date) {
            this.form.interview_date = new Date(latest.interview_date) as any;
          }
          if (!this.form.location && latest.location) {
            this.form.location = latest.location;
          }
          if (!this.form.notes && latest.notes) {
            this.form.notes = latest.notes;
          }
          if (latest.interview_type) {
            const raw = String(latest.interview_type).trim().toLowerCase();
            this.form.interview_type = raw === 'offline' ? 'offline' : 'online';
          }
        } else {
          this.interviews = [];
        }
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  setInterviewType(type: 'online' | 'offline'): void {
    this.form.interview_type = type;
  }

  submit(): void {
    if (!this.form.interview_date) return;
    if (!this._jobId || !this._appId) {
      this.message.error('Không tìm thấy thông tin vị trí hoặc ứng viên');
      return;
    }

    this.submitting = true;
    const body: InterviewCreateRequest = {
      ...this.form,
      interview_date: new Date(this.form.interview_date).toISOString(),
    };

    const isRescheduling = this.interviews.length > 0;
    this.jobService.scheduleInterview(this._jobId, this._appId, body).subscribe({
      next: (iv) => {
        this.message.success(isRescheduling
          ? 'Đã cập nhật lịch phỏng vấn, đang chờ ứng viên xác nhận lại'
          : 'Đã gửi lịch phỏng vấn, đang chờ ứng viên xác nhận');
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
    this.jobService.updateInterview(this._jobId, this._appId, iv.id, { status: 'completed' }).subscribe({
      next: () => { this.message.success('Đã đánh dấu hoàn thành'); this.loadInterviews(); },
      error: () => this.message.error('Không thể cập nhật'),
    });
  }

  cancelExisting(iv: Interview): void {
    this.jobService.cancelInterview(this._jobId, this._appId, iv.id).subscribe({
      next: () => {
        this.message.success('Đã hủy lịch');
        this.form.interview_date = '';
        this.loadInterviews();
      },
      error: () => this.message.error('Không thể hủy'),
    });
  }

  getStatusColor(status: string): string {
    return { scheduled: 'blue', completed: 'green', cancelled: 'default' }[status] || 'default';
  }

  getStatusLabel(status: string): string {
    return { scheduled: 'Chờ xác nhận', completed: 'Hoàn thành', cancelled: 'Đã hủy' }[status] || status;
  }
}
