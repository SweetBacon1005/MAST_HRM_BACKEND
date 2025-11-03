import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { NewsStatus } from '@prisma/client';

export class ApproveNewsDto {
  @ApiProperty({
    description: 'Trạng thái mới của tin tức (APPROVED hoặc REJECTED)',
    enum: ['APPROVED', 'REJECTED'],
    example: 'APPROVED',
  })
  @IsString()
  @IsNotEmpty()
  status: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({
    description: 'Lý do từ chối (chỉ khi status là REJECTED)',
    example: 'Nội dung chưa phù hợp với chính sách công ty',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}