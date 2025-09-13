# ATTENDANCE MANAGEMENT API Documentation

## Tổng quan

Module Attendance Management cung cấp các API nâng cao để quản lý chấm công với tính toán chi tiết thời gian, phạt, ca làm việc, và báo cáo thống kê.

## Tính năng chính

### 🕐 Tính toán thời gian chi tiết
- Tính toán chính xác thời gian đi muộn, về sớm
- Phân chia thời gian làm việc buổi sáng/chiều
- Tính toán phạt dựa trên quy định block time
- Hỗ trợ nhiều loại ca làm việc

### 📅 Quản lý ca làm việc
- Ca làm việc thường, đặc biệt, ca đêm
- Lịch làm việc theo ca linh hoạt
- Cấu hình giờ làm việc tùy chỉnh

### 🏖️ Quản lý nghỉ phép nâng cao
- Nghỉ có lương, không lương, phép năm
- Nghỉ ốm đau, việc riêng
- Làm việc từ xa (remote work)
- Kiểm tra số dư phép năm
- Phát hiện trùng lịch nghỉ

### 📊 Dashboard và báo cáo
- Dashboard thống kê tổng quan
- Báo cáo chi tiết theo nhiều tiêu chí
- Thống kê vi phạm và hiệu suất
- Xuất báo cáo định dạng khác nhau

## API Endpoints

### 1. Tính toán chấm công chi tiết

#### POST /attendance/calculate
- **Mô tả**: Tính toán chấm công với thời gian và phạt chi tiết
- **Auth**: Cần đăng nhập
- **Body**: AttendanceCalculationDto
```typescript
{
  user_id: number;
  checkin_time: string;      // ISO datetime
  checkout_time: string;     // ISO datetime
  shift_id?: number;         // ID ca làm việc
  is_remote?: boolean;       // Làm việc từ xa
  note?: string;             // Ghi chú
}
```
- **Response**: Bản ghi chấm công với tính toán chi tiết

#### POST /attendance/calculate-penalty
- **Mô tả**: Tính toán phạt đi muộn, về sớm
- **Auth**: Cần đăng nhập
- **Body**: PenaltyCalculationDto
```typescript
{
  late_minutes: number;      // Số phút đi muộn
  early_minutes: number;     // Số phút về sớm
  block_time_id?: number;    // ID quy định phạt
}
```
- **Response**: Chi tiết tính toán phạt

### 2. Quản lý ca làm việc

#### POST /attendance/work-shifts
- **Mô tả**: Tạo ca làm việc mới
- **Auth**: Cần quyền admin/hr/manager
- **Body**: WorkShiftDto
```typescript
{
  name: string;              // Tên ca làm việc
  morning_start: string;     // Giờ bắt đầu buổi sáng
  morning_end: string;       // Giờ kết thúc buổi sáng
  afternoon_start: string;   // Giờ bắt đầu buổi chiều
  afternoon_end: string;     // Giờ kết thúc buổi chiều
  type?: number;             // Loại ca (1: thường, 2: đặc biệt)
}
```

#### GET /attendance/work-shifts
- **Mô tả**: Lấy danh sách tất cả ca làm việc
- **Auth**: Cần đăng nhập
- **Response**: Danh sách ca làm việc

#### PATCH /attendance/work-shifts/:id
- **Mô tả**: Cập nhật ca làm việc
- **Auth**: Cần quyền admin/hr/manager
- **Body**: Partial<WorkShiftDto>

### 3. Quản lý nghỉ phép nâng cao

#### POST /attendance/leave-requests
- **Mô tả**: Tạo đơn xin nghỉ phép chi tiết
- **Auth**: Cần đăng nhập
- **Body**: CreateLeaveRequestDto
```typescript
{
  user_id: number;
  leave_type: number;        // 1: có lương, 2: không lương, 3: phép năm, 4: ốm đau, 5: việc riêng
  start_date: string;        // Ngày bắt đầu nghỉ
  end_date: string;          // Ngày kết thúc nghỉ
  total_days: number;        // Tổng số ngày nghỉ
  reason: string;            // Lý do nghỉ phép
  is_half_day?: boolean;     // Nghỉ nửa ngày
  half_day_period?: string;  // Buổi nghỉ (morning/afternoon)
  attachment_url?: string;   // File đính kèm
  note?: string;             // Ghi chú
}
```

