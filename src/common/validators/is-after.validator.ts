import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isAfter', async: false })
export class IsAfter implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    
    if (!value || !relatedValue) {
      return true; // Let other validators handle empty values
    }

    const currentDate = new Date(value);
    const relatedDate = new Date(relatedValue);

    // Check if dates are valid
    if (isNaN(currentDate.getTime()) || isNaN(relatedDate.getTime())) {
      return false;
    }

    return currentDate > relatedDate;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} phải sau ${relatedPropertyName}`;
  }
}
