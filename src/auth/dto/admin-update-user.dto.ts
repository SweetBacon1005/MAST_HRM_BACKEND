import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString } from 'class-validator';

export class AdminUpdateUserDto {
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

  @ApiProperty({
    description: 'ID vai trò người dùng',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID vai trò phải là số nguyên' })
  role_id?: number;

  @ApiProperty({
    description: 'ID phòng ban',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID phòng ban phải là số nguyên' })
  division_id?: number;

  @ApiProperty({
    description: 'ID vị trí công việc',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID vị trí phải là số nguyên' })
  position_id?: number;

  @ApiProperty({
    description: 'ID cấp bậc',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID cấp bậc phải là số nguyên' })
  level_id?: number;
}
