import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min, Max } from 'class-validator';

export class UpdateProjectProgressDto {
  @ApiProperty({ description: 'Tiến độ dự án (0-100)', example: 75 })
  @Type(() => Number)
  @IsNumber({}, { message: 'progress phải là số' })
  @Min(0, { message: 'progress tối thiểu là 0' })
  @Max(100, { message: 'progress tối đa là 100' })
  progress!: number;
}
