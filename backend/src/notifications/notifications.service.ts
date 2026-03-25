import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, title: string, body: string, universityId?: string) {
    let uniId = universityId;
    if (!uniId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { universityId: true },
      });
      uniId = user?.universityId;
    }
    if (!uniId) {
      return null;
    }
    return this.prisma.notification.create({
      data: { userId, universityId: uniId, title, body },
    });
  }

  async listForUser(userId: string, take = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async markRead(userId: string, notificationId: string) {
    const n = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!n) return null;
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }
}
