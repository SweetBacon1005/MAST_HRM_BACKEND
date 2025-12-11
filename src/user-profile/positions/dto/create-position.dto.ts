import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsNumber } from 'class-validator';

export class CreatePositionDto {
  @ApiProperty({
    description: 'Tên vị trí',
    example: 'Software Engineer',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'ID của level',
    example: 1,
  })
  @IsNumber()
  level_id: number;

  @ApiProperty({
    description: 'Mô tả vị trí',
    example: 'Phát triển phần mềm',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
