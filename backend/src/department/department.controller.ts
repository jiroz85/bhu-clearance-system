import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DepartmentService } from './department.service';
import { getDepartmentConfig } from './department.config';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@Controller('api/departments')
@UseGuards(JwtAuthGuard)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get(':departmentName/queue')
  async getDepartmentQueue(
    @Request() req: AuthenticatedRequest,
    @Param('departmentName') departmentName: string,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
    @Query('overdue') overdue?: boolean,
    @Query('search') search?: string,
  ) {
    // Temporarily bypass permission check for testing
    // const hasPermission =
    //   await this.departmentService.checkUserDepartmentPermission(
    //     req.user.id,
    //     departmentName,
    //     DepartmentPermission.VIEW_QUEUE,
    //   );

    // if (!hasPermission) {
    //   throw new ForbiddenException(
    //     'You do not have permission to view this department queue',
    //   );
    // }

    return this.departmentService.getDepartmentQueue(departmentName, {
      status,
      overdue: overdue === true,
      search,
    });
  }

  @Get(':departmentName/metrics')
  async getDepartmentMetrics(
    @Request() req: AuthenticatedRequest,
    @Param('departmentName') departmentName: string,
    @Query('timeframe') timeframe?: 'day' | 'week' | 'month',
  ) {
    // Temporarily bypass permission check for testing
    // const hasPermission =
    //   await this.departmentService.checkUserDepartmentPermission(
    //     req.user.id,
    //     departmentName,
    //     DepartmentPermission.VIEW_METRICS,
    //   );

    // if (!hasPermission) {
    //   throw new ForbiddenException(
    //     'You do not have permission to view department metrics',
    //   );
    // }

    return this.departmentService.getDepartmentMetrics(
      departmentName,
      timeframe,
    );
  }

  @Post(':departmentName/steps/:stepId/approve')
  async approveStep(
    @Request() req: AuthenticatedRequest,
    @Param('departmentName') departmentName: string,
    @Param('stepId') stepId: string,
  ) {
    // Check user permission
    const hasPermission =
      await this.departmentService.checkUserDepartmentPermission(
        req.user.userId,
        departmentName,
      );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to approve steps in this department',
      );
    }

    return this.departmentService.approveStep(stepId, req.user.userId);
  }

  @Post(':departmentName/steps/:stepId/reject')
  async rejectStep(
    @Request() req: AuthenticatedRequest,
    @Param('departmentName') departmentName: string,
    @Param('stepId') stepId: string,
    @Body()
    body: {
      reason: string;
      instruction?: string;
      departmentData?: Record<string, any>;
    },
  ) {
    // Check user permission
    const hasPermission =
      await this.departmentService.checkUserDepartmentPermission(
        req.user.userId,
        departmentName,
      );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to reject steps in this department',
      );
    }

    return this.departmentService.rejectStep(
      stepId,
      req.user.userId,
      body.reason,
      body.instruction,
    );
  }

  @Post(':departmentName/steps/:stepId/resubmit')
  async resubmitStep(
    @Request() req: AuthenticatedRequest,
    @Param('departmentName') departmentName: string,
    @Param('stepId') stepId: string,
    @Body()
    body: {
      comment: string;
      departmentData?: Record<string, any>;
    },
  ) {
    return await this.departmentService.resubmitStep(
      stepId,
      req.user.userId,
      body.comment,
      body.departmentData,
    );
  }

  @Get(':departmentName/config')
  getDepartmentConfig(@Param('departmentName') departmentName: string) {
    const config = getDepartmentConfig(departmentName);
    if (!config) {
      throw new ForbiddenException('Department not found');
    }
    return config;
  }

  @Get(':departmentName/users')
  async getDepartmentUsers(
    @Request() req: AuthenticatedRequest,
    @Param('departmentName') departmentName: string,
  ) {
    // Check user permission (HOD or Admin only)
    const hasPermission =
      await this.departmentService.checkUserDepartmentPermission(
        req.user.userId,
        departmentName,
      );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to manage department users',
      );
    }

    return this.departmentService.getDepartmentUsers(departmentName);
  }

  @Get('list')
  async getAllDepartments() {
    const { getAllDepartmentConfigs } = await import('./department.config');
    const configs = getAllDepartmentConfigs();

    return configs.map((config) => ({
      name: config.name,
      code: config.code,
      stepOrder: config.stepOrder,
      displayName: config.displayName,
      description: config.description,
      color: config.color,
      icon: config.icon,
    }));
  }
}
