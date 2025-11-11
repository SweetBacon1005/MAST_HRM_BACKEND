import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class RoomPaginationDto extends PaginationDto {
  @ApiProperty({ description: 'Tìm theo tên phòng', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Lọc theo trạng thái hoạt động', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

