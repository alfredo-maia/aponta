import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // Public/All users endpoint to see the active catalog
  @Get()
  async getActiveCatalog() {
    return this.catalogService.findAllCategories(true, true);
  }

  // --- ADMIN endpoints below ---
  @Get('admin/categories')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_CATALOGS')
  async getAllCategories() {
    return this.catalogService.findAllCategories(true, false);
  }

  @Post('admin/categories')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_CATALOGS')
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Patch('admin/categories/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_CATALOGS')
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.catalogService.updateCategory(id, dto);
  }

  @Delete('admin/categories/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_CATALOGS')
  async deleteCategory(@Param('id') id: string) {
    await this.catalogService.deleteCategory(id);
    return { success: true };
  }

  @Post('admin/items')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_CATALOGS')
  async createItem(@Body() dto: CreateCatalogItemDto) {
    return this.catalogService.createItem(dto);
  }

  @Patch('admin/items/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_CATALOGS')
  async updateItem(@Param('id') id: string, @Body() dto: UpdateCatalogItemDto) {
    return this.catalogService.updateItem(id, dto);
  }

  @Delete('admin/items/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_SERVICE_CATALOGS')
  async deleteItem(@Param('id') id: string) {
    await this.catalogService.deleteItem(id);
    return { success: true };
  }
}
