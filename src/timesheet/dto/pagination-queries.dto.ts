import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class TimesheetPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiProperty({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiProperty({
    description: 'Trạng thái timesheet',
    example: 'approved',
    required: false,
    enum: ['draft', 'submitted', 'approved', 'rejected', 'locked'],
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class DayOffRequestPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Trạng thái đơn nghỉ phép',
    example: 'pending',
    required: false,
    enum: ['pending', 'approved', 'rejected'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Loại nghỉ phép',
    example: 'annual_leave',
    required: false,
  })
  @IsOptional()
  @IsString()
  leave_type?: string;
}

export class OvertimeRequestPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Trạng thái đơn làm thêm giờ',
    example: 'pending',
    required: false,
    enum: ['pending', 'approved', 'rejected'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Ngày bắt đầu',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiProperty({
    description: 'Ngày kết thúc',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsString()
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

  @ApiProperty({
    description: 'Loại ngày lễ',
    example: 'national',
    required: false,
  })
  @IsOptional()
  @IsString()
  holiday_type?: string;
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
    description: 'Ngày bắt đầu',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiProperty({
    description: 'Ngày kết thúc',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsString()
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
