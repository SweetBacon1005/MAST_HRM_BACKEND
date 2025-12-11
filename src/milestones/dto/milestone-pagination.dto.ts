import { ApiProperty } from '@nestjs/swagger';
import { MilestoneStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class MilestonePaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Tìm kiếm theo tên hoặc mô tả',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Lọc theo trạng thái mốc',
    enum: MilestoneStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @ApiProperty({
    description: 'Lọc theo ID dự án',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  project_id?: number;
}
