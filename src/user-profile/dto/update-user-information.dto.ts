import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsDateString,
  IsInt,
} from 'class-validator';

export class UpdateUserInformationDto {
  @ApiProperty({ description: 'Email cá nhân', example: 'user@gmail.com' })
  @IsOptional()
  @IsEmail()
  personal_email?: string;

  @ApiProperty({ description: 'Quốc tịch', example: 'Việt Nam' })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiProperty({ description: 'Họ và tên', example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Mã nhân viên', example: 'EMP001' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Giới tính', example: 'Nam' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ description: 'Tình trạng hôn nhân', example: 'Độc thân' })
  @IsOptional()
  @IsString()
  marital?: string;

  @ApiProperty({ description: 'Ngày sinh', example: '1990-01-01' })
  @IsOptional()
  @IsDateString()
  birthday?: string;

  @ApiProperty({
    description: 'ID vị trí công việc',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  position_id?: number;

  @ApiProperty({
    description: 'Địa chỉ thường trú',
    example: '123 Đường ABC, Quận 1, TP.HCM',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Địa chỉ tạm trú',
    example: '456 Đường XYZ, Quận 2, TP.HCM',
  })
  @IsOptional()
  @IsString()
  temp_address?: string;

  @ApiProperty({ description: 'Số điện thoại', example: '0901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Mã số thuế', example: '123456789' })
  @IsOptional()
  @IsString()
  tax_code?: string;


  @ApiProperty({ description: 'Trạng thái', example: 'Đang làm việc' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Mô tả',
    example: 'Nhân viên phát triển phần mềm',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'ID cấp độ', example: 1 })
  @IsOptional()
  @IsInt()
  level_id?: number;

  @ApiProperty({ description: 'Ghi chú', example: 'Ghi chú về nhân viên' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ description: 'Tổng quan', example: 'Tổng quan về nhân viên' })
  @IsOptional()
  @IsString()
  overview?: string;

  @ApiProperty({ description: 'Chuyên môn', example: 'Phát triển web' })
  @IsOptional()
  @IsString()
  expertise?: string;

  @ApiProperty({ description: 'Kỹ thuật', example: 'React, Node.js' })
  @IsOptional()
  @IsString()
  technique?: string;

  @ApiProperty({
    description: 'Nhiệm vụ chính',
    example: 'Phát triển frontend',
  })
  @IsOptional()
  @IsString()
  main_task?: string;

  @ApiProperty({ description: 'ID ngôn ngữ', example: 1 })
  @IsOptional()
  @IsInt()
  language_id?: number;
}
