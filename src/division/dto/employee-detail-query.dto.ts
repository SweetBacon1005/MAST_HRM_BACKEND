import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class EmployeeDetailQueryDto {
  @ApiPropertyOptional({
    description: 'Ngày lấy dữ liệu chi tiết (YYYY-MM-DD)',
    example: '2025-10-23',
  })
  @IsOptional()
  @IsString()
  @IsDateString()
  date?: string;
}
