import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'Tên người dùng',
    example: 'Nguyễn Văn A',
  })
  @IsString({ message: 'Tên phải là chuỗi' })
  name: string;

  @ApiProperty({
    description: 'Email người dùng',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({
    description: 'Mật khẩu (tối thiểu 6 ký tự)',
    example: '123456',
    minLength: 6,
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;
}
