import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RemoteType, TimesheetStatus } from '@prisma/client';

export class RemoteWorkRequestResponseDto {
  @ApiProperty({
    description: 'ID của remote work request',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'ID của user',
    example: 1,
  })
  user_id: number;

  @ApiProperty({
    description: 'Ngày làm việc từ xa',
    example: '2024-02-09',
  })
  work_date: Date;

  @ApiProperty({
    description: 'Loại làm việc từ xa',
    enum: RemoteType,
    example: RemoteType.REMOTE,
  })
  remote_type: RemoteType;

  @ApiPropertyOptional({
    description: 'Lý do làm việc từ xa',
    example: 'Cần tập trung làm việc ở nhà để hoàn thành dự án',
  })
  reason: string | null;

  @ApiPropertyOptional({
    description: 'Ghi chú thêm',
    example: 'Sẽ online đầy đủ trong giờ làm việc',
  })
  note: string | null;

  @ApiProperty({
    description: 'Trạng thái của request',
    enum: TimesheetStatus,
    example: TimesheetStatus.PENDING,
  })
  status: TimesheetStatus;

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
    example: 'Tuần này đã có quá nhiều người remote work',
  })
  rejected_reason: string | null;

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
