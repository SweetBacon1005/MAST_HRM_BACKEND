import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class DateRangeQueryDto {
  @ApiProperty({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2024-12-01',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Ngày bắt đầu phải là chuỗi' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày bắt đầu phải có định dạng YYYY-MM-DD (VD: 2024-12-01)',
  })
  start_date?: string;

  @ApiProperty({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Ngày kết thúc phải là chuỗi' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày kết thúc phải có định dạng YYYY-MM-DD (VD: 2024-12-31)',
  })
  end_date?: string;
}

export class SingleDateQueryDto {
  @ApiProperty({
    description: 'Ngày (YYYY-MM-DD)',
    example: '2024-12-21',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Ngày phải là chuỗi' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày phải có định dạng YYYY-MM-DD (VD: 2024-12-21)',
  })
  date?: string;
}

export class WorkDateDto {
  @ApiProperty({
    description: 'Ngày làm việc (YYYY-MM-DD)',
    example: '2024-12-21',
  })
  @IsString({ message: 'Ngày làm việc phải là chuỗi' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày làm việc phải có định dạng YYYY-MM-DD (VD: 2024-12-21)',
  })
  work_date: string;
}

export class BulkLockTimesheetsDto {
  @ApiProperty({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2024-12-01',
  })
  @IsString({ message: 'Ngày bắt đầu phải là chuỗi' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày bắt đầu phải có định dạng YYYY-MM-DD (VD: 2024-12-01)',
  })
  start_date!: string;

  @ApiProperty({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsString({ message: 'Ngày kết thúc phải là chuỗi' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày kết thúc phải có định dạng YYYY-MM-DD (VD: 2024-12-31)',
  })
  end_date!: string;

  @ApiProperty({
    description: 'Danh sách ID user cần khóa (optional)',
    example: [1, 2, 3],
    required: false,
  })
  @IsOptional()
  user_ids?: number[];
}
