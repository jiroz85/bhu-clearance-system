import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../../generated/prisma/enums';
import { ClearanceService } from './clearance.service';
import { ReviewStepDto } from './dto/review-step.dto';

@Controller('api/staff/clearances')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STAFF)
export class StaffClearanceController {
  constructor(private readonly clearance: ClearanceService) {}

  @Get('pending')
  pending(@CurrentUser() user: AuthUser) {
    return this.clearance.listPendingForStaff(user.userId, user.staffDepartment);
  }

  @Patch(':clearanceId/steps/:stepOrder/review')
  review(
    @CurrentUser() user: AuthUser,
    @Param('clearanceId') clearanceId: string,
    @Param('stepOrder', ParseIntPipe) stepOrder: number,
    @Body() dto: ReviewStepDto,
  ) {
    return this.clearance.reviewStep(user.userId, user.staffDepartment, clearanceId, stepOrder, dto);
  }
}
