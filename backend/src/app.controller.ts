import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ClearanceService } from './clearance/clearance.service';

@Controller('api')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly clearanceService: ClearanceService,
  ) {}

  @Get('health')
  health() {
    return this.appService.health();
  }

  @Get('workflow')
  workflow() {
    return this.clearanceService.getWorkflow();
  }
}
