import { ApiPropertyOptional } from '@nestjs/swagger';
import { LocationType, RemoteType, SessionType } from '@prisma/client';
import { IsEnum, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckinDto {
  @ApiPropertyOptional({
    description: 'Loại địa điểm',
    example: 'OFFICE',
    enum: ['OFFICE', 'REMOTE', 'CLIENT_SITE'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['OFFICE', 'REMOTE', 'CLIENT_SITE'])
  location_type?: LocationType;

  @ApiPropertyOptional({
    description: 'Loại phiên làm việc',
    example: 'WORK',
    enum: ['WORK', 'OVERTIME', 'BREAK'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['WORK', 'OVERTIME', 'BREAK'])
  session_type?: SessionType;

  @ApiPropertyOptional({
    description: 'Tọa độ GPS - Latitude',
    example: 21.0285,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gps_latitude?: number;

  @ApiPropertyOptional({
    description: 'Tọa độ GPS - Longitude',
    example: 105.8542,
  })
  @IsOptional()
  @Type(() => Number)
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
    description: 'Làm việc từ xa [OFFICE, REMOTE, HYBRID]',
    example: RemoteType.OFFICE,
  })
  @IsOptional()
  @IsString()
  @IsIn([RemoteType.OFFICE, RemoteType.REMOTE, RemoteType.HYBRID])
  remote?: RemoteType;
}

export class CheckoutDto {
  @ApiPropertyOptional({
    description: 'Loại địa điểm',
    example: LocationType.OFFICE,
    enum: LocationType,
  })
  @IsOptional()
  @IsEnum(LocationType)
  location_type?: LocationType;

  @ApiPropertyOptional({
    description: 'Loại phiên làm việc',
    example: 'WORK',
    enum: ['WORK', 'OVERTIME', 'BREAK'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['WORK', 'OVERTIME', 'BREAK'])
  session_type?: SessionType;

  @ApiPropertyOptional({
    description: 'Tọa độ GPS - Latitude',
    example: 21.0285,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gps_latitude?: number;

  @ApiPropertyOptional({
    description: 'Tọa độ GPS - Longitude',
    example: 105.8542,
  })
  @IsOptional()
  @Type(() => Number)
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
