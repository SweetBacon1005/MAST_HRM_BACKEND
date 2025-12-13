# Scheduler Module

Module này chứa tất cả các scheduled tasks (cron jobs) của hệ thống HRM.

## Cấu trúc

```
src/scheduler/
├── services/
│   └── schedule-automation.service.ts  # Service chứa tất cả cron jobs
├── scheduler.module.ts                 # Module definition
└── README.md                          # Documentation
```

## Các Cron Jobs

### 1. Daily Timesheet Creation

- **Thời gian**: Mỗi ngày 00:00 (giờ VN)
- **Mục đích**: Tự động tạo timesheet cho tất cả nhân viên active
- **Chỉ chạy**: Ngày làm việc (thứ 2-6)

### 2. Monthly Paid Leave Addition

- **Thời gian**: Ngày cuối tháng 23:30 (giờ VN)
- **Mục đích**: Cộng 3 ngày phép có lương cho tất cả nhân viên
- **Logic**: Sử dụng `LeaveBalanceService` để cập nhật trực tiếp vào `user_leave_balances`

### 3. Annual Leave Balance Reset

- **Thời gian**: 1/1 hàng năm 01:00 (giờ VN)
- **Mục đích**: Reset số dư phép đầu năm với carry-over (tối đa 12 ngày)
- **Logic**: Chuyển phép năm cũ, hết hạn phần vượt quá

### 4. Initialize Leave Balance for New Users

- **Thời gian**: Ngày 1 hàng tháng 05:00 (giờ VN)
- **Mục đích**: Tạo leave balance cho user mới chưa có
- **Logic**: Kiểm tra và tạo bản ghi `user_leave_balances` cho user active

### 5. Work Shift Management

- **Extend Expiring Shifts**: Mỗi ngày 02:00 - Gia hạn ca sắp hết hạn
- **Weekly Overtime Shifts**: Chủ nhật 01:00 - Tạo ca tăng ca tuần tới
- **Cleanup Expired Shifts**: Ngày 1 hàng tháng 03:00 - Dọn dẹp ca cũ
- **Prepare Next Month**: Ngày 25 hàng tháng 04:00 - Chuẩn bị ca tháng tới

## Tối ưu hóa

- Sử dụng `createMany` cho bulk operations
- Batch processing để giảm database queries
- Proper error handling và logging
- Timezone-aware scheduling

## Monitoring

Tất cả cron jobs đều có:

- Detailed logging với emoji
- Error handling
- Performance metrics
- Skip logic để tránh duplicate
