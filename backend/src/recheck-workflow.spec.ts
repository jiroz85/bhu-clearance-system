import { Test, TestingModule } from '@nestjs/testing';
import { ClearanceService } from '../src/clearance/clearance.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { AuditService } from '../src/audit/audit.service';
import { LoggingService } from '../src/common/logging.service';
import { ClearanceStatus, StepStatus, Role } from '../generated/prisma/enums';

describe('Clearance Recheck Workflow', () => {
  let service: ClearanceService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClearanceService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            clearance: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            clearanceStep: {
              updateMany: jest.fn(),
              findMany: jest.fn(),
            },
            review: {
              create: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(prisma)),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: LoggingService,
          useValue: {
            info: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ClearanceService>(ClearanceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('requestRecheck', () => {
    it('should successfully request recheck for a rejected step', async () => {
      // Mock data
      const mockClearance = {
        id: 'clearance-1',
        studentUserId: 'student-1',
        referenceId: 'BHU-CLR-2024-ABC',
        currentStepOrder: 4,
        status: ClearanceStatus.PAUSED_REJECTED,
        steps: [
          {
            id: 'step-4',
            stepOrder: 4,
            department: 'Dormitory',
            status: StepStatus.REJECTED,
          },
        ],
      };

      const mockUser = {
        universityId: 'university-1',
      };

      // Mock prisma calls
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest
        .spyOn(prisma.clearance, 'findFirst')
        .mockResolvedValue(mockClearance as any);
      jest
        .spyOn(prisma.clearanceStep, 'updateMany')
        .mockResolvedValue({ count: 1 } as any);
      jest
        .spyOn(prisma.clearance, 'updateMany')
        .mockResolvedValue({ count: 1 } as any);
      jest
        .spyOn(prisma.user, 'findMany')
        .mockResolvedValue([{ id: 'staff-1' }] as any);

      // Mock getStudentDashboard
      jest.spyOn(service, 'getStudentDashboard').mockResolvedValue({} as any);

      // Execute
      const result = await service.requestRecheck(
        'student-1',
        'clearance-1',
        'step-4',
        'I have submitted the room key',
      );

      // Verify
      expect(prisma.clearanceStep.updateMany).toHaveBeenCalledWith({
        where: { id: 'step-4', status: StepStatus.REJECTED },
        data: {
          status: StepStatus.PENDING,
          comment: null,
          reviewedAt: null,
        },
      });

      expect(prisma.clearance.updateMany).toHaveBeenCalledWith({
        where: { id: 'clearance-1', status: ClearanceStatus.PAUSED_REJECTED },
        data: {
          status: ClearanceStatus.SUBMITTED,
          currentStepOrder: 4,
        },
      });

      expect(result).toBeDefined();
    });

    it('should reject recheck for non-current step', async () => {
      // Mock data
      const mockClearance = {
        id: 'clearance-1',
        studentUserId: 'student-1',
        referenceId: 'BHU-CLR-2024-ABC',
        currentStepOrder: 5, // Different from requested step
        status: ClearanceStatus.PAUSED_REJECTED,
        steps: [
          {
            id: 'step-4',
            stepOrder: 4,
            department: 'Dormitory',
            status: StepStatus.REJECTED,
          },
        ],
      };

      const mockUser = {
        universityId: 'university-1',
      };

      // Mock prisma calls
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest
        .spyOn(prisma.clearance, 'findFirst')
        .mockResolvedValue(mockClearance as any);

      // Execute & Verify
      await expect(
        service.requestRecheck(
          'student-1',
          'clearance-1',
          '4',
          'I have submitted the room key',
        ),
      ).rejects.toThrow(
        'You can only request recheck for the current rejected step',
      );
    });

    it('should reject recheck for approved step', async () => {
      // Mock data
      const mockClearance = {
        id: 'clearance-1',
        studentUserId: 'student-1',
        referenceId: 'BHU-CLR-2024-ABC',
        currentStepOrder: 4,
        status: ClearanceStatus.PAUSED_REJECTED,
        steps: [
          {
            id: 'step-4',
            stepOrder: 4,
            department: 'Dormitory',
            status: StepStatus.APPROVED, // Not rejected
          },
        ],
      };

      const mockUser = {
        universityId: 'university-1',
      };

      // Mock prisma calls
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest
        .spyOn(prisma.clearance, 'findFirst')
        .mockResolvedValue(mockClearance as any);

      // Execute & Verify
      await expect(
        service.requestRecheck(
          'student-1',
          'clearance-1',
          '4',
          'I have submitted the room key',
        ),
      ).rejects.toThrow('Re-check is only for rejected steps');
    });
  });
});
