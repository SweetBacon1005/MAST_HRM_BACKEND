import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'TimeConsistency', async: false })
export class TimeConsistencyValidator implements ValidatorConstraintInterface {
  validate(startTime: string, args: ValidationArguments) {
    const object = args.object as CreateOvertimeRequestDto;

    if (!startTime || !object.end_time) {
      return true; // Để các validator khác xử lý required fields
    }

    try {
      // Parse time strings (HH:mm format)
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = object.end_time.split(':').map(Number);

      // Convert to minutes for comparison
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      // Check if start time is before end time
      if (startMinutes >= endMinutes) {
        return false;
      }

      return true;
    } catch (_error) {
      return false;
    }
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Thời gian bắt đầu phải trước thời gian kết thúc.';
  }
}

export class CreateOvertimeRequestDto {
  @ApiHideProperty()
  @IsOptional()
  @IsNumber()
  user_id: number;

  @ApiProperty({
    description: 'Tiêu đề đơn xin tăng ca (Làm thêm giờ dự án)',
    example: 'Làm thêm giờ dự án ACME',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'ID dự án',
    example: 5,
  })
  @IsNotEmpty()
  @IsNumber()
  project_id: number;

  @ApiProperty({
    description: 'Ngày áp dụng',
    example: '2024-02-09',
  })
  @IsNotEmpty()
  @IsDateString()
  work_date: string;

  @ApiProperty({
    description: 'Thời gian bắt đầu (HH:mm)',
    example: '18:00',
  })
  @IsNotEmpty()
  @IsString()
  @Validate(TimeConsistencyValidator)
  start_time: string;

  @ApiProperty({
    description: 'Thời gian kết thúc (HH:mm)',
    example: '21:00',
  })
  @IsNotEmpty()
  @IsString()
  end_time: string;

  @ApiPropertyOptional({
    description: 'Lý do làm thêm giờ',
    example: 'Hoàn thành dự án gấp theo deadline',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
