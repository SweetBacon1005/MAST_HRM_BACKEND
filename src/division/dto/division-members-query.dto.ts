import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class DivisionMembersQueryDto {
  @ApiProperty({
    description: 'Số trang',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiProperty({
    description: 'Số lượng bản ghi trên mỗi trang',
    example: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 10;

  @ApiProperty({
    description: 'Tìm kiếm theo tên nhân viên',
    example: 'Nguyễn Văn A',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Lọc theo team ID',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teamId?: number;

  @ApiProperty({
    description: 'Lọc theo vị trí ID',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  positionId?: number;

  @ApiProperty({
    description: 'Lọc theo kỹ năng ID',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  skillId?: number;

  @ApiProperty({
    description: 'Lọc theo level ID',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  levelId?: number;

  @ApiProperty({
    description: 'Sắp xếp theo trường (name, birthday, join_date, position, level, coefficient)',
    example: 'name',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({
    description: 'Thứ tự sắp xếp (asc, desc)',
    example: 'asc',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

