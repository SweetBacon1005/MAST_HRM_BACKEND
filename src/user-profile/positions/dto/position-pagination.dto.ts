import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class PositionPaginationDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tên vị trí',
    example: 'Engineer',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo level ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  level_id?: number;
}
