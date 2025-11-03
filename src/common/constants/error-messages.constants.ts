/**
 * Các thông báo lỗi tiếng Việt cho toàn bộ hệ thống
 */

// === AUTH ERRORS ===
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng',
  EMAIL_ALREADY_EXISTS: 'Email này đã được sử dụng',
  USER_NOT_FOUND: 'Không tìm thấy người dùng',
  INVALID_REFRESH_TOKEN: 'Refresh token không hợp lệ hoặc đã hết hạn',
  EXPIRED_REFRESH_TOKEN: 'Token làm mới đã hết hạn',
  CURRENT_PASSWORD_INCORRECT: 'Mật khẩu hiện tại không đúng',
  OTP_EXPIRED: 'Mã OTP đã hết hạn',
  OTP_INVALID: 'Mã OTP không chính xác',
  OTP_INVALID_OR_EXPIRED: 'Mã OTP không hợp lệ hoặc đã hết hạn',
  OTP_VALID: 'Mã OTP hợp lệ',
  OTP_SENT_IF_EMAIL_EXISTS: 'Nếu email tồn tại, mã OTP đã được gửi đến email của bạn',
  UNAUTHORIZED: 'Không có quyền truy cập',
  FORBIDDEN: 'Bạn không có quyền thực hiện hành động này',
  TOKEN_EXPIRED: 'Token đã hết hạn',
  INVALID_TOKEN: 'Token không hợp lệ',
  TOKEN_INVALID_OR_EXPIRED: 'Token không hợp lệ hoặc đã hết hạn',
  ACCOUNT_LOCKED: 'Tài khoản đã bị khóa',
  ACCOUNT_NOT_VERIFIED: 'Tài khoản chưa được xác thực',
  ACCOUNT_DELETED: 'Tài khoản đã bị xóa',
  ACCOUNT_NO_PASSWORD: 'Tài khoản chưa có mật khẩu',
  PASSWORD_TOO_WEAK: 'Mật khẩu quá yếu',
  PASSWORD_TOO_SHORT: 'Mật khẩu phải có ít nhất 8 ký tự',
  PASSWORD_WEAK: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số',
  PASSWORD_INVALID_CHARS: 'Mật khẩu chứa ký tự không được phép',
  NEW_PASSWORD_SAME_AS_CURRENT: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  PASSWORD_RESET_SUCCESS: 'Đặt lại mật khẩu thành công',
  PASSWORD_CHANGE_SUCCESS: 'Thay đổi mật khẩu thành công',
  EMAIL_NOT_VERIFIED: 'Email chưa được xác thực',
  EMAIL_NOT_FOUND: 'Email không tồn tại trong hệ thống',
  INVALID_EMAIL_FORMAT: 'Email không hợp lệ',
  TOO_MANY_REQUESTS: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 giờ.',
  LOGOUT_SUCCESS: 'Đăng xuất thành công',
} as const;

// === USER ERRORS ===
export const USER_ERRORS = {
  USER_NOT_FOUND: 'Không tìm thấy người dùng',
  USER_ALREADY_EXISTS: 'Người dùng đã tồn tại',
  USER_ALREADY_ACTIVE: 'Người dùng đã được kích hoạt',
  USER_ALREADY_INACTIVE: 'Người dùng đã bị vô hiệu hóa',
  INVALID_USER_DATA: 'Dữ liệu người dùng không hợp lệ',
  CANNOT_DELETE_SELF: 'Không thể xóa tài khoản của chính mình',
  CANNOT_DEACTIVATE_SELF: 'Không thể vô hiệu hóa tài khoản của chính mình',
  INVALID_ROLE: 'Vai trò không hợp lệ',
  PERMISSION_DENIED: 'Không có quyền thực hiện',
  BULK_IMPORT_FAILED: 'Nhập dữ liệu hàng loạt thất bại',
  INVALID_CSV_FORMAT: 'Định dạng CSV không hợp lệ',
  INVALID_SEARCH_PARAMS: 'Tham số tìm kiếm không hợp lệ',
} as const;

