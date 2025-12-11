import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsNumber, Min, Max } from 'class-validator';

export class CreateLevelDto {
  @ApiProperty({
    description: 'Tên level',
    example: 'Senior',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Cấp độ (số)',
    example: 3,
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  level: number;

  @ApiProperty({
    description: 'Mô tả level',
    example: 'Cấp độ cao cấp',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
