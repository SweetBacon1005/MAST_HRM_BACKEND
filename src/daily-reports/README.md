# Module Daily Reports

## Mô tả
Module Daily Reports quản lý báo cáo công việc hàng ngày của nhân viên, bao gồm tạo, xem, cập nhật, xóa và duyệt báo cáo. Module hỗ trợ phân quyền theo role và quy trình approval.

## Nghiệp vụ chính

### 1. Quản lý Daily Report
- Tạo báo cáo công việc hàng ngày
- Xem danh sách báo cáo (theo quyền)
- Xem chi tiết báo cáo
- Cập nhật báo cáo (chỉ khi bị reject)
- Xóa báo cáo (chỉ khi PENDING)

### 2. Approval Workflow
- Gửi báo cáo (trạng thái PENDING)
- Duyệt báo cáo (APPROVED)
- Từ chối báo cáo (REJECTED)

### 3. Phân quyền
- Admin: Xem tất cả
- Division Head: Xem báo cáo trong division
- Team Leader: Xem báo cáo trong team
- Project Manager: Xem báo cáo trong project
- Employee: Xem báo cáo của mình

## API Endpoints

### POST /daily-reports
**Mô tả:** Tạo daily report mới

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "project_id": 1,
  "work_date": "2024-01-20",
  "actual_time": 8,
  "title": "Phát triển tính năng login",
  "description": "Hoàn thành UI login page và tích hợp API authentication"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 5,
  "project_id": 1,
  "work_date": "2024-01-20T00:00:00Z",
  "actual_time": 8,
  "title": "Phát triển tính năng login",
  "description": "Hoàn thành UI login page và tích hợp API authentication",
  "status": "PENDING",
  "created_at": "2024-01-20T17:00:00Z",
  "updated_at": "2024-01-20T17:00:00Z"
}
```

**Business Rules:**
- Ngày làm việc phải thuộc tuần hiện tại
- User phải thuộc dự án (hoặc dự án có access_type là COMPANY)
- Trạng thái mặc định: PENDING

**Error Responses:**
- 400: Ngày làm việc không thuộc tuần hiện tại
- 403: Bạn không thuộc dự án này
- 404: Không tìm thấy dự án

---

### GET /daily-reports
**Mô tả:** Lấy danh sách daily reports theo quyền

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số bản ghi trên trang (default: 10)
- `user_id` (optional): Lọc theo user
- `project_id` (optional): Lọc theo project
- `start_date` (optional): Lọc từ ngày (YYYY-MM-DD)
- `end_date` (optional): Lọc đến ngày (YYYY-MM-DD)
- `status` (optional): Lọc theo trạng thái (PENDING, APPROVED, REJECTED)

**Phân quyền:**
- **Admin**: Xem tất cả báo cáo
- **Division Head**: Xem báo cáo trong division
- **Team Leader**: Xem báo cáo trong team
- **Project Manager**: Xem báo cáo trong project
- **Employee**: Chỉ xem báo cáo của mình

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 5,
      "project_id": 1,
      "work_date": "2024-01-20T00:00:00Z",
      "actual_time": 8,
      "title": "Phát triển tính năng login",
      "description": "Hoàn thành UI login page và tích hợp API authentication",
      "status": "PENDING",
      "approved_by": null,
      "reviewed_at": null,
      "reject_reason": null,
      "created_at": "2024-01-20T17:00:00Z",
      "updated_at": "2024-01-20T17:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "total_pages": 5
  }
}
```

---

### GET /daily-reports/my
**Mô tả:** Lấy danh sách daily reports của tôi

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:** Giống GET /daily-reports

**Response:** Giống GET /daily-reports

---

### GET /daily-reports/:id
**Mô tả:** Lấy chi tiết daily report

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "id": 1,
  "user_id": 5,
  "project_id": 1,
  "work_date": "2024-01-20T00:00:00Z",
  "actual_time": 8,
  "title": "Phát triển tính năng login",
  "description": "Hoàn thành UI login page và tích hợp API authentication",
  "status": "APPROVED",
  "approved_by": 3,
  "reviewed_at": "2024-01-20T18:00:00Z",
  "reject_reason": null,
  "created_at": "2024-01-20T17:00:00Z",
  "updated_at": "2024-01-20T18:00:00Z"
}
```

**Error Responses:**
- 404: Không tìm thấy daily report

---

### PATCH /daily-reports/:id
**Mô tả:** Sửa daily report (chỉ khi REJECTED)

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "project_id": 1,
  "work_date": "2024-01-20",
  "actual_time": 7,
  "title": "Phát triển tính năng login (updated)",
  "description": "Mô tả cập nhật"
}
```

**Response:** Giống GET /daily-reports/:id

**Business Rules:**
- Chỉ có thể sửa khi status là REJECTED
- Sau khi sửa, status chuyển về PENDING
- Ngày làm việc mới phải thuộc tuần hiện tại
- User phải thuộc dự án mới (nếu có thay đổi)

