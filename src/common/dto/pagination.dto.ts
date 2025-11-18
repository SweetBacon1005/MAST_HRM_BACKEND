import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class PaginationDto {
  @ApiProperty({
    description: 'Số trang (bắt đầu từ 1)',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return 1;
    return Number(value);
  })
  @IsInt({ message: 'Số trang phải là số nguyên' })
  @Min(1, { message: 'Số trang phải lớn hơn 0' })
  page?: number = 1;

  @ApiProperty({
    description: 'Số lượng bản ghi mỗi trang',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return 10;
    return Number(value);
  })
  @IsInt({ message: 'Kích thước trang phải là số nguyên' })
  @Min(1, { message: 'Kích thước trang phải lớn hơn 0' })
  limit?: number = 10;

  @ApiProperty({
    description: 'Trường để sắp xếp',
    example: 'created_at',
    required: false,
  })
  @IsOptional()
  sort_by?: string;

  @ApiProperty({
    description: 'Thứ tự sắp xếp (asc hoặc desc)',
    example: 'desc',
    required: false,
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  sort_order?: 'asc' | 'desc' = 'desc';
}

export class PaginationResponseDto<T> {
  @ApiProperty({ description: 'Dữ liệu' })
  data: T[];

  @ApiProperty({ description: 'Thông tin phân trang' })
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    totalPages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.pagination = {
      current_page: page,
      per_page: limit,
      total,
      totalPages: Math.ceil(total / limit),
      has_next_page: page < Math.ceil(total / limit),
      has_prev_page: page > 1,
    };
  }
}
