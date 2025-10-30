# SQL Test Data - Fast Import

## 🚀 Quick Start

### Generate và Import SQL Test Data (RECOMMENDED)
```bash
# All-in-one: Generate + Import SQL test data
npm run db:seed:with-test-data:sql
```

### Manual Steps
```bash
# 1. Seed basic data first
npm run db:seed

# 2. Generate SQL file (1.3MB)
npm run generate:test-sql

# 3. Import SQL file
node import-test-data.js
# OR manually: mysql -u user -p database < test-data-complete.sql
```

## ⚡ Performance Comparison

| Method | Time | Records | Recommended |
|--------|------|---------|-------------|
| **SQL Import** | **30-60s** | **50,000+** | **✅ YES** |
| TypeScript Seed | 5-10 min | 50,000+ | ❌ Slow |
| Full Seed | 10-15 min | 50,000+ | ❌ Very Slow |

## 📊 Generated Test Data

### Users (150+)
- ✅ Realistic Vietnamese names
- ✅ Valid email addresses  
- ✅ Phone numbers
- ✅ Employee codes (EMP1001, EMP1002, ...)
- ✅ Random birth dates, addresses
- ✅ Division assignments

### Projects (50+)
- ✅ Project names and codes (PRJ001, PRJ002, ...)
- ✅ 3-8 tasks per project
- ✅ 2-5 users assigned per project
- ✅ Realistic start/end dates
- ✅ Project roles (PM, Developer, Tester)

### Attendance (3 months)
- ✅ Daily timesheets for 80-120 users
- ✅ Check-in/out times (7-9 AM, 5-8 PM)
- ✅ Attendance sessions and logs
- ✅ Realistic work hours (8-10h/day)
- ✅ Weekdays only (no weekends)

## 📁 Files Created

```
test-data-complete.sql     # Main SQL file (1.3MB)
test-data-generator.js     # Generator script
import-test-data.js        # Import script
```

## 🛠️ Import Methods

### Method 1: Automatic (Recommended)
```bash
node import-test-data.js
```
- ✅ Uses MySQL client if available
- ✅ Falls back to Prisma if needed
- ✅ Error handling and progress tracking

### Method 2: MySQL Client
```bash
mysql -u username -p database_name < test-data-complete.sql
```

### Method 3: GUI Tools
- **MySQL Workbench**: File → Run SQL Script
- **phpMyAdmin**: Import tab
- **DBeaver**: Execute SQL Script

## 🔧 Configuration

Database connection uses environment variables:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mast_hrm
```

## ✅ Benefits of SQL Approach

1. **⚡ Speed**: 10-20x faster than TypeScript
2. **🎯 Reliability**: Direct SQL execution
3. **📦 Portability**: Standard SQL file
4. **🔄 Reusable**: Can be shared and versioned
5. **🛠️ Flexible**: Works with any MySQL client

## 🚨 Important Notes

- ⚠️ Run basic seed first: `npm run db:seed`
- ⚠️ SQL file contains foreign key references
- ⚠️ Ensure database is empty of test data before import
- ⚠️ Use `npm run db:clear:test-data` to clean up

## 🎯 Use Cases

| Scenario | Command |
|----------|---------|
| **Development Setup** | `npm run db:seed:with-test-data:sql` |
| **Testing Environment** | `npm run db:seed && npm run db:seed:test-data:sql` |
| **Demo/Presentation** | `npm run generate:test-sql` + manual import |
| **CI/CD Pipeline** | `npm run db:seed:with-test-data:sql` |

---

**🚀 This SQL approach is the fastest and most reliable way to get comprehensive test data!**
