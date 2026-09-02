import { isPdfResume } from './resume-management.component';

describe('ResumeManagementComponent helpers', () => {
  it('detects PDF resumes by content type or extension', () => {
    expect(isPdfResume({ content_type: 'application/pdf', original_filename: 'cv.bin' })).toBeTrue();
    expect(isPdfResume({ content_type: 'application/octet-stream', original_filename: 'CV.PDF' })).toBeTrue();
  });

  it('does not classify DOCX as PDF', () => {
    expect(isPdfResume({
      content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      original_filename: 'cv.docx',
    })).toBeFalse();
  });
});
