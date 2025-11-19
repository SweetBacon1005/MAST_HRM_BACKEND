import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class DailyReportPaginationDto {
  @ApiPropertyOptional({ description: 'Số trang', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Số bản ghi trên mỗi trang', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Lọc theo ID người tạo report', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  user_id?: number;

  @ApiPropertyOptional({ description: 'Lọc theo ID dự án', example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  project_id?: number;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu (YYYY-MM-DD)', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc (YYYY-MM-DD)', example: '2025-01-31' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ 
    description: 'Lọc theo trạng thái duyệt',
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    example: 'PENDING'
  })
  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED'] as any)
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}
