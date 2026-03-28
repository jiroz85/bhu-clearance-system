import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DepartmentPermission } from '../department/department.types';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class HODDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getUserHODDepartment(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        staffDepartment: true,
        role: true,
        universityId: true,
      },
    });

    if (!user || user.role !== 'STAFF' || !user.staffDepartment) {
      return null;
    }

    // Check if user is HOD for their department
    // For now, we'll assume all staff members are potential HODs
    // In a real implementation, you'd have a separate HOD assignment table
    return user.staffDepartment;
  }

  async checkUserDepartmentPermission(
    userId: string,
    departmentName: string,
    permission: DepartmentPermission,
  ): Promise<boolean> {
    const userDepartment = await this.getUserHODDepartment(userId);
    if (!userDepartment || userDepartment !== departmentName) {
      return false;
    }

    // For HOD, we'll grant all HOD-level permissions
    // In a real implementation, you'd check against a role assignment table
    return true;
  }

  async getDepartmentOverview(departmentName: string, hodUserId: string) {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get department's step order
    const { getDepartmentConfig } =
      await import('../department/department.config');
    const deptConfig = getDepartmentConfig(departmentName);
    if (!deptConfig) {
      throw new NotFoundException('Department configuration not found');
    }

    // Get clearances in department's step
    const [
      totalClearances,
      pendingClearances,
      approvedToday,
      approvedThisWeek,
      approvedThisMonth,
      overdueClearances,
    ] = await Promise.all([
      this.prisma.clearanceStep.count({
        where: {
          department: departmentName,
        },
      }),
      this.prisma.clearanceStep.count({
        where: {
          department: departmentName,
          status: 'PENDING',
        },
      }),
      this.prisma.clearanceStep.count({
        where: {
          department: departmentName,
          status: 'APPROVED',
          reviewedAt: { gte: startOfDay },
        },
      }),
      this.prisma.clearanceStep.count({
        where: {
          department: departmentName,
          status: 'APPROVED',
          reviewedAt: { gte: startOfWeek },
        },
      }),
      this.prisma.clearanceStep.count({
        where: {
          department: departmentName,
          status: 'APPROVED',
          reviewedAt: { gte: startOfMonth },
        },
      }),
      this.prisma.clearanceStep.count({
        where: {
          department: departmentName,
          status: 'PENDING',
          clearance: {
            createdAt: {
              lt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // Older than 3 days
            },
          },
        },
      }),
    ]);

    // Get staff in department
    const departmentStaff = await this.prisma.user.findMany({
      where: {
        staffDepartment: departmentName,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        displayName: true,
        email: true,
      },
    });

    return {
      department: {
        name: departmentName,
        displayName: deptConfig.displayName,
        stepOrder: deptConfig.stepOrder,
      },
      metrics: {
        totalClearances,
        pendingClearances,
        overdueClearances,
        approvedToday,
        approvedThisWeek,
        approvedThisMonth,
        completionRate:
          totalClearances > 0 ? (approvedThisMonth / totalClearances) * 100 : 0,
      },
      staff: {
        total: departmentStaff.length,
        members: departmentStaff,
      },
      alerts: {
        overdueCount: overdueClearances,
        highPendingCount: pendingClearances > 10 ? pendingClearances : 0,
      },
    };
  }

  async getDepartmentClearances(
    departmentName: string,
    options: {
      status?: 'PENDING' | 'APPROVED' | 'REJECTED';
      overdue?: boolean;
      search?: string;
      skip: number;
      take: number;
    },
  ) {
    const where: any = {
      department: departmentName,
    };

    if (options.status) {
      where.status = options.status;
    }

    if (options.overdue) {
      where.clearance = {
        createdAt: {
          lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      };
      where.status = 'PENDING';
    }

    if (options.search) {
      where.OR = [
        {
          clearance: {
            student: {
              displayName: { contains: options.search, mode: 'insensitive' },
            },
          },
        },
        {
          clearance: {
            student: {
              studentUniversityId: {
                contains: options.search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          clearance: {
            student: {
              email: { contains: options.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [clearances, total] = await Promise.all([
      this.prisma.clearanceStep.findMany({
        where,
        include: {
          clearance: {
            include: {
              student: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                  studentUniversityId: true,
                  studentDepartment: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.clearanceStep.count({ where }),
    ]);

    return {
      clearances: clearances.map((step) => ({
        id: step.id,
        step: step.department,
        status: step.status,
        createdAt: step.createdAt,
        reviewedAt: step.reviewedAt,
        comment: step.comment,
        student: step.clearance.student,
        clearanceId: step.clearanceId,
        isOverdue:
          step.status === 'PENDING' &&
          step.clearance.createdAt <
            new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      })),
      total,
      skip: options.skip,
      take: options.take,
    };
  }

  async getDepartmentStatistics(
    departmentName: string,
    timeframe?: 'day' | 'week' | 'month' | 'quarter' | 'year',
  ) {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(
          now.getFullYear(),
          Math.floor(now.getMonth() / 3) * 3,
          1,
        );
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [totalProcessed, approved, rejected, avgProcessingTime] =
      await Promise.all([
        this.prisma.clearanceStep.count({
          where: {
            department: departmentName,
            reviewedAt: { gte: startDate },
            status: { in: ['APPROVED', 'REJECTED'] },
          },
        }),
        this.prisma.clearanceStep.count({
          where: {
            department: departmentName,
            reviewedAt: { gte: startDate },
            status: 'APPROVED',
          },
        }),
        this.prisma.clearanceStep.count({
          where: {
            department: departmentName,
            reviewedAt: { gte: startDate },
            status: 'REJECTED',
          },
        }),
        this.prisma.clearanceStep.aggregate({
          where: {
            department: departmentName,
            reviewedAt: { gte: startDate },
            status: 'APPROVED',
          },
          _avg: {
            // This is a simplified calculation - in reality you'd track actual processing time
          },
        }),
      ]);

    return {
      timeframe: timeframe || 'month',
      period: {
        start: startDate,
        end: now,
      },
      metrics: {
        totalProcessed,
        approved,
        rejected,
        approvalRate:
          totalProcessed > 0 ? (approved / totalProcessed) * 100 : 0,
        rejectionRate:
          totalProcessed > 0 ? (rejected / totalProcessed) * 100 : 0,
        averageProcessingTimeHours: 24, // Simplified - would calculate actual time
      },
    };
  }

  async getBottleneckAnalysis(departmentName: string) {
    // Get pending clearances older than 2 days
    const pendingClearances = await this.prisma.clearanceStep.findMany({
      where: {
        department: departmentName,
        status: 'PENDING',
        createdAt: {
          lt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        clearance: {
          include: {
            student: {
              select: {
                displayName: true,
                studentUniversityId: true,
                studentDepartment: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // Group by age categories
    const now = new Date();
    const bottlenecks = {
      critical: pendingClearances.filter(
        (c) => c.createdAt < new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      ),
      urgent: pendingClearances.filter(
        (c) =>
          c.createdAt >= new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) &&
          c.createdAt < new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      ),
      warning: pendingClearances.filter(
        (c) =>
          c.createdAt >= new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) &&
          c.createdAt < new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      ),
    };

    return {
      summary: {
        totalPending: pendingClearances.length,
        critical: bottlenecks.critical.length,
        urgent: bottlenecks.urgent.length,
        warning: bottlenecks.warning.length,
      },
      bottlenecks: bottlenecks,
      recommendations: this.generateBottleneckRecommendations(bottlenecks),
    };
  }

  private generateBottleneckRecommendations(bottlenecks: any): string[] {
    const recommendations: string[] = [];

    if (bottlenecks.critical.length > 0) {
      recommendations.push(
        `Immediate action required: ${bottlenecks.critical.length} clearances are over 5 days old`,
      );
    }

    if (bottlenecks.urgent.length > 5) {
      recommendations.push('Consider delegating approvals to reduce backlog');
    }

    if (bottlenecks.totalPending > 20) {
      recommendations.push(
        'High workload detected: consider bulk processing or temporary staff assistance',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Clearance processing is within acceptable limits');
    }

    return recommendations;
  }

  async getStaffPerformance(departmentName: string) {
    const departmentStaff = await this.prisma.user.findMany({
      where: {
        staffDepartment: departmentName,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        displayName: true,
        email: true,
      },
    });

    const staffPerformance = await Promise.all(
      departmentStaff.map(async (staff) => {
        const [approvedCount, rejectedCount, pendingCount] = await Promise.all([
          this.prisma.$queryRaw<{ count: number }>`
            SELECT COUNT(*)::int as count 
            FROM reviews r
            INNER JOIN clearance_steps cs ON r."clearanceStepId" = cs.id
            WHERE cs.department = ${departmentName}
            AND r.decision = 'APPROVED'
            AND r."reviewerUserId" = ${staff.id}
            AND r.createdAt >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
          `.then((result) => (result as unknown as any[])[0]?.count || 0),
          this.prisma.$queryRaw<{ count: number }>`
            SELECT COUNT(*)::int as count 
            FROM reviews r
            INNER JOIN clearance_steps cs ON r."clearanceStepId" = cs.id
            WHERE cs.department = ${departmentName}
            AND r.decision = 'REJECTED'
            AND r."reviewerUserId" = ${staff.id}
            AND r.createdAt >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
          `.then((result) => (result as unknown as any[])[0]?.count || 0),
          this.prisma.clearanceStep.count({
            where: {
              department: departmentName,
              status: 'PENDING',
              // This would need assignment tracking in a real system
            },
          }),
        ]);

        const totalProcessed = approvedCount + rejectedCount;
        const approvalRate =
          totalProcessed > 0 ? (approvedCount / totalProcessed) * 100 : 0;

        return {
          staff,
          metrics: {
            approved: approvedCount,
            rejected: rejectedCount,
            pending: pendingCount,
            totalProcessed,
            approvalRate,
            productivity: approvedCount / 30, // Daily average
          },
        };
      }),
    );

    return {
      staff: staffPerformance,
      summary: {
        totalStaff: departmentStaff.length,
        totalProcessed: staffPerformance.reduce(
          (sum, s) => sum + s.metrics.totalProcessed,
          0,
        ),
        averageApprovalRate:
          staffPerformance.reduce((sum, s) => sum + s.metrics.approvalRate, 0) /
          departmentStaff.length,
      },
    };
  }

  async overrideStepDecision(
    stepId: string,
    hodUserId: string,
    action: 'APPROVE' | 'REJECT',
    reason?: string,
  ) {
    const step = await this.prisma.clearanceStep.findUnique({
      where: { id: stepId },
      include: {
        clearance: true,
      },
    });

    if (!step) {
      throw new NotFoundException('Clearance step not found');
    }

    // Update the step with HOD override
    const updatedStep = await this.prisma.clearanceStep.update({
      where: { id: stepId },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        reviewedAt: new Date(),
        comment:
          (step.comment || '') +
          `\n\n[HOD Override - ${action}]: ${reason || 'No reason provided'}`,
      },
    });

    // Log the override
    await this.audit.log(
      hodUserId,
      'HOD_OVERRIDE_DECISION',
      'clearanceStep',
      stepId,
      {
        action,
        reason,
        previousStatus: step.status,
        newStatus: action,
      },
    );

    // Update clearance progress if needed
    if (action === 'APPROVE') {
      await this.updateClearanceProgress(step.clearanceId);
    }

    return updatedStep;
  }

  async delegateApproval(
    stepId: string,
    hodUserId: string,
    delegateUserId: string,
    reason?: string,
  ) {
    const step = await this.prisma.clearanceStep.findUnique({
      where: { id: stepId },
    });

    if (!step) {
      throw new NotFoundException('Clearance step not found');
    }

    // In a real implementation, you'd create a delegation record
    // For now, we'll just add a comment indicating delegation
    const updatedStep = await this.prisma.clearanceStep.update({
      where: { id: stepId },
      data: {
        comment:
          (step.comment || '') +
          `\n\n[Delegated by HOD]: ${reason || 'Delegated for processing'}`,
      },
    });

    // Log the delegation
    await this.audit.log(
      hodUserId,
      'HOD_DELEGATE_APPROVAL',
      'clearanceStep',
      stepId,
      {
        delegateUserId,
        reason,
      },
    );

    return updatedStep;
  }

  async exportDepartmentAnalytics(
    departmentName: string,
    format: 'pdf' | 'excel',
    timeframe?: 'day' | 'week' | 'month' | 'quarter' | 'year',
  ) {
    // This would integrate with a report generation service
    // For now, return a placeholder response
    return {
      message: 'Export functionality would be implemented here',
      format,
      department: departmentName,
      timeframe,
      downloadUrl: `/api/reports/export/${format}?department=${departmentName}&timeframe=${timeframe}`,
    };
  }

  private async updateClearanceProgress(clearanceId: string) {
    // Check if all steps are approved
    const allSteps = await this.prisma.clearanceStep.findMany({
      where: { clearanceId },
    });

    const allApproved = allSteps.every((step) => step.status === 'APPROVED');
    const hasRejected = allSteps.some((step) => step.status === 'REJECTED');

    if (allApproved) {
      await this.prisma.clearance.update({
        where: { id: clearanceId },
        data: { status: 'FULLY_CLEARED' },
      });
    } else if (hasRejected) {
      await this.prisma.clearance.update({
        where: { id: clearanceId },
        data: { status: 'PAUSED_REJECTED' },
      });
    }
  }
}
