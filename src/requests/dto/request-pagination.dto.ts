import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsEnum, IsInt, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TimesheetStatus, RemoteType, DayOffStatus } from '@prisma/client';
import { ROLE_NAMES } from '../../auth/constants/role.constants';

export enum RequestPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class RequestPaginationDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái',
    enum: [...Object.values(TimesheetStatus), ...Object.values(DayOffStatus)],
    example: 'PENDING',
  })
  @IsOptional()
  @IsString()
  status?: string;

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
    description: 'Lọc theo mức độ ưu tiên request',
    enum: RequestPriority,
    example: RequestPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;

  @ApiPropertyOptional({
    description: 'Chỉ lấy request từ các lead (team_leader, division_head, project_manager)',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  leads_only?: boolean;

  @ApiPropertyOptional({
    description: 'Lọc theo role của người tạo request',
    enum: Object.values(ROLE_NAMES),
    example: ROLE_NAMES.TEAM_LEADER,
  })
  @IsOptional()
  @IsString()
  requester_role?: string;
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
