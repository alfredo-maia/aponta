import { 
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards 
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { AddChecklistItemDto } from './dto/add-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('tickets/:ticketId/checklists')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENT, Role.AGENT_MASTER, Role.ADMIN)
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Get()
  async getChecklists(@Param('ticketId') ticketId: string) {
    return this.checklistsService.getChecklists(ticketId);
  }

  @Post()
  async createChecklist(
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateChecklistDto,
  ) {
    return this.checklistsService.createChecklist(ticketId, dto);
  }

  @Post(':checklistId/items')
  async addChecklistItem(
    @Param('ticketId') ticketId: string,
    @Param('checklistId') checklistId: string,
    @Body() dto: AddChecklistItemDto,
  ) {
    return this.checklistsService.addChecklistItem(ticketId, checklistId, dto);
  }

  @Patch(':checklistId/items/:itemId')
  async updateChecklistItem(
    @Param('ticketId') ticketId: string,
    @Param('checklistId') checklistId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.checklistsService.updateChecklistItem(ticketId, checklistId, itemId, dto);
  }

  @Delete(':checklistId/items/:itemId')
  async deleteChecklistItem(
    @Param('ticketId') ticketId: string,
    @Param('checklistId') checklistId: string,
    @Param('itemId') itemId: string,
  ) {
    await this.checklistsService.deleteChecklistItem(ticketId, checklistId, itemId);
    return { success: true };
  }

  @Delete(':checklistId')
  async deleteChecklist(
    @Param('ticketId') ticketId: string,
    @Param('checklistId') checklistId: string,
  ) {
    await this.checklistsService.deleteChecklist(ticketId, checklistId);
    return { success: true };
  }
}
