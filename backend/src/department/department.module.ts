import { Module } from '@nestjs/common';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { ClearanceModule } from '../clearance/clearance.module';

@Module({
  controllers: [DepartmentController],
  providers: [DepartmentService],
  imports: [ClearanceModule],
  exports: [DepartmentService],
})
export class DepartmentModule {}
