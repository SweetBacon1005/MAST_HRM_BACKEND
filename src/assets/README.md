# 🏢 **Assets Management Module**

Module quản lý tài sản công ty với đầy đủ chức năng CRUD cho HR, request tài sản cho user, và hệ thống duyệt request.

## 📋 **Tổng quan**

### **Tính năng chính:**
- ✅ **CRUD tài sản cho HR**: Tạo, xem, sửa, xóa tài sản
- ✅ **Gán/thu hồi tài sản**: Quản lý việc gán tài sản cho nhân viên
- ✅ **Request tài sản cho User**: Nhân viên có thể request tài sản cần thiết
- ✅ **Duyệt request cho HR**: HR có thể duyệt/từ chối request
- ✅ **Thống kê tài sản**: Báo cáo tổng quan về tài sản
- ✅ **Activity Logging**: Ghi lại tất cả hoạt động liên quan đến tài sản

### **Thay đổi quan trọng:**
- 🔄 **Thay thế `user_devices`**: Sử dụng bảng `assets` thay vì `user_devices`
- 📱 **Device từ Assets**: Thiết bị được quản lý như một loại tài sản với category là device types
- 🔗 **Tích hợp Auth**: API `/auth/profile` trả về devices từ `assets` table

## 🗄️ **Database Schema**

### **Assets Table:**
```sql
model assets {
  id                Int                 @id @default(autoincrement())
  name              String              @db.VarChar(255)
  description       String?             @db.Text
  asset_code        String              @unique @db.VarChar(100)
  category          String              @db.VarChar(100)
  brand             String?             @db.VarChar(100)
  model             String?             @db.VarChar(100)
  serial_number     String?             @unique @db.VarChar(100)
  purchase_date     DateTime?           @db.Date
  purchase_price    Decimal?            @db.Decimal(15, 2)
  warranty_end_date DateTime?           @db.Date
  location          String?             @db.VarChar(255)
  status            AssetStatus         @default(AVAILABLE)
  assigned_to       Int?
  assigned_date     DateTime?           @db.Date
  notes             String?             @db.Text
  created_by        Int
  created_at        DateTime            @default(now())
  updated_at        DateTime            @updatedAt
  deleted_at        DateTime?
}
```

### **Asset Requests Table:**
```sql
model asset_requests {
  id              Int                 @id @default(autoincrement())
  user_id         Int
  asset_id        Int?
  request_type    String              @db.VarChar(50) // 'REQUEST', 'RETURN', 'MAINTENANCE'
  category        String              @db.VarChar(100)
  description     String              @db.Text
  justification   String              @db.Text
  priority        String              @default("NORMAL") @db.VarChar(20)
  expected_date   DateTime?           @db.Date
  status          AssetRequestStatus  @default(PENDING)
  approved_by     Int?
  approved_at     DateTime?
  rejection_reason String?            @db.Text
  fulfilled_at    DateTime?
  returned_at     DateTime?
  notes           String?             @db.Text
  created_at      DateTime            @default(now())
  updated_at      DateTime            @updatedAt
  deleted_at      DateTime?
}
```

### **Enums:**
```sql
enum AssetCategory {
  LAPTOP, DESKTOP, MONITOR, KEYBOARD, MOUSE, 
  HEADPHONE, PHONE, TABLET, FURNITURE, EQUIPMENT, OTHER
}

enum AssetStatus {
  AVAILABLE    // Có sẵn
  ASSIGNED     // Đã gán
  MAINTENANCE  // Bảo trì
  RETIRED      // Ngừng sử dụng
  LOST         // Mất
  DAMAGED      // Hỏng
}

enum AssetRequestType {
  REQUEST      // Yêu cầu cấp phát
  RETURN       // Trả lại
  MAINTENANCE  // Bảo trì
}

enum AssetRequestStatus {
  PENDING      // Chờ duyệt
  APPROVED     // Đã duyệt
  REJECTED     // Từ chối
  FULFILLED    // Đã giao
  RETURNED     // Đã trả
  CANCELLED    // Đã hủy
}

enum AssetPriority {
  LOW, NORMAL, HIGH, URGENT
}
```

