import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { UserService } from '../../core/services/user.service';
import { User } from '../../shared/models/user.model';

@Component({
  selector: 'app-pending-approvals',
  standalone: true,
  imports: [
    CommonModule,
    NzTableModule,
    NzButtonModule,
    NzTagModule,
    NzModalModule,
    NzIconModule,
    NzEmptyModule,
    NzSpinModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-info">
          <h1 class="page-title">
            <span nz-icon nzType="audit" nzTheme="outline"></span>
            Ph&#234; duy&#7879;t t&#224;i kho&#7843;n HR
          </h1>
          <p class="page-subtitle">Danh s&#225;ch t&#224;i kho&#7843;n HR &#273;ang ch&#7901; ph&#234; duy&#7879;t</p>
        </div>
      </div>

      <div class="table-card">
        <nz-spin [nzSpinning]="loading">
          <nz-table
            #table
            [nzData]="users"
            [nzLoading]="loading"
            [nzTotal]="total"
            [nzPageSize]="pageSize"
            [nzPageIndex]="page"
            (nzPageIndexChange)="onPageChange($event)"
            nzShowSizeChanger
            [nzPageSizeOptions]="[10, 20, 50]"
            (nzPageSizeChange)="onPageSizeChange($event)"
            nzBordered
          >
            <thead>
              <tr>
                <th nzWidth="22%">Ho va ten</th>
                <th nzWidth="25%">Email</th>
                <th nzWidth="15%">Ma cong ty</th>
                <th nzWidth="18%">Ngay dang ky</th>
                <th nzWidth="20%" nzAlign="center">Hanh dong</th>
              </tr>
            </thead>
            <tbody>
              @for (user of table.data; track user.id) {
                <tr>
                  <td>
                    <div class="user-name">{{ user.full_name }}</div>
                    @if (user.phone) {
                      <div class="user-phone">{{ user.phone }}</div>
                    }
                  </td>
                  <td>{{ user.email }}</td>
                  <td>
                    @if (user.company_code) {
                      <nz-tag nzColor="blue">{{ user.company_code }}</nz-tag>
                    } @else {
                      <span class="no-data">-</span>
                    }
                  </td>
                  <td>{{ user.created_at | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td nzAlign="center">
                    <div class="action-buttons">
                      <button
                        nz-button
                        nzType="primary"
                        nzSize="small"
                        [nzLoading]="processingId === user.id"
                        (click)="confirmApprove(user)"
                      >
                        <span nz-icon nzType="check"></span>
                        Phe duyet
                      </button>
                      <button
                        nz-button
                        nzDanger
                        nzSize="small"
                        [nzLoading]="processingId === user.id"
                        (click)="confirmReject(user)"
                      >
                        <span nz-icon nzType="close"></span>
                        Tu choi
                      </button>
                    </div>
                  </td>
                </tr>
              }
              @empty {
                <tr>
                  <td colspan="5">
                    <nz-empty nzNotFoundContent="Khong co tai khoan nao dang cho phe duyet"></nz-empty>
                  </td>
                </tr>
              }
            </tbody>
          </nz-table>
        </nz-spin>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      margin-bottom: 24px;
    }

    .page-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 4px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .page-title span[nz-icon] {
      color: var(--color-primary);
    }

    .page-subtitle {
      font-size: 14px;
      color: var(--color-text-secondary);
      margin: 0;
    }

    .table-card {
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .user-name {
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .user-phone {
      font-size: 12px;
      color: var(--color-text-tertiary);
    }

    .no-data {
      color: var(--color-text-tertiary);
    }

    .action-buttons {
      display: flex;
      gap: 8px;
      justify-content: center;
    }
  `],
})
export class PendingApprovalsComponent implements OnInit {
  users: User[] = [];
  loading = false;
  total = 0;
  page = 1;
  pageSize = 20;
  processingId: number | null = null;

  constructor(
    private userService: UserService,
    private modal: NzModalService,
    private message: NzMessageService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.userService.listPendingApprovals({
      page: this.page,
      page_size: this.pageSize,
    }).subscribe({
      next: (res) => {
        this.users = res.items;
        this.total = res.total;
        this.loading = false;
      },
      error: () => {
        this.message.error('Khong the tai danh sach phe duyet');
        this.loading = false;
      },
    });
  }

  onPageChange(page: number): void {
    this.page = page;
    this.loadData();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.page = 1;
    this.loadData();
  }

  confirmApprove(user: User): void {
    this.modal.confirm({
      nzTitle: 'Xac nhan phe duyet',
      nzContent: `Phe duyet tai khoan <strong>${user.full_name}</strong> (${user.email})?`,
      nzOkText: 'Phe duyet',
      nzOkType: 'primary',
      nzCancelText: 'Huy',
      nzOnOk: () => this.doApprove(user),
    });
  }

  confirmReject(user: User): void {
    this.modal.confirm({
      nzTitle: 'Xac nhan tu choi',
      nzContent: `Tu choi tai khoan <strong>${user.full_name}</strong> (${user.email})?`,
      nzOkText: 'Tu choi',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Huy',
      nzOnOk: () => this.doReject(user),
    });
  }

  private doApprove(user: User): void {
    this.processingId = user.id;
    this.userService.approveUser(user.id).subscribe({
      next: () => {
        this.message.success(`Da phe duyet tai khoan ${user.full_name}`);
        this.processingId = null;
        this.loadData();
      },
      error: () => {
        this.message.error('Phe duyet that bai');
        this.processingId = null;
      },
    });
  }

  private doReject(user: User): void {
    this.processingId = user.id;
    this.userService.rejectUser(user.id).subscribe({
      next: () => {
        this.message.warning(`Da tu choi tai khoan ${user.full_name}`);
        this.processingId = null;
        this.loadData();
      },
      error: () => {
        this.message.error('Tu choi that bai');
        this.processingId = null;
      },
    });
  }
}
