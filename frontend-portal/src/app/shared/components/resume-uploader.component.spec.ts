import {
  formatResumeFileSize,
  validateResumeFile,
} from './resume-uploader.component';

describe('ResumeUploaderComponent helpers', () => {
  it('accepts valid PDF and DOCX files smaller than 5MB', () => {
    const pdf = new File(['cv'], 'candidate.pdf', { type: 'application/pdf' });
    const docx = new File(['cv'], 'candidate.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    expect(validateResumeFile(pdf)).toBeNull();
    expect(validateResumeFile(docx)).toBeNull();
  });

  it('rejects DOC, empty files and files of 5MB or larger', () => {
    const doc = new File(['cv'], 'candidate.doc', { type: 'application/msword' });
    const empty = new File([], 'candidate.pdf', { type: 'application/pdf' });
    const fiveMegabytes = new File([new Uint8Array(5 * 1024 * 1024)], 'candidate.pdf', {
      type: 'application/pdf',
    });

    expect(validateResumeFile(doc)).toContain('PDF hoặc DOCX');
    expect(validateResumeFile(empty)).toContain('đang trống');
    expect(validateResumeFile(fiveMegabytes)).toContain('nhỏ hơn 5MB');
  });

  it('formats file sizes for display', () => {
    expect(formatResumeFileSize(512 * 1024)).toBe('512 KB');
    expect(formatResumeFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
});