## 🔐 **Phân quyền**

### **HR/Admin/Super Admin:**
- ✅ Tất cả CRUD operations cho assets
- ✅ Gán/thu hồi tài sản
- ✅ Xem tất cả requests
- ✅ Duyệt/từ chối requests
- ✅ Giao tài sản theo request
- ✅ Xem thống kê

### **User (Employee):**
- ✅ Xem thiết bị được gán cho mình
- ✅ Tạo request tài sản
- ✅ Xem requests của mình
- ✅ Xem chi tiết request

## 📡 **API Endpoints**

### **🏢 Asset Management (HR Only)**

#### **1. Tạo tài sản**
```http
POST /assets
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Laptop Dell XPS 13",
  "asset_code": "LAPTOP-001",
  "category": "LAPTOP",
  "brand": "Dell",
  "model": "XPS 13 9320",
  "serial_number": "DL123456789",
  "purchase_date": "2024-01-15",
  "purchase_price": "25000000",
  "warranty_end_date": "2026-01-15",
  "location": "Tầng 2 - Phòng IT",
  "notes": "Tài sản mới"
}
```

#### **2. Lấy danh sách tài sản**
```http
GET /assets?page=1&limit=10&search=laptop&category=LAPTOP&status=AVAILABLE
Authorization: Bearer <token>
```

#### **3. Lấy chi tiết tài sản**
```http
GET /assets/:id
Authorization: Bearer <token>
```

#### **4. Cập nhật tài sản**
```http
PATCH /assets/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "ASSIGNED",
  "assigned_to": 123,
  "assigned_date": "2024-01-20",
  "notes": "Đã gán cho user"
}
```

#### **5. Xóa tài sản**
```http
DELETE /assets/:id
Authorization: Bearer <token>
```

#### **6. Thống kê tài sản**
```http
GET /assets/statistics
Authorization: Bearer <token>
```

### **🔄 Asset Assignment (HR Only)**

#### **7. Gán tài sản cho user**
```http
POST /assets/:id/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": 123,
  "notes": "Gán laptop cho developer mới"
}
```

#### **8. Thu hồi tài sản từ user**
```http
POST /assets/:id/unassign
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Thu hồi do user nghỉ việc"
}
```

### **📱 User Devices**

#### **9. Lấy thiết bị của user hiện tại**
```http
GET /assets/my-devices
Authorization: Bearer <token>
```

### **📝 Asset Requests**

#### **10. Tạo request tài sản (User)**
```http
POST /assets/requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "request_type": "REQUEST",
  "category": "LAPTOP",
  "description": "Laptop cho công việc development, cần cấu hình cao với RAM 16GB",
  "justification": "Laptop hiện tại đã hỏng, cần thay thế để tiếp tục công việc",
  "priority": "HIGH",
  "expected_date": "2024-02-01",
  "notes": "Cần gấp trong tuần này"
}
```

#### **11. Lấy danh sách requests**
```http
GET /assets/requests?page=1&limit=10&status=PENDING&user_id=123
Authorization: Bearer <token>
```

#### **12. Lấy chi tiết request**
```http
GET /assets/requests/:id
Authorization: Bearer <token>
```

### **✅ Request Approval (HR Only)**

#### **13. Duyệt/từ chối request**
```http
POST /assets/requests/:id/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "APPROVE",
  "asset_id": 123,
  "notes": "Đã phê duyệt và gán laptop Dell XPS 13"
}
```

```http
POST /assets/requests/:id/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "REJECT",
  "rejection_reason": "Không có tài sản phù hợp trong kho",
  "notes": "Vui lòng chờ đợt mua sắm tiếp theo"
}
```

#### **14. Giao tài sản theo request**
```http
POST /assets/requests/:id/fulfill
Authorization: Bearer <token>
Content-Type: application/json

{
  "asset_id": 123,
  "notes": "Đã giao tài sản và hướng dẫn sử dụng"
}
```

