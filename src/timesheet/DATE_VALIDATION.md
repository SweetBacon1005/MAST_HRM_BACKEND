# Date Validation trong Timesheet API

## 🎯 Tổng quan

Đã thêm validation toàn diện cho tất cả các tham số ngày trong Timesheet API để đảm bảo:
- ✅ Format ngày đúng (YYYY-MM-DD)
- ✅ Ngày hợp lệ (không có 30/02, 32/01...)
- ✅ Logic nghiệp vụ (start_date <= end_date)
- ✅ Giới hạn thời gian hợp lý

## 📋 Validation Rules

### 1. **Format Validation**
```typescript
// Chỉ chấp nhận format: YYYY-MM-DD
✅ "2024-12-21"
❌ "21/12/2024"
❌ "2024-12-1"
❌ "21-12-2024"
```

### 2. **Date Logic Validation**
```typescript
// Kiểm tra ngày có tồn tại
✅ "2024-02-29" (năm nhuận)
❌ "2023-02-29" (không phải năm nhuận)
❌ "2024-02-30"
❌ "2024-13-01"
```

### 3. **Business Logic Validation**

#### **Date Range:**
- `start_date` <= `end_date`
- Khoảng thời gian tối đa: 365 ngày
- Tránh query quá lớn ảnh hưởng performance

#### **Work Date:**
- Không quá 30 ngày trong tương lai
- Không quá 90 ngày trong quá khứ
- Tránh tạo timesheet cho thời gian không hợp lý

## 🔧 DTOs và Pipes

### **DTOs**
```typescript
// Cho date range queries
DateRangeQueryDto {
  start_date?: string; // optional
  end_date?: string;   // optional
}

// Cho single date queries  
SingleDateQueryDto {
  date?: string; // optional
}

// Cho bulk operations
BulkLockTimesheetsDto {
  start_date!: string;  // required
  end_date!: string;    // required
  user_ids?: number[];  // optional
}
```

### **Validation Pipes**
```typescript
DateValidationPipe          // Single date validation
DateRangeValidationPipe     // Date range validation
WorkDateValidationPipe      // Work date with business rules
```

## 📡 Endpoints đã được validate

### **Query Parameters** (GET endpoints)
```typescript
// Timesheet queries
GET /timesheet/my-timesheets?start_date=2024-12-01&end_date=2024-12-31
GET /timesheet/statistics/attendance?start_date=2024-12-01&end_date=2024-12-31
GET /timesheet/statistics/my-attendance?start_date=2024-12-01&end_date=2024-12-31
```

### **Path Parameters** (GET endpoints)
```typescript
// Single date in URL
GET /timesheet/day-off-info/2024-12-21
```

### **Body Parameters** (POST endpoints)
```typescript
// Daily creation
POST /timesheet/daily/create
{
  "date": "2024-12-21"
}

// Bulk creation
POST /timesheet/daily/bulk-create  
{
  "work_date": "2024-12-21",
  "user_ids": [1, 2, 3]
}

// Cronjob auto creation
POST /timesheet/cronjob/auto-create-daily
{
  "date": "2024-12-21"
}

// Bulk lock
POST /timesheet/bulk-lock
{
  "start_date": "2024-12-01",
  "end_date": "2024-12-31", 
  "user_ids": [1, 2, 3]
}
```

## ❌ Error Messages

### **Format Errors**
```json
{
  "message": "Ngày phải có định dạng YYYY-MM-DD (VD: 2024-12-21)",
  "error": "Bad Request",
  "statusCode": 400
}
```

### **Logic Errors**
```json
{
  "message": "Ngày không tồn tại trong lịch",
  "error": "Bad Request", 
  "statusCode": 400
}

{
  "message": "Ngày bắt đầu không được lớn hơn ngày kết thúc",
  "error": "Bad Request",
  "statusCode": 400
}

{
  "message": "Khoảng thời gian không được vượt quá 365 ngày",
  "error": "Bad Request",
  "statusCode": 400
}
```

### **Business Rules Errors**
```json
{
  "message": "Không thể tạo timesheet quá 30 ngày trong tương lai",
  "error": "Bad Request",
  "statusCode": 400
}

{
  "message": "Không thể tạo timesheet quá 90 ngày trong quá khứ", 
  "error": "Bad Request",
  "statusCode": 400
}
```

## 🔍 Testing Examples

### **Valid Requests**
```bash
# Date range query
curl "http://localhost:3000/timesheet/my-timesheets?start_date=2024-12-01&end_date=2024-12-31"

# Single date
curl "http://localhost:3000/timesheet/day-off-info/2024-12-21"

# Work date creation
curl -X POST http://localhost:3000/timesheet/daily/create \
  -H "Content-Type: application/json" \
  -d '{"date": "2024-12-21"}'
```

### **Invalid Requests**
```bash
# Wrong format
curl "http://localhost:3000/timesheet/my-timesheets?start_date=21/12/2024"
# → Error: "Ngày phải có định dạng YYYY-MM-DD"

# Invalid date
curl "http://localhost:3000/timesheet/day-off-info/2024-02-30"
# → Error: "Ngày không tồn tại trong lịch"

# Range error  
curl "http://localhost:3000/timesheet/my-timesheets?start_date=2024-12-31&end_date=2024-12-01"
# → Error: "Ngày bắt đầu không được lớn hơn ngày kết thúc"
```

## 💡 Benefits

1. **Data Integrity**: Đảm bảo dữ liệu ngày luôn đúng format và hợp lệ
2. **Better UX**: Error messages rõ ràng bằng tiếng Việt
3. **Performance**: Giới hạn range queries tránh overload DB
4. **Business Logic**: Enforce rules về thời gian tạo timesheet
5. **Consistency**: Standardized validation across all endpoints
6. **Security**: Prevent invalid input attacks

## 🚀 Future Improvements

- [ ] Thêm timezone validation
- [ ] Custom date formats cho different regions  
- [ ] Validate working days only (skip weekends)
- [ ] Integration với holiday calendar
- [ ] Date range presets (this week, this month, etc.)
