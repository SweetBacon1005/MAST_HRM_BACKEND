import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches } from 'class-validator';

export class AttendanceStatisticsQueryDto {
  @ApiProperty({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2024-12-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày bắt đầu phải có định dạng YYYY-MM-DD',
  })
  start_date?: string;

  @ApiProperty({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày kết thúc phải có định dạng YYYY-MM-DD',
  })
  end_date?: string;

  @ApiProperty({
    description: 'ID người dùng (chỉ hr_manager và admin mới được xem user khác)',
    example: 5,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'user_id phải là số nguyên' })
  user_id?: number;
}
