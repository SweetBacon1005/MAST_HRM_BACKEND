import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApprovalStatus } from '@prisma/client';

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

  @ApiPropertyOptional({ description: 'Lọc theo ID phòng ban', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  division_id?: number;

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
    enum: ApprovalStatus,
    example: ApprovalStatus.APPROVED,
  })
  @IsOptional()
  @IsEnum(ApprovalStatus)
  status?: ApprovalStatus;

  @ApiPropertyOptional({ 
    description: 'Chỉ lấy users không thuộc division nào (true/false)',
    example: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  users_without_division?: boolean;

  @ApiPropertyOptional({ 
    description: 'Chỉ lấy daily reports của những users có role Division Head (true/false)',
    example: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  division_head_only?: boolean;
}
