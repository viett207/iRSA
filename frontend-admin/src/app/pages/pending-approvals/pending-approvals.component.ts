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
  templateUrl: './pending-approvals.component.html',
  styleUrl: './pending-approvals.component.scss',
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
        this.message.error('Không thể tải danh sách phê duyệt');
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
      nzTitle: 'Xác nhận phê duyệt',
      nzContent: `Phê duyệt tài khoản <strong>${user.full_name}</strong> (${user.email})?`,
      nzOkText: 'Phê duyệt',
      nzOkType: 'primary',
      nzCancelText: 'Hủy',
      nzOnOk: () => this.doApprove(user),
    });
  }

  confirmReject(user: User): void {
    this.modal.confirm({
      nzTitle: 'Xác nhận từ chối',
      nzContent: `Từ chối tài khoản <strong>${user.full_name}</strong> (${user.email})?`,
      nzOkText: 'Từ chối',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => this.doReject(user),
    });
  }

  private doApprove(user: User): void {
    this.processingId = user.id;
    this.userService.approveUser(user.id).subscribe({
      next: () => {
        this.message.success(`Đã phê duyệt tài khoản ${user.full_name}`);
        this.processingId = null;
        this.loadData();
      },
      error: () => {
        this.message.error('Phê duyệt thất bại');
        this.processingId = null;
      },
    });
  }

  private doReject(user: User): void {
    this.processingId = user.id;
    this.userService.rejectUser(user.id).subscribe({
      next: () => {
        this.message.warning(`Đã từ chối tài khoản ${user.full_name}`);
        this.processingId = null;
        this.loadData();
      },
      error: () => {
        this.message.error('Từ chối thất bại');
        this.processingId = null;
      },
    });
  }
}
