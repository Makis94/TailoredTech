import { Module } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { FoldersController } from './folders.controller';
import { AccessModule } from '../access/access.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AccessModule, StorageModule],
  providers: [FoldersService],
  controllers: [FoldersController],
  exports: [FoldersService],
})
export class FoldersModule {}
