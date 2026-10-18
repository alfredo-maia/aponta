import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

@Injectable()
export class CostRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: CurrentUserPayload) {
    this.requireAdmin(user);
    return this.prisma.technicianCostRate.findMany({
      orderBy: [{ userId: 'asc' }, { effectiveFrom: 'desc' }],
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async create(dto: { userId: string; effectiveFrom: string; hourlyCostCents: number }, user: CurrentUserPayload) {
    this.requireAdmin(user);
    const effectiveFrom = new Date(dto.effectiveFrom);
    if (!dto.userId || !Number.isFinite(effectiveFrom.getTime()) || !Number.isInteger(dto.hourlyCostCents) || dto.hourlyCostCents < 0 || dto.hourlyCostCents > 2147483647) {
      throw new BadRequestException('Técnico, vigência e custo inteiro em centavos são obrigatórios');
    }
    return this.prisma.$transaction(async tx => {
      // Worklog creation locks the same author row before reading costs. This
      // serializes appending a cost term with snapshots recorded concurrently.
      await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${dto.userId} FOR UPDATE`;
      const technician = await tx.user.findUnique({ where: { id: dto.userId }, select: { id: true, role: true } });
      if (!technician || !([Role.ADMIN, Role.AGENT, Role.AGENT_MASTER] as Role[]).includes(technician.role)) {
        throw new BadRequestException('Custo permitido somente para técnicos');
      }
      const latest = await tx.technicianCostRate.findFirst({ where: { userId: dto.userId }, orderBy: { effectiveFrom: 'desc' } });
      const lastWorklog = await tx.worklog.findFirst({ where: { authorId: dto.userId }, orderBy: { endTime: 'desc' }, select: { endTime: true } });
      if ((latest && effectiveFrom <= latest.effectiveFrom) || (lastWorklog && effectiveFrom <= lastWorklog.endTime)) {
        throw new BadRequestException('Nova vigência deve ser posterior ao último custo e ao fim de todos os apontamentos registrados');
      }
      return tx.technicianCostRate.create({
        data: { userId: dto.userId, effectiveFrom, hourlyCostCents: dto.hourlyCostCents, createdBy: user.id },
        include: { user: { select: { id: true, name: true } } },
      });
    });
  }

  private requireAdmin(user: CurrentUserPayload) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Custos individuais são restritos ao administrador');
  }
}
