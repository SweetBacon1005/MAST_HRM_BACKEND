# Projects Module

Module quản lý dự án trong hệ thống HRM.

## Tính năng

### CRUD Operations
- ✅ Tạo dự án mới
- ✅ Lấy danh sách dự án (có phân trang và filter)
- ✅ Lấy thông tin chi tiết dự án
- ✅ Cập nhật thông tin dự án
- ✅ Xóa dự án (soft delete)
- ✅ Lấy danh sách thành viên của dự án

### Filters
- Tìm kiếm theo tên hoặc mã dự án
- Lọc theo trạng thái (OPEN, CLOSED, PENDING, IN_PROGRESS, COMPLETED)
- Lọc theo phòng ban
- Lọc theo team
- Lọc theo loại dự án

## API Endpoints

### 1. Tạo dự án mới
```
POST /projects
```

**Body:**
```json
{
  "name": "Website Thương mại điện tử",
  "code": "ECOM-001",
  "status": "OPEN",
  "division_id": 1,
  "team_id": 1,
  "contract_type": "FIXED_PRICE",
  "project_type": "WEB_DEVELOPMENT",
  "billable": 0.8,
  "budget": 100000,
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "description": "Dự án phát triển website thương mại điện tử"
}
```

### 2. Lấy danh sách dự án
```
GET /projects?page=1&limit=10&search=Website&status=OPEN&division_id=1
```

### 3. Lấy chi tiết dự án
```
GET /projects/:id
```

### 4. Lấy danh sách thành viên dự án
```
GET /projects/:id/members
```

### 5. Cập nhật dự án
```
PATCH /projects/:id
```

### 6. Xóa dự án
```
DELETE /projects/:id
```

## Permissions Required

- `project.create` - Tạo dự án
- `project.read` - Xem dự án
- `project.update` - Cập nhật dự án
- `project.delete` - Xóa dự án

## Database Schema

```prisma
model projects {
  id                   Int
  name                 String
  code                 String
  status               ProjectStatus
  division_id          Int?
  team_id              Int?
  contract_type        ContractType?
  project_type         ProjectType?
  billable             Float?
  budget               Float?
  start_date           DateTime
  end_date             DateTime
  description          String?
  // ... more fields
}
```

## Usage Example

```typescript
// Inject service
constructor(private readonly projectsService: ProjectsService) {}

// Create project
const project = await this.projectsService.create(createProjectDto);

// Get projects with pagination
const projects = await this.projectsService.findAll({
  page: 1,
  limit: 10,
  status: 'OPEN'
});

// Get project members
const members = await this.projectsService.getProjectMembers(projectId);
```

## Notes

- Mã dự án (code) phải unique
- Ngày bắt đầu phải nhỏ hơn ngày kết thúc
- Division và Team phải tồn tại trong hệ thống
- Soft delete được sử dụng cho việc xóa dự án

