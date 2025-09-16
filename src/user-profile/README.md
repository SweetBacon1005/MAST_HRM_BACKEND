# User Profile Module

Module quản lý hồ sơ nhân viên chi tiết cho hệ thống HRM.

## Tổng quan

User Profile Module cung cấp các chức năng:
- ✅ Quản lý thông tin cá nhân nhân viên
- ✅ Quản lý con cái (Children)
- ✅ Quản lý học vấn (Education)
- ✅ Quản lý kinh nghiệm làm việc (Experience)
- ✅ Quản lý chứng chỉ (Certificates)
- ✅ Quản lý kỹ năng (Skills)
- ✅ Quản lý người tham chiếu (References)
- ✅ Upload avatar và documents
- ✅ Phân trang và tìm kiếm

## Cấu trúc thư mục

```
src/user-profile/
├── dto/                              # Data Transfer Objects
│   ├── create-child.dto.ts          # DTO tạo thông tin con
│   ├── update-child.dto.ts          # DTO cập nhật thông tin con
│   ├── create-education.dto.ts      # DTO tạo học vấn
│   ├── update-education.dto.ts      # DTO cập nhật học vấn
│   ├── create-experience.dto.ts     # DTO tạo kinh nghiệm
│   ├── update-experience.dto.ts     # DTO cập nhật kinh nghiệm
│   ├── create-user-certificate.dto.ts  # DTO tạo chứng chỉ
│   ├── update-user-certificate.dto.ts  # DTO cập nhật chứng chỉ
│   ├── create-user-skill.dto.ts     # DTO tạo kỹ năng
│   ├── update-user-skill.dto.ts     # DTO cập nhật kỹ năng
│   ├── update-user-information.dto.ts  # DTO cập nhật thông tin cá nhân
│   ├── upload-avatar.dto.ts         # DTO upload avatar
│   └── pagination-queries.dto.ts    # DTO phân trang
├── user-profile.controller.ts        # API Controller
├── user-profile.service.ts          # Business Logic Service
├── user-profile.module.ts           # NestJS Module
└── USER_PROFILE_API.md              # API Documentation
```

## Các chức năng chính

### 1. Thông tin cá nhân

#### Xem profile đầy đủ
```typescript
GET /user-profile

Response:
{
  "id": 1,
  "email": "user@example.com",
  "name": "Nguyễn Văn A",
  "user_information": {
    "phone": "0123456789",
    "address": "123 Đường ABC, Quận 1, TP.HCM",
    "date_of_birth": "1990-01-01",
    "gender": "male",
    "marital_status": "married",
    "nationality": "Vietnamese",
    "position": {
      "name": "Senior Developer"
    },
    "office": {
      "name": "TP.HCM Office"
    }
  },
  "children": [...],
  "education": [...],
  "experience": [...],
  "certificates": [...],
  "skills": [...]
}
```

#### Cập nhật thông tin cá nhân
```typescript
PUT /user-profile/information
{
  "phone": "0987654321",
  "address": "456 Đường XYZ, Quận 2, TP.HCM",
  "date_of_birth": "1990-01-01",
  "gender": "male",
  "marital_status": "single",
  "emergency_contact_name": "Nguyễn Thị B",
  "emergency_contact_phone": "0123456789",
  "emergency_contact_relationship": "Vợ"
}
```

### 2. Quản lý con cái

#### Thêm thông tin con
```typescript
POST /user-profile/children
{
  "name": "Nguyễn Văn C",
  "date_of_birth": "2015-05-10",
  "gender": "male",
  "relationship": "Con trai",
  "is_dependent": true
}
```

#### Lấy danh sách con với phân trang
```typescript
GET /user-profile/children?page=1&limit=10

Response:
{
  "data": [
    {
      "id": 1,
      "name": "Nguyễn Văn C",
      "date_of_birth": "2015-05-10",
      "gender": "male",
      "relationship": "Con trai",
      "is_dependent": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "total_pages": 1
  }
}
```

