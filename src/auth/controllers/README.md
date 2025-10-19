# Admin API Controllers

Tài liệu này mô tả các API controllers dành cho trang admin của hệ thống HRM.

## 📋 Danh sách Controllers

### 1. **AdminController** (`/admin`)

Controller chính cho các chức năng quản trị cơ bản.

#### 🎯 Dashboard & Statistics

- `GET /admin/dashboard/stats` - Thống kê tổng quan hệ thống
- `GET /admin/dashboard/user-stats` - Thống kê người dùng theo vai trò
- `GET /admin/dashboard/division-stats` - Thống kê phòng ban và nhân sự

#### 👥 User Management

- `GET /admin/users` - Danh sách tất cả người dùng (có phân trang, tìm kiếm, lọc)
- `GET /admin/users/:id` - Chi tiết người dùng
- `PATCH /admin/users/:id` - Cập nhật thông tin người dùng
- `DELETE /admin/users/:id` - Xóa người dùng (soft delete)

#### 🔄 Bulk Operations

- `POST /admin/bulk/assign-roles` - Gán role hàng loạt
- `POST /admin/bulk/transfer-division` - Điều chuyển hàng loạt

---

### 2. **SystemAdminController** (`/system-admin`)

Controller cho các chức năng quản trị hệ thống nâng cao.

#### 🛡️ Role & Permission Management

- `POST /system-admin/roles` - Tạo role mới
- `PATCH /system-admin/roles/:id` - Cập nhật role
- `DELETE /system-admin/roles/:id` - Xóa role
- `POST /system-admin/permissions` - Tạo permission mới
- `DELETE /system-admin/permissions/:id` - Xóa permission

#### 🔍 System Monitoring

- `GET /system-admin/health-check` - Kiểm tra tình trạng hệ thống
- `GET /system-admin/database-stats` - Thống kê database

#### 🧹 Data Management

- `POST /system-admin/cleanup/soft-deleted` - Dọn dẹp dữ liệu đã xóa mềm
- `GET /system-admin/export/users` - Xuất danh sách người dùng
- `GET /system-admin/export/system-config` - Xuất cấu hình hệ thống

---

### 3. **RoleManagementController** (`/role-management`)

Controller cho quản lý phân quyền theo cấp bậc.

#### 🏗️ Role Hierarchy Management

- `GET /role-management/assignable-roles` - Lấy roles có thể gán
- `GET /role-management/hierarchy` - Xem cấu trúc phân cấp
- `POST /role-management/assign-role` - Gán role (với kiểm tra phân cấp)
- `GET /role-management/user/:userId/manageable` - Kiểm tra quyền quản lý user
- `GET /role-management/user/:userId/role-options` - Lấy roles có thể gán cho user cụ thể

#### 🔄 Personnel Transfer Management

- `GET /role-management/rotation-member/:rotationId/can-manage` - Kiểm tra quyền quản lý điều chuyển

---

### 4. **ReportsController** (`/reports`)

Controller cho các báo cáo và thống kê chi tiết.

#### ⏰ Attendance Reports

- `GET /reports/attendance/summary` - Báo cáo tổng hợp chấm công
- `GET /reports/attendance/late-statistics` - Thống kê đi muộn về sớm

#### 🏖️ Leave Reports

- `GET /reports/leave/summary` - Báo cáo tổng hợp nghỉ phép

#### ⏱️ Overtime Reports

- `GET /reports/overtime/summary` - Báo cáo tổng hợp tăng ca

#### 🔄 Personnel Transfer Reports

- `GET /reports/personnel-transfer/summary` - Báo cáo điều chuyển nhân sự

#### 📊 Comprehensive Dashboard

- `GET /reports/dashboard/comprehensive` - Dashboard tổng hợp tất cả báo cáo

---

## 🔐 Phân Quyền

### Permissions Required:

#### System Administration

- `system.admin` - Toàn quyền quản trị hệ thống
- `system.config` - Cấu hình hệ thống
- `system.backup` - Sao lưu dữ liệu

#### User Management

- `user.read` - Xem thông tin người dùng
- `user.create` - Tạo người dùng mới
- `user.update` - Cập nhật thông tin người dùng
- `user.delete` - Xóa người dùng

#### Role Management

- `role.read` - Xem thông tin vai trò
- `role.manage.employee` - Quản lý vai trò nhân viên
- `role.manage.team_leader` - Quản lý vai trò trưởng nhóm
- `role.manage.division_head` - Quản lý vai trò trưởng phòng ban
- `role.manage.project_manager` - Quản lý vai trò quản lý dự án
- `role.manage.hr_manager` - Quản lý vai trò quản lý nhân sự
- `role.manage.admin` - Quản lý vai trò quản trị viên
- `role.manage.all` - Quản lý tất cả vai trò

