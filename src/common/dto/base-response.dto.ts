import { ApiProperty } from '@nestjs/swagger';
import { TransformDateTime } from '../decorators/date-format.decorator';

/**
 * Base DTO cho các response có timestamp
 */
export class BaseTimestampDto {
  @ApiProperty({
    description: 'Thời gian tạo',
    example: '2024-01-01 12:00:00',
  })
  @TransformDateTime()
  created_at: Date;

  @ApiProperty({
    description: 'Thời gian cập nhật',
    example: '2024-01-01 12:00:00',
  })
  @TransformDateTime()
  updated_at: Date;

  @ApiProperty({
    description: 'Thời gian xóa (soft delete)',
    example: '2024-01-01 12:00:00',
    required: false,
  })
  @TransformDateTime()
  deleted_at?: Date | null;
}

/**
 * Base DTO cho pagination response
 */
export class BasePaginationDto {
  @ApiProperty({
    description: 'Trang hiện tại',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Số lượng item per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Tổng số item',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Tổng số trang',
    example: 10,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Có trang tiếp theo không',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Có trang trước không',
    example: false,
  })
  hasPrev: boolean;
}
