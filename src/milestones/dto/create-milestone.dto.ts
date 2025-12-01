import { ApiProperty } from '@nestjs/swagger';
import { MilestoneStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateMilestoneDto {
  @ApiProperty({
    description: 'Tên mốc dự án',
    example: 'Phase 1 - Planning & Analysis',
  })
  @IsString({ message: 'Tên mốc phải là chuỗi' })
  @MaxLength(255, { message: 'Tên mốc không được quá 255 ký tự' })
  name: string;

  @ApiProperty({
    description: 'Mô tả chi tiết mốc dự án',
    example: 'Thu thập yêu cầu và phân tích hệ thống',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Ngày bắt đầu mốc (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsDateString({}, { message: 'Ngày bắt đầu phải có định dạng YYYY-MM-DD' })
  start_date: string;

  @ApiProperty({
    description: 'Ngày kết thúc mốc (YYYY-MM-DD)',
    example: '2024-03-31',
  })
  @IsDateString({}, { message: 'Ngày kết thúc phải có định dạng YYYY-MM-DD' })
  end_date: string;

  @ApiProperty({
    description: 'Trạng thái mốc',
    example: MilestoneStatus.PENDING,
    enum: MilestoneStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @ApiProperty({
    description: 'Tiến độ mốc (0-100)',
    example: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Tiến độ phải từ 0-100' })
  @Max(100, { message: 'Tiến độ phải từ 0-100' })
  progress?: number;

  @ApiProperty({
    description: 'Thứ tự sắp xếp mốc',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  order?: number;
}
