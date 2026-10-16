import { BadRequestException, ConflictException, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { TenantHelper } from '../core/security/tenant.helper';
import { Contract, ContractType, Prisma, Role } from '@prisma/client';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  private readableWhere(user: CurrentUserPayload) {
    const where = TenantHelper.getContractWhere(user);
    if (where.id === '00000000-0000-0000-0000-000000000000') {
      throw new ForbiddenException('Acesso negado');
    }
    return where;
  }

  private mask<T extends Contract>(contract: T, user: CurrentUserPayload): T {
    if (user.role === Role.AGENT || user.role === Role.AGENT_MASTER) {
      return { ...contract, monthlyValue: null, lastAmendmentValue: null, adjustmentDate: null, excessHourlyRateCents: null };
    }
    return contract;
  }

  async findAll(user: CurrentUserPayload, search?: string) {
    const where = this.readableWhere(user);
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { organization: { name: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    const contracts = await this.prisma.contract.findMany({
      where,
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
    });

    return contracts.map((contract) => this.mask(contract, user));
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const where = this.readableWhere(user);
    const contract = await this.prisma.contract.findFirst({
      where: { ...where, id }, include: { organization: true },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    return this.mask(contract, user);
  }

  private validate(data: Omit<Partial<Contract>, 'startsAt' | 'endsAt' | 'adjustmentDate'> & {
    startsAt?: string | Date | null;
    endsAt?: string | Date | null;
    adjustmentDate?: string | Date | null;
  }) {
    if (data.organizationId !== undefined && (typeof data.organizationId !== 'string' || !data.organizationId.trim())) {
      throw new BadRequestException('Organização inválida');
    }
    if (data.active !== undefined && typeof data.active !== 'boolean') throw new BadRequestException('Ativo deve ser booleano');
    if (data.type !== undefined && !Object.values(ContractType).includes(data.type)) throw new BadRequestException('Modalidade inválida');
    if (data.name !== undefined && data.name !== null && (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 200)) {
      throw new BadRequestException('Nome deve conter entre 1 e 200 caracteres');
    }
    for (const field of ['includedMinutes', 'excessHourlyRateCents', 'hoursLimit'] as const) {
      const value = data[field];
      if (value != null && (!Number.isSafeInteger(value) || value < 0 || value > 2147483647)) {
        throw new BadRequestException(`${field} deve ser um inteiro não negativo`);
      }
    }
    for (const field of ['monthlyValue', 'lastAmendmentValue'] as const) {
      const value = data[field];
      if (value != null && (!Number.isFinite(value) || value < 0)) throw new BadRequestException(`${field} deve ser não negativo`);
    }
    for (const field of ['startsAt', 'endsAt', 'adjustmentDate'] as const) {
      if (data[field] != null && !Number.isFinite(new Date(data[field]).getTime())) throw new BadRequestException('Data inválida');
    }
    if (data.startsAt != null && data.endsAt != null && new Date(data.startsAt) > new Date(data.endsAt)) {
      throw new BadRequestException('Início da vigência deve ser anterior ou igual ao término');
    }
  }

  private persistenceData(dto: UpdateContractDto) {
    const { startsAt, endsAt, adjustmentDate, ...rest } = dto;
    return {
      ...rest,
      ...(startsAt !== undefined ? { startsAt: startsAt === null ? null : new Date(startsAt) } : {}),
      ...(endsAt !== undefined ? { endsAt: endsAt === null ? null : new Date(endsAt) } : {}),
      ...(adjustmentDate !== undefined ? { adjustmentDate: adjustmentDate === null ? null : new Date(adjustmentDate) } : {}),
    };
  }

  async create(createDto: CreateContractDto, user: CurrentUserPayload) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Apenas admin pode gerir contratos');
    }

    this.validate(createDto);
    return this.prisma.contract.create({
      data: { ...this.persistenceData(createDto), organizationId: createDto.organizationId },
    });
  }

  async update(id: string, updateDto: UpdateContractDto, user: CurrentUserPayload) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Restricted');
    }

    return this.prisma.$transaction(async database => {
    await database.$queryRaw(Prisma.sql`SELECT id FROM "Contract" WHERE id = ${id} FOR UPDATE`);
    const current = await database.contract.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Contrato não encontrado');
    this.validate({ ...current, ...updateDto });
    const moving = updateDto.organizationId !== undefined && updateDto.organizationId !== current.organizationId;
    if (moving && await database.worklog.count({ where: { contractId: id } })) {
      throw new ConflictException('Contrato com apontamentos não pode mudar de organização');
    }
    try {
      return await database.contract.update({
        where: moving ? { id, worklogs: { none: {} } } : { id },
        data: this.persistenceData(updateDto),
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw moving ? new ConflictException('Contrato com apontamentos não pode mudar de organização') : new NotFoundException('Contrato não encontrado');
      }
      throw error;
    }
    });
  }

  async remove(id: string, user: CurrentUserPayload) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Restricted');
    try {
      return await this.prisma.contract.delete({ where: { id } });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'P2003') throw new ConflictException('Contrato com apontamentos não pode ser excluído; desative-o para preservar o histórico');
      if (code === 'P2025') throw new NotFoundException('Contrato não encontrado');
      throw error;
    }
  }
}
