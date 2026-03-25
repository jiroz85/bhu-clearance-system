import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    actorUserId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    details?: Prisma.InputJsonValue,
    universityId?: string,
  ) {
    let uniId = universityId;
    if (!uniId && actorUserId) {
      const actor = await this.prisma.user.findUnique({
        where: { id: actorUserId },
        select: { universityId: true },
      });
      uniId = actor?.universityId;
    }
    return this.prisma.auditLog.create({
      data: {
        actorUserId,
        ...(uniId ? { universityId: uniId } : {}),
        action,
        entityType,
        entityId,
        ...(details !== undefined ? { details } : {}),
      },
    });
  }

  async listRecent(take = 100) {
    return await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        actor: {
          select: { id: true, email: true, displayName: true, role: true },
        },
      },
    });
  }
}
