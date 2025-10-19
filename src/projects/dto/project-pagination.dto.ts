import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ProjectPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Tìm kiếm theo tên hoặc mã dự án',
    example: 'Website',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Lọc theo trạng thái',
    example: 'OPEN',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Lọc theo ID phòng ban',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  division_id?: number;

  @ApiProperty({
    description: 'Lọc theo ID team',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  team_id?: number;

  @ApiProperty({
    description: 'Lọc theo loại dự án',
    example: 'WEB_DEVELOPMENT',
    required: false,
  })
  @IsOptional()
  @IsString()
  project_type?: string;
}

