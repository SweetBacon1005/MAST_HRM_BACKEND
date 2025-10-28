import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class RolePaginationDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tên role',
    example: 'manager',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
