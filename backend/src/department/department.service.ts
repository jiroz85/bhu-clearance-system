import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getDepartmentConfig } from './department.config';
import { ClearanceService } from '../clearance/clearance.service';
import { ReviewDecision } from '../../generated/prisma/enums';

@Injectable()
export class DepartmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clearanceService: ClearanceService,
  ) {}

  async getDepartmentUsers(departmentId: string) {
    return this.prisma.user.findMany({
      where: {
        staffDepartment: {
          equals: departmentId,
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        staffDepartment: true,
        status: true,
      },
    });
  }

  async getDepartmentQueue(
    departmentName: string,
    filters?: {
      status?: 'PENDING' | 'APPROVED' | 'REJECTED';
      overdue?: boolean;
      search?: string;
    },
  ) {
    try {
      const departmentConfig = getDepartmentConfig(departmentName);
      if (!departmentConfig) {
        throw new NotFoundException(`Department ${departmentName} not found`);
      }

      console.log(`Getting queue for department: ${departmentName}`, filters);

      // Get clearances where this department is the CURRENT active step
      // Include both SUBMITTED and PAUSED_REJECTED clearances to handle resubmissions
      const clearances = await this.prisma.clearance.findMany({
        where: {
          status: { in: ['SUBMITTED', 'PAUSED_REJECTED'] },
          currentStepOrder: { not: null },
          steps: {
            some: {
              department: departmentName,
              // Show PENDING steps by default, but allow filtering by other statuses
              status: filters?.status || 'PENDING',
            },
          },
        },
        include: {
          student: {
            select: {
              id: true,
              displayName: true,
              studentUniversityId: true,
              studentDepartment: true,
              studentYear: true,
            },
          },
          steps: {
            where: {
              department: departmentName,
            },
            include: {
              reviews: {
                orderBy: {
                  createdAt: 'desc',
                },
                include: {
                  reviewer: {
                    select: {
                      id: true,
                      displayName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          submittedAt: 'desc',
        },
        take: 50,
      });

      console.log(
        `Found ${clearances.length} clearances for department ${departmentName}`,
      );

      // Filter to only show clearances where this department's step is the CURRENT active step
      const queue = clearances
        .map((clearance) => {
          const step = clearance.steps.find(
            (s) => s.department === departmentName,
          );
          if (!step) {
            return null;
          }

          // CRITICAL: Only show if this department's step is the CURRENT active step
          if (step.stepOrder !== clearance.currentStepOrder) {
            console.log(
              `Step ${step.stepOrder} for clearance ${clearance.referenceId} is not current (current: ${clearance.currentStepOrder})`,
            );
            return null;
          }

          // Additional validation: ensure all previous steps are approved
          const prevSteps = clearance.steps.filter(
            (s) => s.stepOrder < step.stepOrder,
          );
          const allPrevApproved = prevSteps.every(
            (s) => s.status === 'APPROVED',
          );

          // For step 1, no previous steps to check
          const isValidStep = step.stepOrder === 1 || allPrevApproved;
          if (!isValidStep) {
            console.log(
              `Previous steps not all approved for clearance ${clearance.referenceId}`,
            );
            return null;
          }

          // Check if this step was resubmitted (has recent resubmission review)
          const isResubmitted = step.reviews.some(
            (review) =>
              review.reviewerUserId === clearance.studentUserId &&
              review.comment?.startsWith('Resubmitted:'),
          );

          console.log(
            `Including current active step ${step.stepOrder} for clearance ${clearance.referenceId} (Status: ${step.status}, Resubmitted: ${isResubmitted})`,
          );
          return {
            id: clearance.id,
            referenceId: clearance.referenceId,
            student: clearance.student,
            step: {
              id: step.id,
              stepOrder: step.stepOrder,
              department: step.department,
              status: step.status,
              comment: step.comment,
              reviewedAt: step.reviewedAt,
              reviews: step.reviews,
              isResubmitted, // Add flag to indicate resubmission
            },
            submittedAt: clearance.submittedAt,
            status: clearance.status,
          };
        })
        .filter((item) => item !== null);

      console.log(
        `Returning ${queue.length} queue items for department ${departmentName}`,
      );
      return queue;
    } catch (error) {
      console.error('Error in getDepartmentQueue:', error);
      throw error;
    }
  }

  async getDepartmentMetrics(
    departmentName: string,
    timeframe?: 'day' | 'week' | 'month' | 'all',
  ) {
    try {
      console.log(`Getting real metrics for department: ${departmentName}`);

      // First, let's debug: get ALL steps for this department without timeframe filter
      const allSteps = await this.prisma.clearanceStep.findMany({
        where: {
          department: departmentName,
        },
        include: {
          clearance: {
            select: {
              submittedAt: true,
              studentUserId: true,
              referenceId: true,
              status: true,
            },
          },
        },
      });

      console.log(
        `DEBUG: Found ${allSteps.length} total steps for department ${departmentName}`,
      );
      if (allSteps.length > 0) {
        console.log(
          'DEBUG: Sample steps:',
          allSteps.slice(0, 3).map((s) => ({
            id: s.id,
            department: s.department,
            status: s.status,
            clearanceSubmittedAt: s.clearance.submittedAt,
            clearanceStatus: s.clearance.status,
          })),
        );
      }

      // Calculate date filter based on timeframe
      const now = new Date();
      const startDate = new Date();

      switch (timeframe) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'all':
          // No date filter - get all data
          startDate.setFullYear(now.getFullYear() - 10); // 10 years ago
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      console.log(
        `DEBUG: Using timeframe ${timeframe || 'week'}, startDate: ${startDate.toISOString()}`,
      );

      // Get all steps for this department within the timeframe
      const steps = await this.prisma.clearanceStep.findMany({
        where: {
          department: departmentName,
          clearance: {
            submittedAt: {
              gte: startDate,
            },
          },
        },
        include: {
          clearance: {
            select: {
              submittedAt: true,
              studentUserId: true,
              referenceId: true,
            },
          },
          reviews: {
            include: {
              reviewer: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: {
          clearance: {
            submittedAt: 'desc',
          },
        },
      });

      console.log(
        `Found ${steps.length} steps for department ${departmentName} in timeframe`,
      );

      // Calculate metrics
      const total = steps.length;
      const approved = steps.filter((s) => s.status === 'APPROVED').length;
      const rejected = steps.filter((s) => s.status === 'REJECTED').length;
      const pending = steps.filter((s) => s.status === 'PENDING').length;

      const approvalRate = total > 0 ? (approved / total) * 100 : 0;
      const rejectionRate = total > 0 ? (rejected / total) * 100 : 0;

      // Calculate average processing time for approved/rejected steps
      const processedSteps = steps.filter(
        (s) =>
          s.status !== 'PENDING' && s.reviewedAt && s.clearance.submittedAt,
      );
      const averageProcessingTime =
        processedSteps.length > 0
          ? processedSteps.reduce((acc, step) => {
              const processingHours =
                (step.reviewedAt!.getTime() -
                  step.clearance.submittedAt!.getTime()) /
                (1000 * 60 * 60);
              return acc + processingHours;
            }, 0) / processedSteps.length
          : 0;

      // Count overdue pending steps (older than 24 hours)
      const overdueCount = steps.filter(
        (s) =>
          s.status === 'PENDING' &&
          s.clearance.submittedAt &&
          Date.now() - s.clearance.submittedAt.getTime() > 24 * 60 * 60 * 1000,
      ).length;

      const metrics = {
        timeframe: timeframe || 'week',
        summary: {
          total,
          approved,
          rejected,
          pending,
          approvalRate: Math.round(approvalRate * 10) / 10,
          rejectionRate: Math.round(rejectionRate * 10) / 10,
        },
        trends: [], // Could be implemented later
        performance: {
          averageProcessingTime: Math.round(averageProcessingTime * 10) / 10,
          overdueCount,
        },
      };

      console.log(`Calculated metrics for ${departmentName}:`, metrics.summary);
      return metrics;
    } catch (error) {
      console.error('Error in getDepartmentMetrics:', error);
      throw error;
    }
  }

  async checkUserDepartmentPermission(
    userId: string,
    departmentName: string,
  ): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          staffDepartment: true,
        },
      });

      if (!user) {
        return false;
      }

      // Admin has all permissions
      if (user.role === 'ADMIN') {
        return true;
      }

      // Check if user belongs to the department
      if (user.staffDepartment !== departmentName) {
        return false;
      }

      // For now, allow all staff permissions for their department
      return true;
    } catch (error) {
      console.error('Error in checkUserDepartmentPermission:', error);
      return false;
    }
  }

  async approveStep(stepId: string, reviewerUserId: string) {
    // Find the step to get clearance details
    const step = await this.prisma.clearanceStep.findUnique({
      where: { id: stepId },
      include: { clearance: true },
    });

    if (!step) {
      throw new NotFoundException('Step not found');
    }

    // Get the reviewer's department
    const reviewer = await this.prisma.user.findUnique({
      where: { id: reviewerUserId },
      select: { staffDepartment: true },
    });

    if (!reviewer?.staffDepartment) {
      throw new BadRequestException('Reviewer has no department assigned');
    }

    // Call the real clearance service reviewStep method
    return this.clearanceService.reviewStep(
      reviewerUserId,
      reviewer.staffDepartment,
      step.clearanceId,
      step.stepOrder,
      {
        status: 'APPROVED',
        comment: 'Approved by department',
      },
    );
  }

  async rejectStep(
    stepId: string,
    reviewerUserId: string,
    reason: string,
    instruction?: string,
  ) {
    // Find the step to get clearance details
    const step = await this.prisma.clearanceStep.findUnique({
      where: { id: stepId },
      include: { clearance: true },
    });

    if (!step) {
      throw new NotFoundException('Step not found');
    }

    // Get the reviewer's department
    const reviewer = await this.prisma.user.findUnique({
      where: { id: reviewerUserId },
      select: { staffDepartment: true },
    });

    if (!reviewer?.staffDepartment) {
      throw new BadRequestException('Reviewer has no department assigned');
    }

    // Call the real clearance service reviewStep method
    return this.clearanceService.reviewStep(
      reviewerUserId,
      reviewer.staffDepartment,
      step.clearanceId,
      step.stepOrder,
      {
        status: 'REJECTED',
        comment: reason,
        reason: reason,
        instruction: instruction || 'Please resolve the issue and resubmit',
      },
    );
  }

  async resubmitStep(
    stepId: string,
    studentUserId: string,
    comment: string,
    departmentData?: Record<string, any>, // Department-specific data for resubmission
  ) {
    // Log department data if provided (for future use)
    if (departmentData) {
      console.log('Department data provided for resubmission:', departmentData);
    }

    // Find the step and verify ownership
    const step = await this.prisma.clearanceStep.findUnique({
      where: { id: stepId },
      include: {
        clearance: {
          include: { student: true },
        },
      },
    });

    if (!step) {
      throw new NotFoundException('Step not found');
    }

    // Verify this step belongs to the student
    if (step.clearance.studentUserId !== studentUserId) {
      throw new ForbiddenException(
        'You can only resubmit your own clearance steps',
      );
    }

    // Verify the step was rejected
    if (step.status !== 'REJECTED') {
      throw new BadRequestException('Only rejected steps can be resubmitted');
    }

    // Reset the step to PENDING
    const updatedStep = await this.prisma.$transaction(async (tx) => {
      // Reset step to PENDING
      const resetStep = await tx.clearanceStep.update({
        where: { id: stepId },
        data: {
          status: 'PENDING',
          comment: `Resubmitted: ${comment}`,
          reviewedAt: null, // Clear previous review timestamp
        },
      });

      // Update clearance status back to SUBMITTED
      await tx.clearance.update({
        where: { id: step.clearanceId },
        data: {
          status: 'SUBMITTED',
          currentStepOrder: step.stepOrder, // Keep current step as it's now pending again
        },
      });

      // Create a resubmission record for tracking
      await tx.review.create({
        data: {
          clearanceStepId: stepId,
          reviewerUserId: studentUserId, // Student is the "reviewer" for resubmission
          decision: ReviewDecision.APPROVED, // Using APPROVED to indicate resubmission (positive action)
          comment: `Resubmitted: ${comment}`,
        },
      });

      return resetStep;
    });

    return {
      success: true,
      message: 'Step resubmitted successfully',
      step: updatedStep,
    };
  }
}
