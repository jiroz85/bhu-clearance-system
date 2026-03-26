import { Module } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, NotificationsModule, EmailModule],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
