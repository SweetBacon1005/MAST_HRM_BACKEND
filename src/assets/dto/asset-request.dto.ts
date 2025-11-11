import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum, IsInt } from 'class-validator';

export class CreateAssetRequestDto {
  @ApiProperty({
    description: 'Loại request',
    enum: ['REQUEST', 'RETURN', 'MAINTENANCE'],
    example: 'REQUEST',
  })
  @IsEnum(['REQUEST', 'RETURN', 'MAINTENANCE'])
  request_type: string;

  @ApiProperty({
    description: 'Danh mục tài sản cần request',
    example: 'LAPTOP',
    enum: ['LAPTOP', 'DESKTOP', 'MONITOR', 'KEYBOARD', 'MOUSE', 'HEADPHONE', 'PHONE', 'TABLET', 'FURNITURE', 'EQUIPMENT', 'OTHER'],
  })
  @IsEnum(['LAPTOP', 'DESKTOP', 'MONITOR', 'KEYBOARD', 'MOUSE', 'HEADPHONE', 'PHONE', 'TABLET', 'FURNITURE', 'EQUIPMENT', 'OTHER'])
  category: string;

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

  // Will be set automatically from JWT token
  user_id?: number;
}

export class ApproveAssetRequestDto {
  @ApiProperty({
    description: 'Hành động',
    enum: ['APPROVE', 'REJECT'],
    example: 'APPROVE',
  })
  @IsEnum(['APPROVE', 'REJECT'])
  action: string;

  @ApiPropertyOptional({
    description: 'ID tài sản được gán (khi approve)',
    example: 123,
  })
  @IsOptional()
  @IsInt()
  asset_id?: number;

  @ApiPropertyOptional({
    description: 'Lý do từ chối (khi reject)',
    example: 'Không có tài sản phù hợp trong kho',
  })
  @IsOptional()
  @IsString()
  rejection_reason?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú của người duyệt',
    example: 'Đã gán laptop Dell XPS 13',
  })
  @IsOptional()
  @IsString()
  notes?: string;
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
