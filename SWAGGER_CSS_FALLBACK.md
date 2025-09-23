# Swagger CSS Fallback Solutions

## 🐛 **Vấn đề CSS không load:**

Có thể do:
1. CDN bị block
2. CORS issues
3. Network problems trên Vercel
4. CSP (Content Security Policy) restrictions

## 🔧 **Giải pháp đã thử:**

### **1. External CSS từ unpkg:**
```typescript
customCssUrl: 'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css',
```

### **2. Thêm !important để override:**
```css
.swagger-ui .topbar { 
  background-color: #2c3e50 !important; 
}
```

## 🚨 **Nếu vẫn lỗi CSS, thử các giải pháp sau:**

### **Giải pháp 1: Multiple CDN Fallback**
```typescript
customCssUrl: [
  'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css',
  'https://cdn.jsdelivr.net/npm/swagger-ui-dist@4.15.5/swagger-ui.css',
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.css',
],
```

### **Giải pháp 2: Inline CSS hoàn toàn**
```typescript
// Không dùng external CSS, chỉ dùng inline
SwaggerModule.setup('api', app, document, {
  customCss: `
    /* Basic reset và styling */
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto; }
    
    .swagger-ui {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
    }
    
    .swagger-ui .topbar {
      background: #2c3e50;
      padding: 10px 0;
    }
    
    .swagger-ui .info {
      margin: 50px 0;
    }
    
    .swagger-ui .info .title {
      color: #2c3e50;
      font-size: 36px;
      font-weight: bold;
      margin: 0 0 20px 0;
    }
    
    .swagger-ui .opblock {
      border: 1px solid #e9ecef;
      border-radius: 4px;
      margin: 0 0 15px 0;
    }
    
    .swagger-ui .opblock.opblock-get {
      background: rgba(97, 175, 254, 0.1);
      border-color: #61affe;
    }
    
    .swagger-ui .opblock.opblock-post {
      background: rgba(73, 204, 144, 0.1);
      border-color: #49cc90;
    }
    
    .swagger-ui .opblock.opblock-put {
      background: rgba(252, 161, 48, 0.1);
      border-color: #fca130;
    }
    
    .swagger-ui .opblock.opblock-delete {
      background: rgba(249, 62, 62, 0.1);
      border-color: #f93e3e;
    }
    
    .swagger-ui .opblock.opblock-patch {
      background: rgba(80, 227, 194, 0.1);
      border-color: #50e3c2;
    }
  `,
});
```

### **Giải pháp 3: Disable external CSS**
```typescript
// Chỉ dùng NestJS default styling
SwaggerModule.setup('api', app, document, {
  swaggerOptions: {
    persistAuthorization: true,
  },
  customSiteTitle: 'MAST HRM API',
});
```

## 🔍 **Debug CSS issues:**

### **1. Check trong Browser DevTools:**
```javascript
// Console
console.log('CSS loaded:', document.querySelector('link[href*="swagger-ui"]'));

// Network tab - check CSS request status
```

### **2. Test CDN availability:**
```bash
curl -I https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css
curl -I https://cdn.jsdelivr.net/npm/swagger-ui-dist@4.15.5/swagger-ui.css
```

### **3. Check CORS:**
```javascript
fetch('https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css')
  .then(r => console.log('Status:', r.status))
  .catch(e => console.log('Error:', e));
```

## 🎯 **Recommended approach:**

### **Bước 1: Thử current setup**
- Sử dụng unpkg CDN với !important styles

### **Bước 2: Nếu không work**
- Thêm multiple CDN fallbacks
- Check Vercel logs for errors

### **Bước 3: Last resort**  
- Sử dụng minimal inline CSS
- Focus vào functionality hơn styling

## 📱 **Test URLs:**

```bash
# Local test
http://localhost:3000/api

# Vercel test  
https://your-app.vercel.app/api

# CSS direct test
https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css
```

**Priority: Functionality > Styling. Quan trọng là API docs hoạt động!** 🚀
