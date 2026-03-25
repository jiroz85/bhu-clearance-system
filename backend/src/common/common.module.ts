import { Global, Module } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [LoggingService, StorageService],
  exports: [LoggingService, StorageService],
})
export class CommonModule {}

