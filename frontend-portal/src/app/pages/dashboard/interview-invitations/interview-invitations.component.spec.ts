import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NZ_ICONS } from 'ng-zorro-antd/icon';
import {
  VideoCameraOutline,
  EnvironmentOutline,
  BankOutline,
  ApartmentOutline,
  UserOutline,
  CalendarOutline,
  LinkOutline,
  ExportOutline,
  ClockCircleOutline,
  CheckOutline,
  CloseOutline,
  ReloadOutline,
  CloseCircleFill,
  LoadingOutline,
  ArrowLeftOutline,
} from '@ant-design/icons-angular/icons';

import { ApplicationService } from '../../../core/services/application.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  CandidateInterviewActionRequest,
  InterviewInvitation,
  InterviewInvitationListResponse,
} from '../../../shared/models/application.model';
import {
  canRespondToInvitation,
  getSafeMeetingUrl,
  InterviewInvitationsComponent,
} from './interview-invitations.component';

function createInvitation(overrides: Partial<InterviewInvitation> = {}): InterviewInvitation {
  const futureDate = new Date(Date.now() + 86400000 * 3).toISOString();
  return {
    id: 1,
    application_id: 10,
    job_id: 100,
    job_title: 'Senior Backend Engineer',
    job_slug: 'senior-backend-engineer',
    job_department: 'Engineering',
    scheduler_name: 'Nguyen HR',
    company_name: 'iRSA Tech',
    interview_date: futureDate,
    interview_type: 'online',
    location: 'https://meet.google.com/abc-def-ghi',
    notes: 'Chuẩn bị CV và portfolio',
    status: 'scheduled',
    candidate_response: 'pending',
    candidate_response_note: null,
    candidate_proposed_date: null,
    candidate_responded_at: null,
    ...overrides,
  };
}

