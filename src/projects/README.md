# Module Projects

## Mô tả
Module Projects quản lý các dự án trong hệ thống HRM, bao gồm tạo, cập nhật, xóa dự án và quản lý thành viên dự án. Module hỗ trợ phân quyền theo role (Admin, Division Head, Team Leader, Project Manager).

## Nghiệp vụ chính

### 1. Quản lý Dự án
- Tạo dự án mới với thông tin chi tiết
- Xem danh sách dự án có phân trang và lọc
- Xem chi tiết dự án kèm thành viên
- Cập nhật thông tin dự án
- Cập nhật tiến độ dự án (0-100%)
- Xóa dự án (soft delete)

### 2. Quản lý Thành viên
- Xem danh sách thành viên dự án
- Gán role cho thành viên (qua role assignment)
- Xem thông tin thành viên chi tiết

### 3. Phân quyền truy cập
- **COMPANY**: Tất cả nhân viên có thể xem
- **RESTRICTED**: Chỉ thành viên division/team/project có thể xem

## API Endpoints

### POST /projects
**Mô tả:** Tạo dự án mới

**Permission required:** `project.create`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "name": "Dự án HRM System",
  "code": "HRM-001",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "status": "PLANNING",
  "project_type": "INTERNAL",
  "project_access_type": "RESTRICTED",
  "industry": "SOFTWARE",
  "description": "Phát triển hệ thống quản lý nhân sự",
  "division_id": 1,
  "team_id": 1
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Dự án HRM System",
  "code": "HRM-001",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "status": "PLANNING",
  "project_type": "INTERNAL",
  "project_access_type": "RESTRICTED",
  "industry": "SOFTWARE",
  "description": "Phát triển hệ thống quản lý nhân sự",
  "progress": 0,
  "division": {
    "id": 1,
    "name": "Phòng Phát triển"
  },
  "team": {
    "id": 1,
    "name": "Team Frontend"
  },
  "created_at": "2024-01-20T10:00:00Z"
}
```

**Validation:**
- Code phải unique
- start_date < end_date
- Division và Team phải tồn tại

**Error Responses:**
- 400: Code đã tồn tại hoặc start_date >= end_date
- 404: Division hoặc Team không tồn tại

---

### GET /projects
**Mô tả:** Lấy danh sách dự án có phân trang và phân quyền

**Permission required:** `project.read`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số bản ghi trên trang (default: 10)
- `search` (optional): Tìm kiếm theo tên hoặc code
- `status` (optional): Lọc theo trạng thái (PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED)
- `division_id` (optional): Lọc theo division
- `team_id` (optional): Lọc theo team
- `sortBy` (optional): Sắp xếp theo trường
- `sortOrder` (optional): Thứ tự sắp xếp (asc, desc)

**Phân quyền truy cập:**
- **Admin**: Xem tất cả dự án
- **Division Head**: Xem dự án trong division
- **Team Leader**: Xem dự án trong team
- **Project Manager**: Xem dự án được gán
- **Employee**: Xem dự án COMPANY hoặc dự án thuộc division/team/project của mình

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Dự án HRM System",
      "code": "HRM-001",
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "status": "IN_PROGRESS",
      "project_type": "INTERNAL",
      "project_access_type": "RESTRICTED",
      "industry": "SOFTWARE",
      "description": "Phát triển hệ thống quản lý nhân sự",
      "progress": 45,
      "division": {
        "id": 1,
        "name": "Phòng Phát triển"
      },
      "team": {
        "id": 1,
        "name": "Team Frontend"
      },
      "member_count": 5,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 20,
    "page": 1,
    "limit": 10,
    "total_pages": 2
  }
}
```

---

### GET /projects/my
**Mô tả:** Lấy danh sách dự án của user hiện tại

**Permission required:** `project.read`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:** Giống GET /projects

**Response:** Giống GET /projects, nhưng chỉ trả về dự án mà user là thành viên

---

### GET /projects/:id
**Mô tả:** Lấy thông tin chi tiết dự án

**Permission required:** `project.read`

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "id": 1,
  "name": "Dự án HRM System",
  "code": "HRM-001",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "status": "IN_PROGRESS",
  "project_type": "INTERNAL",
  "project_access_type": "RESTRICTED",
  "industry": "SOFTWARE",
  "description": "Phát triển hệ thống quản lý nhân sự",
  "progress": 45,
  "division": {
    "id": 1,
    "name": "Phòng Phát triển"
  },
  "team": {
    "id": 1,
    "name": "Team Frontend"
  },
  "member_count": 5,
  "members": [
    {
      "id": 1,
      "name": "Nguyen Van A",
      "email": "user1@example.com",
      "role": "project_manager"
    },
    {
      "id": 2,
      "name": "Tran Van B",
      "email": "user2@example.com",
      "role": "employee"
    }
  ],
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Error Responses:**
- 404: Dự án không tồn tại

