import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { GetPresignedUrlDto } from './dto/get-presigned-url.dto';
import { PresignedUrlResponseDto } from './dto/presigned-url-response.dto';
import { UploadService } from './upload.service';

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presigned-url')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('user.profile.update')
  @ApiOperation({
    summary: 'Lấy presigned URL để upload ảnh lên Cloudinary',
    description: `
    Endpoint này tạo ra một presigned URL để client có thể upload ảnh trực tiếp lên Cloudinary.
    
    **Quy trình sử dụng:**
    1. Gọi API này để lấy presigned URL và các thông tin cần thiết
    2. Sử dụng thông tin trả về để upload file trực tiếp lên Cloudinary
    3. Sau khi upload thành công, sử dụng URL ảnh để cập nhật avatar
    
    **Lưu ý:**
    - Presigned URL có thời hạn 1 giờ
    - Chỉ hỗ trợ các định dạng: JPEG, JPG, PNG, WEBP
    - Ảnh sẽ được tự động resize về 500x500px và chuyển đổi sang WebP
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Tạo presigned URL thành công',
    type: PresignedUrlResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đầu vào không hợp lệ',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập',
  })
  async getPresignedUrl(
    @GetCurrentUser('id') user_id: number,
    @Body() getPresignedUrlDto: GetPresignedUrlDto,
  ): Promise<PresignedUrlResponseDto> {
    return await this.uploadService.getPresignedUrl(user_id, getPresignedUrlDto);
  }
}
