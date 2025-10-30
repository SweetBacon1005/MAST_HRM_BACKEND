# Database Seeding Guide

## Overview

Hệ thống seeding được tách thành 2 phần:
- **Basic Data**: Dữ liệu cần thiết cho hệ thống hoạt động
- **Test Data**: Dữ liệu test với số lượng lớn

## Available Commands

### Basic Seeding (Recommended for Production)

```bash
# Seed only essential data
npm run db:seed

# Force reset and seed essential data
npm run db:seed:force
```

**Includes:**
- ✅ Roles & Permissions (RBAC)
- ✅ Levels & Positions
- ✅ Organization Structure (Divisions, Teams)
- ✅ Skills & Certificates
- ✅ Essential Users (admin, test users)
- ✅ Basic Projects
- ✅ Work Schedules
- ✅ Sample Assets & Requests

### Test Data Generation

#### Option 1: SQL Import (RECOMMENDED - Much Faster!)

```bash
# Generate and import SQL test data (30-60 seconds)
npm run db:seed:test-data:sql

# Seed basic + SQL test data in one command
npm run db:seed:with-test-data:sql

# Just generate SQL file (for manual import)
npm run generate:test-sql
```

#### Option 2: TypeScript Seeding (Slower)

```bash
# Generate test data via TypeScript (5-10 minutes)
npm run db:seed:test-data

# Seed basic + TypeScript test data
npm run db:seed:with-test-data
```

**Adds:**
- 👥 150+ additional users
- 📋 50+ projects with tasks
- ⏰ 3 months of attendance data
- 📝 Thousands of requests (day-off, overtime, etc.)
- 💻 Hundreds of assets and requests
- 📊 Daily reports and evaluations

### Full Seeding (Legacy)

```bash
# Seed everything at once (slower, not recommended)
npm run db:seed:full
```

### Cleanup

```bash
# Remove all test data, keep essential data
npm run db:clear:test-data
```

## File Structure

```
prisma/
├── seed.ts                    # Legacy full seed (kept for compatibility)
├── seed-basic.ts             # New basic seed (recommended)
├── seeds/
│   ├── basic-data.seed.ts    # Levels, positions, languages
│   ├── rbac.seed.ts          # Roles, permissions
│   ├── organization.seed.ts  # Divisions, teams
│   ├── users.seed.ts         # Essential users
│   ├── projects.seed.ts      # Basic projects
│   ├── mass-*.seed.ts        # Mass data generators
│   └── ...
├── test-data.sql             # SQL file for test data (future)
generate-test-data.js         # Node.js script for test data
clear-test-data.js           # Cleanup script
```

## Usage Scenarios

### 1. Development Setup (Fast with SQL)
```bash
npm run db:seed:with-test-data:sql
```

### 2. Production Deployment
```bash
npm run db:seed
```

### 3. Testing Environment (Fast)
```bash
npm run db:seed
npm run db:seed:test-data:sql
```

### 4. Clean Development Environment
```bash
npm run db:clear:test-data
npm run db:seed:test-data:sql
```

### 5. Manual SQL Import
```bash
# Generate SQL file
npm run generate:test-sql

# Import manually via MySQL client
mysql -u username -p database_name < test-data-complete.sql

# Or use MySQL Workbench/phpMyAdmin
```

## Essential Users Created

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| admin@example.com | admin123 | System Admin | Full system access |
| user@example.com | user123 | Employee | Regular user testing |
| manager@example.com | manager123 | Manager | Management features |
| hr@example.com | hr123 | HR | HR module testing |
| division_head@example.com | division123 | Division Head | Division management |

## Performance Notes

- **Basic Seed**: ~30 seconds, creates ~100 records
- **SQL Test Data**: ~30-60 seconds, creates ~50,000+ records ⚡ **FASTEST**
- **TypeScript Test Data**: ~5-10 minutes, creates ~50,000+ records
- **Full Seed**: ~10-15 minutes, creates everything at once

## Database Size

- **Basic Data**: ~1MB
- **With Test Data**: ~50-100MB

## Troubleshooting

### Connection Issues
```bash
# Check database connection
npm run db:push
```

### Build Issues
```bash
# Ensure project is built before test data generation
npm run build
```

### Permission Issues
```bash
# Reset database completely
npm run db:seed:force
```

## Best Practices

1. **Always use basic seed first** for new environments
2. **Use test data only when needed** for development/testing
3. **Clear test data regularly** to keep database clean
4. **Use SQL files** for large datasets in production
5. **Monitor database size** when using test data

## Migration from Old System

If you were using the old full seed:

```bash
# Old way (deprecated)
npm run db:seed:full

# New way (recommended)
npm run db:seed:with-test-data
```

The new system is faster, more modular, and easier to maintain.
