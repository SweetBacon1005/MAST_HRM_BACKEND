import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsDateString,
  IsInt,
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
    description: 'Có hoàn thành không (1: có, 0: không)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  is_complete?: number;

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
    description: 'Loại (1: bình thường, 2: nghỉ phép, ...)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  type?: number;

  @ApiPropertyOptional({
    description: 'Giờ làm buổi sáng',
    example: 240,
  })
  @IsOptional()
  @IsInt()
  work_time_morning?: number;

  @ApiPropertyOptional({
    description: 'Giờ làm buổi chiều',
    example: 240,
  })
  @IsOptional()
  @IsInt()
  work_time_afternoon?: number;

  @ApiPropertyOptional({
    description: 'Trạng thái (1: chờ duyệt, 2: đã duyệt, 3: từ chối)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  status?: number;

  @ApiPropertyOptional({
    description: 'Loại yêu cầu',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  request_type?: number;

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
    description: 'Làm việc từ xa (0: office, 1: remote, 2: hybrid)',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  remote?: number;

  @ApiPropertyOptional({
    description: 'Tổng thời gian làm việc (phút)',
    example: 480,
  })
  @IsOptional()
  @IsInt()
  total_work_time?: number;

  @ApiPropertyOptional({
    description: 'Thời gian nghỉ trưa (phút)',
    example: 60,
  })
  @IsOptional()
  @IsInt()
  break_time?: number;
}
