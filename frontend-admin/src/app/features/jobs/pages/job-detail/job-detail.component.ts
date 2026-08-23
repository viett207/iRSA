import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

import { JobService } from '../../services/job.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { environment } from '../../../../../environments/environment';
import { NotificationService } from '../../../../core/services/notification.service';
import { MatchDetailsModalComponent } from '../../components/match-details-modal.component';
import { InterviewScheduleModalComponent } from '../../components/interview-schedule-modal.component';
import { CompareCandidatesModalComponent } from '../../components/compare-candidates-modal.component';
import { CvJdCompareModalComponent } from '../../components/cv-jd-compare-modal.component';
import { AiEvaluationModalComponent } from '../../components/ai-evaluation-modal.component';
import { AiScoringProgressModalComponent } from '../../components/ai-scoring-progress-modal.component';
import { InterviewRoomModalComponent } from '../../components/interview-room-modal.component';
import {
  Job,
  JobStatus,
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  EMPLOYMENT_TYPE_LABELS,
  EDUCATION_LABELS,
  Applicant,
  ApplicationStatus,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  STATUS_TRANSITIONS,
  MatchDetailsResponse,
  CvJdCompareResponse,
  AiEvaluationResponse,
} from '../../models/job.model';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzPageHeaderModule,
    NzDescriptionsModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzStepsModule,
    NzTabsModule,
    NzCardModule,
    NzSpinModule,
    NzModalModule,
    NzInputModule,
    NzAlertModule,
    NzDividerModule,
    NzStatisticModule,
    NzGridModule,
    NzSpaceModule,
    NzTableModule,
    NzToolTipModule,
    NzListModule,
    NzDropDownModule,
    NzPopconfirmModule,
    NzPopoverModule,
    NzProgressModule,
    NzCheckboxModule,
  ],
  template: `
    <nz-spin [nzSpinning]="loading()">
      @if (job()) {
        <nz-page-header
          [nzTitle]="job()!.title_vi"
          nzBackIcon
          (nzBack)="onBack()"
        >
          <nz-page-header-tags>
            <nz-tag [nzColor]="getStatusColor(job()!.status)">
              {{ getStatusLabel(job()!.status) }}
            </nz-tag>
            @if (job()!.is_published) {
              <nz-tag nzColor="green">Đã đăng</nz-tag>
            }
          </nz-page-header-tags>

          <nz-page-header-extra>
            <nz-space>
              <!-- Edit -->
              @if (canEdit()) {
                <button
                  *nzSpaceItem
                  nz-button
                  [routerLink]="['/jobs', job()!.id, 'edit']"
                >
                  <span nz-icon nzType="edit"></span>
                  Chỉnh sửa
                </button>
              }

              <!-- Submit -->
              @if (canSubmit()) {
                <button
                  *nzSpaceItem
                  nz-button
                  nzType="primary"
                  (click)="submitJob()"
                >
                  <span nz-icon nzType="send"></span>
                  Gửi duyệt
                </button>
              }

              <!-- Approve -->
              @if (canApprove()) {
                <button
                  *nzSpaceItem
                  nz-button
                  nzType="primary"
                  (click)="approveJob()"
                >
                  <span nz-icon nzType="check"></span>
                  Phê duyệt
                </button>
                <button *nzSpaceItem nz-button nzDanger (click)="showRejectModal()">
                  <span nz-icon nzType="close"></span>
                  Từ chối
                </button>
              }

              <!-- Publish -->
              @if (canPublish()) {
                <button
                  *nzSpaceItem
                  nz-button
                  nzType="primary"
                  (click)="publishJob()"
                >
                  <span nz-icon nzType="global"></span>
                  Đăng tin
                </button>
              }

              <!-- Unpublish -->
              @if (canUnpublish()) {
                <button *nzSpaceItem nz-button (click)="unpublishJob()">
                  <span nz-icon nzType="stop"></span>
                  Gỡ tin
                </button>
              }

              <!-- Close -->
              @if (canClose()) {
                <button *nzSpaceItem nz-button nzDanger (click)="closeJob()">
                  <span nz-icon nzType="poweroff"></span>
                  Đóng tuyển
                </button>
              }
            </nz-space>
          </nz-page-header-extra>
        </nz-page-header>

        <!-- Workflow Steps -->
        <nz-card nzTitle="Tiến trình" style="margin-bottom: 16px">
          <nz-steps [nzCurrent]="currentStep()" nzSize="small">
            <nz-step nzTitle="Bản nháp"></nz-step>
            <nz-step nzTitle="Chờ duyệt"></nz-step>
            <nz-step nzTitle="Đã duyệt"></nz-step>
            <nz-step nzTitle="Đang tuyển"></nz-step>
          </nz-steps>
        </nz-card>

        <!-- Stats -->
        <div nz-row [nzGutter]="16" style="margin-bottom: 16px">
          <div nz-col [nzSpan]="6">
            <nz-card>
              <nz-statistic
                nzTitle="Ứng viên"
                [nzValue]="job()!.applications_count"
                [nzPrefix]="appIcon"
              ></nz-statistic>
              <ng-template #appIcon>
                <span nz-icon nzType="team"></span>
              </ng-template>
            </nz-card>
          </div>
          <div nz-col [nzSpan]="6">
            <nz-card>
              <nz-statistic
                nzTitle="Ngày tạo"
                [nzValue]="formatDate(job()!.created_at)"
              ></nz-statistic>
            </nz-card>
          </div>
          @if (job()!.published_at) {
            <div nz-col [nzSpan]="6">
              <nz-card>
                <nz-statistic
                  nzTitle="Ngày đăng"
                  [nzValue]="formatDate(job()!.published_at)"
                ></nz-statistic>
              </nz-card>
            </div>
          }
          @if (job()!.application_deadline) {
            <div nz-col [nzSpan]="6">
              <nz-card>
                <nz-statistic
                  nzTitle="Hạn nộp"
                  [nzValue]="formatDate(job()!.application_deadline)"
                ></nz-statistic>
              </nz-card>
            </div>
          }
        </div>

        <!-- Tabs -->
        <nz-tabset>
          <!-- Info Tab -->
          <nz-tab nzTitle="Thông tin">
            <nz-card nzTitle="Thông tin cơ bản">
              <nz-descriptions nzBordered [nzColumn]="2">
                <nz-descriptions-item nzTitle="Ngành nghề">
                  {{ job()!.department || '-' }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="Địa điểm">
                  {{ job()!.location || '-' }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="Hình thức">
                  {{ getEmploymentTypeLabel(job()!.employment_type) }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="Mức lương">
                  {{ formatSalary(job()!.salary_min, job()!.salary_max) || 'Thỏa thuận' }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="Người tạo">
                  {{ job()!.creator_name }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="Người duyệt">
                  {{ job()!.approver_name || '-' }}
                </nz-descriptions-item>
              </nz-descriptions>
            </nz-card>

            <nz-card nzTitle="Mô tả (Tiếng Việt)" style="margin-top: 16px">
              <div class="content-section">
                <h4>Mô tả công việc</h4>
                <pre class="text-content">{{ job()!.description_vi || 'Chưa có' }}</pre>

                <nz-divider></nz-divider>

                <h4>Yêu cầu</h4>
                <pre class="text-content">{{ job()!.requirements_vi || 'Chưa có' }}</pre>
              </div>
            </nz-card>
          </nz-tab>

          <!-- Criteria Tab -->
          <nz-tab nzTitle="Tiêu chí tuyển dụng">
            @if (job()!.criteria) {
              <nz-card nzTitle="Kỹ năng">
                <nz-descriptions nzBordered [nzColumn]="1">
                  <nz-descriptions-item nzTitle="Kỹ năng bắt buộc">
                    @for (skill of job()!.criteria!.must_have_skills; track skill) {
                      <nz-tag nzColor="red">{{ skill }}</nz-tag>
                    }
                    @if (!job()!.criteria!.must_have_skills.length) {
                      <span>-</span>
                    }
                  </nz-descriptions-item>
                  <nz-descriptions-item nzTitle="Kỹ năng ưu tiên">
                    @for (skill of job()!.criteria!.nice_to_have_skills; track skill) {
                      <nz-tag nzColor="blue">{{ skill }}</nz-tag>
                    }
                    @if (!job()!.criteria!.nice_to_have_skills.length) {
                      <span>-</span>
                    }
                  </nz-descriptions-item>
                </nz-descriptions>
              </nz-card>

              <nz-card nzTitle="Kinh nghiệm & Học vấn" style="margin-top: 16px">
                <nz-descriptions nzBordered [nzColumn]="2">
                  <nz-descriptions-item nzTitle="Kinh nghiệm tối thiểu">
                    {{ job()!.criteria!.min_experience_years }} năm
                  </nz-descriptions-item>
                  <nz-descriptions-item nzTitle="Kinh nghiệm tối đa">
                    {{ job()!.criteria!.max_experience_years ?? 'Không giới hạn' }}
                    {{ job()!.criteria!.max_experience_years ? 'năm' : '' }}
                  </nz-descriptions-item>
                  <nz-descriptions-item nzTitle="Học vấn tối thiểu">
                    {{ getEducationLabel(job()!.criteria!.min_education) }}
                  </nz-descriptions-item>
                </nz-descriptions>
              </nz-card>
            } @else {
              <nz-alert
                nzType="info"
                nzMessage="Chưa thiết lập tiêu chí tuyển dụng"
                nzShowIcon
              ></nz-alert>
            }
          </nz-tab>

          <!-- Applicants Tab -->
          <nz-tab nzTitle="Ứng viên" (nzSelect)="onApplicantsTabSelect()">
            <!-- Toolbar: Sort + AI Evaluate All + Compare -->
            @if (applicants().length > 0) {
              <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px">
                <nz-space [nzSize]="8">
                  <button
                    *nzSpaceItem
                    nz-button
                    nzSize="small"
                    [nzType]="sortBy === 'date' ? 'primary' : 'default'"
                    (click)="changeSortBy('date')"
                  >
                    <span nz-icon nzType="calendar"></span>
                    Ngày nộp
                  </button>
                  <button
                    *nzSpaceItem
                    nz-button
                    nzSize="small"
                    [nzType]="sortBy === 'ai_score' ? 'primary' : 'default'"
                    (click)="changeSortBy('ai_score')"
                  >
                    <span nz-icon nzType="robot"></span>
                    Điểm AI cao nhất
                  </button>
                </nz-space>

                <nz-space [nzSize]="8">
                  @if (isOwner()) {
                    <button
                      *nzSpaceItem
                      nz-button
                      nzType="primary"
                      nzSize="small"
                      (click)="aiEvaluateAll()"
                      [nzLoading]="evaluatingAll"
                    >
                      <span nz-icon nzType="robot"></span>
                      Chấm AI tất cả
                    </button>
                  }
                  <button
                    *nzSpaceItem
                    nz-button
                    nzType="default"
                    nzSize="small"
                    [disabled]="compareSelected.size !== 2"
                    (click)="openCompare()"
                    nz-tooltip
                    [nzTooltipTitle]="compareSelected.size !== 2 ? 'Chọn đúng 2 ứng viên để so sánh' : 'So sánh 2 ứng viên'"
                  >
                    <span nz-icon nzType="swap"></span>
                    So sánh ({{ compareSelected.size }}/2)
                  </button>
                </nz-space>
              </div>
            }

            <nz-table
              #applicantsTable
              [nzData]="applicants()"
              [nzLoading]="applicantsLoading()"
              [nzTotal]="applicantsTotal()"
              [nzPageIndex]="applicantsPage"
              [nzPageSize]="20"
              [nzFrontPagination]="false"
              (nzPageIndexChange)="onApplicantsPageChange($event)"
              nzSize="middle"
            >
              <thead>
                <tr>
                  <th nzWidth="4%"></th>
                  <th nzWidth="18%">Ứng viên</th>
                  <th nzWidth="18%">Đánh giá AI</th>
                  <th nzWidth="11%">Trạng thái</th>
                  <th nzWidth="10%">Ngày nộp</th>
                  <th nzWidth="24%">Hồ sơ & Đối chiếu</th>
                  <th nzWidth="15%">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (app of applicantsTable.data; track app.id) {
                  <tr>
                    <td>
                      <label nz-checkbox
                        [nzChecked]="compareSelected.has(app.id)"
                        [nzDisabled]="!compareSelected.has(app.id) && compareSelected.size >= 2"
                        (nzCheckedChange)="toggleCompare(app.id, $event)">
                      </label>
                    </td>
                    <td>
                      <strong>{{ app.candidate_name }}</strong>
                      <br />
                      <small style="color: #888">{{ app.candidate_email }}</small>
                    </td>
                    <td>
                      @if (app.ai_score != null || app.has_ai_evaluation) {
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
                          <nz-progress
                            [nzPercent]="app.ai_score || 0"
                            nzType="circle"
                            [nzWidth]="38"
                            [nzStrokeColor]="getScoreColor(app.ai_score || 0)"
                            [nzFormat]="scoreFormat"
                            (click)="openAiEvaluation(app)"
                            style="cursor: pointer"
                            nz-tooltip
                            nzTooltipTitle="Bấm để xem phân tích AI chi tiết"
                          ></nz-progress>
                          <div style="display: flex; flex-direction: column; gap: 2px">
                            <nz-tag [nzColor]="getRecommendationColor(app.ai_recommendation)" style="font-size: 11px; margin: 0">
                              {{ getRecommendationLabel(app.ai_recommendation) }}
                            </nz-tag>
                            <div style="display: flex; gap: 4px; align-items: center">
                              <button
                                nz-button
                                nzType="link"
                                nzSize="small"
                                (click)="openAiEvaluation(app)"
                                style="padding: 0; font-size: 11px; height: 20px"
                              >
                                <span nz-icon nzType="file-search"></span> Xem kết quả
                              </button>
                              @if (isOwner()) {
                                <button
                                  nz-button
                                  nzType="link"
                                  nzSize="small"
                                  (click)="triggerAi(app)"
                                  [nzLoading]="evaluatingAppId === app.id"
                                  nz-tooltip
                                  nzTooltipTitle="Chấm lại AI"
                                  style="padding: 0; color: #fa8c16; height: 20px"
                                >
                                  <span nz-icon nzType="reload"></span>
                                </button>
                              }
                            </div>
                          </div>
                        </div>
                      } @else if (evaluatingAppId === app.id) {
                        <div style="display: flex; flex-direction: column; gap: 3px">
                          <div style="display: flex; align-items: center; gap: 6px">
                            <nz-spin nzSimple nzSize="small"></nz-spin>
                            <span style="color: #1890ff; font-weight: 500; font-size: 11px">{{ evaluatingStepText }}</span>
                          </div>
                          <button
                            nz-button
                            nzType="link"
                            nzSize="small"
                            (click)="openScoringProgress(app)"
                            style="padding: 0; font-size: 11px; height: 18px; text-align: left; color: #096dd9"
                          >
                            <span nz-icon nzType="dashboard"></span> Xem tiến trình chi tiết
                          </button>
                        </div>
                      } @else if (isOwner()) {
                        <button
                          nz-button
                          nzSize="small"
                          nzType="primary"
                          nzGhost
                          (click)="triggerAi(app)"
                          [nzLoading]="evaluatingAppId === app.id"
                          nz-tooltip
                          nzTooltipTitle="Kích hoạt AI chấm điểm và tạo câu hỏi phỏng vấn"
                        >
                          <span nz-icon nzType="robot"></span>
                          Chấm AI
                        </button>
                      } @else {
                        <nz-tag>Chưa chấm AI</nz-tag>
                      }
                    </td>
                    <td>
                      <nz-tag [nzColor]="getAppStatusColor(app.status)">
                        {{ getAppStatusLabel(app.status) }}
                      </nz-tag>
                    </td>
                    <td>{{ formatDate(app.submitted_at) }}</td>
                    <td>
                      <div style="display: flex; gap: 4px; flex-wrap: wrap">
                        <button
                          nz-button
                          nzSize="small"
                          (click)="viewResume(app)"
                          nz-tooltip
                          nzTooltipTitle="Xem file CV PDF"
                        >
                          <span nz-icon nzType="file-pdf"></span>
                          Xem CV
                        </button>
                        <button
                          nz-button
                          nzSize="small"
                          (click)="downloadResume(app)"
                          [nzLoading]="downloadingAppId === app.id"
                          nz-tooltip
                          nzTooltipTitle="Tải CV"
                        >
                          <span nz-icon nzType="download"></span>
                        </button>
                        <button
                          nz-button
                          nzSize="small"
                          nzType="default"
                          (click)="openCvJdCompare(app)"
                          nz-tooltip
                          nzTooltipTitle="Đối chiếu trực quan CV và JD (Highlight khớp nhau - Không tính điểm)"
                          style="color: #1890ff; border-color: #91d5ff"
                        >
                          <span nz-icon nzType="diff"></span>
                          Đối chiếu CV & JD
                        </button>
                      </div>
                    </td>
                    <td>
                      @if (isOwner()) {
                        <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center">
                          <!-- Status = submitted / reviewing: Quick Approve to Shortlisted -->
                          @if (app.status === 'submitted' || app.status === 'reviewing') {
                            @if (app.ai_score != null || app.has_ai_evaluation) {
                              <button
                                nz-button
                                nzSize="small"
                                nzType="primary"
                                style="background: #52c41a; border-color: #52c41a"
                                nz-popconfirm
                                nzPopconfirmTitle="Duyệt ứng viên này ĐẠT sơ loại CV và chuyển sang Vòng 1: Hẹn lịch phỏng vấn?"
                                (nzOnConfirm)="approveToShortlist(app)"
                                nz-tooltip
                                nzTooltipTitle="Duyệt đạt sơ loại CV ➔ Đi đến Hẹn lịch PV"
                              >
                                <span nz-icon nzType="check-circle"></span>
                                Duyệt đạt sơ loại
                              </button>
                            }
                          }

                          <!-- Status = shortlisted: Schedule Interview -->
                          @if (app.status === 'shortlisted') {
                            <button
                              nz-button
                              nzSize="small"
                              nzType="primary"
                              nz-tooltip
                              nzTooltipTitle="Lên lịch phỏng vấn cho ứng viên"
                              (click)="openScheduleInterview(app)"
                            >
                              <span nz-icon nzType="calendar"></span>
                              Hẹn lịch PV
                            </button>
                          }

                          <!-- Status = interviewing: Enter Interview Room -->
                          @if (app.status === 'interviewing') {
                            <button
                              nz-button
                              nzSize="small"
                              nzType="primary"
                              style="background: #722ed1; border-color: #722ed1"
                              nz-tooltip
                              nzTooltipTitle="Vào phòng phỏng vấn: Ghi âm từng câu & Chấm AI"
                              (click)="openInterviewRoom(app)"
                            >
                              <span nz-icon nzType="audio"></span>
                              Vào phòng PV
                            </button>
                          }

                          <!-- Status = offered / hired: View Interview Room Record -->
                          @if (app.status === 'offered' || app.status === 'hired') {
                            <button
                              nz-button
                              nzSize="small"
                              nzType="default"
                              style="color: #722ed1; border-color: #d3adf7"
                              nz-tooltip
                              nzTooltipTitle="Xem lại biên bản, câu hỏi & ghi âm phỏng vấn"
                              (click)="openInterviewRoom(app)"
                            >
                              <span nz-icon nzType="solution"></span>
                              Biên bản PV
                            </button>
                          }

                          <!-- Flexible dropdown for any transition -->
                          @if (getAvailableTransitions(app.status).length > 0) {
                            <button
                              nz-button
                              nzSize="small"
                              nz-dropdown
                              [nzDropdownMenu]="statusMenu"
                              nzPlacement="bottomRight"
                            >
                              <span nz-icon nzType="ellipsis"></span>
                            </button>
                            <nz-dropdown-menu #statusMenu="nzDropdownMenu">
                              <ul nz-menu>
                                @for (s of getAvailableTransitions(app.status); track s) {
                                  <li
                                    nz-menu-item
                                    (click)="updateStatus(app, s)"
                                  >
                                    <nz-tag [nzColor]="getAppStatusColor(s)" style="margin-right: 6px">
                                      {{ getAppStatusLabel(s) }}
                                    </nz-tag>
                                  </li>
                                }
                              </ul>
                            </nz-dropdown-menu>
                          }
                        </div>
                      } @else {
                        <span style="color: #999; font-size: 12px">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </nz-table>
          </nz-tab>
        </nz-tabset>
      }
    </nz-spin>

    <!-- Reject Modal -->
    <nz-modal
      [(nzVisible)]="rejectModalVisible"
      nzTitle="Từ chối tin tuyển dụng"
      (nzOnCancel)="rejectModalVisible = false"
      (nzOnOk)="rejectJob()"
    >
      <ng-container *nzModalContent>
        <p>Vui lòng nhập lý do từ chối:</p>
        <textarea
          nz-input
          [(ngModel)]="rejectReason"
          [nzAutosize]="{ minRows: 3, maxRows: 6 }"
          placeholder="Lý do từ chối..."
        ></textarea>
      </ng-container>
    </nz-modal>

    <!-- Resume PDF Viewer Modal -->
    <nz-modal
      [(nzVisible)]="resumeModalVisible"
      [nzTitle]="'CV: ' + (resumeModalFilename || '')"
      (nzOnCancel)="resumeModalVisible = false"
      [nzFooter]="null"
      [nzWidth]="900"
      nzCentered
    >
      <ng-container *nzModalContent>
        @if (resumeModalLoading) {
          <div style="text-align: center; padding: 40px">
            <nz-spin nzSimple></nz-spin>
            <p style="margin-top: 12px; color: #888">Đang tải CV...</p>
          </div>
        } @else if (resumeModalUrl) {
          <object
            [data]="resumeModalUrl"
            type="application/pdf"
            style="width: 100%; height: 75vh; border: none; border-radius: 4px"
          >
            <p style="text-align: center; padding: 40px">
              Trình duyệt không hỗ trợ xem PDF trực tiếp.
              <a [href]="resumeModalUrl" target="_blank" style="color: #1890ff">Bấm để mở PDF</a>
            </p>
          </object>
        }
      </ng-container>
    </nz-modal>
  `,
  styles: [
    `
      .content-section h4 {
        margin-bottom: 8px;
        font-weight: 500;
      }
      .text-content {
        white-space: pre-wrap;
        font-family: inherit;
        margin: 0;
        background: transparent;
        border: none;
        padding: 0;
      }
    `,
  ],
})
export class JobDetailComponent implements OnInit {
  job = signal<Job | null>(null);
  loading = signal(false);

