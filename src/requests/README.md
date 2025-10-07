# Requests Module

Module quản lý tất cả các loại request trong hệ thống HRM.

## 📋 Tổng quan

Module này được tách riêng từ timesheet module để quản lý tập trung tất cả các loại request:
- **Remote Work Requests**: Đơn xin làm việc từ xa
- **Day Off Requests**: Đơn xin nghỉ phép  
- **Overtime Requests**: Đơn xin làm thêm giờ

## 🏗️ Kiến trúc

### Base Request Service
- `BaseRequestService<TCreateDto, TEntity>`: Abstract class chứa logic chung
- Cung cấp workflow approve/reject chuẩn hóa
- Validation và notification hooks

### Specific Services
- `RemoteWorkRequestService`: Xử lý remote work requests
- `DayOffRequestService`: Xử lý day-off requests (wrapper cho logic cũ)
- `OvertimeRequestService`: Xử lý overtime requests (wrapper cho logic cũ)

### Main Service
- `RequestsService`: Orchestrator cho tất cả request types
- Cung cấp unified API cho controller

## 🚀 API Endpoints

### Overview
- `GET /requests/my/all` - Lấy tất cả requests của user
- `GET /requests/my/stats` - Thống kê requests của user

### Remote Work Requests
- `POST /requests/remote-work` - Tạo đơn remote work
- `GET /requests/remote-work/my` - Danh sách remote work requests
- `GET /requests/remote-work/my/paginated` - Danh sách có phân trang

### Approval (Manager/Admin only)
- `PATCH /requests/:type/:id/approve` - Duyệt request
- `PATCH /requests/:type/:id/reject` - Từ chối request

## 📊 Database Schema

### remote_work_requests
```sql
CREATE TABLE remote_work_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  work_date DATE NOT NULL,
  remote_type ENUM('OFFICE','REMOTE','HYBRID') DEFAULT 'REMOTE',
  reason VARCHAR(500),
  note TEXT,
  status ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  approved_by INT,
  approved_at DATETIME,
  rejected_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  UNIQUE KEY unique_user_work_date_active (user_id, work_date, deleted_at)
);
```

## 🔄 Request Workflow

### 1. Tạo Request
```typescript
// User tạo request
const request = await service.createRequestEntity(dto);
```

### 2. Validation
```typescript
// Tự động validate
const validation = await service.validateRequest(dto);
if (!validation.isValid) {
  throw new BadRequestException(validation.errors.join(', '));
}
```

### 3. Approval Process
```typescript
// Manager/Admin approve
const result = await service.approveRequest(id, approverId);

// Tự động trigger post-approval actions
await service.onRequestApproved(request);
```

### 4. Integration với Timesheet
- **Remote Work**: Tự động cập nhật `timesheet.remote` field
- **Day Off**: Tự động tạo timesheet với day_off_id
- **Overtime**: Tự động tạo/cập nhật timesheet với type='OVERTIME'

## 🎯 Lợi ích của kiến trúc mới

### ✅ Ưu điểm
1. **Tách biệt concerns**: Request logic tách khỏi timesheet
2. **Chuẩn hóa workflow**: Tất cả request đều có chung approval flow
3. **Dễ mở rộng**: Thêm request type mới chỉ cần extend BaseRequestService
4. **Maintainable**: Code tổ chức rõ ràng, dễ debug
5. **Reusable**: Base service có thể tái sử dụng cho các request khác

### 🔧 Extensibility
Để thêm request type mới:

```typescript
// 1. Tạo DTO
export class CreateNewRequestDto { ... }

// 2. Extend BaseRequestService
@Injectable()
export class NewRequestService extends BaseRequestService<CreateNewRequestDto, NewRequest> {
  getRequestType() { return RequestType.NEW_TYPE; }
  getTableName() { return 'new_requests'; }
  
  async validateRequest(dto) { ... }
  async createRequestEntity(dto) { ... }
}

// 3. Thêm vào RequestsService
// 4. Thêm endpoints vào controller
```

## 📝 Migration Notes

### Từ Timesheet Module
- Day-off và Overtime requests vẫn sử dụng logic cũ (wrapper)
- Remote work requests là implementation mới hoàn toàn
- API endpoints cũ vẫn hoạt động bình thường

### Database Changes
- Thêm bảng `remote_work_requests`
- Cập nhật `users` table với relations mới
- Không ảnh hưởng đến data hiện tại

## 🚦 Status

- ✅ Base Request Service
- ✅ Remote Work Requests (full implementation)
- ✅ Day Off Requests (wrapper)  
- ✅ Overtime Requests (wrapper)
- ✅ Unified API endpoints
- ✅ Database schema
- ⏳ Statistics & reporting
- ⏳ Notification system
- ⏳ Advanced filtering
