# Seed Data Structure

Cấu trúc seed data được chia thành nhiều file để dễ quản lý và bảo trì.

## Cấu trúc thư mục

```
prisma/
├── seed.ts (file chính)
└── seeds/
    ├── basic-data.seed.ts          # Dữ liệu cơ bản (roles, permissions, levels, positions, offices, languages)
    ├── skills-certificates.seed.ts  # Kỹ năng và chứng chỉ
    ├── organization.seed.ts         # Cơ cấu tổ chức (divisions, teams, groups)
    ├── users.seed.ts               # Users và user information
    ├── projects.seed.ts            # Projects, customers, stages
    ├── user-relations.seed.ts      # Quan hệ users (divisions, allocations, timesheets)
    └── misc-data.seed.ts           # Dữ liệu khác (education, experience, holidays, children)
```

## Thứ tự thực thi

1. **basic-data.seed.ts** - Tạo dữ liệu cơ bản
2. **skills-certificates.seed.ts** - Tạo kỹ năng và chứng chỉ
3. **organization.seed.ts** - Tạo cơ cấu tổ chức
4. **users.seed.ts** - Tạo users và thông tin cá nhân
5. **projects.seed.ts** - Tạo projects và customers
6. **user-relations.seed.ts** - Tạo quan hệ giữa users
7. **misc-data.seed.ts** - Tạo dữ liệu bổ sung

## Cách chạy

```bash
# Chạy tất cả seeds
npx prisma db seed

# Hoặc chạy trực tiếp
npx ts-node prisma/seed.ts
```

## Lợi ích của cấu trúc này

- **Dễ bảo trì**: Mỗi file tập trung vào một nhóm dữ liệu cụ thể
- **Tái sử dụng**: Có thể chạy từng seed riêng lẻ nếu cần
- **Dễ debug**: Dễ dàng xác định lỗi trong từng phần
- **Mở rộng**: Dễ dàng thêm seed mới
- **Đọc hiểu**: Code rõ ràng, dễ hiểu

## Dữ liệu được tạo

- 12 permissions cơ bản
- 6 roles (admin, manager, team_leader, developer, tester, employee)
- 5 group roles
- 7 levels (Intern → Principal)
- 10 positions (Backend Dev, Frontend Dev, Mobile Dev, QA, DevOps, etc.)
- 4 offices (Hà Nội, TP.HCM, Đà Nẵng, Tokyo)
- 4 languages (Vietnamese, English, Japanese, Korean)
- 27 skills phân theo positions
- 4 certificate categories và certificates
- 5 divisions với cấu trúc phân cấp
- 6 teams
- 3 groups theo địa điểm
- 8 users với thông tin đầy đủ
- 3 customers và 4 projects
- 4 project stages
- Education, experience, holidays, children data
- User skills, certificates, timesheets, daily reports
- Project allocations, overtime history

## Thông tin đăng nhập

- **Admin**: admin@company.com / 123456
- **HR Manager**: hr.manager@company.com / 123456
- **Developers**: 
  - john.doe@company.com / 123456
  - jane.smith@company.com / 123456
  - mike.johnson@company.com / 123456
  - sarah.wilson@company.com / 123456
  - david.brown@company.com / 123456
  - lisa.davis@company.com / 123456
