import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ClearanceModule } from './clearance/clearance.module';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { CertificateModule } from './certificate/certificate.module';
import { CommonModule } from './common/common.module';
import { HODDashboardModule } from './hod-dashboard/hod-dashboard.module';
import { ReportingModule } from './reporting/reporting.module';
import { DepartmentModule } from './department/department.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    CommonModule,
    UsersModule,
    AuthModule,
    NotificationsModule,
    ClearanceModule,
    AdminModule,
    CertificateModule,
    HODDashboardModule,
    ReportingModule,
    DepartmentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
