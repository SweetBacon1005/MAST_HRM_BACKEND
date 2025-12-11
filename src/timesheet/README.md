# Module Timesheet

## Mô tả
Module Timesheet quản lý bảng chấm công, check-in/out, ca làm việc, ngày lễ và lịch làm việc của nhân viên. Module tích hợp với các module khác để tính toán thời gian làm việc, phạt đi muộn/về sớm.

## Nghiệp vụ chính

### 1. Quản lý Timesheet
- Tạo timesheet hàng ngày (tự động/thủ công)
- Xem danh sách timesheets kèm requests trong ngày
- Xem chi tiết timesheet
- Cập nhật timesheet
- Xóa timesheet (soft delete)

### 2. Check-in/Check-out
- Check-in vào làm
- Check-out sau khi làm
- Đăng ký khuôn mặt cho chấm công
- Xem thông tin chấm công hôm nay

### 3. Timesheet Workflow
- Submit timesheet để chờ duyệt
- Duyệt timesheet (Manager/HR)
- Từ chối timesheet với lý do
- Khóa timesheet sau tính lương (Admin/HR)

### 4. Work Shifts
- Tạo ca làm việc
- Xem danh sách ca làm việc
- Cập nhật ca làm việc

### 5. Holidays
- Tạo ngày lễ
- Xem danh sách ngày lễ
- Cập nhật/Xóa ngày lễ

### 6. Schedule Management
- Xem lịch làm việc cá nhân
- Xem lịch làm việc của team

### 7. Reports & Statistics
- Báo cáo timesheet
- Báo cáo giờ làm việc
- Thống kê chấm công

### 8. Attendance Logs
- Tạo log chấm công thủ công
- Xem danh sách logs chấm công
- Cập nhật/Xóa logs chấm công

## API Endpoints

### Timesheet Management

#### POST /timesheet
**Mô tả:** Tạo timesheet mới

**Permission required:** `timesheet.create`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "user_id": 5,
  "work_date": "2024-01-25",
  "work_shift_id": 1,
  "checkin": "08:00:00",
  "checkout": "17:30:00",
  "status": "DRAFT"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 5,
  "work_date": "2024-01-25T00:00:00Z",
  "work_shift_id": 1,
  "checkin": "2024-01-25T08:00:00Z",
  "checkout": "2024-01-25T17:30:00Z",
  "total_work_time": 540,
  "late_time": 0,
  "early_time": 0,
  "status": "DRAFT",
  "is_complete": false,
  "created_at": "2024-01-25T17:30:00Z"
}
```

---

#### GET /timesheet/my-timesheets
**Mô tả:** Lấy danh sách timesheet của tôi kèm requests trong ngày

**Permission required:** `timesheet.read`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số bản ghi trên trang (default: 10)
- `start_date` (optional): Từ ngày
- `end_date` (optional): Đến ngày
- `status` (optional): DRAFT, PENDING, APPROVED, REJECTED, LOCKED

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 5,
      "work_date": "2024-01-25",
      "checkin": "2024-01-25T08:00:00Z",
      "checkout": "2024-01-25T17:30:00Z",
      "total_work_time": 540,
      "late_time": 0,
      "early_time": 0,
      "status": "APPROVED",
      "is_complete": true,
      "requests": [
        {
          "id": 1,
          "request_type": "remote_work",
          "status": "APPROVED",
          "reason": "Làm việc từ xa",
          "created_at": "2024-01-25T07:00:00Z",
          "approved_at": "2024-01-25T08:00:00Z",
          "approved_by": 3
        }
      ]
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "total_pages": 5
  }
}
```

**Lưu ý:** Response bao gồm tất cả requests trong ngày đó:
- remote_work
- day_off
- overtime
- late_early
- forgot_checkin

---

#### GET /timesheet/:id
**Mô tả:** Lấy chi tiết timesheet

**Headers:** `Authorization: Bearer <access_token>`

---

#### PATCH /timesheet/:id
**Mô tả:** Cập nhật timesheet

**Headers:** `Authorization: Bearer <access_token>`

---

#### DELETE /timesheet/:id
**Mô tả:** Xóa timesheet

**Headers:** `Authorization: Bearer <access_token>`

---

### Timesheet Workflow

#### PATCH /timesheet/:id/submit
**Mô tả:** Submit timesheet để chờ duyệt

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "id": 1,
  "status": "PENDING",
  "submitted_at": "2024-01-25T18:00:00Z"
}
```

---

#### PATCH /timesheet/:id/approve
**Mô tả:** Duyệt timesheet (Manager/HR only)

**Roles:** manager, admin, hr

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "id": 1,
  "status": "APPROVED",
  "approved_by": 3,
  "approved_at": "2024-01-25T19:00:00Z"
}
```

---

#### PATCH /timesheet/:id/reject
**Mô tả:** Từ chối timesheet (Manager/HR only)

