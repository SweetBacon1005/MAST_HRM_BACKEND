# Module Requests

## Mô tả
Module Requests quản lý tất cả các loại đơn từ của nhân viên bao gồm: làm việc từ xa (remote work), nghỉ phép (day off), làm thêm giờ (overtime), đi muộn/về sớm (late/early), và bổ sung chấm công (forgot checkin). Module hỗ trợ phân quyền theo role và quy trình approval.

## Nghiệp vụ chính

### 1. Quản lý Requests
- Tạo các loại đơn từ
- Xem danh sách requests (theo quyền)
- Xem chi tiết request
- Cập nhật request (chỉ khi PENDING hoặc REJECTED)
- Xóa request (chỉ khi PENDING)

### 2. Approval Workflow
- Duyệt request (APPROVED)
- Từ chối request (REJECTED) với lý do

### 3. Leave Balance Management
- Xem số dư phép năm
- Xem lịch sử giao dịch leave balance
- Kiểm tra đủ phép để tạo đơn

### 4. Enhanced Filtering
- Lọc theo leads_only (chỉ requests từ leadership)
- Lọc theo requester_role
- Lọc theo high_priority_only
- Lọc theo team/division

## Các loại Requests

### 1. Remote Work Request
Đơn xin làm việc từ xa

### 2. Day Off Request
Đơn xin nghỉ phép (có lương/không lương)

### 3. Overtime Request
Đơn xin làm thêm giờ

### 4. Late/Early Request
Đơn xin đi muộn hoặc về sớm

### 5. Forgot Checkin Request
Đơn xin bổ sung chấm công khi quên checkin/checkout

## API Endpoints

### GET /requests
**Mô tả:** Lấy tất cả requests theo phân quyền role với enhanced filtering

**Permission required:** `request.read`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số bản ghi trên trang (default: 10)
- `status` (optional): PENDING, APPROVED, REJECTED
- `start_date` (optional): Từ ngày
- `end_date` (optional): Đến ngày
- `division_id` (optional): Lọc theo division (Admin only)
- `team_id` (optional): Lọc theo team
- `leads_only` (optional): Chỉ requests từ leadership roles
- `requester_role` (optional): Lọc theo role người tạo
- `high_priority_only` (optional): Chỉ requests có priority cao

**Phân quyền:**
- **Admin**: Xem tất cả requests
- **Division Head**: Xem requests trong division
- **Team Leader**: Xem requests trong team
- **Project Manager**: Xem requests của team members
- **Employee**: Chỉ xem requests của mình

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "type": "day_off",
      "user_id": 5,
      "status": "PENDING",
      "work_date": "2024-01-25",
      "created_at": "2024-01-20T10:00:00Z",
      "user": {
        "id": 5,
        "email": "user@example.com",
        "user_information": {
          "name": "Nguyen Van A",
          "position": {
            "name": "Developer"
          }
        },
        "user_roles": [
          {
            "role": {
              "name": "employee"
            }
          }
        ]
      }
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "total_pages": 5
  },
  "metadata": {
    "access_scope": "DIVISION_ONLY",
    "managed_divisions": [1, 2],
    "managed_teams": [],
    "filters_applied": {
      "leads_only": false,
      "division_restriction": true,
      "division_id": 1
    }
  }
}
```

---

### GET /requests/my/all
**Mô tả:** Lấy tất cả requests của tôi

**Permission required:** `request.read`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:** Giống GET /requests

**Response:** Giống GET /requests

---

### GET /requests/my/stats
**Mô tả:** Thống kê requests của tôi

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "total_requests": 50,
  "pending": 5,
  "approved": 40,
  "rejected": 5,
  "by_type": {
    "remote_work": 10,
    "day_off": 20,
    "overtime": 15,
    "late_early": 3,
    "forgot_checkin": 2
  }
}
```

---

## Remote Work Requests

### POST /requests/remote-work
**Mô tả:** Tạo đơn xin làm việc từ xa

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "work_date": "2024-01-25",
  "reason": "Cần tập trung làm việc ở nhà",
  "location": "Nhà riêng"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 5,
  "work_date": "2024-01-25T00:00:00Z",
  "reason": "Cần tập trung làm việc ở nhà",
  "location": "Nhà riêng",
  "status": "PENDING",
  "created_at": "2024-01-20T10:00:00Z"
}
```

---

### GET /requests/remote-work
**Mô tả:** Lấy danh sách đơn remote work (Admin/Division Head/Manager)

**Permission required:** `request.read`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:** Giống GET /requests

**Response:** Tương tự GET /requests

---

### GET /requests/remote-work/my
**Mô tả:** Lấy danh sách đơn remote work của tôi

**Headers:** `Authorization: Bearer <access_token>`

**Response:** Tương tự GET /requests

---

### PATCH /requests/remote-work/:id
**Mô tả:** Cập nhật đơn remote work (chỉ khi PENDING hoặc REJECTED)

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "work_date": "2024-01-26",
  "reason": "Lý do cập nhật",
  "location": "Địa điểm mới"
}
```