**Error Responses:**
- 400: Chỉ có thể sửa báo cáo khi trạng thái là REJECTED
- 403: Không có quyền chỉnh sửa báo cáo này
- 404: Không tìm thấy daily report

---

### DELETE /daily-reports/:id
**Mô tả:** Xóa daily report (chỉ khi PENDING)

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "id": 1,
  "message": "Xóa báo cáo thành công"
}
```

**Business Rules:**
- Chỉ có thể xóa khi status là PENDING
- Chỉ owner mới có thể xóa

**Error Responses:**
- 400: Chỉ có thể xóa báo cáo khi trạng thái là PENDING
- 403: Không có quyền xóa báo cáo này
- 404: Không tìm thấy daily report

---

### POST /daily-reports/:id/approve
**Mô tả:** Duyệt daily report

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "id": 1,
  "user_id": 5,
  "project_id": 1,
  "status": "APPROVED",
  "approved_by": 3,
  "reviewed_at": "2024-01-20T18:00:00Z",
  "reject_reason": null
}
```

**Quyền duyệt:**
- **Admin**: Duyệt báo cáo của Division Head
- **Division Head**: Duyệt báo cáo của PM/TL/member trong division
- **Project Manager**: Duyệt báo cáo trong project
- **Team Leader**: Duyệt báo cáo trong team

**Business Rules:**
- Chỉ có thể duyệt khi status là PENDING
- Người duyệt phải có quyền cao hơn người tạo báo cáo

**Error Responses:**
- 400: Chỉ có thể duyệt báo cáo khi trạng thái là PENDING
- 403: Không có quyền duyệt báo cáo này
- 404: Không tìm thấy daily report

---

### POST /daily-reports/:id/reject
**Mô tả:** Từ chối daily report

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "reject_reason": "Thiếu mô tả chi tiết công việc"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 5,
  "project_id": 1,
  "status": "REJECTED",
  "approved_by": 3,
  "reviewed_at": "2024-01-20T18:00:00Z",
  "reject_reason": "Thiếu mô tả chi tiết công việc"
}
```

**Quyền từ chối:** Giống quyền duyệt

**Business Rules:**
- Chỉ có thể từ chối khi status là PENDING
- Phải ghi rõ lý do từ chối

**Error Responses:**
- 400: Chỉ có thể từ chối báo cáo khi trạng thái là PENDING
- 403: Không có quyền từ chối báo cáo này
- 404: Không tìm thấy daily report

---

## Enums

### ApprovalStatus
- `PENDING`: Chờ duyệt
- `APPROVED`: Đã duyệt
- `REJECTED`: Bị từ chối

## Business Rules

### 1. Work Date Validation
- Ngày làm việc phải thuộc tuần hiện tại
- Tuần tính từ Thứ Hai đến Chủ Nhật

### 2. Project Access
User phải thuộc dự án:
- Là thành viên dự án (qua role assignment)
- Hoặc dự án có project_access_type là COMPANY

### 3. Update Rules
- Chỉ có thể sửa khi status là REJECTED
- Sau khi sửa, status tự động chuyển về PENDING
- Clear approved_by, reviewed_at, reject_reason

### 4. Delete Rules
- Chỉ có thể xóa khi status là PENDING
- Chỉ owner mới có thể xóa

### 5. Approval Hierarchy
```
Admin
  └─ Division Head
      ├─ Project Manager
      ├─ Team Leader
      └─ Employee
```

## Approval Logic

### canApprove Function
Kiểm tra quyền duyệt dựa trên:

1. **Admin**: Có thể duyệt báo cáo của Division Head
2. **Project Manager**: Duyệt báo cáo trong project
3. **Team Leader**: Duyệt báo cáo trong team (của project thuộc team)
4. **Division Head**: Duyệt báo cáo trong division

**Lưu ý:** Không thể duyệt báo cáo của mình

## Filtering và Search

### Filtering Options
- **User**: Lọc theo user_id
- **Project**: Lọc theo project_id
- **Date Range**: Lọc theo start_date và end_date
- **Status**: Lọc theo PENDING, APPROVED, REJECTED

### Access Control
Dữ liệu được filter dựa trên role:
- Admin: Không filter
- Division Head: Filter theo division
- Team Leader: Filter theo team
- Project Manager: Filter theo project
- Employee: Filter theo user_id

## Data Relations

### User
Người tạo báo cáo

### Project
Dự án mà công việc thuộc về

### Approved By
User duyệt/từ chối báo cáo

## Workflow

```
[Tạo báo cáo] → PENDING
      ↓
    [Duyệt?]
    /     \
  Yes      No
   ↓        ↓
APPROVED  REJECTED
            ↓
         [Sửa lại]
            ↓
          PENDING
```

## Notifications (Future)
- Thông báo khi báo cáo được duyệt
- Thông báo khi báo cáo bị từ chối
- Nhắc nhở tạo báo cáo hàng ngày

## Liên kết với các module khác
- **Projects Module**: Quản lý dự án
- **Users Module**: Thông tin nhân viên
- **Role Assignment Service**: Kiểm tra quyền
- **Notifications Module**: Gửi thông báo
