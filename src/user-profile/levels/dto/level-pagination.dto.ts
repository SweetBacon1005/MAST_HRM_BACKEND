import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class LevelPaginationDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tên level',
    example: 'Senior',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo cấp độ',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  level?: number;
}
