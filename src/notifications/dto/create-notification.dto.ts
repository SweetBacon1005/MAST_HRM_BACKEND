import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsInt, IsArray } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({ 
    description: 'Tiêu đề thông báo', 
    example: 'Thông báo mới từ hệ thống' 
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ 
    description: 'Nội dung thông báo', 
    example: 'Có tin tức mới được phê duyệt: "Thông báo nghỉ lễ 30/4"' 
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ 
    description: 'ID tin tức liên quan (nếu có)', 
    example: 1 
  })
  @IsOptional()
  @IsInt()
  news_id?: number;
}
