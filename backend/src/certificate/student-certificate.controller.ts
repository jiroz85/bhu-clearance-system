import { Controller, Get, Param, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../../generated/prisma/enums';
import { CertificateService } from './certificate.service';

@Controller('api/student/clearance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class StudentCertificateController {
  constructor(private readonly certificate: CertificateService) {}

  @Get(':id/certificate/pdf')
  async downloadPdf(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) clearanceId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, certificateNumber } = await this.certificate.generatePdfForClearance(
      userId,
      clearanceId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${certificateNumber}.pdf"`,
    );
    return res.end(buffer);
  }

  @Get(':id/certificate/url')
  secureUrl(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) clearanceId: string,
  ) {
    return this.certificate.getSecureDownloadUrl(userId, clearanceId);
  }
}