// === ASSET ERRORS ===
export const ASSET_ERRORS = {
  ASSET_NOT_FOUND: 'Không tìm thấy tài sản',
  ASSET_CODE_EXISTS: 'Mã tài sản đã tồn tại',
  SERIAL_NUMBER_EXISTS: 'Số serial đã tồn tại',
  ASSET_ALREADY_ASSIGNED: 'Tài sản đã được gán cho người khác',
  ASSET_NOT_ASSIGNED: 'Tài sản chưa được gán cho ai',
  CANNOT_DELETE_ASSIGNED_ASSET: 'Không thể xóa tài sản đã được gán',
  ASSET_REQUEST_NOT_FOUND: 'Không tìm thấy yêu cầu tài sản',
  REQUEST_NOT_PENDING: 'Yêu cầu không ở trạng thái chờ duyệt',
  REQUEST_ALREADY_PROCESSED: 'Yêu cầu đã được xử lý',
  INSUFFICIENT_PERMISSIONS: 'Không đủ quyền hạn',
  INVALID_ASSET_STATUS: 'Trạng thái tài sản không hợp lệ',
  ASSET_IN_USE: 'Tài sản đang được sử dụng',
} as const;

// === DIVISION ERRORS ===
export const DIVISION_ERRORS = {
  DIVISION_NOT_FOUND: 'Không tìm thấy phòng ban',
  DIVISION_NAME_EXISTS: 'Tên phòng ban đã tồn tại',
  CANNOT_DELETE_WITH_MEMBERS: 'Không thể xóa phòng ban có thành viên',
  USER_NOT_IN_DIVISION: 'Người dùng không thuộc phòng ban này',
  CIRCULAR_PARENT_CHILD: 'Phát hiện mối quan hệ cha-con vòng tròn',
  INVALID_DIVISION_TYPE: 'Loại phòng ban không hợp lệ',
  PARENT_DIVISION_NOT_FOUND: 'Không tìm thấy phòng ban cha',
  INSUFFICIENT_ROLE_PERMISSIONS: 'Không đủ quyền để cập nhật vai trò',
} as const;

// === REQUEST ERRORS ===
export const REQUEST_ERRORS = {
  REQUEST_NOT_FOUND: 'Không tìm thấy yêu cầu',
  CANNOT_CREATE_PAST_DATE: 'Không thể tạo yêu cầu cho ngày trong quá khứ',
  REQUEST_ALREADY_EXISTS: 'Yêu cầu đã tồn tại cho ngày này',
  INSUFFICIENT_LEAVE_BALANCE: 'Số dư nghỉ phép không đủ',
  REQUEST_ALREADY_PROCESSED: 'Yêu cầu đã được xử lý',
  OVERTIME_LIMIT_EXCEEDED: 'Vượt quá giới hạn làm thêm giờ trong tháng',
  INVALID_TIME_RANGE: 'Khoảng thời gian không hợp lệ',
  UNAUTHORIZED_ACCESS: 'Không có quyền truy cập yêu cầu này',
  INVALID_REQUEST_TYPE: 'Loại yêu cầu không hợp lệ',
  DUPLICATE_REQUEST: 'Yêu cầu trùng lặp',
} as const;

// === TIMESHEET ERRORS ===
export const TIMESHEET_ERRORS = {
  TIMESHEET_NOT_FOUND: 'Không tìm thấy bảng chấm công',
  CANNOT_CREATE_FUTURE_DATE: 'Không thể tạo bảng chấm công cho ngày tương lai',
  TIMESHEET_ALREADY_EXISTS: 'Bảng chấm công đã tồn tại cho ngày này',
  CHECKOUT_BEFORE_CHECKIN: 'Thời gian checkout không thể trước checkin',
  TIMESHEET_ALREADY_SUBMITTED: 'Bảng chấm công đã được nộp',
  UNAUTHORIZED_TIMESHEET_ACCESS: 'Không có quyền truy cập bảng chấm công này',
  WORK_HOURS_EXCEEDED: 'Vượt quá số giờ làm việc tối đa cho phép',
  MODIFICATION_DEADLINE_PASSED: 'Không thể sửa đổi sau thời hạn',
  INVALID_WORK_TIME: 'Thời gian làm việc không hợp lệ',
  TIMESHEET_LOCKED: 'Bảng chấm công đã bị khóa',
} as const;

