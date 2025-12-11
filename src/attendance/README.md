# Attendance Module

Module tính toán chấm công chi tiết và quản lý ca làm việc cho hệ thống HRM.

## Tổng quan

Attendance Module cung cấp các chức năng:

- ✅ Tính toán thời gian làm việc chi tiết
- ✅ Quản lý ca làm việc (Work Shifts)
- ✅ Tính toán penalty (phạt muộn/về sớm)
- ✅ Quản lý đơn remote work
- ✅ Quản lý leave balance (số ngày phép còn lại)
- ✅ Dashboard và báo cáo attendance
- ✅ Tích hợp với timesheet module
- ✅ Flexible work time calculation

## Cấu trúc thư mục

```
src/attendance/
├── dto/                              # Data Transfer Objects
│   ├── attendance-calculation.dto.ts # DTO tính toán attendance
│   ├── dashboard.dto.ts             # DTO dashboard và reports
│   ├── leave-management.dto.ts      # DTO quản lý nghỉ phép
│   └── pagination-queries.dto.ts    # DTO phân trang
├── constants/                        # Constants và configs
│   └── attendance.constants.ts      # Attendance constants
├── utils/                           # Utility functions
│   └── time.utils.ts               # Time calculation utilities
├── attendance.controller.ts          # API Controller
├── attendance.service.ts            # Business Logic Service
├── attendance.module.ts             # NestJS Module
└── ATTENDANCE_API.md                # API Documentation
```

## Các chức năng chính

### 1. Tính toán attendance chi tiết

```typescript
POST /attendance/calculate
{
  "user_id": 1,
  "checkin_time": "2024-01-15T08:15:00Z",
  "checkout_time": "2024-01-15T17:45:00Z",
  "shift_id": 1,
  "is_remote": false,
  "note": "Làm việc bình thường"
}

Response:
{
  "work_hours": {
    "total_minutes": 510,        // Tổng thời gian (phút)
    "total_hours": 8.5,          // Tổng thời gian (giờ)
    "morning_minutes": 240,      // Thời gian buổi sáng
    "afternoon_minutes": 270,    // Thời gian buổi chiều
    "break_minutes": 60,         // Thời gian nghỉ trưa
    "overtime_minutes": 15       // Thời gian làm thêm
  },
  "penalties": {
    "late_minutes": 15,          // Số phút muộn
    "early_leave_minutes": 0,    // Số phút về sớm
    "late_penalty": 5000,        // Tiền phạt muộn (VND)
    "early_penalty": 0           // Tiền phạt về sớm (VND)
  },
  "shift_info": {
    "name": "Ca hành chính",
    "start_time": "08:00:00",
    "end_time": "17:30:00",
    "break_start": "12:00:00",
    "break_end": "13:00:00"
  },
  "is_complete": true,
  "remote_type": "OFFICE"
}
```

### 2. Quản lý ca làm việc

#### Tạo ca làm việc mới

```typescript
POST /attendance/work-shifts
{
  "name": "Ca sáng",
  "start_time": "06:00:00",
  "end_time": "14:00:00",
  "break_start_time": "10:00:00",
  "break_end_time": "10:30:00",
  "total_hours": 7.5,
  "is_active": true,
  "description": "Ca làm việc buổi sáng"
}
```

#### Lấy danh sách ca làm việc

```typescript
GET /attendance/work-shifts?page=1&limit=10&is_active=true

Response:
{
  "data": [
    {
      "id": 1,
      "name": "Ca hành chính",
      "start_time": "08:00:00",
      "end_time": "17:30:00",
      "break_start_time": "12:00:00",
      "break_end_time": "13:00:00",
      "total_hours": 8,
      "is_active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "total_pages": 1
  }
}
```

### 3. Tính toán penalty

```typescript
POST /attendance/calculate-penalty
{
  "user_id": 1,
  "late_minutes": 15,
  "early_leave_minutes": 0,
  "shift_id": 1
}

Response:
{
  "late_penalty": 5000,        // 15 phút x 333 VND/phút (tùy config)
  "early_penalty": 0,
  "total_penalty": 5000,
  "penalty_details": {
    "late_rate": 333.33,       // VND per minute
    "early_rate": 333.33,
    "calculation": "15 minutes × 333.33 VND/min = 5,000 VND"
  }
}
```

### 4. Dashboard attendance