## 📊 **Response Examples**

### **Asset List Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Laptop Dell XPS 13",
      "asset_code": "LAPTOP-001",
      "category": "LAPTOP",
      "brand": "Dell",
      "model": "XPS 13 9320",
      "status": "ASSIGNED",
      "assigned_user": {
        "id": 123,
        "email": "user@example.com",
        "user_information": {
          "name": "Nguyễn Văn A"
        }
      },
      "created_at": "2024-01-15T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "total_pages": 10
  }
}
```

### **Asset Statistics Response:**
```json
{
  "assets": {
    "total": 100,
    "available": 60,
    "assigned": 35,
    "maintenance": 5,
    "utilization_rate": 35
  },
  "requests": {
    "pending": 10,
    "approved": 5
  },
  "categories": [
    {
      "category": "LAPTOP",
      "count": 50
    },
    {
      "category": "Desktop",
      "count": 30
    }
  ]
}
```

### **User Devices Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Laptop Dell XPS 13",
      "asset_code": "LAPTOP-001",
      "category": "LAPTOP",
      "brand": "Dell",
      "model": "XPS 13 9320",
      "serial_number": "DL123456789",
      "assigned_date": "2024-01-20",
      "notes": "Thiết bị mới",
      "purchase_date": "2024-01-15",
      "warranty_end_date": "2026-01-15",
      "location": "Tầng 2 - Phòng IT"
    }
  ]
}
```

## 🔄 **Integration với Auth Module**

API `/auth/profile` đã được cập nhật để trả về thiết bị từ `assets` table:

```json
{
  "assigned_devices": [
    {
      "id": 1,
      "name": "Laptop Dell XPS 13",
      "type": "laptop",
      "code": "LAPTOP-001",
      "brand": "Dell",
      "model": "XPS 13 9320",
      "serial": "DL123456789",
      "assigned_date": "2024-01-20",
      "notes": "Thiết bị mới"
    }
  ]
}
```

## 📝 **Categories**

Các loại tài sản được hỗ trợ:
- **Devices**: `Laptop`, `Desktop`, `Monitor`, `Keyboard`, `Mouse`, `Headphone`, `Phone`, `Tablet`
- **Other Assets**: `Furniture`, `Equipment`, `Other`

## 🔍 **Search & Filter**

### **Asset Search:**
- Tìm theo tên, mã tài sản, mô tả, thương hiệu, model
- Lọc theo category, status, assigned_to, brand

### **Request Search:**
- Tìm theo mô tả, lý do, category
- Lọc theo status, request_type, category, priority, user_id, approved_by

## 📊 **Activity Logging**

Tất cả hoạt động được ghi log:
- ✅ Tạo/sửa/xóa tài sản
- ✅ Gán/thu hồi tài sản
- ✅ Tạo request
- ✅ Duyệt/từ chối request
- ✅ Giao tài sản

## 🚀 **Workflow**

### **Request Workflow:**
1. **User tạo request** → Status: `PENDING`
2. **HR duyệt request** → Status: `APPROVED` hoặc `REJECTED`
3. **HR giao tài sản** → Status: `FULFILLED` + Asset status: `ASSIGNED`
4. **User trả tài sản** → Status: `RETURNED` + Asset status: `AVAILABLE`

### **Asset Lifecycle:**
1. **Tạo tài sản** → Status: `AVAILABLE`
2. **Gán cho user** → Status: `ASSIGNED`
3. **Bảo trì** → Status: `MAINTENANCE`
4. **Thu hồi** → Status: `AVAILABLE`
5. **Ngừng sử dụng** → Status: `RETIRED`

## ⚠️ **Lưu ý**

- Không thể xóa tài sản đang được gán
- Không thể xóa tài sản có request đang chờ xử lý
- Asset code và serial number phải unique
- Chỉ HR/Admin/Super Admin mới có thể quản lý tài sản
- User chỉ có thể xem thiết bị của mình và tạo request
