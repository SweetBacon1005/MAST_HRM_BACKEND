import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  Matches,
  Min,
} from 'class-validator';
import { DayOffDuration, DayOffType, ApprovalStatus } from '@prisma/client';

export class MonthlyWorkSummaryQueryDto {
  @ApiProperty({
    description: 'Tháng báo cáo (định dạng: YYYY-MM)',
    example: '2025-11',
    required: true,
  })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Tháng phải có định dạng YYYY-MM (ví dụ: 2024-12)',
  })
  month: string;

  @ApiPropertyOptional({
    description: 'ID phòng ban để filter (chỉ lấy nhân viên trong phòng ban này)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  division_id?: number;

  @ApiPropertyOptional({
    description: 'ID team để filter (chỉ lấy nhân viên trong team này)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  team_id?: number;

  @ApiPropertyOptional({
    description: 'Danh sách ID nhân viên cần lấy báo cáo (ngăn cách bởi dấu phẩy)',
    example: '1,2,3',
  })
  @IsOptional()
  @IsString()
  user_ids?: string;

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tên hoặc email nhân viên',
    example: 'Nguyen Van',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Số trang (mặc định: 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Số bản ghi mỗi trang (mặc định: 20, tối đa: 100)',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sắp xếp theo trường nào (user_id, user_name, attendance_rate, total_work_days)',
    example: 'attendance_rate',
    default: 'user_id',
  })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({
    description: 'Thứ tự sắp xếp (asc: tăng dần, desc: giảm dần)',
    enum: ['asc', 'desc'],
    example: 'desc',
    default: 'asc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sort_order?: 'asc' | 'desc';
}

export class MonthlyWorkSummaryDetailQueryDto {
  @ApiProperty({
    description: 'Tháng báo cáo (định dạng: YYYY-MM)',
    example: '2024-12',
    required: true,
  })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Tháng phải có định dạng YYYY-MM (ví dụ: 2024-12)',
  })
  month: string;
}

export class MonthlyWorkSummaryExportQueryDto extends MonthlyWorkSummaryQueryDto {
  @ApiPropertyOptional({
    description: 'Định dạng file export (excel hoặc csv)',
    enum: ['excel', 'csv'],
    example: 'excel',
    default: 'excel',
  })
  @IsOptional()
  @IsEnum(['excel', 'csv'])
  format?: 'excel' | 'csv';
}

export class RecalculateMonthlyWorkDto {
  @ApiProperty({
    description: 'Tháng cần tính lại (định dạng: YYYY-MM)',
    example: '2025-11',
  })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Tháng phải có định dạng YYYY-MM',
  })
  month: string;

  @ApiPropertyOptional({
    description: 'Danh sách ID nhân viên cần tính lại (nếu không có sẽ tính lại tất cả)',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  user_ids?: number[];
}

// Response DTOs

export class LeaveSessionDto {
  @ApiProperty({
    description: 'Ngày nghỉ (YYYY-MM-DD)',
    example: '2024-12-05',
  })
  date: string;

  @ApiProperty({
    description: 'Thời lượng nghỉ',
    enum: DayOffDuration,
    example: 'FULL_DAY',
  })
  duration: DayOffDuration;

  @ApiProperty({
    description: 'Loại nghỉ phép',
    enum: DayOffType,
    example: 'PAID',
  })
  type: DayOffType;

  @ApiProperty({
    description: 'Trạng thái duyệt',
    enum: ApprovalStatus,
    example: 'APPROVED',
  })
  status: ApprovalStatus;

  @ApiPropertyOptional({
    description: 'Lý do nghỉ',
    example: 'Nghỉ phép năm',
  })
  reason?: string;
}

export class MonthlyWorkSummaryDto {
  @ApiProperty({ description: 'ID nhân viên', example: 1 })
  user_id: number;

  @ApiProperty({ description: 'Tên nhân viên', example: 'Nguyễn Văn A' })
  user_name: string;

  @ApiProperty({
    description: 'Email nhân viên',
    example: 'nguyenvana@company.com',
  })
  user_email: string;

  @ApiProperty({ description: 'Mã nhân viên', example: 'E001' })
  user_code: string;

  @ApiPropertyOptional({
    description: 'Tên phòng ban',
    example: 'IT Department',
  })
  division_name?: string;

  @ApiPropertyOptional({ description: 'Tên team', example: 'Backend Team' })
  team_name?: string;

  @ApiPropertyOptional({
    description: 'Tên chức vụ',
    example: 'Senior Developer',
  })
  position_name?: string;

  @ApiProperty({
    description: 'Tổng số ngày đi làm thực tế (có timesheet đã duyệt)',
    example: 20,
  })
  total_work_days: number;

  @ApiProperty({
    description:
      'Số ngày làm việc yêu cầu trong tháng (trừ thứ 7, chủ nhật và ngày lễ)',
    example: 22,
  })
  expected_work_days: number;

  @ApiProperty({
    description: 'Tổng số giờ làm việc trong tháng',
    example: 160,
  })
  total_work_hours: number;

  @ApiProperty({
    description: 'Tổng số ngày nghỉ (bao gồm cả nửa ngày)',
    example: 2,
  })
  total_leave_days: number;

  @ApiProperty({
    description: 'Số ngày nghỉ có lương',
    example: 2,
  })
  paid_leave_days: number;

  @ApiProperty({
    description: 'Số ngày nghỉ không lương',
    example: 0,
  })
  unpaid_leave_days: number;

  @ApiProperty({
    description: 'Số ngày nghỉ ốm',
    example: 0,
  })
  sick_leave_days: number;

  @ApiProperty({
    description: 'Số ngày nghỉ khác (cá nhân, thai sản, v.v.)',
    example: 0,
  })
  other_leave_days: number;

  @ApiProperty({
    description: 'Chi tiết các buổi nghỉ trong tháng',
    type: [LeaveSessionDto],
  })
  leave_sessions: LeaveSessionDto[];

  @ApiProperty({
    description: 'Số lần đi muộn trong tháng',
    example: 3,
  })
  late_count: number;

  @ApiProperty({
    description: 'Số lần về sớm trong tháng',
    example: 1,
  })
  early_leave_count: number;

  @ApiProperty({
    description: 'Tổng số phút đi muộn',
    example: 45,
  })
  total_late_minutes: number;

  @ApiProperty({
    description: 'Tổng số phút về sớm',
    example: 15,
  })
  total_early_minutes: number;

  @ApiProperty({
    description: 'Số ngày làm việc từ xa (remote)',
    example: 5,
  })
  remote_work_days: number;

  @ApiProperty({
    description: 'Tổng số giờ tăng ca đã duyệt',
    example: 10,
  })
  overtime_hours: number;

  @ApiProperty({
    description: 'Số ngày có tăng ca',
    example: 2,
  })
  overtime_days: number;

  @ApiProperty({
    description: 'Số ngày vắng mặt không có lý do (không đi làm và không có đơn nghỉ)',
    example: 0,
  })
  absent_days: number;

  @ApiProperty({
    description: 'Tỷ lệ đi làm (%) = (Số ngày đi làm / Số ngày yêu cầu) × 100',
    example: 90.91,
  })
  attendance_rate: number;

  @ApiProperty({
    description: 'Tỷ lệ đúng giờ (%) = (Số ngày đúng giờ / Số ngày đi làm) × 100',
    example: 85.0,
  })
  on_time_rate: number;

  @ApiProperty({
    description: 'Tổng số công (buổi) = Số ngày × 2 (1 ngày = 2 buổi)',
    example: 40,
  })
  total_working_sessions: number;

  @ApiProperty({
    description: 'Số công bị trừ do vi phạm (đi muộn/về sớm quá mức)',
    example: 0,
  })
  deducted_sessions: number;

  @ApiProperty({
    description: 'Số công cuối cùng = Tổng công - Công bị trừ',
    example: 40,
  })
  final_working_sessions: number;

  @ApiProperty({
    description: 'Timesheet tháng này đã hoàn thiện (tất cả ngày đã được duyệt)',
    example: true,
  })
  is_complete: boolean;

  @ApiPropertyOptional({
    description: 'Thời gian khóa timesheet (đã tính lương, không thể sửa)',
    example: null,
  })
  locked_at?: Date;
}

export class MonthlyWorkSummaryPeriodDto {
  @ApiProperty({
    description: 'Tháng báo cáo',
    example: '2024-12',
  })
  month: string;

  @ApiProperty({
    description: 'Năm báo cáo',
    example: 2024,
  })
  year: number;

  @ApiProperty({
    description: 'Tổng số ngày làm việc trong tháng (trừ weekend và ngày lễ)',
    example: 22,
  })
  total_work_days: number;

  @ApiProperty({
    description: 'Số ngày lễ trong tháng',
    example: 2,
  })
  total_holidays: number;
}

export class MonthlyWorkSummarySummaryDto {
  @ApiProperty({
    description: 'Tổng số nhân viên trong báo cáo',
    example: 150,
  })
  total_employees: number;

  @ApiProperty({
    description: 'Số ngày đi làm trung bình của tất cả nhân viên',
    example: 20.5,
  })
  average_work_days: number;

  @ApiProperty({
    description: 'Tỷ lệ đi làm trung bình của tất cả nhân viên (%)',
    example: 93.2,
  })
  average_attendance_rate: number;
}

export class PaginationDto {
  @ApiProperty({ description: 'Tổng số bản ghi', example: 150 })
  total: number;

  @ApiProperty({ description: 'Trang hiện tại', example: 1 })
  page: number;

  @ApiProperty({ description: 'Số bản ghi mỗi trang', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Tổng số trang', example: 8 })
  total_pages: number;
}

export class MonthlyWorkSummaryResponseDto {
  @ApiProperty({
    description: 'Danh sách báo cáo công tháng của các nhân viên',
    type: [MonthlyWorkSummaryDto],
  })
  data: MonthlyWorkSummaryDto[];

  @ApiProperty({
    description: 'Thông tin phân trang',
    type: PaginationDto,
  })
  pagination: PaginationDto;

  @ApiProperty({
    description: 'Thông tin kỳ báo cáo',
    type: MonthlyWorkSummaryPeriodDto,
  })
  period: MonthlyWorkSummaryPeriodDto;

  @ApiProperty({
    description: 'Thống kê tổng hợp',
    type: MonthlyWorkSummarySummaryDto,
  })
  summary: MonthlyWorkSummarySummaryDto;
}

// Detail Response DTOs

export class DailyAttendanceDto {
  @ApiProperty({ description: 'Ngày làm việc', example: '2024-12-01' })
  date: string;

  @ApiProperty({ description: 'Thứ trong tuần', example: 'Thứ 2' })
  day_of_week: string;

  @ApiProperty({ description: 'Có phải ngày lễ không', example: false })
  is_holiday: boolean;

  @ApiPropertyOptional({
    description: 'Tên ngày lễ (nếu có)',
    example: 'Tết Nguyên Đán',
  })
  holiday_name?: string;

  @ApiPropertyOptional({
    description: 'Thời gian check-in',
    example: '08:00',
  })
  checkin_time?: string;

  @ApiPropertyOptional({
    description: 'Thời gian check-out',
    example: '17:30',
  })
  checkout_time?: string;

  @ApiProperty({
    description: 'Số giờ làm việc',
    example: 8.0,
  })
  work_hours: number;

  @ApiProperty({
    description: 'Số phút đi muộn',
    example: 0,
  })
  late_minutes: number;

  @ApiProperty({
    description: 'Số phút về sớm',
    example: 0,
  })
  early_minutes: number;

  @ApiProperty({
    description: 'Trạng thái: PRESENT (đi làm), ABSENT (vắng), LEAVE (nghỉ phép), HOLIDAY (lễ), WEEKEND (cuối tuần)',
    example: 'PRESENT',
  })
  status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY' | 'WEEKEND';

  @ApiProperty({
    description: 'Loại làm việc: OFFICE (tại văn phòng), REMOTE (từ xa), HYBRID (kết hợp)',
    example: 'OFFICE',
  })
  remote_type: 'OFFICE' | 'REMOTE' | 'HYBRID';

  @ApiProperty({
    description: 'Có đơn nghỉ phép không',
    example: false,
  })
  has_leave_request: boolean;

  @ApiProperty({
    description: 'Có đơn tăng ca không',
    example: false,
  })
  has_overtime_request: boolean;

  @ApiProperty({
    description: 'Có đơn xin đi muộn/về sớm không',
    example: false,
  })
  has_late_early_request: boolean;

  @ApiProperty({
    description: 'Có đơn quên chấm công không',
    example: false,
  })
  has_forgot_checkin_request: boolean;

  @ApiProperty({
    description: 'Công buổi sáng: 0 (không làm), 0.5 (nửa buổi), 1 (cả buổi)',
    example: 1,
  })
  morning_session: number;

  @ApiProperty({
    description: 'Công buổi chiều: 0 (không làm), 0.5 (nửa buổi), 1 (cả buổi)',
    example: 1,
  })
  afternoon_session: number;

  @ApiProperty({
    description: 'Tổng số công trong ngày',
    example: 2,
  })
  total_sessions: number;

  @ApiPropertyOptional({
    description: 'Ghi chú',
    example: 'Đi muộn do kẹt xe',
  })
  notes?: string;
}

export class ViolationDetailDto {
  @ApiProperty({ description: 'Ngày vi phạm', example: '2024-12-02' })
  date: string;

  @ApiProperty({
    description: 'Loại vi phạm: LATE (đi muộn), EARLY (về sớm), BOTH (cả hai)',
    example: 'LATE',
  })
  type: 'LATE' | 'EARLY' | 'BOTH';

  @ApiProperty({ description: 'Số phút đi muộn', example: 15 })
  late_minutes: number;

  @ApiProperty({ description: 'Số phút về sớm', example: 0 })
  early_minutes: number;

  @ApiProperty({
    description: 'Có đơn xin phép được duyệt không',
    example: false,
  })
  has_approved_request: boolean;

  @ApiPropertyOptional({ description: 'Lý do vi phạm', example: 'Kẹt xe' })
  reason?: string;
}

export class LeaveDetailDto {
  @ApiProperty({ description: 'ID đơn nghỉ', example: 1 })
  id: number;

  @ApiProperty({ description: 'Ngày nghỉ', example: '2024-12-05' })
  date: string;

  @ApiProperty({ description: 'Thời lượng', enum: DayOffDuration })
  duration: DayOffDuration;

  @ApiProperty({ description: 'Loại nghỉ', enum: DayOffType })
  type: DayOffType;

  @ApiProperty({ description: 'Trạng thái', enum: ApprovalStatus })
  status: ApprovalStatus;

  @ApiPropertyOptional({ description: 'Lý do nghỉ' })
  reason?: string;

  @ApiPropertyOptional({ description: 'Người duyệt', example: 'Nguyễn Văn B' })
  approved_by_name?: string;

  @ApiPropertyOptional({ description: 'Thời gian duyệt' })
  approved_at?: Date;
}

export class OvertimeDetailDto {
  @ApiProperty({ description: 'ID đơn tăng ca', example: 1 })
  id: number;

  @ApiProperty({ description: 'Ngày tăng ca', example: '2024-12-10' })
  date: string;

  @ApiProperty({ description: 'Tiêu đề', example: 'Tăng ca dự án X' })
  title: string;

  @ApiProperty({ description: 'Số giờ tăng ca', example: 3 })
  total_hours: number;

  @ApiProperty({ description: 'Trạng thái', enum: ApprovalStatus })
  status: ApprovalStatus;

  @ApiPropertyOptional({ description: 'Người duyệt', example: 'Nguyễn Văn B' })
  approved_by_name?: string;

  @ApiPropertyOptional({ description: 'Thời gian duyệt' })
  approved_at?: Date;
}

export class MonthlyWorkSummaryDetailResponseDto {
  @ApiProperty({
    description: 'Thông tin tổng hợp',
    type: MonthlyWorkSummaryDto,
  })
  summary: MonthlyWorkSummaryDto;

  @ApiProperty({
    description: 'Chi tiết chấm công từng ngày',
    type: [DailyAttendanceDto],
  })
  daily_details: DailyAttendanceDto[];

  @ApiProperty({
    description: 'Chi tiết các vi phạm đi muộn/về sớm',
    type: [ViolationDetailDto],
  })
  violations: ViolationDetailDto[];

  @ApiProperty({
    description: 'Chi tiết các đơn nghỉ phép',
    type: [LeaveDetailDto],
  })
  leave_details: LeaveDetailDto[];

  @ApiProperty({
    description: 'Chi tiết các đơn tăng ca',
    type: [OvertimeDetailDto],
  })
  overtime_details: OvertimeDetailDto[];
}

export class RecalculateResponseDto {
  @ApiProperty({
    description: 'Trạng thái thành công',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Thông báo kết quả',
    example: 'Tính toán lại thành công',
  })
  message: string;

  @ApiProperty({
    description: 'Số nhân viên đã tính lại',
    example: 150,
  })
  recalculated_count: number;

  @ApiPropertyOptional({
    description: 'Danh sách lỗi (nếu có)',
    type: [String],
    example: [],
  })
  errors?: string[];
}
