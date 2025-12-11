import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'ID phòng họp',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  room_id!: number;

  @ApiProperty({
    description: 'Tiêu đề cuộc họp',
    example: 'Họp team Sprint Planning',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    description: 'Mô tả chi tiết cuộc họp',
    example: 'Thảo luận kế hoạch sprint tiếp theo và phân công công việc',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Ngày đặt phòng (YYYY-MM-DD)',
    example: '2024-01-15',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  booking_date!: string;

  @ApiProperty({
    description: 'Giờ bắt đầu (HH:mm định dạng 24h)',
    example: '09:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Giờ bắt đầu phải có định dạng HH:mm (ví dụ: 09:00)',
  })
  start_hour!: string;

  @ApiProperty({
    description: 'Giờ kết thúc (HH:mm định dạng 24h). Tối đa 4 giờ từ giờ bắt đầu',
    example: '11:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Giờ kết thúc phải có định dạng HH:mm (ví dụ: 11:00)',
  })
  end_hour!: string;
}
