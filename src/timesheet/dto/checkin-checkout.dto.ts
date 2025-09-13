import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CheckinDto {
  @ApiPropertyOptional({
    description: 'Loại địa điểm',
    example: 'office',
    enum: ['office', 'remote', 'client_site'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['office', 'remote', 'client_site'])
  location_type?: string;

  @ApiPropertyOptional({
    description: 'Tọa độ GPS - Latitude',
    example: 21.0285,
  })
  @IsOptional()
  @IsNumber()
  gps_latitude?: number;

  @ApiPropertyOptional({
    description: 'Tọa độ GPS - Longitude',
    example: 105.8542,
  })
  @IsOptional()
  @IsNumber()
  gps_longitude?: number;

  @ApiPropertyOptional({
    description: 'Địa chỉ IP',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsString()
  ip_address?: string;

  @ApiPropertyOptional({
    description: 'Thông tin thiết bị',
    example: 'iPhone 15 Pro - iOS 17.2',
  })
  @IsOptional()
  @IsString()
  device_info?: string;

  @ApiPropertyOptional({
    description: 'URL ảnh selfie',
    example: 'https://example.com/photos/checkin_123.jpg',
  })
  @IsOptional()
  @IsString()
  photo_url?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú',
    example: 'Check-in bình thường',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Làm việc từ xa (0: office, 1: remote, 2: hybrid)',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @IsIn([0, 1, 2])
  remote?: number;
}

export class CheckoutDto {
  @ApiPropertyOptional({
    description: 'Loại địa điểm',
    example: 'office',
    enum: ['office', 'remote', 'client_site'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['office', 'remote', 'client_site'])
  location_type?: string;

  @ApiPropertyOptional({
    description: 'Tọa độ GPS - Latitude',
    example: 21.0285,
  })
  @IsOptional()
  @IsNumber()
  gps_latitude?: number;

  @ApiPropertyOptional({
    description: 'Tọa độ GPS - Longitude',
    example: 105.8542,
  })
  @IsOptional()
  @IsNumber()
  gps_longitude?: number;

  @ApiPropertyOptional({
    description: 'Địa chỉ IP',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsString()
  ip_address?: string;

  @ApiPropertyOptional({
    description: 'Thông tin thiết bị',
    example: 'iPhone 15 Pro - iOS 17.2',
  })
  @IsOptional()
  @IsString()
  device_info?: string;

  @ApiPropertyOptional({
    description: 'URL ảnh selfie',
    example: 'https://example.com/photos/checkout_123.jpg',
  })
  @IsOptional()
  @IsString()
  photo_url?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú',
    example: 'Check-out hoàn thành công việc',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
