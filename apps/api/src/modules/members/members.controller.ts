import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUser as Actor } from '../users/users.types';
import { MembersService } from './members.service';
import { MemberOrgoService } from './orgo.service';

@Controller('members')
@UseGuards(AuthGuard)
export class MembersController {
  constructor(
    private readonly members: MembersService,
    private readonly orgo: MemberOrgoService,
  ) {}
  @Get() @Header('Cache-Control', 'private, no-store') list(
    @CurrentUser() u: Actor,
  ) {
    return this.members.dashboard(u);
  }
  @Get('orgo') @Header('Cache-Control', 'private, no-store') orgoStatus(
    @CurrentUser() u: Actor,
  ) {
    return this.orgo.discover(u);
  }
  @Post('orgo/import') import(@CurrentUser() u: Actor, @Body() b: unknown) {
    return this.orgo.import(u, b);
  }
  @Post('orgo/retry/:id') retry(
    @CurrentUser() u: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.orgo.retry(u, id, b);
  }
  @Post('progression') settings(@CurrentUser() u: Actor, @Body() b: unknown) {
    return this.members.progressionSettings(u, b);
  }
  @Post('units') unit(@CurrentUser() u: Actor, @Body() b: unknown) {
    return this.members.createUnit(u, b);
  }
  @Post('units/:id/archive') archive(
    @CurrentUser() u: Actor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.members.archiveUnit(u, id);
  }
  @Post() create(@CurrentUser() u: Actor, @Body() b: unknown) {
    return this.members.createMember(u, b);
  }
  @Get(':id') @Header('Cache-Control', 'private, no-store') detail(
    @CurrentUser() u: Actor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.members.detail(u, id);
  }
  @Post(':id') update(
    @CurrentUser() u: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.members.updateMember(u, id, b);
  }
  @Post(':id/orgo-link') link(
    @CurrentUser() u: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.orgo.link(u, id, b);
  }
  @Post(':id/notes') note(
    @CurrentUser() u: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.members.note(u, id, b);
  }
  @Post(':id/transfer') transfer(
    @CurrentUser() u: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.members.transfer(u, id, b);
  }
  @Post(':id/lifecycle') lifecycle(
    @CurrentUser() u: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.members.lifecycle(u, id, b);
  }
  @Post(':id/assignments') assignment(
    @CurrentUser() u: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.members.assignment(u, id, b);
  }
  @Post(':id/assignments/:assignmentId/end') end(
    @CurrentUser() u: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.members.endAssignment(u, id, assignmentId);
  }
}
