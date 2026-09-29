import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDeskDto } from './dto/create-service-desk.dto';
import { UpdateServiceDeskDto } from './dto/update-service-desk.dto';

@Injectable()
export class ServiceDesksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createServiceDeskDto: CreateServiceDeskDto) {
    return this.prisma.serviceDesk.create({
      data: createServiceDeskDto,
    });
  }

  async findAll() {
    return this.prisma.serviceDesk.findMany();
  }

  async findOne(id: string) {
    const serviceDesk = await this.prisma.serviceDesk.findUnique({
      where: { id },
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
    return this.prisma.serviceDesk.update({
      where: { id },
      data: updateServiceDeskDto,
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
}
