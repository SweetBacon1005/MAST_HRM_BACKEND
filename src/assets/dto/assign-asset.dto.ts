import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class AssignAssetDto {
  @ApiProperty({
    description: 'ID người dùng được gán tài sản',
    example: 123,
  })
  @IsInt()
  user_id: number;

  @ApiPropertyOptional({
    description: 'Ghi chú khi gán tài sản',
    example: 'Gán laptop cho nhân viên mới',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UnassignAssetDto {
  @ApiPropertyOptional({
    description: 'Ghi chú khi thu hồi tài sản',
    example: 'Thu hồi do nhân viên nghỉ việc',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
