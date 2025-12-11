import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidWorkDuration', async: false })
export class IsValidWorkDuration implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [startTimeProperty, minHours = 0.5, maxHours = 16] = args.constraints;
    const startTime = (args.object as any)[startTimeProperty];
    
    if (!value || !startTime) {
      return true; // Let other validators handle empty values
    }

    const startDate = new Date(startTime);
    const endDate = new Date(value);

    // Check if dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return false;
    }

    if (endDate <= startDate) {
      return false;
    }

    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    
    return durationHours >= minHours && durationHours <= maxHours;
  }

  defaultMessage(args: ValidationArguments) {
    const [, minHours = 0.5, maxHours = 16] = args.constraints;
    return `Thời gian làm việc phải từ ${minHours} đến ${maxHours} giờ`;
  }
}
