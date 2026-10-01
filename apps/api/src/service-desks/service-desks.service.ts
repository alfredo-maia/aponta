import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDeskDto } from './dto/create-service-desk.dto';
import { UpdateServiceDeskDto } from './dto/update-service-desk.dto';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';
import { HolidaysImportService } from './holidays-import.service';

@Injectable()
export class ServiceDesksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly holidaysImportService: HolidaysImportService,
  ) {}

  async create(createServiceDeskDto: CreateServiceDeskDto) {
    const { agentIds, ...data } = createServiceDeskDto;
    return this.prisma.serviceDesk.create({
      data: {
        ...data,
        ...(agentIds && { agents: { connect: agentIds.map(id => ({ id })) } }),
      },
      include: { agents: { select: { id: true, name: true, email: true } } },
    });
  }

  async findAll() {
    return this.prisma.serviceDesk.findMany({
      include: { agents: { select: { id: true, name: true, email: true } } },
    });
  }

  async findOne(id: string) {
    const serviceDesk = await this.prisma.serviceDesk.findUnique({
      where: { id },
      include: { agents: { select: { id: true, name: true, email: true } } },
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

    const { agentIds, ...data } = updateServiceDeskDto;
    return this.prisma.serviceDesk.update({
      where: { id },
      data: {
        ...data,
        ...(agentIds !== undefined && { agents: { set: agentIds.map(id => ({ id })) } }),
      },
      include: { agents: { select: { id: true, name: true, email: true } } },
    });
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
