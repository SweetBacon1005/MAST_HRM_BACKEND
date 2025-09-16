# Users Module

Module quản lý người dùng cơ bản cho hệ thống HRM.

## Tổng quan

Users Module cung cấp các chức năng:
- ✅ CRUD operations cho users
- ✅ Phân trang và tìm kiếm users
- ✅ Quản lý thông tin cơ bản của user
- ✅ Integration với authentication
- ✅ Soft delete functionality
- ✅ Role và permission management
- ✅ User status management

## Cấu trúc thư mục

```
src/users/
├── dto/                          # Data Transfer Objects
│   ├── create-user.dto.ts       # DTO tạo user mới
│   ├── update-user.dto.ts       # DTO cập nhật user
│   └── pagination-queries.dto.ts # DTO phân trang và filter
├── users.controller.ts           # API Controller
├── users.service.ts             # Business Logic Service
└── users.module.ts              # NestJS Module
```

## Các chức năng chính

### 1. Tạo user mới

```typescript
POST /users
{
  "name": "Nguyễn Văn A",
  "email": "user@example.com",
  "password": "password123",
  "phone": "0123456789"
}

Response:
{
  "id": 1,
  "name": "Nguyễn Văn A",
  "email": "user@example.com",
  "phone": "0123456789",
  "email_verified_at": "2024-01-15T10:30:00Z",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### 2. Lấy danh sách users với phân trang

```typescript
GET /users?page=1&limit=10&search=nguyen&role=employee

