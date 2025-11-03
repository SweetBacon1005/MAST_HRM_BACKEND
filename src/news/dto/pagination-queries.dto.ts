import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { NewsStatus } from '@prisma/client';

export class NewsPaginationDto {
  @ApiProperty({
    description: 'Số trang (bắt đầu từ 1)',
    example: 1,
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số trang phải là số nguyên' })
  @Min(1, { message: 'Số trang phải lớn hơn 0' })
  page?: number = 1;

  @ApiProperty({
    description: 'Số lượng bản ghi trên mỗi trang',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Kích thước trang phải là số nguyên' })
  @Min(1, { message: 'Kích thước trang phải lớn hơn 0' })
  @Max(100, { message: 'Kích thước trang không được vượt quá 100' })
  limit?: number = 10;

  @ApiProperty({
    description: 'Lọc theo trạng thái tin tức',
    enum: NewsStatus,
    example: NewsStatus.APPROVED,
    required: false,
  })
  @IsOptional()
  @IsEnum(NewsStatus, { message: 'Trạng thái không hợp lệ' })
  status?: NewsStatus;

  @ApiProperty({
    description: 'Lọc theo ID tác giả',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID tác giả phải là số nguyên' })
  @Min(1, { message: 'ID tác giả phải lớn hơn 0' })
  authorId?: number;

  @ApiProperty({
    description: 'Tìm kiếm theo tiêu đề',
    example: 'nghỉ lễ',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiProperty({
    description: 'Sắp xếp theo trường (created_at, updated_at, title)',
    example: 'created_at',
    default: 'created_at',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'created_at';

  @ApiProperty({
    description: 'Thứ tự sắp xếp (asc, desc)',
    example: 'desc',
    default: 'desc',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
