import { OmitType, PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

// Loại bỏ password và role_id khỏi CreateUserDto
// role_id được quản lý qua user_role_assignment, không update trực tiếp
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'role_id'] as const),
) {
  @ApiProperty({
    description: 'Tên người dùng',
    example: 'Nguyễn Văn B',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Tên phải là chuỗi' })
  name?: string;

  @ApiProperty({
    description: 'Email người dùng',
    example: 'updated.user@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;
}
