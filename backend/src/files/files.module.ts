import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { AccessModule } from '../access/access.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AccessModule, StorageModule],
  providers: [FilesService],
  controllers: [FilesController],
  exports: [FilesService],
})
export class FilesModule {}
