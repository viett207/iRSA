import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzSliderModule } from 'ng-zorro-antd/slider';

import { JobService } from '../../services/job.service';
import {
  Job,
  JobCreate,
  JobUpdate,
  EMPLOYMENT_TYPE_LABELS,
  EDUCATION_LABELS,
  VIETNAM_LOCATIONS,
} from '../../models/job.model';
import { VIETNAMESE_INDUSTRIES } from '../../../../shared/constants/vietnamese-industries';
import { CompanyService } from '../../../../core/services/company.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Company } from '../../../../pages/companies/models/company-api.model';

@Component({
  selector: 'app-job-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzSelectModule,
    NzDatePickerModule,
    NzTabsModule,
    NzTagModule,
    NzInputNumberModule,
    NzSpinModule,
    NzCardModule,
    NzGridModule,
    NzIconModule,
    NzToolTipModule,
    NzDividerModule,
    NzStepsModule,
    NzSliderModule,
  ],
  template: `
    <div class="job-form-page">
      <nz-spin [nzSpinning]="loading()">
        <div class="page-header">
          <div class="header-left">
            <button nz-button nzType="text" (click)="onBack()" class="back-btn">
              <span nz-icon nzType="arrow-left"></span> Quay lại
            </button>
            <div class="header-content">
              <h1 class="page-title">
                {{ isEditMode() ? 'Chỉnh sửa việc làm' : 'Tạo việc làm mới' }}
              </h1>
              <p class="page-subtitle">
                {{ isEditMode() ? 'Cập nhật thông tin tin tuyển dụng' : 'Điền đầy đủ thông tin để tạo tin tuyển dụng' }}
              </p>
            </div>
          </div>
          <div class="header-actions">
            <button nz-button (click)="saveDraft()" [disabled]="saving()">
              <span nz-icon nzType="save"></span>
              Lưu nháp
            </button>
            <button
              nz-button
              nzType="primary"
              (click)="saveAndSubmit()"
              [disabled]="saving()"
            >
              <span nz-icon nzType="send"></span>
              Lưu & Gửi duyệt
            </button>
          </div>
        </div>

        <div class="progress-container">
          <div class="progress-section">
            <nz-steps [nzCurrent]="currentStep" nzSize="small">
              <nz-step nzTitle="Thông tin cơ bản"></nz-step>
              <nz-step nzTitle="Tiêu chí sàng lọc"></nz-step>
            </nz-steps>
          </div>
        </div>

        <form nz-form [formGroup]="form" nzLayout="vertical" class="form-container">
          @if (currentStep === 0) {
            <div class="form-step">
              <div nz-row nzJustify="center">
                <div nz-col [nzXs]="24" [nzSm]="22" [nzMd]="20" [nzLg]="18">
                  <nz-card class="form-card main-content-card">
                    <div class="card-header">
                      <span class="card-icon">
                        <span nz-icon nzType="flag" nzTheme="outline"></span>
                      </span>
                      <div>
                        <h3 class="card-title">Nội dung</h3>
                        <p class="card-subtitle">Thông tin bắt buộc</p>
                      </div>
                    </div>

                    <nz-form-item>
                      <nz-form-label nzRequired>Tiêu đề</nz-form-label>
                      <nz-form-control nzErrorTip="Vui lòng nhập tiêu đề">
                        <input
                          nz-input
                          nzSize="large"
                          formControlName="title_vi"
                          placeholder="VD: Kỹ sư phần mềm Senior"
                        />
                      </nz-form-control>
                    </nz-form-item>

                    <nz-form-item>
                      <nz-form-label>Mô tả công việc</nz-form-label>
                      <nz-form-control>
                        <textarea
                          nz-input
                          formControlName="description_vi"
                          [nzAutosize]="{ minRows: 6, maxRows: 15 }"
                          placeholder="Mô tả chi tiết công việc, trách nhiệm..."
                        ></textarea>
                      </nz-form-control>
                    </nz-form-item>

                    <nz-form-item>
                      <nz-form-label>Yêu cầu ứng viên</nz-form-label>
                      <nz-form-control>
                        <textarea
                          nz-input
                          formControlName="requirements_vi"
                          [nzAutosize]="{ minRows: 5, maxRows: 12 }"
                          placeholder="Các yêu cầu về kỹ năng, kinh nghiệm..."
                        ></textarea>
                      </nz-form-control>
                    </nz-form-item>
                  </nz-card>
                </div>
              </div>

              <div nz-row nzJustify="center">
                <div nz-col [nzXs]="24" [nzSm]="22" [nzMd]="20" [nzLg]="18">
                  <nz-card class="form-card details-card">
                    <div class="card-header">
                      <span class="card-icon card-icon--info">
                        <span nz-icon nzType="info-circle" nzTheme="outline"></span>
                      </span>
                      <div>
                        <h3 class="card-title">Thông tin chi tiết</h3>
                        <p class="card-subtitle">Địa điểm, lương, hình thức làm việc</p>
                      </div>
                    </div>

                    <div nz-row [nzGutter]="[24, 16]">
                      <div nz-col [nzXs]="24" [nzLg]="24">
                        <nz-form-item>
                          <nz-form-label nzRequired>Công ty đăng tuyển</nz-form-label>
                          <nz-form-control nzErrorTip="Vui lòng chọn công ty đăng tuyển">
                            <nz-select
                              formControlName="company_code"
                              nzShowSearch
                              nzPlaceHolder="Chọn công ty cho JD này"
                            >
                              @for (company of companyList(); track company.company_code) {
                                <nz-option
                                  [nzValue]="company.company_code"
                                  [nzLabel]="company.company_name + ' (' + company.company_code + ')'"
                                ></nz-option>
                              }
                            </nz-select>
                          </nz-form-control>
                        </nz-form-item>
                      </div>
                      <div nz-col [nzXs]="24" [nzSm]="12" [nzLg]="8">
                        <nz-form-item>
                          <nz-form-label>Lĩnh vực</nz-form-label>
                          <nz-form-control>
                            <nz-select
                              formControlName="department"
                              nzPlaceHolder="Chọn lĩnh vực"
                              nzAllowClear
                              nzShowSearch
                            >
                              @for (ind of industries; track ind) {
                                <nz-option [nzValue]="ind" [nzLabel]="ind"></nz-option>
                              }
                            </nz-select>
                          </nz-form-control>
                        </nz-form-item>
                      </div>
                      <div nz-col [nzXs]="24" [nzSm]="12" [nzLg]="8">
                        <nz-form-item>
                          <nz-form-label>Địa điểm</nz-form-label>
                          <nz-form-control>
                            <nz-select
                              formControlName="location"
                              nzShowSearch
                              nzAllowClear
                              nzPlaceHolder="Chọn địa điểm"
                            >
                              @for (loc of locations; track loc) {
                                <nz-option [nzValue]="loc" [nzLabel]="loc"></nz-option>
                              }
                            </nz-select>
                          </nz-form-control>
                        </nz-form-item>
                      </div>
                      <div nz-col [nzXs]="24" [nzSm]="12" [nzLg]="8">
                        <nz-form-item>
                          <nz-form-label>Hình thức</nz-form-label>
                          <nz-form-control>
                            <nz-select formControlName="employment_type" nzAllowClear nzPlaceHolder="Chọn">
                              @for (item of employmentTypes; track item.value) {
                                <nz-option
                                  [nzValue]="item.value"
                                  [nzLabel]="item.label"
                                ></nz-option>
                              }
                            </nz-select>
                          </nz-form-control>
                        </nz-form-item>
                      </div>
                      <div nz-col [nzXs]="12" [nzLg]="6">
                        <nz-form-item>
                          <nz-form-label>Lương tối thiểu (triệu)</nz-form-label>
                          <nz-form-control>
                            <nz-input-number
                              formControlName="salary_min"
                              [nzMin]="0"
                              [nzMax]="999"
                              [nzStep]="1"
                              nzPlaceHolder="VD: 15"
                              style="width: 100%"
                            ></nz-input-number>
                          </nz-form-control>
                        </nz-form-item>
                      </div>
                      <div nz-col [nzXs]="12" [nzLg]="6">
                        <nz-form-item>
                          <nz-form-label>Lương tối đa (triệu)</nz-form-label>
                          <nz-form-control>
                            <nz-input-number
                              formControlName="salary_max"
                              [nzMin]="0"
                              [nzMax]="999"
                              [nzStep]="1"
                              nzPlaceHolder="VD: 30"
                              style="width: 100%"
                            ></nz-input-number>
                          </nz-form-control>
                        </nz-form-item>
                      </div>
                      <div nz-col [nzXs]="24" [nzLg]="12">
                        <nz-form-item>
                          <nz-form-label>Hạn nộp hồ sơ</nz-form-label>
                          <nz-form-control>
                            <nz-date-picker
                              formControlName="application_deadline"
                              style="width: 100%"
                              nzPlaceHolder="Chọn ngày"
                            ></nz-date-picker>
                          </nz-form-control>
                        </nz-form-item>
                      </div>
                    </div>
                  </nz-card>
                </div>
              </div>
            </div>
          }

          @if (currentStep === 1) {
            <div class="form-step">
              <div nz-row nzJustify="center">
                <div nz-col [nzXs]="24" [nzSm]="22" [nzMd]="20" [nzLg]="18">
                  <nz-card class="form-card">
                    <div class="card-header">
                      <span class="card-icon card-icon--success">
                        <span nz-icon nzType="tool" nzTheme="outline"></span>
                      </span>
                      <div>
                        <h3 class="card-title">Kỹ năng yêu cầu</h3>
                        <p class="card-subtitle">Định nghĩa kỹ năng cần thiết cho vị trí</p>
                      </div>
                    </div>

                    <div nz-row [nzGutter]="24">
                      <div nz-col [nzXs]="24" [nzLg]="12">
                        <nz-form-item>
                          <nz-form-label>Kỹ năng bắt buộc</nz-form-label>
                          <nz-form-control>
                            <nz-select
                              formControlName="must_have_skills"
                              nzMode="tags"
                              nzPlaceHolder="Nhập kỹ năng và nhấn Enter"
                            ></nz-select>
                          </nz-form-control>
                        </nz-form-item>
                      </div>
                      <div nz-col [nzXs]="24" [nzLg]="12">
                        <nz-form-item>
                          <nz-form-label>Kỹ năng ưu tiên</nz-form-label>
                          <nz-form-control>
                            <nz-select
                              formControlName="nice_to_have_skills"
                              nzMode="tags"
                              nzPlaceHolder="Nhập kỹ năng và nhấn Enter"
                            ></nz-select>
                          </nz-form-control>
                        </nz-form-item>
                      </div>
                    </div>
                  </nz-card>

                  <nz-card class="form-card" style="margin-top: 24px">
                    <div class="card-header">
                      <span class="card-icon card-icon--warning">
                        <span nz-icon nzType="trophy" nzTheme="outline"></span>
                      </span>
                      <div>
                        <h3 class="card-title">Kinh nghiệm & Học vấn</h3>
                        <p class="card-subtitle">Yêu cầu kinh nghiệm và trình độ</p>
                      </div>
                    </div>

                    <div nz-row [nzGutter]="24">
                      <div nz-col [nzXs]="24" [nzSm]="12" [nzLg]="8">
                        <nz-form-item>
                          <nz-form-label>Kinh nghiệm tối thiểu (năm)</nz-form-label>
                          <nz-form-control>
                            <nz-input-number
                              formControlName="min_experience_years"
                              [nzMin]="0"
                              [nzMax]="30"
                              style="width: 100%"
                            ></nz-input-number>
                          </nz-form-control>
                        </nz-form-item>
                      </div>
                      
                      <div nz-col [nzXs]="24" [nzSm]="12" [nzLg]="8">
                        <nz-form-item>
                          <nz-form-label>Học vấn tối thiểu</nz-form-label>
                          <nz-form-control>
                            <nz-select formControlName="min_education" nzAllowClear nzPlaceHolder="Chọn">
                              @for (item of educationLevels; track item.value) {
                                <nz-option
                                  [nzValue]="item.value"
                                  [nzLabel]="item.label"
                                ></nz-option>
                              }
                            </nz-select>
                          </nz-form-control>
                        </nz-form-item>
                      </div>
                    </div>
                  </nz-card>

                  <nz-card class="form-card" style="margin-top: 24px">
                    <div class="card-header">
                      <span class="card-icon card-icon--info">
                        <span nz-icon nzType="sliders" nzTheme="outline"></span>
                      </span>
                      <div>
                        <h3 class="card-title">Trọng số sàng lọc</h3>
                        <p class="card-subtitle">Tùy chỉnh mức độ quan trọng của từng tiêu chí (tổng = 100%)</p>
                      </div>
                    </div>

                    <div class="weights-grid">
                      <div class="weight-item">
                        <div class="weight-label">
                          <span>Kỹ năng</span>
                          <strong>{{ form.get('weight_skills')?.value }}%</strong>
                        </div>
                        <nz-slider
                          formControlName="weight_skills"
                          [nzMin]="0"
                          [nzMax]="100"
                          [nzStep]="5"
                          (nzOnAfterChange)="onWeightChange('weight_skills')"
                        ></nz-slider>
                      </div>
                      <div class="weight-item">
                        <div class="weight-label">
                          <span>Kinh nghiệm</span>
                          <strong>{{ form.get('weight_experience')?.value }}%</strong>
                        </div>
                        <nz-slider
                          formControlName="weight_experience"
                          [nzMin]="0"
                          [nzMax]="100"
                          [nzStep]="5"
                          (nzOnAfterChange)="onWeightChange('weight_experience')"
                        ></nz-slider>
                      </div>
                      <div class="weight-item">
                        <div class="weight-label">
                          <span>Học vấn</span>
                          <strong>{{ form.get('weight_education')?.value }}%</strong>
                        </div>
                        <nz-slider
                          formControlName="weight_education"
                          [nzMin]="0"
                          [nzMax]="100"
                          [nzStep]="5"
                          (nzOnAfterChange)="onWeightChange('weight_education')"
                        ></nz-slider>
                      </div>
                      <div class="weight-total" [class.invalid]="getWeightsTotal() !== 100">
                        Tổng: {{ getWeightsTotal() }}%
                        @if (getWeightsTotal() !== 100) {
                          <span class="weight-error">— phải bằng 100%</span>
                        }
                      </div>
                    </div>
                  </nz-card>
                </div>
              </div>
            </div>
          }

          <div nz-row nzJustify="center">
            <div nz-col [nzXs]="24" [nzSm]="22" [nzMd]="20" [nzLg]="18">
              <div class="form-navigation">
                @if (currentStep > 0) {
                  <button nz-button (click)="prevStep()">
                    <span nz-icon nzType="left"></span>
                    Quay lại
                  </button>
                }
                @if (currentStep < 1) {
                  <button nz-button nzType="primary" (click)="nextStep()" class="next-btn">
                    Tiếp theo
                    <span nz-icon nzType="right"></span>
                  </button>
                }
              </div>
            </div>
          </div>
        </form>
      </nz-spin>
    </div>
  `,
  styles: [`
    .job-form-page {
      animation: fadeIn 0.3s ease-out;
      padding-bottom: 40px;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .header-left {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .back-btn {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      margin-top: 4px;
    }

    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 4px 0;
    }

    .page-subtitle {
      font-size: 14px;
      color: var(--color-text-secondary);
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    /* Progress Steps */
    .progress-container {
      display: flex;
      justify-content: center;
      margin-bottom: 32px;
    }

    .progress-section {
      width: 100%;
      max-width: 900px; /* Khớp với [nzLg]="18" */
      padding: 20px 32px;
      background: #fff;
      border-radius: 12px;
      border: 1px solid #f0f0f0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }

    /* Form Cards */
    .form-card {
      border-radius: 12px !important;
      border: 1px solid #f0f0f0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 24px;
    }

    .card-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e6f7ff;
      color: #1890ff;
      flex-shrink: 0;
      font-size: 20px;

      &--success { background: #f6ffed; color: #52c41a; }
      &--warning { background: #fffbe6; color: #faad14; }
      &--info { background: #e6f7ff; color: #1890ff; }
    }

    .card-title {
      font-size: 17px;
      font-weight: 600;
      margin: 0;
    }

    .card-subtitle {
      font-size: 13px;
      color: #8c8c8c;
      margin: 2px 0 0 0;
    }

    /* Navigation */
    .form-navigation {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #f0f0f0;
    }

    .next-btn {
      margin-left: auto;
    }

    /* Weights */
    .weights-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .weight-item {
      padding: 0 4px;
    }

    .weight-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      font-size: 14px;
      color: #595959;

      strong {
        color: #1890ff;
        font-size: 15px;
      }
    }

    .weight-total {
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      padding: 8px 16px;
      background: #f6ffed;
      border: 1px solid #b7eb8f;
      border-radius: 8px;
      color: #52c41a;

      &.invalid {
        background: #fff2f0;
        border-color: #ffccc7;
        color: #ff4d4f;
      }
    }

    .weight-error {
      font-weight: 400;
      margin-left: 4px;
    }

    /* Animation */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 767px) {
      .header-actions { width: 100%; }
      .header-actions button { flex: 1; }
    }
  `],
})
export class JobFormComponent implements OnInit {
  form!: FormGroup;
  loading = signal(false);
  saving = signal(false);
  currentStep = 0;

