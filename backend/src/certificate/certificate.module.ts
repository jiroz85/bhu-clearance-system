import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CertificateService } from './certificate.service';
import { StudentCertificateController } from './student-certificate.controller';
import { CertificateVerifyController } from './certificate-verify.controller';

@Module({
  imports: [AuditModule],
  controllers: [StudentCertificateController, CertificateVerifyController],
  providers: [CertificateService],
  exports: [CertificateService],
})
export class CertificateModule {}

