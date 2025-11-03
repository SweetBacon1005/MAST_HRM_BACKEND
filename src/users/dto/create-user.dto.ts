import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { ROLE_NAMES } from 'src/auth/constants/role.constants';

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

  @ApiProperty({
    description: 'Vai trò người dùng',
    example: ROLE_NAMES.ADMIN,
    enum: ROLE_NAMES,
  })
  @IsString({ message: 'Vai trò phải là chuỗi' })
  @IsEnum(ROLE_NAMES, { message: 'Vai trò không hợp lệ' })
  role: string;
}
