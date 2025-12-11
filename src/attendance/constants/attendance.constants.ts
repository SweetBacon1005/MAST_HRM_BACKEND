// Loại nghỉ phép
export const LEAVE_TYPES = {
  PAID_LEAVE: 1, // Nghỉ có lương
  UNPAID_LEAVE: 2, // Nghỉ không lương
  ANNUAL_LEAVE: 3, // Phép năm
  SICK_LEAVE: 4, // Nghỉ ốm
  PERSONAL_LEAVE: 5, // Việc riêng
} as const;

// Trạng thái đơn nghỉ phép
export const LEAVE_STATUS = {
  PENDING: 1, // Chờ duyệt
  APPROVED: 2, // Đã duyệt
  REJECTED: 3, // Từ chối
} as const;

// Loại ca làm việc
export const SHIFT_TYPES = {
  NORMAL: 1, // Ca thường
  SPECIAL: 2, // Ca đặc biệt
  NIGHT: 3, // Ca đêm
  OVERTIME: 4, // Ca tăng ca
} as const;

// Trạng thái chấm công
export const ATTENDANCE_STATUS = {
  PENDING: 1, // Chờ duyệt
  APPROVED: 2, // Đã duyệt
  REJECTED: 3, // Từ chối
} as const;

// Loại vi phạm
export const VIOLATION_TYPES = {
  LATE: 'late', // Đi muộn
  EARLY_LEAVE: 'early', // Về sớm
  ABSENT: 'absent', // Vắng mặt
  ALL: 'all', // Tất cả
} as const;

// Loại báo cáo
export const REPORT_TYPES = {
  SUMMARY: 'summary', // Tổng hợp
  DETAILED: 'detailed', // Chi tiết
  PENALTY: 'penalty', // Phạt
  LEAVE: 'leave', // Nghỉ phép
} as const;

// Chu kỳ thống kê
export const PERIOD_TYPES = {
  DAILY: 'daily', // Theo ngày
  WEEKLY: 'weekly', // Theo tuần
  MONTHLY: 'monthly', // Theo tháng
  YEARLY: 'yearly', // Theo năm
} as const;

// Định dạng xuất báo cáo
export const EXPORT_FORMATS = {
  JSON: 'json',
  EXCEL: 'excel',
  PDF: 'pdf',
} as const;

// Thời gian làm việc mặc định (phút)
export const DEFAULT_WORK_HOURS = {
  MORNING_MINUTES: 240, // 4 giờ sáng
  AFTERNOON_MINUTES: 240, // 4 giờ chiều
  TOTAL_MINUTES: 480, // 8 giờ/ngày
  LUNCH_BREAK_MINUTES: 90, // 1.5 giờ nghỉ trưa
} as const;

// Giờ làm việc tiêu chuẩn
export const STANDARD_WORK_TIME = {
  MORNING_START: '08:00',
  MORNING_END: '12:00',
  AFTERNOON_START: '13:30',
  AFTERNOON_END: '17:30',
} as const;

// Số ngày phép năm mặc định
export const DEFAULT_ANNUAL_LEAVE_DAYS = 12;

// Số ngày nghỉ ốm tối đa/năm
export const MAX_SICK_LEAVE_DAYS = 30;

// Thông báo
export const ATTENDANCE_MESSAGES = {
  ALREADY_CHECKED_IN: 'Bạn đã check-in hôm nay rồi',
  NOT_CHECKED_IN: 'Bạn chưa check-in hôm nay',
  ALREADY_CHECKED_OUT: 'Bạn đã check-out hôm nay rồi',
  INSUFFICIENT_LEAVE_BALANCE: 'Số ngày phép năm không đủ',
  CONFLICTING_LEAVE_REQUEST: 'Đã có đơn nghỉ phép trong khoảng thời gian này',
  REMOTE_WORK_REQUEST_EXISTS: 'Đã có yêu cầu làm việc từ xa cho ngày này',
  WORK_SHIFT_NOT_FOUND: 'Không tìm thấy ca làm việc phù hợp',
} as const;
