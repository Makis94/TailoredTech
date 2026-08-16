import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService, Principal } from '../access/access.service';
import { StorageService } from '../storage/storage.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateNameDto } from '../common/dto/update-name.dto';
import { Paginated, PaginationDto } from '../common/dto/pagination.dto';
import { toFolderSummary, toFileSummary } from '../common/mappers';

const ROOT_KEY = 'ROOT';

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly storage: StorageService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateFolderDto) {
    let parentKey = ROOT_KEY;

    if (dto.parentId) {
      const parentScope = await this.access.assertOwner(
        user,
        'FOLDER',
        dto.parentId,
      );
      if (parentScope.dataRoomId !== dto.dataRoomId) {
        throw new BadRequestException(
          'Parent folder does not belong to the given data room',
        );
      }
      parentKey = dto.parentId;
    } else {
      await this.access.assertOwner(user, 'DATA_ROOM', dto.dataRoomId);
    }

    const name = dto.name.trim();
    const conflict = await this.prisma.folder.findUnique({
      where: {
        dataRoomId_parentKey_name: {
          dataRoomId: dto.dataRoomId,
          parentKey,
          name,
        },
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException(
        `A folder named "${name}" already exists here`,
      );
    }

    const folder = await this.prisma.folder.create({
      data: {
        name,
        dataRoomId: dto.dataRoomId,
        parentId: dto.parentId ?? null,
        parentKey,
        ownerId: user.id,
      },
    });
    return toFolderSummary(folder);
  }

  async getDetail(principal: Principal, id: string) {
    const { level } = await this.access.checkReadAccess(
      principal,
      'FOLDER',
      id,
    );
    const folder = await this.prisma.folder.findUniqueOrThrow({
      where: { id },
      include: {
        dataRoom: { select: { id: true, name: true, ownerId: true } },
      },
    });
    const breadcrumb = await this.getBreadcrumb(id);
    return {
      ...toFolderSummary(folder),
      dataRoom: folder.dataRoom,
      breadcrumb,
      accessLevel: level,
    };
  }

  async getContents(
    principal: Principal,
    id: string,
    pagination: PaginationDto,
  ) {
    await this.access.checkReadAccess(principal, 'FOLDER', id);
    return this.listContents(
      { dataRoomId: undefined, parentOrFolderId: id, isRoot: false },
      pagination,
    );
  }

  /** Root-level contents of a data room (folderId/parentId = null). */
  async getRootContents(
    principal: Principal,
    dataRoomId: string,
    pagination: PaginationDto,
  ) {
    await this.access.checkReadAccess(principal, 'DATA_ROOM', dataRoomId);
    return this.listContents(
      { dataRoomId, parentOrFolderId: null, isRoot: true },
      pagination,
    );
  }

  async rename(user: AuthenticatedUser, id: string, dto: UpdateNameDto) {
    const scope = await this.access.assertOwner(user, 'FOLDER', id);
    const folder = await this.prisma.folder.findUniqueOrThrow({
      where: { id },
    });
    const name = dto.name.trim();

    if (name !== folder.name) {
      const conflict = await this.prisma.folder.findUnique({
        where: {
          dataRoomId_parentKey_name: {
            dataRoomId: scope.dataRoomId,
            parentKey: folder.parentKey,
            name,
          },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException(
          `A folder named "${name}" already exists here`,
        );
      }
    }

    const updated = await this.prisma.folder.update({
      where: { id },
      data: { name },
    });
    return toFolderSummary(updated);
  }

  /** Recursive folder/file counts + total bytes for the confirmation dialog and folder detail view. */
  async getStats(principal: Principal, id: string) {
    await this.access.checkReadAccess(principal, 'FOLDER', id);
    const descendantIds = await this.getDescendantFolderIds(id);
    const folderCount = descendantIds.length - 1; // exclude the folder itself

    // A single query for both count and byte total: joining files to their
    // *current* version only (old versions don't count toward live storage use).
    const [agg] = await this.prisma.$queryRaw<
      { fileCount: bigint; totalSize: bigint | null }[]
    >`
      SELECT COUNT(f.id) AS "fileCount", COALESCE(SUM(fv.size), 0) AS "totalSize"
      FROM files f
      JOIN file_versions fv ON fv.id = f."currentVersionId"
      WHERE f."folderId" = ANY(${descendantIds}::text[])
    `;

    return {
      folderCount,
      fileCount: Number(agg?.fileCount ?? 0),
      totalSizeBytes: Number(agg?.totalSize ?? 0),
    };
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.access.assertOwner(user, 'FOLDER', id);
    const descendantIds = await this.getDescendantFolderIds(id);

    const storageKeys = await this.prisma.fileVersion.findMany({
      where: { file: { folderId: { in: descendantIds } } },
      select: { storageKey: true },
    });

    // Cascade delete in the DB first — the user-visible action completes even
    // if the storage cleanup below has partial failures (logged, best-effort).
    await this.prisma.folder.delete({ where: { id } });
    await this.storage.deleteMany(storageKeys.map((v) => v.storageKey));
  }

  async search(principal: Principal, id: string, query: string) {
    await this.access.checkReadAccess(principal, 'FOLDER', id);
    const descendantIds = await this.getDescendantFolderIds(id);
    return this.searchWithin(descendantIds, query);
  }

  // --- shared helpers, also used by DataRoomsService for root-scoped views ---

  async searchWithin(folderIds: string[], query: string) {
    const q = query.trim();
    if (!q) return { folders: [], files: [] };

    const [folders, files] = await Promise.all([
      this.prisma.folder.findMany({
        where: {
          id: { in: folderIds },
          name: { contains: q, mode: 'insensitive' },
        },
        orderBy: { name: 'asc' },
        take: 100,
      }),
      this.prisma.file.findMany({
        where: {
          folderId: { in: folderIds },
          name: { contains: q, mode: 'insensitive' },
        },
        include: { currentVersion: true },
        orderBy: { name: 'asc' },
        take: 100,
      }),
    ]);

    return {
      folders: folders.map((f) => toFolderSummary(f)),
      files: files.map((f) => toFileSummary(f)),
    };
  }

  async getBreadcrumb(
    folderId: string,
  ): Promise<{ id: string; name: string }[]> {
    const crumbs: { id: string; name: string }[] = [];
    let currentId: string | null = folderId;
    let guard = 0;
    while (currentId && guard < 1000) {
      const folder: {
        id: string;
        name: string;
        parentId: string | null;
      } | null = await this.prisma.folder.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true },
      });
      if (!folder) break;
      crumbs.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parentId;
      guard++;
    }
    return crumbs;
  }

  /** All descendant folder ids (including the folder itself), via a recursive CTE. */
  async getDescendantFolderIds(folderId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE subtree AS (
        SELECT id FROM folders WHERE id = ${folderId}
        UNION ALL
        SELECT f.id FROM folders f INNER JOIN subtree s ON f."parentId" = s.id
      )
      SELECT id FROM subtree
    `;
    return rows.map((r) => r.id);
  }

  private async listContents(
    target: {
      dataRoomId?: string;
      parentOrFolderId: string | null;
      isRoot: boolean;
    },
    pagination: PaginationDto,
  ) {
    const folderWhere: Prisma.FolderWhereInput = target.isRoot
      ? { dataRoomId: target.dataRoomId, parentId: null }
      : { parentId: target.parentOrFolderId };
    const fileWhere: Prisma.FileWhereInput = target.isRoot
      ? { dataRoomId: target.dataRoomId, folderId: null }
      : { folderId: target.parentOrFolderId };

    const [folders, total, files] = await Promise.all([
      this.prisma.folder.findMany({
        where: folderWhere,
        orderBy: { name: 'asc' },
        take: 500,
      }),
      this.prisma.file.count({ where: fileWhere }),
      this.prisma.file.findMany({
        where: fileWhere,
        include: { currentVersion: true },
        orderBy: { name: 'asc' },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
    ]);

    return {
      folders: folders.map((f) => toFolderSummary(f)),
      files: {
        items: files.map((f) => toFileSummary(f)),
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      } satisfies Paginated<ReturnType<typeof toFileSummary>>,
    };
  }
}
