import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateDailyReportDto {
  @ApiProperty({ description: 'ID dự án', example: 12 })
  @IsNotEmpty()
  @IsNumber()
  project_id!: number;

  @ApiProperty({ description: 'Ngày làm việc (YYYY-MM-DD)', example: '2025-01-15' })
  @IsNotEmpty()
  @IsDateString()
  work_date!: string;

  @ApiProperty({ description: 'Thời gian thực tế (giờ)', example: 7.5 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0, { message: 'Thời gian làm việc không được âm' })
  @Max(24, { message: 'Thời gian làm việc không được vượt quá 24 giờ' })
  actual_time!: number;

  @ApiPropertyOptional({ description: 'Tiêu đề', example: 'Fix bug và review code' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Mô tả chi tiết công việc', example: 'Sửa các lỗi priority P1, viết unit test' })
  @IsOptional()
  @IsString()
  description?: string;
}
