/**
 * Các thông báo lỗi tiếng Việt cho toàn bộ hệ thống
 */

// === AUTH ERRORS ===
export const AUTH_ERRORS = {
  ROLE_NOT_FOUND: 'Vai trò không tồn tại',
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
  ASSET_NOT_AVAILABLE: 'Tài sản không ở trạng thái có sẵn',
  ASSET_NOT_ASSIGNED_STATUS: 'Tài sản không ở trạng thái đã gán',
  REQUEST_NOT_APPROVED: 'Yêu cầu chưa được phê duyệt',
  CANNOT_UPDATE_REQUEST: 'Bạn không có quyền cập nhật yêu cầu này',
  CANNOT_DELETE_REQUEST: 'Bạn không có quyền xóa yêu cầu này',
  CANNOT_UPDATE_REQUEST_STATUS: 'Chỉ có thể cập nhật yêu cầu ở trạng thái chờ duyệt',
  CANNOT_DELETE_REQUEST_STATUS: 'Chỉ có thể xóa yêu cầu ở trạng thái chờ duyệt hoặc đã hủy',
  ASSET_DOES_NOT_EXIST: 'Tài sản không tồn tại',
} as const;

// === DIVISION ERRORS ===
export const DIVISION_ERRORS = {
  NOT_MANAGED_IN_DIVISION: 'Người dùng không quản lí phòng ban này',
  NOT_MANAGED_IN_TEAM: 'Người dùng không quản lí nhóm này',
  NOT_MANAGED_IN_PROJECT: 'Người dùng không quản lí dự án này',
  NOT_MANAGED_IN_USER: 'Người dùng không quản lí người dùng này',
  DIVISION_NOT_FOUND: 'Không tìm thấy phòng ban',
  DIVISION_NAME_EXISTS: 'Tên phòng ban đã tồn tại',
  CANNOT_DELETE_WITH_MEMBERS: 'Không thể xóa phòng ban có thành viên',
  USER_NOT_IN_DIVISION: 'Người dùng không thuộc phòng ban này',
  INVALID_DIVISION_TYPE: 'Loại phòng ban không hợp lệ',
  INSUFFICIENT_ROLE_PERMISSIONS: 'Không đủ quyền để cập nhật vai trò',
  TARGET_DIVISION_NOT_FOUND: 'Phòng ban đích không tồn tại',
  USER_NOT_ASSIGNED_TO_DIVISION: 'Người dùng chưa được phân công vào phòng ban nào',
  ROTATION_ALREADY_EXISTS: 'Người dùng đã có lịch sử điều chuyển đến phòng ban này',
  CANNOT_TRANSFER_EMPLOYEE: 'Bạn không có quyền điều chuyển nhân viên này',
  ROTATION_NOT_FOUND: 'Không tìm thấy bản ghi điều chuyển',
  DIVISION_ID_REQUIRED: 'ID phòng ban là bắt buộc',
  USER_ALREADY_IN_DIVISION: 'Người dùng đã được gán vào phòng ban',
  USER_DIVISION_ASSIGNMENT_NOT_FOUND: 'Không tìm thấy phân công người dùng trong phòng ban',
  USER_DIVISION_NOT_FOUND: 'Không tìm thấy người dùng trong phòng ban',
  USER_NO_ASSIGNMENT_IN_DIVISION: 'Người dùng không có phân công trong phòng ban này',
  USER_MULTIPLE_DIVISION_ASSIGNMENTS: 'Người dùng có nhiều hơn 1 phân công trong phòng ban',
} as const;

