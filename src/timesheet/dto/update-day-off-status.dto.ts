import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOffStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateDayOffStatusDto {
  @ApiProperty({
    description: 'Trạng thái duyệt đơn nghỉ phép',
    enum: [DayOffStatus.APPROVED, DayOffStatus.REJECTED],
    example: DayOffStatus.APPROVED,
  })
  @IsEnum([DayOffStatus.APPROVED, DayOffStatus.REJECTED], {
    message: 'Trạng thái chỉ được là APPROVED (duyệt) hoặc REJECTED (từ chối)',
  })
  status: DayOffStatus;

  @ApiPropertyOptional({
    description: 'Lý do từ chối (bắt buộc khi status = REJECTED)',
    example: 'Không đủ ngày phép còn lại',
  })
  @IsOptional()
  @IsString({ message: 'Lý do từ chối phải là chuỗi' })
  @ValidateIf((o) => o.status === DayOffStatus.REJECTED, {
    message: 'Lý do từ chối là bắt buộc khi từ chối đơn nghỉ phép',
  })
  rejected_reason?: string;
}
