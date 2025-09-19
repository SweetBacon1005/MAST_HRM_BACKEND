import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class UsersPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Tìm kiếm theo tên hoặc email',
    example: 'Nguyễn Văn A',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'ID vị trí công việc',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position_id?: number;

  @ApiProperty({
    description: 'ID văn phòng',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  office_id?: number;

  @ApiProperty({
    description: 'ID vai trò',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  role_id?: number;
}
