import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { DayOffDuration, DayOffType } from '@prisma/client';
import {
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
    description: 'Ngày nghỉ',
    example: '2024-02-15',
  })
  @IsNotEmpty()
  @IsDateString()
  work_date: string;

  @ApiProperty({
    description: 'Thời lượng nghỉ phép',
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
    description: 'Tiêu đề đơn xin nghỉ',
    example: 'Xin nghỉ phép năm',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

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
}
