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
  ],
  templateUrl: './interview-schedule-modal.component.html',
  styleUrl: './interview-schedule-modal.component.scss',
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
        this.message.success('Đã đặt lịch phỏng vấn');
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
}
