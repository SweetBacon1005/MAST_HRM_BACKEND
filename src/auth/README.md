# Authentication Module

Module xác thực và phân quyền cho hệ thống HRM.

## Tổng quan

Auth Module cung cấp các chức năng:

- ✅ Đăng nhập/Đăng ký với JWT
- ✅ Refresh token mechanism
- ✅ Role-based access control (RBAC)
- ✅ Password hashing với bcrypt
- ✅ Guards và Decorators
- ✅ Multiple authentication strategies
- ✅ Session management

## Cấu trúc thư mục

```
src/auth/
├── dto/                          # Data Transfer Objects
│   ├── login.dto.ts             # DTO cho đăng nhập
│   ├── register.dto.ts          # DTO cho đăng ký
│   ├── refresh-token.dto.ts     # DTO cho refresh token
│   └── tokens.dto.ts            # DTO cho token response
├── decorators/                   # Custom Decorators
│   ├── get-current-user.decorator.ts  # Lấy user hiện tại
│   ├── public.decorator.ts      # Đánh dấu endpoint public
│   └── roles.decorator.ts       # Đánh dấu roles required
├── guards/                       # Authentication Guards
│   ├── global-auth.guard.ts     # Global authentication guard
│   ├── jwt-auth.guard.ts        # JWT authentication guard
│   ├── local-auth.guard.ts      # Local authentication guard
│   └── roles.guard.ts           # Role-based authorization guard
├── strategies/                   # Passport Strategies
│   ├── jwt.strategy.ts          # JWT strategy
│   ├── jwt-refresh.strategy.ts  # JWT refresh strategy
│   └── local.strategy.ts        # Local (email/password) strategy
├── auth.controller.ts            # API Controller
├── auth.service.ts              # Business Logic Service
└── auth.module.ts               # NestJS Module
```

## Các chức năng chính

### 1. Đăng nhập

```typescript
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### 2. Đăng ký

```typescript
POST /auth/register
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "Nguyễn Văn A",
  "phone": "0123456789"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### 3. Refresh Token

```typescript
POST /auth/refresh
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### 4. Đăng xuất

```typescript
POST /auth/logout
Authorization: Bearer <access_token>

Response:
{
  "message": "Đăng xuất thành công"
}
```

### 5. Lấy thông tin user hiện tại

```typescript
GET /auth/me
Authorization: Bearer <access_token>

