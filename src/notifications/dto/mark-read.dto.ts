import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class MarkReadDto {
  @ApiProperty({ 
    description: 'Trạng thái đã đọc', 
    example: true 
  })
  @IsBoolean()
  is_read: boolean;
}
