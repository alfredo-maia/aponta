import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { KnowledgeFoldersService } from './knowledge-folders.service';
import { OptionalJwtOrTokenAuthGuard } from '../auth/guards/optional-jwt-or-token-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateKnowledgeFolderDto } from './dto/create-knowledge-folder.dto';
import { UpdateKnowledgeFolderDto } from './dto/update-knowledge-folder.dto';

/**
 * Mirrors ArticlesController's guard shape: class-level
 * OptionalJwtOrTokenAuthGuard populates request.user (without ever
 * rejecting) so findAll() stays public for anonymous/CLIENT callers, while
 * RolesGuard on the write handlers can actually see a role to check.
 * Without this class-level guard, request.user is never set and RolesGuard
 * rejects every caller — including a legitimate ADMIN with a valid JWT.
 */
@UseGuards(OptionalJwtOrTokenAuthGuard)
@Controller('knowledge-folders')
export class KnowledgeFoldersController {
  constructor(private readonly knowledgeFoldersService: KnowledgeFoldersService) {}

  @Get()
  findAll() {
    return this.knowledgeFoldersService.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT, Role.AGENT_MASTER, Role.ADMIN)
  create(@Body() dto: CreateKnowledgeFolderDto) {
    return this.knowledgeFoldersService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT, Role.AGENT_MASTER, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateKnowledgeFolderDto) {
    return this.knowledgeFoldersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT, Role.AGENT_MASTER, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.knowledgeFoldersService.remove(id);
  }
}
