import { Module } from '@nestjs/common';
import { HODDashboardController } from './hod-dashboard.controller';
import { HODDashboardService } from './hod-dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [HODDashboardController],
  providers: [HODDashboardService],
  exports: [HODDashboardService],
})
export class HODDashboardModule {}
