import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AccessModule } from './access/access.module';
import { StorageModule } from './storage/storage.module';
import { DataRoomsModule } from './data-rooms/data-rooms.module';
import { FoldersModule } from './folders/folders.module';
import { FilesModule } from './files/files.module';
import { SharesModule } from './shares/shares.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AccessModule,
    StorageModule,
    DataRoomsModule,
    FoldersModule,
    FilesModule,
    SharesModule,
  ],
  controllers: [AppController],
  providers: [
    // Every route requires auth by default; opt out per-route with @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