describe('InterviewInvitationsComponent & Helpers', () => {
  let component: InterviewInvitationsComponent;
  let fixture: ComponentFixture<InterviewInvitationsComponent>;
  let appServiceSpy: jasmine.SpyObj<ApplicationService>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let modalService: NzModalService;

  beforeEach(async () => {
    appServiceSpy = jasmine.createSpyObj('ApplicationService', [
      'listInterviewInvitations',
      'respondToInterviewInvitation',
    ]);
    toastSpy = jasmine.createSpyObj('ToastService', [
      'success',
      'error',
      'errorFromHttp',
      'info',
      'warning',
    ]);

    appServiceSpy.listInterviewInvitations.and.returnValue(
      of({
        items: [createInvitation()],
        total: 1,
        page: 1,
        size: 20,
      }),
    );

    await TestBed.configureTestingModule({
      imports: [InterviewInvitationsComponent, NzModalModule],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ApplicationService, useValue: appServiceSpy },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: NZ_ICONS,
          useValue: [
            VideoCameraOutline,
            EnvironmentOutline,
            BankOutline,
            ApartmentOutline,
            UserOutline,
            CalendarOutline,
            LinkOutline,
            ExportOutline,
            ClockCircleOutline,
            CheckOutline,
            CloseOutline,
            ReloadOutline,
            CloseCircleFill,
            LoadingOutline,
            ArrowLeftOutline,
          ],
        },
      ],
    }).compileComponents();

    modalService = TestBed.inject(NzModalService);
    fixture = TestBed.createComponent(InterviewInvitationsComponent);
    component = fixture.componentInstance;
  });

  describe('Helper functions', () => {
    it('only returns safe HTTP/HTTPS online meeting URLs', () => {
      const onlineInv = createInvitation({
        interview_type: 'online',
        location: 'https://meet.google.com/xyz',
      });
      expect(getSafeMeetingUrl(onlineInv)).toBe('https://meet.google.com/xyz');

      const unsafeInv = createInvitation({
        interview_type: 'online',
        location: 'javascript:alert("hacked")',
      });
      expect(getSafeMeetingUrl(unsafeInv)).toBeNull();

      const offlineInv = createInvitation({
        interview_type: 'offline',
        location: 'Tầng 5, Tòa nhà Bitexco',
      });
      expect(getSafeMeetingUrl(offlineInv)).toBeNull();
    });

    it('canRespondToInvitation returns true only for pending, scheduled, future invitations', () => {
      const futurePending = createInvitation({
        status: 'scheduled',
        candidate_response: 'pending',
        interview_date: new Date(Date.now() + 86400000).toISOString(),
      });
      expect(canRespondToInvitation(futurePending)).toBeTrue();

      const accepted = createInvitation({
        status: 'scheduled',
        candidate_response: 'accepted',
      });
      expect(canRespondToInvitation(accepted)).toBeFalse();

      const declined = createInvitation({
        status: 'cancelled',
        candidate_response: 'declined',
      });
      expect(canRespondToInvitation(declined)).toBeFalse();

      const pastPending = createInvitation({
        status: 'scheduled',
        candidate_response: 'pending',
        interview_date: new Date(Date.now() - 86400000).toISOString(),
      });
      expect(canRespondToInvitation(pastPending)).toBeFalse();
    });
  });

  describe('Component lifecycle and actions', () => {
    it('loads invitations on init and displays items', () => {
      fixture.detectChanges();
      expect(component.loading).toBeFalse();
      expect(component.invitations.length).toBe(1);
      expect(component.total).toBe(1);
    });

    it('handles error state properly and allows retry', () => {
      appServiceSpy.listInterviewInvitations.and.returnValue(
        throwError(() => new Error('Network error')),
      );

      component.loadInvitations();
      expect(component.loading).toBeFalse();
      expect(component.hasError).toBeTrue();
      expect(component.invitations.length).toBe(0);

      // Retry
      appServiceSpy.listInterviewInvitations.and.returnValue(
        of({ items: [createInvitation()], total: 1, page: 1, size: 20 }),
      );
      component.loadInvitations();
      expect(component.hasError).toBeFalse();
      expect(component.invitations.length).toBe(1);
    });

    it('confirmAccept triggers confirmation modal and calls service', () => {
      const item = createInvitation();
      component.invitations = [item];

      let confirmCallback: (() => void) | undefined;
      spyOn((component as any).modal, 'confirm').and.callFake((opts: any) => {
        confirmCallback = opts.nzOnOk;
        return {} as any;
      });

      component.confirmAccept(item);
      expect((component as any).modal.confirm).toHaveBeenCalled();

      const updatedItem = createInvitation({ candidate_response: 'accepted' });
      appServiceSpy.respondToInterviewInvitation.and.returnValue(of(updatedItem));

      confirmCallback!();
      expect(appServiceSpy.respondToInterviewInvitation).toHaveBeenCalledWith(1, {
        response: 'accepted',
      });
      expect(component.invitations[0].candidate_response).toBe('accepted');
      expect(toastSpy.success).toHaveBeenCalled();
    });

    it('confirmDecline triggers confirmation modal and calls service', () => {
      const item = createInvitation();
      component.invitations = [item];

      let confirmCallback: (() => void) | undefined;
      spyOn((component as any).modal, 'confirm').and.callFake((opts: any) => {
        confirmCallback = opts.nzOnOk;
        return {} as any;
      });

      component.confirmDecline(item);
      expect((component as any).modal.confirm).toHaveBeenCalled();

      const updatedItem = createInvitation({
        candidate_response: 'declined',
        status: 'cancelled',
      });
      appServiceSpy.respondToInterviewInvitation.and.returnValue(of(updatedItem));

      confirmCallback!();
      expect(appServiceSpy.respondToInterviewInvitation).toHaveBeenCalledWith(1, {
        response: 'declined',
      });
      expect(component.invitations[0].candidate_response).toBe('declined');
      expect(component.invitations[0].status).toBe('cancelled');
    });

    it('reschedule flow opens modal, validates date and sends payload', () => {
      const item = createInvitation();
      component.invitations = [item];
      component.openRescheduleModal(item);
      expect(component.rescheduleModalVisible).toBeTrue();
      expect(component.selectedInterview).toBe(item);
      expect(component.isRescheduleValid()).toBeFalse();

      const futureDate = new Date(Date.now() + 86400000 * 5);
      component.proposedDate = futureDate;
      component.rescheduleNote = ' Xin dời sang tuần sau ';
      expect(component.isRescheduleValid()).toBeTrue();

      const updatedItem = createInvitation({
        candidate_response: 'reschedule_requested',
        candidate_proposed_date: futureDate.toISOString(),
        candidate_response_note: 'Xin dời sang tuần sau',
      });
      appServiceSpy.respondToInterviewInvitation.and.returnValue(of(updatedItem));

      component.submitReschedule();
      expect(appServiceSpy.respondToInterviewInvitation).toHaveBeenCalledWith(1, {
        response: 'reschedule_requested',
        proposed_date: futureDate.toISOString(),
        note: 'Xin dời sang tuần sau',
      });
      expect(component.invitations[0].candidate_response).toBe('reschedule_requested');
      expect(component.rescheduleModalVisible).toBeFalse();
    });

    it('API error retains existing card status and reports error', () => {
      const item = createInvitation();
      component.invitations = [item];

      appServiceSpy.respondToInterviewInvitation.and.returnValue(
        throwError(() => new Error('Server error')),
      );

      component.submitResponse(item.id, { response: 'accepted' });
      expect(component.invitations[0].candidate_response).toBe('pending');
      expect(component.submittingId).toBeNull();
      expect(toastSpy.errorFromHttp).toHaveBeenCalled();
    });

    it('returns proper badge colors and labels for each response status', () => {
      const pending = createInvitation({ candidate_response: 'pending' });
      expect(component.getStatusBadge(pending)).toEqual({
        label: 'Chờ phản hồi',
        color: 'processing',
      });

      const accepted = createInvitation({ candidate_response: 'accepted' });
      expect(component.getStatusBadge(accepted)).toEqual({
        label: 'Đã chấp nhận',
        color: 'success',
      });

      const declined = createInvitation({
        candidate_response: 'declined',
        status: 'cancelled',
      });
      expect(component.getStatusBadge(declined)).toEqual({
        label: 'Đã từ chối',
        color: 'error',
      });

      const reschedule = createInvitation({ candidate_response: 'reschedule_requested' });
      expect(component.getStatusBadge(reschedule)).toEqual({
        label: 'Đã đề nghị hẹn lại',
        color: 'warning',
      });
    });

    it('renders job department in host-info when present', () => {
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const deptEl = el.querySelector('.department-name');
      expect(deptEl).toBeTruthy();
      expect(deptEl?.textContent).toContain('Engineering');
    });
  });
});
