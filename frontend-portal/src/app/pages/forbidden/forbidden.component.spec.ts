import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForbiddenComponent } from './forbidden.component';
import { AuthService } from '../../core/auth/auth.service';
import { provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NZ_ICONS } from 'ng-zorro-antd/icon';
import {
  HomeOutline,
  ArrowLeftOutline,
  LogoutOutline,
  SafetyCertificateOutline,
} from '@ant-design/icons-angular/icons';
import { User } from '../../core/models';

describe('ForbiddenComponent', () => {
  let component: ForbiddenComponent;
  let fixture: ComponentFixture<ForbiddenComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let locationSpy: jasmine.SpyObj<Location>;

  const mockUser: User = {
    id: 1,
    email: 'candidate@example.com',
    full_name: 'Candidate User',
    phone: null,
    role: 'candidate',
    avatar_url: null,
    is_active: true,
    email_verified: true,
    company_code: null,
    approval_status: 'none',
    created_at: '2026-08-22T00:00:00Z',
    updated_at: null,
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'user',
      'isAuthenticated',
      'logout',
    ]);
    locationSpy = jasmine.createSpyObj('Location', ['back']);

    authServiceSpy.user.and.returnValue(mockUser);
    authServiceSpy.isAuthenticated.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [ForbiddenComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Location, useValue: locationSpy },
        {
          provide: NZ_ICONS,
          useValue: [
            HomeOutline,
            ArrowLeftOutline,
            LogoutOutline,
            SafetyCertificateOutline,
          ],
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForbiddenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders 403 status and forbidden title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.status-code')?.textContent).toContain('403');
    expect(compiled.querySelector('.forbidden-title')?.textContent).toContain('Quyền truy cập bị từ chối');
  });

  it('navigates back when goBack is called', () => {
    component.goBack();
    expect(locationSpy.back).toHaveBeenCalled();
  });

  it('logs out and redirects when logoutAndSwitchAccount is called', () => {
    component.logoutAndSwitchAccount();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('translates role names correctly', () => {
    expect(component.getRoleLabel('super_admin')).toBe('Super Admin');
    expect(component.getRoleLabel('admin')).toBe('Admin');
    expect(component.getRoleLabel('hr_manager')).toBe('HR Manager');
    expect(component.getRoleLabel('candidate')).toBe('Ứng viên');
  });
});
