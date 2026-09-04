import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

interface MissedInterviewActionData {
  candidateName: string;
  jobTitle: string;
  interviewDate: string | null;
  interviewType: string | null;
}

@Component({
  selector: 'app-missed-interview-action-modal',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzPopconfirmModule],
  template: `
    <section class="missed-action-dialog">
      <header>
        <span>LỊCH PHỎNG VẤN ĐÃ QUÁ GIỜ</span>
        <h2>Quản lý lịch của {{ data.candidateName }}</h2>
        <p>Ứng viên chưa hoàn tất buổi phỏng vấn. Hãy chọn bước tiếp theo phù hợp.</p>
      </header>

      <dl>
        <div><dt>Vị trí</dt><dd>{{ data.jobTitle }}</dd></div>
        <div><dt>Lịch cũ</dt><dd>{{ formattedInterviewDate }}</dd></div>
        <div><dt>Hình thức</dt><dd>{{ data.interviewType === 'offline' ? 'Trực tiếp' : 'Trực tuyến' }}</dd></div>
      </dl>

      <div class="guidance">
        <strong>Nên đặt lịch lại khi</strong>
        <p>Ứng viên vẫn tiếp tục quy trình hoặc buổi phỏng vấn bị gián đoạn vì lý do kỹ thuật.</p>
      </div>

      <footer>
        <button nz-button type="button" (click)="modalRef.close()">Đóng</button>
        <button
          nz-button
          nzDanger
          type="button"
          nz-popconfirm
          nzPopconfirmTitle="Xác nhận không tuyển ứng viên này?"
          (nzOnConfirm)="modalRef.close('reject')"
        >Không tuyển</button>
        <button nz-button nzType="primary" type="button" (click)="modalRef.close('reschedule')">Đặt lịch lại</button>
      </footer>
    </section>
  `,
  styles: [`
    .missed-action-dialog { color: #3f3f46; }
    header > span { color: #9a6a3b; font-size: 11px; font-weight: 800; letter-spacing: .08em; }
    h2 { margin: 5px 0 6px; color: #27272a; font-size: 20px; font-weight: 750; }
    header p { margin: 0; color: #73737c; font-size: 13px; line-height: 1.55; }
    dl { display: grid; gap: 0; margin: 18px 0 14px; border: 1px solid #e5e1d7; border-radius: 10px; background: #faf9f6; }
    dl div { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 12px; padding: 11px 13px; border-bottom: 1px solid #ebe7dd; }
    dl div:last-child { border-bottom: 0; }
    dt { color: #8a8a92; font-size: 12px; font-weight: 700; }
    dd { margin: 0; color: #3f3f46; font-size: 12.5px; font-weight: 650; }
    .guidance { padding: 12px 13px; border-left: 3px solid #c9b58b; background: #f8f3e8; }
    .guidance strong { color: #6f5a31; font-size: 12px; }
    .guidance p { margin: 4px 0 0; color: #7f725b; font-size: 12px; line-height: 1.5; }
    footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ebe7dd; }
    footer button { height: 38px; border-radius: 8px; font-weight: 650; }
    @media (max-width: 520px) { footer { align-items: stretch; flex-direction: column-reverse; } }
  `],
})
export class MissedInterviewActionModalComponent {
  readonly modalRef = inject(NzModalRef);
  readonly data = inject<MissedInterviewActionData>(NZ_MODAL_DATA);

  get formattedInterviewDate(): string {
    if (!this.data.interviewDate) return 'Chưa có lịch cụ thể';
    return new Date(this.data.interviewDate).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', weekday: 'short',
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }
}
