# Hướng dẫn thiết lập Cronjob cho Timesheet

## 📋 API Cronjob đã tạo

### Endpoint: `POST /timesheet/cronjob/auto-create-daily`

**Mô tả**: Tự động tạo timesheet hàng ngày cho tất cả user active

**Features**:
- ✅ Bỏ qua cuối tuần (Thứ 7, Chủ nhật)
- ✅ Bỏ qua ngày lễ
- ✅ Chỉ tạo cho user chưa có timesheet
- ✅ Không cần authentication (`@Public()`)
- ✅ Trả về thống kê chi tiết

## 🔧 Cách thiết lập Cronjob

### 1. Linux/Ubuntu (Crontab)

```bash
# Mở crontab editor
crontab -e

# Thêm dòng sau để chạy lúc 6:00 AM hàng ngày
0 6 * * * curl -X POST http://localhost:3000/timesheet/cronjob/auto-create-daily -H "Content-Type: application/json" -d "{}"

# Hoặc chỉ định ngày cụ thể
0 6 * * * curl -X POST http://localhost:3000/timesheet/cronjob/auto-create-daily -H "Content-Type: application/json" -d '{"date": "2024-12-21"}'
```

### 2. Windows (Task Scheduler)

```powershell
# Tạo script PowerShell (auto-timesheet.ps1)
$headers = @{
    "Content-Type" = "application/json"
}

$body = @{} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/timesheet/cronjob/auto-create-daily" -Method POST -Headers $headers -Body $body
    Write-Host "Success: $($response.message)"
    Write-Host "Created: $($response.created) timesheets"
} catch {
    Write-Host "Error: $_"
}
```

### 3. Node.js Cron (node-cron)

```bash
npm install node-cron
```

```typescript
// cron-jobs.ts
import * as cron from 'node-cron';
import axios from 'axios';

// Chạy lúc 6:00 AM hàng ngày từ thứ 2 đến thứ 6
cron.schedule('0 6 * * 1-5', async () => {
  try {
    const response = await axios.post(
      'http://localhost:3000/timesheet/cronjob/auto-create-daily',
      {},
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    console.log('✅ Cronjob Success:', response.data.message);
    console.log('📊 Created:', response.data.created, 'timesheets');
  } catch (error) {
    console.error('❌ Cronjob Error:', error.message);
  }
});
```

## 📊 Response Examples

### Thành công tạo timesheet:
```json
{
  "message": "Cronjob: Đã tạo 25 timesheet tự động",
  "created": 25,
  "already_exists": 5,
  "total_users": 30,
  "date": "2024-12-21",
  "created_for_users": [1, 2, 3, 4, 5...]
}
```

### Bỏ qua cuối tuần:
```json
{
  "message": "Bỏ qua cuối tuần, không tạo timesheet",
  "created": 0,
  "skipped_reason": "weekend",
  "date": "2024-12-21"
}
```

### Bỏ qua ngày lễ:
```json
{
  "message": "Bỏ qua ngày lễ: Giáng sinh",
  "created": 0,
  "skipped_reason": "holiday",
  "holiday_name": "Giáng sinh",
  "date": "2024-12-25"
}
```

## 🔍 Monitoring & Logging

### Kiểm tra logs
```bash
# Xem logs của cronjob
tail -f /var/log/cron.log

# Hoặc tạo log file riêng
0 6 * * * curl -X POST http://localhost:3000/timesheet/cronjob/auto-create-daily >> /var/log/timesheet-cronjob.log 2>&1
```

### Health check
```bash
# Test API trước khi setup cronjob
curl -X POST http://localhost:3000/timesheet/cronjob/auto-create-daily \
  -H "Content-Type: application/json" \
  -d '{"date": "2024-12-21"}'
```

## ⚙️ Customization

Có thể chỉnh sửa logic trong `autoDailyTimesheetCreation()`:
- Thêm filter theo role/department
- Thay đổi thời gian tạo
- Thêm notification khi tạo xong
- Tích hợp với monitoring system

## 🚨 Lưu ý quan trọng

1. **Security**: API đã set `@Public()` nên không cần auth, cần đảm bảo chỉ internal network mới access được
2. **Performance**: Với nhiều user, nên chạy vào giờ ít traffic (sáng sớm)
3. **Error handling**: Nên setup alerting khi cronjob fail
4. **Database**: Đảm bảo DB connection pool đủ lớn cho batch operations
