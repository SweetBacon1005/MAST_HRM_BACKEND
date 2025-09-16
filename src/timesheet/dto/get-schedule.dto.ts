import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsInt } from 'class-validator';

export class GetScheduleDto {
  @ApiPropertyOptional({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2024-02-01',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2024-02-29',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'ID team (để xem lịch team)',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  team_id?: number;

  @ApiPropertyOptional({
    description: 'ID division (để xem lịch phòng ban)',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  division_id?: number;
}
