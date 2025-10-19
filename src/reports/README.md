# Reports Module

Module tổng hợp các API thống kê và báo cáo từ `timesheet.service.ts` và `attendance.service.ts`.

## Mục đích

Module này tập trung tất cả các API liên quan đến báo cáo và thống kê chấm công vào một nơi duy nhất, giúp:
- Dễ dàng quản lý và bảo trì
- Tách biệt logic báo cáo khỏi logic nghiệp vụ chính
- Cải thiện khả năng mở rộng
- Giảm trùng lặp code

## Tổng quan

Module này cung cấp **10 API endpoints** sau khi refactor (giảm từ 11):
- **Đã merge:** `generateAttendanceReport` → `getTimesheetReport` (thêm tham số `report_type`)
- **Giữ nguyên:** Các API còn lại vì có chức năng riêng biệt

Tất cả API đều có prefix `/reports/` và yêu cầu JWT authentication.

## API Endpoints (Sau Refactor)

### 1. Báo cáo Timesheet

#### `GET /reports/timesheet`
Báo cáo timesheet theo khoảng thời gian, phòng ban hoặc team.
**MỚI:** Hỗ trợ tham số `report_type` để tạo báo cáo chi tiết.

**Query Parameters:**
- `start_date` (optional): Ngày bắt đầu (YYYY-MM-DD)
- `end_date` (optional): Ngày kết thúc (YYYY-MM-DD)
- `division_id` (optional): ID phòng ban
- `team_id` (optional): ID team
- `report_type` (optional): Loại báo cáo - `'summary'` | `'detailed'` | `'penalty'`

**Response (default - không có report_type):**
```json
{
  "timesheets": [...],
  "stats": {
    "total_records": 150,
    "total_late": 20,
    "total_early_leave": 15,
    "total_incomplete": 5,
    "total_remote": 30,
    "average_work_hours": 8.2
  },
  "period": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  }
}
```

**Response (report_type=summary):**
```json
{
  "report_type": "summary",
  "period": "2024-01-01 - 2024-01-31",
  "user_stats": [
    {
      "user_id": 1,
      "total_days": 22,
      "on_time_days": 18,
      "late_days": 4,
      "early_leave_days": 2,
      "remote_days": 5,
      "total_work_hours": 176,
      "total_late_minutes": 120,
      "total_early_minutes": 60,
      "total_penalties": 500000
    }
  ],
  "generated_at": "2024-02-01T00:00:00.000Z"
}
```

#### `GET /reports/working-time`
Báo cáo thời gian làm việc theo tháng/năm.

**Query Parameters:**
- `month` (optional): Tháng báo cáo (MM hoặc YYYY-MM)
- `year` (optional): Năm báo cáo
- `user_id` (optional): ID người dùng

**Response:**
```json
{
  "period": "2024-01",
  "user_stats": [
    {
      "user_id": 1,
      "total_days": 22,
      "total_work_hours": 176,
      "total_late_minutes": 45,
      "total_early_minutes": 30,
      "days_remote": 5
    }
  ],
  "summary": {
    "total_users": 50,
    "total_working_days": 1100,
    "average_work_hours_per_day": 8.0
  }
}
```

#### `GET /reports/attendance-statistics`
Thống kê chấm công chi tiết với phân tích leave balance, overtime.

**Query Parameters:**
- `user_id` (optional): ID người dùng
- `start_date` (optional): Ngày bắt đầu (YYYY-MM-DD)
- `end_date` (optional): Ngày kết thúc (YYYY-MM-DD)

**Response:**
```json
{
  "period": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  },
  "total_work_days": "20/22",
  "overtime_hours": 15.5,
  "late_minutes": 120,
  "violation_time": "5/22",
  "paid_leave_hours": 8,
  "unpaid_leave_hours": 0,
  "attendance": {
    "total_days": "20/22",
    "complete_days": 20,
    "working_days_in_month": 22,
    "late": 120,
    "late_days": 5,
    "early_leave": "3/22",
    "early_leave_days": 3,
    "early_leave_minutes": 60
  },
  "overtime": {
    "total_hours": 15.5,
    "total_requests": 3
  },
  "leave": {
    "paid_leave": 1,
    "unpaid_leave": 0,
    "total_leave_requests": 1
  },
  "summary": {
    "attendance_rate": 91,
    "punctuality_rate": 77
  }
}
```

