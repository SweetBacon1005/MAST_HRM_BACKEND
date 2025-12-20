import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserInformationStatus } from '@prisma/client';

export class UpdateUserDto {
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
    description: 'Trạng thái người dùng',
    enum: UserInformationStatus,
    example: UserInformationStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserInformationStatus, {
    message: 'Trạng thái không hợp lệ',
  })
  status?: UserInformationStatus;
}