```typescript
GET /attendance/dashboard?user_id=1&month=2024-01

Response:
{
  "summary": {
    "total_work_days": 22,
    "present_days": 20,
    "absent_days": 2,
    "late_days": 3,
    "early_leave_days": 1,
    "remote_days": 5,
    "total_work_hours": 176,
    "total_overtime_hours": 8,
    "attendance_rate": 90.91
  },
  "monthly_breakdown": [
    {
      "date": "2024-01-01",
      "status": "present",
      "checkin_time": "08:15:00",
      "checkout_time": "17:45:00",
      "work_hours": 8.5,
      "is_late": true,
      "late_minutes": 15,
      "is_remote": false
    }
  ],
  "penalties": {
    "total_late_penalty": 25000,
    "total_early_penalty": 5000,
    "penalty_breakdown": [
      {
        "date": "2024-01-01",
        "type": "late",
        "minutes": 15,
        "amount": 5000
      }
    ]
  }
}
```

### 5. Báo cáo attendance

```typescript
GET /attendance/reports?start_date=2024-01-01&end_date=2024-01-31&team_id=5

Response:
{
  "team_summary": {
    "total_employees": 10,
    "average_attendance_rate": 92.5,
    "total_work_hours": 1760,
    "total_overtime_hours": 80,
    "total_penalties": 150000
  },
  "employee_details": [
    {
      "user_id": 1,
      "name": "Nguyễn Văn A",
      "present_days": 20,
      "absent_days": 2,
      "late_days": 3,
      "work_hours": 176,
      "overtime_hours": 8,
      "total_penalty": 25000,
      "attendance_rate": 90.91
    }
  ],
  "daily_breakdown": [
    {
      "date": "2024-01-01",
      "present_count": 8,
      "absent_count": 2,
      "late_count": 3,
      "remote_count": 2
    }
  ]
}
```

### 6. Quản lý remote work

#### Tạo đơn remote work

```typescript
POST /attendance/remote-work-requests
{
  "user_id": 1,
  "start_date": "2024-01-20",
  "end_date": "2024-01-22",
  "reason": "Làm việc từ xa do dịch bệnh",
  "remote_type": "FULL_REMOTE"
}
```

#### Duyệt đơn remote work

```typescript
PUT /attendance/remote-work-requests/1/approve
{
  "approved_by": 5,
  "note": "Đã duyệt đơn remote work"
}
```

### 7. Quản lý leave balance

```typescript
GET /attendance/leave-balance/1

Response:
{
  "user_id": 1,
  "annual_leave": {
    "total_days": 12,
    "used_days": 8,
    "remaining_days": 4
  },
  "sick_leave": {
    "total_days": 30,
    "used_days": 2,
    "remaining_days": 28
  },
  "personal_leave": {
    "total_days": 3,
    "used_days": 1,
    "remaining_days": 2
  },
  "maternity_leave": {
    "total_days": 180,
    "used_days": 0,
    "remaining_days": 180
  }
}
```

## Work Shift Configuration

### Standard Shifts

```typescript
const STANDARD_SHIFTS = {
  ADMIN: {
    name: 'Ca hành chính',
    start_time: '08:00:00',
    end_time: '17:30:00',
    break_start: '12:00:00',
    break_end: '13:00:00',
    total_hours: 8,
  },
  MORNING: {
    name: 'Ca sáng',
    start_time: '06:00:00',
    end_time: '14:00:00',
    break_start: '10:00:00',
    break_end: '10:30:00',
    total_hours: 7.5,
  },
  EVENING: {
    name: 'Ca chiều',
    start_time: '14:00:00',
    end_time: '22:00:00',
    break_start: '18:00:00',
    break_end: '18:30:00',
    total_hours: 7.5,
  },
  NIGHT: {
    name: 'Ca đêm',
    start_time: '22:00:00',
    end_time: '06:00:00',
    break_start: '02:00:00',
    break_end: '02:30:00',
    total_hours: 7.5,
  },
};
```

## Penalty Calculation Rules

### Late Penalty

- **Threshold**: 5 phút đầu không phạt
- **Rate**: 333 VND/phút (tương đương 20,000 VND/giờ)
- **Max daily penalty**: 50,000 VND
- **Formula**: `(late_minutes - 5) × 333` nếu late_minutes > 5

### Early Leave Penalty

- **Threshold**: 5 phút đầu không phạt
- **Rate**: 333 VND/phút
- **Max daily penalty**: 50,000 VND
- **Formula**: `(early_minutes - 5) × 333` nếu early_minutes > 5

### Overtime Calculation

- **Regular hours**: 8 giờ/ngày
- **Overtime rate**: 150% lương cơ bản cho 2 giờ đầu
- **Extended overtime**: 200% lương cơ bản từ giờ thứ 3
- **Weekend overtime**: 200% lương cơ bản
- **Holiday overtime**: 300% lương cơ bản

## Time Calculation Logic

### Working Hours

