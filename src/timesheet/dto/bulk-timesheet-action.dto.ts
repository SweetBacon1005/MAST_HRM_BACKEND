import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, ArrayMinSize, IsIn } from 'class-validator';

export class BulkReviewTimesheetDto {
  @ApiProperty({
    description: 'Danh sách ID timesheets cần review',
    example: [1, 2, 3, 4, 5],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải có ít nhất 1 timesheet để review' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'Mỗi ID phải là số nguyên' })
  timesheet_ids: number[];

  @ApiProperty({
    description: 'Hành động: APPROVE (duyệt) hoặc REJECT (từ chối)',
    example: 'APPROVE',
    enum: ['APPROVE', 'REJECT'],
  })
  @IsIn(['APPROVE', 'REJECT'], { message: 'Action phải là APPROVE hoặc REJECT' })
  action: 'APPROVE' | 'REJECT';

  @ApiProperty({
    description: 'Lý do (bắt buộc khi REJECT)',
    example: 'Thiếu thông tin check-in/check-out',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class TimesheetForApprovalQueryDto {
  @ApiProperty({
    description: 'ID người dùng (optional)',
    example: 5,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;

  @ApiProperty({
    description: 'Tháng (YYYY-MM)',
    example: '2024-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiProperty({
    description: 'ID phòng ban',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  division_id?: number;

  @ApiProperty({
    description: 'ID team',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  team_id?: number;

  @ApiProperty({
    description: 'Trạng thái timesheet (mặc định là PENDING)',
    example: 'PENDING',
    required: false,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Số trang',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiProperty({
    description: 'Số bản ghi trên trang',
    example: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}
