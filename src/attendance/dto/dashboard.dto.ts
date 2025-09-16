import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class AttendanceDashboardDto {
  @ApiPropertyOptional({ description: 'Ngày bắt đầu (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'ID phòng ban' })
  @IsOptional()
  @IsInt()
  division_id?: number;

  @ApiPropertyOptional({ description: 'ID team' })
  @IsOptional()
  @IsInt()
  team_id?: number;

  @ApiPropertyOptional({
    description: 'Loại thống kê',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  @IsOptional()
  @IsString()
  period_type?: string;
}

export class AttendanceReportDto {
  @ApiPropertyOptional({ description: 'Tháng báo cáo (YYYY-MM)' })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({ description: 'Năm báo cáo' })
  @IsOptional()
  @IsInt()
  year?: number;

  @ApiPropertyOptional({ description: 'Danh sách ID người dùng' })
  @IsOptional()
  @IsArray()
  user_ids?: number[];

  @ApiPropertyOptional({
    description: 'Loại báo cáo',
    enum: ['summary', 'detailed', 'penalty', 'leave'],
  })
  @IsOptional()
  @IsString()
  report_type?: string;

  @ApiPropertyOptional({
    description: 'Định dạng xuất',
    enum: ['json', 'excel', 'pdf'],
  })
  @IsOptional()
  @IsString()
  export_format?: string;
}

export class PenaltyReportDto {
  @ApiPropertyOptional({ description: 'Ngày bắt đầu' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Mức độ phạt tối thiểu' })
  @IsOptional()
  @IsInt()
  min_penalty_amount?: number;

  @ApiPropertyOptional({
    description: 'Loại vi phạm',
    enum: ['late', 'early', 'absent', 'all'],
  })
  @IsOptional()
  @IsString()
  violation_type?: string;
}