  jobId: number | null = null;
  job: Job | null = null;
  companyList = signal<Company[]>([]);

  isEditMode = computed(() => !!this.jobId);

  employmentTypes = Object.entries(EMPLOYMENT_TYPE_LABELS).map(
    ([value, label]) => ({ value, label })
  );

  educationLevels = Object.entries(EDUCATION_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  locations = VIETNAM_LOCATIONS;
  industries = VIETNAMESE_INDUSTRIES;

  constructor(
    private fb: FormBuilder,
    private jobService: JobService,
    private companyService: CompanyService,
    private authService: AuthService,
    private message: NzMessageService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCompanies();
    this.prefillCompany();
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.jobId = +params['id'];
        this.loadJob();
      }
    });
  }

  private initForm(): void {
    this.form = this.fb.group({
      title_vi: ['', [Validators.required, Validators.maxLength(255)]],
      description_vi: [''],
      requirements_vi: [''],
      company_code: [null, Validators.required],
      department: [null],
      location: [null],
      employment_type: [null],
      salary_min: [null],
      salary_max: [null],
      application_deadline: [null],
      must_have_skills: [[]],
      nice_to_have_skills: [[]],
      min_experience_years: [0],
      max_experience_years: [null],
      min_education: [null],
      weight_skills: [60],
      weight_experience: [30],
      weight_education: [10],
    });
  }

  private loadCompanies(): void {
    this.companyService.list({ page_size: 100 }).subscribe({
      next: (response) => this.companyList.set(response.items),
      error: () => this.companyList.set([]),
    });
  }

  private prefillCompany(): void {
    const currentUser = this.authService.user();
    if (currentUser?.role !== 'admin' && currentUser?.company_code) {
      this.form.patchValue({ company_code: currentUser.company_code });
      this.form.get('company_code')?.disable();
    }
  }

  private loadJob(): void {
    if (!this.jobId) return;
    this.loading.set(true);
    this.jobService.get(this.jobId).subscribe({
      next: (job) => {
        this.job = job;
        this.patchForm(job);
        this.loading.set(false);
      },
      error: () => {
        this.message.error('Không thể tải thông tin việc làm');
        this.loading.set(false);
        this.router.navigate(['/jobs']);
      },
    });
  }

  private patchForm(job: Job): void {
    this.form.patchValue({
      title_vi: job.title_vi,
      description_vi: job.description_vi,
      requirements_vi: job.requirements_vi,
      company_code: job.company_code ?? null,
      department: job.department,
      location: job.location,
      employment_type: job.employment_type,
      salary_min: job.salary_min ?? null,
      salary_max: job.salary_max ?? null,
      application_deadline: job.application_deadline ? new Date(job.application_deadline) : null,
    });

    if (job.criteria) {
      this.form.patchValue({
        must_have_skills: job.criteria.must_have_skills || [],
        nice_to_have_skills: job.criteria.nice_to_have_skills || [],
        min_experience_years: job.criteria.min_experience_years,
        max_experience_years: job.criteria.max_experience_years,
        min_education: job.criteria.min_education,
        weight_skills: job.criteria.weight_skills ?? 60,
        weight_experience: job.criteria.weight_experience ?? 30,
        weight_education: job.criteria.weight_education ?? 10,
      });
    }
  }

  private buildPayload(): JobCreate | JobUpdate {
    const v = this.form.getRawValue();
    return {
      title_vi: v.title_vi,
      description_vi: v.description_vi || undefined,
      requirements_vi: v.requirements_vi || undefined,
      company_code: v.company_code || undefined,
      department: v.department || undefined,
      location: v.location || undefined,
      employment_type: v.employment_type || undefined,
      salary_min: v.salary_min ?? undefined,
      salary_max: v.salary_max ?? undefined,
      application_deadline: v.application_deadline ? this.formatDate(v.application_deadline) : undefined,
      criteria: {
        must_have_skills: v.must_have_skills || [],
        nice_to_have_skills: v.nice_to_have_skills || [],
        min_experience_years: v.min_experience_years,
        max_experience_years: v.max_experience_years || undefined,
        min_education: v.min_education || undefined,
        weight_skills: v.weight_skills,
        weight_experience: v.weight_experience,
        weight_education: v.weight_education,
      },
    };
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  nextStep(): void {
    if (this.currentStep === 0) {
      if (!this.form.get('title_vi')?.valid) {
        this.form.get('title_vi')?.markAsTouched();
        this.message.warning('Vui lòng nhập tiêu đề tiếng Việt');
        return;
      }
    }
    if (this.currentStep === 1) {
      if (this.getWeightsTotal() !== 100) {
        this.message.warning('Tổng trọng số phải bằng 100%');
        return;
      }
    }
    this.currentStep++;
    window.scrollTo(0, 0);
  }

  prevStep(): void {
    this.currentStep--;
    window.scrollTo(0, 0);
  }

  saveDraft(): void {
    if (this.form.get('title_vi')?.invalid) {
      this.form.get('title_vi')?.markAsTouched();
      this.message.warning('Vui lòng nhập tiêu đề');
      return;
    }
    if (this.form.get('company_code')?.invalid) {
      this.form.get('company_code')?.markAsTouched();
      this.message.warning('Vui lòng chọn công ty đăng tuyển');
      return;
    }
    this.saving.set(true);
    const payload = this.buildPayload();
    const request$ = this.isEditMode()
      ? this.jobService.update(this.jobId!, payload)
      : this.jobService.create(payload as JobCreate);

    request$.subscribe({
      next: (job) => {
        this.message.success('Đã lưu bản nháp');
        this.saving.set(false);
        if (!this.isEditMode()) this.router.navigate(['/jobs', job.id, 'edit']);
      },
      error: () => {
        this.message.error('Không thể lưu');
        this.saving.set(false);
      },
    });
  }

  saveAndSubmit(): void {
    if (this.form.get('title_vi')?.invalid) {
      this.form.get('title_vi')?.markAsTouched();
      this.message.warning('Vui lòng nhập tiêu đề');
      return;
    }
    if (this.form.get('company_code')?.invalid) {
      this.form.get('company_code')?.markAsTouched();
      this.message.warning('Vui lòng chọn công ty đăng tuyển');
      return;
    }
    if (this.getWeightsTotal() !== 100) {
      this.currentStep = 1;
      this.message.warning('Tổng trọng số sàng lọc phải bằng 100%');
      return;
    }
    this.saving.set(true);
    const payload = this.buildPayload();
    const save$ = this.isEditMode()
      ? this.jobService.update(this.jobId!, payload)
      : this.jobService.create(payload as JobCreate);

    save$.subscribe({
      next: (job) => {
        this.jobService.submit(job.id).subscribe({
          next: () => {
            this.message.success('Đã gửi yêu cầu phê duyệt');
            this.saving.set(false);
            this.router.navigate(['/jobs', job.id]);
          },
          error: () => {
            this.message.error('Không thể gửi yêu cầu phê duyệt');
            this.saving.set(false);
          },
        });
      },
      error: () => {
        this.message.error('Không thể lưu');
        this.saving.set(false);
      },
    });
  }

  getWeightsTotal(): number {
    const s = this.form.get('weight_skills')?.value ?? 0;
    const e = this.form.get('weight_experience')?.value ?? 0;
    const d = this.form.get('weight_education')?.value ?? 0;
    return s + e + d;
  }

  onWeightChange(changed: string): void {
    const fields = ['weight_skills', 'weight_experience', 'weight_education'];
    const values: Record<string, number> = {};
    for (const f of fields) {
      values[f] = this.form.get(f)?.value ?? 0;
    }

    const total = values['weight_skills'] + values['weight_experience'] + values['weight_education'];
    if (total === 100) return;

    // Auto-adjust: distribute the difference to the other two fields proportionally
    const others = fields.filter(f => f !== changed);
    const othersSum = others.reduce((sum, f) => sum + values[f], 0);
    const remainder = 100 - values[changed];

    if (othersSum === 0) {
      // Split remainder evenly between the other two
      const half = Math.round(remainder / 2);
      this.form.patchValue({
        [others[0]]: half,
        [others[1]]: remainder - half,
      }, { emitEvent: false });
    } else {
      // Distribute proportionally
      const first = Math.round((values[others[0]] / othersSum) * remainder);
      this.form.patchValue({
        [others[0]]: first,
        [others[1]]: remainder - first,
      }, { emitEvent: false });
    }
  }

  onBack(): void {
    this.router.navigate(['/jobs']);
  }
}
