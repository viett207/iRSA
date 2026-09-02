import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FunnelStage {
  id: string;
  name: string;
  stageNumber: number;
  count: number;
  percentage: number;
  stepConversionRate: number;
  description: string;
}

export interface SkillDemand {
  id: string;
  name: string;
  category: string;
  demandPercentage: number;
  jobCount: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
}

export interface SourceMetric {
  id: string;
  sourceName: string;
  channelType: string;
  iconName: string;
  totalCandidates: number;
  aiPassedCount: number;
  aiPassRate: number;
  hiredCount: number;
  conversionRate: number;
  avgTimeToHireDays: number;
  qualityScore: number;
  performanceStatus: 'Xuất sắc' | 'Hiệu quả cao' | 'Tiềm năng' | 'Cần tối ưu';
}

@Component({
  selector: 'app-lower-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lower-analytics.component.html',
  styleUrls: ['./lower-analytics.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LowerAnalyticsComponent {
  /**
   * 1. Sơ đồ Phễu Chuyển Đổi Tuyển Dụng AI (2/3 width)
   */
  readonly funnelStages: FunnelStage[] = [
    {
      id: 'sourced',
      name: 'Tiếp nhận hồ sơ',
      stageNumber: 1,
      count: 1420,
      percentage: 100,
      stepConversionRate: 100,
      description: 'Hồ sơ thu thập tự động từ tất cả các cổng tuyển dụng',
    },
    {
      id: 'ai-screened',
      name: 'AI Sàng lọc tự động',
      stageNumber: 2,
      count: 1180,
      percentage: 83.1,
      stepConversionRate: 83.1,
      description: 'Phân tích ngữ nghĩa CV & đối chiếu tiêu chí loại trừ',
    },
    {
      id: 'shortlisted',
      name: 'Vào danh sách rút gọn',
      stageNumber: 3,
      count: 540,
      percentage: 38.0,
      stepConversionRate: 45.8,
      description: 'Điểm AI Matching Score ≥ 75/100, chuyển phòng ban',
    },
    {
      id: 'interviewed',
      name: 'Phỏng vấn chuyên sâu',
      stageNumber: 4,
      count: 195,
      percentage: 13.7,
      stepConversionRate: 36.1,
      description: 'Đánh giá kỹ năng thực chiến và phỏng vấn trực tiếp',
    },
    {
      id: 'hired',
      name: 'Tuyển dụng thành công',
      stageNumber: 5,
      count: 68,
      percentage: 4.8,
      stepConversionRate: 34.9,
      description: 'Ứng viên nhận việc chính thức (Offer Accepted)',
    },
  ];

  /**
   * 2. Ma Trận Nhu Cầu Kỹ Năng (1/3 width)
   */
  readonly skillDemands: SkillDemand[] = [
    {
      id: 'skill-1',
      name: 'Python & FastAPI',
      category: 'AI / Backend',
      demandPercentage: 92,
      jobCount: 48,
      trend: 'up',
      trendValue: '+18%',
    },
    {
      id: 'skill-2',
      name: 'Angular & TypeScript',
      category: 'Frontend Core',
      demandPercentage: 86,
      jobCount: 42,
      trend: 'up',
      trendValue: '+12%',
    },
    {
      id: 'skill-3',
      name: 'RAG & Vector Search',
      category: 'GenAI Solution',
      demandPercentage: 78,
      jobCount: 36,
      trend: 'up',
      trendValue: '+25%',
    },
    {
      id: 'skill-4',
      name: 'PostgreSQL & pgvector',
      category: 'Database Engine',
      demandPercentage: 68,
      jobCount: 29,
      trend: 'up',
      trendValue: '+9%',
    },
    {
      id: 'skill-5',
      name: 'Docker & Kubernetes',
      category: 'DevOps / Cloud',
      demandPercentage: 62,
      jobCount: 25,
      trend: 'stable',
      trendValue: '0%',
    },
    {
      id: 'skill-6',
      name: 'NLP & LLM Fine-tuning',
      category: 'Data Science',
      demandPercentage: 54,
      jobCount: 21,
      trend: 'up',
      trendValue: '+15%',
    },
  ];

  /**
   * 3. Đánh Giá Hiệu Suất Nguồn Tuyển Dụng (Full width 100%)
   */
  readonly sourceMetrics: SourceMetric[] = [
    {
      id: 'src-1',
      sourceName: 'LinkedIn Talent Solutions',
      channelType: 'Kênh Chuyên gia Quốc tế',
      iconName: 'linkedin',
      totalCandidates: 480,
      aiPassedCount: 345,
      aiPassRate: 71.9,
      hiredCount: 28,
      conversionRate: 5.8,
      avgTimeToHireDays: 16,
      qualityScore: 92.4,
      performanceStatus: 'Xuất sắc',
    },
    {
      id: 'src-2',
      sourceName: 'AI Talent Pool (iRSA Sourcing)',
      channelType: 'Dữ liệu Thu thập Tự động iRSA',
      iconName: 'robot',
      totalCandidates: 210,
      aiPassedCount: 178,
      aiPassRate: 84.8,
      hiredCount: 18,
      conversionRate: 8.6,
      avgTimeToHireDays: 9,
      qualityScore: 95.8,
      performanceStatus: 'Xuất sắc',
    },
    {
      id: 'src-3',
      sourceName: 'TopCV Vietnam',
      channelType: 'Cổng Tuyển dụng Nội địa',
      iconName: 'briefcase',
      totalCandidates: 420,
      aiPassedCount: 232,
      aiPassRate: 55.2,
      hiredCount: 12,
      conversionRate: 2.9,
      avgTimeToHireDays: 14,
      qualityScore: 81.5,
      performanceStatus: 'Hiệu quả cao',
    },
    {
      id: 'src-4',
      sourceName: 'Chương trình Giới thiệu Nội bộ',
      channelType: 'Employee Referral Network',
      iconName: 'team',
      totalCandidates: 130,
      aiPassedCount: 112,
      aiPassRate: 86.2,
      hiredCount: 14,
      conversionRate: 10.8,
      avgTimeToHireDays: 11,
      qualityScore: 94.0,
      performanceStatus: 'Xuất sắc',
    },
    {
      id: 'src-5',
      sourceName: 'VietnamWorks Tech',
      channelType: 'Kênh Việc làm Công nghệ',
      iconName: 'global',
      totalCandidates: 180,
      aiPassedCount: 113,
      aiPassRate: 62.8,
      hiredCount: 6,
      conversionRate: 3.3,
      avgTimeToHireDays: 20,
      qualityScore: 83.2,
      performanceStatus: 'Tiềm năng',
    },
  ];

  /**
   * Định dạng số theo chuẩn phân tách hàng ngàn
   */
  formatNumber(val: number): string {
    return new Intl.NumberFormat('vi-VN').format(val);
  }

  /**
   * Helper class trạng thái hiệu suất nguồn
   */
  getStatusBadgeClass(status: SourceMetric['performanceStatus']): string {
    switch (status) {
      case 'Xuất sắc':
        return 'status-pill status-pill--excellent';
      case 'Hiệu quả cao':
        return 'status-pill status-pill--high';
      case 'Tiềm năng':
        return 'status-pill status-pill--potential';
      case 'Cần tối ưu':
        return 'status-pill status-pill--optimize';
      default:
        return 'status-pill';
    }
  }
}
