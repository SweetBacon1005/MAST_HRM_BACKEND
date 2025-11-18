import { ApiProperty } from '@nestjs/swagger';
import { IndustryType, ProjectStatus, ProjectType } from '@prisma/client';
import { Type, Transform } from 'class-transformer';
import {
  IsString,
  IsInt,
  IsOptional,
  IsNumber,
  IsDateString,
  MaxLength,
  Min,
  IsEnum,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Tên dự án',
    example: 'Website Thương mại điện tử',
  })
  @IsString({ message: 'Tên dự án phải là chuỗi' })
  @MaxLength(255, { message: 'Tên dự án không được quá 255 ký tự' })
  name: string;

  @ApiProperty({
    description: 'Mã dự án',
    example: 'ECOM-001',
  })
  @IsString({ message: 'Mã dự án phải là chuỗi' })
  @MaxLength(50, { message: 'Mã dự án không được quá 50 ký tự' })
  code: string;

  @ApiProperty({
    description: 'Trạng thái dự án',
    example: ProjectStatus.OPEN,
    enum: ProjectStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiProperty({
    description: 'ID phòng ban',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID phòng ban phải là số nguyên' })
  @Min(1, { message: 'ID phòng ban phải lớn hơn 0' })
  division_id?: number;

  @ApiProperty({
    description: 'ID team',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID team phải là số nguyên' })
  @Min(1, { message: 'ID team phải lớn hơn 0' })
  team_id?: number;

  @ApiProperty({
    description: 'Loại dự án',
    example: ProjectType.INTERNAL,
    enum: ProjectType,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectType)
  project_type?: ProjectType;

  @ApiProperty({
    description: 'Xếp hạng',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Rank phải là số nguyên' })
  rank?: number;

  @ApiProperty({
    description: 'Ngành công nghiệp',
    example: IndustryType.IT,
    enum: IndustryType,
    required: false,
  })
  @IsOptional()
  @IsEnum(IndustryType)
  industry?: IndustryType;

  @ApiProperty({
    description: 'Phạm vi dự án',
    example: 'Phát triển website từ đầu',
    required: false,
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiProperty({
    description: 'Mô tả dự án',
    example: 'Dự án phát triển website thương mại điện tử',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Thông tin hợp đồng',
    example: 'Hợp đồng số 001/2024',
    required: false,
  })
  @IsOptional()
  @IsString()
  contract_information?: string;

  @ApiProperty({
    description: 'Mức độ quan trọng',
    example: 'HIGH',
    required: false,
  })
  @IsOptional()
  @IsString()
  critical?: string;

  @ApiProperty({
    description: 'Ghi chú',
    example: 'Dự án ưu tiên cao',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsDateString({}, { message: 'Ngày bắt đầu phải có định dạng YYYY-MM-DD' })
  start_date: string;

  @ApiProperty({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsDateString({}, { message: 'Ngày kết thúc phải có định dạng YYYY-MM-DD' })
  end_date: string;
}

