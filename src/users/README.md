# Module Users

## Mô tả
Module Users quản lý thông tin người dùng trong hệ thống HRM, bao gồm tạo, đọc, cập nhật và xóa người dùng. Module cũng quản lý role assignments và thông tin division/team của user.

## Nghiệp vụ chính

### 1. Quản lý User
- Tạo user mới (tự động gán role nếu có)
- Xem danh sách users có phân trang và lọc
- Xem chi tiết thông tin user
- Cập nhật thông tin user
- Xóa user (soft delete)

### 2. Role Assignment
- Gán role cho user khi tạo
- Quản lý role assignments theo scope
- Lấy danh sách roles của user

### 3. Organization Structure
- Gán user vào division
- Gán user vào team
- Xem cấu trúc tổ chức của user

## API Endpoints

### POST /users
**Mô tả:** Tạo user mới

**Permission required:** `user.create`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "StrongPassword123",
  "name": "Nguyen Van A",
  "role_id": 3
}
```

**Response:**
```json
{
  "id": 5,
  "email": "newuser@example.com",
  "email_verified_at": "2024-01-20T10:00:00Z",
  "created_at": "2024-01-20T10:00:00Z",
  "updated_at": "2024-01-20T10:00:00Z"
}
```

**Lưu ý:**
- Mật khẩu sẽ được hash tự động
- Nếu có `role_id`, sẽ tự động gán role với scope COMPANY
- Email phải unique trong hệ thống

**Error Responses:**
- 400: Email đã tồn tại hoặc dữ liệu không hợp lệ

---

### GET /users
**Mô tả:** Lấy danh sách users có phân trang và lọc

**Permission required:** `user.read`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số bản ghi trên trang (default: 10)
- `search` (optional): Tìm kiếm theo tên
- `status` (optional): Lọc theo trạng thái (ACTIVE, INACTIVE)
- `position_id` (optional): Lọc theo vị trí
- `role_id` (optional): Lọc theo role
- `division_id` (optional): Lọc theo division
- `sortBy` (optional): Sắp xếp theo trường
- `sortOrder` (optional): Thứ tự sắp xếp (asc, desc)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "email": "user1@example.com",
      "email_verified_at": "2024-01-15T00:00:00Z",
      "status": "ACTIVE",
      "created_at": "2024-01-15T00:00:00Z",
      "updated_at": "2024-01-15T00:00:00Z",
      "user_information": {
        "name": "Nguyen Van A",
        "avatar": "https://...",
        "position": {
          "id": 1,
          "name": "Developer"
        }
      },
      "user_role_assignments": [
        {
          "role": {
            "id": 3,
            "name": "employee"
          },
          "scope_id": null,
          "scope_type": "COMPANY"
        }
      ],
      "user_division": [
        {
          "division": {
            "id": 1,
            "name": "Phòng Phát triển",
            "description": "Phòng phát triển sản phẩm",
            "status": "ACTIVE",
            "type": "TECHNICAL"
          },
          "team": {
            "id": 1,
            "name": "Team Frontend"
          }
        }
      ]
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

### GET /users/:id
**Mô tả:** Lấy thông tin chi tiết user

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "email_verified_at": "2024-01-15T00:00:00Z",
  "status": "ACTIVE",
  "created_at": "2024-01-15T00:00:00Z",
  "updated_at": "2024-01-15T00:00:00Z",
  "user_information": {
    "name": "Nguyen Van A",
    "avatar": "https://...",
    "phone": "+84901234567",
    "address": "123 Main St",
    "birthday": "1990-01-01T00:00:00Z",
    "position": {
      "id": 1,
      "name": "Developer"
    },
    "level": {
      "id": 2,
      "name": "Junior",
      "coefficient": 1.2
    }
  },
  "user_division": [
    {
      "division": {
        "id": 1,
        "name": "Phòng Phát triển",
        "description": "Phòng phát triển sản phẩm",
        "status": "ACTIVE",
        "type": "TECHNICAL",
        "created_at": "2023-01-01T00:00:00Z"
      },
      "team": {
        "id": 1,
        "name": "Team Frontend",
        "division_id": 1,
        "founding_date": "2023-01-01T00:00:00Z"
      }
    }
  ],
  "role_assignments": [
    {
      "role_id": 3,
      "name": "employee",
      "scope_type": "COMPANY",
      "scope_id": null
    }
  ]
}
```

**Error Responses:**
- 404: User không tồn tại

---

### PATCH /users/:id
**Mô tả:** Cập nhật thông tin user

**Permission required:** `user.update`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "email": "updated@example.com",
  "status": "INACTIVE"
}
```

**Response:**
```json
{
  "id": 1,
  "email": "updated@example.com",
  "status": "INACTIVE",
  "email_verified_at": "2024-01-15T00:00:00Z",
  "created_at": "2024-01-15T00:00:00Z",
  "updated_at": "2024-01-20T10:00:00Z"
}
```

**Lưu ý:**
- Password không được trả về trong response
- Chỉ cập nhật các trường được gửi trong request

**Error Responses:**
- 404: User không tồn tại
- 400: Dữ liệu không hợp lệ

---

### DELETE /users/:id
**Mô tả:** Xóa user (soft delete)

**Permission required:** `user.delete`

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "message": "Xóa thành công"
}
```

**Lưu ý:**
- User không bị xóa vật lý, chỉ đánh dấu deleted_at
- User bị xóa không thể đăng nhập

**Error Responses:**
- 404: User không tồn tại

---

## Phân quyền

### Permissions
- `user.create`: Tạo user mới
- `user.read`: Xem thông tin user
- `user.update`: Cập nhật thông tin user
- `user.delete`: Xóa user

### Role Scopes
Module hỗ trợ role assignment theo các scope:
- **COMPANY**: Toàn công ty
- **DIVISION**: Trong division cụ thể
- **TEAM**: Trong team cụ thể
- **PROJECT**: Trong project cụ thể

## Filtering và Search

### Filtering Options
- **Status**: ACTIVE, INACTIVE
- **Position**: Lọc theo vị trí công việc
- **Role**: Lọc theo role của user
- **Division**: Lọc theo division (qua role assignment)

### Search
Tìm kiếm theo tên user trong `user_information.name`

### Sorting
- Mặc định: Sắp xếp theo `created_at DESC`
- Có thể sắp xếp theo bất kỳ trường nào

## Organization Structure

### Division Assignment
User có thể được gán vào division thông qua role assignment:
- Scope type: `DIVISION`
- Scope id: ID của division

### Team Assignment
User có thể được gán vào team thông qua role assignment:
- Scope type: `TEAM`
- Scope id: ID của team

**Lưu ý:** Một user có thể có nhiều role assignments với các scope khác nhau.

## Data Relations

### User Information
Mỗi user có một bản ghi `user_information` chứa:
- Tên đầy đủ
- Avatar
- Số điện thoại
- Địa chỉ
- Ngày sinh
- Position (vị trí công việc)
- Level (cấp bậc)

### Role Assignments
User có nhiều role assignments, mỗi assignment có:
- Role ID
- Scope type (COMPANY, DIVISION, TEAM, PROJECT)
- Scope ID (ID của division/team/project)

## Liên kết với các module khác
- **Auth Module**: Xác thực và phân quyền
- **Division Module**: Quản lý division và team
- **Role Assignment Service**: Gán role cho user
- **Activity Log Service**: Ghi log hoạt động