**Roles:** manager, admin, hr

**Request Body:**
```json
{
  "reason": "Thiếu thông tin check-out"
}
```

**Response:**
```json
{
  "id": 1,
  "status": "REJECTED",
  "rejected_by": 3,
  "rejected_at": "2024-01-25T19:00:00Z",
  "rejected_reason": "Thiếu thông tin check-out"
}
```

---

#### PATCH /timesheet/:id/lock
**Mô tả:** Khóa timesheet sau tính lương (Admin/HR only)

**Roles:** admin, hr

**Response:**
```json
{
  "id": 1,
  "status": "LOCKED",
  "locked_by": 2,
  "locked_at": "2024-02-01T10:00:00Z"
}
```

**Lưu ý:** Timesheet bị khóa không thể sửa/xóa

---

### Check-in/Check-out

#### POST /timesheet/register-face
**Mô tả:** Đăng ký khuôn mặt cho chấm công

**Headers:** `Authorization: Bearer <access_token>`

**Request:** Multipart/form-data với file `image`

**Response:**
```json
{
  "message": "Đăng ký khuôn mặt thành công",
  "face_data": {
    "encoding": "..."
  }
}
```

---

#### POST /timesheet/checkin
**Mô tả:** Check-in vào làm

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "checkin_time": "2024-01-25T08:00:00Z",
  "location": "Văn phòng"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 5,
  "work_date": "2024-01-25",
  "checkin": "2024-01-25T08:00:00Z",
  "late_time": 0,
  "status": "PENDING",
  "message": "Check-in thành công"
}
```

**Business Rules:**
- Chỉ check-in 1 lần/ngày
- Tự động tính late_time nếu checkin sau giờ quy định

---

#### POST /timesheet/checkout
**Mô tả:** Check-out sau khi làm

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "checkout_time": "2024-01-25T17:30:00Z"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 5,
  "work_date": "2024-01-25",
  "checkin": "2024-01-25T08:00:00Z",
  "checkout": "2024-01-25T17:30:00Z",
  "total_work_time": 540,
  "early_time": 0,
  "status": "PENDING",
  "is_complete": true,
  "message": "Check-out thành công"
}
```

**Business Rules:**
- Phải check-in trước khi check-out
- Chỉ check-out 1 lần/ngày
- Tự động tính early_time nếu checkout trước giờ quy định
- Tự động tính total_work_time

---

