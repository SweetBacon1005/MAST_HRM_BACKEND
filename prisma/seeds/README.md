# Seed Data Structure

Cấu trúc seed data được chia thành nhiều file modular để dễ quản lý và bảo trì.

## 📁 Cấu trúc thư mục

```
prisma/
├── seed.ts (file chính - điều phối toàn bộ seed process)
└── seeds/
    ├── basic-data.seed.ts          # Dữ liệu cơ bản (levels, positions, languages)
    ├── rbac.seed.ts                # Hệ thống phân quyền (roles, permissions)
    ├── skills-certificates.seed.ts  # Kỹ năng và chứng chỉ
    ├── organization.seed.ts         # Cơ cấu tổ chức (divisions, teams)
    ├── schedule-works.seed.ts       # Lịch làm việc
    ├── users.seed.ts               # Users và user information
    ├── projects.seed.ts            # Projects, customers, stages
    ├── user-relations.seed.ts      # Quan hệ users (allocations, timesheets)
    ├── misc-data.seed.ts           # Dữ liệu bổ sung (education, experience, holidays)
    ├── day-offs.seed.ts            # Đơn nghỉ phép
    ├── assets.seed.ts              # Tài sản công ty
    └── office-ip.seed.ts           # Cấu hình IP văn phòng
```

## 🔄 Thứ tự thực thi

1. **basic-data.seed.ts** - Levels, Positions, Languages (master data)
2. **rbac.seed.ts** - Roles, Permissions, Permission-Role mappings
3. **skills-certificates.seed.ts** - Skills, Certificate Categories, Certificates
4. **organization.seed.ts** - Divisions, Teams (cấu trúc tổ chức)
5. **schedule-works.seed.ts** - Work shifts configuration
6. **users.seed.ts** - Users và User Information (8-10 users cơ bản)
7. **projects.seed.ts** - Projects, Customers, Project Stages
8. **user-relations.seed.ts** - User Divisions, Project Allocations, Timesheets, Daily Reports
9. **misc-data.seed.ts** - Education, Experience, Holidays, Children, User Skills, Overtime
10. **day-offs.seed.ts** - Day Off Requests (mẫu)
11. **assets.seed.ts** - Assets và Asset Categories
12. **office-ip.seed.ts** - Office IP Address Configuration

## 🚀 Cách chạy

### Chạy tất cả seeds
```bash
npx prisma db seed
```

### Chạy trực tiếp (với ts-node)
```bash
npx ts-node prisma/seed.ts
```

### Reset database và seed lại
```bash
npx prisma migrate reset
# Sẽ tự động chạy seed sau khi reset
```

## 📊 Dữ liệu được tạo

### Master Data
- **7 levels**: Intern → Fresher → Junior → Middle → Senior → Lead → Principal
- **10 positions**: Backend Dev, Frontend Dev, Mobile Dev, QA, DevOps, BA, PM, etc.
- **4 languages**: Vietnamese, English, Japanese, Korean
- **27 skills**: Phân theo positions (Node.js, React, Flutter, Docker, etc.)
- **4 certificate categories** và certificates

### Organization
- **5 divisions** với cấu trúc phân cấp (Technology, HR, QA, Dev Teams)
- **6 teams**: Backend Teams, Frontend Teams, Mobile, QA

### Users & Access
- **5 roles**: Admin, HR Manager, Division Head, Team Leader, Project Manager, Employee
- **90+ permissions**: Chi tiết theo modules (user, project, timesheet, attendance, etc.)
- **8-10 users** với thông tin đầy đủ:
  - Admin, HR Manager
  - Developers (John, Jane, Mike, Sarah, David, Lisa)
  - Test user (user@example.com)

### Projects & Work
- **3-4 projects** với customers, stages
- **Project allocations**: Users được assign vào projects
- **Timesheets**: Sample attendance data
- **Daily reports**: Sample work reports

