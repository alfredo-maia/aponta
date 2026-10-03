import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { TenantHelper } from '../core/security/tenant.helper';
import { Role } from '@prisma/client';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: CurrentUserPayload) {
    const where = TenantHelper.getContractWhere(user);
    if (where.id === '00000000-0000-0000-0000-000000000000') {
      throw new ForbiddenException('Acesso negado');
    }

    const contracts = await this.prisma.contract.findMany({
      where,
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
    });

    const isAgent = ([Role.AGENT, Role.AGENT_MASTER] as Role[]).includes(user.role);

    return contracts.map((c) => {
      if (isAgent) {
        // Strip financial data
        c.monthlyValue = null;
        c.lastAmendmentValue = null;
        c.adjustmentDate = null;
      }
      return c;
    });
  }

  async create(createDto: CreateContractDto, user: CurrentUserPayload) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Apenas admin pode gerir contratos');
    }

    return this.prisma.contract.create({
      data: createDto,
    });
  }

  async update(id: string, updateDto: UpdateContractDto, user: CurrentUserPayload) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Restricted');
    }

    return this.prisma.contract.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string, user: CurrentUserPayload) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Restricted');
    return this.prisma.contract.delete({ where: { id } });
  }
}
