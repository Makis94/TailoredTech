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
import { DataRoomsService } from './data-rooms.service';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { UpdateNameDto } from '../common/dto/update-name.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { ShareableRead } from '../common/decorators/shareable-read.decorator';

@Controller('data-rooms')
export class DataRoomsController {
  constructor(private readonly dataRooms: DataRoomsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDataRoomDto,
  ) {
    return this.dataRooms.create(user, dto);
  }

  @Get()
  listOwned(@CurrentUser() user: AuthenticatedUser) {
    return this.dataRooms.listOwned(user);
  }

  @ShareableRead()
  @Get(':id')
  getDetail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('shareToken') shareToken?: string,
  ) {
    return this.dataRooms.getDetail({ user, shareToken }, id);
  }

  @ShareableRead()
  @Get(':id/contents')
  getContents(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('shareToken') shareToken?: string,
  ) {
    return this.dataRooms.getContents({ user, shareToken }, id, pagination);
  }

  @ShareableRead()
  @Get(':id/search')
  search(
    @Param('id') id: string,
    @Query('q') q: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('shareToken') shareToken?: string,
  ) {
    return this.dataRooms.search({ user, shareToken }, id, q ?? '');
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateNameDto,
  ) {
    return this.dataRooms.rename(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.dataRooms.remove(user, id);
  }
}
