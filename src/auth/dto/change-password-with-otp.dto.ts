import { IsEmail, IsString, MinLength, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordWithOtpDto {
  @ApiProperty({
    description: 'Email của tài khoản',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({
    description: 'Mã OTP 6 số',
    example: '123456',
  })
  @IsString({ message: 'Mã OTP phải là chuỗi' })
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 số' })
  otp: string;

  @ApiProperty({
    description: 'Mật khẩu mới (tối thiểu 6 ký tự)',
    example: 'new_password123',
    minLength: 6,
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  new_password: string;
}
