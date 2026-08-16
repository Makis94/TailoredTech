import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ShareResourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../access/access.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { normalizeEmail } from '../auth/auth.service';
import { CreateShareDto } from './dto/create-share.dto';
import { AddGrantDto } from './dto/add-grant.dto';

const GRANT_INCLUDE = { grants: { orderBy: { createdAt: 'asc' as const } } };

@Injectable()
export class SharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly config: ConfigService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateShareDto) {
    await this.access.assertOwner(user, dto.resourceType, dto.resourceId);

    const targetField = this.targetField(dto.resourceType);
    const share = await this.prisma.$transaction(async (tx) => {
      const created = await tx.share.create({
        data: {
          resourceType: dto.resourceType,
          mode: dto.mode,
          createdById: user.id,
          [targetField]: dto.resourceId,
        } as Prisma.ShareUncheckedCreateInput,
      });

      if (dto.mode === 'PERMISSIONED' && dto.emails?.length) {
        const emails = [...new Set(dto.emails.map(normalizeEmail))];
        const matchingUsers = await tx.user.findMany({
          where: { email: { in: emails } },
        });
        const userByEmail = new Map(matchingUsers.map((u) => [u.email, u.id]));

        await tx.shareGrant.createMany({
          data: emails.map((email) => ({
            shareId: created.id,
            email,
            userId: userByEmail.get(email) ?? null,
          })),
        });
      }

      return tx.share.findUniqueOrThrow({
        where: { id: created.id },
        include: GRANT_INCLUDE,
      });
    });

    return this.toResponse(share);
  }

  async listForResource(
    user: AuthenticatedUser,
    resourceType: ShareResourceType,
    resourceId: string,
  ) {
    await this.access.assertOwner(user, resourceType, resourceId);
    const field = this.targetField(resourceType);

    const shares = await this.prisma.share.findMany({
      where: { resourceType, [field]: resourceId } as Prisma.ShareWhereInput,
      include: GRANT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return shares.map((s) => this.toResponse(s));
  }

  async revoke(user: AuthenticatedUser, shareId: string) {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
    });
    if (!share) throw new NotFoundException('Share not found');
    if (share.createdById !== user.id)
      throw new ForbiddenException('You do not own this share');

    return this.prisma.share.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    });
  }

  async addGrant(user: AuthenticatedUser, shareId: string, dto: AddGrantDto) {
    const share = await this.getOwnedActiveShare(user, shareId);
    if (share.mode !== 'PERMISSIONED') {
      throw new ConflictException(
        'Only permissioned shares can have individual grants',
      );
    }

    const email = normalizeEmail(dto.email);
    const existing = await this.prisma.shareGrant.findUnique({
      where: { shareId_email: { shareId, email } },
    });
    if (existing) throw new ConflictException(`${email} already has access`);

    const matchingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    await this.prisma.shareGrant.create({
      data: { shareId, email, userId: matchingUser?.id ?? null },
    });

    const updated = await this.prisma.share.findUniqueOrThrow({
      where: { id: shareId },
      include: GRANT_INCLUDE,
    });
    return this.toResponse(updated);
  }

  async removeGrant(user: AuthenticatedUser, shareId: string, grantId: string) {
    await this.getOwnedActiveShare(user, shareId);
    await this.prisma.shareGrant.deleteMany({
      where: { id: grantId, shareId },
    });
  }

  /** Public: resolves a share token to what it points at, without checking who's asking (used to bootstrap the anonymous "shared with you" viewer page). */
  async resolveByToken(token: string) {
    const share = await this.prisma.share.findUnique({
      where: { token },
      include: { dataRoom: true, folder: true, file: true },
    });
    if (!share || share.revokedAt)
      throw new NotFoundException(
        'This share link is invalid or has been revoked',
      );

    const resource = share.dataRoom ?? share.folder ?? share.file;
    if (!resource)
      throw new NotFoundException(
        'This share link is invalid or has been revoked',
      );

    return {
      token: share.token,
      mode: share.mode,
      resourceType: share.resourceType,
      resourceId: resource.id,
      dataRoomId:
        share.dataRoomId ?? share.folder?.dataRoomId ?? share.file?.dataRoomId,
      name: resource.name,
    };
  }

  async listSharedWithMe(user: AuthenticatedUser) {
    const email = normalizeEmail(user.email);
    const grants = await this.prisma.shareGrant.findMany({
      where: {
        OR: [{ userId: user.id }, { email }],
        share: { revokedAt: null, mode: 'PERMISSIONED' },
      },
      include: {
        share: {
          include: {
            dataRoom: true,
            folder: {
              include: { dataRoom: { select: { id: true, name: true } } },
            },
            file: {
              include: { dataRoom: { select: { id: true, name: true } } },
            },
            createdBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return grants.map(({ share }) => {
      const resource = share.dataRoom ?? share.folder ?? share.file;
      return {
        shareId: share.id,
        resourceType: share.resourceType,
        resourceId: resource!.id,
        name: resource!.name,
        dataRoomId:
          share.dataRoomId ??
          share.folder?.dataRoomId ??
          share.file?.dataRoomId,
        dataRoomName:
          share.dataRoom?.name ??
          share.folder?.dataRoom.name ??
          share.file?.dataRoom.name,
        sharedBy: share.createdBy,
        sharedAt: share.createdAt,
      };
    });
  }

  private async getOwnedActiveShare(user: AuthenticatedUser, shareId: string) {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
    });
    if (!share) throw new NotFoundException('Share not found');
    if (share.createdById !== user.id)
      throw new ForbiddenException('You do not own this share');
    if (share.revokedAt)
      throw new ConflictException('This share has already been revoked');
    return share;
  }

  private targetField(
    resourceType: ShareResourceType,
  ): 'dataRoomId' | 'folderId' | 'fileId' {
    switch (resourceType) {
      case 'DATA_ROOM':
        return 'dataRoomId';
      case 'FOLDER':
        return 'folderId';
      case 'FILE':
        return 'fileId';
    }
  }

  private toResponse(
    share: Prisma.ShareGetPayload<{ include: typeof GRANT_INCLUDE }>,
  ) {
    const isPublic = share.mode === 'PUBLIC' && !share.revokedAt;
    return {
      id: share.id,
      resourceType: share.resourceType,
      mode: share.mode,
      createdAt: share.createdAt,
      revokedAt: share.revokedAt,
      shareUrl: isPublic
        ? `${this.config.get('FRONTEND_URL')}/shared/${share.token}`
        : null,
      grants: share.grants.map((g) => ({
        id: g.id,
        email: g.email,
        userId: g.userId,
        createdAt: g.createdAt,
      })),
    };
  }
}
