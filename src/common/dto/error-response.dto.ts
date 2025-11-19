import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ 
    description: 'HTTP status code',
    example: 400
  })
  status_code: number;

  @ApiProperty({ 
    description: 'Loại lỗi',
    example: 'Bad Request'
  })
  error: string;

  @ApiProperty({ 
    description: 'Thông báo lỗi',
    example: 'Dữ liệu đầu vào không hợp lệ'
  })
  message: string;

  @ApiProperty({ 
    description: 'Thời gian xảy ra lỗi',
    example: '2024-01-15T10:30:00.000Z'
  })
  timestamp: string;
}

export class ValidationErrorDetailDto {
  @ApiProperty({ 
    description: 'Tên trường bị lỗi',
    example: 'user_id'
  })
  field: string;

  @ApiProperty({ 
    description: 'Thông báo lỗi chi tiết',
    example: 'ID người dùng không được để trống'
  })
  message: string;

  @ApiProperty({ 
    description: 'Mã lỗi',
    example: 'VALIDATION_ERROR'
  })
  code: string;
}

export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({ 
    description: 'Chi tiết lỗi validation',
    type: [ValidationErrorDetailDto]
  })
  details: ValidationErrorDetailDto[];
}