```typescript
function calculateWorkHours(checkin: Date, checkout: Date, shift: WorkShift) {
  const totalMinutes = (checkout.getTime() - checkin.getTime()) / (1000 * 60);

  // Trừ thời gian nghỉ trưa
  const breakMinutes = calculateBreakTime(checkin, checkout, shift);
  const workMinutes = totalMinutes - breakMinutes;

  // Chia buổi sáng/chiều
  const morningMinutes = calculateMorningHours(checkin, shift);
  const afternoonMinutes = workMinutes - morningMinutes;

  return {
    total_minutes: workMinutes,
    morning_minutes: morningMinutes,
    afternoon_minutes: afternoonMinutes,
    break_minutes: breakMinutes,
  };
}
```

### Late/Early Calculation

```typescript
function calculateLateness(checkin: Date, shift: WorkShift) {
  const shiftStart = new Date(shift.start_time);
  const late_minutes = Math.max(
    0,
    (checkin.getTime() - shiftStart.getTime()) / (1000 * 60),
  );

  return {
    late_minutes: late_minutes,
    late_penalty: calculateLatePenalty(late_minutes),
  };
}
```

## Business Rules

### Attendance Validation

1. Check-in không được trước 2 giờ so với ca làm việc
2. Check-out không được sau 4 giờ so với ca làm việc
3. Thời gian làm việc tối thiểu 4 giờ để tính công
4. Remote work cần approval trước khi áp dụng

### Leave Management

1. Annual leave được tính theo năm làm việc
2. Sick leave cần có giấy tờ y tế nếu > 3 ngày
3. Maternity leave theo quy định pháp luật
4. Leave balance được reset đầu năm

### Penalty Rules

1. Late/Early penalty áp dụng từ lần thứ 2 trong tháng
2. Không penalty cho force majeure (thiên tai, dịch bệnh)
3. Penalty có thể được waive bởi manager
4. Max penalty không quá 10% lương cơ bản/tháng

## API Endpoints Summary

### Attendance Calculation

- `POST /attendance/calculate` - Tính toán attendance chi tiết
- `POST /attendance/calculate-penalty` - Tính toán penalty
- `POST /attendance/bulk-calculate` - Tính toán hàng loạt

### Work Shifts Management

- `GET /attendance/work-shifts` - Lấy danh sách ca làm việc
- `POST /attendance/work-shifts` - Tạo ca làm việc mới
- `PUT /attendance/work-shifts/:id` - Cập nhật ca làm việc
- `DELETE /attendance/work-shifts/:id` - Xóa ca làm việc

### Dashboard & Reports

- `GET /attendance/dashboard` - Dashboard attendance
- `GET /attendance/reports` - Báo cáo attendance
- `GET /attendance/team-summary` - Tóm tắt team

### Leave Management

- `GET /attendance/leave-balance/:user_id` - Xem leave balance
- `POST /attendance/remote-work-requests` - Tạo đơn remote work
- `PUT /attendance/remote-work-requests/:id/approve` - Duyệt remote work

## Constants Configuration

```typescript
export const ATTENDANCE_CONSTANTS = {
  // Penalty rates (VND per minute)
  LATE_PENALTY_RATE: 333.33,
  EARLY_PENALTY_RATE: 333.33,

  // Thresholds (minutes)
  LATE_THRESHOLD: 5,
  EARLY_THRESHOLD: 5,

  // Max penalties (VND)
  MAX_DAILY_PENALTY: 50000,
  MAX_MONTHLY_PENALTY_RATE: 0.1, // 10% of base salary

  // Work hours
  STANDARD_WORK_HOURS: 8,
  MINIMUM_WORK_HOURS: 4,

  // Overtime rates
  OVERTIME_RATE_150: 1.5,
  OVERTIME_RATE_200: 2.0,
  OVERTIME_RATE_300: 3.0,

  // Leave days per year
  ANNUAL_LEAVE_DAYS: 12,
  SICK_LEAVE_DAYS: 30,
  PERSONAL_LEAVE_DAYS: 3,
  MATERNITY_LEAVE_DAYS: 180,
};
```

## Integration Points

### Timesheet Module

- Sync attendance calculation với timesheet records
- Update timesheet status based on attendance

### User Profile Module

- Lấy thông tin ca làm việc từ user profile
- Update work shift assignments

### Payroll Module

- Cung cấp work hours và penalty data cho tính lương
- Export attendance data cho payroll processing

## Performance Optimization

1. **Batch Processing**: Tính toán attendance hàng loạt cho end-of-month
2. **Caching**: Cache work shift data và penalty rates
3. **Indexing**: Index trên user_id, date, shift_id
4. **Async Processing**: Background jobs cho heavy calculations

## Dependencies

- `@nestjs/common`: NestJS core
- `prisma`: Database ORM
- `date-fns`: Date manipulation
- `class-validator`: Input validation
- `class-transformer`: Data transformation

## Testing

```bash
# Unit tests
npm run test src/attendance

# E2E tests
npm run test:e2e attendance

# Performance tests
npm run test:performance attendance
```
