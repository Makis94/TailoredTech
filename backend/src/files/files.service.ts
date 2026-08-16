import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService, Principal } from '../access/access.service';
import { StorageService } from '../storage/storage.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UpdateNameDto } from '../common/dto/update-name.dto';
import { MoveFileDto } from './dto/move-file.dto';
import {
  resolveConflictFreeName,
  sanitizeFileName,
} from '../common/naming.util';
import { toFileSummary } from '../common/mappers';

const ROOT_KEY = 'ROOT';
const ALLOWED_MIME_TYPES = new Set(['application/pdf']);

export interface UploadedFilePayload {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Uploads always succeed on a name conflict: instead of erroring or
   * silently renaming, re-uploading an existing name in the same folder adds
   * a new version to that file (the extra-credit "versioning" behavior).
   */
  async upload(
    user: AuthenticatedUser,
    dataRoomId: string,
    folderId: string | undefined,
    payload: UploadedFilePayload,
  ) {
    if (!ALLOWED_MIME_TYPES.has(payload.mimeType)) {
      throw new BadRequestException('Only PDF files are supported');
    }

    let folderKey = ROOT_KEY;
    if (folderId) {
      const scope = await this.access.assertOwner(user, 'FOLDER', folderId);
      if (scope.dataRoomId !== dataRoomId) {
        throw new BadRequestException(
          'Folder does not belong to the given data room',
        );
      }
      folderKey = folderId;
    } else {
      await this.access.assertOwner(user, 'DATA_ROOM', dataRoomId);
    }

    const name = sanitizeFileName(payload.originalName);

    const existing = await this.prisma.file.findUnique({
      where: { dataRoomId_folderKey_name: { dataRoomId, folderKey, name } },
    });

    if (existing) {
      return this.addVersion(user, existing.id, dataRoomId, payload);
    }

    const fileId = randomUUID();
    const storageKey = this.storage.buildObjectKey(dataRoomId, fileId, 1, name);
    await this.storage.upload(
      storageKey,
      payload.buffer,
      payload.mimeType,
      payload.size,
    );

    const file = await this.prisma.$transaction(async (tx) => {
      await tx.file.create({
        data: {
          id: fileId,
          name,
          dataRoomId,
          folderId: folderId ?? null,
          folderKey,
          ownerId: user.id,
        },
      });
      const version = await tx.fileVersion.create({
        data: {
          fileId,
          versionNumber: 1,
          storageKey,
          size: payload.size,
          mimeType: payload.mimeType,
          uploadedById: user.id,
        },
      });
      return tx.file.update({
        where: { id: fileId },
        data: { currentVersionId: version.id },
        include: { currentVersion: true },
      });
    });

    return toFileSummary(file);
  }

  private async addVersion(
    user: AuthenticatedUser,
    fileId: string,
    dataRoomId: string,
    payload: UploadedFilePayload,
  ) {
    const latest = await this.prisma.fileVersion.aggregate({
      where: { fileId },
      _max: { versionNumber: true },
    });
    const versionNumber = (latest._max.versionNumber ?? 0) + 1;
    const existingFile = await this.prisma.file.findUniqueOrThrow({
      where: { id: fileId },
    });
    const storageKey = this.storage.buildObjectKey(
      dataRoomId,
      fileId,
      versionNumber,
      existingFile.name,
    );
    await this.storage.upload(
      storageKey,
      payload.buffer,
      payload.mimeType,
      payload.size,
    );

    const file = await this.prisma.$transaction(async (tx) => {
      const version = await tx.fileVersion.create({
        data: {
          fileId,
          versionNumber,
          storageKey,
          size: payload.size,
          mimeType: payload.mimeType,
          uploadedById: user.id,
        },
      });
      return tx.file.update({
        where: { id: fileId },
        data: { currentVersionId: version.id },
        include: { currentVersion: true },
      });
    });

    return toFileSummary(file);
  }

