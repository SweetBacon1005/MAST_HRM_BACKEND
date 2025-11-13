import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min, Max } from 'class-validator';

export class UpdateProjectProgressDto {
  @ApiProperty({ description: 'Ti?n d? d? án (0-100)', example: 75 })
  @Type(() => Number)
  @IsNumber({}, { message: 'progress ph?i là s?' })
  @Min(0, { message: 'progress t?i thi?u là 0' })
  @Max(100, { message: 'progress t?i da là 100' })
  progress!: number;
}