### 3. Quản lý học vấn

#### Thêm bằng cấp
```typescript
POST /user-profile/education
{
  "school_name": "Đại học Bách Khoa TP.HCM",
  "degree": "Cử nhân",
  "field_of_study": "Khoa học máy tính",
  "start_date": "2008-09-01",
  "end_date": "2012-06-30",
  "gpa": 3.5,
  "is_graduated": true,
  "description": "Tốt nghiệp loại Khá"
}
```

#### Lấy danh sách học vấn
```typescript
GET /user-profile/education?page=1&limit=10&degree=bachelor

Response:
{
  "data": [
    {
      "id": 1,
      "school_name": "Đại học Bách Khoa TP.HCM",
      "degree": "bachelor",
      "field_of_study": "Khoa học máy tính",
      "start_date": "2008-09-01",
      "end_date": "2012-06-30",
      "gpa": 3.5,
      "is_graduated": true
    }
  ],
  "pagination": {...}
}
```

### 4. Quản lý kinh nghiệm làm việc

#### Thêm kinh nghiệm
```typescript
POST /user-profile/experience
{
  "company_name": "ABC Technology",
  "position": "Software Developer",
  "start_date": "2020-01-01",
  "end_date": "2023-12-31",
  "is_current": false,
  "description": "Phát triển ứng dụng web với React và Node.js",
  "achievements": "Hoàn thành 15 projects, cải thiện performance 30%"
}
```

### 5. Quản lý chứng chỉ

#### Thêm chứng chỉ
```typescript
POST /user-profile/certificates
{
  "certificate_id": 1,
  "issued_date": "2023-01-15",
  "expiry_date": "2025-01-15",
  "score": 850,
  "level": "advanced",
  "certificate_url": "https://example.com/cert.pdf"
}
```

### 6. Quản lý kỹ năng

#### Thêm kỹ năng
```typescript
POST /user-profile/skills
{
  "skill_id": 1,
  "proficiency_level": "advanced",
  "years_of_experience": 5,
  "last_used": "2024-01-01",
  "is_primary": true
}
```

#### Lấy danh sách kỹ năng
```typescript
GET /user-profile/skills?proficiency_level=advanced&is_primary=true

Response:
{
  "data": [
    {
      "id": 1,
      "skill": {
        "name": "JavaScript",
        "category": "Programming Language"
      },
      "proficiency_level": "advanced",
      "years_of_experience": 5,
      "is_primary": true
    }
  ],
  "pagination": {...}
}
```

### 7. Upload Files

#### Upload avatar
```typescript
POST /user-profile/upload-avatar
Content-Type: multipart/form-data

FormData:
- file: [image file]

Response:
{
  "avatar_url": "https://example.com/avatars/user_1_avatar.jpg",
  "message": "Avatar uploaded successfully"
}
```

## Data Models

### UserInformation
```typescript
interface UserInformation {
  id: number;
  user_id: number;
  phone?: string;
  address?: string;
  date_of_birth?: Date;
  gender?: 'male' | 'female' | 'other';
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
  nationality?: string;
  id_number?: string;
  passport_number?: string;
  tax_code?: string;
  social_insurance_number?: string;
  bank_account?: string;
  bank_name?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  avatar_url?: string;
  position_id?: number;
  office_id?: number;
  role_id?: number;
  level_id?: number;
  language_id?: number;
}
```

### Children
```typescript
interface Children {
  id: number;
  user_id: number;
  name: string;
  date_of_birth: Date;
  gender: 'male' | 'female';
  relationship: string;
  is_dependent: boolean;
}
```

### Education
```typescript
interface Education {
  id: number;
  user_id: number;
  school_name: string;
  degree: 'high_school' | 'associate' | 'bachelor' | 'master' | 'doctorate' | 'certificate';
  field_of_study?: string;
  start_date: Date;
  end_date?: Date;
  gpa?: number;
  is_graduated: boolean;
  description?: string;
}
```

