import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { TenantHelper } from '../core/security/tenant.helper';
import { Role } from '@prisma/client';

@Injectable()
export class VaultService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: CurrentUserPayload) {
    const where = TenantHelper.getCredentialWhere(user);
    if (where.id === '00000000-0000-0000-0000-000000000000') {
      throw new ForbiddenException('Acesso negado ao Cofre de Senhas');
    }

    return this.prisma.credential.findMany({
      where,
      include: { organization: true },
      orderBy: [{ organization: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async create(createDto: CreateCredentialDto, user: CurrentUserPayload) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Apenas Administradores podem gerenciar o cofre');
    }

    const org = await this.prisma.organization.findFirst();
    if (!org) throw new NotFoundException('No organizations exist');

    return this.prisma.credential.create({
      data: {
        ...createDto,
        organizationId: org.id,
      },
    });
  }

  async remove(id: string, user: CurrentUserPayload) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Acesso restrito');
    }

    const credential = await this.prisma.credential.findFirst({
      where: { id },
    });

    if (!credential) {
      throw new NotFoundException('Credencial não encontrada');
    }

    await this.prisma.credential.delete({ where: { id } });
    return { success: true };
  }
}
