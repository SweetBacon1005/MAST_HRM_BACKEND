import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserNotificationResponseDto {
  @ApiProperty({ description: 'ID user_notification', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID notification gốc', example: 1 })
  notification_id: number;

  @ApiProperty({ description: 'Tiêu đề thông báo', example: 'Thông báo mới từ hệ thống' })
  title: string;

  @ApiProperty({ description: 'Nội dung thông báo', example: 'Có tin tức mới được phê duyệt' })
  content: string;

  @ApiProperty({ description: 'Trạng thái đã đọc', example: false })
  is_read: boolean;

  @ApiPropertyOptional({ description: 'Thời gian đọc', example: '2024-01-15T10:30:00Z' })
  read_at?: Date | null;

  @ApiProperty({ description: 'Thời gian tạo', example: '2024-01-15T10:00:00Z' })
  created_at: Date;

  @ApiProperty({ description: 'Thời gian cập nhật', example: '2024-01-15T10:00:00Z' })
  updated_at: Date;

  @ApiProperty({ description: 'Tên người tạo', example: 'Admin System' })
  creator_name: string;

  @ApiPropertyOptional({ description: 'Tiêu đề tin tức', example: 'Thông báo nghỉ lễ 30/4' })
  news_title?: string | null;

  @ApiPropertyOptional({ description: 'ID tin tức liên quan', example: 1 })
  news_id?: number | null;
}

export class UserNotificationDetailResponseDto {
  @ApiProperty({ description: 'ID user_notification', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID notification gốc', example: 1 })
  notification_id: number;

  @ApiProperty({ description: 'Tiêu đề thông báo', example: 'Thông báo mới từ hệ thống' })
  title: string;

  @ApiProperty({ description: 'Nội dung thông báo', example: 'Có tin tức mới được phê duyệt' })
  content: string;

  @ApiProperty({ description: 'Trạng thái đã đọc', example: false })
  is_read: boolean;

  @ApiPropertyOptional({ description: 'Thời gian đọc', example: '2024-01-15T10:30:00Z' })
  read_at?: Date | null;

  @ApiProperty({ description: 'Thời gian tạo', example: '2024-01-15T10:00:00Z' })
  created_at: Date;

  @ApiProperty({ description: 'Thời gian cập nhật', example: '2024-01-15T10:00:00Z' })
  updated_at: Date;

  @ApiProperty({ description: 'Tên người tạo', example: 'Admin System' })
  creator_name: string;

  @ApiPropertyOptional({ description: 'Tiêu đề tin tức', example: 'Thông báo nghỉ lễ 30/4' })
  news_title?: string | null;

  @ApiPropertyOptional({ description: 'ID tin tức liên quan', example: 1 })
  news_id?: number | null;
}
