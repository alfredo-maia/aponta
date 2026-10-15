import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
const STAGE_LIST_INCLUDE = {
  transitionsFrom: { select: { toStageId: true } },
} as const;

@Injectable()
export class TicketStagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(serviceDeskId: string) {
    await this.requireDesk(serviceDeskId);
    const stages = await this.prisma.ticketStage.findMany({
      where: { serviceDeskId },
      orderBy: { position: 'asc' },
      include: STAGE_LIST_INCLUDE,
    });
    return stages.map(this.toDto);
  }

  async create(serviceDeskId: string, name: string) {
    await this.requireDesk(serviceDeskId);
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Nome do estágio é obrigatório');
    }
    const stages = await this.prisma.ticketStage.findMany({
      where: { serviceDeskId },
      orderBy: { position: 'asc' },
    });
    const finalStage = stages.find((stage) => stage.isFinal);
    const insertAt = finalStage ? finalStage.position : stages.length;

    const created = await this.prisma.$transaction(async (tx) => {
      if (finalStage) {
        await tx.ticketStage.update({
          where: { id: finalStage.id },
          data: { position: insertAt + 1 },
        });
      }
      return tx.ticketStage.create({
        data: {
          serviceDeskId,
          name: trimmed,
          position: insertAt,
          isInitial: false,
          isFinal: false,
        },
        include: STAGE_LIST_INCLUDE,
      });
    });
    return this.toDto(created);
  }

  async update(
    serviceDeskId: string,
    stageId: string,
    patch: { name?: string; transitionToIds?: string[] },
  ) {
    const stage = await this.requireStage(serviceDeskId, stageId);
    const data: { name?: string } = {};
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim();
      if (!trimmed) {
        throw new BadRequestException('Nome do estágio é obrigatório');
      }
      data.name = trimmed;
    }

    if (patch.transitionToIds) {
      const uniqueIds = [...new Set(patch.transitionToIds)];
      if (uniqueIds.includes(stageId)) {
        throw new BadRequestException('Estágio não pode transicionar para si mesmo');
      }
      const targets = await this.prisma.ticketStage.findMany({
        where: { id: { in: uniqueIds }, serviceDeskId },
        select: { id: true },
      });
      if (targets.length !== uniqueIds.length) {
        throw new BadRequestException('Transição aponta para estágio de outra mesa');
      }
      await this.prisma.$transaction([
        this.prisma.ticketStage.update({
          where: { id: stage.id },
          data,
        }),
        this.prisma.ticketStageTransition.deleteMany({
          where: { fromStageId: stage.id },
        }),
        this.prisma.ticketStageTransition.createMany({
          data: uniqueIds.map((toStageId) => ({
            fromStageId: stage.id,
            toStageId,
          })),
        }),
      ]);
    } else if (Object.keys(data).length > 0) {
      await this.prisma.ticketStage.update({
        where: { id: stage.id },
        data,
      });
    }

    const updated = await this.prisma.ticketStage.findUniqueOrThrow({
      where: { id: stage.id },
      include: STAGE_LIST_INCLUDE,
    });
    return this.toDto(updated);
  }

  async reorder(serviceDeskId: string, ids: string[]) {
    const stages = await this.prisma.ticketStage.findMany({
      where: { serviceDeskId },
      orderBy: { position: 'asc' },
    });
    if (stages.length === 0) {
      throw new NotFoundException('Mesa sem estágios');
    }
    const currentIds = stages.map((stage) => stage.id);
    if (ids.length !== currentIds.length || new Set(ids).size !== ids.length) {
      throw new BadRequestException('Lista de reordenação inválida');
    }
    if ([...ids].sort().join() !== [...currentIds].sort().join()) {
      throw new BadRequestException('Lista de reordenação inválida');
    }
    const byId = new Map(stages.map((stage) => [stage.id, stage]));
    const first = byId.get(ids[0]);
    const last = byId.get(ids[ids.length - 1]);
    if (!first?.isInitial || !last?.isFinal) {
      throw new BadRequestException('Estágio inicial e final não podem ser movidos');
    }
    await this.prisma.$transaction(
      ids.map((id, position) =>
        this.prisma.ticketStage.update({
          where: { id },
          data: { position },
        }),
      ),
    );
    return this.list(serviceDeskId);
  }

  async remove(serviceDeskId: string, stageId: string) {
    const stage = await this.requireStage(serviceDeskId, stageId);
    if (stage.isInitial || stage.isFinal) {
      throw new BadRequestException('Estágio inicial e final não podem ser excluídos');
    }
    const inUse = await this.prisma.ticket.count({ where: { stageId } });
    if (inUse > 0) {
      throw new BadRequestException('Estágio em uso não pode ser excluído');
    }
    await this.prisma.ticketStage.delete({ where: { id: stageId } });
    const remaining = await this.prisma.ticketStage.findMany({
      where: { serviceDeskId },
      orderBy: { position: 'asc' },
    });
    await this.prisma.$transaction(
      remaining.map((item, position) =>
        this.prisma.ticketStage.update({
          where: { id: item.id },
          data: { position },
        }),
      ),
    );
    return { id: stageId };
  }

  private async requireDesk(serviceDeskId: string) {
    const desk = await this.prisma.serviceDesk.findUnique({
      where: { id: serviceDeskId },
      select: { id: true },
    });
    if (!desk) {
      throw new NotFoundException(`ServiceDesk with ID ${serviceDeskId} not found`);
    }
  }

  private async requireStage(serviceDeskId: string, stageId: string) {
    const stage = await this.prisma.ticketStage.findFirst({
      where: { id: stageId, serviceDeskId },
    });
    if (!stage) {
      throw new NotFoundException(`TicketStage with ID ${stageId} not found`);
    }
    return stage;
  }

  private toDto(stage: {
    id: string;
    name: string;
    position: number;
    isInitial: boolean;
    isFinal: boolean;
    transitionsFrom: { toStageId: string }[];
  }) {
    return {
      id: stage.id,
      name: stage.name,
      position: stage.position,
      isInitial: stage.isInitial,
      isFinal: stage.isFinal,
      transitionToIds: stage.transitionsFrom.map((item) => item.toStageId),
    };
  }
}
