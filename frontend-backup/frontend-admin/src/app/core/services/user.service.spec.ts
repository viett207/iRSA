import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { environment } from '../../../environments/environment';
import {
  UserListParams,
  UserListResponse,
  UserCreate,
  UserUpdate,
} from '../../pages/users/models/user-api.model';
import { User } from '../../shared/models/user.model';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/users`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should be injectable in root', () => {
      const injectedService = TestBed.inject(UserService);
      expect(injectedService).toBe(service);
    });
  });

  describe('list()', () => {
    const mockUsers: User[] = [
      {
        id: 1,
        email: 'recruiter@example.com',
        full_name: 'John Recruiter',
        phone: '0123456789',
        role: 'recruiter',
        avatar_url: 'https://example.com/avatar.jpg',
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      },
      {
        id: 2,
        email: 'admin@example.com',
        full_name: 'Admin User',
        phone: null,
        role: 'admin',
        avatar_url: null,
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: null,
      },
    ];

    const mockResponse: UserListResponse = {
      items: mockUsers,
      total: 20,
      page: 1,
      page_size: 10,
      pages: 2,
    };

    it('should fetch users list without params', () => {
      service.list().subscribe((response) => {
        expect(response.items.length).toBe(2);
        expect(response.total).toBe(20);
        expect(response.page).toBe(1);
        expect(response.page_size).toBe(10);
        expect(response.pages).toBe(2);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys().length).toBe(0);
      req.flush(mockResponse);
    });

    it('should build correct query string with pagination params', () => {
      const params: UserListParams = { page: 2, page_size: 20 };
      service.list(params).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url === apiUrl &&
          request.params.get('page') === '2' &&
          request.params.get('page_size') === '20'
        );
      });

      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should build correct query string with role filter', () => {
      const params: UserListParams = { role: 'recruiter' };
      service.list(params).subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url === apiUrl && request.params.get('role') === 'recruiter';
      });

      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should build correct query string with is_active filter', () => {
      const params: UserListParams = { is_active: false };
      service.list(params).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url === apiUrl &&
          request.params.get('is_active') === 'false'
        );
      });

      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should build correct query string with search param', () => {
      const params: UserListParams = { search: 'john' };
      service.list(params).subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url === apiUrl && request.params.get('search') === 'john';
      });

      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should build query string with all params combined', () => {
      const params: UserListParams = {
        page: 2,
        page_size: 15,
        role: 'admin',
        is_active: true,
        search: 'admin',
      };
      service.list(params).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url === apiUrl &&
          request.params.get('page') === '2' &&
          request.params.get('page_size') === '15' &&
          request.params.get('role') === 'admin' &&
          request.params.get('is_active') === 'true' &&
          request.params.get('search') === 'admin'
        );
      });

      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should not include undefined params in query string', () => {
      const params: UserListParams = { page: 1, role: undefined };
      service.list(params).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url === apiUrl &&
          request.params.get('page') === '1' &&
          !request.params.has('role')
        );
      });

      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should return typed UserListResponse', (done) => {
      service.list().subscribe((response) => {
        expect(response).toEqual(mockResponse);
        expect(response.items[0].role).toBe('recruiter');
        expect(response.items[1].role).toBe('admin');
        done();
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(mockResponse);
    });
  });

  describe('get()', () => {
    const mockUser: User = {
      id: 1,
      email: 'recruiter@example.com',
      full_name: 'John Recruiter',
      phone: '0123456789',
      role: 'recruiter',
      avatar_url: 'https://example.com/avatar.jpg',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
    };

    it('should fetch user by id', () => {
      service.get(1).subscribe((user) => {
        expect(user.id).toBe(1);
        expect(user.email).toBe('recruiter@example.com');
        expect(user.role).toBe('recruiter');
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });

    it('should build correct URL with user id', () => {
      service.get(42).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/42`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });

    it('should return typed User response', (done) => {
      service.get(1).subscribe((user) => {
        expect(user.id).toBe(1);
        expect(user.role).toBe('recruiter');
        expect(user.is_active).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      req.flush(mockUser);
    });
  });

  describe('create()', () => {
    const createData: UserCreate = {
      email: 'newuser@example.com',
      full_name: 'New User',
      phone: '0987654321',
      password: 'SecurePass123!',
      role: 'recruiter',
    };

    const mockCreatedUser: User = {
      id: 3,
      email: createData.email,
      full_name: createData.full_name,
      phone: createData.phone || null,
      role: createData.role,
      avatar_url: null,
      is_active: true,
      created_at: '2025-01-02T00:00:00Z',
      updated_at: null,
    };

    it('should create user with valid data', () => {
      service.create(createData).subscribe((user) => {
        expect(user.id).toBe(3);
        expect(user.email).toBe(createData.email);
        expect(user.full_name).toBe(createData.full_name);
        expect(user.role).toBe('recruiter');
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createData);
      req.flush(mockCreatedUser);
    });

    it('should send correct request body', () => {
      service.create(createData).subscribe();

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.body.email).toBe(createData.email);
      expect(req.request.body.full_name).toBe(createData.full_name);
      expect(req.request.body.phone).toBe(createData.phone);
      expect(req.request.body.password).toBe(createData.password);
      expect(req.request.body.role).toBe(createData.role);
      req.flush(mockCreatedUser);
    });

    it('should return typed User response from creation', (done) => {
      service.create(createData).subscribe((user) => {
        expect(user.id).toBe(3);
        expect(user.is_active).toBe(true);
        done();
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(mockCreatedUser);
    });
  });

  describe('update()', () => {
    const updateData: UserUpdate = {
      full_name: 'Updated Name',
      phone: '9999999999',
      role: 'leader',
      is_active: false,
    };

    const mockUpdatedUser: User = {
      id: 1,
      email: 'recruiter@example.com',
      full_name: updateData.full_name || 'John Recruiter',
      phone: updateData.phone || null,
      role: updateData.role || 'recruiter',
      avatar_url: null,
      is_active: updateData.is_active ?? true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T12:00:00Z',
    };

    it('should update user with partial data', () => {
      service.update(1, updateData).subscribe((user) => {
        expect(user.id).toBe(1);
        expect(user.full_name).toBe(updateData.full_name || 'John Recruiter');
        expect(user.role).toBe(updateData.role || 'recruiter');
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush(mockUpdatedUser);
    });

    it('should build correct URL with user id', () => {
      service.update(42, updateData).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/42`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockUpdatedUser);
    });

    it('should send correct request body', () => {
      service.update(1, updateData).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.body).toEqual(updateData);
      req.flush(mockUpdatedUser);
    });

    it('should return typed User response from update', (done) => {
      service.update(1, updateData).subscribe((user) => {
        expect(user.id).toBe(1);
        expect(user.role).toBe(updateData.role || 'recruiter');
        expect(user.is_active).toBe(false);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      req.flush(mockUpdatedUser);
    });

    it('should handle partial updates', () => {
      const partialUpdate: UserUpdate = { full_name: 'New Name' };
      service.update(1, partialUpdate).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.body).toEqual(partialUpdate);
      expect(req.request.body.role).toBeUndefined();
      req.flush(mockUpdatedUser);
    });
  });

  describe('delete()', () => {
    it('should delete user by id', () => {
      service.delete(1).subscribe(() => {
        expect(true).toBe(true);
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should build correct URL with user id', () => {
      service.delete(99).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/99`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should return void observable', (done) => {
      service.delete(1).subscribe(() => {
        expect(true).toBe(true); // Observable completed successfully
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP 404 error on get', (done) => {
      service.get(999).subscribe({
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/999`);
      req.flush('User not found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle HTTP 400 error on create with invalid data', (done) => {
      const invalidData: UserCreate = {
        email: 'invalid-email',
        full_name: '',
        password: '123',
        role: 'recruiter',
      };

      service.create(invalidData).subscribe({
        error: (error) => {
          expect(error.status).toBe(400);
          done();
        },
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush('Validation error', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle HTTP 403 error on update (permission denied)', (done) => {
      const updateData: UserUpdate = { full_name: 'Test' };

      service.update(1, updateData).subscribe({
        error: (error) => {
          expect(error.status).toBe(403);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    it('should handle HTTP 500 error on list', (done) => {
      service.list().subscribe({
        error: (error) => {
          expect(error.status).toBe(500);
          done();
        },
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('HttpParams Building', () => {
    it('should not include falsy values in params', () => {
      const params: UserListParams = {
        page: 0, // falsy but might be intentional
        page_size: 0,
        search: '',
      };
      service.list(params).subscribe();

      const req = httpMock.expectOne((request) => {
        // page: 0 and page_size: 0 are falsy, so should not be included
        return (
          request.url === apiUrl &&
          !request.params.has('page') &&
          !request.params.has('page_size') &&
          !request.params.has('search')
        );
      });

      expect(req.request.params.keys().length).toBe(0);
      req.flush({ items: [], total: 0, page: 0, page_size: 0, pages: 0 });
    });

    it('should properly handle boolean params', () => {
      const params: UserListParams = { is_active: true };
      service.list(params).subscribe();

      const req = httpMock.expectOne((request) => {
        return request.params.get('is_active') === 'true';
      });

      expect(req.request.params.get('is_active')).toBe('true');
      req.flush({ items: [], total: 0, page: 0, page_size: 0, pages: 0 });
    });

    it('should properly handle multiple enum values for role', () => {
      const roles: Array<'candidate' | 'recruiter' | 'leader' | 'admin'> = [
        'candidate',
        'recruiter',
        'leader',
        'admin',
      ];

      roles.forEach((role) => {
        service.list({ role }).subscribe();
        const req = httpMock.expectOne((request) => {
          return request.url === apiUrl && request.params.get('role') === role;
        });
        expect(req.request.params.get('role')).toBe(role);
        req.flush({ items: [], total: 0, page: 0, page_size: 0, pages: 0 });
      });
    });
  });
});
