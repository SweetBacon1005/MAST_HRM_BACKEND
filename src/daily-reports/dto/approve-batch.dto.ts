import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, ArrayMinSize, IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export enum BatchAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ApproveBatchDto {
  @ApiProperty({
    description: 'Danh sách ID của các daily report cần xử lý',
    example: [1, 2, 3, 4, 5],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Danh sách ID không được rỗng' })
  @IsInt({ each: true, message: 'Mỗi ID phải là số nguyên' })
  report_ids: number[];

  @ApiProperty({
    description: 'Hành động: approve hoặc reject',
    enum: BatchAction,
    example: BatchAction.APPROVE,
    default: BatchAction.APPROVE,
  })
  @IsEnum(BatchAction, { message: 'Action phải là approve hoặc reject' })
  @IsOptional()
  action?: BatchAction = BatchAction.APPROVE;

  @ApiProperty({
    description: 'Lý do từ chối (bắt buộc khi action = reject)',
    example: 'Thiếu mô tả chi tiết công việc',
    type: String,
    required: false,
  })
  @ValidateIf((o) => o.action === BatchAction.REJECT)
  @IsString()
  @IsOptional()
  rejected_reason?: string;
}
