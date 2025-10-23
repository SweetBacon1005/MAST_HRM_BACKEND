# Upload Module - Cloudinary Integration

Module này cung cấp chức năng upload ảnh lên Cloudinary sử dụng presigned URLs.

## Tính năng

- ✅ Tạo presigned URLs để upload trực tiếp lên Cloudinary
- ✅ Tự động resize và optimize ảnh (500x500px, WebP format)
- ✅ Validate file type (JPEG, JPG, PNG, WEBP)
- ✅ Validate file size (tối đa 5MB cho avatar, 10MB cho ảnh thường)
- ✅ Xử lý lỗi và security
- ✅ Support multiple folders (avatars, images, documents, etc.)

## Cấu hình

Thêm các biến môi trường vào file `.env`:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

## API Endpoints

### POST /upload/presigned-url

Tạo presigned URL để upload ảnh lên Cloudinary.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "file_type": "image/jpeg",
  "folder": "avatars"
}
```

**Response:**
```json
{
  "upload_url": "https://api.cloudinary.com/v1_1/your-cloud-name/image/upload",
  "public_id": "avatars/123_1640995200000",
  "signature": "abc123def456...",
  "timestamp": 1640995200,
  "api_key": "123456789012345",
  "folder": "avatars",
  "transformation": [
    {
      "width": 500,
      "height": 500,
      "crop": "fill",
      "quality": "auto:good",
      "format": "webp"
    }
  ],
  "expires_at": "2024-01-01 13:00:00"
}
```

## Quy trình Upload

### 1. Backend - Lấy presigned URL

```typescript
// Controller
@Post('presigned-url')
async getPresignedUrl(@Body() dto: GetPresignedUrlDto) {
  return await this.uploadService.getPresignedUrl(userId, dto);
}
```

### 2. Frontend - Upload file

```typescript
// Service
async uploadAvatar(file: File): Promise<string> {
  // 1. Lấy presigned URL
  const presignedData = await this.getPresignedUrl({
    file_type: file.type,
    folder: 'avatars',
  });

  // 2. Upload lên Cloudinary
  const formData = new FormData();
  formData.append('file', file);
  formData.append('public_id', presignedData.public_id);
  formData.append('signature', presignedData.signature);
  formData.append('timestamp', presignedData.timestamp.toString());
  formData.append('api_key', presignedData.api_key);

  const response = await fetch(presignedData.upload_url, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  return result.secure_url;
}
```

### 3. Cập nhật profile với URL ảnh

```typescript
// Sau khi upload thành công
await profileService.updateAvatar({ avatar_url: imageUrl });
```

## Components Frontend

### AvatarUpload Component

```tsx
import { AvatarUpload } from '@/components/common/avatar-upload/AvatarUpload';

<AvatarUpload
  currentAvatarUrl={user.avatar}
  onUploadSuccess={(url) => {
    // Xử lý khi upload thành công
    setUser(prev => ({ ...prev, avatar: url }));
  }}
  onUploadError={(error) => {
    // Xử lý lỗi
    console.error('Upload error:', error);
  }}
  size="medium"
/>
```

### ImageUpload Component

```tsx
import { ImageUpload } from '@/components/common/image-upload/ImageUpload';

<ImageUpload
  onUploadSuccess={(url) => {
    // Xử lý khi upload thành công
    setImageUrl(url);
  }}
  folder="documents"
  currentImageUrl={currentImage}
/>
```

### useImageUpload Hook

```tsx
import { useImageUpload } from '@/hooks/useImageUpload';

const { isUploading, error, uploadAvatar, clearError } = useImageUpload({
  onSuccess: (url) => console.log('Uploaded:', url),
  onError: (error) => console.error('Error:', error),
});

// Sử dụng
const handleFileSelect = async (file: File) => {
  const url = await uploadAvatar(file);
  if (url) {
    // Xử lý thành công
  }
};
```

## Format thời gian

Tất cả các field thời gian được format tự động:

- **DateTime fields** (created_at, updated_at, checkin, checkout, etc.): `yyyy-mm-dd HH:MM:SS`
- **Date fields** (birthday, work_date, start_date, end_date, etc.): `yyyy-mm-dd`

Điều này được xử lý tự động bởi `DateFormatInterceptor`.

## Security

- ✅ JWT Authentication required
- ✅ Permission-based access control
- ✅ File type validation
- ✅ File size limits
- ✅ Presigned URL expiration (1 hour)
- ✅ Cloudinary signature validation

## Error Handling

Các lỗi phổ biến:

- `400 Bad Request`: File type không hỗ trợ, file quá lớn
- `401 Unauthorized`: Chưa đăng nhập
- `403 Forbidden`: Không có quyền truy cập
- `500 Internal Server Error`: Lỗi Cloudinary hoặc server

## Monitoring

Các log được ghi lại:

- Upload requests
- Cloudinary API calls
- Error details
- Performance metrics

## Optimization

- Ảnh tự động được resize về 500x500px
- Convert sang WebP format để giảm dung lượng
- Quality optimization: `auto:good`
- CDN delivery qua Cloudinary

## Testing

```bash
# Test upload endpoint
curl -X POST http://localhost:3000/upload/presigned-url \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"file_type": "image/jpeg", "folder": "avatars"}'
```
