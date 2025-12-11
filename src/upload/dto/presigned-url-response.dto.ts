import { ApiProperty } from '@nestjs/swagger';
import { TransformDateTime } from '../../common/decorators/date-format.decorator';

export class PresignedUrlResponseDto {
  @ApiProperty({
    description: 'URL để upload file lên Cloudinary',
    example: 'https://api.cloudinary.com/v1_1/your-cloud-name/image/upload',
  })
  upload_url: string;

  @ApiProperty({
    description: 'Public ID của ảnh trên Cloudinary',
    example: 'avatars/123_1640995200000',
  })
  public_id: string;

  @ApiProperty({
    description: 'Chữ ký xác thực cho upload',
    example: 'abc123def456...',
  })
  signature: string;

  @ApiProperty({
    description: 'Timestamp để tạo signature',
    example: 1640995200,
  })
  timestamp: number;

  @ApiProperty({
    description: 'API key của Cloudinary',
    example: '123456789012345',
  })
  api_key: string;

  @ApiProperty({
    description: 'Thư mục lưu trữ',
    example: 'avatars',
  })
  folder: string;

  @ApiProperty({
    description: 'Cấu hình transformation cho ảnh (Cloudinary format)',
    example: 'w_500,h_500,c_fill,q_auto:good,f_webp',
  })
  transformation: string;

  @ApiProperty({
    description: 'Thời gian hết hạn của presigned URL',
    example: '2024-01-01 12:00:00',
  })
  @TransformDateTime()
  expires_at: Date;
}
