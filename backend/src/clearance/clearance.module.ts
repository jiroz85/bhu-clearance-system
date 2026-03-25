import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClearanceService } from './clearance.service';
import { StudentClearanceController } from './student-clearance.controller';
import { StaffClearanceController } from './staff-clearance.controller';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [StudentClearanceController, StaffClearanceController],
  providers: [ClearanceService],
  exports: [ClearanceService],
})
export class ClearanceModule {}
