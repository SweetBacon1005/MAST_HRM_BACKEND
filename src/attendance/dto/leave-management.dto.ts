import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsNumber, IsString, IsDateString, IsInt, IsBoolean } from 'class-validator';

export class CreateLeaveRequestDto {
  @ApiProperty({ description: 'ID người dùng' })
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @ApiProperty({ description: 'Loại nghỉ phép', enum: [1, 2, 3, 4, 5], enumName: 'LeaveType' })
  @IsNotEmpty()
  @IsInt()
  leave_type: number; // 1: có lương, 2: không lương, 3: phép năm, 4: ốm đau, 5: việc riêng

  @ApiProperty({ description: 'Ngày bắt đầu nghỉ' })
  @IsNotEmpty()
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'Ngày kết thúc nghỉ' })
  @IsNotEmpty()
  @IsDateString()
  end_date: string;

  @ApiProperty({ description: 'Tổng số ngày nghỉ' })
  @IsNotEmpty()
  @IsNumber()
  total_days: number;

  @ApiProperty({ description: 'Lý do nghỉ phép' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Có phải nghỉ nửa ngày không' })
  @IsOptional()
  @IsBoolean()
  is_half_day?: boolean;

  @ApiPropertyOptional({ description: 'Buổi nghỉ (morning/afternoon) nếu nghỉ nửa ngày' })
  @IsOptional()
  @IsString()
  half_day_period?: string;

  @ApiPropertyOptional({ description: 'File đính kèm (URL)' })
  @IsOptional()
  @IsString()
  attachment_url?: string;

  @ApiPropertyOptional({ description: 'Ghi chú thêm' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class RemoteWorkRequestDto {
  @ApiProperty({ description: 'ID người dùng' })
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @ApiProperty({ description: 'Ngày làm việc từ xa' })
  @IsNotEmpty()
  @IsDateString()
  work_date: string;

  @ApiProperty({ description: 'Lý do làm việc từ xa' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Địa điểm làm việc từ xa' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Có phải cả ngày không' })
  @IsOptional()
  @IsBoolean()
  is_full_day?: boolean;

  @ApiPropertyOptional({ description: 'Giờ bắt đầu nếu không phải cả ngày' })
  @IsOptional()
  @IsDateString()
  start_time?: string;

  @ApiPropertyOptional({ description: 'Giờ kết thúc nếu không phải cả ngày' })
  @IsOptional()
  @IsDateString()
  end_time?: string;
}

export class LeaveBalanceDto {
  @ApiProperty({ description: 'ID người dùng' })
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @ApiProperty({ description: 'Năm' })
  @IsNotEmpty()
  @IsInt()
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
