import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsOptional, IsString, IsInt, IsBoolean, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { DivisionStatus, DivisionType } from '@prisma/client';

export class DivisionPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Tìm kiếm theo tên phòng ban',
    example: 'Phát triển',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Lọc theo loại phòng ban',
    example: DivisionType.TECHNICAL,
    required: false,
  })
  @IsOptional()
  @IsEnum(DivisionType)
  type?: DivisionType;

  @ApiProperty({
    description: 'Lọc theo trạng thái phòng ban',
    example: DivisionStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(DivisionStatus)
  status?: DivisionStatus;
}
