# TIMESHEET API Documentation

## Tổng quan

Module Timesheet cung cấp các API để quản lý chấm công, lịch làm việc, đơn xin nghỉ phép, và thống kê chấm công.

## Endpoints

### 1. Quản lý Timesheet

#### POST /timesheet

- **Mô tả**: Tạo timesheet mới
- **Auth**: Cần đăng nhập
- **Body**: CreateTimesheetDto
- **Response**: Thông tin timesheet đã tạo

#### GET /timesheet/my-timesheets

- **Mô tả**: Lấy danh sách timesheet của người dùng hiện tại
- **Auth**: Cần đăng nhập
- **Query params**:
  - `start_date` (optional): Ngày bắt đầu (YYYY-MM-DD)
  - `end_date` (optional): Ngày kết thúc (YYYY-MM-DD)
- **Response**: Danh sách timesheet

#### GET /timesheet/:id

- **Mô tả**: Lấy chi tiết timesheet theo ID
- **Auth**: Cần đăng nhập
- **Params**: `id` - ID timesheet
- **Response**: Chi tiết timesheet

#### PATCH /timesheet/:id

- **Mô tả**: Cập nhật timesheet
- **Auth**: Cần đăng nhập
- **Params**: `id` - ID timesheet
- **Body**: UpdateTimesheetDto
- **Response**: Timesheet đã cập nhật

#### DELETE /timesheet/:id

- **Mô tả**: Xóa timesheet (soft delete)
- **Auth**: Cần đăng nhập
- **Params**: `id` - ID timesheet
- **Response**: Thông báo xóa thành công

### 2. Check-in/Check-out

#### POST /timesheet/checkin

- **Mô tả**: Check-in vào ca làm việc
- **Auth**: Cần đăng nhập
- **Body**: CheckinDto
  - `checkin`: Thời gian check-in (ISO string)
  - `note` (optional): Ghi chú
  - `remote` (optional): Làm việc từ xa (0/1)
- **Response**: Thông tin check-in

#### POST /timesheet/checkout

- **Mô tả**: Check-out khỏi ca làm việc
- **Auth**: Cần đăng nhập
- **Body**: CheckoutDto
  - `checkout`: Thời gian check-out (ISO string)
  - `note` (optional): Ghi chú
- **Response**: Thông tin check-out

#### GET /timesheet/attendance/today

- **Mô tả**: Lấy thông tin chấm công hôm nay
- **Auth**: Cần đăng nhập
- **Response**: Thông tin chấm công hôm nay

### 3. Đơn xin nghỉ phép

#### POST /timesheet/day-off-requests

- **Mô tả**: Tạo đơn xin nghỉ phép
- **Auth**: Cần đăng nhập
- **Body**: CreateDayOffRequestDto
  - `user_id`: ID người dùng
  - `total`: Tổng số ngày nghỉ
  - `status`: Trạng thái (1: chờ duyệt, 2: đã duyệt, 3: từ chối)
  - `type`: Loại nghỉ phép (1: có lương, 2: không lương, 3: ốm đau)
  - `is_past`: Nghỉ bù (0/1)
  - `contract_id` (optional): ID hợp đồng
- **Response**: Đơn nghỉ phép đã tạo

#### GET /timesheet/day-off-requests/my

- **Mô tả**: Lấy danh sách đơn nghỉ phép của tôi
- **Auth**: Cần đăng nhập
- **Response**: Danh sách đơn nghỉ phép

#### PATCH /timesheet/day-off-requests/:id/status

- **Mô tả**: Cập nhật trạng thái đơn nghỉ phép
- **Auth**: Cần quyền manager/admin
- **Params**: `id` - ID đơn nghỉ phép
- **Body**: `{ "status": number }`
- **Response**: Đơn nghỉ phép đã cập nhật

### 4. Đơn xin làm thêm giờ

#### POST /timesheet/overtime-requests

- **Mô tả**: Tạo đơn xin làm thêm giờ
- **Auth**: Cần đăng nhập
- **Body**: CreateOvertimeRequestDto
  - `user_id`: ID người dùng
  - `date`: Ngày làm thêm giờ
  - `start_time`: Thời gian bắt đầu
  - `end_time`: Thời gian kết thúc
  - `total` (optional): Tổng số giờ
  - `value` (optional): Giá trị
  - `project_id` (optional): ID dự án
  - `reason` (optional): Lý do
- **Response**: Đơn làm thêm giờ đã tạo

#### GET /timesheet/overtime-requests/my

- **Mô tả**: Lấy danh sách đơn làm thêm giờ của tôi
- **Auth**: Cần đăng nhập
- **Response**: Danh sách đơn làm thêm giờ

### 5. Lịch làm việc

#### GET /timesheet/schedule/personal

- **Mô tả**: Xem lịch làm việc cá nhân
- **Auth**: Cần đăng nhập
- **Query params**: GetScheduleDto
  - `start_date` (optional): Ngày bắt đầu
  - `end_date` (optional): Ngày kết thúc
  - `team_id` (optional): ID team
  - `division_id` (optional): ID phòng ban
- **Response**: Lịch làm việc cá nhân

#### GET /timesheet/schedule/team/:teamId

- **Mô tả**: Xem lịch làm việc của team
- **Auth**: Cần quyền manager/team_leader/admin
- **Params**: `teamId` - ID team
- **Query params**: GetScheduleDto
- **Response**: Lịch làm việc của team

