import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DailyReportEntity {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 5, description: 'ID người tạo report' })
  user_id: number;

  @ApiProperty({ example: 12, description: 'ID dự án' })
  project_id: number;

  @ApiPropertyOptional({ example: 'Fix bug và review code', description: 'Tiêu đề báo cáo' })
  title: string | null;

  @ApiProperty({ example: '2025-01-15T00:00:00.000Z', description: 'Ngày làm việc' })
  work_date: Date;

  @ApiProperty({ example: 7.5, description: 'Thời gian thực tế (giờ)' })
  actual_time: number;

  @ApiProperty({ example: 'PENDING', enum: ['PENDING', 'APPROVED', 'REJECTED'], description: 'Trạng thái duyệt' })
  status: string;

  @ApiPropertyOptional({ example: 3, description: 'ID người duyệt' })
  approved_by: number | null;

  @ApiPropertyOptional({ example: '2025-01-16T10:30:00.000Z', description: 'Thời gian duyệt/từ chối' })
  reviewed_at: Date | null;

  @ApiPropertyOptional({ example: 'Sửa các lỗi priority P1, viết unit test', description: 'Mô tả chi tiết công việc' })
  description: string | null;

  @ApiPropertyOptional({ example: 'Thiếu mô tả chi tiết', description: 'Lý do từ chối' })
  reject_reason: string | null;

  @ApiProperty({ example: '2025-01-15T08:00:00.000Z', description: 'Thời gian tạo' })
  created_at: Date;

  @ApiProperty({ example: '2025-01-15T08:00:00.000Z', description: 'Thời gian cập nhật' })
  updated_at: Date;
}

export class DailyReportPaginatedResponse {
  @ApiProperty({ type: [DailyReportEntity] })
  data: DailyReportEntity[];

  @ApiProperty({ example: 100, description: 'Tổng số bản ghi' })
  total: number;

  @ApiProperty({ example: 1, description: 'Trang hiện tại' })
  page: number;

  @ApiProperty({ example: 10, description: 'Số bản ghi trên mỗi trang' })
  limit: number;

  @ApiProperty({ example: 10, description: 'Tổng số trang' })
  totalPages: number;
}
