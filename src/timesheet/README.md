# Timesheet Module

Module quản lý chấm công và timesheet cho hệ thống HRM.

## Tổng quan

Timesheet Module cung cấp các chức năng:
- ✅ Quản lý timesheet hàng ngày
- ✅ Check-in/Check-out với GPS và ảnh
- ✅ Quản lý đơn nghỉ phép (Day-off requests)
- ✅ Quản lý làm thêm giờ (Overtime)
- ✅ Quản lý ngày lễ (Holidays)
- ✅ Báo cáo và thống kê
- ✅ Workflow duyệt timesheet
- ✅ Lịch làm việc cá nhân và team

## Cấu trúc thư mục

```
src/timesheet/
├── dto/                          # Data Transfer Objects
│   ├── attendance-log.dto.ts     # DTO cho attendance logs
│   ├── checkin-checkout.dto.ts   # DTO cho check-in/out
│   ├── create-day-off-request.dto.ts
│   ├── create-holiday.dto.ts
│   ├── create-overtime-request.dto.ts
│   ├── create-timesheet.dto.ts
│   ├── get-schedule.dto.ts
│   ├── pagination-queries.dto.ts
│   ├── timesheet-report.dto.ts
│   └── update-timesheet.dto.ts
├── enums/                        # Enumerations
│   ├── day-off.enum.ts          # Enum cho nghỉ phép
│   └── timesheet-state.enum.ts  # Enum cho trạng thái timesheet
├── utils/                        # Utilities
│   ├── enum-converter.util.ts   # Chuyển đổi enum
│   ├── query.util.ts           # Query helpers
│   └── timezone.util.ts        # Timezone utilities
├── timesheet.controller.ts       # API Controller
├── timesheet.service.ts         # Business Logic Service
├── timesheet.module.ts          # NestJS Module
└── TIMESHEET_API.md             # API Documentation
```

## Các chức năng chính

### 1. Quản lý Timesheet

#### Tạo timesheet
```typescript
POST /timesheet
{
  "work_date": "2024-01-15",
  "checkin": "2024-01-15T08:00:00Z",
  "checkout": "2024-01-15T17:30:00Z",
  "note": "Làm việc bình thường"
}
```

#### Workflow trạng thái
- **DRAFT** (Bản nháp) → **PENDING** (Chờ duyệt)
- **PENDING** → **APPROVED** (Đã duyệt) hoặc **REJECTED** (Từ chối)
- **APPROVED** → **LOCKED** (Đã khóa - sau khi tính lương)
- **REJECTED** → **PENDING** (Có thể submit lại)

### 2. Check-in/Check-out

#### Check-in
```typescript
POST /timesheet/checkin
{
  "location_type": "office",
  "gps_latitude": 10.762622,
  "gps_longitude": 106.660172,
  "photo_url": "https://example.com/checkin-photo.jpg",
  "ip_address": "192.168.1.100",
  "device_info": "iPhone 14 Pro"
}
```

#### Tính năng:
- ✅ Idempotency (tránh check-in/out trùng lặp)
- ✅ Tự động tính late time (muộn)
- ✅ Tự động tính early leave (về sớm)
- ✅ Tự động tính total work time
- ✅ Validation với nghỉ phép nửa ngày

### 3. Quản lý nghỉ phép

#### Tạo đơn nghỉ phép
```typescript
POST /timesheet/day-off-requests
{
  "start_date": "2024-01-20",
  "end_date": "2024-01-22",
  "duration": "FULL_DAY",
  "type": "PAID",
  "reason": "Nghỉ phép năm",
  "leave_type": "annual_leave"
}
```

#### Loại nghỉ phép:
- **PAID_LEAVE**: Nghỉ phép có lương
- **UNPAID_LEAVE**: Nghỉ phép không lương  
- **SICK_LEAVE**: Nghỉ ốm
- **MATERNITY_LEAVE**: Nghỉ thai sản
- **PERSONAL_LEAVE**: Nghỉ việc riêng
- **COMPENSATORY_LEAVE**: Nghỉ bù

#### Thời gian nghỉ:
- **FULL_DAY**: Cả ngày
- **MORNING**: Buổi sáng
- **AFTERNOON**: Buổi chiều

