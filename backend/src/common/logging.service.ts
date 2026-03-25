import { Injectable } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class LoggingService {
  private readonly logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  });

  info(obj: Record<string, unknown>, msg: string) {
    this.logger.info(obj, msg);
  }

  error(obj: Record<string, unknown>, msg: string) {
    this.logger.error(obj, msg);
  }
}

