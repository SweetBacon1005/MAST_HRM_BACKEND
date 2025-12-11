import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isWorkingDay', async: false })
export class IsWorkingDay implements ValidatorConstraintInterface {
  validate(value: any, _args: ValidationArguments) {
    if (!value) {
      return true; // Let other validators handle empty values
    }

    const date = new Date(value);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return false;
    }

    // Check if it's not a weekend (Saturday = 6, Sunday = 0)
    const dayOfWeek = date.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} phải là ngày làm việc (thứ 2 đến thứ 6)`;
  }
}
