# Module Auth

## Mô tả
Module Auth quản lý xác thực và phân quyền người dùng trong hệ thống HRM, bao gồm đăng nhập, đăng ký, quản lý token, đổi mật khẩu và quên mật khẩu.

## Nghiệp vụ chính

### 1. Xác thực người dùng
- Đăng nhập bằng email/password
- Đăng ký tài khoản mới (tự động gán role EMPLOYEE)
- Refresh access token khi hết hạn
- Đăng xuất

### 2. Quản lý mật khẩu
- Quên mật khẩu (gửi OTP qua email)
- Đặt lại mật khẩu với OTP
- Đổi mật khẩu (yêu cầu mật khẩu cũ)
- Đổi mật khẩu với OTP (không cần mật khẩu cũ)

### 3. Quản lý OTP
- Gửi OTP cho reset password
- Gửi OTP cho change password
- Xác thực OTP
- Giới hạn số lần gửi OTP (rate limiting)

### 4. Phân quyền
- Gán role cho user
- Kiểm tra permissions
- Quản lý role assignments theo scope (COMPANY, DIVISION, TEAM, PROJECT)

## API Endpoints

### Authentication APIs

#### POST /auth/login
**Mô tả:** Đăng nhập vào hệ thống

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "YourPassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- 401: Email hoặc mật khẩu không đúng

---

#### POST /auth/register
**Mô tả:** Đăng ký tài khoản mới

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "StrongPassword123",
  "name": "Nguyen Van A"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Validation:**
- Email phải hợp lệ và chưa tồn tại
- Mật khẩu tối thiểu 8 ký tự, có chữ hoa, chữ thường và số
- Không chứa ký tự đặc biệt nguy hiểm (<, >, ', ", &)

**Error Responses:**
- 400: Email đã tồn tại hoặc mật khẩu không đủ mạnh

---

#### POST /auth/refresh
**Mô tả:** Làm mới access token

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- 401: Refresh token không hợp lệ hoặc đã hết hạn

---

#### POST /auth/logout
**Mô tả:** Đăng xuất khỏi hệ thống

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "message": "Đăng xuất thành công"
}
```

---

#### POST /auth/me
**Mô tả:** Lấy thông tin user hiện tại kèm thông tin bổ sung

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "user_information": {
    "name": "Nguyen Van A",
    "avatar": "https://...",
    "position_id": 1,
    "level_id": 2
  },
  "join_date": "2024-01-15",
  "today_attendance": {
    "checkin": "2024-01-20T08:00:00Z",
    "checkout": null,
    "total_work_time": 0,
    "status": "PENDING",
    "late_time": 0,
    "early_time": 0,
    "is_complete": false,
    "has_attendance": true
  },
  "remaining_leave_days": 96,
  "annual_leave_quota": 96,
  "used_leave_days": 1,
  "assigned_devices": [
    {
      "id": 1,
      "name": "Laptop Dell XPS 13",
      "type": "laptop",
      "code": "LAPTOP-001",
      "brand": "Dell",
      "model": "XPS 13 9320",
      "serial": "SN123456",
      "assigned_date": "2024-01-15T00:00:00Z",
      "notes": "Thiết bị mới"
    }
  ],
  "organization": {
    "division": {
      "id": 1,
      "name": "Phòng Phát triển",
      "division_head": {
        "id": 5,
        "email": "head@example.com",
        "name": "Tran Van B",
        "avatar": "https://...",
        "phone": "+84901234567"
      }
    },
    "team": {
      "id": 1,
      "name": "Team Frontend",
      "division_id": 1,
      "founding_date": "2023-01-01T00:00:00Z"
    }
  },
  "unread_notifications": 5,
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

---

### Password Management APIs

#### POST /auth/forgot-password
**Mô tả:** Gửi OTP để đặt lại mật khẩu

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Nếu email tồn tại, mã OTP đã được gửi đến email của bạn"
}
```

**Lưu ý:**
- OTP có thời hạn 10 phút
- Giới hạn gửi OTP: tối đa 3 lần trong 15 phút

**Error Responses:**
- 400: Gửi quá nhiều yêu cầu

