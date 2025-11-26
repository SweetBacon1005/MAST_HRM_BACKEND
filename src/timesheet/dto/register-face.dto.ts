import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class RegisterFaceDto {
  @ApiProperty({
    description: 'ID của user cần đăng ký khuôn mặt',
    example: 123,
  })
  @IsNotEmpty({ message: 'user_id là bắt buộc' })
  @IsNumber({}, { message: 'user_id phải là số' })
  @IsPositive({ message: 'user_id phải là số dương' })
  user_id: number;
}

export class ConfirmRegisterFaceDto {
  @ApiProperty({
    description: 'ID của user đã đăng ký khuôn mặt',
    example: 123,
  })
  @IsNotEmpty({ message: 'user_id là bắt buộc' })
  @IsNumber({}, { message: 'user_id phải là số' })
  @IsPositive({ message: 'user_id phải là số dương' })
  user_id: number;

  @ApiProperty({
    description: 'URL ảnh khuôn mặt đã upload lên Cloudinary',
    example: 'https://res.cloudinary.com/demo/image/upload/v1234567890/faces/user_123.jpg',
  })
  @IsNotEmpty({ message: 'photo_url là bắt buộc' })
  photo_url: string;
}
