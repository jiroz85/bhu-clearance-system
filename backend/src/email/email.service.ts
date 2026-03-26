import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationData {
  userId: string;
  universityId: string;
  title: string;
  body: string;
  type:
    | 'CLEARANCE_STEP_APPROVED'
    | 'CLEARANCE_STEP_REJECTED'
    | 'CLEARANCE_COMPLETE'
    | 'RECHECK_REQUESTED';
  data?: Record<string, any>;
}

export interface EmailRetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly isEnabled: boolean;
  private readonly retryConfig: EmailRetryConfig = {
    maxRetries: 3,
    retryDelayMs: 5 * 60 * 1000, // 5 minutes
    backoffMultiplier: 2,
  };

  // Simple in-memory retry queue for failed emails
  private retryQueue: Map<
    string,
    { notification: NotificationData; attempts: number; nextRetryAt: number }
  > = new Map();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.isEnabled = this.config.get('EMAIL_ENABLED', 'false') === 'true';

    if (this.isEnabled) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get('EMAIL_HOST'),
        port: this.config.get('EMAIL_PORT', 587),
        secure: this.config.get('EMAIL_SECURE', 'false') === 'true',
        auth: {
          user: this.config.get('EMAIL_USER'),
          pass: this.config.get('EMAIL_PASS'),
        },
      });

      // Start retry processor
      this.startRetryProcessor();
    }
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email || null;
  }

  private generateTemplate(notification: NotificationData): EmailTemplate {
    const { title, body, type, data } = notification;

    switch (type) {
      case 'CLEARANCE_STEP_APPROVED':
        return {
          subject: `✅ ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #10b981; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">BHU Student Clearance</h1>
                <p style="margin: 5px 0 0 0;">Step Approved</p>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #1f2937; margin-bottom: 20px;">${title}</h2>
                <p style="color: #4b5563; line-height: 1.6;">${body}</p>
                ${
                  data?.referenceId
                    ? `
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Reference ID</p>
                    <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 16px; color: #1f2937;">${data.referenceId}</p>
                  </div>
                `
                    : ''
                }
                ${
                  data?.nextDepartment
                    ? `
                  <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #1e40af;">🔄 Next step: ${data.nextDepartment}</p>
                  </div>
                `
                    : ''
                }
              </div>
              <div style="background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">Bule Hora University - Registrar Office</p>
                <p style="margin: 5px 0 0 0;">This is an automated message. Please do not reply.</p>
              </div>
            </div>
          `,
          text: `${title}\n\n${body}${data?.referenceId ? `\n\nReference ID: ${data.referenceId}` : ''}${data?.nextDepartment ? `\n\nNext step: ${data.nextDepartment}` : ''}`,
        };

      case 'CLEARANCE_STEP_REJECTED':
        return {
          subject: `❌ ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #ef4444; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">BHU Student Clearance</h1>
                <p style="margin: 5px 0 0 0;">Step Rejected</p>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #1f2937; margin-bottom: 20px;">${title}</h2>
                <p style="color: #4b5563; line-height: 1.6;">${body}</p>
                ${
                  data?.referenceId
                    ? `
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Reference ID</p>
                    <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 16px; color: #1f2937;">${data.referenceId}</p>
                  </div>
                `
                    : ''
                }
                ${
                  data?.reason || data?.instruction
                    ? `
                  <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                    ${data?.reason ? `<p style="margin: 0 0 10px 0;"><strong>Reason:</strong> ${data.reason}</p>` : ''}
                    ${data?.instruction ? `<p style="margin: 0;"><strong>Action Required:</strong> ${data.instruction}</p>` : ''}
                  </div>
                `
                    : ''
                }
                <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #92400e;">💡 You can request a re-check from your dashboard after addressing the issues.</p>
                </div>
              </div>
              <div style="background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">Bule Hora University - Registrar Office</p>
                <p style="margin: 5px 0 0 0;">This is an automated message. Please do not reply.</p>
              </div>
            </div>
          `,
          text: `${title}\n\n${body}${data?.referenceId ? `\n\nReference ID: ${data.referenceId}` : ''}${data?.reason ? `\n\nReason: ${data.reason}` : ''}${data?.instruction ? `\n\nAction Required: ${data.instruction}` : ''}`,
        };

      case 'CLEARANCE_COMPLETE':
        return {
          subject: `🎉 ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #10b981; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">BHU Student Clearance</h1>
                <p style="margin: 5px 0 0 0;">🎉 Clearance Complete!</p>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #1f2937; margin-bottom: 20px;">${title}</h2>
                <p style="color: #4b5563; line-height: 1.6;">${body}</p>
                ${
                  data?.referenceId
                    ? `
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Reference ID</p>
                    <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 16px; color: #1f2937;">${data.referenceId}</p>
                  </div>
                `
                    : ''
                }
                <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <p style="margin: 0; color: #065f46; font-size: 18px; font-weight: bold;">🏆 All 13 departments cleared!</p>
                  <p style="margin: 10px 0 0 0; color: #047857;">You can now download your clearance certificate.</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/student/clearances" 
                     style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Go to Dashboard
                  </a>
                </div>
              </div>
              <div style="background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">Bule Hora University - Registrar Office</p>
                <p style="margin: 5px 0 0 0;">This is an automated message. Please do not reply.</p>
              </div>
            </div>
          `,
          text: `${title}\n\n${body}${data?.referenceId ? `\n\nReference ID: ${data.referenceId}` : ''}\n\n🏆 All 13 departments cleared!\n\nVisit your dashboard to download the clearance certificate.`,
        };

      case 'RECHECK_REQUESTED':
        return {
          subject: `🔄 ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #3b82f6; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">BHU Student Clearance</h1>
                <p style="margin: 5px 0 0 0;">🔄 Re-check Requested</p>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #1f2937; margin-bottom: 20px;">${title}</h2>
                <p style="color: #4b5563; line-height: 1.6;">${body}</p>
                ${
                  data?.referenceId
                    ? `
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Reference ID</p>
                    <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 16px; color: #1f2937;">${data.referenceId}</p>
                  </div>
                `
                    : ''
                }
                ${
                  data?.department
                    ? `
                  <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #1e40af;">📍 Department: ${data.department}</p>
                  </div>
                `
                    : ''
                }
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/staff/clearances/pending" 
                     style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Review Request
                  </a>
                </div>
              </div>
              <div style="background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">Bule Hora University - Registrar Office</p>
                <p style="margin: 5px 0 0 0;">This is an automated message. Please do not reply.</p>
              </div>
            </div>
          `,
          text: `${title}\n\n${body}${data?.referenceId ? `\n\nReference ID: ${data.referenceId}` : ''}${data?.department ? `\n\nDepartment: ${data.department}` : ''}\n\nVisit your staff dashboard to review the request.`,
        };

      default:
        return {
          subject: title,
          html: `<div style="font-family: Arial, sans-serif; padding: 30px; background: #f9fafb;"><h2>${title}</h2><p>${body}</p></div>`,
          text: `${title}\n\n${body}`,
        };
    }
  }

  async sendEmailNotification(
    notification: NotificationData,
  ): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.log('Email service disabled, skipping email send');
      return false;
    }

    const queueKey = `${notification.userId}-${notification.type}-${Date.now()}`;

    try {
      const userEmail = await this.getUserEmail(notification.userId);
      if (!userEmail) {
        this.logger.warn(`No email found for user ${notification.userId}`);
        return false;
      }

      const template = this.generateTemplate(notification);

      await this.transporter.sendMail({
        from: this.config.get(
          'EMAIL_FROM',
          'BHU Clearance <noreply@bhu.edu.et>',
        ),
        to: userEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      this.logger.log(`Email sent to ${userEmail}: ${template.subject}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to send email to user ${notification.userId}:`,
        error.message,
      );

      // Add to retry queue
      this.addToRetryQueue(queueKey, notification);
      return false;
    }
  }

  async sendBulkEmails(
    notifications: NotificationData[],
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const notification of notifications) {
      const success = await this.sendEmailNotification(notification);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    this.logger.log(
      `Bulk email send completed: ${sent} sent, ${failed} failed`,
    );
    return { sent, failed };
  }

  async testConnection(): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('Email service connection verified');
      return true;
    } catch (error: any) {
      this.logger.error('Email service connection failed:', error.message);
      return false;
    }
  }

  private addToRetryQueue(key: string, notification: NotificationData): void {
    const retryItem = {
      notification,
      attempts: 1,
      nextRetryAt: Date.now() + this.retryConfig.retryDelayMs,
    };

    this.retryQueue.set(key, retryItem);
    this.logger.log(`Added email to retry queue: ${key} (attempt 1)`);
  }

  private startRetryProcessor(): void {
    // Process retry queue every 2 minutes
    setInterval(
      () => {
        this.processRetryQueue();
      },
      2 * 60 * 1000,
    );
  }

  private async processRetryQueue(): Promise<void> {
    const now = Date.now();
    const itemsToRetry: string[] = [];

    for (const [key, item] of this.retryQueue.entries()) {
      if (
        item.nextRetryAt <= now &&
        item.attempts <= this.retryConfig.maxRetries
      ) {
        itemsToRetry.push(key);
      } else if (item.attempts > this.retryConfig.maxRetries) {
        this.retryQueue.delete(key);
        this.logger.error(`Email retry exceeded max attempts: ${key}`);
      }
    }

    for (const key of itemsToRetry) {
      const item = this.retryQueue.get(key);
      if (!item) continue;

      try {
        const success = await this.sendEmailNotification(item.notification);
        if (success) {
          this.retryQueue.delete(key);
          this.logger.log(
            `Email retry successful: ${key} (attempt ${item.attempts})`,
          );
        } else {
          // Update retry count and schedule next retry
          item.attempts++;
          item.nextRetryAt =
            Date.now() +
            this.retryConfig.retryDelayMs *
              Math.pow(this.retryConfig.backoffMultiplier, item.attempts - 1);
          this.logger.log(
            `Email retry failed: ${key} (attempt ${item.attempts}), next retry at ${new Date(item.nextRetryAt)}`,
          );
        }
      } catch (error: any) {
        this.logger.error(
          `Unexpected error during email retry: ${key}`,
          error.message,
        );
        item.attempts++;
        item.nextRetryAt =
          Date.now() +
          this.retryConfig.retryDelayMs *
            Math.pow(this.retryConfig.backoffMultiplier, item.attempts - 1);
      }
    }
  }

  getRetryQueueStats(): { pending: number; totalRetries: number } {
    let totalRetries = 0;
    for (const item of this.retryQueue.values()) {
      totalRetries += item.attempts;
    }

    return {
      pending: this.retryQueue.size,
      totalRetries,
    };
  }
}
