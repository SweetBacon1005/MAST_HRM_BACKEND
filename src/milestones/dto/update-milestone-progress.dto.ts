import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min, Max } from 'class-validator';

export class UpdateMilestoneProgressDto {
  @ApiProperty({
    description: 'Tiến độ mốc (0-100)',
    example: 50,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Tiến độ phải từ 0-100' })
  @Max(100, { message: 'Tiến độ phải từ 0-100' })
  progress: number;
}
