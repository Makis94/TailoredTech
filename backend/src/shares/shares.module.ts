import { Module } from '@nestjs/common';
import { SharesService } from './shares.service';
import { SharesController } from './shares.controller';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [AccessModule],
  providers: [SharesService],
  controllers: [SharesController],
})
export class SharesModule {}
