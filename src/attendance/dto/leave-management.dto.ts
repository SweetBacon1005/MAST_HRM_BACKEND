import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOffType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsPositive,
  IsInt,
  IsEnum,
  IsIn,
  MaxLength,
  MinLength,
  IsUrl,
  Min,
  Max,
  Validate,
  ValidateIf,
} from 'class-validator';
import { IsAfter, IsFutureDate, IsWorkingDay } from '../../common/validators';

export class CreateLeaveRequestDto {
  @ApiProperty({
    description: 'ID người dùng',
    example: 1,
    minimum: 1,
  })
  @IsNotEmpty({ message: 'ID người dùng không được để trống' })
  @Type(() => Number)
  @IsInt({ message: 'ID người dùng phải là số nguyên' })
  @IsPositive({ message: 'ID người dùng phải là số dương' })
  user_id: number;

  @ApiProperty({
    description: 'Loại nghỉ phép',
    enum: [
      DayOffType.PAID,
      DayOffType.UNPAID,
      DayOffType.COMPENSATORY,
      DayOffType.SICK,
      DayOffType.PERSONAL,
    ],
    enumName: 'DayOffType',
    example: DayOffType.PAID,
  })
  @IsNotEmpty({ message: 'Loại nghỉ phép không được để trống' })
  @IsEnum(DayOffType, { message: 'Loại nghỉ phép không hợp lệ' })
  leave_type: DayOffType;

  @ApiProperty({
    description: 'Ngày bắt đầu nghỉ',
    example: '2024-01-15',
    format: 'date',
  })
  @IsNotEmpty({ message: 'Ngày bắt đầu nghỉ không được để trống' })
  @IsDateString(
    {},
    { message: 'Ngày bắt đầu nghỉ phải có định dạng YYYY-MM-DD' },
  )
  @Validate(IsFutureDate, {
    message: 'Ngày bắt đầu nghỉ phải từ hôm nay trở đi',
  })
  start_date: string;

  @ApiProperty({
    description: 'Ngày kết thúc nghỉ',
    example: '2024-01-17',
    format: 'date',
  })
  @IsNotEmpty({ message: 'Ngày kết thúc nghỉ không được để trống' })
  @IsDateString(
    {},
    { message: 'Ngày kết thúc nghỉ phải có định dạng YYYY-MM-DD' },
  )
  @Validate(IsAfter, ['start_date'], {
    message: 'Ngày kết thúc nghỉ phải sau hoặc bằng ngày bắt đầu',
  })
  end_date: string;

