import { BadRequestException, ConflictException, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { TenantHelper } from '../core/security/tenant.helper';
import { Contract, ContractType, Prisma, Role } from '@prisma/client';

const conditions = ['type', 'includedMinutes', 'hourlyRateCents', 'excessHourlyRateCents', 'monthlyFeeCents', 'fixedPriceCents', 'estimatedMinutes', 'scope'] as const;
const finances = ['monthlyValue', 'lastAmendmentValue', 'adjustmentDate', 'excessHourlyRateCents', 'hourlyRateCents', 'monthlyFeeCents', 'fixedPriceCents'] as const;
const relations = { organization: true, serviceDesks: { select: { id: true, name: true } }, terms: { orderBy: { effectiveFrom: 'asc' as const } }, lifecycleEvents: { orderBy: [{ effectiveFrom: 'asc' as const }, { createdAt: 'asc' as const }] } };

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
      const hide = (value: object) => ({ ...value, ...Object.fromEntries(finances.map(field => [field, null])) });
      const terms = (contract as T & { terms?: object[] }).terms;
      return { ...hide(contract), ...(terms ? { terms: terms.map(hide) } : {}) } as T;
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
      include: relations,
      orderBy: { createdAt: 'desc' },
    });

    return contracts.map((contract) => this.mask(contract, user));
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const where = this.readableWhere(user);
    const contract = await this.prisma.contract.findFirst({
      where: { ...where, id }, include: relations,
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
    if (data.approved !== undefined && typeof data.approved !== 'boolean') throw new BadRequestException('Aprovação deve ser booleana');
    if (data.scope != null && (typeof data.scope !== 'string' || data.scope.length > 20000)) throw new BadRequestException('Escopo inválido');
    if (data.type !== undefined && !Object.values(ContractType).includes(data.type)) throw new BadRequestException('Modalidade inválida');
    if (data.name !== undefined && data.name !== null && (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 200)) {
      throw new BadRequestException('Nome deve conter entre 1 e 200 caracteres');
    }
    for (const field of ['includedMinutes', 'excessHourlyRateCents', 'hoursLimit', 'hourlyRateCents', 'monthlyFeeCents', 'fixedPriceCents', 'estimatedMinutes'] as const) {
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
    const { startsAt, endsAt, adjustmentDate, serviceDeskIds, conditionsEffectiveAt, ...rest } = dto;
    void serviceDeskIds; void conditionsEffectiveAt;
    return {
      ...rest,
      ...(startsAt !== undefined ? { startsAt: startsAt === null ? null : new Date(startsAt) } : {}),
      ...(endsAt !== undefined ? { endsAt: endsAt === null ? null : new Date(endsAt) } : {}),
      ...(adjustmentDate !== undefined ? { adjustmentDate: adjustmentDate === null ? null : new Date(adjustmentDate) } : {}),
    };
  }

  private async validateDesks(db: Prisma.TransactionClient, organizationId: string, ids: string[]) {
    if (!Array.isArray(ids) || new Set(ids).size !== ids.length) throw new BadRequestException('Mesas inválidas ou duplicadas');
    const org = await db.organization.findUnique({ where: { id: organizationId }, include: { serviceDesks: { select: { id: true } } } });
    if (!org) throw new NotFoundException('Organização não encontrada');
    const allowed = new Set(org.serviceDesks.map(desk => desk.id));
    if (ids.some(id => !allowed.has(id))) throw new BadRequestException('Toda mesa do contrato deve estar explicitamente vinculada à empresa');
  }

  private async validateApproval(db: Prisma.TransactionClient, data: Partial<Contract>, ids: string[]) {
    if (!data.approved) return;
    if (!data.startsAt || !ids.length) throw new BadRequestException('Aprovação exige vigência inicial e mesas explícitas');
    if (!['FIXED_PROJECT','MONTHLY_HOURS','HOURLY'].includes(data.type ?? '')) throw new BadRequestException('Converta explicitamente a modalidade legada antes de aprovar');
    const required = data.type === ContractType.HOURLY ? ['hourlyRateCents'] : data.type === ContractType.MONTHLY_HOURS ? ['includedMinutes','monthlyFeeCents','excessHourlyRateCents'] : ['fixedPriceCents','estimatedMinutes','scope'];
    for (const field of required) {
      const value = data[field as keyof Contract];
      if (value == null || (typeof value === 'string' && !value.trim())) throw new BadRequestException('Condição obrigatória: ' + field);
    }
    await this.validateDesks(db, data.organizationId!, ids);
  }

  private termData(data: Partial<Contract>, ids: string[], effectiveFrom: Date, createdBy: string) {
    return { ...Object.fromEntries(conditions.map(field => [field, data[field] ?? null])), type: data.type ?? ContractType.FIXED_COVERAGE,
      approved: data.approved ?? false, active: data.active ?? true, startsAt: data.startsAt ?? null, endsAt: data.endsAt ?? null,
      serviceDeskIds: [...ids].sort(), effectiveFrom, createdBy } as Prisma.ContractTermCreateWithoutContractInput;
  }

  private lifecycleData(data: Partial<Contract>, effectiveFrom: Date, createdBy: string) {
    return { approved: data.approved ?? false, active: data.active ?? true, startsAt: data.startsAt ?? null,
      endsAt: data.endsAt ?? null, effectiveFrom, createdBy };
  }

  async create(dto: CreateContractDto, user: CurrentUserPayload) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Apenas admin pode gerir contratos');
    this.validate(dto);
    const data = { ...this.persistenceData(dto), organizationId: dto.organizationId };
    const commercial = dto.approved || dto.serviceDeskIds !== undefined || ['HOURLY','FIXED_PROJECT','MONTHLY_HOURS'].includes(dto.type ?? '');
    if (!commercial) return this.prisma.contract.create({ data });
    return this.prisma.$transaction(async db => {
      await db.$queryRaw(Prisma.sql`SELECT id FROM "Organization" WHERE id = ${dto.organizationId} FOR UPDATE`);
      const ids = dto.serviceDeskIds ?? [];
      await this.validateDesks(db,dto.organizationId,ids);
      await this.validateApproval(db,data,ids);
      const effectiveFrom = new Date(dto.conditionsEffectiveAt ?? dto.startsAt ?? new Date());
      if (!Number.isFinite(effectiveFrom.getTime()) || (data.startsAt && effectiveFrom < data.startsAt)) throw new BadRequestException('Vigência das condições inválida');
      return db.contract.create({ data: { ...data, serviceDesks: { connect: ids.map(id => ({id})) }, terms: { create: this.termData(data,ids,effectiveFrom,user.id) },
        lifecycleEvents: { create: this.lifecycleData(data,effectiveFrom,user.id) } }, include: relations });
    });
  }

  async update(id: string, dto: UpdateContractDto, user: CurrentUserPayload) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Apenas admin pode gerir contratos');
    return this.prisma.$transaction(async db => {
      const initial = await db.contract.findUnique({where:{id}});
      if (!initial) throw new NotFoundException('Contrato não encontrado');
      for (const orgId of [...new Set([initial.organizationId,dto.organizationId ?? initial.organizationId])].filter(Boolean).sort()) {
        await db.$queryRaw(Prisma.sql`SELECT id FROM "Organization" WHERE id = ${orgId} FOR UPDATE`);
      }
      await db.$queryRaw(Prisma.sql`SELECT id FROM "Contract" WHERE id = ${id} FOR UPDATE`);
      const current = await db.contract.findUnique({where:{id},include:relations});
      if (!current) throw new NotFoundException('Contrato não encontrado');
      if (current.organizationId !== initial.organizationId) throw new ConflictException('Contrato alterado simultaneamente; recarregue');
      this.validate({...current,...dto});
      const moving = dto.organizationId !== undefined && dto.organizationId !== current.organizationId;
      if ((moving || dto.type !== undefined && dto.type !== current.type) && current.terms?.some(term => term.approved)) {
        throw new ConflictException('Contrato comercial aprovado preserva empresa e modalidade; crie outro contrato para essa mudança');
      }
      if ((moving || dto.type !== undefined && dto.type !== current.type) && await db.worklog.count({where:{contractId:id}})) throw new ConflictException('Contrato com apontamentos não pode mudar de organização ou modalidade');
      const merged = {...current,...this.persistenceData(dto)};
      const ids = dto.serviceDeskIds ?? current.serviceDesks?.map(desk=>desk.id) ?? [];
      const commercial = merged.approved || current.terms?.length || dto.serviceDeskIds !== undefined;
      if (commercial) {
        if (dto.serviceDeskIds !== undefined || moving) await this.validateDesks(db,merged.organizationId,ids);
        await this.validateApproval(db,merged,ids);
      }
      const lifecycleChanged = (dto.approved !== undefined && dto.approved !== current.approved) || (dto.active !== undefined && dto.active !== current.active)
        || (dto.startsAt !== undefined && (dto.startsAt === null ? null : new Date(dto.startsAt).getTime()) !== current.startsAt?.getTime())
        || (dto.endsAt !== undefined && (dto.endsAt === null ? null : new Date(dto.endsAt).getTime()) !== (current.endsAt?.getTime() ?? null));
      const changed = conditions.some(field=>dto[field] !== undefined && dto[field] !== current[field]) || dto.serviceDeskIds !== undefined && JSON.stringify([...ids].sort()) !== JSON.stringify((current.serviceDesks ?? []).map(desk=>desk.id).sort());
      let term: Prisma.ContractTermCreateWithoutContractInput | undefined;
      if (commercial && (changed || !current.terms?.length)) {
        const effectiveFrom = new Date(dto.conditionsEffectiveAt ?? new Date());
        if (!Number.isFinite(effectiveFrom.getTime()) || (merged.startsAt && effectiveFrom < merged.startsAt)) throw new BadRequestException('Vigência das condições inválida');
        const latestTerm = current.terms?.at(-1);
        const latestWorklog = await db.worklog.findFirst({where:{contractId:id},orderBy:{endTime:'desc'},select:{endTime:true}});
        if ((latestTerm && effectiveFrom <= latestTerm.effectiveFrom) || (latestWorklog && effectiveFrom <= latestWorklog.endTime)) throw new ConflictException('Nova condição deve ser posterior ao histórico de condições e ao último esforço registrado');
        term = this.termData(merged,ids,effectiveFrom,user.id);
      }
      try {
        return await db.contract.update({
          where: moving ? {id,worklogs:{none:{}}} : {id},
          data: { ...this.persistenceData(dto), ...(dto.serviceDeskIds !== undefined ? {serviceDesks:{set:ids.map(id=>({id}))}} : {}), ...(term ? {terms:{create:term}} : {}),
            ...(commercial && (lifecycleChanged || !current.lifecycleEvents?.length) ? { lifecycleEvents: { create: this.lifecycleData(merged,new Date(),user.id) } } : {}),
          },
          ...(commercial ? {include:relations} : {}),
        });
      } catch(error) {
        if ((error as {code?:string}).code === 'P2025') throw moving ? new ConflictException('Contrato com apontamentos não pode mudar de organização') : new NotFoundException('Contrato não encontrado');
        throw error;
      }
    });
  }

  async preflight(user: CurrentUserPayload) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Apenas admin pode regularizar contratos');
    const rows = await this.prisma.contract.findMany({include:{...relations,organization:{include:{serviceDesks:{select:{id:true}}}}},orderBy:{createdAt:'asc'}});
    return rows.map(contract=>({id:contract.id,name:contract.name,organizationId:contract.organizationId,type:contract.type,approved:contract.approved,
      issues: [...(!contract.approved?['NOT_APPROVED']:[]),...(!contract.startsAt?['MISSING_START']:[]),...(!contract.serviceDesks.length?['MISSING_DESKS']:[]),...(['FIXED_COVERAGE','HOURS_LIMIT'].includes(contract.type)?['LEGACY_TYPE']:[]),
        ...(contract.serviceDesks.some(desk=>!contract.organization.serviceDesks.some(link=>link.id===desk.id))?['DESK_NOT_LINKED_TO_ORGANIZATION']:[]),
        ...(contract.type===ContractType.HOURLY && contract.hourlyRateCents==null?['MISSING_HOURLY_RATE']:[]),
        ...(contract.type===ContractType.MONTHLY_HOURS && [contract.monthlyFeeCents,contract.includedMinutes,contract.excessHourlyRateCents].some(value=>value==null)?['INCOMPLETE_MONTHLY_CONDITIONS']:[]),
        ...(contract.type===ContractType.FIXED_PROJECT && (contract.fixedPriceCents==null || contract.estimatedMinutes==null || !contract.scope?.trim())?['INCOMPLETE_PROJECT_CONDITIONS']:[]),
      ],
    }));
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
