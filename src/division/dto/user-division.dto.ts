import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUserDivisionDto {
  @ApiProperty({
    description: 'ID của user',
    example: 1,
  })
  @IsInt()
  userId: number;

  @ApiProperty({
    description: 'ID của division (bắt buộc)',
    example: 1,
  })
  @IsInt()
  divisionId: number;

  @ApiPropertyOptional({
    description: 'ID của role trong division',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  role_id?: number;

  @ApiPropertyOptional({
    description: 'ID của team trong division',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  teamId?: number;

  @ApiPropertyOptional({
    description: 'Mô tả về vai trò của user trong division',
    example: 'Developer chính của team',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

}

export class UpdateUserDivisionDto {
  @ApiPropertyOptional({
    description: 'ID của role trong division',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  role_id?: number;

  @ApiPropertyOptional({
    description: 'ID của team trong division',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  teamId?: number;

  @ApiPropertyOptional({
    description: 'Mô tả về vai trò của user trong division',
    example: 'Senior Developer của team',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

}

export class UserDivisionPaginationDto {
  @ApiPropertyOptional({
    description: 'Số trang',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng bản ghi trên mỗi trang',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tên user hoặc division',
    example: 'Nguyễn Văn A',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo division ID',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  divisionId?: number;

  @ApiPropertyOptional({
    description: 'Lọc theo user ID',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({
    description: 'Lọc theo team ID',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  teamId?: number;

  @ApiPropertyOptional({
    description: 'Lọc theo role ID',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  role_id?: number;
}

export class UnassignedUsersPaginationDto {
  @ApiPropertyOptional({
    description: 'Số trang',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng bản ghi trên mỗi trang',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tên, email hoặc mã nhân viên',
    example: 'Nguyễn Văn A',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo position ID',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  positionId?: number;

  @ApiPropertyOptional({
    description: 'Lọc theo level ID',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  levelId?: number;

  @ApiPropertyOptional({
    description: 'Sắp xếp theo trường nào (name, email, created_at)',
    example: 'name',
    default: 'created_at',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Thứ tự sắp xếp (asc, desc)',
    example: 'asc',
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}