#### GET /timesheet/attendance/today
**Mô tả:** Lấy thông tin chấm công hôm nay

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "id": 1,
  "user_id": 5,
  "work_date": "2024-01-25",
  "checkin": "2024-01-25T08:00:00Z",
  "checkout": "2024-01-25T17:30:00Z",
  "total_work_time": 540,
  "late_time": 0,
  "early_time": 0,
  "status": "PENDING",
  "is_complete": true
}
```

---

### Work Shifts

#### POST /timesheet/work-shifts
**Mô tả:** Tạo ca làm việc mới

**Roles:** admin, hr, manager

**Request Body:**
```json
{
  "name": "Ca hành chính",
  "start_time": "08:00:00",
  "end_time": "17:00:00",
  "break_start": "12:00:00",
  "break_end": "13:00:00",
  "is_default": true
}
```

---

#### GET /timesheet/work-shifts
**Mô tả:** Lấy danh sách ca làm việc

**Query Parameters:**
- `page`, `limit`, `sortBy`, `sortOrder`

---

#### PATCH /timesheet/work-shifts/:id
**Mô tả:** Cập nhật ca làm việc

**Roles:** admin, hr, manager

---

### Holidays

#### POST /timesheet/holidays
**Mô tả:** Tạo ngày lễ mới

**Roles:** admin, hr

**Request Body:**
```json
{
  "name": "Tết Nguyên Đán",
  "start_date": "2024-02-10",
  "end_date": "2024-02-16",
  "is_paid": true,
  "description": "Nghỉ Tết"
}
```

---

#### GET /timesheet/holidays
**Mô tả:** Lấy danh sách ngày lễ

**Query Parameters:**
- `page`, `limit`, `year`

---

#### PATCH /timesheet/holidays/:id
**Mô tả:** Cập nhật ngày lễ

**Roles:** admin, hr

---

#### DELETE /timesheet/holidays/:id
**Mô tả:** Xóa ngày lễ

**Roles:** admin, hr

---

### Schedule Management

#### GET /timesheet/schedule/personal
**Mô tả:** Xem lịch làm việc cá nhân

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `start_date`, `end_date`

**Response:**
```json
{
  "user_id": 5,
  "start_date": "2024-01-22",
  "end_date": "2024-01-28",
  "schedule": [
    {
      "date": "2024-01-22",
      "day_of_week": "Monday",
      "work_shift": {
        "name": "Ca hành chính",
        "start_time": "08:00:00",
        "end_time": "17:00:00"
      },
      "timesheets": [
        {
          "id": 1,
          "checkin": "2024-01-22T08:00:00Z",
          "checkout": "2024-01-22T17:30:00Z",
          "status": "APPROVED"
        }
      ],
      "requests": [
        {
          "type": "remote_work",
          "status": "APPROVED"
        }
      ],
      "is_holiday": false,
      "is_weekend": false
    }
  ]
}
```

---

#### GET /timesheet/schedule/team/:team_id
**Mô tả:** Xem lịch làm việc của team

**Roles:** manager, team_leader, admin

**Query Parameters:**
- `start_date`, `end_date`

---

### Reports & Statistics

#### GET /timesheet/reports/timesheet
**Mô tả:** Báo cáo timesheet

**Roles:** manager, admin, hr

**Query Parameters:**
- `user_ids`, `division_id`, `team_id`
- `start_date`, `end_date`

---

#### GET /timesheet/reports/working-time
**Mô tả:** Báo cáo giờ làm việc

**Roles:** manager, admin, hr

---

#### GET /timesheet/statistics/attendance
**Mô tả:** Thống kê chấm công

**Query Parameters:**
- `user_id` (optional)
- `start_date`, `end_date`

**Response:**
```json
{
  "user_id": 5,
  "period": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  },
  "total_work_days": 22,
  "total_work_hours": 176,
  "total_late_minutes": 30,
  "total_early_minutes": 0,
  "total_overtime_hours": 10,
  "total_absent_days": 0,
  "attendance_rate": 100
}
```

---

#### GET /timesheet/statistics/my-attendance
**Mô tả:** Thống kê chấm công cá nhân

**Headers:** `Authorization: Bearer <access_token>`

---

### Attendance Logs

#### POST /timesheet/attendance-logs
**Mô tả:** Tạo log chấm công thủ công (Admin only)

**Roles:** admin, hr

**Request Body:**
```json
{
  "user_id": 5,
  "log_type": "CHECKIN",
  "log_time": "2024-01-25T08:00:00Z",
  "location": "Văn phòng",
  "notes": "Bổ sung chấm công"
}
```

---

#### GET /timesheet/attendance-logs/my
**Mô tả:** Lấy danh sách logs chấm công của tôi

---

#### GET /timesheet/attendance-logs
**Mô tả:** Lấy danh sách logs chấm công có phân trang

**Query Parameters:**
- `page`, `limit`
- `user_id`, `start_date`, `end_date`
- `log_type`

---

#### GET /timesheet/attendance-logs/:id
**Mô tả:** Lấy chi tiết log chấm công

---

#### PATCH /timesheet/attendance-logs/:id
**Mô tả:** Cập nhật log chấm công

**Roles:** admin, hr, manager

---

#### DELETE /timesheet/attendance-logs/:id
**Mô tả:** Xóa log chấm công (Admin only)

**Roles:** admin

---

### Daily Timesheet Creation

#### POST /timesheet/daily/create
**Mô tả:** Tạo timesheet hàng ngày (tự động hoặc thủ công)

**Request Body:**
```json
{
  "date": "2024-01-25"
}
```

---

## Enums

### TimesheetStatus
- `DRAFT`: Nháp
- `PENDING`: Chờ duyệt
- `APPROVED`: Đã duyệt
- `REJECTED`: Bị từ chối
- `LOCKED`: Đã khóa (sau tính lương)

### AttendanceLogType
- `CHECKIN`: Check-in
- `CHECKOUT`: Check-out
- `BREAK_START`: Bắt đầu nghỉ
- `BREAK_END`: Kết thúc nghỉ

## Business Rules

### 1. Check-in/Check-out
- Chỉ check-in/check-out 1 lần/ngày
- Phải check-in trước khi check-out
- Tự động tính late_time và early_time
- Tự động tính total_work_time

### 2. Timesheet Workflow
```
DRAFT → PENDING → APPROVED/REJECTED → LOCKED
```

### 3. Late/Early Calculation
- Late time: Nếu checkin sau work_shift.start_time
- Early time: Nếu checkout trước work_shift.end_time
- Không tính break time vào late/early

### 4. Total Work Time
```
total_work_time = checkout - checkin - break_time
```

### 5. Lock Rules
- Chỉ Admin/HR có thể lock
- Timesheet locked không thể sửa/xóa
- Thường lock sau khi tính lương tháng

## Integration với Requests Module

Timesheet được hiển thị kèm các requests trong cùng ngày:
- Remote work requests
- Day off requests
- Overtime requests
- Late/early requests
- Forgot checkin requests

## Liên kết với các module khác
- **Requests Module**: Quản lý các đơn từ liên quan đến chấm công
- **Attendance Module**: Tính toán chi tiết chấm công
- **Users Module**: Thông tin nhân viên
- **Division Module**: Lịch làm việc theo team
- **Notifications Module**: Thông báo về timesheet
