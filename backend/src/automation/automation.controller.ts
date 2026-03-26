import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../../generated/prisma/enums';
import { AutomationService, SLASettings } from './automation.service';

@Controller('api/automation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get('sla-metrics')
  async getSLAMetrics() {
    return this.automationService.getSLAMetrics();
  }

  @Get('sla-settings')
  async getSLASettings() {
    return this.automationService.getSLASettings();
  }

  @Put('sla-settings')
  async updateSLASettings(@Body() settings: Partial<SLASettings>) {
    return this.automationService.updateSLASettings(settings);
  }
}
