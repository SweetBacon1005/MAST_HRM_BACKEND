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
- **Time-based Assignment**: Phân công theo thời gian (start_date, end_date)
- **Contract Integration**: Liên kết với hợp đồng lao động
- **Conflict Prevention**: Tránh trùng lặp phân công trong cùng thời gian

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

- `POST /divisions/assignments` - Tạo phân công phòng ban
- `GET /divisions/assignments` - Lấy danh sách phân công có phân trang
- `GET /divisions/assignments/:id` - Lấy thông tin chi tiết phân công
- `PATCH /divisions/assignments/:id` - Cập nhật phân công
- `DELETE /divisions/assignments/:id` - Xóa phân công

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

### Division Assignment (divisions_assignments)

```typescript
{
  id: number;
  division_id: number;
  user_id: number;
  start_date: Date;
  end_date: Date;
  contract_id?: number;
  note?: string;
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

### Assignment Rules

1. **Entity Validation**: Division, User, Contract (nếu có) phải tồn tại
2. **Date Validation**: Ngày bắt đầu phải nhỏ hơn ngày kết thúc
3. **Conflict Prevention**: Không được trùng lặp phân công trong cùng thời gian
4. **Time Range Overlap**: Kiểm tra chồng lấn thời gian phân công

## Pagination & Filtering

### Division Pagination

- `search` - Tìm kiếm theo tên phòng ban
- `parent_id` - Lọc theo phòng ban cha
- `type` - Lọc theo loại phòng ban
- `status` - Lọc theo trạng thái
- `level` - Lọc theo cấp độ
- `is_active_project` - Lọc theo trạng thái dự án hoạt động

### Assignment Pagination

- `division_id` - Lọc theo phòng ban
- `user_id` - Lọc theo người dùng
- `start_date` - Lọc theo ngày bắt đầu
- `end_date` - Lọc theo ngày kết thúc

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

### Tạo phân công nhân viên

```typescript
POST /divisions/assignments
{
  "division_id": 1,
  "user_id": 5,
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "note": "Phân công làm việc tại phòng ban mới"
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
