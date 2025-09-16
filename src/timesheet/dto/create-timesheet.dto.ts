import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RemoteType,
  TimesheetRequestType,
  TimesheetStatus,
  TimesheetType,
} from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTimesheetDto {
  @ApiProperty({
    description: 'Ngày làm việc',
    example: '2024-02-09',
  })
  @IsNotEmpty()
  @IsDateString()
  work_date: string;

  @ApiPropertyOptional({
    description: 'Thời gian check-in',
    example: '2024-02-09T08:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  checkin?: string;

  @ApiPropertyOptional({
    description: 'Thời gian check-out',
    example: '2024-02-09T17:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  checkout?: string;

  @ApiPropertyOptional({
    description: 'Chuỗi check-in checkout',
    example: '08:30-17:30',
  })
  @IsOptional()
  @IsString()
  checkin_checkout?: string;

  @ApiPropertyOptional({
    description: 'ID ngày nghỉ phép',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  day_off_id?: number;

  @ApiPropertyOptional({
    description: 'Thời gian đi muộn (phút)',
    example: 15,
  })
  @IsOptional()
  @IsNumber()
  late_time?: number;

  @ApiPropertyOptional({
    description: 'Thời gian đi muộn được duyệt (phút)',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  late_time_approved?: number;

  @ApiPropertyOptional({
    description: 'Thời gian về sớm (phút)',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  early_time?: number;

  @ApiPropertyOptional({
    description: 'Có hoàn thành không (true: có, false: không)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_complete?: boolean;

  @ApiPropertyOptional({
    description: 'Tiền phạt',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  fines?: number;

  @ApiPropertyOptional({
    description: 'ID nhóm',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  group_id?: number;

  @ApiPropertyOptional({
    description: 'Loại (NORMAL, OVERTIME, HOLIDAY, WEEKEND)',
    example: TimesheetType.NORMAL,
  })
  @IsOptional()
  @IsString()
  type?: TimesheetType;

  @ApiPropertyOptional({
    description: 'Giờ làm buổi sáng',
    example: 240,
  })
  @IsOptional()
  @IsNumber()
  work_time_morning?: number;

  @ApiPropertyOptional({
    description: 'Giờ làm buổi chiều',
    example: 240,
  })
  @IsOptional()
  @IsNumber()
  work_time_afternoon?: number;

  @ApiPropertyOptional({
    description: 'Trạng thái',
    example: TimesheetStatus.PENDING,
  })
  @IsOptional()
  @IsString()
  status?: TimesheetStatus;

  @ApiPropertyOptional({
    description: 'Loại yêu cầu',
    example: TimesheetRequestType.OVERTIME,
  })
  @IsOptional()
  @IsString()
  request_type?: TimesheetRequestType;

  @ApiPropertyOptional({
    description: 'Yêu cầu đi muộn',
    example: 'Tắc đường do mưa',
  })
  @IsOptional()
  @IsString()
  request_late?: string;

  @ApiPropertyOptional({
    description: 'Yêu cầu về sớm',
    example: 'Có việc cá nhân',
  })
  @IsOptional()
  @IsString()
  request_early?: string;

  @ApiPropertyOptional({
    description: 'Nghỉ phép có lương',
    example: 'Nghỉ phép năm',
  })
  @IsOptional()
  @IsString()
  paid_leave?: string;

  @ApiPropertyOptional({
    description: 'Nghỉ phép không lương',
    example: 'Nghỉ việc riêng',
  })
  @IsOptional()
  @IsString()
  unpaid_leave?: string;

  @ApiPropertyOptional({
    description: 'Làm việc từ xa (OFFICE, REMOTE, HYBRID) ',
    example: RemoteType.OFFICE,
  })
  @IsOptional()
  @IsString()
  remote?: RemoteType;

  @ApiPropertyOptional({
    description: 'Tổng thời gian làm việc (phút)',
    example: 480,
  })
  @IsOptional()
  @IsNumber()
  total_work_time?: number;

  @ApiPropertyOptional({
    description: 'Thời gian nghỉ trưa (phút)',
    example: 60,
  })
  @IsOptional()
  @IsNumber()
  break_time?: number;
}