Response:
{
  "id": 1,
  "email": "user@example.com",
  "name": "Nguyễn Văn A",
  "role": "employee",
  "permissions": ["read:timesheet", "write:timesheet"]
}
```

## Strategies

### 1. Local Strategy

- Xác thực bằng email/password
- Sử dụng cho endpoint `/auth/login`
- Validate credentials và return user object

### 2. JWT Strategy

- Xác thực bằng JWT access token
- Extract user từ token payload
- Sử dụng cho các protected endpoints

### 3. JWT Refresh Strategy

- Xác thực bằng JWT refresh token
- Sử dụng để generate access token mới
- Có thời hạn dài hơn access token

## Guards

### 1. GlobalAuthGuard

- Guard mặc định cho toàn bộ application
- Tự động protect tất cả endpoints trừ những endpoint có `@Public()` decorator
- Kế thừa từ `JwtAuthGuard`

### 2. JwtAuthGuard

- Xác thực JWT access token
- Sử dụng JWT Strategy
- Có thể bypass với `@Public()` decorator

### 3. LocalAuthGuard

- Xác thực email/password
- Sử dụng Local Strategy
- Chỉ dùng cho login endpoint

### 4. RolesGuard

- Kiểm tra quyền truy cập dựa trên roles
- Sử dụng với `@Roles()` decorator
- Chạy sau authentication guard

## Decorators

### 1. @Public()

```typescript
@Public()
@Get('/public-endpoint')
async getPublicData() {
  return 'This is public data';
}
```

### 2. @Roles()

```typescript
@Roles('admin', 'hr')
@Get('/admin-only')
async getAdminData() {
  return 'This is admin data';
}
```

### 3. @GetCurrentUser()

```typescript
@Get('/profile')
async getProfile(@GetCurrentUser() user: any) {
  return user;
}
```

## JWT Configuration

### Access Token

- **Thời hạn**: 1 giờ (3600 seconds)
- **Algorithm**: HS256
- **Secret**: Từ environment variable `JWT_SECRET`

### Refresh Token

- **Thời hạn**: 7 ngày (604800 seconds)
- **Algorithm**: HS256
- **Secret**: Từ environment variable `JWT_REFRESH_SECRET`

## Password Security

### Hashing

- Sử dụng `bcryptjs` với salt rounds = 10
- Passwords được hash trước khi lưu database
- So sánh password bằng `bcrypt.compare()`

### Validation Rules

- Minimum length: 6 characters
- Phải có ít nhất 1 chữ cái và 1 số
- Không được chứa khoảng trắng

## Role-Based Access Control

### Roles

- **admin**: Toàn quyền hệ thống
- **hr**: Quản lý nhân sự
- **manager**: Quản lý team
- **employee**: Nhân viên thường

### Permission Matrix

```typescript
const PERMISSIONS = {
  admin: ['*'], // Tất cả permissions
  hr: [
    'read:users',
    'write:users',
    'read:timesheet',
    'write:timesheet',
    'approve:timesheet',
    'read:dayoff',
    'write:dayoff',
    'approve:dayoff',
  ],
  manager: [
    'read:team-timesheet',
    'approve:team-timesheet',
    'read:team-dayoff',
    'approve:team-dayoff',
  ],
  employee: [
    'read:own-timesheet',
    'write:own-timesheet',
    'read:own-dayoff',
    'write:own-dayoff',
  ],
};
```

## Usage Examples

### Protected Controller

```typescript
@Controller('protected')
@UseGuards(JwtAuthGuard)
export class ProtectedController {
  @Get()
  async getData(@GetCurrentUser() user: any) {
    return `Hello ${user.name}`;
  }
}
```

### Role-based Endpoint

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('/users')
  @Roles('admin', 'hr')
  async getAllUsers() {
    return this.usersService.findAll();
  }
}
```

### Public Endpoint

```typescript
@Controller('public')
export class PublicController {
  @Get('/health')
  @Public()
  async healthCheck() {
    return { status: 'OK' };
  }
}
```

## Error Handling

### Common Errors

- **401 Unauthorized**: Token không hợp lệ hoặc hết hạn
- **403 Forbidden**: Không đủ quyền truy cập
- **400 Bad Request**: Dữ liệu đầu vào không hợp lệ

### Error Messages

```typescript
{
  "status_code": 401,
  "message": "Email hoặc mật khẩu không đúng",
  "error": "Unauthorized"
}
```

## Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800

# Password Configuration
BCRYPT_SALT_ROUNDS=10
```

## Security Best Practices

1. **Token Storage**:
   - Access token trong memory/localStorage
   - Refresh token trong httpOnly cookie (recommended)

2. **Token Rotation**:
   - Refresh token được rotate mỗi lần sử dụng
   - Invalidate old tokens

3. **Rate Limiting**:
   - Limit login attempts
   - Implement account lockout

4. **HTTPS Only**:
   - Chỉ sử dụng HTTPS trong production
   - Set secure flags cho cookies

## Testing

```bash
# Unit tests
npm run test src/auth

# E2E tests
npm run test:e2e auth
```

## Dependencies

- `@nestjs/jwt`: JWT implementation
- `@nestjs/passport`: Passport integration
- `passport`: Authentication middleware
- `passport-local`: Local strategy
- `passport-jwt`: JWT strategy
- `bcryptjs`: Password hashing
- `class-validator`: Input validation
- `class-transformer`: Data transformation
