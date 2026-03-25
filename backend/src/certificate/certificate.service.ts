import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClearanceStatus, StepStatus } from '../../generated/prisma/enums';
import { StorageService } from '../common/storage.service';
import { LoggingService } from '../common/logging.service';

function genCertificateNumber() {
  const y = new Date().getFullYear();
  const hex = randomBytes(4).toString('hex').toUpperCase(); // 8 chars
  return `BHU-CERT-${y}-${hex}`.slice(0, 64);
}

function sha256Hex(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function pdfBufferFromDoc(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (d: any) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

@Injectable()
export class CertificateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly logger: LoggingService,
  ) {}

  async generatePdfForClearance(studentUserId: string, clearanceId: string) {
    const clearance = await this.prisma.clearance.findUnique({
      where: { id: clearanceId },
      include: {
        student: {
          select: {
            id: true,
            displayName: true,
            email: true,
            studentUniversityId: true,
            studentDepartment: true,
            studentYear: true,
          },
        },
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });

    if (!clearance || clearance.studentUserId !== studentUserId) {
      throw new BadRequestException('Clearance not found');
    }
    if (clearance.status !== ClearanceStatus.FULLY_CLEARED) {
      throw new BadRequestException('Certificate is available only after full clearance');
    }
    if (clearance.steps.length === 0) {
      throw new BadRequestException('Invalid clearance steps');
    }
    if (clearance.steps.length !== 13) {
      throw new BadRequestException('Certificate can be generated only when all 13 steps are present');
    }
    const allCleared = clearance.steps.every((s) => s.status === StepStatus.APPROVED);
    if (!allCleared) {
      throw new BadRequestException('Certificate cannot be generated until all 13 steps are approved');
    }

    const existing = await this.prisma.certificate.findUnique({ where: { clearanceId } });
    if (existing) {
      if (existing.fileUrl.startsWith('s3://')) {
        const buffer = await this.storage.downloadPdfByUrl(existing.fileUrl);
        return { buffer, certificateNumber: existing.certificateNumber };
      }
      const fileExists = fs.existsSync(existing.fileUrl);
      if (fileExists) {
        const buffer = await fs.promises.readFile(existing.fileUrl);
        return { buffer, certificateNumber: existing.certificateNumber };
      }
    }

    let certificateNumber = genCertificateNumber();
    // Ensure uniqueness (rare collision, but cheap to verify)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const exists = await this.prisma.certificate.findUnique({
        where: { certificateNumber },
      });
      if (!exists) break;
      certificateNumber = genCertificateNumber();
    }

    const issuedAt = new Date();
    const verificationCode = certificateNumber; // deterministic + easy to verify

    const qrBuffer = await QRCode.toBuffer(verificationCode, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 110,
    });

    const step13 = clearance.steps.find((s) => s.stepOrder === 13);
    if (!step13) {
      throw new BadRequestException('Invalid clearance configuration: missing step 13');
    }
    const latestReviewForStep13 = await this.prisma.review.findFirst({
      where: { clearanceStepId: step13.id },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: {
            displayName: true,
            email: true,
            staffDepartment: true,
            role: true,
          },
        },
      },
    });

    const registrarName =
      latestReviewForStep13?.reviewer.displayName ??
      latestReviewForStep13?.reviewer.email ??
      'Registrar';
    const registrarRole =
      latestReviewForStep13?.reviewer.role === 'STAFF'
        ? `Staff (${latestReviewForStep13.reviewer.staffDepartment ?? '—'})`
        : latestReviewForStep13?.reviewer.role ?? '—';

    const studentName = clearance.student.displayName ?? clearance.student.email;
    const studentId = clearance.student.studentUniversityId ?? '—';
    const studentDepartment = clearance.student.studentDepartment ?? '—';
    const studentYear = clearance.student.studentYear ?? '—';

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.font('Times-Bold').fontSize(18).text('Bule Hora University', { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Times-Bold').fontSize(14).text('Student Clearance Certificate', { align: 'center' });
    doc.moveDown(1);

    doc.font('Times-Roman').fontSize(11);
    doc.text(`Certificate No.: ${certificateNumber}`);
    doc.text(`Reference No.: ${clearance.referenceId}`);
    doc.text(`Issue Date: ${issuedAt.toISOString().slice(0, 10)}`);
    doc.moveDown(0.5);

    doc.font('Times-Bold').fontSize(12).text('Student Information');
    doc.moveDown(0.2);
    doc.font('Times-Roman').fontSize(11);
    doc.text(`Name: ${studentName}`);
    doc.text(`Student ID: ${studentId}`);
    doc.text(`Department: ${studentDepartment}`);
    doc.text(`Year: ${studentYear}`);
    doc.moveDown(0.6);

    doc.font('Times-Bold').fontSize(12).text('Clearance Departments');
    doc.moveDown(0.2);

    const startY = doc.y;
    const rowHeight = 18;
    const maxRows = 13;
    const tableWidth = 460;
    const col1 = 40;
    const col2 = 300;
    const col3 = tableWidth - col1 - col2;

    for (let i = 0; i < maxRows; i += 1) {
      const step = clearance.steps[i];
      const no = step?.stepOrder ?? i + 1;
      const dept = step?.department ?? '—';
      doc
        .font('Times-Roman')
        .fontSize(10)
        .text(String(no), 50, startY + i * rowHeight, { width: col1 })
        .text(dept, 90, startY + i * rowHeight, { width: col2 })
        .text('CLEARED', 90 + col2, startY + i * rowHeight, { width: col3, align: 'right' });
    }

    doc.moveDown(1.2);
    doc.font('Times-Bold').fontSize(12).text('Registrar Validation');
    doc.moveDown(0.2);
    doc.font('Times-Roman').fontSize(11);
    doc.text(`Validated By: ${registrarName}`);
    doc.text(`Role/Desk: ${registrarRole}`);

    // QR + verification text
    const qrX = 420;
    const qrY = 560;
    doc.image(qrBuffer, qrX, qrY, { width: 110, height: 110 });
    doc.fontSize(9).text(`Verify using code: ${verificationCode}`, 50, qrY + 120, {
      width: 500,
      align: 'center',
    });

    doc.end();
    const buffer = await pdfBufferFromDoc(doc);
    const checksumSha256 = sha256Hex(buffer);

    // Persist PDF using S3 when configured; fallback to local file only for dev.
    const fileKey = `certificates/${clearance.universityId}/${clearance.id}/${certificateNumber}.pdf`;
    let filePath: string;
    if (this.storage.isEnabled()) {
      filePath = await this.storage.uploadPdf(fileKey, buffer);
    } else {
      const certDir = path.join(process.cwd(), 'generated', 'certificates');
      await fs.promises.mkdir(certDir, { recursive: true });
      filePath = path.join(certDir, `${certificateNumber}.pdf`);
      await fs.promises.writeFile(filePath, buffer);
    }

    // Save certificate metadata
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const saved = await this.prisma.certificate.upsert({
      where: { clearanceId },
      update: {
        certificateNumber,
        issuedAt,
        fileUrl: filePath,
        checksumSha256,
        verificationCode,
      },
      create: {
        universityId: clearance.universityId,
        clearanceId,
        studentUserId: studentUserId,
        certificateNumber,
        issuedAt,
        fileUrl: filePath,
        checksumSha256,
        verificationCode,
      },
    });

    await this.audit.log(studentUserId, 'CERTIFICATE_GENERATED', 'certificate', saved.id, {
      certificateNumber: saved.certificateNumber,
      clearanceId,
    });
    this.logger.info(
      { clearanceId, certificateNumber: saved.certificateNumber, storage: saved.fileUrl },
      'Certificate generated',
    );

    return { buffer, certificateNumber: saved.certificateNumber };
  }

  async verifyCertificate(certificateNumber: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { certificateNumber },
      include: {
        clearance: {
          include: { steps: true },
        },
        student: true,
      },
    });

    if (!certificate) {
      return {
        certificateNumber,
        valid: false,
        status: null,
        student: null,
        issuedAt: null,
      };
    }

    const allCleared = certificate.clearance.steps.every((s) => s.status === StepStatus.APPROVED);
    const valid = certificate.clearance.status === ClearanceStatus.FULLY_CLEARED && allCleared;

    return {
      certificateNumber,
      valid,
      status: certificate.clearance.status,
      issuedAt: certificate.issuedAt.toISOString(),
      student: {
        name: certificate.student.displayName ?? certificate.student.email,
        studentId: certificate.student.studentUniversityId,
        department: certificate.student.studentDepartment,
        year: certificate.student.studentYear,
      },
    };
  }

  async getSecureDownloadUrl(studentUserId: string, clearanceId: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { clearanceId },
      include: { clearance: true },
    });
    if (!cert || cert.studentUserId !== studentUserId) {
      throw new BadRequestException('Certificate not found');
    }
    if (!cert.fileUrl.startsWith('s3://')) {
      return { url: null };
    }
    const url = await this.storage.getSignedReadUrl(cert.fileUrl, 300);
    return { url, expiresInSec: 300 };
  }
}

