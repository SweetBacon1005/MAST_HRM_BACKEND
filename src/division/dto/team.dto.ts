import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsDateString,
  MinLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateTeamDto {
  @ApiProperty({
    description: 'Tên team',
    example: 'Team Project A',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên team không được để trống' })
  @MinLength(2, { message: 'Tên team phải có ít nhất 2 ký tự' })
  name: string;

  @ApiProperty({
    description: 'ID phòng ban',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'ID phòng ban không được để trống' })
  divisionId: number;

  @ApiProperty({
    description: 'ID người lãnh đạo team (user_id)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  leader_Id?: number;

  @ApiProperty({
    description: 'Ngày thành lập team',
    example: '2022-01-25',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  foundingDate?: string;
}

export class UpdateTeamDto {
  @ApiProperty({
    description: 'Tên team',
    example: 'Team Project A',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Tên team phải có ít nhất 2 ký tự' })
  name?: string;

  @ApiProperty({
    description: 'Ngày thành lập team',
    example: '2022-01-25',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  foundingDate?: string;
}

export class TeamPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Tìm kiếm theo tên team',
    example: 'Team Project',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Lọc theo phòng ban ID',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  divisionId?: number;

  @ApiProperty({
    description: 'Sắp xếp theo trường (name, created_at, member_count)',
    example: 'name',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string;
}

