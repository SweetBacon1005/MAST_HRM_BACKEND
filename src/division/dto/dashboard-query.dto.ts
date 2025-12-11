import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class DivisionDashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Tháng lấy dữ liệu (1-12)',
    example: 10,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({
    description: 'Năm lấy dữ liệu',
    example: 2025,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional({
    description: 'Ngày lấy dữ liệu thông tin làm việc (YYYY-MM-DD)',
    example: '2025-10-18',
  })
  @IsOptional()
  @IsString()
  work_date?: string;
}