  async getDetail(principal: Principal, id: string) {
    const { level } = await this.access.checkReadAccess(principal, 'FILE', id);
    const file = await this.prisma.file.findUniqueOrThrow({
      where: { id },
      include: {
        currentVersion: true,
        dataRoom: { select: { id: true, name: true } },
      },
    });
    return {
      ...toFileSummary(file),
      dataRoom: file.dataRoom,
      accessLevel: level,
    };
  }

  async listVersions(principal: Principal, id: string) {
    await this.access.checkReadAccess(principal, 'FILE', id);
    const versions = await this.prisma.fileVersion.findMany({
      where: { fileId: id },
      orderBy: { versionNumber: 'desc' },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });
    return versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      size: v.size,
      mimeType: v.mimeType,
      createdAt: v.createdAt,
      uploadedBy: v.uploadedBy,
    }));
  }

  async getDownloadUrl(principal: Principal, id: string, versionId?: string) {
    await this.access.checkReadAccess(principal, 'FILE', id);
    const file = await this.prisma.file.findUniqueOrThrow({ where: { id } });

    const version = versionId
      ? await this.prisma.fileVersion.findFirst({
          where: { id: versionId, fileId: id },
        })
      : await this.prisma.fileVersion.findUnique({
          where: { id: file.currentVersionId! },
        });

    if (!version) throw new NotFoundException('File version not found');

    const url = await this.storage.getDownloadUrl(
      version.storageKey,
      file.name,
    );
    return { url, mimeType: version.mimeType, size: version.size };
  }

  async rename(user: AuthenticatedUser, id: string, dto: UpdateNameDto) {
    const scope = await this.access.assertOwner(user, 'FILE', id);
    const file = await this.prisma.file.findUniqueOrThrow({ where: { id } });
    const desiredName = dto.name.trim();

    const name = await resolveConflictFreeName(
      desiredName,
      async (candidate) => {
        if (candidate === file.name) return false;
        const conflict = await this.prisma.file.findUnique({
          where: {
            dataRoomId_folderKey_name: {
              dataRoomId: scope.dataRoomId,
              folderKey: file.folderKey,
              name: candidate,
            },
          },
          select: { id: true },
        });
        return !!conflict;
      },
    );

    const updated = await this.prisma.file.update({
      where: { id },
      data: { name },
      include: { currentVersion: true },
    });
    return toFileSummary(updated);
  }

  async move(user: AuthenticatedUser, id: string, dto: MoveFileDto) {
    const fileScope = await this.access.assertOwner(user, 'FILE', id);
    const file = await this.prisma.file.findUniqueOrThrow({ where: { id } });

    let folderKey = ROOT_KEY;
    if (dto.folderId) {
      const destScope = await this.access.assertOwner(
        user,
        'FOLDER',
        dto.folderId,
      );
      if (destScope.dataRoomId !== fileScope.dataRoomId) {
        throw new BadRequestException(
          'Cannot move a file to a folder in a different data room',
        );
      }
      folderKey = dto.folderId;
    }

    const name = await resolveConflictFreeName(file.name, async (candidate) => {
      const conflict = await this.prisma.file.findUnique({
        where: {
          dataRoomId_folderKey_name: {
            dataRoomId: fileScope.dataRoomId,
            folderKey,
            name: candidate,
          },
        },
        select: { id: true },
      });
      return !!conflict && conflict.id !== id;
    });

    const updated = await this.prisma.file.update({
      where: { id },
      data: { folderId: dto.folderId ?? null, folderKey, name },
      include: { currentVersion: true },
    });
    return toFileSummary(updated);
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.access.assertOwner(user, 'FILE', id);
    const versions = await this.prisma.fileVersion.findMany({
      where: { fileId: id },
      select: { storageKey: true },
    });

    await this.prisma.file.delete({ where: { id } });
    await this.storage.deleteMany(versions.map((v) => v.storageKey));
  }
}
