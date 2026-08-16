import { Module } from '@nestjs/common';
import { DataRoomsService } from './data-rooms.service';
import { DataRoomsController } from './data-rooms.controller';
import { AccessModule } from '../access/access.module';
import { StorageModule } from '../storage/storage.module';
import { FoldersModule } from '../folders/folders.module';

@Module({
  imports: [AccessModule, StorageModule, FoldersModule],
  providers: [DataRoomsService],
  controllers: [DataRoomsController],
})
export class DataRoomsModule {}
