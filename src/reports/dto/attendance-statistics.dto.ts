import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsOptional, IsInt, IsString, IsDateString } from 'class-validator';

export class AttendanceStatisticsDto {
  @ApiProperty({
    description: 'ID người dùng',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  user_id?: number;

  @ApiProperty({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}

export class WorkingTimeReportQueryDto {
  @ApiProperty({
    description: 'Tháng báo cáo (MM hoặc YYYY-MM)',
    example: '2024-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  month?: string | number;

  @ApiProperty({
    description: 'Năm báo cáo',
    example: 2024,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  year?: number;

  @ApiProperty({
    description: 'ID người dùng',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  user_id?: number;
}

export class TimesheetReportQueryDto {
  @ApiProperty({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({
    description: 'ID phòng ban',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  division_id?: number;

  @ApiProperty({
    description: 'ID team',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  team_id?: number;
}

export class AttendanceReportQueryDto {
  @ApiProperty({
    description: 'Tháng báo cáo (YYYY-MM)',
    example: '2024-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiProperty({
    description: 'Năm báo cáo',
    example: 2024,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  year?: number;

  @ApiProperty({
    description: 'Danh sách ID người dùng',
    example: [1, 2, 3],
    required: false,
    type: [Number],
  })
  @IsOptional()
  user_ids?: number[];

  @ApiProperty({
    description: 'Loại báo cáo',
    example: 'summary',
    enum: ['summary', 'detailed', 'penalty'],
    required: false,
  })
  @IsOptional()
  @IsString()
  report_type?: 'summary' | 'detailed' | 'penalty';
}

export class AttendanceDashboardQueryDto {
  @ApiProperty({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({
    description: 'ID phòng ban',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  division_id?: number;

  @ApiProperty({
    description: 'ID team',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  team_id?: number;

  @ApiProperty({
    description: 'Loại chu kỳ',
    example: 'daily',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: false,
  })
  @IsOptional()
  @IsString()
  period_type?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export class LeaveBalanceQueryDto {
  @ApiProperty({
    description: 'ID người dùng',
    example: 1,
  })
  @Transform(({ value }) => Number(value))
  @IsInt()
  user_id: number;

  @ApiProperty({
    description: 'Năm',
    example: 2024,
  })
  @Transform(({ value }) => Number(value))
  @IsInt()
  year: number;
}

