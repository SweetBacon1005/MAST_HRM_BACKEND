import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HolidayStatus, HolidayType } from '@prisma/client';
import {
  IsDateString,
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
    description: 'Loại ngày lễ (NATIONAL, COMPANY)',
    example: HolidayType.NATIONAL,
  })
  @IsNotEmpty()
  @IsString()
  type: HolidayType;

  @ApiProperty({
    description: 'Trạng thái (ACTIVE, INACTIVE)',
    example: HolidayStatus.ACTIVE,
  })
  @IsNotEmpty()
  @IsString()
  status: HolidayStatus;

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
