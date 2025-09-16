import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsDateString,
  IsInt,
} from 'class-validator';

export class UpdateUserInformationDto {
  @ApiProperty({ description: 'Email công ty', example: 'user@company.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

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

  @ApiProperty({
    description: 'Đường dẫn avatar',
    example: '/avatars/user.jpg',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

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

  @ApiProperty({ description: 'ID vị trí công việc' })
  @IsOptional()
  @IsInt()
  position_id?: number;

  @ApiProperty({ description: 'ID văn phòng' })
  @IsOptional()
  @IsInt()
  office_id?: number;

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

  @ApiProperty({ description: 'ID vai trò' })
  @IsOptional()
  @IsInt()
  role_id?: number;

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

  @ApiProperty({ description: 'ID cấp độ' })
  @IsOptional()
  @IsInt()
  level_id?: number;

  @ApiProperty({ description: 'Mã số bảo hiểm xã hội', example: '1234567890' })
  @IsOptional()
  @IsString()
  social_insurance_code?: string;

  @ApiProperty({ description: 'ID nhà cung cấp', example: 'provider123' })
  @IsOptional()
  @IsString()
  provider_id?: string;

  @ApiProperty({ description: 'Ghi chú', example: 'Ghi chú về nhân viên' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ description: 'Tổng quan', example: 'Tổng quan về nhân viên' })
  @IsOptional()
  @IsString()
  overview?: string;

  @ApiProperty({ description: 'Loại thị trường', example: 'Trong nước' })
  @IsOptional()
  @IsString()
  market_type?: string;

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

  @ApiProperty({ description: 'ID ngôn ngữ' })
  @IsOptional()
  @IsInt()
  language_id?: number;
}
