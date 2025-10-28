import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, IsDateString } from 'class-validator';
import { CreateAssetDto } from './create-asset.dto';

export class UpdateAssetDto extends PartialType(CreateAssetDto) {
  @ApiPropertyOptional({
    description: 'Trạng thái tài sản',
    enum: ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED', 'LOST', 'DAMAGED'],
    example: 'AVAILABLE',
  })
  @IsOptional()
  @IsEnum(['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED', 'LOST', 'DAMAGED'])
  status?: string;

  @ApiPropertyOptional({
    description: 'ID user được gán tài sản',
    example: 123,
  })
  @IsOptional()
  @IsInt()
  assigned_to?: number;

  @ApiPropertyOptional({
    description: 'Ngày gán tài sản (YYYY-MM-DD)',
    example: '2024-01-20',
  })
  @IsOptional()
  @IsDateString()
  assigned_date?: string;
}
