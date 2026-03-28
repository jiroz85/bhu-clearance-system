import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

export class CustomBadRequestException extends BadRequestException {
  constructor(message: string, details?: any) {
    super({ message, details, statusCode: 400 });
  }
}

export class CustomUnauthorizedException extends UnauthorizedException {
  constructor(message: string = 'Unauthorized') {
    super({ message, statusCode: 401 });
  }
}

export class CustomForbiddenException extends ForbiddenException {
  constructor(message: string = 'Forbidden') {
    super({ message, statusCode: 403 });
  }
}

export class CustomNotFoundException extends NotFoundException {
  constructor(resource: string = 'Resource') {
    super({ message: `${resource} not found`, statusCode: 404 });
  }
}

export class CustomConflictException extends ConflictException {
  constructor(message: string) {
    super({ message, statusCode: 409 });
  }
}

export class CustomInternalServerErrorException extends InternalServerErrorException {
  constructor(message: string = 'Internal server error') {
    super({ message, statusCode: 500 });
  }
}
