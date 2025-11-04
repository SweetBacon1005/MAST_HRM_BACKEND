import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  NotificationCreatorDto, 
  NotificationNewsDto, 
  UserNotificationRecipientDto,
  NotificationRecipientDto 
} from './base-notification.dto';

// Response cho Admin xem danh sách notifications (dựa trên service line 132-139)
export class AdminNotificationResponseDto {
  @ApiProperty({ description: 'ID thông báo', example: 1 })
  id: number;

  @ApiProperty({ description: 'Tiêu đề thông báo', example: 'Thông báo mới từ hệ thống' })
  title: string;

  @ApiProperty({ description: 'Nội dung thông báo', example: 'Có tin tức mới được phê duyệt' })
  content: string;

  @ApiPropertyOptional({ description: 'ID tin tức liên quan', example: 1 })
  news_id?: number | null;

  @ApiPropertyOptional({ description: 'ID người tạo', example: 1 })
  created_by?: number | null;

  @ApiProperty({ description: 'Thời gian tạo', example: '2024-01-15T10:00:00Z' })
  created_at: Date;

  @ApiProperty({ description: 'Thời gian cập nhật', example: '2024-01-15T10:00:00Z' })
  updated_at: Date;

  @ApiPropertyOptional({ description: 'Thời gian xóa', example: null })
  deleted_at?: Date | null;

  @ApiPropertyOptional({ description: 'Thông tin người tạo' })
  creator?: NotificationCreatorDto | null;

  @ApiPropertyOptional({ description: 'Thông tin tin tức liên quan' })
  news?: NotificationNewsDto | null;

  @ApiProperty({ description: 'Tên người tạo', example: 'Admin System' })
  creatorName: string;

  @ApiPropertyOptional({ description: 'Tiêu đề tin tức', example: 'Thông báo nghỉ lễ 30/4' })
  newsTitle?: string | null;

  @ApiProperty({ description: 'Tổng số người nhận', example: 150 })
  totalRecipients: number;

  @ApiProperty({ description: 'Số người đã đọc', example: 45 })
  readCount: number;
}

// Response cho Admin xem chi tiết notification (dựa trên service line 286-299)
export class AdminNotificationDetailResponseDto {
  @ApiProperty({ description: 'ID thông báo', example: 1 })
  id: number;

  @ApiProperty({ description: 'Tiêu đề thông báo', example: 'Thông báo mới từ hệ thống' })
  title: string;

  @ApiProperty({ description: 'Nội dung thông báo', example: 'Có tin tức mới được phê duyệt' })
  content: string;

  @ApiPropertyOptional({ description: 'ID tin tức liên quan', example: 1 })
  news_id?: number | null;

  @ApiPropertyOptional({ description: 'ID người tạo', example: 1 })
  created_by?: number | null;

  @ApiProperty({ description: 'Thời gian tạo', example: '2024-01-15T10:00:00Z' })
  created_at: Date;

  @ApiProperty({ description: 'Thời gian cập nhật', example: '2024-01-15T10:00:00Z' })
  updated_at: Date;

  @ApiPropertyOptional({ description: 'Thời gian xóa', example: null })
  deleted_at?: Date | null;

  @ApiPropertyOptional({ description: 'Thông tin người tạo' })
  creator?: NotificationCreatorDto | null;

  @ApiPropertyOptional({ description: 'Thông tin tin tức liên quan' })
  news?: NotificationNewsDto | null;

  @ApiProperty({ description: 'Tên người tạo', example: 'Admin System' })
  creatorName: string;

  @ApiPropertyOptional({ description: 'Tiêu đề tin tức', example: 'Thông báo nghỉ lễ 30/4' })
  newsTitle?: string | null;

  @ApiProperty({ description: 'Danh sách người nhận chi tiết', type: [NotificationRecipientDto] })
  recipients: NotificationRecipientDto[];
}
