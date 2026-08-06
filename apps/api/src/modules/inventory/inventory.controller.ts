import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser as CurrentUserDecorator } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';
import {
  CreateInventoryItemDto,
  InventoryItemDto,
  InventoryItemListDto,
  InventoryOptionsDto,
  UpdateInventoryItemDto,
  UploadInventoryImageDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';
import type { InventoryImageFile } from './inventory.service';

const safeDispositionFilename = (filename: string) =>
  filename.replace(/[\r\n"]/g, '_');

const CACHE_CONTROL = 'private, max-age=300';

const etagMatches = (ifNoneMatch: string | undefined, etag: string) =>
  ifNoneMatch
    ?.split(',')
    .map((value) => value.trim())
    .some((value) => value === etag || value === '*') ?? false;

@ApiTags('inventory')
@UseGuards(AuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('options')
  @ApiOkResponse({ type: InventoryOptionsDto })
  getOptions() {
    return this.inventoryService.getOptions();
  }

  @Get('items')
  @ApiOkResponse({ type: InventoryItemListDto })
  listItems(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('subcategory') subcategory?: string,
    @Query('owner') owner?: string,
    @Query('locationDescription') locationDescription?: string,
    @Query('condition') condition?: string,
    @Query('consumable') consumable?: string,
    @Query('sort') sort?: string,
    @Query('direction') direction?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.inventoryService.listItems({
      search,
      category,
      subcategory,
      owner,
      locationDescription,
      condition,
      consumable,
      sort,
      direction,
      page,
      pageSize,
    });
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Moderator)
  @Post('items')
  @ApiOkResponse({ type: InventoryItemDto })
  createItem(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Body() body: CreateInventoryItemDto,
  ) {
    return this.inventoryService.createItem(user, body);
  }

  @Get('items/:id')
  @ApiOkResponse({ type: InventoryItemDto })
  getItem(@Param('id', ParseIntPipe) itemId: number) {
    return this.inventoryService.getItem(itemId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Moderator)
  @Patch('items/:id')
  @ApiOkResponse({ type: InventoryItemDto })
  updateItem(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) itemId: number,
    @Body() body: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.updateItem(user, itemId, body);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Moderator)
  @Delete('items/:id')
  deleteItem(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) itemId: number,
  ) {
    return this.inventoryService.deleteItem(user, itemId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Moderator)
  @Post('items/:id/image')
  @ApiOkResponse({ type: InventoryItemDto })
  uploadImage(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) itemId: number,
    @Body() body: UploadInventoryImageDto,
  ) {
    return this.inventoryService.uploadImage(user, itemId, body);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Moderator)
  @Delete('items/:id/image')
  @ApiOkResponse({ type: InventoryItemDto })
  removeImage(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) itemId: number,
  ) {
    return this.inventoryService.removeImage(user, itemId);
  }

  @Get('items/:id/image')
  async getImage(
    @Param('id', ParseIntPipe) itemId: number,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res() response: Response,
  ) {
    const file = await this.inventoryService.getImageFile(itemId);
    return this.sendImage(response, file, ifNoneMatch);
  }

  @Get('items/:id/image/thumbnail')
  async getThumbnail(
    @Param('id', ParseIntPipe) itemId: number,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res() response: Response,
  ) {
    const file = await this.inventoryService.getThumbnailFile(itemId);
    return this.sendImage(response, file, ifNoneMatch);
  }

  private sendImage(
    response: Response,
    file: InventoryImageFile,
    ifNoneMatch: string | undefined,
  ) {
    const etag = `"${file.checksumSha256}"`;
    response.setHeader('Cache-Control', CACHE_CONTROL);
    response.setHeader('ETag', etag);
    if (etagMatches(ifNoneMatch, etag)) {
      return response.status(304).end();
    }

    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', file.fileSize);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${safeDispositionFilename(file.originalFilename)}"`,
    );
    return response.send(file.fileData);
  }
}
