import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class WorkInfoQueryDto {
  @ApiPropertyOptional({
    description: 'Ngày lấy dữ liệu thông tin làm việc (YYYY-MM-DD)',
    example: '2025-10-23',
  })
  @IsOptional()
  @IsString()
  @IsDateString()
  work_date?: string;
}
