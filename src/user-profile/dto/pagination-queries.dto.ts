import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ChildrenPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'ID người dùng',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;

  @ApiProperty({
    description: 'Tên con',
    example: 'Nguyễn Văn A',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class EducationPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'ID người dùng',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;

  @ApiProperty({
    description: 'Tên trường',
    example: 'Đại học Bách Khoa',
    required: false,
  })
  @IsOptional()
  @IsString()
  school_name?: string;

  @ApiProperty({
    description: 'Bằng cấp',
    example: 'Cử nhân',
    required: false,
  })
  @IsOptional()
  @IsString()
  degree?: string;
}

export class ExperiencePaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'ID người dùng',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;

  @ApiProperty({
    description: 'Tên công ty',
    example: 'FPT Software',
    required: false,
  })
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiProperty({
    description: 'Vị trí công việc',
    example: 'Software Engineer',
    required: false,
  })
  @IsOptional()
  @IsString()
  position?: string;
}

export class CertificatePaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'ID người dùng',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;

  @ApiProperty({
    description: 'ID chứng chỉ',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  certificate_id?: number;

  @ApiProperty({
    description: 'Trạng thái',
    example: 'active',
    required: false,
    enum: ['active', 'expired', 'revoked'],
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UserSkillPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'ID người dùng',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;

  @ApiProperty({
    description: 'ID kỹ năng',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  skill_id?: number;

  @ApiProperty({
    description: 'Cấp độ tối thiểu',
    example: 3,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  min_level?: number;

  @ApiProperty({
    description: 'Cấp độ tối đa',
    example: 5,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  max_level?: number;
}

export class ReferencePaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Tên để tìm kiếm',
    example: 'Developer',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Trạng thái',
    example: 'active',
    required: false,
    enum: ['active', 'inactive'],
  })
  @IsOptional()
  @IsString()
  status?: string;
}
