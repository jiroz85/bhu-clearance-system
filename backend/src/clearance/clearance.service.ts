import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  ClearanceStatus,
  ReviewDecision,
  Role,
  StepStatus,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { normalizeDepartment } from './workflow.constants';
import { LoggingService } from '../common/logging.service';

function genReferenceId(): string {
  const y = new Date().getFullYear();
  const hex = randomBytes(3).toString('hex').toUpperCase();
  return `BHU-CLR-${y}-${hex}`;
}

const ACTIVE_CLEARANCE: ClearanceStatus[] = [
  ClearanceStatus.DRAFT,
  ClearanceStatus.SUBMITTED,
  ClearanceStatus.PAUSED_REJECTED,
];

@Injectable()
export class ClearanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly logger: LoggingService,
  ) {}

  private async getUserUniversityId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    return user?.universityId ?? null;
  }

  private async getActiveWorkflowSteps(universityId: string) {
    const workflow = await this.prisma.clearanceWorkflow.findFirst({
      where: {
        universityId,
        name: 'BHU Standard Exit Clearance',
        isActive: true,
      },
      orderBy: { version: 'desc' },
      include: { steps: { include: { department: true } } },
    });

    if (!workflow || workflow.steps.length === 0) {
      throw new InternalServerErrorException(
        'Workflow steps not configured in database. Run migrations + seed.',
      );
    }

    return workflow.steps
      .slice()
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map((s) => ({
        stepOrder: s.stepOrder,
        department: s.department.name,
      }));
  }

  async getWorkflow() {
    const defaultUni = await this.prisma.university.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!defaultUni) {
      return [];
    }
    return this.getActiveWorkflowSteps(defaultUni.id);
  }

  async createDraft(studentUserId: string) {
    const universityId = await this.getUserUniversityId(studentUserId);
    if (!universityId) {
      throw new BadRequestException('Student university not found');
    }
    const blocking = await this.prisma.clearance.findFirst({
      where: {
        universityId,
        studentUserId,
        status: { in: ACTIVE_CLEARANCE },
      },
    });
    if (blocking) {
      throw new ConflictException(
        'You already have an active clearance. Submit, complete, or cancel it before starting another.',
      );
    }

    const clearance = await this.prisma.clearance.create({
      data: {
        universityId,
        studentUserId,
        referenceId: genReferenceId(),
        status: ClearanceStatus.DRAFT,
      },
    });

    await this.audit.log(
      studentUserId,
      'CLEARANCE_DRAFT_CREATED',
      'clearance',
      clearance.id,
      {
        referenceId: clearance.referenceId,
      },
    );

    return clearance;
  }

  async submit(studentUserId: string, clearanceId: string) {
    const universityId = await this.getUserUniversityId(studentUserId);
    if (!universityId) {
      throw new BadRequestException('Student university not found');
    }
    const clearance = await this.prisma.clearance.findFirst({
      where: { id: clearanceId, studentUserId, universityId },
      include: { steps: true },
    });
    if (!clearance) {
      throw new NotFoundException('Clearance not found');
    }
    if (clearance.status !== ClearanceStatus.DRAFT) {
      throw new BadRequestException('Only draft clearances can be submitted');
    }
    if (clearance.steps.length > 0) {
      throw new BadRequestException('Clearance already has steps');
    }

    const now = new Date();
    const steps = await this.getActiveWorkflowSteps(universityId);
    const firstDept = steps[0]?.department;
    if (!firstDept) {
      throw new InternalServerErrorException('Workflow steps missing step 1');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.clearance.update({
        where: { id: clearanceId },
        data: {
          status: ClearanceStatus.SUBMITTED,
          submittedAt: now,
          currentStepOrder: 1,
        },
      });
      await tx.clearanceStep.createMany({
        data: steps.map((s) => ({
          universityId,
          clearanceId,
          stepOrder: s.stepOrder,
          department: s.department,
          status: StepStatus.PENDING,
        })),
      });
    });

    await this.audit.log(
      studentUserId,
      'CLEARANCE_SUBMITTED',
      'clearance',
      clearanceId,
      {
        referenceId: clearance.referenceId,
      },
    );
    this.logger.info(
      { studentUserId, clearanceId, referenceId: clearance.referenceId },
      'Clearance submitted',
    );

    await this.notifyDepartmentStaff(
      firstDept,
      'New clearance pending',
      `Reference ${clearance.referenceId} is waiting at ${firstDept}.`,
      clearance.id,
    );

    return this.getStudentDashboard(studentUserId);
  }

  async getStudentDashboard(studentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: {
        id: true,
        universityId: true,
        email: true,
        displayName: true,
        role: true,
        studentUniversityId: true,
        studentDepartment: true,
        studentYear: true,
      },
    });
    if (!user || user.role !== Role.STUDENT) {
      throw new ForbiddenException();
    }

    const clearance = await this.prisma.clearance.findFirst({
      where: {
        universityId: user.universityId,
        studentUserId,
        status: { notIn: [ClearanceStatus.CANCELLED] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });

    const approvedCount =
      clearance?.steps.filter((s) => s.status === StepStatus.APPROVED).length ??
      0;
    const totalSteps =
      clearance?.steps.length ?? (approvedCount > 0 ? approvedCount : 13);

    return {
      student: {
        ...user,
        name: user.displayName ?? user.email,
      },
      clearance: clearance
        ? {
            id: clearance.id,
            referenceId: clearance.referenceId,
            status: clearance.status,
            progress: `${approvedCount}/${totalSteps}`,
            currentStepOrder: clearance.currentStepOrder,
            submittedAt: clearance.submittedAt,
            steps: clearance.steps.map((s) => ({
              id: s.id,
              stepOrder: s.stepOrder,
              department: s.department,
              status: s.status,
              comment: s.comment ?? '',
              reviewedAt: s.reviewedAt?.toISOString() ?? null,
            })),
          }
        : null,
      canDownloadCertificate:
        clearance?.status === ClearanceStatus.FULLY_CLEARED,
    };
  }

  async getCertificateMeta(studentUserId: string) {
    const universityId = await this.getUserUniversityId(studentUserId);
    const clearance = await this.prisma.clearance.findFirst({
      where: {
        universityId: universityId ?? undefined,
        studentUserId,
        status: ClearanceStatus.FULLY_CLEARED,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        student: {
          select: {
            displayName: true,
            email: true,
            studentUniversityId: true,
            studentDepartment: true,
            studentYear: true,
          },
        },
      },
    });
    if (!clearance) {
      throw new BadRequestException(
        'Certificate is available only after full clearance',
      );
    }

    return {
      university: 'Bule Hora University',
      referenceId: clearance.referenceId,
      issuedAt: new Date().toISOString(),
      student: {
        name: clearance.student.displayName ?? clearance.student.email,
        studentId: clearance.student.studentUniversityId,
        department: clearance.student.studentDepartment,
        year: clearance.student.studentYear,
      },
      status: 'FULLY_CLEARED',
      departments: clearance.steps.map((s) => ({
        department: s.department,
        status: s.status,
        reviewedAt: s.reviewedAt,
      })),
    };
  }

  async listPendingForStaff(
    staffUserId: string,
    staffDepartment: string | null,
  ) {
    if (!staffDepartment) {
      throw new BadRequestException('Staff account has no department assigned');
    }
    const staff = await this.prisma.user.findUnique({
      where: { id: staffUserId },
      select: { universityId: true },
    });
    if (!staff) {
      throw new NotFoundException('Staff user not found');
    }
    const target = normalizeDepartment(staffDepartment);

    // Find clearances where the current active step belongs to this staff's department
    const requests = await this.prisma.clearance.findMany({
      where: {
        universityId: staff.universityId,
        status: {
          in: [ClearanceStatus.SUBMITTED, ClearanceStatus.PAUSED_REJECTED],
        },
        // Only get clearances that have a current step
        currentStepOrder: { not: null },
      },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        student: {
          select: {
            id: true,
            email: true,
            displayName: true,
            studentUniversityId: true,
            studentDepartment: true,
            studentYear: true,
          },
        },
      },
    });

    const rows: Array<{
      requestId: string;
      referenceId: string;
      studentUserId: string;
      student: Record<string, unknown>;
      step: {
        stepOrder: number;
        department: string;
        status: StepStatus;
        comment: string | null;
      };
    }> = [];

    for (const req of requests) {
      // Get the current active step based on currentStepOrder
      const currentStep = req.steps.find(
        (s) =>
          s.stepOrder === req.currentStepOrder &&
          s.status === StepStatus.PENDING,
      );

      if (!currentStep) continue;

      // Only show if this step belongs to the staff's department
      if (normalizeDepartment(currentStep.department) !== target) continue;

      // Additional validation: ensure all previous steps are approved
      const prevSteps = req.steps.filter(
        (s) => s.stepOrder < currentStep.stepOrder,
      );
      const allPrevApproved = prevSteps.every(
        (s) => s.status === StepStatus.APPROVED,
      );

      // For step 1, no previous steps to check
      const isValidStep = currentStep.stepOrder === 1 || allPrevApproved;
      if (!isValidStep) continue;

      rows.push({
        requestId: req.id,
        referenceId: req.referenceId,
        studentUserId: req.studentUserId,
        student: {
          name: req.student.displayName ?? req.student.email,
          studentId: req.student.studentUniversityId,
          department: req.student.studentDepartment,
          year: req.student.studentYear,
        },
        step: {
          stepOrder: currentStep.stepOrder,
          department: currentStep.department,
          status: currentStep.status,
          comment: currentStep.comment,
        },
      });
    }

    this.logger.info(
      {
        staffUserId,
        staffDepartment,
        requestsFound: rows.length,
      },
      'Staff pending requests retrieved',
    );

    return rows;
  }

  async reviewStep(
    reviewerUserId: string,
    staffDepartment: string | null,
    clearanceId: string,
    stepOrder: number,
    payload: {
      status: 'APPROVED' | 'REJECTED';
      comment: string;
      reason?: string;
      instruction?: string;
    },
  ) {
    if (!staffDepartment?.trim()) {
      throw new BadRequestException('Staff account has no department assigned');
    }

    if (!payload.status || !['APPROVED', 'REJECTED'].includes(payload.status)) {
      throw new BadRequestException(
        'Status must be either APPROVED or REJECTED',
      );
    }

    if (!payload.comment?.trim()) {
      throw new BadRequestException('Comment is required');
    }

    if (
      payload.status === 'REJECTED' &&
      (!payload.reason?.trim() || !payload.instruction?.trim())
    ) {
      throw new BadRequestException(
        'Rejection requires reason and instruction',
      );
    }

    const decision =
      payload.status === 'APPROVED'
        ? ReviewDecision.APPROVED
        : ReviewDecision.REJECTED;
    const now = new Date();

    let commentText = payload.comment.trim();
    if (decision === ReviewDecision.REJECTED) {
      commentText = `Reason: ${payload.reason!.trim()}. Action: ${payload.instruction!.trim()}`;
    }

    let studentUserId = '';
    let referenceId = '';
    let stepDepartment = '';

    await this.prisma.$transaction(async (tx) => {
      const reviewer = await tx.user.findUnique({
        where: { id: reviewerUserId },
        select: { universityId: true },
      });
      if (!reviewer) {
        throw new NotFoundException('Reviewer not found');
      }
      const clearance = await tx.clearance.findUnique({
        where: { id: clearanceId },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
      if (!clearance) {
        throw new NotFoundException('Clearance not found');
      }
      if (clearance.universityId !== reviewer.universityId) {
        throw new ForbiddenException('Cross-university review is forbidden');
      }
      if (
        clearance.status !== ClearanceStatus.SUBMITTED &&
        clearance.status !== ClearanceStatus.PAUSED_REJECTED
      ) {
        throw new BadRequestException(
          'This clearance is not open for department review',
        );
      }

      const step = clearance.steps.find((s) => s.stepOrder === stepOrder);
      if (!step) {
        throw new NotFoundException('Step not found');
      }

      if (
        normalizeDepartment(step.department) !==
        normalizeDepartment(staffDepartment)
      ) {
        throw new ForbiddenException(
          'This step is not assigned to your department',
        );
      }

      // Concurrency control: only allow transition from DB state PENDING.
      const updated = await tx.clearanceStep.updateMany({
        where: { id: step.id, status: StepStatus.PENDING },
        data: {
          universityId: clearance.universityId,
          status:
            decision === ReviewDecision.APPROVED
              ? StepStatus.APPROVED
              : StepStatus.REJECTED,
          comment: commentText || null,
          reviewedAt: now,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException(
          'This step was already reviewed. Refresh and try again.',
        );
      }

      // Validate workflow sequence
      if (stepOrder > 1) {
        const prev = clearance.steps.find((s) => s.stepOrder === stepOrder - 1);
        if (!prev || prev.status !== StepStatus.APPROVED) {
          throw new BadRequestException('Previous step must be approved first');
        }
      }

      // Create review record with proper validation
      const reviewData: {
        clearanceStepId: string;
        reviewerUserId: string;
        decision: ReviewDecision;
        comment: string | null;
        reason?: string | null;
        instruction?: string | null;
      } = {
        clearanceStepId: step.id,
        reviewerUserId,
        decision,
        comment: payload.comment?.trim() || null,
      };

      if (payload.status === 'REJECTED') {
        reviewData.reason = payload.reason?.trim() || null;
        reviewData.instruction = payload.instruction?.trim() || null;
      }

      await tx.review.create({ data: reviewData });

      const stepsNow = await tx.clearanceStep.findMany({
        where: { clearanceId },
        select: { stepOrder: true, status: true },
      });
      const maxStepOrder = Math.max(...stepsNow.map((s) => s.stepOrder));
      const allApproved = stepsNow.every(
        (s) => s.status === StepStatus.APPROVED,
      );

      if (decision === ReviewDecision.REJECTED) {
        await tx.clearance.update({
          where: { id: clearanceId },
          data: {
            status: ClearanceStatus.PAUSED_REJECTED,
            currentStepOrder: stepOrder,
          },
        });
      } else if (allApproved) {
        await tx.clearance.update({
          where: { id: clearanceId },
          data: {
            status: ClearanceStatus.FULLY_CLEARED,
            currentStepOrder: null,
          },
        });
      } else {
        const nextOrder = stepOrder + 1;
        await tx.clearance.update({
          where: { id: clearanceId },
          data: {
            status: ClearanceStatus.SUBMITTED,
            currentStepOrder: nextOrder <= maxStepOrder ? nextOrder : null,
          },
        });
      }

      studentUserId = clearance.studentUserId;
      referenceId = clearance.referenceId;
      stepDepartment = step.department;
    });

    const refreshed = await this.prisma.clearance.findUnique({
      where: { id: clearanceId },
      include: { steps: true },
    });

    if (payload.status === 'APPROVED') {
      await this.notifications.create(
        studentUserId,
        'Step approved',
        `${stepDepartment} approved your clearance (ref ${referenceId}).`,
        undefined,
        'CLEARANCE_STEP_APPROVED',
        { referenceId },
        clearanceId,
      );
      if (refreshed?.status === ClearanceStatus.FULLY_CLEARED) {
        await this.notifications.create(
          studentUserId,
          'Clearance complete',
          'All steps are approved. You may download your certificate when available.',
          undefined,
          'CLEARANCE_COMPLETE',
          { referenceId },
          clearanceId,
        );
      } else {
        const next = refreshed?.steps.find(
          (s) => s.stepOrder === stepOrder + 1,
        );
        if (next) {
          await this.notifyDepartmentStaff(
            next.department,
            'New clearance pending',
            `Student clearance ${referenceId} is waiting at ${next.department}.`,
            refreshed?.id,
          );
        }
      }
    } else {
      await this.notifications.create(
        studentUserId,
        'Clearance step rejected',
        `${stepDepartment} rejected your clearance. ${commentText}`,
        undefined,
        'CLEARANCE_STEP_REJECTED',
        {
          referenceId,
          reason: payload.reason,
          instruction: payload.instruction,
        },
        clearanceId,
      );
    }

    // Audit after persistence to avoid logging a review that failed to commit.
    const refreshedStep = refreshed?.steps.find(
      (s) => s.stepOrder === stepOrder,
    );
    if (refreshedStep) {
      await this.audit.log(
        reviewerUserId,
        `STEP_${payload.status}`,
        'clearance_step',
        refreshedStep.id,
        {
          clearanceId,
          stepOrder,
          department: stepDepartment,
        },
      );
      this.logger.info(
        {
          reviewerUserId,
          clearanceId,
          stepOrder,
          decision: payload.status,
          department: stepDepartment,
        },
        'Step reviewed',
      );
    }

    return refreshed;
  }

  async listAllForAdmin(
    skip = 0,
    take = 50,
    filters?: {
      status?: string;
      studentEmail?: string;
      department?: string;
    },
  ) {
    // Validate pagination parameters
    if (skip < 0) {
      throw new BadRequestException('Skip parameter must be non-negative');
    }
    if (take < 1 || take > 100) {
      throw new BadRequestException('Take parameter must be between 1 and 100');
    }

    const where: Record<string, any> = {};

    if (filters?.status?.trim()) {
      where.status = filters.status;
    }

    if (filters?.studentEmail?.trim()) {
      where.student = {
        email: { contains: filters.studentEmail.trim(), mode: 'insensitive' },
      };
    }

    if (filters?.department?.trim()) {
      where.steps = {
        some: {
          department: {
            contains: filters.department.trim(),
            mode: 'insensitive',
          },
        },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.clearance.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          student: {
            select: {
              email: true,
              displayName: true,
              studentUniversityId: true,
              studentDepartment: true,
            },
          },
          steps: {
            select: { stepOrder: true, department: true, status: true },
            orderBy: { stepOrder: 'asc' },
          },
        },
      }),
      this.prisma.clearance.count({ where }),
    ]);
    return { items, total, skip, take };
  }

  async adminSummary() {
    const [total, fullyCleared, pausedRejected, inProgress] = await Promise.all(
      [
        this.prisma.clearance.count(),
        this.prisma.clearance.count({
          where: { status: ClearanceStatus.FULLY_CLEARED },
        }),
        this.prisma.clearance.count({
          where: { status: ClearanceStatus.PAUSED_REJECTED },
        }),
        this.prisma.clearance.count({
          where: {
            status: {
              in: [
                ClearanceStatus.DRAFT,
                ClearanceStatus.SUBMITTED,
                ClearanceStatus.PAUSED_REJECTED,
              ],
            },
          },
        }),
      ],
    );
    return { total, fullyCleared, pausedRejected, inProgress };
  }

  async adminOverrideStep(
    actorUserId: string,
    clearanceId: string,
    dto: {
      stepOrder: number;
      decision: 'APPROVED' | 'REJECTED';
      reason: string;
    },
  ) {
    const now = new Date();
    const reason = dto.reason.trim();
    const decision =
      dto.decision === 'APPROVED'
        ? ReviewDecision.APPROVED
        : ReviewDecision.REJECTED;
    const stepStatus =
      dto.decision === 'APPROVED' ? StepStatus.APPROVED : StepStatus.REJECTED;

    let studentUserId = '';
    let referenceId = '';
    let stepDepartment = '';
    let stepId = '';

    await this.prisma.$transaction(async (tx) => {
      const clearance = await tx.clearance.findUnique({
        where: { id: clearanceId },
        include: { student: true, steps: true },
      });
      if (!clearance) {
        throw new NotFoundException('Clearance not found');
      }

      const step = clearance.steps.find((s) => s.stepOrder === dto.stepOrder);
      if (!step) {
        throw new NotFoundException('Step not found');
      }

      studentUserId = clearance.studentUserId;
      referenceId = clearance.referenceId;
      stepDepartment = step.department;
      stepId = step.id;

      await tx.clearanceStep.update({
        where: { id: step.id },
        data: {
          status: stepStatus,
          comment: reason || null,
          reviewedAt: now,
        },
      });

      await tx.review.create({
        data: {
          clearanceStepId: step.id,
          reviewerUserId: actorUserId,
          decision,
          comment: reason || null,
          reason: dto.decision === 'REJECTED' ? reason : null,
          instruction: null,
        },
      });

      const stepsNow = await tx.clearanceStep.findMany({
        where: { clearanceId },
        select: { stepOrder: true, status: true },
      });
      const maxStepOrder = Math.max(...stepsNow.map((s) => s.stepOrder));
      const allApproved = stepsNow.every(
        (s) => s.status === StepStatus.APPROVED,
      );

      if (dto.decision === 'REJECTED') {
        await tx.clearance.update({
          where: { id: clearanceId },
          data: {
            status: ClearanceStatus.PAUSED_REJECTED,
            currentStepOrder: dto.stepOrder,
          },
        });
      } else if (allApproved) {
        await tx.clearance.update({
          where: { id: clearanceId },
          data: {
            status: ClearanceStatus.FULLY_CLEARED,
            currentStepOrder: null,
          },
        });
      } else {
        const nextOrder = dto.stepOrder + 1;
        await tx.clearance.update({
          where: { id: clearanceId },
          data: {
            status: ClearanceStatus.SUBMITTED,
            currentStepOrder: nextOrder <= maxStepOrder ? nextOrder : null,
          },
        });
      }
    });

    // Notifications + audit outside the transaction
    const refreshed = await this.prisma.clearance.findUnique({
      where: { id: clearanceId },
      include: { steps: true },
    });

    if (dto.decision === 'APPROVED') {
      if (refreshed?.status === ClearanceStatus.FULLY_CLEARED) {
        await this.notifications.create(
          studentUserId,
          'Clearance complete',
          'All steps are approved. You may download your certificate when available.',
          undefined,
          'CLEARANCE_COMPLETE',
          { referenceId },
          clearanceId,
        );
      } else {
        await this.notifications.create(
          studentUserId,
          'Step approved (admin override)',
          `${stepDepartment} was approved by admin override (ref ${referenceId}).`,
          undefined,
          undefined,
          undefined,
          clearanceId,
        );
        const next = refreshed?.steps.find(
          (s) => s.stepOrder === dto.stepOrder + 1,
        );
        if (next) {
          await this.notifyDepartmentStaff(
            next.department,
            'New clearance pending',
            `Student clearance ${referenceId} is waiting at ${next.department}.`,
            refreshed?.id,
          );
        }
      }
    } else {
      await this.notifications.create(
        studentUserId,
        'Clearance step rejected (admin override)',
        `${stepDepartment} rejected your clearance by admin override. Reason: ${reason}`,
        undefined,
        undefined,
        undefined,
        clearanceId,
      );
    }

    await this.audit.log(
      actorUserId,
      'ADMIN_OVERRIDE',
      'clearance_step',
      stepId,
      {
        clearanceId,
        stepOrder: dto.stepOrder,
        decision: dto.decision,
        reason,
      },
    );
    this.logger.info(
      {
        actorUserId,
        clearanceId,
        stepOrder: dto.stepOrder,
        decision: dto.decision,
      },
      'Admin override applied',
    );

    return refreshed;
  }

  async requestRecheck(
    studentUserId: string,
    clearanceId: string,
    stepId: string,
    message: string,
  ) {
    const universityId = await this.getUserUniversityId(studentUserId);
    const clearance = await this.prisma.clearance.findFirst({
      where: {
        id: clearanceId,
        studentUserId,
        universityId: universityId ?? undefined,
      },
      include: { steps: true },
    });
    if (!clearance) {
      throw new NotFoundException('Clearance not found');
    }
    const step = clearance.steps.find((s) => s.id === stepId);
    if (!step || step.status !== StepStatus.REJECTED) {
      throw new BadRequestException('Re-check is only for rejected steps');
    }

    // Verify this step is actually the current step
    if (clearance.currentStepOrder !== step.stepOrder) {
      throw new BadRequestException(
        'You can only request recheck for the current rejected step',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const updatedStep = await tx.clearanceStep.updateMany({
        where: { id: step.id, status: StepStatus.REJECTED },
        data: {
          status: StepStatus.PENDING,
          comment: `Resubmitted: ${message}`,
          reviewedAt: null,
        },
      });
      if (updatedStep.count !== 1) {
        throw new ConflictException(
          'Step is no longer rejected (already rechecked by another request).',
        );
      }

      await tx.clearance.updateMany({
        where: { id: clearanceId, status: ClearanceStatus.PAUSED_REJECTED },
        data: {
          status: ClearanceStatus.SUBMITTED,
          currentStepOrder: step.stepOrder,
        },
      });

      // Create a resubmission record for tracking
      await tx.review.create({
        data: {
          clearanceStepId: step.id,
          reviewerUserId: studentUserId, // Student is the "reviewer" for resubmission
          decision: ReviewDecision.APPROVED, // Using APPROVED to indicate resubmission (positive action)
          comment: `Resubmitted: ${message}`,
        },
      });
    });

    // Send notification to department staff
    await this.notifyDepartmentStaff(
      step.department,
      'Re-check requested',
      `Student requested re-evaluation: ${message} (ref ${clearance.referenceId}).`,
      clearanceId,
    );

    // Send email notification to department staff
    const staffUsers = await this.prisma.user.findMany({
      where: {
        staffDepartment: { contains: step.department, mode: 'insensitive' },
        role: 'STAFF',
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    for (const staff of staffUsers) {
      await this.notifications.create(
        staff.id,
        'Re-check requested',
        `Student requested re-evaluation: ${message} (ref ${clearance.referenceId}).`,
        undefined,
        'RECHECK_REQUESTED',
        { referenceId: clearance.referenceId, department: step.department },
        clearanceId,
      );
    }

    await this.audit.log(
      studentUserId,
      'RECHECK_REQUESTED',
      'clearance',
      clearanceId,
      {
        stepOrder: step.stepOrder,
        message,
        department: step.department,
      },
    );

    this.logger.info(
      {
        studentUserId,
        clearanceId,
        stepOrder: step.stepOrder,
        department: step.department,
        message,
      },
      'Student requested recheck',
    );

    return this.getStudentDashboard(studentUserId);
  }

  private async notifyDepartmentStaff(
    department: string,
    title: string,
    body: string,
    clearanceId?: string,
  ) {
    const target = normalizeDepartment(department);
    const staff = await this.prisma.user.findMany({
      where: { role: Role.STAFF, staffDepartment: { not: null } },
    });
    for (const u of staff) {
      if (
        u.staffDepartment &&
        normalizeDepartment(u.staffDepartment) === target
      ) {
        await this.notifications.create(
          u.id,
          title,
          body,
          undefined,
          undefined,
          undefined,
          clearanceId,
        );
      }
    }
  }
}
