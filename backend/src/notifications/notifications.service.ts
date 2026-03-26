import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService, NotificationData } from '../email/email.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(
    userId: string,
    title: string,
    body: string,
    universityId?: string,
    type?: NotificationData['type'],
    data?: Record<string, any>,
  ) {
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

    // Create in-app notification
    const notification = await this.prisma.notification.create({
      data: { userId, universityId: uniId, title, body },
    });

    // Send email notification if type is provided
    if (type) {
      const emailData: NotificationData = {
        userId,
        universityId: uniId,
        title,
        body,
        type,
        data,
      };

      // Send email asynchronously (don't wait for it to complete)
      this.emailService.sendEmailNotification(emailData).catch((error) => {
        this.logger.error(
          `Failed to send email notification: ${error.message}`,
        );
      });
    }

    return notification;
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
