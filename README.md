# MAST HRM Backend

Hệ thống quản lý nhân sự (Human Resource Management) được xây dựng với NestJS, Prisma và MySQL.

## 📋 Tổng quan

MAST HRM là một hệ thống quản lý nhân sự toàn diện bao gồm:

- ✅ **Quản lý người dùng và phân quyền**
- ✅ **Hệ thống chấm công và timesheet**  
- ✅ **Quản lý hồ sơ nhân viên chi tiết**
- ✅ **Tính toán attendance và penalty**
- ✅ **Quản lý nghỉ phép và làm thêm giờ**
- ✅ **Dashboard và báo cáo**
- ✅ **API RESTful với authentication JWT**

## 🛠 Tech Stack

- **Backend Framework**: NestJS 11.x
- **Database**: MySQL với Prisma ORM
- **Authentication**: JWT (Access + Refresh tokens)
- **Validation**: Class-validator & Class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Language**: TypeScript

## 📁 Cấu trúc dự án

```
src/
├── auth/                    # 🔐 Authentication & Authorization
├── users/                   # 👥 User Management  
├── user-profile/           # 👤 User Profile Management
├── timesheet/              # ⏰ Timesheet & Check-in/out
├── attendance/             # 📊 Attendance Calculation
├── common/                 # 🔧 Common utilities
├── config/                 # ⚙️ Configuration
├── database/               # 💾 Database connection
└── main.ts                 # 🚀 Application entry point

prisma/
├── schema.prisma           # 📋 Database schema
├── seed.ts                 # 🌱 Database seeding
└── seeds/                  # 🌱 Seed data files
```

## 🚀 Cài đặt và chạy dự án

### Yêu cầu hệ thống

- Node.js >= 18.x
- MySQL >= 8.0
- npm hoặc yarn

### 1. Clone repository

```bash
git clone <repository-url>
cd MAST_HRM
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình môi trường

Tạo file `.env` từ `.env.example`:

```bash
cp env.example .env
```

Cập nhật các thông tin trong `.env`:

```bash
# Database
DATABASE_URL="mysql://username:password@localhost:3306/mast_hrm"

# JWT Configuration  
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_REFRESH_SECRET="your-super-secret-refresh-jwt-key-here"
JWT_ACCESS_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# Application
PORT=3000
NODE_ENV=development
```

### 4. Thiết lập database

#### Tạo database

```sql
CREATE DATABASE mast_hrm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Chạy migration và seed data

```bash
# Push schema và generate Prisma client
npm run db:push

# Seed dữ liệu mẫu (optional)
npm run db:seed
```

### 5. Chạy ứng dụng

#### Development mode

```bash
npm run start:dev
```

#### Production mode

```bash
# Build
npm run build

# Start production
npm run start:prod
```

Ứng dụng sẽ chạy tại: `http://localhost:3000`

API Documentation (Swagger): `http://localhost:3000/api`

## 📚 Module Documentation

Mỗi module có documentation chi tiết riêng:

### 🔐 [Authentication Module](src/auth/README.md)
- JWT Authentication (Access + Refresh tokens)
- Role-based Access Control (RBAC)
- Guards, Decorators và Strategies
- Password security với bcrypt

### 👥 [Users Module](src/users/README.md)  
- CRUD operations cho users
- Quản lý thông tin cơ bản
- Soft delete và role management
- Phân trang với filters

### 👤 [User Profile Module](src/user-profile/README.md)
- Quản lý hồ sơ nhân viên chi tiết
- Thông tin con cái, học vấn, kinh nghiệm
- Chứng chỉ và kỹ năng
- Upload avatar và documents

### ⏰ [Timesheet Module](src/timesheet/README.md)
- Quản lý timesheet hàng ngày
- Check-in/Check-out với GPS và ảnh
- Quản lý đơn nghỉ phép và làm thêm giờ
- Workflow duyệt timesheet

### 📊 [Attendance Module](src/attendance/README.md)
- Tính toán thời gian làm việc chi tiết
- Quản lý ca làm việc (Work Shifts)
- Tính toán penalty (phạt muộn/về sớm)
- Dashboard và báo cáo attendance

## 🗄 Database Schema

Database được thiết kế với các bảng chính:

- **users**: Thông tin user cơ bản
- **user_information**: Thông tin chi tiết nhân viên
- **time_sheets**: Bảng chấm công chính
- **attendance_logs**: Log check-in/out chi tiết
- **day_offs**: Quản lý nghỉ phép
- **over_times_history**: Lịch sử làm thêm giờ
- **work_shifts**: Định nghĩa ca làm việc
- **certificates, skills**: Chứng chỉ và kỹ năng

Xem chi tiết schema tại [prisma/schema.prisma](prisma/schema.prisma)

## 📖 API Documentation

### Swagger UI
Truy cập: `http://localhost:3000/api`

### Postman Collection
Import collection từ: `docs/MAST_HRM.postman_collection.json` (nếu có)

### Authentication
Tất cả API (trừ login/register) yêu cầu JWT token:

```bash
Authorization: Bearer <access_token>
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests  
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 🛠 Development Scripts

```bash
# Development
npm run start:dev          # Chạy với watch mode
npm run start:debug        # Chạy với debug mode

# Database
npm run db:push            # Push schema changes
npm run db:push:force      # Force reset database
npm run db:seed            # Seed sample data
npm run migrate:dev        # Run migrations (dev)
npm run migrate:deploy     # Run migrations (prod)

# Code Quality
npm run lint               # ESLint check & fix
npm run format             # Prettier format

# Build
npm run build              # Build for production
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | - |
| `JWT_SECRET` | JWT access token secret | - |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | - |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry | 1h |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | 7d |
| `PORT` | Application port | 3000 |
| `NODE_ENV` | Environment | development |

### Database Configuration

Prisma sử dụng MySQL với các tính năng:
- UTF8MB4 character set
- Foreign key constraints
- Soft delete support
- Auto timestamps

## 🚀 Deployment

### Docker (Recommended)

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

### Manual Deployment

1. Build ứng dụng: `npm run build`
2. Upload files lên server
3. Install dependencies: `npm ci --only=production`
4. Run migrations: `npm run migrate:deploy`
5. Start: `npm run start:prod`

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Tạo Pull Request

## 📝 Coding Standards

- Sử dụng TypeScript strict mode
- Follow ESLint và Prettier rules
- Viết unit tests cho business logic
- Document public APIs
- Sử dụng conventional commits

## 🐛 Troubleshooting

### Common Issues

**1. Database connection error**
```bash
# Kiểm tra MySQL service
sudo systemctl status mysql

# Test connection
mysql -u username -p -h localhost
```

**2. Prisma generate error**
```bash
# Regenerate Prisma client
npx prisma generate
```

**3. Port already in use**
```bash
# Kill process on port 3000
npx kill-port 3000
```

**4. JWT secret not configured**
```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📞 Support

- **Email**: support@mast.com
- **Documentation**: [Wiki](docs/wiki)
- **Issues**: [GitHub Issues](issues)

## 📄 License

This project is licensed under the UNLICENSED License.

---

**Happy Coding! 🚀**
