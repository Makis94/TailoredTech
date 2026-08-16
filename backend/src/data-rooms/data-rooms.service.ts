import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService, Principal } from '../access/access.service';
import { StorageService } from '../storage/storage.service';
import { FoldersService } from '../folders/folders.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { UpdateNameDto } from '../common/dto/update-name.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { toFolderSummary, toFileSummary } from '../common/mappers';

@Injectable()
export class DataRoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly storage: StorageService,
    private readonly folders: FoldersService,
  ) {}

  create(user: AuthenticatedUser, dto: CreateDataRoomDto) {
    return this.prisma.dataRoom.create({
      data: { name: dto.name.trim(), ownerId: user.id },
    });
  }

  listOwned(user: AuthenticatedUser) {
    return this.prisma.dataRoom.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getDetail(principal: Principal, id: string) {
    const { level } = await this.access.checkReadAccess(
      principal,
      'DATA_ROOM',
      id,
    );
    const dataRoom = await this.prisma.dataRoom.findUniqueOrThrow({
      where: { id },
    });

    // Whole-room totals are a flat, indexed aggregate — no recursion needed,
    // because every folder/file is tagged with its dataRoomId directly
    // (unlike a single folder's subtree, which needs the recursive CTE in
    // FoldersService.getStats). See README "How it scales".
    const [folderCount, agg] = await Promise.all([
      this.prisma.folder.count({ where: { dataRoomId: id } }),
      this.prisma.$queryRaw<{ fileCount: bigint; totalSize: bigint | null }[]>`
        SELECT COUNT(f.id) AS "fileCount", COALESCE(SUM(fv.size), 0) AS "totalSize"
        FROM files f
        JOIN file_versions fv ON fv.id = f."currentVersionId"
        WHERE f."dataRoomId" = ${id}
      `,
    ]);

    return {
      ...dataRoom,
      accessLevel: level,
      stats: {
        folderCount,
        fileCount: Number(agg[0]?.fileCount ?? 0),
        totalSizeBytes: Number(agg[0]?.totalSize ?? 0),
      },
    };
  }

  getContents(principal: Principal, id: string, pagination: PaginationDto) {
    return this.folders.getRootContents(principal, id, pagination);
  }

  async rename(user: AuthenticatedUser, id: string, dto: UpdateNameDto) {
    await this.access.assertOwner(user, 'DATA_ROOM', id);
    return this.prisma.dataRoom.update({
      where: { id },
      data: { name: dto.name.trim() },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.access.assertOwner(user, 'DATA_ROOM', id);
    const storageKeys = await this.prisma.fileVersion.findMany({
      where: { file: { dataRoomId: id } },
      select: { storageKey: true },
    });

    await this.prisma.dataRoom.delete({ where: { id } });
    await this.storage.deleteMany(storageKeys.map((v) => v.storageKey));
  }

  async search(principal: Principal, id: string, query: string) {
    await this.access.checkReadAccess(principal, 'DATA_ROOM', id);
    const q = query.trim();
    if (!q) return { folders: [], files: [] };

    const [folders, files] = await Promise.all([
      this.prisma.folder.findMany({
        where: { dataRoomId: id, name: { contains: q, mode: 'insensitive' } },
        orderBy: { name: 'asc' },
        take: 100,
      }),
      this.prisma.file.findMany({
        where: { dataRoomId: id, name: { contains: q, mode: 'insensitive' } },
        include: { currentVersion: true },
        orderBy: { name: 'asc' },
        take: 100,
      }),
    ]);

    return {
      folders: folders.map(toFolderSummary),
      files: files.map(toFileSummary),
    };
  }
}
