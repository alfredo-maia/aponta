import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { KnowledgeCatalogService } from './knowledge-catalog.service';
import { OptionalJwtOrTokenAuthGuard } from '../auth/guards/optional-jwt-or-token-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CreateKnowledgeCatalogItemDto } from './dto/create-knowledge-catalog-item.dto';
import { UpdateKnowledgeCatalogItemDto } from './dto/update-knowledge-catalog-item.dto';
import { KnowledgeCatalogQueryDto } from './dto/knowledge-catalog-query.dto';

/**
 * Mirrors ArticlesController/KnowledgeFoldersController's guard shape:
 * class-level OptionalJwtOrTokenAuthGuard populates request.user (without
 * ever rejecting) so findAll()/findOne() stay public for anonymous/CLIENT
 * callers browsing the catalog, while PermissionsGuard on the write
 * handlers can actually see a user to check.
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
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_CATALOGS')
  create(@Body() dto: CreateKnowledgeCatalogItemDto) {
    return this.knowledgeCatalogService.create(dto);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_CATALOGS')
  update(@Param('id') id: string, @Body() dto: UpdateKnowledgeCatalogItemDto) {
    return this.knowledgeCatalogService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_CATALOGS')
  remove(@Param('id') id: string) {
    return this.knowledgeCatalogService.remove(id);
  }
}
