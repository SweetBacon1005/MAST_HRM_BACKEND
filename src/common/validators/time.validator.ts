import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates time string format HH:MM-HH:MM (e.g., "08:30-17:30")
 */
export function IsTimeRange(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isTimeRange',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value || typeof value !== 'string') return true; // Optional field

          // Format: HH:MM-HH:MM
          const timeRangeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          
          if (!timeRangeRegex.test(value)) {
            return false;
          }

          // Validate start time < end time
          const [startTime, endTime] = value.split('-');
          const [startHour, startMin] = startTime.split(':').map(Number);
          const [endHour, endMin] = endTime.split(':').map(Number);
          
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          return startMinutes < endMinutes;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} phải có định dạng HH:MM-HH:MM và thời gian bắt đầu phải nhỏ hơn thời gian kết thúc (VD: 08:30-17:30)`;
        },
      },
    });
  };
}

/**
 * Validates work time in minutes (reasonable range: 0-960 minutes = 16 hours)
 */
export function IsWorkTimeMinutes(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isWorkTimeMinutes',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value === null || value === undefined) return true; // Optional field
          
          if (typeof value !== 'number' || !Number.isInteger(value)) {
            return false;
          }
          
          // Work time should be between 0 and 960 minutes (16 hours)
          return value >= 0 && value <= 960;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} phải là số nguyên từ 0 đến 960 phút (16 giờ)`;
        },
      },
    });
  };
}

/**
 * Validates late/early time in minutes (reasonable range: 0-480 minutes = 8 hours)
 */
export function IsLateEarlyTime(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isLateEarlyTime',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value === null || value === undefined) return true; // Optional field
          
          if (typeof value !== 'number' || !Number.isInteger(value)) {
            return false;
          }
          
          // Late/early time should be between 0 and 480 minutes (8 hours)
          return value >= 0 && value <= 480;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} phải là số nguyên từ 0 đến 480 phút (8 giờ)`;
        },
      },
    });
  };
}

/**
 * Validates break time in minutes (reasonable range: 0-120 minutes = 2 hours)
 */
export function IsBreakTime(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isBreakTime',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value === null || value === undefined) return true; // Optional field
          
          if (typeof value !== 'number' || !Number.isInteger(value)) {
            return false;
          }
          
          // Break time should be between 0 and 120 minutes (2 hours)
          return value >= 0 && value <= 120;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} phải là số nguyên từ 0 đến 120 phút (2 giờ)`;
        },
      },
    });
  };
}

/**
 * Validates fines amount (reasonable range: 0-10,000,000 VND)
 */
export function IsFinesAmount(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isFinesAmount',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value === null || value === undefined) return true; // Optional field
          
          if (typeof value !== 'number' || !Number.isInteger(value)) {
            return false;
          }
          
          // Fines should be between 0 and 10,000,000 VND
          return value >= 0 && value <= 10000000;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} phải là số nguyên từ 0 đến 10,000,000 VND`;
        },
      },
    });
  };
}

/**
 * Validates that checkout time is after checkin time
 */
export function IsCheckoutAfterCheckin(
  checkinProperty: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isCheckoutAfterCheckin',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [checkinProperty],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // Optional field
          
          const checkin = (args.object as any)[checkinProperty];
          if (!checkin) return true; // If no checkin, skip validation
          
          const checkinTime = new Date(checkin);
          const checkoutTime = new Date(value);
          
          // Checkout must be after checkin
          return checkoutTime > checkinTime;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} phải sau thời gian check-in`;
        },
      },
    });
  };
}

/**
 * Validates that approved late time is not greater than actual late time
 */
export function IsApprovedLateTimeValid(
  lateTimeProperty: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isApprovedLateTimeValid',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [lateTimeProperty],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value === null || value === undefined) return true; // Optional field
          
          const lateTime = (args.object as any)[lateTimeProperty];
          if (lateTime === null || lateTime === undefined) return true;
          
          // Approved late time should not exceed actual late time
          return value <= lateTime;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} không được lớn hơn thời gian đi muộn thực tế`;
        },
      },
    });
  };
}