#### POST /attendance/remote-work-requests
- **Mô tả**: Tạo yêu cầu làm việc từ xa
- **Auth**: Cần đăng nhập
- **Body**: RemoteWorkRequestDto
```typescript
{
  user_id: number;
  work_date: string;         // Ngày làm việc từ xa
  reason: string;            // Lý do
  location?: string;         // Địa điểm làm việc
  is_full_day?: boolean;     // Cả ngày
  start_time?: string;       // Giờ bắt đầu (nếu không cả ngày)
  end_time?: string;         // Giờ kết thúc (nếu không cả ngày)
}
```

#### GET /attendance/leave-balance/:userId/:year
- **Mô tả**: Xem số dư phép năm của nhân viên
- **Auth**: Cần đăng nhập
- **Response**: LeaveBalanceDto

#### GET /attendance/my-leave-balance
- **Mô tả**: Xem số dư phép năm của tôi
- **Auth**: Cần đăng nhập
- **Query**: `year` (optional)
- **Response**: LeaveBalanceDto

### 4. Dashboard chấm công

#### GET /attendance/dashboard
- **Mô tả**: Dashboard chấm công với thống kê tổng quan
- **Auth**: Cần quyền manager/admin/hr
- **Query**: AttendanceDashboardDto
```typescript
{
  start_date?: string;       // Ngày bắt đầu
  end_date?: string;         // Ngày kết thúc
  division_id?: number;      // ID phòng ban
  team_id?: number;          // ID team
  period_type?: string;      // Loại chu kỳ (daily/weekly/monthly/yearly)
}
```
- **Response**: Thống kê tổng quan với biểu đồ

#### GET /attendance/dashboard/my-team
- **Mô tả**: Dashboard chấm công team của tôi
- **Auth**: Cần quyền team_leader/manager

### 5. Báo cáo chi tiết

#### GET /attendance/reports/attendance
- **Mô tả**: Báo cáo chấm công chi tiết
- **Auth**: Cần quyền manager/admin/hr
- **Query**: AttendanceReportDto
```typescript
{
  month?: string;            // Tháng báo cáo (YYYY-MM)
  year?: number;             // Năm báo cáo
  user_ids?: number[];       // Danh sách ID người dùng
  report_type?: string;      // Loại báo cáo (summary/detailed/penalty)
  export_format?: string;    // Định dạng xuất (json/excel/pdf)
}
```

#### GET /attendance/reports/penalties
- **Mô tả**: Báo cáo phạt vi phạm chấm công
- **Auth**: Cần quyền manager/admin/hr
- **Query**: PenaltyReportDto

#### GET /attendance/reports/my-attendance
- **Mô tả**: Báo cáo chấm công cá nhân
- **Auth**: Cần đăng nhập

### 6. Thống kê nâng cao

#### GET /attendance/statistics/violations
- **Mô tả**: Thống kê vi phạm chấm công
- **Auth**: Cần quyền manager/admin/hr
- **Query**: `start_date`, `end_date`, `division_id`, `team_id`

#### GET /attendance/statistics/work-patterns
- **Mô tả**: Thống kê mô hình làm việc (onsite/remote)
- **Auth**: Cần quyền manager/admin/hr
- **Query**: `start_date`, `end_date`, `user_ids`

#### GET /attendance/statistics/productivity
- **Mô tả**: Thống kê hiệu suất làm việc
- **Auth**: Cần quyền manager/admin/hr
- **Query**: `period_type`, `division_id`

### 7. Quản lý quy định phạt

#### GET /attendance/penalty-rules
- **Mô tả**: Lấy danh sách quy định phạt
- **Auth**: Cần đăng nhập
- **Response**: Danh sách block_times

