import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TimesheetStatus } from '@prisma/client';

export class OvertimeRequestResponseDto {
  @ApiProperty({
    description: 'ID của overtime request',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'ID của user',
    example: 1,
  })
  user_id: number;

  @ApiProperty({
    description: 'Ngày làm thêm giờ',
    example: '2024-02-09',
  })
  date: Date;

  @ApiProperty({
    description: 'Thời gian bắt đầu',
    example: '2024-02-09T11:00:00.000Z',
  })
  start_time: Date;

  @ApiProperty({
    description: 'Thời gian kết thúc',
    example: '2024-02-09T14:00:00.000Z',
  })
  end_time: Date;

  @ApiPropertyOptional({
    description: 'Tổng số giờ làm thêm',
    example: 3,
  })
  total: number | null;

  @ApiPropertyOptional({
    description: 'Giá trị tiền làm thêm giờ',
    example: 150000,
  })
  value: number | null;

  @ApiPropertyOptional({
    description: 'ID dự án',
    example: 1,
  })
  project_id: number | null;

  @ApiPropertyOptional({
    description: 'Lý do làm thêm giờ',
    example: 'Hoàn thành tính năng mới cho dự án',
  })
  reason: string | null;

  @ApiPropertyOptional({
    description: 'ID người duyệt',
    example: 2,
  })
  approved_by: number | null;

  @ApiPropertyOptional({
    description: 'Thời gian duyệt',
    example: '2024-02-09T10:30:00.000Z',
  })
  approved_at: Date | null;

  @ApiPropertyOptional({
    description: 'Lý do từ chối',
    example: 'Không cần thiết làm thêm giờ cho task này',
  })
  rejected_reason: string | null;

  @ApiPropertyOptional({
    description: 'Trạng thái của request',
    enum: TimesheetStatus,
    example: TimesheetStatus.PENDING,
  })
  status: TimesheetStatus | null;

  @ApiProperty({
    description: 'Thời gian tạo',
    example: '2024-02-09T08:00:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Thời gian cập nhật',
    example: '2024-02-09T08:00:00.000Z',
  })
  updated_at: Date;

  @ApiPropertyOptional({
    description: 'Thời gian xóa (soft delete)',
    example: null,
  })
  deleted_at: Date | null;
}
