# Day Off Approval API

## 🎯 Overview

API để duyệt/từ chối đơn nghỉ phép với validation chặt chẽ - chỉ cho phép **APPROVED** hoặc **REJECTED**.

## 📡 API Endpoint

### **PATCH** `/timesheet/day-off-requests/:id/status`

**Mô tả**: Cập nhật trạng thái đơn nghỉ phép (Duyệt/Từ chối)

**Permissions**: `manager`, `admin`

**Authentication**: Required (JWT Bearer Token)

## 📋 Request

### **Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `number` | ID của đơn nghỉ phép |

### **Request Body**
```typescript
{
  "status": "APPROVED" | "REJECTED",
  "rejected_reason"?: string // Bắt buộc khi status = "REJECTED"
}
```

#### **Body Schema**
```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["APPROVED", "REJECTED"],
      "description": "Trạng thái duyệt: APPROVED (duyệt) hoặc REJECTED (từ chối)"
    },
    "rejected_reason": {
      "type": "string",
      "nullable": true,
      "description": "Lý do từ chối (bắt buộc khi status = REJECTED)"
    }
  },
  "required": ["status"]
}
```

## ✅ Validation Rules

### 1. **Status Validation**
- ✅ Chỉ cho phép: `"APPROVED"` hoặc `"REJECTED"`
- ❌ Không cho phép: `"PENDING"` hoặc giá trị khác

### 2. **Rejected Reason Validation**
- ✅ **Bắt buộc** khi `status = "REJECTED"`
- ✅ Optional khi `status = "APPROVED"`
- ✅ Phải là string không rỗng

### 3. **Business Logic**
- ✅ Chỉ `manager` và `admin` được phép duyệt
- ✅ Tự động tạo timesheet khi duyệt (`APPROVED`)
- ✅ Lưu lý do từ chối khi từ chối (`REJECTED`)

## 📤 Response

### **Success Response (200)**
```json
{
  "id": 1,
  "user_id": 123,
  "start_date": "2024-12-25T00:00:00.000Z",
  "end_date": "2024-12-25T00:00:00.000Z",
  "duration": "FULL_DAY",
  "type": "PAID",
  "reason": "Nghỉ lễ Giáng sinh",
  "status": "APPROVED",
  "approved_by": 456,
  "approved_at": "2024-12-20T10:30:00.000Z",
  "rejected_reason": null,
  "created_at": "2024-12-15T08:00:00.000Z",
  "updated_at": "2024-12-20T10:30:00.000Z"
}
```

### **Error Responses**

#### **400 Bad Request - Invalid Status**
```json
{
  "message": [
    "Trạng thái chỉ được là APPROVED (duyệt) hoặc REJECTED (từ chối)"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

#### **400 Bad Request - Missing Rejected Reason**
```json
{
  "message": [
    "Lý do từ chối là bắt buộc khi từ chối đơn nghỉ phép"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

#### **404 Not Found**
```json
{
  "message": "Không tìm thấy đơn nghỉ phép",
  "error": "Not Found",
  "statusCode": 404
}
```

## 🧪 Usage Examples

### **✅ Approve Day Off Request**
```bash
curl -X PATCH http://localhost:3000/timesheet/day-off-requests/1/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED"
  }'
```

### **✅ Reject Day Off Request**
```bash
curl -X PATCH http://localhost:3000/timesheet/day-off-requests/1/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "REJECTED",
    "rejected_reason": "Không đủ ngày phép còn lại trong năm"
  }'
```

### **❌ Invalid Requests**

#### **Invalid Status**
```bash
curl -X PATCH http://localhost:3000/timesheet/day-off-requests/1/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PENDING"
  }'
# → Error: "Trạng thái chỉ được là APPROVED (duyệt) hoặc REJECTED (từ chối)"
```

#### **Missing Rejected Reason**
```bash
curl -X PATCH http://localhost:3000/timesheet/day-off-requests/1/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "REJECTED"
  }'
# → Error: "Lý do từ chối là bắt buộc khi từ chối đơn nghỉ phép"
```

## 🔄 Business Flow

### **When APPROVED:**
1. ✅ Update status to `APPROVED`
2. ✅ Set `approved_by` = current user ID
3. ✅ Set `approved_at` = current timestamp
4. ✅ **Auto-create timesheet** for day off period
5. ✅ Return updated day off record

### **When REJECTED:**
1. ✅ Update status to `REJECTED`
2. ✅ Set `rejected_reason` (required)
3. ✅ Return updated day off record

## 🔒 Security

- **Authentication**: JWT Bearer token required
- **Authorization**: Only `manager` and `admin` roles
- **Validation**: Strict input validation with custom DTO
- **Business Logic**: Prevents invalid state transitions

## 💡 Benefits

1. **Clear Intent**: Only approval/rejection actions allowed
2. **Data Integrity**: Required reason for rejection
3. **User Experience**: Clear error messages in Vietnamese
4. **Audit Trail**: Tracks who approved/rejected and when
5. **Automation**: Auto-creates timesheets on approval
6. **Type Safety**: Strong TypeScript typing with enums

## 🚀 Implementation Details

### **DTO (UpdateDayOffStatusDto)**
```typescript
export class UpdateDayOffStatusDto {
  @IsEnum([DayOffStatus.APPROVED, DayOffStatus.REJECTED])
  status: DayOffStatus.APPROVED | DayOffStatus.REJECTED;

  @ValidateIf((o) => o.status === DayOffStatus.REJECTED)
  @IsString()
  rejected_reason?: string;
}
```

### **Service Logic**
- Validates business rules
- Handles Prisma relations properly
- Creates timesheets automatically on approval
- Enforces required rejected_reason

**Result**: Clean, secure, and user-friendly day off approval system! 🎉
