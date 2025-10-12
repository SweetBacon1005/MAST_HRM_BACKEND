import { ApiProperty } from '@nestjs/swagger';
import { LateEarlyType, TimesheetStatus } from '@prisma/client';

export class LateEarlyRequestResponseDto {
  @ApiProperty({
    description: 'ID của request',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'ID người dùng',
    example: 1,
  })
  user_id: number;

  @ApiProperty({
    description: 'Ngày làm việc',
    example: '2024-01-15',
  })
  work_date: Date;

  @ApiProperty({
    description: 'Loại request',
    enum: LateEarlyType,
    example: LateEarlyType.LATE,
  })
  request_type: LateEarlyType;

  @ApiProperty({
    description: 'Tiêu đề đơn xin đi muộn/về sớm',
    example: 'Xin phép đi muộn do tắc đường',
  })
  title: string;

  @ApiProperty({
    description: 'Số phút đi muộn',
    example: 30,
    nullable: true,
  })
  late_minutes?: number;

  @ApiProperty({
    description: 'Số phút về sớm',
    example: 15,
    nullable: true,
  })
  early_minutes?: number;

  @ApiProperty({
    description: 'Lý do',
    example: 'Tắc đường do mưa lớn',
  })
  reason: string;

  @ApiProperty({
    description: 'Trạng thái',
    enum: TimesheetStatus,
    example: TimesheetStatus.PENDING,
  })
  status: TimesheetStatus;

  @ApiProperty({
    description: 'ID người duyệt',
    example: 2,
    nullable: true,
  })
  approved_by?: number;

  @ApiProperty({
    description: 'Thời gian duyệt',
    example: '2024-01-15T10:30:00Z',
    nullable: true,
  })
  approved_at?: Date;

  @ApiProperty({
    description: 'Lý do từ chối',
    example: 'Không có lý do chính đáng',
    nullable: true,
  })
  rejected_reason?: string;

  @ApiProperty({
    description: 'ID timesheet liên quan',
    example: 1,
    nullable: true,
  })
  timesheet_id?: number;

  @ApiProperty({
    description: 'Thời gian tạo',
    example: '2024-01-15T08:00:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Thời gian cập nhật',
    example: '2024-01-15T10:30:00Z',
  })
  updated_at: Date;
}

