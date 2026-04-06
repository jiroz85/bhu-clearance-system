import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CertificateService } from './certificate.service';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Controller('api/certificate')
export class CertificateVerifyController {
  constructor(private readonly certificate: CertificateService) {}

  @Get('verify/:certificateNumber')
  verify(@Param('certificateNumber') certificateNumber: string) {
    return this.certificate.verifyCertificate(certificateNumber);
  }

  @Post('verify/:certificateNumber/file')
  @UseInterceptors(FileInterceptor('file'))
  verifyWithFile(
    @Param('certificateNumber') certificateNumber: string,
    @UploadedFile() file: MulterFile,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }
    const result = this.certificate.verifyCertificateWithFile(
      certificateNumber,
      file.buffer,
    );
    // Wrap response to match API response format
    return {
      success: true,
      statusCode: 200,
      message: 'File verification completed',
      data: result,
      timestamp: new Date().toISOString(),
      path: `/api/certificate/verify/${certificateNumber}/file`,
    };
  }
}
