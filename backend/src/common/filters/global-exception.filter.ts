import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  ValidationError,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error?: string;
  details?: ValidationErrorMessage[] | Record<string, unknown>;
  timestamp: string;
  path: string;
}

interface ValidationErrorMessage {
  property: string;
  constraints: Record<string, string>;
  value?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details:
      | ValidationErrorMessage[]
      | Record<string, unknown>
      | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj: Record<string, unknown> =
          exceptionResponse as Record<string, unknown>;
        message =
          (responseObj.message as string) ||
          (responseObj.error as string) ||
          message;
        error = (responseObj.error as string) || error;
        details = responseObj.details as
          | ValidationErrorMessage[]
          | Record<string, unknown>;
      }

      // Handle validation errors with proper formatting
      if (status === HttpStatus.BAD_REQUEST && Array.isArray(details)) {
        details = this.formatValidationErrors(details as ValidationError[]);
        this.logger.warn(`Validation error: ${JSON.stringify(details)}`);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unexpected error: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error('Unknown exception type', exception);
    }

    const errorResponse: ErrorResponse = {
      success: false,
      statusCode: status,
      message,
      error,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Don't expose stack trace in production
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      errorResponse.details = {
        ...(errorResponse.details as Record<string, unknown>),
        stack: exception.stack,
      };
    }

    response.status(status).json(errorResponse);
  }

  private formatValidationErrors(
    errors: ValidationError[],
  ): ValidationErrorMessage[] {
    return errors.map((error) => ({
      property: error.property,
      constraints: error.constraints || {},
      value: error.value as unknown,
      children: error.children
        ? this.formatValidationErrors(error.children)
        : undefined,
    }));
  }
}
