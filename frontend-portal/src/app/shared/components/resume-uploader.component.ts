import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { ResumeService } from '../../core/services/resume.service';
import { Resume } from '../models/resume.model';

export type ResumeUploaderSelection =
  | { source: 'file'; file: File; resume: null }
  | { source: 'saved'; file: null; resume: Resume }
  | null;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
]);

export function validateResumeFile(file: File): string | null {
  const extension = getFileExtension(file.name);

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return 'Định dạng CV không hợp lệ. Vui lòng chọn file PDF hoặc DOCX.';
  }
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return 'Nội dung file không khớp định dạng PDF hoặc DOCX.';
  }
  if (file.size === 0) {
    return 'File CV đang trống. Vui lòng chọn file khác.';
  }
  if (file.size >= MAX_FILE_SIZE) {
    return 'Dung lượng CV phải nhỏ hơn 5MB. Vui lòng chọn file khác.';
  }

  return null;
}

export function formatResumeFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

@Component({
  selector: 'app-resume-uploader',
  standalone: true,
  imports: [
    CommonModule,
    NzButtonModule,
    NzEmptyModule,
    NzIconModule,
    NzSpinModule,
    NzTagModule,
  ],
  template: `
    <div class="resume-uploader" [class.is-disabled]="disabled">
      <input
        #fileInput
        type="file"
        class="native-file-input"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        [disabled]="disabled"
        (change)="onFileInputChange($event)"
      />

      <div
        class="drop-zone"
        [class.is-dragging]="isDragging"
        [class.has-selection]="selectedFile"
        role="button"
        tabindex="0"
        [attr.aria-disabled]="disabled"
        aria-describedby="resume-file-requirements"
        (click)="openFilePicker(fileInput)"
        (keydown.enter)="openFilePicker(fileInput)"
        (keydown.space)="openFilePicker(fileInput, $event)"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        @if (selectedFile) {
          <div class="selected-file">
            <span
              class="file-icon"
              nz-icon
              [nzType]="getFileIcon(selectedFile.name)"
              nzTheme="outline"
            ></span>
            <div class="file-details">
              <strong>{{ selectedFile.name }}</strong>
              <span>{{ formatFileSize(selectedFile.size) }} · Sẵn sàng sử dụng</span>
            </div>
            <button
              type="button"
              class="remove-button"
              aria-label="Xóa file CV đã chọn"
              [disabled]="disabled"
              (click)="clearSelection($event)"
            >
              <span nz-icon nzType="delete" nzTheme="outline"></span>
            </button>
          </div>
        } @else {
          <span class="upload-icon" nz-icon nzType="cloud-upload" nzTheme="outline"></span>
          <strong>Kéo thả CV vào đây</strong>
          <span id="resume-file-requirements">PDF hoặc DOCX · Dung lượng nhỏ hơn 5MB</span>
          <button type="button" nz-button tabindex="-1" [disabled]="disabled">
            <span nz-icon nzType="folder-open" nzTheme="outline"></span>
            Chọn file từ máy
          </button>
        }
      </div>

      @if (validationError) {
        <div class="validation-error" role="alert">
          <span nz-icon nzType="exclamation-circle" nzTheme="fill"></span>
          {{ validationError }}
        </div>
      }

      @if (showSavedResumes) {
        <section class="saved-resumes" aria-labelledby="saved-resume-heading">
          <div class="saved-heading">
            <div>
              <span class="eyebrow">Chọn nhanh</span>
              <h3 id="saved-resume-heading">CV đã lưu trong tài khoản của tôi</h3>
            </div>
            @if (!loadingResumes) {
              <button
                type="button"
                class="refresh-button"
                aria-label="Tải lại danh sách CV"
                [disabled]="disabled"
                (click)="loadSavedResumes()"
              >
                <span nz-icon nzType="reload" nzTheme="outline"></span>
              </button>
            }
          </div>

          @if (loadingResumes) {
            <div class="saved-state"><nz-spin nzSimple></nz-spin><span>Đang tải danh sách CV...</span></div>
          } @else if (savedResumeError) {
            <div class="saved-state error-state">
              <span nz-icon nzType="warning" nzTheme="outline"></span>
              <span>{{ savedResumeError }}</span>
              <button type="button" nz-button nzSize="small" (click)="loadSavedResumes()">Thử lại</button>
            </div>
          } @else if (savedResumes.length === 0) {
            <nz-empty nzNotFoundContent="Bạn chưa có CV nào được lưu."></nz-empty>
          } @else {
            <div class="resume-list" role="radiogroup" aria-label="Danh sách CV đã lưu">
              @for (resume of savedResumes; track resume.id) {
                <button
                  type="button"
                  class="resume-option"
                  [class.selected]="selectedResume?.id === resume.id"
                  role="radio"
                  [attr.aria-checked]="selectedResume?.id === resume.id"
                  [disabled]="disabled"
                  (click)="selectSavedResume(resume)"
                >
                  <span class="saved-file-icon" nz-icon [nzType]="getFileIcon(resume.original_filename)" nzTheme="outline"></span>
                  <span class="saved-file-copy">
                    <strong>{{ resume.original_filename }}</strong>
                    <span>{{ formatFileSize(resume.file_size) }} · {{ formatUploadDate(resume.uploaded_at) }}</span>
                  </span>
                  @if (resume.is_default) {
                    <nz-tag class="default-tag">Mặc định</nz-tag>
                  }
                  <span
                    class="selection-indicator"
                    nz-icon
                    [nzType]="selectedResume?.id === resume.id ? 'check-circle' : 'right'"
                    [nzTheme]="selectedResume?.id === resume.id ? 'fill' : 'outline'"
                  ></span>
                </button>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .resume-uploader { display: flex; flex-direction: column; gap: 10px; }
    .resume-uploader.is-disabled { opacity: .72; }
    .native-file-input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
    .drop-zone {
      min-height: 130px;
      padding: 16px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 2px dashed var(--color-border);
      border-radius: 14px;
      background: color-mix(in srgb, var(--color-primary) 3%, var(--color-bg-primary));
      color: var(--color-text-secondary);
      text-align: center;
      cursor: pointer;
      transition: border-color .22s ease, background .22s ease, box-shadow .22s ease, transform .22s ease;
    }
    .drop-zone:hover, .drop-zone:focus-visible, .drop-zone.is-dragging {
      outline: none;
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 8%, var(--color-bg-primary));
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 12%, transparent);
    }
    .drop-zone.is-dragging { transform: translateY(-2px); }
    .drop-zone.has-selection { min-height: 72px; padding: 10px 16px; border-style: solid; }
    .drop-zone strong { color: var(--color-text-primary); font-size: 14.5px; line-height: 1.2; }
    .drop-zone span#resume-file-requirements { font-size: 12px; }
    .drop-zone button { height: 32px; padding: 0 14px; font-size: 12.5px; margin-top: 2px; }
    .upload-icon { color: var(--color-primary); font-size: 32px; animation: upload-float 2.2s ease-in-out infinite; }
    .selected-file { width: 100%; display: flex; align-items: center; gap: 12px; text-align: left; }
    .file-icon, .saved-file-icon { flex: none; color: var(--color-primary); font-size: 22px; }
    .file-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 10px; background: color-mix(in srgb, var(--color-primary) 11%, transparent); }
    .file-details, .saved-file-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .file-details strong, .saved-file-copy strong { overflow: hidden; color: var(--color-text-primary); text-overflow: ellipsis; white-space: nowrap; font-size: 13.5px; }
    .file-details span, .saved-file-copy span { color: var(--color-text-secondary); font-size: 11.5px; }
    .remove-button, .refresh-button { flex: none; display: grid; place-items: center; width: 34px; height: 34px; border: 0; border-radius: 50%; cursor: pointer; }
    .remove-button { color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 9%, transparent); }
    .remove-button:hover { background: color-mix(in srgb, var(--color-danger) 16%, transparent); }
    .validation-error { display: flex; align-items: center; gap: 7px; color: var(--color-danger); font-size: 12.5px; }
    .saved-resumes { padding-top: 10px; margin-top: 2px; border-top: 1px solid var(--color-border); }
    .saved-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
    .eyebrow { display: block; margin-bottom: 2px; color: var(--color-primary); font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
    .saved-heading h3 { margin: 0; color: var(--color-text-primary); font-size: 13.5px; font-weight: 700; }
    .refresh-button { color: var(--color-text-secondary); background: transparent; }
    .refresh-button:hover { color: var(--color-primary); background: var(--color-bg-secondary); }
    .saved-state { min-height: 50px; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--color-text-secondary); font-size: 12.5px; }
    .error-state { flex-wrap: wrap; color: var(--color-danger); }
    ::ng-deep .ant-empty { margin: 6px 0 !important; }
    ::ng-deep .ant-empty-image { height: 50px !important; margin-bottom: 2px !important; }
    ::ng-deep .ant-empty-image svg { width: 80px !important; height: 50px !important; }
    ::ng-deep .ant-empty-description { font-size: 12px !important; margin: 0 !important; }
    .resume-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; max-height: 150px; overflow-y: auto; padding: 2px; }
    .resume-option { min-width: 0; display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-bg-primary); text-align: left; cursor: pointer; transition: border-color .2s ease, background .2s ease, box-shadow .2s ease; }
    .resume-option:hover, .resume-option:focus-visible { outline: none; border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 4%, var(--color-bg-primary)); }
    .resume-option.selected { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 7%, var(--color-bg-primary)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 10%, transparent); }
    .resume-option .saved-file-icon { font-size: 18px; }
    .default-tag { flex: none; margin: 0; border-radius: 999px; color: var(--color-primary); border-color: color-mix(in srgb, var(--color-primary) 25%, transparent); background: color-mix(in srgb, var(--color-primary) 8%, transparent); font-size: 9.5px; padding: 0 6px; }
    .selection-indicator { flex: none; color: var(--color-text-tertiary); font-size: 13px; }
    .resume-option.selected .selection-indicator { color: var(--color-success); }
    @keyframes upload-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
    @media (max-width: 640px) {
      .drop-zone { min-height: 120px; padding: 14px 10px; }
      .resume-list { grid-template-columns: 1fr; }
      .default-tag { display: none; }
    }
  `],
})
export class ResumeUploaderComponent implements OnInit {
  private readonly resumeService = inject(ResumeService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() disabled = false;
  @Input() showSavedResumes = true;
  @Output() selectionChange = new EventEmitter<ResumeUploaderSelection>();

  selectedFile: File | null = null;
  selectedResume: Resume | null = null;
  savedResumes: Resume[] = [];
  validationError: string | null = null;
  savedResumeError: string | null = null;
  loadingResumes = false;
  isDragging = false;

  ngOnInit(): void {
    if (this.showSavedResumes) this.loadSavedResumes();
  }

  loadSavedResumes(): void {
    this.loadingResumes = true;
    this.savedResumeError = null;
    this.resumeService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.savedResumes = [...response.items].sort(
          (first, second) => Number(second.is_default) - Number(first.is_default),
        );
        this.loadingResumes = false;
      },
      error: () => {
        this.savedResumes = [];
        this.savedResumeError = 'Không thể tải danh sách CV đã lưu.';
        this.loadingResumes = false;
      },
    });
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    if (file) this.selectFile(file);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.disabled) this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    if (this.disabled) return;
    const file = event.dataTransfer?.files.item(0);
    if (file) this.selectFile(file);
  }

  openFilePicker(input: HTMLInputElement, event?: Event): void {
    event?.preventDefault();
    if (!this.disabled) input.click();
  }

  selectSavedResume(resume: Resume): void {
    if (this.disabled) return;
    this.selectedFile = null;
    this.selectedResume = resume;
    this.validationError = null;
    this.selectionChange.emit({ source: 'saved', file: null, resume });
  }

  clearSelection(event?: Event): void {
    event?.stopPropagation();
    if (this.disabled) return;
    this.selectedFile = null;
    this.selectedResume = null;
    this.validationError = null;
    this.selectionChange.emit(null);
  }

  private selectFile(file: File): void {
    const error = validateResumeFile(file);
    if (error) {
      this.selectedFile = null;
      this.selectedResume = null;
      this.validationError = error;
      this.selectionChange.emit(null);
      return;
    }

    this.selectedFile = file;
    this.selectedResume = null;
    this.validationError = null;
    this.selectionChange.emit({ source: 'file', file, resume: null });
  }

  getFileIcon(filename: string): string {
    return getFileExtension(filename) === 'pdf' ? 'file-pdf' : 'file-word';
  }

  formatFileSize(bytes: number): string {
    return formatResumeFileSize(bytes);
  }

  formatUploadDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Đã lưu'
      : new Intl.DateTimeFormat('vi-VN').format(date);
  }
}