// === ATTENDANCE ERRORS ===
export const ATTENDANCE_ERRORS = {
  INVALID_ATTENDANCE_DATA: 'Dữ liệu chấm công không hợp lệ',
  WORK_SHIFT_NOT_FOUND: 'Không tìm thấy ca làm việc',
  ATTENDANCE_ALREADY_EXISTS: 'Đã có bản ghi chấm công cho ngày này',
  MINIMUM_WORK_TIME_REQUIRED: 'Thời gian làm việc phải ít nhất 30 phút',
  INVALID_WORK_SHIFT: 'Ca làm việc không hợp lệ',
  CHECKIN_CHECKOUT_INVALID: 'Thời gian checkin/checkout không hợp lệ',
} as const;

// === PROJECT ERRORS ===
export const PROJECT_ERRORS = {
  PROJECT_NOT_FOUND: 'Không tìm thấy dự án',
  PROJECT_NAME_EXISTS: 'Tên dự án đã tồn tại',
  PROJECT_CODE_EXISTS: 'Mã dự án đã tồn tại',
  CANNOT_DELETE_ACTIVE_PROJECT: 'Không thể xóa dự án đang hoạt động',
  USER_NOT_IN_PROJECT: 'Người dùng không thuộc dự án này',
  USER_ALREADY_IN_PROJECT: 'Người dùng đã thuộc dự án này',
  INVALID_PROJECT_STATUS: 'Trạng thái dự án không hợp lệ',
  PROJECT_DEADLINE_PASSED: 'Thời hạn dự án đã qua',
} as const;

// === ROLE ERRORS ===
export const ROLE_ERRORS = {
  ROLE_NOT_FOUND: 'Không tìm thấy vai trò',
  CANNOT_ASSIGN_ROLE: 'Không thể gán vai trò này',
  ROLE_HIERARCHY_VIOLATION: 'Vi phạm phân cấp vai trò',
  INSUFFICIENT_ROLE_PERMISSIONS: 'Không đủ quyền để gán vai trò',
  ROLE_ASSIGNMENT_NOT_FOUND: 'Không tìm thấy phân quyền vai trò',
  CANNOT_REVOKE_OWN_ROLE: 'Không thể thu hồi vai trò của chính mình',
  ROLE_TRANSFER_CONFIRMATION_REQUIRED: 'Cần xác nhận để chuyển giao vai trò',
  DIVISION_HEAD_RESTRICTION: 'Trưởng phòng chỉ có thể gán vai trò trong phòng ban của mình',
} as const;

// === VALIDATION ERRORS ===
export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: 'Trường này là bắt buộc',
  INVALID_EMAIL: 'Email không hợp lệ',
  INVALID_PHONE: 'Số điện thoại không hợp lệ',
  INVALID_DATE: 'Ngày không hợp lệ',
  INVALID_TIME: 'Thời gian không hợp lệ',
  INVALID_FORMAT: 'Định dạng không hợp lệ',
  VALUE_TOO_LONG: 'Giá trị quá dài',
  VALUE_TOO_SHORT: 'Giá trị quá ngắn',
  INVALID_NUMBER: 'Số không hợp lệ',
  INVALID_ENUM_VALUE: 'Giá trị không nằm trong danh sách cho phép',
} as const;

