import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService, NotificationData } from '../email/email.service';

export interface SLASettings {
  reminderHours: number; // Send reminder after X hours of pending
  overdueHours: number; // Mark as overdue after X hours
  escalationHours: number; // Escalate to admin after X hours
}

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);
  
  private readonly slaSettings: SLASettings = {
    reminderHours: 24, // Send reminder after 24 hours
    overdueHours: 72, // Mark as overdue after 72 hours
    escalationHours: 120, // Escalate after 5 days
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR) // Check every hour
  async processPendingClearances(): Promise<void> {
    this.logger.log('Processing pending clearances for automation...');
    
    const pendingSteps = await this.prisma.clearanceStep.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        clearance: {
          include: {
            student: {
              select: { email: true, displayName: true },
            },
          },
        },
      },
    });

    for (const step of pendingSteps) {
      await this.processStepForAutomation(step);
    }

    this.logger.log(`Processed ${pendingSteps.length} pending steps`);
  }

  private async processStepForAutomation(step: any): Promise<void> {
    const now = new Date();
    const hoursPending = (now.getTime() - step.createdAt.getTime()) / (1000 * 60 * 60);

    // Check if reminder is needed
    if (hoursPending >= this.slaSettings.reminderHours && hoursPending < this.slaSettings.overdueHours) {
      await this.sendReminder(step);
    }

    // Check if step is overdue
    if (hoursPending >= this.slaSettings.overdueHours && hoursPending < this.slaSettings.escalationHours) {
      await this.markOverdue(step);
    }

    // Check if escalation is needed
    if (hoursPending >= this.slaSettings.escalationHours) {
      await this.escalateToAdmin(step);
    }
  }

  private async sendReminder(step: any): Promise<void> {
    // Check if reminder was already sent in the last 24 hours
    const recentReminder = await this.prisma.notification.findFirst({
      where: {
        userId: step.clearance.studentUserId,
        title: { contains: 'Reminder' },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (recentReminder) return; // Already sent reminder recently

    // Send reminder notification to staff
    const staffUsers = await this.prisma.user.findMany({
      where: {
        role: 'STAFF',
        staffDepartment: step.department,
        status: 'ACTIVE',
      },
    });

    for (const staff of staffUsers) {
      await this.notifications.create(
        staff.id,
        `Clearance Reminder: ${step.department}`,
        `Student ${step.clearance.student.displayName} has been waiting for ${step.department} clearance for over 24 hours.`,
        undefined,
        'CLEARANCE_STEP_APPROVED' as any, // Using existing type
        {
          referenceId: step.clearance.referenceId,
          department: step.department,
          pendingHours: Math.floor((Date.now() - step.createdAt.getTime()) / (1000 * 60 * 60)),
        },
      );
    }

    this.logger.log(`Sent reminder for step ${step.id} in ${step.department}`);
  }

  private async markOverdue(step: any): Promise<void> {
    // Check if already marked as overdue
    if (step.comment?.includes('[OVERDUE]')) return;

    await this.prisma.clearanceStep.update({
      where: { id: step.id },
      data: {
        comment: `[OVERDUE] This step is overdue. Pending for over ${this.slaSettings.overdueHours} hours.`,
      },
    });

    // Send overdue notification
    const staffUsers = await this.prisma.user.findMany({
      where: {
        role: 'STAFF',
        staffDepartment: step.department,
        status: 'ACTIVE',
      },
    });

    for (const staff of staffUsers) {
      await this.notifications.create(
        staff.id,
        `OVERDUE: ${step.department} Clearance`,
        `Student ${step.clearance.student.displayName} clearance is OVERDUE at ${step.department}. Immediate attention required.`,
        undefined,
        'CLEARANCE_STEP_REJECTED' as any, // Using existing type
        {
          referenceId: step.clearance.referenceId,
          department: step.department,
          pendingHours: Math.floor((Date.now() - step.createdAt.getTime()) / (1000 * 60 * 60)),
        },
      );
    }

    this.logger.log(`Marked step ${step.id} as overdue`);
  }

  private async escalateToAdmin(step: any): Promise<void> {
    // Check if already escalated
    if (step.comment?.includes('[ESCALATED]')) return;

    await this.prisma.clearanceStep.update({
      where: { id: step.id },
      data: {
        comment: `[ESCALATED] This step has been escalated to administrators due to excessive delay.`,
      },
    });

    // Send escalation to all admins
    const adminUsers = await this.prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    for (const admin of adminUsers) {
      await this.notifications.create(
        admin.id,
        `ESCALATION: ${step.department} Clearance`,
        `Student ${step.clearance.student.displayName} clearance at ${step.department} requires ADMIN intervention due to excessive delay (${Math.floor((Date.now() - step.createdAt.getTime()) / (1000 * 60 * 60))} hours pending).`,
        undefined,
        'CLEARANCE_STEP_REJECTED' as any, // Using existing type
        {
          referenceId: step.clearance.referenceId,
          department: step.department,
          pendingHours: Math.floor((Date.now() - step.createdAt.getTime()) / (1000 * 60 * 60)),
          studentName: step.clearance.student.displayName,
        },
      );
    }

    this.logger.log(`Escalated step ${step.id} to administrators`);
  }

  async getSLAMetrics(): Promise<{
    totalPending: number;
    overdueCount: number;
    escalatedCount: number;
    averagePendingTime: number;
    departmentsWithIssues: Array<{
      department: string;
      pendingCount: number;
      overdueCount: number;
      averageTime: number;
    }>;
  }> {
    const pendingSteps = await this.prisma.clearanceStep.findMany({
      where: { status: 'PENDING' },
      include: {
        clearance: {
          select: { referenceId: true },
        },
      },
    });

    const now = new Date();
    const overdueThreshold = this.slaSettings.overdueHours * 60 * 60 * 1000;
    const escalationThreshold = this.slaSettings.escalationHours * 60 * 60 * 1000;

    const overdueCount = pendingSteps.filter(step => 
      now.getTime() - step.createdAt.getTime() >= overdueThreshold
    ).length;

    const escalatedCount = pendingSteps.filter(step => 
      step.comment?.includes('[ESCALATED]')
    ).length;

    const averagePendingTime = pendingSteps.length > 0
      ? pendingSteps.reduce((sum, step) => 
          sum + (now.getTime() - step.createdAt.getTime()), 0
        ) / pendingSteps.length / (1000 * 60 * 60)
      : 0;

    // Group by department
    const departmentStats = pendingSteps.reduce((acc, step) => {
      if (!acc[step.department]) {
        acc[step.department] = {
          department: step.department,
          pendingCount: 0,
          overdueCount: 0,
          totalTime: 0,
        };
      }
      
      acc[step.department].pendingCount++;
      acc[step.department].totalTime += now.getTime() - step.createdAt.getTime();
      
      if (now.getTime() - step.createdAt.getTime() >= overdueThreshold) {
        acc[step.department].overdueCount++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    const departmentsWithIssues = Object.values(departmentStats).map((stat: any) => ({
      department: stat.department,
      pendingCount: stat.pendingCount,
      overdueCount: stat.overdueCount,
      averageTime: stat.totalTime / stat.pendingCount / (1000 * 60 * 60),
    })).sort((a, b) => b.averageTime - a.averageTime);

    return {
      totalPending: pendingSteps.length,
      overdueCount,
      escalatedCount,
      averagePendingTime,
      departmentsWithIssues,
    };
  }

  async updateSLASettings(settings: Partial<SLASettings>): Promise<SLASettings> {
    Object.assign(this.slaSettings, settings);
    this.logger.log('Updated SLA settings:', this.slaSettings);
    return this.slaSettings;
  }

  async getSLASettings(): Promise<SLASettings> {
    return { ...this.slaSettings };
  }
}
