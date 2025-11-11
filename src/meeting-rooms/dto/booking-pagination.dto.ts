import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class BookingPaginationDto extends PaginationDto {
  @ApiProperty({ description: 'Lọc theo ID phòng', required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  @IsInt()
  room_id?: number;

  @ApiProperty({ description: 'Lọc theo ID người đặt', required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  @IsInt()
  organizer_id?: number;

  @ApiProperty({ description: 'Từ thời gian (ISO)', required: false })
  @IsOptional()
  from?: string;

  @ApiProperty({ description: 'Đến thời gian (ISO)', required: false })
  @IsOptional()
  to?: string;
}

