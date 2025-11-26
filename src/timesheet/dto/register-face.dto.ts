import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsPositive, IsString, IsUrl } from 'class-validator';

export class RegisterFaceDto {
  @ApiProperty({
    description: 'ID của user cần đăng ký khuôn mặt',
    example: 123,
  })
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsNotEmpty({ message: 'user_id là bắt buộc' })
  @IsNumber({}, { message: 'user_id phải là số' })
  user_id: number;

  @ApiProperty({
    description: 'URL ảnh khuôn mặt đã upload lên Cloudinary (từ presigned URL)',
    example: 'https://res.cloudinary.com/demo/image/upload/v1234567890/faces/user_123.jpg',
  })
  @IsNotEmpty({ message: 'photo_url là bắt buộc' })
  @IsString()
  photo_url: string;
}
