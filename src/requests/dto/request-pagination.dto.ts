import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TimesheetStatus, RemoteType, DayOffStatus } from '@prisma/client';

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
