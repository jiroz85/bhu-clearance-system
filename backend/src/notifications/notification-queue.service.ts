import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService, NotificationData } from '../email/email.service';

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async queueNotification(data: NotificationData): Promise<string> {
    // First create the notification record
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        body: data.body,
        universityId: data.universityId || '',
      },
    });

    // Then create the queue entry
    const queuedNotification = await this.prisma.notificationQueue.create({
      data: {
        notificationId: notification.id,
        universityId: data.universityId || '',
        type: data.type,
        data: data.data || {},
        status: 'PENDING',
        retryCount: 0,
        scheduledAt: new Date(),
      },
    });

    // Try to send immediately
    await this.processNotification(queuedNotification.id);

    return queuedNotification.id;
  }

  async processNotification(queueId: string): Promise<void> {
    const notificationQueue = await this.prisma.notificationQueue.findUnique({
      where: { id: queueId },
      include: {
        notification: true,
      },
    });

    if (!notificationQueue || notificationQueue.status === 'SENT') {
      return;
    }

    if (
      notificationQueue.status === 'FAILED' &&
      notificationQueue.retryCount >= this.MAX_RETRIES
    ) {
      this.logger.warn(
        `Notification ${queueId} exceeded max retries, giving up`,
      );
      await this.prisma.notificationQueue.update({
        where: { id: queueId },
        data: { status: 'PERMANENTLY_FAILED' },
      });
      return;
    }

    // Check if enough time has passed for retry
    if (notificationQueue.retryCount > 0) {
      const timeSinceLastAttempt =
        Date.now() - notificationQueue.updatedAt.getTime();
      const retryDelay =
        this.RETRY_DELAY_MS * Math.pow(2, notificationQueue.retryCount - 1); // Exponential backoff

      if (timeSinceLastAttempt < retryDelay) {
        return; // Not time to retry yet
      }
    }

    try {
      const notificationData: NotificationData = {
        userId: notificationQueue.notification.userId,
        universityId: notificationQueue.universityId,
        title: notificationQueue.notification.title,
        body: notificationQueue.notification.body,
        type: notificationQueue.type as any,
        data: notificationQueue.data as Record<string, any>,
      };

      const success =
        await this.emailService.sendEmailNotification(notificationData);

      if (success) {
        await this.prisma.notificationQueue.update({
          where: { id: queueId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });
        this.logger.log(`Notification ${queueId} sent successfully`);
      } else {
        throw new Error('Email service returned false');
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to send notification ${queueId}: ${error.message}`,
      );

      await this.prisma.notificationQueue.update({
        where: { id: queueId },
        data: {
          status: 'FAILED',
          retryCount: notificationQueue.retryCount + 1,
          lastError: error.message,
          scheduledAt: new Date(
            Date.now() +
              this.RETRY_DELAY_MS * Math.pow(2, notificationQueue.retryCount),
          ),
        },
      });
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingNotifications(): Promise<void> {
    const pendingNotifications = await this.prisma.notificationQueue.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { scheduledAt: { lte: new Date() } },
          {
            status: 'FAILED',
            retryCount: { lt: this.MAX_RETRIES },
            scheduledAt: { lte: new Date() },
          },
        ],
      },
      take: 10, // Process 10 at a time to avoid overwhelming
    });

    for (const notification of pendingNotifications) {
      await this.processNotification(notification.id);
    }
  }

  async getQueueStats(): Promise<{
    pending: number;
    sent: number;
    failed: number;
    permanentlyFailed: number;
  }> {
    const stats = await this.prisma.notificationQueue.groupBy({
      by: ['status'],
      _count: true,
    });

    return {
      pending: stats.find((s) => s.status === 'PENDING')?._count || 0,
      sent: stats.find((s) => s.status === 'SENT')?._count || 0,
      failed: stats.find((s) => s.status === 'FAILED')?._count || 0,
      permanentlyFailed:
        stats.find((s) => s.status === 'PERMANENTLY_FAILED')?._count || 0,
    };
  }

  async retryFailedNotification(queueId: string): Promise<boolean> {
    const notification = await this.prisma.notificationQueue.findUnique({
      where: { id: queueId },
    });

    if (!notification || notification.status !== 'FAILED') {
      return false;
    }

    await this.prisma.notificationQueue.update({
      where: { id: queueId },
      data: {
        status: 'PENDING',
        scheduledAt: new Date(),
      },
    });

    await this.processNotification(queueId);
    return true;
  }

  async getFailedNotifications(limit = 50): Promise<any[]> {
    return this.prisma.notificationQueue.findMany({
      where: {
        status: { in: ['FAILED', 'PERMANENTLY_FAILED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        notification: {
          select: {
            user: {
              select: { email: true, displayName: true },
            },
          },
        },
      },
    });
  }
}
