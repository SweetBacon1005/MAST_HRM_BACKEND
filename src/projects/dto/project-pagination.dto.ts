import { ApiProperty } from '@nestjs/swagger';
import { ProjectType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
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
    description: 'Loại dự án',
    example: ProjectType.INTERNAL,
    enum: ProjectType,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectType)
  project_type?: ProjectType;

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
}
