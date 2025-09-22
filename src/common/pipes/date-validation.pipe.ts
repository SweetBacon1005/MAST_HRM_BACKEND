import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class DateValidationPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) {
      return value;
    }

    // Kiểm tra format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) {
      throw new BadRequestException(
        'Ngày phải có định dạng YYYY-MM-DD (VD: 2024-12-21)'
      );
    }

    // Kiểm tra ngày có hợp lệ không
    const date = new Date(value + 'T00:00:00.000Z');
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Ngày không hợp lệ');
    }

    // Kiểm tra ngày có đúng với input không (tránh trường hợp 2024-02-30)
    const [year, month, day] = value.split('-').map(Number);
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException('Ngày không tồn tại trong lịch');
    }

    return value;
  }
}

@Injectable()
export class DateRangeValidationPipe implements PipeTransform {
  transform(value: { start_date?: string; end_date?: string }): {
    start_date?: string;
    end_date?: string;
  } {
    if (!value) {
      return value;
    }

    const dateValidationPipe = new DateValidationPipe();

    // Validate từng ngày
    if (value.start_date) {
      value.start_date = dateValidationPipe.transform(value.start_date);
    }
    if (value.end_date) {
      value.end_date = dateValidationPipe.transform(value.end_date);
    }

    // Kiểm tra start_date <= end_date
    if (value.start_date && value.end_date) {
      const startDate = new Date(value.start_date);
      const endDate = new Date(value.end_date);

      if (startDate > endDate) {
        throw new BadRequestException(
          'Ngày bắt đầu không được lớn hơn ngày kết thúc'
        );
      }

      // Kiểm tra khoảng thời gian không quá 1 năm
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 365) {
        throw new BadRequestException(
          'Khoảng thời gian không được vượt quá 365 ngày'
        );
      }
    }

    return value;
  }
}

@Injectable()
export class WorkDateValidationPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) {
      throw new BadRequestException('Ngày làm việc là bắt buộc');
    }

    const dateValidationPipe = new DateValidationPipe();
    const validatedDate = dateValidationPipe.transform(value);

    // Kiểm tra không được quá 30 ngày trong tương lai
    const inputDate = new Date(validatedDate);
    const today = new Date();
    const maxFutureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (inputDate > maxFutureDate) {
      throw new BadRequestException(
        'Không thể tạo timesheet quá 30 ngày trong tương lai'
      );
    }

    // Kiểm tra không được quá 90 ngày trong quá khứ
    const minPastDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

    if (inputDate < minPastDate) {
      throw new BadRequestException(
        'Không thể tạo timesheet quá 90 ngày trong quá khứ'
      );
    }

    return validatedDate;
  }
}
