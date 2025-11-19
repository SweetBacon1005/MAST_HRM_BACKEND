import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationCreatorDto, NotificationNewsDto } from './base-notification.dto';
import { AdminNotificationResponseDto } from './admin-notification-response.dto';
import { UserNotificationResponseDto } from './user-notification-response.dto';

// Response khi tạo notification thành công (dựa trên service line 57-63)
export class CreateNotificationResponseDto {
  @ApiProperty({ description: 'Thông tin notification đã tạo' })
  notification: {
    id: number;
    title: string;
    content: string;
    news_id?: number | null;
    created_by?: number | null;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date | null;
  };

  @ApiProperty({ description: 'Thông báo kết quả', example: 'Đã tạo thông báo cho 150 người dùng' })
  message: string;

  @ApiProperty({ description: 'Số lượng người nhận', example: 150 })
  count: number;

  @ApiPropertyOptional({ description: 'Tiêu đề tin tức (nếu có)', example: 'Thông báo nghỉ lễ 30/4' })
  news_title?: string | null;
}

// Response khi cập nhật notification (dựa trên service line 401)
export class UpdateNotificationResponseDto {
  @ApiProperty({ description: 'ID thông báo', example: 1 })
  id: number;

  @ApiProperty({ description: 'Tiêu đề thông báo', example: 'Thông báo đã cập nhật' })
  title: string;

  @ApiProperty({ description: 'Nội dung thông báo', example: 'Nội dung đã được cập nhật' })
  content: string;

  @ApiPropertyOptional({ description: 'ID tin tức liên quan', example: 1 })
  news_id?: number | null;

  @ApiPropertyOptional({ description: 'ID người tạo', example: 1 })
  created_by?: number | null;

  @ApiProperty({ description: 'Thời gian tạo', example: '2024-01-15T10:00:00Z' })
  created_at: Date;

  @ApiProperty({ description: 'Thời gian cập nhật', example: '2024-01-15T10:30:00Z' })
  updated_at: Date;

  @ApiPropertyOptional({ description: 'Thời gian xóa', example: null })
  deleted_at?: Date | null;

  @ApiPropertyOptional({ description: 'Thông tin người tạo' })
  creator?: NotificationCreatorDto | null;

  @ApiPropertyOptional({ description: 'Thông tin tin tức liên quan' })
  news?: NotificationNewsDto | null;
}

// Response khi đánh dấu đã đọc (dựa trên service line 454)
export class MarkReadResponseDto {
  @ApiProperty({ description: 'ID user_notification', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID notification gốc', example: 1 })
  notification_id: number;

  @ApiProperty({ description: 'ID user', example: 1 })
  user_id: number;

  @ApiProperty({ description: 'Trạng thái đã đọc mới', example: true })
  is_read: boolean;

  @ApiPropertyOptional({ description: 'Thời gian đọc', example: '2024-01-15T10:30:00Z' })
  read_at?: Date | null;

  @ApiProperty({ description: 'Thời gian tạo', example: '2024-01-15T10:00:00Z' })
  created_at: Date;

  @ApiProperty({ description: 'Thời gian cập nhật', example: '2024-01-15T10:30:00Z' })
  updated_at: Date;

  @ApiPropertyOptional({ description: 'Thời gian xóa', example: null })
  deleted_at?: Date | null;

  @ApiProperty({ description: 'Thông tin notification' })
  notification: {
    title: string;
  };
}

// Response khi xóa notification (dựa trên service line 499 và 535)
export class DeleteNotificationResponseDto {
  @ApiProperty({ description: 'Thông báo kết quả', example: 'Xóa thông báo thành công' })
  message: string;
}

// Response khi tạo với Raw SQL (dựa trên service line 564-568)
export class CreateWithRawSQLResponseDto {
  @ApiProperty({ description: 'Thông tin notification đã tạo' })
  notification: {
    id: number;
    title: string;
    content: string;
    news_id?: number | null;
    created_by?: number | null;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date | null;
  };

  @ApiProperty({ description: 'Thông báo kết quả', example: 'Đã tạo thông báo cho 150 người dùng (Raw SQL)' })
  message: string;

  @ApiProperty({ description: 'Số lượng người nhận', example: 150 })
  count: number;
}
