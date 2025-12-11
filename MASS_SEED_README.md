# 🌱 MASS SEED DATA CHO HRM SYSTEM

## 📋 Tổng quan

Hệ thống seed data đã được mở rộng để tạo ra **hàng nghìn records** cho việc testing và development. Bao gồm:

### 👥 Users (150+ nhân viên)
- **150 users** với tên Việt Nam thực tế
- Đa dạng về vị trí, level, và thông tin cá nhân
- Phân bổ đều các roles và departments
- Mật khẩu mặc định: `123456`

### 🚀 Projects & Tasks (50+ dự án)
- **50+ projects** với tên công ty và dự án thực tế
- **500+ tasks** được phân bổ cho các team members
- Đa dạng về loại dự án (Customer, In-house, Start-up)
- Project roles và assignments chi tiết

### ⏰ Attendance Data (3 tháng)
- **Timesheets** cho 3 tháng gần đây
- **Attendance sessions** với check-in/out times
- **Attendance logs** chi tiết
- Dữ liệu realistic với late/early, remote work

### 📝 Requests (Hàng nghìn đơn)
- **Day-off requests**: 8-15 đơn/user
- **Remote work requests**: 10-20 đơn/user  
- **Overtime requests**: 5-12 đơn/user
- **Late/Early requests**: 3-8 đơn/user
- **Forgot checkin requests**: 2-5 đơn/user

### 💻 Assets Management
- **300+ assets** đa dạng (laptop, desktop, monitor, etc.)
- **Asset requests** với các trạng thái khác nhau
- Thông tin chi tiết về brand, model, serial number
- Assignment và maintenance tracking

### 📊 Reports & Evaluations
- **Daily reports** với task details thực tế
- **PM reports** weekly cho các projects
- **Evaluation histories** cho tất cả users
- **Leave balances** và transactions

## 🚀 Cách sử dụng

### 1. Chạy seed nhanh
```bash
node run-mass-seed.js
```

### 2. Chạy seed thủ công
```bash
npx prisma db seed
```

### 3. Reset và seed lại
```bash
npx prisma migrate reset
npx prisma db seed
```

## 🔑 Tài khoản đăng nhập

### Admin & Managers
- `admin@company.com` / `123456` (Super Admin)
- `hr.manager@company.com` / `123456` (HR Manager)

### Test Users
- `user@example.com` / `Mast@123` (Có sample requests)
- `john.doe@company.com` / `123456` (Senior Developer)
- `jane.smith@company.com` / `123456` (Senior Frontend)

### Mass Users (150+)
- Tất cả có mật khẩu: `123456`
- Email format: `firstname.lastname[number]@company.com`
- VD: `minh.nguyen10@company.com`, `thu.tran15@company.com`

## 📊 Thống kê dữ liệu

| Loại dữ liệu | Số lượng | Mô tả |
|--------------|----------|--------|
| Users | 159+ | 9 users gốc + 150 mass users |
| Projects | 54+ | 4 projects gốc + 50 mass projects |
| Tasks | 500+ | Tasks cho tất cả projects |
| Timesheets | 10,000+ | 3 tháng × 150 users × ~22 ngày |
| Day-off requests | 1,500+ | 8-15 đơn/user |
| Remote work requests | 2,000+ | 10-20 đơn/user |
| Overtime requests | 1,000+ | 5-12 đơn/user |
| Assets | 300+ | Đa dạng loại tài sản |
| Daily reports | 5,000+ | Reports hàng ngày |
| Evaluations | 400+ | 2-4 evaluations/user |

## 🎯 Tính năng nổi bật

### ✅ Realistic Data
- Tên Việt Nam thực tế với đúng cấu trúc họ tên
- Địa chỉ, số điện thoại theo format Việt Nam
- Dữ liệu attendance realistic (đi muộn, về sớm, remote work)
- Task titles và descriptions thực tế

### ✅ Performance Optimized
- Sử dụng `createMany()` với `skipDuplicates: true`
- Batch processing để tránh timeout
- Upsert cho dữ liệu có unique constraints
- Tối ưu hóa database calls

### ✅ Comprehensive Coverage
- Tất cả modules của HRM system
- Relationships đầy đủ giữa các entities
- Status transitions realistic
- Business logic compliant

## 🔧 Troubleshooting

### Lỗi timeout
```bash
# Tăng timeout cho Prisma
export DATABASE_TIMEOUT=60000
npx prisma db seed
```

### Lỗi memory
```bash
# Tăng memory cho Node.js
node --max-old-space-size=4096 run-mass-seed.js
```

### Lỗi unique constraint
```bash
# Reset database trước khi seed
npx prisma migrate reset
npx prisma db seed
```

## 📁 Cấu trúc files

```
prisma/
├── seed.ts                    # Main seed file
└── seeds/
    ├── basic-data.seed.ts     # Levels, positions, languages
    ├── rbac.seed.ts           # Roles, permissions
    ├── organization.seed.ts   # Divisions, teams
    ├── users.seed.ts          # Original 9 users
    ├── projects.seed.ts       # Original 4 projects
    ├── mass-users.seed.ts     # 150+ additional users
    ├── mass-projects.seed.ts  # 50+ additional projects
    ├── mass-attendance.seed.ts # Attendance data
    ├── mass-requests.seed.ts  # All types of requests
    ├── mass-assets.seed.ts    # Assets and requests
    └── mass-reports.seed.ts   # Reports and evaluations
```

## ⚡ Performance Tips

1. **Chạy trên local development** trước khi deploy
2. **Backup database** trước khi seed
3. **Monitor memory usage** trong quá trình seed
4. **Sử dụng SSD** để tăng tốc I/O operations
5. **Close các ứng dụng khác** để giải phóng RAM

## 🎉 Kết quả

Sau khi seed xong, bạn sẽ có:
- ✅ Hệ thống HRM hoàn chỉnh với hàng nghìn records
- ✅ Dữ liệu realistic để test tất cả tính năng
- ✅ Performance testing với large dataset
- ✅ Demo data chuyên nghiệp cho client

---

**Thời gian seed**: ~5-10 phút (tùy thuộc vào cấu hình máy)
**Database size**: ~100-200MB sau khi seed
**Recommended**: RAM >= 8GB, SSD storage
