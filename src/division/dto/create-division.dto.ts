import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  Min,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class CreateDivisionDto {
  @ApiProperty({
    description: 'Tên phòng ban',
    example: 'Phòng Phát triển Phần mềm',
  })
  @IsString({ message: 'Tên phòng ban phải là chuỗi' })
  @MaxLength(255, { message: 'Tên phòng ban không được quá 255 ký tự' })
  name: string;

  @ApiProperty({
    description: 'Có phải là dự án hoạt động không',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'is_active_project phải là boolean' })
  is_active_project?: boolean = true;

  @ApiProperty({
    description: 'Loại phòng ban',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Loại phòng ban phải là số nguyên' })
  type?: number;

  @ApiProperty({
    description: 'Trạng thái phòng ban',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trạng thái phòng ban phải là số nguyên' })
  status?: number;

  @ApiProperty({
    description: 'Cấp độ phòng ban',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Cấp độ phòng ban phải là số nguyên' })
  @Min(1, { message: 'Cấp độ phòng ban phải lớn hơn 0' })
  level?: number;

  @ApiProperty({
    description: 'Địa chỉ phòng ban',
    example: 'Tầng 5, Tòa nhà ABC, Hà Nội',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Địa chỉ phải là chuỗi' })
  @MaxLength(500, { message: 'Địa chỉ không được quá 500 ký tự' })
  address?: string;

  @ApiProperty({
    description: 'ID phòng ban cha',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID phòng ban cha phải là số nguyên' })
  @Min(1, { message: 'ID phòng ban cha phải lớn hơn 0' })
  parent_id?: number;

  @ApiProperty({
    description: 'Ngày thành lập',
    example: '2024-01-01',
  })
  @IsDateString({}, { message: 'Ngày thành lập phải có định dạng YYYY-MM-DD' })
  founding_at: string;

  @ApiProperty({
    description: 'Mô tả phòng ban',
    example: 'Phòng ban chuyên phát triển các ứng dụng web và mobile',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MaxLength(1000, { message: 'Mô tả không được quá 1000 ký tự' })
  description?: string;

  @ApiProperty({
    description: 'Tổng số thành viên',
    example: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Tổng số thành viên phải là số nguyên' })
  @Min(0, { message: 'Tổng số thành viên không được âm' })
  total_member?: number;
}