### 4. Làm thêm giờ

```typescript
POST /timesheet/overtime-requests
{
  "date": "2024-01-15",
  "start_time": "2024-01-15T18:00:00Z",
  "end_time": "2024-01-15T20:00:00Z",
  "reason": "Hoàn thành dự án urgent",
  "project_id": 123
}
```

### 5. Báo cáo và thống kê

#### Báo cáo timesheet
```typescript
GET /timesheet/reports?start_date=2024-01-01&end_date=2024-01-31&team_id=5
```

#### Báo cáo thời gian làm việc
```typescript
GET /timesheet/working-time-report?month=2024-01&user_id=10
```

#### Thống kê attendance
```typescript
GET /timesheet/attendance-statistics?user_id=10&start_date=2024-01-01&end_date=2024-01-31
```

## Enums và Constants

### TimesheetState
```typescript
enum TimesheetState {
  DRAFT = 0,     // Bản nháp
  PENDING = 1,   // Chờ duyệt
  APPROVED = 2,  // Đã duyệt
  REJECTED = 3,  // Từ chối
  LOCKED = 4     // Đã khóa
}
```

### DayOffType
```typescript
enum DayOffType {
  PAID_LEAVE = 1,        // Nghỉ phép có lương
  UNPAID_LEAVE = 2,      // Nghỉ phép không lương
  SICK_LEAVE = 3,        // Nghỉ ốm
  MATERNITY_LEAVE = 4,   // Nghỉ thai sản
  PERSONAL_LEAVE = 5,    // Nghỉ việc riêng
  COMPENSATORY_LEAVE = 6 // Nghỉ bù
}
```

## Business Rules

### Check-in/Check-out
1. Chỉ được check-in/out một lần mỗi ngày
2. Phải check-in trước khi check-out
3. Giờ làm việc chuẩn: 8:00 - 17:30 (nghỉ trưa 1 tiếng)
4. Tự động tính late time nếu check-in sau 8:00
5. Tự động tính early leave nếu check-out trước 17:30

### Nghỉ phép
1. Không được tạo đơn nghỉ phép trùng lặp thời gian
2. Ngày bắt đầu không được sau ngày kết thúc
3. Nghỉ nửa ngày vẫn cần check-in/out cho nửa ngày còn lại
4. Tự động tạo timesheet khi duyệt nghỉ phép

### Workflow
1. Chỉ có thể sửa timesheet ở trạng thái DRAFT hoặc REJECTED
2. Chỉ manager/HR mới có thể duyệt/từ chối timesheet
3. Timesheet LOCKED không thể sửa/xóa

## Utilities

### TimezoneUtil
- `getCurrentWorkDate()`: Lấy ngày làm việc hiện tại
- `formatWorkDate()`: Format ngày theo định dạng chuẩn
- `isSameWorkDate()`: So sánh 2 ngày làm việc

### EnumConverter
- Chuyển đổi giữa enum numbers và string values cho Prisma
- Hỗ trợ tất cả enum trong module

### QueryUtil  
- `onlyActive()`: Filter chỉ lấy records chưa bị xóa
- `workDateRange()`: Filter theo khoảng thời gian làm việc

## API Endpoints

Xem chi tiết tại [TIMESHEET_API.md](./TIMESHEET_API.md)

## Dependencies

- `@nestjs/common`: NestJS core
- `prisma`: Database ORM
- `class-validator`: Validation
- `class-transformer`: Data transformation

## Testing

```bash
# Unit tests
npm run test src/timesheet

# E2E tests
npm run test:e2e timesheet
```

## Performance Notes

1. Sử dụng database transactions cho check-in/out để tránh race conditions
2. Implement idempotency cho các operations quan trọng
3. Index được tạo trên các fields thường query: `user_id`, `work_date`, `status`
4. Pagination được implement cho tất cả list APIs

## Security

1. Authorization: Chỉ user được phép xem/sửa timesheet của mình
2. Manager/HR có quyền xem/duyệt timesheet của team/company
3. Audit log: Tất cả thay đổi được ghi log
4. Validation: Input được validate nghiêm ngặt
