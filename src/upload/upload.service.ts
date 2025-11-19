import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { GetPresignedUrlDto } from './dto/get-presigned-url.dto';
import { PresignedUrlResponseDto } from './dto/presigned-url-response.dto';

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {
    // Cấu hình Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Tạo presigned URL để upload ảnh lên Cloudinary
   */
  async getPresignedUrl(
    user_id: number,
    getPresignedUrlDto: GetPresignedUrlDto,
  ): Promise<PresignedUrlResponseDto> {
    try {
      const { file_type, folder = 'avatars' } = getPresignedUrlDto;

      // Kiểm tra loại file được phép
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file_type)) {
        throw new BadRequestException(
          'Loại file không được hỗ trợ. Chỉ chấp nhận: JPEG, JPG, PNG, WEBP',
        );
      }

      // Tạo public_id duy nhất
      const timestamp = Date.now();
      const public_id = `${folder}/${user_id}_${timestamp}`;

      // Tạo signature cho upload
      const uploadParams = {
        public_id,
        timestamp: Math.round(timestamp / 1000),
        folder,
        transformation: 'w_500,h_500,c_fill,q_auto:good,f_webp',
      };

      // Tạo signature
      const signature = cloudinary.utils.api_sign_request(
        uploadParams,
        this.configService.get('CLOUDINARY_API_SECRET') || '',
      );

      // Tạo URL upload
      const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

      return {
        upload_url: uploadUrl,
        public_id,
        signature,
        timestamp: uploadParams.timestamp,
        api_key: this.configService.get('CLOUDINARY_API_KEY') || '',
        folder,
        transformation: uploadParams.transformation,
        expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 giờ
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Không thể tạo presigned URL: ' + error.message);
    }
  }

  /**
   * Xác thực URL ảnh từ Cloudinary
   */
  validateCloudinaryUrl(url: string): boolean {
    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
    const cloudinaryPattern = new RegExp(
      `^https://res\\.cloudinary\\.com/${cloudName}/image/upload/`,
    );
    return cloudinaryPattern.test(url);
  }

  /**
   * Xóa ảnh từ Cloudinary
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Lỗi khi xóa ảnh từ Cloudinary:', error);
      // Không throw error để không ảnh hưởng đến flow chính
    }
  }

  /**
   * Lấy URL ảnh đã được tối ưu hóa
   */
  getOptimizedImageUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
      format?: string;
    } = {},
  ): string {
    const {
      width = 500,
      height = 500,
      crop = 'fill',
      quality = 'auto:good',
      format = 'webp',
    } = options;

    return cloudinary.url(publicId, {
      width,
      height,
      crop,
      quality,
      format,
      secure: true,
    });
  }
}
