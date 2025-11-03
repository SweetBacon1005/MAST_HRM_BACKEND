import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { ROLE_NAMES } from '../constants/role.constants';

export class RegisterDto {
  @ApiProperty({
    description: 'Tên người dùng',
    example: 'Nguyễn Văn A',
  })
  @IsString({ message: 'Tên phải là chuỗi' })
  name: string;

  @ApiProperty({
    description: 'Email đăng ký',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({
    description: 'Mật khẩu (tối thiểu 8 ký tự)',
    example: 'Mast@123',
    minLength: 8,
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password: string;

  @ApiProperty({
    description: 'Vai trò người dùng',
    example: ROLE_NAMES.EMPLOYEE,
    enum: ROLE_NAMES,
  })
  @IsString({ message: 'Vai trò phải là chuỗi' })
  @IsEnum(ROLE_NAMES, { message: 'Vai trò không hợp lệ' })
  role: string;
}
