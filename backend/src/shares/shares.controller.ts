import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { SharesService } from './shares.service';
import { CreateShareDto } from './dto/create-share.dto';
import { AddGrantDto } from './dto/add-grant.dto';
import { ListSharesQueryDto } from './dto/list-shares-query.dto';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller()
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  @Post('shares')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateShareDto) {
    return this.shares.create(user, dto);
  }

  @Get('shares')
  listForResource(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSharesQueryDto,
  ) {
    return this.shares.listForResource(
      user,
      query.resourceType,
      query.resourceId,
    );
  }

  @Delete('shares/:id')
  revoke(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shares.revoke(user, id);
  }

  @Post('shares/:id/grants')
  addGrant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddGrantDto,
  ) {
    return this.shares.addGrant(user, id, dto);
  }

  @Delete('shares/:id/grants/:grantId')
  removeGrant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('grantId') grantId: string,
  ) {
    return this.shares.removeGrant(user, id, grantId);
  }

  @Public()
  @Get('shares/by-token/:token')
  resolveByToken(@Param('token') token: string) {
    return this.shares.resolveByToken(token);
  }

  @Get('shared-with-me')
  listSharedWithMe(@CurrentUser() user: AuthenticatedUser) {
    return this.shares.listSharedWithMe(user);
  }
}
