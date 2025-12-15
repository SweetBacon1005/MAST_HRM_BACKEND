import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScopeType } from '@prisma/client';

export class TodayAttendanceDto {
  @ApiPropertyOptional({ description: 'Thời gian check-in', example: '2024-01-15T08:00:00Z' })
  checkin?: Date | null;

  @ApiPropertyOptional({ description: 'Thời gian check-out', example: '2024-01-15T17:00:00Z' })
  checkout?: Date | null;

  @ApiProperty({ description: 'Tổng thời gian làm việc (phút)', example: 480 })
  total_work_time: number;

  @ApiProperty({ description: 'Trạng thái chấm công', example: 'COMPLETED' })
  status: string;

  @ApiProperty({ description: 'Thời gian đi muộn (phút)', example: 15 })
  late_time: number;

  @ApiProperty({ description: 'Thời gian về sớm (phút)', example: 0 })
  early_time: number;

  @ApiProperty({ description: 'Đã hoàn thành chấm công', example: true })
  is_complete: boolean;

  @ApiProperty({ description: 'Có dữ liệu chấm công', example: true })
  has_attendance: boolean;
}

export class AssignedDeviceDto {
  @ApiProperty({ description: 'ID thiết bị', example: 1 })
  id: number;

  @ApiProperty({ description: 'Tên thiết bị', example: 'MacBook Pro 2023' })
  name: string;

  @ApiProperty({ description: 'Loại thiết bị', example: 'laptop' })
  type: string;

  @ApiProperty({ description: 'Mã thiết bị', example: 'MBP-001' })
  code: string;

  @ApiPropertyOptional({ description: 'Thương hiệu', example: 'Apple' })
  brand?: string | null;

  @ApiPropertyOptional({ description: 'Model', example: 'MacBook Pro 14-inch' })
  model?: string | null;

  @ApiProperty({ description: 'Số serial', example: 'ABC123XYZ' })
  serial: string;

  @ApiPropertyOptional({ description: 'Ngày được cấp', example: '2024-01-15T00:00:00Z' })
  assigned_date?: Date | null;

  @ApiProperty({ description: 'Ghi chú', example: 'Thiết bị mới' })
  notes: string;
}

export class RoleAssignmentDto {
  @ApiProperty({ description: 'ID role', example: 1 })
  id: number;

  @ApiProperty({ description: 'Tên role', example: 'Manager' })
  name: string;

  @ApiProperty({ description: 'Loại scope', example: 'division', enum: ScopeType })
  scope_type: ScopeType;

  @ApiPropertyOptional({ description: 'ID scope', example: 5 })
  scope_id?: number | null;
}

export class OrganizationDto {
  @ApiPropertyOptional({ description: 'ID vị trí', example: 1 })
  position_id?: number | null;

  @ApiPropertyOptional({ description: 'ID phòng ban', example: 5 })
  division_id?: number | null;

  @ApiPropertyOptional({ description: 'ID team', example: 8 })
  team_id?: number | null;
}

export class UserInformationDto {
  @ApiPropertyOptional({ description: 'ID thông tin user', example: 1 })
  id?: number;

  @ApiPropertyOptional({ description: 'Tên đầy đủ', example: 'Nguyễn Văn A' })
  name?: string | null;

  @ApiPropertyOptional({ description: 'Số điện thoại', example: '0123456789' })
  phone?: string | null;

  @ApiPropertyOptional({ description: 'Địa chỉ', example: 'Hà Nội' })
  address?: string | null;

  @ApiPropertyOptional({ description: 'Ngày sinh', example: '1990-01-15' })
  date_of_birth?: Date | null;

  @ApiPropertyOptional({ description: 'Giới tính', example: 'MALE' })
  gender?: string | null;

  @ApiPropertyOptional({ description: 'CCCD/CMND', example: '123456789012' })
  citizen_id?: string | null;

  @ApiPropertyOptional({ description: 'Trạng thái hôn nhân', example: 'SINGLE' })
  marital_status?: string | null;

  @ApiPropertyOptional({ description: 'Quốc tịch', example: 'Việt Nam' })
  nationality?: string | null;

  @ApiPropertyOptional({ description: 'Tôn giáo', example: 'Không' })
  religion?: string | null;

  @ApiPropertyOptional({ description: 'Dân tộc', example: 'Kinh' })
  ethnicity?: string | null;

  @ApiPropertyOptional({ description: 'ID vị trí', example: 1 })
  position_id?: number | null;

  @ApiProperty({ description: 'Thời gian tạo', example: '2024-01-15T10:00:00Z' })
  created_at: Date;

  @ApiProperty({ description: 'Thời gian cập nhật', example: '2024-01-15T10:00:00Z' })
  updated_at: Date;

  @ApiPropertyOptional({ description: 'Thời gian xóa', example: null })
  deleted_at?: Date | null;
}

export class ProfileResponseDto {
  @ApiProperty({ description: 'ID user', example: 1 })
  id: number;

  @ApiProperty({ description: 'Email', example: 'user@company.com' })
  email: string;

  @ApiProperty({ description: 'Thời gian xác thực email', example: '2024-01-15T10:00:00Z' })
  email_verified_at: Date;

  @ApiProperty({ description: 'Thời gian tạo', example: '2024-01-15T10:00:00Z' })
  created_at: Date;

  @ApiProperty({ description: 'Thời gian cập nhật', example: '2024-01-15T10:00:00Z' })
  updated_at: Date;

  @ApiPropertyOptional({ description: 'Thời gian xóa', example: null })
  deleted_at?: Date | null;

  @ApiPropertyOptional({ description: 'Thông tin chi tiết user' })
  user_information?: UserInformationDto | null;

  @ApiPropertyOptional({ description: 'Ngày gia nhập công ty', example: '2024-01-15' })
  join_date?: string | null;

  @ApiPropertyOptional({ description: 'Thông tin chấm công hôm nay' })
  today_attendance?: TodayAttendanceDto | null;

  @ApiPropertyOptional({ description: 'Số ngày phép còn lại', example: 5.2 })
  remaining_leave_days?: number | null;

  @ApiPropertyOptional({ description: 'Tổng số ngày phép trong năm', example: 12 })
  annual_leave_quota?: number | null;

  @ApiPropertyOptional({ description: 'Số ngày phép đã sử dụng', example: 3 })
  used_leave_days?: number | null;

  @ApiProperty({ description: 'Danh sách thiết bị được cấp', type: [AssignedDeviceDto] })
  assigned_devices: AssignedDeviceDto[];

  @ApiPropertyOptional({ description: 'Thông tin tổ chức' })
  organization?: OrganizationDto | null;

  @ApiProperty({ description: 'Số notification chưa đọc', example: 7 })
  unread_notifications: number;

  @ApiProperty({ description: 'Danh sách role assignments', type: [RoleAssignmentDto] })
  role_assignments: RoleAssignmentDto[];
}
