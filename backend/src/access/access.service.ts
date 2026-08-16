import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ShareResourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { normalizeEmail } from '../auth/auth.service';

export type AccessLevel = 'OWNER' | 'VIEWER';

export interface Principal {
  user?: AuthenticatedUser;
  shareToken?: string;
}

interface ResourceScope {
  dataRoomId: string;
  ownerId: string;
  /** Folder itself plus every ancestor up to (and not including) the data room root. Empty for a DATA_ROOM/root-level FILE target. */
  folderAncestorIds: string[];
  fileId?: string;
}

/**
 * Central place that answers "can this principal read/write this resource?"
 * A principal is either an authenticated user, a share token (public link),
 * or both — folders/files/data rooms all funnel through here so the sharing
 * rules only have to be implemented once.
 */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Read access check used by every GET endpoint that a share can expose.
   * Returns 'OWNER' or 'VIEWER'; throws 404 (never 403) on denial so we don't
   * confirm to an anonymous prober that a given resource id exists.
   */
  async checkReadAccess(
    principal: Principal,
    resourceType: ShareResourceType,
    resourceId: string,
  ): Promise<{ level: AccessLevel; scope: ResourceScope }> {
    const scope = await this.resolveScope(resourceType, resourceId);

    if (principal.user && principal.user.id === scope.ownerId) {
      return { level: 'OWNER', scope };
    }

    if (principal.shareToken) {
      const share = await this.prisma.share.findUnique({
        where: { token: principal.shareToken },
      });
      if (
        share &&
        share.mode === 'PUBLIC' &&
        !share.revokedAt &&
        this.shareCoversScope(share, scope)
      ) {
        return { level: 'VIEWER', scope };
      }
    }

    if (principal.user) {
      const email = normalizeEmail(principal.user.email);
      const grantedShare = await this.prisma.share.findFirst({
        where: {
          mode: 'PERMISSIONED',
          revokedAt: null,
          OR: this.scopeShareFilters(resourceType, scope),
          grants: { some: { OR: [{ userId: principal.user.id }, { email }] } },
        },
        select: { id: true },
      });
      if (grantedShare) {
        return { level: 'VIEWER', scope };
      }
    }

    throw new NotFoundException('Resource not found');
  }

  /** Write access check. A resource can only ever be written by its owner — shares are always read-only. */
  async assertOwner(
    user: AuthenticatedUser,
    resourceType: ShareResourceType,
    resourceId: string,
  ): Promise<ResourceScope> {
    const scope = await this.resolveScope(resourceType, resourceId);
    if (scope.ownerId !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to modify this resource',
      );
    }
    return scope;
  }

  private shareCoversScope(
    share: {
      resourceType: ShareResourceType;
      dataRoomId: string | null;
      folderId: string | null;
      fileId: string | null;
    },
    scope: ResourceScope,
  ): boolean {
    switch (share.resourceType) {
      case 'DATA_ROOM':
        return share.dataRoomId === scope.dataRoomId;
      case 'FOLDER':
        return (
          !!share.folderId && scope.folderAncestorIds.includes(share.folderId)
        );
      case 'FILE':
        return !!share.fileId && share.fileId === scope.fileId;
    }
  }

  private scopeShareFilters(
    resourceType: ShareResourceType,
    scope: ResourceScope,
  ) {
    const filters: Array<Record<string, unknown>> = [
      { resourceType: 'DATA_ROOM', dataRoomId: scope.dataRoomId },
    ];
    if (scope.folderAncestorIds.length > 0) {
      filters.push({
        resourceType: 'FOLDER',
        folderId: { in: scope.folderAncestorIds },
      });
    }
    if (scope.fileId) {
      filters.push({ resourceType: 'FILE', fileId: scope.fileId });
    }
    return filters;
  }

  private async resolveScope(
    resourceType: ShareResourceType,
    resourceId: string,
  ): Promise<ResourceScope> {
    switch (resourceType) {
      case 'DATA_ROOM': {
        const dataRoom = await this.prisma.dataRoom.findUnique({
          where: { id: resourceId },
          select: { id: true, ownerId: true },
        });
        if (!dataRoom) throw new NotFoundException('Data room not found');
        return {
          dataRoomId: dataRoom.id,
          ownerId: dataRoom.ownerId,
          folderAncestorIds: [],
        };
      }
      case 'FOLDER': {
        const folder = await this.prisma.folder.findUnique({
          where: { id: resourceId },
          select: {
            id: true,
            dataRoomId: true,
            dataRoom: { select: { ownerId: true } },
          },
        });
        if (!folder) throw new NotFoundException('Folder not found');
        const folderAncestorIds = await this.getAncestorFolderIds(folder.id);
        return {
          dataRoomId: folder.dataRoomId,
          ownerId: folder.dataRoom.ownerId,
          folderAncestorIds,
        };
      }
      case 'FILE': {
        const file = await this.prisma.file.findUnique({
          where: { id: resourceId },
          select: {
            id: true,
            dataRoomId: true,
            folderId: true,
            dataRoom: { select: { ownerId: true } },
          },
        });
        if (!file) throw new NotFoundException('File not found');
        const folderAncestorIds = file.folderId
          ? await this.getAncestorFolderIds(file.folderId)
          : [];
        return {
          dataRoomId: file.dataRoomId,
          ownerId: file.dataRoom.ownerId,
          folderAncestorIds,
          fileId: file.id,
        };
      }
    }
  }

  /**
   * Walks parentId up to the root, returning the folder itself plus every
   * ancestor. One query per level — fine at typical folder-tree depths; a
   * materialized path or closure table would make this O(1) at large scale
   * (see README "How it scales").
   */
  async getAncestorFolderIds(folderId: string): Promise<string[]> {
    const ids: string[] = [];
    let currentId: string | null = folderId;
    let guard = 0;
    while (currentId && guard < 1000) {
      ids.push(currentId);
      const folder: { parentId: string | null } | null =
        await this.prisma.folder.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });
      currentId = folder?.parentId ?? null;
      guard++;
    }
    return ids;
  }
}
