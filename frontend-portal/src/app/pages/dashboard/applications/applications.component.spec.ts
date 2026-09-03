import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplicationsComponent } from './applications.component';
import { ApplicationService } from '../../../core/services/application.service';
import { ToastService } from '../../../core/services/toast.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { NZ_ICONS } from 'ng-zorro-antd/icon';
import {
  FilePdfOutline,
  EyeOutline,
  ApartmentOutline,
  EnvironmentOutline,
  LoadingOutline,
  ArrowLeftOutline,
} from '@ant-design/icons-angular/icons';
import { Application, ApplicationListResponse } from '../../../core/models';

describe('ApplicationsComponent', () => {
  let component: ApplicationsComponent;
  let fixture: ComponentFixture<ApplicationsComponent>;
  let applicationServiceSpy: jasmine.SpyObj<ApplicationService>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let modalSpy: jasmine.SpyObj<NzModalService>;

  const mockApplications: Application[] = [
    {
      id: 1,
      job_id: 101,
      job_title: 'Senior Frontend Engineer',
      job_slug: 'senior-frontend-engineer',
      job_department: 'Engineering',
      job_location: 'Hà Nội',
      resume_id: 201,
      resume_filename: 'cv_nguyen_van_a.pdf',
      cover_letter: null,
      contact_phone: null,
      status: 'reviewing',
      public_status: 'in_review',
      submitted_at: '2026-08-22T08:00:00Z',
      resume_download_url: null,
      interviews: [],
    },
  ];

  const mockResponse: ApplicationListResponse = {
    items: mockApplications,
    total: 1,
    page: 1,
    size: 20,
    status_counts: {
      in_review: 1,
      shortlisted: 0,
      not_selected: 0,
      selected: 0,
    },
  };

  beforeEach(async () => {
    applicationServiceSpy = jasmine.createSpyObj('ApplicationService', [
      'list',
      'downloadResume',
    ]);
    toastSpy = jasmine.createSpyObj('ToastService', ['loading', 'remove', 'error']);
    modalSpy = jasmine.createSpyObj('NzModalService', ['create']);

    applicationServiceSpy.list.and.returnValue(of(mockResponse));
    toastSpy.loading.and.returnValue({ messageId: 'msg-1' } as any);

    await TestBed.configureTestingModule({
      imports: [ApplicationsComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        provideTranslateService(),
        { provide: ApplicationService, useValue: applicationServiceSpy },
        { provide: ToastService, useValue: toastSpy },
        { provide: NzModalService, useValue: modalSpy },
        {
          provide: NZ_ICONS,
          useValue: [
            FilePdfOutline,
            EyeOutline,
            ApartmentOutline,
            EnvironmentOutline,
            LoadingOutline,
            ArrowLeftOutline,
          ],
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplicationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads and displays application items', () => {
    expect(component.applications.length).toBe(1);
    expect(component.applications[0].job_title).toBe('Senior Frontend Engineer');
    expect(component.loading).toBeFalse();
  });

  it('translates application status to human-readable label and color', () => {
    expect(component.getStatusLabel('in_review')).toBe('Đang xem xét');
    expect(component.getStatusColor('in_review')).toBe('processing');
  });

  it('handles page and pageSize changes', () => {
    component.onPageChange(2);
    expect(component.page).toBe(2);
    expect(applicationServiceSpy.list).toHaveBeenCalledWith(2, 20);

    component.onPageSizeChange(50);
    expect(component.pageSize).toBe(50);
    expect(component.page).toBe(1);
    expect(applicationServiceSpy.list).toHaveBeenCalledWith(1, 50);
  });

  it('handles resume download failure gracefully', () => {
    applicationServiceSpy.downloadResume.and.returnValue(throwError(() => new Error('Download failed')));

    component.openPdfViewer(mockApplications[0]);

    expect(toastSpy.error).toHaveBeenCalledWith('Không thể tải CV. Vui lòng thử lại.');
  });
});
