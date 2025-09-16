import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsInt,
} from 'class-validator';

export class CreateChildDto {
  @ApiProperty({ description: 'ID người dùng' })
  @IsInt()
  user_id: number;

  @ApiProperty({ description: 'Giới tính', example: 'Nam' })
  @IsString()
  gender: string;

  @ApiProperty({ description: 'Họ và tên', example: 'Nguyễn Văn B' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Ngày sinh', example: '2010-01-01' })
  @IsDateString()
  birthday: string;

  @ApiProperty({
    description: 'Số điện thoại',
    example: '0901234567',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Có phải là người phụ thuộc không',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_dependent?: boolean;

  @ApiProperty({ description: 'Ngày bắt đầu phụ thuộc', example: '2010-01-01' })
  @IsDateString()
  dependent_start_date: string;

  @ApiProperty({ description: 'Loại quan hệ', example: 'Con' })
  @IsString()
  type: string;
}