### 2. Dashboard Reports

#### `GET /reports/attendance-dashboard`
Dashboard chấm công với phân tích chi tiết (daily_stats, violation_stats, leave_stats).

**Query Parameters:**
- `start_date` (optional): Ngày bắt đầu (YYYY-MM-DD)
- `end_date` (optional): Ngày kết thúc (YYYY-MM-DD)
- `division_id` (optional): ID phòng ban
- `team_id` (optional): ID team
- `period_type` (optional): Loại chu kỳ (daily, weekly, monthly, yearly)

**Response:**
```json
{
  "overview": {
    "total_records": 1000,
    "on_time_rate": "85.50",
    "late_rate": "10.20",
    "early_leave_rate": "4.30",
    "remote_rate": "15.00",
    "total_penalties": 5000000
  },
  "daily_stats": [
    {
      "period": "2024-01-15",
      "total": 50,
      "on_time": 42,
      "late": 5,
      "early_leave": 3,
      "remote": 8,
      "total_penalties": 250000
    }
  ],
  "violation_stats": [
    {
      "user_id": 1,
      "total_violations": 5,
      "late_count": 3,
      "early_leave_count": 2,
      "total_penalties": 500000,
      "total_late_minutes": 90,
      "total_early_minutes": 60
    }
  ],
  "leave_stats": {
    "total_leave_days": 25,
    "paid_leave": 15,
    "unpaid_leave": 5,
    "annual_leave": 10,
    "sick_leave": 8,
    "personal_leave": 2
  },
  "period": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  }
}
```

#### `GET /reports/dashboard/comprehensive`
Dashboard tổng hợp với số liệu nhanh (chỉ đếm số lượng).

**Query Parameters:**
- `month` (optional): Tháng (1-12)
- `year` (optional): Năm

**Response:**
```json
{
  "period": {
    "month": 1,
    "year": 2024
  },
  "summary": {
    "attendance_records": 1000,
    "leave_requests": 50,
    "overtime_sessions": 100,
    "personnel_transfers": 10,
    "active_users": 150,
    "pending_requests": 20
  },
  "generated_at": "2024-02-01T00:00:00.000Z"
}
```

### 3. Báo cáo chuyên biệt

#### `GET /reports/attendance/summary`
Báo cáo tổng hợp chấm công từ `attendance_logs` (group by user).

**Query Parameters:**
- `start_date` (optional): Ngày bắt đầu (YYYY-MM-DD)
- `end_date` (optional): Ngày kết thúc (YYYY-MM-DD)
- `division_id` (optional): ID phòng ban

#### `GET /reports/attendance/late-statistics`
Thống kê đi muộn về sớm theo tháng.

**Query Parameters:**
- `month` (optional): Tháng (1-12)
- `year` (optional): Năm

#### `GET /reports/leave/summary`
Báo cáo tổng hợp nghỉ phép theo năm.

**Query Parameters:**
- `year` (optional): Năm
- `division_id` (optional): ID phòng ban

#### `GET /reports/overtime/summary`
Báo cáo tổng hợp tăng ca.

**Query Parameters:**
- `start_date` (optional): Ngày bắt đầu (YYYY-MM-DD)
- `end_date` (optional): Ngày kết thúc (YYYY-MM-DD)
- `division_id` (optional): ID phòng ban

#### `GET /reports/personnel-transfer/summary`
Báo cáo tổng hợp điều chuyển nhân sự.

**Query Parameters:**
- `year` (optional): Năm
- `division_id` (optional): ID phòng ban

### 4. API Deprecated (Đã merge)

~~`GET /reports/attendance`~~ → **Merged vào** `GET /reports/timesheet?report_type=summary|detailed|penalty`

## Danh sách đầy đủ API Endpoints (Sau Refactor)

