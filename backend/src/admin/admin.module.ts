import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ClearanceModule } from '../clearance/clearance.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuditModule, ClearanceModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
