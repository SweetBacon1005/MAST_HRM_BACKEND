import { ApiProperty } from '@nestjs/swagger';
import { DayOffStatus, DayOffType, TimesheetStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class TimesheetPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày bắt đầu phải có định dạng YYYY-MM-DD',
  })
  start_date?: string;

  @ApiProperty({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày kết thúc phải có định dạng YYYY-MM-DD',
  })
  end_date?: string;

  @ApiProperty({
    description: 'Trạng thái timesheet',
    example: 'APPROVED',
    required: false,
    enum: TimesheetStatus,
  })
  @IsOptional()
  @IsString()
  status?: TimesheetStatus;
}

export class DayOffRequestPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Trạng thái đơn nghỉ phép',
    example: 'PENDING',
    required: false,
    enum: DayOffStatus,
  })
  @IsOptional()
  @IsString()
  status?: DayOffStatus;

  @ApiProperty({
    description: 'Loại nghỉ phép',
    example: DayOffType.PAID,
    required: false,
    enum: DayOffType,
  })
  @IsOptional()
  @IsString()
  @IsIn([
    DayOffType.PAID,
    DayOffType.UNPAID,
    DayOffType.SICK,
    DayOffType.MATERNITY,
    DayOffType.PERSONAL,
    DayOffType.COMPENSATORY,
  ])
  leave_type?: DayOffType;
}

export class OvertimeRequestPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày bắt đầu phải có định dạng YYYY-MM-DD',
  })
  start_date?: string;

  @ApiProperty({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày kết thúc phải có định dạng YYYY-MM-DD',
  })
  end_date?: string;
}

export class HolidayPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Năm',
    example: 2024,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;
}

export class AttendanceLogPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'ID người dùng',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;

  @ApiProperty({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày bắt đầu phải có định dạng YYYY-MM-DD',
  })
  start_date?: string;

  @ApiProperty({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày kết thúc phải có định dạng YYYY-MM-DD',
  })
  end_date?: string;

  @ApiProperty({
    description: 'Loại log',
    example: 'checkin',
    required: false,
    enum: ['checkin', 'checkout', 'manual'],
  })
  @IsOptional()
  @IsString()
  log_type?: string;
}
