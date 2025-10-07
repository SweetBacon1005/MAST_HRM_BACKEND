import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { RequestType } from '../interfaces/request.interface';

@Injectable()
export class RequestTypeValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) {
      throw new BadRequestException('Request type is required');
    }

    // Convert to uppercase to match enum values
    const upperValue = value.toString().toUpperCase();
    
    // Check if the value exists in RequestType enum
    if (!Object.values(RequestType).includes(upperValue as RequestType)) {
      throw new BadRequestException(
        `Invalid request type. Must be one of: ${Object.values(RequestType).join(', ')}`
      );
    }

    return upperValue as RequestType;
  }
}
