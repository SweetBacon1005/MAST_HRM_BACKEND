import { ApiProperty } from '@nestjs/swagger';

export class IpValidationResponseDto {
  @ApiProperty({
    description: 'IP address của client',
    example: '192.168.1.100',
  })
  clientIp: string;

  @ApiProperty({
    description: 'Có đang ở mạng văn phòng không',
    example: true,
  })
  isOfficeNetwork: boolean;

  @ApiProperty({
    description: 'Có remote work request được duyệt không',
    example: false,
  })
  hasApprovedRemoteRequest: boolean;

  @ApiProperty({
    description: 'Thông báo về trạng thái IP validation',
    example: 'Check in/out từ văn phòng được phép',
  })
  validationMessage: string;

  @ApiProperty({
    description: 'Danh sách IP văn phòng được phép (chỉ hiển thị cho admin)',
    type: [String],
    required: false,
    example: ['192.168.1.0/24', '10.0.0.100'],
  })
  allowedIps?: string[];
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
  checkinTime: Date;

  @ApiProperty({
    description: 'Số phút đi muộn',
    example: 30,
  })
  lateMinutes: number;

  @ApiProperty({
    description: 'Thông tin IP validation',
    type: IpValidationResponseDto,
  })
  ipValidation: IpValidationResponseDto;

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
  checkoutTime: Date;

  @ApiProperty({
    description: 'Số phút về sớm',
    example: 0,
  })
  earlyMinutes: number;

  @ApiProperty({
    description: 'Tổng thời gian làm việc (phút)',
    example: 480,
  })
  totalWorkMinutes: number;

  @ApiProperty({
    description: 'Thông tin IP validation',
    type: IpValidationResponseDto,
  })
  ipValidation: IpValidationResponseDto;

  @ApiProperty({
    description: 'Thông báo thành công',
    example: 'Check-out thành công',
  })
  message: string;
}