// === REQUEST ERRORS ===
export const REQUEST_ERRORS = {
  REQUEST_NOT_FOUND: 'Không tìm thấy yêu cầu',
  REMOTE_WORK_REQUEST_NOT_FOUND: 'Không tìm thấy yêu cầu làm việc từ xa',
  DAY_OFF_REQUEST_NOT_FOUND: 'Không tìm thấy đơn nghỉ phép',
  OVERTIME_REQUEST_NOT_FOUND: 'Không tìm thấy đơn làm thêm giờ',
  LATE_EARLY_REQUEST_NOT_FOUND: 'Không tìm thấy đơn đi muộn/về sớm',
  FORGOT_CHECKIN_REQUEST_NOT_FOUND: 'Không tìm thấy đơn xin bổ sung chấm công',
  CANNOT_CREATE_PAST_DATE: 'Không thể tạo yêu cầu cho ngày trong quá khứ',
  CANNOT_CREATE_FUTURE_FORGOT_CHECKIN: 'Không thể tạo đơn xin bổ sung chấm công cho ngày tương lai',
  REQUEST_ALREADY_EXISTS: 'Yêu cầu đã tồn tại cho ngày này',
  DAY_OFF_ALREADY_EXISTS: 'Đã có đơn nghỉ phép trong ngày này',
  OVERTIME_ALREADY_EXISTS: 'Đã có đơn làm tăng ca cho ngày này',
  LATE_EARLY_ALREADY_EXISTS: 'Đã có request đi muộn/về sớm cho ngày này',
  INSUFFICIENT_LEAVE_BALANCE: 'Số dư nghỉ phép không đủ',
  REQUEST_ALREADY_PROCESSED: 'Yêu cầu đã được xử lý',
  FORGOT_CHECKIN_ALREADY_PROCESSED: 'Đơn xin bổ sung chấm công đã được xử lý',
  OVERTIME_LIMIT_EXCEEDED: 'Vượt quá giới hạn làm thêm giờ trong tháng',
  OVERTIME_OVERLAP_WORK_HOURS: 'Thời gian tăng ca không được trùng với giờ hành chính (08:00 - 17:00)',
  INVALID_TIME_RANGE: 'Khoảng thời gian không hợp lệ',
  UNAUTHORIZED_ACCESS: 'Không có quyền truy cập yêu cầu này',
  NO_ACCESS_PERMISSION: 'Không có quyền truy cập request này',
  NO_APPROVE_PERMISSION: 'Bạn không có quyền duyệt request này',
  NO_REJECT_PERMISSION: 'Bạn không có quyền từ chối request này',
  INVALID_REQUEST_TYPE: 'Loại yêu cầu không hợp lệ',
  DUPLICATE_REQUEST: 'Yêu cầu trùng lặp',
  NOT_HAVE_PERMISSION: 'Không có quyền thực hiện hành động này',
  REQUEST_NOT_REJECTED: 'Yêu cầu chỉ có thể sửa khi ở trạng thái BỊ TỪ CHỐI',
  CANNOT_UPDATE_NON_REJECTED: 'Yêu cầu chỉ được sửa khi ở trạng thái BỊ TỪ CHỐI',
  ONLY_UPDATE_REJECTED: 'Yêu cầu chỉ được cập nhật khi ở trạng thái BỊ TỪ CHỐI',
  CANNOT_DELETE_NON_PENDING: 'Chỉ được xóa khi ở trạng thái CHỜ DUYỆT',
  ONLY_DELETE_PENDING: 'Chỉ có thể xóa yêu cầu ở trạng thái CHỜ DUYỆT',
  CANNOT_APPROVE_NON_PENDING: 'Không thể duyệt request không ở trạng thái CHỜ DUYỆT',
  CANNOT_REJECT_NON_PENDING: 'Không thể từ chối request không ở trạng thái CHỜ DUYỆT',
  LATE_MINUTES_REQUIRED: 'Số phút đi muộn là bắt buộc',
  EARLY_MINUTES_REQUIRED: 'Số phút về sớm là bắt buộc',
  LATE_EARLY_MINUTES_REQUIRED: 'Cả số phút đi muộn và về sớm đều là bắt buộc',
  DIVISION_HEAD_ONLY: 'Chỉ Division Head mới có quyền truy cập',
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
  SOME_TIMESHEETS_NOT_FOUND: 'Một số timesheet không tồn tại',
  REASON_REQUIRED_FOR_REJECT: 'Lý do từ chối là bắt buộc khi action = REJECT',
  CANNOT_REVIEW_INVALID_STATUS: 'Không thể duyệt/từ chối timesheet do trạng thái không hợp lệ',
  BULK_REVIEW_SUCCESS: 'Review timesheets thành công',
} as const;

