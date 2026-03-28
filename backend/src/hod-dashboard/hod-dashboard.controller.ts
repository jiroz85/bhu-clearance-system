import {
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
  Request,
  Param,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { HODDashboardService } from './hod-dashboard.service';
import { DepartmentPermission } from '../department/department.types';

@Controller('api/hod-dashboard')
@UseGuards(JwtAuthGuard)
export class HODDashboardController {
  constructor(private readonly hodDashboardService: HODDashboardService) {}

  @Get('overview')
  async getHODOverview(@Request() req: any) {
    const userDepartment = await this.hodDashboardService.getUserHODDepartment(
      req.user.userId,
    );
    if (!userDepartment) {
      throw new ForbiddenException('User is not a Head of Department');
    }

    return this.hodDashboardService.getDepartmentOverview(
      userDepartment,
      req.user.userId,
    );
  }

  @Get('clearances')
  async getDepartmentClearances(
    @Request() req: any,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL',
    @Query('overdue') overdue?: boolean,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const userDepartment = await this.hodDashboardService.getUserHODDepartment(
      req.user.userId,
    );
    if (!userDepartment) {
      throw new ForbiddenException('User is not a Head of Department');
    }

    const s = Math.max(0, parseInt(skip ?? '0', 10) || 0);
    const t = Math.min(100, Math.max(1, parseInt(take ?? '50', 10) || 50));

    return this.hodDashboardService.getDepartmentClearances(userDepartment, {
      status: status === 'ALL' ? undefined : status,
      overdue: overdue === true,
      search,
      skip: s,
      take: t,
    });
  }

  @Get('statistics')
  async getDepartmentStatistics(
    @Request() req: any,
    @Query('timeframe')
    timeframe?: 'day' | 'week' | 'month' | 'quarter' | 'year',
  ) {
    const userDepartment = await this.hodDashboardService.getUserHODDepartment(
      req.user.userId,
    );
    if (!userDepartment) {
      throw new ForbiddenException('User is not a Head of Department');
    }

    return this.hodDashboardService.getDepartmentStatistics(
      userDepartment,
      timeframe,
    );
  }

  @Get('bottlenecks')
  async getBottleneckAnalysis(@Request() req: any) {
    const userDepartment = await this.hodDashboardService.getUserHODDepartment(
      req.user.userId,
    );
    if (!userDepartment) {
      throw new ForbiddenException('User is not a Head of Department');
    }

    return this.hodDashboardService.getBottleneckAnalysis(userDepartment);
  }

  @Get('staff-performance')
  async getStaffPerformance(@Request() req: any) {
    const userDepartment = await this.hodDashboardService.getUserHODDepartment(
      req.user.userId,
    );
    if (!userDepartment) {
      throw new ForbiddenException('User is not a Head of Department');
    }

    return this.hodDashboardService.getStaffPerformance(userDepartment);
  }

  @Post('override/:stepId')
  async overrideStepDecision(
    @Request() req: any,
    @Param('stepId') stepId: string,
    @Body()
    body: {
      action: 'APPROVE' | 'REJECT';
      reason?: string;
      departmentData?: Record<string, any>;
    },
  ) {
    const userDepartment = await this.hodDashboardService.getUserHODDepartment(
      req.user.userId,
    );
    if (!userDepartment) {
      throw new ForbiddenException('User is not a Head of Department');
    }

    // Check HOD has override permission
    const hasPermission =
      await this.hodDashboardService.checkUserDepartmentPermission(
        req.user.userId,
        userDepartment,
        DepartmentPermission.OVERRIDE_DECISIONS,
      );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to override decisions',
      );
    }

    return this.hodDashboardService.overrideStepDecision(
      stepId,
      req.user.userId,
      body.action,
      body.reason,
    );
  }

  @Post('delegate/:stepId')
  async delegateApproval(
    @Request() req: any,
    @Param('stepId') stepId: string,
    @Body() body: { delegateUserId: string; reason?: string },
  ) {
    const userDepartment = await this.hodDashboardService.getUserHODDepartment(
      req.user.userId,
    );
    if (!userDepartment) {
      throw new ForbiddenException('User is not a Head of Department');
    }

    // Check HOD has delegation permission
    const hasPermission =
      await this.hodDashboardService.checkUserDepartmentPermission(
        req.user.userId,
        userDepartment,
        DepartmentPermission.DELEGATE_APPROVALS,
      );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to delegate approvals',
      );
    }

    return this.hodDashboardService.delegateApproval(
      stepId,
      req.user.userId,
      body.delegateUserId,
      body.reason,
    );
  }

  @Get('export/analytics')
  async exportDepartmentAnalytics(
    @Request() req: any,
    @Query('format') format: 'pdf' | 'excel' = 'pdf',
    @Query('timeframe')
    timeframe?: 'day' | 'week' | 'month' | 'quarter' | 'year',
  ) {
    const userDepartment = await this.hodDashboardService.getUserHODDepartment(
      req.user.userId,
    );
    if (!userDepartment) {
      throw new ForbiddenException('User is not a Head of Department');
    }

    // Check export permission
    const hasPermission =
      await this.hodDashboardService.checkUserDepartmentPermission(
        req.user.userId,
        userDepartment,
        DepartmentPermission.EXPORT_REPORTS,
      );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to export reports',
      );
    }

    return this.hodDashboardService.exportDepartmentAnalytics(
      userDepartment,
      format,
      timeframe,
    );
  }
}
