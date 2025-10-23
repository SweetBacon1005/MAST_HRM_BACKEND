import { ApiProperty } from '@nestjs/swagger';
import { TimesheetStatus } from '@prisma/client';

export class  ForgotCheckinRequestResponseDto {
  @ApiProperty({
    description: 'ID của đơn xin bổ sung chấm công',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'ID của user',
    example: 1,
  })
  user_id: number;

  @ApiProperty({
    description: 'Thông tin user',
    type: 'object',
    properties: {
      id: { type: 'number', example: 1 },
      name: { type: 'string', example: 'Nguyễn Văn A' },
      email: { type: 'string', example: 'nguyenvana@example.com' },
    },
  })
  user: {
    id: number;
    name: string | null;
    email: string;
  };

  @ApiProperty({
    description: 'Ngày quên chấm công',
    example: '2024-01-15',
  })
  work_date: string;

  @ApiProperty({
    description: 'Thời gian checkin thực tế',
    example: '08:30',
    nullable: true,
  })
  checkin_time: string | null;

  @ApiProperty({
    description: 'Thời gian checkout thực tế',
    example: '17:30',
    nullable: true,
  })
  checkout_time: string | null;

  @ApiProperty({
    description: 'Tiêu đề đơn xin bổ sung chấm công',
    example: 'Đơn xin bổ sung chấm công ngày 15/01/2024',
  })
  title: string;

  @ApiProperty({
    description: 'Lý do quên chấm công',
    example: 'Do bận họp khẩn cấp nên quên chấm công vào buổi sáng',
  })
  reason: string;

  @ApiProperty({
    description: 'Trạng thái đơn',
    enum: TimesheetStatus,
    example: TimesheetStatus.PENDING,
  })
  status: TimesheetStatus;

  @ApiProperty({
    description: 'ID người duyệt',
    example: 2,
    nullable: true,
  })
  approved_by: number | null;

  @ApiProperty({
    description: 'Thông tin người duyệt',
    type: 'object',
    properties: {
      id: { type: 'number', example: 2 },
      name: { type: 'string', example: 'Trần Thị B' },
      email: { type: 'string', example: 'tranthib@example.com' },
    },
    nullable: true,
  })
  approved_by_user: {
    id: number;
    name: string | null;
    email: string;
  } | null;

  @ApiProperty({
    description: 'Thời gian duyệt',
    example: '2024-01-16T09:00:00Z',
    nullable: true,
  })
  approved_at: string | null;

  @ApiProperty({
    description: 'Lý do từ chối',
    example: 'Thời gian checkin không hợp lý',
    nullable: true,
  })
  rejected_reason: string | null;

  @ApiProperty({
    description: 'ID timesheet liên quan',
    example: 1,
    nullable: true,
  })
  timesheet_id: number | null;

  @ApiProperty({
    description: 'Thời gian tạo đơn',
    example: '2024-01-15T14:30:00Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'Thời gian cập nhật cuối',
    example: '2024-01-16T09:00:00Z',
  })
  updated_at: string;
}