---

### DELETE /requests/remote-work/:id
**Mô tả:** Xóa đơn remote work (chỉ khi PENDING)

**Headers:** `Authorization: Bearer <access_token>`

---

## Day Off Requests

### POST /requests/day-off
**Mô tả:** Tạo đơn xin nghỉ phép

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "start_date": "2024-01-25",
  "end_date": "2024-01-26",
  "leave_type": "PAID",
  "reason": "Nghỉ phép năm",
  "contact_info": "+84901234567"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 5,
  "start_date": "2024-01-25T00:00:00Z",
  "end_date": "2024-01-26T00:00:00Z",
  "leave_type": "PAID",
  "reason": "Nghỉ phép năm",
  "contact_info": "+84901234567",
  "status": "PENDING",
  "total_days": 2,
  "created_at": "2024-01-20T10:00:00Z"
}
```

**Validation:**
- Kiểm tra đủ số dư phép (nếu PAID)
- start_date <= end_date

---

### GET /requests/day-off
**Mô tả:** Lấy danh sách đơn nghỉ phép (Admin/Division Head/Manager)

**Permission required:** `request.read`

---

### GET /requests/day-off/my
**Mô tả:** Lấy danh sách đơn nghỉ phép của tôi

---

### PATCH /requests/day-off/:id
**Mô tả:** Cập nhật đơn nghỉ phép

---

### DELETE /requests/day-off/:id
**Mô tả:** Xóa đơn nghỉ phép

---

## Overtime Requests

### POST /requests/overtime
**Mô tả:** Tạo đơn xin làm thêm giờ

**Request Body:**
```json
{
  "work_date": "2024-01-25",
  "start_time": "18:00",
  "end_time": "21:00",
  "reason": "Gấp deadline dự án",
  "task_description": "Hoàn thành tính năng payment"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 5,
  "work_date": "2024-01-25T00:00:00Z",
  "start_time": "18:00:00",
  "end_time": "21:00:00",
  "total_hours": 3,
  "reason": "Gấp deadline dự án",
  "task_description": "Hoàn thành tính năng payment",
  "status": "PENDING",
  "created_at": "2024-01-20T10:00:00Z"
}
```

---

### GET /requests/overtime
**Mô tả:** Lấy danh sách đơn làm thêm giờ

---

### GET /requests/overtime/my
**Mô tả:** Lấy danh sách đơn làm thêm giờ của tôi

---

## Late/Early Requests

### POST /requests/late-early
**Mô tả:** Tạo request đi muộn/về sớm

**Request Body:**
```json
{
  "work_date": "2024-01-25",
  "type": "LATE",
  "expected_time": "09:30",
  "reason": "Đi khám bệnh"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 5,
  "work_date": "2024-01-25T00:00:00Z",
  "type": "LATE",
  "expected_time": "09:30:00",
  "reason": "Đi khám bệnh",
  "status": "PENDING",
  "created_at": "2024-01-20T10:00:00Z"
}
```

**Types:**
- `LATE`: Đi muộn
- `EARLY`: Về sớm

---

### GET /requests/late-early
**Mô tả:** Lấy danh sách late/early requests

---

### GET /requests/late-early/my
**Mô tả:** Lấy danh sách late/early requests của tôi

---

## Forgot Checkin Requests

### POST /requests/forgot-checkin
**Mô tả:** Tạo đơn xin bổ sung chấm công

**Request Body:**
```json
{
  "work_date": "2024-01-24",
  "checkin_time": "08:30",
  "checkout_time": "17:30",
  "reason": "Quên chấm công"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 5,
  "work_date": "2024-01-24T00:00:00Z",
  "checkin_time": "08:30:00",
  "checkout_time": "17:30:00",
  "reason": "Quên chấm công",
  "status": "PENDING",
  "created_at": "2024-01-25T10:00:00Z"
}
```

---

### GET /requests/forgot-checkin
**Mô tả:** Lấy tất cả đơn xin bổ sung chấm công

---

### GET /requests/forgot-checkin/my
**Mô tả:** Lấy đơn xin bổ sung chấm công của tôi

---

## Universal Approve/Reject Endpoints

### POST /requests/:type/:id/approve
**Mô tả:** Duyệt request (tất cả loại)

**Permission required:** `request.approve`

**Headers:** `Authorization: Bearer <access_token>`

**Params:**
- `type`: remote-work | day-off | overtime | late-early | forgot-checkin
- `id`: ID của request

**Response:**
```json
{
  "id": 1,
  "status": "APPROVED",
  "approved_by": 3,
  "approved_at": "2024-01-20T15:00:00Z"
}
```

**Quyền duyệt:**
- **Division Head**: Duyệt requests trong division
- **Team Leader**: Duyệt requests trong team
- **Admin**: Duyệt requests của mình và division_head

---

### POST /requests/:type/:id/reject
**Mô tả:** Từ chối request (tất cả loại)

**Permission required:** `request.reject`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "rejected_reason": "Không có lý do chính đáng"
}
```

