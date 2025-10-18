import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsString,
  IsInt,
  IsOptional,
  IsNumber,
  IsDateString,
  MaxLength,
  Min,
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
    example: 'OPEN',
    enum: ['OPEN', 'CLOSED', 'PENDING', 'IN_PROGRESS', 'COMPLETED'],
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

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
    description: 'Loại hợp đồng',
    example: 'FIXED_PRICE',
    required: false,
  })
  @IsOptional()
  @IsString()
  contract_type?: string;

  @ApiProperty({
    description: 'Loại dự án',
    example: 'WEB_DEVELOPMENT',
    required: false,
  })
  @IsOptional()
  @IsString()
  project_type?: string;

  @ApiProperty({
    description: 'Tỷ lệ billable',
    example: 0.8,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Billable phải là số' })
  billable?: number;

  @ApiProperty({
    description: 'Ngân sách dự án',
    example: 100000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Budget phải là số' })
  budget?: number;

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
    description: 'Loại khách hàng',
    example: 'ENTERPRISE',
    required: false,
  })
  @IsOptional()
  @IsString()
  customer_type?: string;

  @ApiProperty({
    description: 'Ngành công nghiệp',
    example: 'IT',
    required: false,
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({
    description: 'Phạm vi dự án',
    example: 'Phát triển website từ đầu',
    required: false,
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiProperty({
    description: 'Số quy trình áp dụng',
    example: 5,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  number_process_apply?: number;

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

