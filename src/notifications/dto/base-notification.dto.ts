import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationCreatorDto {
  @ApiProperty({ description: 'ID của người tạo', example: 1 })
  id: number;

  @ApiProperty({ description: 'Email của người tạo', example: 'admin@company.com' })
  email: string;

  @ApiPropertyOptional({ description: 'Thông tin người tạo' })
  user_information?: {
    name: string;
  } | null;
}

export class NotificationNewsDto {
  @ApiProperty({ description: 'ID tin tức', example: 1 })
  id: number;

  @ApiProperty({ description: 'Tiêu đề tin tức', example: 'Thông báo nghỉ lễ 30/4' })
  title: string;
}

export class NotificationUserDto {
  @ApiProperty({ description: 'ID user', example: 1 })
  id: number;

  @ApiProperty({ description: 'Email user', example: 'user@company.com' })
  email: string;

  @ApiPropertyOptional({ description: 'Thông tin user' })
  user_information?: {
    name: string;
  };
}

export class UserNotificationRecipientDto {
  @ApiProperty({ description: 'ID user nhận thông báo', example: 1 })
  user_id: number;

  @ApiProperty({ description: 'Trạng thái đã đọc', example: false })
  is_read: boolean;

  @ApiPropertyOptional({ description: 'Thời gian đọc', example: '2024-01-15T10:30:00Z' })
  read_at?: Date | null;
}

export class NotificationRecipientDto {
  @ApiProperty({ description: 'ID user nhận thông báo', example: 1 })
  user_id: number;

  @ApiProperty({ description: 'Tên người nhận', example: 'Nguyễn Văn A' })
  userName: string;

  @ApiProperty({ description: 'Trạng thái đã đọc', example: false })
  is_read: boolean;

  @ApiPropertyOptional({ description: 'Thời gian đọc', example: '2024-01-15T10:30:00Z' })
  read_at?: Date | null;
}
