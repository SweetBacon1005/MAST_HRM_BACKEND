import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class LanguagePaginationDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tên hoặc mã ngôn ngữ',
    example: 'English',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
