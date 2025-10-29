# Division Module

Module quản lý phòng ban và phân công nhân viên vào phòng ban.

## Tính năng

### Division Management

- **CRUD Operations**: Tạo, đọc, cập nhật, xóa phòng ban
- **Hierarchical Structure**: Hỗ trợ cấu trúc phòng ban phân cấp (parent-child)
- **Member Management**: Quản lý thành viên trong phòng ban
- **Project Integration**: Liên kết với các dự án của phòng ban

### Division Assignment Management

- **Assignment CRUD**: Quản lý phân công nhân viên vào phòng ban
- **Role Assignment**: Gán role cho user trong division
- **Team Assignment**: Gán user vào team trong division
- **Flexible Management**: Quản lý mô tả và team leader
- **Conflict Prevention**: Tránh trùng lặp phân công user trong cùng division

## API Endpoints

### Division Management

- `POST /divisions` - Tạo phòng ban mới
- `GET /divisions` - Lấy danh sách phòng ban có phân trang
- `GET /divisions/hierarchy` - Lấy cây phòng ban theo cấu trúc phân cấp
- `GET /divisions/:id` - Lấy thông tin chi tiết phòng ban
- `GET /divisions/:id/members` - Lấy danh sách thành viên của phòng ban
- `PATCH /divisions/:id` - Cập nhật thông tin phòng ban
- `DELETE /divisions/:id` - Xóa phòng ban

### Division Assignment Management

- `POST /divisions/user-assignments` - Thêm user vào division
- `GET /divisions/user-assignments` - Lấy danh sách user assignments có phân trang
- `GET /divisions/user-assignments/:id` - Lấy thông tin chi tiết assignment
- `PATCH /divisions/user-assignments/:id` - Cập nhật user assignment
- `DELETE /divisions/user-assignments/:id` - Xóa user khỏi division
- `GET /divisions/:id/users` - Lấy danh sách users trong division

## Permissions

### Division Permissions

- `division.read` - Xem thông tin phòng ban
- `division.create` - Tạo phòng ban mới
- `division.update` - Cập nhật thông tin phòng ban
- `division.delete` - Xóa phòng ban

### Division Assignment Permissions

- `division.assignment.read` - Xem phân công phòng ban
- `division.assignment.create` - Tạo phân công phòng ban
- `division.assignment.update` - Cập nhật phân công phòng ban
- `division.assignment.delete` - Xóa phân công phòng ban

## Data Models

### Division (divisions)

```typescript
{
  id: number;
  name: string;
  is_active_project: boolean;
  type?: number;
  status?: number;
  level?: number;
  address?: string;
  parent_id?: number;
  founding_at: Date;
  description?: string;
  total_member?: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}
```

### User Division Assignment (user_division)

```typescript
{
  id: number;
  userId: number;
  user: User;
  role_id?: number;
  role?: Role;
  divisionId?: number;
  division?: Division;
  teamId?: number;
  team?: Team;
  description?: string;
  teamLeader?: number;
  created_at: Date;
  updated_at: Date;
}
```

## Business Rules

### Division Rules

1. **Unique Name**: Tên phòng ban phải duy nhất
2. **Parent Validation**: Phòng ban cha phải tồn tại
3. **Self-Reference Prevention**: Phòng ban không thể là cha của chính nó
4. **Deletion Constraints**:
   - Không thể xóa phòng ban có phòng ban con
   - Không thể xóa phòng ban có nhân viên
   - Không thể xóa phòng ban có dự án

### User Division Assignment Rules

1. **Entity Validation**: Division, User, Role (nếu có), Team (nếu có) phải tồn tại
2. **Team Validation**: Team phải thuộc về division được chỉ định
3. **Conflict Prevention**: User không được gán vào cùng division nhiều lần
4. **Role Consistency**: Role phải phù hợp với division context

## Pagination & Filtering

### Division Pagination

- `search` - Tìm kiếm theo tên phòng ban
- `parent_id` - Lọc theo phòng ban cha
- `type` - Lọc theo loại phòng ban
- `status` - Lọc theo trạng thái
- `level` - Lọc theo cấp độ
- `is_active_project` - Lọc theo trạng thái dự án hoạt động

### User Division Assignment Pagination

- `search` - Tìm kiếm theo tên user hoặc division
- `divisionId` - Lọc theo division
- `userId` - Lọc theo user
- `teamId` - Lọc theo team
- `role_id` - Lọc theo role

## Usage Examples

### Tạo phòng ban mới

```typescript
POST /divisions
{
  "name": "Phòng Phát triển Phần mềm",
  "founding_at": "2024-01-01",
  "description": "Phòng ban chuyên phát triển các ứng dụng web và mobile",
  "parent_id": 1,
  "level": 2
}
```

### Lấy cây phòng ban

```typescript
GET /divisions/hierarchy?parent_id=1
```

### Thêm user vào division

```typescript
POST /divisions/user-assignments
{
  "userId": 5,
  "divisionId": 1,
  "role_id": 2,
  "teamId": 1,
  "description": "Developer chính của team",
  "teamLeader": 3
}
```

### Lấy danh sách phòng ban với filter

```typescript
GET /divisions?search=Phát triển&level=2&page=1&limit=10
```

## Dependencies

- `@nestjs/common`: NestJS core
- `@nestjs/swagger`: API documentation
- `@prisma/client`: Database ORM
- `class-validator`: DTO validation
- `class-transformer`: Data transformation

## Related Modules

- **Users Module**: Quản lý người dùng được phân công
- **Projects Module**: Quản lý dự án thuộc phòng ban
- **Auth Module**: Xác thực và phân quyền
- **Contracts Module**: Liên kết với hợp đồng lao động