---

### GET /projects/:id/members
**Mô tả:** Lấy danh sách thành viên của dự án

**Permission required:** `project.read`

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
[
  {
    "id": 1,
    "email": "user1@example.com",
    "name": "Nguyen Van A",
    "role": {
      "id": 5,
      "name": "project_manager"
    },
    "position": {
      "id": 1,
      "name": "Senior Developer"
    },
    "level": {
      "id": 3,
      "name": "Senior",
      "coefficient": 1.5
    }
  }
]
```

**Error Responses:**
- 404: Dự án không tồn tại

---

### PATCH /projects/:id
**Mô tả:** Cập nhật thông tin dự án

**Permission required:** `project.update`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "name": "Dự án HRM System (Updated)",
  "status": "IN_PROGRESS",
  "progress": 50,
  "description": "Mô tả cập nhật"
}
```

**Response:** Giống GET /projects/:id

**Validation:**
- Nếu update code: phải unique
- Nếu update start_date/end_date: start_date < end_date
- Nếu update division_id/team_id: phải tồn tại

**Error Responses:**
- 400: Dữ liệu không hợp lệ
- 404: Dự án không tồn tại

---

### PATCH /projects/:id/progress
**Mô tả:** Cập nhật tiến độ dự án (0-100)

**Permission required:** `project.update`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "progress": 75
}
```

**Response:** Giống GET /projects/:id

**Validation:**
- progress phải từ 0 đến 100

**Error Responses:**
- 400: progress không hợp lệ
- 404: Dự án không tồn tại

---

### DELETE /projects/:id
**Mô tả:** Xóa dự án (soft delete)

**Permission required:** `project.delete`

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "id": 1,
  "name": "Dự án HRM System",
  "deleted_at": "2024-01-20T10:00:00Z"
}
```

**Lưu ý:**
- Khi xóa dự án, tất cả role assignments liên quan cũng bị soft delete

**Error Responses:**
- 404: Dự án không tồn tại

---

## Enums

### ProjectStatus
- `PLANNING`: Đang lên kế hoạch
- `IN_PROGRESS`: Đang thực hiện
- `ON_HOLD`: Tạm dừng
- `COMPLETED`: Hoàn thành
- `CANCELLED`: Đã hủy

### ProjectType
- `INTERNAL`: Dự án nội bộ
- `EXTERNAL`: Dự án bên ngoài

### ProjectAccessType
- `COMPANY`: Tất cả nhân viên có thể xem
- `RESTRICTED`: Chỉ thành viên có quyền mới xem

### Industry (optional)
Lĩnh vực dự án: SOFTWARE, HARDWARE, CONSULTING, etc.

## Phân quyền truy cập

### Role-based Access Control

**Admin:**
- Xem tất cả dự án
- Có thể filter theo division_id

**Division Head:**
- Chỉ xem dự án trong division của mình
- Không thể xem dự án của division khác

**Team Leader:**
- Xem dự án của team
- Xem dự án COMPANY
- Xem dự án thuộc division của team

**Project Manager:**
- Xem dự án được gán làm PM
- Xem dự án COMPANY

**Employee:**
- Xem dự án COMPANY
- Xem dự án thuộc division/team/project của mình

## Member Management

### Thêm thành viên
Thành viên được thêm vào dự án thông qua role assignment:
```typescript
scope_type: 'PROJECT'
scope_id: project.id
role_id: role.id  // project_manager, employee, etc.
```

### Xóa thành viên
Soft delete role assignment tương ứng

## Filtering và Search

### Filtering Options
- **Status**: PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED
- **Division**: Lọc theo division
- **Team**: Lọc theo team

### Search
Tìm kiếm theo:
- Tên dự án
- Code dự án

## Data Relations

### Division
Dự án thuộc một division (optional)

### Team
Dự án thuộc một team (optional)

### Members
Thành viên dự án được quản lý qua `user_role_assignment`:
- scope_type: PROJECT
- scope_id: project.id

## Business Rules

1. **Project Code**: Phải unique trong hệ thống
2. **Date Validation**: start_date < end_date
3. **Progress**: Từ 0 đến 100
4. **Access Control**: Tuân theo project_access_type
5. **Member Count**: Tự động đếm từ role assignments

## Liên kết với các module khác
- **Division Module**: Quản lý division và team
- **Role Assignment Service**: Quản lý thành viên dự án
- **Daily Reports Module**: Báo cáo công việc theo dự án
- **Users Module**: Thông tin thành viên
