import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString, IsUrl } from 'class-validator';

export class RegisterFaceDto {
  @ApiProperty({
    description: 'ID của user cần đăng ký khuôn mặt',
    example: 123,
  })
  @IsNotEmpty({ message: 'user_id là bắt buộc' })
  @IsNumber({}, { message: 'user_id phải là số' })
  @IsPositive({ message: 'user_id phải là số dương' })
  user_id: number;

  @ApiProperty({
    description: 'URL ảnh khuôn mặt đã upload lên Cloudinary (từ presigned URL)',
    example: 'https://res.cloudinary.com/demo/image/upload/v1234567890/faces/user_123.jpg',
  })
  @IsNotEmpty({ message: 'photo_url là bắt buộc' })
  @IsString()
  @IsUrl({}, { message: 'photo_url phải là URL hợp lệ' })
  photo_url: string;
}
