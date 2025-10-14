# Hệ thống Phân trang (Pagination System)

## Tổng quan

Hệ thống phân trang đã được tích hợp vào tất cả các API GET trong ứng dụng HRM. Hệ thống này cung cấp:

- Phân trang với `page` và `limit`
- Sắp xếp với `sort_by` và `sort_order`
- Bộ lọc tùy chỉnh cho từng module
- Response chuẩn với thông tin phân trang chi tiết

## Cách sử dụng

### 1. Tham số phân trang cơ bản

```typescript
// Query parameters
{
  page: 1,           // Số trang (bắt đầu từ 1)
  limit: 10,         // Số lượng bản ghi mỗi trang (tối đa 100)
  sort_by: 'created_at',  // Trường để sắp xếp
  sort_order: 'desc'      // Thứ tự sắp xếp (asc/desc)
}
```

### 2. Response format

```typescript
{
  data: [...],       // Dữ liệu của trang hiện tại
  pagination: {
    current_page: 1,
    per_page: 10,
    total: 100,
    total_pages: 10,
    has_next_page: true,
    has_prev_page: false
  }
}
```

## Endpoints đã hỗ trợ phân trang

### Timesheet Module
- `GET /timesheet/my-timesheets` - Danh sách timesheet có phân trang
- `GET /timesheet/holidays` - Danh sách ngày lễ có phân trang
- `GET /timesheet/attendance-logs` - Logs chấm công có phân trang

### Attendance Module
- `GET /attendance/work-shifts` - Ca làm việc có phân trang
- `GET /attendance/penalty-rules` - Quy định phạt có phân trang

### User Profile Module
- `GET /user-profile/education` - Học vấn có phân trang
- `GET /user-profile/experience` - Kinh nghiệm có phân trang
- `GET /user-profile/certificates` - Chứng chỉ có phân trang
- `GET /user-profile/skills` - Kỹ năng có phân trang
- `GET /user-profile/references/positions` - Vị trí có phân trang
- `GET /user-profile/references/roles` - Vai trò có phân trang
- `GET /user-profile/references/levels` - Cấp độ có phân trang
- `GET /user-profile/references/languages` - Ngôn ngữ có phân trang

### Users Module
- `GET /users` - Danh sách users có phân trang

## Ví dụ sử dụng

### 1. Lấy danh sách timesheet với phân trang và bộ lọc

```bash
GET /timesheet/my-timesheets?page=1&limit=20&start_date=2024-01-01&end_date=2024-01-31&status=approved&sort_by=work_date&sort_order=desc
```

### 2. Tìm kiếm users với phân trang

```bash
GET /users?page=1&limit=15&search=Nguyen&position_id=1&sort_by=created_at&sort_order=asc
```

### 3. Lấy danh sách ngày lễ theo năm

```bash
GET /timesheet/holidays?page=1&limit=50&year=2024&sort_by=start_date&sort_order=asc
```

## Bộ lọc tùy chỉnh

Mỗi endpoint có các bộ lọc riêng:

### Timesheet
- `start_date`, `end_date` - Lọc theo khoảng thời gian
- `status` - Lọc theo trạng thái

### Users
- `search` - Tìm kiếm theo tên hoặc email
- `status` - Lọc theo trạng thái
- `division_id`, `team_id`, `position_id`, `office_id`, `role_id` - Lọc theo thông tin tổ chức

### User Profile
- `name` - Tìm kiếm theo tên
- `school_name`, `degree` - Lọc học vấn
- `company_name`, `position` - Lọc kinh nghiệm
- `min_level`, `max_level` - Lọc kỹ năng theo cấp độ

## Lưu ý kỹ thuật

- Tất cả endpoints GET đều có phân trang mặc định
- Không cần hậu tố `/paginated` nữa - phân trang được tích hợp trực tiếp
- Giới hạn tối đa `limit` là 100 bản ghi
- Mặc định `page=1`, `limit=10`, `sort_order=desc`
- Hỗ trợ tìm kiếm không phân biệt hoa thường (case-insensitive)
