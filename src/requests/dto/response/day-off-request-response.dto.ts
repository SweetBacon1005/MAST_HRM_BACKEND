import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOffStatus, DayOffType, DayOffDuration } from '@prisma/client';

export class DayOffRequestResponseDto {
  @ApiProperty({
    description: 'ID của day-off request',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'ID của user',
    example: 1,
  })
  user_id: number;

  @ApiProperty({
    description: 'Ngày nghỉ phép',
    example: '2024-02-09',
  })
  work_date: Date;

  @ApiProperty({
    description: 'Thời lượng nghỉ phép',
    enum: DayOffDuration,
    example: DayOffDuration.FULL_DAY,
  })
  duration: DayOffDuration;

  @ApiProperty({
    description: 'Tiêu đề đơn xin nghỉ',
    example: 'Xin nghỉ phép năm',
  })
  title: string;

  @ApiProperty({
    description: 'Trạng thái của request',
    enum: DayOffStatus,
    example: DayOffStatus.PENDING,
  })
  status: DayOffStatus;

  @ApiProperty({
    description: 'Loại nghỉ phép',
    enum: DayOffType,
    example: DayOffType.PAID,
  })
  type: DayOffType;

  @ApiPropertyOptional({
    description: 'Lý do nghỉ phép',
    example: 'Nghỉ phép năm',
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
    example: 'Không đủ ngày phép còn lại',
  })
  rejected_reason: string | null;

  @ApiProperty({
    description: 'Có phải nghỉ phép bù không',
    example: false,
  })
  is_past: boolean;

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
