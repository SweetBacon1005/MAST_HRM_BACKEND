import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateHolidayDto {
  @ApiProperty({
    description: 'Tên ngày lễ',
    example: 'Tết Nguyên đán',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Loại ngày lễ (1: lễ quốc gia, 2: lễ công ty, ...)',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  type: number;

  @ApiProperty({
    description: 'Trạng thái (1: hoạt động, 0: không hoạt động)',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  status: number;

  @ApiProperty({
    description: 'Ngày bắt đầu',
    example: '2024-02-09',
  })
  @IsNotEmpty()
  @IsDateString()
  start_date: string;

  @ApiProperty({
    description: 'Ngày kết thúc',
    example: '2024-02-17',
  })
  @IsNotEmpty()
  @IsDateString()
  end_date: string;

  @ApiPropertyOptional({
    description: 'Mô tả',
    example: 'Nghỉ Tết Nguyên đán 2024',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
