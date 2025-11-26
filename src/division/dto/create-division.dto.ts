import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { DivisionStatus, DivisionType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDivisionDto {
  @ApiProperty({
    description: 'Tên phòng ban',
    example: 'Phòng Phát triển Phần mềm',
  })
  @IsString({ message: 'Tên phòng ban phải là chuỗi' })
  @MaxLength(255, { message: 'Tên phòng ban không được quá 255 ký tự' })
  name: string;

  @ApiProperty({
    description: 'ID người lãnh đạo phòng ban',
    example: 1,
  })
  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'ID người lãnh đạo phòng ban phải là số' })
  @Min(1, { message: 'ID người lãnh đạo phòng ban phải lớn hơn 0' })
  @IsNotEmpty({ message: 'ID người lãnh đạo phòng ban không được để trống' })
  leader_id: number;

  @ApiHideProperty()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  creator_id: number;

  @ApiProperty({
    description: 'Loại phòng ban',
    example: DivisionType.TECHNICAL,
    required: false,
  })
  @IsOptional()
  @IsEnum(DivisionType)
  type?: DivisionType;

  @ApiProperty({
    description: 'Trạng thái phòng ban',
    example: DivisionStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(DivisionStatus)
  status?: DivisionStatus;

  @ApiProperty({
    description: 'Địa chỉ phòng ban',
    example: 'Tầng 5, Tòa nhà ABC, Hà Nội',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Địa chỉ phải là chuỗi' })
  @MaxLength(500, { message: 'Địa chỉ không được quá 500 ký tự' })
  address?: string;

  @ApiProperty({
    description: 'ID phòng ban cha',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  parent_id?: number;

  @ApiProperty({
    description: 'Mô tả phòng ban',
    example: 'Phòng ban chuyên phát triển các ứng dụng web và mobile',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MaxLength(1000, { message: 'Mô tả không được quá 1000 ký tự' })
  description?: string;
}
