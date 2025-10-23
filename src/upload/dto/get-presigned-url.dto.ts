import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class GetPresignedUrlDto {
  @ApiProperty({
    description: 'Loại file cần upload',
    example: 'image/jpeg',
    enum: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  })
  @IsString()
  @IsIn(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
  file_type: string;

  @ApiProperty({
    description: 'Thư mục lưu trữ trên Cloudinary',
    example: 'avatars',
    required: false,
    default: 'avatars',
  })
  @IsOptional()
  @IsString()
  folder?: string;
}
