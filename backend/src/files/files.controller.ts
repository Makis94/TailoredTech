import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { MoveFileDto } from './dto/move-file.dto';
import { UpdateNameDto } from '../common/dto/update-name.dto';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { ShareableRead } from '../common/decorators/shareable-read.decorator';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB — generous for due-diligence PDFs

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadFileDto,
    @UploadedFile(
      new ParseFilePipeBuilder().build({
        fileIsRequired: true,
        errorHttpStatusCode: 400,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.files.upload(user, dto.dataRoomId, dto.folderId, {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
  }

  @ShareableRead()
  @Get(':id')
  getDetail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('shareToken') shareToken?: string,
  ) {
    return this.files.getDetail({ user, shareToken }, id);
  }

  @ShareableRead()
  @Get(':id/versions')
  listVersions(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('shareToken') shareToken?: string,
  ) {
    return this.files.listVersions({ user, shareToken }, id);
  }

  @ShareableRead()
  @Get(':id/download-url')
  getDownloadUrl(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('shareToken') shareToken?: string,
    @Query('versionId') versionId?: string,
  ) {
    return this.files.getDownloadUrl({ user, shareToken }, id, versionId);
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateNameDto,
  ) {
    return this.files.rename(user, id, dto);
  }

  @Patch(':id/move')
  move(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MoveFileDto,
  ) {
    return this.files.move(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.files.remove(user, id);
  }
}
