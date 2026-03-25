import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      name: 'BHU Student Clearance API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