### 6. Quản lý ngày lễ

#### POST /timesheet/holidays

- **Mô tả**: Tạo ngày lễ mới
- **Auth**: Cần quyền admin/hr
- **Body**: CreateHolidayDto
  - `name`: Tên ngày lễ
  - `type`: Loại ngày lễ
  - `status`: Trạng thái
  - `start_date`: Ngày bắt đầu
  - `end_date`: Ngày kết thúc
  - `description` (optional): Mô tả
- **Response**: Ngày lễ đã tạo

#### GET /timesheet/holidays

- **Mô tả**: Lấy danh sách ngày lễ
- **Auth**: Cần đăng nhập
- **Query params**:
  - `year` (optional): Năm
- **Response**: Danh sách ngày lễ

#### PATCH /timesheet/holidays/:id

- **Mô tả**: Cập nhật ngày lễ
- **Auth**: Cần quyền admin/hr
- **Params**: `id` - ID ngày lễ
- **Body**: Partial<CreateHolidayDto>
- **Response**: Ngày lễ đã cập nhật

#### DELETE /timesheet/holidays/:id

- **Mô tả**: Xóa ngày lễ
- **Auth**: Cần quyền admin/hr
- **Params**: `id` - ID ngày lễ
- **Response**: Thông báo xóa thành công

### 7. Thông báo

#### GET /timesheet/notifications/my

- **Mô tả**: Lấy thông báo timesheet của tôi
- **Auth**: Cần đăng nhập
- **Response**: Danh sách thông báo

### 8. Báo cáo & Thống kê

#### GET /timesheet/reports/timesheet

- **Mô tả**: Báo cáo timesheet
- **Auth**: Cần quyền manager/admin/hr
- **Query params**: TimesheetReportDto
  - `start_date` (optional): Ngày bắt đầu
  - `end_date` (optional): Ngày kết thúc
  - `division_id` (optional): ID phòng ban
  - `team_id` (optional): ID team
  - `report_type` (optional): Loại báo cáo
- **Response**: Báo cáo timesheet

#### GET /timesheet/reports/working-time

- **Mô tả**: Báo cáo giờ làm việc
- **Auth**: Cần quyền manager/admin/hr
- **Query params**: WorkingTimeReportDto
  - `month` (optional): Tháng (YYYY-MM)
  - `year` (optional): Năm
  - `user_id` (optional): ID người dùng
- **Response**: Báo cáo giờ làm việc

#### GET /timesheet/statistics/attendance

- **Mô tả**: Thống kê chấm công
- **Auth**: Cần đăng nhập
- **Query params**:
  - `user_id` (optional): ID người dùng
  - `start_date` (optional): Ngày bắt đầu
  - `end_date` (optional): Ngày kết thúc
- **Response**: Thống kê chấm công

#### GET /timesheet/statistics/my-attendance

- **Mô tả**: Thống kê chấm công cá nhân
- **Auth**: Cần đăng nhập
- **Query params**:
  - `start_date` (optional): Ngày bắt đầu
  - `end_date` (optional): Ngày kết thúc
- **Response**: Thống kê chấm công cá nhân

## DTOs

### CreateTimesheetDto

```typescript
{
  user_id: number;
  checkin: string;
  checkout: string;
  checkin_checkout?: string;
  day_off_id?: number;
  late_time?: number;
  late_time_approved?: number;
  early_time?: number;
  is_complete?: number;
  fines?: number;
  group_id?: number;
  type?: number;
  work_time_morning?: number;
  work_time_afternoon?: number;
  status?: number;
  request_type?: number;
  request_late?: string;
  request_early?: string;
  paid_leave?: string;
  unpaid_leave?: string;
  remote?: number;
}
```

### CheckinDto

```typescript
{
  checkin: string;
  note?: string;
  remote?: number;
}
```

### CheckoutDto

```typescript
{
  checkout: string;
  note?: string;
}
```

### CreateDayOffRequestDto

```typescript
{
  user_id: number;
  total: number;
  status: number;
  type: number;
  is_past: number;
  contract_id?: number;
}
```

### CreateOvertimeRequestDto

```typescript
{
  user_id: number;
  date: string;
  start_time: string;
  end_time: string;
  total?: number;
  value?: number;
  project_id?: number;
  reason?: string;
}
```

### CreateHolidayDto

```typescript
{
  name: string;
  type: number;
  status: number;
  start_date: string;
  end_date: string;
  description?: string;
}
```

## Mã trạng thái

### Trạng thái đơn nghỉ phép

- 1: Chờ duyệt
- 2: Đã duyệt
- 3: Từ chối

### Loại nghỉ phép

- 1: Nghỉ phép có lương
- 2: Nghỉ phép không lương
- 3: Nghỉ ốm đau

### Trạng thái timesheet

- 1: Chờ duyệt
- 2: Đã duyệt
- 3: Từ chối

### Loại ngày lễ

- 1: Lễ quốc gia
- 2: Lễ công ty
- 3: Nghỉ bù

## Lưu ý

- Tất cả các endpoint đều yêu cầu Bearer Token
- Thời gian được truyền dưới dạng ISO string
- Một số endpoint yêu cầu quyền đặc biệt (manager, admin, hr)
- Soft delete được áp dụng cho hầu hết các entity