Response:
{
  "data": [
    {
      "id": 1,
      "name": "Nguyễn Văn A",
      "email": "user@example.com",
      "email_verified_at": "2024-01-15T10:30:00Z",
      "user_information": {
        "role": {
          "id": 1,
          "name": "Employee"
        },
        "position": {
          "id": 1,
          "name": "Software Developer"
        },
        "office": {
          "id": 1,
          "name": "TP.HCM Office"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "total_pages": 5
  }
}
```

### 3. Lấy thông tin user theo ID

```typescript
GET /users/1

Response:
{
  "id": 1,
  "name": "Nguyễn Văn A",
  "email": "user@example.com",
  "phone": "0123456789",
  "email_verified_at": "2024-01-15T10:30:00Z",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "user_information": {
    "phone": "0123456789",
    "address": "123 Đường ABC",
    "date_of_birth": "1990-01-01",
    "role": {
      "id": 1,
      "name": "Employee"
    },
    "position": {
      "id": 1,
      "name": "Software Developer"
    },
    "office": {
      "id": 1,
      "name": "TP.HCM Office"
    }
  }
}
```

### 4. Cập nhật user

```typescript
PUT /users/1
{
  "name": "Nguyễn Văn A Updated",
  "phone": "0987654321"
}

Response:
{
  "id": 1,
  "name": "Nguyễn Văn A Updated",
  "email": "user@example.com",
  "phone": "0987654321",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

### 5. Xóa user (soft delete)

```typescript
DELETE /users/1

Response:
{
  "message": "User đã được xóa thành công"
}
```

### 6. Tìm user theo email

```typescript
GET /users/by-email/user@example.com

Response:
{
  "id": 1,
  "name": "Nguyễn Văn A",
  "email": "user@example.com",
  "email_verified_at": "2024-01-15T10:30:00Z"
}
```

## Data Model

### User Entity
```typescript
interface User {
  id: number;
  name: string;
  email: string;
  password: string;           // Hashed password
  phone?: string;
  email_verified_at?: Date;
  remember_token?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;         // Soft delete
}
```

### Related Entities
- **UserInformation**: Thông tin chi tiết (1-1 relationship)
- **Role**: Vai trò của user (many-to-one)
- **Position**: Chức vụ (many-to-one)  
- **Office**: Văn phòng làm việc (many-to-one)

## Query Filters

### Pagination Parameters
- **page**: Trang hiện tại (default: 1)
- **limit**: Số items per page (default: 10, max: 100)
- **sort_by**: Field để sort (default: 'created_at')
- **sort_order**: 'asc' hoặc 'desc' (default: 'desc')

### Search Parameters
- **search**: Tìm kiếm theo name hoặc email
- **role**: Filter theo role name
- **position**: Filter theo position name
- **office**: Filter theo office name
- **status**: Filter theo trạng thái (active/inactive)

### Date Range Filters
- **created_from**: Ngày tạo từ
- **created_to**: Ngày tạo đến
- **verified**: Filter theo email verification status

## Validation Rules

### Create User
```typescript
{
  name: {
    required: true,
    minLength: 2,
    maxLength: 255
  },
  email: {
    required: true,
    isEmail: true,
    unique: true
  },
  password: {
    required: true,
    minLength: 6,
    pattern: /^(?=.*[A-Za-z])(?=.*\d)/ // Ít nhất 1 chữ cái và 1 số
  },
  phone: {
    optional: true,
    pattern: /^[0-9]{10,11}$/ // Số điện thoại VN
  }
}
```

### Update User
```typescript
{
  name: {
    optional: true,
    minLength: 2,
    maxLength: 255
  },
  phone: {
    optional: true,
    pattern: /^[0-9]{10,11}$/
  },
  // Email và password không được update qua endpoint này
}
```

## Business Rules

### User Creation
1. Email phải unique trong hệ thống
2. Password được hash bằng bcrypt với salt rounds = 10
3. Tự động set `email_verified_at` khi tạo user
4. Default role là 'employee' nếu không specify

### User Update
1. Không được update email và password qua endpoint này
2. Chỉ admin/HR mới được update thông tin user khác
3. User có thể update một số thông tin cơ bản của mình

### User Deletion
1. Sử dụng soft delete (set deleted_at timestamp)
2. User đã xóa không xuất hiện trong queries thường
3. Chỉ admin mới được xóa user
4. Không thể xóa user đang có timesheet active

### Security
1. Password luôn được exclude khỏi response
2. Chỉ admin/HR được xem danh sách tất cả users
3. User thường chỉ xem được thông tin cơ bản của đồng nghiệp

## Service Methods

### Core CRUD
```typescript
class UsersService {
  create(createUserDto: CreateUserDto): Promise<User>
  findAll(): Promise<User[]>
  findAllPaginated(paginationDto: UsersPaginationDto): Promise<PaginatedResult<User>>
  findOne(id: number): Promise<User>
  findByEmail(email: string): Promise<User>
  update(id: number, updateUserDto: UpdateUserDto): Promise<User>
  remove(id: number): Promise<void>
}
```

### Utility Methods
```typescript
class UsersService {
  // Kiểm tra email đã tồn tại
  isEmailExists(email: string): Promise<boolean>
  
  // Lấy users theo role
  findByRole(roleName: string): Promise<User[]>
  
  // Lấy users theo office
  findByOffice(officeId: number): Promise<User[]>
  
  // Verify email
  verifyEmail(userId: number): Promise<User>
  
  // Active/Inactive user
  setUserStatus(userId: number, isActive: boolean): Promise<User>
}
```

## API Endpoints Summary

### Public Endpoints
- None (Tất cả endpoints require authentication)

### Protected Endpoints
- `GET /users` - Lấy danh sách users (Admin/HR only)
- `GET /users/:id` - Lấy thông tin user theo ID
- `POST /users` - Tạo user mới (Admin/HR only)
- `PUT /users/:id` - Cập nhật user (Admin/HR only)
- `DELETE /users/:id` - Xóa user (Admin only)
- `GET /users/by-email/:email` - Tìm user theo email (Internal use)

### Role-based Access
- **Admin**: Full access tất cả endpoints
- **HR**: Read/Write access, không delete
- **Manager**: Read access cho team members
- **Employee**: Read access cho thông tin cơ bản

## Error Handling

### Common Errors
```typescript
// User not found
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}

// Email already exists
{
  "statusCode": 400,
  "message": "Email đã tồn tại",
  "error": "Bad Request"
}

// Validation error
{
  "statusCode": 400,
  "message": [
    "name must be longer than or equal to 2 characters",
    "email must be an email"
  ],
  "error": "Bad Request"
}
```

## Integration Points

### Authentication Module
- Sử dụng `UsersService.findByEmail()` để validate login
- Sử dụng `UsersService.create()` để register user mới

### User Profile Module
- Extend user information với detailed profile
- 1-1 relationship qua `user_information` table

### Timesheet Module
- Reference users trong timesheet records
- Validate user existence khi tạo timesheet

## Performance Considerations

1. **Database Indexes**:
   - Primary key trên `id`
   - Unique index trên `email`
   - Index trên `deleted_at` cho soft delete queries

2. **Query Optimization**:
   - Sử dụng select specific fields thay vì select *
   - Include related data chỉ khi cần thiết
   - Implement proper pagination

3. **Caching**:
   - Cache frequently accessed user data
   - Cache role và permission lookups

## Dependencies

- `@nestjs/common`: NestJS core
- `prisma`: Database ORM  
- `bcryptjs`: Password hashing
- `class-validator`: Input validation
- `class-transformer`: Data transformation

## Testing

```bash
# Unit tests
npm run test src/users

# E2E tests
npm run test:e2e users
```
