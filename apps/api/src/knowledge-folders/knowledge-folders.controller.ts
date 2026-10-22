import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { KnowledgeFoldersService } from './knowledge-folders.service';
import { OptionalJwtOrTokenAuthGuard } from '../auth/guards/optional-jwt-or-token-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CreateKnowledgeFolderDto } from './dto/create-knowledge-folder.dto';
import { UpdateKnowledgeFolderDto } from './dto/update-knowledge-folder.dto';

/**
 * Mirrors ArticlesController's guard shape: class-level
 * OptionalJwtOrTokenAuthGuard populates request.user (without ever
 * rejecting) so findAll() stays public for anonymous/CLIENT callers, while
 * PermissionsGuard on the write handlers can actually see a user to check.
 * Without this class-level guard, request.user is never set and
 * PermissionsGuard rejects every caller — including a legitimate ADMIN
 * with a valid JWT (ADMIN's bypass still needs request.user.role present).
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
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_KNOWLEDGE_BASE')
  create(@Body() dto: CreateKnowledgeFolderDto) {
    return this.knowledgeFoldersService.create(dto);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_KNOWLEDGE_BASE')
  update(@Param('id') id: string, @Body() dto: UpdateKnowledgeFolderDto) {
    return this.knowledgeFoldersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_KNOWLEDGE_BASE')
  remove(@Param('id') id: string) {
    return this.knowledgeFoldersService.remove(id);
  }
}
