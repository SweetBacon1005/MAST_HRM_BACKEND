import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateNotificationDto {
  @ApiPropertyOptional({ 
    description: 'Tiêu đề thông báo', 
    example: 'Thông báo đã cập nhật' 
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ 
    description: 'Nội dung thông báo', 
    example: 'Nội dung thông báo đã được cập nhật' 
  })
  @IsOptional()
  @IsString()
  content?: string;
}
