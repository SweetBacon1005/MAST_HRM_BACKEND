import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class CheckinDto {
  // location_type removed - derived from IP validation on server-side

  @ApiPropertyOptional({
    description: 'Loại phiên làm việc',
    example: 'WORK',
    enum: ['WORK', 'OVERTIME', 'BREAK'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['WORK', 'OVERTIME', 'BREAK'])
  session_type?: string;

  @ApiPropertyOptional({
    description: 'Thông tin thiết bị',
    example: 'iPhone 15 Pro - iOS 17.2',
  })
  @IsOptional()
  @IsString()
  device_info?: string;

  @ApiPropertyOptional({
    description: 'URL ảnh selfie (bắt buộc, đã được validate bởi face identification service)',
    example: 'https://example.com/photos/checkin_123.jpg',
  })
  @IsOptional()
  @IsString()
  photo_url?: string;
}

export class CheckoutDto {
  // location_type removed - derived from IP validation on server-side
  // ip_address removed - always get from server-side request

  @ApiPropertyOptional({
    description: 'Loại phiên làm việc',
    example: 'WORK',
    enum: ['WORK', 'OVERTIME', 'BREAK'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['WORK', 'OVERTIME', 'BREAK'])
  session_type?: string;

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
}
