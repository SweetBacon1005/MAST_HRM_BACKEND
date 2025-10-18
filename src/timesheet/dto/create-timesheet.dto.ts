import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RemoteType,
  TimesheetRequestType,
  TimesheetStatus,
  TimesheetType,
} from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  Matches,
} from 'class-validator';
import {
  IsTimeRange,
  IsCheckoutAfterCheckin,
  IsApprovedLateTimeValid,
} from '../../common/validators/time.validator';

export class CreateTimesheetDto {
  @ApiProperty({
    description: 'Ngày làm việc (YYYY-MM-DD)',
    example: '2025-10-05',
  })
  @IsNotEmpty({ message: 'Ngày làm việc là bắt buộc' })
  @IsString({ message: 'Ngày làm việc phải là chuỗi' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày làm việc phải có định dạng YYYY-MM-DD (VD: 2025-10-05)',
  })
  work_date: string;

  @ApiPropertyOptional({
    description: 'Thời gian check-in',
    example: '2025-10-05T01:30:00.000Z', // 8:30 AM +7
  })
  @IsOptional()
  @IsDateString()
  checkin?: string;

  @ApiPropertyOptional({
    description: 'Thời gian check-out',
    example: '2025-10-05T10:30:00.000Z', // 5:30 PM +7
  })
  @IsOptional()
  @IsDateString()
  @IsCheckoutAfterCheckin('checkin', {
    message: 'Thời gian check-out phải sau thời gian check-in',
  })
  checkout?: string;

  @ApiPropertyOptional({
    description: 'Chuỗi check-in checkout (HH:MM-HH:MM)',
    example: '08:30-17:30',
  })
  @IsOptional()
  @IsString()
  @IsTimeRange({
    message:
      'Chuỗi check-in checkout phải có định dạng HH:MM-HH:MM và thời gian hợp lệ',
  })
  checkin_checkout?: string;

  @ApiPropertyOptional({
    description: 'ID ngày nghỉ phép',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  day_off_id?: number;

  @ApiPropertyOptional({
    description: 'Thời gian đi muộn (phút)',
    example: 15,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Thời gian đi muộn phải là số' })
  @Min(0, { message: 'Thời gian đi muộn không được âm' })
  @Max(480, { message: 'Thời gian đi muộn không quá 480 phút (8 giờ)' })
  late_time?: number;

  @ApiPropertyOptional({
    description: 'Thời gian đi muộn được duyệt (phút)',
    example: 10,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Thời gian đi muộn được duyệt phải là số' })
  @Min(0, { message: 'Thời gian đi muộn được duyệt không được âm' })
  @Max(480, {
    message: 'Thời gian đi muộn được duyệt không quá 480 phút (8 giờ)',
  })
  @IsApprovedLateTimeValid('late_time', {
    message:
      'Thời gian đi muộn được duyệt không được lớn hơn thời gian đi muộn thực tế',
  })
  late_time_approved?: number;

  @ApiPropertyOptional({
    description: 'Thời gian về sớm (phút)',
    example: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Thời gian về sớm phải là số' })
  @Min(0, { message: 'Thời gian về sớm không được âm' })
  @Max(480, { message: 'Thời gian về sớm không quá 480 phút (8 giờ)' })
  early_time?: number;

  @ApiPropertyOptional({
    description: 'Có hoàn thành không (true: có, false: không)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_complete?: boolean;

  @ApiPropertyOptional({
    description: 'Tiền phạt (VNĐ)',
    example: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tiền phạt phải là số' })
  @Min(0, { message: 'Tiền phạt không được âm' })
  @Max(10000000, { message: 'Tiền phạt không quá 10,000,000 VNĐ' })
  fines?: number;

  @ApiPropertyOptional({
    description: 'ID nhóm',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  group_id?: number;

  @ApiPropertyOptional({
    description: 'Loại (NORMAL, OVERTIME, HOLIDAY, WEEKEND)',
    example: TimesheetType.NORMAL,
  })
  @IsOptional()
  @IsString()
  type?: TimesheetType;

  @ApiPropertyOptional({
    description: 'Giờ làm buổi sáng (phút)',
    example: 240,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Giờ làm buổi sáng phải là số' })
  @Min(0, { message: 'Giờ làm buổi sáng không được âm' })
  @Max(480, { message: 'Giờ làm buổi sáng không quá 480 phút (8 giờ)' })
  work_time_morning?: number;

  @ApiPropertyOptional({
    description: 'Giờ làm buổi chiều (phút)',
    example: 240,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Giờ làm buổi chiều phải là số' })
  @Min(0, { message: 'Giờ làm buổi chiều không được âm' })
  @Max(480, { message: 'Giờ làm buổi chiều không quá 480 phút (8 giờ)' })
  work_time_afternoon?: number;

  @ApiPropertyOptional({
    description: 'Trạng thái',
    example: TimesheetStatus.PENDING,
  })
  @IsOptional()
  @IsString()
  status?: TimesheetStatus;

  @ApiPropertyOptional({
    description: 'Loại yêu cầu',
    example: TimesheetRequestType.OVERTIME,
  })
  @IsOptional()
  @IsString()
  request_type?: TimesheetRequestType;

  @ApiPropertyOptional({
    description: 'Yêu cầu đi muộn',
    example: 'Tắc đường do mưa',
  })
  @IsOptional()
  @IsString()
  request_late?: string;

  @ApiPropertyOptional({
    description: 'Yêu cầu về sớm',
    example: 'Có việc cá nhân',
  })
  @IsOptional()
  @IsString()
  request_early?: string;

  // paid_leave và unpaid_leave đã được thay thế bởi day_off_id relation
  // Thông tin leave được quản lý thông qua day_offs table

  @ApiPropertyOptional({
    description: 'Làm việc từ xa (OFFICE, REMOTE, HYBRID) ',
    example: RemoteType.OFFICE,
  })
  @IsOptional()
  @IsString()
  remote?: RemoteType;

  @ApiPropertyOptional({
    description: 'Tổng thời gian làm việc (phút)',
    example: 480,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tổng thời gian làm việc phải là số' })
  @Min(0, { message: 'Tổng thời gian làm việc không được âm' })
  @Max(960, { message: 'Tổng thời gian làm việc không quá 1920 phút (32 giờ)' })
  total_work_time?: number;

  @ApiPropertyOptional({
    description: 'Thời gian nghỉ trưa (phút)',
    example: 60,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Thời gian nghỉ trưa phải là số' })
  @Min(0, { message: 'Thời gian nghỉ trưa không được âm' })
  @Max(480, { message: 'Thời gian nghỉ trưa không quá 480 phút (8 giờ)' })
  break_time?: number;
}
