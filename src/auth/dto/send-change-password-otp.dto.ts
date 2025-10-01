import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendChangePasswordOtpDto {
  @ApiProperty({
    description: 'Email để gửi mã OTP thay đổi mật khẩu',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}
