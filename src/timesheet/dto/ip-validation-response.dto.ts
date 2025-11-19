import { ApiProperty } from '@nestjs/swagger';

export class ip_validationResponseDto {
  @ApiProperty({
    description: 'IP address của client',
    example: '192.168.1.100',
  })
  client_ip: string;

  @ApiProperty({
    description: 'Có đang ở mạng văn phòng không',
    example: true,
  })
  is_office_network: boolean;

  @ApiProperty({
    description: 'Có remote work request được duyệt không',
    example: false,
  })
  has_approved_remote_request: boolean;

  @ApiProperty({
    description: 'Thông báo về trạng thái IP validation',
    example: 'Check in/out từ văn phòng được phép',
  })
  validation_message: string;

  @ApiProperty({
    description: 'Danh sách IP văn phòng được phép (chỉ hiển thị cho admin)',
    type: [String],
    required: false,
    example: ['192.168.1.0/24', '10.0.0.100'],
  })
  allowed_ips?: string[];
}

export class CheckinResponseDto {
  @ApiProperty({
    description: 'ID của attendance log được tạo',
    example: 123,
  })
  id: number;

  @ApiProperty({
    description: 'Thời gian check-in',
    example: '2024-01-15T08:30:00.000Z',
  })
  checkin_time: Date;

  @ApiProperty({
    description: 'Số phút đi muộn',
    example: 30,
  })
  late_minutes: number;

  @ApiProperty({
    description: 'Thông tin IP validation',
    type: ip_validationResponseDto,
  })
  ip_validation: ip_validationResponseDto;

  @ApiProperty({
    description: 'Thông báo thành công',
    example: 'Check-in thành công',
  })
  message: string;
}

export class CheckoutResponseDto {
  @ApiProperty({
    description: 'ID của attendance log được cập nhật',
    example: 123,
  })
  id: number;

  @ApiProperty({
    description: 'Thời gian check-out',
    example: '2024-01-15T17:30:00.000Z',
  })
  checkout_time: Date;

  @ApiProperty({
    description: 'Số phút về sớm',
    example: 0,
  })
  early_minutes: number;

  @ApiProperty({
    description: 'Tổng thời gian làm việc (phút)',
    example: 480,
  })
  total_work_minutes: number;

  @ApiProperty({
    description: 'Thông tin IP validation',
    type: ip_validationResponseDto,
  })
  ip_validation: ip_validationResponseDto;

  @ApiProperty({
    description: 'Thông báo thành công',
    example: 'Check-out thành công',
  })
  message: string;
}