#### Personnel Transfer

- `personnel.transfer.read` - Xem điều chuyển nhân sự
- `personnel.transfer.create` - Tạo điều chuyển nhân sự
- `personnel.transfer.update` - Cập nhật điều chuyển nhân sự
- `personnel.transfer.approve` - Phê duyệt điều chuyển nhân sự
- `personnel.transfer.reject` - Từ chối điều chuyển nhân sự
- `personnel.transfer.delete` - Xóa điều chuyển nhân sự

#### Reports

- `report.read` - Xem báo cáo
- `report.export` - Xuất báo cáo
- `analytics.view` - Xem phân tích dữ liệu

---

## 🎯 Cấu Trúc Phân Cấp Vai Trò

```
Level 7: super_admin (Toàn quyền)
├── Level 6: admin
├── Level 5: hr_manager
├── Level 4: project_manager
├── Level 3: division_head
├── Level 2: team_leader
└── Level 1: employee
```

### Quy Tắc Phân Cấp:

- Mỗi cấp chỉ có thể quản lý các cấp thấp hơn
- `division_head` chỉ có thể sửa role cho `employee` và `team_leader`
- `hr_manager` có thể quản lý từ `employee` đến `project_manager`
- `admin` có thể quản lý tất cả trừ `super_admin`

---

## 📊 Các Tính Năng Chính

### 1. **Dashboard Tổng Quan**

- Thống kê người dùng, phòng ban, dự án
- Hoạt động gần đây
- Đơn yêu cầu đang chờ xử lý

### 2. **Quản Lý Người Dùng**

- Tìm kiếm, lọc theo vai trò, phòng ban, trạng thái
- Xem chi tiết đầy đủ thông tin user
- Cập nhật thông tin với kiểm tra quyền
- Xóa user với kiểm tra phân cấp

### 3. **Quản Lý Role & Permission**

- Tạo, sửa, xóa role với permissions
- Kiểm tra phân cấp khi gán role
- Xuất cấu hình hệ thống

### 4. **Báo Cáo Chi Tiết**

- Chấm công: tổng hợp, đi muộn về sớm
- Nghỉ phép: theo loại, trạng thái, user
- Tăng ca: theo dự án, user, thời gian
- Điều chuyển nhân sự: theo loại, phòng ban

### 5. **Thao Tác Hàng Loạt**

- Gán role cho nhiều user cùng lúc
- Điều chuyển nhiều user sang phòng ban khác
- Kiểm tra quyền cho từng thao tác

### 6. **Giám Sát Hệ Thống**

- Health check database
- Thống kê bảng dữ liệu
- Dọn dẹp dữ liệu cũ
- Xuất dữ liệu backup

---

## 🚀 Cách Sử Dụng

### 1. Authentication

Tất cả API đều yêu cầu JWT token:

```
Authorization: Bearer <jwt_token>
```

### 2. Pagination

Các API danh sách hỗ trợ phân trang:

```
GET /admin/users?page=1&limit=20&search=john&role=employee
```

### 3. Filtering & Search

Hỗ trợ tìm kiếm và lọc linh hoạt:

```
GET /admin/users?division=IT&status=ACTIVE&search=nguyen
```

### 4. Date Ranges

Báo cáo hỗ trợ lọc theo thời gian:

```
GET /reports/attendance/summary?start_date=2024-01-01&end_date=2024-01-31
```

---

## ⚠️ Lưu Ý Quan Trọng

1. **Phân Quyền Nghiêm Ngặt**: Tất cả thao tác đều được kiểm tra quyền theo cấp bậc
2. **Soft Delete**: Dữ liệu được xóa mềm, có thể khôi phục
3. **Audit Trail**: Tất cả thao tác đều được ghi log
4. **Transaction Safety**: Các thao tác quan trọng sử dụng database transaction
5. **Rate Limiting**: Cần implement rate limiting cho production
6. **Data Validation**: Tất cả input đều được validate nghiêm ngặt

---

## 🔧 Cấu Hình Môi Trường

Đảm bảo các biến môi trường sau được thiết lập:

```env
DATABASE_URL=mysql://user:password@localhost:3306/hrm_db
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 📝 Changelog

### Version 1.0.0

- ✅ Tạo AdminController với dashboard và user management
- ✅ Tạo SystemAdminController với role/permission management
- ✅ Tạo RoleManagementController với hierarchy system
- ✅ Tạo ReportsController với comprehensive reporting
- ✅ Implement phân quyền theo cấp bậc
- ✅ Thêm bulk operations
- ✅ System monitoring và health check
- ✅ Data export và backup features
