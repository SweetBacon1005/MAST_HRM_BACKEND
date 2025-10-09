import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { LateEarlyType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateLateEarlyRequestDto {
  @ApiHideProperty()
  @IsOptional()
  @IsNumber({}, { message: 'ID người dùng phải là số' })
  user_id: number;

  @ApiProperty({
    description: 'Ngày làm việc (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsNotEmpty({ message: 'Ngày làm việc không được để trống' })
  @IsDateString({}, { message: 'Ngày làm việc phải có định dạng hợp lệ' })
  work_date: string;

  @ApiProperty({
    description: 'Loại request',
    enum: LateEarlyType,
    example: LateEarlyType.LATE,
  })
  @IsNotEmpty({ message: 'Loại request không được để trống' })
  @IsEnum(LateEarlyType, { message: 'Loại request không hợp lệ' })
  request_type: LateEarlyType;

  @ApiProperty({
    description:
      'Số phút đi muộn (bắt buộc nếu request_type là LATE hoặc BOTH)',
    example: 30,
    required: false,
  })
  @ValidateIf(
    (o) =>
      o.request_type === LateEarlyType.LATE ||
      o.request_type === LateEarlyType.BOTH,
  )
  @IsNotEmpty({ message: 'Số phút đi muộn không được để trống' })
  @IsNumber({}, { message: 'Số phút đi muộn phải là số' })
  @Min(1, { message: 'Số phút đi muộn phải lớn hơn 0' })
  @Max(480, { message: 'Số phút đi muộn không quá 480 phút (8 giờ)' })
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  late_minutes?: number;

  @ApiProperty({
    description:
      'Số phút về sớm (bắt buộc nếu request_type là EARLY hoặc BOTH)',
    example: 15,
    required: false,
  })
  @ValidateIf(
    (o) =>
      o.request_type === LateEarlyType.EARLY ||
      o.request_type === LateEarlyType.BOTH,
  )
  @IsNotEmpty({ message: 'Số phút về sớm không được để trống' })
  @IsNumber({}, { message: 'Số phút về sớm phải là số' })
  @Min(1, { message: 'Số phút về sớm phải lớn hơn 0' })
  @Max(480, { message: 'Số phút về sớm không quá 480 phút (8 giờ)' })
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  early_minutes?: number;

  @ApiProperty({
    description: 'Lý do request',
    example: 'Tắc đường do mưa lớn',
  })
  @IsNotEmpty({ message: 'Lý do không được để trống' })
  @IsString({ message: 'Lý do phải là chuỗi' })
  reason: string;
}
