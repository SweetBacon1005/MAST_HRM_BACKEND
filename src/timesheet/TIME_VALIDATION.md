# Time Validation trong CreateTimesheetDto

## 🎯 Tổng quan

Đã thêm validation toàn diện cho tất cả các trường thời gian trong `CreateTimesheetDto` để đảm bảo:
- ✅ Format thời gian đúng
- ✅ Giá trị hợp lý (không âm, không quá lớn)
- ✅ Logic nghiệp vụ (checkout sau checkin, approved <= actual)
- ✅ Error messages tiếng Việt rõ ràng

## 📋 Validation Rules đã áp dụng

### 1. **Ngày làm việc (work_date)**
```typescript
@Matches(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Ngày làm việc phải có định dạng YYYY-MM-DD (VD: 2024-12-21)',
})
```
- **Format**: YYYY-MM-DD
- **Required**: Bắt buộc
- **Ví dụ**: `"2024-12-21"`

### 2. **Check-in/Check-out Times**
```typescript
@IsCheckoutAfterCheckin('checkin', {
  message: 'Thời gian check-out phải sau thời gian check-in',
})
```
- **Format**: ISO DateTime string
- **Logic**: checkout > checkin
- **Ví dụ**: `"2024-02-09T08:30:00.000Z"`

### 3. **Chuỗi Check-in Checkout**
```typescript
@IsTimeRange({
  message: 'Chuỗi check-in checkout phải có định dạng HH:MM-HH:MM và thời gian hợp lệ',
})
```
- **Format**: HH:MM-HH:MM
- **Logic**: start_time < end_time
- **Ví dụ**: `"08:30-17:30"`

### 4. **Thời gian đi muộn/về sớm**
```typescript
@Min(0, { message: 'Thời gian đi muộn không được âm' })
@Max(480, { message: 'Thời gian đi muộn không quá 480 phút (8 giờ)' })
```
- **Range**: 0-480 phút (0-8 giờ)
- **Áp dụng**: `late_time`, `early_time`

### 5. **Thời gian đi muộn được duyệt**
```typescript
@IsApprovedLateTimeValid('late_time', {
  message: 'Thời gian đi muộn được duyệt không được lớn hơn thời gian đi muộn thực tế',
})
```
- **Logic**: `late_time_approved <= late_time`
- **Range**: 0-480 phút

### 6. **Tiền phạt**
```typescript
@Min(0, { message: 'Tiền phạt không được âm' })
@Max(10000000, { message: 'Tiền phạt không quá 10,000,000 VNĐ' })
```
- **Range**: 0-10,000,000 VNĐ
- **Unit**: VNĐ

### 7. **Giờ làm việc (buổi sáng/chiều)**
```typescript
@Min(0, { message: 'Giờ làm buổi sáng không được âm' })
@Max(480, { message: 'Giờ làm buổi sáng không quá 480 phút (8 giờ)' })
```
- **Range**: 0-480 phút (0-8 giờ)
- **Áp dụng**: `work_time_morning`, `work_time_afternoon`

### 8. **Tổng thời gian làm việc**
```typescript
@Min(0, { message: 'Tổng thời gian làm việc không được âm' })
@Max(960, { message: 'Tổng thời gian làm việc không quá 960 phút (16 giờ)' })
```
- **Range**: 0-960 phút (0-16 giờ)
- **Logic**: Cho phép overtime

### 9. **Thời gian nghỉ trưa**
```typescript
@Min(0, { message: 'Thời gian nghỉ trưa không được âm' })
@Max(120, { message: 'Thời gian nghỉ trưa không quá 120 phút (2 giờ)' })
```
- **Range**: 0-120 phút (0-2 giờ)
- **Logic**: Hợp lý cho nghỉ trưa

## 🔧 Custom Validators được sử dụng

### 1. **IsTimeRange**
- Validate format HH:MM-HH:MM
- Kiểm tra start_time < end_time
- Validate giờ/phút hợp lệ (0-23:0-59)

### 2. **IsCheckoutAfterCheckin**
- So sánh checkout > checkin
- Chỉ validate khi có cả 2 giá trị

### 3. **IsApprovedLateTimeValid**
- So sánh approved <= actual
- Business logic validation

## ❌ Error Messages Examples

### **Format Errors**
```json
{
  "message": [
    "Ngày làm việc phải có định dạng YYYY-MM-DD (VD: 2024-12-21)",
    "Chuỗi check-in checkout phải có định dạng HH:MM-HH:MM và thời gian hợp lệ"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

### **Range Errors**
```json
{
  "message": [
    "Thời gian đi muộn không quá 480 phút (8 giờ)",
    "Tiền phạt không quá 10,000,000 VNĐ",
    "Tổng thời gian làm việc không quá 960 phút (16 giờ)"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

### **Logic Errors**
```json
{
  "message": [
    "Thời gian check-out phải sau thời gian check-in",
    "Thời gian đi muộn được duyệt không được lớn hơn thời gian đi muộn thực tế"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

## 🧪 Test Cases

### **Valid Data**
```json
{
  "work_date": "2024-12-21",
  "checkin": "2024-12-21T08:30:00.000Z",
  "checkout": "2024-12-21T17:30:00.000Z", 
  "checkin_checkout": "08:30-17:30",
  "late_time": 15,
  "late_time_approved": 10,
  "early_time": 0,
  "fines": 50000,
  "work_time_morning": 240,
  "work_time_afternoon": 240,
  "total_work_time": 480,
  "break_time": 60
}
```

### **Invalid Data**
```json
{
  "work_date": "21/12/2024",           // ❌ Wrong format
  "checkin": "2024-12-21T17:30:00Z",  
  "checkout": "2024-12-21T08:30:00Z", // ❌ Checkout before checkin
  "checkin_checkout": "17:30-08:30",  // ❌ Invalid time range
  "late_time": -10,                   // ❌ Negative
  "late_time_approved": 20,           // ❌ > late_time (15)
  "fines": 15000000,                  // ❌ > 10M
  "total_work_time": 1000,            // ❌ > 960 minutes
  "break_time": 150                   // ❌ > 120 minutes
}
```

## 💡 Benefits

1. **Data Integrity**: Đảm bảo dữ liệu thời gian luôn hợp lệ
2. **Better UX**: Error messages rõ ràng bằng tiếng Việt với ví dụ
3. **Business Logic**: Enforce các quy tắc nghiệp vụ
4. **Performance**: Validate ở API layer trước khi vào DB
5. **Maintainability**: Centralized validation rules
6. **Consistency**: Standardized time validation across system

## 🚀 Usage trong API

```bash
# Valid request
curl -X POST http://localhost:3000/timesheet \
  -H "Content-Type: application/json" \
  -d '{
    "work_date": "2024-12-21",
    "checkin_checkout": "08:30-17:30",
    "late_time": 15,
    "total_work_time": 480
  }'

# Invalid request - sẽ trả về validation errors
curl -X POST http://localhost:3000/timesheet \
  -H "Content-Type: application/json" \
  -d '{
    "work_date": "21-12-2024",
    "late_time": -10
  }'
```

**Kết quả**: Tất cả input thời gian đã được validate chặt chẽ, đảm bảo data quality và user experience tốt! 🎉
