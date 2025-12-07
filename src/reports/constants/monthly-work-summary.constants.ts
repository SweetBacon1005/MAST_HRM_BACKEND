/**
 * Constants for Monthly Work Summary calculations
 */

// Working session thresholds (in minutes)
export const WORKING_SESSION_THRESHOLDS = {
  MINIMUM_MORNING_MINUTES: 180, // 3 hours = 1 morning session
  MINIMUM_AFTERNOON_MINUTES: 180, // 3 hours = 1 afternoon session
} as const;

// Violation tolerance thresholds (in minutes)
export const VIOLATION_THRESHOLDS = {
  LATE_TOLERANCE_MINUTES: 15, // Late <= 15 minutes not counted as violation
  EARLY_TOLERANCE_MINUTES: 15, // Early leave <= 15 minutes not counted as violation
} as const;

// Session deduction thresholds (for future use if company policy requires)
export const SESSION_DEDUCTION_THRESHOLDS = {
  DEDUCT_SESSION_LATE_THRESHOLD: 30, // Late > 30 minutes may deduct 0.5 session
  DEDUCT_SESSION_EARLY_THRESHOLD: 30, // Early > 30 minutes may deduct 0.5 session
} as const;

// Default values
export const DEFAULT_VALUES = {
  ANNUAL_LEAVE_QUOTA: 36, // 3 days per month * 12 months
  CARRY_OVER_MAX_DAYS: 12, // Maximum days can be carried over to next year
} as const;

// Date range limits
export const DATE_RANGE_LIMITS = {
  MINIMUM_YEAR: 2020,
  MAXIMUM_FUTURE_YEARS: 1, // Can query up to current year + 1
} as const;

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Sorting defaults
export const SORTING_DEFAULTS = {
  SORT_BY: 'user_id',
  SORT_ORDER: 'asc',
} as const;

// Status values
export const WORK_STATUS = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LEAVE: 'LEAVE',
  HOLIDAY: 'HOLIDAY',
  WEEKEND: 'WEEKEND',
} as const;

// Error messages
export const MONTHLY_WORK_SUMMARY_ERRORS = {
  USER_NOT_FOUND: 'Không tìm thấy nhân viên',
  INVALID_MONTH_FORMAT: 'Định dạng tháng không hợp lệ (YYYY-MM)',
  YEAR_OUT_OF_RANGE: 'Năm phải từ {min} đến {max}',
  NO_PERMISSION: 'Bạn không có quyền xem báo cáo này',
  MONTH_NOT_COMPLETE: 'Timesheet tháng này chưa hoàn thiện',
  CALCULATION_FAILED: 'Lỗi khi tính toán báo cáo công',
  EXPORT_FAILED: 'Không thể export báo cáo',
} as const;

// Leave type categories
export const LEAVE_TYPE_CATEGORIES = {
  PAID: ['PAID', 'COMPENSATORY'],
  UNPAID: ['UNPAID'],
  SICK: ['SICK', 'MATERNITY'],
  OTHER: ['PERSONAL'],
} as const;

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT_ATTENDANCE_RATE: 95, // >= 95% is excellent
  GOOD_ATTENDANCE_RATE: 80, // >= 80% is good
  EXCELLENT_ON_TIME_RATE: 90, // >= 90% is excellent
  GOOD_ON_TIME_RATE: 75, // >= 75% is good
} as const;

// Export constants
export const EXPORT_CONSTANTS = {
  CSV_DELIMITER: ',',
  CSV_QUOTE: '"',
  EXCEL_HEADER_COLOR: 'FF4472C4',
  EXCEL_TITLE_SIZE: 16,
  MAX_SHEET_NAME_LENGTH: 31,
} as const;
