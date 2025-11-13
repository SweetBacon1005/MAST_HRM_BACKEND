import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsBoolean, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class NotificationPaginationDto {
  @ApiProperty({ 
    description: 'Số trang (bắt đầu từ 1)', 
    example: 1, 
    default: 1 
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ 
    description: 'Số lượng bản ghi trên mỗi trang', 
    example: 10, 
    default: 10 
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ 
    description: 'Tìm kiếm theo tiêu đề hoặc nội dung', 
    example: 'thông báo' 
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Sắp xếp theo trường', 
    enum: ['created_at', 'updated_at', 'title'], 
    example: 'created_at', 
    default: 'created_at' 
  })
  @IsOptional()
  @IsString()
  sortBy?: 'created_at' | 'updated_at' | 'title' = 'created_at';

  @ApiPropertyOptional({ 
    description: 'Thứ tự sắp xếp', 
    enum: ['asc', 'desc'], 
    example: 'desc', 
    default: 'desc' 
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
