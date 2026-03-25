import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly bucket: string;
  private readonly client: S3Client;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const region = config.get<string>('s3.region') ?? '';
    const bucket = config.get<string>('s3.bucket') ?? '';
    const accessKeyId = config.get<string>('s3.accessKeyId') ?? '';
    const secretAccessKey = config.get<string>('s3.secretAccessKey') ?? '';
    const endpoint = config.get<string>('s3.endpoint') ?? '';

    this.bucket = bucket;
    this.enabled = !!(region && bucket && accessKeyId && secretAccessKey);
    this.client = new S3Client({
      region: region || 'us-east-1',
      ...(endpoint ? { endpoint } : {}),
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  isEnabled() {
    return this.enabled;
  }

  async uploadPdf(key: string, buffer: Buffer) {
    if (!this.enabled) {
      throw new InternalServerErrorException('S3 storage is not configured');
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
        ACL: 'private',
      }),
    );
    return `s3://${this.bucket}/${key}`;
  }

  async downloadPdfByUrl(fileUrl: string) {
    if (!this.enabled) {
      throw new InternalServerErrorException('S3 storage is not configured');
    }
    const m = /^s3:\/\/([^/]+)\/(.+)$/.exec(fileUrl);
    if (!m) {
      throw new InternalServerErrorException('Invalid S3 file URL');
    }
    const [, bucket, key] = m;
    const obj = await this.client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const chunks: Buffer[] = [];
    const stream = obj.Body;
    if (!stream || typeof (stream as any)[Symbol.asyncIterator] !== 'function') {
      throw new InternalServerErrorException('S3 object stream is unavailable');
    }
    for await (const chunk of stream as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async getSignedReadUrl(fileUrl: string, expiresInSec = 300) {
    if (!this.enabled) {
      throw new InternalServerErrorException('S3 storage is not configured');
    }
    const m = /^s3:\/\/([^/]+)\/(.+)$/.exec(fileUrl);
    if (!m) {
      throw new InternalServerErrorException('Invalid S3 file URL');
    }
    const [, bucket, key] = m;
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: expiresInSec },
    );
  }
}

