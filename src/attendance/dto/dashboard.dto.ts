import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsIn,
  IsPositive,
  Validate,
  ArrayNotEmpty,
  IsNumber,
} from 'class-validator';
import { IsAfter } from '../../common/validators/is-after.validator';

export class AttendanceDashboardDto {
  @ApiPropertyOptional({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2024-01-01',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu phải có định dạng YYYY-MM-DD' })
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2024-01-31',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc phải có định dạng YYYY-MM-DD' })
  @Validate(IsAfter, ['start_date'], {
    message: 'Ngày kết thúc phải sau ngày bắt đầu',
  })
  end_date?: string;

  @ApiPropertyOptional({
    description: 'ID phòng ban',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID phòng ban phải là số nguyên' })
  @IsPositive({ message: 'ID phòng ban phải là số dương' })
  division_id?: number;

  @ApiPropertyOptional({
    description: 'ID team',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID team phải là số nguyên' })
  @IsPositive({ message: 'ID team phải là số dương' })
  team_id?: number;

  @ApiPropertyOptional({
    description: 'Loại thống kê',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    example: 'monthly',
    default: 'daily',
  })
  @IsOptional()
  @IsString({ message: 'Loại thống kê phải là chuỗi ký tự' })
  @IsIn(['daily', 'weekly', 'monthly', 'yearly'], {
    message: 'Loại thống kê phải là một trong: daily, weekly, monthly, yearly',
  })
  period_type?: string = 'daily';
}

export class AttendanceReportDto {
  @ApiPropertyOptional({
    description: 'Tháng báo cáo (YYYY-MM)',
    example: '2024-01',
    pattern: '^\\d{4}-\\d{2}$',
  })
  @IsOptional()
  @IsString({ message: 'Tháng báo cáo phải là chuỗi ký tự' })
  month?: string;

  @ApiPropertyOptional({
    description: 'Năm báo cáo',
    example: 2024,
    minimum: 2020,
    maximum: 2030,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Năm báo cáo phải là số nguyên' })
  year?: number;

  @ApiPropertyOptional({
    description: 'Danh sách ID người dùng',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray({ message: 'Danh sách ID người dùng phải là mảng' })
  @ArrayNotEmpty({
    message: 'Danh sách ID người dùng không được rỗng khi được cung cấp',
  })
  @Type(() => Number)
  @IsNumber({}, { each: true, message: 'Mỗi ID người dùng phải là số' })
  @IsPositive({ each: true, message: 'Mỗi ID người dùng phải là số dương' })
  user_ids?: number[];

  @ApiPropertyOptional({
    description: 'Loại báo cáo',
    enum: ['summary', 'detailed', 'penalty', 'leave'],
    example: 'summary',
    default: 'summary',
  })
  @IsOptional()
  @IsString({ message: 'Loại báo cáo phải là chuỗi ký tự' })
  @IsIn(['summary', 'detailed', 'penalty', 'leave'], {
    message:
      'Loại báo cáo phải là một trong: summary, detailed, penalty, leave',
  })
  report_type?: string = 'summary';

  @ApiPropertyOptional({
    description: 'Định dạng xuất',
    enum: ['json', 'excel', 'pdf'],
    example: 'json',
    default: 'json',
  })
  @IsOptional()
  @IsString({ message: 'Định dạng xuất phải là chuỗi ký tự' })
  @IsIn(['json', 'excel', 'pdf'], {
    message: 'Định dạng xuất phải là một trong: json, excel, pdf',
  })
  export_format?: string = 'json';
}

export class PenaltyReportDto {
  @ApiPropertyOptional({
    description: 'Ngày bắt đầu',
    example: '2024-01-01',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu phải có định dạng YYYY-MM-DD' })
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc',
    example: '2024-01-31',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc phải có định dạng YYYY-MM-DD' })
  @Validate(IsAfter, ['start_date'], {
    message: 'Ngày kết thúc phải sau ngày bắt đầu',
  })
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Mức độ phạt tối thiểu',
    example: 50000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Mức độ phạt tối thiểu phải là số nguyên' })
  @IsPositive({ message: 'Mức độ phạt tối thiểu phải là số dương' })
  min_penalty_amount?: number;

  @ApiPropertyOptional({
    description: 'Loại vi phạm',
    enum: ['late', 'early', 'absent', 'all'],
    example: 'all',
    default: 'all',
  })
  @IsOptional()
  @IsString({ message: 'Loại vi phạm phải là chuỗi ký tự' })
  @IsIn(['late', 'early', 'absent', 'all'], {
    message: 'Loại vi phạm phải là một trong: late, early, absent, all',
  })
  violation_type?: string = 'all';
}
