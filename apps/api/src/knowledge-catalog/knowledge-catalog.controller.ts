import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { KnowledgeCatalogService } from './knowledge-catalog.service';
import { OptionalJwtOrTokenAuthGuard } from '../auth/guards/optional-jwt-or-token-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateKnowledgeCatalogItemDto } from './dto/create-knowledge-catalog-item.dto';
import { UpdateKnowledgeCatalogItemDto } from './dto/update-knowledge-catalog-item.dto';
import { KnowledgeCatalogQueryDto } from './dto/knowledge-catalog-query.dto';

/**
 * Mirrors ArticlesController/KnowledgeFoldersController's guard shape:
 * class-level OptionalJwtOrTokenAuthGuard populates request.user (without
 * ever rejecting) so findAll()/findOne() stay public for anonymous/CLIENT
 * callers browsing the catalog, while RolesGuard on the write handlers can
 * actually see a role to check.
 */
@UseGuards(OptionalJwtOrTokenAuthGuard)
@Controller('service-catalog-items')
export class KnowledgeCatalogController {
  constructor(private readonly knowledgeCatalogService: KnowledgeCatalogService) {}

  @Get()
  findAll(@Query() query: KnowledgeCatalogQueryDto) {
    return this.knowledgeCatalogService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.knowledgeCatalogService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT, Role.AGENT_MASTER, Role.ADMIN)
  create(@Body() dto: CreateKnowledgeCatalogItemDto) {
    return this.knowledgeCatalogService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT, Role.AGENT_MASTER, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateKnowledgeCatalogItemDto) {
    return this.knowledgeCatalogService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.knowledgeCatalogService.remove(id);
  }
}
