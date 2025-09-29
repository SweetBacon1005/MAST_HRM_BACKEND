import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { WorkShiftType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  Validate,
} from 'class-validator';
import { IsAfter, IsValidWorkDuration } from '../../common/validators';

export class AttendanceCalculationDto {
  @ApiHideProperty()
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID người dùng phải là số nguyên' })
  @IsPositive({ message: 'ID người dùng phải là số dương' })
  user_id: number;

  @ApiProperty({
    description: 'Thời gian check-in',
    example: '2024-01-15T08:00:00Z',
    format: 'date-time',
  })
  @IsNotEmpty({ message: 'Thời gian check-in không được để trống' })
  @IsDateString(
    {},
    { message: 'Thời gian check-in phải là định dạng ISO 8601' },
  )
  checkin_time: string;

  @ApiProperty({
    description: 'Thời gian check-out',
    example: '2024-01-15T17:30:00Z',
    format: 'date-time',
  })
  @IsNotEmpty({ message: 'Thời gian check-out không được để trống' })
  @IsDateString(
    {},
    { message: 'Thời gian check-out phải là định dạng ISO 8601' },
  )
  @Validate(IsAfter, ['checkin_time'], {
    message: 'Thời gian check-out phải sau thời gian check-in',
  })
  @Validate(IsValidWorkDuration, ['checkin_time', 0.5, 16], {
    message: 'Thời gian làm việc phải từ 0.5 đến 16 giờ',
  })
  checkout_time: string;

  @ApiPropertyOptional({
    description: 'ID ca làm việc',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID ca làm việc phải là số nguyên' })
  @IsPositive({ message: 'ID ca làm việc phải là số dương' })
  shift_id?: number;

  @ApiPropertyOptional({
    description: 'Làm việc từ xa',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean({ message: 'Trạng thái làm việc từ xa phải là boolean' })
  is_remote?: boolean = false;

  @ApiPropertyOptional({
    description: 'Ghi chú',
    example: 'Có họp khách hàng',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Ghi chú không được vượt quá 500 ký tự' })
  note?: string;
}

export class WorkShiftDto {
  @ApiProperty({
    description: 'Tên ca làm việc',
    example: 'Ca hành chính',
    minLength: 3,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Tên ca làm việc không được để trống' })
  @IsString({ message: 'Tên ca làm việc phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'Tên ca làm việc không được vượt quá 100 ký tự' })
  name: string;

  @ApiProperty({
    description: 'Giờ bắt đầu buổi sáng',
    example: '2024-01-15T08:00:00Z',
    format: 'date-time',
  })
  @IsNotEmpty({ message: 'Giờ bắt đầu buổi sáng không được để trống' })
  @IsDateString(
    {},
    { message: 'Giờ bắt đầu buổi sáng phải là định dạng ISO 8601' },
  )
  morning_start: string;

  @ApiProperty({
    description: 'Giờ kết thúc buổi sáng',
    example: '2024-01-15T12:00:00Z',
    format: 'date-time',
  })
  @IsNotEmpty({ message: 'Giờ kết thúc buổi sáng không được để trống' })
  @IsDateString(
    {},
    { message: 'Giờ kết thúc buổi sáng phải là định dạng ISO 8601' },
  )
  @Validate(IsAfter, ['morning_start'], {
    message: 'Giờ kết thúc buổi sáng phải sau giờ bắt đầu',
  })
  morning_end: string;

  @ApiProperty({
    description: 'Giờ bắt đầu buổi chiều',
    example: '2024-01-15T13:30:00Z',
    format: 'date-time',
  })
  @IsNotEmpty({ message: 'Giờ bắt đầu buổi chiều không được để trống' })
  @IsDateString(
    {},
    { message: 'Giờ bắt đầu buổi chiều phải là định dạng ISO 8601' },
  )
  @Validate(IsAfter, ['morning_end'], {
    message: 'Giờ bắt đầu buổi chiều phải sau giờ kết thúc buổi sáng',
  })
  afternoon_start: string;

  @ApiProperty({
    description: 'Giờ kết thúc buổi chiều',
    example: '2024-01-15T17:30:00Z',
    format: 'date-time',
  })
  @IsNotEmpty({ message: 'Giờ kết thúc buổi chiều không được để trống' })
  @IsDateString(
    {},
    { message: 'Giờ kết thúc buổi chiều phải là định dạng ISO 8601' },
  )
  @Validate(IsAfter, ['afternoon_start'], {
    message: 'Giờ kết thúc buổi chiều phải sau giờ bắt đầu buổi chiều',
  })
  afternoon_end: string;

  @ApiPropertyOptional({
    description: 'Loại ca làm việc',
    example: WorkShiftType.NORMAL,
    enum: WorkShiftType,
    enumName: 'WorkShiftType',
    default: WorkShiftType.NORMAL,
  })
  @IsOptional()
  @IsEnum(WorkShiftType, {
    message: 'Loại ca làm việc phải là một trong các giá trị hợp lệ',
  })
  type?: WorkShiftType;
}

export class PenaltyCalculationDto {
  @ApiProperty({
    description: 'Số phút đi muộn',
    example: 15,
    minimum: 0,
    maximum: 480,
  })
  @IsNotEmpty({ message: 'Số phút đi muộn không được để trống' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Số phút đi muộn phải là số' })
  @Min(0, { message: 'Số phút đi muộn không được âm' })
  late_minutes: number;

  @ApiProperty({
    description: 'Số phút về sớm',
    example: 10,
    minimum: 0,
    maximum: 480,
  })
  @IsNotEmpty({ message: 'Số phút về sớm không được để trống' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Số phút về sớm phải là số' })
  @Min(0, { message: 'Số phút về sớm không được âm' })
  early_minutes: number;

  @ApiPropertyOptional({
    description: 'ID block time áp dụng',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID block time phải là số nguyên' })
  @IsPositive({ message: 'ID block time phải là số dương' })
  block_time_id?: number;
}
