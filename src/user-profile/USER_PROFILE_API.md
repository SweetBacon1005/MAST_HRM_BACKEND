# User Profile API

API quản lý thông tin cá nhân của nhân viên trong hệ thống HRM.

## Mục lục
- [Xác thực](#xác-thực)
- [Thông tin cá nhân](#thông-tin-cá-nhân)
- [Quản lý con cái](#quản-lý-con-cái)
- [Quản lý học vấn](#quản-lý-học-vấn)
- [Quản lý kinh nghiệm](#quản-lý-kinh-nghiệm)
- [Quản lý chứng chỉ](#quản-lý-chứng-chỉ)
- [Quản lý kỹ năng](#quản-lý-kỹ-năng)
- [Danh sách tham chiếu](#danh-sách-tham-chiếu)

## Xác thực

Tất cả API đều yêu cầu JWT token trong header:
```
Authorization: Bearer <your-jwt-token>
```

## Thông tin cá nhân

### 1. Xem thông tin cá nhân
**GET** `/user-profile`

Lấy thông tin cá nhân chi tiết của user hiện tại.

**Response:**
```json
{
  "id": 1,
  "name": "Nguyễn Văn A",
  "email": "user@company.com",
  "user_information": [
    {
      "id": 1,
      "email": "user@company.com",
      "personal_email": "user@gmail.com",
      "name": "Nguyễn Văn A",
      "avatar": "https://s3.amazonaws.com/avatar.jpg",
      "position": { "id": 1, "name": "Developer" },
      "office": { "id": 1, "name": "Hà Nội" },
      "role": { "id": 1, "name": "Nhân viên" },
      "level": { "id": 1, "name": "Junior" },
      "language": { "id": 1, "name": "Tiếng Việt" }
    }
  ],
  "children": [],
  "education": [],
  "experience": [],
  "user_certificates": [],
  "user_skills": []
}
```

### 2. Cập nhật thông tin cá nhân
**PATCH** `/user-profile/information`

**Body:**
```json
{
  "email": "user@company.com",
  "personal_email": "user@gmail.com",
  "name": "Nguyễn Văn A",
  "avatar": "https://s3.amazonaws.com/avatar.jpg",
  "gender": "Nam",
  "phone": "0901234567",
  "address": "123 Đường ABC, Quận 1, TP.HCM",
  "position_id": 1,
  "office_id": 1,
  "role_id": 1,
  "level_id": 1,
  "language_id": 1
}
```

### 3. Cập nhật avatar
**PATCH** `/user-profile/avatar`

**Body:**
```json
{
  "avatar_url": "https://bucket-name.s3.amazonaws.com/avatars/user-123.jpg"
}
```

## Quản lý con cái

### 1. Thêm thông tin con
**POST** `/user-profile/children`

**Body:**
```json
{
  "gender": "Nam",
  "name": "Nguyễn Văn B",
  "birthday": "2010-01-01",
  "phone": "0901234567",
  "is_dependent": false,
  "dependent_start_date": "2010-01-01",
  "type": "Con"
}
```

### 2. Lấy danh sách con cái
**GET** `/user-profile/children`

### 3. Cập nhật thông tin con
**PATCH** `/user-profile/children/:id`

### 4. Xóa thông tin con
**DELETE** `/user-profile/children/:id`

## Quản lý học vấn

### 1. Thêm thông tin học vấn
**POST** `/user-profile/education`

**Body:**
```json
{
  "name": "Đại học Bách Khoa",
  "major": "Công nghệ thông tin",
  "description": "Cử nhân Công nghệ thông tin",
  "start_date": "2018-09-01",
  "end_date": "2022-06-30"
}
```

### 2. Lấy danh sách học vấn
**GET** `/user-profile/education`

### 3. Cập nhật thông tin học vấn
**PATCH** `/user-profile/education/:id`

### 4. Xóa thông tin học vấn
**DELETE** `/user-profile/education/:id`

## Quản lý kinh nghiệm

### 1. Thêm thông tin kinh nghiệm
**POST** `/user-profile/experience`

**Body:**
```json
{
  "job_title": "Lập trình viên Frontend",
  "company": "Công ty ABC",
  "start_date": "2020-01-01",
  "end_date": "2022-12-31"
}
```

### 2. Lấy danh sách kinh nghiệm
**GET** `/user-profile/experience`

### 3. Cập nhật thông tin kinh nghiệm
**PATCH** `/user-profile/experience/:id`

### 4. Xóa thông tin kinh nghiệm
**DELETE** `/user-profile/experience/:id`

## Quản lý chứng chỉ

### 1. Thêm chứng chỉ
**POST** `/user-profile/certificates`

**Body:**
```json
{
  "name": "AWS Certified Developer",
  "authority": "Amazon Web Services",
  "issued_at": "2023-01-01"
}
```

### 2. Lấy danh sách chứng chỉ
**GET** `/user-profile/certificates`

### 3. Cập nhật chứng chỉ
**PATCH** `/user-profile/certificates/:id`

### 4. Xóa chứng chỉ
**DELETE** `/user-profile/certificates/:id`

## Quản lý kỹ năng

### 1. Thêm kỹ năng
**POST** `/user-profile/skills`

**Body:**
```json
{
  "skill_id": 1,
  "experience": 3,
  "months_experience": 6,
  "is_main": true
}
```

### 2. Lấy danh sách kỹ năng của user
**GET** `/user-profile/skills`

### 3. Cập nhật kỹ năng
**PATCH** `/user-profile/skills/:id`

### 4. Xóa kỹ năng
**DELETE** `/user-profile/skills/:id`

### 5. Lấy danh sách kỹ năng theo vị trí
**GET** `/user-profile/skills/position/:positionId`

## Danh sách tham chiếu

### 1. Lấy danh sách vị trí
**GET** `/user-profile/references/positions`

### 2. Lấy danh sách văn phòng
**GET** `/user-profile/references/offices`

### 3. Lấy danh sách vai trò
**GET** `/user-profile/references/roles`

### 4. Lấy danh sách cấp độ
**GET** `/user-profile/references/levels`

### 5. Lấy danh sách ngôn ngữ
**GET** `/user-profile/references/languages`

## Lỗi phổ biến

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["Validation error messages"],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy thông tin"
}
```

## Ghi chú

- Tất cả ngày tháng đều sử dụng định dạng ISO 8601 (YYYY-MM-DD)
- Avatar được upload lên S3 ở frontend, backend chỉ lưu URL
- Các trường bắt buộc sẽ được validate ở DTO level
- Soft delete được áp dụng cho hầu hết các entity (deleted_at)
