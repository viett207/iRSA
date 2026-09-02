import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { NzMessageService } from 'ng-zorro-antd/message';
import { of, throwError } from 'rxjs';

import { UserFormModalComponent } from './user-form-modal.component';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../shared/models/user.model';

describe('UserFormModalComponent', () => {
  let component: UserFormModalComponent;
  let fixture: ComponentFixture<UserFormModalComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let messageService: jasmine.SpyObj<NzMessageService>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    phone: '0123456789',
    role: 'recruiter',
    avatar_url: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
  };

  beforeEach(async () => {
    const userServiceSpy = jasmine.createSpyObj('UserService', ['create', 'update']);
    const messageServiceSpy = jasmine.createSpyObj('NzMessageService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [UserFormModalComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserService, useValue: userServiceSpy },
        { provide: NzMessageService, useValue: messageServiceSpy },
      ],
    }).compileComponents();

    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    messageService = TestBed.inject(NzMessageService) as jasmine.SpyObj<NzMessageService>;

    fixture = TestBed.createComponent(UserFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Create Mode', () => {
    beforeEach(() => {
      component.user = null;
      component.visible = true;
      component.ngOnChanges({ visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false } });
    });

    it('should initialize with empty form', () => {
      expect(component.formGroup.get('email')?.value).toBe('');
      expect(component.formGroup.get('full_name')?.value).toBe('');
      expect(component.formGroup.get('password')?.value).toBe('');
      expect(component.formGroup.get('role')?.value).toBe('candidate');
    });

    it('should have email enabled', () => {
      expect(component.formGroup.get('email')?.enabled).toBeTrue();
    });

    it('should require password', () => {
      component.formGroup.get('password')?.setValue('');
      expect(component.formGroup.get('password')?.hasError('required')).toBeTrue();
    });

    it('should validate email format', () => {
      component.formGroup.get('email')?.setValue('invalid-email');
      expect(component.formGroup.get('email')?.hasError('email')).toBeTrue();

      component.formGroup.get('email')?.setValue('valid@email.com');
      expect(component.formGroup.get('email')?.valid).toBeTrue();
    });

    it('should validate full_name min length', () => {
      component.formGroup.get('full_name')?.setValue('A');
      expect(component.formGroup.get('full_name')?.hasError('minlength')).toBeTrue();

      component.formGroup.get('full_name')?.setValue('AB');
      expect(component.formGroup.get('full_name')?.hasError('minlength')).toBeFalse();
    });

    it('should validate password min length', () => {
      component.formGroup.get('password')?.setValue('1234567');
      expect(component.formGroup.get('password')?.hasError('minlength')).toBeTrue();

      component.formGroup.get('password')?.setValue('12345678');
      expect(component.formGroup.get('password')?.hasError('minlength')).toBeFalse();
    });

    it('should call create on submit', fakeAsync(() => {
      const newUser = { ...mockUser, id: 2 };
      userService.create.and.returnValue(of(newUser));

      component.formGroup.setValue({
        email: 'new@example.com',
        full_name: 'New User',
        phone: '0987654321',
        password: 'password123',
        role: 'candidate',
        is_active: true,
      });

      spyOn(component.saved, 'emit');
      component.submit();
      tick();

      expect(userService.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        full_name: 'New User',
        phone: '0987654321',
        password: 'password123',
        role: 'candidate',
      });
      expect(component.saved.emit).toHaveBeenCalledWith(newUser);
    }));

    it('should show error message on create failure', fakeAsync(() => {
      userService.create.and.returnValue(throwError(() => ({ error: { detail: 'Email already exists' } })));

      component.formGroup.setValue({
        email: 'existing@example.com',
        full_name: 'Test User',
        phone: '',
        password: 'password123',
        role: 'candidate',
        is_active: true,
      });

      component.submit();
      tick();

      expect(messageService.error).toHaveBeenCalledWith('Email already exists');
      expect(component.saving).toBeFalse();
    }));
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      component.user = mockUser;
      component.visible = true;
      component.ngOnChanges({ visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false } });
    });

    it('should pre-populate form with user data', () => {
      expect(component.formGroup.get('email')?.value).toBe(mockUser.email);
      expect(component.formGroup.get('full_name')?.value).toBe(mockUser.full_name);
      expect(component.formGroup.get('phone')?.value).toBe(mockUser.phone);
      expect(component.formGroup.get('role')?.value).toBe(mockUser.role);
      expect(component.formGroup.get('is_active')?.value).toBe(mockUser.is_active);
    });

    it('should have email disabled', () => {
      expect(component.formGroup.get('email')?.disabled).toBeTrue();
    });

    it('should not require password', () => {
      component.formGroup.get('password')?.setValue('');
      expect(component.formGroup.get('password')?.hasError('required')).toBeFalse();
    });

    it('should validate password if provided', () => {
      component.formGroup.get('password')?.setValue('short');
      expect(component.formGroup.get('password')?.hasError('minlength')).toBeTrue();

      component.formGroup.get('password')?.setValue('longenough');
      expect(component.formGroup.get('password')?.valid).toBeTrue();
    });

    it('should call update on submit', fakeAsync(() => {
      const updatedUser = { ...mockUser, full_name: 'Updated Name' };
      userService.update.and.returnValue(of(updatedUser));

      component.formGroup.patchValue({ full_name: 'Updated Name' });

      spyOn(component.saved, 'emit');
      component.submit();
      tick();

      expect(userService.update).toHaveBeenCalledWith(mockUser.id, jasmine.objectContaining({
        full_name: 'Updated Name',
        role: mockUser.role,
        is_active: mockUser.is_active,
      }));
      expect(component.saved.emit).toHaveBeenCalledWith(updatedUser);
    }));

    it('should include password in update if provided', fakeAsync(() => {
      const updatedUser = { ...mockUser };
      userService.update.and.returnValue(of(updatedUser));

      component.formGroup.patchValue({ password: 'newpassword123' });

      component.submit();
      tick();

      expect(userService.update).toHaveBeenCalledWith(mockUser.id, jasmine.objectContaining({
        password: 'newpassword123',
      }));
    }));

    it('should show error message on update failure', fakeAsync(() => {
      userService.update.and.returnValue(throwError(() => ({ error: { detail: 'Update failed' } })));

      component.submit();
      tick();

      expect(messageService.error).toHaveBeenCalledWith('Update failed');
      expect(component.saving).toBeFalse();
    }));
  });

  describe('Modal Behavior', () => {
    it('should emit visibleChange on close', () => {
      component.visible = true;
      spyOn(component.visibleChange, 'emit');

      component.close();

      expect(component.visible).toBeFalse();
      expect(component.visibleChange.emit).toHaveBeenCalledWith(false);
    });

    it('should reset saving state on close', () => {
      component.saving = true;
      component.close();
      expect(component.saving).toBeFalse();
    });

    it('should not submit if form is invalid', () => {
      component.formGroup.get('email')?.setValue('');
      component.submit();
      expect(userService.create).not.toHaveBeenCalled();
      expect(userService.update).not.toHaveBeenCalled();
    });
  });
});
