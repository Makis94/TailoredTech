import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateNameDto } from '../common/dto/update-name.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { ShareableRead } from '../common/decorators/shareable-read.decorator';

@Controller('folders')
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFolderDto) {
    return this.folders.create(user, dto);
  }

  @ShareableRead()
  @Get(':id')
  getDetail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('shareToken') shareToken?: string,
  ) {
    return this.folders.getDetail({ user, shareToken }, id);
  }

  @ShareableRead()
  @Get(':id/contents')
  getContents(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('shareToken') shareToken?: string,
  ) {
    return this.folders.getContents({ user, shareToken }, id, pagination);
  }

  @ShareableRead()
  @Get(':id/stats')
  getStats(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('shareToken') shareToken?: string,
  ) {
    return this.folders.getStats({ user, shareToken }, id);
  }

  @ShareableRead()
  @Get(':id/search')
  search(
    @Param('id') id: string,
    @Query('q') q: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('shareToken') shareToken?: string,
  ) {
    return this.folders.search({ user, shareToken }, id, q ?? '');
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateNameDto,
  ) {
    return this.folders.rename(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.folders.remove(user, id);
  }
}
