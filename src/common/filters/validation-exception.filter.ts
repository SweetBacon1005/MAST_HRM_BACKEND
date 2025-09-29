import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    
    // Handle validation errors from class-validator
    if (
      typeof exceptionResponse === 'object' && 
      exceptionResponse !== null &&
      'message' in exceptionResponse &&
      Array.isArray((exceptionResponse as any).message)
    ) {
      const validationErrors = (exceptionResponse as any).message;
      
      response.status(status).json({
        statusCode: status,
        error: 'Validation Error',
        message: 'Dữ liệu đầu vào không hợp lệ',
        details: this.formatValidationErrors(validationErrors),
        timestamp: new Date().toISOString(),
      });
    } else {
      // Handle other BadRequestExceptions
      response.status(status).json({
        statusCode: status,
        error: 'Bad Request',
        message: exception.message || 'Yêu cầu không hợp lệ',
        timestamp: new Date().toISOString(),
      });
    }
  }

  private formatValidationErrors(errors: string[]): any[] {
    return errors.map(error => {
      // Try to extract field name and constraint from error message
      const parts = error.split(' ');
      const field = parts[0];
      
      return {
        field: field || 'unknown',
        message: error,
        code: 'VALIDATION_ERROR'
      };
    });
  }
}
