import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches } from 'class-validator';
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
}

// DayOffRequestPaginationDto and OvertimeRequestPaginationDto moved to /requests module

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
