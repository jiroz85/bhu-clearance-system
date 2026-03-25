import { Controller, Get, Param } from '@nestjs/common';
import { CertificateService } from './certificate.service';

@Controller('api/certificate')
export class CertificateVerifyController {
  constructor(private readonly certificate: CertificateService) {}

  @Get('verify/:certificateNumber')
  verify(@Param('certificateNumber') certificateNumber: string) {
    return this.certificate.verifyCertificate(certificateNumber);
  }
}

