import { Injectable, Logger as NestLogger } from '@nestjs/common';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

@Injectable()
export class LoggerService {
  private readonly logger = new NestLogger('BHU-Clearance');

  constructor() {
    // Set log level based on environment
    const logLevel = process.env.LOG_LEVEL || LogLevel.INFO;
    this.setLogLevel(logLevel);
  }

  private setLogLevel(level: string) {
    // In production, only show error and warn
    if (process.env.NODE_ENV === 'production') {
      if (level === LogLevel.DEBUG || level === LogLevel.VERBOSE) {
        process.env.LOG_LEVEL = LogLevel.INFO;
      }
    }
  }

  error(message: string, context?: string, trace?: string) {
    this.logger.error(message, trace, context);
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, context);
  }

  log(message: string, context?: string) {
    this.logger.log(message, context);
  }

  debug(message: string, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(message, context);
    }
  }

  verbose(message: string, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.verbose(message, context);
    }
  }

  // Department-specific logging
  departmentQueue(department: string, queueLength: number, filters?: any) {
    this.debug(
      `Department ${department}: Queue retrieved with ${queueLength} items`,
      'DepartmentService',
    );
    if (filters) {
      this.debug(
        `Department ${department}: Applied filters ${JSON.stringify(filters)}`,
        'DepartmentService',
      );
    }
  }

  departmentMetrics(department: string) {
    this.debug(
      `Department ${department}: Metrics calculated`,
      'DepartmentService',
    );
  }

  userAction(userId: string, action: string, target?: string) {
    this.log(
      `User ${userId} performed ${action}${target ? ` on ${target}` : ''}`,
      'AuditService',
    );
  }

  clearanceAction(clearanceId: string, action: string, department: string) {
    this.log(
      `Clearance ${clearanceId}: ${action} by ${department}`,
      'ClearanceService',
    );
  }

  performance(operation: string, duration: number, context?: string) {
    if (duration > 1000) {
      this.warn(
        `Slow operation: ${operation} took ${duration}ms`,
        context || 'Performance',
      );
    } else {
      this.debug(
        `Performance: ${operation} completed in ${duration}ms`,
        context || 'Performance',
      );
    }
  }
}
