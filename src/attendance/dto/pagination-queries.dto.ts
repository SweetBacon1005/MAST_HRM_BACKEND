import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class WorkShiftPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Tên ca làm việc',
    example: 'Ca sáng',
    required: false,
  })
  @IsOptional()
  @IsString()
  shift_name?: string;

  @ApiProperty({
    description: 'Trạng thái ca làm việc',
    example: 'active',
    required: false,
    enum: ['active', 'inactive'],
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class LeaveRequestPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'ID người dùng',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;

  @ApiProperty({
    description: 'Trạng thái đơn nghỉ phép',
    example: 'pending',
    required: false,
    enum: ['pending', 'approved', 'rejected'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Loại nghỉ phép',
    example: 'annual_leave',
    required: false,
  })
  @IsOptional()
  @IsString()
  leave_type?: string;

  @ApiProperty({
    description: 'Ngày bắt đầu',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiProperty({
    description: 'Ngày kết thúc',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsString()
  end_date?: string;
}

export class AttendanceReportPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Loại báo cáo',
    example: 'summary',
    required: false,
    enum: ['summary', 'detailed', 'penalty'],
  })
  @IsOptional()
  @IsString()
  report_type?: string;

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
    description: 'Ngày bắt đầu',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiProperty({
    description: 'Ngày kết thúc',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiProperty({
    description: 'Danh sách ID người dùng',
    example: [1, 2, 3],
    required: false,
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  user_ids?: number[];
}

export class PenaltyRulePaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Block phạt',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  block?: number;

  @ApiProperty({
    description: 'Số phút tối thiểu',
    example: 15,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  min_minutes?: number;
}
