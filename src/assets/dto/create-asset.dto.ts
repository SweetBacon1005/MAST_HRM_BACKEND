import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsDecimal, IsEnum, MaxLength } from 'class-validator';

export class CreateAssetDto {
  @ApiProperty({
    description: 'Tên tài sản',
    example: 'Laptop Dell XPS 13',
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết tài sản',
    example: 'Laptop dành cho developer, cấu hình cao',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Mã tài sản (unique)',
    example: 'LAPTOP-001',
  })
  @IsString()
  @MaxLength(100)
  asset_code: string;

  @ApiProperty({
    description: 'Danh mục tài sản',
    example: 'LAPTOP',
    enum: ['LAPTOP', 'DESKTOP', 'MONITOR', 'KEYBOARD', 'MOUSE', 'HEADPHONE', 'PHONE', 'TABLET', 'FURNITURE', 'EQUIPMENT', 'OTHER'],
  })
  @IsEnum(['LAPTOP', 'DESKTOP', 'MONITOR', 'KEYBOARD', 'MOUSE', 'HEADPHONE', 'PHONE', 'TABLET', 'FURNITURE', 'EQUIPMENT', 'OTHER'])
  category: string;

  @ApiPropertyOptional({
    description: 'Thương hiệu',
    example: 'Dell',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({
    description: 'Model/Phiên bản',
    example: 'XPS 13 9320',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({
    description: 'Số serial (unique)',
    example: 'DL123456789',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serial_number?: string;

  @ApiPropertyOptional({
    description: 'Ngày mua (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  purchase_date?: string;

  @ApiPropertyOptional({
    description: 'Giá mua',
    example: '25000000',
  })
  @IsOptional()
  @IsDecimal()
  purchase_price?: string;

  @ApiPropertyOptional({
    description: 'Ngày hết hạn bảo hành (YYYY-MM-DD)',
    example: '2026-01-15',
  })
  @IsOptional()
  @IsDateString()
  warranty_end_date?: string;

  @ApiPropertyOptional({
    description: 'Vị trí/Địa điểm',
    example: 'Tầng 2 - Phòng IT',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú',
    example: 'Tài sản mới, chưa sử dụng',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
