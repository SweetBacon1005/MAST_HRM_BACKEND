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

@ValidatorConstraint({ name: 'DateTimeConsistency', async: false })
export class DateTimeConsistencyValidator
  implements ValidatorConstraintInterface
{
  validate(date: string, args: ValidationArguments) {
    const object = args.object as CreateOvertimeRequestDto;

    if (!date || !object.start_time || !object.end_time) {
      return true; // Để các validator khác xử lý required fields
    }

    try {
      const dateOnly = new Date(date);
      const startTime = new Date(object.start_time);
      const endTime = new Date(object.end_time);

      // Chuyển đổi sang múi giờ Vietnam (UTC+7)
      const getVietnamDate = (date: Date): string => {
        // Tạo formatter cho múi giờ Vietnam
        const vietnamFormatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Ho_Chi_Minh',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        return vietnamFormatter.format(date);
      };

      // Lấy ngày trong múi giờ Vietnam (YYYY-MM-DD)
      const dateStr = getVietnamDate(dateOnly);
      const startDateStr = getVietnamDate(startTime);
      const endDateStr = getVietnamDate(endTime);

      // Kiểm tra date khớp với start_time trong múi giờ Vietnam
      if (dateStr !== startDateStr) {
        return false;
      }

      // Kiểm tra start_time và end_time cùng ngày trong múi giờ Vietnam
      if (startDateStr !== endDateStr) {
        return false;
      }

      // Kiểm tra start_time < end_time (UTC time)
      if (startTime >= endTime) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return 'Ngày làm thêm giờ phải khớp với ngày trong thời gian bắt đầu và kết thúc (theo múi giờ Vietnam UTC+7). Thời gian bắt đầu phải trước thời gian kết thúc và cùng trong một ngày.';
  }
}

export class CreateOvertimeRequestDto {
  @ApiHideProperty()
  @IsOptional()
  @IsNumber()
  user_id: number;

  @ApiProperty({
    description:
      'Ngày làm thêm giờ (phải khớp với ngày trong start_time và end_time theo múi giờ Vietnam UTC+7)',
    example: '2024-02-09',
  })
  @IsNotEmpty()
  @IsDateString()
  @Validate(DateTimeConsistencyValidator)
  date: string;

  @ApiProperty({
    description:
      'Thời gian bắt đầu UTC (phải cùng ngày với date theo múi giờ Vietnam và trước end_time)',
    example: '2024-02-09T11:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  start_time: string;

  @ApiProperty({
    description:
      'Thời gian kết thúc UTC (phải cùng ngày với date theo múi giờ Vietnam và sau start_time)',
    example: '2024-02-09T14:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  end_time: string;

  @ApiPropertyOptional({
    description: 'Tổng số giờ',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  total?: number;

  @ApiPropertyOptional({
    description: 'Giá trị',
    example: 450000,
  })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({
    description: 'ID dự án',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  project_id?: number;

  @ApiPropertyOptional({
    description: 'Lý do làm thêm giờ',
    example: 'Hoàn thành dự án gấp',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