### Experience
```typescript
interface Experience {
  id: number;
  user_id: number;
  company_name: string;
  position: string;
  start_date: Date;
  end_date?: Date;
  is_current: boolean;
  description?: string;
  achievements?: string;
}
```

## Validation Rules

### Personal Information
- **Phone**: Format số điện thoại Việt Nam
- **Email**: Valid email format
- **Date of Birth**: Không được trong tương lai
- **Gender**: Enum ['male', 'female', 'other']

### Children
- **Name**: Required, min 2 characters
- **Date of Birth**: Không được trong tương lai
- **Relationship**: Required

### Education
- **School Name**: Required, min 3 characters
- **Degree**: Required enum
- **Start Date**: Required
- **End Date**: Phải sau start_date nếu có
- **GPA**: 0.0 - 4.0 scale

### Experience
- **Company Name**: Required, min 2 characters
- **Position**: Required, min 2 characters
- **Start Date**: Required
- **End Date**: Phải sau start_date nếu không phải current job

## Business Rules

### Profile Completeness
1. Thông tin cơ bản: name, email, phone
2. Thông tin mở rộng: address, date_of_birth, position
3. Documents: avatar, certificates

### File Upload
1. **Avatar**: 
   - Max size: 5MB
   - Formats: jpg, jpeg, png, gif
   - Auto resize to 300x300px

2. **Certificates**:
   - Max size: 10MB
   - Formats: pdf, jpg, jpeg, png

### Privacy
1. Chỉ user được xem/sửa profile của mình
2. HR/Admin có quyền xem tất cả profiles
3. Manager có quyền xem profile team members

## API Endpoints Summary

### Profile Management
- `GET /user-profile` - Xem profile đầy đủ
- `PUT /user-profile/information` - Cập nhật thông tin cá nhân
- `POST /user-profile/upload-avatar` - Upload avatar

### Children Management
- `GET /user-profile/children` - Lấy danh sách con (paginated)
- `POST /user-profile/children` - Thêm thông tin con
- `PUT /user-profile/children/:id` - Cập nhật thông tin con
- `DELETE /user-profile/children/:id` - Xóa thông tin con

### Education Management
- `GET /user-profile/education` - Lấy danh sách học vấn (paginated)
- `POST /user-profile/education` - Thêm học vấn
- `PUT /user-profile/education/:id` - Cập nhật học vấn
- `DELETE /user-profile/education/:id` - Xóa học vấn

### Experience Management
- `GET /user-profile/experience` - Lấy danh sách kinh nghiệm (paginated)
- `POST /user-profile/experience` - Thêm kinh nghiệm
- `PUT /user-profile/experience/:id` - Cập nhật kinh nghiệm
- `DELETE /user-profile/experience/:id` - Xóa kinh nghiệm

### Certificate Management
- `GET /user-profile/certificates` - Lấy danh sách chứng chỉ (paginated)
- `POST /user-profile/certificates` - Thêm chứng chỉ
- `PUT /user-profile/certificates/:id` - Cập nhật chứng chỉ
- `DELETE /user-profile/certificates/:id` - Xóa chứng chỉ

### Skill Management
- `GET /user-profile/skills` - Lấy danh sách kỹ năng (paginated)
- `POST /user-profile/skills` - Thêm kỹ năng
- `PUT /user-profile/skills/:id` - Cập nhật kỹ năng
- `DELETE /user-profile/skills/:id` - Xóa kỹ năng

## Dependencies

- `@nestjs/common`: NestJS core
- `prisma`: Database ORM
- `class-validator`: Input validation
- `class-transformer`: Data transformation
- `multer`: File upload handling

## Security

1. **Authorization**: Chỉ user được truy cập profile của mình
2. **File Upload**: Validate file type, size và scan malware
3. **Data Sanitization**: Clean input data trước khi lưu database
4. **Audit Log**: Log tất cả thay đổi profile quan trọng
