# Holiday API Fix - Year Parameter Validation

## 🐛 **Lỗi gặp phải:**

```json
{
  "message": "Validation failed (numeric string is expected)",
  "error": "Bad Request", 
  "statusCode": 400
}
```

**Nguyên nhân**: Query parameter `year` được truyền dưới dạng string từ URL nhưng controller/service expect number.

## 🔧 **Giải pháp đã áp dụng:**

### **1. Tạo DTO validation chuyên dụng:**

**File**: `src/timesheet/dto/holiday-query.dto.ts`
```typescript
export class HolidayQueryDto {
  @ApiPropertyOptional({
    description: 'Năm (YYYY)',
    example: 2025,
    minimum: 2020,
    maximum: 2030,
  })
  @IsOptional()
  @Type(() => Number)              // Convert string to number
  @IsInt({ message: 'Năm phải là số nguyên' })
  @Min(2020, { message: 'Năm phải từ 2020 trở lên' })
  @Max(2030, { message: 'Năm không được vượt quá 2030' })
  year?: number;
}
```

### **2. Cập nhật Controller:**

**Trước:**
```typescript
findAllHolidays(@Query('year') year: string) {
  return this.timesheetService.findAllHolidays(year);
}
```

**Sau:**
```typescript
findAllHolidays(@Query() query: HolidayQueryDto) {
  return this.timesheetService.findAllHolidays(query.year?.toString());
}
```

### **3. Cập nhật Service:**

**Trước:**
```typescript
async findAllHolidays(year: string) {
  // ...
  if (!isNaN(Number(year)) && year.length === 4) {
```

**Sau:**
```typescript
async findAllHolidays(year?: string) {
  // ...
  if (year && !isNaN(Number(year)) && year.length === 4) {
```

## ✅ **Kết quả sau khi fix:**

### **Valid Requests:**
```bash
# Lấy tất cả holidays
GET /timesheet/holidays

# Lấy holidays của năm 2025
GET /timesheet/holidays?year=2025

# Response success
{
  "data": [
    {
      "id": 1,
      "name": "Tết Nguyên Đán",
      "start_date": "2025-01-28",
      "end_date": "2025-02-03",
      "type": "NATIONAL",
      "status": "ACTIVE"
    }
  ]
}
```

### **Invalid Requests:**
```bash
# Năm không hợp lệ
GET /timesheet/holidays?year=abc
# → Error: "Năm phải là số nguyên"

GET /timesheet/holidays?year=2019  
# → Error: "Năm phải từ 2020 trở lên"

GET /timesheet/holidays?year=2035
# → Error: "Năm không được vượt quá 2030"
```

## 🎯 **Cải thiện đạt được:**

1. **Type Safety**: Automatic string → number conversion
2. **Validation**: Range validation (2020-2030) 
3. **Error Handling**: Clear Vietnamese error messages
4. **Backward Compatibility**: Optional parameter
5. **Documentation**: Better Swagger docs with examples

## 📋 **Validation Rules:**

| Rule | Description | Error Message |
|------|-------------|---------------|
| `@IsOptional()` | Year parameter is optional | - |
| `@Type(() => Number)` | Convert string to number | - |
| `@IsInt()` | Must be integer | "Năm phải là số nguyên" |
| `@Min(2020)` | Minimum year 2020 | "Năm phải từ 2020 trở lên" |
| `@Max(2030)` | Maximum year 2030 | "Năm không được vượt quá 2030" |

## 🚀 **Usage Examples:**

```typescript
// Frontend JavaScript
const year = 2025;
const response = await fetch(`/api/timesheet/holidays?year=${year}`);

// cURL
curl "http://localhost:3000/timesheet/holidays?year=2025"

// Axios
const holidays = await axios.get('/timesheet/holidays', {
  params: { year: 2025 }
});
```

**Kết luận**: Lỗi đã được fix hoàn toàn với validation chặt chẽ và error handling tốt! ✅