// === NEWS ERRORS ===
export const NEWS_ERRORS = {
  NEWS_NOT_FOUND: 'Không tìm thấy tin tức',
  UNAUTHORIZED_UPDATE: 'Bạn không có quyền cập nhật tin tức này',
  UNAUTHORIZED_DELETE: 'Bạn không có quyền xóa tin tức này',
  UNAUTHORIZED_SUBMIT: 'Bạn không có quyền gửi tin tức này để duyệt',
  CANNOT_UPDATE_STATUS: 'Chỉ có thể cập nhật tin tức ở trạng thái nháp hoặc bị từ chối',
  CANNOT_SUBMIT_STATUS: 'Chỉ có thể gửi tin tức ở trạng thái nháp hoặc bị từ chối để duyệt',
  CANNOT_REVIEW_STATUS: 'Chỉ có thể duyệt/từ chối tin tức ở trạng thái chờ duyệt',
  NEWS_CREATED_SUCCESS: 'Tạo tin tức thành công',
  NEWS_UPDATED_SUCCESS: 'Cập nhật tin tức thành công',
  NEWS_DELETED_SUCCESS: 'Xóa tin tức thành công',
  NEWS_SUBMITTED_SUCCESS: 'Gửi tin tức để duyệt thành công',
  NEWS_APPROVED_SUCCESS: 'Duyệt tin tức thành công',
  NEWS_REJECTED_SUCCESS: 'Từ chối tin tức thành công',
} as const;

// === SYSTEM ERRORS ===
export const SYSTEM_ERRORS = {
  DATABASE_CONNECTION_FAILED: 'Kết nối cơ sở dữ liệu thất bại',
  INTERNAL_SERVER_ERROR: 'Lỗi máy chủ nội bộ',
  SERVICE_UNAVAILABLE: 'Dịch vụ không khả dụng',
  TIMEOUT_ERROR: 'Hết thời gian chờ',
  NETWORK_ERROR: 'Lỗi mạng',
  FILE_UPLOAD_FAILED: 'Tải lên tệp thất bại',
  FILE_TOO_LARGE: 'Tệp quá lớn',
  INVALID_FILE_TYPE: 'Loại tệp không hợp lệ',
  STORAGE_FULL: 'Bộ nhớ đã đầy',
} as const;

// === SUCCESS MESSAGES ===
export const SUCCESS_MESSAGES = {
  CREATED_SUCCESSFULLY: 'Tạo thành công',
  UPDATED_SUCCESSFULLY: 'Cập nhật thành công',
  DELETED_SUCCESSFULLY: 'Xóa thành công',
  OPERATION_SUCCESSFUL: 'Thao tác thành công',
  LOGIN_SUCCESSFUL: 'Đăng nhập thành công',
  LOGOUT_SUCCESSFUL: 'Đăng xuất thành công',
  PASSWORD_CHANGED: 'Đổi mật khẩu thành công',
  EMAIL_SENT: 'Gửi email thành công',
  DATA_EXPORTED: 'Xuất dữ liệu thành công',
  DATA_IMPORTED: 'Nhập dữ liệu thành công',
} as const;

// Export all error types for type safety
export type AuthError = typeof AUTH_ERRORS[keyof typeof AUTH_ERRORS];
export type UserError = typeof USER_ERRORS[keyof typeof USER_ERRORS];
export type AssetError = typeof ASSET_ERRORS[keyof typeof ASSET_ERRORS];
export type DivisionError = typeof DIVISION_ERRORS[keyof typeof DIVISION_ERRORS];
export type RequestError = typeof REQUEST_ERRORS[keyof typeof REQUEST_ERRORS];
export type TimesheetError = typeof TIMESHEET_ERRORS[keyof typeof TIMESHEET_ERRORS];
export type AttendanceError = typeof ATTENDANCE_ERRORS[keyof typeof ATTENDANCE_ERRORS];
export type ProjectError = typeof PROJECT_ERRORS[keyof typeof PROJECT_ERRORS];
export type RoleError = typeof ROLE_ERRORS[keyof typeof ROLE_ERRORS];
export type NewsError = typeof NEWS_ERRORS[keyof typeof NEWS_ERRORS];
export type ValidationError = typeof VALIDATION_ERRORS[keyof typeof VALIDATION_ERRORS];
export type SystemError = typeof SYSTEM_ERRORS[keyof typeof SYSTEM_ERRORS];
export type SuccessMessage = typeof SUCCESS_MESSAGES[keyof typeof SUCCESS_MESSAGES];
