import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDate implements ValidatorConstraintInterface {
  validate(value: any, _args: ValidationArguments) {
    if (!value) {
      return true; // Let other validators handle empty values
    }

    const inputDate = new Date(value);
    
    // Check if date is valid
    if (isNaN(inputDate.getTime())) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    inputDate.setHours(0, 0, 0, 0);

    return inputDate >= today;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} phải là ngày hôm nay hoặc trong tương lai`;
  }
}
