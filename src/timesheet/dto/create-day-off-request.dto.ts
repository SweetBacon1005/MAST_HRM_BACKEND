import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { DayOffDuration, DayOffType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateDayOffRequestDto {
  @ApiHideProperty()
  @IsOptional()
  @IsNumber()
  user_id: number;

  @ApiProperty({
    description: 'Ngày bắt đầu nghỉ',
    example: '2024-02-15',
  })
  @IsNotEmpty()
  @IsDateString()
  start_date: string;

  @ApiProperty({
    description: 'Ngày kết thúc nghỉ',
    example: '2024-02-17',
  })
  @IsNotEmpty()
  @IsDateString()
  end_date: string;

  @ApiProperty({
    description: '',
    example: DayOffDuration.FULL_DAY,
    enum: [
      DayOffDuration.FULL_DAY,
      DayOffDuration.MORNING,
      DayOffDuration.AFTERNOON,
    ],
  })
  @IsNotEmpty()
  @IsString()
  @IsIn([
    DayOffDuration.FULL_DAY,
    DayOffDuration.MORNING,
    DayOffDuration.AFTERNOON,
  ])
  duration: DayOffDuration;

  @ApiProperty({
    description: 'Tổng số ngày nghỉ (0.5 cho nửa ngày, 1 cho cả ngày)',
    example: 3,
  })
  @IsNotEmpty()
  @IsNumber()
  total: number;

  @ApiProperty({
    description:
      'Loại nghỉ phép (PAID: có lương, UNPAID: không lương, SICK: ốm đau, MATERNITY: thai sản, PRIVATE: việc riêng, COMPENSATION: nghỉ bù)',
    example: DayOffType.PAID,
    enum: [
      DayOffType.PAID,
      DayOffType.UNPAID,
      DayOffType.SICK,
      DayOffType.MATERNITY,
      DayOffType.PERSONAL,
      DayOffType.COMPENSATORY,
    ],
  })
  @IsNotEmpty()
  @IsString()
  @IsIn([
    DayOffType.PAID,
    DayOffType.UNPAID,
    DayOffType.SICK,
    DayOffType.MATERNITY,
    DayOffType.PERSONAL,
    DayOffType.COMPENSATORY,
  ])
  type: DayOffType;

  @ApiProperty({
    description: 'Lý do nghỉ phép',
    example: 'Nghỉ phép năm',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Ghi chú thêm',
    example: 'Sẽ hoàn thành công việc trước khi nghỉ',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Có phải nghỉ bù không (TRUE: có, FALSE: không)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_past?: boolean;
}
