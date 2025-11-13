import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AssetCategory, AssetRequestStatus} from '@prisma/client';

export class AssetPaginationDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tên hoặc mã tài sản',
    example: 'laptop',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo danh mục',
    example: 'LAPTOP',
    enum: ['LAPTOP', 'DESKTOP', 'MONITOR', 'KEYBOARD', 'MOUSE', 'HEADPHONE', 'PHONE', 'TABLET', 'FURNITURE', 'EQUIPMENT', 'OTHER'],
  })
  @IsOptional()
  @IsEnum(['LAPTOP', 'DESKTOP', 'MONITOR', 'KEYBOARD', 'MOUSE', 'HEADPHONE', 'PHONE', 'TABLET', 'FURNITURE', 'EQUIPMENT', 'OTHER'])
  category?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái',
    enum: ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED', 'LOST', 'DAMAGED'],
    example: 'AVAILABLE',
  })
  @IsOptional()
  @IsEnum(['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED', 'LOST', 'DAMAGED'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo user được gán',
    example: 123,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assigned_to?: number;

  @ApiPropertyOptional({
    description: 'Lọc theo thương hiệu',
    example: 'Dell',
  })
  @IsOptional()
  @IsString()
  brand?: string;
}

export class AssetRequestPaginationDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Tìm kiếm theo mô tả hoặc lý do',
    example: 'laptop',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái',
    enum: AssetRequestStatus,
    example: AssetRequestStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(AssetRequestStatus)
  status?: AssetRequestStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo danh mục',
    example: 'LAPTOP',
    enum: AssetCategory,
  })
  @IsOptional()
  @IsEnum(AssetCategory)
  category?: AssetCategory;

  @ApiPropertyOptional({
    description: 'Lọc theo user tạo request',
    example: 123,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;

  @ApiPropertyOptional({
    description: 'Lọc theo người duyệt',
    example: 456,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  approved_by?: number;
}
