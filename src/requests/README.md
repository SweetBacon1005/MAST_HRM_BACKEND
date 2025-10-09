# 📋 Requests Module - API Documentation

## 🎯 Tổng quan

Module Requests cung cấp API tổng hợp để quản lý tất cả các loại request trong hệ thống HRM:
- **Remote Work Requests** - Yêu cầu làm việc từ xa
- **Day-off Requests** - Yêu cầu nghỉ phép
- **Overtime Requests** - Yêu cầu tăng ca
- **Late/Early Requests** - Yêu cầu đi muộn/về sớm

## 🚀 API Endpoints

### 📝 Tạo Requests

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/requests/remote-work` | Tạo yêu cầu làm việc từ xa |
| `POST` | `/requests/day-off` | Tạo yêu cầu nghỉ phép |
| `POST` | `/requests/overtime` | Tạo yêu cầu tăng ca |
| `POST` | `/requests/late-early` | Tạo yêu cầu đi muộn/về sớm |

### 📊 Lấy danh sách Requests

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `GET` | `/requests/remote-work` | Lấy tất cả remote work requests | Admin/Manager |
| `GET` | `/requests/remote-work/my` | Lấy remote work requests của tôi | User |
| `GET` | `/requests/day-off` | Lấy tất cả day-off requests | Admin/Manager |
| `GET` | `/requests/day-off/my` | Lấy day-off requests của tôi | User |
| `GET` | `/requests/overtime` | Lấy tất cả overtime requests | Admin/Manager |
| `GET` | `/requests/overtime/my` | Lấy overtime requests của tôi | User |
| `GET` | `/requests/late-early` | Lấy tất cả late/early requests | Admin/Manager |
| `GET` | `/requests/late-early/my` | Lấy late/early requests của tôi | User |

### ✅ Duyệt/Từ chối Requests (Universal API)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `POST` | `/requests/:type/:id/approve` | Duyệt request (tất cả loại) | Admin/Manager |
| `POST` | `/requests/:type/:id/reject` | Từ chối request (tất cả loại) | Admin/Manager |

**Supported Types:**
- `remote-work` - Remote work requests
- `day-off` - Day-off requests  
- `overtime` - Overtime requests
- `late-early` - Late/Early requests

### 💰 Leave Balance Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/requests/leave-balance` | Lấy thông tin leave balance của tôi |
| `GET` | `/requests/leave-balance/transactions` | Lấy lịch sử giao dịch leave balance |
| `POST` | `/requests/leave-balance/check` | Kiểm tra có đủ leave balance không |

## 📝 Request Examples

### 1. Tạo Late/Early Request

```bash
POST /requests/late-early
Content-Type: application/json

{
  "user_id": 1,
  "work_date": "2024-01-15",
  "request_type": "LATE",
  "late_minutes": 30,
  "reason": "Tắc đường do mưa lớn"
}
```

### 2. Duyệt Request (Universal)

```bash
POST /requests/late-early/1/approve
Authorization: Bearer <token>
```

### 3. Từ chối Request (Universal)

```bash
POST /requests/day-off/5/reject
Content-Type: application/json
Authorization: Bearer <token>

{
  "rejected_reason": "Không có lý do chính đáng"
}
```

### 4. Lấy danh sách với Pagination

```bash
GET /requests/late-early/my?limit=20&offset=0
Authorization: Bearer <token>
```

## 🔧 Business Logic

### Late/Early Request Validation
- ✅ Không được tạo request trùng ngày
- ✅ Không được tạo request cho ngày quá xa (>7 ngày)
- ✅ Validate minutes theo request_type:
  - `LATE`: Bắt buộc có `late_minutes`
  - `EARLY`: Bắt buộc có `early_minutes`  
  - `BOTH`: Bắt buộc có cả hai

### Day-off Request với Leave Balance
- ✅ Kiểm tra `paid_leave_balance` trước khi tạo PAID request
- ✅ Tự động trừ balance khi approve PAID request
- ✅ Tự động hoàn trả balance khi reject đã approve PAID request
- ✅ Tạo `leave_transactions` để audit trail

### Auto Integration
- ✅ Tự động tạo timesheets cho day-off requests
- ✅ Tự động cập nhật `late_time_approved`, `early_time_approved` trong timesheets
- ✅ Link requests với timesheets tương ứng

## 📊 Response Format

Tất cả API đều trả về format chuẩn:

```json
{
  "data": [...],
  "pagination": {
    "current_page": 1,
    "per_page": 50,
    "total": 100,
    "total_pages": 2,
    "has_next_page": true,
    "has_prev_page": false
  }
}
```

## 🔐 Authorization

- **User**: Chỉ có thể tạo và xem requests của mình
- **Admin/Manager**: Có thể xem tất cả requests và approve/reject
- **JWT Token**: Bắt buộc cho tất cả endpoints

## 🌱 Seed Data

Hệ thống đã có sẵn sample data cho user `user@example.com`:
- Remote work requests
- Day-off requests  
- Overtime requests
- Late/early requests

## 🚀 Deployment

1. **Database Migration:**
   ```bash
   npx prisma migrate dev --name add_late_early_requests
   ```

2. **Seed Data:**
   ```bash
   npx prisma db seed
   ```

3. **Build & Start:**
   ```bash
   npm run build
   npm run start:prod
   ```