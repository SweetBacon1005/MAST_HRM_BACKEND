import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalStatus, AssetCategory, AssetRequestType } from '@prisma/client';
import { IsString, IsOptional, IsDateString, IsEnum, IsInt } from 'class-validator';

export class CreateAssetRequestDto {
  @ApiProperty({
    description: 'Loại request',
    enum: AssetRequestType,
    example: AssetRequestType.REQUEST,
  })
  @IsEnum(AssetRequestType)
  request_type: AssetRequestType;

  @ApiProperty({
    description: 'Danh mục tài sản cần request',
    example: AssetCategory.LAPTOP,
    enum: AssetCategory,
  })
  @IsEnum(AssetCategory)
  category: AssetCategory;

  @ApiProperty({
    description: 'Mô tả chi tiết tài sản cần thiết',
    example: 'Laptop cho công việc development, cần cấu hình cao với RAM 16GB',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Lý do cần tài sản',
    example: 'Laptop hiện tại đã hỏng, cần thay thế để tiếp tục công việc',
  })
  @IsString()
  justification: string;

  @ApiPropertyOptional({
    description: 'Ngày mong muốn nhận tài sản (YYYY-MM-DD)',
    example: '2024-02-01',
  })
  @IsOptional()
  @IsDateString()
  expected_date?: string;

  @ApiPropertyOptional({
    description: 'ID tài sản cụ thể (cho RETURN hoặc MAINTENANCE)',
    example: 123,
  })
  @IsOptional()
  @IsInt()
  asset_id?: number;

  @ApiPropertyOptional({
    description: 'Ghi chú thêm',
    example: 'Cần gấp trong tuần này',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiHideProperty()
  @IsOptional()
  user_id: number;
}

export class ReviewAssetRequestDto {
  @ApiProperty({
    description: 'Trạng thái',
    enum: ApprovalStatus,
    example: ApprovalStatus.APPROVED,
  })
  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @ApiPropertyOptional({
    description: 'ID tài sản được gán (khi approve hoặc reject)',
    example: 123,
  })
  @IsOptional()
  @IsInt()
  asset_id?: number;

  @ApiPropertyOptional({
    description: 'Ghi chú của người duyệt',
    example: 'Đã gán laptop Dell XPS 13',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Lý do từ chối',
    example: "Không có tài sản phù hợp trong kho",
  })
  @IsOptional()
  @IsString()
  rejection_reason?: string;
}

export class FulfillAssetRequestDto {
  @ApiProperty({
    description: 'ID tài sản được giao',
    example: 123,
  })
  @IsInt()
  asset_id: number;

  @ApiPropertyOptional({
    description: 'Ghi chú khi giao tài sản',
    example: 'Đã giao tài sản và hướng dẫn sử dụng',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAssetRequestDto {
  @ApiPropertyOptional({
    description: 'Loại request',
    enum: AssetRequestType,
    example: AssetRequestType.REQUEST,
  })
  @IsOptional()
  @IsEnum(AssetRequestType)
  request_type?: AssetRequestType;

  @ApiPropertyOptional({
    description: 'Danh mục tài sản cần request',
    example: AssetCategory.LAPTOP,
    enum: AssetCategory,
  })
  @IsOptional()
  @IsEnum(AssetCategory)
  category?: AssetCategory;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết tài sản cần thiết',
    example: 'Laptop cho công việc development, cần cấu hình cao với RAM 16GB',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Lý do cần tài sản',
    example: 'Laptop hiện tại đã hỏng, cần thay thế để tiếp tục công việc',
  })
  @IsOptional()
  @IsString()
  justification?: string;

  @ApiPropertyOptional({
    description: 'Ngày mong muốn nhận tài sản (YYYY-MM-DD)',
    example: '2024-02-01',
  })
  @IsOptional()
  @IsDateString()
  expected_date?: string;

  @ApiPropertyOptional({
    description: 'ID tài sản cụ thể (cho RETURN hoặc MAINTENANCE)',
    example: 123,
  })
  @IsOptional()
  @IsInt()
  asset_id?: number;

  @ApiPropertyOptional({
    description: 'Ghi chú thêm',
    example: 'Cần gấp trong tuần này',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
