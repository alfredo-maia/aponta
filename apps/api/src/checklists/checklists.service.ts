import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { AddChecklistItemDto } from './dto/add-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

@Injectable()
export class ChecklistsService {
  constructor(private prisma: PrismaService) {}

  async getChecklists(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    
    return this.prisma.ticketChecklist.findMany({
      where: { ticketId },
      include: { items: { orderBy: { id: 'asc' } } },
      orderBy: { id: 'asc' },
    });
  }

  async createChecklist(ticketId: string, dto: CreateChecklistDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    return this.prisma.ticketChecklist.create({
      data: {
        title: dto.title,
        ticketId,
      },
      include: { items: true },
    });
  }

  async addChecklistItem(ticketId: string, checklistId: string, dto: AddChecklistItemDto) {
    const checklist = await this.prisma.ticketChecklist.findUnique({
      where: { id: checklistId, ticketId },
    });
    if (!checklist) throw new NotFoundException('Checklist not found');

    return this.prisma.ticketChecklistItem.create({
      data: {
        text: dto.text,
        checklistId,
      },
    });
  }

  async updateChecklistItem(ticketId: string, checklistId: string, itemId: string, dto: UpdateChecklistItemDto) {
    const item = await this.prisma.ticketChecklistItem.findUnique({
      where: { id: itemId, checklistId },
      include: { checklist: true },
    });

    if (!item || item.checklist.ticketId !== ticketId) {
      throw new NotFoundException('ChecklistItem not found');
    }

    return this.prisma.ticketChecklistItem.update({
      where: { id: itemId },
      data: dto,
    });
  }

  async deleteChecklistItem(ticketId: string, checklistId: string, itemId: string) {
    const item = await this.prisma.ticketChecklistItem.findUnique({
      where: { id: itemId, checklistId },
      include: { checklist: true },
    });

    if (!item || item.checklist.ticketId !== ticketId) {
      throw new NotFoundException('ChecklistItem not found');
    }

    await this.prisma.ticketChecklistItem.delete({ where: { id: itemId } });
  }

  async deleteChecklist(ticketId: string, checklistId: string) {
    const checklist = await this.prisma.ticketChecklist.findUnique({
      where: { id: checklistId, ticketId },
    });
    
    if (!checklist) throw new NotFoundException('Checklist not found');

    await this.prisma.ticketChecklist.delete({ where: { id: checklistId } });
  }
}
