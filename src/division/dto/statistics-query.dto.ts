import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min } from 'class-validator';

export class StatisticsQueryDto {
  @ApiPropertyOptional({
    description: 'Năm lấy dữ liệu thống kê',
    example: 2025,
    minimum: 2020,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year?: number;
}
