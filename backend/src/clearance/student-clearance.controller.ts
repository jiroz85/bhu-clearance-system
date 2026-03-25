import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../../generated/prisma/enums';
import { ClearanceService } from './clearance.service';
import { RecheckDto } from './dto/recheck.dto';

@Controller('api/student/clearances')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class StudentClearanceController {
  constructor(private readonly clearance: ClearanceService) {}

  @Post()
  createDraft(@CurrentUser('userId') userId: string) {
    return this.clearance.createDraft(userId);
  }

  @Post(':id/submit')
  submit(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.clearance.submit(userId, id);
  }

  @Get('dashboard')
  dashboard(@CurrentUser('userId') userId: string) {
    return this.clearance.getStudentDashboard(userId);
  }

  @Get('certificate')
  certificate(@CurrentUser('userId') userId: string) {
    return this.clearance.getCertificateMeta(userId);
  }

  @Post(':id/recheck')
  recheck(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RecheckDto,
  ) {
    return this.clearance.requestRecheck(user.userId, id, dto.stepOrder, dto.message);
  }
}
