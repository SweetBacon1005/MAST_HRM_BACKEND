import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
} from 'class-validator';
import { IsWorkingDay } from '../../common/validators/is-working-day.validator';
import { IsTimeRange } from '../../common/validators/time.validator';

export class CreateForgotCheckinRequestDto {
  @ApiHideProperty()
  @IsOptional()
  @IsNumber()
  user_id: number;

  @ApiProperty({
    description: 'Ngày quên chấm công (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsDateString()
  @IsNotEmpty()
  @Validate(IsWorkingDay, {
    message: 'Chỉ có thể tạo đơn cho ngày làm việc',
  })
  work_date: string;

  @ApiProperty({
    description: 'Thời gian checkin thực tế (HH:mm)',
    example: '08:30',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Validate(IsTimeRange, {
    message: 'Thời gian checkin phải có định dạng HH:mm (ví dụ: 08:30)',
  })
  checkin_time?: string;

  @ApiProperty({
    description: 'Thời gian checkout thực tế (HH:mm)',
    example: '17:30',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Validate(IsTimeRange, {
    message: 'Thời gian checkout phải có định dạng HH:mm (ví dụ: 17:30)',
  })
  checkout_time?: string;

  @ApiProperty({
    description: 'Tiêu đề đơn xin bổ sung chấm công',
    example: 'Đơn xin bổ sung chấm công ngày 15/01/2024',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255, {
    message: 'Tiêu đề không được vượt quá 255 ký tự',
  })
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiProperty({
    description: 'Lý do quên chấm công',
    example: 'Do bận họp khẩn cấp nên quên chấm công vào buổi sáng',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  reason: string;
}