#### POST /attendance/penalty-rules
- **Mô tả**: Tạo quy định phạt mới
- **Auth**: Cần quyền admin/hr
- **Body**:
```typescript
{
  block: number;             // Số block
  minutes: number;           // Số phút/block
  money: number;             // Tiền phạt/block
  time_late_early: number;   // Thời gian cho phép
  next_time_late_early: number; // Thời gian tiếp theo
}
```

#### PATCH /attendance/penalty-rules/:id
- **Mô tả**: Cập nhật quy định phạt
- **Auth**: Cần quyền admin/hr

#### DELETE /attendance/penalty-rules/:id
- **Mô tả**: Xóa quy định phạt
- **Auth**: Cần quyền admin/hr

## Mã trạng thái và hằng số

### Loại nghỉ phép
- `1`: Nghỉ có lương
- `2`: Nghỉ không lương  
- `3`: Phép năm
- `4`: Nghỉ ốm
- `5`: Việc riêng

### Trạng thái đơn
- `1`: Chờ duyệt
- `2`: Đã duyệt
- `3`: Từ chối

### Loại ca làm việc
- `1`: Ca thường
- `2`: Ca đặc biệt
- `3`: Ca đêm
- `4`: Ca tăng ca

### Loại báo cáo
- `summary`: Tổng hợp
- `detailed`: Chi tiết
- `penalty`: Phạt vi phạm
- `leave`: Nghỉ phép

### Chu kỳ thống kê
- `daily`: Theo ngày
- `weekly`: Theo tuần
- `monthly`: Theo tháng
- `yearly`: Theo năm

## Tính năng nổi bật

### 🎯 Tính toán thông minh
- **Tự động phân chia thời gian**: Buổi sáng/chiều dựa trên ca làm việc
- **Tính phạt chính xác**: Dựa trên quy định block time
- **Xử lý ca đặc biệt**: Hỗ trợ ca đêm, ca tăng ca
- **Làm tròn thời gian**: Theo block để tính phạt

### 📈 Dashboard thông minh
- **Thống kê real-time**: Cập nhật liên tục
- **Biểu đồ trực quan**: Theo ngày/tuần/tháng/năm
- **Top vi phạm**: Xếp hạng nhân viên vi phạm nhiều nhất
- **Tỷ lệ hiệu suất**: Đúng giờ, đi muộn, về sớm, remote

### 🔍 Báo cáo chi tiết
- **Nhiều định dạng**: JSON, Excel, PDF
- **Lọc linh hoạt**: Theo user, team, phòng ban, thời gian
- **Xuất hàng loạt**: Báo cáo cho nhiều nhân viên
- **Tùy chỉnh nội dung**: Summary, detailed, penalty

### 🛡️ Kiểm soát chất lượng
- **Phát hiện trùng lịch**: Nghỉ phép, remote work
- **Kiểm tra số dư phép**: Tự động validate
- **Quy trình duyệt**: Workflow chờ duyệt → duyệt/từ chối
- **Audit trail**: Lưu lại lịch sử thay đổi

## Utilities hỗ trợ

### Time Utils
- Chuyển đổi định dạng thời gian
- Tính toán khoảng cách thời gian
- Validate định dạng ngày/giờ
- Tính số ngày làm việc trong tháng

### Constants
- Định nghĩa các hằng số hệ thống
- Thông báo lỗi chuẩn
- Cấu hình mặc định

## Lưu ý quan trọng

1. **Phân quyền**: Các API báo cáo và dashboard yêu cầu quyền quản lý
2. **Validation**: Tự động kiểm tra tính hợp lệ của dữ liệu
3. **Performance**: Tối ưu query cho báo cáo lớn
4. **Security**: Bảo mật thông tin nhạy cảm
5. **Scalability**: Thiết kế có thể mở rộng cho nhiều công ty

Module Attendance Management cung cấp giải pháp toàn diện cho việc quản lý chấm công hiện đại! 🚀
