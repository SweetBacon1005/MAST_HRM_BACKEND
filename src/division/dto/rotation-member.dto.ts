import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsInt, IsDateString, IsOptional, Min, IsEnum, IsNotEmpty } from 'class-validator';
import { RotationType } from '@prisma/client';

export class CreateRotationMemberDto {
  @ApiProperty({
    description: 'ID người dùng được điều chuyển',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'ID người dùng phải là số nguyên' })
  @Min(1, { message: 'ID người dùng phải lớn hơn 0' })
  user_id: number;

  @ApiProperty({
    description: 'ID phòng ban đích',
    example: 2,
  })
  @Type(() => Number)
  @IsInt({ message: 'ID phòng ban đích phải là số nguyên' })
  @IsNotEmpty()
  @Min(1, { message: 'ID phòng ban đích phải lớn hơn 0' })
  division_id: number;

  @ApiProperty({
    description: 'Loại điều chuyển (1: Vĩnh viễn, 2: Tạm thời)',
    example: RotationType.PERMANENT,
    required: true,
    enum: RotationType,
  })
  @IsEnum(RotationType)
  type: RotationType;

  @ApiProperty({
    description: 'Ngày điều chuyển',
    example: '2024-01-01',
  })
  @IsDateString(
    {},
    { message: 'Ngày điều chuyển phải có định dạng YYYY-MM-DD' },
  )
  date_rotation: string;
}

export class UpdateRotationMemberDto {
  @ApiProperty({
    description: 'ID phòng ban đích',
    example: 2,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID phòng ban đích phải là số nguyên' })
  @Min(1, { message: 'ID phòng ban đích phải lớn hơn 0' })
  division_id?: number;

  @ApiProperty({
    description: 'Loại điều chuyển (1: Vĩnh viễn, 2: Tạm thời)',
    example: RotationType.PERMANENT,
    enum: RotationType,
    required: false,
  })
  @IsOptional()
  @IsEnum(RotationType)
  type?: RotationType;

  @ApiProperty({
    description: 'Ngày điều chuyển',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Ngày điều chuyển phải có định dạng YYYY-MM-DD' },
  )
  date_rotation?: string;
}

export class RotationMemberPaginationDto {
  @ApiProperty({
    description: 'Số trang',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt({ message: 'Số trang phải là số nguyên' })
  @Min(1, { message: 'Số trang phải lớn hơn 0' })
  page?: number;

  @ApiProperty({
    description: 'Số lượng bản ghi trên mỗi trang',
    example: 10,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt({ message: 'Số lượng bản ghi phải là số nguyên' })
  @Min(1, { message: 'Số lượng bản ghi phải lớn hơn 0' })
  limit?: number;

  @ApiProperty({
    description: 'Lọc theo ID phòng ban',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt({ message: 'ID phòng ban phải là số nguyên' })
  division_id?: number;

  @ApiProperty({
    description: 'Lọc theo ID người dùng',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt({ message: 'ID người dùng phải là số nguyên' })
  user_id?: number;

  @ApiProperty({
    description: 'Lọc theo loại điều chuyển',
    example: RotationType.PERMANENT,
    enum: RotationType,
    required: false,
  })
  @IsOptional()
  @IsEnum(RotationType)
  type?: RotationType;

  @ApiProperty({
    description: 'Lọc từ ngày',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu phải có định dạng YYYY-MM-DD' })
  date_from?: string;

  @ApiProperty({
    description: 'Lọc đến ngày',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc phải có định dạng YYYY-MM-DD' })
  date_to?: string;
}