  // Applicants tab state
  applicants = signal<Applicant[]>([]);
  applicantsTotal = signal(0);
  applicantsLoading = signal(false);
  applicantsPage = 1;
  private applicantsLoaded = false;

  rejectModalVisible = false;
  rejectReason = '';
  downloadingAppId: number | null = null;
  evaluatingAppId: number | null = null;
  evaluatingAll = false;
  sortBy: 'date' | 'ai_score' = 'date';
  compareSelected = new Set<number>();

  // Resume viewer modal state
  resumeModalVisible = false;
  resumeModalLoading = false;
  resumeModalUrl: SafeResourceUrl | null = null;
  resumeModalFilename = '';

  currentStep = computed(() => {
    const j = this.job();
    if (!j) return 0;
    switch (j.status) {
      case 'draft':
      case 'rejected':
        return 0;
      case 'pending_approval':
        return 1;
      case 'approved':
        return 2;
      case 'active':
      case 'closed':
        return 3;
      default:
        return 0;
    }
  });

  private notifSub?: import('rxjs').Subscription;

  constructor(
    private jobService: JobService,
    private authService: AuthService,
    private message: NzMessageService,
    private modal: NzModalService,
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private notificationSvc: NotificationService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.loadJob(+params['id']);
      }
    });
    // Auto-reload when data changes
    this.notifSub = this.notificationSvc.dataChanged$.subscribe((n) => {
      if (['application', 'job', 'interview'].includes(n.type)) {
        const j = this.job();
        if (j) {
          this.loadJob(j.id);
          if (this.applicantsLoaded) this.loadApplicants();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
  }

  loadJob(id: number): void {
    this.loading.set(true);
    this.jobService.get(id).subscribe({
      next: (job) => {
        this.job.set(job);
        this.loading.set(false);
      },
      error: () => {
        this.message.error('Không thể tải thông tin việc làm');
        this.loading.set(false);
        this.router.navigate(['/jobs']);
      },
    });
  }

  getStatusLabel(status: JobStatus): string {
    return JOB_STATUS_LABELS[status] || status;
  }

  getStatusColor(status: JobStatus): string {
    return JOB_STATUS_COLORS[status] || 'default';
  }

  getEmploymentTypeLabel(type?: string): string {
    if (!type) return '-';
    return EMPLOYMENT_TYPE_LABELS[type as keyof typeof EMPLOYMENT_TYPE_LABELS] || type;
  }

  formatSalary(min?: number, max?: number): string {
    if (min != null && max != null && min > 0 && max > 0) {
      return min === max ? `${min} triệu` : `${min} - ${max} triệu`;
    }
    if (max != null && max > 0) return `Lên đến ${max} triệu`;
    if (min != null && min > 0) return `Từ ${min} triệu`;
    return '';
  }

  getEducationLabel(level?: string | null): string {
    if (!level) return '-';
    return EDUCATION_LABELS[level] || level;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // Permission: HR/Admin/Recruiter or owner can operate
  isOwner(): boolean {
    const j = this.job();
    const u = this.authService.user();
    if (!j || !u) return false;
    return this.authService.hasRole('admin', 'hr', 'leader', 'manager', 'recruiter') || j.created_by === u.id;
  }

  canEdit(): boolean {
    const j = this.job();
    return !!j && ['draft', 'rejected'].includes(j.status) && this.isOwner();
  }

  canSubmit(): boolean {
    const j = this.job();
    return !!j && ['draft', 'rejected'].includes(j.status) && this.isOwner();
  }

  canApprove(): boolean {
    const j = this.job();
    return (
      !!j &&
      j.status === 'pending_approval' &&
      this.authService.hasRole('leader', 'admin')
    );
  }

  canPublish(): boolean {
    const j = this.job();
    return !!j && j.status === 'approved' && this.isOwner();
  }

  canUnpublish(): boolean {
    const j = this.job();
    return !!j && j.status === 'active' && this.isOwner();
  }

  canClose(): boolean {
    const j = this.job();
    return !!j && j.status === 'active' && this.isOwner();
  }

  // Actions
  submitJob(): void {
    const j = this.job();
    if (!j) return;

    this.jobService.submit(j.id).subscribe({
      next: (updated) => {
        this.job.set(updated);
        this.message.success('Đã gửi yêu cầu phê duyệt');
      },
      error: () => this.message.error('Không thể gửi yêu cầu'),
    });
  }

  approveJob(): void {
    const j = this.job();
    if (!j) return;

    this.modal.confirm({
      nzTitle: 'Phê duyệt tin tuyển dụng?',
      nzContent: `Bạn có chắc muốn phê duyệt "${j.title_vi}"?`,
      nzOnOk: () => {
        this.jobService.approve(j.id).subscribe({
          next: (updated) => {
            this.job.set(updated);
            this.message.success('Đã phê duyệt');
          },
          error: () => this.message.error('Không thể phê duyệt'),
        });
      },
    });
  }

  showRejectModal(): void {
    this.rejectReason = '';
    this.rejectModalVisible = true;
  }

  rejectJob(): void {
    const j = this.job();
    if (!j) return;

    if (!this.rejectReason.trim()) {
      this.message.warning('Vui lòng nhập lý do từ chối');
      return;
    }

    this.jobService.reject(j.id, { reason: this.rejectReason }).subscribe({
      next: (updated) => {
        this.job.set(updated);
        this.rejectModalVisible = false;
        this.message.success('Đã từ chối');
      },
      error: () => this.message.error('Không thể từ chối'),
    });
  }

  publishJob(): void {
    const j = this.job();
    if (!j) return;

    this.jobService.publish(j.id).subscribe({
      next: (updated) => {
        this.job.set(updated);
        this.message.success('Đã đăng tin tuyển dụng');
      },
      error: () => this.message.error('Không thể đăng tin'),
    });
  }

  unpublishJob(): void {
    const j = this.job();
    if (!j) return;

    this.jobService.unpublish(j.id).subscribe({
      next: (updated) => {
        this.job.set(updated);
        this.message.success('Đã gỡ tin tuyển dụng');
      },
      error: () => this.message.error('Không thể gỡ tin'),
    });
  }

  closeJob(): void {
    const j = this.job();
    if (!j) return;

    this.modal.confirm({
      nzTitle: 'Đóng tuyển dụng?',
      nzContent: `Tin "${j.title_vi}" sẽ không nhận ứng viên mới. Tiếp tục?`,
      nzOnOk: () => {
        this.jobService.close(j.id).subscribe({
          next: (updated) => {
            this.job.set(updated);
            this.message.success('Đã đóng tuyển dụng');
          },
          error: () => this.message.error('Không thể đóng'),
        });
      },
    });
  }

  // --- Applicants tab ---

  onApplicantsTabSelect(): void {
    if (!this.applicantsLoaded) {
      this.loadApplicants();
      this.applicantsLoaded = true;
    }
  }

  loadApplicants(): void {
    const j = this.job();
    if (!j) return;

    this.applicantsLoading.set(true);
    this.jobService
      .getApplications(j.id, {
        page: this.applicantsPage,
        size: 20,
        sort_by: this.sortBy,
      })
      .subscribe({
        next: (res) => {
          this.applicants.set(res.items);
          this.applicantsTotal.set(res.total);
          this.applicantsLoading.set(false);
        },
        error: () => {
          this.message.error('Không thể tải danh sách ứng viên');
          this.applicantsLoading.set(false);
        },
      });
  }

  onApplicantsPageChange(page: number): void {
    this.applicantsPage = page;
    this.loadApplicants();
  }

  getAppStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      submitted: 'Đã nộp',
      reviewing: 'Đang xét',
      shortlisted: 'Lọt vòng',
      interviewing: 'Phỏng vấn',
      offered: 'Đề nghị',
      hired: 'Tuyển',
      rejected: 'Từ chối',
    };
    return labels[status] || status;
  }

  getAppStatusColor(status: string): string {
    const colors: Record<string, string> = {
      submitted: 'default',
      reviewing: 'processing',
      shortlisted: 'blue',
      interviewing: 'cyan',
      offered: 'gold',
      hired: 'success',
      rejected: 'error',
    };
    return colors[status] || 'default';
  }

  // --- AI Evaluation & Matching ---

  scoreFormat = (percent: number): string => `${Math.round(percent)}`;

  getScoreColor(score: number): string {
    if (score >= 70) return '#52c41a';
    if (score >= 40) return '#faad14';
    return '#ff4d4f';
  }

  getRecommendationColor(rec?: string | null): string {
    const colors: Record<string, string> = {
      STRONG_FIT: 'success',
      GOOD_FIT: 'green',
      PARTIAL_FIT: 'warning',
      WEAK_FIT: 'orange',
      NOT_FIT: 'error',
    };
    return (rec && colors[rec]) || 'default';
  }

  getRecommendationLabel(rec?: string | null): string {
    const labels: Record<string, string> = {
      STRONG_FIT: 'Rất phù hợp',
      GOOD_FIT: 'Phù hợp',
      PARTIAL_FIT: 'Phù hợp 1 phần',
      WEAK_FIT: 'Ít phù hợp',
      NOT_FIT: 'Không phù hợp',
    };
    return (rec && labels[rec]) || rec || 'Chưa chấm AI';
  }

  evaluatingStepText = 'Bước 1: Đang trích xuất cấu trúc CV...';
  private evaluatingTimer: any = null;

  triggerAi(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    this.evaluatingAppId = app.id;
    this.startEvaluatingStepAnimation();

    // Open Live Progress Modal
    this.openScoringProgress(app);

    this.jobService.triggerAiEvaluation(j.id, app.id).subscribe({
      next: () => {
        setTimeout(() => this.loadApplicants(), 3000);
        setTimeout(() => this.loadApplicants(), 6000);
        setTimeout(() => {
          this.evaluatingAppId = null;
          if (this.evaluatingTimer) clearInterval(this.evaluatingTimer);
          this.loadApplicants();
        }, 11000);
      },
      error: () => {
        this.evaluatingAppId = null;
        if (this.evaluatingTimer) clearInterval(this.evaluatingTimer);
        this.message.error('Lỗi khi gửi yêu cầu phân tích AI');
      },
    });
  }

  openScoringProgress(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    this.modal.create({
      nzContent: AiScoringProgressModalComponent,
      nzData: {
        jobId: j.id,
        appId: app.id,
        candidateName: app.candidate_name,
        jobTitle: j.title_vi || 'Tuyển dụng',
      },
      nzFooter: null,
      nzWidth: 640,
      nzCentered: true,
      nzMaskClosable: false,
    });
  }

  private startEvaluatingStepAnimation(): void {
    if (this.evaluatingTimer) clearInterval(this.evaluatingTimer);
    let sec = 0;
    const stepTexts = [
      'Bước 1: Đang trích xuất & phân đoạn CV...',
      'Bước 2: AI Agent đang đánh giá năng lực...',
      'Bước 3: Đang kiểm chứng chống ảo giác...',
      'Bước 4: Đang sinh câu hỏi & cẩm nang HR...',
      'Bước 5: Đang hoàn tất lưu kết quả...',
    ];
    this.evaluatingStepText = stepTexts[0];

    this.evaluatingTimer = setInterval(() => {
      sec += 1;
      if (sec >= 2 && sec < 5) this.evaluatingStepText = stepTexts[1];
      else if (sec >= 5 && sec < 8) this.evaluatingStepText = stepTexts[2];
      else if (sec >= 8 && sec < 10) this.evaluatingStepText = stepTexts[3];
      else if (sec >= 10) this.evaluatingStepText = stepTexts[4];
    }, 1000);
  }

  aiEvaluateAll(): void {
    const j = this.job();
    if (!j) return;

    this.evaluatingAll = true;
    this.jobService.triggerAiEvaluateAll(j.id).subscribe({
      next: (res) => {
        this.message.success(`Đang phân tích AI cho ${res.count} ứng viên`);
        setTimeout(() => this.loadApplicants(), 4000);
        setTimeout(() => this.loadApplicants(), 8000);
        setTimeout(() => {
          this.evaluatingAll = false;
          this.loadApplicants();
        }, 14000);
      },
      error: () => {
        this.evaluatingAll = false;
        this.message.error('Không thể kích hoạt phân tích AI');
      },
    });
  }

  openAiEvaluation(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    if (!app.has_ai_evaluation && app.ai_score == null) {
      this.message.info('Chưa có kết quả đánh giá AI. Hãy bấm "Chấm AI" trước.');
      return;
    }

    const modalData = {
      data: null as AiEvaluationResponse | null,
      loading: true,
      error: null as string | null,
    };

    this.modal.create({
      nzTitle: `Đánh giá AI - ${app.candidate_name}`,
      nzContent: AiEvaluationModalComponent,
      nzWidth: 'min(1200px, calc(100vw - 48px))',
      nzBodyStyle: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' },
      nzData: modalData,
      nzFooter: null,
      nzCentered: true,
    });

    this.jobService.getAiEvaluation(j.id, app.id).subscribe({
      next: (res) => {
        modalData.data = res;
        modalData.loading = false;
      },
      error: () => {
        modalData.loading = false;
        modalData.error = 'Không thể tải kết quả đánh giá AI.';
      },
    });
  }

  openCvJdCompare(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    const modalData = {
      data: null as CvJdCompareResponse | null,
      loading: true,
      error: null as string | null,
    };

    this.modal.create({
      nzTitle: `Đối chiếu trực quan CV & JD: ${app.candidate_name}`,
      nzContent: CvJdCompareModalComponent,
      nzData: modalData,
      nzFooter: null,
      nzWidth: 'min(1250px, calc(100vw - 32px))',
      nzCentered: true,
    });

    this.jobService.getCvJdCompare(j.id, app.id).subscribe({
      next: (res) => {
        modalData.data = res;
        modalData.loading = false;
      },
      error: () => {
        modalData.loading = false;
        modalData.error = 'Không thể tải dữ liệu đối chiếu CV và JD.';
      },
    });
  }

  changeSortBy(sort: 'date' | 'ai_score'): void {
    if (this.sortBy === sort) return;
    this.sortBy = sort;
    this.applicantsPage = 1;
    this.loadApplicants();
  }

  toggleCompare(appId: number, checked: boolean): void {
    if (checked) {
      this.compareSelected.add(appId);
    } else {
      this.compareSelected.delete(appId);
    }
  }

  openCompare(): void {
    const j = this.job();
    if (!j || this.compareSelected.size !== 2) return;

    const selected = this.applicants().filter(a => this.compareSelected.has(a.id));
    if (selected.length !== 2) return;

    this.modal.create({
      nzTitle: 'So sánh ứng viên',
      nzContent: CompareCandidatesModalComponent,
      nzData: { jobId: j.id, candidates: selected },
      nzFooter: null,
      nzWidth: 800,
      nzCentered: true,
    });
  }

  openScheduleInterview(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    const ref = this.modal.create({
      nzTitle: `Đặt lịch phỏng vấn: ${app.candidate_name}`,
      nzContent: InterviewScheduleModalComponent,
      nzFooter: null,
      nzWidth: 560,
      nzCentered: true,
    });

    // Pass data to modal component
    const instance = ref.getContentComponent();
    instance.jobId = j.id;
    instance.appId = app.id;
    instance.candidateName = app.candidate_name;

    // Reload applicants when interview scheduled (status may change to interviewing)
    ref.afterClose.subscribe((result) => {
      if (result) {
        this.loadApplicants();
      }
    });
  }

  openInterviewRoom(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    const ref = this.modal.create({
      nzTitle: `Phòng phỏng vấn: ${app.candidate_name} - ${j.title_vi}`,
      nzContent: InterviewRoomModalComponent,
      nzData: {
        jobId: j.id,
        appId: app.id,
        candidateName: app.candidate_name,
      },
      nzFooter: null,
      nzWidth: 'min(1250px, calc(100vw - 32px))',
      nzBodyStyle: { maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' },
      nzCentered: true,
      nzMaskClosable: false,
    });

    ref.afterClose.subscribe(() => {
      this.loadApplicants();
    });
  }


  // --- Status management ---

  getAvailableTransitions(status: string): ApplicationStatus[] {
    const all: ApplicationStatus[] = ['submitted', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected'];
    const list = STATUS_TRANSITIONS[status] || all;
    return list.filter((s) => s !== status);
  }

  approveToShortlist(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    this.jobService.updateApplicationStatus(j.id, app.id, 'shortlisted').subscribe({
      next: (updated) => {
        this.applicants.update((list) =>
          list.map((a) => (a.id === app.id ? { ...a, status: updated.status, public_status: updated.public_status, updated_at: updated.updated_at } : a))
        );
        this.message.success(
          `Đã duyệt "${app.candidate_name}" ĐẠT sơ loại CV! Ứng viên đã được chuyển sang Vòng 1: Hẹn lịch phỏng vấn.`,
          { nzDuration: 4500 }
        );
      },
      error: (err) => {
        const detail = err?.error?.detail || 'Không thể duyệt sơ loại ứng viên';
        this.message.error(detail);
      },
    });
  }

  updateStatus(app: Applicant, newStatus: ApplicationStatus): void {
    const j = this.job();
    if (!j) return;

    this.jobService.updateApplicationStatus(j.id, app.id, newStatus).subscribe({
      next: (updated) => {
        this.applicants.update((list) =>
          list.map((a) => (a.id === app.id ? { ...a, status: updated.status, public_status: updated.public_status, updated_at: updated.updated_at } : a))
        );
        this.message.success(`Đã chuyển trạng thái sang "${this.getAppStatusLabel(newStatus)}"`);
      },
      error: (err) => {
        const detail = err?.error?.detail || 'Không thể cập nhật trạng thái';
        this.message.error(detail);
      },
    });
  }

  // --- Resume viewer ---

  downloadResume(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    this.downloadingAppId = app.id;
    this.jobService.downloadResume(j.id, app.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = app.resume_filename || `${app.candidate_name}_CV.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloadingAppId = null;
      },
      error: () => {
        this.downloadingAppId = null;
        this.message.error('Không thể tải CV');
      },
    });
  }

  viewResume(app: Applicant): void {
    const j = this.job();
    if (!j) return;

    this.resumeModalFilename = app.resume_filename;
    // Use backend proxy to serve PDF inline (avoids MinIO CORS/X-Frame issues)
    const token = localStorage.getItem('access_token');
    const url = `${environment.apiUrl}/jobs/${j.id}/applications/${app.id}/resume-view?token=${token}`;
    this.resumeModalUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.resumeModalLoading = false;
    this.resumeModalVisible = true;
  }

  onBack(): void {
    this.router.navigate(['/jobs']);
  }
}