### Additional Data
- **Education records**: Học vấn của users
- **Work experience**: Kinh nghiệm làm việc
- **Holidays**: Ngày lễ Việt Nam (Tết, 30/4, 2/9, etc.)
- **User skills**: Kỹ năng của từng user
- **Day off requests**: Đơn nghỉ phép mẫu
- **Assets**: Tài sản công ty (laptops, monitors, etc.)

## 🔑 Thông tin đăng nhập

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@company.com | 123456 |
| HR Manager | hr.manager@company.com | 123456 |
| Test User | user@example.com | Mast@123 |
| Developer | john.doe@company.com | 123456 |
| Developer | jane.smith@company.com | 123456 |
| Developer | mike.johnson@company.com | 123456 |
| Developer | sarah.wilson@company.com | 123456 |
| Developer | david.brown@company.com | 123456 |
| Designer | lisa.davis@company.com | 123456 |

## 💡 Lợi ích của cấu trúc modular

### ✅ Dễ bảo trì
- Mỗi file tập trung vào một nhóm dữ liệu cụ thể
- Dễ tìm và sửa lỗi
- Code rõ ràng, không bị lộn xộn

### ✅ Tái sử dụng
- Có thể import và chạy từng seed riêng lẻ nếu cần
- Dễ test từng phần độc lập

### ✅ Mở rộng
- Dễ dàng thêm seed mới
- Không ảnh hưởng đến seeds hiện có

### ✅ Performance
- Sử dụng `createMany()` với `skipDuplicates: true`
- Batch operations với `upsert()`
- Giảm database calls xuống tối thiểu
- Seed time: ~10-20 giây

## ⚡ Tối ưu hóa đã áp dụng

### 1. Bulk Insert với createMany
```typescript
// Thay vì N queries
await Promise.all(items.map(item => prisma.table.create({ data: item })))

// Dùng 1 query
await prisma.table.createMany({
  data: items,
  skipDuplicates: true
})
```

### 2. Batch Upsert
```typescript
// Cho dữ liệu có ID cố định
await Promise.all(
  items.map(item =>
    prisma.table.upsert({
      where: { id: item.id },
      update: {},
      create: item
    })
  )
)
```

### 3. Giảm dependencies
- Chỉ pass data cần thiết giữa các seeds
- Tránh circular dependencies

## 🛠️ Development Tips

### Thêm seed mới
1. Tạo file mới: `prisma/seeds/my-feature.seed.ts`
2. Export function: `export async function seedMyFeature(prisma: PrismaClient)`
3. Import vào `seed.ts`
4. Gọi function theo thứ tự phù hợp

### Test riêng một seed
```typescript
// Tạo file test riêng
import { PrismaClient } from '@prisma/client';
import { seedMyFeature } from './seeds/my-feature.seed';

const prisma = new PrismaClient();

seedMyFeature(prisma)
  .then(() => console.log('Done'))
  .finally(() => prisma.$disconnect());
```

### Debug
- Mỗi seed function có console.log để track progress
- Nếu lỗi, kiểm tra thứ tự dependencies
- Đảm bảo foreign keys được seed trước

## 📝 Notes

1. **Production**: KHÔNG dùng seed cho production data
2. **Testing**: Seed tạo data nhất quán cho testing
3. **Development**: Seed giúp setup môi trường dev nhanh chóng
4. **Backup**: Luôn backup trước khi seed trên database có data

## 🔄 Changelog

### v2.0 - 2025-11-25
- ✅ Removed mass data seeds (150+ users, mass projects, etc.)
- ✅ Kept only core seed data (8-10 users)
- ✅ Improved performance: 2 minutes → 10-20 seconds
- ✅ Cleaner codebase, easier to maintain
- ✅ Updated documentation

### v1.0 - 2025-10-30
- Initial modular seed structure
- Mass data seeding capability
- Comprehensive test data

---

**Last Updated**: 2025-11-25  
**Maintained by**: Development Team  
**Status**: Production Ready ✅
