import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class TimesheetReportDto {
  @ApiPropertyOptional({
    description: 'Ngày bắt đầu báo cáo (YYYY-MM-DD)',
    example: '2024-02-01',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc báo cáo (YYYY-MM-DD)',
    example: '2024-02-29',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'ID phòng ban',
    example: '2',
  })
  @IsOptional()
  @IsString()
  division_id?: number;

  @ApiPropertyOptional({
    description: 'ID team',
    example: '3',
  })
  @IsOptional()
  @IsString()
  team_id?: number;

  @ApiPropertyOptional({
    description: 'Loại báo cáo (daily, weekly, monthly)',
    example: 'monthly',
  })
  @IsOptional()
  @IsString()
  report_type?: string;
}

export class WorkingTimeReportDto {
  @ApiPropertyOptional({
    description: 'Tháng báo cáo (YYYY-MM)',
    example: '2024-02',
  })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({
    description: 'Năm báo cáo',
    example: '2024',
  })
  @IsOptional()
  @IsString()
  year?: number;

  @ApiPropertyOptional({
    description: 'ID người dùng',
    example: '1',
  })
  @IsOptional()
  @IsString()
  user_id?: number;
}
