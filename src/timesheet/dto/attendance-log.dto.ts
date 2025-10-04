import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { TimesheetStatus } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAttendanceLogDto {
  @ApiProperty({
    description: 'Loại hành động',
    example: 'checkin',
    enum: ['checkin', 'checkout', 'break_start', 'break_end'],
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['checkin', 'checkout', 'break_start', 'break_end'])
  action_type: string;

  @ApiProperty({
    description: 'Thời gian thực hiện hành động',
    example: '2024-02-09T08:30:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  timestamp: string;

  @ApiProperty({
    description: 'Ngày làm việc',
    example: '2024-02-09',
  })
  @IsNotEmpty()
  @IsDateString()
  work_date: string;

  @ApiPropertyOptional({
    description: 'ID timesheet liên kết',
    example: 123,
  })
  @IsOptional()
  @IsInt()
  timesheet_id?: number;

  @ApiPropertyOptional({
    description: 'Loại địa điểm',
    example: 'office',
    enum: ['office', 'remote', 'client_site'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['office', 'remote', 'client_site'])
  location_type?: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ IP',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsString()
  ip_address?: string;

  @ApiPropertyOptional({
    description: 'Thông tin thiết bị',
    example: 'iPhone 15 Pro - iOS 17.2',
  })
  @IsOptional()
  @IsString()
  device_info?: string;

  @ApiPropertyOptional({
    description: 'Tọa độ GPS - Latitude',
    example: 21.0285,
  })
  @IsOptional()
  @IsNumber()
  gps_latitude?: number;

  @ApiPropertyOptional({
    description: 'Tọa độ GPS - Longitude',
    example: 105.8542,
  })
  @IsOptional()
  @IsNumber()
  gps_longitude?: number;

  @ApiPropertyOptional({
    description: 'URL ảnh selfie',
    example: 'https://example.com/photos/checkin_123.jpg',
  })
  @IsOptional()
  @IsString()
  photo_url?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú',
    example: 'Check in từ văn phòng',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Check in/out thủ công bởi admin',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_manual?: boolean;

  @ApiPropertyOptional({
    description: 'ID người duyệt',
    example: 456,
  })
  @IsOptional()
  @IsInt()
  approved_by?: number;

  @ApiPropertyOptional({
    description: 'Trạng thái (0: pending, 1: approved, 2: rejected)',
    example: 1,
  })
  @IsOptional()
  @IsString()
  @IsIn([
    TimesheetStatus.PENDING,
    TimesheetStatus.APPROVED,
    TimesheetStatus.REJECTED,
  ])
  status?: TimesheetStatus;
}

export class UpdateAttendanceLogDto {
  @ApiPropertyOptional({
    description: 'Ghi chú',
    example: 'Cập nhật ghi chú',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({
    description: 'Trạng thái (0: pending, 1: approved, 2: rejected)',
    example: 1,
  })
  @IsOptional()
  @IsString()
  @IsIn([
    TimesheetStatus.PENDING,
    TimesheetStatus.APPROVED,
    TimesheetStatus.REJECTED,
  ])
  status?: TimesheetStatus;
}

export class AttendanceLogQueryDto {
  @ApiPropertyOptional({
    description: 'ID user (chỉ admin/manager mới được query user khác)',
    example: 123,
  })
  @IsOptional()
  @IsInt()
  user_id?: number;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu',
    example: '2024-02-01',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc',
    example: '2024-02-29',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Loại hành động',
    example: 'checkin',
    enum: ['checkin', 'checkout', 'break_start', 'break_end'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['checkin', 'checkout', 'break_start', 'break_end'])
  action_type?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @IsIn([0, 1, 2])
  status?: number;

  @ApiPropertyOptional({
    description: 'Số trang',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  page?: number;

  @ApiPropertyOptional({
    description: 'Số bản ghi mỗi trang',
    example: 20,
  })
  @IsOptional()
  @IsInt()
  limit?: number;
}
