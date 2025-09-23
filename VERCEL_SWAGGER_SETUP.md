# Cấu hình Swagger trên Vercel

## 🎯 **Cách enable Swagger trên Vercel**

### **1. Thêm Environment Variable trên Vercel:**

Vào Vercel Dashboard → Project → Settings → Environment Variables:

```bash
Variable Name: ENABLE_SWAGGER
Value: true
```

### **2. Logic hoạt động:**

```typescript
// Trong src/main.ts
const enableSwagger = process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true';
```

**Swagger sẽ được enable khi:**
- ✅ Development mode (`NODE_ENV !== 'production'`)
- ✅ Production với `ENABLE_SWAGGER=true`

### **3. URLs sau khi deploy:**

- **API Base**: `https://your-app.vercel.app`
- **Swagger UI**: `https://your-app.vercel.app/api`

## 🚀 **Steps để deploy:**

### **Step 1: Cấu hình Environment Variables**
```bash
# Vercel Dashboard → Settings → Environment Variables
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
ENABLE_SWAGGER=true  # ← Quan trọng!
```

### **Step 2: Deploy**
```bash
# Push code lên GitHub hoặc
vercel --prod
```

### **Step 3: Kiểm tra**
```bash
# Test API
curl https://your-app.vercel.app/

# Test Swagger
https://your-app.vercel.app/api
```

## 🔧 **Troubleshooting:**

### **Swagger không hiển thị:**
```bash
# 1. Check environment variable
vercel env ls

# 2. Check logs
vercel logs your-app

# 3. Verify ENABLE_SWAGGER=true exists
```

### **Swagger hiển thị nhưng API không work:**
```bash
# Check DATABASE_URL
# Check JWT_SECRET
# Check CORS settings
```

## 📱 **Test Commands:**

```bash
# Health check
curl https://your-app.vercel.app/

# Auth endpoint
curl -X POST https://your-app.vercel.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Swagger JSON
curl https://your-app.vercel.app/api-json
```

## 💡 **Best Practices:**

1. **Security**: Chỉ enable Swagger khi cần thiết
2. **Performance**: Swagger có thể ảnh hưởng performance nhẹ
3. **Documentation**: Giữ API docs up-to-date
4. **Environment**: Sử dụng environment variables để control

## 🎉 **Kết quả mong đợi:**

Sau khi setup đúng, bạn sẽ có:
- ✅ Full Swagger UI trên production
- ✅ JWT Authentication trong Swagger
- ✅ All API endpoints documented
- ✅ Interactive API testing interface
