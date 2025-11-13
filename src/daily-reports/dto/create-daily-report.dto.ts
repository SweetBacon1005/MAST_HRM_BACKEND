import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDailyReportDto {
  @ApiProperty({ description: 'ID d? án', example: 12 })
  @IsNotEmpty()
  @IsNumber()
  project_id!: number;

  @ApiProperty({ description: 'Ngày làm vi?c (YYYY-MM-DD)', example: '2025-01-15' })
  @IsNotEmpty()
  @IsDateString()
  work_date!: string;

  @ApiProperty({ description: 'Th?i gian th?c t? (gi?)', example: 7.5 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  actual_time!: number;

  @ApiPropertyOptional({ description: 'Tiêu d?', example: 'Fix bug và review code' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Mô t? chi ti?t công vi?c', example: 'S?a các l?i priority P1, vi?t unit test' })
  @IsOptional()
  @IsString()
  description?: string;
}