---

#### POST /auth/verify-otp
**Mô tả:** Xác thực OTP cho forgot password

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "message": "Mã OTP hợp lệ",
  "isValid": true,
  "reset_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Lưu ý:**
- reset_token có thời hạn 15 phút

**Error Responses:**
- 400: Mã OTP không hợp lệ hoặc đã hết hạn
- 404: Email không tồn tại

---

#### POST /auth/reset-password
**Mô tả:** Đặt lại mật khẩu với OTP

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "new_password": "NewStrongPassword123"
}
```

**Response:**
```json
{
  "message": "Đặt lại mật khẩu thành công"
}
```

**Error Responses:**
- 400: Mã OTP không hợp lệ hoặc mật khẩu không đủ mạnh
- 404: Email không tồn tại

---

#### POST /auth/reset-password-with-token
**Mô tả:** Đặt lại mật khẩu với reset token từ verify OTP

**Request Body:**
```json
{
  "email": "user@example.com",
  "reset_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "new_password": "NewStrongPassword123"
}
```

**Response:**
```json
{
  "message": "Đặt lại mật khẩu thành công"
}
```

**Error Responses:**
- 400: Token không hợp lệ hoặc đã hết hạn
- 404: Email không tồn tại

---

#### POST /auth/change-password
**Mô tả:** Đổi mật khẩu (yêu cầu mật khẩu hiện tại)

**Headers:** `Authorization: Bearer <access_token>`

**Permission required:** `user.profile.update`

**Request Body:**
```json
{
  "current_password": "OldPassword123",
  "new_password": "NewStrongPassword123"
}
```

**Response:**
```json
{
  "message": "Thay đổi mật khẩu thành công"
}
```

**Error Responses:**
- 400: Mật khẩu hiện tại không đúng hoặc mật khẩu mới trùng với mật khẩu cũ
- 401: Token không hợp lệ

---

#### POST /auth/send-change-password-otp
**Mô tả:** Gửi OTP để thay đổi mật khẩu (không cần mật khẩu hiện tại)

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Nếu email tồn tại, mã OTP đã được gửi đến email của bạn"
}
```

**Error Responses:**
- 400: Gửi quá nhiều yêu cầu

---

#### POST /auth/change-password-with-otp
**Mô tả:** Thay đổi mật khẩu với OTP

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "new_password": "NewStrongPassword123"
}
```

**Response:**
```json
{
  "message": "Thay đổi mật khẩu thành công"
}
```

**Error Responses:**
- 400: Mã OTP không hợp lệ hoặc đã hết hạn
- 404: Email không tồn tại

---

## Guards và Decorators

### JwtAuthGuard
Bảo vệ các route yêu cầu xác thực

### PermissionGuard
Kiểm tra quyền truy cập theo permission

### Decorators
- `@Public()`: Đánh dấu route không yêu cầu xác thực
- `@GetCurrentUser()`: Lấy thông tin user hiện tại
- `@RequirePermission(permission)`: Yêu cầu permission cụ thể

## Security Features

### Password Validation
- Tối thiểu 8 ký tự
- Phải có chữ hoa
- Phải có chữ thường
- Phải có số
- Không chứa ký tự nguy hiểm: `<`, `>`, `'`, `"`, `&`

### OTP Management
- OTP 6 chữ số
- Thời hạn: 10 phút
- Rate limiting: tối đa 3 lần gửi trong 15 phút
- Tự động cleanup OTP hết hạn

### Token Management
- Access token: thời hạn cấu hình trong env (mặc định 15 phút)
- Refresh token: thời hạn cấu hình trong env (mặc định 7 ngày)
- Reset token: thời hạn 15 phút

## Activity Logging
Module tự động ghi log các hoạt động:
- Đăng nhập thành công
- Đăng ký tài khoản mới
- Thay đổi mật khẩu
- Đặt lại mật khẩu

## Liên kết với các module khác
- **Users Module**: Quản lý thông tin user
- **Notifications Module**: Gửi thông báo qua email
- **Database Module**: Truy xuất dữ liệu
- **Activity Log Service**: Ghi log hoạt động