| # | Endpoint | Method | Mô tả | Thay đổi |
|---|----------|--------|-------|----------|
| 1 | `/reports/timesheet` | GET | Báo cáo timesheet (hỗ trợ report_type) | ✅ Merged |
| 2 | `/reports/working-time` | GET | Báo cáo thời gian làm việc | - |
| 3 | `/reports/attendance-statistics` | GET | Thống kê chấm công chi tiết | - |
| 4 | `/reports/attendance-dashboard` | GET | Dashboard chi tiết với phân tích | - |
| 5 | `/reports/dashboard/comprehensive` | GET | Dashboard tổng quan nhanh | - |
| 6 | `/reports/attendance/summary` | GET | Tổng hợp từ attendance_logs | - |
| 7 | `/reports/attendance/late-statistics` | GET | Thống kê đi muộn/về sớm | - |
| 8 | `/reports/leave/summary` | GET | Tổng hợp nghỉ phép | - |
| 9 | `/reports/overtime/summary` | GET | Tổng hợp tăng ca | - |
| 10 | `/reports/personnel-transfer/summary` | GET | Tổng hợp điều chuyển nhân sự | - |

**Tổng:** 10 endpoints (giảm từ 11)

## Cấu trúc Module

```
src/reports/
├── dto/
│   └── attendance-statistics.dto.ts  # DTOs cho các query parameters
├── reports.controller.ts             # Controller với 10 endpoints
├── reports.service.ts                # Service chứa logic báo cáo (đã refactor)
├── reports.module.ts                 # Module definition
└── README.md                         # Documentation
```

## Refactoring Notes

### Đã thực hiện:
1. ✅ **Merged `generateAttendanceReport` vào `getTimesheetReport`**
   - Thêm tham số `report_type?: 'summary' | 'detailed' | 'penalty'`
   - Giảm 1 method trong service
   - API `/reports/attendance` giờ sử dụng chung logic với `/reports/timesheet`

2. ✅ **Giữ nguyên 2 dashboard riêng biệt**
   - `getAttendanceDashboard`: Dashboard chi tiết với phân tích theo division/team
   - `getComprehensiveDashboard`: Dashboard tổng quan nhanh chỉ đếm số
   - Lý do: Mục đích sử dụng khác nhau, không nên merge

3. ✅ **Giữ nguyên các API chuyên biệt**
   - `getAttendanceSummary`: Query từ `attendance_logs` (khác với timesheet)
   - `getLateStatistics`: Chuyên về late/early requests
   - `getLeaveSummary`, `getOvertimeSummary`, `getPersonnelTransferSummary`: Các báo cáo chuyên môn

## Lưu ý

1. **Authentication**: Tất cả API đều yêu cầu JWT token
2. **Permissions**: Một số API có thể yêu cầu quyền admin/manager (tùy cấu hình)
3. **Performance**: Các báo cáo lớn nên sử dụng pagination hoặc giới hạn khoảng thời gian
4. **Timezone**: Tất cả thời gian đều tính theo UTC, frontend cần convert sang timezone địa phương
5. **Backward Compatibility**: API `/reports/attendance` vẫn hoạt động nhưng nên dùng `/reports/timesheet?report_type=...`

## Tích hợp

Module này đã được tích hợp vào `AppModule` và có thể sử dụng ngay sau khi build project:

```bash
npm run build
npm run start
```

Các API sẽ có prefix `/reports/` và được document trong Swagger UI tại `/api`.

## Migration Guide

Nếu bạn đang sử dụng API cũ, vui lòng cập nhật:

### Trước đây:
```typescript
// Old API
GET /reports/attendance?month=2024-01&report_type=summary
```

### Bây giờ:
```typescript
// New API (recommended)
GET /reports/timesheet?start_date=2024-01-01&end_date=2024-01-31&report_type=summary

// hoặc vẫn dùng old endpoint (backward compatible)
GET /reports/attendance?month=2024-01&report_type=summary
```

Cả 2 cách đều hoạt động, nhưng khuyến nghị dùng `/reports/timesheet` để tận dụng tính linh hoạt của tham số `start_date`/`end_date`.