  @ApiProperty({
    description: 'Tổng số ngày nghỉ',
    example: 3,
    minimum: 0.5,
    maximum: 365,
  })
  @IsNotEmpty({ message: 'Tổng số ngày nghỉ không được để trống' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Tổng số ngày nghỉ phải là số' })
  @Min(0.5, { message: 'Tổng số ngày nghỉ phải ít nhất là 0.5 ngày' })
  @Max(365, { message: 'Tổng số ngày nghỉ không được quá 365 ngày' })
  total_days: number;

  @ApiProperty({
    description: 'Lý do nghỉ phép',
    example: 'Nghỉ phép năm',
    minLength: 10,
    maxLength: 500,
  })
  @IsNotEmpty({ message: 'Lý do nghỉ phép không được để trống' })
  @IsString({ message: 'Lý do nghỉ phép phải là chuỗi ký tự' })
  @MinLength(10, { message: 'Lý do nghỉ phép phải có ít nhất 10 ký tự' })
  @MaxLength(500, { message: 'Lý do nghỉ phép không được vượt quá 500 ký tự' })
  reason: string;

  @ApiPropertyOptional({
    description: 'Có phải nghỉ nửa ngày không',
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
  @IsBoolean({ message: 'Trạng thái nghỉ nửa ngày phải là boolean' })
  is_half_day?: boolean = false;

  @ApiPropertyOptional({
    description: 'Buổi nghỉ (morning/afternoon) nếu nghỉ nửa ngày',
    enum: ['morning', 'afternoon'],
    example: 'morning',
  })
  @ValidateIf((o) => o.is_half_day === true)
  @IsNotEmpty({ message: 'Buổi nghỉ không được để trống khi nghỉ nửa ngày' })
  @IsString({ message: 'Buổi nghỉ phải là chuỗi ký tự' })
  @IsIn(['morning', 'afternoon'], {
    message: 'Buổi nghỉ phải là morning hoặc afternoon',
  })
  half_day_period?: string;

  @ApiPropertyOptional({
    description: 'File đính kèm (URL)',
    example: 'https://example.com/document.pdf',
    format: 'url',
  })
  @IsOptional()
  @IsString({ message: 'URL file đính kèm phải là chuỗi ký tự' })
  @IsUrl({}, { message: 'URL file đính kèm không hợp lệ' })
  attachment_url?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú thêm',
    example: 'Cần xử lý công việc cấp bách',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'Ghi chú không được vượt quá 1000 ký tự' })
  note?: string;
}

export class RemoteWorkRequestDto {
  @ApiProperty({
    description: 'ID người dùng',
    example: 1,
    minimum: 1,
  })
  @IsNotEmpty({ message: 'ID người dùng không được để trống' })
  @Type(() => Number)
  @IsInt({ message: 'ID người dùng phải là số nguyên' })
  @IsPositive({ message: 'ID người dùng phải là số dương' })
  user_id: number;

  @ApiProperty({
    description: 'Ngày làm việc từ xa',
    example: '2024-01-15',
    format: 'date',
  })
  @IsNotEmpty({ message: 'Ngày làm việc từ xa không được để trống' })
  @IsDateString(
    {},
    { message: 'Ngày làm việc từ xa phải có định dạng YYYY-MM-DD' },
  )
  @Validate(IsFutureDate, {
    message: 'Ngày làm việc từ xa phải từ hôm nay trở đi',
  })
  @Validate(IsWorkingDay, {
    message: 'Ngày làm việc từ xa phải là ngày làm việc (thứ 2-6)',
  })
  work_date: string;

  @ApiProperty({
    description: 'Lý do làm việc từ xa',
    example: 'Có việc gia đình cần xử lý',
    minLength: 10,
    maxLength: 500,
  })
  @IsNotEmpty({ message: 'Lý do làm việc từ xa không được để trống' })
  @IsString({ message: 'Lý do làm việc từ xa phải là chuỗi ký tự' })
  @MinLength(10, { message: 'Lý do làm việc từ xa phải có ít nhất 10 ký tự' })
  @MaxLength(500, {
    message: 'Lý do làm việc từ xa không được vượt quá 500 ký tự',
  })
  reason: string;

  @ApiPropertyOptional({
    description: 'Địa điểm làm việc từ xa',
    example: 'Nhà riêng, Hà Nội',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'Địa điểm làm việc từ xa phải là chuỗi ký tự' })
  @MaxLength(200, {
    message: 'Địa điểm làm việc từ xa không được vượt quá 200 ký tự',
  })
  location?: string;

  @ApiPropertyOptional({
    description: 'Có phải cả ngày không',
    example: true,
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean({ message: 'Trạng thái làm cả ngày phải là boolean' })
  is_full_day?: boolean = true;

  @ApiPropertyOptional({
    description: 'Giờ bắt đầu nếu không phải cả ngày',
    example: '2024-01-15T08:00:00Z',
    format: 'date-time',
  })
  @ValidateIf((o) => o.is_full_day === false)
  @IsNotEmpty({
    message: 'Giờ bắt đầu không được để trống khi không làm cả ngày',
  })
  @IsDateString({}, { message: 'Giờ bắt đầu phải có định dạng ISO 8601' })
  start_time?: string;

  @ApiPropertyOptional({
    description: 'Giờ kết thúc nếu không phải cả ngày',
    example: '2024-01-15T17:30:00Z',
    format: 'date-time',
  })
  @ValidateIf((o) => o.is_full_day === false)
  @IsNotEmpty({
    message: 'Giờ kết thúc không được để trống khi không làm cả ngày',
  })
  @IsDateString({}, { message: 'Giờ kết thúc phải có định dạng ISO 8601' })
  @Validate(IsAfter, ['start_time'], {
    message: 'Giờ kết thúc phải sau giờ bắt đầu',
  })
  end_time?: string;
}

export class LeaveBalanceDto {
  @ApiProperty({ description: 'ID người dùng' })
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @ApiProperty({ description: 'Năm' })
  @IsNotEmpty()
  @IsNumber()
  year: number;

  @ApiProperty({ description: 'Tổng số ngày phép năm' })
  @IsNotEmpty()
  @IsNumber()
  total_annual_leave: number;

  @ApiProperty({ description: 'Số ngày phép đã sử dụng' })
  @IsNotEmpty()
  @IsNumber()
  used_annual_leave: number;

  @ApiProperty({ description: 'Số ngày phép còn lại' })
  @IsNotEmpty()
  @IsNumber()
  remaining_annual_leave: number;

  @ApiPropertyOptional({ description: 'Số ngày phép bù' })
  @IsOptional()
  @IsNumber()
  compensatory_leave?: number;

  @ApiPropertyOptional({ description: 'Số ngày nghỉ ốm đã sử dụng' })
  @IsOptional()
  @IsNumber()
  used_sick_leave?: number;
}