// === ATTENDANCE ERRORS ===
export const ATTENDANCE_ERRORS = {
  INVALID_ATTENDANCE_DATA: 'Dữ liệu chấm công không hợp lệ',
  WORK_SHIFT_NOT_FOUND: 'Không tìm thấy ca làm việc',
  ATTENDANCE_ALREADY_EXISTS: 'Đã có bản ghi chấm công cho ngày này',
  MINIMUM_WORK_TIME_REQUIRED: 'Thời gian làm việc phải ít nhất 30 phút',
  INVALID_WORK_SHIFT: 'Ca làm việc không hợp lệ',
  CHECKIN_CHECKOUT_INVALID: 'Thời gian checkin/checkout không hợp lệ',
  WORK_SHIFT_NAME_EXISTS: 'Ca làm việc với tên này đã tồn tại',
  MORNING_END_BEFORE_START: 'Giờ kết thúc buổi sáng phải sau giờ bắt đầu',
  AFTERNOON_END_BEFORE_START: 'Giờ kết thúc buổi chiều phải sau giờ bắt đầu',
  AFTERNOON_BEFORE_MORNING: 'Giờ bắt đầu buổi chiều phải sau giờ kết thúc buổi sáng',
  WORK_SHIFT_CREATE_FAILED: 'Không thể tạo ca làm việc',
  INVALID_TIME_FORMAT: 'Định dạng thời gian không hợp lệ (phải là HH:MM)',
  USER_NOT_FOUND_FOR_ATTENDANCE: 'Không tìm thấy người dùng',
  WORK_SHIFT_NO_SUITABLE: 'Không tìm thấy ca làm việc phù hợp cho ngày này',
  CHECKOUT_BEFORE_CHECKIN: 'Thời gian check-out phải sau thời gian check-in',
  CANNOT_ATTEND_PAST_30_DAYS: 'Không thể chấm công cho ngày quá 30 ngày trước',
  CANNOT_ATTEND_FUTURE: 'Không thể chấm công cho ngày trong tương lai',
  WORK_DURATION_TOO_LONG: 'Thời gian làm việc không thể vượt quá 16 giờ một ngày',
  WORK_DURATION_TOO_SHORT: 'Thời gian làm việc phải ít nhất 30 phút',
  ATTENDANCE_SAVE_FAILED: 'Không thể lưu thông tin chấm công',
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
  DIVISION_NOT_FOUND: 'Phòng ban không tồn tại',
  TEAM_NOT_FOUND: 'Nhóm không tồn tại',
  START_DATE_AFTER_END_DATE: 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc',
  INVALID_PROGRESS_VALUE: 'Tiến độ phải trong khoảng 0-100',
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

// === NOTIFICATION ERRORS ===
export const NOTIFICATION_ERRORS = {
  NOTIFICATION_NOT_FOUND: 'Không tìm thấy thông báo',
  UNAUTHORIZED_ACCESS: 'Bạn không có quyền truy cập thông báo này',
  UNAUTHORIZED_UPDATE: 'Bạn không có quyền cập nhật thông báo này',
  UNAUTHORIZED_DELETE: 'Bạn không có quyền xóa thông báo này',
  UNAUTHORIZED_CREATE: 'Bạn không có quyền tạo thông báo',
  NOTIFICATION_CREATED_SUCCESS: 'Tạo thông báo thành công',
  NOTIFICATION_UPDATED_SUCCESS: 'Cập nhật thông báo thành công',
  NOTIFICATION_DELETED_SUCCESS: 'Xóa thông báo thành công',
  NOTIFICATION_MARKED_READ_SUCCESS: 'Đánh dấu đã đọc thành công',
  NOTIFICATION_MARKED_UNREAD_SUCCESS: 'Đánh dấu chưa đọc thành công',
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
  USER_ADDED_TO_DIVISION: 'Thêm người dùng vào phòng ban thành công',
  USER_DIVISION_UPDATED: 'Cập nhật phân công người dùng trong phòng ban thành công',
  USER_REMOVED_FROM_DIVISION: 'Xóa người dùng khỏi phòng ban thành công',
  TEAM_CREATED: 'Tạo team thành công',
  TEAM_UPDATED: 'Cập nhật team thành công',
  TEAM_DELETED: 'Xóa nhóm thành công',
  TEAM_MEMBER_ADDED: 'Đã thêm user vào team thành công',
  REMOTE_WORK_APPROVED: 'Đã duyệt yêu cầu làm việc từ xa thành công',
  REMOTE_WORK_REJECTED: 'Đã từ chối yêu cầu làm việc từ xa',
  DAY_OFF_APPROVED: 'Đã duyệt đơn nghỉ phép thành công',
  DAY_OFF_REJECTED: 'Đã từ chối đơn nghỉ phép',
  OVERTIME_APPROVED: 'Đã duyệt đơn làm thêm giờ thành công',
  OVERTIME_REJECTED: 'Đã từ chối đơn làm thêm giờ',
  FORGOT_CHECKIN_APPROVED: 'Duyệt đơn xin bổ sung chấm công thành công',
  FORGOT_CHECKIN_REJECTED: 'Từ chối đơn xin bổ sung chấm công thành công',
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
export type NotificationError = typeof NOTIFICATION_ERRORS[keyof typeof NOTIFICATION_ERRORS];
export type ValidationError = typeof VALIDATION_ERRORS[keyof typeof VALIDATION_ERRORS];
export type SystemError = typeof SYSTEM_ERRORS[keyof typeof SYSTEM_ERRORS];
export const TEAM_ERRORS = {
  TEAM_NOT_FOUND: 'Không tìm thấy nhóm',
  TEAM_NAME_EXISTS: 'Tên nhóm đã tồn tại',
  TEAM_NAME_EXISTS_IN_DIVISION: 'Tên nhóm đã tồn tại trong phòng ban này',
  TEAM_CANNOT_DELETE_WITH_MEMBERS: 'Không thể xóa nhóm vì còn thành viên',
  TEAM_CANNOT_DELETE_WITH_PROJECTS: 'Không thể xóa nhóm vì còn dự án',
  TEAM_INVALID_DIVISION: 'Bạn không có quyền thao tác với nhóm ngoài phòng ban của bạn',
  TEAM_DIVISION_REQUIRED: 'Cần cung cấp phòng ban cho nhóm',
  USER_DIVISION_NOT_FOUND: 'Không xác định được phòng ban của bạn',
  TEAM_NOT_IN_DIVISION: 'Nhóm không tồn tại hoặc không thuộc phòng ban này',
} as const;

// === DAILY REPORT ERRORS ===
export const DAILY_REPORT_ERRORS = {
  DAILY_REPORT_NOT_FOUND: 'Không tìm thấy báo cáo công việc hàng ngày',
  UNAUTHORIZED_ACCESS: 'Bạn không có quyền truy cập báo cáo này',
  UNAUTHORIZED_UPDATE: 'Bạn không có quyền cập nhật báo cáo này',
  UNAUTHORIZED_DELETE: 'Bạn không có quyền xóa báo cáo này',
  UNAUTHORIZED_APPROVE: 'Bạn không có quyền duyệt báo cáo này',
  CANNOT_UPDATE_NOT_REJECTED: 'Chỉ có thể cập nhật báo cáo ở trạng thái BỊ TỪ CHỐI',
  CANNOT_DELETE_NOT_PENDING: 'Chỉ có thể xóa báo cáo ở trạng thái CHỜ DUYỆT',
  CANNOT_APPROVE_NOT_PENDING: 'Chỉ có thể duyệt báo cáo ở trạng thái CHỜ DUYỆT',
  CANNOT_REJECT_NOT_PENDING: 'Chỉ có thể từ chối báo cáo ở trạng thái CHỜ DUYỆT',
  CANNOT_APPROVE_OWN_REPORT: 'Không thể duyệt báo cáo của chính mình',
  PROJECT_NOT_FOUND: 'Dự án không tồn tại',
  INVALID_WORK_DATE: 'Ngày làm việc không hợp lệ',
  INVALID_ACTUAL_TIME: 'Thời gian thực tế không hợp lệ',
  WORK_DATE_NOT_IN_CURRENT_WEEK: 'Chỉ có thể tạo báo cáo cho tuần hiện tại',
  USER_NOT_IN_PROJECT: 'Bạn không thuộc dự án này',
  DUPLICATE_REPORT: 'Báo cáo cho dự án và ngày này đã tồn tại',
} as const;

export type DailyReportError = typeof DAILY_REPORT_ERRORS[keyof typeof DAILY_REPORT_ERRORS];
export type SuccessMessage = typeof SUCCESS_MESSAGES[keyof typeof SUCCESS_MESSAGES];

// === MEETING ROOM ERRORS ===
export const MEETING_ROOM_ERRORS = {
  ROOM_NOT_FOUND: 'Phòng họp không tồn tại',
  ROOM_NOT_ACTIVE: 'Phòng họp không hoạt động',
  ROOM_NAME_EXISTS: 'Tên phòng đã tồn tại',
  BOOKING_NOT_FOUND: 'Lịch đặt phòng không tồn tại',
  INVALID_TIME: 'Thời gian không hợp lệ',
  END_TIME_BEFORE_START: 'Thời gian kết thúc phải sau thời gian bắt đầu',
  CANNOT_BOOK_PAST: 'Không thể đặt phòng trong quá khứ',
  DURATION_EXCEEDED: 'Thời lượng cuộc họp vượt quá giới hạn tối đa (4 giờ)',
  ROOM_TIME_CONFLICT: 'Phòng đã bị trùng lịch trong khung giờ yêu cầu',
  ORGANIZER_TIME_CONFLICT: 'Bạn đang có lịch họp khác trùng thời gian',
  UNAUTHORIZED_UPDATE: 'Bạn không có quyền cập nhật lịch đặt này',
  UNAUTHORIZED_DELETE: 'Bạn không có quyền xóa lịch đặt này',
} as const;

export type MeetingRoomError = typeof MEETING_ROOM_ERRORS[keyof typeof MEETING_ROOM_ERRORS];

// === MILESTONE ERRORS ===
export const MILESTONE_ERRORS = {
  MILESTONE_NOT_FOUND: 'Không tìm thấy mốc dự án',
  MILESTONE_NAME_EXISTS: 'Tên mốc đã tồn tại trong dự án này',
  INVALID_DATE_RANGE: 'Ngày kết thúc phải sau ngày bắt đầu',
  OUT_OF_PROJECT_RANGE: 'Mốc phải nằm trong khoảng thời gian của dự án',
  INVALID_PROGRESS: 'Tiến độ phải từ 0-100',
  CANNOT_DELETE_MILESTONE: 'Không thể xóa mốc dự án',
  UNAUTHORIZED_ACCESS: 'Bạn không có quyền truy cập mốc này',
  MILESTONE_ALREADY_COMPLETED: 'Mốc đã hoàn thành',
  INVALID_STATUS: 'Trạng thái mốc không hợp lệ',
} as const;

export type MilestoneError = typeof MILESTONE_ERRORS[keyof typeof MILESTONE_ERRORS];

// === REPORT ERRORS ===
export const REPORT_ERRORS = {
  REPORT_NOT_FOUND: 'Không tìm thấy báo cáo',
  INVALID_DATE_RANGE: 'Khoảng thời gian không hợp lệ',
  INVALID_MONTH_FORMAT: 'Định dạng tháng không hợp lệ (phải là YYYY-MM)',
  INVALID_YEAR: 'Năm không hợp lệ',
  MONTH_NOT_CLOSED: 'Tháng chưa đóng',
  UNAUTHORIZED_VIEW_REPORT: 'Bạn không có quyền xem báo cáo này',
  UNAUTHORIZED_EXPORT_REPORT: 'Bạn không có quyền xuất báo cáo',
  NO_DATA_AVAILABLE: 'Không có dữ liệu báo cáo',
  EXPORT_FAILED: 'Xuất báo cáo thất bại',
  REPORT_GENERATION_FAILED: 'Tạo báo cáo thất bại',
} as const;

export type ReportError = typeof REPORT_ERRORS[keyof typeof REPORT_ERRORS];
