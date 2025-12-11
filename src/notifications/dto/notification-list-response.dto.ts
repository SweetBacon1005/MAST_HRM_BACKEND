import { ApiProperty } from '@nestjs/swagger';
import { AdminNotificationResponseDto } from './admin-notification-response.dto';
import { UserNotificationResponseDto } from './user-notification-response.dto';

// Response danh sách notifications với pagination (dựa trên service line 141-149 và 230-238)
export class NotificationListResponseDto {
  @ApiProperty({ 
    description: 'Danh sách thông báo',
    oneOf: [
      { type: 'array', items: { $ref: '#/components/schemas/AdminNotificationResponseDto' } },
      { type: 'array', items: { $ref: '#/components/schemas/UserNotificationResponseDto' } }
    ]
  })
  data: AdminNotificationResponseDto[] | UserNotificationResponseDto[];

  @ApiProperty({ description: 'Thông tin phân trang' })
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
