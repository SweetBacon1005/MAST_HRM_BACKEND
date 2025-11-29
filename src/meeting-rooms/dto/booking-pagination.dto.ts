import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class BookingPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Lọc theo ID phòng',
    required: false,
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  @IsInt()
  room_id?: number;

  @ApiProperty({
    description: 'Lọc theo ID người đặt phòng',
    required: false,
    example: 5,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  @IsInt()
  organizer_id?: number;

  @ApiProperty({
    description: 'Từ ngày (YYYY-MM-DD)',
    required: false,
    example: '2024-01-15',
  })
  @IsOptional()
  from_date?: string;

  @ApiProperty({
    description: 'Đến ngày (YYYY-MM-DD)',
    required: false,
    example: '2024-01-20',
  })
  @IsOptional()
  to_date?: string;
}

