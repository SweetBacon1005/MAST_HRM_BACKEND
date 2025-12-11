import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalStatus, RemoteType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';
import { ROLE_NAMES } from '../../auth/constants/role.constants';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class RequestPaginationDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái',
    enum: ApprovalStatus,
    example: ApprovalStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ApprovalStatus)
  status?: ApprovalStatus;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo division ID (chỉ dành cho admin)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  division_id?: number;

  @ApiPropertyOptional({
    description: 'Lọc theo role của người tạo request',
    enum: ROLE_NAMES,
    example: ROLE_NAMES.TEAM_LEADER,
  })
  @IsOptional()
  @IsEnum(ROLE_NAMES)
  requester_role?: string;

  @ApiPropertyOptional({
    description:
      'Lọc theo team ID (Division Head có thể filter teams trong division)',
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  team_id?: number;
}

export class RemoteWorkRequestPaginationDto extends RequestPaginationDto {
  @ApiPropertyOptional({
    description: 'Lọc theo loại remote work',
    enum: RemoteType,
    example: RemoteType.REMOTE,
  })
  @IsOptional()
  @IsEnum(RemoteType)
  remote_type?: RemoteType;
}
