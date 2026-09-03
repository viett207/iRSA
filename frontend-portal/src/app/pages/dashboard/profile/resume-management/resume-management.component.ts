import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { ResumeService } from '../../../../core/services/resume.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  PdfViewerModalComponent,
  PdfViewerModalData,
} from '../../../../shared/components/pdf-viewer-modal/pdf-viewer-modal.component';
import {
  formatResumeFileSize,
  validateResumeFile,
} from '../../../../shared/components/resume-uploader.component';
import { Resume } from '../../../../shared/models/resume.model';

export function isPdfResume(resume: Pick<Resume, 'content_type' | 'original_filename'>): boolean {
  return resume.content_type === 'application/pdf' || resume.original_filename.toLowerCase().endsWith('.pdf');
}

@Component({
  selector: 'app-resume-management',
  standalone: true,
  imports: [
    CommonModule,
    NzAlertModule,
    NzButtonModule,
    NzEmptyModule,
    NzIconModule,
    NzModalModule,
    NzPopconfirmModule,
    NzSpinModule,
    NzTagModule,
  ],
  template: `
    <section class="resume-card" aria-labelledby="resume-list-title">
      <input
        #fileInput
        class="file-input"
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        (change)="uploadSelectedFile($event)"
      />

      <div class="section-heading">
        <div class="heading-copy">
          <span class="section-icon"><span nz-icon nzType="file-text" nzTheme="outline"></span></span>
          <div>
            <h2 id="resume-list-title">Danh sách CV</h2>
            <p>Lưu tối đa 5 CV. CV mặc định sẽ được ưu tiên khi ứng tuyển nhanh.</p>
          </div>
        </div>
        <button
          nz-button
          nzType="primary"
          type="button"
          [nzLoading]="uploading"
          [disabled]="uploading || resumes.length >= 5"
          (click)="fileInput.click()"
        >
          <span nz-icon nzType="upload" nzTheme="outline"></span>
          Tải CV mới
        </button>
      </div>

      <div class="upload-note">
        <span nz-icon nzType="info-circle" nzTheme="outline"></span>
        Chỉ hỗ trợ PDF, DOCX nhỏ hơn 5MB · {{ resumes.length }}/5 CV đã lưu
      </div>

      @if (validationError) {
        <nz-alert nzType="error" nzShowIcon [nzMessage]="validationError" nzCloseable (nzOnClose)="validationError = null"></nz-alert>
      }

      @if (loading) {
        <div class="loading-state"><nz-spin nzSize="large"></nz-spin><span>Đang tải danh sách CV...</span></div>
      } @else if (loadError) {
        <nz-alert nzType="error" nzShowIcon nzMessage="Không thể tải danh sách CV" [nzDescription]="loadError"></nz-alert>
        <button nz-button class="retry-button" (click)="loadResumes()">
          <span nz-icon nzType="reload" nzTheme="outline"></span> Thử lại
        </button>
      } @else if (resumes.length === 0) {
        <div class="empty-state">
          <nz-empty nzNotFoundContent="Bạn chưa tải lên CV nào."></nz-empty>
          <button nz-button nzType="primary" (click)="fileInput.click()">Tải CV đầu tiên</button>
        </div>
      } @else {
        <div class="resume-list">
          @for (resume of resumes; track resume.id) {
            <article class="resume-item" [class.is-default]="resume.is_default">
              <div class="file-identity">
                <span class="file-icon" [class.pdf]="isPdf(resume)">
                  <span nz-icon [nzType]="isPdf(resume) ? 'file-pdf' : 'file-word'" nzTheme="outline"></span>
                </span>
                <div class="file-copy">
                  <div class="file-title-row">
                    <h3 [title]="resume.original_filename">{{ resume.original_filename }}</h3>
                    @if (resume.is_default) {
                      <nz-tag class="default-tag"><span nz-icon nzType="star" nzTheme="fill"></span> CV mặc định</nz-tag>
                    }
                  </div>
                  <p>{{ formatSize(resume.file_size) }} · Tải lên {{ formatDate(resume.uploaded_at) }}</p>
                </div>
              </div>

              <div class="resume-actions" [attr.aria-label]="'Thao tác với ' + resume.original_filename">
                <button nz-button nzType="text" type="button" [disabled]="busyResumeId === resume.id" (click)="preview(resume)">
                  <span nz-icon nzType="eye" nzTheme="outline"></span><span class="action-label">Xem trước</span>
                </button>
                <button nz-button nzType="text" type="button" [disabled]="busyResumeId === resume.id" (click)="download(resume)">
                  <span nz-icon nzType="download" nzTheme="outline"></span><span class="action-label">Tải xuống</span>
                </button>
                @if (!resume.is_default) {
                  <button nz-button nzType="text" type="button" [disabled]="busyResumeId === resume.id" (click)="setDefault(resume)">
                    <span nz-icon nzType="star" nzTheme="outline"></span><span class="action-label">Đặt mặc định</span>
                  </button>
                }
                <button
                  nz-button
                  nzType="text"
                  nzDanger
                  type="button"
                  nz-popconfirm
                  nzPopconfirmTitle="Xóa CV này? Thao tác không thể hoàn tác."
                  nzOkText="Xóa CV"
                  nzCancelText="Giữ lại"
                  [disabled]="busyResumeId === resume.id"
                  (nzOnConfirm)="deleteResume(resume)"
                >
                  <span nz-icon nzType="delete" nzTheme="outline"></span><span class="action-label">Xóa</span>
                </button>
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .resume-card { padding: 28px; border: 1px solid var(--color-border); border-radius: 20px; background: var(--color-bg-secondary); box-shadow: var(--shadow-sm); }
    .file-input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
    .section-heading, .heading-copy { display: flex; align-items: flex-start; gap: 14px; }
    .section-heading { align-items: center; justify-content: space-between; margin-bottom: 15px; }
    .section-icon { display: grid; place-items: center; flex: 0 0 44px; height: 44px; border-radius: 13px; color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 10%, transparent); font-size: 20px; }
    h2, h3, p { margin: 0; }
    h2 { color: var(--color-text-primary); font: 700 20px/1.3 var(--font-heading); }
    .heading-copy p { margin-top: 5px; color: var(--color-text-secondary); font-size: 13px; }
    .upload-note { display: flex; align-items: center; gap: 7px; margin-bottom: 22px; padding: 10px 13px; border-radius: 10px; color: var(--color-text-secondary); background: var(--color-bg-tertiary); font-size: 12px; }
    .upload-note [nz-icon] { color: var(--color-primary); }
    nz-alert { display: block; margin-bottom: 16px; }
    .loading-state { min-height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 13px; color: var(--color-text-secondary); }
    .empty-state { padding: 24px 0 8px; text-align: center; }
    .retry-button { margin-top: 4px; }
    .resume-list { display: flex; flex-direction: column; gap: 12px; }
    .resume-item { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 16px; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-bg-primary); transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease; }
    .resume-item:hover { border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border)); box-shadow: var(--shadow-sm); transform: translateY(-1px); }
    .resume-item.is-default { border-color: color-mix(in srgb, var(--color-success) 32%, var(--color-border)); background: color-mix(in srgb, var(--color-success) 3%, var(--color-bg-primary)); }
    .file-identity { display: flex; align-items: center; gap: 13px; min-width: 0; }
    .file-icon { display: grid; place-items: center; flex: 0 0 48px; height: 48px; border-radius: 12px; color: #2563eb; background: #eff6ff; font-size: 24px; }
    .file-icon.pdf { color: #dc2626; background: #fef2f2; }
    .file-copy { min-width: 0; }
    .file-title-row { display: flex; align-items: center; gap: 9px; min-width: 0; }
    .file-title-row h3 { max-width: 360px; overflow: hidden; color: var(--color-text-primary); font-size: 14px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
    .file-copy p { margin-top: 5px; color: var(--color-text-tertiary); font-size: 12px; }
    .default-tag { flex: none; margin: 0; color: var(--color-success-dark); background: var(--color-success-bg); border-radius: 999px; }
    .resume-actions { display: flex; align-items: center; flex: none; }
    .resume-actions button { display: inline-flex; align-items: center; gap: 5px; color: var(--color-text-secondary); }
    .resume-actions button:hover { color: var(--color-primary); }
    @media (max-width: 900px) {
      .resume-item { align-items: stretch; flex-direction: column; }
      .resume-actions { justify-content: flex-end; padding-top: 11px; border-top: 1px solid var(--color-border); }
    }
    @media (max-width: 620px) {
      .resume-card { padding: 20px 16px; border-radius: 16px; }
      .section-heading { align-items: stretch; flex-direction: column; }
      .section-heading > button { width: 100%; }
      .file-title-row { align-items: flex-start; flex-direction: column; }
      .file-title-row h3 { max-width: 220px; }
      .resume-actions { justify-content: space-between; }
      .resume-actions button { padding-inline: 7px; }
      .action-label { display: none; }
    }
  `],
})
export class ResumeManagementComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly resumeService = inject(ResumeService);
  private readonly toast = inject(ToastService);
  private readonly modal = inject(NzModalService);

  resumes: Resume[] = [];
  loading = true;
  uploading = false;
  busyResumeId: number | null = null;
  loadError: string | null = null;
  validationError: string | null = null;

  ngOnInit(): void {
    this.loadResumes();
  }

  loadResumes(): void {
    this.loading = true;
    this.loadError = null;
    this.resumeService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ items }) => {
        this.resumes = items;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.loadError = 'Vui lòng kiểm tra kết nối và thử tải lại.';
        this.toast.errorFromHttp(error, 'Không thể tải danh sách CV.', true);
        this.loading = false;
      },
    });
  }

  uploadSelectedFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.validationError = validateResumeFile(file);
    if (this.validationError) return;

    this.uploading = true;
    this.resumeService.upload(file).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (resume) => {
        this.resumes = resume.is_default
          ? [resume, ...this.resumes.map((item) => ({ ...item, is_default: false }))]
          : [resume, ...this.resumes];
        this.uploading = false;
        this.toast.success('Tải CV lên thành công.');
      },
      error: (error: HttpErrorResponse) => {
        this.uploading = false;
        this.toast.errorFromHttp(error, 'Không thể tải CV lên. Vui lòng thử lại.', true);
      },
    });
  }

  setDefault(resume: Resume): void {
    this.busyResumeId = resume.id;
    this.resumeService.setDefault(resume.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.resumes = this.resumes
          .map((item) => ({ ...item, is_default: item.id === updated.id }))
          .sort((a, b) => Number(b.is_default) - Number(a.is_default));
        this.busyResumeId = null;
        this.toast.success(`Đã đặt “${resume.original_filename}” làm CV mặc định.`);
      },
      error: (error: HttpErrorResponse) => {
        this.busyResumeId = null;
        this.toast.errorFromHttp(error, 'Không thể đặt CV mặc định.', true);
      },
    });
  }

  deleteResume(resume: Resume): void {
    this.busyResumeId = resume.id;
    this.resumeService.delete(resume.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.busyResumeId = null;
        this.toast.success('Đã xóa CV.');
        this.loadResumes();
      },
      error: (error: HttpErrorResponse) => {
        this.busyResumeId = null;
        const fallback = error.status === 400
          ? 'Không thể xóa CV đã được sử dụng trong đơn ứng tuyển.'
          : 'Không thể xóa CV. Vui lòng thử lại.';
        this.toast.errorFromHttp(error, fallback, true);
      },
    });
  }

  preview(resume: Resume): void {
    this.fetchFile(resume, (blobUrl) => {
      this.modal.create<PdfViewerModalComponent, PdfViewerModalData>({
        nzTitle: resume.original_filename,
        nzContent: PdfViewerModalComponent,
        nzData: {
          blobUrl,
          filename: resume.original_filename,
          previewSupported: this.isPdf(resume),
        },
        nzWidth: '90vw',
        nzStyle: { maxWidth: '1000px' },
        nzFooter: null,
        nzMaskClosable: true,
      });
    }, 'Không thể xem trước CV.');
  }

  download(resume: Resume): void {
    this.fetchFile(resume, (blobUrl) => {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = resume.original_filename;
      link.click();
      URL.revokeObjectURL(blobUrl);
    }, 'Không thể tải CV xuống.');
  }

  isPdf(resume: Resume): boolean {
    return isPdfResume(resume);
  }

  formatSize(bytes: number): string {
    return formatResumeFileSize(bytes);
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
  }

  private fetchFile(resume: Resume, next: (blobUrl: string) => void, fallback: string): void {
    this.busyResumeId = resume.id;
    this.resumeService.download(resume.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        this.busyResumeId = null;
        next(URL.createObjectURL(blob));
      },
      error: (error: HttpErrorResponse) => {
        this.busyResumeId = null;
        this.toast.errorFromHttp(error, fallback, true);
      },
    });
  }
}
