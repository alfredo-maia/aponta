import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDeskDto } from './dto/create-service-desk.dto';
import { UpdateServiceDeskDto } from './dto/update-service-desk.dto';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';
import { HolidaysImportService } from './holidays-import.service';
import { DEFAULT_DESK_PRIORITIES, DEFAULT_DESK_SECTIONS, DESK_INCLUDE } from './desk-defaults';
import { TenantHelper } from '../core/security/tenant.helper';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

@Injectable()
export class ServiceDesksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly holidaysImportService: HolidaysImportService,
  ) {}

  async create(createServiceDeskDto: CreateServiceDeskDto) {
    const {
      agentIds,
      organizationIds,
      agentGroupIds,
      priorities: _priorities,
      ticketSections: _ticketSections,
      ...data
    } = createServiceDeskDto;
    return this.prisma.serviceDesk.create({
      data: {
        ...data,
        ...(agentIds && { agents: { connect: agentIds.map((id) => ({ id })) } }),
        ...(organizationIds && {
          organizations: { connect: organizationIds.map((id) => ({ id })) },
        }),
        ...(agentGroupIds && {
          agentGroups: { connect: agentGroupIds.map((id) => ({ id })) },
        }),
        priorities: { create: DEFAULT_DESK_PRIORITIES },
        ticketSections: { create: DEFAULT_DESK_SECTIONS },
      },
      include: DESK_INCLUDE,
    });
  }

  async findAll(user: CurrentUserPayload) {
    return this.prisma.serviceDesk.findMany({
      where: TenantHelper.getServiceDeskWhere(user),
      include: DESK_INCLUDE,
    });
  }

  async findOne(id: string) {
    const serviceDesk = await this.prisma.serviceDesk.findUnique({
      where: { id },
      include: DESK_INCLUDE,
    });
    if (!serviceDesk) {
      throw new NotFoundException(`ServiceDesk with ID ${id} not found`);
    }
    return serviceDesk;
  }

  async update(id: string, updateServiceDeskDto: UpdateServiceDeskDto) {
    const serviceDesk = await this.prisma.serviceDesk.findUnique({
      where: { id },
    });
    if (!serviceDesk) {
      throw new NotFoundException(`ServiceDesk with ID ${id} not found`);
    }

    const {
      agentIds,
      organizationIds,
      agentGroupIds,
      priorities,
      ticketSections,
      ...data
    } = updateServiceDeskDto;
    await this.prisma.serviceDesk.update({
      where: { id },
      data: {
        ...data,
        ...(agentIds !== undefined && {
          agents: { set: agentIds.map((agentId) => ({ id: agentId })) },
        }),
        ...(organizationIds !== undefined && {
          organizations: { set: organizationIds.map((orgId) => ({ id: orgId })) },
        }),
        ...(agentGroupIds !== undefined && {
          agentGroups: { set: agentGroupIds.map((groupId) => ({ id: groupId })) },
        }),
      },
    });

    if (priorities) {
      await Promise.all(
        priorities.map((priority) =>
          this.prisma.serviceDeskPriority.updateMany({
            where: { serviceDeskId: id, ticketPriority: priority.ticketPriority },
            data: {
              enabled: priority.enabled,
              ...(priority.label !== undefined && { label: priority.label }),
              ...(priority.icon !== undefined && { icon: priority.icon }),
              ...(priority.sortOrder !== undefined && { sortOrder: priority.sortOrder }),
            },
          }),
        ),
      );
    }
    if (ticketSections) {
      await Promise.all(
        ticketSections.map((section) =>
          this.prisma.serviceDeskTicketSection.updateMany({
            where: { serviceDeskId: id, key: section.key },
            data: {
              enabled: section.enabled,
              ...(section.sortOrder !== undefined && { sortOrder: section.sortOrder }),
            },
          }),
        ),
      );
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const serviceDesk = await this.prisma.serviceDesk.findUnique({
      where: { id },
    });
    if (!serviceDesk) {
      throw new NotFoundException(`ServiceDesk with ID ${id} not found`);
    }
    return this.prisma.serviceDesk.delete({
      where: { id },
    });
  }

  async getBusinessHours(serviceDeskId: string) {
    const serviceDesk = await this.prisma.serviceDesk.findUnique({
      where: { id: serviceDeskId },
    });
    if (!serviceDesk) {
      throw new NotFoundException(
        `ServiceDesk with ID ${serviceDeskId} not found`,
      );
    }

    const [businessHours, holidays] = await Promise.all([
      this.prisma.businessHour.findMany({ where: { serviceDeskId } }),
      this.prisma.holiday.findMany({ where: { serviceDeskId } }),
    ]);

    return { businessHours, holidays };
  }

  async updateBusinessHours(
    serviceDeskId: string,
    dto: UpdateBusinessHoursDto,
  ) {
    const serviceDesk = await this.prisma.serviceDesk.findUnique({
      where: { id: serviceDeskId },
    });
    if (!serviceDesk) {
      throw new NotFoundException(
        `ServiceDesk with ID ${serviceDeskId} not found`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.businessHour.deleteMany({ where: { serviceDeskId } }),
      this.prisma.holiday.deleteMany({ where: { serviceDeskId } }),
      this.prisma.businessHour.createMany({
        data: dto.businessHours.map((bh) => ({ ...bh, serviceDeskId })),
      }),
      this.prisma.holiday.createMany({
        data: dto.holidays.map((h) => ({
          name: h.name,
          date: new Date(h.date),
          serviceDeskId,
        })),
      }),
    ]);

    return this.getBusinessHours(serviceDeskId);
  }

  importNationalHolidays(year: number) {
    return this.holidaysImportService.fetchNationalHolidays(year);
  }
}
