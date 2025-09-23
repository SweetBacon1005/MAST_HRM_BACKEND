# Vercel Deployment Guide cho MAST HRM

## 🚀 **Cấu hình Swagger trên Vercel**

### **1. Environment Variables cần thiết:**

Trong Vercel Dashboard → Settings → Environment Variables, thêm:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# App Config
NODE_ENV=production
PORT=3000

# Vercel tự động set các biến này:
# VERCEL=1                    # Indicates running on Vercel
# VERCEL_URL=your-app.vercel.app  # Your app URL
```

### **2. Swagger Configuration:**

**File**: `src/main.ts`
```typescript
// Swagger sẽ được enable khi:
const enableSwagger = process.env.NODE_ENV !== 'production' || process.env.VERCEL === '1';

// Tự động detect server URL:
.addServer(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
```

### **3. Vercel Configuration:**

**File**: `vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/main.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/main.ts",
      "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    }
  ]
}
```

## 📋 **Deployment Steps:**

### **1. Chuẩn bị Deploy:**
```bash
# Build và test local
npm run build
npm run start:prod

# Test Swagger local
curl http://localhost:3000/api
```

### **2. Deploy lên Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Hoặc push lên GitHub và connect với Vercel
```

### **3. Kiểm tra sau khi deploy:**
```bash
# Check Swagger
https://your-app.vercel.app/api

# Check API health
https://your-app.vercel.app/

# Test API endpoint
https://your-app.vercel.app/auth/login
```

## 🔧 **Troubleshooting:**

### **Swagger không hiển thị:**
```bash
# 1. Check logs
vercel logs your-app

# 2. Check environment variables
vercel env ls

# 3. Verify VERCEL=1 variable exists
```

### **CORS Issues:**
```typescript
// Trong main.ts
app.enableCors({
  origin: process.env.VERCEL_URL ? 
    [`https://${process.env.VERCEL_URL}`, 'http://localhost:3000'] : 
    true,
  credentials: true,
});
```

### **Database Connection:**
```bash
# Đảm bảo DATABASE_URL đúng format
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Test connection
npx prisma db pull
```

## 📱 **Swagger URLs:**

### **Development:**
```
http://localhost:3000/api
```

### **Production (Vercel):**
```
https://your-app.vercel.app/api
```

## 🔒 **Security Notes:**

1. **Environment Variables**: Không commit secrets vào Git
2. **Database**: Sử dụng SSL connection
3. **JWT**: Sử dụng strong secrets
4. **CORS**: Configure properly cho production

## 🎯 **Features được enable:**

- ✅ **Swagger UI** - Full documentation interface
- ✅ **JWT Authentication** - Bearer token support  
- ✅ **CORS** - Cross-origin requests
- ✅ **Validation** - Request/response validation
- ✅ **Auto Server Detection** - Correct base URL
- ✅ **Persistent Auth** - Remember JWT tokens

## 🚀 **Final Result:**

Sau khi deploy thành công:

1. **API Base**: `https://your-app.vercel.app`
2. **Swagger Docs**: `https://your-app.vercel.app/api`
3. **Authentication**: JWT Bearer tokens
4. **All Endpoints**: Fully functional with validation

**Swagger sẽ hoạt động hoàn toàn trên Vercel với tất cả features!** 🎉
