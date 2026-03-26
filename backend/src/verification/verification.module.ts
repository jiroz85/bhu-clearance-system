import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VerificationController],
})
export class VerificationModule {}
