import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UserNotificationPaginationDto {
  @ApiProperty({
    description: 'Số trang (bắt đầu từ 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Số lượng bản ghi trên mỗi trang',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sắp xếp theo trường',
    enum: ['created_at', 'updated_at', 'title'],
    example: 'created_at',
    default: 'created_at',
  })
  @IsOptional()
  @IsString()
  sort_by?: 'created_at' | 'updated_at' | 'title' = 'created_at';

  @ApiPropertyOptional({
    description: 'Thứ tự sắp xếp',
    enum: ['asc', 'desc'],
    example: 'desc',
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sort_order?: 'asc' | 'desc' = 'desc';
}

export class AdminNotificationPaginationDto extends UserNotificationPaginationDto {
  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tiêu đề hoặc nội dung',
    example: 'thông báo',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
