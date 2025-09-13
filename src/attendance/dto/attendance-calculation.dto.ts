import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsNumber, IsDateString, IsInt, IsBoolean } from 'class-validator';

export class AttendanceCalculationDto {
  @ApiProperty({ description: 'ID người dùng' })
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @ApiProperty({ description: 'Thời gian check-in' })
  @IsNotEmpty()
  @IsDateString()
  checkin_time: string;

  @ApiProperty({ description: 'Thời gian check-out' })
  @IsNotEmpty()
  @IsDateString()
  checkout_time: string;

  @ApiPropertyOptional({ description: 'ID ca làm việc' })
  @IsOptional()
  @IsNumber()
  shift_id?: number;

  @ApiPropertyOptional({ description: 'Làm việc từ xa' })
  @IsOptional()
  @IsBoolean()
  is_remote?: boolean;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  note?: string;
}

export class WorkShiftDto {
  @ApiProperty({ description: 'Tên ca làm việc' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Giờ bắt đầu buổi sáng' })
  @IsNotEmpty()
  @IsDateString()
  morning_start: string;

  @ApiProperty({ description: 'Giờ kết thúc buổi sáng' })
  @IsNotEmpty()
  @IsDateString()
  morning_end: string;

  @ApiProperty({ description: 'Giờ bắt đầu buổi chiều' })
  @IsNotEmpty()
  @IsDateString()
  afternoon_start: string;

  @ApiProperty({ description: 'Giờ kết thúc buổi chiều' })
  @IsNotEmpty()
  @IsDateString()
  afternoon_end: string;

  @ApiPropertyOptional({ description: 'Loại ca (1: thường, 2: đặc biệt)' })
  @IsOptional()
  @IsInt()
  type?: number;
}

export class PenaltyCalculationDto {
  @ApiProperty({ description: 'Số phút đi muộn' })
  @IsNotEmpty()
  @IsNumber()
  late_minutes: number;

  @ApiProperty({ description: 'Số phút về sớm' })
  @IsNotEmpty()
  @IsNumber()
  early_minutes: number;

  @ApiPropertyOptional({ description: 'ID block time áp dụng' })
  @IsOptional()
  @IsNumber()
  block_time_id?: number;
}
