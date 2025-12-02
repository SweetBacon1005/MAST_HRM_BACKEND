import { ApiProperty } from '@nestjs/swagger';
import { UserInformationStatus } from '@prisma/client';
import { Type, Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsBoolean } from 'class-validator';
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
    description: 'ID phòng ban',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  division_id?: number;

  @ApiProperty({
    description: 'ID vai trò',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  role_id?: number;

  @ApiProperty({
    description: 'Trạng thái người dùng',
    example: 'ACTIVE',
    enum: UserInformationStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserInformationStatus)
  status?: UserInformationStatus;

  @ApiProperty({
    description: 'Lọc theo user đã đăng ký khuôn mặt hoặc chưa',
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  is_register_face?: boolean;
}