**Response:**
```json
{
  "id": 1,
  "status": "REJECTED",
  "approved_by": 3,
  "rejected_at": "2024-01-20T15:00:00Z",
  "rejected_reason": "Không có lý do chính đáng"
}
```

---

### GET /requests/:type/:id
**Mô tả:** Lấy chi tiết request theo ID và loại

**Permission required:** `request.read`

**Params:**
- `type`: remote_work | day_off | overtime | late_early | forgot_checkin
- `id`: ID của request

---

## Leave Balance APIs

### GET /requests/leave-balance
**Mô tả:** Lấy thông tin leave balance của tôi

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "user_id": 5,
  "year": 2024,
  "annual_paid_leave_quota": 12,
  "paid_leave_balance": 10,
  "unpaid_leave_balance": 0,
  "compensatory_leave_balance": 2,
  "remaining_paid_days": 80,
  "used_paid_days": 16
}
```

**Lưu ý:** Số ngày tính theo giờ (1 day = 8 hours)

---

### GET /requests/leave-balance/transactions
**Mô tả:** Lấy lịch sử giao dịch leave balance

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `limit` (optional): Số bản ghi (default: 50)
- `offset` (optional): Offset (default: 0)

**Response:**
```json
{
  "transactions": [
    {
      "id": 1,
      "user_id": 5,
      "transaction_type": "DEDUCTION",
      "leave_type": "PAID",
      "amount": 1,
      "balance_after": 10,
      "reason": "Nghỉ phép năm",
      "created_at": "2024-01-15T00:00:00Z"
    }
  ],
  "total": 25
}
```

---

### POST /requests/leave-balance/check
**Mô tả:** Kiểm tra có đủ leave balance để tạo đơn không

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "leave_type": "PAID",
  "requested_days": 2
}
```

**Response:**
```json
{
  "has_sufficient_balance": true,
  "current_balance": 10,
  "requested_days": 2,
  "remaining_after": 8
}
```

---

## Enums

### ApprovalStatus
- `PENDING`: Chờ duyệt
- `APPROVED`: Đã duyệt
- `REJECTED`: Bị từ chối

### LeaveType
- `PAID`: Nghỉ phép có lương
- `UNPAID`: Nghỉ phép không lương
- `SICK`: Nghỉ ốm
- `MATERNITY`: Nghỉ thai sản
- `COMPENSATORY`: Nghỉ bù

### LateEarlyType
- `LATE`: Đi muộn
- `EARLY`: Về sớm

## Business Rules

### 1. Leave Balance
- Tự động trừ leave balance khi day-off request được duyệt
- Tự động hoàn leave balance khi day-off request bị xóa/rejected
- Kiểm tra đủ balance trước khi tạo đơn PAID

### 2. Date Validation
- work_date, start_date, end_date phải hợp lệ
- start_date <= end_date (day-off)
- start_time < end_time (overtime)

### 3. Update/Delete Rules
- Chỉ update khi PENDING hoặc REJECTED
- Chỉ delete khi PENDING
- Chỉ owner mới được update/delete

### 4. Approval Rules
- Division Head duyệt requests trong division
- Team Leader duyệt requests trong team
- Admin duyệt requests của division_head

## Enhanced Filtering

### leads_only
Chỉ lấy requests từ các leadership roles:
- team_leader
- division_head
- project_manager
- hr_manager

### high_priority_only
Requests có priority cao từ:
- Leadership roles
- Urgent requests

### requester_role
Lọc requests theo role của người tạo

## Liên kết với các module khác
- **Timesheet Module**: Tạo timesheet khi approved
- **Leave Balance Module**: Quản lý số dư phép
- **Division Module**: Phân quyền theo division/team
- **Users Module**: Thông tin nhân viên
- **Notifications Module**: Gửi thông báo
